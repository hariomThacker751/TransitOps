import { db } from './db.js'
import { validateDispatch } from './rules.js'
import { nextId } from './seed.js'

/**
 * State transitions — the transactional operations from the implementation plan.
 *
 * Each function validates, then atomically updates trip + vehicle + driver
 * statuses together (mirroring the backend's DB transactions). On rule
 * violation they throw a structured error the API facade converts to the
 * plan's `{ success:false, message }` shape.
 */

const today = () => new Date().toISOString().slice(0, 10)

export class RuleError extends Error {
  constructor(message, violations) {
    super(message)
    this.name = 'RuleError'
    this.violations = violations || []
  }
}

/** Dispatch a Draft trip after running the full rules engine. */
export function dispatchTrip(tripId) {
  const state = db.get()
  const trip = state.trips.find((t) => t.trip_id === tripId)
  if (!trip) throw new RuleError(`Trip ${tripId} not found.`)

  const result = validateDispatch(trip, state)
  if (!result.ok) {
    const primary = result.violations[0]?.message || 'Dispatch not allowed.'
    throw new RuleError(primary, result.violations)
  }

  db.commit((s) => {
    const t = s.trips.find((x) => x.trip_id === tripId)
    const v = s.vehicles.find((x) => x.registration_number === t.vehicle_reg)
    const d = s.drivers.find((x) => x.driver_id === t.driver_id)
    t.status = 'Dispatched'
    t.dispatched_date = today()
    if (v) v.status = 'On Trip'
    if (d) d.status = 'On Trip'
  })

  return { success: true, message: `Trip ${tripId} dispatched.` }
}

/** Complete a Dispatched trip — requires actual distance + fuel consumed. */
export function completeTrip(tripId, { actual_distance_km, fuel_consumed_liters, final_odometer } = {}) {
  const state = db.get()
  const trip = state.trips.find((t) => t.trip_id === tripId)
  if (!trip) throw new RuleError(`Trip ${tripId} not found.`)
  if (trip.status !== 'Dispatched') throw new RuleError(`Only Dispatched trips can be completed (current: ${trip.status}).`)

  db.commit((s) => {
    const t = s.trips.find((x) => x.trip_id === tripId)
    const v = s.vehicles.find((x) => x.registration_number === t.vehicle_reg)
    const d = s.drivers.find((x) => x.driver_id === t.driver_id)
    t.status = 'Completed'
    t.completed_date = today()
    t.actual_distance_km = Number(actual_distance_km) || t.actual_distance_km
    t.fuel_consumed_liters = Number(fuel_consumed_liters) || t.fuel_consumed_liters
    if (v) {
      v.status = 'Available'
      if (final_odometer) v.odometer_km = Number(final_odometer)
    }
    if (d) d.status = 'Available'
  })

  return { success: true, message: `Trip ${tripId} completed.` }
}

/** Cancel a trip — restores vehicle/driver if it was Dispatched. */
export function cancelTrip(tripId) {
  const state = db.get()
  const trip = state.trips.find((t) => t.trip_id === tripId)
  if (!trip) throw new RuleError(`Trip ${tripId} not found.`)
  if (trip.status === 'Completed') throw new RuleError('Completed trips cannot be cancelled.')
  if (trip.status === 'Cancelled') throw new RuleError('Trip is already cancelled.')

  const wasDispatched = trip.status === 'Dispatched'

  db.commit((s) => {
    const t = s.trips.find((x) => x.trip_id === tripId)
    const v = s.vehicles.find((x) => x.registration_number === t.vehicle_reg)
    const d = s.drivers.find((x) => x.driver_id === t.driver_id)
    t.status = 'Cancelled'
    // Only restore resources if the trip had been dispatched.
    if (wasDispatched) {
      if (v && v.status === 'On Trip') v.status = 'Available'
      if (d && d.status === 'On Trip') d.status = 'Available'
    }
  })

  return { success: true, message: `Trip ${tripId} cancelled.` }
}

/** Create a maintenance record — immediately locks the vehicle to In Shop. */
export function createMaintenance({ vehicle_reg, maintenance_type, cost, start_date }) {
  const state = db.get()
  const vehicle = state.vehicles.find((v) => v.registration_number === vehicle_reg)
  if (!vehicle) throw new RuleError(`Vehicle ${vehicle_reg} not found.`)
  if (vehicle.status === 'Retired') throw new RuleError('Cannot schedule maintenance for a Retired vehicle.')

  const id = `MNT-${String(db.nextSeq('maint')).padStart(3, '0')}`

  db.commit((s) => {
    s.maintenance.unshift({
      maintenance_id: id,
      vehicle_reg,
      maintenance_type,
      cost: Number(cost) || 0,
      start_date: start_date || today(),
      end_date: null,
      status: 'Active',
    })
    const v = s.vehicles.find((x) => x.registration_number === vehicle_reg)
    if (v) v.status = 'In Shop'
  })

  return { success: true, message: `Maintenance ${id} created. Vehicle moved to In Shop.`, id }
}

/** Close a maintenance record — restores vehicle to Available unless Retired. */
export function closeMaintenance(maintenanceId) {
  const state = db.get()
  const rec = state.maintenance.find((m) => m.maintenance_id === maintenanceId)
  if (!rec) throw new RuleError(`Maintenance ${maintenanceId} not found.`)
  if (rec.status === 'Closed') throw new RuleError('Maintenance record is already closed.')

  db.commit((s) => {
    const m = s.maintenance.find((x) => x.maintenance_id === maintenanceId)
    m.status = 'Closed'
    m.end_date = today()
    const v = s.vehicles.find((x) => x.registration_number === m.vehicle_reg)
    if (v && v.status !== 'Retired') v.status = 'Available'
  })

  return { success: true, message: `Maintenance ${maintenanceId} closed. Vehicle restored to Available.` }
}
