const jwt = require('jsonwebtoken');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User');

/**
 * Verifies the Bearer JWT token in Authorization header.
 * Attaches decoded user payload to req.user.
 */
const authMiddleware = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new ApiError(401, 'Access denied. No token provided.');
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    throw new ApiError(401, 'Access denied. Invalid token format.');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch fresh user data to ensure account still exists
    const user = await User.findByPk(decoded.id, {
      attributes: ['id', 'name', 'email', 'role', 'driver_id'],
    });

    if (!user) {
      throw new ApiError(401, 'Token is valid but user no longer exists.');
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      driver_id: user.driver_id,
    };

    next();
  } catch (err) {
    if (err instanceof ApiError) throw err;

    if (err.name === 'TokenExpiredError') {
      throw new ApiError(401, 'Token has expired. Please log in again.');
    }
    if (err.name === 'JsonWebTokenError') {
      throw new ApiError(401, 'Invalid token. Please log in again.');
    }

    throw new ApiError(401, 'Authentication failed.');
  }
});

module.exports = authMiddleware;
