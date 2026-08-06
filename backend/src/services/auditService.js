const db = require('../config/db');

function logAudit(userId, username, action, details = '', ipAddress = '') {
  try {
    const stmt = db.prepare(`
      INSERT INTO audit_log (user_id, username, action, details, ip_address, timestamp)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `);
    stmt.run(userId || null, username || 'System', action, details, ipAddress);
  } catch (err) {
    console.error('Failed to write audit log:', err.message);
  }
}

function getAuditLogs(limit = 100) {
  return db.prepare('SELECT * FROM audit_log ORDER BY id DESC LIMIT ?').all(limit);
}

function logSystemMessage(logType, message, metadata = {}, roundNumber = 1) {
  try {
    const stmt = db.prepare(`
      INSERT INTO competition_log (round_number, log_type, message, metadata, timestamp)
      VALUES (?, ?, ?, ?, datetime('now'))
    `);
    stmt.run(roundNumber, logType, message, JSON.stringify(metadata));
  } catch (err) {
    console.error('Failed to write competition log:', err.message);
  }
}

function getSystemLogs(limit = 100) {
  return db.prepare('SELECT * FROM competition_log ORDER BY id DESC LIMIT ?').all(limit);
}

module.exports = {
  logAudit,
  getAuditLogs,
  logSystemMessage,
  getSystemLogs
};
