const express = require('express');
const router = express.Router();
const { getExpenses, createExpense } = require('../controllers/expenseController');
const authMiddleware = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/roleMiddleware');
const validateRequest = require('../middlewares/validateRequest');
const { expenseValidator } = require('../validators/tripValidator');

router.use(authMiddleware);

// GET /api/expenses — all roles
router.get('/', getExpenses);

// POST /api/expenses — fleet_manager, driver
router.post(
  '/',
  requireRole('fleet_manager', 'driver'),
  expenseValidator,
  validateRequest,
  createExpense
);

module.exports = router;
