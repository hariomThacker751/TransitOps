/**
 * Standardized API response helper.
 * Ensures all responses follow the same envelope structure.
 */
class ApiResponse {
  /**
   * Send a success response
   * @param {Object} res - Express response object
   * @param {number} statusCode - HTTP status code
   * @param {*} data - Response data
   * @param {string} message - Optional message
   * @param {Object} pagination - Optional pagination info
   */
  static success(res, statusCode = 200, data = null, message = '', pagination = null) {
    const response = {
      success: true,
      data,
    };

    if (message) response.message = message;
    if (pagination) response.pagination = pagination;

    return res.status(statusCode).json(response);
  }

  /**
   * Send an error response
   * @param {Object} res - Express response object
   * @param {number} statusCode - HTTP status code
   * @param {string} message - Error message
   * @param {Array} errors - Field-level errors
   */
  static error(res, statusCode = 500, message = 'Internal Server Error', errors = []) {
    const response = {
      success: false,
      message,
    };

    if (errors && errors.length > 0) {
      response.errors = errors;
    }

    return res.status(statusCode).json(response);
  }
}

module.exports = ApiResponse;
