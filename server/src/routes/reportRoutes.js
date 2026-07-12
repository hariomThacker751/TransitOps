const express = require('express')
const { auth } = require('../middlewares/authMiddleware')
const { requireRole } = require('../middlewares/roleMiddleware')
const reportController = require('../controllers/reportController')

const router = express.Router()

router.use(auth)

router.get('/vehicle-costs', reportController.vehicleCosts)
router.get('/roi', reportController.roi)
router.get('/fuel-efficiency', reportController.fuelEfficiency)
router.get('/export/csv', requireRole('fleet_manager', 'safety_officer', 'financial_analyst'), reportController.exportCsv)

module.exports = router