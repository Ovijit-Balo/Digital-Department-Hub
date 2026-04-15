const express = require('express');
const scholarshipController = require('./scholarship.controller');
const scholarshipValidation = require('./scholarship.validation');
const validate = require('../../middlewares/validate');
const authenticate = require('../../middlewares/authMiddleware');
const authorize = require('../../middlewares/roleMiddleware');
const { ROLES } = require('../../config/roles');

const router = express.Router();

const canManageScholarship = [ROLES.ADMIN, ROLES.MANAGER, ROLES.EDITOR];
const canReviewScholarship = [ROLES.ADMIN, ROLES.MANAGER, ROLES.REVIEWER];

router.get('/notices', validate(scholarshipValidation.listNotices), scholarshipController.listNotices);
router.post(
  '/notices',
  authenticate,
  authorize(...canManageScholarship),
  validate(scholarshipValidation.createNotice),
  scholarshipController.createNotice
);

router.post(
  '/notices/:noticeId/applications',
  authenticate,
  authorize(ROLES.STUDENT),
  validate(scholarshipValidation.apply),
  scholarshipController.apply
);

router.get(
  '/applications',
  authenticate,
  authorize(...canReviewScholarship),
  validate(scholarshipValidation.listApplications),
  scholarshipController.listApplications
);

router.patch(
  '/applications/:applicationId/review',
  authenticate,
  authorize(...canReviewScholarship),
  validate(scholarshipValidation.reviewApplication),
  scholarshipController.reviewApplication
);

router.get(
  '/applications/export',
  authenticate,
  authorize(...canReviewScholarship),
  validate(scholarshipValidation.exportApplications),
  scholarshipController.exportApplications
);

module.exports = router;
