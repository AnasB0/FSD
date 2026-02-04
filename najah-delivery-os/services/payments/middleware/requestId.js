const crypto = require('crypto');

// Request ID middleware for tracing requests across services
module.exports = (req, res, next) => {
  // Use existing request ID from header or generate new one
  req.id = req.headers['x-request-id'] || crypto.randomUUID();
  
  // Add request ID to response headers
  res.setHeader('X-Request-ID', req.id);
  
  next();
};
