const express = require('express');
const pool = require('../config/db');
const auth = require('../middleware/authMiddleware');

const router = express.Router();

// ----------------------------------------------------
// GET /api/notifications -> latest notifications for the logged-in user
// ----------------------------------------------------
router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT n.id, n.type, n.post_id, n.is_read, n.created_at,
              u.username AS from_username, u.full_name AS from_full_name, u.avatar_url AS from_avatar_url
       FROM notifications n
       JOIN users u ON n.from_user_id = u.id
       WHERE n.user_id = $1
       ORDER BY n.created_at DESC
       LIMIT 50`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error loading notifications.' });
  }
});

// ----------------------------------------------------
// GET /api/notifications/unread-count
// ----------------------------------------------------
router.get('/unread-count', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = FALSE',
      [req.user.id]
    );
    res.json({ count: parseInt(result.rows[0].count, 10) });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error.' });
  }
});

// ----------------------------------------------------
// PUT /api/notifications/mark-read -> mark all as read
// ----------------------------------------------------
router.put('/mark-read', auth, async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET is_read = TRUE WHERE user_id = $1', [req.user.id]);
    res.json({ message: 'All notifications marked as read.' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;
