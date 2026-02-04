const mongoose = require('mongoose');

const courierSchema = new mongoose.Schema({
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
  vehicle: {
    type: String,
    enum: ['motorcycle', 'car', 'van', 'bicycle'],
    default: 'motorcycle'
  },
  status: {
    type: String,
    enum: ['available', 'busy', 'offline', 'on_break'],
    default: 'offline'
  },
  currentLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    }
  },
  shift: {
    start: { type: String, required: true },
    end: { type: String, required: true }
  },
  capacity: {
    type: Number,
    default: 10
  },
  merchantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Merchant'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

courierSchema.index({ status: 1 });
courierSchema.index({ merchantId: 1 });
courierSchema.index({ currentLocation: '2dsphere' });

module.exports = mongoose.model('Courier', courierSchema);
