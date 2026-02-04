const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const paymentIntentSchema = new mongoose.Schema({
  intentId: {
    type: String,
    unique: true,
    default: () => `pi_${uuidv4().replace(/-/g, '')}`
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  merchantId: {
    type: mongoose.Schema.Types.ObjectId,
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
    default: 'SAR',
    uppercase: true
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ['mada', 'stc_pay', 'cash_on_delivery'],
    lowercase: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'succeeded', 'failed', 'cancelled'],
    default: 'pending',
    index: true
  },
  metadata: {
    type: Object,
    default: {}
  },
  confirmedAt: {
    type: Date
  },
  cancelledAt: {
    type: Date
  }
}, {
  timestamps: true
});

paymentIntentSchema.index({ createdAt: -1 });
paymentIntentSchema.index({ merchantId: 1, status: 1 });

module.exports = mongoose.model('PaymentIntent', paymentIntentSchema);
