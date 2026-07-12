const { Op } = require('sequelize');
const Vehicle = require('../models/Vehicle');
const MaintenanceLog = require('../models/MaintenanceLog');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');

/**
 * GET /api/vehicles
 * List all vehicles with optional filters and pagination
 */
const getVehicles = asyncHandler(async (req, res) => {
  const { status, type, region, search, page = 1, limit = 20 } = req.query;

  const where = {};

  if (status) where.status = status;
  if (type) where.type = type;
  if (region) where.region = region;
  if (search) {
    where[Op.or] = [
      { registration_number: { [Op.like]: `%${search}%` } },
      { vehicle_name_model: { [Op.like]: `%${search}%` } },
    ];
  }

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * limitNum;

  const { count, rows } = await Vehicle.findAndCountAll({
    where,
    limit: limitNum,
    offset,
    order: [['registration_number', 'ASC']],
  });

  return ApiResponse.success(res, 200, rows, '', {
    page: pageNum,
    limit: limitNum,
    total: count,
    totalPages: Math.ceil(count / limitNum),
  });
});

/**
 * GET /api/vehicles/eligible-for-dispatch
 * Returns vehicles that are Available and have no active maintenance
 */
const getEligibleVehicles = asyncHandler(async (req, res) => {
  // Find vehicle_regs with active maintenance
  const activeMaintenanceVehicles = await MaintenanceLog.findAll({
    where: { status: 'Active' },
    attributes: ['vehicle_reg'],
  });
  const blockedVehicleRegs = activeMaintenanceVehicles.map((m) => m.vehicle_reg);

  const where = { status: 'Available' };
  if (blockedVehicleRegs.length > 0) {
    where.registration_number = { [Op.notIn]: blockedVehicleRegs };
  }

  const vehicles = await Vehicle.findAll({
    where,
    order: [['registration_number', 'ASC']],
  });

  return ApiResponse.success(res, 200, vehicles);
});

/**
 * GET /api/vehicles/:registration_number
 * Get single vehicle by registration number
 */
const getVehicleById = asyncHandler(async (req, res) => {
  const { registration_number } = req.params;

  const vehicle = await Vehicle.findByPk(registration_number);
  if (!vehicle) {
    throw new ApiError(404, `Vehicle '${registration_number}' not found.`);
  }

  return ApiResponse.success(res, 200, vehicle);
});

/**
 * POST /api/vehicles
 * Create a new vehicle (fleet_manager only)
 */
const createVehicle = asyncHandler(async (req, res) => {
  const {
    registration_number,
    vehicle_name_model,
    type,
    max_load_capacity_kg,
    odometer_km,
    acquisition_cost,
    status,
    region,
  } = req.body;

  // Check uniqueness
  const existing = await Vehicle.findByPk(registration_number);
  if (existing) {
    throw new ApiError(409, `Vehicle with registration '${registration_number}' already exists.`);
  }

  const vehicle = await Vehicle.create({
    registration_number,
    vehicle_name_model,
    type,
    max_load_capacity_kg,
    odometer_km: odometer_km || 0,
    acquisition_cost,
    status: status || 'Available',
    region,
  });

  return ApiResponse.success(res, 201, vehicle, 'Vehicle created successfully.');
});

/**
 * PUT /api/vehicles/:registration_number
 * Update vehicle (fleet_manager only)
 * Cannot manually set status to 'On Trip' or 'In Shop'
 */
const updateVehicle = asyncHandler(async (req, res) => {
  const { registration_number } = req.params;
  const {
    vehicle_name_model,
    type,
    max_load_capacity_kg,
    odometer_km,
    acquisition_cost,
    status,
    region,
  } = req.body;

  const vehicle = await Vehicle.findByPk(registration_number);
  if (!vehicle) {
    throw new ApiError(404, `Vehicle '${registration_number}' not found.`);
  }

  // Business rule: prevent manual setting of On Trip / In Shop
  if (status && (status === 'On Trip' || status === 'In Shop')) {
    throw new ApiError(
      400,
      `Cannot manually set vehicle status to '${status}'. This status is controlled automatically by trip dispatch or maintenance operations.`
    );
  }

  const updateData = {};
  if (vehicle_name_model !== undefined) updateData.vehicle_name_model = vehicle_name_model;
  if (type !== undefined) updateData.type = type;
  if (max_load_capacity_kg !== undefined) updateData.max_load_capacity_kg = max_load_capacity_kg;
  if (odometer_km !== undefined) updateData.odometer_km = odometer_km;
  if (acquisition_cost !== undefined) updateData.acquisition_cost = acquisition_cost;
  if (status !== undefined) updateData.status = status;
  if (region !== undefined) updateData.region = region;

  await Vehicle.update(updateData, { where: { registration_number } });
  const updated = await Vehicle.findByPk(registration_number);

  return ApiResponse.success(res, 200, updated, 'Vehicle updated successfully.');
});

module.exports = {
  getVehicles,
  getVehicleById,
  getEligibleVehicles,
  createVehicle,
  updateVehicle,
};
