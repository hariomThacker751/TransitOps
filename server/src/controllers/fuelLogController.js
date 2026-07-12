const FuelLog = require('../models/FuelLog')
const ApiError = require('../utils/ApiError')
const asyncHandler = require('../utils/asyncHandler')
const { success, created, paginated } = require('../utils/ApiResponse')
const { parsePagination } = require('../utils/pagination')
const { withTransaction } = require('../config/db')
const { nextId } = require('../utils/ids')
const { body } = require('express-validator')

const today = () => new Date().toISOString().slice(0, 10)

/**
 * GET /api/fuel-logs
 * Query: vehicle_reg, trip_id, date_from, date_to, page, limit
 */
const list = asyncHandler(async (req, res) => {
  const { page, limit, offset } = parsePagination(req)
  const where = []
  const params = []

  if (req.query.vehicle_reg) {
    where.push('vehicle_reg = ?')
    params.push(req.query.vehicle_reg)
  }
  if (req.query.trip_id) {
    where.push('trip_id = ?')
    params.push(req.query.trip_id)
  }
  if (req.query.date_from) {
    where.push('date >= ?')
    params.push(req.query.date_from)
  }
  if (req.query.date_to) {
    where.push('date <= ?')
    params.push(req.query.date_to)
  }

  const whereSql = where.join(' AND ')
  const [rows, total] = await Promise.all([
    FuelLog.findAll({ where: whereSql, params, limit, offset }),
    FuelLog.count({ where: whereSql, params }),
  ])

  return paginated(res, rows, { page, limit, total })
})

const createRules = [
  body('vehicle_reg').isString().trim().notEmpty().withMessage('vehicle_reg is required.'),
  body('liters').isFloat({ gt: 0 }).withMessage('liters must be greater than 0.'),
  body('cost').isFloat({ min: 0 }).withMessage('cost must be >= 0.'),
  body('date').isISO8601({ strict: true }).withMessage('date must be a valid YYYY-MM-DD date.'),
  body('trip_id').optional({ nullable: true }).isString().trim(),
]

const create = asyncHandler(async (req, res) => {
  const log = await withTransaction(async (conn) => {
    const id = await nextId(conn, 'FUEL', 'fuel_logs', 'fuel_log_id', 3)
    return FuelLog.create({
      fuel_log_id: id,
      vehicle_reg: req.body.vehicle_reg,
      trip_id: req.body.trip_id || null,
      liters: Number(req.body.liters),
      cost: Number(req.body.cost),
      date: req.body.date || today(),
    })
  })
  return created(res, log, 'Fuel log created.')
})

module.exports = { list, create, createRules }