const { query } = require('../config/db')

const TABLE = 'maintenance_logs'

const COLUMNS = [
  'maintenance_id',
  'vehicle_reg',
  'maintenance_type',
  'cost',
  'start_date',
  'end_date',
  'status',
]

const CREATE_TABLE = `
CREATE TABLE IF NOT EXISTS \`${TABLE}\` (
  maintenance_id VARCHAR(20) PRIMARY KEY,
  vehicle_reg VARCHAR(20),
  maintenance_type VARCHAR(100),
  cost DECIMAL(12,2),
  start_date DATE,
  end_date DATE NULL,
  status ENUM('Active','Closed'),
  INDEX idx_maint_vehicle (vehicle_reg),
  INDEX idx_maint_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`

async function findById(id) {
  const [rows] = await query(`SELECT * FROM \`${TABLE}\` WHERE maintenance_id = ? LIMIT 1`, [id])
  return rows[0] || null
}

async function findAll({ where = '', params = [], limit, offset } = {}) {
  let sql = `SELECT * FROM \`${TABLE}\``
  if (where) sql += ` WHERE ${where}`
  sql += ` ORDER BY start_date DESC, maintenance_id DESC`
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
    `INSERT INTO \`${TABLE}\` (maintenance_id, vehicle_reg, maintenance_type, cost, start_date, end_date, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      data.maintenance_id,
      data.vehicle_reg ?? null,
      data.maintenance_type ?? null,
      data.cost ?? 0,
      data.start_date ?? null,
      data.end_date ?? null,
      data.status ?? 'Active',
    ],
  )
  return findById(data.maintenance_id)
}

async function update(id, fields) {
  const cols = []
  const params = []
  for (const [k, v] of Object.entries(fields)) {
    if (COLUMNS.includes(k) && k !== 'maintenance_id') {
      cols.push(`\`${k}\` = ?`)
      params.push(v)
    }
  }
  if (!cols.length) return findById(id)
  params.push(id)
  await query(`UPDATE \`${TABLE}\` SET ${cols.join(', ')} WHERE maintenance_id = ?`, params)
  return findById(id)
}

async function hasActiveForVehicle(vehicleReg) {
  const [rows] = await query(
    `SELECT COUNT(*) AS n FROM \`${TABLE}\` WHERE vehicle_reg = ? AND status = 'Active'`,
    [vehicleReg],
  )
  return rows[0].n > 0
}

module.exports = {
  TABLE,
  COLUMNS,
  CREATE_TABLE,
  findById,
  findAll,
  count,
  create,
  update,
  hasActiveForVehicle,
}