const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimiter');

/**
 * @openapi
 * /api/auth/login/admin:
 *   post:
 *     summary: Admin authentication login
 *     tags: [Authentication]
 */
router.post('/login/admin', authLimiter, authController.loginAdmin);

/**
 * @openapi
 * /api/auth/login/judge:
 *   post:
 *     summary: Judge authentication login
 *     tags: [Authentication]
 */
router.post('/login/judge', authLimiter, authController.loginJudge);

/**
 * @openapi
 * /api/auth/login/team:
 *   post:
 *     summary: Team authentication login
 *     tags: [Authentication]
 */
router.post('/login/team', authLimiter, authController.loginTeam);

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     summary: Get current authenticated user profile
 *     tags: [Authentication]
 */
router.get('/me', verifyToken, authController.getMe);

module.exports = router;
