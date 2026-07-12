import { isExpired } from './format'

/**
 * Pure dispatch validation logic — shared between mock mode and real mode.
 *
 * This mirrors the backend's tripRulesEngine.js exactly. It does NOT enforce
 * anything — the backend is always the authority. It only powers the UI
 * checklist so the user can see eligibility before clicking Dispatch.
 *
 * @param {Object} trip  — the trip being evaluated
 * @param {Object} ctx   — { vehicles[], drivers[], trips[], maintenance[] }
 * @returns { ok, checks:[{rule,label,passed,detail}], violations:[{rule,message}] }
 */
export function validateDispatch(trip, ctx) {
  const checks = []
  const violations = []

  const add = (rule, label, passed, failMessage, detail) => {
    checks.push({ rule, label, passed, detail })
    if (!passed) violations.push({ rule, message: failMessage })
  }

  // 1. Trip must be in Draft status.
  add('trip_draft', 'Trip is in Draft status', trip?.status === 'Draft',
    'Only trips in Draft status can be dispatched.', `Current status: ${trip?.status ?? 'unknown'}`)

  const vehicle = trip?.vehicle_reg ? ctx.vehicles.find((v) => v.registration_number === trip.vehicle_reg) : null
  const driver = trip?.driver_id ? ctx.drivers.find((d) => d.driver_id === trip.driver_id) : null

  // 2–3. Existence.
  add('vehicle_exists', 'Vehicle exists', !!vehicle, `Vehicle ${trip?.vehicle_reg || '—'} not found in registry.`)
  add('driver_exists', 'Driver exists', !!driver, `Driver ${trip?.driver_id || '—'} not found in registry.`)

  // 4–6. Vehicle status checks.
  if (vehicle) {
    add('vehicle_available', 'Vehicle is Available', vehicle.status === 'Available',
      `Vehicle is currently "${vehicle.status}" — must be Available to dispatch.`, `Status: ${vehicle.status}`)
    add('vehicle_not_inshop', 'Vehicle is not In Shop', vehicle.status !== 'In Shop',
      'Vehicle is In Shop for maintenance and cannot be dispatched.')
    add('vehicle_not_retired', 'Vehicle is not Retired', vehicle.status !== 'Retired',
      'Vehicle is Retired and permanently removed from the dispatch pool.')

    // 11. No active maintenance.
    const activeMaint = ctx.maintenance.find(
      (m) => m.vehicle_reg === vehicle.registration_number && m.status === 'Active',
    )
    add('vehicle_no_active_maintenance', 'Vehicle has no active maintenance', !activeMaint,
      `Vehicle has an active maintenance record (${activeMaint?.maintenance_id}) and is In Shop.`)
  } else {
    ;['vehicle_available', 'vehicle_not_inshop', 'vehicle_not_retired', 'vehicle_no_active_maintenance'].forEach((rule) => {
      checks.push({ rule, label: rule.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()), passed: false })
    })
  }

  // 7–9. Driver status + license checks.
  if (driver) {
    add('driver_available', 'Driver is Available', driver.status === 'Available',
      `Driver is currently "${driver.status}" — must be Available to dispatch.`, `Status: ${driver.status}`)
    add('driver_not_suspended', 'Driver is not Suspended', driver.status !== 'Suspended',
      'Driver is Suspended and cannot be dispatched.')
    add('driver_license_valid', 'Driver license is not expired', !isExpired(driver.license_expiry_date),
      `Driver license expired on ${driver.license_expiry_date}. Dispatch not allowed.`, `Expires: ${driver.license_expiry_date}`)
  } else {
    ;['driver_available', 'driver_not_suspended', 'driver_license_valid'].forEach((rule) => {
      checks.push({ rule, label: rule.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()), passed: false })
    })
  }

  // 10. Cargo overload.
  if (vehicle) {
    const cargo = Number(trip?.cargo_weight_kg) || 0
    const maxLoad = Number(vehicle.max_load_capacity_kg) || 0
    add('cargo_within_limit', 'Cargo weight within vehicle capacity', cargo <= maxLoad,
      `Cargo (${cargo} kg) exceeds vehicle max load capacity (${maxLoad} kg).`, `${cargo} kg / ${maxLoad} kg`)
  } else {
    checks.push({ rule: 'cargo_within_limit', label: 'Cargo weight within vehicle capacity', passed: false })
  }

  // 12. Vehicle not on another dispatched trip.
  if (vehicle) {
    const otherTrip = ctx.trips.find(
      (t) => t.trip_id !== trip?.trip_id && t.vehicle_reg === vehicle.registration_number && t.status === 'Dispatched',
    )
    add('vehicle_not_double_assigned', 'Vehicle not assigned to another active trip', !otherTrip,
      `Vehicle is already on dispatched trip ${otherTrip?.trip_id}.`)
  } else {
    checks.push({ rule: 'vehicle_not_double_assigned', label: 'Vehicle not assigned to another active trip', passed: false })
  }

  // 13. Driver not on another dispatched trip.
  if (driver) {
    const otherTrip = ctx.trips.find(
      (t) => t.trip_id !== trip?.trip_id && t.driver_id === driver.driver_id && t.status === 'Dispatched',
    )
    add('driver_not_double_assigned', 'Driver not assigned to another active trip', !otherTrip,
      `Driver is already on dispatched trip ${otherTrip?.trip_id}.`)
  } else {
    checks.push({ rule: 'driver_not_double_assigned', label: 'Driver not assigned to another active trip', passed: false })
  }

  return { ok: violations.length === 0, checks, violations }
}