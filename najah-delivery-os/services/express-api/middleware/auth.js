const jwt = require('jsonwebtoken');
const logger = require('../config/logger');

const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ 
      error: 'No token provided',
      message: 'Authentication required'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    logger.warn('Authentication failed', { error: error.message, requestId: req.id });
    return res.status(401).json({ 
      error: 'Invalid token',
      message: 'Authentication failed'
    });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    if (roles.length && !roles.includes(req.user.role)) {
      logger.warn('Authorization failed', { 
        userId: req.user.id, 
        role: req.user.role, 
        requiredRoles: roles,
        requestId: req.id 
      });
      return res.status(403).json({ 
        error: 'Forbidden',
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

module.exports = { authenticate, authorize };
