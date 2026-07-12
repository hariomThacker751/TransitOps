const express = require('express')
const { auth } = require('../middlewares/authMiddleware')
const { requireRole } = require('../middlewares/roleMiddleware')
const { validateRequest } = require('../middlewares/validateRequest')
const expenseController = require('../controllers/expenseController')

const router = express.Router()

router.use(auth)

router.get('/', expenseController.list)
router.post(
  '/',
  requireRole('fleet_manager', 'driver'),
  expenseController.createRules,
  validateRequest,
  expenseController.create,
)

module.exports = router