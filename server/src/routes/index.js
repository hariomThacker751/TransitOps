const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const vehicleRoutes = require('./vehicleRoutes');
const driverRoutes = require('./driverRoutes');
const tripRoutes = require('./tripRoutes');
const maintenanceRoutes = require('./maintenanceRoutes');
const fuelLogRoutes = require('./fuelLogRoutes');
const expenseRoutes = require('./expenseRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const reportRoutes = require('./reportRoutes');

// Health check
router.get('/health', (req, res) => {
  res.json({ success: true, message: 'TransitOps API is running' });
});

// Mount routes
router.use('/auth', authRoutes);
router.use('/vehicles', vehicleRoutes);
router.use('/drivers', driverRoutes);
router.use('/trips', tripRoutes);
router.use('/maintenance', maintenanceRoutes);
router.use('/fuel-logs', fuelLogRoutes);
router.use('/expenses', expenseRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/reports', reportRoutes);

module.exports = router;
