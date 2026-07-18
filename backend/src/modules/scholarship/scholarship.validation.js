const Joi = require('joi');

const objectId = Joi.string().hex().length(24);

const localizedText = Joi.object({
  en: Joi.string().trim().required(),
  bn: Joi.string().trim().required()
});

const scholarshipCategory = Joi.object({
  code: Joi.string()
    .trim()
    .lowercase()
    .pattern(/^[a-z0-9_-]+$/)
    .max(40)
    .required(),
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
    documentsRequired: Joi.boolean().optional(),
    minimumGpa: Joi.number().min(0).max(4).optional(),
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

const updateNotice = {
  params: Joi.object({ noticeId: objectId.required() }),
  body: Joi.object({
    title: localizedText.optional(),
    description: localizedText.optional(),
    eligibility: localizedText.optional(),
    scholarshipType: Joi.string().valid('one_off', 'monthly').optional(),
    deadline: Joi.date().iso().optional(),
    applicationWindowStart: Joi.date().iso().optional(),
    applicationWindowEnd: Joi.date().iso().optional(),
    status: Joi.string().valid('draft', 'open', 'closed').optional(),
    categories: Joi.array().items(scholarshipCategory).optional(),
    documentsRequired: Joi.boolean().optional(),
    minimumGpa: Joi.number().min(0).max(4).optional(),
    attachments: Joi.array()
      .items(
        Joi.object({
          name: Joi.string().trim().required(),
          url: Joi.string().uri().required()
        })
      )
      .optional()
  }).min(1)
};

const apply = {
  params: Joi.object({ noticeId: objectId.required() }),
  body: Joi.object({
    statement: Joi.string().min(30).max(5000).required(),
    gpa: Joi.number().min(0).max(4).required(),
    department: Joi.string().trim().max(120).required(),
    selectedCategoryCode: Joi.string()
      .trim()
      .lowercase()
      .pattern(/^[a-z0-9_-]+$/)
      .max(40)
      .optional(),
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

const updateMyApplication = {
  params: Joi.object({ applicationId: objectId.required() }),
  body: Joi.object({
    statement: Joi.string().min(30).max(5000).optional(),
    gpa: Joi.number().min(0).max(4).optional(),
    department: Joi.string().trim().max(120).optional(),
    selectedCategoryCode: Joi.string()
      .trim()
      .lowercase()
      .pattern(/^[a-z0-9_-]+$/)
      .max(40)
      .allow('')
      .optional(),
    documents: Joi.array()
      .items(
        Joi.object({
          name: Joi.string().trim().required(),
          url: Joi.string().uri().required()
        })
      )
      .optional()
  }).min(1)
};

const withdrawMyApplication = {
  params: Joi.object({ applicationId: objectId.required() })
};

const awardLetter = {
  params: Joi.object({ applicationId: objectId.required() })
};

const reviewApplication = {
  params: Joi.object({ applicationId: objectId.required() }),
  body: Joi.object({
    status: Joi.string()
      .valid('needs_info', 'documents_verified', 'under_review', 'shortlisted', 'approved', 'rejected')
      .required(),
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

const applicationStatusValues = [
  'submitted',
  'needs_info',
  'documents_verified',
  'under_review',
  'shortlisted',
  'approved',
  'rejected'
];

const listApplications = {
  query: Joi.object({
    noticeId: objectId.optional(),
    status: Joi.string().valid(...applicationStatusValues).optional(),
    page: Joi.number().min(1).default(1),
    limit: Joi.number().min(1).max(100).default(20)
  })
};

const listMyApplications = {
  query: Joi.object({
    noticeId: objectId.optional(),
    status: Joi.string().valid(...applicationStatusValues).optional(),
    page: Joi.number().min(1).default(1),
    limit: Joi.number().min(1).max(100).default(20)
  })
};

const exportApplications = {
  query: Joi.object({
    noticeId: objectId.required(),
    status: Joi.string()
      .valid(
        'submitted',
        'needs_info',
        'documents_verified',
        'under_review',
        'shortlisted',
        'approved',
        'rejected'
      )
      .optional()
  })
};

const applicationStats = {
  query: Joi.object({
    noticeId: objectId.optional()
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
  updateNotice,
  apply,
  updateMyApplication,
  withdrawMyApplication,
  awardLetter,
  reviewApplication,
  listApplications,
  listMyApplications,
  exportApplications,
  applicationStats,
  publishRecipients,
  listRecipients,
  createNoticeUpdate,
  listNoticeUpdates,
  listUpdates
};
