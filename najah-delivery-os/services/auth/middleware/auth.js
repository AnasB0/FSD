const { verifyToken } = require('../utils/jwt');
const User = require('../models/User');

async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: req.language === 'ar' ? 'غير مصرح' : 'Unauthorized',
        error: 'No token provided'
      });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token, 'access');
    
    const user = await User.findById(decoded.userId);
    
    if (!user || user.status !== 'ACTIVE') {
      return res.status(401).json({
        success: false,
        message: req.language === 'ar' ? 'غير مصرح' : 'Unauthorized',
        error: 'Invalid token or user inactive'
      });
    }

    req.user = {
      userId: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      merchantId: user.merchantId
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: req.language === 'ar' ? 'غير مصرح' : 'Unauthorized',
      error: error.message
    });
  }
}

module.exports = authMiddleware;
