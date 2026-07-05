const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

/**
 * POST /api/auth/login
 * Called after Firebase login — creates a user record in PostgreSQL if it
 * doesn't exist yet, then returns the user row and whether onboarding is done.
 */
router.post('/login', authenticate, async (req, res) => {
  const { uid, email, name } = req.user;

  try {
    // Upsert user — insert if new, do nothing if already exists
    await db.query(
      `INSERT INTO users (firebase_uid, email, display_name)
       VALUES ($1, $2, $3)
       ON CONFLICT (firebase_uid) DO UPDATE SET email = EXCLUDED.email`,
      [uid, email, name || email]
    );

    // Fetch the user row
    const userResult = await db.query(
      'SELECT * FROM users WHERE firebase_uid = $1',
      [uid]
    );
    const user = userResult.rows[0];

    // Auto-accept any pending collaboration invites for this email
    await db.query(
      `UPDATE collaborators SET invite_status = 'accepted'
       WHERE email = $1 AND invite_status = 'pending'`,
      [email]
    );

    // Check if onboarding survey has been completed
    const prefResult = await db.query(
      'SELECT id FROM user_preferences WHERE user_id = $1',
      [user.id]
    );
    const onboardingComplete = prefResult.rows.length > 0;

    res.json({ user, onboardingComplete });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Failed to process login' });
  }
});

/**
 * POST /api/auth/preferences
 * Saves onboarding survey results for the logged-in user.
 */
router.post('/preferences', authenticate, async (req, res) => {
  const { uid } = req.user;
  const { writing_type, book_form, target_audience, ai_criticism_level } = req.body;

  try {
    const userResult = await db.query(
      'SELECT id FROM users WHERE firebase_uid = $1',
      [uid]
    );
    if (!userResult.rows.length) {
      return res.status(404).json({ error: 'User not found' });
    }
    const userId = userResult.rows[0].id;

    await db.query(
      `INSERT INTO user_preferences
         (user_id, writing_type, book_form, target_audience, ai_criticism_level)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id) DO UPDATE SET
         writing_type       = EXCLUDED.writing_type,
         book_form          = EXCLUDED.book_form,
         target_audience    = EXCLUDED.target_audience,
         ai_criticism_level = EXCLUDED.ai_criticism_level,
         updated_at         = NOW()`,
      [userId, writing_type, book_form, target_audience, ai_criticism_level]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Preferences error:', err);
    res.status(500).json({ error: 'Failed to save preferences' });
  }
});

/**
 * GET /api/auth/me
 * Returns the current user's profile and preferences.
 */
router.get('/me', authenticate, async (req, res) => {
  const { uid } = req.user;

  try {
    const result = await db.query(
      `SELECT u.*, p.writing_type, p.book_form, p.target_audience, p.ai_criticism_level
       FROM users u
       LEFT JOIN user_preferences p ON p.user_id = u.id
       WHERE u.firebase_uid = $1`,
      [uid]
    );
    if (!result.rows.length) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

module.exports = router;
