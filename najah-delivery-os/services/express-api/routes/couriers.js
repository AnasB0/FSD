const express = require('express');
const router = express.Router();
const Joi = require('joi');
const Courier = require('../models/Courier');
const RoutePlan = require('../models/RoutePlan');
const { authenticate, authorize } = require('../middleware/auth');
const logger = require('../config/logger');

const courierSchema = Joi.object({
  name: Joi.string().required().trim().min(3).max(100),
  email: Joi.string().email().required(),
  phone: Joi.string().required(),
  vehicle: Joi.object({
    type: Joi.string().valid('bicycle', 'motorcycle', 'car', 'van').required(),
    plateNumber: Joi.string(),
    model: Joi.string(),
    color: Joi.string(),
    capacity: Joi.object({
      weight: Joi.number(),
      volume: Joi.number(),
      orders: Joi.number().min(1)
    })
  }).required(),
  shift: Joi.object({
    start: Joi.string(),
    end: Joi.string(),
    workingDays: Joi.array().items(
      Joi.string().valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')
    )
  }),
  documents: Joi.object({
    licenseNumber: Joi.string(),
    licenseExpiry: Joi.date(),
    identityNumber: Joi.string(),
    identityExpiry: Joi.date()
  })
});

router.get('/', authenticate, authorize('admin', 'dispatcher'), async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, vehicleType } = req.query;
    const query = {};
    
    if (status) query.status = status;
    if (vehicleType) query['vehicle.type'] = vehicleType;

    const couriers = await Courier.find(query)
      .populate('currentRoute', 'status date stats')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ name: 1 });

    const count = await Courier.countDocuments(query);

    res.json({
      couriers,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', authenticate, authorize('admin', 'dispatcher', 'courier'), async (req, res, next) => {
  try {
    const courier = await Courier.findById(req.params.id)
      .populate('currentRoute');
    
    if (!courier) {
      return res.status(404).json({ error: 'Courier not found' });
    }

    res.json(courier);
  } catch (error) {
    next(error);
  }
});

router.post('/', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { error, value } = courierSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: 'Validation error', details: error.details });
    }

    const courier = new Courier(value);
    await courier.save();

    logger.info('Courier created', { courierId: courier._id, userId: req.user.id });

    res.status(201).json(courier);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', authenticate, authorize('admin', 'dispatcher'), async (req, res, next) => {
  try {
    const { error, value } = courierSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: 'Validation error', details: error.details });
    }

    const courier = await Courier.findByIdAndUpdate(
      req.params.id,
      value,
      { new: true, runValidators: true }
    );

    if (!courier) {
      return res.status(404).json({ error: 'Courier not found' });
    }

    logger.info('Courier updated', { courierId: courier._id, userId: req.user.id });

    res.json(courier);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/location', authenticate, async (req, res, next) => {
  try {
    const { coordinates, accuracy, heading, speed } = req.body;

    if (!coordinates || !Array.isArray(coordinates) || coordinates.length !== 2) {
      return res.status(400).json({ error: 'Invalid coordinates format' });
    }

    const courier = await Courier.findByIdAndUpdate(
      req.params.id,
      {
        'location.coordinates': coordinates,
        'location.accuracy': accuracy,
        'location.heading': heading,
        'location.speed': speed,
        'location.lastUpdated': new Date()
      },
      { new: true }
    );

    if (!courier) {
      return res.status(404).json({ error: 'Courier not found' });
    }

    res.json({ message: 'Location updated', location: courier.location });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/assign-route', authenticate, authorize('admin', 'dispatcher'), async (req, res, next) => {
  try {
    const { routePlanId } = req.body;

    if (!routePlanId) {
      return res.status(400).json({ error: 'routePlanId is required' });
    }

    const [courier, routePlan] = await Promise.all([
      Courier.findById(req.params.id),
      RoutePlan.findById(routePlanId)
    ]);

    if (!courier) {
      return res.status(404).json({ error: 'Courier not found' });
    }

    if (!routePlan) {
      return res.status(404).json({ error: 'Route plan not found' });
    }

    if (routePlan.courierId.toString() !== req.params.id) {
      return res.status(400).json({ error: 'Route plan is not assigned to this courier' });
    }

    courier.currentRoute = routePlanId;
    courier.status = 'busy';
    
    routePlan.status = 'in_progress';
    routePlan.startTime = new Date();

    await Promise.all([courier.save(), routePlan.save()]);

    logger.info('Route assigned to courier', { 
      courierId: courier._id, 
      routePlanId: routePlan._id,
      userId: req.user.id 
    });

    res.json({ 
      message: 'Route assigned successfully',
      courier,
      routePlan
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const courier = await Courier.findByIdAndUpdate(
      req.params.id,
      { status: 'offline' },
      { new: true }
    );

    if (!courier) {
      return res.status(404).json({ error: 'Courier not found' });
    }

    logger.info('Courier deactivated', { courierId: courier._id, userId: req.user.id });

    res.json({ message: 'Courier deactivated successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
