const { validationResult } = require('express-validator');

/**
 * Middleware to handle express-validator results.
 * Place this after your validator chain in route definitions.
 * If validation fails, returns 400 with structured error list.
 */
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err) => ({
      field: err.path || err.param,
      message: err.msg,
    }));

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formattedErrors,
    });
  }

  next();
};

module.exports = validateRequest;
