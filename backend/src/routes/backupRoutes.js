const express = require('express');
const router = express.Router();
const backupController = require('../controllers/backupController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

router.use(verifyToken, requireRole('admin'));

router.post('/create', backupController.createBackup);
router.get('/list', backupController.getBackups);
router.post('/restore', backupController.restoreBackup);
router.get('/health', backupController.getHealth);

module.exports = router;
