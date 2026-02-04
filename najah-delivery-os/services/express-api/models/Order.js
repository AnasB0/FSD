const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  merchantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Merchant',
    required: true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled', 'failed'],
    default: 'pending'
  },
  address: {
    ar: { type: String, required: true },
    en: { type: String, required: true },
    components: {
      street: String,
      district: String,
      city: String,
      postal_code: String
    },
    coordinates: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true }
    }
  },
  timeWindow: {
    start: { type: Date, required: true },
    end: { type: Date, required: true }
  },
  priority: {
    type: Number,
    default: 1,
    min: 1,
    max: 5
  },
  courierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Courier'
  },
  routePlanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RoutePlan'
  },
  items: [{
    name: { type: String, required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true }
  }],
  totalAmount: {
    type: Number,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

orderSchema.index({ merchantId: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ courierId: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ 'address.coordinates.lat': 1, 'address.coordinates.lng': 1 });

orderSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Order', orderSchema);
