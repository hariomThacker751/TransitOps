const { Op } = require('sequelize');
const Expense = require('../models/Expense');
const Vehicle = require('../models/Vehicle');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');

/**
 * Generate a unique expense_id
 */
const generateExpenseId = async () => {
  const latest = await Expense.findOne({
    where: { expense_id: { [Op.like]: 'EXP-%' } },
    order: [['expense_id', 'DESC']],
  });

  if (!latest) return 'EXP-0001';
  const num = parseInt(latest.expense_id.split('-')[1]) + 1;
  return `EXP-${String(num).padStart(4, '0')}`;
};

/**
 * GET /api/expenses
 */
const getExpenses = asyncHandler(async (req, res) => {
  const { vehicle_reg, expense_type, date_from, date_to, page = 1, limit = 20 } = req.query;

  const where = {};
  if (vehicle_reg) where.vehicle_reg = vehicle_reg;
  if (expense_type) where.expense_type = { [Op.like]: `%${expense_type}%` };

  if (date_from || date_to) {
    where.date = {};
    if (date_from) where.date[Op.gte] = date_from;
    if (date_to) where.date[Op.lte] = date_to;
  }

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * limitNum;

  const { count, rows } = await Expense.findAndCountAll({
    where,
    limit: limitNum,
    offset,
    order: [['date', 'DESC'], ['expense_id', 'DESC']],
  });

  return ApiResponse.success(res, 200, rows, '', {
    page: pageNum,
    limit: limitNum,
    total: count,
    totalPages: Math.ceil(count / limitNum),
  });
});

/**
 * POST /api/expenses
 */
const createExpense = asyncHandler(async (req, res) => {
  const { vehicle_reg, expense_type, amount, date } = req.body;

  // Validate vehicle exists
  const vehicle = await Vehicle.findByPk(vehicle_reg);
  if (!vehicle) {
    throw new ApiError(404, `Vehicle '${vehicle_reg}' does not exist.`);
  }

  const expense_id = await generateExpenseId();

  const expense = await Expense.create({
    expense_id,
    vehicle_reg,
    expense_type,
    amount,
    date,
  });

  return ApiResponse.success(res, 201, expense, 'Expense logged successfully.');
});

module.exports = { getExpenses, createExpense };
