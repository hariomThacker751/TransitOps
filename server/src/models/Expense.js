const { query } = require('../config/db')

const TABLE = 'expenses'

const COLUMNS = ['expense_id', 'vehicle_reg', 'expense_type', 'amount', 'date']

const CREATE_TABLE = `
CREATE TABLE IF NOT EXISTS \`${TABLE}\` (
  expense_id VARCHAR(20) PRIMARY KEY,
  vehicle_reg VARCHAR(20),
  expense_type VARCHAR(100),
  amount DECIMAL(12,2),
  date DATE,
  INDEX idx_exp_vehicle (vehicle_reg),
  INDEX idx_exp_type (expense_type),
  INDEX idx_exp_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`

async function findById(id) {
  const [rows] = await query(`SELECT * FROM \`${TABLE}\` WHERE expense_id = ? LIMIT 1`, [id])
  return rows[0] || null
}

async function findAll({ where = '', params = [], limit, offset } = {}) {
  let sql = `SELECT * FROM \`${TABLE}\``
  if (where) sql += ` WHERE ${where}`
  sql += ` ORDER BY date DESC, expense_id DESC`
  if (limit !== undefined) sql += ` LIMIT ? OFFSET ?`
  const [rows] = await query(sql, limit !== undefined ? [...params, limit, offset] : params)
  return rows
}

async function count({ where = '', params = [] } = {}) {
  let sql = `SELECT COUNT(*) AS total FROM \`${TABLE}\``
  if (where) sql += ` WHERE ${where}`
  const [rows] = await query(sql, params)
  return rows[0].total
}

async function create(data) {
  await query(
    `INSERT INTO \`${TABLE}\` (expense_id, vehicle_reg, expense_type, amount, date)
     VALUES (?, ?, ?, ?, ?)`,
    [
      data.expense_id,
      data.vehicle_reg ?? null,
      data.expense_type ?? null,
      data.amount ?? 0,
      data.date ?? null,
    ],
  )
  return findById(data.expense_id)
}

module.exports = { TABLE, COLUMNS, CREATE_TABLE, findById, findAll, count, create }