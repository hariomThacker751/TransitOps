const Vehicle = require('../models/Vehicle')
const MaintenanceLog = require('../models/MaintenanceLog')
const Trip = require('../models/Trip')
const ApiError = require('../utils/ApiError')
const asyncHandler = require('../utils/asyncHandler')
const { success, created, paginated } = require('../utils/ApiResponse')
const { parsePagination } = require('../utils/pagination')

/**
 * GET /api/vehicles
 * Query: status, type, region, search, page, limit
 */
const list = asyncHandler(async (req, res) => {
  const { page, limit, offset } = parsePagination(req)
  const where = []
  const params = []

  if (req.query.status) {
    where.push('status = ?')
    params.push(req.query.status)
  }
  if (req.query.type) {
    where.push('type = ?')
    params.push(req.query.type)
  }
  if (req.query.region) {
    where.push('region = ?')
    params.push(req.query.region)
  }
  if (req.query.search) {
    where.push('(registration_number LIKE ? OR vehicle_name_model LIKE ?)')
    const like = `%${req.query.search}%`
    params.push(like, like)
  }

  const whereSql = where.join(' AND ')
  const [rows, total] = await Promise.all([
    Vehicle.findAll({ where: whereSql, params, limit, offset }),
    Vehicle.count({ where: whereSql, params }),
  ])

  return paginated(res, rows, { page, limit, total })
})

/** GET /api/vehicles/:registration_number */
const get = asyncHandler(async (req, res) => {
  const vehicle = await Vehicle.findByReg(req.params.registration_number)
  if (!vehicle) throw ApiError.notFound('Vehicle not found.')
  return success(res, vehicle)
})

/** POST /api/vehicles — fleet_manager only */
const create = asyncHandler(async (req, res) => {
  const existing = await Vehicle.findByReg(req.body.registration_number)
  if (existing) {
    throw ApiError.conflict('A vehicle with this registration number already exists.')
  }
  const vehicle = await Vehicle.create(req.body)
  return created(res, vehicle, 'Vehicle created.')
})

/** PUT /api/vehicles/:registration_number — fleet_manager only */
const update = asyncHandler(async (req, res) => {
  const vehicle = await Vehicle.findByReg(req.params.registration_number)
  if (!vehicle) throw ApiError.notFound('Vehicle not found.')

  // Guardrail: 'On Trip' and 'In Shop' must only come from trip/maintenance ops.
  if (req.body.status && (req.body.status === 'On Trip' || req.body.status === 'In Shop')) {
    throw ApiError.badRequest(
      `Status cannot be manually set to "${req.body.status}". Use trip dispatch or maintenance to change it.`,
    )
  }

  const updated = await Vehicle.update(req.params.registration_number, req.body)
  return success(res, updated, 'Vehicle updated.')
})

/**
 * GET /api/vehicles/eligible-for-dispatch
 * Vehicles that are Available AND not under active maintenance.
 */
const eligibleForDispatch = asyncHandler(async (_req, res) => {
  const [rows] = await require('../config/db').query(`
    SELECT v.*
    FROM vehicles v
    LEFT JOIN maintenance_logs m
      ON m.vehicle_reg = v.registration_number AND m.status = 'Active'
    WHERE v.status = 'Available' AND m.maintenance_id IS NULL
    ORDER BY v.registration_number ASC
  `)
  return success(res, rows)
})

module.exports = { list, get, create, update, eligibleForDispatch }