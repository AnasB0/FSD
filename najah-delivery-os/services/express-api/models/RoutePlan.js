const mongoose = require('mongoose');

const routePlanSchema = new mongoose.Schema({
  courierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Courier',
    required: true
  },
  merchantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Merchant',
    required: true
  },
  orders: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  }],
  status: {
    type: String,
    enum: ['pending', 'active', 'completed', 'cancelled'],
    default: 'pending'
  },
  totalDistance: {
    type: Number,
    default: 0
  },
  totalDuration: {
    type: Number,
    default: 0
  },
  optimizedAt: {
    type: Date
  },
  startedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  }
});

routePlanSchema.index({ courierId: 1 });
routePlanSchema.index({ merchantId: 1 });
routePlanSchema.index({ status: 1 });
routePlanSchema.index({ optimizedAt: -1 });

module.exports = mongoose.model('RoutePlan', routePlanSchema);
