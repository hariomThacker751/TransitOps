const { body } = require('express-validator');

const VEHICLE_STATUSES = ['Available', 'On Trip', 'In Shop', 'Retired'];
const PROTECTED_STATUSES = ['On Trip', 'In Shop'];

const createVehicleValidator = [
  body('registration_number')
    .notEmpty().withMessage('registration_number is required.')
    .isLength({ max: 20 }).withMessage('registration_number must be at most 20 characters.'),

  body('vehicle_name_model')
    .optional()
    .isLength({ max: 150 }).withMessage('vehicle_name_model must be at most 150 characters.'),

  body('type')
    .optional()
    .isLength({ max: 50 }).withMessage('type must be at most 50 characters.'),

  body('max_load_capacity_kg')
    .notEmpty().withMessage('max_load_capacity_kg is required.')
    .isFloat({ gt: 0 }).withMessage('max_load_capacity_kg must be a positive number.'),

  body('odometer_km')
    .optional()
    .isFloat({ min: 0 }).withMessage('odometer_km must be >= 0.'),

  body('acquisition_cost')
    .optional()
    .isFloat({ min: 0 }).withMessage('acquisition_cost must be >= 0.'),

  body('status')
    .optional()
    .isIn(VEHICLE_STATUSES)
    .withMessage(`status must be one of: ${VEHICLE_STATUSES.join(', ')}.`),

  body('region')
    .optional()
    .isLength({ max: 50 }).withMessage('region must be at most 50 characters.'),
];

const updateVehicleValidator = [
  body('vehicle_name_model')
    .optional()
    .isLength({ max: 150 }).withMessage('vehicle_name_model must be at most 150 characters.'),

  body('type')
    .optional()
    .isLength({ max: 50 }).withMessage('type must be at most 50 characters.'),

  body('max_load_capacity_kg')
    .optional()
    .isFloat({ gt: 0 }).withMessage('max_load_capacity_kg must be a positive number.'),

  body('odometer_km')
    .optional()
    .isFloat({ min: 0 }).withMessage('odometer_km must be >= 0.'),

  body('acquisition_cost')
    .optional()
    .isFloat({ min: 0 }).withMessage('acquisition_cost must be >= 0.'),

  body('status')
    .optional()
    .isIn(VEHICLE_STATUSES)
    .withMessage(`status must be one of: ${VEHICLE_STATUSES.join(', ')}.`)
    .custom((value) => {
      if (PROTECTED_STATUSES.includes(value)) {
        throw new Error(
          `Cannot manually set status to '${value}'. This status is set automatically by trip dispatch or maintenance creation.`
        );
      }
      return true;
    }),

  body('region')
    .optional()
    .isLength({ max: 50 }).withMessage('region must be at most 50 characters.'),
];

module.exports = { createVehicleValidator, updateVehicleValidator };
