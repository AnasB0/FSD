const express = require('express');
const Joi = require('joi');
const { authMiddleware, requireRole } = require('../middleware/auth');
const Courier = require('../models/Courier');
const logger = require('../utils/logger');

const router = express.Router();

const locationSchema = Joi.object({
  courierId: Joi.string().required(),
  latitude: Joi.number().required().min(-90).max(90),
  longitude: Joi.number().required().min(-180).max(180)
});

router.post('/update', authMiddleware, requireRole('driver', 'admin'), async (req, res) => {
  try {
    const { error, value } = locationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: req.t('error.validation'),
        details: error.details 
      });
    }
    
    const courier = await Courier.findById(value.courierId);
    
    if (!courier) {
      return res.status(404).json({ error: req.t('error.courierNotFound') });
    }
    
    courier.currentLocation = {
      type: 'Point',
      coordinates: [value.longitude, value.latitude]
    };
    
    await courier.save();
    
    logger.info(`Courier location updated: ${courier._id}`);
    res.json({ 
      message: 'Location updated successfully',
      location: {
        latitude: value.latitude,
        longitude: value.longitude
      }
    });
  } catch (error) {
    logger.error('Update tracking location error:', error);
    res.status(500).json({ error: req.t('error.internal') });
  }
});

module.exports = router;
