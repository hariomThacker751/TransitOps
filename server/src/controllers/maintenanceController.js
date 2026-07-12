const MaintenanceLog = require('../models/MaintenanceLog')
const ApiError = require('../utils/ApiError')
const asyncHandler = require('../utils/asyncHandler')
const { success, created, paginated } = require('../utils/ApiResponse')
const { parsePagination } = require('../utils/pagination')
const maintenanceService = require('../services/maintenanceService')
const { body } = require('express-validator')

/**
 * GET /api/maintenance
 * Query: status, vehicle_reg, page, limit
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

  const whereSql = where.join(' AND ')
  const [rows, total] = await Promise.all([
    MaintenanceLog.findAll({ where: whereSql, params, limit, offset }),
    MaintenanceLog.count({ where: whereSql, params }),
  ])

  return paginated(res, rows, { page, limit, total })
})

/** POST /api/maintenance — fleet_manager, safety_officer */
const createRules = [
  body('vehicle_reg').isString().trim().notEmpty().withMessage('vehicle_reg is required.'),
  body('maintenance_type').isString().trim().notEmpty().withMessage('maintenance_type is required.'),
  body('cost').isFloat({ min: 0 }).withMessage('cost must be >= 0.'),
  body('start_date').optional().isISO8601({ strict: true }).withMessage('start_date must be a valid date.'),
]

const create = asyncHandler(async (req, res) => {
  const record = await maintenanceService.create(req.body)
  return created(res, record, `Maintenance ${record.maintenance_id} created. Vehicle moved to In Shop.`)
})

/** PATCH /api/maintenance/:maintenance_id/close — fleet_manager, safety_officer */
const closeRules = [
  body('end_date').optional().isISO8601({ strict: true }).withMessage('end_date must be a valid date.'),
]

const close = asyncHandler(async (req, res) => {
  const record = await maintenanceService.close(req.params.maintenance_id, {
    end_date: req.body?.end_date,
  })
  return success(res, record, `Maintenance ${record.maintenance_id} closed.`)
})

module.exports = { list, create, createRules, close, closeRules }