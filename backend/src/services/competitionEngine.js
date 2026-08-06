const db = require('../config/db');
const { broadcast } = require('./socketService');
const { logAudit, logSystemMessage } = require('./auditService');
const { getCompetitionState } = require('./timerService');

function broadcastStateAndTimer(actionMessage, stageChangedMessage = null) {
  const state = getCompetitionState();
  if (!state) return;

  const timerPayload = {
    stage: state.stage,
    remainingSeconds: state.remainingSeconds || 0,
    totalSeconds: state.totalSeconds || 0,
    roundNumber: state.round_number || 1,
    currentStatus: state.stage === 'PAUSED' ? 'PAUSED' : ((state.remainingSeconds || 0) <= 0 ? 'CLOSED' : 'ACTIVE'),
    timestamp: Date.now()
  };

  broadcast('competition:state', state);
  broadcast('competition:timer', timerPayload);

  if (stageChangedMessage || state.stage) {
    broadcast('competition:stageChanged', {
      stage: state.stage,
      roundNumber: state.round_number,
      message: stageChangedMessage || `Competition stage updated to ${state.stage}`
    });
  }

  if (state.stage === 'FINISHED') {
    broadcast('competition:submissionLocked', {
      locked: true,
      stage: 'FINISHED',
      roundNumber: state.round_number,
      message: 'Submission Closed'
    });
  }

  // Legacy events
  broadcast('timer_tick', { stage: state.stage, remainingSeconds: state.remainingSeconds, round_number: state.round_number });
}

function resetRound(adminUser, options = {}) {
  const state = db.prepare('SELECT round_number FROM competition_state WHERE id = 1').get();
  const currentRound = state ? state.round_number : 1;

  // Clear current round submissions and scores
  db.prepare(`
    DELETE FROM judge_scores 
    WHERE submission_id IN (SELECT id FROM submissions WHERE round_number = ?)
  `).run(currentRound);

  db.prepare('DELETE FROM submissions WHERE round_number = ?').run(currentRound);
  db.prepare('DELETE FROM team_progress WHERE round_number = ?').run(currentRound);

  // Reset state to IDLE
  db.prepare(`
    UPDATE competition_state
    SET stage = 'IDLE',
        observation_start_time = NULL,
        observation_end_time = NULL,
        competition_start_time = NULL,
        competition_end_time = NULL,
        paused_at = NULL,
        elapsed_pause_ms = 0,
        paused_stage = NULL
    WHERE id = 1
  `).run();

  logAudit(adminUser.id, adminUser.username, 'RESET_ROUND', `Reset Round ${currentRound} state, submissions, and timers.`);
  logSystemMessage('ROUND_RESET', `Round ${currentRound} reset by Admin ${adminUser.username}`, {}, currentRound);

  const updatedState = getCompetitionState();
  broadcast('competition_reset', {
    message: `Round ${currentRound} has been reset by Admin. Fresh state initialized.`,
    state: updatedState
  });

  broadcastStateAndTimer(`Round ${currentRound} reset by Admin.`, `Round ${currentRound} reset to IDLE.`);

  return updatedState;
}

function startRound(adminUser) {
  const state = db.prepare('SELECT * FROM competition_state WHERE id = 1').get();
  const currentRound = state ? state.round_number : 1;

  // Ensure reference image exists
  const refImage = db.prepare('SELECT * FROM reference_images WHERE round_number = ? ORDER BY id DESC LIMIT 1').get(currentRound);
  if (!refImage && !state.current_reference_image_id) {
    throw new Error(`Cannot start Round ${currentRound}: No reference image uploaded for this round.`);
  }

  // Get settings
  const settingsRows = db.prepare('SELECT key, value FROM competition_settings').all();
  const settings = {};
  settingsRows.forEach(r => settings[r.key] = r.value);

  const obsMins = parseFloat(settings.observation_time_mins || '15');
  const now = Date.now();
  const obsEnd = now + (obsMins * 60 * 1000);

  db.prepare(`
    UPDATE competition_state
    SET stage = 'OBSERVATION',
        observation_start_time = ?,
        observation_end_time = ?,
        competition_start_time = NULL,
        competition_end_time = NULL,
        paused_at = NULL,
        elapsed_pause_ms = 0,
        paused_stage = NULL,
        current_reference_image_id = ?
    WHERE id = 1
  `).run(now, obsEnd, refImage ? refImage.id : state.current_reference_image_id);

  // Update rounds table stage
  db.prepare("UPDATE rounds SET stage = 'OBSERVATION', started_at = datetime('now') WHERE round_number = ?").run(currentRound);

  logAudit(adminUser.id, adminUser.username, 'START_ROUND', `Started Round ${currentRound} (Observation: ${obsMins} mins)`);
  logSystemMessage('ROUND_STARTED', `Round ${currentRound} started by Admin ${adminUser.username}`, { obsMins }, currentRound);

  const updatedState = getCompetitionState();
  broadcast('competition_started', {
    message: `Round ${currentRound} is officially STARTED! Observation phase begins (${obsMins} mins).`,
    state: updatedState
  });

  broadcastStateAndTimer(`Round ${currentRound} started!`, `Observation Phase started (${obsMins} mins).`);

  return updatedState;
}

function pauseRound(adminUser) {
  const state = db.prepare('SELECT * FROM competition_state WHERE id = 1').get();
  if (state.stage !== 'OBSERVATION' && state.stage !== 'COMPETITION') {
    throw new Error(`Cannot pause round when stage is ${state.stage}`);
  }

  const now = Date.now();
  db.prepare(`
    UPDATE competition_state
    SET paused_stage = stage,
        stage = 'PAUSED',
        paused_at = ?
    WHERE id = 1
  `).run(now);

  logAudit(adminUser.id, adminUser.username, 'PAUSE_ROUND', `Paused Round ${state.round_number} during ${state.stage} phase.`);
  logSystemMessage('ROUND_PAUSED', `Round ${state.round_number} paused by Admin`, {}, state.round_number);

  const updatedState = getCompetitionState();
  broadcast('competition_paused', {
    message: `Round ${state.round_number} has been PAUSED by Admin.`,
    state: updatedState
  });

  broadcastStateAndTimer(`Round ${state.round_number} paused.`, `Competition PAUSED by Admin.`);

  return updatedState;
}

function resumeRound(adminUser) {
  const state = db.prepare('SELECT * FROM competition_state WHERE id = 1').get();
  if (state.stage !== 'PAUSED') {
    throw new Error('Round is not currently paused');
  }

  const now = Date.now();
  const pauseDurationMs = now - (state.paused_at || now);
  const targetStage = state.paused_stage || 'OBSERVATION';

  let newObsStart = state.observation_start_time;
  let newObsEnd = state.observation_end_time;
  let newCompStart = state.competition_start_time;
  let newCompEnd = state.competition_end_time;

  if (targetStage === 'OBSERVATION' && state.observation_end_time) {
    newObsEnd = state.observation_end_time + pauseDurationMs;
  } else if (targetStage === 'COMPETITION' && state.competition_end_time) {
    newCompEnd = state.competition_end_time + pauseDurationMs;
  }

  db.prepare(`
    UPDATE competition_state
    SET stage = ?,
        observation_end_time = ?,
        competition_end_time = ?,
        elapsed_pause_ms = elapsed_pause_ms + ?,
        paused_at = NULL,
        paused_stage = NULL
    WHERE id = 1
  `).run(targetStage, newObsEnd, newCompEnd, pauseDurationMs);

  logAudit(adminUser.id, adminUser.username, 'RESUME_ROUND', `Resumed Round ${state.round_number} (${targetStage} phase).`);
  logSystemMessage('ROUND_RESUMED', `Round ${state.round_number} resumed by Admin`, {}, state.round_number);

  const updatedState = getCompetitionState();
  broadcast('competition_resumed', {
    message: `Round ${state.round_number} has been RESUMED.`,
    state: updatedState
  });

  broadcastStateAndTimer(`Round ${state.round_number} resumed.`, `Competition RESUMED (${targetStage} phase).`);

  return updatedState;
}

function endRound(adminUser) {
  const state = db.prepare('SELECT * FROM competition_state WHERE id = 1').get();
  
  db.prepare(`
    UPDATE competition_state
    SET stage = 'FINISHED'
    WHERE id = 1
  `).run();

  db.prepare("UPDATE rounds SET stage = 'FINISHED', ended_at = datetime('now') WHERE round_number = ?").run(state.round_number);

  logAudit(adminUser.id, adminUser.username, 'END_ROUND', `Admin ended Round ${state.round_number} manually.`);
  logSystemMessage('ROUND_ENDED', `Round ${state.round_number} ended by Admin ${adminUser.username}`, {}, state.round_number);

  const updatedState = getCompetitionState();
  broadcast('competition_finished', {
    message: `Round ${state.round_number} has been ENDED by Admin. All submissions locked.`,
    state: updatedState
  });

  broadcastStateAndTimer(`Round ${state.round_number} ended by Admin.`, `Submission Closed`);

  return updatedState;
}

function nextRound(adminUser) {
  const state = db.prepare('SELECT round_number FROM competition_state WHERE id = 1').get();
  const newRoundNum = (state ? state.round_number : 1) + 1;

  // Create new entry in rounds
  db.prepare(`
    INSERT INTO rounds (round_number, title, stage)
    VALUES (?, ?, 'IDLE')
  `).run(newRoundNum, `Round ${newRoundNum} - Gotham Showdown`);

  // Update competition_state
  db.prepare(`
    UPDATE competition_state
    SET round_number = ?,
        stage = 'IDLE',
        observation_start_time = NULL,
        observation_end_time = NULL,
        competition_start_time = NULL,
        competition_end_time = NULL,
        paused_at = NULL,
        elapsed_pause_ms = 0,
        paused_stage = NULL,
        current_reference_image_id = NULL
    WHERE id = 1
  `).run(newRoundNum);

  logAudit(adminUser.id, adminUser.username, 'NEXT_ROUND', `Advanced competition to Round ${newRoundNum}`);
  logSystemMessage('NEXT_ROUND', `Advanced to Round ${newRoundNum} by Admin ${adminUser.username}`, {}, newRoundNum);

  const updatedState = getCompetitionState();
  broadcast('competition_reset', {
    message: `Competition has advanced to Round ${newRoundNum}! Fresh round initialized.`,
    state: updatedState
  });

  broadcastStateAndTimer(`Advanced to Round ${newRoundNum}.`, `Advanced to Round ${newRoundNum}.`);

  return updatedState;
}

module.exports = {
  resetRound,
  startRound,
  pauseRound,
  resumeRound,
  endRound,
  nextRound
};
