const mongoose = require('mongoose');

const paymentIntentSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    index: true
  },
  merchantId: {
    type: String,
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    required: true,
    default: 'SAR',
    enum: ['SAR']
  },
  method: {
    type: String,
    required: true,
    enum: ['MADA', 'STC_PAY', 'COD', 'APPLE_PAY', 'CREDIT_CARD'],
    index: true
  },
  status: {
    type: String,
    required: true,
    default: 'PENDING',
    enum: ['PENDING', 'CONFIRMED', 'CANCELLED', 'FAILED', 'REFUNDED'],
    index: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  // STUB: In production, this would contain gateway-specific data
  gatewayTransactionId: {
    type: String,
    sparse: true,
    index: true
  },
  gatewayResponse: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  // Customer information
  customerPhone: {
    type: String,
    required: true
  },
  customerEmail: {
    type: String
  },
  // Payment details for COD
  collectedAmount: {
    type: Number,
    min: 0
  },
  collectedAt: {
    type: Date
  },
  // Refund information
  refundAmount: {
    type: Number,
    min: 0
  },
  refundedAt: {
    type: Date
  },
  refundReason: {
    type: String
  },
  // Audit trail
  attemptCount: {
    type: Number,
    default: 0
  },
  lastAttemptAt: {
    type: Date
  },
  confirmedAt: {
    type: Date
  },
  cancelledAt: {
    type: Date
  },
  failedAt: {
    type: Date
  },
  failureReason: {
    type: String
  }
}, {
  timestamps: true
});

// Indexes for common queries
paymentIntentSchema.index({ createdAt: -1 });
paymentIntentSchema.index({ status: 1, createdAt: -1 });
paymentIntentSchema.index({ merchantId: 1, status: 1 });
paymentIntentSchema.index({ orderId: 1, status: 1 });

// Virtual for display amount
paymentIntentSchema.virtual('displayAmount').get(function() {
  return `${this.amount.toFixed(2)} ${this.currency}`;
});

// Methods
paymentIntentSchema.methods.canConfirm = function() {
  return this.status === 'PENDING';
};

paymentIntentSchema.methods.canCancel = function() {
  return ['PENDING', 'CONFIRMED'].includes(this.status);
};

paymentIntentSchema.methods.canRefund = function() {
  return this.status === 'CONFIRMED' && this.method !== 'COD';
};

module.exports = mongoose.model('PaymentIntent', paymentIntentSchema);
