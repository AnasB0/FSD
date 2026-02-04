const express = require('express');
const Joi = require('joi');
const { authMiddleware, requireRole } = require('../middleware/auth');
const RoutePlan = require('../models/RoutePlan');
const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

const router = express.Router();

const routePlanSchema = Joi.object({
  courierId: Joi.string().required(),
  merchantId: Joi.string().required(),
  orders: Joi.array().items(Joi.string()).required()
});

router.get('/', authMiddleware, requireRole('admin', 'merchant', 'driver'), async (req, res) => {
  try {
    const { page = 1, limit = 10, status, courierId, merchantId } = req.query;
    const query = {};
    
    if (req.user.role === 'merchant' && req.user.merchantId) {
      query.merchantId = req.user.merchantId;
    } else if (merchantId) {
      query.merchantId = merchantId;
    }
    
    if (status) {
      query.status = status;
    }
    
    if (courierId) {
      query.courierId = courierId;
    }
    
    const routePlans = await RoutePlan.find(query)
      .populate('courierId', 'name phone vehicle')
      .populate('orders', 'address status')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ optimizedAt: -1 });
    
    const count = await RoutePlan.countDocuments(query);
    
    res.json({
      routePlans,
      totalPages: Math.ceil(count / limit),
      currentPage: page
    });
  } catch (error) {
    logger.error('List route plans error:', error);
    res.status(500).json({ error: req.t('error.internal') });
  }
});

router.post('/', authMiddleware, requireRole('admin', 'merchant'), async (req, res) => {
  try {
    const { error, value } = routePlanSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: req.t('error.validation'),
        details: error.details 
      });
    }
    
    const routePlan = new RoutePlan({
      ...value,
      optimizedAt: new Date()
    });
    
    await routePlan.save();
    
    await AuditLog.create({
      userId: req.user.id,
      action: 'CREATE',
      resource: 'RoutePlan',
      resourceId: routePlan._id.toString(),
      ipAddress: req.ip
    });
    
    logger.info(`Route plan created: ${routePlan._id}`);
    res.status(201).json({ message: req.t('success.created'), routePlan });
  } catch (error) {
    logger.error('Create route plan error:', error);
    res.status(500).json({ error: req.t('error.internal') });
  }
});

router.get('/:id', authMiddleware, requireRole('admin', 'merchant', 'driver'), async (req, res) => {
  try {
    const routePlan = await RoutePlan.findById(req.params.id)
      .populate('courierId', 'name phone vehicle')
      .populate('orders', 'address status timeWindow');
    
    if (!routePlan) {
      return res.status(404).json({ error: 'Route plan not found' });
    }
    
    res.json({ routePlan });
  } catch (error) {
    logger.error('Get route plan error:', error);
    res.status(500).json({ error: req.t('error.internal') });
  }
});

router.put('/:id/status', authMiddleware, requireRole('admin', 'merchant', 'driver'), async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status || !['pending', 'active', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    const routePlan = await RoutePlan.findById(req.params.id);
    
    if (!routePlan) {
      return res.status(404).json({ error: 'Route plan not found' });
    }
    
    const oldStatus = routePlan.status;
    routePlan.status = status;
    
    if (status === 'active' && !routePlan.startedAt) {
      routePlan.startedAt = new Date();
    } else if (status === 'completed' && !routePlan.completedAt) {
      routePlan.completedAt = new Date();
    }
    
    await routePlan.save();
    
    await AuditLog.create({
      userId: req.user.id,
      action: 'UPDATE',
      resource: 'RoutePlan',
      resourceId: routePlan._id.toString(),
      changes: { old: { status: oldStatus }, new: { status } },
      ipAddress: req.ip
    });
    
    logger.info(`Route plan status updated: ${routePlan._id} -> ${status}`);
    res.json({ message: req.t('success.updated'), routePlan });
  } catch (error) {
    logger.error('Update route plan status error:', error);
    res.status(500).json({ error: req.t('error.internal') });
  }
});

module.exports = router;
