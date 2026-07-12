const { body } = require('express-validator');

const DRIVER_STATUSES = ['Available', 'On Trip', 'Off Duty', 'Suspended'];

const createDriverValidator = [
  body('driver_id')
    .notEmpty().withMessage('driver_id is required.')
    .isLength({ max: 20 }).withMessage('driver_id must be at most 20 characters.'),

  body('name')
    .notEmpty().withMessage('name is required.')
    .isLength({ max: 100 }).withMessage('name must be at most 100 characters.'),

  body('license_number')
    .notEmpty().withMessage('license_number is required.')
    .isLength({ max: 50 }).withMessage('license_number must be at most 50 characters.'),

  body('license_category')
    .optional()
    .isLength({ max: 30 }).withMessage('license_category must be at most 30 characters.'),

  body('license_expiry_date')
    .notEmpty().withMessage('license_expiry_date is required.')
    .isISO8601().withMessage('license_expiry_date must be a valid date (YYYY-MM-DD).'),

  body('contact_number')
    .optional()
    .isLength({ max: 30 }).withMessage('contact_number must be at most 30 characters.'),

  body('safety_score')
    .optional()
    .isInt({ min: 0, max: 100 }).withMessage('safety_score must be an integer between 0 and 100.'),

  body('status')
    .optional()
    .isIn(DRIVER_STATUSES)
    .withMessage(`status must be one of: ${DRIVER_STATUSES.join(', ')}.`),
];

const updateDriverValidator = [
  body('name')
    .optional()
    .isLength({ max: 100 }).withMessage('name must be at most 100 characters.'),

  body('license_number')
    .optional()
    .isLength({ max: 50 }).withMessage('license_number must be at most 50 characters.'),

  body('license_category')
    .optional()
    .isLength({ max: 30 }).withMessage('license_category must be at most 30 characters.'),

  body('license_expiry_date')
    .optional()
    .isISO8601().withMessage('license_expiry_date must be a valid date (YYYY-MM-DD).'),

  body('contact_number')
    .optional()
    .isLength({ max: 30 }).withMessage('contact_number must be at most 30 characters.'),

  body('safety_score')
    .optional()
    .isInt({ min: 0, max: 100 }).withMessage('safety_score must be an integer between 0 and 100.'),

  body('status')
    .optional()
    .isIn(DRIVER_STATUSES)
    .withMessage(`status must be one of: ${DRIVER_STATUSES.join(', ')}.`),
];

module.exports = { createDriverValidator, updateDriverValidator };
