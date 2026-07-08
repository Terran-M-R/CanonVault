const express = require('express');
const router = express.Router();
const multer = require('multer');
const mammoth = require('mammoth');
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const { formatText, extractBibleData, checkContinuity } = require('../services/granite');

// Multer — memory storage, accept .txt and .docx only, max 10 MB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'text/plain',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only .txt and .docx files are supported'));
    }
  },
});

// ─── Helper: resolve the internal user id from a Firebase UID ────────────────
async function getUserId(firebaseUid) {
  const result = await db.query(
    'SELECT id FROM users WHERE firebase_uid = $1',
    [firebaseUid]
  );
  if (!result.rows.length) throw new Error('User not found');
  return result.rows[0].id;
}

// ─── Helper: verify the requesting user owns (or is an accepted collaborator of) a story
//
// requireOwner: if true, rejects collaborators entirely (owner-only actions).
// requiredRole: if 'editor', rejects collaborators with role 'viewer' on write actions.
async function assertStoryAccess(storyId, userId, requireOwner = false, requiredRole = null) {
  // Look up the requesting user's email (needed for collaborator matching)
  const userRow = await db.query('SELECT email FROM users WHERE id = $1', [userId]);
  const userEmail = userRow.rows[0]?.email;

  const result = await db.query(
    `SELECT s.id, s.user_id,
            c.role AS collab_role,
            c.id   AS collab_id
     FROM stories s
     LEFT JOIN collaborators c
       ON c.story_id = s.id
      AND c.email = $3
      AND c.invite_status = 'accepted'
     WHERE s.id = $1
       AND (s.user_id = $2 OR c.id IS NOT NULL)`,
    [storyId, userId, userEmail || '']
  );
  if (!result.rows.length) return false;
  const row = result.rows[0];
  // Owner-only check (e.g. delete story, update metadata)
  if (requireOwner && row.user_id !== userId) return false;
  // Editor-only check (e.g. write content, run AI, manage bible)
  // Owners always pass; collaborators must have role 'editor', not 'viewer'.
  if (requiredRole === 'editor' && row.user_id !== userId && row.collab_role !== 'editor') return false;
  return row;
}

// ════════════════════════════════════════════════════════════════════════════
// STORIES
// ════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/stories
 * Returns all stories owned by the logged-in user.
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = await getUserId(req.user.uid);
    // Include stories where user is the owner OR an accepted collaborator
    const result = await db.query(
      `SELECT DISTINCT s.id, s.title, s.synopsis, s.genre, s.status,
              s.created_at, s.updated_at,
              CASE WHEN s.user_id = $1 THEN 'owner' ELSE 'collaborator' END AS access_role
       FROM stories s
       LEFT JOIN collaborators c
         ON c.story_id = s.id
        AND c.email = (SELECT email FROM users WHERE id = $1)
        AND c.invite_status = 'accepted'
       WHERE s.user_id = $1 OR c.id IS NOT NULL
       ORDER BY s.updated_at DESC`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('GET /stories error:', err);
    res.status(500).json({ error: 'Failed to fetch stories' });
  }
});

/**
 * POST /api/stories
 * Creates a new story.
 */
router.post('/', authenticate, async (req, res) => {
  const { title, synopsis, genre } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });

  try {
    const userId = await getUserId(req.user.uid);
    const result = await db.query(
      `INSERT INTO stories (user_id, title, synopsis, genre)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userId, title, synopsis || null, genre || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('POST /stories error:', err);
    res.status(500).json({ error: 'Failed to create story' });
  }
});

/**
 * GET /api/stories/:id
 * Returns a single story with its content.
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const userId = await getUserId(req.user.uid);
    const story = await assertStoryAccess(req.params.id, userId);
    if (!story) return res.status(404).json({ error: 'Story not found' });

    const contentResult = await db.query(
      'SELECT raw_text, formatted_text FROM story_content WHERE story_id = $1',
      [req.params.id]
    );

    res.json({ ...story, content: contentResult.rows[0] || null });
  } catch (err) {
    console.error('GET /stories/:id error:', err);
    res.status(500).json({ error: 'Failed to fetch story' });
  }
});

/**
 * PUT /api/stories/:id
 * Updates story metadata (title, synopsis, genre, status). Owner only.
 */
router.put('/:id', authenticate, async (req, res) => {
  const { title, synopsis, genre, status } = req.body;
  try {
    const userId = await getUserId(req.user.uid);
    const story = await assertStoryAccess(req.params.id, userId, true);
    if (!story) return res.status(404).json({ error: 'Story not found' });

    const result = await db.query(
      `UPDATE stories
       SET title = COALESCE($1, title),
           synopsis = COALESCE($2, synopsis),
           genre = COALESCE($3, genre),
           status = COALESCE($4, status),
           updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [title, synopsis, genre, status, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('PUT /stories/:id error:', err);
    res.status(500).json({ error: 'Failed to update story' });
  }
});

/**
 * DELETE /api/stories/:id
 * Deletes a story (owner only).
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const userId = await getUserId(req.user.uid);
    const result = await db.query(
      'DELETE FROM stories WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, userId]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Story not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /stories/:id error:', err);
    res.status(500).json({ error: 'Failed to delete story' });
  }
});

/**
 * PUT /api/stories/:id/content
 * Saves (auto-saves) the raw text of the story editor. Requires editor role.
 */
router.put('/:id/content', authenticate, async (req, res) => {
  const { raw_text } = req.body;
  try {
    const userId = await getUserId(req.user.uid);
    const story = await assertStoryAccess(req.params.id, userId, false, 'editor');
    if (!story) return res.status(404).json({ error: 'Story not found' });

    await db.query(
      `INSERT INTO story_content (story_id, raw_text)
       VALUES ($1, $2)
       ON CONFLICT (story_id) DO UPDATE SET raw_text = $2, last_processed_at = NOW()`,
      [req.params.id, raw_text]
    );

    // Also bump the story's updated_at
    await db.query('UPDATE stories SET updated_at = NOW() WHERE id = $1', [req.params.id]);

    res.json({ success: true });
  } catch (err) {
    console.error('PUT /stories/:id/content error:', err);
    res.status(500).json({ error: 'Failed to save content' });
  }
});

/**
 * POST /api/stories/:id/upload
 * Accepts a .txt or .docx file and saves extracted text as raw_text.
 */
router.post('/:id/upload', authenticate, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    const userId = await getUserId(req.user.uid);
    const story = await assertStoryAccess(req.params.id, userId, false, 'editor');
    if (!story) return res.status(404).json({ error: 'Story not found' });

    let text = '';
    if (req.file.mimetype === 'text/plain') {
      text = req.file.buffer.toString('utf-8');
    } else {
      const result = await mammoth.extractRawText({ buffer: req.file.buffer });
      text = result.value;
    }

    await db.query(
      `INSERT INTO story_content (story_id, raw_text)
       VALUES ($1, $2)
       ON CONFLICT (story_id) DO UPDATE SET raw_text = $2, last_processed_at = NOW()`,
      [req.params.id, text]
    );

    await db.query('UPDATE stories SET updated_at = NOW() WHERE id = $1', [req.params.id]);

    res.json({ success: true, length: text.length });
  } catch (err) {
    console.error('POST /stories/:id/upload error:', err);
    res.status(500).json({ error: err.message || 'Failed to process file' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// CHARACTERS
// ════════════════════════════════════════════════════════════════════════════

router.get('/:id/characters', authenticate, async (req, res) => {
  try {
    const userId = await getUserId(req.user.uid);
    if (!await assertStoryAccess(req.params.id, userId)) return res.status(404).json({ error: 'Story not found' });
    const result = await db.query('SELECT * FROM characters WHERE story_id = $1 ORDER BY created_at', [req.params.id]);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: 'Failed to fetch characters' }); }
});

router.post('/:id/characters', authenticate, async (req, res) => {
  const { name, traits, role, arc_notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  try {
    const userId = await getUserId(req.user.uid);
    if (!await assertStoryAccess(req.params.id, userId, false, 'editor')) return res.status(404).json({ error: 'Story not found' });
    const result = await db.query(
      'INSERT INTO characters (story_id, name, traits, role, arc_notes) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [req.params.id, name, traits || null, role || null, arc_notes || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: 'Failed to create character' }); }
});

router.put('/:id/characters/:charId', authenticate, async (req, res) => {
  const { name, traits, role, arc_notes } = req.body;
  try {
    const userId = await getUserId(req.user.uid);
    if (!await assertStoryAccess(req.params.id, userId, false, 'editor')) return res.status(404).json({ error: 'Story not found' });
    const result = await db.query(
      `UPDATE characters SET name=COALESCE($1,name), traits=COALESCE($2,traits), role=COALESCE($3,role), arc_notes=COALESCE($4,arc_notes)
       WHERE id=$5 AND story_id=$6 RETURNING *`,
      [name, traits, role, arc_notes, req.params.charId, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Character not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: 'Failed to update character' }); }
});

router.delete('/:id/characters/:charId', authenticate, async (req, res) => {
  try {
    const userId = await getUserId(req.user.uid);
    if (!await assertStoryAccess(req.params.id, userId, false, 'editor')) return res.status(404).json({ error: 'Story not found' });
    await db.query('DELETE FROM characters WHERE id=$1 AND story_id=$2', [req.params.charId, req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Failed to delete character' }); }
});

// ════════════════════════════════════════════════════════════════════════════
// SETTINGS
// ════════════════════════════════════════════════════════════════════════════

router.get('/:id/settings', authenticate, async (req, res) => {
  try {
    const userId = await getUserId(req.user.uid);
    if (!await assertStoryAccess(req.params.id, userId)) return res.status(404).json({ error: 'Story not found' });
    const result = await db.query('SELECT * FROM settings WHERE story_id = $1 ORDER BY created_at', [req.params.id]);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: 'Failed to fetch settings' }); }
});

router.post('/:id/settings', authenticate, async (req, res) => {
  const { name, description, time_period } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  try {
    const userId = await getUserId(req.user.uid);
    if (!await assertStoryAccess(req.params.id, userId, false, 'editor')) return res.status(404).json({ error: 'Story not found' });
    const result = await db.query(
      'INSERT INTO settings (story_id, name, description, time_period) VALUES ($1,$2,$3,$4) RETURNING *',
      [req.params.id, name, description || null, time_period || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: 'Failed to create setting' }); }
});

router.put('/:id/settings/:settingId', authenticate, async (req, res) => {
  const { name, description, time_period } = req.body;
  try {
    const userId = await getUserId(req.user.uid);
    if (!await assertStoryAccess(req.params.id, userId, false, 'editor')) return res.status(404).json({ error: 'Story not found' });
    const result = await db.query(
      `UPDATE settings SET name=COALESCE($1,name), description=COALESCE($2,description), time_period=COALESCE($3,time_period)
       WHERE id=$4 AND story_id=$5 RETURNING *`,
      [name, description, time_period, req.params.settingId, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Setting not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: 'Failed to update setting' }); }
});

router.delete('/:id/settings/:settingId', authenticate, async (req, res) => {
  try {
    const userId = await getUserId(req.user.uid);
    if (!await assertStoryAccess(req.params.id, userId, false, 'editor')) return res.status(404).json({ error: 'Story not found' });
    await db.query('DELETE FROM settings WHERE id=$1 AND story_id=$2', [req.params.settingId, req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Failed to delete setting' }); }
});

// ════════════════════════════════════════════════════════════════════════════
// PLOT POINTS
// ════════════════════════════════════════════════════════════════════════════

router.get('/:id/plot-points', authenticate, async (req, res) => {
  try {
    const userId = await getUserId(req.user.uid);
    if (!await assertStoryAccess(req.params.id, userId)) return res.status(404).json({ error: 'Story not found' });
    const result = await db.query('SELECT * FROM plot_points WHERE story_id = $1 ORDER BY sequence_order', [req.params.id]);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: 'Failed to fetch plot points' }); }
});

router.post('/:id/plot-points', authenticate, async (req, res) => {
  const { title, description, sequence_order, is_spoiler } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });
  try {
    const userId = await getUserId(req.user.uid);
    if (!await assertStoryAccess(req.params.id, userId, false, 'editor')) return res.status(404).json({ error: 'Story not found' });
    const result = await db.query(
      'INSERT INTO plot_points (story_id, title, description, sequence_order, is_spoiler) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [req.params.id, title, description || null, sequence_order ?? 0, is_spoiler ?? false]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: 'Failed to create plot point' }); }
});

router.put('/:id/plot-points/:pointId', authenticate, async (req, res) => {
  const { title, description, sequence_order, is_spoiler } = req.body;
  try {
    const userId = await getUserId(req.user.uid);
    if (!await assertStoryAccess(req.params.id, userId, false, 'editor')) return res.status(404).json({ error: 'Story not found' });
    const result = await db.query(
      `UPDATE plot_points SET title=COALESCE($1,title), description=COALESCE($2,description),
       sequence_order=COALESCE($3,sequence_order), is_spoiler=COALESCE($4,is_spoiler)
       WHERE id=$5 AND story_id=$6 RETURNING *`,
      [title, description, sequence_order, is_spoiler, req.params.pointId, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Plot point not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: 'Failed to update plot point' }); }
});

router.delete('/:id/plot-points/:pointId', authenticate, async (req, res) => {
  try {
    const userId = await getUserId(req.user.uid);
    if (!await assertStoryAccess(req.params.id, userId, false, 'editor')) return res.status(404).json({ error: 'Story not found' });
    await db.query('DELETE FROM plot_points WHERE id=$1 AND story_id=$2', [req.params.pointId, req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Failed to delete plot point' }); }
});

// ════════════════════════════════════════════════════════════════════════════
// AI: PROCESS TEXT (format + extract story bible)
// ════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/stories/:id/process-text
 *
 * 1. Sends raw_text to Granite for formatting → saves to story_content.formatted_text
 * 2. Sends raw_text to Granite for bible extraction → upserts characters/settings/plot_points
 *
 * Returns: { formattedText, extracted: { characters, settings, plotPoints } }
 */
router.post('/:id/process-text', authenticate, async (req, res) => {
  try {
    const userId = await getUserId(req.user.uid);
    const story = await assertStoryAccess(req.params.id, userId, false, 'editor');
    if (!story) return res.status(404).json({ error: 'Story not found' });

    // Fetch raw text and user's AI criticism level preference
    const [contentResult, prefResult] = await Promise.all([
      db.query('SELECT raw_text FROM story_content WHERE story_id = $1', [req.params.id]),
      db.query(
        `SELECT p.ai_criticism_level FROM user_preferences p
         JOIN users u ON u.id = p.user_id
         WHERE u.firebase_uid = $1`,
        [req.user.uid]
      ),
    ]);

    const rawText = contentResult.rows[0]?.raw_text;
    if (!rawText || !rawText.trim()) {
      return res.status(400).json({ error: 'No story text to process. Write or upload content first.' });
    }
    if (rawText.length > 200_000) {
      return res.status(400).json({ error: 'Story text exceeds the 200,000 character AI processing limit. Please split into chapters and process each separately.' });
    }

    const criticismLevel = prefResult.rows[0]?.ai_criticism_level || 'moderate';

    // ── Step 1: Format text ───────────────────────────────────────────────
    const formattedText = await formatText(rawText, criticismLevel);

    await db.query(
      `INSERT INTO story_content (story_id, formatted_text)
       VALUES ($1, $2)
       ON CONFLICT (story_id) DO UPDATE SET formatted_text = $2, last_processed_at = NOW()`,
      [req.params.id, formattedText]
    );

    // ── Step 2: Extract bible data ────────────────────────────────────────
    const extracted = await extractBibleData(rawText);

    // Upsert characters (match on name + story_id)
    for (const char of extracted.characters) {
      if (!char.name?.trim()) continue;
      await db.query(
        `INSERT INTO characters (story_id, name, traits, role, arc_notes)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (story_id, name) DO UPDATE SET
           traits    = EXCLUDED.traits,
           role      = EXCLUDED.role,
           arc_notes = EXCLUDED.arc_notes`,
        [req.params.id, char.name, char.traits || null, char.role || null, char.arc_notes || null]
      );
    }

    // Upsert settings (match on name + story_id)
    for (const setting of extracted.settings) {
      if (!setting.name?.trim()) continue;
      await db.query(
        `INSERT INTO settings (story_id, name, description, time_period)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (story_id, name) DO UPDATE SET
           description = EXCLUDED.description,
           time_period = EXCLUDED.time_period`,
        [req.params.id, setting.name, setting.description || null, setting.time_period || null]
      );
    }

    // Plot points — insert only new ones (user manages order manually)
    for (const [i, point] of extracted.plotPoints.entries()) {
      if (!point.title?.trim()) continue;
      const exists = await db.query(
        'SELECT id FROM plot_points WHERE story_id = $1 AND title = $2',
        [req.params.id, point.title]
      );
      if (!exists.rows.length) {
        await db.query(
          `INSERT INTO plot_points (story_id, title, description, sequence_order, is_spoiler)
           VALUES ($1, $2, $3, $4, $5)`,
          [req.params.id, point.title, point.description || null, i + 1, point.is_spoiler || false]
        );
      }
    }

    res.json({ formattedText, extracted });
  } catch (err) {
    console.error('POST /stories/:id/process-text error:', err);
    if (err.message?.includes('WATSONX_')) {
      return res.status(503).json({ error: 'AI service not configured. Check WATSONX_API_KEY and WATSONX_PROJECT_ID.' });
    }
    if (err.response?.status === 401) {
      return res.status(503).json({ error: 'Invalid watsonx.ai API key.' });
    }
    res.status(500).json({ error: 'AI processing failed. Please try again.' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// AI: CONTINUITY CHECKER
// ════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/stories/:id/check-continuity
 * Runs Granite continuity analysis and saves results as continuity_flags.
 * Returns all unresolved flags after the run.
 */
router.post('/:id/check-continuity', authenticate, async (req, res) => {
  try {
    const userId = await getUserId(req.user.uid);
    const story = await assertStoryAccess(req.params.id, userId, false, 'editor');
    if (!story) return res.status(404).json({ error: 'Story not found' });

    // Gather everything needed for the prompt in parallel
    const [contentResult, prefResult, charsResult, settingsResult, plotResult] = await Promise.all([
      db.query('SELECT raw_text FROM story_content WHERE story_id = $1', [req.params.id]),
      db.query(
        `SELECT p.ai_criticism_level FROM user_preferences p
         JOIN users u ON u.id = p.user_id WHERE u.firebase_uid = $1`,
        [req.user.uid]
      ),
      db.query('SELECT name, role, traits FROM characters WHERE story_id = $1', [req.params.id]),
      db.query('SELECT name, description, time_period FROM settings WHERE story_id = $1', [req.params.id]),
      db.query('SELECT title, description, sequence_order FROM plot_points WHERE story_id = $1 ORDER BY sequence_order', [req.params.id]),
    ]);

    const rawText = contentResult.rows[0]?.raw_text;
    if (!rawText || !rawText.trim()) {
      return res.status(400).json({ error: 'No story text to check. Write or upload content first.' });
    }
    if (rawText.length > 200_000) {
      return res.status(400).json({ error: 'Story text exceeds the 200,000 character AI processing limit. Please split into chapters and process each separately.' });
    }

    const criticismLevel = prefResult.rows[0]?.ai_criticism_level || 'moderate';
    const bible = {
      characters: charsResult.rows,
      settings: settingsResult.rows,
      plotPoints: plotResult.rows,
    };

    // Call Granite
    const flags = await checkContinuity(rawText, bible, criticismLevel);

    // Persist each flag — avoid exact duplicates from repeated runs
    for (const flag of flags) {
      const exists = await db.query(
        'SELECT id FROM continuity_flags WHERE story_id = $1 AND flag_text = $2 AND resolved = FALSE',
        [req.params.id, flag.description]
      );
      if (!exists.rows.length) {
        await db.query(
          `INSERT INTO continuity_flags (story_id, flag_text, flag_type, suggestion)
           VALUES ($1, $2, $3, $4)`,
          [req.params.id, flag.description, flag.type, flag.suggestion || null]
        );
      }
    }

    // Return all unresolved flags
    const result = await db.query(
      `SELECT * FROM continuity_flags
       WHERE story_id = $1 AND resolved = FALSE
       ORDER BY created_at DESC`,
      [req.params.id]
    );

    res.json({ flags: result.rows, newCount: flags.length });
  } catch (err) {
    console.error('POST /stories/:id/check-continuity error:', err);
    if (err.message?.includes('WATSONX_')) {
      return res.status(503).json({ error: 'AI service not configured.' });
    }
    res.status(500).json({ error: 'Continuity check failed. Please try again.' });
  }
});

/**
 * GET /api/stories/:id/continuity-flags
 * Returns all continuity flags for a story (both resolved and unresolved).
 */
router.get('/:id/continuity-flags', authenticate, async (req, res) => {
  try {
    const userId = await getUserId(req.user.uid);
    if (!await assertStoryAccess(req.params.id, userId)) {
      return res.status(404).json({ error: 'Story not found' });
    }
    const result = await db.query(
      `SELECT * FROM continuity_flags
       WHERE story_id = $1
       ORDER BY resolved ASC, created_at DESC`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('GET /stories/:id/continuity-flags error:', err);
    res.status(500).json({ error: 'Failed to fetch flags' });
  }
});

/**
 * PATCH /api/stories/:id/continuity-flags/:flagId/resolve
 * Marks a single continuity flag as resolved.
 */
router.patch('/:id/continuity-flags/:flagId/resolve', authenticate, async (req, res) => {
  try {
    const userId = await getUserId(req.user.uid);
    if (!await assertStoryAccess(req.params.id, userId)) {
      return res.status(404).json({ error: 'Story not found' });
    }
    const result = await db.query(
      `UPDATE continuity_flags
       SET resolved = TRUE
       WHERE id = $1 AND story_id = $2
       RETURNING *`,
      [req.params.flagId, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Flag not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('PATCH /stories/:id/continuity-flags/:flagId/resolve error:', err);
    res.status(500).json({ error: 'Failed to resolve flag' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// COLLABORATORS
// ════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/stories/:id/collaborators
 * Returns all collaborators for a story (owner only).
 */
router.get('/:id/collaborators', authenticate, async (req, res) => {
  try {
    const userId = await getUserId(req.user.uid);
    const story = await assertStoryAccess(req.params.id, userId, true); // owner only
    if (!story) return res.status(404).json({ error: 'Story not found or access denied' });

    const result = await db.query(
      `SELECT id, email, role, invite_status, created_at
       FROM collaborators
       WHERE story_id = $1
       ORDER BY created_at`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('GET /collaborators error:', err);
    res.status(500).json({ error: 'Failed to fetch collaborators' });
  }
});

/**
 * POST /api/stories/:id/collaborators
 * Invites a collaborator by email. Owner only.
 * Body: { email, role }  — role is 'editor' | 'viewer'
 */
router.post('/:id/collaborators', authenticate, async (req, res) => {
  const { email, role } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });
  if (!['editor', 'viewer'].includes(role)) {
    return res.status(400).json({ error: 'Role must be editor or viewer' });
  }

  try {
    const userId = await getUserId(req.user.uid);
    const story = await assertStoryAccess(req.params.id, userId, true); // owner only
    if (!story) return res.status(404).json({ error: 'Story not found or access denied' });

    // Prevent owner from inviting themselves
    const ownerEmail = await db.query('SELECT email FROM users WHERE id = $1', [userId]);
    if (ownerEmail.rows[0]?.email?.toLowerCase() === email.toLowerCase()) {
      return res.status(400).json({ error: 'You cannot invite yourself' });
    }

    // Upsert invite — if already exists, update role
    const result = await db.query(
      `INSERT INTO collaborators (story_id, email, role, invite_status)
       VALUES ($1, $2, $3, 'pending')
       ON CONFLICT (story_id, email) DO UPDATE SET
         role = EXCLUDED.role,
         invite_status = CASE
           WHEN collaborators.invite_status = 'accepted' THEN 'accepted'
           ELSE 'pending'
         END
       RETURNING *`,
      [req.params.id, email.toLowerCase(), role]
    );

    // If this email already has an account, auto-accept immediately
    const existingUser = await db.query(
      'SELECT id FROM users WHERE LOWER(email) = $1',
      [email.toLowerCase()]
    );
    if (existingUser.rows.length) {
      await db.query(
        `UPDATE collaborators SET invite_status = 'accepted'
         WHERE story_id = $1 AND email = $2`,
        [req.params.id, email.toLowerCase()]
      );
      result.rows[0].invite_status = 'accepted';
    }

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('POST /collaborators error:', err);
    res.status(500).json({ error: 'Failed to add collaborator' });
  }
});

/**
 * DELETE /api/stories/:id/collaborators/:collaboratorId
 * Removes a collaborator. Owner only.
 */
router.delete('/:id/collaborators/:collaboratorId', authenticate, async (req, res) => {
  try {
    const userId = await getUserId(req.user.uid);
    const story = await assertStoryAccess(req.params.id, userId, true); // owner only
    if (!story) return res.status(404).json({ error: 'Story not found or access denied' });

    const result = await db.query(
      'DELETE FROM collaborators WHERE id = $1 AND story_id = $2 RETURNING id',
      [req.params.collaboratorId, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Collaborator not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /collaborators error:', err);
    res.status(500).json({ error: 'Failed to remove collaborator' });
  }
});

module.exports = router;
