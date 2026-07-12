/**
 * Custom API Error class for business logic failures.
 * Extends native Error to include statusCode for HTTP responses.
 */
class ApiError extends Error {
  /**
   * @param {number} statusCode - HTTP status code
   * @param {string} message - Human-readable error message
   * @param {Array} errors - Array of field-level validation errors
   */
  constructor(statusCode, message, errors = []) {
    super(message);
    this.statusCode = statusCode;
    this.message = message;
    this.errors = errors;
    this.isOperational = true;

    // Capture stack trace in dev but don't leak in API response
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = ApiError;
