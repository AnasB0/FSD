require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/database');
const logger = require('./config/logger');
const requestId = require('./middleware/requestId');
const i18n = require('./middleware/i18n');
const errorHandler = require('./middleware/errorHandler');

const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/auth');
const merchantRoutes = require('./routes/merchants');
const orderRoutes = require('./routes/orders');
const courierRoutes = require('./routes/couriers');
const routePlanRoutes = require('./routes/routePlans');
const trackingRoutes = require('./routes/tracking');
const assistantRoutes = require('./routes/assistant');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

connectDB();

if (process.env.HELMET_ENABLED !== 'false') {
  app.use(helmet());
}

const corsOptions = {
  origin: process.env.CORS_ORIGIN?.split(',') || '*',
  credentials: process.env.CORS_CREDENTIALS === 'true',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept-Language', 'X-Request-ID']
};
app.use(cors(corsOptions));

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

app.use(requestId);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const morganFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(morgan(morganFormat, {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

app.use(i18n);

const apiPrefix = process.env.API_PREFIX || '/api/v1';

app.use(`${apiPrefix}/health`, healthRoutes);
app.use(`${apiPrefix}/auth`, authRoutes);
app.use(`${apiPrefix}/merchants`, merchantRoutes);
app.use(`${apiPrefix}/orders`, orderRoutes);
app.use(`${apiPrefix}/couriers`, courierRoutes);
app.use(`${apiPrefix}/route-plans`, routePlanRoutes);
app.use(`${apiPrefix}/tracking`, trackingRoutes);
app.use(`${apiPrefix}/assistant`, assistantRoutes);

app.get('/', (req, res) => {
  res.json({
    service: 'Najah Delivery API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: `${apiPrefix}/health`,
      auth: `${apiPrefix}/auth`,
      merchants: `${apiPrefix}/merchants`,
      orders: `${apiPrefix}/orders`,
      couriers: `${apiPrefix}/couriers`,
      routePlans: `${apiPrefix}/route-plans`,
      tracking: `${apiPrefix}/tracking`,
      assistant: `${apiPrefix}/assistant`
    }
  });
});

app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    message: 'The requested resource does not exist',
    path: req.originalUrl
  });
});

app.use(errorHandler);

if (process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1);
}

const server = app.listen(PORT, HOST, () => {
  logger.info(`Server running on ${HOST}:${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`API Prefix: ${apiPrefix}`);
});

const gracefulShutdown = (signal) => {
  logger.info(`${signal} received, starting graceful shutdown`);
  
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });

  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

module.exports = app;
