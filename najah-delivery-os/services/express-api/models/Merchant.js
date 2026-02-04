const mongoose = require('mongoose');

const merchantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  apiKey: {
    type: String,
    unique: true,
    sparse: true
  },
  address: {
    ar: { type: String, required: true },
    en: { type: String },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number],
        required: true
      }
    },
    city: String,
    district: String,
    postalCode: String
  },
  phone: {
    type: String,
    required: true
  },
  businessType: {
    type: String,
    enum: ['restaurant', 'retail', 'pharmacy', 'grocery', 'other'],
    default: 'retail'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  settings: {
    notificationEmail: String,
    webhookUrl: String,
    webhookSecret: String,
    autoAcceptOrders: { type: Boolean, default: false },
    maxDailyOrders: { type: Number, default: 100 }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

merchantSchema.index({ 'address.location': '2dsphere' });
merchantSchema.index({ email: 1 });
merchantSchema.index({ status: 1 });

module.exports = mongoose.model('Merchant', merchantSchema);
