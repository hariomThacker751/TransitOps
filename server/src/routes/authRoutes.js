const express = require('express')
const { body } = require('express-validator')
const { validateRequest } = require('../middlewares/validateRequest')
const { auth } = require('../middlewares/authMiddleware')
const authController = require('../controllers/authController')

const router = express.Router()

router.post(
  '/login',
  [body('email').isEmail().withMessage('A valid email is required.'),
   body('password').isString().notEmpty().withMessage('Password is required.')],
  validateRequest,
  authController.login,
)

router.get('/me', auth, authController.me)

module.exports = router