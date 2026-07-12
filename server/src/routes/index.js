const express = require('express')
const authRoutes = require('./authRoutes')
const vehicleRoutes = require('./vehicleRoutes')
const driverRoutes = require('./driverRoutes')
const tripRoutes = require('./tripRoutes')
const maintenanceRoutes = require('./maintenanceRoutes')
const fuelLogRoutes = require('./fuelLogRoutes')
const expenseRoutes = require('./expenseRoutes')
const dashboardRoutes = require('./dashboardRoutes')

const router = express.Router()

router.use('/auth', authRoutes)
router.use('/vehicles', vehicleRoutes)
router.use('/drivers', driverRoutes)
router.use('/trips', tripRoutes)
router.use('/maintenance', maintenanceRoutes)
router.use('/fuel-logs', fuelLogRoutes)
router.use('/expenses', expenseRoutes)
router.use('/dashboard', dashboardRoutes)
router.use('/reports', require('./reportRoutes'))

module.exports = router