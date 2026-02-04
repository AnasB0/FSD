require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const logger = require('./utils/logger');
const webhooksRouter = require('./routes/webhooks');

const app = express();
const PORT = process.env.INGESTION_PORT || 8083;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/najah_delivery';

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/webhooks', limiter);

app.use(express.raw({
  type: 'application/json',
  verify: (req, res, buf) => {
    req.rawBody = buf.toString('utf8');
  }
}));

app.use((req, res, next) => {
  if (req.rawBody) {
    try {
      req.body = JSON.parse(req.rawBody);
    } catch (error) {
      logger.error('Failed to parse JSON body', { error: error.message });
      return res.status(400).json({ error: 'Invalid JSON' });
    }
  }
  next();
});

mongoose.connect(MONGO_URI)
  .then(() => {
    logger.info('Connected to MongoDB', { uri: MONGO_URI });
  })
  .catch((error) => {
    logger.error('MongoDB connection error', { error: error.message });
    process.exit(1);
  });

mongoose.connection.on('error', (error) => {
  logger.error('MongoDB error', { error: error.message });
});

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected');
});

app.get('/health', (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  };
  
  const statusCode = health.mongodb === 'connected' ? 200 : 503;
  res.status(statusCode).json(health);
});

app.use('/webhooks', webhooksRouter);

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((error, req, res, next) => {
  logger.error('Unhandled error', { 
    error: error.message,
    stack: error.stack 
  });
  
  res.status(error.status || 500).json({
    error: error.message || 'Internal server error'
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    logger.info(`Ingestion service running on port ${PORT}`);
  });
}

module.exports = app;
