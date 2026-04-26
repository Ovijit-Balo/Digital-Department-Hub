const Joi = require('joi');

const objectId = Joi.string().hex().length(24);

const createVenue = {
  body: Joi.object({
    name: Joi.string().trim().max(200).required(),
    location: Joi.string().trim().max(300).required(),
    capacity: Joi.number().integer().min(1).required(),
    amenities: Joi.array().items(Joi.string().trim().max(100)).optional(),
    manager: objectId.required(),
    isActive: Joi.boolean().optional()
  })
};

const listVenues = {
  query: Joi.object({
    isActive: Joi.boolean().optional(),
    page: Joi.number().min(1).default(1),
    limit: Joi.number().min(1).max(100).default(20)
  })
};

const requestBooking = {
  body: Joi.object({
    venue: objectId.required(),
    title: Joi.string().trim().min(3).max(200).required(),
    purpose: Joi.string().trim().min(20).max(3000).required(),
    bookingType: Joi.string().valid('class', 'event', 'lab', 'other').optional(),
    classCode: Joi.when('bookingType', {
      is: 'class',
      then: Joi.string().trim().max(40).required(),
      otherwise: Joi.string().trim().max(40).allow('').optional()
    }),
    startTime: Joi.date().iso().required(),
    endTime: Joi.date().iso().required(),
    attendeeCount: Joi.number().integer().min(1).required()
  })
};

const decision = {
  params: Joi.object({ bookingId: objectId.required() }),
  body: Joi.object({
    status: Joi.string().valid('approved', 'rejected').required(),
    decisionNote: Joi.string().max(1200).allow('').optional()
  })
};

const listBookings = {
  query: Joi.object({
    venue: objectId.optional(),
    requester: objectId.optional(),
    bookingType: Joi.string().valid('class', 'event', 'lab', 'other').optional(),
    status: Joi.string().valid('pending', 'approved', 'rejected', 'cancelled').optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
    page: Joi.number().min(1).default(1),
    limit: Joi.number().min(1).max(100).default(20)
  })
};

const listMyBookings = {
  query: Joi.object({
    bookingType: Joi.string().valid('class', 'event', 'lab', 'other').optional(),
    status: Joi.string().valid('pending', 'approved', 'rejected', 'cancelled').optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
    page: Joi.number().min(1).default(1),
    limit: Joi.number().min(1).max(100).default(20)
  })
};

const listCalendar = {
  query: Joi.object({
    venue: objectId.optional(),
    bookingType: Joi.string().valid('class', 'event', 'lab', 'other').optional(),
    status: Joi.string().valid('approved').optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
    limit: Joi.number().min(1).max(500).default(300)
  })
};

const checkConflicts = {
  query: Joi.object({
    venueId: objectId.required(),
    startTime: Joi.date().iso().required(),
    endTime: Joi.date().iso().required()
  })
};

module.exports = {
  createVenue,
  listVenues,
  requestBooking,
  decision,
  listBookings,
  listMyBookings,
  listCalendar,
  checkConflicts
};
