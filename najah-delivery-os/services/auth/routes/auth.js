const express = require('express');
const Joi = require('joi');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Session = require('../models/Session');
const authMiddleware = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Validation schemas
const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid('admin', 'merchant', 'driver', 'customer').default('customer'),
  merchantId: Joi.string().when('role', {
    is: Joi.string().valid('merchant', 'driver'),
    then: Joi.required(),
    otherwise: Joi.optional()
  })
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

const refreshSchema = Joi.object({
  refreshToken: Joi.string().required()
});

const logoutSchema = Joi.object({
  refreshToken: Joi.string().required()
});

// Helper function to generate tokens
const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m' }
  );

  const refreshToken = jwt.sign(
    { id: user._id, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' }
  );

  return { accessToken, refreshToken };
};

// POST /auth/register
router.post('/register', async (req, res) => {
  try {
    // Validate request body
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { email, password, role, merchantId } = value;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: req.t('emailExists')
      });
    }

    // Create new user
    const user = new User({
      email,
      password,
      role,
      ...(merchantId && { merchantId })
    });

    await user.save();

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user);

    // Create session
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await Session.create({
      userId: user._id,
      refreshToken,
      expiresAt,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    logger.info(`User registered: ${email}`);

    res.status(201).json({
      success: true,
      message: req.t('userCreated'),
      data: {
        user: user.toJSON(),
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    logger.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: req.t('serverError')
    });
  }
});

// POST /auth/login
router.post('/login', async (req, res) => {
  try {
    // Validate request body
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { email, password } = value;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: req.t('invalidCredentials')
      });
    }

    // Compare password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: req.t('invalidCredentials')
      });
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user);

    // Create session
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await Session.create({
      userId: user._id,
      refreshToken,
      expiresAt,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    logger.info(`User logged in: ${email}`);

    res.json({
      success: true,
      message: req.t('loginSuccess'),
      data: {
        user: user.toJSON(),
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: req.t('serverError')
    });
  }
});

// POST /auth/refresh
router.post('/refresh', async (req, res) => {
  try {
    // Validate request body
    const { error, value } = refreshSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { refreshToken } = value;

    // Verify refresh token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: req.t('refreshTokenInvalid')
      });
    }

    // Check if session exists
    const session = await Session.findOne({ refreshToken });
    if (!session || session.expiresAt < new Date()) {
      return res.status(401).json({
        success: false,
        message: req.t('sessionNotFound')
      });
    }

    // Get user
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: req.t('userNotFound')
      });
    }

    // Generate new access token
    const accessToken = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m' }
    );

    res.json({
      success: true,
      message: req.t('tokenRefreshed'),
      data: {
        accessToken
      }
    });
  } catch (error) {
    logger.error('Refresh token error:', error);
    res.status(500).json({
      success: false,
      message: req.t('serverError')
    });
  }
});

// POST /auth/logout
router.post('/logout', async (req, res) => {
  try {
    // Validate request body
    const { error, value } = logoutSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { refreshToken } = value;

    // Delete session
    const result = await Session.deleteOne({ refreshToken });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: req.t('sessionNotFound')
      });
    }

    logger.info('User logged out');

    res.json({
      success: true,
      message: req.t('logoutSuccess')
    });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: req.t('serverError')
    });
  }
});

// GET /auth/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: req.t('userNotFound')
      });
    }

    res.json({
      success: true,
      data: {
        user: user.toJSON()
      }
    });
  } catch (error) {
    logger.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: req.t('serverError')
    });
  }
});

module.exports = router;
