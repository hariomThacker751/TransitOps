const Trip = require('../models/Trip')
const Vehicle = require('../models/Vehicle')
const ApiError = require('../utils/ApiError')
const asyncHandler = require('../utils/asyncHandler')
const { success, created, paginated } = require('../utils/ApiResponse')
const { parsePagination } = require('../utils/pagination')
const { withTransaction } = require('../config/db')
const { nextId } = require('../utils/ids')
const rulesEngine = require('../services/tripRulesEngine')

const today = () => new Date().toISOString().slice(0, 10)

/**
 * GET /api/trips
 * Query: status, vehicle_reg, driver_id, date_from, date_to, page, limit
 */
const list = asyncHandler(async (req, res) => {
  const { page, limit, offset } = parsePagination(req)
  const where = []
  const params = []

  if (req.query.status) {
    where.push('status = ?')
    params.push(req.query.status)
  }
  if (req.query.vehicle_reg) {
    where.push('vehicle_reg = ?')
    params.push(req.query.vehicle_reg)
  }
  if (req.query.driver_id) {
    where.push('driver_id = ?')
    params.push(req.query.driver_id)
  }
  if (req.query.date_from) {
    where.push('created_date >= ?')
    params.push(req.query.date_from)
  }
  if (req.query.date_to) {
    where.push('created_date <= ?')
    params.push(req.query.date_to)
  }

  const whereSql = where.join(' AND ')
  const [rows, total] = await Promise.all([
    Trip.findAll({ where: whereSql, params, limit, offset }),
    Trip.count({ where: whereSql, params }),
  ])

  return paginated(res, rows, { page, limit, total })
})

/** GET /api/trips/:trip_id */
const get = asyncHandler(async (req, res) => {
  const trip = await Trip.findById(req.params.trip_id)
  if (!trip) throw ApiError.notFound('Trip not found.')
  return success(res, trip)
})

/**
 * POST /api/trips — fleet_manager, driver
 * Creates a Draft trip. Validates cargo weight against vehicle capacity at
 * creation time (rejects overload immediately with 400).
 */
const create = asyncHandler(async (req, res) => {
  const { vehicle_reg, driver_id, cargo_weight_kg, planned_distance_km } = req.body

  // Validate vehicle exists and cargo fits capacity (fail fast at creation).
  const vehicle = await Vehicle.findByReg(vehicle_reg)
  if (!vehicle) {
    throw ApiError.badRequest(`Vehicle ${vehicle_reg} not found in registry.`)
  }
  const cargo = Number(cargo_weight_kg) || 0
  const maxLoad = Number(vehicle.max_load_capacity_kg) || 0
  if (cargo > maxLoad) {
    throw ApiError.badRequest(
      `Cargo weight (${cargo}) exceeds vehicle maximum capacity (${maxLoad}).`,
    )
  }
  if (!Number.isFinite(Number(planned_distance_km)) || Number(planned_distance_km) <= 0) {
    throw ApiError.badRequest('planned_distance_km must be a positive number.')
  }

  const trip = await withTransaction(async (conn, q) => {
    const id = await nextId(conn, 'TRIP', 'trips', 'trip_id', 3)
    return Trip.create({
      trip_id: id,
      source: req.body.source,
      destination: req.body.destination,
      vehicle_reg,
      driver_id,
      cargo_weight_kg: cargo,
      planned_distance_km: Number(planned_distance_km),
      actual_distance_km: null,
      fuel_consumed_liters: null,
      revenue: Number(req.body.revenue) || 0,
      status: 'Draft',
      created_date: today(),
      dispatched_date: null,
      completed_date: null,
    })
  })

  return created(res, trip, 'Draft trip created.')
})

/** GET /api/trips/:trip_id/validate-dispatch — preview eligibility (no mutation). */
const validateDispatch = asyncHandler(async (req, res) => {
  try {
    await rulesEngine.validateDispatch(req.params.trip_id)
    return success(res, { ok: true, violations: [] }, 'Trip is eligible for dispatch.')
  } catch (e) {
    if (e.statusCode) {
      return success(res, { ok: false, violations: [{ message: e.message }] })
    }
    throw e
  }
})

/** PATCH /api/trips/:trip_id/dispatch — fleet_manager, driver */
const dispatch = asyncHandler(async (req, res) => {
  const trip = await rulesEngine.dispatch(req.params.trip_id)
  return success(res, trip, `Trip ${req.params.trip_id} dispatched.`)
})

/** PATCH /api/trips/:trip_id/complete — fleet_manager, driver */
const complete = asyncHandler(async (req, res) => {
  const trip = await rulesEngine.complete(req.params.trip_id, {
    actual_distance_km: Number(req.body.actual_distance_km),
    fuel_consumed_liters: Number(req.body.fuel_consumed_liters),
    revenue: req.body.revenue !== undefined ? Number(req.body.revenue) : undefined,
  })
  return success(res, trip, `Trip ${req.params.trip_id} completed.`)
})

/** PATCH /api/trips/:trip_id/cancel — fleet_manager, driver */
const cancel = asyncHandler(async (req, res) => {
  const trip = await rulesEngine.cancel(req.params.trip_id)
  return success(res, trip, `Trip ${req.params.trip_id} cancelled.`)
})

module.exports = { list, get, create, validateDispatch, dispatch, complete, cancel }