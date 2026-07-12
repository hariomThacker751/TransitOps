const jwt = require('jsonwebtoken')
const ApiError = require('../utils/ApiError')

/**
 * Verify the Bearer token and attach the decoded payload to req.user.
 * Token payload: { id, role, driver_id? }
 */
function auth(req, _res, next) {
  const header = req.headers.authorization || ''
  const [scheme, token] = header.split(' ')

  if (scheme !== 'Bearer' || !token) {
    return next(ApiError.unauthorized('Authentication token is missing or malformed.'))
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret')
    req.user = {
      id: decoded.id,
      role: decoded.role,
      driver_id: decoded.driver_id || null,
    }
    next()
  } catch (err) {
    return next(ApiError.unauthorized('Invalid or expired token.'))
  }
}

module.exports = { auth }