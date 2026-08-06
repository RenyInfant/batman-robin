const db = require('../config/db');
const path = require('path');
const fs = require('fs');
const { broadcast } = require('../services/socketService');
const { logAudit } = require('../services/auditService');

exports.getMySubmission = (req, res) => {
  const state = db.prepare('SELECT stage, round_number FROM competition_state WHERE id = 1').get();
  const currentRound = state ? state.round_number : 1;

  const submission = db.prepare(`
    SELECT id, round_number, team_id, filename, filepath, original_name, mimetype, size, prompt_notes, submitted_at, updated_at
    FROM submissions
    WHERE team_id = ? AND round_number = ?
  `).get(req.team.id, currentRound);

  res.json({
    submission: submission || null,
    isLocked: state.stage !== 'COMPETITION'
  });
};

exports.submitOrReplaceImage = (req, res) => {
  const state = db.prepare('SELECT * FROM competition_state WHERE id = 1').get();

  // STRICT LOCK ENFORCEMENT: Backend rejects upload if stage is not COMPETITION or timer expired
  if (state.stage !== 'COMPETITION') {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path); // Clean up temp file
    }
    return res.status(403).json({ error: `Submissions are locked. Current competition stage is '${state.stage}'. Uploads are only accepted during active COMPETITION stage.` });
  }

  const now = Date.now();
  if (state.competition_end_time && now >= state.competition_end_time) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(403).json({ error: 'Competition time has expired. Submissions are strictly locked.' });
  }

  const { prompt_notes } = req.body;
  const currentRound = state.round_number;
  const relativePath = req.file ? `/uploads/submissions/${req.file.filename}` : null;

  // Check if team already has a submission for this round
  const existingSub = db.prepare('SELECT * FROM submissions WHERE team_id = ? AND round_number = ?').get(req.team.id, currentRound);

  let submissionId;
  let isReplacement = false;

  if (existingSub) {
    isReplacement = true;
    // Delete old file if new file uploaded
    if (req.file && existingSub.filepath) {
      const oldFullPath = path.join(__dirname, '../../', existingSub.filepath);
      if (fs.existsSync(oldFullPath)) {
        try { fs.unlinkSync(oldFullPath); } catch (e) {}
      }
    }

    db.prepare(`
      UPDATE submissions
      SET filename = COALESCE(?, filename),
          filepath = COALESCE(?, filepath),
          original_name = COALESCE(?, original_name),
          mimetype = COALESCE(?, mimetype),
          size = COALESCE(?, size),
          prompt_notes = COALESCE(?, prompt_notes),
          updated_at = datetime('now')
      WHERE id = ?
    `).run(
      req.file ? req.file.filename : null,
      relativePath,
      req.file ? req.file.originalname : null,
      req.file ? req.file.mimetype : null,
      req.file ? req.file.size : null,
      prompt_notes !== undefined ? prompt_notes : existingSub.prompt_notes,
      existingSub.id
    );

    submissionId = existingSub.id;
  } else {
    if (!req.file) {
      return res.status(400).json({ error: 'An image file is required for initial submission.' });
    }

    const insert = db.prepare(`
      INSERT INTO submissions (round_number, team_id, filename, filepath, original_name, mimetype, size, prompt_notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insert.run(
      currentRound,
      req.team.id,
      req.file.filename,
      relativePath,
      req.file.originalname,
      req.file.mimetype,
      req.file.size,
      prompt_notes || ''
    );

    submissionId = result.lastInsertRowid;
  }

  const updatedSub = db.prepare('SELECT * FROM submissions WHERE id = ?').get(submissionId);

  logAudit(req.user.id, req.user.username, isReplacement ? 'REPLACE_SUBMISSION' : 'CREATE_SUBMISSION', `Team '${req.team.team_name}' ${isReplacement ? 'replaced' : 'created'} submission for Round ${currentRound}`, req.ip);

  const socketEvent = isReplacement ? 'submission_replaced' : 'submission_uploaded';
  broadcast(socketEvent, {
    message: `Team '${req.team.team_name}' ${isReplacement ? 'updated' : 'submitted'} their final image for Round ${currentRound}.`,
    submission: {
      id: updatedSub.id,
      round_number: updatedSub.round_number,
      team_id: updatedSub.team_id,
      team_name: req.team.team_name,
      submitted_at: updatedSub.submitted_at
    }
  });

  res.json({
    message: `Submission ${isReplacement ? 'updated' : 'uploaded'} successfully!`,
    submission: updatedSub
  });
};
