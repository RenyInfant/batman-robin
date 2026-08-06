const db = require('../config/db');
const XLSX = require('xlsx');
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

function getLeaderboardData(roundNumber = null) {
  const state = db.prepare('SELECT round_number FROM competition_state WHERE id = 1').get();
  const targetRound = roundNumber || (state ? state.round_number : 1);

  // Settings
  const settingsRows = db.prepare('SELECT key, value FROM competition_settings').all();
  const settings = {};
  settingsRows.forEach(r => settings[r.key] = r.value);

  const isHybridEnabled = settings.hybrid_scoring_enabled === 'ON';
  const judgeWeight = parseFloat(settings.judge_weight || '70') / 100.0;
  const aiWeight = parseFloat(settings.ai_weight || '30') / 100.0;

  // Retrieve all enabled teams and their submission for targetRound
  const teams = db.prepare(`
    SELECT t.id as team_id, t.team_name, t.members,
           s.id as submission_id, s.filename, s.submitted_at, s.prompt_notes,
           ai.similarity_score
    FROM teams t
    LEFT JOIN submissions s ON t.id = s.team_id AND s.round_number = ?
    LEFT JOIN ai_similarity ai ON s.id = ai.submission_id
    WHERE t.is_enabled = 1
  `).all(targetRound);

  // Retrieve all judges
  const judges = db.prepare("SELECT id, username FROM users WHERE role = 'judge' ORDER BY id ASC").all();

  const results = teams.map(team => {
    let judgeScores = {};
    let totalScore = 0;
    let scoreCount = 0;

    if (team.submission_id) {
      const scores = db.prepare(`
        SELECT judge_id, score, feedback 
        FROM judge_scores 
        WHERE submission_id = ? AND (is_draft IS NULL OR is_draft = 0)
      `).all(team.submission_id);

      scores.forEach(s => {
        judgeScores[s.judge_id] = s.score;
        totalScore += s.score;
        scoreCount++;
      });
    }

    const avgJudgeScore = scoreCount > 0 ? parseFloat((totalScore / scoreCount).toFixed(2)) : 0;
    const aiSimilarity = team.similarity_score !== null && team.similarity_score !== undefined ? parseFloat(team.similarity_score) : 0;

    let finalScore = avgJudgeScore;
    if (isHybridEnabled) {
      finalScore = parseFloat(((avgJudgeScore * judgeWeight) + (aiSimilarity * aiWeight)).toFixed(2));
    }

    return {
      team_id: team.team_id,
      team_name: team.team_name,
      members: team.members,
      has_submission: !!team.submission_id,
      submitted_at: team.submitted_at || 'N/A',
      prompt_notes: team.prompt_notes || 'N/A',
      ai_similarity: aiSimilarity,
      judge_scores: judgeScores,
      total_score: totalScore,
      average_score: avgJudgeScore,
      final_score: finalScore,
      score_count: scoreCount
    };
  });

  // Sort by final_score desc, then average_score desc, then submitted_at asc
  results.sort((a, b) => {
    if (b.final_score !== a.final_score) return b.final_score - a.final_score;
    if (b.average_score !== a.average_score) return b.average_score - a.average_score;
    if (a.submitted_at === 'N/A') return 1;
    if (b.submitted_at === 'N/A') return -1;
    return new Date(a.submitted_at) - new Date(b.submitted_at);
  });

  // Assign ranks
  results.forEach((item, index) => {
    item.rank = item.has_submission ? index + 1 : 'N/A';
  });

  return { roundNumber: targetRound, judges, settings, results };
}

function exportCSV(roundNumber = null) {
  const { roundNumber: rNum, judges, results } = getLeaderboardData(roundNumber);
  
  let headers = ['Rank', 'Team Name', 'Members', 'Submission Status', 'Submitted At', 'AI Similarity %', 'Judge Avg Score', 'Final Score'];
  judges.forEach(j => headers.push(`Judge (${j.username})`));
  headers.push('Prompt Notes');

  let rows = [headers.join(',')];

  results.forEach(r => {
    let row = [
      `"${r.rank}"`,
      `"${r.team_name.replace(/"/g, '""')}"`,
      `"${r.members.replace(/"/g, '""')}"`,
      `"${r.has_submission ? 'Submitted' : 'Pending'}"`,
      `"${r.submitted_at}"`,
      `"${r.ai_similarity}%"`,
      `"${r.average_score}"`,
      `"${r.final_score}"`
    ];

    judges.forEach(j => {
      const score = r.judge_scores[j.id] !== undefined ? r.judge_scores[j.id] : 'N/A';
      row.push(`"${score}"`);
    });

    row.push(`"${r.prompt_notes.replace(/"/g, '""')}"`);
    rows.push(row.join(','));
  });

  return rows.join('\n');
}

function exportExcel(roundNumber = null) {
  const { roundNumber: rNum, judges, results } = getLeaderboardData(roundNumber);

  const excelRows = results.map(r => {
    const rowObj = {
      'Rank': r.rank,
      'Team Name': r.team_name,
      'Members': r.members,
      'Status': r.has_submission ? 'Submitted' : 'Pending',
      'Submitted At': r.submitted_at,
      'AI Similarity %': `${r.ai_similarity}%`,
      'Judge Avg Score': r.average_score,
      'Final Score': r.final_score
    };

    judges.forEach(j => {
      rowObj[`Judge (${j.username})`] = r.judge_scores[j.id] !== undefined ? r.judge_scores[j.id] : 'N/A';
    });

    rowObj['Prompt Notes'] = r.prompt_notes;
    return rowObj;
  });

  const worksheet = XLSX.utils.json_to_sheet(excelRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, `Round ${rNum} Results`);

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  return buffer;
}

function exportPDF(roundNumber = null, res) {
  const { roundNumber: rNum, judges, results } = getLeaderboardData(roundNumber);

  const doc = new PDFDocument({ margin: 30, size: 'A4' });
  doc.pipe(res);

  // Header Banner
  doc.fillColor('#0B0F19').rect(0, 0, 595.28, 70).fill();
  doc.fillColor('#FFB800').fontSize(18).text('BATMAN & ROBIN AI PROMPT COMPETITION', 30, 20, { bold: true });
  doc.fillColor('#00E5FF').fontSize(12).text(`Official Leaderboard & AI Evaluation Report - Round ${rNum}`, 30, 42);

  doc.moveDown(2);
  doc.fillColor('#333333').fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, 30, 80);

  // Table Setup
  let y = 105;
  doc.fillColor('#151C2C').rect(30, y, 535, 24).fill();
  doc.fillColor('#FFB800').fontSize(8);
  doc.text('Rank', 35, y + 7, { width: 30 });
  doc.text('Team Name', 68, y + 7, { width: 120 });
  doc.text('AI Similarity', 190, y + 7, { width: 70 });
  doc.text('Judge Score', 265, y + 7, { width: 70 });
  doc.text('Final Score', 340, y + 7, { width: 70 });
  doc.text('Submitted At', 415, y + 7, { width: 85 });
  doc.text('Status', 505, y + 7, { width: 55 });

  y += 24;

  results.forEach((r, i) => {
    if (y > 750) {
      doc.addPage();
      y = 30;
    }

    const bgColor = i % 2 === 0 ? '#F8F9FA' : '#FFFFFF';
    doc.fillColor(bgColor).rect(30, y, 535, 22).fill();

    doc.fillColor('#111111').fontSize(8);
    doc.text(String(r.rank), 35, y + 6, { width: 30 });
    doc.text(r.team_name, 68, y + 6, { width: 120 });
    doc.text(`${r.ai_similarity}%`, 190, y + 6, { width: 70 });
    doc.text(String(r.average_score), 265, y + 6, { width: 70 });
    doc.text(String(r.final_score), 340, y + 6, { width: 70 });
    doc.text(r.submitted_at, 415, y + 6, { width: 85 });
    doc.text(r.has_submission ? 'Submitted' : 'Pending', 505, y + 6, { width: 55 });

    y += 22;
  });

  doc.end();
}

module.exports = {
  getLeaderboardData,
  exportCSV,
  exportExcel,
  exportPDF
};
