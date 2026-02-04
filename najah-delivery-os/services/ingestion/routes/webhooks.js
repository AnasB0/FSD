const express = require('express');
const router = express.Router();
const Joi = require('joi');
const Merchant = require('../models/Merchant');
const Order = require('../models/Order');
const WebhookLog = require('../models/WebhookLog');
const { signatureVerifyMiddleware } = require('../middleware/signatureVerify');
const { triggerNormalization } = require('../utils/normalizeOrder');
const logger = require('../utils/logger');

const orderPayloadSchema = Joi.object({
  externalOrderId: Joi.string().required(),
  customerName: Joi.string().required(),
  customerPhone: Joi.string().required(),
  address: Joi.object({
    ar: Joi.string().allow(''),
    en: Joi.string().allow(''),
    components: Joi.object({
      street: Joi.string().allow(''),
      district: Joi.string().allow(''),
      city: Joi.string().allow(''),
      postalCode: Joi.string().allow('')
    }),
    coordinates: Joi.object({
      lat: Joi.number(),
      lng: Joi.number()
    })
  }).required(),
  items: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
      quantity: Joi.number().integer().min(1).required(),
      price: Joi.number().min(0).required(),
      sku: Joi.string().allow('')
    })
  ).min(1).required(),
  totalAmount: Joi.number().min(0).required(),
  timeWindow: Joi.object({
    start: Joi.date().iso().required(),
    end: Joi.date().iso().required()
  }).required()
});

router.post('/:merchantId/orders', async (req, res) => {
  let webhookLog = null;
  
  try {
    const { merchantId } = req.params;
    
    logger.info('Received webhook', { merchantId });

    const merchant = await Merchant.findById(merchantId);
    if (!merchant) {
      logger.warn('Merchant not found', { merchantId });
      return res.status(404).json({ error: 'Merchant not found' });
    }

    if (!merchant.active) {
      logger.warn('Merchant inactive', { merchantId });
      return res.status(403).json({ error: 'Merchant inactive' });
    }

    await signatureVerifyMiddleware(merchant)(req, res, async () => {
      try {
        const payload = req.body;
        
        const { error, value } = orderPayloadSchema.validate(payload);
        if (error) {
          logger.warn('Invalid payload', { 
            merchantId, 
            error: error.details 
          });
          return res.status(400).json({ 
            error: 'Invalid payload', 
            details: error.details 
          });
        }

        webhookLog = await WebhookLog.create({
          merchantId: merchant._id,
          event: 'order.created',
          payload: value,
          signature: req.headers['x-merchant-signature'],
          status: 'received'
        });

        logger.info('WebhookLog created', { 
          webhookId: webhookLog.webhookId 
        });

        const orderData = {
          merchantId: merchant._id,
          externalOrderId: value.externalOrderId,
          customerName: value.customerName,
          customerPhone: value.customerPhone,
          address: value.address,
          items: value.items,
          totalAmount: value.totalAmount,
          timeWindow: value.timeWindow,
          status: 'pending'
        };

        const order = await Order.findOneAndUpdate(
          { 
            merchantId: merchant._id, 
            externalOrderId: value.externalOrderId 
          },
          orderData,
          { 
            upsert: true, 
            new: true,
            setDefaultsOnInsert: true 
          }
        );

        logger.info('Order created/updated', { 
          orderId: order._id,
          externalOrderId: order.externalOrderId 
        });

        webhookLog.status = 'validated';
        webhookLog.processedAt = new Date();
        await webhookLog.save();

        triggerNormalization(order._id.toString()).catch(err => {
          logger.error('Failed to trigger normalization (async)', {
            orderId: order._id,
            error: err.message
          });
        });

        res.status(200).json({ 
          received: true, 
          orderId: order._id,
          webhookId: webhookLog.webhookId
        });

      } catch (innerError) {
        logger.error('Error processing webhook', { 
          error: innerError.message,
          stack: innerError.stack 
        });
        
        if (webhookLog) {
          webhookLog.status = 'failed';
          webhookLog.errorMessage = innerError.message;
          await webhookLog.save();
        }
        
        throw innerError;
      }
    });

  } catch (error) {
    logger.error('Webhook processing error', { 
      error: error.message,
      stack: error.stack 
    });
    
    if (webhookLog && !res.headersSent) {
      webhookLog.status = 'failed';
      webhookLog.errorMessage = error.message;
      await webhookLog.save();
    }
    
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Internal server error',
        message: error.message 
      });
    }
  }
});

module.exports = router;
