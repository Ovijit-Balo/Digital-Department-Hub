const Joi = require('joi');

const objectId = Joi.string().hex().length(24);

const localizedText = Joi.object({
  en: Joi.string().trim().allow('').optional(),
  bn: Joi.string().trim().allow('').optional()
})
  .custom((value, helpers) => {
    const enValue = typeof value?.en === 'string' ? value.en.trim() : '';
    const bnValue = typeof value?.bn === 'string' ? value.bn.trim() : '';

    if (!enValue && !bnValue) {
      return helpers.error('localized.required');
    }

    return {
      en: enValue,
      bn: bnValue
    };
  }, 'at least one localized value validator')
  .messages({
    'localized.required': 'At least one language value (en or bn) is required.'
  });

const localizedTextOptional = Joi.object({
  en: Joi.string().trim().allow('').optional(),
  bn: Joi.string().trim().allow('').optional()
});

const translationWorkflow = Joi.object({
  sourceLanguage: Joi.string().valid('en', 'bn').optional(),
  enStatus: Joi.string().valid('source', 'pending', 'translated', 'reviewed').optional(),
  bnStatus: Joi.string().valid('source', 'pending', 'translated', 'reviewed').optional(),
  lastUpdatedAt: Joi.date().iso().optional()
});

const createPage = {
  body: Joi.object({
    slug: Joi.string().trim().lowercase().pattern(/^[a-z0-9-]+$/).required(),
    title: localizedText.required(),
    content: localizedText.required(),
    translationWorkflow: translationWorkflow.optional(),
    status: Joi.string().valid('draft', 'published').optional()
  })
};

const updatePage = {
  params: Joi.object({ id: objectId.required() }),
  body: Joi.object({
    slug: Joi.string().trim().lowercase().pattern(/^[a-z0-9-]+$/).optional(),
    title: localizedText.optional(),
    content: localizedText.optional(),
    translationWorkflow: translationWorkflow.optional(),
    status: Joi.string().valid('draft', 'published').optional()
  }).min(1)
};

const getPage = {
  params: Joi.object({ id: objectId.required() })
};

const getPageBySlug = {
  params: Joi.object({
    slug: Joi.string().trim().lowercase().pattern(/^[a-z0-9-]+$/).required()
  })
};

const listPages = {
  query: Joi.object({
    status: Joi.string().valid('draft', 'published').optional(),
    search: Joi.string().trim().optional(),
    page: Joi.number().min(1).default(1),
    limit: Joi.number().min(1).max(100).default(20)
  })
};

const createNewsPost = {
  body: Joi.object({
    title: localizedText.required(),
    summary: localizedText.required(),
    body: localizedText.required(),
    category: Joi.string().valid('news', 'announcement').optional(),
    translationWorkflow: translationWorkflow.optional(),
    coverImageUrl: Joi.string().uri().optional(),
    tags: Joi.array().items(Joi.string().trim().max(50)).optional(),
    status: Joi.string().valid('draft', 'published').optional()
  })
};

const updateNewsPost = {
  params: Joi.object({ id: objectId.required() }),
  body: Joi.object({
    title: localizedText.optional(),
    summary: localizedText.optional(),
    body: localizedText.optional(),
    category: Joi.string().valid('news', 'announcement').optional(),
    translationWorkflow: translationWorkflow.optional(),
    coverImageUrl: Joi.string().uri().allow('').optional(),
    tags: Joi.array().items(Joi.string().trim().max(50)).optional(),
    status: Joi.string().valid('draft', 'published').optional()
  }).min(1)
};

const getNewsPost = {
  params: Joi.object({ id: objectId.required() })
};

const listNewsPosts = {
  query: Joi.object({
    status: Joi.string().valid('draft', 'published').optional(),
    category: Joi.string().valid('news', 'announcement').optional(),
    search: Joi.string().trim().optional(),
    page: Joi.number().min(1).default(1),
    limit: Joi.number().min(1).max(100).default(20)
  })
};

const createBlogPost = {
  body: Joi.object({
    slug: Joi.string().trim().lowercase().pattern(/^[a-z0-9-]+$/).required(),
    title: localizedText.required(),
    excerpt: localizedText.required(),
    body: localizedText.required(),
    translationWorkflow: translationWorkflow.optional(),
    coverImageUrl: Joi.string().uri().optional(),
    tags: Joi.array().items(Joi.string().trim().max(50)).optional(),
    status: Joi.string().valid('draft', 'published').optional()
  })
};

const updateBlogPost = {
  params: Joi.object({ id: objectId.required() }),
  body: Joi.object({
    slug: Joi.string().trim().lowercase().pattern(/^[a-z0-9-]+$/).optional(),
    title: localizedText.optional(),
    excerpt: localizedText.optional(),
    body: localizedText.optional(),
    translationWorkflow: translationWorkflow.optional(),
    coverImageUrl: Joi.string().uri().allow('').optional(),
    tags: Joi.array().items(Joi.string().trim().max(50)).optional(),
    status: Joi.string().valid('draft', 'published').optional()
  }).min(1)
};

const getBlogPost = {
  params: Joi.object({ id: objectId.required() })
};

const getBlogPostBySlug = {
  params: Joi.object({
    slug: Joi.string().trim().lowercase().pattern(/^[a-z0-9-]+$/).required()
  })
};

const listBlogPosts = {
  query: Joi.object({
    status: Joi.string().valid('draft', 'published').optional(),
    search: Joi.string().trim().optional(),
    page: Joi.number().min(1).default(1),
    limit: Joi.number().min(1).max(100).default(20)
  })
};

const galleryItem = Joi.object({
  mediaType: Joi.string().valid('image', 'video').optional(),
  mediaUrl: Joi.string().uri().required(),
  thumbnailUrl: Joi.string().uri().allow('').optional(),
  caption: localizedTextOptional.optional(),
  order: Joi.number().integer().min(0).optional()
});

const createGallery = {
  body: Joi.object({
    slug: Joi.string().trim().lowercase().pattern(/^[a-z0-9-]+$/).required(),
    title: localizedText.required(),
    description: localizedTextOptional.optional(),
    translationWorkflow: translationWorkflow.optional(),
    items: Joi.array().items(galleryItem).default([]),
    status: Joi.string().valid('draft', 'published').optional()
  })
};

const updateGallery = {
  params: Joi.object({ id: objectId.required() }),
  body: Joi.object({
    slug: Joi.string().trim().lowercase().pattern(/^[a-z0-9-]+$/).optional(),
    title: localizedText.optional(),
    description: localizedTextOptional.optional(),
    translationWorkflow: translationWorkflow.optional(),
    items: Joi.array().items(galleryItem).optional(),
    status: Joi.string().valid('draft', 'published').optional()
  }).min(1)
};

const getGallery = {
  params: Joi.object({ id: objectId.required() })
};

const listGalleries = {
  query: Joi.object({
    status: Joi.string().valid('draft', 'published').optional(),
    search: Joi.string().trim().optional(),
    page: Joi.number().min(1).default(1),
    limit: Joi.number().min(1).max(100).default(20)
  })
};

const createUploadSignature = {
  body: Joi.object({
    folder: Joi.string().trim().max(120).optional()
  })
};

module.exports = {
  createPage,
  updatePage,
  getPage,
  getPageBySlug,
  listPages,
  createNewsPost,
  updateNewsPost,
  getNewsPost,
  listNewsPosts,
  createBlogPost,
  updateBlogPost,
  getBlogPost,
  getBlogPostBySlug,
  listBlogPosts,
  createGallery,
  updateGallery,
  getGallery,
  listGalleries,
  createUploadSignature
};
