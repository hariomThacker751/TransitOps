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

function normalizeKpis(data) {
  if (!data) return data
  // Already normalized (mock mode)
  if (data.activeVehicles !== undefined) return data
  // Backend shape → UI shape
  return {
    activeVehicles: data.active_vehicles ?? 0,
    availableVehicles: data.available_vehicles ?? 0,
    inMaintenance: data.vehicles_in_maintenance ?? 0,
    activeTrips: data.active_trips ?? 0,
    pendingTrips: data.pending_trips ?? 0,
    driversOnDuty: data.drivers_on_duty ?? 0,
    utilization: data.fleet_utilization_pct ?? 0,
    totalVehicles: data.total_vehicles ?? 0,
    totalDrivers: data.total_drivers ?? 0,
    totalTrips: (data.active_trips ?? 0) + (data.pending_trips ?? 0),
    retiredVehicles: data.retired_vehicles ?? 0,
  }
}

function normalizeVehicleCosts(rows) {
  if (!rows || !Array.isArray(rows)) return rows
  // Mock already returns { fuel, maintenance, expenses, total }.
  // Backend returns { total_fuel_cost, total_maintenance_cost, total_expense_cost, total_operational_cost }.
  return rows.map((r) => ({
    registration_number: r.registration_number,
    vehicle_name_model: r.vehicle_name_model,
    fuel: r.fuel ?? r.total_fuel_cost ?? 0,
    maintenance: r.maintenance ?? r.total_maintenance_cost ?? 0,
    expenses: r.expenses ?? r.total_expense_cost ?? 0,
    total: r.total ?? r.total_operational_cost ?? 0,
  }))
}

function normalizeRoi(rows) {
  if (!rows || !Array.isArray(rows)) return rows
  // Backend returns { total_revenue, total_maintenance_cost, total_fuel_cost, roi }.
  return rows.map((r) => ({
    registration_number: r.registration_number,
    vehicle_name_model: r.vehicle_name_model,
    acquisition_cost: r.acquisition_cost ?? 0,
    revenue: r.revenue ?? r.total_revenue ?? 0,
    operational_cost: r.operational_cost ?? (r.total_maintenance_cost ?? 0) + (r.total_fuel_cost ?? 0),
    roi: r.roi != null ? Number(r.roi) * (r.roi > 1 ? 100 : 1) : 0,
    status: r.status,
  }))
}

function normalizeFuelEfficiency(rows) {
  if (!rows || !Array.isArray(rows)) return rows
  // Backend returns { total_distance, total_fuel_liters, efficiency_km_per_liter }.
  return rows.map((r) => ({
    registration_number: r.registration_number,
    vehicle_name_model: r.vehicle_name_model,
    completedTrips: r.completedTrips ?? 0,
    totalDistance: r.totalDistance ?? Number(r.total_distance ?? 0),
    tripFuel: r.tripFuel ?? Number(r.total_fuel_liters ?? 0),
    allFuel: r.allFuel ?? Number(r.total_fuel_liters ?? 0),
    efficiency: r.efficiency ?? (r.efficiency_km_per_liter != null ? Number(r.efficiency_km_per_liter) : 0),
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