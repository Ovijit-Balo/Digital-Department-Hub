const Joi = require('joi');

const objectId = Joi.string().hex().length(24);

const localizedText = Joi.object({
  en: Joi.string().trim().required(),
  bn: Joi.string().trim().required()
});

const scholarshipCategory = Joi.object({
  code: Joi.string().trim().lowercase().pattern(/^[a-z0-9_-]+$/).max(40).required(),
  name: localizedText.required(),
  amount: Joi.number().min(0).required(),
  slots: Joi.number().integer().min(1).optional()
});

const createNotice = {
  body: Joi.object({
    title: localizedText.required(),
    description: localizedText.required(),
    eligibility: localizedText.required(),
    scholarshipType: Joi.string().valid('one_off', 'monthly').optional(),
    deadline: Joi.date().iso().required(),
    applicationWindowStart: Joi.date().iso().required(),
    applicationWindowEnd: Joi.date().iso().required(),
    status: Joi.string().valid('draft', 'open', 'closed').optional(),
    categories: Joi.array().items(scholarshipCategory).optional(),
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

const listPublicNotices = {
  query: Joi.object({
    status: Joi.string().valid('open', 'closed').optional(),
    scholarshipType: Joi.string().valid('one_off', 'monthly').optional(),
    page: Joi.number().min(1).default(1),
    limit: Joi.number().min(1).max(100).default(20)
  })
};

const listManageNotices = {
  query: Joi.object({
    status: Joi.string().valid('draft', 'open', 'closed').optional(),
    scholarshipType: Joi.string().valid('one_off', 'monthly').optional(),
    page: Joi.number().min(1).default(1),
    limit: Joi.number().min(1).max(100).default(20)
  })
};

const updateNoticeStatus = {
  params: Joi.object({ noticeId: objectId.required() }),
  body: Joi.object({
    status: Joi.string().valid('draft', 'open', 'closed').optional(),
    applicationWindowStart: Joi.date().iso().optional(),
    applicationWindowEnd: Joi.date().iso().optional(),
    deadline: Joi.date().iso().optional()
  }).or('status', 'applicationWindowStart', 'applicationWindowEnd', 'deadline')
};

const apply = {
  params: Joi.object({ noticeId: objectId.required() }),
  body: Joi.object({
    statement: Joi.string().min(30).max(5000).required(),
    gpa: Joi.number().min(0).max(4).required(),
    department: Joi.string().trim().max(120).required(),
    selectedCategoryCode: Joi.string().trim().lowercase().pattern(/^[a-z0-9_-]+$/).max(40).optional(),
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
    decisionNote: Joi.string().max(1000).allow('').optional(),
    awardedCategoryCode: Joi.string()
      .trim()
      .lowercase()
      .pattern(/^[a-z0-9_-]+$/)
      .max(40)
      .allow('')
      .optional(),
    awardedAmount: Joi.number().min(0).optional()
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

const listMyApplications = {
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

const publishRecipients = {
  params: Joi.object({ noticeId: objectId.required() }),
  body: Joi.object({
    publish: Joi.boolean().required()
  })
};

const listRecipients = {
  params: Joi.object({ noticeId: objectId.required() }),
  query: Joi.object({
    awardedCategoryCode: Joi.string()
      .trim()
      .lowercase()
      .pattern(/^[a-z0-9_-]+$/)
      .max(40)
      .optional(),
    page: Joi.number().min(1).default(1),
    limit: Joi.number().min(1).max(100).default(20)
  })
};

const createNoticeUpdate = {
  params: Joi.object({ noticeId: objectId.required() }),
  body: Joi.object({
    kind: Joi.string().valid('general', 'deadline', 'recipient', 'announcement').optional(),
    visibility: Joi.string().valid('public', 'internal').optional(),
    title: localizedText.required(),
    body: localizedText.required()
  })
};

const listNoticeUpdates = {
  params: Joi.object({ noticeId: objectId.required() }),
  query: Joi.object({
    visibility: Joi.string().valid('public', 'internal').optional(),
    page: Joi.number().min(1).default(1),
    limit: Joi.number().min(1).max(100).default(20)
  })
};

const listUpdates = {
  query: Joi.object({
    noticeId: objectId.optional(),
    visibility: Joi.string().valid('public', 'internal').optional(),
    page: Joi.number().min(1).default(1),
    limit: Joi.number().min(1).max(100).default(20)
  })
};

module.exports = {
  createNotice,
  listPublicNotices,
  listManageNotices,
  updateNoticeStatus,
  apply,
  reviewApplication,
  listApplications,
  listMyApplications,
  exportApplications,
  publishRecipients,
  listRecipients,
  createNoticeUpdate,
  listNoticeUpdates,
  listUpdates
};
