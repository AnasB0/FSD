const mongoose = require('mongoose');

const shipmentSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  courierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Courier',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'picked_up', 'in_transit', 'delivered', 'failed'],
    default: 'pending'
  },
  pickupTime: {
    type: Date
  },
  deliveryTime: {
    type: Date
  },
  signature: {
    type: String
  },
  notes: {
    type: String
  }
});

shipmentSchema.index({ orderId: 1 });
shipmentSchema.index({ courierId: 1 });
shipmentSchema.index({ status: 1 });

module.exports = mongoose.model('Shipment', shipmentSchema);
