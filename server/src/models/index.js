const { ensureDatabase, query } = require('../config/db')
const User = require('./User')
const Vehicle = require('./Vehicle')
const Driver = require('./Driver')
const Trip = require('./Trip')
const MaintenanceLog = require('./MaintenanceLog')
const FuelLog = require('./FuelLog')
const Expense = require('./Expense')

const MODELS = [User, Vehicle, Driver, Trip, MaintenanceLog, FuelLog, Expense]

const IMPORTED_TABLES = [
  Vehicle.TABLE,
  Driver.TABLE,
  Trip.TABLE,
  MaintenanceLog.TABLE,
  FuelLog.TABLE,
  Expense.TABLE,
]

/** Create the database (if missing) and every table if not exists. */
async function initSchema() {
  await ensureDatabase()
  for (const model of MODELS) {
    await query(model.CREATE_TABLE)
  }
}

module.exports = { MODELS, IMPORTED_TABLES, initSchema }