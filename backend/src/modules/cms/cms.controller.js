const { StatusCodes } = require('http-status-codes');
const asyncHandler = require('../../utils/asyncHandler');
const cmsService = require('./cms.service');
const Page = require('./page.model');
const NewsPost = require('./newsPost.model');
const BlogPost = require('./blogPost.model');
const Gallery = require('./gallery.model');
const AnalyticsService = require('../analytics/analytics.service');
const logger = require('../../config/logger');

const createPage = asyncHandler(async (req, res) => {
  const page = await cmsService.createPage(req.body, req.user._id);

  res.locals.auditMeta = {
    action: 'CREATE_PAGE',
    entityType: 'Page',
    entityId: page._id.toString(),
    after: page
  };

  res.status(StatusCodes.CREATED).json({ page });
});

const listPages = asyncHandler(async (req, res) => {
  const data = await cmsService.listPages(req.query);
  res.status(StatusCodes.OK).json(data);
});

const listPublicPages = asyncHandler(async (req, res) => {
  const data = await cmsService.listPages({ ...req.query, status: 'published', onlyLive: true });
  res.status(StatusCodes.OK).json(data);
});

const getPage = asyncHandler(async (req, res) => {
  const page = await cmsService.getPageById(req.params.id);
  res.status(StatusCodes.OK).json({ page });
});

const getPageBySlug = asyncHandler(async (req, res) => {
  const page = await cmsService.getPageBySlug(req.params.slug);

  // Track view asynchronously (don't wait for it)
  AnalyticsService.trackView({
    entityType: 'page',
    entityId: page._id,
    userId: req.user?._id || null,
    sessionId: req.sessionID || null,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    referrer: req.get('referrer')
  }).catch((err) => logger.error('Analytics tracking error:', err));

  res.status(StatusCodes.OK).json({ page });
});

const updatePage = asyncHandler(async (req, res) => {
  const page = await cmsService.updatePage(req.params.id, req.body, req.user._id);

  res.locals.auditMeta = {
    action: 'UPDATE_PAGE',
    entityType: 'Page',
    entityId: page._id.toString(),
    after: page
  };

  res.status(StatusCodes.OK).json({ page });
});

const deletePage = asyncHandler(async (req, res) => {
  await cmsService.deletePage(req.params.id);

  res.locals.auditMeta = {
    action: 'DELETE_PAGE',
    entityType: 'Page',
    entityId: req.params.id
  };

  res.status(StatusCodes.NO_CONTENT).send();
});

const createNewsPost = asyncHandler(async (req, res) => {
  const post = await cmsService.createNewsPost(req.body, req.user._id);

  res.locals.auditMeta = {
    action: 'CREATE_NEWS_POST',
    entityType: 'NewsPost',
    entityId: post._id.toString(),
    after: post
  };

  res.status(StatusCodes.CREATED).json({ post });
});

const listNewsPosts = asyncHandler(async (req, res) => {
  const data = await cmsService.listNewsPosts(req.query);
  res.status(StatusCodes.OK).json(data);
});

const listPublicNewsPosts = asyncHandler(async (req, res) => {
  const data = await cmsService.listNewsPosts({ ...req.query, status: 'published', onlyLive: true });
  res.status(StatusCodes.OK).json(data);
});

const getNewsPost = asyncHandler(async (req, res) => {
  const post = await cmsService.getNewsPostById(req.params.id);
  res.status(StatusCodes.OK).json({ post });
});

const getPublicNewsPost = asyncHandler(async (req, res) => {
  const post = await cmsService.getPublicNewsPostById(req.params.id);

  // Track view asynchronously — the by-id path serves the same public detail
  // page as the slug path, so it must count views the same way.
  AnalyticsService.trackView({
    entityType: 'news',
    entityId: post._id,
    userId: req.user?._id || null,
    sessionId: req.sessionID || null,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    referrer: req.get('referrer')
  }).catch((err) => logger.error('Analytics tracking error:', err));

  res.status(StatusCodes.OK).json({ post });
});

const getNewsPostBySlug = asyncHandler(async (req, res) => {
  const post = await cmsService.getNewsPostBySlug(req.params.slug);

  // Track view asynchronously (don't wait for it)
  AnalyticsService.trackView({
    entityType: 'news',
    entityId: post._id,
    userId: req.user?._id || null,
    sessionId: req.sessionID || null,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    referrer: req.get('referrer')
  }).catch((err) => logger.error('Analytics tracking error:', err));

  res.status(StatusCodes.OK).json({ post });
});

const updateNewsPost = asyncHandler(async (req, res) => {
  const post = await cmsService.updateNewsPost(req.params.id, req.body, req.user._id);

  res.locals.auditMeta = {
    action: 'UPDATE_NEWS_POST',
    entityType: 'NewsPost',
    entityId: post._id.toString(),
    after: post
  };

  res.status(StatusCodes.OK).json({ post });
});

const deleteNewsPost = asyncHandler(async (req, res) => {
  await cmsService.deleteNewsPost(req.params.id);

  res.locals.auditMeta = {
    action: 'DELETE_NEWS_POST',
    entityType: 'NewsPost',
    entityId: req.params.id
  };

  res.status(StatusCodes.NO_CONTENT).send();
});

const createBlogPost = asyncHandler(async (req, res) => {
  const post = await cmsService.createBlogPost(req.body, req.user._id);

  res.locals.auditMeta = {
    action: 'CREATE_BLOG_POST',
    entityType: 'BlogPost',
    entityId: post._id.toString(),
    after: post
  };

  res.status(StatusCodes.CREATED).json({ post });
});

const listBlogPosts = asyncHandler(async (req, res) => {
  const data = await cmsService.listBlogPosts(req.query);
  res.status(StatusCodes.OK).json(data);
});

const listPublicBlogPosts = asyncHandler(async (req, res) => {
  const data = await cmsService.listBlogPosts({ ...req.query, status: 'published', onlyLive: true });
  res.status(StatusCodes.OK).json(data);
});

const getBlogPost = asyncHandler(async (req, res) => {
  const post = await cmsService.getBlogPostById(req.params.id);
  res.status(StatusCodes.OK).json({ post });
});

const getBlogPostBySlug = asyncHandler(async (req, res) => {
  const post = await cmsService.getBlogPostBySlug(req.params.slug);

  // Track view asynchronously (don't wait for it)
  AnalyticsService.trackView({
    entityType: 'blog',
    entityId: post._id,
    userId: req.user?._id || null,
    sessionId: req.sessionID || null,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    referrer: req.get('referrer')
  }).catch((err) => logger.error('Analytics tracking error:', err));

  res.status(StatusCodes.OK).json({ post });
});

const updateBlogPost = asyncHandler(async (req, res) => {
  const post = await cmsService.updateBlogPost(req.params.id, req.body, req.user._id);

  res.locals.auditMeta = {
    action: 'UPDATE_BLOG_POST',
    entityType: 'BlogPost',
    entityId: post._id.toString(),
    after: post
  };

  res.status(StatusCodes.OK).json({ post });
});

const deleteBlogPost = asyncHandler(async (req, res) => {
  await cmsService.deleteBlogPost(req.params.id);

  res.locals.auditMeta = {
    action: 'DELETE_BLOG_POST',
    entityType: 'BlogPost',
    entityId: req.params.id
  };

  res.status(StatusCodes.NO_CONTENT).send();
});

const createGallery = asyncHandler(async (req, res) => {
  const gallery = await cmsService.createGallery(req.body, req.user._id);

  res.locals.auditMeta = {
    action: 'CREATE_GALLERY',
    entityType: 'Gallery',
    entityId: gallery._id.toString(),
    after: gallery
  };

  res.status(StatusCodes.CREATED).json({ gallery });
});

const listGalleries = asyncHandler(async (req, res) => {
  const data = await cmsService.listGalleries(req.query);
  res.status(StatusCodes.OK).json(data);
});

const listPublicGalleries = asyncHandler(async (req, res) => {
  const data = await cmsService.listGalleries({ ...req.query, status: 'published' });
  res.status(StatusCodes.OK).json(data);
});

const getGallery = asyncHandler(async (req, res) => {
  const gallery = await cmsService.getGalleryById(req.params.id);
  res.status(StatusCodes.OK).json({ gallery });
});

const getPublicGallery = asyncHandler(async (req, res) => {
  const gallery = await cmsService.getPublicGalleryById(req.params.id);

  // Track view asynchronously — mirrors the slug handler below.
  AnalyticsService.trackView({
    entityType: 'gallery',
    entityId: gallery._id,
    userId: req.user?._id || null,
    sessionId: req.sessionID || null,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    referrer: req.get('referrer')
  }).catch((err) => logger.error('Analytics tracking error:', err));

  res.status(StatusCodes.OK).json({ gallery });
});

const getGalleryBySlug = asyncHandler(async (req, res) => {
  const gallery = await cmsService.getGalleryBySlug(req.params.slug);

  // Track view asynchronously (don't wait for it)
  AnalyticsService.trackView({
    entityType: 'gallery',
    entityId: gallery._id,
    userId: req.user?._id || null,
    sessionId: req.sessionID || null,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    referrer: req.get('referrer')
  }).catch((err) => logger.error('Analytics tracking error:', err));

  res.status(StatusCodes.OK).json({ gallery });
});

const updateGallery = asyncHandler(async (req, res) => {
  const gallery = await cmsService.updateGallery(req.params.id, req.body, req.user._id);

  res.locals.auditMeta = {
    action: 'UPDATE_GALLERY',
    entityType: 'Gallery',
    entityId: gallery._id.toString(),
    after: gallery
  };

  res.status(StatusCodes.OK).json({ gallery });
});

const deleteGallery = asyncHandler(async (req, res) => {
  await cmsService.deleteGallery(req.params.id);

  res.locals.auditMeta = {
    action: 'DELETE_GALLERY',
    entityType: 'Gallery',
    entityId: req.params.id
  };

  res.status(StatusCodes.NO_CONTENT).send();
});

const createUploadSignature = asyncHandler(async (req, res) => {
  const signature = await cmsService.createUploadSignature(req.body);
  res.status(StatusCodes.OK).json({ signature });
});

// GET /cms/manage/editorial-queue — the signed-in author's own drafts and
// upcoming scheduled publishes across all content types.
const getEditorialQueue = asyncHandler(async (req, res) => {
  const queue = await cmsService.getEditorialQueue(req.user._id);
  res.status(StatusCodes.OK).json(queue);
});

const bulkDeletePages = asyncHandler(async (req, res) => {
  const { ids } = req.body;
  const result = await cmsService.bulkDelete(Page, ids, 'Page');

  res.locals.auditMeta = {
    action: 'BULK_DELETE_PAGES',
    entityType: 'Page',
    entityId: ids.join(','),
    after: { deletedCount: result.deletedCount }
  };

  res.status(StatusCodes.OK).json(result);
});

const bulkUpdatePageStatus = asyncHandler(async (req, res) => {
  const { ids, status } = req.body;
  const result = await cmsService.bulkUpdateStatus(Page, ids, status, 'Page');

  res.locals.auditMeta = {
    action: 'BULK_UPDATE_PAGE_STATUS',
    entityType: 'Page',
    entityId: ids.join(','),
    after: { status, modifiedCount: result.modifiedCount }
  };

  res.status(StatusCodes.OK).json(result);
});

const bulkDeleteNews = asyncHandler(async (req, res) => {
  const { ids } = req.body;
  const result = await cmsService.bulkDelete(NewsPost, ids, 'News post');

  res.locals.auditMeta = {
    action: 'BULK_DELETE_NEWS',
    entityType: 'NewsPost',
    entityId: ids.join(','),
    after: { deletedCount: result.deletedCount }
  };

  res.status(StatusCodes.OK).json(result);
});

const bulkUpdateNewsStatus = asyncHandler(async (req, res) => {
  const { ids, status } = req.body;
  const result = await cmsService.bulkUpdateStatus(NewsPost, ids, status, 'News post');

  res.locals.auditMeta = {
    action: 'BULK_UPDATE_NEWS_STATUS',
    entityType: 'NewsPost',
    entityId: ids.join(','),
    after: { status, modifiedCount: result.modifiedCount }
  };

  res.status(StatusCodes.OK).json(result);
});

const bulkDeleteBlogs = asyncHandler(async (req, res) => {
  const { ids } = req.body;
  const result = await cmsService.bulkDelete(BlogPost, ids, 'Blog post');

  res.locals.auditMeta = {
    action: 'BULK_DELETE_BLOGS',
    entityType: 'BlogPost',
    entityId: ids.join(','),
    after: { deletedCount: result.deletedCount }
  };

  res.status(StatusCodes.OK).json(result);
});

const bulkUpdateBlogStatus = asyncHandler(async (req, res) => {
  const { ids, status } = req.body;
  const result = await cmsService.bulkUpdateStatus(BlogPost, ids, status, 'Blog post');

  res.locals.auditMeta = {
    action: 'BULK_UPDATE_BLOG_STATUS',
    entityType: 'BlogPost',
    entityId: ids.join(','),
    after: { status, modifiedCount: result.modifiedCount }
  };

  res.status(StatusCodes.OK).json(result);
});

const bulkDeleteGalleries = asyncHandler(async (req, res) => {
  const { ids } = req.body;
  const result = await cmsService.bulkDelete(Gallery, ids, 'Gallery');

  res.locals.auditMeta = {
    action: 'BULK_DELETE_GALLERIES',
    entityType: 'Gallery',
    entityId: ids.join(','),
    after: { deletedCount: result.deletedCount }
  };

  res.status(StatusCodes.OK).json(result);
});

const bulkUpdateGalleryStatus = asyncHandler(async (req, res) => {
  const { ids, status } = req.body;
  const result = await cmsService.bulkUpdateStatus(Gallery, ids, status, 'Gallery');

  res.locals.auditMeta = {
    action: 'BULK_UPDATE_GALLERY_STATUS',
    entityType: 'Gallery',
    entityId: ids.join(','),
    after: { status, modifiedCount: result.modifiedCount }
  };

  res.status(StatusCodes.OK).json(result);
});

module.exports = {
  createPage,
  listPublicPages,
  listPages,
  getPage,
  getPageBySlug,
  updatePage,
  deletePage,
  bulkDeletePages,
  bulkUpdatePageStatus,
  createNewsPost,
  listPublicNewsPosts,
  listNewsPosts,
  getNewsPost,
  getPublicNewsPost,
  getNewsPostBySlug,
  updateNewsPost,
  deleteNewsPost,
  bulkDeleteNews,
  bulkUpdateNewsStatus,
  createBlogPost,
  listPublicBlogPosts,
  listBlogPosts,
  getBlogPost,
  getBlogPostBySlug,
  updateBlogPost,
  deleteBlogPost,
  bulkDeleteBlogs,
  bulkUpdateBlogStatus,
  createGallery,
  listPublicGalleries,
  listGalleries,
  getGallery,
  getPublicGallery,
  getGalleryBySlug,
  updateGallery,
  deleteGallery,
  bulkDeleteGalleries,
  bulkUpdateGalleryStatus,
  createUploadSignature,
  getEditorialQueue
};
