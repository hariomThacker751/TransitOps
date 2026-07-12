const { isApiError } = require('../utils/ApiError') // placeholder-safe import

/**
 * Centralized error handler. Converts ApiError into a clean envelope and logs
 * unexpected errors (no stack traces leaked to clients).
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, _req, res, _next) {
  const status = err.statusCode && Number.isInteger(err.statusCode) ? err.statusCode : 500

  if (status >= 500) {
    // Log unexpected server errors for debugging.
    console.error('[TransitOps] Unexpected error:', err)
  }

  const body = {
    success: false,
    message: status >= 500 ? 'Internal server error.' : err.message,
  }

  if (Array.isArray(err.errors) && err.errors.length) {
    body.errors = err.errors
  }

  return res.status(status).json(body)
}

module.exports = { errorHandler, isApiError }