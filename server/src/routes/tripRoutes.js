const express = require('express')
const { auth } = require('../middlewares/authMiddleware')
const { requireRole } = require('../middlewares/roleMiddleware')
const { validateRequest } = require('../middlewares/validateRequest')
const { createTripRules, completeTripRules } = require('../validators/tripValidator')
const tripController = require('../controllers/tripController')

const router = express.Router()

router.use(auth)

router.get('/', tripController.list)
router.get('/:trip_id', tripController.get)

router.post(
  '/',
  requireRole('fleet_manager', 'driver'),
  createTripRules,
  validateRequest,
  tripController.create,
)

// Preview eligibility (no mutation) — must precede the dispatch PATCH? No conflict: different paths.
router.get('/:trip_id/validate-dispatch', tripController.validateDispatch)

router.patch('/:trip_id/dispatch', requireRole('fleet_manager', 'driver'), tripController.dispatch)
router.patch(
  '/:trip_id/complete',
  requireRole('fleet_manager', 'driver'),
  completeTripRules,
  validateRequest,
  tripController.complete,
)
router.patch('/:trip_id/cancel', requireRole('fleet_manager', 'driver'), tripController.cancel)

module.exports = router