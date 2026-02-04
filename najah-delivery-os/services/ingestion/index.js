/**
 * Najah Delivery OS - Ingestion/Webhooks Service
 * 
 * This service handles incoming webhook requests from merchants with:
 * - HMAC signature verification for security
 * - Request validation and sanitization
 * - Webhook event logging and retry tracking
 * - Asynchronous order normalization triggering
 * 
 * Security Features:
 * - Helmet for security headers
 * - CORS protection
 * - Rate limiting per IP
 * - Request ID tracking
 * - JSON-based structured logging
 */

require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const mongoose = require('mongoose');
const logger = require('./config/logger');
const requestId = require('./middleware/requestId');
const errorHandler = require('./middleware/errorHandler');
const i18n = require('./middleware/i18n');

// Import routes
const healthRoutes = require('./routes/health');
const webhookRoutes = require('./routes/webhooks');

const app = express();
const PORT = process.env.PORT || 3001;

// ============================================================================
// Database Connection
// ============================================================================

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  logger.info('MongoDB connected successfully', {
    database: process.env.MONGODB_URI.split('@')[1] || 'local'
  });
})
.catch((err) => {
  logger.error('MongoDB connection error', {
    error: err.message,
    stack: err.stack
  });
  process.exit(1);
});

// ============================================================================
// Security Middleware
// ============================================================================

// Helmet: Sets various HTTP headers for security
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
}));

// CORS: Configure cross-origin resource sharing
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'x-merchant-signature', 'x-merchant-id', 'Accept-Language'],
  credentials: false
}));

// Rate Limiting: Prevent abuse by limiting requests per IP
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: 'Check the Retry-After header for wait time'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      requestId: req.id
    });
    res.status(429).json({
      error: 'Too many requests',
      message: 'You have exceeded the rate limit. Please try again later.',
      retryAfter: res.getHeader('Retry-After')
    });
  }
});

app.use('/webhooks', limiter);

// ============================================================================
// Request Processing Middleware
// ============================================================================

// Request ID: Assign unique ID to each request for tracking
app.use(requestId);

// Body Parser: Parse JSON payloads with size limit
app.use(express.json({ 
  limit: '10mb',
  strict: true 
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb' 
}));

// Internationalization: Handle Accept-Language header
app.use(i18n);

// HTTP Request Logging with Morgan
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim())
    }
  }));
}

// Log all incoming requests with structured data
app.use((req, res, next) => {
  logger.info('Incoming request', {
    requestId: req.id,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    contentType: req.get('content-type')
  });
  next();
});

// ============================================================================
// Routes
// ============================================================================

app.use('/health', healthRoutes);
app.use('/webhooks', webhookRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Najah Delivery OS - Ingestion Service',
    version: '1.0.0',
    status: 'operational',
    endpoints: {
      health: '/health',
      webhooks: '/webhooks/:merchantId/orders'
    },
    documentation: '/api-docs'
  });
});

// 404 handler for undefined routes
app.use((req, res) => {
  logger.warn('Route not found', {
    requestId: req.id,
    method: req.method,
    path: req.path
  });
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    requestId: req.id
  });
});

// ============================================================================
// Error Handling
// ============================================================================

app.use(errorHandler);

// ============================================================================
// Server Initialization
// ============================================================================

// Graceful shutdown handler
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received, starting graceful shutdown`);
  
  server.close(async () => {
    logger.info('HTTP server closed');
    
    try {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed');
      process.exit(0);
    } catch (err) {
      logger.error('Error during graceful shutdown', {
        error: err.message,
        stack: err.stack
      });
      process.exit(1);
    }
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

// Handle process signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', {
    error: err.message,
    stack: err.stack
  });
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', {
    reason: reason,
    promise: promise
  });
  process.exit(1);
});

// Start server
const server = app.listen(PORT, () => {
  logger.info(`Ingestion service started`, {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version
  });
});

module.exports = app;
