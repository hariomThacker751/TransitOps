require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { connectDB, sequelize } = require('./config/db');
const routes = require('./routes/index');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

// ────────────────────────────────────────────────────────────────
// 1. Connect to Database
// ────────────────────────────────────────────────────────────────
connectDB();

// ────────────────────────────────────────────────────────────────
// 2. Security & Utility Middleware
// ────────────────────────────────────────────────────────────────
app.use(helmet());

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ────────────────────────────────────────────────────────────────
// 3. API Routes
// ────────────────────────────────────────────────────────────────
app.use('/api', routes);

// ────────────────────────────────────────────────────────────────
// 4. 404 Handler for undefined routes
// ────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// ────────────────────────────────────────────────────────────────
// 5. Global Error Handler (must be last middleware)
// ────────────────────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
