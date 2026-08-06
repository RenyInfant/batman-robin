const backupService = require('../services/backupService');
const { logAudit } = require('../services/auditService');

exports.createBackup = (req, res) => {
  try {
    const backupInfo = backupService.createBackup();
    logAudit(req.user.id, req.user.username, 'CREATE_DB_BACKUP', `Created database backup '${backupInfo.filename}'`, req.ip);
    res.json({ message: 'Database backup created successfully.', backup: backupInfo });
  } catch (err) {
    res.status(500).json({ error: 'Database backup failed.', details: err.message });
  }
};

exports.getBackups = (req, res) => {
  try {
    const backups = backupService.listBackups();
    res.json({ backups });
  } catch (err) {
    res.status(500).json({ error: 'Failed to list backups.', details: err.message });
  }
};

exports.restoreBackup = (req, res) => {
  const { filename } = req.body;
  if (!filename) {
    return res.status(400).json({ error: 'Filename parameter is required.' });
  }

  try {
    const result = backupService.restoreBackup(filename);
    logAudit(req.user.id, req.user.username, 'RESTORE_DB_BACKUP', `Restored database from '${filename}'`, req.ip);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Database restore failed.', details: err.message });
  }
};

exports.getHealth = (req, res) => {
  try {
    const health = backupService.getDatabaseHealth();
    res.json({ health });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve database health metrics.', details: err.message });
  }
};
