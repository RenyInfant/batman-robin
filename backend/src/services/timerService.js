const db = require('../config/db');
const { broadcast } = require('./socketService');
const { logSystemMessage } = require('./auditService');

let timerInterval = null;

function getCompetitionState() {
  const state = db.prepare('SELECT * FROM competition_state WHERE id = 1').get();
  if (!state) return null;

  // Retrieve settings
  const settingsRows = db.prepare('SELECT key, value FROM competition_settings').all();
  const settings = {};
  settingsRows.forEach(row => {
    settings[row.key] = row.value;
  });

  // Calculate remaining seconds
  const now = Date.now();
  let remainingSeconds = 0;
  let totalSeconds = 0;

  if (state.stage === 'OBSERVATION' && state.observation_end_time) {
    totalSeconds = Math.max(0, Math.round((state.observation_end_time - state.observation_start_time) / 1000));
    remainingSeconds = Math.max(0, Math.round((state.observation_end_time - now) / 1000));
  } else if (state.stage === 'COMPETITION' && state.competition_end_time) {
    totalSeconds = Math.max(0, Math.round((state.competition_end_time - state.competition_start_time) / 1000));
    remainingSeconds = Math.max(0, Math.round((state.competition_end_time - now) / 1000));
  } else if (state.stage === 'PAUSED') {
    if (state.paused_stage === 'OBSERVATION' && state.observation_end_time) {
      totalSeconds = Math.max(0, Math.round((state.observation_end_time - state.observation_start_time) / 1000));
      remainingSeconds = Math.max(0, Math.round((state.observation_end_time - state.paused_at) / 1000));
    } else if (state.paused_stage === 'COMPETITION' && state.competition_end_time) {
      totalSeconds = Math.max(0, Math.round((state.competition_end_time - state.competition_start_time) / 1000));
      remainingSeconds = Math.max(0, Math.round((state.competition_end_time - state.paused_at) / 1000));
    }
  }

  // Get active reference image if available
  let referenceImage = null;
  if (state.current_reference_image_id) {
    referenceImage = db.prepare('SELECT id, filename, filepath, original_name, created_at FROM reference_images WHERE id = ?').get(state.current_reference_image_id);
  } else {
    referenceImage = db.prepare('SELECT id, filename, filepath, original_name, created_at FROM reference_images WHERE round_number = ? ORDER BY id DESC LIMIT 1').get(state.round_number);
  }

  return {
    ...state,
    settings,
    remainingSeconds,
    totalSeconds,
    referenceImage: state.stage === 'IDLE' ? null : referenceImage
  };
}

function startTimerLoop() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  timerInterval = setInterval(() => {
    try {
      const state = db.prepare('SELECT * FROM competition_state WHERE id = 1').get();
      if (!state) return;

      const now = Date.now();
      let remainingSeconds = 0;
      let totalSeconds = 0;

      if (state.stage === 'OBSERVATION' && state.observation_end_time) {
        totalSeconds = Math.max(0, Math.round((state.observation_end_time - state.observation_start_time) / 1000));
        remainingSeconds = Math.max(0, Math.round((state.observation_end_time - now) / 1000));

        if (remainingSeconds <= 0) {
          // Automatic Transition from OBSERVATION -> COMPETITION
          const settingsRows = db.prepare('SELECT key, value FROM competition_settings').all();
          const settings = {};
          settingsRows.forEach(r => settings[r.key] = r.value);
          const compMins = parseFloat(settings.competition_time_mins || '30');
          const compDurationMs = compMins * 60 * 1000;

          const compStart = now;
          const compEnd = now + compDurationMs;

          db.prepare(`
            UPDATE competition_state
            SET stage = 'COMPETITION', competition_start_time = ?, competition_end_time = ?
            WHERE id = 1
          `).run(compStart, compEnd);

          logSystemMessage('STAGE_CHANGED', `Observation timer ended. Round ${state.round_number} transitioned to COMPETITION phase (${compMins} mins).`, {}, state.round_number);

          const fullState = getCompetitionState();

          // Broadcast exact synchronization events
          broadcast('competition:stageChanged', {
            stage: 'COMPETITION',
            roundNumber: state.round_number,
            message: `Observation Phase Complete! Competition Phase started (${compMins} mins)`
          });
          broadcast('competition:state', fullState);
          broadcast('competition_stage_changed', { stage: 'COMPETITION', round_number: state.round_number });
          return;
        }
      } else if (state.stage === 'COMPETITION' && state.competition_end_time) {
        totalSeconds = Math.max(0, Math.round((state.competition_end_time - state.competition_start_time) / 1000));
        remainingSeconds = Math.max(0, Math.round((state.competition_end_time - now) / 1000));

        if (remainingSeconds <= 0) {
          // Automatic Transition from COMPETITION -> FINISHED (Lock Submissions)
          db.prepare(`
            UPDATE competition_state
            SET stage = 'FINISHED'
            WHERE id = 1
          `).run();

          logSystemMessage('COMPETITION_FINISHED', `Round ${state.round_number} Competition timer ended. Submissions locked.`, {}, state.round_number);

          const fullState = getCompetitionState();

          // Broadcast exact synchronization & lock events
          broadcast('competition:submissionLocked', {
            locked: true,
            stage: 'FINISHED',
            roundNumber: state.round_number,
            message: 'Submission Closed'
          });
          broadcast('competition:stageChanged', {
            stage: 'FINISHED',
            roundNumber: state.round_number,
            message: 'Submission Closed'
          });
          broadcast('competition:state', fullState);
          broadcast('competition_finished', { stage: 'FINISHED', round_number: state.round_number });
          return;
        }
      } else if (state.stage === 'PAUSED') {
        if (state.paused_stage === 'OBSERVATION' && state.observation_end_time) {
          totalSeconds = Math.max(0, Math.round((state.observation_end_time - state.observation_start_time) / 1000));
          remainingSeconds = Math.max(0, Math.round((state.observation_end_time - state.paused_at) / 1000));
        } else if (state.paused_stage === 'COMPETITION' && state.competition_end_time) {
          totalSeconds = Math.max(0, Math.round((state.competition_end_time - state.competition_start_time) / 1000));
          remainingSeconds = Math.max(0, Math.round((state.competition_end_time - state.paused_at) / 1000));
        }
      }

      const timerPayload = {
        stage: state.stage,
        remainingSeconds,
        totalSeconds,
        roundNumber: state.round_number,
        currentStatus: state.stage === 'PAUSED' ? 'PAUSED' : (remainingSeconds <= 0 && state.stage !== 'IDLE' ? 'CLOSED' : 'ACTIVE'),
        timestamp: Date.now()
      };

      // SINGLE SOURCE OF TRUTH TIMER BROADCAST
      broadcast('competition:timer', timerPayload);
      broadcast('timer_tick', { stage: state.stage, remainingSeconds, round_number: state.round_number });
    } catch (err) {
      console.error('Error in timer loop:', err.message);
    }
  }, 1000);
}

module.exports = {
  getCompetitionState,
  startTimerLoop
};
