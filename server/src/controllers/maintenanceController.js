const { Op } = require('sequelize');
const MaintenanceLog = require('../models/MaintenanceLog');
const { createMaintenance, closeMaintenance } = require('../services/maintenanceService');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');

/**
 * Generate a unique maintenance_id
 */
const generateMaintenanceId = async () => {
  const latest = await MaintenanceLog.findOne({
    where: { maintenance_id: { [Op.like]: 'MNT-%' } },
    order: [['maintenance_id', 'DESC']],
  });

  if (!latest) return 'MNT-0001';
  const num = parseInt(latest.maintenance_id.split('-')[1]) + 1;
  return `MNT-${String(num).padStart(4, '0')}`;
};

/**
 * GET /api/maintenance
 */
const getMaintenanceLogs = asyncHandler(async (req, res) => {
  const { status, vehicle_reg, page = 1, limit = 20 } = req.query;

  const where = {};
  if (status) where.status = status;
  if (vehicle_reg) where.vehicle_reg = vehicle_reg;

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * limitNum;

  const { count, rows } = await MaintenanceLog.findAndCountAll({
    where,
    limit: limitNum,
    offset,
    order: [['start_date', 'DESC'], ['maintenance_id', 'DESC']],
  });

  return ApiResponse.success(res, 200, rows, '', {
    page: pageNum,
    limit: limitNum,
    total: count,
    totalPages: Math.ceil(count / limitNum),
  });
});

/**
 * POST /api/maintenance
 * Create maintenance record and set vehicle to In Shop
 */
const createMaintenanceLog = asyncHandler(async (req, res) => {
  const { vehicle_reg, maintenance_type, cost, start_date } = req.body;

  const maintenance_id = await generateMaintenanceId();

  const maintenance = await createMaintenance({
    vehicle_reg,
    maintenance_type,
    cost,
    start_date,
    maintenance_id,
  });

  return ApiResponse.success(res, 201, maintenance, 'Maintenance record created. Vehicle set to In Shop.');
});

/**
 * PATCH /api/maintenance/:maintenance_id/close
 * Close maintenance record and restore vehicle status intelligently
 */
const closeMaintenanceLog = asyncHandler(async (req, res) => {
  const { maintenance_id } = req.params;
  const { end_date } = req.body;

  const maintenance = await closeMaintenance(maintenance_id, end_date);

  return ApiResponse.success(res, 200, maintenance, 'Maintenance record closed. Vehicle status updated.');
});

module.exports = {
  getMaintenanceLogs,
  createMaintenanceLog,
  closeMaintenanceLog,
};
