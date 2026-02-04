const mongoose = require('mongoose');

const routePlanSchema = new mongoose.Schema({
  courierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Courier',
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['draft', 'planned', 'in_progress', 'completed', 'cancelled'],
    default: 'draft'
  },
  orders: [{
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true
    },
    sequence: { type: Number, required: true },
    estimatedArrival: Date,
    actualArrival: Date,
    status: {
      type: String,
      enum: ['pending', 'picked_up', 'delivered', 'failed'],
      default: 'pending'
    }
  }],
  optimizedRoute: {
    waypoints: [{
      orderId: mongoose.Schema.Types.ObjectId,
      location: {
        type: { type: String, enum: ['Point'] },
        coordinates: [Number]
      },
      address: String,
      sequence: Number,
      estimatedArrival: Date,
      timeWindow: {
        start: Date,
        end: Date
      }
    }],
    totalDistance: Number,
    totalDuration: Number,
    encodedPolyline: String
  },
  stats: {
    totalOrders: { type: Number, default: 0 },
    completedOrders: { type: Number, default: 0 },
    failedOrders: { type: Number, default: 0 },
    totalDistance: { type: Number, default: 0 },
    totalDuration: { type: Number, default: 0 },
    efficiency: { type: Number, default: 0 }
  },
  startLocation: {
    type: {
      type: String,
      enum: ['Point']
    },
    coordinates: [Number]
  },
  endLocation: {
    type: {
      type: String,
      enum: ['Point']
    },
    coordinates: [Number]
  },
  startTime: Date,
  endTime: Date,
  estimatedStartTime: Date,
  estimatedEndTime: Date,
  notes: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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

routePlanSchema.index({ courierId: 1, date: -1 });
routePlanSchema.index({ status: 1 });
routePlanSchema.index({ date: 1 });

module.exports = mongoose.model('RoutePlan', routePlanSchema);
