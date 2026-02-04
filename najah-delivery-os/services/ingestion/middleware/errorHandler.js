/**
 * Global Error Handler Middleware
 * 
 * Catches all errors that occur during request processing
 * and returns standardized error responses.
 * 
 * Error Categories:
 * - Validation Errors (400)
 * - Authentication Errors (401)
 * - Authorization Errors (403)
 * - Not Found Errors (404)
 * - Server Errors (500)
 */

const logger = require('../config/logger');

/**
 * Global error handling middleware
 * Must be the last middleware added to the app
 */
const errorHandler = (err, req, res, next) => {
  // Log the error with full context
  logger.error('Request error', {
    requestId: req.id,
    method: req.method,
    path: req.path,
    error: err.message,
    stack: err.stack,
    merchantId: req.params.merchantId
  });

  // Default error response
  let statusCode = err.statusCode || 500;
  let errorResponse = {
    error: err.name || 'INTERNAL_ERROR',
    message: err.message || 'An unexpected error occurred',
    requestId: req.id
  };

  // Handle specific error types
  if (err.name === 'ValidationError') {
    // Mongoose validation error
    statusCode = 400;
    errorResponse.error = 'VALIDATION_ERROR';
    errorResponse.details = Object.values(err.errors).map(e => ({
      field: e.path,
      message: e.message
    }));
  } else if (err.name === 'UnauthorizedError') {
    // JWT authentication error
    statusCode = 401;
    errorResponse.error = 'UNAUTHORIZED';
    errorResponse.message = 'Authentication failed';
  } else if (err.name === 'CastError') {
    // MongoDB cast error (invalid ObjectId)
    statusCode = 400;
    errorResponse.error = 'INVALID_ID';
    errorResponse.message = 'Invalid ID format';
  } else if (err.code === 11000) {
    // MongoDB duplicate key error
    statusCode = 409;
    errorResponse.error = 'DUPLICATE_ENTRY';
    errorResponse.message = 'A record with this data already exists';
  }

  // Don't expose internal error details in production
  if (process.env.NODE_ENV === 'production') {
    delete errorResponse.stack;
    if (statusCode === 500) {
      errorResponse.message = 'An internal error occurred';
    }
  } else {
    // Include stack trace in development for debugging
    errorResponse.stack = err.stack;
  }

  res.status(statusCode).json(errorResponse);
};

module.exports = errorHandler;
