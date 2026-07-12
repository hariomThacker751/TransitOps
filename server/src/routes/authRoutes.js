const express = require('express');
const router = express.Router();
const { login, getMe } = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');

// POST /api/auth/login
router.post('/login', login);

// GET /api/auth/me
router.get('/me', authMiddleware, getMe);

module.exports = router;
