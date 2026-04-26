const { StatusCodes } = require('http-status-codes');
const Page = require('./page.model');
const NewsPost = require('./newsPost.model');
const BlogPost = require('./blogPost.model');
const Gallery = require('./gallery.model');
const env = require('../../config/env');
const { createCloudinaryUploadSignature } = require('../../config/storage');
const ApiError = require('../../utils/ApiError');

const TRANSLATION_STATUSES = new Set(['source', 'pending', 'translated', 'reviewed']);

const LOCALIZED_FIELD_RULES = new Map([
  [
    Page,
    [
      { path: 'title', required: true },
      { path: 'content', required: true }
    ]
  ],
  [
    NewsPost,
    [
      { path: 'title', required: true },
      { path: 'summary', required: true },
      { path: 'body', required: true }
    ]
  ],
  [
    BlogPost,
    [
      { path: 'title', required: true },
      { path: 'excerpt', required: true },
      { path: 'body', required: true }
    ]
  ],
  [
    Gallery,
    [
      { path: 'title', required: true },
      { path: 'description', required: false }
    ]
  ]
]);

const getLocaleStatusKey = (locale) => `${locale}Status`;

const getLocalizedTextValue = (entity, path, locale) => {
  const localizedObject = entity?.[path];

  if (!localizedObject || typeof localizedObject !== 'object') {
    return '';
  }

  const raw = localizedObject[locale];
  return typeof raw === 'string' ? raw.trim() : '';
};

const shouldRecomputeWorkflow = (payload, localizedRules) => {
  if (!localizedRules?.length) {
    return false;
  }

  if (payload.translationWorkflow) {
    return true;
  }

  return localizedRules.some((rule) => Object.prototype.hasOwnProperty.call(payload, rule.path));
};

const applyTranslationWorkflow = ({ entity, payload, localizedRules, label }) => {
  const existingWorkflow = entity.translationWorkflow || {};
  const payloadWorkflow = payload.translationWorkflow || {};

  const sourceLanguage = payloadWorkflow.sourceLanguage || existingWorkflow.sourceLanguage || 'en';
  const targetLanguage = sourceLanguage === 'en' ? 'bn' : 'en';
  const sourceStatusKey = getLocaleStatusKey(sourceLanguage);
  const targetStatusKey = getLocaleStatusKey(targetLanguage);

  const missingRequiredFields = localizedRules
    .filter((rule) => rule.required)
    .filter((rule) => !getLocalizedTextValue(entity, rule.path, sourceLanguage))
    .map((rule) => rule.path);

  if (missingRequiredFields.length) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `${label} requires ${sourceLanguage.toUpperCase()} content for: ${missingRequiredFields.join(', ')}`
    );
  }

  const hasTargetLanguageContent = localizedRules.some((rule) =>
    Boolean(getLocalizedTextValue(entity, rule.path, targetLanguage))
  );

  const requestedTargetStatus = payloadWorkflow[targetStatusKey];
  const isRequestedTargetStatusValid = TRANSLATION_STATUSES.has(requestedTargetStatus);

  let resolvedTargetStatus = 'pending';

  if (hasTargetLanguageContent) {
    if (isRequestedTargetStatusValid) {
      resolvedTargetStatus = requestedTargetStatus === 'source' ? 'translated' : requestedTargetStatus;
    } else if (existingWorkflow[targetStatusKey] === 'reviewed') {
      resolvedTargetStatus = 'reviewed';
    } else {
      resolvedTargetStatus = 'translated';
    }
  }

  entity.translationWorkflow = {
    ...existingWorkflow,
    ...payloadWorkflow,
    sourceLanguage,
    [sourceStatusKey]: 'source',
    [targetStatusKey]: resolvedTargetStatus,
    lastUpdatedAt: new Date()
  };
};

const buildPagination = ({ page, limit }) => {
  const parsedPage = Number(page || 1);
  const parsedLimit = Number(limit || 20);
  return {
    page: parsedPage,
    limit: parsedLimit,
    skip: (parsedPage - 1) * parsedLimit
  };
};

const buildContentFilter = (query) => {
  const filter = {};

  if (query.status) {
    filter.status = query.status;
  }

  if (query.search) {
    filter.$text = { $search: query.search };
  }

  return filter;
};

const createEntity = async (Model, payload, userId, label) => {
  const entityPayload = {
    ...payload,
    createdBy: userId,
    updatedBy: userId,
    publishedAt: payload.status === 'published' ? new Date() : null
  };

  const localizedRules = LOCALIZED_FIELD_RULES.get(Model);

  if (localizedRules?.length) {
    applyTranslationWorkflow({
      entity: entityPayload,
      payload,
      localizedRules,
      label
    });
  }

  return Model.create(entityPayload);
};

const listEntities = async (Model, query, sort) => {
  const filter = buildContentFilter(query);
  const { page, limit, skip } = buildPagination(query);

  const [items, total] = await Promise.all([
    Model.find(filter).sort(sort).skip(skip).limit(limit),
    Model.countDocuments(filter)
  ]);

  return {
    items,
    page,
    limit,
    total
  };
};

const getEntityById = async (Model, id, label) => {
  const item = await Model.findById(id);

  if (!item) {
    throw new ApiError(StatusCodes.NOT_FOUND, `${label} not found`);
  }

  return item;
};

const updateEntity = async (Model, id, payload, userId, label) => {
  const existing = await Model.findById(id);

  if (!existing) {
    throw new ApiError(StatusCodes.NOT_FOUND, `${label} not found`);
  }

  Object.assign(existing, payload, {
    updatedBy: userId,
    publishedAt:
      payload.status === 'published' && !existing.publishedAt ? new Date() : existing.publishedAt
  });

  const localizedRules = LOCALIZED_FIELD_RULES.get(Model);

  if (shouldRecomputeWorkflow(payload, localizedRules)) {
    applyTranslationWorkflow({
      entity: existing,
      payload,
      localizedRules,
      label
    });
  }

  await existing.save();
  return existing;
};

const deleteEntity = async (Model, id, label) => {
  const existing = await Model.findById(id);

  if (!existing) {
    throw new ApiError(StatusCodes.NOT_FOUND, `${label} not found`);
  }

  await existing.deleteOne();
};

const createPage = async (payload, userId) => {
  return createEntity(Page, payload, userId, 'Page');
};

const listPages = async (query) => {
  return listEntities(Page, query, { updatedAt: -1 });
};

const getPageById = async (id) => {
  return getEntityById(Page, id, 'Page');
};

const getPageBySlug = async (slug, options = {}) => {
  const filter = {
    slug,
    ...(options.includeDraft ? {} : { status: 'published' })
  };

  const page = await Page.findOne(filter);

  if (!page) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Page not found');
  }

  return page;
};

const updatePage = async (id, payload, userId) => {
  return updateEntity(Page, id, payload, userId, 'Page');
};

const deletePage = async (id) => {
  return deleteEntity(Page, id, 'Page');
};

const createNewsPost = async (payload, userId) => {
  return createEntity(NewsPost, payload, userId, 'News post');
};

const listNewsPosts = async (query) => {
  const filter = buildContentFilter(query);

  if (query.category) {
    filter.category = query.category;
  }

  const { page, limit, skip } = buildPagination(query);

  const [items, total] = await Promise.all([
    NewsPost.find(filter).sort({ publishedAt: -1, createdAt: -1 }).skip(skip).limit(limit),
    NewsPost.countDocuments(filter)
  ]);

  return {
    items,
    page,
    limit,
    total
  };
};

const getNewsPostById = async (id) => {
  return getEntityById(NewsPost, id, 'News post');
};

const updateNewsPost = async (id, payload, userId) => {
  return updateEntity(NewsPost, id, payload, userId, 'News post');
};

const deleteNewsPost = async (id) => {
  return deleteEntity(NewsPost, id, 'News post');
};

const createBlogPost = async (payload, userId) => {
  return createEntity(BlogPost, payload, userId, 'Blog post');
};

const listBlogPosts = async (query) => {
  return listEntities(BlogPost, query, { publishedAt: -1, createdAt: -1 });
};

const getBlogPostById = async (id) => {
  return getEntityById(BlogPost, id, 'Blog post');
};

const getBlogPostBySlug = async (slug, options = {}) => {
  const filter = {
    slug,
    ...(options.includeDraft ? {} : { status: 'published' })
  };

  const post = await BlogPost.findOne(filter);

  if (!post) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Blog post not found');
  }

  return post;
};

const updateBlogPost = async (id, payload, userId) => {
  return updateEntity(BlogPost, id, payload, userId, 'Blog post');
};

const deleteBlogPost = async (id) => {
  return deleteEntity(BlogPost, id, 'Blog post');
};

const createGallery = async (payload, userId) => {
  return createEntity(Gallery, payload, userId, 'Gallery');
};

const listGalleries = async (query) => {
  return listEntities(Gallery, query, { publishedAt: -1, createdAt: -1 });
};

const getGalleryById = async (id) => {
  return getEntityById(Gallery, id, 'Gallery');
};

const updateGallery = async (id, payload, userId) => {
  return updateEntity(Gallery, id, payload, userId, 'Gallery');
};

const deleteGallery = async (id) => {
  return deleteEntity(Gallery, id, 'Gallery');
};

const createUploadSignature = async (payload) => {
  if (env.STORAGE_PROVIDER === 'cloudinary') {
    try {
      return createCloudinaryUploadSignature(payload);
    } catch (error) {
      throw new ApiError(StatusCodes.BAD_REQUEST, error.message);
    }
  }

  throw new ApiError(StatusCodes.NOT_IMPLEMENTED, 'Signed upload generation is not configured for S3');
};

module.exports = {
  createPage,
  listPages,
  getPageById,
  getPageBySlug,
  updatePage,
  deletePage,
  createNewsPost,
  listNewsPosts,
  getNewsPostById,
  updateNewsPost,
  deleteNewsPost,
  createBlogPost,
  listBlogPosts,
  getBlogPostById,
  getBlogPostBySlug,
  updateBlogPost,
  deleteBlogPost,
  createGallery,
  listGalleries,
  getGalleryById,
  updateGallery,
  deleteGallery,
  createUploadSignature
};
