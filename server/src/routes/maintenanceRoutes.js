const express = require('express');
const router = express.Router();
const {
  getMaintenanceLogs,
  createMaintenanceLog,
  closeMaintenanceLog,
} = require('../controllers/maintenanceController');
const authMiddleware = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/roleMiddleware');
const validateRequest = require('../middlewares/validateRequest');
const { maintenanceValidator, closeMaintenanceValidator } = require('../validators/tripValidator');

router.use(authMiddleware);

// GET /api/maintenance — all roles
router.get('/', getMaintenanceLogs);

// POST /api/maintenance — fleet_manager, safety_officer
router.post(
  '/',
  requireRole('fleet_manager', 'safety_officer'),
  maintenanceValidator,
  validateRequest,
  createMaintenanceLog
);

// PATCH /api/maintenance/:maintenance_id/close — fleet_manager, safety_officer
router.patch(
  '/:maintenance_id/close',
  requireRole('fleet_manager', 'safety_officer'),
  closeMaintenanceValidator,
  validateRequest,
  closeMaintenanceLog
);

module.exports = router;
