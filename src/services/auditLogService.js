const AuditLog = require('../models/AuditLog');

class AuditLogService {
  static async create(entry = {}) {
    // Fire-and-forget style: don't block the main request on audit write.
    return AuditLog.create({
      actorId: entry.actorId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      metadata: entry.metadata || {},
      ip: entry.ip,
      userAgent: entry.userAgent
    });
  }
}

module.exports = AuditLogService;

