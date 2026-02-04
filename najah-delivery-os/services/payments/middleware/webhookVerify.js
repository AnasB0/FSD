const crypto = require('crypto');
const logger = require('../utils/logger');

const webhookVerify = (req, res, next) => {
  try {
    const signature = req.headers['x-payment-signature'];
    
    if (!signature) {
      logger.warn('Webhook request missing signature header');
      return res.status(401).json({
        success: false,
        error: 'Missing signature header'
      });
    }

    const webhookSecret = process.env.WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      logger.error('WEBHOOK_SECRET not configured');
      return res.status(500).json({
        success: false,
        error: 'Webhook verification not configured'
      });
    }

    const payload = JSON.stringify(req.body);
    
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(payload)
      .digest('hex');

    const signatureMatch = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );

    if (!signatureMatch) {
      logger.warn('Webhook signature verification failed', {
        receivedSignature: signature,
        expectedSignature: expectedSignature
      });
      return res.status(401).json({
        success: false,
        error: 'Invalid signature'
      });
    }

    logger.info('Webhook signature verified successfully');
    next();
  } catch (error) {
    logger.error('Webhook verification error:', error);
    return res.status(401).json({
      success: false,
      error: 'Signature verification failed'
    });
  }
};

module.exports = webhookVerify;
