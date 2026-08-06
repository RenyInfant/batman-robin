const express = require('express');
const router = express.Router();
const teamController = require('../controllers/teamController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const { uploadSubmission } = require('../middleware/uploadMiddleware');

// Strictly guard team routes to 'team' role
router.use(verifyToken, requireRole('team'));

router.get('/my-submission', teamController.getMySubmission);
router.post('/submit', uploadSubmission, teamController.submitOrReplaceImage);

module.exports = router;
