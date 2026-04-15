const Joi = require('joi');

const objectId = Joi.string().hex().length(24);

const listAuditLogs = {
  query: Joi.object({
    actor: objectId.optional(),
    entityType: Joi.string().max(120).optional(),
    entityId: Joi.string().max(120).optional(),
    method: Joi.string().valid('POST', 'PUT', 'PATCH', 'DELETE').optional(),
    page: Joi.number().min(1).default(1),
    limit: Joi.number().min(1).max(100).default(20)
  })
};

module.exports = {
  listAuditLogs
};
