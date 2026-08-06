const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const { uploadReference } = require('../middleware/uploadMiddleware');

router.use(verifyToken, requireRole('admin'));

// Team CRUD
router.post('/teams', adminController.createTeam);
router.get('/teams', adminController.getAllTeams);
router.put('/teams/:id', adminController.updateTeam);
router.put('/teams/:id/reset-password', adminController.resetTeamPassword);
router.delete('/teams/:id', adminController.deleteTeam);

// Settings
router.get('/settings', adminController.getSettings);
router.put('/settings', adminController.updateSettings);

// Reference Images
router.post('/reference-image', uploadReference, adminController.uploadReferenceImage);
router.get('/reference-images', adminController.getReferenceImages);

// System & Audit Logs
router.get('/logs/audit', adminController.getAuditLogList);
router.get('/logs/system', adminController.getSystemLogList);

// AI Evaluation & OpenCLIP
router.post('/ai-eval/run', adminController.triggerAiEvaluation);
router.get('/ai-eval/data', adminController.getAiEvaluation);
router.get('/ai-eval/health', adminController.getAiHealth);

module.exports = router;

