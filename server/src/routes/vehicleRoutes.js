const express = require('express')
const { auth } = require('../middlewares/authMiddleware')
const { requireRole } = require('../middlewares/roleMiddleware')
const { validateRequest } = require('../middlewares/validateRequest')
const { createVehicleRules, updateVehicleRules } = require('../validators/vehicleValidator')
const vehicleController = require('../controllers/vehicleController')

const router = express.Router()

// All vehicle routes require authentication.
router.use(auth)

// Static/special route must be declared before the :registration_number param route.
router.get('/eligible-for-dispatch', vehicleController.eligibleForDispatch)

router.get('/', vehicleController.list)
router.get('/:registration_number', vehicleController.get)
router.post('/', requireRole('fleet_manager'), createVehicleRules, validateRequest, vehicleController.create)
router.put(
  '/:registration_number',
  requireRole('fleet_manager'),
  updateVehicleRules,
  validateRequest,
  vehicleController.update,
)

module.exports = router