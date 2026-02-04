const express = require('express');
const Joi = require('joi');
const { authMiddleware, requireRole } = require('../middleware/auth');
const Merchant = require('../models/Merchant');
const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');
const crypto = require('crypto');

const router = express.Router();

const merchantSchema = Joi.object({
  name: Joi.string().required().min(2).max(100),
  email: Joi.string().email().required(),
  phone: Joi.string().required(),
  address: Joi.object({
    ar: Joi.string().required(),
    en: Joi.string().required()
  }).required()
});

const updateMerchantSchema = Joi.object({
  name: Joi.string().min(2).max(100),
  email: Joi.string().email(),
  phone: Joi.string(),
  address: Joi.object({
    ar: Joi.string(),
    en: Joi.string()
  }),
  active: Joi.boolean()
});

router.get('/', authMiddleware, requireRole('admin', 'merchant'), async (req, res) => {
  try {
    const { page = 1, limit = 10, active } = req.query;
    const query = {};
    
    if (req.user.role === 'merchant' && req.user.merchantId) {
      query._id = req.user.merchantId;
    }
    
    if (active !== undefined) {
      query.active = active === 'true';
    }
    
    const merchants = await Merchant.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });
    
    const count = await Merchant.countDocuments(query);
    
    res.json({
      merchants,
      totalPages: Math.ceil(count / limit),
      currentPage: page
    });
  } catch (error) {
    logger.error('List merchants error:', error);
    res.status(500).json({ error: req.t('error.internal') });
  }
});

router.post('/', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { error, value } = merchantSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: req.t('error.validation'),
        details: error.details 
      });
    }
    
    const merchant = new Merchant({
      ...value,
      webhook_secret: crypto.randomBytes(32).toString('hex'),
      api_key: crypto.randomBytes(32).toString('hex')
    });
    
    await merchant.save();
    
    await AuditLog.create({
      userId: req.user.id,
      action: 'CREATE',
      resource: 'Merchant',
      resourceId: merchant._id.toString(),
      ipAddress: req.ip
    });
    
    logger.info(`Merchant created: ${merchant._id}`);
    res.status(201).json({ message: req.t('success.created'), merchant });
  } catch (error) {
    logger.error('Create merchant error:', error);
    res.status(500).json({ error: req.t('error.internal') });
  }
});

router.get('/:id', authMiddleware, requireRole('admin', 'merchant'), async (req, res) => {
  try {
    const merchant = await Merchant.findById(req.params.id);
    
    if (!merchant) {
      return res.status(404).json({ error: req.t('error.merchantNotFound') });
    }
    
    if (req.user.role === 'merchant' && merchant._id.toString() !== req.user.merchantId?.toString()) {
      return res.status(403).json({ error: req.t('error.forbidden') });
    }
    
    res.json({ merchant });
  } catch (error) {
    logger.error('Get merchant error:', error);
    res.status(500).json({ error: req.t('error.internal') });
  }
});

router.put('/:id', authMiddleware, requireRole('admin', 'merchant'), async (req, res) => {
  try {
    const { error, value } = updateMerchantSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: req.t('error.validation'),
        details: error.details 
      });
    }
    
    const merchant = await Merchant.findById(req.params.id);
    
    if (!merchant) {
      return res.status(404).json({ error: req.t('error.merchantNotFound') });
    }
    
    if (req.user.role === 'merchant' && merchant._id.toString() !== req.user.merchantId?.toString()) {
      return res.status(403).json({ error: req.t('error.forbidden') });
    }
    
    const oldData = merchant.toObject();
    Object.assign(merchant, value);
    await merchant.save();
    
    await AuditLog.create({
      userId: req.user.id,
      action: 'UPDATE',
      resource: 'Merchant',
      resourceId: merchant._id.toString(),
      changes: { old: oldData, new: value },
      ipAddress: req.ip
    });
    
    logger.info(`Merchant updated: ${merchant._id}`);
    res.json({ message: req.t('success.updated'), merchant });
  } catch (error) {
    logger.error('Update merchant error:', error);
    res.status(500).json({ error: req.t('error.internal') });
  }
});

router.delete('/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const merchant = await Merchant.findById(req.params.id);
    
    if (!merchant) {
      return res.status(404).json({ error: req.t('error.merchantNotFound') });
    }
    
    await Merchant.findByIdAndDelete(req.params.id);
    
    await AuditLog.create({
      userId: req.user.id,
      action: 'DELETE',
      resource: 'Merchant',
      resourceId: merchant._id.toString(),
      ipAddress: req.ip
    });
    
    logger.info(`Merchant deleted: ${merchant._id}`);
    res.json({ message: req.t('success.deleted') });
  } catch (error) {
    logger.error('Delete merchant error:', error);
    res.status(500).json({ error: req.t('error.internal') });
  }
});

module.exports = router;
