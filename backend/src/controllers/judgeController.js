const db = require('../config/db');
const { broadcast } = require('../services/socketService');
const { logAudit } = require('../services/auditService');
const { getLeaderboardData } = require('../services/exportService');

exports.getSubmissionsForJudge = (req, res) => {
  const state = db.prepare('SELECT round_number FROM competition_state WHERE id = 1').get();
  const targetRound = req.query.round ? parseInt(req.query.round) : (state ? state.round_number : 1);

  // Get current reference image for round
  const refImage = db.prepare('SELECT * FROM reference_images WHERE round_number = ? ORDER BY id DESC LIMIT 1').get(targetRound);

  // Get all submissions for the round with team details, existing score, breakdown criteria, AI similarity & draft status
  const submissions = db.prepare(`
    SELECT s.*, 
           t.team_name, t.members,
           ai.similarity_score as ai_similarity_score,
           js.score as my_score, 
           js.prompt_accuracy as my_prompt_accuracy,
           js.creativity as my_creativity,
           js.similarity as my_similarity,
           js.detail as my_detail,
           js.overall_quality as my_overall_quality,
           js.is_draft as my_is_draft,
           js.feedback as my_feedback, 
           js.updated_at as scored_at,
           (
             SELECT AVG(score) FROM judge_scores 
             WHERE submission_id = s.id AND (is_draft IS NULL OR is_draft = 0)
           ) as avg_published_score,
           (
             SELECT COUNT(*) FROM judge_scores 
             WHERE submission_id = s.id AND (is_draft IS NULL OR is_draft = 0)
           ) as published_judge_count
    FROM submissions s
    JOIN teams t ON s.team_id = t.id
    LEFT JOIN judge_scores js ON s.id = js.submission_id AND js.judge_id = ?
    LEFT JOIN ai_similarity ai ON s.id = ai.submission_id
    WHERE s.round_number = ?
    ORDER BY s.id DESC
  `).all(req.user.id, targetRound);


  res.json({
    roundNumber: targetRound,
    referenceImage: refImage || null,
    submissions
  });
};

exports.submitScore = (req, res) => {
  const { 
    submission_id, 
    prompt_accuracy, 
    creativity, 
    similarity, 
    detail, 
    overall_quality, 
    feedback, 
    is_draft 
  } = req.body;

  if (!submission_id) {
    return res.status(400).json({ error: 'submission_id is required.' });
  }

  // Parse criteria inputs (default to 0 if missing)
  const pSim = Math.min(40, Math.max(0, parseFloat(similarity || 0)));
  const pAcc = Math.min(20, Math.max(0, parseFloat(prompt_accuracy || 0)));
  const pDet = Math.min(20, Math.max(0, parseFloat(detail || 0)));
  const pCre = Math.min(10, Math.max(0, parseFloat(creativity || 0)));
  const pQua = Math.min(10, Math.max(0, parseFloat(overall_quality || 0)));

  // Total score calculation (sum of 5 criteria = 0 to 100)
  const totalScore = parseFloat((pSim + pAcc + pDet + pCre + pQua).toFixed(2));
  const isDraftFlag = is_draft ? 1 : 0;


  const submission = db.prepare(`
    SELECT s.*, t.team_name 
    FROM submissions s 
    JOIN teams t ON s.team_id = t.id 
    WHERE s.id = ?
  `).get(submission_id);

  if (!submission) {
    return res.status(404).json({ error: 'Submission not found.' });
  }

  // UPSERT score record (ensures single score per judge per submission)
  const upsert = db.prepare(`
    INSERT INTO judge_scores (
      round_number, submission_id, judge_id, score,
      prompt_accuracy, creativity, similarity, detail, overall_quality, is_draft,
      feedback, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(submission_id, judge_id) DO UPDATE SET
      score = excluded.score,
      prompt_accuracy = excluded.prompt_accuracy,
      creativity = excluded.creativity,
      similarity = excluded.similarity,
      detail = excluded.detail,
      overall_quality = excluded.overall_quality,
      is_draft = excluded.is_draft,
      feedback = excluded.feedback,
      updated_at = datetime('now')
  `);

  upsert.run(
    submission.round_number, 
    submission_id, 
    req.user.id, 
    totalScore,
    pAcc, 
    pCre, 
    pSim, 
    pDet, 
    pQua, 
    isDraftFlag,
    feedback || ''
  );

  const actionText = isDraftFlag ? 'SAVE_DRAFT_SCORE' : 'PUBLISH_SCORE';
  logAudit(req.user.id, req.user.username, actionText, `Judge '${req.user.username}' ${isDraftFlag ? 'saved draft score' : 'published score'} for team '${submission.team_name}' (${totalScore}/100)`, req.ip);

  // Broadcast real-time Socket.IO updates if score is published
  if (!isDraftFlag) {
    const leaderboardData = getLeaderboardData(submission.round_number);

    broadcast('judge_score_updated', {
      message: `Judge '${req.user.username}' published evaluation for Team '${submission.team_name}'.`,
      submission_id,
      team_name: submission.team_name,
      judge_username: req.user.username,
      score: totalScore
    });

    broadcast('leaderboard_updated', {
      roundNumber: submission.round_number,
      leaderboard: leaderboardData.results
    });
  }

  res.json({
    message: isDraftFlag 
      ? `Draft evaluation saved for Team '${submission.team_name}'.` 
      : `Score published successfully for Team '${submission.team_name}'!`,
    totalScore,
    isDraft: isDraftFlag === 1,
    criteria: {
      prompt_accuracy: pAcc,
      creativity: pCre,
      similarity: pSim,
      detail: pDet,
      overall_quality: pQua
    },
    feedback: feedback || ''
  });
};

exports.getLeaderboard = (req, res) => {
  const roundNum = req.query.round ? parseInt(req.query.round) : null;
  const settingsRows = db.prepare('SELECT key, value FROM competition_settings').all();
  const settings = {};
  settingsRows.forEach(r => settings[r.key] = r.value);

  const leaderboardMode = settings.leaderboard_visibility || 'Live';
  const leaderboardData = getLeaderboardData(roundNum);

  res.json({
    leaderboardMode,
    ...leaderboardData
  });
};
