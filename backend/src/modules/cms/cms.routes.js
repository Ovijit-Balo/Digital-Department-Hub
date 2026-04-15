const express = require('express');
const cmsController = require('./cms.controller');
const cmsValidation = require('./cms.validation');
const validate = require('../../middlewares/validate');
const authenticate = require('../../middlewares/authMiddleware');
const authorize = require('../../middlewares/roleMiddleware');
const { ROLES } = require('../../config/roles');

const router = express.Router();

const canManageContent = [ROLES.ADMIN, ROLES.EDITOR];

router.get('/pages', validate(cmsValidation.listPages), cmsController.listPages);
router.get('/pages/:id', validate(cmsValidation.getPage), cmsController.getPage);
router.post(
  '/pages',
  authenticate,
  authorize(...canManageContent),
  validate(cmsValidation.createPage),
  cmsController.createPage
);
router.patch(
  '/pages/:id',
  authenticate,
  authorize(...canManageContent),
  validate(cmsValidation.updatePage),
  cmsController.updatePage
);
router.delete(
  '/pages/:id',
  authenticate,
  authorize(...canManageContent),
  validate(cmsValidation.getPage),
  cmsController.deletePage
);

router.get('/news', validate(cmsValidation.listNewsPosts), cmsController.listNewsPosts);
router.get('/news/:id', validate(cmsValidation.getNewsPost), cmsController.getNewsPost);
router.post(
  '/news',
  authenticate,
  authorize(...canManageContent),
  validate(cmsValidation.createNewsPost),
  cmsController.createNewsPost
);
router.patch(
  '/news/:id',
  authenticate,
  authorize(...canManageContent),
  validate(cmsValidation.updateNewsPost),
  cmsController.updateNewsPost
);
router.delete(
  '/news/:id',
  authenticate,
  authorize(...canManageContent),
  validate(cmsValidation.getNewsPost),
  cmsController.deleteNewsPost
);

router.get('/blogs', validate(cmsValidation.listBlogPosts), cmsController.listBlogPosts);
router.get('/blogs/:id', validate(cmsValidation.getBlogPost), cmsController.getBlogPost);
router.post(
  '/blogs',
  authenticate,
  authorize(...canManageContent),
  validate(cmsValidation.createBlogPost),
  cmsController.createBlogPost
);
router.patch(
  '/blogs/:id',
  authenticate,
  authorize(...canManageContent),
  validate(cmsValidation.updateBlogPost),
  cmsController.updateBlogPost
);
router.delete(
  '/blogs/:id',
  authenticate,
  authorize(...canManageContent),
  validate(cmsValidation.getBlogPost),
  cmsController.deleteBlogPost
);

router.get('/galleries', validate(cmsValidation.listGalleries), cmsController.listGalleries);
router.get('/galleries/:id', validate(cmsValidation.getGallery), cmsController.getGallery);
router.post(
  '/galleries',
  authenticate,
  authorize(...canManageContent),
  validate(cmsValidation.createGallery),
  cmsController.createGallery
);
router.patch(
  '/galleries/:id',
  authenticate,
  authorize(...canManageContent),
  validate(cmsValidation.updateGallery),
  cmsController.updateGallery
);
router.delete(
  '/galleries/:id',
  authenticate,
  authorize(...canManageContent),
  validate(cmsValidation.getGallery),
  cmsController.deleteGallery
);

router.post(
  '/uploads/signature',
  authenticate,
  authorize(...canManageContent),
  validate(cmsValidation.createUploadSignature),
  cmsController.createUploadSignature
);

module.exports = router;
