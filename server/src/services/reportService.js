const { sequelize } = require('../config/db');
const { QueryTypes } = require('sequelize');

/**
 * Report Service - generates analytics reports from live DB data.
 * All queries run against MySQL; no hardcoded values.
 */

/**
 * Vehicle cost breakdown: fuel + maintenance + other expenses per vehicle
 */
const getVehicleCosts = async () => {
  const results = await sequelize.query(
    `
    SELECT
      v.registration_number,
      v.vehicle_name_model,
      COALESCE(SUM(DISTINCT_FUEL.fuel_cost), 0) AS total_fuel_cost,
      COALESCE(m_agg.maintenance_cost, 0) AS total_maintenance_cost,
      COALESCE(e_agg.expense_cost, 0) AS total_expense_cost,
      (COALESCE(SUM(DISTINCT_FUEL.fuel_cost), 0) + COALESCE(m_agg.maintenance_cost, 0)) AS total_operational_cost
    FROM vehicles v
    LEFT JOIN (
      SELECT vehicle_reg, SUM(cost) AS fuel_cost
      FROM fuel_logs
      GROUP BY vehicle_reg
    ) DISTINCT_FUEL ON DISTINCT_FUEL.vehicle_reg = v.registration_number
    LEFT JOIN (
      SELECT vehicle_reg, SUM(cost) AS maintenance_cost
      FROM maintenance_logs
      GROUP BY vehicle_reg
    ) m_agg ON m_agg.vehicle_reg = v.registration_number
    LEFT JOIN (
      SELECT vehicle_reg, SUM(amount) AS expense_cost
      FROM expenses
      GROUP BY vehicle_reg
    ) e_agg ON e_agg.vehicle_reg = v.registration_number
    GROUP BY v.registration_number, v.vehicle_name_model, m_agg.maintenance_cost, e_agg.expense_cost
    ORDER BY v.registration_number
    `,
    { type: QueryTypes.SELECT }
  );

  return results;
};

/**
 * ROI per vehicle:
 * roi = (total_revenue - (total_maintenance_cost + total_fuel_cost)) / acquisition_cost
 * Only completed trips contribute to revenue.
 * If acquisition_cost = 0, roi = null.
 */
const getROI = async () => {
  const results = await sequelize.query(
    `
    SELECT
      v.registration_number,
      v.vehicle_name_model,
      v.acquisition_cost,
      COALESCE(t_agg.total_revenue, 0) AS total_revenue,
      COALESCE(m_agg.total_maintenance_cost, 0) AS total_maintenance_cost,
      COALESCE(f_agg.total_fuel_cost, 0) AS total_fuel_cost,
      CASE
        WHEN COALESCE(v.acquisition_cost, 0) = 0 THEN NULL
        ELSE ROUND(
          (COALESCE(t_agg.total_revenue, 0) - (COALESCE(m_agg.total_maintenance_cost, 0) + COALESCE(f_agg.total_fuel_cost, 0)))
          / v.acquisition_cost,
          4
        )
      END AS roi
    FROM vehicles v
    LEFT JOIN (
      SELECT vehicle_reg, SUM(revenue) AS total_revenue
      FROM trips
      WHERE status = 'Completed'
      GROUP BY vehicle_reg
    ) t_agg ON t_agg.vehicle_reg = v.registration_number
    LEFT JOIN (
      SELECT vehicle_reg, SUM(cost) AS total_maintenance_cost
      FROM maintenance_logs
      GROUP BY vehicle_reg
    ) m_agg ON m_agg.vehicle_reg = v.registration_number
    LEFT JOIN (
      SELECT vehicle_reg, SUM(cost) AS total_fuel_cost
      FROM fuel_logs
      GROUP BY vehicle_reg
    ) f_agg ON f_agg.vehicle_reg = v.registration_number
    ORDER BY v.registration_number
    `,
    { type: QueryTypes.SELECT }
  );

  return results;
};

/**
 * Fuel efficiency per vehicle:
 * efficiency = total_distance / total_fuel_liters
 * Uses actual_distance_km if available, else planned_distance_km.
 * Only completed trips.
 */
const getFuelEfficiency = async () => {
  const results = await sequelize.query(
    `
    SELECT
      v.registration_number,
      v.vehicle_name_model,
      COALESCE(t_agg.total_distance, 0) AS total_distance,
      COALESCE(t_agg.total_fuel_liters, 0) AS total_fuel_liters,
      CASE
        WHEN COALESCE(t_agg.total_fuel_liters, 0) = 0 THEN NULL
        ELSE ROUND(COALESCE(t_agg.total_distance, 0) / t_agg.total_fuel_liters, 2)
      END AS efficiency_km_per_liter
    FROM vehicles v
    LEFT JOIN (
      SELECT
        vehicle_reg,
        SUM(
          CASE
            WHEN actual_distance_km IS NOT NULL AND actual_distance_km > 0
            THEN actual_distance_km
            ELSE planned_distance_km
          END
        ) AS total_distance,
        SUM(fuel_consumed_liters) AS total_fuel_liters
      FROM trips
      WHERE status = 'Completed'
      GROUP BY vehicle_reg
    ) t_agg ON t_agg.vehicle_reg = v.registration_number
    ORDER BY v.registration_number
    `,
    { type: QueryTypes.SELECT }
  );

  return results;
};

/**
 * Dashboard KPIs - all live from DB
 */
const getKPIs = async () => {
  const [vehicleStats] = await sequelize.query(
    `
    SELECT
      COUNT(*) AS total_vehicles,
      SUM(CASE WHEN status = 'On Trip' THEN 1 ELSE 0 END) AS active_vehicles,
      SUM(CASE WHEN status = 'Available' THEN 1 ELSE 0 END) AS available_vehicles,
      SUM(CASE WHEN status = 'In Shop' THEN 1 ELSE 0 END) AS vehicles_in_maintenance,
      SUM(CASE WHEN status = 'Retired' THEN 1 ELSE 0 END) AS retired_vehicles
    FROM vehicles
    `,
    { type: QueryTypes.SELECT }
  );

  const [tripStats] = await sequelize.query(
    `
    SELECT
      SUM(CASE WHEN status = 'Dispatched' THEN 1 ELSE 0 END) AS active_trips,
      SUM(CASE WHEN status = 'Draft' THEN 1 ELSE 0 END) AS pending_trips
    FROM trips
    `,
    { type: QueryTypes.SELECT }
  );

  const [driverStats] = await sequelize.query(
    `
    SELECT
      SUM(CASE WHEN status = 'On Trip' THEN 1 ELSE 0 END) AS drivers_on_duty,
      COUNT(*) AS total_drivers
    FROM drivers
    `,
    { type: QueryTypes.SELECT }
  );

  const totalVehicles = parseInt(vehicleStats.total_vehicles) || 0;
  const activeVehicles = parseInt(vehicleStats.active_vehicles) || 0;

  const fleetUtilizationPct =
    totalVehicles > 0
      ? parseFloat(((activeVehicles / totalVehicles) * 100).toFixed(2))
      : 0;

  return {
    active_vehicles: activeVehicles,
    available_vehicles: parseInt(vehicleStats.available_vehicles) || 0,
    vehicles_in_maintenance: parseInt(vehicleStats.vehicles_in_maintenance) || 0,
    retired_vehicles: parseInt(vehicleStats.retired_vehicles) || 0,
    total_vehicles: totalVehicles,
    active_trips: parseInt(tripStats.active_trips) || 0,
    pending_trips: parseInt(tripStats.pending_trips) || 0,
    drivers_on_duty: parseInt(driverStats.drivers_on_duty) || 0,
    total_drivers: parseInt(driverStats.total_drivers) || 0,
    fleet_utilization_pct: fleetUtilizationPct,
  };
};

module.exports = { getVehicleCosts, getROI, getFuelEfficiency, getKPIs };
