const express = require('express');
const router = express.Router();
const competitionController = require('../controllers/competitionController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

// Public / Authenticated State
router.get('/state', verifyToken, competitionController.getState);
router.get('/public-settings', competitionController.getPublicSettings);
router.get('/rounds', verifyToken, competitionController.getRoundsHistory);

// Admin Control Workflow Endpoints
router.post('/reset-round', verifyToken, requireRole('admin'), competitionController.handleResetRound);
router.post('/start-round', verifyToken, requireRole('admin'), competitionController.handleStartRound);
router.post('/pause-round', verifyToken, requireRole('admin'), competitionController.handlePauseRound);
router.post('/resume-round', verifyToken, requireRole('admin'), competitionController.handleResumeRound);
router.post('/end-round', verifyToken, requireRole('admin'), competitionController.handleEndRound);
router.post('/next-round', verifyToken, requireRole('admin'), competitionController.handleNextRound);

module.exports = router;
