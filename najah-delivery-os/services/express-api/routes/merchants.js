const express = require('express');
const router = express.Router();
const Joi = require('joi');
const Merchant = require('../models/Merchant');
const { authenticate, authorize } = require('../middleware/auth');
const logger = require('../config/logger');

const merchantSchema = Joi.object({
  name: Joi.string().required().trim().min(3).max(100),
  email: Joi.string().email().required(),
  phone: Joi.string().required(),
  businessType: Joi.string().valid('restaurant', 'retail', 'pharmacy', 'grocery', 'other'),
  address: Joi.object({
    ar: Joi.string().required(),
    en: Joi.string(),
    location: Joi.object({
      coordinates: Joi.array().items(Joi.number()).length(2).required()
    }).required(),
    city: Joi.string(),
    district: Joi.string(),
    postalCode: Joi.string()
  }).required(),
  settings: Joi.object({
    notificationEmail: Joi.string().email(),
    webhookUrl: Joi.string().uri(),
    webhookSecret: Joi.string(),
    autoAcceptOrders: Joi.boolean(),
    maxDailyOrders: Joi.number().min(1)
  })
});

router.get('/', authenticate, authorize('admin', 'dispatcher'), async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, businessType } = req.query;
    const query = {};
    
    if (status) query.status = status;
    if (businessType) query.businessType = businessType;

    const merchants = await Merchant.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 })
      .select('-apiKey');

    const count = await Merchant.countDocuments(query);

    res.json({
      merchants,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const merchant = await Merchant.findById(req.params.id).select('-apiKey');
    
    if (!merchant) {
      return res.status(404).json({ error: 'Merchant not found' });
    }

    if (req.user.role === 'merchant' && req.user.merchantId !== req.params.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(merchant);
  } catch (error) {
    next(error);
  }
});

router.post('/', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { error, value } = merchantSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: 'Validation error', details: error.details });
    }

    const merchant = new Merchant(value);
    await merchant.save();

    logger.info('Merchant created', { merchantId: merchant._id, userId: req.user.id });

    res.status(201).json(merchant);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', authenticate, authorize('admin', 'merchant'), async (req, res, next) => {
  try {
    if (req.user.role === 'merchant' && req.user.merchantId !== req.params.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { error, value } = merchantSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: 'Validation error', details: error.details });
    }

    const merchant = await Merchant.findByIdAndUpdate(
      req.params.id,
      value,
      { new: true, runValidators: true }
    ).select('-apiKey');

    if (!merchant) {
      return res.status(404).json({ error: 'Merchant not found' });
    }

    logger.info('Merchant updated', { merchantId: merchant._id, userId: req.user.id });

    res.json(merchant);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const merchant = await Merchant.findByIdAndUpdate(
      req.params.id,
      { status: 'inactive' },
      { new: true }
    );

    if (!merchant) {
      return res.status(404).json({ error: 'Merchant not found' });
    }

    logger.info('Merchant deactivated', { merchantId: merchant._id, userId: req.user.id });

    res.json({ message: 'Merchant deactivated successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
