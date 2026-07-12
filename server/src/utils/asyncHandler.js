/**
 * Wraps an async controller function to automatically catch errors
 * and pass them to Express error handling middleware.
 * @param {Function} fn - async controller function
 * @returns {Function} Express middleware
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
