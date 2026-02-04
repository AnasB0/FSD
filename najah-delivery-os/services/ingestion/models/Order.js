const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  merchantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Merchant',
    required: true
  },
  externalOrderId: {
    type: String,
    index: true
  },
  customerName: {
    type: String,
    required: true
  },
  customerPhone: {
    type: String,
    required: true
  },
  address: {
    ar: String,
    en: String,
    components: {
      street: String,
      district: String,
      city: String,
      postalCode: String
    },
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  items: [{
    name: String,
    quantity: Number,
    price: Number,
    sku: String
  }],
  totalAmount: {
    type: Number,
    required: true
  },
  timeWindow: {
    start: Date,
    end: Date
  },
  status: {
    type: String,
    enum: [
      'pending',
      'accepted',
      'normalized',
      'planned',
      'assigned',
      'picked_up',
      'in_transit',
      'delivered',
      'cancelled'
    ],
    default: 'pending'
  }
}, {
  timestamps: true
});

orderSchema.index({ merchantId: 1, externalOrderId: 1 }, { unique: true });

module.exports = mongoose.model('Order', orderSchema);
