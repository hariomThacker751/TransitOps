const MaintenanceLog = require('../models/MaintenanceLog');
const Vehicle = require('../models/Vehicle');
const ApiError = require('../utils/ApiError');
const { sequelize } = require('../config/db');

/**
 * Creates a maintenance record and sets vehicle to 'In Shop'.
 * Transactional - both happen or neither does.
 */
const createMaintenance = async ({ vehicle_reg, maintenance_type, cost, start_date, maintenance_id }) => {
  // Check vehicle exists
  const vehicle = await Vehicle.findByPk(vehicle_reg);
  if (!vehicle) {
    throw new ApiError(404, `Vehicle '${vehicle_reg}' does not exist.`);
  }

  // Check for already-active maintenance on this vehicle
  const existingActive = await MaintenanceLog.findOne({
    where: { vehicle_reg, status: 'Active' },
  });
  if (existingActive) {
    throw new ApiError(
      409,
      `Vehicle '${vehicle_reg}' already has an active maintenance record (${existingActive.maintenance_id}).`
    );
  }

  const t = await sequelize.transaction();
  try {
    const maintenance = await MaintenanceLog.create(
      {
        maintenance_id,
        vehicle_reg,
        maintenance_type,
        cost,
        start_date,
        status: 'Active',
      },
      { transaction: t }
    );

    await Vehicle.update({ status: 'In Shop' }, { where: { registration_number: vehicle_reg }, transaction: t });

    await t.commit();
    return maintenance;
  } catch (err) {
    await t.rollback();
    throw err;
  }
};

/**
 * Closes a maintenance record, then intelligently restores vehicle status.
 * Logic: if vehicle is Retired → keep Retired.
 *        if another Active maintenance exists → keep In Shop.
 *        else → Available.
 */
const closeMaintenance = async (maintenance_id, end_date) => {
  const maintenance = await MaintenanceLog.findByPk(maintenance_id);
  if (!maintenance) {
    throw new ApiError(404, `Maintenance record '${maintenance_id}' does not exist.`);
  }

  if (maintenance.status === 'Closed') {
    throw new ApiError(400, `Maintenance record '${maintenance_id}' is already closed.`);
  }

  const vehicle = await Vehicle.findByPk(maintenance.vehicle_reg);

  const t = await sequelize.transaction();
  try {
    await MaintenanceLog.update(
      { status: 'Closed', end_date },
      { where: { maintenance_id }, transaction: t }
    );

    if (vehicle) {
      let newVehicleStatus = vehicle.status;

      if (vehicle.status === 'Retired') {
        // Keep Retired - terminal state
        newVehicleStatus = 'Retired';
      } else {
        // Check if there are OTHER active maintenance records for this vehicle
        const otherActiveCount = await MaintenanceLog.count({
          where: {
            vehicle_reg: maintenance.vehicle_reg,
            status: 'Active',
            maintenance_id: { [require('sequelize').Op.ne]: maintenance_id },
          },
          transaction: t,
        });

        newVehicleStatus = otherActiveCount > 0 ? 'In Shop' : 'Available';
      }

      await Vehicle.update(
        { status: newVehicleStatus },
        { where: { registration_number: maintenance.vehicle_reg }, transaction: t }
      );
    }

    await t.commit();

    return await MaintenanceLog.findByPk(maintenance_id);
  } catch (err) {
    await t.rollback();
    throw err;
  }
};

module.exports = { createMaintenance, closeMaintenance };
