const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const { login, getMe, logout } = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');

const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // Limit each IP to 5 login requests per windowMs
  message: { success: false, message: 'Too many login attempts, please try again after a minute.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/auth/login
router.post('/login', loginLimiter, login);

// GET /api/auth/me
router.get('/me', authMiddleware, getMe);

// POST /api/auth/logout
router.post('/logout', authMiddleware, logout);

module.exports = router;
