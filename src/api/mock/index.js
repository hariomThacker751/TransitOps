import { db } from './db.js'
import { validateDispatch } from './rules.js'
import {
  dispatchTrip,
  completeTrip,
  cancelTrip,
  createMaintenance,
  closeMaintenance,
  RuleError,
} from './transitions.js'
import { DEMO_USERS } from '@/utils/constants'

/**
 * Mock API — simulates the full Express + MySQL backend in the browser.
 * Every function returns a Promise resolving to the plan's response shapes
 * so the UI code is identical whether mock or real mode is active.
 */

const delay = (ms = 120) => new Promise((r) => setTimeout(r, ms))
const ok = (data) => ({ success: true, data })
const fail = (message, extra = {}) => ({ success: false, message, ...extra })

// ── Auth ────────────────────────────────────────────────────────────────────
export const mockAuth = {
  async login({ email, password }) {
    await delay()
    const user = DEMO_USERS.find((u) => u.email === email && u.password === password)
    if (!user) return fail('Invalid email or password.')
    const { password: _pw, ...safe } = user
    return ok({ ...safe, token: `mock.${user.role}.${Date.now()}` })
  },
  async me(token) {
    await delay(50)
    if (!token) return fail('Not authenticated.')
    const role = token.split('.')[1]
    const user = DEMO_USERS.find((u) => u.role === role)
    if (!user) return fail('Session expired.')
    const { password: _pw, ...safe } = user
    return ok(safe)
  },
}

// ── Vehicles ────────────────────────────────────────────────────────────────
export const mockVehicles = {
  async list(filters = {}) {
    await delay()
    let rows = [...db.get().vehicles]
    if (filters.status) rows = rows.filter((v) => v.status === filters.status)
    if (filters.type) rows = rows.filter((v) => v.type === filters.type)
    if (filters.region) rows = rows.filter((v) => v.region === filters.region)
    if (filters.search) {
      const q = filters.search.toLowerCase()
      rows = rows.filter(
        (v) =>
          v.registration_number.toLowerCase().includes(q) ||
          v.vehicle_name_model.toLowerCase().includes(q),
      )
    }
    return ok(rows)
  },
  async get(reg) {
    await delay(60)
    const v = db.get().vehicles.find((x) => x.registration_number === reg)
    if (!v) return fail('Vehicle not found.')
    return ok(v)
  },
  async create(payload) {
    await delay()
    if (db.get().vehicles.some((v) => v.registration_number === payload.registration_number)) {
      return fail('A vehicle with this registration number already exists.')
    }
    const vehicle = {
      registration_number: payload.registration_number,
      vehicle_name_model: payload.vehicle_name_model,
      type: payload.type,
      max_load_capacity_kg: Number(payload.max_load_capacity_kg) || 0,
      odometer_km: Number(payload.odometer_km) || 0,
      acquisition_cost: Number(payload.acquisition_cost) || 0,
      status: payload.status || 'Available',
      region: payload.region,
    }
    db.commit((s) => s.vehicles.unshift(vehicle))
    return ok(vehicle)
  },
  async update(reg, payload) {
    await delay()
    let updated
    db.commit((s) => {
      const v = s.vehicles.find((x) => x.registration_number === reg)
      if (!v) return
      Object.assign(v, {
        ...payload,
        max_load_capacity_kg: payload.max_load_capacity_kg !== undefined ? Number(payload.max_load_capacity_kg) : v.max_load_capacity_kg,
        odometer_km: payload.odometer_km !== undefined ? Number(payload.odometer_km) : v.odometer_km,
        acquisition_cost: payload.acquisition_cost !== undefined ? Number(payload.acquisition_cost) : v.acquisition_cost,
      })
      updated = { ...v }
    })
    return updated ? ok(updated) : fail('Vehicle not found.')
  },
}

// ── Drivers ─────────────────────────────────────────────────────────────────
export const mockDrivers = {
  async list(filters = {}) {
    await delay()
    let rows = [...db.get().drivers]
    if (filters.status) rows = rows.filter((d) => d.status === filters.status)
    if (filters.license_category) rows = rows.filter((d) => d.license_category === filters.license_category)
    if (filters.search) {
      const q = filters.search.toLowerCase()
      rows = rows.filter((d) => d.name.toLowerCase().includes(q) || d.driver_id.toLowerCase().includes(q))
    }
    return ok(rows)
  },
  async get(id) {
    await delay(60)
    const d = db.get().drivers.find((x) => x.driver_id === id)
    if (!d) return fail('Driver not found.')
    return ok(d)
  },
  async create(payload) {
    await delay()
    if (db.get().drivers.some((d) => d.license_number === payload.license_number)) {
      return fail('A driver with this license number already exists.')
    }
    const id = `DRV-${String(db.nextSeq('drv')).padStart(2, '0')}`
    const driver = {
      driver_id: id,
      name: payload.name,
      license_number: payload.license_number,
      license_category: payload.license_category,
      license_expiry_date: payload.license_expiry_date,
      contact_number: payload.contact_number,
      safety_score: Number(payload.safety_score) || 0,
      status: payload.status || 'Available',
    }
    db.commit((s) => {
      s.drivers.unshift(driver)
      s._seq.drv = (s._seq.drv || 18) + 1
    })
    return ok(driver)
  },
  async update(id, payload) {
    await delay()
    let updated
    db.commit((s) => {
      const d = s.drivers.find((x) => x.driver_id === id)
      if (!d) return
      Object.assign(d, {
        ...payload,
        safety_score: payload.safety_score !== undefined ? Number(payload.safety_score) : d.safety_score,
      })
      updated = { ...d }
    })
    return updated ? ok(updated) : fail('Driver not found.')
  },
  /** Safety Officer action — suspend a driver. */
  async suspend(id) {
    await delay()
    let updated
    db.commit((s) => {
      const d = s.drivers.find((x) => x.driver_id === id)
      if (!d) return
      d.status = 'Suspended'
      updated = { ...d }
    })
    return updated ? ok(updated) : fail('Driver not found.')
  },
  async reinstate(id) {
    await delay()
    let updated
    db.commit((s) => {
      const d = s.drivers.find((x) => x.driver_id === id)
      if (!d) return
      d.status = 'Available'
      updated = { ...d }
    })
    return updated ? ok(updated) : fail('Driver not found.')
  },
}

// ── Trips ───────────────────────────────────────────────────────────────────
export const mockTrips = {
  async list(filters = {}) {
    await delay()
    let rows = [...db.get().trips]
    if (filters.status) rows = rows.filter((t) => t.status === filters.status)
    if (filters.vehicle_reg) rows = rows.filter((t) => t.vehicle_reg === filters.vehicle_reg)
    if (filters.driver_id) rows = rows.filter((t) => t.driver_id === filters.driver_id)
    if (filters.search) {
      const q = filters.search.toLowerCase()
      rows = rows.filter(
        (t) =>
          t.trip_id.toLowerCase().includes(q) ||
          t.source.toLowerCase().includes(q) ||
          t.destination.toLowerCase().includes(q),
      )
    }
    return ok(rows)
  },
  async get(id) {
    await delay(60)
    const t = db.get().trips.find((x) => x.trip_id === id)
    if (!t) return fail('Trip not found.')
    return ok(t)
  },
  async create(payload) {
    await delay()
    const id = `TRIP-${String(db.nextSeq('trip')).padStart(3, '0')}`
    const trip = {
      trip_id: id,
      source: payload.source,
      destination: payload.destination,
      vehicle_reg: payload.vehicle_reg,
      driver_id: payload.driver_id,
      cargo_weight_kg: Number(payload.cargo_weight_kg) || 0,
      planned_distance_km: Number(payload.planned_distance_km) || 0,
      actual_distance_km: null,
      fuel_consumed_liters: null,
      revenue: Number(payload.revenue) || 0,
      status: 'Draft',
      created_date: new Date().toISOString().slice(0, 10),
      dispatched_date: null,
      completed_date: null,
    }
    db.commit((s) => s.trips.unshift(trip))
    return ok(trip)
  },
  /** Evaluate dispatch eligibility WITHOUT mutating — powers the live checklist. */
  async validateDispatch(tripId) {
    await delay(60)
    const trip = db.get().trips.find((t) => t.trip_id === tripId)
    if (!trip) return fail('Trip not found.')
    const result = validateDispatch(trip, db.get())
    return ok(result)
  },
  async dispatch(tripId) {
    await delay(180)
    try {
      const res = dispatchTrip(tripId)
      return ok({ ...res, trip: db.get().trips.find((t) => t.trip_id === tripId) })
    } catch (e) {
      if (e instanceof RuleError) return fail(e.message, { violations: e.violations })
      return fail('An unexpected error occurred during dispatch.')
    }
  },
  async complete(tripId, payload) {
    await delay(180)
    try {
      const res = completeTrip(tripId, payload)
      return ok({ ...res, trip: db.get().trips.find((t) => t.trip_id === tripId) })
    } catch (e) {
      if (e instanceof RuleError) return fail(e.message)
      return fail('An unexpected error occurred.')
    }
  },
  async cancel(tripId) {
    await delay(150)
    try {
      const res = cancelTrip(tripId)
      return ok({ ...res, trip: db.get().trips.find((t) => t.trip_id === tripId) })
    } catch (e) {
      if (e instanceof RuleError) return fail(e.message)
      return fail('An unexpected error occurred.')
    }
  },
}

// ── Maintenance ─────────────────────────────────────────────────────────────
export const mockMaintenance = {
  async list(filters = {}) {
    await delay()
    let rows = [...db.get().maintenance]
    if (filters.status) rows = rows.filter((m) => m.status === filters.status)
    if (filters.vehicle_reg) rows = rows.filter((m) => m.vehicle_reg === filters.vehicle_reg)
    return ok(rows)
  },
  async create(payload) {
    await delay(160)
    try {
      const res = createMaintenance(payload)
      return ok({ ...res, record: db.get().maintenance.find((m) => m.maintenance_id === res.id) })
    } catch (e) {
      if (e instanceof RuleError) return fail(e.message)
      return fail('An unexpected error occurred.')
    }
  },
  async close(id) {
    await delay(160)
    try {
      const res = closeMaintenance(id)
      return ok({ ...res, record: db.get().maintenance.find((m) => m.maintenance_id === id) })
    } catch (e) {
      if (e instanceof RuleError) return fail(e.message)
      return fail('An unexpected error occurred.')
    }
  },
}

// ── Fuel Logs ───────────────────────────────────────────────────────────────
export const mockFuelLogs = {
  async list(filters = {}) {
    await delay()
    let rows = [...db.get().fuelLogs]
    if (filters.vehicle_reg) rows = rows.filter((f) => f.vehicle_reg === filters.vehicle_reg)
    return ok(rows)
  },
  async create(payload) {
    await delay()
    const id = `FUEL-${String(db.nextSeq('fuel')).padStart(3, '0')}`
    const log = {
      fuel_log_id: id,
      vehicle_reg: payload.vehicle_reg,
      trip_id: payload.trip_id || null,
      liters: Number(payload.liters) || 0,
      cost: Number(payload.cost) || 0,
      date: payload.date || new Date().toISOString().slice(0, 10),
    }
    db.commit((s) => s.fuelLogs.unshift(log))
    return ok(log)
  },
}

// ── Expenses ────────────────────────────────────────────────────────────────
export const mockExpenses = {
  async list(filters = {}) {
    await delay()
    let rows = [...db.get().expenses]
    if (filters.vehicle_reg) rows = rows.filter((e) => e.vehicle_reg === filters.vehicle_reg)
    if (filters.expense_type) rows = rows.filter((e) => e.expense_type === filters.expense_type)
    return ok(rows)
  },
  async create(payload) {
    await delay()
    const id = `EXP-${String(db.nextSeq('exp')).padStart(3, '0')}`
    const exp = {
      expense_id: id,
      vehicle_reg: payload.vehicle_reg,
      expense_type: payload.expense_type,
      amount: Number(payload.amount) || 0,
      date: payload.date || new Date().toISOString().slice(0, 10),
    }
    db.commit((s) => s.expenses.unshift(exp))
    return ok(exp)
  },
}

// ── Dashboard KPIs (live-computed) ──────────────────────────────────────────
export const mockDashboard = {
  async kpis() {
    await delay(80)
    const { vehicles, drivers, trips } = db.get()
    const activeVehicles = vehicles.filter((v) => v.status === 'On Trip').length
    const availableVehicles = vehicles.filter((v) => v.status === 'Available').length
    const inMaintenance = vehicles.filter((v) => v.status === 'In Shop').length
    const activeTrips = trips.filter((t) => t.status === 'Dispatched').length
    const pendingTrips = trips.filter((t) => t.status === 'Draft').length
    const driversOnDuty = drivers.filter((d) => d.status === 'On Trip').length
    const utilization = vehicles.length ? Math.round((activeVehicles / vehicles.length) * 100) : 0
    return ok({
      activeVehicles,
      availableVehicles,
      inMaintenance,
      activeTrips,
      pendingTrips,
      driversOnDuty,
      utilization,
      totalVehicles: vehicles.length,
      totalDrivers: drivers.length,
      totalTrips: trips.length,
    })
  },
  async charts() {
    await delay(80)
    const { vehicles, trips, drivers } = db.get()
    const vehicleStatus = ['Available', 'On Trip', 'In Shop', 'Retired'].map((s) => ({
      name: s,
      value: vehicles.filter((v) => v.status === s).length,
    }))
    const tripStatus = ['Draft', 'Dispatched', 'Completed', 'Cancelled'].map((s) => ({
      name: s,
      value: trips.filter((t) => t.status === s).length,
    }))
    const driverStatus = ['Available', 'On Trip', 'Off Duty', 'Suspended'].map((s) => ({
      name: s,
      value: drivers.filter((d) => d.status === s).length,
    }))
    return ok({ vehicleStatus, tripStatus, driverStatus })
  },
}

// ── Reports & Analytics ─────────────────────────────────────────────────────
export const mockReports = {
  async vehicleCosts() {
    await delay(120)
    const { vehicles, fuelLogs, maintenance, expenses } = db.get()
    const rows = vehicles.map((v) => {
      const fuel = fuelLogs.filter((f) => f.vehicle_reg === v.registration_number).reduce((s, f) => s + Number(f.cost || 0), 0)
      const maint = maintenance.filter((m) => m.vehicle_reg === v.registration_number).reduce((s, m) => s + Number(m.cost || 0), 0)
      const exp = expenses.filter((e) => e.vehicle_reg === v.registration_number).reduce((s, e) => s + Number(e.amount || 0), 0)
      const total = fuel + maint + exp
      return {
        registration_number: v.registration_number,
        vehicle_name_model: v.vehicle_name_model,
        fuel,
        maintenance: maint,
        expenses: exp,
        total,
      }
    })
    return ok(rows)
  },
  async roi() {
    await delay(120)
    const { vehicles, trips, fuelLogs, maintenance } = db.get()
    const rows = vehicles.map((v) => {
      const revenue = trips
        .filter((t) => t.vehicle_reg === v.registration_number)
        .reduce((s, t) => s + Number(t.revenue || 0), 0)
      const fuel = fuelLogs.filter((f) => f.vehicle_reg === v.registration_number).reduce((s, f) => s + Number(f.cost || 0), 0)
      const maint = maintenance.filter((m) => m.vehicle_reg === v.registration_number).reduce((s, m) => s + Number(m.cost || 0), 0)
      const cost = fuel + maint
      const acq = Number(v.acquisition_cost || 0)
      const roi = acq > 0 ? ((revenue - cost) / acq) * 100 : 0
      return {
        registration_number: v.registration_number,
        vehicle_name_model: v.vehicle_name_model,
        acquisition_cost: acq,
        revenue,
        operational_cost: cost,
        roi: Number(roi.toFixed(1)),
        status: v.status,
      }
    })
    return ok(rows)
  },
  async fuelEfficiency() {
    await delay(120)
    const { vehicles, trips, fuelLogs } = db.get()
    const rows = vehicles.map((v) => {
      const vTrips = trips.filter((t) => t.vehicle_reg === v.registration_number && t.status === 'Completed')
      const distance = vTrips.reduce((s, t) => s + Number(t.actual_distance_km || 0), 0)
      const fuel = vTrips.reduce((s, t) => s + Number(t.fuel_consumed_liters || 0), 0)
      const tripFuel = fuel
      const allFuel = fuelLogs.filter((f) => f.vehicle_reg === v.registration_number).reduce((s, f) => s + Number(f.liters || 0), 0)
      return {
        registration_number: v.registration_number,
        vehicle_name_model: v.vehicle_name_model,
        completedTrips: vTrips.length,
        totalDistance: distance,
        tripFuel,
        allFuel,
        efficiency: fuel > 0 ? Number((distance / fuel).toFixed(2)) : 0,
      }
    })
    return ok(rows)
  },
}

export { db as mockDb }
