const { StatusCodes } = require('http-status-codes');
const asyncHandler = require('../../utils/asyncHandler');
const scholarshipService = require('./scholarship.service');

const createNotice = asyncHandler(async (req, res) => {
  const notice = await scholarshipService.createNotice(req.body, req.user._id);

  res.locals.auditMeta = {
    action: 'CREATE_SCHOLARSHIP_NOTICE',
    entityType: 'ScholarshipNotice',
    entityId: notice._id.toString(),
    after: notice
  };

  res.status(StatusCodes.CREATED).json({ notice });
});

const listNotices = asyncHandler(async (req, res) => {
  const data = await scholarshipService.listNotices(req.query);
  res.status(StatusCodes.OK).json(data);
});

const apply = asyncHandler(async (req, res) => {
  const application = await scholarshipService.applyForScholarship({
    noticeId: req.params.noticeId,
    userId: req.user._id,
    payload: req.body
  });

  res.locals.auditMeta = {
    action: 'APPLY_SCHOLARSHIP',
    entityType: 'ScholarshipApplication',
    entityId: application._id.toString(),
    after: { status: application.status, notice: application.notice.toString() }
  };

  res.status(StatusCodes.CREATED).json({ application });
});

const listApplications = asyncHandler(async (req, res) => {
  const data = await scholarshipService.listApplications(req.query);
  res.status(StatusCodes.OK).json(data);
});

const reviewApplication = asyncHandler(async (req, res) => {
  const application = await scholarshipService.reviewApplication({
    applicationId: req.params.applicationId,
    reviewerId: req.user._id,
    status: req.body.status,
    decisionNote: req.body.decisionNote
  });

  res.locals.auditMeta = {
    action: 'REVIEW_SCHOLARSHIP_APPLICATION',
    entityType: 'ScholarshipApplication',
    entityId: application._id.toString(),
    after: { status: application.status, reviewedBy: req.user._id.toString() }
  };

  res.status(StatusCodes.OK).json({ application });
});

const exportApplications = asyncHandler(async (req, res) => {
  const csv = await scholarshipService.exportApplicationsCsv(req.query);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="scholarship-applications.csv"');
  res.status(StatusCodes.OK).send(csv);
});

module.exports = {
  createNotice,
  listNotices,
  apply,
  listApplications,
  reviewApplication,
  exportApplications
};
