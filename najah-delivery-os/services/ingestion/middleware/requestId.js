/**
 * Request ID Middleware
 * 
 * Generates or extracts a unique identifier for each request.
 * Useful for:
 * - Correlating logs across services
 * - Debugging and tracing requests
 * - Customer support investigations
 * 
 * If x-request-id header is present, it will be used (for request propagation).
 * Otherwise, a new UUID will be generated.
 */

const crypto = require('crypto');

/**
 * Generate a unique request ID
 */
const generateRequestId = () => {
  return crypto.randomUUID();
};

/**
 * Middleware to attach request ID to request object
 */
const requestId = (req, res, next) => {
  // Use existing request ID if provided, otherwise generate new one
  req.id = req.headers['x-request-id'] || generateRequestId();
  
  // Add request ID to response headers for client tracking
  res.setHeader('x-request-id', req.id);
  
  next();
};

module.exports = requestId;
