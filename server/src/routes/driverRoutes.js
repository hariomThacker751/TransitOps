const express = require('express');
const router = express.Router();
const {
  getDrivers,
  getDriverById,
  getEligibleDrivers,
  createDriver,
  updateDriver,
} = require('../controllers/driverController');
const authMiddleware = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/roleMiddleware');
const validateRequest = require('../middlewares/validateRequest');
const { createDriverValidator, updateDriverValidator } = require('../validators/driverValidator');

router.use(authMiddleware);

// GET /api/drivers/eligible-for-dispatch — MUST be before /:driver_id
router.get('/eligible-for-dispatch', getEligibleDrivers);

// GET /api/drivers
router.get('/', getDrivers);

// GET /api/drivers/:driver_id
router.get('/:driver_id', getDriverById);

// POST /api/drivers — fleet_manager only
router.post(
  '/',
  requireRole('fleet_manager'),
  createDriverValidator,
  validateRequest,
  createDriver
);

// PUT /api/drivers/:driver_id
// fleet_manager: full update
// safety_officer: can only update status and safety_score (enforced in controller)
router.put(
  '/:driver_id',
  requireRole('fleet_manager', 'safety_officer'),
  updateDriverValidator,
  validateRequest,
  updateDriver
);

module.exports = router;
