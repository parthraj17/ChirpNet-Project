const express = require('express');
const pool = require('../config/db');
const auth = require('../middleware/authMiddleware');

const router = express.Router();

// ----------------------------------------------------
// POST /api/likes/:postId -> toggle like/unlike
// ----------------------------------------------------
router.post('/:postId', auth, async (req, res) => {
  try {
    const postResult = await pool.query('SELECT user_id FROM posts WHERE id = $1', [req.params.postId]);
    if (postResult.rows.length === 0) return res.status(404).json({ message: 'Post not found.' });

    const existing = await pool.query(
      'SELECT id FROM likes WHERE post_id = $1 AND user_id = $2',
      [req.params.postId, req.user.id]
    );

    if (existing.rows.length > 0) {
      await pool.query('DELETE FROM likes WHERE post_id = $1 AND user_id = $2', [req.params.postId, req.user.id]);
      return res.json({ liked: false });
    } else {
      await pool.query('INSERT INTO likes (post_id, user_id) VALUES ($1, $2)', [req.params.postId, req.user.id]);

      const postOwnerId = postResult.rows[0].user_id;
      if (postOwnerId !== req.user.id) {
        await pool.query(
          `INSERT INTO notifications (user_id, from_user_id, type, post_id) VALUES ($1, $2, 'like', $3)`,
          [postOwnerId, req.user.id, req.params.postId]
        );
      }
      return res.json({ liked: true });
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error toggling like.' });
  }
});

module.exports = router;
