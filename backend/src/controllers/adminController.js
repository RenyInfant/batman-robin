const bcrypt = require('bcryptjs');
const db = require('../config/db');
const path = require('path');
const fs = require('fs');
const { logAudit, getAuditLogs, getSystemLogs } = require('../services/auditService');
const { broadcast } = require('../services/socketService');
const { getCompetitionState } = require('../services/timerService');

// --- Team Management ---

exports.createTeam = (req, res) => {
  const { username, password, team_name, members } = req.body;

  if (!username || !password || !team_name || !members) {
    return res.status(400).json({ error: 'All fields (username, password, team_name, members) are required.' });
  }

  // Check unique username
  const existingUser = db.prepare('SELECT id FROM users WHERE LOWER(username) = LOWER(?)').get(username);
  if (existingUser) {
    return res.status(400).json({ error: 'Username is already taken.' });
  }

  // Check unique team_name
  const existingTeam = db.prepare('SELECT id FROM teams WHERE LOWER(team_name) = LOWER(?)').get(team_name);
  if (existingTeam) {
    return res.status(400).json({ error: 'Team name is already taken.' });
  }

  const password_hash = bcrypt.hashSync(password, 10);
  
  const insertUser = db.prepare("INSERT INTO users (username, password_hash, role) VALUES (?, ?, 'team')");
  const userRes = insertUser.run(username, password_hash);

  const insertTeam = db.prepare("INSERT INTO teams (user_id, team_name, members, is_enabled) VALUES (?, ?, ?, 1)");
  const teamRes = insertTeam.run(userRes.lastInsertRowid, team_name, members);

  logAudit(req.user.id, req.user.username, 'CREATE_TEAM', `Created team '${team_name}' (Username: ${username})`, req.ip);

  res.status(201).json({
    message: `Team '${team_name}' created successfully.`,
    team: {
      id: teamRes.lastInsertRowid,
      user_id: userRes.lastInsertRowid,
      username,
      team_name,
      members,
      is_enabled: 1
    }
  });
};

exports.getAllTeams = (req, res) => {
  const teams = db.prepare(`
    SELECT t.id, t.user_id, u.username, t.team_name, t.members, t.is_enabled, t.created_at
    FROM teams t
    JOIN users u ON t.user_id = u.id
    ORDER BY t.id ASC
  `).all();

  res.json({ teams });
};

exports.updateTeam = (req, res) => {
  const { id } = req.params;
  const { team_name, members, is_enabled } = req.body;

  const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(id);
  if (!team) {
    return res.status(404).json({ error: 'Team not found.' });
  }

  db.prepare(`
    UPDATE teams
    SET team_name = COALESCE(?, team_name),
        members = COALESCE(?, members),
        is_enabled = COALESCE(?, is_enabled)
    WHERE id = ?
  `).run(team_name, members, is_enabled !== undefined ? (is_enabled ? 1 : 0) : team.is_enabled, id);

  logAudit(req.user.id, req.user.username, 'UPDATE_TEAM', `Updated team ID ${id} (${team_name || team.team_name})`, req.ip);

  res.json({ message: 'Team details updated successfully.' });
};

exports.resetTeamPassword = (req, res) => {
  const { id } = req.params;
  const { new_password } = req.body;

  if (!new_password || new_password.length < 4) {
    return res.status(400).json({ error: 'New password must be at least 4 characters long.' });
  }

  const team = db.prepare('SELECT user_id, team_name FROM teams WHERE id = ?').get(id);
  if (!team) {
    return res.status(404).json({ error: 'Team not found.' });
  }

  const password_hash = bcrypt.hashSync(new_password, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(password_hash, team.user_id);

  logAudit(req.user.id, req.user.username, 'RESET_TEAM_PASSWORD', `Reset password for team '${team.team_name}'`, req.ip);

  res.json({ message: `Password for team '${team.team_name}' reset successfully.` });
};

exports.deleteTeam = (req, res) => {
  const { id } = req.params;
  const team = db.prepare('SELECT user_id, team_name FROM teams WHERE id = ?').get(id);
  if (!team) {
    return res.status(404).json({ error: 'Team not found.' });
  }

  // Delete user account (cascades to team and submissions)
  db.prepare('DELETE FROM users WHERE id = ?').run(team.user_id);

  logAudit(req.user.id, req.user.username, 'DELETE_TEAM', `Deleted team '${team.team_name}' (ID: ${id})`, req.ip);

  res.json({ message: `Team '${team.team_name}' deleted successfully.` });
};

// --- Settings Management ---

exports.getSettings = (req, res) => {
  const rows = db.prepare('SELECT key, value FROM competition_settings').all();
  const settings = {};
  rows.forEach(r => settings[r.key] = r.value);
  res.json({ settings });
};

exports.updateSettings = (req, res) => {
  const settingsObj = req.body; // e.g. { observation_time_mins: "15", competition_time_mins: "30" }

  const upsert = db.prepare('INSERT INTO competition_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');

  db.transaction(() => {
    Object.entries(settingsObj).forEach(([k, v]) => {
      upsert.run(k, String(v));
    });
  })();

  logAudit(req.user.id, req.user.username, 'UPDATE_SETTINGS', `Updated settings: ${JSON.stringify(settingsObj)}`, req.ip);

  const updatedState = getCompetitionState();
  broadcast('competition_settings_updated', { settings: updatedState.settings });

  res.json({ message: 'Competition settings updated successfully.', settings: updatedState.settings });
};

// --- Reference Image Management ---

exports.uploadReferenceImage = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No reference image file provided.' });
  }

  const state = db.prepare('SELECT round_number FROM competition_state WHERE id = 1').get();
  const currentRound = state ? state.round_number : 1;

  const insert = db.prepare(`
    INSERT INTO reference_images (round_number, filename, filepath, original_name, mimetype, size)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const relativePath = `/uploads/reference/${req.file.filename}`;
  const resImage = insert.run(
    currentRound,
    req.file.filename,
    relativePath,
    req.file.originalname,
    req.file.mimetype,
    req.file.size
  );

  const imageId = resImage.lastInsertRowid;

  // Update competition_state with current_reference_image_id
  db.prepare('UPDATE competition_state SET current_reference_image_id = ? WHERE id = 1').run(imageId);
  db.prepare('UPDATE rounds SET reference_image_id = ? WHERE round_number = ?').run(imageId, currentRound);

  logAudit(req.user.id, req.user.username, 'UPLOAD_REFERENCE_IMAGE', `Uploaded reference image '${req.file.originalname}' for Round ${currentRound}`, req.ip);

  const referenceImage = {
    id: imageId,
    round_number: currentRound,
    filename: req.file.filename,
    filepath: relativePath,
    original_name: req.file.originalname,
    size: req.file.size,
    created_at: new Date().toISOString()
  };

  broadcast('reference_image_uploaded', { referenceImage });

  res.status(201).json({
    message: `Reference image uploaded successfully for Round ${currentRound}.`,
    referenceImage
  });
};

exports.getReferenceImages = (req, res) => {
  const images = db.prepare('SELECT * FROM reference_images ORDER BY id DESC').all();
  res.json({ referenceImages: images });
};

// --- Logs & Audit ---

exports.getAuditLogList = (req, res) => {
  const logs = getAuditLogs(200);
  res.json({ auditLogs: logs });
};

exports.getSystemLogList = (req, res) => {
  const logs = getSystemLogs(200);
  res.json({ systemLogs: logs });
};

// --- AI Evaluation Handlers ---
const aiEvaluationService = require('../services/aiEvaluationService');

exports.triggerAiEvaluation = async (req, res) => {
  try {
    const roundNum = req.body.round ? parseInt(req.body.round) : null;
    const data = await aiEvaluationService.runAiEvaluation(roundNum, req.user);
    res.json({ message: 'AI Preliminary Evaluation completed successfully.', data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAiEvaluation = (req, res) => {
  try {
    const roundNum = req.query.round ? parseInt(req.query.round) : null;
    const data = aiEvaluationService.getAiEvaluationData(roundNum);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAiHealth = async (req, res) => {
  const health = await aiEvaluationService.checkAiServiceHealth();
  res.json({ health });
};

