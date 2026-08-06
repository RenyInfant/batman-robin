const db = require('../config/db');
const competitionEngine = require('../services/competitionEngine');
const { getCompetitionState } = require('../services/timerService');

exports.getState = (req, res) => {
  const state = getCompetitionState();
  
  // If user is a team AND stage is IDLE, hide reference image details
  if (req.user && req.user.role === 'team' && state.stage === 'IDLE') {
    state.referenceImage = null;
  }

  res.json({ state });
};

exports.getPublicSettings = (req, res) => {
  const rows = db.prepare('SELECT key, value FROM competition_settings').all();
  const settings = {};
  rows.forEach(r => settings[r.key] = r.value);
  res.json({ settings });
};

exports.handleResetRound = (req, res) => {
  try {
    const updatedState = competitionEngine.resetRound(req.user);
    res.json({ message: 'Round successfully reset.', state: updatedState });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.handleStartRound = (req, res) => {
  try {
    const updatedState = competitionEngine.startRound(req.user);
    res.json({ message: 'Round successfully started.', state: updatedState });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.handlePauseRound = (req, res) => {
  try {
    const updatedState = competitionEngine.pauseRound(req.user);
    res.json({ message: 'Round successfully paused.', state: updatedState });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.handleResumeRound = (req, res) => {
  try {
    const updatedState = competitionEngine.resumeRound(req.user);
    res.json({ message: 'Round successfully resumed.', state: updatedState });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.handleEndRound = (req, res) => {
  try {
    const updatedState = competitionEngine.endRound(req.user);
    res.json({ message: 'Round successfully ended.', state: updatedState });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.handleNextRound = (req, res) => {
  try {
    const updatedState = competitionEngine.nextRound(req.user);
    res.json({ message: 'Advanced to next round.', state: updatedState });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getRoundsHistory = (req, res) => {
  const rounds = db.prepare(`
    SELECT r.*, 
           ri.filename as ref_filename, ri.filepath as ref_filepath,
           (SELECT count(*) FROM submissions s WHERE s.round_number = r.round_number) as total_submissions
    FROM rounds r
    LEFT JOIN reference_images ri ON r.reference_image_id = ri.id
    ORDER BY r.round_number DESC
  `).all();

  res.json({ rounds });
};
