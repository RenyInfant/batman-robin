const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { logAudit } = require('../services/auditService');

const JWT_SECRET = process.env.JWT_SECRET || 'gotham_dark_knight_secret_key_2026_super_secure!';

function login(req, res, targetRole) {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE LOWER(username) = LOWER(?)').get(username);

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials. User not found.' });
  }

  if (user.role !== targetRole) {
    return res.status(403).json({ error: `Access denied. Account role is '${user.role}', but expected '${targetRole}'. Please use the ${user.role.toUpperCase()} login page.` });
  }

  const isPasswordValid = bcrypt.compareSync(password, user.password_hash);
  if (!isPasswordValid) {
    return res.status(401).json({ error: 'Invalid credentials. Password incorrect.' });
  }

  // If role is team, verify team is enabled
  let teamDetails = null;
  if (user.role === 'team') {
    teamDetails = db.prepare('SELECT * FROM teams WHERE user_id = ?').get(user.id);
    if (!teamDetails) {
      return res.status(403).json({ error: 'Associated team profile not found.' });
    }
    if (!teamDetails.is_enabled) {
      return res.status(403).json({ error: 'This team account has been disabled by the Administrator.' });
    }
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  logAudit(user.id, user.username, 'LOGIN', `User logged in as ${user.role}`, req.ip);

  res.json({
    message: `${targetRole.toUpperCase()} login successful. Welcome to Gotham Competition Portal!`,
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      team: teamDetails
    }
  });
}

exports.loginAdmin = (req, res) => login(req, res, 'admin');
exports.loginJudge = (req, res) => login(req, res, 'judge');
exports.loginTeam = (req, res) => login(req, res, 'team');

exports.getMe = (req, res) => {
  res.json({
    user: req.user,
    team: req.team || null
  });
};
