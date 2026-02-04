/**
 * Webhook Routes
 * 
 * Handles incoming webhook requests from merchants.
 * 
 * Security Flow:
 * 1. Merchant generates HMAC-SHA256 signature of payload using shared secret
 * 2. Merchant sends signature in x-merchant-signature header
 * 3. Service recomputes signature and compares with received signature
 * 4. Only processes webhook if signatures match
 * 
 * Processing Flow:
 * 1. Validate HMAC signature (webhookAuth middleware)
 * 2. Validate payload structure with Joi
 * 3. Create WebhookLog entry
 * 4. Create Order in database
 * 5. Trigger async normalization in Express API
 * 6. Return success response
 */

const express = require('express');
const router = express.Router();
const Joi = require('joi');
const axios = require('axios');
const logger = require('../config/logger');
const WebhookLog = require('../models/WebhookLog');
const webhookAuth = require('../middleware/webhookAuth');

// ============================================================================
// Validation Schemas
// ============================================================================

/**
 * Order webhook payload validation schema
 * Defines the expected structure and constraints for merchant order data
 */
const orderWebhookSchema = Joi.object({
  orderNumber: Joi.string()
    .required()
    .trim()
    .min(1)
    .max(100)
    .description('Merchant order reference number'),

  items: Joi.array()
    .items(
      Joi.object({
        sku: Joi.string().required().trim(),
        name: Joi.string().required().trim(),
        quantity: Joi.number().integer().min(1).required(),
        price: Joi.number().min(0).required(),
        weight: Joi.number().min(0).optional(),
        dimensions: Joi.object({
          length: Joi.number().min(0),
          width: Joi.number().min(0),
          height: Joi.number().min(0)
        }).optional()
      })
    )
    .min(1)
    .required()
    .description('Array of order items'),

  customer: Joi.object({
    name: Joi.string().required().trim(),
    phone: Joi.string().required().trim(),
    email: Joi.string().email().optional().trim(),
    alternatePhone: Joi.string().optional().trim()
  }).required().description('Customer information'),

  address: Joi.object({
    street: Joi.string().required().trim(),
    city: Joi.string().required().trim(),
    district: Joi.string().optional().trim(),
    building: Joi.string().optional().trim(),
    floor: Joi.string().optional().trim(),
    apartment: Joi.string().optional().trim(),
    landmark: Joi.string().optional().trim(),
    coordinates: Joi.object({
      latitude: Joi.number().min(-90).max(90).required(),
      longitude: Joi.number().min(-180).max(180).required()
    }).optional()
  }).required().description('Delivery address'),

  timeWindow: Joi.object({
    start: Joi.string().isoDate().required(),
    end: Joi.string().isoDate().required()
  }).required().description('Delivery time window'),

  notes: Joi.string().optional().trim().max(1000),
  
  priority: Joi.string()
    .valid('LOW', 'MEDIUM', 'HIGH', 'URGENT')
    .default('MEDIUM')
    .optional(),

  metadata: Joi.object().optional().description('Additional merchant-specific data')
});

// ============================================================================
// Webhook Endpoints
// ============================================================================

/**
 * POST /webhooks/:merchantId/orders
 * 
 * Receives order creation webhooks from merchants
 * 
 * Headers Required:
 * - Content-Type: application/json
 * - x-merchant-signature: HMAC-SHA256 signature of request body
 * 
 * @param {string} merchantId - Unique merchant identifier
 * @body {Object} Order data matching orderWebhookSchema
 */
router.post('/:merchantId/orders', webhookAuth, async (req, res) => {
  const startTime = Date.now();
  const { merchantId } = req.params;
  const signature = req.headers['x-merchant-signature'];
  
  logger.info('Processing order webhook', {
    requestId: req.id,
    merchantId,
    orderNumber: req.body.orderNumber
  });

  let webhookLog = null;

  try {
    // ========================================================================
    // Step 1: Validate Payload Structure
    // ========================================================================
    
    const { error, value } = orderWebhookSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const validationErrors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      logger.warn('Webhook payload validation failed', {
        requestId: req.id,
        merchantId,
        errors: validationErrors
      });

      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid webhook payload',
        details: validationErrors,
        requestId: req.id
      });
    }

    // ========================================================================
    // Step 2: Create Webhook Log Entry
    // ========================================================================
    
    webhookLog = new WebhookLog({
      merchantId,
      endpoint: `/webhooks/${merchantId}/orders`,
      method: 'POST',
      payload: req.body,
      signature,
      signatureValid: true, // Set by webhookAuth middleware
      status: 'PENDING',
      requestId: req.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    await webhookLog.save();

    logger.info('Webhook log created', {
      requestId: req.id,
      webhookLogId: webhookLog._id,
      merchantId
    });

    // ========================================================================
    // Step 3: Create Order in Database
    // ========================================================================
    
    // In a real implementation, you would have an Order model
    // For now, we'll prepare the order data structure
    const orderData = {
      merchantId,
      merchantOrderNumber: value.orderNumber,
      items: value.items,
      customer: value.customer,
      deliveryAddress: value.address,
      timeWindow: {
        start: new Date(value.timeWindow.start),
        end: new Date(value.timeWindow.end)
      },
      notes: value.notes,
      priority: value.priority || 'MEDIUM',
      metadata: value.metadata,
      status: 'PENDING_NORMALIZATION',
      source: 'WEBHOOK',
      webhookLogId: webhookLog._id,
      createdAt: new Date()
    };

    // TODO: Create actual Order document
    // const order = await Order.create(orderData);
    // For demonstration, we'll simulate an order ID
    const orderId = new Date().getTime().toString();

    logger.info('Order created', {
      requestId: req.id,
      orderId,
      merchantId,
      orderNumber: value.orderNumber
    });

    // ========================================================================
    // Step 4: Trigger Express API Normalization (Async)
    // ========================================================================
    
    // Call Express API to normalize the order asynchronously
    // This doesn't block the webhook response
    setImmediate(async () => {
      try {
        const expressApiUrl = process.env.EXPRESS_API_URL || 'http://localhost:3002';
        const normalizeUrl = `${expressApiUrl}/orders/${orderId}/normalize`;

        logger.info('Triggering order normalization', {
          requestId: req.id,
          orderId,
          url: normalizeUrl
        });

        const response = await axios.post(normalizeUrl, orderData, {
          timeout: 5000,
          headers: {
            'Content-Type': 'application/json',
            'x-request-id': req.id
          }
        });

        logger.info('Order normalization triggered successfully', {
          requestId: req.id,
          orderId,
          status: response.status
        });

      } catch (normalizationError) {
        logger.error('Failed to trigger order normalization', {
          requestId: req.id,
          orderId,
          error: normalizationError.message,
          stack: normalizationError.stack
        });
        
        // Don't fail the webhook - normalization can be retried later
        // This could trigger a retry mechanism or alert
      }
    });

    // ========================================================================
    // Step 5: Update Webhook Log and Return Success
    // ========================================================================
    
    const processingTime = Date.now() - startTime;

    const responseBody = {
      success: true,
      orderId,
      webhookLogId: webhookLog._id.toString(),
      message: 'Order received and queued for processing',
      requestId: req.id
    };

    await webhookLog.markSuccess(orderId, processingTime, 201, responseBody);

    logger.info('Webhook processed successfully', {
      requestId: req.id,
      webhookLogId: webhookLog._id,
      orderId,
      processingTimeMs: processingTime
    });

    res.status(201).json(responseBody);

  } catch (err) {
    // ========================================================================
    // Error Handling
    // ========================================================================
    
    const processingTime = Date.now() - startTime;

    logger.error('Webhook processing error', {
      requestId: req.id,
      merchantId,
      error: err.message,
      stack: err.stack
    });

    // Update webhook log with error if it was created
    if (webhookLog) {
      await webhookLog.markFailed(err, processingTime, 500);
    }

    res.status(500).json({
      error: 'PROCESSING_ERROR',
      message: 'Failed to process webhook',
      requestId: req.id
    });
  }
});

/**
 * GET /webhooks/:merchantId/logs
 * 
 * Retrieve webhook logs for a merchant (for debugging and monitoring)
 * 
 * Query parameters:
 * - status: Filter by status (SUCCESS, FAILED, PENDING)
 * - limit: Number of records to return (default: 50, max: 100)
 * - page: Page number for pagination
 */
router.get('/:merchantId/logs', webhookAuth, async (req, res) => {
  try {
    const { merchantId } = req.params;
    const { status, limit = 50, page = 1 } = req.query;

    const query = { merchantId };
    if (status) {
      query.status = status.toUpperCase();
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = Math.min(parseInt(limit), 100);

    const logs = await WebhookLog.find(query)
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .skip(skip)
      .select('-payload.metadata -error.stack'); // Exclude sensitive data

    const total = await WebhookLog.countDocuments(query);

    res.json({
      data: logs,
      pagination: {
        page: parseInt(page),
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });

  } catch (err) {
    logger.error('Failed to retrieve webhook logs', {
      requestId: req.id,
      error: err.message
    });

    res.status(500).json({
      error: 'RETRIEVAL_ERROR',
      message: 'Failed to retrieve webhook logs',
      requestId: req.id
    });
  }
});

module.exports = router;
