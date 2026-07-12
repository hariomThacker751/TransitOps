const express = require('express');
const router = express.Router();
const {
  getTrips,
  getTripById,
  createTrip,
  dispatchTrip,
  completeTrip,
  cancelTrip,
} = require('../controllers/tripController');
const authMiddleware = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/roleMiddleware');
const validateRequest = require('../middlewares/validateRequest');
const { createTripValidator, completeTripValidator } = require('../validators/tripValidator');

router.use(authMiddleware);

// GET /api/trips
router.get('/', getTrips);

// GET /api/trips/:trip_id
router.get('/:trip_id', getTripById);

// POST /api/trips — fleet_manager, driver
router.post(
  '/',
  requireRole('fleet_manager', 'driver'),
  createTripValidator,
  validateRequest,
  createTrip
);

// PATCH /api/trips/:trip_id/dispatch
router.patch(
  '/:trip_id/dispatch',
  requireRole('fleet_manager', 'driver'),
  dispatchTrip
);

// PATCH /api/trips/:trip_id/complete
router.patch(
  '/:trip_id/complete',
  requireRole('fleet_manager', 'driver'),
  completeTripValidator,
  validateRequest,
  completeTrip
);

// PATCH /api/trips/:trip_id/cancel
router.patch(
  '/:trip_id/cancel',
  requireRole('fleet_manager', 'driver'),
  cancelTrip
);

module.exports = router;
