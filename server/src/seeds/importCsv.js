/**
 * CSV import — loads the six provided datasets UNCHANGED into MySQL.
 *
 * Rules:
 *  - create the database + tables if they do not exist
 *  - import CSV files exactly as given (no row mutation, only type conversion)
 *  - empty strings in nullable fields become NULL
 *  - numeric strings become numbers
 *  - YYYY-MM-DD strings become SQL DATE (passed through as strings)
 *  - idempotent: by default uses INSERT IGNORE so re-running is safe
 *  - --fresh: truncate the imported tables first, then reload
 *  - prints inserted/total row counts per table
 *
 * Usage:
 *   node src/seeds/importCsv.js          # safe insert (INSERT IGNORE)
 *   node src/seeds/importCsv.js --fresh  # truncate then reload
 */
const fs = require('fs')
const path = require('path')
const { parse } = require('fast-csv')
const { initSchema, IMPORTED_TABLES } = require('../models')
const { getPool, query } = require('../config/db')

const DATA_DIR = path.join(__dirname, 'data')

// Column metadata per imported table.
// nullable: empty string -> NULL
// numeric:  coerce to Number
// (dates are passed through as YYYY-MM-DD strings; mysql2 + dateStrings handles them)
const TABLE_META = {
  vehicles: {
    file: 'vehicles.csv',
    columns: [
      'registration_number',
      'vehicle_name_model',
      'type',
      'max_load_capacity_kg',
      'odometer_km',
      'acquisition_cost',
      'status',
      'region',
    ],
    numeric: ['max_load_capacity_kg', 'odometer_km', 'acquisition_cost'],
    nullable: [],
  },
  drivers: {
    file: 'drivers.csv',
    columns: [
      'driver_id',
      'name',
      'license_number',
      'license_category',
      'license_expiry_date',
      'contact_number',
      'safety_score',
      'status',
    ],
    numeric: ['safety_score'],
    nullable: [],
  },
  trips: {
    file: 'trips.csv',
    columns: [
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
    ],
    numeric: [
      'cargo_weight_kg',
      'planned_distance_km',
      'actual_distance_km',
      'fuel_consumed_liters',
      'revenue',
    ],
    nullable: ['actual_distance_km', 'fuel_consumed_liters', 'dispatched_date', 'completed_date'],
  },
  maintenance_logs: {
    file: 'maintenance_logs.csv',
    columns: [
      'maintenance_id',
      'vehicle_reg',
      'maintenance_type',
      'cost',
      'start_date',
      'end_date',
      'status',
    ],
    numeric: ['cost'],
    nullable: ['end_date'],
  },
  fuel_logs: {
    file: 'fuel_logs.csv',
    columns: ['fuel_log_id', 'vehicle_reg', 'trip_id', 'liters', 'cost', 'date'],
    numeric: ['liters', 'cost'],
    nullable: ['trip_id'],
  },
  expenses: {
    file: 'expenses.csv',
    columns: ['expense_id', 'vehicle_reg', 'expense_type', 'amount', 'date'],
    numeric: ['amount'],
    nullable: [],
  },
}

function coerce(table, row) {
  const meta = TABLE_META[table]
  const out = {}
  for (const col of meta.columns) {
    let val = row[col]
    if (val === undefined || val === null) val = ''
    const isEmpty = String(val).trim() === ''
    if (isEmpty) {
      out[col] = meta.nullable.includes(col) ? null : ''
      continue
    }
    if (meta.numeric.includes(col)) {
      const n = Number(val)
      out[col] = Number.isFinite(n) ? n : null
    } else {
      out[col] = String(val)
    }
  }
  return out
}

function readCsv(filePath) {
  return new Promise((resolve, reject) => {
    const rows = []
    fs.createReadStream(filePath)
      .pipe(parse({ headers: true, trim: true, skipEmptyLines: true }))
      .on('error', reject)
      .on('data', (row) => rows.push(row))
      .on('end', () => resolve(rows))
  })
}

async function importTable(table) {
  const meta = TABLE_META[table]
  const filePath = path.join(DATA_DIR, meta.file)
  if (!fs.existsSync(filePath)) {
    throw new Error(`Seed file not found: ${filePath}`)
  }

  const rows = await readCsv(filePath)
  if (!rows.length) {
    console.log(`  ${table}: 0 rows (empty file)`)
    return { table, inserted: 0, total: 0 }
  }

  const cols = meta.columns
  const placeholders = cols.map(() => '?').join(', ')
  const colList = cols.map((c) => `\`${c}\``).join(', ')
  // INSERT IGNORE keeps the import idempotent: re-running seed:import (without
  // --fresh) skips rows whose PK already exists instead of erroring.
  const sql = `INSERT IGNORE INTO \`${table}\` (${colList}) VALUES ?`

  const pool = getPool()
  let inserted = 0
  // Batch the values to avoid sending one round-trip per row.
  const BATCH = 500
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH).map((r) => coerce(table, r))
    const values = batch.map((r) => cols.map((c) => r[c]))
    const [result] = await pool.query(sql, [values])
    // mysql2 returns a single affectedRows for multi-row insert.
    inserted += result.affectedRows || 0
  }

  // For --fresh we truncate first, so affectedRows ~ inserted. For idempotent
  // INSERT IGNORE re-runs, affectedRows undercounts (skips existing PKs).
  // Report the actual table count for accuracy.
  const [countRows] = await query(`SELECT COUNT(*) AS n FROM \`${table}\``)
  const total = countRows[0].n

  console.log(`  ${table}: imported ${rows.length} rows | table now has ${total} rows`)
  return { table, inserted, total }
}

async function main() {
  const fresh = process.argv.includes('--fresh')

  console.log('[seed] Ensuring database + tables exist...')
  await initSchema()

  if (fresh) {
    console.log('[seed] --fresh: truncating imported tables...')
    // Order matters: truncate all (no FK constraints, but be safe).
    for (const t of IMPORTED_TABLES) {
      await query(`TRUNCATE TABLE \`${t}\``)
    }
  }

  console.log('[seed] Importing CSV files...')
  const results = []
  for (const table of IMPORTED_TABLES) {
    results.push(await importTable(table))
  }

  console.log('\n[seed] Import complete.')
  console.table(
    results.reduce((acc, r) => {
      acc[r.table] = { rows: r.total }
      return acc
    }, {}),
  )

  process.exit(0)
}

main().catch((err) => {
  console.error('[seed] Import failed:', err)
  process.exit(1)
})