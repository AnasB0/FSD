const express = require('express');
const router = express.Router();
const Joi = require('joi');
const RoutePlan = require('../models/RoutePlan');
const Order = require('../models/Order');
const Courier = require('../models/Courier');
const { authenticate, authorize } = require('../middleware/auth');
const logger = require('../config/logger');

const routePlanSchema = Joi.object({
  courierId: Joi.string().required(),
  date: Joi.date(),
  orders: Joi.array().items(Joi.object({
    orderId: Joi.string().required(),
    sequence: Joi.number().required(),
    estimatedArrival: Joi.date()
  })).min(1).required(),
  estimatedStartTime: Joi.date(),
  estimatedEndTime: Joi.date(),
  notes: Joi.string()
});

router.get('/', authenticate, authorize('admin', 'dispatcher'), async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, courierId, date } = req.query;
    const query = {};
    
    if (status) query.status = status;
    if (courierId) query.courierId = courierId;
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      query.date = { $gte: startDate, $lt: endDate };
    }

    const routePlans = await RoutePlan.find(query)
      .populate('courierId', 'name phone vehicle.type status')
      .populate('orders.orderId', 'orderNumber address.ar customer.name status')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ date: -1 });

    const count = await RoutePlan.countDocuments(query);

    res.json({
      routePlans,
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
    const routePlan = await RoutePlan.findById(req.params.id)
      .populate('courierId', 'name phone vehicle.type status location')
      .populate('orders.orderId', 'orderNumber address customer status timeWindow')
      .populate('createdBy', 'username email');
    
    if (!routePlan) {
      return res.status(404).json({ error: 'Route plan not found' });
    }

    res.json(routePlan);
  } catch (error) {
    next(error);
  }
});

router.post('/', authenticate, authorize('admin', 'dispatcher'), async (req, res, next) => {
  try {
    const { error, value } = routePlanSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: 'Validation error', details: error.details });
    }

    const courier = await Courier.findById(value.courierId);
    if (!courier) {
      return res.status(404).json({ error: 'Courier not found' });
    }

    const orderIds = value.orders.map(o => o.orderId);
    const orders = await Order.find({ _id: { $in: orderIds } });

    if (orders.length !== orderIds.length) {
      return res.status(404).json({ error: 'One or more orders not found' });
    }

    const routePlan = new RoutePlan({
      ...value,
      createdBy: req.user.id,
      stats: {
        totalOrders: orders.length
      }
    });

    await routePlan.save();

    await Order.updateMany(
      { _id: { $in: orderIds } },
      { 
        routePlanId: routePlan._id,
        status: 'assigned'
      }
    );

    logger.info('Route plan created', { 
      routePlanId: routePlan._id, 
      courierId: value.courierId,
      orderCount: orders.length,
      userId: req.user.id 
    });

    res.status(201).json(routePlan);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', authenticate, authorize('admin', 'dispatcher'), async (req, res, next) => {
  try {
    const routePlan = await RoutePlan.findById(req.params.id);
    
    if (!routePlan) {
      return res.status(404).json({ error: 'Route plan not found' });
    }

    if (routePlan.status === 'completed') {
      return res.status(400).json({ error: 'Cannot modify completed route plan' });
    }

    const allowedUpdates = ['orders', 'status', 'notes', 'optimizedRoute'];
    const updates = {};
    
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    Object.assign(routePlan, updates);
    await routePlan.save();

    logger.info('Route plan updated', { routePlanId: routePlan._id, userId: req.user.id });

    res.json(routePlan);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/complete', authenticate, authorize('admin', 'dispatcher', 'courier'), async (req, res, next) => {
  try {
    const routePlan = await RoutePlan.findById(req.params.id);
    
    if (!routePlan) {
      return res.status(404).json({ error: 'Route plan not found' });
    }

    routePlan.status = 'completed';
    routePlan.endTime = new Date();

    const completedOrders = routePlan.orders.filter(o => o.status === 'delivered').length;
    const failedOrders = routePlan.orders.filter(o => o.status === 'failed').length;

    routePlan.stats.completedOrders = completedOrders;
    routePlan.stats.failedOrders = failedOrders;
    routePlan.stats.efficiency = routePlan.stats.totalOrders > 0 
      ? (completedOrders / routePlan.stats.totalOrders) * 100 
      : 0;

    await routePlan.save();

    const courier = await Courier.findById(routePlan.courierId);
    if (courier && courier.currentRoute?.toString() === routePlan._id.toString()) {
      courier.currentRoute = null;
      courier.status = 'available';
      courier.stats.totalDeliveries += completedOrders;
      courier.stats.successfulDeliveries += completedOrders;
      courier.stats.failedDeliveries += failedOrders;
      await courier.save();
    }

    logger.info('Route plan completed', { 
      routePlanId: routePlan._id, 
      stats: routePlan.stats,
      userId: req.user.id 
    });

    res.json(routePlan);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', authenticate, authorize('admin', 'dispatcher'), async (req, res, next) => {
  try {
    const routePlan = await RoutePlan.findById(req.params.id);
    
    if (!routePlan) {
      return res.status(404).json({ error: 'Route plan not found' });
    }

    if (['in_progress', 'completed'].includes(routePlan.status)) {
      return res.status(400).json({ error: 'Cannot delete route plan in current status' });
    }

    routePlan.status = 'cancelled';
    await routePlan.save();

    const orderIds = routePlan.orders.map(o => o.orderId);
    await Order.updateMany(
      { _id: { $in: orderIds } },
      { 
        $unset: { routePlanId: 1 },
        status: 'confirmed'
      }
    );

    logger.info('Route plan cancelled', { routePlanId: routePlan._id, userId: req.user.id });

    res.json({ message: 'Route plan cancelled successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
