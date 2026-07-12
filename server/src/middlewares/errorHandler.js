const ApiError = require('../utils/ApiError');

/**
 * Global error handling middleware.
 * Must be the LAST middleware registered in app.js.
 * Catches all errors thrown by controllers/services.
 */
const errorHandler = (err, req, res, next) => {
  // Log unexpected server errors (not operational business logic errors)
  if (!err.isOperational) {
    console.error('❌ Unexpected server error:', {
      message: err.message,
      stack: err.stack,
      url: req.url,
      method: req.method,
    });
  }

  // Handle Sequelize validation errors
  if (err.name === 'SequelizeValidationError') {
    const errors = err.errors.map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
    });
  }

  // Handle Sequelize unique constraint errors
  if (err.name === 'SequelizeUniqueConstraintError') {
    const field = err.errors[0]?.path || 'field';
    return res.status(409).json({
      success: false,
      message: `Duplicate value: ${field} already exists.`,
      errors: [{ field, message: `${field} must be unique.` }],
    });
  }

  // Handle Sequelize database errors
  if (err.name === 'SequelizeDatabaseError') {
    console.error('Database error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Database error occurred.',
    });
  }

  // Handle known ApiError instances
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.errors && err.errors.length > 0 && { errors: err.errors }),
    });
  }

  // Catch-all: unknown internal error
  return res.status(500).json({
    success: false,
    message: 'An internal server error occurred.',
  });
};

module.exports = errorHandler;
