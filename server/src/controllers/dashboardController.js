const { sequelize } = require('../config/db');
const { QueryTypes } = require('sequelize');
const Vehicle = require('../models/Vehicle');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const { getKPIs, getVehicleCosts, getROI, getFuelEfficiency } = require('../services/reportService');
const { stringify } = require('csv-stringify/sync');

/**
 * GET /api/dashboard/kpis
 * Returns live fleet KPIs from database
 */
const getDashboardKPIs = asyncHandler(async (req, res) => {
  const kpis = await getKPIs();
  return ApiResponse.success(res, 200, kpis);
});

/**
 * GET /api/dashboard/filters
 * Returns distinct filter values for vehicle dropdowns
 */
const getDashboardFilters = asyncHandler(async (req, res) => {
  const vehicleTypes = await sequelize.query(
    `SELECT DISTINCT type FROM vehicles WHERE type IS NOT NULL ORDER BY type`,
    { type: QueryTypes.SELECT }
  );

  const vehicleRegions = await sequelize.query(
    `SELECT DISTINCT region FROM vehicles WHERE region IS NOT NULL ORDER BY region`,
    { type: QueryTypes.SELECT }
  );

  return ApiResponse.success(res, 200, {
    vehicle_types: vehicleTypes.map((r) => r.type),
    vehicle_regions: vehicleRegions.map((r) => r.region),
  });
});

/**
 * GET /api/dashboard/charts
 * Returns status distributions for fleet, trips, and drivers — for pie/bar charts.
 * All values are query-driven from the database.
 */
const getDashboardCharts = asyncHandler(async (req, res) => {
  const vehicleStatus = await sequelize.query(
    `SELECT status AS name, COUNT(*) AS value FROM vehicles WHERE status IS NOT NULL GROUP BY status`,
    { type: QueryTypes.SELECT }
  );
  const tripStatus = await sequelize.query(
    `SELECT status AS name, COUNT(*) AS value FROM trips WHERE status IS NOT NULL GROUP BY status`,
    { type: QueryTypes.SELECT }
  );
  const driverStatus = await sequelize.query(
    `SELECT status AS name, COUNT(*) AS value FROM drivers WHERE status IS NOT NULL GROUP BY status`,
    { type: QueryTypes.SELECT }
  );
  return ApiResponse.success(res, 200, { vehicleStatus, tripStatus, driverStatus });
});

/**
 * GET /api/reports/vehicle-costs
 */
const getVehicleCostReport = asyncHandler(async (req, res) => {
  const data = await getVehicleCosts();
  return ApiResponse.success(res, 200, data);
});

/**
 * GET /api/reports/roi
 */
const getROIReport = asyncHandler(async (req, res) => {
  const data = await getROI();
  return ApiResponse.success(res, 200, data);
});

/**
 * GET /api/reports/fuel-efficiency
 */
const getFuelEfficiencyReport = asyncHandler(async (req, res) => {
  const data = await getFuelEfficiency();
  return ApiResponse.success(res, 200, data);
});

/**
 * GET /api/reports/export/csv?report=vehicle-costs|roi|fuel-efficiency|vehicles|drivers|trips
 * Stream CSV download for authorized roles
 */
const exportCSV = asyncHandler(async (req, res) => {
  const { report } = req.query;

  if (!report) {
    return ApiResponse.error(res, 400, 'report query parameter is required. Options: vehicle-costs, roi, fuel-efficiency, vehicles, drivers, trips');
  }

  let data = [];
  let filename = '';

  switch (report) {
    case 'vehicle-costs':
      data = await getVehicleCosts();
      filename = 'vehicle_costs_report.csv';
      break;

    case 'roi':
      data = await getROI();
      filename = 'roi_report.csv';
      break;

    case 'fuel-efficiency':
      data = await getFuelEfficiency();
      filename = 'fuel_efficiency_report.csv';
      break;

    case 'vehicles': {
      data = await sequelize.query(
        `SELECT * FROM vehicles ORDER BY registration_number`,
        { type: QueryTypes.SELECT }
      );
      filename = 'vehicles_export.csv';
      break;
    }

    case 'drivers': {
      data = await sequelize.query(
        `SELECT * FROM drivers ORDER BY driver_id`,
        { type: QueryTypes.SELECT }
      );
      filename = 'drivers_export.csv';
      break;
    }

    case 'trips': {
      data = await sequelize.query(
        `SELECT * FROM trips ORDER BY created_date DESC`,
        { type: QueryTypes.SELECT }
      );
      filename = 'trips_export.csv';
      break;
    }

    default:
      return ApiResponse.error(res, 400, `Unknown report type: '${report}'. Valid options: vehicle-costs, roi, fuel-efficiency, vehicles, drivers, trips`);
  }

  if (!data || data.length === 0) {
    // Return empty CSV with appropriate header
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send('No data available for the requested report.');
  }

  // Build CSV from data
  const csvOutput = stringify(data, { header: true });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.status(200).send(csvOutput);
});

module.exports = {
  getDashboardKPIs,
  getDashboardFilters,
  getDashboardCharts,
  getVehicleCostReport,
  getROIReport,
  getFuelEfficiencyReport,
  exportCSV,
};
