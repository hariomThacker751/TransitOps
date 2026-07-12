const ApiError = require('../utils/ApiError');

/**
 * Role-based access control middleware factory.
 * Returns a middleware that only allows access if the authenticated user
 * has one of the specified roles.
 *
 * @param {...string} roles - Allowed role names
 * @returns {Function} Express middleware
 *
 * @example
 * router.post('/vehicles', authMiddleware, requireRole('fleet_manager'), createVehicle)
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new ApiError(401, 'Authentication required.');
    }

    if (!roles.includes(req.user.role)) {
      throw new ApiError(
        403,
        `Access denied. Required role(s): ${roles.join(', ')}. Your role: ${req.user.role}.`
      );
    }

    next();
  };
};

module.exports = { requireRole };
