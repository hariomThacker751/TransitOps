const { query } = require('../config/db')

const TABLE = 'fuel_logs'

const COLUMNS = ['fuel_log_id', 'vehicle_reg', 'trip_id', 'liters', 'cost', 'date']

const CREATE_TABLE = `
CREATE TABLE IF NOT EXISTS \`${TABLE}\` (
  fuel_log_id VARCHAR(20) PRIMARY KEY,
  vehicle_reg VARCHAR(20),
  trip_id VARCHAR(20) NULL,
  liters DECIMAL(10,2),
  cost DECIMAL(12,2),
  date DATE,
  INDEX idx_fuel_vehicle (vehicle_reg),
  INDEX idx_fuel_trip (trip_id),
  INDEX idx_fuel_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`

async function findById(id) {
  const [rows] = await query(`SELECT * FROM \`${TABLE}\` WHERE fuel_log_id = ? LIMIT 1`, [id])
  return rows[0] || null
}

async function findAll({ where = '', params = [], limit, offset } = {}) {
  let sql = `SELECT * FROM \`${TABLE}\``
  if (where) sql += ` WHERE ${where}`
  sql += ` ORDER BY date DESC, fuel_log_id DESC`
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
    `INSERT INTO \`${TABLE}\` (fuel_log_id, vehicle_reg, trip_id, liters, cost, date)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      data.fuel_log_id,
      data.vehicle_reg ?? null,
      data.trip_id ?? null,
      data.liters ?? 0,
      data.cost ?? 0,
      data.date ?? null,
    ],
  )
  return findById(data.fuel_log_id)
}

module.exports = { TABLE, COLUMNS, CREATE_TABLE, findById, findAll, count, create }