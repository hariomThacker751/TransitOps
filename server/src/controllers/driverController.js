const { Op } = require('sequelize');
const Driver = require('../models/Driver');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');

/**
 * GET /api/drivers
 * List all drivers with optional filters and pagination
 */
const getDrivers = asyncHandler(async (req, res) => {
  const { status, license_category, search, page = 1, limit = 20 } = req.query;

  const where = {};

  if (status) where.status = status;
  if (license_category) where.license_category = license_category;
  if (search) {
    where[Op.or] = [
      { driver_id: { [Op.like]: `%${search}%` } },
      { name: { [Op.like]: `%${search}%` } },
      { license_number: { [Op.like]: `%${search}%` } },
    ];
  }

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * limitNum;

  const { count, rows } = await Driver.findAndCountAll({
    where,
    limit: limitNum,
    offset,
    order: [['driver_id', 'ASC']],
  });

  return ApiResponse.success(res, 200, rows, '', {
    page: pageNum,
    limit: limitNum,
    total: count,
    totalPages: Math.ceil(count / limitNum),
  });
});

/**
 * GET /api/drivers/eligible-for-dispatch
 * Returns drivers who are Available AND whose license has not expired
 * NOTE: Both conditions must be satisfied. Status alone is NOT sufficient.
 */
const getEligibleDrivers = asyncHandler(async (req, res) => {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  const drivers = await Driver.findAll({
    where: {
      status: 'Available',
      license_expiry_date: { [Op.gte]: today },
    },
    order: [['driver_id', 'ASC']],
  });

  return ApiResponse.success(res, 200, drivers);
});

/**
 * GET /api/drivers/:driver_id
 * Get single driver
 */
const getDriverById = asyncHandler(async (req, res) => {
  const { driver_id } = req.params;

  const driver = await Driver.findByPk(driver_id);
  if (!driver) {
    throw new ApiError(404, `Driver '${driver_id}' not found.`);
  }

  return ApiResponse.success(res, 200, driver);
});

/**
 * POST /api/drivers
 * Create a new driver (fleet_manager only)
 */
const createDriver = asyncHandler(async (req, res) => {
  const {
    driver_id,
    name,
    license_number,
    license_category,
    license_expiry_date,
    contact_number,
    safety_score,
    status,
  } = req.body;

  // Check driver_id uniqueness
  const existingDriver = await Driver.findByPk(driver_id);
  if (existingDriver) {
    throw new ApiError(409, `Driver with driver_id '${driver_id}' already exists.`);
  }

  // Check license_number uniqueness
  if (license_number) {
    const existingLicense = await Driver.findOne({ where: { license_number } });
    if (existingLicense) {
      throw new ApiError(409, `License number '${license_number}' is already in use.`);
    }
  }

  const driver = await Driver.create({
    driver_id,
    name,
    license_number,
    license_category,
    license_expiry_date,
    contact_number,
    safety_score: safety_score !== undefined ? safety_score : null,
    status: status || 'Available',
  });

  return ApiResponse.success(res, 201, driver, 'Driver created successfully.');
});

/**
 * PUT /api/drivers/:driver_id
 * Update driver.
 * RBAC enforcement:
 * - fleet_manager: can update all fields
 * - safety_officer: can only update status and safety_score
 * - others: denied
 */
const updateDriver = asyncHandler(async (req, res) => {
  const { driver_id } = req.params;
  const { role } = req.user;

  const driver = await Driver.findByPk(driver_id);
  if (!driver) {
    throw new ApiError(404, `Driver '${driver_id}' not found.`);
  }

  // RBAC: restrict safety_officer to only safety_score and status
  if (role === 'safety_officer') {
    const { safety_score, status } = req.body;
    const updateData = {};

    if (safety_score !== undefined) updateData.safety_score = safety_score;
    if (status !== undefined) updateData.status = status;

    if (Object.keys(updateData).length === 0) {
      throw new ApiError(400, 'No valid fields provided. Safety officers can only update status and safety_score.');
    }

    await Driver.update(updateData, { where: { driver_id } });
    const updated = await Driver.findByPk(driver_id);
    return ApiResponse.success(res, 200, updated, 'Driver updated successfully.');
  }

  // fleet_manager: full update
  if (role === 'fleet_manager') {
    const {
      name,
      license_number,
      license_category,
      license_expiry_date,
      contact_number,
      safety_score,
      status,
    } = req.body;

    // Check license uniqueness if updating
    if (license_number && license_number !== driver.license_number) {
      const existingLicense = await Driver.findOne({ where: { license_number } });
      if (existingLicense) {
        throw new ApiError(409, `License number '${license_number}' is already in use.`);
      }
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (license_number !== undefined) updateData.license_number = license_number;
    if (license_category !== undefined) updateData.license_category = license_category;
    if (license_expiry_date !== undefined) updateData.license_expiry_date = license_expiry_date;
    if (contact_number !== undefined) updateData.contact_number = contact_number;
    if (safety_score !== undefined) updateData.safety_score = safety_score;
    if (status !== undefined) updateData.status = status;

    await Driver.update(updateData, { where: { driver_id } });
    const updated = await Driver.findByPk(driver_id);
    return ApiResponse.success(res, 200, updated, 'Driver updated successfully.');
  }

  // Any other role that got past route middleware (shouldn't happen)
  throw new ApiError(403, 'Access denied. Insufficient permissions to update driver.');
});

module.exports = {
  getDrivers,
  getDriverById,
  getEligibleDrivers,
  createDriver,
  updateDriver,
};
