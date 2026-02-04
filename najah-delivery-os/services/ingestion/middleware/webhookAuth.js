/**
 * Webhook Authentication Middleware
 * 
 * Implements HMAC-SHA256 signature verification for webhook security.
 * 
 * Security Concept:
 * ----------------
 * HMAC (Hash-based Message Authentication Code) ensures:
 * 1. Authenticity - Request comes from merchant who knows the secret
 * 2. Integrity - Payload hasn't been tampered with in transit
 * 3. Non-repudiation - Merchant can't deny sending the request
 * 
 * How it works:
 * 1. Merchant and service share a secret key (WEBHOOK_SECRET)
 * 2. Merchant computes: HMAC-SHA256(payload, secret)
 * 3. Merchant sends signature in x-merchant-signature header
 * 4. Service recomputes signature using same method
 * 5. Service compares signatures using timing-safe comparison
 * 6. Request is rejected if signatures don't match
 * 
 * Timing Attack Prevention:
 * -------------------------
 * Uses crypto.timingSafeEqual() to prevent timing attacks where
 * an attacker could determine the signature byte-by-byte by
 * measuring response times.
 */

const logger = require('../config/logger');
const { verifySignature } = require('../utils/hmac');

/**
 * Middleware to verify HMAC signature of webhook requests
 */
const webhookAuth = (req, res, next) => {
  const signature = req.headers['x-merchant-signature'];
  const merchantId = req.params.merchantId;

  logger.debug('Verifying webhook signature', {
    requestId: req.id,
    merchantId,
    hasSignature: !!signature,
    contentLength: req.headers['content-length']
  });

  // ============================================================================
  // Step 1: Check if signature header is present
  // ============================================================================
  
  if (!signature) {
    logger.warn('Missing webhook signature', {
      requestId: req.id,
      merchantId,
      ip: req.ip
    });

    return res.status(401).json({
      error: 'MISSING_SIGNATURE',
      message: 'x-merchant-signature header is required',
      requestId: req.id,
      documentation: 'https://docs.najahdelivery.com/webhooks/authentication'
    });
  }

  // ============================================================================
  // Step 2: Verify signature format (hex string)
  // ============================================================================
  
  if (!/^[a-f0-9]{64}$/i.test(signature)) {
    logger.warn('Invalid signature format', {
      requestId: req.id,
      merchantId,
      signature: signature.substring(0, 10) + '...'
    });

    return res.status(401).json({
      error: 'INVALID_SIGNATURE_FORMAT',
      message: 'Signature must be a 64-character hexadecimal string (SHA-256)',
      requestId: req.id
    });
  }

  // ============================================================================
  // Step 3: Verify signature using HMAC
  // ============================================================================
  
  try {
    // Convert request body back to string for signature verification
    // Important: Must use exact same string that merchant used for signing
    const payload = JSON.stringify(req.body);
    
    const isValid = verifySignature(
      payload,
      signature,
      process.env.WEBHOOK_SECRET
    );

    if (!isValid) {
      logger.warn('Invalid webhook signature', {
        requestId: req.id,
        merchantId,
        ip: req.ip,
        receivedSignature: signature.substring(0, 10) + '...'
      });

      return res.status(401).json({
        error: 'INVALID_SIGNATURE',
        message: 'Webhook signature verification failed',
        requestId: req.id,
        hint: 'Ensure you are using the correct secret and signing the raw JSON payload'
      });
    }

    logger.info('Webhook signature verified', {
      requestId: req.id,
      merchantId
    });

    // Signature is valid, proceed to next middleware
    next();

  } catch (err) {
    logger.error('Signature verification error', {
      requestId: req.id,
      merchantId,
      error: err.message,
      stack: err.stack
    });

    return res.status(500).json({
      error: 'VERIFICATION_ERROR',
      message: 'Failed to verify webhook signature',
      requestId: req.id
    });
  }
};

module.exports = webhookAuth;
