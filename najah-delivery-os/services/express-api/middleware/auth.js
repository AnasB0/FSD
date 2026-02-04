const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: req.t('error.unauthorized'),
        message: 'No token provided'
      });
    }
    
    const token = authHeader.substring(7);
    
    const decoded = jwt.verify(token, JWT_SECRET);
    
    req.user = {
      id: decoded.userId || decoded.id,
      email: decoded.email,
      role: decoded.role,
      merchantId: decoded.merchantId
    };
    
    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    return res.status(401).json({ 
      error: req.t('error.invalidToken'),
      message: 'Invalid or expired token'
    });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: req.t('error.unauthorized')
      });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: req.t('error.forbidden'),
        message: 'Insufficient permissions'
      });
    }
    
    next();
  };
}

module.exports = { authMiddleware, requireRole };
