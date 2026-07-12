const { body } = require('express-validator');

const createTripValidator = [
  body('trip_id')
    .optional()
    .isLength({ max: 20 }).withMessage('trip_id must be at most 20 characters.'),

  body('source')
    .notEmpty().withMessage('source is required.')
    .isLength({ max: 100 }).withMessage('source must be at most 100 characters.'),

  body('destination')
    .notEmpty().withMessage('destination is required.')
    .isLength({ max: 100 }).withMessage('destination must be at most 100 characters.'),

  body('vehicle_reg')
    .notEmpty().withMessage('vehicle_reg is required.')
    .isLength({ max: 20 }).withMessage('vehicle_reg must be at most 20 characters.'),

  body('driver_id')
    .notEmpty().withMessage('driver_id is required.')
    .isLength({ max: 20 }).withMessage('driver_id must be at most 20 characters.'),

  body('cargo_weight_kg')
    .notEmpty().withMessage('cargo_weight_kg is required.')
    .isFloat({ gt: 0 }).withMessage('cargo_weight_kg must be a positive number.'),

  body('planned_distance_km')
    .notEmpty().withMessage('planned_distance_km is required.')
    .isFloat({ gt: 0 }).withMessage('planned_distance_km must be a positive number.'),

  body('revenue')
    .optional()
    .isFloat({ min: 0 }).withMessage('revenue must be >= 0.'),

  body('created_date')
    .optional()
    .isISO8601().withMessage('created_date must be a valid date (YYYY-MM-DD).'),
];

const completeTripValidator = [
  body('actual_distance_km')
    .notEmpty().withMessage('actual_distance_km is required.')
    .isFloat({ gt: 0 }).withMessage('actual_distance_km must be a positive number.'),

  body('fuel_consumed_liters')
    .notEmpty().withMessage('fuel_consumed_liters is required.')
    .isFloat({ gt: 0 }).withMessage('fuel_consumed_liters must be a positive number.'),

  body('revenue')
    .optional()
    .isFloat({ min: 0 }).withMessage('revenue must be >= 0.'),
];

const maintenanceValidator = [
  body('vehicle_reg')
    .notEmpty().withMessage('vehicle_reg is required.'),

  body('maintenance_type')
    .notEmpty().withMessage('maintenance_type is required.')
    .isLength({ max: 100 }).withMessage('maintenance_type must be at most 100 characters.'),

  body('cost')
    .notEmpty().withMessage('cost is required.')
    .isFloat({ min: 0 }).withMessage('cost must be >= 0.'),

  body('start_date')
    .notEmpty().withMessage('start_date is required.')
    .isISO8601().withMessage('start_date must be a valid date (YYYY-MM-DD).'),
];

const closeMaintenanceValidator = [
  body('end_date')
    .notEmpty().withMessage('end_date is required.')
    .isISO8601().withMessage('end_date must be a valid date (YYYY-MM-DD).'),
];

const fuelLogValidator = [
  body('vehicle_reg')
    .notEmpty().withMessage('vehicle_reg is required.'),

  body('liters')
    .notEmpty().withMessage('liters is required.')
    .isFloat({ gt: 0 }).withMessage('liters must be a positive number.'),

  body('cost')
    .notEmpty().withMessage('cost is required.')
    .isFloat({ min: 0 }).withMessage('cost must be >= 0.'),

  body('date')
    .notEmpty().withMessage('date is required.')
    .isISO8601().withMessage('date must be a valid date (YYYY-MM-DD).'),

  body('trip_id')
    .optional()
    .isLength({ max: 20 }).withMessage('trip_id must be at most 20 characters.'),
];

const expenseValidator = [
  body('vehicle_reg')
    .notEmpty().withMessage('vehicle_reg is required.'),

  body('expense_type')
    .notEmpty().withMessage('expense_type is required.')
    .isLength({ max: 100 }).withMessage('expense_type must be at most 100 characters.'),

  body('amount')
    .notEmpty().withMessage('amount is required.')
    .isFloat({ min: 0 }).withMessage('amount must be >= 0.'),

  body('date')
    .notEmpty().withMessage('date is required.')
    .isISO8601().withMessage('date must be a valid date (YYYY-MM-DD).'),
];

module.exports = {
  createTripValidator,
  completeTripValidator,
  maintenanceValidator,
  closeMaintenanceValidator,
  fuelLogValidator,
  expenseValidator,
};
