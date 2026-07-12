const { sequelize } = require('../config/db');
const { QueryTypes } = require('sequelize');

/**
 * LLM Context Builder — gathers read-only, role-scoped snapshots of live DB
 * data to feed the LLM as grounded context.
 *
 * Every function here is strictly READ-ONLY: it only runs SELECT queries and
 * returns compact JSON. It never mutates any table. The LLM is given this
 * context so it can summarize/explain real figures instead of hallucinating.
 *
 * Queries mirror the patterns in reportService.js (raw SQL via sequelize.query).
 */

/**
 * Fleet Manager context: fleet composition, utilization, recent trips, and
 * per-vehicle operational cost + ROI (top/bottom vehicles).
 */
async function buildFleetManagerContext() {
  // Fleet utilization snapshot.
  const [fleet] = await sequelize.query(
    `
    SELECT
      COUNT(*) AS total_vehicles,
      SUM(CASE WHEN status = 'On Trip' THEN 1 ELSE 0 END) AS active_vehicles,
      SUM(CASE WHEN status = 'Available' THEN 1 ELSE 0 END) AS available_vehicles,
      SUM(CASE WHEN status = 'In Shop' THEN 1 ELSE 0 END) AS in_maintenance,
      SUM(CASE WHEN status = 'Retired' THEN 1 ELSE 0 END) AS retired_vehicles
    FROM vehicles
    `,
    { type: QueryTypes.SELECT }
  );

  // Recent trips (most recent 15).
  const recentTrips = await sequelize.query(
    `
    SELECT trip_id, source, destination, vehicle_reg, driver_id,
           status, planned_distance_km, actual_distance_km, revenue, completed_date
    FROM trips
    ORDER BY created_date DESC
    LIMIT 15
    `,
    { type: QueryTypes.SELECT }
  );

  // Per-vehicle operational cost + ROI (same formulas as reportService).
  const vehicleCosts = await sequelize.query(
    `
    SELECT
      v.registration_number,
      v.vehicle_name_model,
      v.status,
      v.acquisition_cost,
      COALESCE(t_agg.revenue, 0) AS revenue,
      COALESCE(f_agg.fuel_cost, 0) AS fuel_cost,
      COALESCE(m_agg.maintenance_cost, 0) AS maintenance_cost,
      (COALESCE(f_agg.fuel_cost, 0) + COALESCE(m_agg.maintenance_cost, 0)) AS operational_cost
    FROM vehicles v
    LEFT JOIN (
      SELECT vehicle_reg, SUM(revenue) AS revenue
      FROM trips WHERE status = 'Completed' GROUP BY vehicle_reg
    ) t_agg ON t_agg.vehicle_reg = v.registration_number
    LEFT JOIN (
      SELECT vehicle_reg, SUM(cost) AS fuel_cost
      FROM fuel_logs GROUP BY vehicle_reg
    ) f_agg ON f_agg.vehicle_reg = v.registration_number
    LEFT JOIN (
      SELECT vehicle_reg, SUM(cost) AS maintenance_cost
      FROM maintenance_logs GROUP BY vehicle_reg
    ) m_agg ON m_agg.vehicle_reg = v.registration_number
    ORDER BY operational_cost DESC
    `,
    { type: QueryTypes.SELECT }
  );

  const totalVehicles = parseInt(fleet.total_vehicles) || 0;
  const activeVehicles = parseInt(fleet.active_vehicles) || 0;

  return {
    snapshot_date: new Date().toISOString().slice(0, 10),
    fleet: {
      total_vehicles: totalVehicles,
      active_vehicles: activeVehicles,
      available_vehicles: parseInt(fleet.available_vehicles) || 0,
      in_maintenance: parseInt(fleet.in_maintenance) || 0,
      retired_vehicles: parseInt(fleet.retired_vehicles) || 0,
      utilization_pct: totalVehicles > 0 ? Number(((activeVehicles / totalVehicles) * 100).toFixed(2)) : 0,
    },
    recent_trips: recentTrips,
    vehicles_by_operational_cost: vehicleCosts.slice(0, 10),
  };
}

/**
 * Safety Officer context: driver safety scores, statuses, and license expiry.
 */
async function buildSafetyOfficerContext() {
  const drivers = await sequelize.query(
    `
    SELECT driver_id, name, license_number, license_category,
           license_expiry_date, safety_score, status
    FROM drivers
    ORDER BY safety_score ASC, license_expiry_date ASC
    `,
    { type: QueryTypes.SELECT }
  );

  const today = new Date().toISOString().slice(0, 10);

  return {
    snapshot_date: today,
    drivers,
    flagged: {
      low_safety: drivers.filter((d) => d.safety_score !== null && Number(d.safety_score) < 70),
      license_expired: drivers.filter((d) => d.license_expiry_date && d.license_expiry_date < today),
      license_expiring_30d: drivers.filter((d) => {
        if (!d.license_expiry_date) return false;
        const diff = (new Date(d.license_expiry_date) - new Date(today)) / 86400000;
        return diff >= 0 && diff <= 30;
      }),
      suspended: drivers.filter((d) => d.status === 'Suspended'),
    },
  };
}

/**
 * Financial Analyst context: aggregated costs, revenue, and ROI per vehicle.
 */
async function buildFinancialAnalystContext() {
  const rows = await sequelize.query(
    `
    SELECT
      v.registration_number,
      v.vehicle_name_model,
      v.acquisition_cost,
      COALESCE(t_agg.revenue, 0) AS revenue,
      COALESCE(f_agg.fuel_cost, 0) AS fuel_cost,
      COALESCE(m_agg.maintenance_cost, 0) AS maintenance_cost,
      COALESCE(e_agg.expense_cost, 0) AS expense_cost,
      (COALESCE(f_agg.fuel_cost, 0) + COALESCE(m_agg.maintenance_cost, 0)) AS operational_cost,
      CASE
        WHEN COALESCE(v.acquisition_cost, 0) = 0 THEN NULL
        ELSE ROUND(
          (COALESCE(t_agg.revenue, 0) - (COALESCE(f_agg.fuel_cost, 0) + COALESCE(m_agg.maintenance_cost, 0)))
          / v.acquisition_cost, 4
        )
      END AS roi
    FROM vehicles v
    LEFT JOIN (
      SELECT vehicle_reg, SUM(revenue) AS revenue
      FROM trips WHERE status = 'Completed' GROUP BY vehicle_reg
    ) t_agg ON t_agg.vehicle_reg = v.registration_number
    LEFT JOIN (
      SELECT vehicle_reg, SUM(cost) AS fuel_cost
      FROM fuel_logs GROUP BY vehicle_reg
    ) f_agg ON f_agg.vehicle_reg = v.registration_number
    LEFT JOIN (
      SELECT vehicle_reg, SUM(cost) AS maintenance_cost
      FROM maintenance_logs GROUP BY vehicle_reg
    ) m_agg ON m_agg.vehicle_reg = v.registration_number
    LEFT JOIN (
      SELECT vehicle_reg, SUM(amount) AS expense_cost
      FROM expenses GROUP BY vehicle_reg
    ) e_agg ON e_agg.vehicle_reg = v.registration_number
    ORDER BY v.registration_number
    `,
    { type: QueryTypes.SELECT }
  );

  const totals = rows.reduce(
    (acc, r) => {
      acc.revenue += Number(r.revenue) || 0;
      acc.fuel_cost += Number(r.fuel_cost) || 0;
      acc.maintenance_cost += Number(r.maintenance_cost) || 0;
      acc.expense_cost += Number(r.expense_cost) || 0;
      acc.operational_cost += Number(r.operational_cost) || 0;
      return acc;
    },
    { revenue: 0, fuel_cost: 0, maintenance_cost: 0, expense_cost: 0, operational_cost: 0 }
  );

  return {
    snapshot_date: new Date().toISOString().slice(0, 10),
    totals,
    vehicles: rows,
  };
}

/**
 * Driver context: this driver's trips, license, and assigned vehicles.
 * @param {string} driverId
 */
async function buildDriverContext(driverId) {
  const [driver] = await sequelize.query(
    `SELECT driver_id, name, license_number, license_category, license_expiry_date, safety_score, status
     FROM drivers WHERE driver_id = :driverId`,
    { type: QueryTypes.SELECT, replacements: { driverId } }
  );

  const trips = await sequelize.query(
    `SELECT trip_id, source, destination, vehicle_reg, status, planned_distance_km,
            actual_distance_km, revenue, created_date, dispatched_date, completed_date
     FROM trips WHERE driver_id = :driverId
     ORDER BY created_date DESC LIMIT 20`,
    { type: QueryTypes.SELECT, replacements: { driverId } }
  );

  // Distinct vehicles this driver has been assigned, with current status.
  const vehicleRegs = [...new Set(trips.map((t) => t.vehicle_reg).filter(Boolean))];
  let vehicles = [];
  if (vehicleRegs.length) {
    vehicles = await sequelize.query(
      `SELECT registration_number, vehicle_name_model, status, region
       FROM vehicles WHERE registration_number IN (:regs)`,
      { type: QueryTypes.SELECT, replacements: { regs: vehicleRegs } }
    );
  }

  return {
    snapshot_date: new Date().toISOString().slice(0, 10),
    driver: driver || null,
    trips,
    vehicles,
  };
}

/**
 * Anomaly context: a single vehicle's financial + efficiency summary over a
 * time window, with a breakdown of cost components and recent line items.
 *
 * @param {string} vehicleReg
 * @param {string} from  YYYY-MM-DD
 * @param {string} to    YYYY-MM-DD
 */
async function buildAnomalyContext(vehicleReg, from, to) {
  const [vehicle] = await sequelize.query(
    `SELECT registration_number, vehicle_name_model, status, acquisition_cost, odometer_km
     FROM vehicles WHERE registration_number = :reg`,
    { type: QueryTypes.SELECT, replacements: { reg: vehicleReg } }
  );

  const trips = await sequelize.query(
    `SELECT trip_id, source, destination, status, planned_distance_km, actual_distance_km,
            fuel_consumed_liters, revenue, completed_date
     FROM trips
     WHERE vehicle_reg = :reg
       AND (completed_date BETWEEN :from AND :to
            OR dispatched_date BETWEEN :from AND :to
            OR created_date BETWEEN :from AND :to)
     ORDER BY completed_date IS NULL, completed_date DESC`,
    { type: QueryTypes.SELECT, replacements: { reg: vehicleReg, from, to } }
  );

  const fuelLogs = await sequelize.query(
    `SELECT fuel_log_id, liters, cost, date FROM fuel_logs
     WHERE vehicle_reg = :reg AND date BETWEEN :from AND :to
     ORDER BY date DESC`,
    { type: QueryTypes.SELECT, replacements: { reg: vehicleReg, from, to } }
  );

  const maintenanceLogs = await sequelize.query(
    `SELECT maintenance_id, maintenance_type, cost, start_date, end_date, status
     FROM maintenance_logs
     WHERE vehicle_reg = :reg
       AND (start_date BETWEEN :from AND :to OR end_date BETWEEN :from AND :to)
     ORDER BY start_date DESC`,
    { type: QueryTypes.SELECT, replacements: { reg: vehicleReg, from, to } }
  );

  const expenses = await sequelize.query(
    `SELECT expense_id, expense_type, amount, date FROM expenses
     WHERE vehicle_reg = :reg AND date BETWEEN :from AND :to
     ORDER BY date DESC`,
    { type: QueryTypes.SELECT, replacements: { reg: vehicleReg, from, to } }
  );

  // Compute the summary (mirrors reportService formulas).
  const totalRevenue = trips
    .filter((t) => t.status === 'Completed')
    .reduce((s, t) => s + Number(t.revenue || 0), 0);
  const totalFuelCost = fuelLogs.reduce((s, f) => s + Number(f.cost || 0), 0);
  const totalFuelLiters = fuelLogs.reduce((s, f) => s + Number(f.liters || 0), 0);
  const totalMaintenanceCost = maintenanceLogs.reduce((s, m) => s + Number(m.cost || 0), 0);
  const totalExpenseCost = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const totalOperationalCost = totalFuelCost + totalMaintenanceCost;
  const acquisitionCost = Number(vehicle?.acquisition_cost || 0);
  const totalDistance = trips
    .filter((t) => t.status === 'Completed')
    .reduce(
      (s, t) => s + (Number(t.actual_distance_km) > 0 ? Number(t.actual_distance_km) : Number(t.planned_distance_km || 0)),
      0
    );
  const tripFuelLiters = trips
    .filter((t) => t.status === 'Completed')
    .reduce((s, t) => s + Number(t.fuel_consumed_liters || 0), 0);

  const roi = acquisitionCost > 0 ? Number(((totalRevenue - totalOperationalCost) / acquisitionCost).toFixed(4)) : null;
  const fuelEfficiency = tripFuelLiters > 0 ? Number((totalDistance / tripFuelLiters).toFixed(2)) : null;

  return {
    vehicle: vehicle || null,
    window: { from, to },
    summary: {
      total_revenue: totalRevenue,
      total_fuel_cost: totalFuelCost,
      total_fuel_liters: totalFuelLiters,
      total_maintenance_cost: totalMaintenanceCost,
      total_expense_cost: totalExpenseCost,
      total_operational_cost: totalOperationalCost,
      acquisition_cost: acquisitionCost,
      roi,
      total_distance_km: totalDistance,
      trip_fuel_liters: tripFuelLiters,
      fuel_efficiency_km_per_liter: fuelEfficiency,
      completed_trips: trips.filter((t) => t.status === 'Completed').length,
    },
    cost_breakdown: {
      fuel: fuelLogs,
      maintenance: maintenanceLogs,
      expenses,
    },
    trips,
  };
}

module.exports = {
  buildFleetManagerContext,
  buildSafetyOfficerContext,
  buildFinancialAnalystContext,
  buildDriverContext,
  buildAnomalyContext,
};