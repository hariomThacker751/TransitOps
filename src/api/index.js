/**
 * Unified API facade — the single import surface the entire UI uses.
 *
 * Routes each call to the mock layer (default) or the real Express backend
 * based on VITE_USE_MOCK. Pages never reference mock/real directly, so
 * flipping the flag requires zero component changes.
 */

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false' // default true

import * as mock from './mock/index.js'
import * as real from './real/index.js'

const m = USE_MOCK ? mock : real

export const api = {
  auth: m.mockAuth || m.realAuth,
  vehicles: m.mockVehicles || m.realVehicles,
  drivers: m.mockDrivers || m.realDrivers,
  trips: m.mockTrips || m.realTrips,
  maintenance: m.mockMaintenance || m.realMaintenance,
  fuelLogs: m.mockFuelLogs || m.realFuelLogs,
  expenses: m.mockExpenses || m.realExpenses,
  dashboard: m.mockDashboard || m.realDashboard,
  reports: m.mockReports || m.realReports,
  isMock: USE_MOCK,
  resetSeed: () => (USE_MOCK ? mock.mockDb.reset() : Promise.reject('reset only available in mock mode')),
}

export default api
