/**
 * publish.js — Protected routes for publishing and unpublishing stories.
 *
 * Mounted at /api/publish in server.js.
 * Public browse routes have been moved to routes/books.js (mounted at /api/books).
 *
 *   POST   /api/publish              — publish a story (create/update public profile + generate images)
 *   DELETE /api/publish/:storyId     — unpublish a story
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const { generateStoryboardImages } = require('../services/imagegen');

// ─── Helper ───────────────────────────────────────────────────────────────────
async function getUserId(firebaseUid) {
  const result = await db.query('SELECT id FROM users WHERE firebase_uid = $1', [firebaseUid]);
  if (!result.rows.length) throw new Error('User not found');
  return result.rows[0].id;
}

// ════════════════════════════════════════════════════════════════════════════
// PROTECTED: PUBLISH / UNPUBLISH
// ════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/publish
 * Publishes a story or updates an existing public profile.
 * Body: { storyId, hook, genre_display, audience_display, external_link, is_wip }
 *
 * On first publish, triggers storyboard image generation for non-spoiler plot points.
 */
router.post('/', authenticate, async (req, res) => {
  const { storyId, hook, genre_display, audience_display, external_link, is_wip } = req.body;
  if (!storyId) return res.status(400).json({ error: 'storyId is required' });

  // Validate external_link — must be an http/https URL if provided
  if (external_link && external_link.trim()) {
    try {
      const parsed = new URL(external_link.trim());
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return res.status(400).json({ error: 'external_link must be an http or https URL' });
      }
    } catch {
      return res.status(400).json({ error: 'external_link is not a valid URL' });
    }
  }

  try {
    const userId = await getUserId(req.user.uid);

    // Verify ownership
    const ownerCheck = await db.query(
      'SELECT id, genre FROM stories WHERE id = $1 AND user_id = $2',
      [storyId, userId]
    );
    if (!ownerCheck.rows.length) {
      return res.status(404).json({ error: 'Story not found or not owned by you' });
    }
    const genre = ownerCheck.rows[0].genre || '';

    // Check if already published
    const existing = await db.query(
      'SELECT id FROM published_books WHERE story_id = $1',
      [storyId]
    );
    const isFirstPublish = existing.rows.length === 0;

    // Upsert the public profile
    const result = await db.query(
      `INSERT INTO published_books (story_id, hook, genre_display, audience_display, external_link, is_wip)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (story_id) DO UPDATE SET
         hook             = EXCLUDED.hook,
         genre_display    = EXCLUDED.genre_display,
         audience_display = EXCLUDED.audience_display,
         external_link    = EXCLUDED.external_link,
         is_wip           = EXCLUDED.is_wip,
         published_at     = NOW()
       RETURNING *`,
      [storyId, hook || null, genre_display || null, audience_display || null, external_link || null, is_wip ?? true]
    );
    const book = result.rows[0];

    // Update story status to reflect published state
    await db.query(
      `UPDATE stories SET status = $1, updated_at = NOW() WHERE id = $2`,
      [is_wip ? 'wip' : 'published', storyId]
    );

    // Generate storyboard images on first publish, or when regenerate=true is passed.
    // Image generation is intentionally run AFTER the response is sent so a slow or
    // failing HF call never blocks or crashes the publish. The client polls/reloads
    // the book profile to see images once they appear.
    const { regenerate_images } = req.body;
    const shouldGenerateImages = isFirstPublish || regenerate_images;

    res.status(isFirstPublish ? 201 : 200).json({
      book,
      generatingImages: shouldGenerateImages,
    });

    // Fire-and-forget image generation after response is flushed
    if (shouldGenerateImages) {
      (async () => {
        try {
          const plotPoints = await db.query(
            'SELECT id, title, description, is_spoiler FROM plot_points WHERE story_id = $1 ORDER BY sequence_order',
            [storyId]
          );

          if (plotPoints.rows.length === 0) return;

          // If regenerating, delete existing images first
          if (regenerate_images && !isFirstPublish) {
            await db.query('DELETE FROM storyboard_images WHERE story_id = $1', [storyId]);
          }

          const images = await generateStoryboardImages(plotPoints.rows, genre);

          for (const img of images) {
            await db.query(
              `INSERT INTO storyboard_images (story_id, image_url, prompt_used, plot_point_ref)
               VALUES ($1, $2, $3, $4)`,
              [storyId, img.imageUrl, img.prompt, img.plotPointId]
            );
          }
          console.log(`Storyboard: ${images.length} image(s) generated for story ${storyId}`);
        } catch (imgErr) {
          console.error(`Storyboard generation failed for story ${storyId}:`, imgErr.message);
        }
      })();
    }
  } catch (err) {
    console.error('POST /publish error:', err);
    res.status(500).json({ error: 'Failed to publish story' });
  }
});

/**
 * DELETE /api/publish/:storyId
 * Removes the public profile for a story (soft unpublish).
 */
router.delete('/:storyId', authenticate, async (req, res) => {
  try {
    const userId = await getUserId(req.user.uid);

    // Verify ownership
    const ownerCheck = await db.query(
      'SELECT id FROM stories WHERE id = $1 AND user_id = $2',
      [req.params.storyId, userId]
    );
    if (!ownerCheck.rows.length) {
      return res.status(404).json({ error: 'Story not found' });
    }

    await db.query('DELETE FROM published_books WHERE story_id = $1', [req.params.storyId]);
    await db.query(
      'UPDATE stories SET status = $1, updated_at = NOW() WHERE id = $2',
      ['draft', req.params.storyId]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /publish/:storyId error:', err);
    res.status(500).json({ error: 'Failed to unpublish story' });
  }
});

module.exports = router;
