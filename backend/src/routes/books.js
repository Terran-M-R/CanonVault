/**
 * books.js — Public browse routes (no authentication required).
 *
 * Mounted at /api/books in server.js.
 *
 *   GET  /api/books           — browse all published books (with optional search)
 *   GET  /api/books/:id       — get a single public book profile with storyboard images
 */

const express = require('express');
const router = express.Router();
const db = require('../db');

/**
 * GET /api/books?search=keyword&page=1&limit=20
 * Returns all published books. Supports keyword search across title, hook, genre.
 */
router.get('/', async (req, res) => {
  const { search, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  try {
    let query, params;

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      query = `
        SELECT
          pb.id, pb.story_id, pb.hook, pb.genre_display, pb.audience_display,
          pb.is_wip, pb.published_at, pb.external_link,
          s.title, s.synopsis,
          u.display_name AS author_name,
          (SELECT image_url FROM storyboard_images si WHERE si.story_id = pb.story_id ORDER BY si.created_at LIMIT 1) AS cover_image
        FROM published_books pb
        JOIN stories s ON s.id = pb.story_id
        JOIN users u ON u.id = s.user_id
        WHERE
          s.title          ILIKE $1 OR
          pb.hook          ILIKE $1 OR
          pb.genre_display ILIKE $1
        ORDER BY pb.published_at DESC
        LIMIT $2 OFFSET $3`;
      params = [term, parseInt(limit), offset];
    } else {
      query = `
        SELECT
          pb.id, pb.story_id, pb.hook, pb.genre_display, pb.audience_display,
          pb.is_wip, pb.published_at, pb.external_link,
          s.title, s.synopsis,
          u.display_name AS author_name,
          (SELECT image_url FROM storyboard_images si WHERE si.story_id = pb.story_id ORDER BY si.created_at LIMIT 1) AS cover_image
        FROM published_books pb
        JOIN stories s ON s.id = pb.story_id
        JOIN users u ON u.id = s.user_id
        ORDER BY pb.published_at DESC
        LIMIT $1 OFFSET $2`;
      params = [parseInt(limit), offset];
    }

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('GET /books error:', err);
    res.status(500).json({ error: 'Failed to fetch books' });
  }
});

/**
 * GET /api/books/:id
 * Returns a single public book profile with storyboard images.
 * :id is the published_books.id (not story_id).
 */
router.get('/:id', async (req, res) => {
  try {
    const bookResult = await db.query(
      `SELECT
         pb.*, s.title, s.synopsis, s.genre,
         u.display_name AS author_name
       FROM published_books pb
       JOIN stories s ON s.id = pb.story_id
       JOIN users u ON u.id = s.user_id
       WHERE pb.id = $1`,
      [req.params.id]
    );

    if (!bookResult.rows.length) {
      return res.status(404).json({ error: 'Book not found' });
    }

    const book = bookResult.rows[0];

    // Fetch storyboard images for this story
    const imagesResult = await db.query(
      'SELECT id, image_url, prompt_used, plot_point_ref FROM storyboard_images WHERE story_id = $1 ORDER BY created_at',
      [book.story_id]
    );

    res.json({ ...book, storyboard: imagesResult.rows });
  } catch (err) {
    console.error('GET /books/:id error:', err);
    res.status(500).json({ error: 'Failed to fetch book' });
  }
});

module.exports = router;
