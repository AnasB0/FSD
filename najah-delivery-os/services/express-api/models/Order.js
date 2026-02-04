const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  merchantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Merchant',
    required: true
  },
  orderNumber: {
    type: String,
    required: true,
    unique: true
  },
  externalOrderId: {
    type: String,
    index: true
  },
  items: [{
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
    sku: String,
    notes: String
  }],
  address: {
    ar: { type: String, required: true },
    en: String,
    components: {
      city: String,
      district: String,
      street: String,
      building: String,
      floor: String,
      apartment: String,
      postalCode: String
    },
    normalizedAddress: String,
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: [Number]
    },
    confidence: Number
  },
  customer: {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: String,
    notes: String
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled', 'failed'],
    default: 'pending'
  },
  timeWindow: {
    start: Date,
    end: Date,
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    }
  },
  pricing: {
    subtotal: { type: Number, required: true },
    deliveryFee: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    total: { type: Number, required: true }
  },
  courierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Courier'
  },
  routePlanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RoutePlan'
  },
  estimatedDeliveryTime: Date,
  actualDeliveryTime: Date,
  assignedAt: Date,
  pickedUpAt: Date,
  deliveredAt: Date,
  cancelledAt: Date,
  cancellationReason: String,
  statusHistory: [{
    status: String,
    timestamp: { type: Date, default: Date.now },
    updatedBy: String,
    notes: String
  }],
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

orderSchema.index({ merchantId: 1, createdAt: -1 });
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ courierId: 1 });
orderSchema.index({ 'address.location': '2dsphere' });
orderSchema.index({ 'timeWindow.start': 1, 'timeWindow.end': 1 });

module.exports = mongoose.model('Order', orderSchema);
