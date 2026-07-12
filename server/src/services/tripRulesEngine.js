const Trip = require('../models/Trip')
const Vehicle = require('../models/Vehicle')
const Driver = require('../models/Driver')
const MaintenanceLog = require('../models/MaintenanceLog')
const ApiError = require('../utils/ApiError')
const { query } = require('../config/db')

const today = () => new Date().toISOString().slice(0, 10)

/**
 * The Trip Dispatch Validation Engine — the heart of TransitOps.
 *
 * Runs all 12 eligibility checks IN ORDER and fails fast with an explicit
 * ApiError message. The seed data contains a trap case where a driver may
 * show status='Available' while the license is already expired — the expiry
 * date is treated as the authority (rule 11), not the status.
 *
 * Returns the fetched { trip, vehicle, driver } so the caller can perform the
 * transactional dispatch without re-fetching.
 */
async function validateDispatch(tripId) {
  // 1. Trip exists.
  const trip = await Trip.findById(tripId)
  if (!trip) {
    throw ApiError.notFound(`Trip ${tripId} not found.`)
  }

  // 2. Trip status is Draft.
  if (trip.status !== 'Draft') {
    throw ApiError.badRequest(
      `Trip is not in Draft status and cannot be dispatched (current: ${trip.status}).`,
    )
  }

  // 3. Vehicle exists.
  const vehicle = trip.vehicle_reg ? await Vehicle.findByReg(trip.vehicle_reg) : null
  if (!vehicle) {
    throw ApiError.badRequest(`Vehicle ${trip.vehicle_reg || '—'} not found in registry.`)
  }

  // 4. Driver exists.
  const driver = trip.driver_id ? await Driver.findById(trip.driver_id) : null
  if (!driver) {
    throw ApiError.badRequest(`Driver ${trip.driver_id || '—'} not found in registry.`)
  }

  // 5. Vehicle status is Available.
  if (vehicle.status !== 'Available') {
    throw ApiError.badRequest(`Vehicle is not available (current status: ${vehicle.status}).`)
  }

  // 6. Vehicle is not already linked to another Dispatched trip.
  const [otherVehicleTrips] = await query(
    `SELECT trip_id FROM trips WHERE vehicle_reg = ? AND status = 'Dispatched' AND trip_id <> ? LIMIT 1`,
    [vehicle.registration_number, trip.trip_id],
  )
  if (otherVehicleTrips.length) {
    throw ApiError.badRequest(
      `Vehicle is already assigned to dispatched trip ${otherVehicleTrips[0].trip_id}.`,
    )
  }

  // 7. Vehicle has no Active maintenance record.
  const hasMaint = await MaintenanceLog.hasActiveForVehicle(vehicle.registration_number)
  if (hasMaint) {
    throw ApiError.badRequest('Vehicle is currently under maintenance.')
  }

  // 8. Driver status is Available.
  if (driver.status !== 'Available') {
    throw ApiError.badRequest(`Driver is not available (current status: ${driver.status}).`)
  }

  // 9. Driver status is not Suspended (explicit, mirrors the plan's rule set).
  if (driver.status === 'Suspended') {
    throw ApiError.badRequest('Driver is Suspended and cannot be dispatched.')
  }

  // 10. Driver is not already linked to another Dispatched trip.
  const [otherDriverTrips] = await query(
    `SELECT trip_id FROM trips WHERE driver_id = ? AND status = 'Dispatched' AND trip_id <> ? LIMIT 1`,
    [driver.driver_id, trip.trip_id],
  )
  if (otherDriverTrips.length) {
    throw ApiError.badRequest(
      `Driver is already assigned to dispatched trip ${otherDriverTrips[0].trip_id}.`,
    )
  }

  // 11. Driver license_expiry_date >= today.
  const [expRows] = await query(
    `SELECT license_expiry_date < CURDATE() AS expired FROM drivers WHERE driver_id = ?`,
    [driver.driver_id],
  )
  if (expRows[0]?.expired) {
    throw ApiError.badRequest(`Driver's license has expired (expired on ${driver.license_expiry_date}).`)
  }

  // 12. Cargo weight within vehicle capacity.
  const cargo = Number(trip.cargo_weight_kg) || 0
  const maxLoad = Number(vehicle.max_load_capacity_kg) || 0
  if (cargo > maxLoad) {
    throw ApiError.badRequest(
      `Cargo weight (${cargo}) exceeds vehicle maximum capacity (${maxLoad}).`,
    )
  }

  return { trip, vehicle, driver }
}

/**
 * Execute the dispatch as a single DB transaction:
 * trip -> Dispatched, vehicle -> On Trip, driver -> On Trip, dispatched_date = today.
 */
async function dispatch(tripId) {
  const { trip } = await validateDispatch(tripId)

  const { withTransaction } = require('../config/db')
  await withTransaction(async (conn, q) => {
    await q(`UPDATE trips SET status = 'Dispatched', dispatched_date = ? WHERE trip_id = ?`, [
      today(),
      trip.trip_id,
    ])
    await q(`UPDATE vehicles SET status = 'On Trip' WHERE registration_number = ?`, [
      trip.vehicle_reg,
    ])
    await q(`UPDATE drivers SET status = 'On Trip' WHERE driver_id = ?`, [trip.driver_id])
  })
  // Fetch the committed trip after the transaction completes so the read is
  // not served from a separate pool connection with a stale snapshot.
  return Trip.findById(trip.trip_id)
}

/**
 * Execute trip completion transactionally:
 * trip -> Completed, set completed_date, actual_distance_km, fuel_consumed_liters,
 * optional revenue; vehicle -> Available; driver -> Available;
 * increment vehicle odometer_km by actual_distance_km.
 */
async function complete(tripId, { actual_distance_km, fuel_consumed_liters, revenue } = {}) {
  const trip = await Trip.findById(tripId)
  if (!trip) throw ApiError.notFound(`Trip ${tripId} not found.`)
  if (trip.status !== 'Dispatched') {
    throw ApiError.badRequest(`Only Dispatched trips can be completed (current: ${trip.status}).`)
  }

  const { withTransaction } = require('../config/db')
  await withTransaction(async (conn, q) => {
    const fields = [
      `status = 'Completed'`,
      `completed_date = ?`,
      `actual_distance_km = ?`,
      `fuel_consumed_liters = ?`,
    ]
    const params = [today(), actual_distance_km, fuel_consumed_liters]

    if (revenue !== undefined && revenue !== null) {
      fields.push(`revenue = ?`)
      params.push(revenue)
    }

    params.push(trip.trip_id)
    await q(`UPDATE trips SET ${fields.join(', ')} WHERE trip_id = ?`, params)

    if (trip.vehicle_reg) {
      await q(
        `UPDATE vehicles SET status = 'Available', odometer_km = odometer_km + ? WHERE registration_number = ?`,
        [actual_distance_km, trip.vehicle_reg],
      )
    }
    if (trip.driver_id) {
      await q(`UPDATE drivers SET status = 'Available' WHERE driver_id = ?`, [trip.driver_id])
    }
  })
  return Trip.findById(trip.trip_id)
}

/**
 * Execute trip cancellation transactionally.
 * - From Draft: only the trip becomes Cancelled.
 * - From Dispatched: trip -> Cancelled, vehicle -> Available, driver -> Available.
 */
async function cancel(tripId) {
  const trip = await Trip.findById(tripId)
  if (!trip) throw ApiError.notFound(`Trip ${tripId} not found.`)
  if (trip.status === 'Completed') {
    throw ApiError.badRequest('Completed trips cannot be cancelled.')
  }
  if (trip.status === 'Cancelled') {
    throw ApiError.badRequest('Trip is already cancelled.')
  }

  const wasDispatched = trip.status === 'Dispatched'

const { withTransaction } = require('../config/db')
  await withTransaction(async (conn, q) => {
    await q(`UPDATE trips SET status = 'Cancelled' WHERE trip_id = ?`, [trip.trip_id])

    if (wasDispatched) {
      if (trip.vehicle_reg) {
        await q(`UPDATE vehicles SET status = 'Available' WHERE registration_number = ?`, [
          trip.vehicle_reg,
        ])
      }
      if (trip.driver_id) {
        await q(`UPDATE drivers SET status = 'Available' WHERE driver_id = ?`, [trip.driver_id])
      }
    }
  })
  return Trip.findById(trip.trip_id)
}

module.exports = { validateDispatch, dispatch, complete, cancel }