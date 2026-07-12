const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const Trip = require('../models/Trip');
const Vehicle = require('../models/Vehicle');
const Driver = require('../models/Driver');
const { validateDispatch } = require('../services/tripRulesEngine');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');

/**
 * Generate a unique trip ID in format TRP-XXXX
 */
const generateTripId = async () => {
  const latest = await Trip.findOne({
    where: { trip_id: { [Op.like]: 'TRP-%' } },
    order: [['trip_id', 'DESC']],
  });

  if (!latest) return 'TRP-0001';

  const num = parseInt(latest.trip_id.split('-')[1]) + 1;
  return `TRP-${String(num).padStart(4, '0')}`;
};

/**
 * GET /api/trips
 */
const getTrips = asyncHandler(async (req, res) => {
  const { status, vehicle_reg, driver_id, date_from, date_to, page = 1, limit = 20 } = req.query;

  const where = {};

  if (status) where.status = status;
  if (vehicle_reg) where.vehicle_reg = vehicle_reg;
  if (driver_id) where.driver_id = driver_id;

  if (date_from || date_to) {
    where.created_date = {};
    if (date_from) where.created_date[Op.gte] = date_from;
    if (date_to) where.created_date[Op.lte] = date_to;
  }

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * limitNum;

  const { count, rows } = await Trip.findAndCountAll({
    where,
    limit: limitNum,
    offset,
    order: [['created_date', 'DESC'], ['trip_id', 'DESC']],
  });

  return ApiResponse.success(res, 200, rows, '', {
    page: pageNum,
    limit: limitNum,
    total: count,
    totalPages: Math.ceil(count / limitNum),
  });
});

/**
 * GET /api/trips/:trip_id
 */
const getTripById = asyncHandler(async (req, res) => {
  const { trip_id } = req.params;

  const trip = await Trip.findByPk(trip_id);
  if (!trip) {
    throw new ApiError(404, `Trip '${trip_id}' not found.`);
  }

  return ApiResponse.success(res, 200, trip);
});

/**
 * POST /api/trips
 * Create a Draft trip
 * Validates cargo overload at creation time
 */
const createTrip = asyncHandler(async (req, res) => {
  const {
    trip_id,
    source,
    destination,
    vehicle_reg,
    driver_id,
    cargo_weight_kg,
    planned_distance_km,
    revenue,
    created_date,
  } = req.body;

  // Validate vehicle exists and cargo won't overload
  const vehicle = await Vehicle.findByPk(vehicle_reg);
  if (!vehicle) {
    throw new ApiError(404, `Vehicle '${vehicle_reg}' does not exist.`);
  }

  if (
    vehicle.max_load_capacity_kg !== null &&
    parseFloat(cargo_weight_kg) > parseFloat(vehicle.max_load_capacity_kg)
  ) {
    throw new ApiError(
      400,
      `Cargo weight (${cargo_weight_kg} kg) exceeds vehicle maximum capacity (${vehicle.max_load_capacity_kg} kg).`
    );
  }

  // Validate driver exists
  const driver = await Driver.findByPk(driver_id);
  if (!driver) {
    throw new ApiError(404, `Driver '${driver_id}' does not exist.`);
  }

  const newTripId = trip_id || (await generateTripId());

  // Check trip_id uniqueness if provided
  if (trip_id) {
    const existing = await Trip.findByPk(trip_id);
    if (existing) {
      throw new ApiError(409, `Trip with trip_id '${trip_id}' already exists.`);
    }
  }

  const today = new Date().toISOString().split('T')[0];

  const trip = await Trip.create({
    trip_id: newTripId,
    source,
    destination,
    vehicle_reg,
    driver_id,
    cargo_weight_kg,
    planned_distance_km,
    revenue: revenue || 0,
    status: 'Draft',
    created_date: created_date || today,
  });

  return ApiResponse.success(res, 201, trip, 'Trip created successfully in Draft status.');
});

/**
 * PATCH /api/trips/:trip_id/dispatch
 * Dispatch a trip - runs the full rules engine then atomically updates trip, vehicle, and driver
 */
const dispatchTrip = asyncHandler(async (req, res) => {
  const { trip_id } = req.params;

  // Run the rules engine - throws ApiError on any failure
  const { trip, vehicle, driver } = await validateDispatch(trip_id);

  const today = new Date().toISOString().split('T')[0];

  // Atomic transaction: all three updates or none
  const t = await sequelize.transaction();
  try {
    await Trip.update(
      { status: 'Dispatched', dispatched_date: today },
      { where: { trip_id }, transaction: t }
    );

    await Vehicle.update(
      { status: 'On Trip' },
      { where: { registration_number: vehicle.registration_number }, transaction: t }
    );

    await Driver.update(
      { status: 'On Trip' },
      { where: { driver_id: driver.driver_id }, transaction: t }
    );

    await t.commit();
  } catch (err) {
    await t.rollback();
    throw err;
  }

  const updatedTrip = await Trip.findByPk(trip_id);
  return ApiResponse.success(res, 200, updatedTrip, 'Trip dispatched successfully.');
});

/**
 * PATCH /api/trips/:trip_id/complete
 * Complete a dispatched trip - updates odometer, records actuals, restores statuses
 */
const completeTrip = asyncHandler(async (req, res) => {
  const { trip_id } = req.params;
  const { actual_distance_km, fuel_consumed_liters, revenue } = req.body;

  const trip = await Trip.findByPk(trip_id);
  if (!trip) {
    throw new ApiError(404, `Trip '${trip_id}' not found.`);
  }

  if (trip.status !== 'Dispatched') {
    throw new ApiError(
      400,
      `Trip cannot be completed. Current status is '${trip.status}'. Only Dispatched trips can be completed.`
    );
  }

  const vehicle = await Vehicle.findByPk(trip.vehicle_reg);
  const driver = await Driver.findByPk(trip.driver_id);

  const today = new Date().toISOString().split('T')[0];

  const t = await sequelize.transaction();
  try {
    const tripUpdateData = {
      status: 'Completed',
      completed_date: today,
      actual_distance_km,
      fuel_consumed_liters,
    };
    if (revenue !== undefined) tripUpdateData.revenue = revenue;

    await Trip.update(tripUpdateData, { where: { trip_id }, transaction: t });

    // Increment vehicle odometer by actual_distance_km
    if (vehicle) {
      const currentOdometer = parseFloat(vehicle.odometer_km) || 0;
      const newOdometer = currentOdometer + parseFloat(actual_distance_km);

      await Vehicle.update(
        { status: 'Available', odometer_km: newOdometer },
        { where: { registration_number: trip.vehicle_reg }, transaction: t }
      );
    }

    if (driver) {
      await Driver.update(
        { status: 'Available' },
        { where: { driver_id: trip.driver_id }, transaction: t }
      );
    }

    await t.commit();
  } catch (err) {
    await t.rollback();
    throw err;
  }

  const updatedTrip = await Trip.findByPk(trip_id);
  return ApiResponse.success(res, 200, updatedTrip, 'Trip completed successfully.');
});

/**
 * PATCH /api/trips/:trip_id/cancel
 * Cancel a trip from Draft or Dispatched status
 * If from Dispatched: restores vehicle and driver statuses
 */
const cancelTrip = asyncHandler(async (req, res) => {
  const { trip_id } = req.params;

  const trip = await Trip.findByPk(trip_id);
  if (!trip) {
    throw new ApiError(404, `Trip '${trip_id}' not found.`);
  }

  if (!['Draft', 'Dispatched'].includes(trip.status)) {
    throw new ApiError(
      400,
      `Trip cannot be cancelled. Current status is '${trip.status}'. Only Draft or Dispatched trips can be cancelled.`
    );
  }

  const wasDispatched = trip.status === 'Dispatched';

  if (wasDispatched) {
    // Atomic transaction for cancelling a dispatched trip
    const t = await sequelize.transaction();
    try {
      await Trip.update({ status: 'Cancelled' }, { where: { trip_id }, transaction: t });

      await Vehicle.update(
        { status: 'Available' },
        { where: { registration_number: trip.vehicle_reg }, transaction: t }
      );

      await Driver.update(
        { status: 'Available' },
        { where: { driver_id: trip.driver_id }, transaction: t }
      );

      await t.commit();
    } catch (err) {
      await t.rollback();
      throw err;
    }
  } else {
    // Draft cancellation - only update the trip
    await Trip.update({ status: 'Cancelled' }, { where: { trip_id } });
  }

  const updatedTrip = await Trip.findByPk(trip_id);
  return ApiResponse.success(
    res,
    200,
    updatedTrip,
    wasDispatched
      ? 'Dispatched trip cancelled. Vehicle and driver statuses restored.'
      : 'Draft trip cancelled.'
  );
});

module.exports = {
  getTrips,
  getTripById,
  createTrip,
  dispatchTrip,
  completeTrip,
  cancelTrip,
};
