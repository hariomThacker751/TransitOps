const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const User = require('../models/User')
const ApiError = require('../utils/ApiError')
const asyncHandler = require('../utils/asyncHandler')
const { success } = require('../utils/ApiResponse')

function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, driver_id: user.driver_id || null },
    process.env.JWT_SECRET || 'dev_secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' },
  )
}

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) {
    throw ApiError.badRequest('Email and password are required.')
  }

  const user = await User.findByEmail(String(email).toLowerCase().trim())
  if (!user) {
    throw ApiError.unauthorized('Invalid email or password.')
  }

  const match = await bcrypt.compare(password, user.password_hash)
  if (!match) {
    throw ApiError.unauthorized('Invalid email or password.')
  }

  const token = signToken(user)
  const safe = User.toSafe(user)

  return success(res, { token, user: safe }, 'Login successful.')
})

const me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id)
  if (!user) throw ApiError.unauthorized('User no longer exists.')
  return success(res, User.toSafe(user))
})

module.exports = { login, me }