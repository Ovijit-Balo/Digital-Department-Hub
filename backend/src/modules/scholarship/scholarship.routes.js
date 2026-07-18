const express = require('express');
const scholarshipController = require('./scholarship.controller');
const scholarshipValidation = require('./scholarship.validation');
const validate = require('../../middlewares/validate');
const authenticate = require('../../middlewares/authMiddleware');
const authorize = require('../../middlewares/roleMiddleware');
const { ROLES } = require('../../config/roles');

const router = express.Router();

// Notice authoring and window management is administrative work: Admin and
// Staff (manager) only. Teachers focus on academic review, not notice creation.
const canManageScholarship = [ROLES.ADMIN, ROLES.MANAGER];
// Anyone in the review pipeline may read applications: Staff verify documents,
// Teacher-Reviewers evaluate, Admin oversees.
const canReviewScholarship = [ROLES.ADMIN, ROLES.MANAGER, ROLES.REVIEWER];

router.get(
  '/notices',
  validate(scholarshipValidation.listPublicNotices),
  scholarshipController.listNotices
);
router.get(
  '/updates',
  validate(scholarshipValidation.listUpdates),
  scholarshipController.listUpdates
);
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
  validate(scholarshipValidation.updateNotice),
  scholarshipController.updateNotice
);

router.get(
  '/notices/:noticeId/updates/manage',
  authenticate,
  authorize(...canManageScholarship, ...canReviewScholarship),
  validate(scholarshipValidation.listNoticeUpdates),
  scholarshipController.listManageNoticeUpdates
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
  // Only students submit applications. Reviewers judge, they never apply.
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

// Applicant self-service: a student may edit or withdraw their own application
// while it is still in their hands (submitted / returned as needs_info). An
// edit on a returned application also resubmits it. Ownership is checked in the
// service, so no role gate beyond authentication is needed here.
router.patch(
  '/my-applications/:applicationId',
  authenticate,
  validate(scholarshipValidation.updateMyApplication),
  scholarshipController.updateMyApplication
);

router.delete(
  '/my-applications/:applicationId',
  authenticate,
  validate(scholarshipValidation.withdrawMyApplication),
  scholarshipController.withdrawMyApplication
);

// Approved applicants download their award confirmation letter. Reviewers may
// also fetch it; both are checked in the service.
router.get(
  '/applications/:applicationId/award-letter',
  authenticate,
  validate(scholarshipValidation.awardLetter),
  scholarshipController.downloadAwardLetter
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

router.get(
  '/applications/export/pdf',
  authenticate,
  authorize(...canReviewScholarship),
  validate(scholarshipValidation.exportApplications),
  scholarshipController.exportApplicationsPdf
);

router.get(
  '/applications/stats',
  authenticate,
  authorize(...canReviewScholarship),
  validate(scholarshipValidation.applicationStats),
  scholarshipController.applicationStats
);

module.exports = router;
