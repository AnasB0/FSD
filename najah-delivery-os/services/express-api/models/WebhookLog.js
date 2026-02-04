const mongoose = require('mongoose');

const webhookLogSchema = new mongoose.Schema({
  merchantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Merchant',
    required: true
  },
  event: {
    type: String,
    required: true,
    enum: ['order.created', 'order.updated', 'order.assigned', 'order.delivered', 'order.failed', 'order.cancelled']
  },
  payload: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  signature: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'failed', 'retrying'],
    default: 'pending'
  },
  attempts: {
    type: Number,
    default: 0
  },
  lastAttempt: Date,
  response: {
    statusCode: Number,
    body: String,
    headers: mongoose.Schema.Types.Mixed
  },
  error: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

webhookLogSchema.index({ merchantId: 1, createdAt: -1 });
webhookLogSchema.index({ status: 1 });
webhookLogSchema.index({ event: 1 });

module.exports = mongoose.model('WebhookLog', webhookLogSchema);
