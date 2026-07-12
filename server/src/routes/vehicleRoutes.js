const express = require('express');
const router = express.Router();
const {
  getVehicles,
  getVehicleById,
  getEligibleVehicles,
  createVehicle,
  updateVehicle,
} = require('../controllers/vehicleController');
const authMiddleware = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/roleMiddleware');
const validateRequest = require('../middlewares/validateRequest');
const { createVehicleValidator, updateVehicleValidator } = require('../validators/vehicleValidator');

// All vehicle routes require authentication
router.use(authMiddleware);

// GET /api/vehicles/eligible-for-dispatch — MUST be before /:registration_number
router.get('/eligible-for-dispatch', getEligibleVehicles);

// GET /api/vehicles
router.get('/', getVehicles);

// GET /api/vehicles/:registration_number
router.get('/:registration_number', getVehicleById);

// POST /api/vehicles — fleet_manager only
router.post(
  '/',
  requireRole('fleet_manager'),
  createVehicleValidator,
  validateRequest,
  createVehicle
);

// PUT /api/vehicles/:registration_number — fleet_manager only
router.put(
  '/:registration_number',
  requireRole('fleet_manager'),
  updateVehicleValidator,
  validateRequest,
  updateVehicle
);

module.exports = router;
