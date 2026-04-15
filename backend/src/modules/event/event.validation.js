const Joi = require('joi');

const objectId = Joi.string().hex().length(24);

const createEvent = {
  body: Joi.object({
    title: Joi.string().min(3).max(200).required(),
    description: Joi.string().min(20).max(5000).required(),
    location: Joi.string().max(200).required(),
    startTime: Joi.date().iso().required(),
    endTime: Joi.date().iso().required(),
    registrationDeadline: Joi.date().iso().required(),
    capacity: Joi.number().integer().min(1).max(50000).required(),
    status: Joi.string().valid('draft', 'published', 'cancelled').optional()
  })
};

const listEvents = {
  query: Joi.object({
    status: Joi.string().valid('draft', 'published', 'cancelled').optional(),
    page: Joi.number().min(1).default(1),
    limit: Joi.number().min(1).max(100).default(20)
  })
};

const registerForEvent = {
  params: Joi.object({ eventId: objectId.required() })
};

const checkIn = {
  body: Joi.object({
    eventId: objectId.required(),
    qrToken: Joi.string().guid({ version: ['uuidv4'] }).required()
  })
};

const submitFeedback = {
  params: Joi.object({ registrationId: objectId.required() }),
  body: Joi.object({
    rating: Joi.number().integer().min(1).max(5).required(),
    comment: Joi.string().max(1000).allow('').optional()
  })
};

const listRegistrations = {
  params: Joi.object({ eventId: objectId.required() }),
  query: Joi.object({
    status: Joi.string().valid('registered', 'checked_in', 'cancelled').optional(),
    page: Joi.number().min(1).default(1),
    limit: Joi.number().min(1).max(100).default(20)
  })
};

module.exports = {
  createEvent,
  listEvents,
  registerForEvent,
  checkIn,
  submitFeedback,
  listRegistrations
};
