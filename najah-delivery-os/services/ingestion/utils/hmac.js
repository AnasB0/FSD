/**
 * HMAC Utility Functions
 * 
 * Provides functions for computing and verifying HMAC-SHA256 signatures.
 * 
 * HMAC (Hash-based Message Authentication Code):
 * -----------------------------------------------
 * A cryptographic technique that uses a hash function (SHA-256) and a
 * secret key to create a message authentication code. This ensures:
 * 
 * 1. Authentication: Only parties with the secret can create valid signatures
 * 2. Integrity: Any modification to the message invalidates the signature
 * 3. Non-repudiation: The sender cannot deny sending the message
 * 
 * Algorithm: HMAC-SHA256
 * ---------------------
 * - Hash Function: SHA-256 (produces 256-bit / 32-byte hash)
 * - Output: 64-character hexadecimal string
 * - Timing-safe comparison prevents timing attacks
 * 
 * Example Usage:
 * --------------
 * // Merchant side (Node.js)
 * const signature = computeSignature(JSON.stringify(orderData), webhookSecret);
 * 
 * // Service side
 * const isValid = verifySignature(payloadString, receivedSignature, webhookSecret);
 */

const crypto = require('crypto');
const logger = require('../config/logger');

/**
 * Compute HMAC-SHA256 signature for a given payload
 * 
 * @param {string} payload - The data to sign (usually JSON string)
 * @param {string} secret - The shared secret key
 * @returns {string} Hexadecimal signature string (64 characters)
 * 
 * @example
 * const payload = JSON.stringify({ orderId: '123', amount: 50.00 });
 * const secret = 'my-webhook-secret';
 * const signature = computeSignature(payload, secret);
 * // Returns: "a7f8d9e6c4b2a1..."
 */
const computeSignature = (payload, secret) => {
  if (!payload || typeof payload !== 'string') {
    throw new Error('Payload must be a non-empty string');
  }

  if (!secret || typeof secret !== 'string') {
    throw new Error('Secret must be a non-empty string');
  }

  try {
    // Create HMAC with SHA-256 algorithm
    const hmac = crypto.createHmac('sha256', secret);
    
    // Update HMAC with payload
    hmac.update(payload);
    
    // Generate signature as hexadecimal string
    const signature = hmac.digest('hex');
    
    return signature;
  } catch (err) {
    logger.error('Failed to compute HMAC signature', {
      error: err.message,
      stack: err.stack
    });
    throw new Error('Signature computation failed');
  }
};

/**
 * Verify HMAC-SHA256 signature
 * 
 * Uses timing-safe comparison to prevent timing attacks where an
 * attacker could determine the correct signature by measuring
 * response times.
 * 
 * @param {string} payload - The data that was signed
 * @param {string} receivedSignature - The signature to verify
 * @param {string} secret - The shared secret key
 * @returns {boolean} True if signature is valid, false otherwise
 * 
 * @example
 * const isValid = verifySignature(
 *   JSON.stringify(orderData),
 *   req.headers['x-merchant-signature'],
 *   process.env.WEBHOOK_SECRET
 * );
 */
const verifySignature = (payload, receivedSignature, secret) => {
  if (!payload || typeof payload !== 'string') {
    logger.warn('Invalid payload for signature verification', {
      payloadType: typeof payload
    });
    return false;
  }

  if (!receivedSignature || typeof receivedSignature !== 'string') {
    logger.warn('Invalid received signature', {
      signatureType: typeof receivedSignature
    });
    return false;
  }

  if (!secret || typeof secret !== 'string') {
    logger.error('Missing or invalid webhook secret');
    return false;
  }

  try {
    // Compute expected signature
    const expectedSignature = computeSignature(payload, secret);
    
    // Convert both signatures to buffers for timing-safe comparison
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');
    const receivedBuffer = Buffer.from(receivedSignature, 'hex');
    
    // Check if lengths match (required for timingSafeEqual)
    if (expectedBuffer.length !== receivedBuffer.length) {
      logger.debug('Signature length mismatch', {
        expected: expectedBuffer.length,
        received: receivedBuffer.length
      });
      return false;
    }
    
    // Timing-safe comparison prevents timing attacks
    // Returns true only if buffers are identical
    const isValid = crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
    
    if (!isValid) {
      logger.debug('Signature verification failed', {
        expectedPrefix: expectedSignature.substring(0, 10) + '...',
        receivedPrefix: receivedSignature.substring(0, 10) + '...'
      });
    }
    
    return isValid;
  } catch (err) {
    logger.error('Signature verification error', {
      error: err.message,
      stack: err.stack
    });
    return false;
  }
};

/**
 * Generate a secure random webhook secret
 * 
 * Used for creating new merchant webhook secrets.
 * Generates a cryptographically secure random string.
 * 
 * @param {number} length - Length in bytes (default: 32)
 * @returns {string} Hexadecimal string (length * 2 characters)
 * 
 * @example
 * const newSecret = generateSecret();
 * // Returns: "a7f8d9e6c4b2a1..." (64 characters)
 */
const generateSecret = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

module.exports = {
  computeSignature,
  verifySignature,
  generateSecret
};
