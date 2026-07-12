const { query } = require('../config/db')

const TABLE = 'drivers'

const COLUMNS = [
  'driver_id',
  'name',
  'license_number',
  'license_category',
  'license_expiry_date',
  'contact_number',
  'safety_score',
  'status',
]

const CREATE_TABLE = `
CREATE TABLE IF NOT EXISTS \`${TABLE}\` (
  driver_id VARCHAR(20) PRIMARY KEY,
  name VARCHAR(100),
  license_number VARCHAR(50) NOT NULL,
  license_category VARCHAR(30),
  license_expiry_date DATE,
  contact_number VARCHAR(30),
  safety_score INT,
  status ENUM('Available','On Trip','Off Duty','Suspended'),
  UNIQUE KEY uq_license_number (license_number),
  INDEX idx_drivers_status (status),
  INDEX idx_drivers_category (license_category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`

async function findById(id) {
  const [rows] = await query(`SELECT * FROM \`${TABLE}\` WHERE driver_id = ? LIMIT 1`, [id])
  return rows[0] || null
}

async function findByLicense(licenseNumber) {
  const [rows] = await query(`SELECT * FROM \`${TABLE}\` WHERE license_number = ? LIMIT 1`, [licenseNumber])
  return rows[0] || null
}

async function findAll({ where = '', params = [], limit, offset } = {}) {
  let sql = `SELECT * FROM \`${TABLE}\``
  if (where) sql += ` WHERE ${where}`
  sql += ` ORDER BY driver_id ASC`
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
    `INSERT INTO \`${TABLE}\` (driver_id, name, license_number, license_category, license_expiry_date, contact_number, safety_score, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.driver_id,
      data.name ?? null,
      data.license_number,
      data.license_category ?? null,
      data.license_expiry_date ?? null,
      data.contact_number ?? null,
      data.safety_score ?? 0,
      data.status ?? 'Available',
    ],
  )
  return findById(data.driver_id)
}

async function update(id, fields) {
  const cols = []
  const params = []
  for (const [k, v] of Object.entries(fields)) {
    if (COLUMNS.includes(k) && k !== 'driver_id') {
      cols.push(`\`${k}\` = ?`)
      params.push(v)
    }
  }
  if (!cols.length) return findById(id)
  params.push(id)
  await query(`UPDATE \`${TABLE}\` SET ${cols.join(', ')} WHERE driver_id = ?`, params)
  return findById(id)
}

module.exports = { TABLE, COLUMNS, CREATE_TABLE, findById, findByLicense, findAll, count, create, update }