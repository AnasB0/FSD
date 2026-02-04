const express = require('express');
const Joi = require('joi');
const PaymentIntent = require('../models/PaymentIntent');
const auth = require('../middleware/auth');
const webhookAuth = require('../middleware/webhookAuth');
const logger = require('../config/logger');

const router = express.Router();

// Validation schemas
const createIntentSchema = Joi.object({
  orderId: Joi.string().required(),
  merchantId: Joi.string().required(),
  amount: Joi.number().positive().required(),
  currency: Joi.string().valid('SAR').default('SAR'),
  method: Joi.string().valid('MADA', 'STC_PAY', 'COD', 'APPLE_PAY', 'CREDIT_CARD').required(),
  customerPhone: Joi.string().required(),
  customerEmail: Joi.string().email().optional(),
  metadata: Joi.object().optional()
});

const confirmIntentSchema = Joi.object({
  gatewayTransactionId: Joi.string().optional(),
  collectedAmount: Joi.number().positive().optional(),
  metadata: Joi.object().optional()
});

const cancelIntentSchema = Joi.object({
  reason: Joi.string().optional()
});

// POST /api/payments/intents - Create payment intent
router.post('/intents', auth, async (req, res, next) => {
  try {
    const { error, value } = createIntentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message
        }
      });
    }

    // STUB: In production, this would initiate payment gateway session
    // For now, we just create the intent in our database
    const paymentIntent = new PaymentIntent({
      ...value,
      status: 'PENDING',
      attemptCount: 0
    });

    await paymentIntent.save();

    logger.info('Payment intent created', {
      intentId: paymentIntent._id,
      orderId: paymentIntent.orderId,
      method: paymentIntent.method,
      amount: paymentIntent.amount,
      requestId: req.id
    });

    // STUB: Simulate gateway response
    const stubResponse = {
      success: true,
      data: {
        intentId: paymentIntent._id,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        method: paymentIntent.method,
        // In production, this would be the gateway's payment URL or session token
        paymentUrl: `${process.env.PAYMENT_GATEWAY_URL || 'https://stub-gateway.example.com'}/pay/${paymentIntent._id}`,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutes
      }
    };

    res.status(201).json(stubResponse);
  } catch (err) {
    next(err);
  }
});

// GET /api/payments/intents/:id - Get payment intent details
router.get('/intents/:id', auth, async (req, res, next) => {
  try {
    const paymentIntent = await PaymentIntent.findById(req.params.id);

    if (!paymentIntent) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Payment intent not found'
        }
      });
    }

    res.json({
      success: true,
      data: paymentIntent
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/payments/intents/:id/confirm - Confirm payment
router.post('/intents/:id/confirm', auth, async (req, res, next) => {
  try {
    const { error, value } = confirmIntentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message
        }
      });
    }

    const paymentIntent = await PaymentIntent.findById(req.params.id);

    if (!paymentIntent) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Payment intent not found'
        }
      });
    }

    if (!paymentIntent.canConfirm()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STATUS',
          message: `Cannot confirm payment in ${paymentIntent.status} status`
        }
      });
    }

    // STUB: In production, this would verify payment with the gateway
    // For now, we simulate a successful confirmation
    paymentIntent.status = 'CONFIRMED';
    paymentIntent.confirmedAt = new Date();
    paymentIntent.attemptCount += 1;
    paymentIntent.lastAttemptAt = new Date();

    if (value.gatewayTransactionId) {
      paymentIntent.gatewayTransactionId = value.gatewayTransactionId;
    }

    if (value.collectedAmount) {
      paymentIntent.collectedAmount = value.collectedAmount;
      paymentIntent.collectedAt = new Date();
    }

    if (value.metadata) {
      paymentIntent.metadata = { ...paymentIntent.metadata, ...value.metadata };
    }

    // STUB: Simulate gateway response
    paymentIntent.gatewayResponse = {
      stub: true,
      simulatedAt: new Date(),
      transactionId: `stub_${Date.now()}`,
      authCode: `AUTH${Math.floor(Math.random() * 1000000)}`
    };

    await paymentIntent.save();

    logger.info('Payment confirmed', {
      intentId: paymentIntent._id,
      orderId: paymentIntent.orderId,
      method: paymentIntent.method,
      amount: paymentIntent.amount,
      requestId: req.id
    });

    res.json({
      success: true,
      data: paymentIntent
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/payments/intents/:id/cancel - Cancel payment
router.post('/intents/:id/cancel', auth, async (req, res, next) => {
  try {
    const { error, value } = cancelIntentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message
        }
      });
    }

    const paymentIntent = await PaymentIntent.findById(req.params.id);

    if (!paymentIntent) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Payment intent not found'
        }
      });
    }

    if (!paymentIntent.canCancel()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STATUS',
          message: `Cannot cancel payment in ${paymentIntent.status} status`
        }
      });
    }

    // STUB: In production, this would cancel/refund via gateway
    const previousStatus = paymentIntent.status;
    paymentIntent.status = 'CANCELLED';
    paymentIntent.cancelledAt = new Date();
    
    if (value.reason) {
      paymentIntent.failureReason = value.reason;
    }

    // If payment was already confirmed, treat as refund
    if (previousStatus === 'CONFIRMED') {
      paymentIntent.status = 'REFUNDED';
      paymentIntent.refundAmount = paymentIntent.amount;
      paymentIntent.refundedAt = new Date();
      paymentIntent.refundReason = value.reason;
    }

    await paymentIntent.save();

    logger.info('Payment cancelled', {
      intentId: paymentIntent._id,
      orderId: paymentIntent.orderId,
      previousStatus,
      newStatus: paymentIntent.status,
      requestId: req.id
    });

    res.json({
      success: true,
      data: paymentIntent
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/payments/webhook - Handle payment gateway webhooks
router.post('/webhook', webhookAuth, async (req, res, next) => {
  try {
    // STUB: In production, this would process real webhook events from payment gateway
    // Event types: payment.succeeded, payment.failed, payment.refunded, etc.
    
    const { eventType, intentId, transactionId, status, metadata } = req.body;

    logger.info('Webhook received', {
      eventType,
      intentId,
      transactionId,
      requestId: req.id
    });

    // Find and update payment intent based on webhook data
    const paymentIntent = await PaymentIntent.findById(intentId);

    if (!paymentIntent) {
      logger.warn('Webhook for unknown payment intent', { intentId });
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Payment intent not found'
        }
      });
    }

    // Update based on event type
    switch (eventType) {
      case 'payment.succeeded':
        if (paymentIntent.status === 'PENDING') {
          paymentIntent.status = 'CONFIRMED';
          paymentIntent.confirmedAt = new Date();
          paymentIntent.gatewayTransactionId = transactionId;
          paymentIntent.gatewayResponse = metadata || {};
        }
        break;
      
      case 'payment.failed':
        if (paymentIntent.status === 'PENDING') {
          paymentIntent.status = 'FAILED';
          paymentIntent.failedAt = new Date();
          paymentIntent.failureReason = metadata?.reason || 'Payment failed';
        }
        break;
      
      case 'payment.refunded':
        if (paymentIntent.status === 'CONFIRMED') {
          paymentIntent.status = 'REFUNDED';
          paymentIntent.refundedAt = new Date();
          paymentIntent.refundAmount = metadata?.amount || paymentIntent.amount;
          paymentIntent.refundReason = metadata?.reason;
        }
        break;
    }

    await paymentIntent.save();

    // STUB: In production, emit event to message queue for order service

    res.json({
      success: true,
      message: 'Webhook processed'
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/payments/reconcile - Reconciliation endpoint for accounting
router.get('/reconcile', auth, async (req, res, next) => {
  try {
    const { startDate, endDate, merchantId, status } = req.query;

    const filter = {};
    
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    if (merchantId) filter.merchantId = merchantId;
    if (status) filter.status = status;

    const payments = await PaymentIntent.find(filter).sort({ createdAt: -1 });

    const summary = {
      totalCount: payments.length,
      totalAmount: payments.reduce((sum, p) => sum + p.amount, 0),
      byStatus: {},
      byMethod: {}
    };

    payments.forEach(payment => {
      summary.byStatus[payment.status] = (summary.byStatus[payment.status] || 0) + 1;
      summary.byMethod[payment.method] = (summary.byMethod[payment.method] || 0) + 1;
    });

    logger.info('Reconciliation report generated', {
      filter,
      totalCount: summary.totalCount,
      requestId: req.id
    });

    res.json({
      success: true,
      data: {
        summary,
        payments
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
