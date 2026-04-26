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

router.get('/notices', validate(scholarshipValidation.listPublicNotices), scholarshipController.listNotices);
router.get('/updates', validate(scholarshipValidation.listUpdates), scholarshipController.listUpdates);
router.get(
  '/manage/notices',
  authenticate,
  authorize(...canManageScholarship, ...canReviewScholarship),
  validate(scholarshipValidation.listManageNotices),
  scholarshipController.listManageNotices
);


router.post(
  '/notices',
  authenticate,
  authorize(...canManageScholarship),
  validate(scholarshipValidation.createNotice),
  scholarshipController.createNotice
);

router.patch(
  '/notices/:noticeId',
  authenticate,
  authorize(...canManageScholarship),
  validate(scholarshipValidation.updateNoticeStatus),
  scholarshipController.updateNoticeStatus
);

router.get(
  '/notices/:noticeId/updates',
  validate(scholarshipValidation.listNoticeUpdates),
  scholarshipController.listNoticeUpdates
);

router.post(
  '/notices/:noticeId/updates',
  authenticate,
  authorize(...canManageScholarship, ...canReviewScholarship),
  validate(scholarshipValidation.createNoticeUpdate),
  scholarshipController.createUpdate
);

router.get(
  '/notices/:noticeId/recipients',
  validate(scholarshipValidation.listRecipients),
  scholarshipController.listRecipients
);

router.get(
  '/notices/:noticeId/recipients/manage',
  authenticate,
  authorize(...canReviewScholarship),
  validate(scholarshipValidation.listRecipients),
  scholarshipController.listManageRecipients
);

router.patch(
  '/notices/:noticeId/recipients/publish',
  authenticate,
  authorize(...canReviewScholarship),
  validate(scholarshipValidation.publishRecipients),
  scholarshipController.publishRecipients
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

router.get(
  '/my-applications',
  authenticate,
  validate(scholarshipValidation.listMyApplications),
  scholarshipController.listMyApplications
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
