const db = require('../config/db');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '../../data/database.sqlite');
const backupDir = path.join(__dirname, '../../backups');

if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

function createBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFileName = `backup_${timestamp}.sqlite`;
  const backupFilePath = path.join(backupDir, backupFileName);

  // Use better-sqlite3 backup API
  db.backup(backupFilePath);

  const stats = fs.statSync(backupFilePath);
  return {
    filename: backupFileName,
    filepath: backupFilePath,
    size: stats.size,
    created_at: new Date().toISOString()
  };
}

function listBackups() {
  if (!fs.existsSync(backupDir)) return [];

  const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.sqlite'));
  return files.map(file => {
    const fullPath = path.join(backupDir, file);
    const stats = fs.statSync(fullPath);
    return {
      filename: file,
      size: stats.size,
      created_at: stats.birthtime.toISOString()
    };
  }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

function restoreBackup(filename) {
  const targetFile = path.join(backupDir, filename);
  if (!fs.existsSync(targetFile)) {
    throw new Error(`Backup file ${filename} does not exist.`);
  }

  // Create safety snapshot before restoring
  const snapshotName = `pre_restore_snapshot_${Date.now()}.sqlite`;
  db.backup(path.join(backupDir, snapshotName));

  // Copy backup over active dbPath
  fs.copyFileSync(targetFile, dbPath);
  return { message: `Database successfully restored from ${filename}`, snapshot: snapshotName };
}

function getDatabaseHealth() {
  let fileSize = 0;
  if (fs.existsSync(dbPath)) {
    fileSize = fs.statSync(dbPath).size;
  }

  const tableCounts = {
    users: db.prepare('SELECT count(*) as c FROM users').get().c,
    teams: db.prepare('SELECT count(*) as c FROM teams').get().c,
    competition_settings: db.prepare('SELECT count(*) as c FROM competition_settings').get().c,
    rounds: db.prepare('SELECT count(*) as c FROM rounds').get().c,
    reference_images: db.prepare('SELECT count(*) as c FROM reference_images').get().c,
    submissions: db.prepare('SELECT count(*) as c FROM submissions').get().c,
    judge_scores: db.prepare('SELECT count(*) as c FROM judge_scores').get().c,
    competition_log: db.prepare('SELECT count(*) as c FROM competition_log').get().c,
    audit_log: db.prepare('SELECT count(*) as c FROM audit_log').get().c
  };

  const sqliteVersion = db.prepare('SELECT sqlite_version() as v').get().v;
  const journalMode = db.prepare('PRAGMA journal_mode').get().journal_mode;
  const integrity = db.prepare('PRAGMA quick_check').get().quick_check;

  return {
    status: integrity === 'ok' ? 'HEALTHY' : 'DEGRADED',
    fileSize: `${(fileSize / (1024 * 1024)).toFixed(2)} MB`,
    rawSizeBytes: fileSize,
    sqliteVersion,
    journalMode,
    integrityCheck: integrity,
    tableCounts,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  createBackup,
  listBackups,
  restoreBackup,
  getDatabaseHealth
};
