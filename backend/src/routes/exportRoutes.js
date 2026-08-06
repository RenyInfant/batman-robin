const express = require('express');
const router = express.Router();
const exportController = require('../controllers/exportController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

router.use(verifyToken, requireRole('admin'));

router.get('/csv', exportController.downloadCSV);
router.get('/excel', exportController.downloadExcel);
router.get('/pdf', exportController.downloadPDF);

module.exports = router;
