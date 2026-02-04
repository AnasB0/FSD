require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const logger = require('./utils/logger');
const i18n = require('./middleware/i18n');

const app = express();
const PORT = process.env.EXPRESS_API_PORT || 8080;

// ============================================
// Middleware
// ============================================

// Security headers
app.use(helmet());

// CORS
const corsOptions = {
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
  credentials: true,
};
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Request ID
app.use((req, res, next) => {
  req.id = uuidv4();
  res.setHeader('X-Request-ID', req.id);
  next();
});

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// HTTP request logging
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

// i18n middleware
app.use(i18n);

// ============================================
// Database Connection
// ============================================

mongoose.connect(process.env.MONGO_URI || 'mongodb://mongo:27017/najah_delivery', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => logger.info('Connected to MongoDB'))
  .catch((err) => logger.error('MongoDB connection error:', err));

// ============================================
// Routes
// ============================================

// Health check (no auth)
app.get('/health', (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  };
  res.json(health);
});

// API routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/assistant', require('./routes/assistant'));
app.use('/api/merchants', require('./routes/merchants'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/couriers', require('./routes/couriers'));
app.use('/api/route-plans', require('./routes/routePlans'));
app.use('/api/tracking', require('./routes/tracking'));
app.use('/api/webhooks', require('./routes/webhooks'));

// API docs route (serves OpenAPI spec)
app.get('/api-docs', (req, res) => {
  res.json(require('./openapi.json'));
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: req.t ? req.t('errors.notFound') : 'Not found',
    requestId: req.id
  });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('Error:', {
    requestId: req.id,
    error: err.message,
    stack: err.stack,
  });

  res.status(err.status || 500).json({
    error: err.message || (req.t ? req.t('errors.internal') : 'Internal server error'),
    requestId: req.id,
  });
});

// ============================================
// Server Start
// ============================================

if (require.main === module) {
  app.listen(PORT, () => {
    logger.info(`Express API server running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

module.exports = app;
