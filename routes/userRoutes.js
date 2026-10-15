const express = require('express');
const pool = require('../config/db');
const auth = require('../middleware/authMiddleware');

const router = express.Router();

// ----------------------------------------------------
// GET /api/users/me  -> current logged-in user's full profile
// ----------------------------------------------------
router.get('/me', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, email, full_name, bio, avatar_url, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error.' });
  }
});

// ----------------------------------------------------
// GET /api/users/search?q=term
// ----------------------------------------------------
router.get('/search', auth, async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.json([]);

    const result = await pool.query(
      `SELECT id, username, full_name, avatar_url, bio
       FROM users
       WHERE username ILIKE $1 OR full_name ILIKE $1
       LIMIT 20`,
      [`%${q}%`]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error.' });
  }
});
  
// ----------------------------------------------------
// GET /api/users/:username -> public profile + follow stats
// ----------------------------------------------------
router.get('/:username', auth, async (req, res) => {
  try {
    const { username } = req.params;

    const userResult = await pool.query(
      'SELECT id, username, full_name, bio, avatar_url, created_at FROM users WHERE username = $1',
      [username.toLowerCase()]
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }
    const profile = userResult.rows[0];

    const [followers, following, posts, isFollowing] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM follows WHERE following_id = $1', [profile.id]),
      pool.query('SELECT COUNT(*) FROM follows WHERE follower_id = $1', [profile.id]),
      pool.query('SELECT COUNT(*) FROM posts WHERE user_id = $1', [profile.id]),
      pool.query('SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2', [req.user.id, profile.id]),
    ]);

    res.json({
      ...profile,
      followerCount: parseInt(followers.rows[0].count, 10),
      followingCount: parseInt(following.rows[0].count, 10),
      postCount: parseInt(posts.rows[0].count, 10),
      isFollowing: isFollowing.rows.length > 0,
      isSelf: profile.id === req.user.id,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error.' });
  }
});

// ----------------------------------------------------
// PUT /api/users/me -> update profile
// ----------------------------------------------------
router.put('/me', auth, async (req, res) => {
  try {
    const { fullName, bio, avatarUrl } = req.body;
    const result = await pool.query(
      `UPDATE users SET
        full_name = COALESCE($1, full_name),
        bio = COALESCE($2, bio),
        avatar_url = COALESCE($3, avatar_url)
       WHERE id = $4
       RETURNING id, username, email, full_name, bio, avatar_url, created_at`,
      [fullName, bio, avatarUrl, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error.' });
  }
});

// ----------------------------------------------------
// POST /api/users/:username/follow -> toggle follow/unfollow
// ----------------------------------------------------
router.post('/:username/follow', auth, async (req, res) => {
  try {
    const targetResult = await pool.query('SELECT id FROM users WHERE username = $1', [req.params.username.toLowerCase()]);
    if (targetResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }
    const targetId = targetResult.rows[0].id;

    if (targetId === req.user.id) {
      return res.status(400).json({ message: "You can't follow yourself." });
    }

    const existing = await pool.query(
      'SELECT id FROM follows WHERE follower_id = $1 AND following_id = $2',
      [req.user.id, targetId]
    );

    if (existing.rows.length > 0) {
      await pool.query('DELETE FROM follows WHERE follower_id = $1 AND following_id = $2', [req.user.id, targetId]);
      return res.json({ following: false });
    } else {
      await pool.query('INSERT INTO follows (follower_id, following_id) VALUES ($1, $2)', [req.user.id, targetId]);
      await pool.query(
        `INSERT INTO notifications (user_id, from_user_id, type) VALUES ($1, $2, 'follow')`,
        [targetId, req.user.id]
      );
      return res.json({ following: true });
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error.' });
  }
});

// ----------------------------------------------------
// GET /api/users/:username/followers | /following
// ----------------------------------------------------
router.get('/:username/followers', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.username, u.full_name, u.avatar_url
       FROM follows f JOIN users u ON f.follower_id = u.id
       WHERE f.following_id = (SELECT id FROM users WHERE username = $1)
       ORDER BY f.created_at DESC`,
      [req.params.username.toLowerCase()]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error.' });
  }
});

router.get('/:username/following', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.username, u.full_name, u.avatar_url
       FROM follows f JOIN users u ON f.following_id = u.id
       WHERE f.follower_id = (SELECT id FROM users WHERE username = $1)
       ORDER BY f.created_at DESC`,
      [req.params.username.toLowerCase()]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;
