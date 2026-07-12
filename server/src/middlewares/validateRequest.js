const { validationResult } = require('express-validator')
const ApiError = require('../utils/ApiError')

/**
 * Collect express-validator results and reject with the spec's validation
 * error shape when any rule fails.
 */
function validateRequest(req, _res, next) {
  const result = validationResult(req)
  if (result.isEmpty()) return next()

  const errors = result.array().map((e) => ({
    field: e.path || e.param,
    message: e.msg,
  }))

  return next(ApiError.badRequest('Validation failed', errors))
}

module.exports = { validateRequest }