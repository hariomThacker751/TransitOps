const Trip = require('../models/Trip');
const Vehicle = require('../models/Vehicle');
const Driver = require('../models/Driver');
const MaintenanceLog = require('../models/MaintenanceLog');
const ApiError = require('../utils/ApiError');

/**
 * TransitOps Trip Dispatch Rules Engine
 *
 * Validates ALL conditions required before a trip can be dispatched.
 * Checks run in strict order and fail fast with explicit error messages.
 *
 * Rules order:
 * 1.  trip exists
 * 2.  trip status is Draft
 * 3.  vehicle exists
 * 4.  driver exists
 * 5.  vehicle status is Available
 * 6.  vehicle not already linked to another Dispatched trip
 * 7.  vehicle has no Active maintenance record
 * 8.  driver status is Available
 * 9.  driver is not Suspended
 * 10. driver not already linked to another Dispatched trip
 * 11. driver license_expiry_date >= today  ← CRITICAL: seed data has trap case
 * 12. cargo_weight_kg <= vehicle.max_load_capacity_kg
 */
const validateDispatch = async (tripId, t = null) => {
  // Rule 1: trip exists
  const trip = await Trip.findByPk(tripId, { transaction: t });
  if (!trip) {
    throw new ApiError(404, `Trip '${tripId}' does not exist.`);
  }

  // Rule 2: trip must be in Draft status
  if (trip.status !== 'Draft') {
    throw new ApiError(
      400,
      `Trip is not in Draft status and cannot be dispatched. Current status: ${trip.status}.`
    );
  }

  // Rule 3: vehicle exists
  const vehicle = await Vehicle.findByPk(trip.vehicle_reg, { transaction: t });
  if (!vehicle) {
    throw new ApiError(404, `Vehicle '${trip.vehicle_reg}' does not exist.`);
  }

  // Rule 4: driver exists
  const driver = await Driver.findByPk(trip.driver_id, { transaction: t });
  if (!driver) {
    throw new ApiError(404, `Driver '${trip.driver_id}' does not exist.`);
  }

  // Rule 5: vehicle status must be Available
  if (vehicle.status !== 'Available') {
    throw new ApiError(
      400,
      `Vehicle is not available (current status: ${vehicle.status}).`
    );
  }

  // Rule 6: vehicle not already assigned to another active Dispatched trip
  const vehicleActiveTrip = await Trip.findOne({
    where: {
      vehicle_reg: trip.vehicle_reg,
      status: 'Dispatched',
    },
    transaction: t,
  });
  if (vehicleActiveTrip) {
    throw new ApiError(
      400,
      `Vehicle '${trip.vehicle_reg}' is already assigned to another dispatched trip (${vehicleActiveTrip.trip_id}).`
    );
  }

  // Rule 7: vehicle has no Active maintenance record
  const activeMaintenance = await MaintenanceLog.findOne({
    where: {
      vehicle_reg: trip.vehicle_reg,
      status: 'Active',
    },
    transaction: t,
  });
  if (activeMaintenance) {
    throw new ApiError(
      400,
      `Vehicle is currently under maintenance (maintenance record: ${activeMaintenance.maintenance_id}).`
    );
  }

  // Rule 8: driver status must be Available
  if (driver.status !== 'Available') {
    throw new ApiError(
      400,
      `Driver is not available (current status: ${driver.status}).`
    );
  }

  // Rule 9: driver must not be Suspended (belt + suspenders with Rule 8)
  if (driver.status === 'Suspended') {
    throw new ApiError(
      400,
      `Driver '${driver.driver_id}' is suspended and cannot be dispatched.`
    );
  }

  // Rule 10: driver not already assigned to another active Dispatched trip
  const driverActiveTrip = await Trip.findOne({
    where: {
      driver_id: trip.driver_id,
      status: 'Dispatched',
    },
    transaction: t,
  });
  if (driverActiveTrip) {
    throw new ApiError(
      400,
      `Driver '${trip.driver_id}' is already assigned to another dispatched trip (${driverActiveTrip.trip_id}).`
    );
  }

  // Rule 11: driver license_expiry_date >= today
  // CRITICAL: The seed data contains a trap case where a driver may have
  // Available status but an already-expired license. The expiry date is
  // the authoritative check — do NOT rely on status alone.
  if (!driver.license_expiry_date) {
    throw new ApiError(
      400,
      `Driver '${driver.driver_id}' has no license expiry date on record. Cannot dispatch.`
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiryDate = new Date(driver.license_expiry_date);
  expiryDate.setHours(0, 0, 0, 0);

  if (expiryDate < today) {
    throw new ApiError(
      400,
      `Driver's license has expired (expired: ${driver.license_expiry_date}). Cannot dispatch.`
    );
  }

  // Rule 12: cargo weight must not exceed vehicle max load capacity
  if (
    trip.cargo_weight_kg !== null &&
    vehicle.max_load_capacity_kg !== null &&
    parseFloat(trip.cargo_weight_kg) > parseFloat(vehicle.max_load_capacity_kg)
  ) {
    throw new ApiError(
      400,
      `Cargo weight (${trip.cargo_weight_kg} kg) exceeds vehicle maximum capacity (${vehicle.max_load_capacity_kg} kg).`
    );
  }

  // All rules passed — return resolved entities for use in the dispatch transaction
  return { trip, vehicle, driver };
};

module.exports = { validateDispatch };
