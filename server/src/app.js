const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')

const { errorHandler } = require('./middlewares/errorHandler')
const routes = require('./routes')

function createApp() {
  const app = express()

  app.use(helmet())
  app.use(
    cors({
      origin: (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map((s) => s.trim()),
      credentials: true,
    }),
  )
  app.use(express.json())
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'))

  // Health check (public).
  app.get('/api/health', (_req, res) =>
    res.json({ success: true, message: 'TransitOps API is running' }),
  )

  // API routes.
  app.use('/api', routes)

  // 404 for unknown API routes.
  app.use((req, _res, next) => {
    const ApiError = require('./utils/ApiError')
    next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found.`))
  })

  // Centralized error handler (must be last).
  app.use(errorHandler)

  return app
}

module.exports = createApp