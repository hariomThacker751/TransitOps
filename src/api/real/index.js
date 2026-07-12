import { http } from './http.js'

/**
 * Real API facades — one function per backend endpoint from the plan.
 * Each returns the plan's { success, data } shape (handled by the axios
 * response interceptor). Active only when VITE_USE_MOCK=false.
 */

export const realAuth = {
  login: (creds) => http.post('/auth/login', creds),
  me: () => http.get('/auth/me'),
}

export const realVehicles = {
  list: (filters) => http.get('/vehicles', { params: filters }),
  get: (id) => http.get(`/vehicles/${id}`),
  create: (payload) => http.post('/vehicles', payload),
  update: (id, payload) => http.put(`/vehicles/${id}`, payload),
}

export const realDrivers = {
  list: (filters) => http.get('/drivers', { params: filters }),
  get: (id) => http.get(`/drivers/${id}`),
  create: (payload) => http.post('/drivers', payload),
  update: (id, payload) => http.put(`/drivers/${id}`, payload),
}

export const realTrips = {
  list: (filters) => http.get('/trips', { params: filters }),
  get: (id) => http.get(`/trips/${id}`),
  create: (payload) => http.post('/trips', payload),
  dispatch: (id) => http.patch(`/trips/${id}/dispatch`),
  complete: (id, payload) => http.patch(`/trips/${id}/complete`, payload),
  cancel: (id) => http.patch(`/trips/${id}/cancel`),
}

export const realMaintenance = {
  list: (filters) => http.get('/maintenance', { params: filters }),
  create: (payload) => http.post('/maintenance', payload),
  close: (id) => http.patch(`/maintenance/${id}/close`),
}

export const realFuelLogs = {
  list: (filters) => http.get('/fuel-logs', { params: filters }),
  create: (payload) => http.post('/fuel-logs', payload),
}

export const realExpenses = {
  list: (filters) => http.get('/expenses', { params: filters }),
  create: (payload) => http.post('/expenses', payload),
}

export const realDashboard = {
  kpis: () => http.get('/dashboard/kpis'),
  charts: () => http.get('/dashboard/charts'),
}

export const realReports = {
  vehicleCosts: () => http.get('/reports/vehicle-costs'),
  roi: () => http.get('/reports/roi'),
  fuelEfficiency: () => http.get('/reports/fuel-efficiency'),
  exportCSV: (type) => http.get('/reports/export/csv', { params: { type }, responseType: 'blob' }),
}
