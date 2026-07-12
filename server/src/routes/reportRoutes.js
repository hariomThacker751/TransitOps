const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/roleMiddleware');
const {
  getVehicleCostReport,
  getROIReport,
  getFuelEfficiencyReport,
  exportCSV,
} = require('../controllers/dashboardController');

router.use(authMiddleware);

// Report endpoints — all authenticated roles can read
router.get('/vehicle-costs', getVehicleCostReport);
router.get('/roi', getROIReport);
router.get('/fuel-efficiency', getFuelEfficiencyReport);

// CSV export — fleet_manager, safety_officer, financial_analyst
router.get(
  '/export/csv',
  requireRole('fleet_manager', 'safety_officer', 'financial_analyst'),
  exportCSV
);

module.exports = router;
