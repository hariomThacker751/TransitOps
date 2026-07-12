const Driver = require('../models/Driver')
const ApiError = require('../utils/ApiError')
const asyncHandler = require('../utils/asyncHandler')
const { success, created, paginated } = require('../utils/ApiResponse')
const { parsePagination } = require('../utils/pagination')
const { safetyOfficerFields } = require('../validators/driverValidator')

/**
 * GET /api/drivers
 * Query: status, license_category, search, page, limit
 */
const list = asyncHandler(async (req, res) => {
  const { page, limit, offset } = parsePagination(req)
  const where = []
  const params = []

  if (req.query.status) {
    where.push('status = ?')
    params.push(req.query.status)
  }
  if (req.query.license_category) {
    where.push('license_category = ?')
    params.push(req.query.license_category)
  }
  if (req.query.search) {
    where.push('(name LIKE ? OR driver_id LIKE ?)')
    const like = `%${req.query.search}%`
    params.push(like, like)
  }

  const whereSql = where.join(' AND ')
  const [rows, total] = await Promise.all([
    Driver.findAll({ where: whereSql, params, limit, offset }),
    Driver.count({ where: whereSql, params }),
  ])

  return paginated(res, rows, { page, limit, total })
})

/** GET /api/drivers/:driver_id */
const get = asyncHandler(async (req, res) => {
  const driver = await Driver.findById(req.params.driver_id)
  if (!driver) throw ApiError.notFound('Driver not found.')
  return success(res, driver)
})

/** POST /api/drivers — fleet_manager only */
const create = asyncHandler(async (req, res) => {
  const existing = await Driver.findByLicense(req.body.license_number)
  if (existing) {
    throw ApiError.conflict('A driver with this license number already exists.')
  }
  const driver = await Driver.create(req.body)
  return created(res, driver, 'Driver created.')
})

/**
 * PUT /api/drivers/:driver_id
 * - fleet_manager: full update
 * - safety_officer: only safety_score + status
 * - others: denied (handled by route guard, but double-check field scope)
 */
const update = asyncHandler(async (req, res) => {
  const driver = await Driver.findById(req.params.driver_id)
  if (!driver) throw ApiError.notFound('Driver not found.')

  let fields = { ...req.body }
  if (req.user.role === 'safety_officer') {
    // Restrict to allowed fields only.
    fields = {}
    for (const key of safetyOfficerFields) {
      if (req.body[key] !== undefined) fields[key] = req.body[key]
    }
    if (Object.keys(fields).length === 0) {
      throw ApiError.badRequest('Safety officers may only update safety_score and status.')
    }
  }

  if (fields.license_number && fields.license_number !== driver.license_number) {
    const dup = await Driver.findByLicense(fields.license_number)
    if (dup) throw ApiError.conflict('A driver with this license number already exists.')
  }

  const updated = await Driver.update(req.params.driver_id, fields)
  return success(res, updated, 'Driver updated.')
})

/**
 * GET /api/drivers/eligible-for-dispatch
 * Drivers where status = 'Available' AND license_expiry_date >= today.
 * Expiry is the authority — do not trust status alone.
 */
const eligibleForDispatch = asyncHandler(async (_req, res) => {
  const [rows] = await require('../config/db').query(`
    SELECT * FROM drivers
    WHERE status = 'Available' AND license_expiry_date >= CURDATE()
    ORDER BY driver_id ASC
  `)
  return success(res, rows)
})

module.exports = { list, get, create, update, eligibleForDispatch }