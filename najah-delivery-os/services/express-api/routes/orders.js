const express = require('express');
const axios = require('axios');
const Joi = require('joi');
const { authMiddleware, requireRole } = require('../middleware/auth');
const Order = require('../models/Order');
const Merchant = require('../models/Merchant');
const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

const router = express.Router();
const GEOCODING_SERVICE_URL = process.env.GEOCODING_SERVICE_URL || 'http://localhost:8082';
const OPTIMIZER_SERVICE_URL = process.env.OPTIMIZER_SERVICE_URL || 'http://localhost:8083';

const orderSchema = Joi.object({
  merchantId: Joi.string().required(),
  customerId: Joi.string().optional(),
  address: Joi.object({
    ar: Joi.string().required(),
    en: Joi.string().required()
  }).required(),
  timeWindow: Joi.object({
    start: Joi.date().required(),
    end: Joi.date().required()
  }).required(),
  priority: Joi.number().min(1).max(5).default(1),
  items: Joi.array().items(Joi.object({
    name: Joi.string().required(),
    quantity: Joi.number().required().min(1),
    price: Joi.number().required().min(0)
  })).required(),
  totalAmount: Joi.number().required().min(0)
});

router.get('/', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, merchantId } = req.query;
    const query = {};
    
    if (req.user.role === 'merchant' && req.user.merchantId) {
      query.merchantId = req.user.merchantId;
    } else if (merchantId) {
      query.merchantId = merchantId;
    }
    
    if (status) {
      query.status = status;
    }
    
    const orders = await Order.find(query)
      .populate('merchantId', 'name email')
      .populate('courierId', 'name phone')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });
    
    const count = await Order.countDocuments(query);
    
    res.json({
      orders,
      totalPages: Math.ceil(count / limit),
      currentPage: page
    });
  } catch (error) {
    logger.error('List orders error:', error);
    res.status(500).json({ error: req.t('error.internal') });
  }
});

router.post('/', authMiddleware, requireRole('admin', 'merchant', 'customer'), async (req, res) => {
  try {
    const { error, value } = orderSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: req.t('error.validation'),
        details: error.details 
      });
    }
    
    const merchant = await Merchant.findById(value.merchantId);
    if (!merchant) {
      return res.status(404).json({ error: req.t('error.merchantNotFound') });
    }
    
    const order = new Order({
      ...value,
      address: {
        ...value.address,
        components: {},
        coordinates: { lat: 0, lng: 0 }
      }
    });
    
    await order.save();
    
    await AuditLog.create({
      userId: req.user.id,
      action: 'CREATE',
      resource: 'Order',
      resourceId: order._id.toString(),
      ipAddress: req.ip
    });
    
    logger.info(`Order created: ${order._id}`);
    res.status(201).json({ message: req.t('success.created'), order });
  } catch (error) {
    logger.error('Create order error:', error);
    res.status(500).json({ error: req.t('error.internal') });
  }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('merchantId', 'name email phone')
      .populate('courierId', 'name phone vehicle');
    
    if (!order) {
      return res.status(404).json({ error: req.t('error.orderNotFound') });
    }
    
    res.json({ order });
  } catch (error) {
    logger.error('Get order error:', error);
    res.status(500).json({ error: req.t('error.internal') });
  }
});

router.post('/:id/normalize', authMiddleware, requireRole('admin', 'merchant'), async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ error: req.t('error.orderNotFound') });
    }
    
    const response = await axios.post(`${GEOCODING_SERVICE_URL}/api/geocoding/normalize`, {
      address: order.address.ar || order.address.en
    });
    
    order.address.components = response.data.components || {};
    order.address.coordinates = response.data.coordinates || { lat: 0, lng: 0 };
    
    await order.save();
    
    logger.info(`Order address normalized: ${order._id}`);
    res.json({ message: 'Address normalized successfully', order });
  } catch (error) {
    logger.error('Normalize order address error:', error);
    res.status(500).json({ error: req.t('error.internal') });
  }
});

router.post('/:id/plan', authMiddleware, requireRole('admin', 'merchant'), async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ error: req.t('error.orderNotFound') });
    }
    
    const response = await axios.post(`${OPTIMIZER_SERVICE_URL}/api/optimizer/optimize`, {
      orders: [order._id],
      merchantId: order.merchantId
    });
    
    logger.info(`Order route planned: ${order._id}`);
    res.json({ message: 'Route plan created', data: response.data });
  } catch (error) {
    logger.error('Plan order route error:', error);
    res.status(500).json({ error: req.t('error.internal') });
  }
});

router.get('/:id/track', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('courierId', 'name phone currentLocation')
      .populate('routePlanId');
    
    if (!order) {
      return res.status(404).json({ error: req.t('error.orderNotFound') });
    }
    
    res.json({
      order: {
        id: order._id,
        status: order.status,
        address: order.address,
        timeWindow: order.timeWindow,
        courier: order.courierId ? {
          name: order.courierId.name,
          phone: order.courierId.phone,
          location: order.courierId.currentLocation
        } : null
      }
    });
  } catch (error) {
    logger.error('Track order error:', error);
    res.status(500).json({ error: req.t('error.internal') });
  }
});

router.put('/:id', authMiddleware, requireRole('admin', 'merchant'), async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ error: req.t('error.orderNotFound') });
    }
    
    const oldData = order.toObject();
    Object.assign(order, req.body);
    await order.save();
    
    await AuditLog.create({
      userId: req.user.id,
      action: 'UPDATE',
      resource: 'Order',
      resourceId: order._id.toString(),
      changes: { old: oldData, new: req.body },
      ipAddress: req.ip
    });
    
    logger.info(`Order updated: ${order._id}`);
    res.json({ message: req.t('success.updated'), order });
  } catch (error) {
    logger.error('Update order error:', error);
    res.status(500).json({ error: req.t('error.internal') });
  }
});

module.exports = router;
