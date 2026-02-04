const crypto = require('crypto');
const logger = require('../config/logger');

// STUB: Webhook signature validation middleware
// In production, this validates webhook signatures from payment gateways
module.exports = (req, res, next) => {
  try {
    const signature = req.headers['x-webhook-signature'];
    const timestamp = req.headers['x-webhook-timestamp'];

    if (!signature || !timestamp) {
      logger.warn('Webhook missing signature or timestamp', {
        hasSignature: !!signature,
        hasTimestamp: !!timestamp,
        requestId: req.id
      });

      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing webhook signature or timestamp'
        }
      });
    }

    // STUB: In production, verify signature against gateway's signing secret
    // Example for MADA/Hyperpay:
    // const payload = timestamp + JSON.stringify(req.body);
    // const expectedSignature = crypto
    //   .createHmac('sha256', process.env.WEBHOOK_SECRET)
    //   .update(payload)
    //   .digest('hex');
    
    // For now, in development mode, accept any signature
    if (process.env.NODE_ENV === 'development') {
      logger.debug('Webhook signature check bypassed (development mode)', {
        requestId: req.id
      });
      return next();
    }

    // Verify timestamp is recent (within 5 minutes)
    const requestTime = parseInt(timestamp);
    const currentTime = Math.floor(Date.now() / 1000);
    const timeDiff = Math.abs(currentTime - requestTime);

    if (timeDiff > 300) {
      logger.warn('Webhook timestamp too old', {
        timeDiff,
        requestId: req.id
      });

      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TIMESTAMP',
          message: 'Webhook timestamp is too old'
        }
      });
    }

    // Compute expected signature
    const payload = timestamp + JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha256', process.env.WEBHOOK_SECRET || 'default-webhook-secret')
      .update(payload)
      .digest('hex');

    // Compare signatures using timing-safe comparison
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      logger.warn('Invalid webhook signature', {
        requestId: req.id
      });

      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_SIGNATURE',
          message: 'Invalid webhook signature'
        }
      });
    }

    logger.debug('Webhook signature verified', {
      requestId: req.id
    });

    next();
  } catch (error) {
    logger.error('Webhook authentication error', {
      error: error.message,
      requestId: req.id
    });

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Error verifying webhook signature'
      }
    });
  }
};
