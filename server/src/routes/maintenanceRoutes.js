const express = require('express')
const { auth } = require('../middlewares/authMiddleware')
const { requireRole } = require('../middlewares/roleMiddleware')
const { validateRequest } = require('../middlewares/validateRequest')
const maintenanceController = require('../controllers/maintenanceController')

const router = express.Router()

router.use(auth)

router.get('/', maintenanceController.list)
router.post(
  '/',
  requireRole('fleet_manager', 'safety_officer'),
  maintenanceController.createRules,
  validateRequest,
  maintenanceController.create,
)
router.patch(
  '/:maintenance_id/close',
  requireRole('fleet_manager', 'safety_officer'),
  maintenanceController.closeRules,
  validateRequest,
  maintenanceController.close,
)

module.exports = router