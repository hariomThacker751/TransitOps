/**
 * Parse page/limit query params with sane defaults and bounds.
 * Spec default: page=1, limit=20.
 */
function parsePagination(req) {
  let page = parseInt(req.query.page, 10)
  let limit = parseInt(req.query.limit, 10)
  if (!Number.isFinite(page) || page < 1) page = 1
  if (!Number.isFinite(limit) || limit < 1) limit = 20
  if (limit > 500) limit = 500
  const offset = (page - 1) * limit
  return { page, limit, offset }
}

module.exports = { parsePagination }