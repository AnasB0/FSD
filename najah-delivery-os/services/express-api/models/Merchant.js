const mongoose = require('mongoose');

const merchantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: true
  },
  address: {
    ar: { type: String, required: true },
    en: { type: String, required: true }
  },
  webhook_secret: {
    type: String,
    required: true
  },
  api_key: {
    type: String,
    required: true,
    unique: true
  },
  active: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

merchantSchema.index({ email: 1 });
merchantSchema.index({ api_key: 1 });
merchantSchema.index({ active: 1 });

module.exports = mongoose.model('Merchant', merchantSchema);
