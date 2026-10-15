const express = require('express');
const pool = require('../config/db');
const auth = require('../middleware/authMiddleware');

const router = express.Router();

// ----------------------------------------------------
// POST /api/comments/:postId -> add a comment to a post
// ----------------------------------------------------
router.post('/:postId', auth, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Comment cannot be empty.' });
    }

    const postResult = await pool.query('SELECT user_id FROM posts WHERE id = $1', [req.params.postId]);
    if (postResult.rows.length === 0) return res.status(404).json({ message: 'Post not found.' });

    const result = await pool.query(
      `INSERT INTO comments (post_id, user_id, content) VALUES ($1, $2, $3)
       RETURNING id, content, created_at`,
      [req.params.postId, req.user.id, content.trim()]
    );

    const postOwnerId = postResult.rows[0].user_id;
    if (postOwnerId !== req.user.id) {
      await pool.query(
        `INSERT INTO notifications (user_id, from_user_id, type, post_id) VALUES ($1, $2, 'comment', $3)`,
        [postOwnerId, req.user.id, req.params.postId]
      );
    }

    const userResult = await pool.query('SELECT username, full_name, avatar_url FROM users WHERE id = $1', [req.user.id]);

    res.status(201).json({ ...result.rows[0], ...userResult.rows[0] });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error adding comment.' });
  }
});

// ----------------------------------------------------
// DELETE /api/comments/:commentId -> only the author can delete
// ----------------------------------------------------
router.delete('/:commentId', auth, async (req, res) => {
  try {
    const comment = await pool.query('SELECT user_id FROM comments WHERE id = $1', [req.params.commentId]);
    if (comment.rows.length === 0) return res.status(404).json({ message: 'Comment not found.' });
    if (comment.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ message: 'You can only delete your own comments.' });
    }
    await pool.query('DELETE FROM comments WHERE id = $1', [req.params.commentId]);
    res.json({ message: 'Comment deleted.' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error deleting comment.' });
  }
});

module.exports = router;
