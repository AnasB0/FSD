const express = require('express');
const router = express.Router();
const Joi = require('joi');
const Order = require('../models/Order');
const Courier = require('../models/Courier');
const { authenticate, authorize } = require('../middleware/auth');
const logger = require('../config/logger');

const trackingUpdateSchema = Joi.object({
  orderId: Joi.string().required(),
  courierId: Joi.string().required(),
  location: Joi.object({
    coordinates: Joi.array().items(Joi.number()).length(2).required(),
    accuracy: Joi.number(),
    heading: Joi.number(),
    speed: Joi.number()
  }).required(),
  status: Joi.string().valid('assigned', 'picked_up', 'in_transit', 'delivered', 'failed'),
  notes: Joi.string(),
  proof: Joi.object({
    signatureUrl: Joi.string(),
    photoUrl: Joi.string(),
    recipientName: Joi.string()
  })
});

router.post('/update', authenticate, authorize('courier', 'admin', 'dispatcher'), async (req, res, next) => {
  try {
    const { error, value } = trackingUpdateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: 'Validation error', details: error.details });
    }

    const { orderId, courierId, location, status, notes, proof } = value;

    const [order, courier] = await Promise.all([
      Order.findById(orderId),
      Courier.findById(courierId)
    ]);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (!courier) {
      return res.status(404).json({ error: 'Courier not found' });
    }

    if (order.courierId?.toString() !== courierId) {
      return res.status(400).json({ error: 'Order is not assigned to this courier' });
    }

    courier.location.coordinates = location.coordinates;
    courier.location.accuracy = location.accuracy;
    courier.location.heading = location.heading;
    courier.location.speed = location.speed;
    courier.location.lastUpdated = new Date();
    await courier.save();

    if (status && status !== order.status) {
      order.status = status;
      order.statusHistory.push({
        status,
        timestamp: new Date(),
        updatedBy: courierId,
        notes
      });

      switch (status) {
        case 'picked_up':
          order.pickedUpAt = new Date();
          break;
        case 'delivered':
          order.deliveredAt = new Date();
          order.actualDeliveryTime = new Date();
          if (proof) {
            order.proof = proof;
          }
          break;
        case 'failed':
          order.cancellationReason = notes || 'Delivery failed';
          break;
      }

      await order.save();
    }

    logger.info('Tracking update received', { 
      orderId, 
      courierId, 
      status,
      location: location.coordinates
    });

    res.json({
      message: 'Tracking update successful',
      order: {
        id: order._id,
        status: order.status,
        orderNumber: order.orderNumber
      },
      courier: {
        id: courier._id,
        location: courier.location
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:orderId', async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.orderId)
      .populate('courierId', 'name phone location vehicle.type')
      .select('orderNumber status customer address estimatedDeliveryTime statusHistory');
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const trackingInfo = {
      orderNumber: order.orderNumber,
      status: order.status,
      customer: {
        name: order.customer.name,
        phone: order.customer.phone
      },
      address: order.address?.ar || order.address,
      estimatedDeliveryTime: order.estimatedDeliveryTime,
      statusHistory: order.statusHistory.map(h => ({
        status: h.status,
        timestamp: h.timestamp
      }))
    };

    if (order.courierId) {
      trackingInfo.courier = {
        name: order.courierId.name,
        phone: order.courierId.phone,
        vehicle: order.courierId.vehicle?.type,
        location: order.courierId.location
      };
    }

    res.json(trackingInfo);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
