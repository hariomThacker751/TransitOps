const { Op } = require('sequelize');
const FuelLog = require('../models/FuelLog');
const Vehicle = require('../models/Vehicle');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');

/**
 * Generate a unique fuel_log_id
 */
const generateFuelLogId = async () => {
  const latest = await FuelLog.findOne({
    where: { fuel_log_id: { [Op.like]: 'FL-%' } },
    order: [['fuel_log_id', 'DESC']],
  });

  if (!latest) return 'FL-0001';
  const num = parseInt(latest.fuel_log_id.split('-')[1]) + 1;
  return `FL-${String(num).padStart(4, '0')}`;
};

/**
 * GET /api/fuel-logs
 */
const getFuelLogs = asyncHandler(async (req, res) => {
  const { vehicle_reg, trip_id, date_from, date_to, page = 1, limit = 20 } = req.query;

  const where = {};
  if (vehicle_reg) where.vehicle_reg = vehicle_reg;
  if (trip_id) where.trip_id = trip_id;

  if (date_from || date_to) {
    where.date = {};
    if (date_from) where.date[Op.gte] = date_from;
    if (date_to) where.date[Op.lte] = date_to;
  }

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * limitNum;

  const { count, rows } = await FuelLog.findAndCountAll({
    where,
    limit: limitNum,
    offset,
    order: [['date', 'DESC'], ['fuel_log_id', 'DESC']],
  });

  return ApiResponse.success(res, 200, rows, '', {
    page: pageNum,
    limit: limitNum,
    total: count,
    totalPages: Math.ceil(count / limitNum),
  });
});

/**
 * POST /api/fuel-logs
 */
const createFuelLog = asyncHandler(async (req, res) => {
  const { vehicle_reg, trip_id, liters, cost, date } = req.body;

  // Validate vehicle exists
  const vehicle = await Vehicle.findByPk(vehicle_reg);
  if (!vehicle) {
    throw new ApiError(404, `Vehicle '${vehicle_reg}' does not exist.`);
  }

  const fuel_log_id = await generateFuelLogId();

  const fuelLog = await FuelLog.create({
    fuel_log_id,
    vehicle_reg,
    trip_id: trip_id || null,
    liters,
    cost,
    date,
  });

  return ApiResponse.success(res, 201, fuelLog, 'Fuel log created successfully.');
});

module.exports = { getFuelLogs, createFuelLog };
