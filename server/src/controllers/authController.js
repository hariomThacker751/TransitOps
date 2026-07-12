const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');

/**
 * POST /api/auth/login
 * Authenticate user and return JWT token
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, 'Email and password are required.');
  }

  // Find user by email
  const user = await User.findOne({ where: { email: email.toLowerCase().trim() } });
  if (!user) {
    throw new ApiError(401, 'Invalid email or password.');
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordValid) {
    throw new ApiError(401, 'Invalid email or password.');
  }

  // Build token payload
  const tokenPayload = {
    id: user.id,
    role: user.role,
  };
  if (user.driver_id) {
    tokenPayload.driver_id = user.driver_id;
  }

  // Sign JWT
  const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  });

  return ApiResponse.success(res, 200, {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  }, 'Login successful');
});

/**
 * GET /api/auth/me
 * Returns the currently authenticated user's profile
 */
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.user.id, {
    attributes: ['id', 'name', 'email', 'role', 'driver_id', 'created_at'],
  });

  if (!user) {
    throw new ApiError(404, 'User not found.');
  }

  return ApiResponse.success(res, 200, user);
});

module.exports = { login, getMe };
