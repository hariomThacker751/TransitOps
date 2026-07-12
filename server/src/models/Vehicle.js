const { query } = require('../config/db')

const TABLE = 'vehicles'

const COLUMNS = [
  'registration_number',
  'vehicle_name_model',
  'type',
  'max_load_capacity_kg',
  'odometer_km',
  'acquisition_cost',
  'status',
  'region',
]

const CREATE_TABLE = `
CREATE TABLE IF NOT EXISTS \`${TABLE}\` (
  registration_number VARCHAR(20) PRIMARY KEY,
  vehicle_name_model VARCHAR(150),
  type VARCHAR(50),
  max_load_capacity_kg DECIMAL(10,2),
  odometer_km DECIMAL(12,2),
  acquisition_cost DECIMAL(12,2),
  status ENUM('Available','On Trip','In Shop','Retired'),
  region VARCHAR(50),
  INDEX idx_vehicles_status (status),
  INDEX idx_vehicles_type (type),
  INDEX idx_vehicles_region (region)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`

async function findByReg(reg) {
  const [rows] = await query(`SELECT * FROM \`${TABLE}\` WHERE registration_number = ? LIMIT 1`, [reg])
  return rows[0] || null
}

async function findAll({ where = '', params = [], limit, offset } = {}) {
  let sql = `SELECT * FROM \`${TABLE}\``
  if (where) sql += ` WHERE ${where}`
  sql += ` ORDER BY registration_number ASC`
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
    `INSERT INTO \`${TABLE}\` (registration_number, vehicle_name_model, type, max_load_capacity_kg, odometer_km, acquisition_cost, status, region)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.registration_number,
      data.vehicle_name_model ?? null,
      data.type ?? null,
      data.max_load_capacity_kg ?? 0,
      data.odometer_km ?? 0,
      data.acquisition_cost ?? 0,
      data.status ?? 'Available',
      data.region ?? null,
    ],
  )
  return findByReg(data.registration_number)
}

async function update(reg, fields) {
  const cols = []
  const params = []
  for (const [k, v] of Object.entries(fields)) {
    if (COLUMNS.includes(k) && k !== 'registration_number') {
      cols.push(`\`${k}\` = ?`)
      params.push(v)
    }
  }
  if (!cols.length) return findByReg(reg)
  params.push(reg)
  await query(`UPDATE \`${TABLE}\` SET ${cols.join(', ')} WHERE registration_number = ?`, params)
  return findByReg(reg)
}

module.exports = { TABLE, COLUMNS, CREATE_TABLE, findByReg, findAll, count, create, update }