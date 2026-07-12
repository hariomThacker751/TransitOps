const express = require('express')
const { auth } = require('../middlewares/authMiddleware')
const { requireRole } = require('../middlewares/roleMiddleware')
const { validateRequest } = require('../middlewares/validateRequest')
const { createDriverRules, updateDriverRules } = require('../validators/driverValidator')
const driverController = require('../controllers/driverController')

const router = express.Router()

router.use(auth)

// Static/special route before the :driver_id param route.
router.get('/eligible-for-dispatch', driverController.eligibleForDispatch)

router.get('/', driverController.list)
router.get('/:driver_id', driverController.get)
router.post('/', requireRole('fleet_manager'), createDriverRules, validateRequest, driverController.create)
router.put(
  '/:driver_id',
  requireRole('fleet_manager', 'safety_officer'),
  updateDriverRules,
  validateRequest,
  driverController.update,
)

module.exports = router