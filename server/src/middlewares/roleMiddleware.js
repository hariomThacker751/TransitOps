const ApiError = require('../utils/ApiError')

/**
 * requireRole(...roles) — middleware factory.
 * Must run AFTER authMiddleware so req.user is populated.
 * Pass no roles (or '*') to allow any authenticated user.
 */
function requireRole(...roles) {
  const allowed = roles.flat()
  return (req, _res, next) => {
    if (!req.user) return next(ApiError.unauthorized('Authentication required.'))
    if (allowed.length === 0 || allowed.includes('*')) return next()
    if (!allowed.includes(req.user.role)) {
      return next(ApiError.forbidden(`Your role (${req.user.role}) is not permitted to perform this action.`))
    }
    next()
  }
}

module.exports = { requireRole }