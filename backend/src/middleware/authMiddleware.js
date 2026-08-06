const jwt = require('jsonwebtoken');
const db = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'gotham_dark_knight_secret_key_2026_super_secure!';

function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Missing token.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT id, username, role FROM users WHERE id = ?').get(decoded.id);

    if (!user) {
      return res.status(401).json({ error: 'Invalid authentication token. User not found.' });
    }

    req.user = user;

    // If role is team, attach team information
    if (user.role === 'team') {
      const team = db.prepare('SELECT id, team_name, members, is_enabled FROM teams WHERE user_id = ?').get(user.id);
      if (!team) {
        return res.status(403).json({ error: 'Team record not found for this user account.' });
      }
      if (!team.is_enabled) {
        return res.status(403).json({ error: 'Team account is currently disabled by Admin.' });
      }
      req.team = team;
    }

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.', details: err.message });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: `Access Denied. Role '${req.user.role}' is not authorized for this resource. Required: [${roles.join(', ')}]` 
      });
    }
    next();
  };
}

module.exports = {
  verifyToken,
  requireRole,
  JWT_SECRET
};
