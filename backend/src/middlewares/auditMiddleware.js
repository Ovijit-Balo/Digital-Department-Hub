const logger = require('../config/logger');
const { createAuditEntry } = require('../modules/audit/audit.service');

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const auditMiddleware = (req, res, next) => {
  if (!WRITE_METHODS.has(req.method)) {
    return next();
  }

  res.on('finish', async () => {
    try {
      const meta = res.locals.auditMeta || {};

      await createAuditEntry({
        actor: req.user ? req.user._id : null,
        action: meta.action || `${req.method} ${req.originalUrl}`,
        entityType: meta.entityType || 'unknown',
        entityId: meta.entityId || null,
        method: req.method,
        route: req.originalUrl,
        statusCode: res.statusCode,
        ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        userAgent: req.get('user-agent'),
        before: meta.before || null,
        after: meta.after || null,
        requestId: req.requestId
      });
    } catch (error) {
      logger.warn(`Audit log creation failed: ${error.message}`);
    }
  });

  return next();
};

module.exports = auditMiddleware;
