const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, '../../data/database.sqlite');
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let dbInstance = null;

try {
  const BetterSqlite3 = require('better-sqlite3');
  const bDb = new BetterSqlite3(dbPath);
  bDb.pragma('foreign_keys = ON');
  dbInstance = bDb;
} catch (e) {
  // Fallback to Node.js native sqlite DatabaseSync (available in Node 22+)
  const { DatabaseSync } = require('node:sqlite');
  const nDb = new DatabaseSync(dbPath);
  nDb.exec('PRAGMA foreign_keys = ON;');

  dbInstance = {
    exec: (sql) => nDb.exec(sql),
    prepare: (sql) => {
      const stmt = nDb.prepare(sql);
      return {
        get: (...params) => stmt.get(...params),
        all: (...params) => stmt.all(...params),
        run: (...params) => {
          const res = stmt.run(...params);
          return {
            changes: res.changes,
            lastInsertRowid: res.lastInsertRowid ? Number(res.lastInsertRowid) : 0
          };
        }
      };
    },
    pragma: (pragmaStr) => nDb.exec(`PRAGMA ${pragmaStr};`),
    transaction: (fn) => {
      return (...args) => {
        nDb.exec('BEGIN TRANSACTION;');
        try {
          const result = fn(...args);
          nDb.exec('COMMIT;');
          return result;
        } catch (err) {
          nDb.exec('ROLLBACK;');
          throw err;
        }
      };
    },
    backup: (targetPath) => {
      fs.copyFileSync(dbPath, targetPath);
    }
  };
}

const db = dbInstance;

function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT CHECK(role IN ('admin', 'judge', 'team')) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      team_name TEXT UNIQUE NOT NULL,
      members TEXT NOT NULL,
      is_enabled INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS competition_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS competition_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      stage TEXT CHECK(stage IN ('IDLE', 'OBSERVATION', 'COMPETITION', 'PAUSED', 'FINISHED')) DEFAULT 'IDLE',
      observation_start_time INTEGER,
      observation_end_time INTEGER,
      competition_start_time INTEGER,
      competition_end_time INTEGER,
      paused_at INTEGER,
      elapsed_pause_ms INTEGER DEFAULT 0,
      paused_stage TEXT,
      round_number INTEGER DEFAULT 1,
      current_reference_image_id INTEGER
    );

    CREATE TABLE IF NOT EXISTS rounds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      round_number INTEGER UNIQUE NOT NULL,
      title TEXT,
      reference_image_id INTEGER,
      stage TEXT DEFAULT 'IDLE',
      winner_team_id INTEGER,
      started_at DATETIME,
      ended_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS team_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      round_number INTEGER NOT NULL,
      team_id INTEGER NOT NULL,
      stage TEXT NOT NULL,
      started_at DATETIME,
      finished_at DATETIME,
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reference_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      round_number INTEGER NOT NULL,
      filename TEXT NOT NULL,
      filepath TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mimetype TEXT NOT NULL,
      size INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      round_number INTEGER NOT NULL,
      team_id INTEGER NOT NULL,
      filename TEXT NOT NULL,
      filepath TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mimetype TEXT NOT NULL,
      size INTEGER NOT NULL,
      prompt_notes TEXT,
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
      UNIQUE(round_number, team_id)
    );

    CREATE TABLE IF NOT EXISTS judge_scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      round_number INTEGER NOT NULL,
      submission_id INTEGER NOT NULL,
      judge_id INTEGER NOT NULL,
      score REAL NOT NULL CHECK(score >= 0 AND score <= 100),
      prompt_accuracy REAL DEFAULT 0,
      creativity REAL DEFAULT 0,
      similarity REAL DEFAULT 0,
      detail REAL DEFAULT 0,
      overall_quality REAL DEFAULT 0,
      is_draft INTEGER DEFAULT 0,
      feedback TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
      FOREIGN KEY (judge_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(submission_id, judge_id)
    );


    CREATE TABLE IF NOT EXISTS ai_similarity (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      round_number INTEGER NOT NULL,
      team_id INTEGER NOT NULL,
      submission_id INTEGER UNIQUE NOT NULL,
      similarity_score REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS competition_log (

      id INTEGER PRIMARY KEY AUTOINCREMENT,
      round_number INTEGER DEFAULT 1,
      log_type TEXT NOT NULL,
      message TEXT NOT NULL,
      metadata TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      username TEXT,
      action TEXT NOT NULL,
      details TEXT,
      ip_address TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  ['prompt_accuracy', 'creativity', 'similarity', 'detail', 'overall_quality', 'is_draft'].forEach(col => {
    try {
      db.exec(`ALTER TABLE judge_scores ADD COLUMN ${col} REAL DEFAULT 0;`);
    } catch (e) {}
  });

  // Seed default Settings if empty
  const countSettings = db.prepare('SELECT count(*) as count FROM competition_settings').get();
  if (countSettings.count === 0) {
    const insertSetting = db.prepare('INSERT INTO competition_settings (key, value) VALUES (?, ?)');
    const defaultSettings = [
      ['competition_name', 'Batman & Robin – AI Prompt Engineering Championship 2026'],
      ['venue', 'Wayne Manor Tech Center, Gotham'],
      ['competition_date', '2026-08-15'],
      ['observation_time_mins', '10'],
      ['competition_time_mins', '30'],
      ['max_upload_size_mb', '10'],
      ['leaderboard_visibility', 'Live'],
      ['max_team_count', '20'],
      ['hybrid_scoring_enabled', 'OFF'],
      ['judge_weight', '70'],
      ['ai_weight', '30']
    ];
    defaultSettings.forEach(([k, v]) => insertSetting.run(k, v));
  }


  // Seed initial State if empty
  const state = db.prepare('SELECT * FROM competition_state WHERE id = 1').get();
  if (!state) {
    db.prepare(`
      INSERT INTO competition_state (id, stage, round_number, elapsed_pause_ms)
      VALUES (1, 'IDLE', 1, 0)
    `).run();
  }

  // Seed initial Round 1 record if empty
  const round1 = db.prepare('SELECT * FROM rounds WHERE round_number = 1').get();
  if (!round1) {
    db.prepare('INSERT INTO rounds (round_number, title, stage) VALUES (1, ?, ?)').run('Round 1 - Gotham Genesis', 'IDLE');
  }

  // Seed default Users: Admin, Judge 1, Judge 2, Team 1, Team 2
  const adminUser = db.prepare("SELECT * FROM users WHERE username = 'admin'").get();
  if (!adminUser) {
    const adminPass = bcrypt.hashSync('admin123', 10);
    db.prepare("INSERT INTO users (username, password_hash, role) VALUES ('admin', ?, 'admin')").run(adminPass);
  }

  const judgeUser = db.prepare("SELECT * FROM users WHERE username = 'judge1'").get();
  if (!judgeUser) {
    const judgePass = bcrypt.hashSync('judge123', 10);
    db.prepare("INSERT INTO users (username, password_hash, role) VALUES ('judge1', ?, 'judge')").run(judgePass);
  }

  const judgeUser2 = db.prepare("SELECT * FROM users WHERE username = 'judge2'").get();
  if (!judgeUser2) {
    const judge2Pass = bcrypt.hashSync('judge123', 10);
    db.prepare("INSERT INTO users (username, password_hash, role) VALUES ('judge2', ?, 'judge')").run(judge2Pass);
  }

  const team1User = db.prepare("SELECT * FROM users WHERE username = 'team1'").get();
  if (!team1User) {
    const teamPass = bcrypt.hashSync('team123', 10);
    const res = db.prepare("INSERT INTO users (username, password_hash, role) VALUES ('team1', ?, 'team')").run(teamPass);
    db.prepare("INSERT INTO teams (user_id, team_name, members, is_enabled) VALUES (?, 'Dark Knights', 'Bruce Wayne, Dick Grayson', 1)").run(res.lastInsertRowid);
  }

  const team2User = db.prepare("SELECT * FROM users WHERE username = 'team2'").get();
  if (!team2User) {
    const team2Pass = bcrypt.hashSync('team123', 10);
    const res = db.prepare("INSERT INTO users (username, password_hash, role) VALUES ('team2', ?, 'team')").run(team2Pass);
    db.prepare("INSERT INTO teams (user_id, team_name, members, is_enabled) VALUES (?, 'Gotham Crusaders', 'Tim Drake, Barbara Gordon', 1)").run(res.lastInsertRowid);
  }
}

initDb();

module.exports = db;
