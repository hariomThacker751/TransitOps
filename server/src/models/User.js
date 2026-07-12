const { query } = require('../config/db')

/** users is NOT imported from CSV — created manually via seedUsers.js. */
const TABLE = 'users'

const CREATE_TABLE = `
CREATE TABLE IF NOT EXISTS \`${TABLE}\` (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('fleet_manager','driver','safety_officer','financial_analyst') NOT NULL,
  driver_id VARCHAR(20) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`

async function findByEmail(email) {
  const [rows] = await query(`SELECT * FROM \`${TABLE}\` WHERE email = ? LIMIT 1`, [email])
  return rows[0] || null
}

async function findById(id) {
  const [rows] = await query(`SELECT * FROM \`${TABLE}\` WHERE id = ? LIMIT 1`, [id])
  return rows[0] || null
}

async function create({ name, email, password_hash, role, driver_id = null }) {
  const [res] = await query(
    `INSERT INTO \`${TABLE}\` (name, email, password_hash, role, driver_id)
     VALUES (?, ?, ?, ?, ?)`,
    [name, email, password_hash, role, driver_id || null],
  )
  return findById(res.insertId)
}

async function upsert({ name, email, password_hash, role, driver_id = null }) {
  // Idempotent: if a user with this email exists, update credentials/role.
  const existing = await findByEmail(email)
  if (existing) {
    await query(
      `UPDATE \`${TABLE}\` SET name = ?, password_hash = ?, role = ?, driver_id = ? WHERE email = ?`,
      [name, password_hash, role, driver_id || null, email],
    )
    return findByEmail(email)
  }
  return create({ name, email, password_hash, role, driver_id })
}

/** Strip the password hash before returning to clients. */
function toSafe(user) {
  if (!user) return null
  const { password_hash, ...safe } = user
  return safe
}

module.exports = {
  TABLE,
  CREATE_TABLE,
  findByEmail,
  findById,
  create,
  upsert,
  toSafe,
}