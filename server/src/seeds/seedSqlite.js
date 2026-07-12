require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');
const { sequelize } = require('../config/db');

// Import models
const Vehicle = require('../models/Vehicle');
const Driver = require('../models/Driver');
const Trip = require('../models/Trip');
const MaintenanceLog = require('../models/MaintenanceLog');
const FuelLog = require('../models/FuelLog');
const Expense = require('../models/Expense');
const User = require('../models/User');

const DATA_DIR = path.join(__dirname, 'data');

const nullify = (val) => {
  if (val === undefined || val === null) return null;
  const str = String(val).trim();
  return str === '' ? null : str;
};

const toDecimal = (val) => {
  const n = nullify(val);
  if (n === null) return null;
  const parsed = parseFloat(n);
  return isNaN(parsed) ? null : parsed;
};

const toInt = (val) => {
  const n = nullify(val);
  if (n === null) return null;
  const parsed = parseInt(n, 10);
  return isNaN(parsed) ? null : parsed;
};

const toDate = (val) => {
  const n = nullify(val);
  if (n === null) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(n)) return n;
  const d = new Date(n);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split('T')[0];
};

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

const main = async () => {
  try {
    console.log('\n🚀 TransitOps SQLite Seed Script');
    await sequelize.sync({ force: true });
    console.log('✅ SQLite Database synchronized.');

    const imports = [
      { file: 'vehicles.csv', model: Vehicle, transform: transformVehicle },
      { file: 'drivers.csv', model: Driver, transform: transformDriver },
      { file: 'trips.csv', model: Trip, transform: transformTrip },
      { file: 'maintenance_logs.csv', model: MaintenanceLog, transform: transformMaintenance },
      { file: 'fuel_logs.csv', model: FuelLog, transform: transformFuelLog },
      { file: 'expenses.csv', model: Expense, transform: transformExpense },
    ];

    for (const { file, model, transform } of imports) {
      console.log(`📂 Importing ${file}...`);
      const filePath = path.join(DATA_DIR, file);
      const rawRows = await readCsv(filePath);
      if (rawRows.length === 0) continue;
      const transformed = rawRows.map(transform);
      await model.bulkCreate(transformed, { ignoreDuplicates: true });
      console.log(`   ✅ Inserted ${transformed.length} rows into ${model.name}.`);
    }

    console.log('\n✅ SQLite CSV import complete!\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Import failed:', error.message);
    process.exit(1);
  }
};

main();
