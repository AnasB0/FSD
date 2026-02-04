const express = require('express');
const Joi = require('joi');
const User = require('../models/User');
const Session = require('../models/Session');
const { hashPassword, comparePassword } = require('../utils/password');
const { generateAccessToken, generateRefreshToken, verifyToken, getRefreshTokenExpiry } = require('../utils/jwt');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

const registerSchema = Joi.object({
  username: Joi.string().min(3).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  role: Joi.string().valid('ADMIN', 'MERCHANT', 'DRIVER').default('DRIVER'),
  merchantId: Joi.string().allow(null, '')
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

const refreshSchema = Joi.object({
  refreshToken: Joi.string().required()
});

router.post('/register', async (req, res, next) => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: req.language === 'ar' ? 'بيانات غير صالحة' : 'Invalid input',
        errors: error.details.map(d => d.message)
      });
    }

    const existingUser = await User.findOne({
      $or: [{ email: value.email }, { username: value.username }]
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: req.language === 'ar' ? 'المستخدم موجود بالفعل' : 'User already exists'
      });
    }

    const passwordHash = await hashPassword(value.password);
    
    const user = new User({
      username: value.username,
      email: value.email,
      passwordHash,
      role: value.role || 'DRIVER',
      merchantId: value.merchantId || null
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: req.language === 'ar' ? 'تم إنشاء المستخدم بنجاح' : 'User created successfully',
      data: {
        user: user.toJSON()
      }
    });
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: req.language === 'ar' ? 'بيانات غير صالحة' : 'Invalid input',
        errors: error.details.map(d => d.message)
      });
    }

    const user = await User.findOne({ email: value.email });

    if (!user || user.status !== 'ACTIVE') {
      return res.status(401).json({
        success: false,
        message: req.language === 'ar' ? 'بيانات اعتماد غير صالحة' : 'Invalid credentials'
      });
    }

    const isValidPassword = await comparePassword(value.password, user.passwordHash);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: req.language === 'ar' ? 'بيانات اعتماد غير صالحة' : 'Invalid credentials'
      });
    }

    const payload = {
      userId: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      merchantId: user.merchantId
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    const session = new Session({
      userId: user._id,
      refreshToken,
      expiresAt: getRefreshTokenExpiry(),
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent']
    });

    await session.save();

    res.json({
      success: true,
      message: req.language === 'ar' ? 'تم تسجيل الدخول بنجاح' : 'Login successful',
      data: {
        user: user.toJSON(),
        accessToken,
        refreshToken
      }
    });
  } catch (err) {
    next(err);
  }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const { error, value } = refreshSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: req.language === 'ar' ? 'بيانات غير صالحة' : 'Invalid input',
        errors: error.details.map(d => d.message)
      });
    }

    let decoded;
    try {
      decoded = verifyToken(value.refreshToken, 'refresh');
    } catch (tokenError) {
      return res.status(401).json({
        success: false,
        message: req.language === 'ar' ? 'رمز منتهي الصلاحية أو غير صالح' : tokenError.message
      });
    }
    
    const session = await Session.findOne({
      refreshToken: value.refreshToken,
      userId: decoded.userId
    });

    if (!session || session.expiresAt < new Date()) {
      return res.status(401).json({
        success: false,
        message: req.language === 'ar' ? 'الجلسة منتهية الصلاحية' : 'Session expired'
      });
    }

    const user = await User.findById(decoded.userId);

    if (!user || user.status !== 'ACTIVE') {
      return res.status(401).json({
        success: false,
        message: req.language === 'ar' ? 'مستخدم غير صالح' : 'Invalid user'
      });
    }

    const payload = {
      userId: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      merchantId: user.merchantId
    };

    const accessToken = generateAccessToken(payload);
    const newRefreshToken = generateRefreshToken(payload);

    await Session.deleteOne({ _id: session._id });

    const newSession = new Session({
      userId: user._id,
      refreshToken: newRefreshToken,
      expiresAt: getRefreshTokenExpiry(),
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent']
    });

    await newSession.save();

    res.json({
      success: true,
      message: req.language === 'ar' ? 'تم تجديد الرمز بنجاح' : 'Token refreshed successfully',
      data: {
        accessToken,
        refreshToken: newRefreshToken
      }
    });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', authMiddleware, async (req, res, next) => {
  try {
    const refreshToken = req.body.refreshToken;

    if (refreshToken) {
      await Session.deleteOne({ refreshToken, userId: req.user.userId });
    }

    res.json({
      success: true,
      message: req.language === 'ar' ? 'تم تسجيل الخروج بنجاح' : 'Logout successful'
    });
  } catch (err) {
    next(err);
  }
});

router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: req.language === 'ar' ? 'المستخدم غير موجود' : 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        user: user.toJSON()
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
