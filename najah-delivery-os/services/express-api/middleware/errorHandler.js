const logger = require('../config/logger');

const errorHandler = (err, req, res, next) => {
  logger.error('Error occurred', {
    error: err.message,
    stack: err.stack,
    requestId: req.id,
    path: req.path,
    method: req.method
  });

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      message: err.message,
      details: err.details || err.errors
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      error: 'Invalid ID',
      message: 'The provided ID is not valid'
    });
  }

  if (err.name === 'MongoServerError' && err.code === 11000) {
    return res.status(409).json({
      error: 'Duplicate Entry',
      message: 'A record with this value already exists'
    });
  }

  if (err.status) {
    return res.status(err.status).json({
      error: err.name || 'Error',
      message: err.message
    });
  }

  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' 
      ? 'An unexpected error occurred' 
      : err.message,
    requestId: req.id
  });
};

module.exports = errorHandler;
