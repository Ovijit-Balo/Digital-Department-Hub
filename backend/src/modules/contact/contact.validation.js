const Joi = require('joi');

const objectId = Joi.string().hex().length(24);

const submitInquiry = {
  body: Joi.object({
    name: Joi.string().trim().min(2).max(120).required(),
    email: Joi.string().trim().email().required(),
    subject: Joi.string().trim().min(3).max(200).required(),
    message: Joi.string().trim().min(10).max(5000).required()
  })
};

const listInquiries = {
  query: Joi.object({
    status: Joi.string().valid('new', 'in_progress', 'resolved').optional(),
    search: Joi.string().trim().max(200).optional(),
    page: Joi.number().min(1).default(1),
    limit: Joi.number().min(1).max(100).default(20)
  })
};

const updateStatus = {
  params: Joi.object({ inquiryId: objectId.required() }),
  body: Joi.object({
    status: Joi.string().valid('new', 'in_progress', 'resolved').required(),
    resolutionNote: Joi.string().trim().max(1000).allow('').optional()
  })
};

module.exports = {
  submitInquiry,
  listInquiries,
  updateStatus
};
