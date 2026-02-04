const express = require('express');
const Joi = require('joi');
const PaymentIntent = require('../models/PaymentIntent');
const { processMada, processStcPay, processCOD } = require('../utils/paymentProcessor');
const logger = require('../utils/logger');
const authMiddleware = require('../middleware/auth');
const webhookVerify = require('../middleware/webhookVerify');

const router = express.Router();

const createIntentSchema = Joi.object({
  orderId: Joi.string().required(),
  merchantId: Joi.string().required(),
  amount: Joi.number().min(0).required(),
  currency: Joi.string().default('SAR'),
  paymentMethod: Joi.string().valid('mada', 'stc_pay', 'cash_on_delivery').required(),
  metadata: Joi.object().optional()
});

router.post('/intents', authMiddleware, async (req, res) => {
  try {
    const { error, value } = createIntentSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    const intent = new PaymentIntent(value);
    await intent.save();

    logger.info(`Payment intent created: ${intent.intentId}`, {
      orderId: intent.orderId,
      amount: intent.amount,
      paymentMethod: intent.paymentMethod
    });

    res.status(201).json({
      success: true,
      data: intent
    });
  } catch (error) {
    logger.error('Error creating payment intent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create payment intent'
    });
  }
});

router.get('/intents/:id', authMiddleware, async (req, res) => {
  try {
    const intent = await PaymentIntent.findOne({ intentId: req.params.id });

    if (!intent) {
      return res.status(404).json({
        success: false,
        error: 'Payment intent not found'
      });
    }

    res.json({
      success: true,
      data: intent
    });
  } catch (error) {
    logger.error('Error fetching payment intent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment intent'
    });
  }
});

router.post('/intents/:id/confirm', authMiddleware, async (req, res) => {
  try {
    const intent = await PaymentIntent.findOne({ intentId: req.params.id });

    if (!intent) {
      return res.status(404).json({
        success: false,
        error: 'Payment intent not found'
      });
    }

    if (intent.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: `Cannot confirm payment in ${intent.status} status`
      });
    }

    intent.status = 'processing';
    await intent.save();

    let processingResult;
    
    switch (intent.paymentMethod) {
      case 'mada':
        processingResult = await processMada(intent);
        break;
      case 'stc_pay':
        processingResult = await processStcPay(intent);
        break;
      case 'cash_on_delivery':
        processingResult = await processCOD(intent);
        break;
      default:
        throw new Error(`Unsupported payment method: ${intent.paymentMethod}`);
    }

    if (processingResult.success) {
      intent.status = 'succeeded';
      intent.confirmedAt = new Date();
      intent.metadata = {
        ...intent.metadata,
        ...processingResult
      };
      await intent.save();

      logger.info(`Payment intent confirmed: ${intent.intentId}`, {
        transactionId: processingResult.transactionId
      });

      res.json({
        success: true,
        data: intent,
        processing: processingResult
      });
    } else {
      intent.status = 'failed';
      await intent.save();

      res.status(400).json({
        success: false,
        error: 'Payment processing failed',
        data: intent
      });
    }
  } catch (error) {
    logger.error('Error confirming payment intent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to confirm payment intent'
    });
  }
});

router.post('/intents/:id/cancel', authMiddleware, async (req, res) => {
  try {
    const intent = await PaymentIntent.findOne({ intentId: req.params.id });

    if (!intent) {
      return res.status(404).json({
        success: false,
        error: 'Payment intent not found'
      });
    }

    if (intent.status === 'succeeded') {
      return res.status(400).json({
        success: false,
        error: 'Cannot cancel a succeeded payment'
      });
    }

    if (intent.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        error: 'Payment already cancelled'
      });
    }

    intent.status = 'cancelled';
    intent.cancelledAt = new Date();
    await intent.save();

    logger.info(`Payment intent cancelled: ${intent.intentId}`);

    res.json({
      success: true,
      data: intent
    });
  } catch (error) {
    logger.error('Error cancelling payment intent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel payment intent'
    });
  }
});

router.post('/webhook', webhookVerify, async (req, res) => {
  try {
    const event = req.body;

    logger.info('Webhook event received', {
      type: event.type,
      intentId: event.intentId,
      timestamp: event.timestamp
    });

    // In a real implementation, process the webhook event
    // For stub, just log and return success

    res.status(200).json({
      success: true,
      message: 'Webhook received'
    });
  } catch (error) {
    logger.error('Error processing webhook:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process webhook'
    });
  }
});

router.get('/reconcile', authMiddleware, async (req, res) => {
  try {
    const { status, merchantId, startDate, endDate } = req.query;
    
    const filter = {};
    
    if (status) {
      filter.status = status;
    }
    
    if (merchantId) {
      filter.merchantId = merchantId;
    }
    
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.createdAt.$lte = new Date(endDate);
      }
    }

    const intents = await PaymentIntent.find(filter)
      .sort({ createdAt: -1 })
      .limit(1000);

    const summary = {
      totalCount: intents.length,
      totalAmount: intents.reduce((sum, intent) => sum + intent.amount, 0),
      byStatus: {},
      byPaymentMethod: {}
    };

    intents.forEach(intent => {
      summary.byStatus[intent.status] = (summary.byStatus[intent.status] || 0) + 1;
      summary.byPaymentMethod[intent.paymentMethod] = (summary.byPaymentMethod[intent.paymentMethod] || 0) + 1;
    });

    logger.info('Reconciliation request processed', {
      filter,
      resultCount: intents.length
    });

    res.json({
      success: true,
      data: intents,
      summary
    });
  } catch (error) {
    logger.error('Error in reconciliation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch reconciliation data'
    });
  }
});

module.exports = router;
