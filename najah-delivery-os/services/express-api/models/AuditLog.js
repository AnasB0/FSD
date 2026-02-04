const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: ['create', 'read', 'update', 'delete', 'login', 'logout', 'assign', 'unassign']
  },
  resource: {
    type: String,
    required: true,
    enum: ['order', 'merchant', 'courier', 'route_plan', 'user', 'webhook']
  },
  resourceId: {
    type: mongoose.Schema.Types.ObjectId
  },
  changes: {
    before: mongoose.Schema.Types.Mixed,
    after: mongoose.Schema.Types.Mixed
  },
  metadata: {
    ip: String,
    userAgent: String,
    requestId: String
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: false
});

auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ resource: 1, resourceId: 1, timestamp: -1 });
auditLogSchema.index({ timestamp: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
