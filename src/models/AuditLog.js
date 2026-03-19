const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    action: { type: String, required: true, maxlength: 120, index: true },
    entityType: { type: String, maxlength: 120, index: true },
    entityId: { type: mongoose.Schema.Types.ObjectId, index: true },
    metadata: { type: Object, default: {} },
    ip: { type: String, maxlength: 80 },
    userAgent: { type: String, maxlength: 400 }
  },
  { timestamps: true }
);

module.exports = mongoose.model('AuditLog', auditLogSchema);

