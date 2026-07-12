const express = require('express');
const router = express.Router();
const { getFuelLogs, createFuelLog } = require('../controllers/fuelLogController');
const authMiddleware = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/roleMiddleware');
const validateRequest = require('../middlewares/validateRequest');
const { fuelLogValidator } = require('../validators/tripValidator');

router.use(authMiddleware);

// GET /api/fuel-logs — all roles
router.get('/', getFuelLogs);

// POST /api/fuel-logs — fleet_manager, driver
router.post(
  '/',
  requireRole('fleet_manager', 'driver'),
  fuelLogValidator,
  validateRequest,
  createFuelLog
);

module.exports = router;
