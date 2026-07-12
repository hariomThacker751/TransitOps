/**
 * Unified API facade — the single import surface the entire UI uses.
 *
 * Routes each call to the mock layer (default) or the real Express backend
 * based on VITE_USE_MOCK. Pages never reference mock/real directly, so
 * flipping the flag requires zero component changes.
 *
 * For real mode, a thin normalization layer maps backend snake_case KPI/report
 * fields to the shapes the UI components already consume (so the pages don't
 * need to know which mode is active).
 */

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false' // default true

import * as mock from './mock/index.js'
import * as real from './real/index.js'
import { realLlm } from './real/llm.js'
import { mockLlm } from './mock/llm.js'

// ── Real-mode normalizers ───────────────────────────────────────────────────
// The backend returns snake_case analytics fields; the UI pages use specific
// names. These adapters keep the pages mode-agnostic.
//
// NOTE: MySQL DECIMAL columns come back as STRINGS through Sequelize raw
// queries (e.g. "161000.00"), so every numeric field is coerced with Number()
// to prevent string-concatenation in reduce() and NaN in formatters.

const num = (v) => {
  const n = Number(v)
  return Number.isNaN(n) ? 0 : n
}

function normalizeKpis(data) {
  if (!data) return data
  // Already normalized (mock mode)
  if (data.activeVehicles !== undefined) return data
  // Backend shape → UI shape
  return {
    activeVehicles: num(data.active_vehicles),
    availableVehicles: num(data.available_vehicles),
    inMaintenance: num(data.vehicles_in_maintenance),
    activeTrips: num(data.active_trips),
    pendingTrips: num(data.pending_trips),
    driversOnDuty: num(data.drivers_on_duty),
    utilization: num(data.fleet_utilization_pct),
    totalVehicles: num(data.total_vehicles),
    totalDrivers: num(data.total_drivers),
    totalTrips: num(data.active_trips) + num(data.pending_trips),
    retiredVehicles: num(data.retired_vehicles),
  }
}

function normalizeVehicleCosts(rows) {
  if (!rows || !Array.isArray(rows)) return rows
  // Mock already returns { fuel, maintenance, expenses, total }.
  // Backend returns { total_fuel_cost, total_maintenance_cost, total_expense_cost, total_operational_cost }.
  return rows.map((r) => ({
    registration_number: r.registration_number,
    vehicle_name_model: r.vehicle_name_model,
    fuel: num(r.fuel ?? r.total_fuel_cost),
    maintenance: num(r.maintenance ?? r.total_maintenance_cost),
    expenses: num(r.expenses ?? r.total_expense_cost),
    total: num(r.total ?? r.total_operational_cost),
  }))
}

function normalizeRoi(rows) {
  if (!rows || !Array.isArray(rows)) return rows
  // Backend returns { total_revenue, total_maintenance_cost, total_fuel_cost, roi }.
  // ROI comes as a decimal ratio (e.g. 0.0387 = 3.87%), so multiply by 100.
  return rows.map((r) => ({
    registration_number: r.registration_number,
    vehicle_name_model: r.vehicle_name_model,
    acquisition_cost: num(r.acquisition_cost),
    revenue: num(r.revenue ?? r.total_revenue),
    operational_cost: num(r.operational_cost) || (num(r.total_maintenance_cost) + num(r.total_fuel_cost)),
    roi: r.roi != null ? num(r.roi) * 100 : 0,
    status: r.status,
  }))
}

function normalizeFuelEfficiency(rows) {
  if (!rows || !Array.isArray(rows)) return rows
  // Backend returns { total_distance, total_fuel_liters, efficiency_km_per_liter }.
  return rows.map((r) => ({
    registration_number: r.registration_number,
    vehicle_name_model: r.vehicle_name_model,
    completedTrips: num(r.completedTrips),
    totalDistance: num(r.total_distance),
    tripFuel: num(r.total_fuel_liters),
    allFuel: num(r.total_fuel_liters),
    efficiency: r.efficiency_km_per_liter != null ? num(r.efficiency_km_per_liter) : 0,
  }))
}

// ── Build the unified facade ────────────────────────────────────────────────
const m = USE_MOCK ? mock : real

const facade = {
  auth: m.mockAuth || m.realAuth,
  vehicles: m.mockVehicles || m.realVehicles,
  drivers: m.mockDrivers || m.realDrivers,
  trips: m.mockTrips || m.realTrips,
  maintenance: m.mockMaintenance || m.realMaintenance,
  fuelLogs: m.mockFuelLogs || m.realFuelLogs,
  expenses: m.mockExpenses || m.realExpenses,
  llm: USE_MOCK ? mockLlm : realLlm,
  isMock: USE_MOCK,
  resetSeed: () => (USE_MOCK ? mock.mockDb.reset() : Promise.reject('reset only available in mock mode')),
}

// Dashboard + reports need normalization in real mode (mock already returns UI shapes).
facade.dashboard = USE_MOCK
  ? mock.mockDashboard
  : {
      async kpis() {
        const res = await real.realDashboard.kpis()
        return { ...res, data: normalizeKpis(res.data) }
      },
      async charts() {
        return real.realDashboard.charts()
      },
    }

facade.reports = USE_MOCK
  ? mock.mockReports
  : {
      async vehicleCosts() {
        const res = await real.realReports.vehicleCosts()
        return { ...res, data: normalizeVehicleCosts(res.data) }
      },
      async roi() {
        const res = await real.realReports.roi()
        return { ...res, data: normalizeRoi(res.data) }
      },
      async fuelEfficiency() {
        const res = await real.realReports.fuelEfficiency()
        return { ...res, data: normalizeFuelEfficiency(res.data) }
      },
      exportCSV: (type) => real.realReports.exportCSV(type),
    }

export const api = facade
export default facade