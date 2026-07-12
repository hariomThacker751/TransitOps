const express = require('express');
const router = express.Router();
const {
  getDashboardKPIs,
  getDashboardFilters,
  getDashboardCharts,
} = require('../controllers/dashboardController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

// Dashboard endpoints — all authenticated roles
router.get('/kpis', getDashboardKPIs);
router.get('/filters', getDashboardFilters);
router.get('/charts', getDashboardCharts);

module.exports = router;
