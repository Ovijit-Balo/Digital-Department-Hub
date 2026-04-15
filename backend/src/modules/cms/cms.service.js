const { StatusCodes } = require('http-status-codes');
const Page = require('./page.model');
const NewsPost = require('./newsPost.model');
const BlogPost = require('./blogPost.model');
const Gallery = require('./gallery.model');
const env = require('../../config/env');
const { createCloudinaryUploadSignature } = require('../../config/storage');
const ApiError = require('../../utils/ApiError');

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

const createEntity = async (Model, payload, userId) =>
  Model.create({
    ...payload,
    createdBy: userId,
    updatedBy: userId,
    publishedAt: payload.status === 'published' ? new Date() : null
  });

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
  return createEntity(Page, payload, userId);
};

const listPages = async (query) => {
  return listEntities(Page, query, { updatedAt: -1 });
};

const getPageById = async (id) => {
  return getEntityById(Page, id, 'Page');
};

const updatePage = async (id, payload, userId) => {
  return updateEntity(Page, id, payload, userId, 'Page');
};

const deletePage = async (id) => {
  return deleteEntity(Page, id, 'Page');
};

const createNewsPost = async (payload, userId) => {
  return createEntity(NewsPost, payload, userId);
};

const listNewsPosts = async (query) => {
  return listEntities(NewsPost, query, { publishedAt: -1, createdAt: -1 });
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
  return createEntity(BlogPost, payload, userId);
};

const listBlogPosts = async (query) => {
  return listEntities(BlogPost, query, { publishedAt: -1, createdAt: -1 });
};

const getBlogPostById = async (id) => {
  return getEntityById(BlogPost, id, 'Blog post');
};

const updateBlogPost = async (id, payload, userId) => {
  return updateEntity(BlogPost, id, payload, userId, 'Blog post');
};

const deleteBlogPost = async (id) => {
  return deleteEntity(BlogPost, id, 'Blog post');
};

const createGallery = async (payload, userId) => {
  return createEntity(Gallery, payload, userId);
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
  updateBlogPost,
  deleteBlogPost,
  createGallery,
  listGalleries,
  getGalleryById,
  updateGallery,
  deleteGallery,
  createUploadSignature
};
