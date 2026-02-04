const express = require('express');
const router = express.Router();
const Joi = require('joi');
const axios = require('axios');
const Order = require('../models/Order');
const { authenticate, authorize } = require('../middleware/auth');
const logger = require('../config/logger');

const GEOCODING_SERVICE_URL = process.env.GEOCODING_SERVICE_URL || 'http://localhost:5002';
const OPTIMIZER_SERVICE_URL = process.env.OPTIMIZER_SERVICE_URL || 'http://localhost:5003';

const orderSchema = Joi.object({
  merchantId: Joi.string().required(),
  orderNumber: Joi.string().required(),
  externalOrderId: Joi.string(),
  items: Joi.array().items(Joi.object({
    name: Joi.string().required(),
    quantity: Joi.number().min(1).required(),
    price: Joi.number().min(0).required(),
    sku: Joi.string(),
    notes: Joi.string()
  })).min(1).required(),
  address: Joi.object({
    ar: Joi.string().required(),
    en: Joi.string(),
    components: Joi.object({
      city: Joi.string(),
      district: Joi.string(),
      street: Joi.string(),
      building: Joi.string(),
      floor: Joi.string(),
      apartment: Joi.string(),
      postalCode: Joi.string()
    })
  }).required(),
  customer: Joi.object({
    name: Joi.string().required(),
    phone: Joi.string().required(),
    email: Joi.string().email(),
    notes: Joi.string()
  }).required(),
  timeWindow: Joi.object({
    start: Joi.date(),
    end: Joi.date(),
    priority: Joi.string().valid('low', 'medium', 'high', 'urgent')
  }),
  pricing: Joi.object({
    subtotal: Joi.number().required(),
    deliveryFee: Joi.number(),
    tax: Joi.number(),
    total: Joi.number().required()
  }).required()
});

router.get('/', authenticate, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, merchantId, courierId } = req.query;
    const query = {};
    
    if (status) query.status = status;
    if (merchantId) query.merchantId = merchantId;
    if (courierId) query.courierId = courierId;
    
    if (req.user.role === 'merchant') {
      query.merchantId = req.user.merchantId;
    }

    const orders = await Order.find(query)
      .populate('merchantId', 'name email')
      .populate('courierId', 'name phone vehicle.type')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const count = await Order.countDocuments(query);

    res.json({
      orders,
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
    const order = await Order.findById(req.params.id)
      .populate('merchantId', 'name email phone')
      .populate('courierId', 'name phone vehicle.type location');
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (req.user.role === 'merchant' && order.merchantId._id.toString() !== req.user.merchantId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(order);
  } catch (error) {
    next(error);
  }
});

router.post('/', authenticate, authorize('admin', 'dispatcher', 'merchant'), async (req, res, next) => {
  try {
    const { error, value } = orderSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: 'Validation error', details: error.details });
    }

    if (req.user.role === 'merchant' && value.merchantId !== req.user.merchantId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const order = new Order({
      ...value,
      statusHistory: [{
        status: 'pending',
        timestamp: new Date(),
        updatedBy: req.user.id
      }]
    });
    
    await order.save();

    logger.info('Order created', { orderId: order._id, userId: req.user.id });

    res.status(201).json(order);
  } catch (error) {
    next(error);
  }
});

router.post('/:id/normalize', authenticate, authorize('admin', 'dispatcher'), async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const geocodingResponse = await axios.post(
      `${GEOCODING_SERVICE_URL}/api/geocode/normalize`,
      {
        address: order.address.ar,
        language: req.language || 'ar'
      },
      {
        headers: {
          'Authorization': req.headers.authorization,
          'X-Request-ID': req.id
        },
        timeout: 30000
      }
    );

    order.address.normalizedAddress = geocodingResponse.data.normalizedAddress;
    order.address.location = geocodingResponse.data.location;
    order.address.confidence = geocodingResponse.data.confidence;
    
    if (geocodingResponse.data.components) {
      order.address.components = {
        ...order.address.components,
        ...geocodingResponse.data.components
      };
    }

    await order.save();

    logger.info('Order address normalized', { orderId: order._id, userId: req.user.id });

    res.json(order);
  } catch (error) {
    logger.error('Geocoding service error', { error: error.message, orderId: req.params.id });
    next(error);
  }
});

router.post('/:id/plan', authenticate, authorize('admin', 'dispatcher'), async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (!order.address.location || !order.address.location.coordinates) {
      return res.status(400).json({ 
        error: 'Order address must be normalized first',
        hint: 'Call POST /:id/normalize endpoint'
      });
    }

    const optimizerResponse = await axios.post(
      `${OPTIMIZER_SERVICE_URL}/api/optimize/route`,
      {
        orders: [req.params.id],
        courierId: req.body.courierId,
        constraints: req.body.constraints
      },
      {
        headers: {
          'Authorization': req.headers.authorization,
          'X-Request-ID': req.id
        },
        timeout: 60000
      }
    );

    res.json(optimizerResponse.data);
  } catch (error) {
    logger.error('Optimizer service error', { error: error.message, orderId: req.params.id });
    next(error);
  }
});

router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (req.user.role === 'merchant' && order.merchantId.toString() !== req.user.merchantId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const allowedUpdates = ['status', 'customer', 'items', 'timeWindow'];
    const updates = {};
    
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    if (req.body.status && req.body.status !== order.status) {
      order.statusHistory.push({
        status: req.body.status,
        timestamp: new Date(),
        updatedBy: req.user.id,
        notes: req.body.statusNotes
      });
    }

    Object.assign(order, updates);
    await order.save();

    logger.info('Order updated', { orderId: order._id, userId: req.user.id, updates: Object.keys(updates) });

    res.json(order);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', authenticate, authorize('admin', 'merchant'), async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (req.user.role === 'merchant' && order.merchantId.toString() !== req.user.merchantId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (['delivered', 'in_transit'].includes(order.status)) {
      return res.status(400).json({ error: 'Cannot delete order in current status' });
    }

    order.status = 'cancelled';
    order.cancelledAt = new Date();
    order.cancellationReason = req.body.reason || 'Cancelled by user';
    order.statusHistory.push({
      status: 'cancelled',
      timestamp: new Date(),
      updatedBy: req.user.id,
      notes: order.cancellationReason
    });

    await order.save();

    logger.info('Order cancelled', { orderId: order._id, userId: req.user.id });

    res.json({ message: 'Order cancelled successfully', order });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
