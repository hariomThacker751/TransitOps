const { body } = require('express-validator')

const DRIVER_STATUSES = ['Available', 'On Trip', 'Off Duty', 'Suspended']

const createDriverRules = [
  body('driver_id')
    .isString()
    .trim()
    .isLength({ min: 1, max: 20 })
    .withMessage('driver_id is required (max 20 chars).'),
  body('name').isString().trim().isLength({ min: 1, max: 100 }).withMessage('name is required.'),
  body('license_number')
    .isString()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('license_number is required.'),
  body('license_category').optional().isString().trim().isLength({ max: 30 }),
  body('license_expiry_date')
    .isISO8601({ strict: true })
    .withMessage('license_expiry_date must be a valid YYYY-MM-DD date.'),
  body('contact_number').optional().isString().trim().isLength({ max: 30 }),
  body('safety_score')
    .isInt({ min: 0, max: 100 })
    .withMessage('safety_score must be an integer between 0 and 100.'),
  body('status')
    .optional()
    .isIn(DRIVER_STATUSES)
    .withMessage(`status must be one of: ${DRIVER_STATUSES.join(', ')}.`),
]

const updateDriverRules = [
  body('name').optional().isString().trim().isLength({ min: 1, max: 100 }),
  body('license_number').optional().isString().trim().isLength({ min: 1, max: 50 }),
  body('license_category').optional().isString().trim().isLength({ max: 30 }),
  body('license_expiry_date')
    .optional()
    .isISO8601({ strict: true })
    .withMessage('license_expiry_date must be a valid YYYY-MM-DD date.'),
  body('contact_number').optional().isString().trim().isLength({ max: 30 }),
  body('safety_score').optional().isInt({ min: 0, max: 100 }).withMessage('safety_score must be 0-100.'),
  body('status')
    .optional()
    .isIn(DRIVER_STATUSES)
    .withMessage(`status must be one of: ${DRIVER_STATUSES.join(', ')}.`),
]

/** Safety Officer may only touch safety_score and status. */
const safetyOfficerFields = ['safety_score', 'status']

module.exports = { createDriverRules, updateDriverRules, safetyOfficerFields, DRIVER_STATUSES }