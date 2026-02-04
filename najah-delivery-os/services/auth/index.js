require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const winston = require('winston');

const requestIdMiddleware = require('./middleware/requestId');
const i18nMiddleware = require('./middleware/i18n');
const errorHandler = require('./middleware/errorHandler');
const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3001;

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/najah-delivery-auth')
  .then(() => logger.info('MongoDB connected successfully'))
  .catch(err => {
    logger.error('MongoDB connection error:', err);
    process.exit(1);
  });

app.use(helmet());

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

app.use(limiter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(requestIdMiddleware);
app.use(i18nMiddleware);

app.use(morgan((tokens, req, res) => {
  return JSON.stringify({
    requestId: req.id,
    method: tokens.method(req, res),
    url: tokens.url(req, res),
    status: tokens.status(req, res),
    responseTime: tokens['response-time'](req, res) + 'ms',
    contentLength: tokens.res(req, res, 'content-length'),
    userAgent: tokens['user-agent'](req, res),
    ip: req.ip
  });
}));

app.use('/health', healthRoutes);
app.use('/auth', authRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: req.language === 'ar' ? 'المسار غير موجود' : 'Route not found'
  });
});

app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`Auth service listening on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
