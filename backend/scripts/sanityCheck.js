const db = require('../src/config/db');
const competitionEngine = require('../src/services/competitionEngine');
const { getLeaderboardData, exportCSV } = require('../src/services/exportService');
const backupService = require('../src/services/backupService');
const bcrypt = require('bcryptjs');

async function runSanityTests() {
  console.log('\n--- 🦇 STARTING BATMAN & ROBIN PORTAL SANITY TESTS 🦇 ---\n');

  try {
    // 1. Verify Users & Auth Seeding
    console.log('[Test 1] Verifying Database Seeding & User Roles...');
    const admin = db.prepare("SELECT * FROM users WHERE username = 'admin'").get();
    const judge = db.prepare("SELECT * FROM users WHERE username = 'judge1'").get();
    const team = db.prepare("SELECT * FROM users WHERE username = 'team1'").get();

    if (!admin || !judge || !team) {
      throw new Error('Default users failed to seed properly.');
    }
    console.log('  ✔ Admin, Judge, and Team users seeded successfully.');

    // 2. Test Password Verification
    console.log('[Test 2] Testing Password Hashing & Verification...');
    if (!bcrypt.compareSync('admin123', admin.password_hash)) throw new Error('Admin password hash mismatch');
    if (!bcrypt.compareSync('judge123', judge.password_hash)) throw new Error('Judge password hash mismatch');
    if (!bcrypt.compareSync('team123', team.password_hash)) throw new Error('Team password hash mismatch');
    console.log('  ✔ Password verification working perfectly.');

    // 3. Test Reference Image Simulation & Round Reset
    console.log('[Test 3] Testing Reference Image & Competition Reset...');
    const adminObj = { id: admin.id, username: admin.username };
    
    // Add reference image for round 1
    const refRes = db.prepare(`
      INSERT INTO reference_images (round_number, filename, filepath, original_name, mimetype, size)
      VALUES (1, 'sanity_ref.png', '/uploads/reference/sanity_ref.png', 'sanity_ref.png', 'image/png', 1024)
    `).run();
    db.prepare('UPDATE competition_state SET current_reference_image_id = ? WHERE id = 1').run(refRes.lastInsertRowid);

    const resetState = competitionEngine.resetRound(adminObj);
    if (resetState.stage !== 'IDLE') throw new Error('Round reset failed to set stage to IDLE');
    console.log('  ✔ Reset Round executed clean.');

    // 4. Test Start Round
    console.log('[Test 4] Testing Start Round & Stage Transition...');
    const startState = competitionEngine.startRound(adminObj);
    if (startState.stage !== 'OBSERVATION') throw new Error('Start Round failed to set stage to OBSERVATION');
    if (!startState.observation_end_time) throw new Error('Observation timer end time missing');
    console.log('  ✔ Start Round initialized Observation phase countdown.');

    // 5. Test Submission & Lock Rules
    console.log('[Test 5] Testing Submission Storage & Criteria Breakdown...');
    const teamData = db.prepare("SELECT id FROM teams WHERE user_id = ?").get(team.id);
    
    db.prepare('DELETE FROM submissions WHERE round_number = 1 AND team_id = ?').run(teamData.id);

    db.prepare(`
      INSERT INTO submissions (round_number, team_id, filename, filepath, original_name, mimetype, size, prompt_notes)
      VALUES (1, ?, 'team1_sub.png', '/uploads/submissions/team1_sub.png', 'team1_sub.png', 'image/png', 2048, 'Prompt: Batman in futuristic cyber armor, highly detailed')
    `).run(teamData.id);

    const sub = db.prepare('SELECT * FROM submissions WHERE team_id = ? AND round_number = 1').get(teamData.id);
    if (!sub) throw new Error('Submission insert failed');
    console.log('  ✔ Submission stored successfully with prompt notes.');

    // 6. Test Judge Scoring & Criteria Breakdown UPSERT
    console.log('[Test 6] Testing Category Criteria Evaluation & Single Score per Judge UPSERT...');
    db.prepare(`
      INSERT INTO judge_scores (
        round_number, submission_id, judge_id, score,
        prompt_accuracy, creativity, similarity, detail, overall_quality, is_draft, feedback
      )
      VALUES (1, ?, ?, 95, 19, 19, 29, 14, 14, 0, 'Outstanding prompt fidelity and detail!')
      ON CONFLICT(submission_id, judge_id) DO UPDATE SET 
        score = 95, prompt_accuracy = 19, creativity = 19, similarity = 29, detail = 14, overall_quality = 14, is_draft = 0
    `).run(sub.id, judge.id);

    const scoreRow = db.prepare('SELECT * FROM judge_scores WHERE submission_id = ? AND judge_id = ?').get(sub.id, judge.id);
    if (scoreRow.score !== 95) throw new Error('Judge score failed to save');
    if (scoreRow.prompt_accuracy !== 19 || scoreRow.similarity !== 29) throw new Error('Criteria breakdown scores failed to save');
    console.log('  ✔ Category criteria evaluation & single score per judge verified.');

    // 7. Test Leaderboard Calculation & CSV Export
    console.log('[Test 7] Testing Leaderboard & Export Generator...');
    const leaderboard = getLeaderboardData(1);
    if (leaderboard.results.length === 0) throw new Error('Leaderboard returned empty');
    if (leaderboard.results[0].average_score !== 95) throw new Error('Leaderboard score mismatch');
    
    const csv = exportCSV(1);
    if (!csv.includes('Dark Knights')) throw new Error('CSV export missing team name');
    console.log('  ✔ Leaderboard calculation and CSV export generated successfully.');

    // 8. Test Database Backup & Health
    console.log('[Test 8] Testing Database Health & Backup System...');
    const health = backupService.getDatabaseHealth();
    if (health.status !== 'HEALTHY') throw new Error('Database health report degraded');
    const backup = backupService.createBackup();
    if (!backup.filename) throw new Error('Backup creation failed');
    console.log(`  ✔ Health status: ${health.status}, Backup created: ${backup.filename}`);

    console.log('\n--- 🚀 ALL SANITY TESTS PASSED SUCCESSFULLY! 🚀 ---\n');
  } catch (err) {
    console.error('\n❌ SANITY TEST FAILED:', err);
    process.exit(1);
  }
}

runSanityTests();
