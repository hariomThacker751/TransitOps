const { query } = require('../config/db')

/**
 * Analytics & reports — every metric is query-driven from MySQL, never hardcoded.
 *
 * - Operational cost = fuel cost + maintenance cost per vehicle.
 * - ROI = (revenue - (maintenance + fuel)) / acquisition_cost,
 *   using trips.revenue from COMPLETED trips only.
 * - Fuel efficiency = total distance / total fuel for completed trips,
 *   preferring actual_distance_km over planned_distance_km.
 */

async function kpis() {
  const [
    [activeVehicles],
    [availableVehicles],
    [inMaintenance],
    [activeTrips],
    [pendingTrips],
    [driversOnDuty],
    [totalVehicles],
    [totalDrivers],
    [totalTrips],
  ] = await Promise.all([
    query(`SELECT COUNT(*) AS n FROM vehicles WHERE status = 'On Trip'`),
    query(`SELECT COUNT(*) AS n FROM vehicles WHERE status = 'Available'`),
    query(`SELECT COUNT(*) AS n FROM vehicles WHERE status = 'In Shop'`),
    query(`SELECT COUNT(*) AS n FROM trips WHERE status = 'Dispatched'`),
    query(`SELECT COUNT(*) AS n FROM trips WHERE status = 'Draft'`),
    query(`SELECT COUNT(*) AS n FROM drivers WHERE status = 'On Trip'`),
    query(`SELECT COUNT(*) AS n FROM vehicles`),
    query(`SELECT COUNT(*) AS n FROM drivers`),
    query(`SELECT COUNT(*) AS n FROM trips`),
  ])

  const total = totalVehicles[0].n
  const onTrip = activeVehicles[0].n
  const utilization = total > 0 ? Math.round((onTrip / total) * 10000) / 100 : 0

  return {
    active_vehicles: onTrip,
    available_vehicles: availableVehicles[0].n,
    vehicles_in_maintenance: inMaintenance[0].n,
    active_trips: activeTrips[0].n,
    pending_trips: pendingTrips[0].n,
    drivers_on_duty: driversOnDuty[0].n,
    fleet_utilization_pct: utilization,
    total_vehicles: total,
    total_drivers: totalDrivers[0].n,
    total_trips: totalTrips[0].n,
  }
}

/** Distinct vehicle types and regions — powers dashboard filter dropdowns. */
async function filters() {
  const [types] = await query(
    `SELECT DISTINCT type AS name FROM vehicles WHERE type IS NOT NULL ORDER BY type ASC`,
  )
  const [regions] = await query(
    `SELECT DISTINCT region AS name FROM vehicles WHERE region IS NOT NULL ORDER BY region ASC`,
  )
  return {
    vehicle_types: types.map((r) => r.name),
    vehicle_regions: regions.map((r) => r.name),
  }
}

/** Status breakdown series for dashboard charts. */
async function charts() {
  const [vehicleStatus] = await query(`
    SELECT status AS name, COUNT(*) AS value FROM vehicles GROUP BY status
  `)
  const [tripStatus] = await query(`
    SELECT status AS name, COUNT(*) AS value FROM trips GROUP BY status
  `)
  const [driverStatus] = await query(`
    SELECT status AS name, COUNT(*) AS value FROM drivers GROUP BY status
  `)
  return { vehicleStatus, tripStatus, driverStatus }
}

/** Per-vehicle operational cost (fuel + maintenance + expenses). */
async function vehicleCosts() {
  const [rows] = await query(`
    SELECT
      v.registration_number,
      v.vehicle_name_model,
      COALESCE(fc.total_fuel_cost, 0)        AS total_fuel_cost,
      COALESCE(mc.total_maintenance_cost, 0) AS total_maintenance_cost,
      COALESCE(ec.total_expense_cost, 0)     AS total_expense_cost,
      (COALESCE(fc.total_fuel_cost, 0) + COALESCE(mc.total_maintenance_cost, 0)) AS total_operational_cost
    FROM vehicles v
    LEFT JOIN (
      SELECT vehicle_reg, SUM(cost) AS total_fuel_cost FROM fuel_logs GROUP BY vehicle_reg
    ) fc ON fc.vehicle_reg = v.registration_number
    LEFT JOIN (
      SELECT vehicle_reg, SUM(cost) AS total_maintenance_cost FROM maintenance_logs GROUP BY vehicle_reg
    ) mc ON mc.vehicle_reg = v.registration_number
    LEFT JOIN (
      SELECT vehicle_reg, SUM(amount) AS total_expense_cost FROM expenses GROUP BY vehicle_reg
    ) ec ON ec.vehicle_reg = v.registration_number
    ORDER BY v.registration_number ASC
  `)
  return rows.map((r) => ({
    registration_number: r.registration_number,
    vehicle_name_model: r.vehicle_name_model,
    total_fuel_cost: Number(r.total_fuel_cost),
    total_maintenance_cost: Number(r.total_maintenance_cost),
    total_expense_cost: Number(r.total_expense_cost),
    total_operational_cost: Number(r.total_operational_cost),
  }))
}

/** Per-vehicle ROI using completed-trips revenue. */
async function roi() {
  const [rows] = await query(`
    SELECT
      v.registration_number,
      v.vehicle_name_model,
      v.acquisition_cost,
      COALESCE(rev.total_revenue, 0)        AS total_revenue,
      COALESCE(mc.total_maintenance_cost, 0) AS total_maintenance_cost,
      COALESCE(fc.total_fuel_cost, 0)        AS total_fuel_cost
    FROM vehicles v
    LEFT JOIN (
      SELECT vehicle_reg, SUM(revenue) AS total_revenue
      FROM trips WHERE status = 'Completed' GROUP BY vehicle_reg
    ) rev ON rev.vehicle_reg = v.registration_number
    LEFT JOIN (
      SELECT vehicle_reg, SUM(cost) AS total_maintenance_cost FROM maintenance_logs GROUP BY vehicle_reg
    ) mc ON mc.vehicle_reg = v.registration_number
    LEFT JOIN (
      SELECT vehicle_reg, SUM(cost) AS total_fuel_cost FROM fuel_logs GROUP BY vehicle_reg
    ) fc ON fc.vehicle_reg = v.registration_number
    ORDER BY v.registration_number ASC
  `)

  return rows.map((r) => {
    const acq = Number(r.acquisition_cost) || 0
    const cost = Number(r.total_maintenance_cost) + Number(r.total_fuel_cost)
    const roiVal = acq > 0 ? Math.round(((Number(r.total_revenue) - cost) / acq) * 10000) / 100 : null
    return {
      registration_number: r.registration_number,
      vehicle_name_model: r.vehicle_name_model,
      total_revenue: Number(r.total_revenue),
      total_maintenance_cost: Number(r.total_maintenance_cost),
      total_fuel_cost: Number(r.total_fuel_cost),
      acquisition_cost: acq,
      roi: roiVal,
    }
  })
}

/** Per-vehicle fuel efficiency for completed trips. */
async function fuelEfficiency() {
  const [rows] = await query(`
    SELECT
      v.registration_number,
      v.vehicle_name_model,
      COUNT(t.trip_id) AS completed_trips,
      COALESCE(SUM(COALESCE(NULLIF(t.actual_distance_km, 0), t.planned_distance_km)), 0) AS total_distance,
      COALESCE(SUM(t.fuel_consumed_liters), 0) AS total_fuel_liters
    FROM vehicles v
    LEFT JOIN trips t ON t.vehicle_reg = v.registration_number AND t.status = 'Completed'
    GROUP BY v.registration_number, v.vehicle_name_model
    ORDER BY v.registration_number ASC
  `)

  return rows.map((r) => {
    const fuel = Number(r.total_fuel_liters) || 0
    const dist = Number(r.total_distance) || 0
    const efficiency = fuel > 0 ? Math.round((dist / fuel) * 100) / 100 : null
    return {
      registration_number: r.registration_number,
      vehicle_name_model: r.vehicle_name_model,
      completed_trips: r.completed_trips,
      total_distance: dist,
      total_fuel_liters: fuel,
      efficiency_km_per_liter: efficiency,
    }
  })
}

module.exports = { kpis, filters, charts, vehicleCosts, roi, fuelEfficiency }