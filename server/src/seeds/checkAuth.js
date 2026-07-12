/**
 * One-off diagnostic: checks DB connectivity, whether `users` table exists,
 * and whether the demo users are present. Does NOT modify anything.
 *
 * Usage (from server/):
 *   node src/seeds/checkAuth.js
 */
require('dotenv').config()
const { getPool, config } = require('../config/db')

async function main() {
  console.log('[check] Config:', {
    host: config.host,
    port: config.port,
    user: config.user,
    database: config.database,
  })

  const pool = getPool()

  try {
    await pool.query('SELECT 1')
    console.log('[check] DB connection: OK')
  } catch (err) {
    console.error('[check] DB connection FAILED:', err.message)
    process.exit(1)
  }

  try {
    const [tables] = await pool.query(
      `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users'`,
      [config.database],
    )
    if (tables.length === 0) {
      console.log('[check] `users` table: DOES NOT EXIST')
      console.log('[check] => Run: npm run seed:all  (or npm run seed:users)')
      process.exit(0)
    }
    console.log('[check] `users` table: EXISTS')
  } catch (err) {
    console.error('[check] Failed checking table:', err.message)
    process.exit(1)
  }

  try {
    const [rows] = await pool.query('SELECT id, name, email, role FROM users')
    console.log(`[check] Row count: ${rows.length}`)
    rows.forEach((r) => console.log(`  - ${r.id}: ${r.email} (${r.role})`))
    if (rows.length === 0) {
      console.log('[check] => Table is empty. Run: npm run seed:users')
    }
  } catch (err) {
    console.error('[check] Failed reading rows:', err.message)
  }

  process.exit(0)
}

main().catch((err) => {
  console.error('[check] Unexpected error:', err)
  process.exit(1)
})
