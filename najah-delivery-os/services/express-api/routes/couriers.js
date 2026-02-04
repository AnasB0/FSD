const express = require('express');
const Joi = require('joi');
const { authMiddleware, requireRole } = require('../middleware/auth');
const Courier = require('../models/Courier');
const RoutePlan = require('../models/RoutePlan');
const Order = require('../models/Order');
const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

const router = express.Router();

const courierSchema = Joi.object({
  name: Joi.string().required().min(2).max(100),
  email: Joi.string().email().required(),
  phone: Joi.string().required(),
  vehicle: Joi.string().valid('motorcycle', 'car', 'van', 'bicycle').default('motorcycle'),
  shift: Joi.object({
    start: Joi.string().required(),
    end: Joi.string().required()
  }).required(),
  capacity: Joi.number().min(1).default(10),
  merchantId: Joi.string().optional()
});

router.get('/', authMiddleware, requireRole('admin', 'merchant'), async (req, res) => {
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
    
    const couriers = await Courier.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });
    
    const count = await Courier.countDocuments(query);
    
    res.json({
      couriers,
      totalPages: Math.ceil(count / limit),
      currentPage: page
    });
  } catch (error) {
    logger.error('List couriers error:', error);
    res.status(500).json({ error: req.t('error.internal') });
  }
});

router.post('/', authMiddleware, requireRole('admin', 'merchant'), async (req, res) => {
  try {
    const { error, value } = courierSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: req.t('error.validation'),
        details: error.details 
      });
    }
    
    if (req.user.role === 'merchant') {
      value.merchantId = req.user.merchantId;
    }
    
    const courier = new Courier(value);
    await courier.save();
    
    await AuditLog.create({
      userId: req.user.id,
      action: 'CREATE',
      resource: 'Courier',
      resourceId: courier._id.toString(),
      ipAddress: req.ip
    });
    
    logger.info(`Courier created: ${courier._id}`);
    res.status(201).json({ message: req.t('success.created'), courier });
  } catch (error) {
    logger.error('Create courier error:', error);
    res.status(500).json({ error: req.t('error.internal') });
  }
});

router.get('/:id', authMiddleware, requireRole('admin', 'merchant', 'driver'), async (req, res) => {
  try {
    const courier = await Courier.findById(req.params.id);
    
    if (!courier) {
      return res.status(404).json({ error: req.t('error.courierNotFound') });
    }
    
    res.json({ courier });
  } catch (error) {
    logger.error('Get courier error:', error);
    res.status(500).json({ error: req.t('error.internal') });
  }
});

router.put('/:id', authMiddleware, requireRole('admin', 'merchant', 'driver'), async (req, res) => {
  try {
    const courier = await Courier.findById(req.params.id);
    
    if (!courier) {
      return res.status(404).json({ error: req.t('error.courierNotFound') });
    }
    
    const oldData = courier.toObject();
    Object.assign(courier, req.body);
    await courier.save();
    
    await AuditLog.create({
      userId: req.user.id,
      action: 'UPDATE',
      resource: 'Courier',
      resourceId: courier._id.toString(),
      changes: { old: oldData, new: req.body },
      ipAddress: req.ip
    });
    
    logger.info(`Courier updated: ${courier._id}`);
    res.json({ message: req.t('success.updated'), courier });
  } catch (error) {
    logger.error('Update courier error:', error);
    res.status(500).json({ error: req.t('error.internal') });
  }
});

router.delete('/:id', authMiddleware, requireRole('admin', 'merchant'), async (req, res) => {
  try {
    const courier = await Courier.findById(req.params.id);
    
    if (!courier) {
      return res.status(404).json({ error: req.t('error.courierNotFound') });
    }
    
    await Courier.findByIdAndDelete(req.params.id);
    
    await AuditLog.create({
      userId: req.user.id,
      action: 'DELETE',
      resource: 'Courier',
      resourceId: courier._id.toString(),
      ipAddress: req.ip
    });
    
    logger.info(`Courier deleted: ${courier._id}`);
    res.json({ message: req.t('success.deleted') });
  } catch (error) {
    logger.error('Delete courier error:', error);
    res.status(500).json({ error: req.t('error.internal') });
  }
});

router.post('/:id/assign-route', authMiddleware, requireRole('admin', 'merchant'), async (req, res) => {
  try {
    const courier = await Courier.findById(req.params.id);
    
    if (!courier) {
      return res.status(404).json({ error: req.t('error.courierNotFound') });
    }
    
    const { orderIds } = req.body;
    
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ error: 'Order IDs required' });
    }
    
    const routePlan = new RoutePlan({
      courierId: courier._id,
      merchantId: req.user.merchantId,
      orders: orderIds,
      status: 'pending',
      optimizedAt: new Date()
    });
    
    await routePlan.save();
    
    await Order.updateMany(
      { _id: { $in: orderIds } },
      { $set: { courierId: courier._id, routePlanId: routePlan._id, status: 'assigned' } }
    );
    
    courier.status = 'busy';
    await courier.save();
    
    logger.info(`Route assigned to courier: ${courier._id}`);
    res.json({ message: 'Route assigned successfully', routePlan });
  } catch (error) {
    logger.error('Assign route error:', error);
    res.status(500).json({ error: req.t('error.internal') });
  }
});

module.exports = router;
