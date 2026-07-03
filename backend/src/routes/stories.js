const express = require('express');
const router = express.Router();
const multer = require('multer');
const mammoth = require('mammoth');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

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

// ─── Helper: verify the requesting user owns (or is a collaborator of) a story
async function assertStoryAccess(storyId, userId, requireEditor = false) {
  const result = await db.query(
    `SELECT s.id, s.user_id FROM stories s
     LEFT JOIN collaborators c
       ON c.story_id = s.id AND c.user_id = $2 AND c.invite_status = 'accepted'
     WHERE s.id = $1 AND (s.user_id = $2 OR c.id IS NOT NULL)`,
    [storyId, userId]
  );
  if (!result.rows.length) return false;
  if (requireEditor && result.rows[0].user_id !== userId) {
    // collaborator — check role later when collaboration is built
  }
  return result.rows[0];
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
    const result = await db.query(
      `SELECT id, title, synopsis, genre, status, created_at, updated_at
       FROM stories
       WHERE user_id = $1
       ORDER BY updated_at DESC`,
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
 * Updates story metadata (title, synopsis, genre, status).
 */
router.put('/:id', authenticate, async (req, res) => {
  const { title, synopsis, genre, status } = req.body;
  try {
    const userId = await getUserId(req.user.uid);
    const story = await assertStoryAccess(req.params.id, userId);
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
 * Saves (auto-saves) the raw text of the story editor.
 */
router.put('/:id/content', authenticate, async (req, res) => {
  const { raw_text } = req.body;
  try {
    const userId = await getUserId(req.user.uid);
    const story = await assertStoryAccess(req.params.id, userId);
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
    const story = await assertStoryAccess(req.params.id, userId);
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
    if (!await assertStoryAccess(req.params.id, userId)) return res.status(404).json({ error: 'Story not found' });
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
    if (!await assertStoryAccess(req.params.id, userId)) return res.status(404).json({ error: 'Story not found' });
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
    if (!await assertStoryAccess(req.params.id, userId)) return res.status(404).json({ error: 'Story not found' });
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
    if (!await assertStoryAccess(req.params.id, userId)) return res.status(404).json({ error: 'Story not found' });
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
    if (!await assertStoryAccess(req.params.id, userId)) return res.status(404).json({ error: 'Story not found' });
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
    if (!await assertStoryAccess(req.params.id, userId)) return res.status(404).json({ error: 'Story not found' });
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
    if (!await assertStoryAccess(req.params.id, userId)) return res.status(404).json({ error: 'Story not found' });
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
    if (!await assertStoryAccess(req.params.id, userId)) return res.status(404).json({ error: 'Story not found' });
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
    if (!await assertStoryAccess(req.params.id, userId)) return res.status(404).json({ error: 'Story not found' });
    await db.query('DELETE FROM plot_points WHERE id=$1 AND story_id=$2', [req.params.pointId, req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Failed to delete plot point' }); }
});

module.exports = router;
