const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const webhookLogSchema = new mongoose.Schema({
  webhookId: {
    type: String,
    unique: true,
    default: uuidv4
  },
  merchantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Merchant',
    required: true,
    index: true
  },
  event: {
    type: String,
    default: 'order.created'
  },
  payload: {
    type: mongoose.Schema.Types.Mixed
  },
  signature: {
    type: String
  },
  status: {
    type: String,
    enum: ['received', 'validated', 'processed', 'failed'],
    default: 'received'
  },
  errorMessage: {
    type: String
  },
  receivedAt: {
    type: Date,
    default: Date.now
  },
  processedAt: {
    type: Date
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('WebhookLog', webhookLogSchema);
