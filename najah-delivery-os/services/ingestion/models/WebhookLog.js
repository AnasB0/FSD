/**
 * WebhookLog Model
 * 
 * Tracks all incoming webhook requests for:
 * - Audit trail and compliance
 * - Debugging and troubleshooting
 * - Retry mechanism tracking
 * - Analytics and monitoring
 */

const mongoose = require('mongoose');

const webhookLogSchema = new mongoose.Schema({
  // Merchant identification
  merchantId: {
    type: String,
    required: true,
    index: true,
    trim: true,
    description: 'Unique identifier for the merchant sending the webhook'
  },

  // Request details
  endpoint: {
    type: String,
    required: true,
    description: 'The endpoint that received the webhook (e.g., /webhooks/:merchantId/orders)'
  },

  method: {
    type: String,
    required: true,
    enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    default: 'POST',
    description: 'HTTP method used for the request'
  },

  // Payload and security
  payload: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
    description: 'The complete payload received in the webhook request'
  },

  signature: {
    type: String,
    required: true,
    description: 'HMAC signature provided in x-merchant-signature header'
  },

  signatureValid: {
    type: Boolean,
    required: true,
    description: 'Whether the HMAC signature validation passed'
  },

  // Processing status
  status: {
    type: String,
    required: true,
    enum: ['PENDING', 'SUCCESS', 'FAILED'],
    default: 'PENDING',
    index: true,
    description: 'Current processing status of the webhook'
  },

  // Error tracking
  error: {
    message: {
      type: String,
      description: 'Error message if processing failed'
    },
    code: {
      type: String,
      description: 'Error code for categorization'
    },
    stack: {
      type: String,
      description: 'Stack trace for debugging (only in non-production)'
    }
  },

  // Retry mechanism
  retryCount: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
    description: 'Number of retry attempts made for failed webhooks'
  },

  lastRetryAt: {
    type: Date,
    description: 'Timestamp of the last retry attempt'
  },

  nextRetryAt: {
    type: Date,
    description: 'Scheduled timestamp for next retry (exponential backoff)'
  },

  // Related entities
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    description: 'Reference to the created Order document'
  },

  // Request metadata
  requestId: {
    type: String,
    index: true,
    description: 'Unique request ID for correlation across services'
  },

  ipAddress: {
    type: String,
    description: 'IP address of the webhook sender'
  },

  userAgent: {
    type: String,
    description: 'User-Agent header from the request'
  },

  // Processing time tracking
  processingTimeMs: {
    type: Number,
    description: 'Time taken to process the webhook in milliseconds'
  },

  // Response details
  responseCode: {
    type: Number,
    description: 'HTTP response code sent back to merchant'
  },

  responseBody: {
    type: mongoose.Schema.Types.Mixed,
    description: 'Response body sent back to merchant'
  }

}, {
  timestamps: true, // Adds createdAt and updatedAt
  collection: 'webhook_logs'
});

// ============================================================================
// Indexes for Performance
// ============================================================================

// Compound index for querying by merchant and status
webhookLogSchema.index({ merchantId: 1, status: 1 });

// Index for retry queries
webhookLogSchema.index({ status: 1, nextRetryAt: 1 });

// Index for request correlation
webhookLogSchema.index({ requestId: 1 });

// TTL index to automatically delete old logs after 90 days (optional)
webhookLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

// ============================================================================
// Instance Methods
// ============================================================================

/**
 * Mark webhook as successfully processed
 */
webhookLogSchema.methods.markSuccess = function(orderId, processingTimeMs, responseCode, responseBody) {
  this.status = 'SUCCESS';
  this.orderId = orderId;
  this.processingTimeMs = processingTimeMs;
  this.responseCode = responseCode;
  this.responseBody = responseBody;
  return this.save();
};

/**
 * Mark webhook as failed with error details
 */
webhookLogSchema.methods.markFailed = function(error, processingTimeMs, responseCode) {
  this.status = 'FAILED';
  this.error = {
    message: error.message || 'Unknown error',
    code: error.code || 'UNKNOWN_ERROR',
    stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
  };
  this.processingTimeMs = processingTimeMs;
  this.responseCode = responseCode;
  
  // Calculate next retry time with exponential backoff
  if (this.retryCount < 5) {
    const backoffMinutes = Math.pow(2, this.retryCount) * 5; // 5, 10, 20, 40, 80 minutes
    this.nextRetryAt = new Date(Date.now() + backoffMinutes * 60 * 1000);
  }
  
  return this.save();
};

/**
 * Increment retry counter
 */
webhookLogSchema.methods.incrementRetry = function() {
  this.retryCount += 1;
  this.lastRetryAt = new Date();
  this.status = 'PENDING';
  return this.save();
};

// ============================================================================
// Static Methods
// ============================================================================

/**
 * Get webhooks pending retry
 */
webhookLogSchema.statics.getPendingRetries = function() {
  return this.find({
    status: 'FAILED',
    retryCount: { $lt: 5 },
    nextRetryAt: { $lte: new Date() }
  }).limit(100);
};

/**
 * Get webhook statistics for a merchant
 */
webhookLogSchema.statics.getStats = function(merchantId, startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        merchantId,
        createdAt: {
          $gte: startDate,
          $lte: endDate
        }
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgProcessingTime: { $avg: '$processingTimeMs' }
      }
    }
  ]);
};

module.exports = mongoose.model('WebhookLog', webhookLogSchema);
