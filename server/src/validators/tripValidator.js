const { body } = require('express-validator')

const createTripRules = [
  body('source').isString().trim().isLength({ min: 1, max: 100 }).withMessage('source is required.'),
  body('destination').isString().trim().isLength({ min: 1, max: 100 }).withMessage('destination is required.'),
  body('vehicle_reg').isString().trim().isLength({ min: 1, max: 20 }).withMessage('vehicle_reg is required.'),
  body('driver_id').isString().trim().isLength({ min: 1, max: 20 }).withMessage('driver_id is required.'),
  body('cargo_weight_kg')
    .isFloat({ gt: 0 })
    .withMessage('cargo_weight_kg must be a positive number.'),
  body('planned_distance_km')
    .isFloat({ gt: 0 })
    .withMessage('planned_distance_km must be a positive number.'),
  body('revenue').optional().isFloat({ min: 0 }).withMessage('revenue must be >= 0.'),
]

const completeTripRules = [
  body('actual_distance_km')
    .isFloat({ gt: 0 })
    .withMessage('actual_distance_km must be a positive number.'),
  body('fuel_consumed_liters')
    .isFloat({ gt: 0 })
    .withMessage('fuel_consumed_liters must be a positive number.'),
  body('revenue').optional().isFloat({ min: 0 }).withMessage('revenue must be >= 0.'),
]

module.exports = { createTripRules, completeTripRules }