const Joi = require('joi');

const objectId = Joi.string().hex().length(24);

const dispatchNotification = {
  body: Joi.object({
    recipient: objectId.required(),
    channel: Joi.string().valid('in_app', 'email').required(),
    subject: Joi.string().max(200).allow('').optional(),
    message: Joi.string().min(1).max(5000).required(),
    metadata: Joi.object().optional()
  })
};

const listNotifications = {
  query: Joi.object({
    status: Joi.string().valid('queued', 'sent', 'failed').optional(),
    channel: Joi.string().valid('in_app', 'email').optional(),
    page: Joi.number().min(1).default(1),
    limit: Joi.number().min(1).max(100).default(20)
  })
};

const markRead = {
  params: Joi.object({ notificationId: objectId.required() })
};

module.exports = {
  dispatchNotification,
  listNotifications,
  markRead
};
