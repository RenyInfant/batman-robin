const express = require('express');
const router = express.Router();
const judgeController = require('../controllers/judgeController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

// Accessible ONLY to Judge and Admin roles (STRICTLY forbidden for Teams!)
router.use(verifyToken, requireRole('judge', 'admin'));

router.get('/submissions', judgeController.getSubmissionsForJudge);
router.post('/score', judgeController.submitScore);
router.get('/leaderboard', judgeController.getLeaderboard);

module.exports = router;
