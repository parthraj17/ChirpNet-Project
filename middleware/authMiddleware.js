const jwt = require('jsonwebtoken');

// Verifies the "Authorization: Bearer <token>" header on protected routes.
function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'No token provided. Please log in.' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token. Please log in again.' });
    }
    req.user = decoded; // { id, username }
    next();
  });
}

module.exports = authMiddleware;
