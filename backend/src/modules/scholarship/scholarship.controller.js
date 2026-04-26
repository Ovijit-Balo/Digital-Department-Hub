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
  const data = await scholarshipService.listNotices(req.query, { publicOnly: true });
  res.status(StatusCodes.OK).json(data);
});

const listManageNotices = asyncHandler(async (req, res) => {
  const data = await scholarshipService.listNotices(req.query, { publicOnly: false });
  res.status(StatusCodes.OK).json(data);
});

const updateNoticeStatus = asyncHandler(async (req, res) => {
  const notice = await scholarshipService.updateNoticeStatus({
    noticeId: req.params.noticeId,
    payload: req.body
  });

  res.locals.auditMeta = {
    action: 'UPDATE_SCHOLARSHIP_NOTICE',
    entityType: 'ScholarshipNotice',
    entityId: notice._id.toString(),
    after: {
      status: notice.status,
      applicationWindowStart: notice.applicationWindowStart,
      applicationWindowEnd: notice.applicationWindowEnd,
      deadline: notice.deadline
    }
  };

  res.status(StatusCodes.OK).json({ notice });
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

const listMyApplications = asyncHandler(async (req, res) => {
  const data = await scholarshipService.listApplicantApplications({
    studentId: req.user._id,
    query: req.query
  });

  res.status(StatusCodes.OK).json(data);
});

const reviewApplication = asyncHandler(async (req, res) => {
  const application = await scholarshipService.reviewApplication({
    applicationId: req.params.applicationId,
    reviewerId: req.user._id,
    status: req.body.status,
    decisionNote: req.body.decisionNote,
    awardedCategoryCode: req.body.awardedCategoryCode,
    awardedAmount: req.body.awardedAmount
  });

  res.locals.auditMeta = {
    action: 'REVIEW_SCHOLARSHIP_APPLICATION',
    entityType: 'ScholarshipApplication',
    entityId: application._id.toString(),
    after: { status: application.status, reviewedBy: req.user._id.toString() }
  };

  res.status(StatusCodes.OK).json({ application });
});

const publishRecipients = asyncHandler(async (req, res) => {
  const notice = await scholarshipService.setRecipientPublication({
    noticeId: req.params.noticeId,
    publish: req.body.publish
  });

  res.locals.auditMeta = {
    action: req.body.publish ? 'PUBLISH_SCHOLARSHIP_RECIPIENTS' : 'UNPUBLISH_SCHOLARSHIP_RECIPIENTS',
    entityType: 'ScholarshipNotice',
    entityId: notice._id.toString(),
    after: { recipientsPublishedAt: notice.recipientsPublishedAt }
  };

  res.status(StatusCodes.OK).json({
    noticeId: notice._id,
    recipientsPublishedAt: notice.recipientsPublishedAt,
    isPublished: Boolean(notice.recipientsPublishedAt)
  });
});

const listRecipients = asyncHandler(async (req, res) => {
  const data = await scholarshipService.listRecipients({
    noticeId: req.params.noticeId,
    query: req.query,
    includeUnpublished: false
  });

  res.status(StatusCodes.OK).json(data);
});

const listManageRecipients = asyncHandler(async (req, res) => {
  const data = await scholarshipService.listRecipients({
    noticeId: req.params.noticeId,
    query: req.query,
    includeUnpublished: true
  });

  res.status(StatusCodes.OK).json(data);
});

const createUpdate = asyncHandler(async (req, res) => {
  const update = await scholarshipService.createUpdate({
    noticeId: req.params.noticeId,
    payload: req.body,
    userId: req.user._id
  });

  res.locals.auditMeta = {
    action: 'CREATE_SCHOLARSHIP_UPDATE',
    entityType: 'ScholarshipUpdate',
    entityId: update._id.toString(),
    after: { notice: update.notice.toString(), kind: update.kind, visibility: update.visibility }
  };

  res.status(StatusCodes.CREATED).json({ update });
});

const listUpdates = asyncHandler(async (req, res) => {
  const data = await scholarshipService.listUpdates(req.query);
  res.status(StatusCodes.OK).json(data);
});

const listNoticeUpdates = asyncHandler(async (req, res) => {
  const data = await scholarshipService.listUpdates({
    ...req.query,
    noticeId: req.params.noticeId
  });

  res.status(StatusCodes.OK).json(data);
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
  listManageNotices,
  updateNoticeStatus,
  apply,
  listApplications,
  listMyApplications,
  reviewApplication,
  publishRecipients,
  listRecipients,
  listManageRecipients,
  createUpdate,
  listNoticeUpdates,
  listUpdates,
  exportApplications
};
