const Joi = require('joi');

const objectId = Joi.string().hex().length(24);

const localizedText = Joi.object({
  en: Joi.string().trim().required(),
  bn: Joi.string().trim().required()
});

const localizedTextOptional = Joi.object({
  en: Joi.string().trim().allow('').optional(),
  bn: Joi.string().trim().allow('').optional()
});

const createPage = {
  body: Joi.object({
    slug: Joi.string().trim().lowercase().pattern(/^[a-z0-9-]+$/).required(),
    title: localizedText.required(),
    content: localizedText.required(),
    status: Joi.string().valid('draft', 'published').optional()
  })
};

const updatePage = {
  params: Joi.object({ id: objectId.required() }),
  body: Joi.object({
    slug: Joi.string().trim().lowercase().pattern(/^[a-z0-9-]+$/).optional(),
    title: localizedText.optional(),
    content: localizedText.optional(),
    status: Joi.string().valid('draft', 'published').optional()
  }).min(1)
};

const getPage = {
  params: Joi.object({ id: objectId.required() })
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
    coverImageUrl: Joi.string().uri().allow('').optional(),
    tags: Joi.array().items(Joi.string().trim().max(50)).optional(),
    status: Joi.string().valid('draft', 'published').optional()
  }).min(1)
};

const getBlogPost = {
  params: Joi.object({ id: objectId.required() })
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
  imageUrl: Joi.string().uri().required(),
  caption: localizedTextOptional.optional(),
  order: Joi.number().integer().min(0).optional()
});

const createGallery = {
  body: Joi.object({
    slug: Joi.string().trim().lowercase().pattern(/^[a-z0-9-]+$/).required(),
    title: localizedText.required(),
    description: localizedTextOptional.optional(),
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
  listPages,
  createNewsPost,
  updateNewsPost,
  getNewsPost,
  listNewsPosts,
  createBlogPost,
  updateBlogPost,
  getBlogPost,
  listBlogPosts,
  createGallery,
  updateGallery,
  getGallery,
  listGalleries,
  createUploadSignature
};
