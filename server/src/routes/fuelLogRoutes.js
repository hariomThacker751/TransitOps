const express = require('express')
const { auth } = require('../middlewares/authMiddleware')
const { requireRole } = require('../middlewares/roleMiddleware')
const { validateRequest } = require('../middlewares/validateRequest')
const fuelLogController = require('../controllers/fuelLogController')

const router = express.Router()

router.use(auth)

router.get('/', fuelLogController.list)
router.post(
  '/',
  requireRole('fleet_manager', 'driver'),
  fuelLogController.createRules,
  validateRequest,
  fuelLogController.create,
)

module.exports = router