import { http } from './http.js'

/**
 * Real API facades — call the Express + MySQL backend.
 *
 * CONTRACT (from backend):
 *   - Success: { success, data, message?, pagination? }
 *   - Error:   { success: false, message, errors? }
 *   - List endpoints: data is the array, pagination has { page, limit, total, totalPages }
 *   - All fields are snake_case
 *
 * The axios response interceptor already returns res.data (the parsed body),
 * so these functions receive the full envelope and return it as-is. The
 * useResource hook unwraps `.data` automatically.
 *
 * For list endpoints we pass a large `limit` so the frontend gets all rows
 * (the backend defaults to 20, but our tables expect the full set for
 * client-side filtering/sorting).
 */

const FULL_LIST = { limit: 10000 }

export const realAuth = {
  async login(creds) {
    try {
      const res = await http.post('/auth/login', creds)
      if (res.success && res.data) {
        return { ...res, data: res.data.user }
      }
      return res
    } catch (err) {
      return err
    }
  },
  me: () => http.get('/auth/me'),
  logout: () => http.post('/auth/logout'),
}

export const realVehicles = {
  list: (filters = {}) => http.get('/vehicles', { params: { ...FULL_LIST, ...filters } }),
  get: (id) => http.get(`/vehicles/${id}`),
  eligibleForDispatch: () => http.get('/vehicles/eligible-for-dispatch'),
  create: (payload) => http.post('/vehicles', payload),
  update: (id, payload) => http.put(`/vehicles/${id}`, payload),
}

export const realDrivers = {
  list: (filters = {}) => http.get('/drivers', { params: { ...FULL_LIST, ...filters } }),
  get: (id) => http.get(`/drivers/${id}`),
  eligibleForDispatch: () => http.get('/drivers/eligible-for-dispatch'),
  create: (payload) => http.post('/drivers', payload),
  update: (id, payload) => http.put(`/drivers/${id}`, payload),
  suspend: (id) => http.put(`/drivers/${id}`, { status: 'Suspended' }),
  reinstate: (id) => http.put(`/drivers/${id}`, { status: 'Available' }),
}

export const realTrips = {
  list: (filters = {}) => http.get('/trips', { params: { ...FULL_LIST, ...filters } }),
  get: (id) => http.get(`/trips/${id}`),
  create: (payload) => http.post('/trips', payload),
  dispatch: (id) => http.patch(`/trips/${id}/dispatch`),
  complete: (id, payload) => http.patch(`/trips/${id}/complete`, payload),
  cancel: (id) => http.patch(`/trips/${id}/cancel`),
  // The backend doesn't have a "validate dispatch" endpoint — dispatch itself
  // runs the rules engine and returns the error message on failure.
  // For the live checklist UI, we simulate validation client-side using the
  // same rules the backend enforces.
  validateDispatch: (id) => http.get(`/trips/${id}`),
}

export const realMaintenance = {
  // Backend route param is :maintenance_id
  list: (filters = {}) => http.get('/maintenance', { params: { ...FULL_LIST, ...filters } }),
  create: (payload) => http.post('/maintenance', payload),
  close: (id) => http.patch(`/maintenance/${id}/close`),
}

export const realFuelLogs = {
  list: (filters = {}) => http.get('/fuel-logs', { params: { ...FULL_LIST, ...filters } }),
  create: (payload) => http.post('/fuel-logs', payload),
}

export const realExpenses = {
  list: (filters = {}) => http.get('/expenses', { params: { ...FULL_LIST, ...filters } }),
  create: (payload) => http.post('/expenses', payload),
}

export const realDashboard = {
  kpis: () => http.get('/dashboard/kpis'),
  charts: () => http.get('/dashboard/charts'),
  // Normalize backend snake_case KPI fields to what the Dashboard expects.
  // Done in the unified facade wrapper (see api/index.js).
}

export const realReports = {
  vehicleCosts: () => http.get('/reports/vehicle-costs'),
  roi: () => http.get('/reports/roi'),
  fuelEfficiency: () => http.get('/reports/fuel-efficiency'),
  // CSV export returns a blob (not JSON) — handled separately.
  exportCSV: async (type) => {
    const response = await http.get('/reports/export/csv', {
      params: { report: type },
      responseType: 'blob',
      // Bypass the JSON interceptor for blob responses.
      transformResponse: [(data) => data],
    })
    return response
  },
}