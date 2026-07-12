/**
 * Response envelope helpers — every controller uses these so all responses
 * match the spec shape:
 *   Success:    { success: true, data, message? }
 *   Paginated:  { success: true, data: [...], pagination: {...} }
 */
function success(res, data, message, status = 200) {
  const body = { success: true, data }
  if (message) body.message = message
  return res.status(status).json(body)
}

function created(res, data, message) {
  return success(res, data, message, 201)
}

function paginated(res, rows, { page, limit, total }) {
  const totalPages = Math.ceil(total / limit) || (total > 0 ? 1 : 0)
  return res.status(200).json({
    success: true,
    data: rows,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  })
}

module.exports = { success, created, paginated }