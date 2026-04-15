const AuditLog = require('./auditLog.model');

const createAuditEntry = async (payload) => {
  await AuditLog.create({
    actor: payload.actor || null,
    action: payload.action,
    entityType: payload.entityType,
    entityId: payload.entityId ? String(payload.entityId) : null,
    method: payload.method,
    route: payload.route,
    statusCode: payload.statusCode,
    ip: payload.ip,
    userAgent: payload.userAgent,
    requestId: payload.requestId,
    before: payload.before || null,
    after: payload.after || null
  });
};

const listAuditLogs = async (query) => {
  const filter = {};

  if (query.actor) {
    filter.actor = query.actor;
  }
  if (query.entityType) {
    filter.entityType = query.entityType;
  }
  if (query.entityId) {
    filter.entityId = query.entityId;
  }
  if (query.method) {
    filter.method = query.method;
  }

  const page = Number(query.page || 1);
  const limit = Number(query.limit || 20);
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    AuditLog.find(filter)
      .populate('actor', 'fullName email roles')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    AuditLog.countDocuments(filter)
  ]);

  return {
    items,
    page,
    limit,
    total
  };
};

module.exports = {
  createAuditEntry,
  listAuditLogs
};
