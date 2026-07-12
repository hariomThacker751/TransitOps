const mysql = require('mysql2/promise')
require('dotenv').config()

/**
 * MySQL connection pool.
 *
 * The pool is created lazily so that seed scripts and the app can share this
 * module without forcing a live DB connection at import time (useful for
 * `ensureDatabase()` which connects without a selected schema first).
 */
const config = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'transitops_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true, // return DATE/DATETIME as 'YYYY-MM-DD' strings
}

let pool

/** Lazily-created connection pool bound to the configured database. */
function getPool() {
  if (!pool) {
    pool = mysql.createPool(config)
  }
  return pool
}

/**
 * Create the target database if it does not exist. Connects without a selected
 * schema, runs CREATE DATABASE, then returns. Safe to call before getPool().
 */
async function ensureDatabase() {
  const conn = await mysql.createConnection({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
  })
  await conn.query(
    `CREATE DATABASE IF NOT EXISTS \`${config.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  )
  await conn.end()
}

/** Execute a query against the pool. */
function query(sql, params) {
  return getPool().query(sql, params)
}

/**
 * Run a function inside a managed transaction.
 *
 * @param {(conn: import('mysql2/promise').PoolConnection, query: Function) => Promise<any>} fn
 */
async function withTransaction(fn) {
  const conn = await getPool().getConnection()
  try {
    await conn.beginTransaction()
    const connQuery = (sql, params) => conn.query(sql, params)
    const result = await fn(conn, connQuery)
    await conn.commit()
    return result
  } catch (err) {
    try {
      await conn.rollback()
    } catch (_) {
      /* ignore rollback errors */
    }
    throw err
  } finally {
    conn.release()
  }
}

module.exports = {
  getPool,
  ensureDatabase,
  query,
  withTransaction,
  config,
}