const { query } = require('../config/db')

/**
 * Generate the next sequential ID for a given prefix/table.
 * Looks at the existing max numeric suffix and increments it.
 * Used for app-created trips, maintenance, fuel logs, expenses.
 *
 * NOTE: called inside transactions by the caller to avoid race conditions.
 */
async function nextId(connOrPool, prefix, table, idColumn, pad = 3) {
  const q = (sql, params) =>
    connOrPool.query ? connOrPool.query(sql, params) : connOrPool.execute(sql, params)
  const [rows] = await q(
    `SELECT ${idColumn} AS id FROM ${table} WHERE ${idColumn} LIKE ? ORDER BY ${idColumn} DESC LIMIT 1`,
    [`${prefix}-%`],
  )
  let next = 1
  if (rows.length) {
    const num = parseInt(String(rows[0].id).split('-').pop(), 10)
    if (Number.isFinite(num)) next = num + 1
  }
  return `${prefix}-${String(next).padStart(pad, '0')}`
}

module.exports = { nextId }