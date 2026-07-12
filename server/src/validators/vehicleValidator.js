const { body } = require('express-validator')

const VEHICLE_STATUSES = ['Available', 'On Trip', 'In Shop', 'Retired']

const createVehicleRules = [
  body('registration_number')
    .isString()
    .trim()
    .isLength({ min: 1, max: 20 })
    .withMessage('registration_number is required (max 20 chars).'),
  body('vehicle_name_model').optional().isString().trim().isLength({ max: 150 }),
  body('type').optional().isString().trim().isLength({ max: 50 }),
  body('max_load_capacity_kg')
    .isFloat({ gt: 0 })
    .withMessage('max_load_capacity_kg must be greater than 0.'),
  body('odometer_km').optional().isFloat({ min: 0 }).withMessage('odometer_km must be >= 0.'),
  body('acquisition_cost')
    .isFloat({ min: 0 })
    .withMessage('acquisition_cost must be >= 0.'),
  body('status')
    .optional()
    .isIn(VEHICLE_STATUSES)
    .withMessage(`status must be one of: ${VEHICLE_STATUSES.join(', ')}.`),
  body('region').optional().isString().trim().isLength({ max: 50 }),
]

const updateVehicleRules = [
  body('vehicle_name_model').optional().isString().trim().isLength({ max: 150 }),
  body('type').optional().isString().trim().isLength({ max: 50 }),
  body('max_load_capacity_kg')
    .optional()
    .isFloat({ gt: 0 })
    .withMessage('max_load_capacity_kg must be greater than 0.'),
  body('odometer_km').optional().isFloat({ min: 0 }).withMessage('odometer_km must be >= 0.'),
  body('acquisition_cost').optional().isFloat({ min: 0 }).withMessage('acquisition_cost must be >= 0.'),
  body('status')
    .optional()
    .isIn(VEHICLE_STATUSES)
    .withMessage(`status must be one of: ${VEHICLE_STATUSES.join(', ')}.`),
  body('region').optional().isString().trim().isLength({ max: 50 }),
]

module.exports = { createVehicleRules, updateVehicleRules, VEHICLE_STATUSES }