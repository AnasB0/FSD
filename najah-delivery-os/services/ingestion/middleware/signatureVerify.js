const crypto = require('crypto');
const logger = require('../utils/logger');

const verifySignature = (secret, rawBody, signature) => {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(rawBody);
  const computed = hmac.digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(computed),
    Buffer.from(signature)
  );
};

const signatureVerifyMiddleware = (merchant) => {
  return (req, res, next) => {
    try {
      const signature = req.headers['x-merchant-signature'];
      
      if (!signature) {
        logger.warn('Missing signature header');
        return res.status(401).json({ 
          error: 'Missing x-merchant-signature header' 
        });
      }

      if (!req.rawBody) {
        logger.error('Missing raw body for signature verification');
        return res.status(500).json({ 
          error: 'Internal error: raw body not available' 
        });
      }

      const isValid = verifySignature(
        merchant.webhook_secret,
        req.rawBody,
        signature
      );

      if (!isValid) {
        logger.warn('Invalid signature', { 
          merchantId: merchant._id,
          signature 
        });
        return res.status(401).json({ 
          error: 'Invalid signature' 
        });
      }

      logger.info('Signature verified successfully', { 
        merchantId: merchant._id 
      });
      next();
    } catch (error) {
      logger.error('Signature verification error', { error: error.message });
      return res.status(500).json({ 
        error: 'Signature verification failed' 
      });
    }
  };
};

module.exports = { verifySignature, signatureVerifyMiddleware };
