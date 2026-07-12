/**
 * TransitOps CSV Import Script
 *
 * Imports all 6 CSV seed files into MySQL, creating tables if they don't exist.
 *
 * Usage:
 *   node src/seeds/importCsv.js          # Idempotent: skip existing rows
 *   node src/seeds/importCsv.js --fresh  # Truncate tables then reload
 *
 * Rules:
 * - Empty strings in nullable fields → NULL
 * - Numeric strings → numbers
 * - YYYY-MM-DD strings → SQL DATE
 * - No mutation of source data beyond type coercion
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');
const mysql2 = require('mysql2/promise');

const DATA_DIR = path.join(__dirname, 'data');

const isFresh = process.argv.includes('--fresh');

// ─────────────────────────────────────────────────────────────
// Utility functions
// ─────────────────────────────────────────────────────────────

/**
 * Convert an empty string or whitespace-only string to null
 */
const nullify = (val) => {
  if (val === undefined || val === null) return null;
  const str = String(val).trim();
  return str === '' ? null : str;
};

/**
 * Parse a value as a decimal number or null
 */
const toDecimal = (val) => {
  const n = nullify(val);
  if (n === null) return null;
  const parsed = parseFloat(n);
  return isNaN(parsed) ? null : parsed;
};

/**
 * Parse a value as an integer or null
 */
const toInt = (val) => {
  const n = nullify(val);
  if (n === null) return null;
  const parsed = parseInt(n, 10);
  return isNaN(parsed) ? null : parsed;
};

/**
 * Parse a date string to YYYY-MM-DD or null
 */
const toDate = (val) => {
  const n = nullify(val);
  if (n === null) return null;
  // Already in YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(n)) return n;
  // Try parsing ISO or other formats
  const d = new Date(n);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split('T')[0];
};

// ─────────────────────────────────────────────────────────────
// Table creation SQL
// ─────────────────────────────────────────────────────────────

const CREATE_TABLES_SQL = [
  `CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('fleet_manager','driver','safety_officer','financial_analyst') NOT NULL,
    driver_id VARCHAR(20) NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS vehicles (
    registration_number VARCHAR(20) PRIMARY KEY,
    vehicle_name_model VARCHAR(150),
    type VARCHAR(50),
    max_load_capacity_kg DECIMAL(10,2),
    odometer_km DECIMAL(12,2),
    acquisition_cost DECIMAL(12,2),
    status ENUM('Available','On Trip','In Shop','Retired') NOT NULL DEFAULT 'Available',
    region VARCHAR(50)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS drivers (
    driver_id VARCHAR(20) PRIMARY KEY,
    name VARCHAR(100),
    license_number VARCHAR(50) UNIQUE,
    license_category VARCHAR(30),
    license_expiry_date DATE,
    contact_number VARCHAR(30),
    safety_score INT,
    status ENUM('Available','On Trip','Off Duty','Suspended') NOT NULL DEFAULT 'Available'
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS trips (
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
    status ENUM('Draft','Dispatched','Completed','Cancelled') NOT NULL DEFAULT 'Draft',
    created_date DATE,
    dispatched_date DATE NULL,
    completed_date DATE NULL,
    INDEX idx_trips_vehicle (vehicle_reg),
    INDEX idx_trips_driver (driver_id),
    INDEX idx_trips_status (status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS maintenance_logs (
    maintenance_id VARCHAR(20) PRIMARY KEY,
    vehicle_reg VARCHAR(20),
    maintenance_type VARCHAR(100),
    cost DECIMAL(12,2),
    start_date DATE,
    end_date DATE NULL,
    status ENUM('Active','Closed') NOT NULL DEFAULT 'Active',
    INDEX idx_maint_vehicle (vehicle_reg),
    INDEX idx_maint_status (status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS fuel_logs (
    fuel_log_id VARCHAR(20) PRIMARY KEY,
    vehicle_reg VARCHAR(20),
    trip_id VARCHAR(20) NULL,
    liters DECIMAL(10,2),
    cost DECIMAL(12,2),
    date DATE,
    INDEX idx_fuel_vehicle (vehicle_reg),
    INDEX idx_fuel_trip (trip_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS expenses (
    expense_id VARCHAR(20) PRIMARY KEY,
    vehicle_reg VARCHAR(20),
    expense_type VARCHAR(100),
    amount DECIMAL(12,2),
    date DATE,
    INDEX idx_expense_vehicle (vehicle_reg),
    INDEX idx_expense_type (expense_type)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
];

// ─────────────────────────────────────────────────────────────
// Row transformers per table
// ─────────────────────────────────────────────────────────────

const transformVehicle = (row) => ({
  registration_number: nullify(row.registration_number),
  vehicle_name_model: nullify(row.vehicle_name_model),
  type: nullify(row.type),
  max_load_capacity_kg: toDecimal(row.max_load_capacity_kg),
  odometer_km: toDecimal(row.odometer_km),
  acquisition_cost: toDecimal(row.acquisition_cost),
  status: nullify(row.status) || 'Available',
  region: nullify(row.region),
});

const transformDriver = (row) => ({
  driver_id: nullify(row.driver_id),
  name: nullify(row.name),
  license_number: nullify(row.license_number),
  license_category: nullify(row.license_category),
  license_expiry_date: toDate(row.license_expiry_date),
  contact_number: nullify(row.contact_number),
  safety_score: toInt(row.safety_score),
  status: nullify(row.status) || 'Available',
});

const transformTrip = (row) => ({
  trip_id: nullify(row.trip_id),
  source: nullify(row.source),
  destination: nullify(row.destination),
  vehicle_reg: nullify(row.vehicle_reg),
  driver_id: nullify(row.driver_id),
  cargo_weight_kg: toDecimal(row.cargo_weight_kg),
  planned_distance_km: toDecimal(row.planned_distance_km),
  actual_distance_km: toDecimal(row.actual_distance_km),
  fuel_consumed_liters: toDecimal(row.fuel_consumed_liters),
  revenue: toDecimal(row.revenue) || 0,
  status: nullify(row.status) || 'Draft',
  created_date: toDate(row.created_date),
  dispatched_date: toDate(row.dispatched_date),
  completed_date: toDate(row.completed_date),
});

const transformMaintenance = (row) => ({
  maintenance_id: nullify(row.maintenance_id),
  vehicle_reg: nullify(row.vehicle_reg),
  maintenance_type: nullify(row.maintenance_type),
  cost: toDecimal(row.cost),
  start_date: toDate(row.start_date),
  end_date: toDate(row.end_date),
  status: nullify(row.status) || 'Active',
});

const transformFuelLog = (row) => ({
  fuel_log_id: nullify(row.fuel_log_id),
  vehicle_reg: nullify(row.vehicle_reg),
  trip_id: nullify(row.trip_id),
  liters: toDecimal(row.liters),
  cost: toDecimal(row.cost),
  date: toDate(row.date),
});

const transformExpense = (row) => ({
  expense_id: nullify(row.expense_id),
  vehicle_reg: nullify(row.vehicle_reg),
  expense_type: nullify(row.expense_type),
  amount: toDecimal(row.amount),
  date: toDate(row.date),
});

// ─────────────────────────────────────────────────────────────
// CSV reader helper
// ─────────────────────────────────────────────────────────────

const readCsv = (filePath) =>
  new Promise((resolve, reject) => {
    const rows = [];
    if (!fs.existsSync(filePath)) {
      console.warn(`   ⚠️  File not found: ${filePath} — skipping`);
      return resolve([]);
    }
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => rows.push(row))
      .on('end', () => resolve(rows))
      .on('error', reject);
  });

// ─────────────────────────────────────────────────────────────
// Batch upsert helper
// ─────────────────────────────────────────────────────────────

const batchInsert = async (conn, tableName, rows, pkField) => {
  if (rows.length === 0) return 0;

  const columns = Object.keys(rows[0]);
  let inserted = 0;
  let skipped = 0;

  for (const row of rows) {
    // Skip rows with null PK
    if (!row[pkField]) {
      skipped++;
      continue;
    }

    const values = columns.map((col) => row[col]);
    const placeholders = columns.map(() => '?').join(', ');
    const columnList = columns.join(', ');

    // INSERT IGNORE for idempotency — skip duplicates silently
    const [result] = await conn.execute(
      `INSERT IGNORE INTO ${tableName} (${columnList}) VALUES (${placeholders})`,
      values
    );

    if (result.affectedRows > 0) inserted++;
    else skipped++;
  }

  return { inserted, skipped };
};

// ─────────────────────────────────────────────────────────────
// Main import function
// ─────────────────────────────────────────────────────────────

const main = async () => {
  console.log('\n🚀 TransitOps CSV Import Script');
  console.log(`   Mode: ${isFresh ? '🔄 FRESH (truncate + reload)' : '📥 Idempotent (skip existing)'}\n`);

  let conn;
  try {
    conn = await mysql2.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'transitops_db',
      multipleStatements: false,
    });

    console.log('✅ Connected to MySQL\n');

    // ── Create tables ──────────────────────────────────────────
    console.log('📋 Creating tables (if not exist)...');
    for (const sql of CREATE_TABLES_SQL) {
      await conn.execute(sql);
    }
    console.log('✅ All tables ready\n');

    // ── Fresh mode: truncate imported tables ──────────────────
    const IMPORTED_TABLES = ['expenses', 'fuel_logs', 'maintenance_logs', 'trips', 'drivers', 'vehicles'];

    if (isFresh) {
      console.log('🗑️  Truncating tables for fresh import...');
      await conn.execute('SET FOREIGN_KEY_CHECKS = 0');
      for (const tbl of IMPORTED_TABLES) {
        await conn.execute(`TRUNCATE TABLE ${tbl}`);
        console.log(`   Truncated: ${tbl}`);
      }
      await conn.execute('SET FOREIGN_KEY_CHECKS = 1');
      console.log('');
    }

    // ── Import each CSV ───────────────────────────────────────
    const imports = [
      { file: 'vehicles.csv', table: 'vehicles', pk: 'registration_number', transform: transformVehicle },
      { file: 'drivers.csv', table: 'drivers', pk: 'driver_id', transform: transformDriver },
      { file: 'trips.csv', table: 'trips', pk: 'trip_id', transform: transformTrip },
      { file: 'maintenance_logs.csv', table: 'maintenance_logs', pk: 'maintenance_id', transform: transformMaintenance },
      { file: 'fuel_logs.csv', table: 'fuel_logs', pk: 'fuel_log_id', transform: transformFuelLog },
      { file: 'expenses.csv', table: 'expenses', pk: 'expense_id', transform: transformExpense },
    ];

    const summary = {};

    for (const { file, table, pk, transform } of imports) {
      console.log(`📂 Importing ${file} → ${table}...`);
      const filePath = path.join(DATA_DIR, file);
      const rawRows = await readCsv(filePath);

      if (rawRows.length === 0) {
        console.log(`   (no rows found)\n`);
        summary[table] = { inserted: 0, skipped: 0 };
        continue;
      }

      const transformed = rawRows.map(transform);
      const result = await batchInsert(conn, table, transformed, pk);
      summary[table] = result;

      console.log(`   ✅ ${result.inserted} inserted, ${result.skipped} skipped (${rawRows.length} total rows)\n`);
    }

    // ── Summary ───────────────────────────────────────────────
    console.log('─'.repeat(50));
    console.log('📊 Import Summary:');
    console.log('─'.repeat(50));
    let totalInserted = 0;
    for (const [table, { inserted, skipped }] of Object.entries(summary)) {
      console.log(`   ${table.padEnd(20)} inserted: ${String(inserted).padStart(4)}  |  skipped: ${skipped}`);
      totalInserted += inserted;
    }
    console.log('─'.repeat(50));
    console.log(`   Total rows inserted: ${totalInserted}`);
    console.log('\n✅ CSV import complete!\n');

  } catch (error) {
    console.error('\n❌ Import failed:', error.message);
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('   → Check DB_USER and DB_PASSWORD in .env');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error(`   → Database '${process.env.DB_NAME}' does not exist. Create it first:`);
      console.error(`     mysql -u root -p -e "CREATE DATABASE ${process.env.DB_NAME || 'transitops_db'};"`);
    }
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
};

main();
