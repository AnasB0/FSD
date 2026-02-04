const express = require('express');
const crypto = require('crypto');
const Merchant = require('../models/Merchant');
const Order = require('../models/Order');
const WebhookLog = require('../models/WebhookLog');
const logger = require('../utils/logger');

const router = express.Router();

function verifyHmacSignature(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(JSON.stringify(payload));
  const expectedSignature = hmac.digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

router.post('/:merchantId/orders', async (req, res) => {
  try {
    const { merchantId } = req.params;
    const signature = req.headers['x-webhook-signature'];
    
    if (!signature) {
      return res.status(401).json({ error: 'Missing signature' });
    }
    
    const merchant = await Merchant.findById(merchantId);
    
    if (!merchant) {
      return res.status(404).json({ error: 'Merchant not found' });
    }
    
    const isValid = verifyHmacSignature(req.body, signature, merchant.webhook_secret);
    
    if (!isValid) {
      await WebhookLog.create({
        merchantId,
        event: 'order.created',
        payload: req.body,
        signature,
        status: 'failed'
      });
      
      return res.status(401).json({ error: 'Invalid signature' });
    }
    
    const orderData = {
      merchantId,
      customerId: req.body.customerId,
      address: req.body.address,
      timeWindow: req.body.timeWindow,
      priority: req.body.priority || 1,
      items: req.body.items,
      totalAmount: req.body.totalAmount,
      status: 'pending'
    };
    
    if (!orderData.address.coordinates) {
      orderData.address.coordinates = { lat: 0, lng: 0 };
    }
    if (!orderData.address.components) {
      orderData.address.components = {};
    }
    
    const order = new Order(orderData);
    await order.save();
    
    await WebhookLog.create({
      merchantId,
      event: 'order.created',
      payload: req.body,
      signature,
      status: 'success'
    });
    
    logger.info(`Webhook order created: ${order._id} for merchant: ${merchantId}`);
    res.status(201).json({ 
      message: 'Order created successfully',
      orderId: order._id
    });
  } catch (error) {
    logger.error('Webhook order creation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
