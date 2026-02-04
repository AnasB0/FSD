const jwt = require('jsonwebtoken');
const logger = require('../config/logger');

// STUB: JWT verification middleware
// In production, this would verify tokens issued by the auth service
module.exports = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'No token provided'
        }
      });
    }

    const token = authHeader.substring(7);

    // STUB: In production, verify with proper JWT secret from env
    // For now, we'll accept any token in development mode
    if (process.env.NODE_ENV === 'development' && token === 'stub-token') {
      req.user = {
        id: 'stub-user-id',
        role: 'merchant',
        merchantId: 'stub-merchant-id'
      };
      return next();
    }

    // Attempt real JWT verification
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret-change-in-production');
    req.user = decoded;

    logger.debug('Token verified', {
      userId: req.user.id,
      requestId: req.id
    });

    next();
  } catch (error) {
    logger.warn('Token verification failed', {
      error: error.message,
      requestId: req.id
    });

    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired token'
      }
    });
  }
};
