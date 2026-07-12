import Papa from 'papaparse'

// The six seed CSVs live at the repo root and are the single source of truth.
// Imported as raw strings (Vite ?raw) so the dataset files are never modified.
import vehiclesCsv from '../../vehicles.csv?raw'
import driversCsv from '../../drivers.csv?raw'
import tripsCsv from '../../trips.csv?raw'
import maintenanceCsv from '../../maintenance_logs.csv?raw'
import fuelCsv from '../../fuel_logs.csv?raw'
import expensesCsv from '../../expenses.csv?raw'

/** Empty string → null for nullable fields (matches the plan's import rules). */
const nullable = (v) => (v === '' || v === undefined || v === null ? null : v)
const num = (v) => {
  const n = nullable(v)
  return n === null ? null : Number(n)
}
const date = (v) => nullable(v) // keep ISO date strings as-is; UI parses with date-fns

function parse(csv) {
  const { data } = Papa.parse(csv, { header: true, skipEmptyLines: true, dynamicTyping: false })
  return data
}

/**
 * Parse the six CSV files into a normalized seed dataset.
 * Field names match the CSV headers exactly; values are typed per the schema.
 */
export function loadSeed() {
  const vehicles = parse(vehiclesCsv).map((r) => ({
    registration_number: r.registration_number,
    vehicle_name_model: r.vehicle_name_model,
    type: r.type,
    max_load_capacity_kg: num(r.max_load_capacity_kg),
    odometer_km: num(r.odometer_km),
    acquisition_cost: num(r.acquisition_cost),
    status: r.status,
    region: r.region,
  }))

  const drivers = parse(driversCsv).map((r) => ({
    driver_id: r.driver_id,
    name: r.name,
    license_number: r.license_number,
    license_category: r.license_category,
    license_expiry_date: date(r.license_expiry_date),
    contact_number: r.contact_number,
    safety_score: num(r.safety_score),
    status: r.status,
  }))

  const trips = parse(tripsCsv).map((r) => ({
    trip_id: r.trip_id,
    source: r.source,
    destination: r.destination,
    vehicle_reg: r.vehicle_reg,
    driver_id: r.driver_id,
    cargo_weight_kg: num(r.cargo_weight_kg),
    planned_distance_km: num(r.planned_distance_km),
    actual_distance_km: num(r.actual_distance_km),
    fuel_consumed_liters: num(r.fuel_consumed_liters),
    revenue: num(r.revenue),
    status: r.status,
    created_date: date(r.created_date),
    dispatched_date: date(r.dispatched_date),
    completed_date: date(r.completed_date),
  }))

  const maintenance = parse(maintenanceCsv).map((r) => ({
    maintenance_id: r.maintenance_id,
    vehicle_reg: r.vehicle_reg,
    maintenance_type: r.maintenance_type,
    cost: num(r.cost),
    start_date: date(r.start_date),
    end_date: date(r.end_date),
    status: r.status,
  }))

  const fuelLogs = parse(fuelCsv).map((r) => ({
    fuel_log_id: r.fuel_log_id,
    vehicle_reg: r.vehicle_reg,
    trip_id: nullable(r.trip_id),
    liters: num(r.liters),
    cost: num(r.cost),
    date: date(r.date),
  }))

  const expenses = parse(expensesCsv).map((r) => ({
    expense_id: r.expense_id,
    vehicle_reg: r.vehicle_reg,
    expense_type: r.expense_type,
    amount: num(r.amount),
    date: date(r.date),
  }))

  return { vehicles, drivers, trips, maintenance, fuelLogs, expenses }
}

/** Generate the next sequential ID for a new record (e.g. TRIP-045). */
export function nextId(prefix, existing) {
  let max = 0
  for (const row of existing) {
    const m = String(row).match(/(\d+)$/)
    if (m) max = Math.max(max, Number(m[1]))
  }
  return `${prefix}-${String(max + 1).padStart(3, '0')}`
}
