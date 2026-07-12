const express = require('express')
const { auth } = require('../middlewares/authMiddleware')
const dashboardController = require('../controllers/dashboardController')

const router = express.Router()

router.use(auth)

router.get('/kpis', dashboardController.kpis)
router.get('/filters', dashboardController.filters)
router.get('/charts', dashboardController.charts)

module.exports = router