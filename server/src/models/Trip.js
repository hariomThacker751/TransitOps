const { query } = require('../config/db')

const TABLE = 'trips'

const COLUMNS = [
  'trip_id',
  'source',
  'destination',
  'vehicle_reg',
  'driver_id',
  'cargo_weight_kg',
  'planned_distance_km',
  'actual_distance_km',
  'fuel_consumed_liters',
  'revenue',
  'status',
  'created_date',
  'dispatched_date',
  'completed_date',
]

const CREATE_TABLE = `
CREATE TABLE IF NOT EXISTS \`${TABLE}\` (
  trip_id VARCHAR(20) PRIMARY KEY,
  source VARCHAR(100),
  destination VARCHAR(100),
  vehicle_reg VARCHAR(20),
  driver_id VARCHAR(20),
  cargo_weight_kg DECIMAL(12,2),
  planned_distance_km DECIMAL(12,2),
  actual_distance_km DECIMAL(12,2) NULL,
  fuel_consumed_liters DECIMAL(12,2) NULL,
  revenue DECIMAL(12,2),
  status ENUM('Draft','Dispatched','Completed','Cancelled'),
  created_date DATE,
  dispatched_date DATE NULL,
  completed_date DATE NULL,
  INDEX idx_trips_status (status),
  INDEX idx_trips_vehicle (vehicle_reg),
  INDEX idx_trips_driver (driver_id),
  INDEX idx_trips_created (created_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`

async function findById(id) {
  const [rows] = await query(`SELECT * FROM \`${TABLE}\` WHERE trip_id = ? LIMIT 1`, [id])
  return rows[0] || null
}

async function findAll({ where = '', params = [], limit, offset } = {}) {
  let sql = `SELECT * FROM \`${TABLE}\``
  if (where) sql += ` WHERE ${where}`
  sql += ` ORDER BY created_date DESC, trip_id DESC`
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
    `INSERT INTO \`${TABLE}\` (trip_id, source, destination, vehicle_reg, driver_id, cargo_weight_kg, planned_distance_km, actual_distance_km, fuel_consumed_liters, revenue, status, created_date, dispatched_date, completed_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.trip_id,
      data.source ?? null,
      data.destination ?? null,
      data.vehicle_reg ?? null,
      data.driver_id ?? null,
      data.cargo_weight_kg ?? 0,
      data.planned_distance_km ?? 0,
      data.actual_distance_km ?? null,
      data.fuel_consumed_liters ?? null,
      data.revenue ?? 0,
      data.status ?? 'Draft',
      data.created_date ?? null,
      data.dispatched_date ?? null,
      data.completed_date ?? null,
    ],
  )
  return findById(data.trip_id)
}

async function update(id, fields) {
  const cols = []
  const params = []
  for (const [k, v] of Object.entries(fields)) {
    if (COLUMNS.includes(k) && k !== 'trip_id') {
      cols.push(`\`${k}\` = ?`)
      params.push(v)
    }
  }
  if (!cols.length) return findById(id)
  params.push(id)
  await query(`UPDATE \`${TABLE}\` SET ${cols.join(', ')} WHERE trip_id = ?`, params)
  return findById(id)
}

module.exports = { TABLE, COLUMNS, CREATE_TABLE, findById, findAll, count, create, update }