const Expense = require('../models/Expense')
const asyncHandler = require('../utils/asyncHandler')
const { success, created, paginated } = require('../utils/ApiResponse')
const { parsePagination } = require('../utils/pagination')
const { withTransaction } = require('../config/db')
const { nextId } = require('../utils/ids')
const { body } = require('express-validator')

const today = () => new Date().toISOString().slice(0, 10)

/**
 * GET /api/expenses
 * Query: vehicle_reg, expense_type, date_from, date_to, page, limit
 */
const list = asyncHandler(async (req, res) => {
  const { page, limit, offset } = parsePagination(req)
  const where = []
  const params = []

  if (req.query.vehicle_reg) {
    where.push('vehicle_reg = ?')
    params.push(req.query.vehicle_reg)
  }
  if (req.query.expense_type) {
    where.push('expense_type = ?')
    params.push(req.query.expense_type)
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
    Expense.findAll({ where: whereSql, params, limit, offset }),
    Expense.count({ where: whereSql, params }),
  ])

  return paginated(res, rows, { page, limit, total })
})

const createRules = [
  body('vehicle_reg').isString().trim().notEmpty().withMessage('vehicle_reg is required.'),
  body('expense_type').isString().trim().notEmpty().withMessage('expense_type is required.'),
  body('amount').isFloat({ min: 0 }).withMessage('amount must be >= 0.'),
  body('date').isISO8601({ strict: true }).withMessage('date must be a valid YYYY-MM-DD date.'),
]

const create = asyncHandler(async (req, res) => {
  const exp = await withTransaction(async (conn) => {
    const id = await nextId(conn, 'EXP', 'expenses', 'expense_id', 3)
    return Expense.create({
      expense_id: id,
      vehicle_reg: req.body.vehicle_reg,
      expense_type: req.body.expense_type,
      amount: Number(req.body.amount),
      date: req.body.date || today(),
    })
  })
  return created(res, exp, 'Expense created.')
})

module.exports = { list, create, createRules }