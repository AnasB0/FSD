const mongoose = require('mongoose');

const courierSchema = new mongoose.Schema({
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
  phone: {
    type: String,
    required: true
  },
  vehicle: {
    type: {
      type: String,
      enum: ['bicycle', 'motorcycle', 'car', 'van'],
      required: true
    },
    plateNumber: String,
    model: String,
    color: String,
    capacity: {
      weight: Number,
      volume: Number,
      orders: { type: Number, default: 10 }
    }
  },
  status: {
    type: String,
    enum: ['available', 'busy', 'offline', 'on_break'],
    default: 'offline'
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    },
    accuracy: Number,
    heading: Number,
    speed: Number,
    lastUpdated: Date
  },
  shift: {
    start: String,
    end: String,
    workingDays: [{
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    }]
  },
  currentRoute: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RoutePlan'
  },
  stats: {
    totalDeliveries: { type: Number, default: 0 },
    successfulDeliveries: { type: Number, default: 0 },
    failedDeliveries: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0 },
    totalDistance: { type: Number, default: 0 },
    totalWorkingHours: { type: Number, default: 0 }
  },
  documents: {
    licenseNumber: String,
    licenseExpiry: Date,
    identityNumber: String,
    identityExpiry: Date
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

courierSchema.index({ location: '2dsphere' });
courierSchema.index({ status: 1 });
courierSchema.index({ email: 1 });

module.exports = mongoose.model('Courier', courierSchema);
