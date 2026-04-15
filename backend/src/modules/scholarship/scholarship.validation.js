const Joi = require('joi');

const objectId = Joi.string().hex().length(24);

const localizedText = Joi.object({
  en: Joi.string().trim().required(),
  bn: Joi.string().trim().required()
});

const createNotice = {
  body: Joi.object({
    title: localizedText.required(),
    description: localizedText.required(),
    eligibility: localizedText.required(),
    deadline: Joi.date().iso().required(),
    status: Joi.string().valid('draft', 'open', 'closed').optional(),
    attachments: Joi.array()
      .items(
        Joi.object({
          name: Joi.string().trim().required(),
          url: Joi.string().uri().required()
        })
      )
      .optional()
  })
};

const listNotices = {
  query: Joi.object({
    status: Joi.string().valid('draft', 'open', 'closed').optional(),
    page: Joi.number().min(1).default(1),
    limit: Joi.number().min(1).max(100).default(20)
  })
};

const apply = {
  params: Joi.object({ noticeId: objectId.required() }),
  body: Joi.object({
    statement: Joi.string().min(30).max(5000).required(),
    gpa: Joi.number().min(0).max(4).required(),
    department: Joi.string().trim().max(120).required(),
    documents: Joi.array()
      .items(
        Joi.object({
          name: Joi.string().trim().required(),
          url: Joi.string().uri().required()
        })
      )
      .optional()
  })
};

const reviewApplication = {
  params: Joi.object({ applicationId: objectId.required() }),
  body: Joi.object({
    status: Joi.string().valid('under_review', 'approved', 'rejected').required(),
    decisionNote: Joi.string().max(1000).allow('').optional()
  })
};

const listApplications = {
  query: Joi.object({
    noticeId: objectId.optional(),
    status: Joi.string().valid('submitted', 'under_review', 'approved', 'rejected').optional(),
    page: Joi.number().min(1).default(1),
    limit: Joi.number().min(1).max(100).default(20)
  })
};

const exportApplications = {
  query: Joi.object({
    noticeId: objectId.required(),
    status: Joi.string().valid('submitted', 'under_review', 'approved', 'rejected').optional()
  })
};

module.exports = {
  createNotice,
  listNotices,
  apply,
  reviewApplication,
  listApplications,
  exportApplications
};
