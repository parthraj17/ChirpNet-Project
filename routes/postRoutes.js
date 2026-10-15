const express = require('express');
const pool = require('../config/db');
const auth = require('../middleware/authMiddleware');

const router = express.Router();

// Shared SELECT used by feed/explore/profile/single-post so every
// post always comes back with like/comment counts + "did I like this".
function postSelect(currentUserId) {
  return `
    SELECT
      p.id, p.content, p.image_url, p.vibe, p.created_at,
      u.id AS user_id, u.username, u.full_name, u.avatar_url,
      (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id)::int AS like_count,
      (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id)::int AS comment_count,
      EXISTS(SELECT 1 FROM likes l WHERE l.post_id = p.id AND l.user_id = ${currentUserId}) AS liked_by_me
    FROM posts p
    JOIN users u ON p.user_id = u.id
  `;
}

// ----------------------------------------------------
// POST /api/posts -> create a new chirp
// ----------------------------------------------------
router.post('/', auth, async (req, res) => {
  try {
    const { content, imageUrl, vibe } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Post content cannot be empty.' });
    }
    if (content.length > 500) {
      return res.status(400).json({ message: 'Post is too long (max 500 characters).' });
    }

    const result = await pool.query(
      `INSERT INTO posts (user_id, content, image_url, vibe)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [req.user.id, content.trim(), imageUrl || null, vibe || null]
    );

    const full = await pool.query(postSelect(req.user.id) + ' WHERE p.id = $1', [result.rows[0].id]);
    res.status(201).json(full.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error creating post.' });
  }
});

// ----------------------------------------------------
// GET /api/posts/feed -> posts from people you follow + your own
// ----------------------------------------------------
router.get('/feed', auth, async (req, res) => {
  try {
    const result = await pool.query(
      postSelect(req.user.id) + `
      WHERE p.user_id = $1
         OR p.user_id IN (SELECT following_id FROM follows WHERE follower_id = $1)
      ORDER BY p.created_at DESC
      LIMIT 50`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error loading feed.' });
  }
});

// ----------------------------------------------------
// GET /api/posts/explore -> all posts, newest first (discover new people)
// ----------------------------------------------------
router.get('/explore', auth, async (req, res) => {
  try {
    const result = await pool.query(
      postSelect(req.user.id) + ' ORDER BY p.created_at DESC LIMIT 50'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error loading explore feed.' });
  }
});

// ----------------------------------------------------
// GET /api/posts/user/:username -> a specific user's posts
// ----------------------------------------------------
router.get('/user/:username', auth, async (req, res) => {
  try {
    const result = await pool.query(
      postSelect(req.user.id) + ' WHERE u.username = $1 ORDER BY p.created_at DESC',
      [req.params.username.toLowerCase()]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error loading user posts.' });
  }
});

// ----------------------------------------------------
// GET /api/posts/:id -> single post (with comments)
// ----------------------------------------------------
router.get('/:id', auth, async (req, res) => {
  try {
    const postResult = await pool.query(postSelect(req.user.id) + ' WHERE p.id = $1', [req.params.id]);
    if (postResult.rows.length === 0) return res.status(404).json({ message: 'Post not found.' });

    const commentsResult = await pool.query(
      `SELECT c.id, c.content, c.created_at, u.username, u.full_name, u.avatar_url
       FROM comments c JOIN users u ON c.user_id = u.id
       WHERE c.post_id = $1 ORDER BY c.created_at ASC`,
      [req.params.id]
    );

    res.json({ ...postResult.rows[0], comments: commentsResult.rows });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error loading post.' });
  }
});

// ----------------------------------------------------
// DELETE /api/posts/:id -> only the author can delete
// ----------------------------------------------------
router.delete('/:id', auth, async (req, res) => {
  try {
    const post = await pool.query('SELECT user_id FROM posts WHERE id = $1', [req.params.id]);
    if (post.rows.length === 0) return res.status(404).json({ message: 'Post not found.' });
    if (post.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ message: 'You can only delete your own posts.' });
    }
    await pool.query('DELETE FROM posts WHERE id = $1', [req.params.id]);
    res.json({ message: 'Post deleted.' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error deleting post.' });
  }
});

module.exports = router;
