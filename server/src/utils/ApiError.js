/**
 * ApiError — throw this for any business-rule failure or expected HTTP error.
 * The centralized error handler converts it into the response envelope.
 */
class ApiError extends Error {
  constructor(statusCode, message, errors = []) {
    super(message)
    this.statusCode = statusCode
    this.errors = Array.isArray(errors) ? errors : []
  }

  static badRequest(message, errors) {
    return new ApiError(400, message || 'Bad request.', errors)
  }

  static unauthorized(message) {
    return new ApiError(401, message || 'Unauthorized.')
  }

  static forbidden(message) {
    return new ApiError(403, message || 'Forbidden.')
  }

  static notFound(message) {
    return new ApiError(404, message || 'Not found.')
  }

  static conflict(message) {
    return new ApiError(409, message || 'Conflict.')
  }
}

/** True if an error is an ApiError (has an explicit statusCode). */
function isApiError(err) {
  return err && Number.isInteger(err.statusCode)
}

module.exports = ApiError
module.exports.isApiError = isApiError