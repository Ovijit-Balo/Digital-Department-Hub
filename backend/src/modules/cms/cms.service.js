const { StatusCodes } = require('http-status-codes');
const mongoose = require('mongoose');
const Page = require('./page.model');
const NewsPost = require('./newsPost.model');
const BlogPost = require('./blogPost.model');
const Gallery = require('./gallery.model');
const env = require('../../config/env');
const { createCloudinaryUploadSignature } = require('../../config/storage');
const ImageService = require('../../services/imageService');
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
      resolvedTargetStatus =
        requestedTargetStatus === 'source' ? 'translated' : requestedTargetStatus;
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

// Content is publicly live when published AND either not scheduled or the
// scheduled time has already passed. Used to gate public reads without a cron job.
const liveScheduleClause = () => ({
  $or: [
    { scheduledAt: { $exists: false } },
    { scheduledAt: null },
    { scheduledAt: { $lte: new Date() } }
  ]
});

const buildContentFilter = (query) => {
  const filter = {};

  if (query.status) {
    filter.status = query.status;
  }

  if (query.search) {
    filter.$text = { $search: query.search };
  }

  if (query.onlyLive) {
    filter.$and = (filter.$and || []).concat(liveScheduleClause());
  }

  return filter;
};

// Resolves the publishedAt timestamp taking scheduled publishing into account.
const resolvePublishedAt = ({ status, scheduledAt, existingPublishedAt = null }) => {
  if (status !== 'published') {
    return existingPublishedAt;
  }

  if (scheduledAt) {
    return new Date(scheduledAt);
  }

  return existingPublishedAt || new Date();
};

const createEntity = async (Model, payload, userId, label) => {
  const scheduledAt = payload.scheduledAt ? new Date(payload.scheduledAt) : null;
  const entityPayload = {
    ...payload,
    scheduledAt,
    createdBy: userId,
    updatedBy: userId,
    publishedAt: resolvePublishedAt({ status: payload.status, scheduledAt })
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

  const cleanPayload = { ...payload };
  if ('scheduledAt' in cleanPayload) {
    cleanPayload.scheduledAt = cleanPayload.scheduledAt ? new Date(cleanPayload.scheduledAt) : null;
  }

  const nextStatus = cleanPayload.status || existing.status;
  const nextScheduledAt =
    'scheduledAt' in cleanPayload ? cleanPayload.scheduledAt : existing.scheduledAt;

  Object.assign(existing, cleanPayload, {
    updatedBy: userId,
    publishedAt: resolvePublishedAt({
      status: nextStatus,
      scheduledAt: nextScheduledAt,
      existingPublishedAt: existing.publishedAt
    })
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
    ...(options.includeDraft ? {} : { status: 'published', ...liveScheduleClause() })
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

  // Tag filtering
  if (query.tags) {
    const tagArray = query.tags.split(',').map((t) => t.trim()).filter(Boolean);
    if (tagArray.length > 0) {
      filter.tags = { $in: tagArray };
    }
  }

  // Date range filtering
  if (query.startDate || query.endDate) {
    filter.publishedAt = {};
    if (query.startDate) {
      filter.publishedAt.$gte = new Date(query.startDate);
    }
    if (query.endDate) {
      filter.publishedAt.$lte = new Date(query.endDate);
    }
  }

  const { page, limit, skip } = buildPagination(query);

  // Sorting
  const sortBy = query.sortBy || 'publishedAt';
  const sortOrder = query.sortOrder === 'asc' ? 1 : -1;
  const sort = { [sortBy]: sortOrder };

  const [items, total] = await Promise.all([
    NewsPost.find(filter).sort(sort).skip(skip).limit(limit),
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

const getPublicNewsPostById = async (id) => {
  const post = await NewsPost.findOne({ _id: id, status: 'published', ...liveScheduleClause() });

  if (!post) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'News post not found');
  }

  return post;
};

const getNewsPostBySlug = async (slug, options = {}) => {
  const filter = {
    slug,
    ...(options.includeDraft ? {} : { status: 'published', ...liveScheduleClause() })
  };

  const post = await NewsPost.findOne(filter);

  if (!post) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'News post not found');
  }

  return post;
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
  const filter = buildContentFilter(query);

  // Tag filtering
  if (query.tags) {
    const tagArray = query.tags.split(',').map((t) => t.trim()).filter(Boolean);
    if (tagArray.length > 0) {
      filter.tags = { $in: tagArray };
    }
  }

  // Date range filtering
  if (query.startDate || query.endDate) {
    filter.publishedAt = {};
    if (query.startDate) {
      filter.publishedAt.$gte = new Date(query.startDate);
    }
    if (query.endDate) {
      filter.publishedAt.$lte = new Date(query.endDate);
    }
  }

  const { page, limit, skip } = buildPagination(query);

  // Sorting
  const sortBy = query.sortBy || 'publishedAt';
  const sortOrder = query.sortOrder === 'asc' ? 1 : -1;
  const sort = { [sortBy]: sortOrder };

  const [items, total] = await Promise.all([
    BlogPost.find(filter).sort(sort).skip(skip).limit(limit),
    BlogPost.countDocuments(filter)
  ]);

  return {
    items,
    page,
    limit,
    total
  };
};

const getBlogPostById = async (id) => {
  return getEntityById(BlogPost, id, 'Blog post');
};

const getBlogPostBySlug = async (slug, options = {}) => {
  const filter = {
    slug,
    ...(options.includeDraft ? {} : { status: 'published', ...liveScheduleClause() })
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
  const filter = buildContentFilter(query);
  const { page, limit, skip } = buildPagination(query);

  // Sorting
  const sortBy = query.sortBy || 'publishedAt';
  const sortOrder = query.sortOrder === 'asc' ? 1 : -1;
  const sort = { [sortBy]: sortOrder };

  const [items, total] = await Promise.all([
    Gallery.find(filter).sort(sort).skip(skip).limit(limit),
    Gallery.countDocuments(filter)
  ]);

  // Optimize gallery items with thumbnails and responsive URLs
  const optimizedItems = items.map((gallery) => ({
    ...gallery.toObject(),
    items: ImageService.optimizeGalleryItems(gallery.items || [])
  }));

  return {
    items: optimizedItems,
    page,
    limit,
    total
  };
};

const getGalleryById = async (id) => {
  const gallery = await getEntityById(Gallery, id, 'Gallery');
  
  // Optimize gallery items with thumbnails and responsive URLs
  const galleryObj = gallery.toObject();
  galleryObj.items = ImageService.optimizeGalleryItems(gallery.items || []);
  
  return galleryObj;
};

const getPublicGalleryById = async (id) => {
  const gallery = await Gallery.findOne({ _id: id, status: 'published' });

  if (!gallery) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Gallery not found');
  }

  // Optimize gallery items with thumbnails and responsive URLs
  const galleryObj = gallery.toObject();
  galleryObj.items = ImageService.optimizeGalleryItems(gallery.items || []);
  
  return galleryObj;
};

const getGalleryBySlug = async (slug, options = {}) => {
  const filter = {
    slug,
    ...(options.includeDraft ? {} : { status: 'published' })
  };

  const gallery = await Gallery.findOne(filter);

  if (!gallery) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Gallery not found');
  }

  // Optimize gallery items with thumbnails and responsive URLs
  const galleryObj = gallery.toObject();
  galleryObj.items = ImageService.optimizeGalleryItems(gallery.items || []);
  
  return galleryObj;
};

const updateGallery = async (id, payload, userId) => {
  return updateEntity(Gallery, id, payload, userId, 'Gallery');
};

const deleteGallery = async (id) => {
  return deleteEntity(Gallery, id, 'Gallery');
};

const bulkDelete = async (Model, ids, entityName) => {
  const objectIds = ids.map((id) => new mongoose.Types.ObjectId(id));
  const result = await Model.deleteMany({ _id: { $in: objectIds } });
  return { deletedCount: result.deletedCount };
};

const bulkUpdateStatus = async (Model, ids, status, entityName) => {
  const objectIds = ids.map((id) => new mongoose.Types.ObjectId(id));
  const result = await Model.updateMany(
    { _id: { $in: objectIds } },
    { status }
  );
  return { modifiedCount: result.modifiedCount };
};

const createUploadSignature = async (payload) => {
  if (env.STORAGE_PROVIDER === 'cloudinary') {
    try {
      return createCloudinaryUploadSignature(payload);
    } catch (error) {
      throw new ApiError(StatusCodes.BAD_REQUEST, error.message);
    }
  }

  throw new ApiError(
    StatusCodes.NOT_IMPLEMENTED,
    'Signed upload generation is not configured for S3'
  );
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
  getPublicNewsPostById,
  getNewsPostBySlug,
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
  getPublicGalleryById,
  getGalleryBySlug,
  updateGallery,
  deleteGallery,
  createUploadSignature,
  bulkDelete,
  bulkUpdateStatus
};
