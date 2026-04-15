const { StatusCodes } = require('http-status-codes');
const asyncHandler = require('../../utils/asyncHandler');
const cmsService = require('./cms.service');

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

const getPage = asyncHandler(async (req, res) => {
  const page = await cmsService.getPageById(req.params.id);
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

const getNewsPost = asyncHandler(async (req, res) => {
  const post = await cmsService.getNewsPostById(req.params.id);
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

const getBlogPost = asyncHandler(async (req, res) => {
  const post = await cmsService.getBlogPostById(req.params.id);
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

const getGallery = asyncHandler(async (req, res) => {
  const gallery = await cmsService.getGalleryById(req.params.id);
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

module.exports = {
  createPage,
  listPages,
  getPage,
  updatePage,
  deletePage,
  createNewsPost,
  listNewsPosts,
  getNewsPost,
  updateNewsPost,
  deleteNewsPost,
  createBlogPost,
  listBlogPosts,
  getBlogPost,
  updateBlogPost,
  deleteBlogPost,
  createGallery,
  listGalleries,
  getGallery,
  updateGallery,
  deleteGallery,
  createUploadSignature
};
