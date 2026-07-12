import { isExpired } from '@/utils/format'

/**
 * The Dispatch Validation Engine — the heart of TransitOps.
 *
 * Implements all 13 eligibility rules from the implementation plan.
 * Returns a structured result so the UI can render a live pass/fail checklist
 * (the DispatchActionPanel) and show clear rejection reasons.
 *
 * Rules (each must pass for dispatch to be allowed):
 *  1. trip status is Draft
 *  2. vehicle exists
 *  3. driver exists
 *  4. vehicle status is exactly Available
 *  5. vehicle status is not In Shop
 *  6. vehicle status is not Retired
 *  7. driver status is exactly Available
 *  8. driver status is not Suspended
 *  9. driver license expiry date is today or later
 * 10. cargo weight <= vehicle max load capacity
 * 11. vehicle has no active maintenance record
 * 12. vehicle not already linked to another current dispatched trip
 * 13. driver not already linked to another current dispatched trip
 */

/**
 * Evaluate dispatch eligibility for a trip against the current DB state.
 * @returns { ok: boolean, checks: [{rule,label,passed,detail}], violations: [{rule,message}] }
 */
export function validateDispatch(trip, db) {
  const checks = []
  const violations = []

  const add = (rule, label, passed, failMessage, detail) => {
    checks.push({ rule, label, passed, detail })
    if (!passed) violations.push({ rule, message: failMessage })
  }

  // 1. Trip must be in Draft status.
  add(
    'trip_draft',
    'Trip is in Draft status',
    trip?.status === 'Draft',
    'Only trips in Draft status can be dispatched.',
    `Current status: ${trip?.status ?? 'unknown'}`,
  )

  const vehicle = trip?.vehicle_reg ? db.vehicles.find((v) => v.registration_number === trip.vehicle_reg) : null
  const driver = trip?.driver_id ? db.drivers.find((d) => d.driver_id === trip.driver_id) : null

  // 2. Vehicle exists.
  add('vehicle_exists', 'Vehicle exists', !!vehicle, `Vehicle ${trip?.vehicle_reg || '—'} not found in registry.`)

  // 3. Driver exists.
  add('driver_exists', 'Driver exists', !!driver, `Driver ${trip?.driver_id || '—'} not found in registry.`)

  // 4–6. Vehicle status checks.
  if (vehicle) {
    add(
      'vehicle_available',
      'Vehicle is Available',
      vehicle.status === 'Available',
      `Vehicle is currently "${vehicle.status}" — must be Available to dispatch.`,
      `Status: ${vehicle.status}`,
    )
    add(
      'vehicle_not_inshop',
      'Vehicle is not In Shop',
      vehicle.status !== 'In Shop',
      'Vehicle is In Shop for maintenance and cannot be dispatched.',
    )
    add(
      'vehicle_not_retired',
      'Vehicle is not Retired',
      vehicle.status !== 'Retired',
      'Vehicle is Retired and permanently removed from the dispatch pool.',
    )

    // 11. No active maintenance.
    const activeMaint = db.maintenance.find(
      (m) => m.vehicle_reg === vehicle.registration_number && m.status === 'Active',
    )
    add(
      'vehicle_no_active_maintenance',
      'Vehicle has no active maintenance',
      !activeMaint,
      `Vehicle has an active maintenance record (${activeMaint?.maintenance_id}) and is In Shop.`,
    )
  } else {
    checks.push(
      { rule: 'vehicle_available', label: 'Vehicle is Available', passed: false, detail: 'No vehicle selected' },
      { rule: 'vehicle_not_inshop', label: 'Vehicle is not In Shop', passed: false },
      { rule: 'vehicle_not_retired', label: 'Vehicle is not Retired', passed: false },
      { rule: 'vehicle_no_active_maintenance', label: 'Vehicle has no active maintenance', passed: false },
    )
    violations.push({ rule: 'vehicle_exists', message: 'Cannot evaluate vehicle rules — vehicle not found.' })
  }

  // 7–9. Driver status + license checks.
  if (driver) {
    add(
      'driver_available',
      'Driver is Available',
      driver.status === 'Available',
      `Driver is currently "${driver.status}" — must be Available to dispatch.`,
      `Status: ${driver.status}`,
    )
    add(
      'driver_not_suspended',
      'Driver is not Suspended',
      driver.status !== 'Suspended',
      'Driver is Suspended and cannot be dispatched.',
    )
    add(
      'driver_license_valid',
      'Driver license is not expired',
      !isExpired(driver.license_expiry_date),
      `Driver license expired on ${driver.license_expiry_date}. Dispatch not allowed.`,
      `Expires: ${driver.license_expiry_date}`,
    )
  } else {
    checks.push(
      { rule: 'driver_available', label: 'Driver is Available', passed: false, detail: 'No driver selected' },
      { rule: 'driver_not_suspended', label: 'Driver is not Suspended', passed: false },
      { rule: 'driver_license_valid', label: 'Driver license is not expired', passed: false },
    )
    violations.push({ rule: 'driver_exists', message: 'Cannot evaluate driver rules — driver not found.' })
  }

  // 10. Cargo overload.
  if (vehicle) {
    const cargo = Number(trip?.cargo_weight_kg) || 0
    const maxLoad = Number(vehicle.max_load_capacity_kg) || 0
    add(
      'cargo_within_limit',
      'Cargo weight within vehicle capacity',
      cargo <= maxLoad,
      `Cargo (${cargo} kg) exceeds vehicle max load capacity (${maxLoad} kg).`,
      `${cargo} kg / ${maxLoad} kg`,
    )
  } else {
    checks.push({ rule: 'cargo_within_limit', label: 'Cargo weight within vehicle capacity', passed: false })
  }

  // 12. Vehicle not on another dispatched trip.
  if (vehicle) {
    const otherTrip = db.trips.find(
      (t) =>
        t.trip_id !== trip?.trip_id &&
        t.vehicle_reg === vehicle.registration_number &&
        t.status === 'Dispatched',
    )
    add(
      'vehicle_not_double_assigned',
      'Vehicle not assigned to another active trip',
      !otherTrip,
      `Vehicle is already on dispatched trip ${otherTrip?.trip_id}.`,
    )
  } else {
    checks.push({ rule: 'vehicle_not_double_assigned', label: 'Vehicle not assigned to another active trip', passed: false })
  }

  // 13. Driver not on another dispatched trip.
  if (driver) {
    const otherTrip = db.trips.find(
      (t) =>
        t.trip_id !== trip?.trip_id &&
        t.driver_id === driver.driver_id &&
        t.status === 'Dispatched',
    )
    add(
      'driver_not_double_assigned',
      'Driver not assigned to another active trip',
      !otherTrip,
      `Driver is already on dispatched trip ${otherTrip?.trip_id}.`,
    )
  } else {
    checks.push({ rule: 'driver_not_double_assigned', label: 'Driver not assigned to another active trip', passed: false })
  }

  return { ok: violations.length === 0, checks, violations }
}
