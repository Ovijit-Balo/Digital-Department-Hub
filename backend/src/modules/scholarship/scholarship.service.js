const { StatusCodes } = require('http-status-codes');
const ScholarshipNotice = require('./scholarshipNotice.model');
const ScholarshipApplication = require('./scholarshipApplication.model');
const ApiError = require('../../utils/ApiError');
const toCsv = require('../../utils/csv');

const buildPagination = ({ page, limit }) => {
  const parsedPage = Number(page || 1);
  const parsedLimit = Number(limit || 20);

  return {
    page: parsedPage,
    limit: parsedLimit,
    skip: (parsedPage - 1) * parsedLimit
  };
};

const createNotice = async (payload, userId) => {
  return ScholarshipNotice.create({
    ...payload,
    createdBy: userId,
    publishedAt: payload.status === 'open' ? new Date() : null
  });
};

const listNotices = async (query) => {
  const filter = {};
  if (query.status) {
    filter.status = query.status;
  }

  const { page, limit, skip } = buildPagination(query);
  const [items, total] = await Promise.all([
    ScholarshipNotice.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    ScholarshipNotice.countDocuments(filter)
  ]);

  return { items, page, limit, total };
};

const applyForScholarship = async ({ noticeId, userId, payload }) => {
  const notice = await ScholarshipNotice.findById(noticeId);
  if (!notice) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Scholarship notice not found');
  }

  if (notice.status !== 'open') {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'This scholarship is not open for applications');
  }

  if (notice.deadline < new Date()) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Application deadline has passed');
  }

  const existing = await ScholarshipApplication.findOne({ notice: noticeId, student: userId });
  if (existing) {
    throw new ApiError(StatusCodes.CONFLICT, 'Application already submitted for this notice');
  }

  return ScholarshipApplication.create({
    ...payload,
    notice: noticeId,
    student: userId
  });
};

const listApplications = async (query) => {
  const filter = {};

  if (query.noticeId) {
    filter.notice = query.noticeId;
  }

  if (query.status) {
    filter.status = query.status;
  }

  const { page, limit, skip } = buildPagination(query);

  const [items, total] = await Promise.all([
    ScholarshipApplication.find(filter)
      .populate('notice', 'title deadline')
      .populate('student', 'fullName email department')
      .populate('reviewedBy', 'fullName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    ScholarshipApplication.countDocuments(filter)
  ]);

  return {
    items,
    page,
    limit,
    total
  };
};

const reviewApplication = async ({ applicationId, reviewerId, status, decisionNote }) => {
  const application = await ScholarshipApplication.findById(applicationId);

  if (!application) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Scholarship application not found');
  }

  application.status = status;
  application.decisionNote = decisionNote || '';
  application.reviewedBy = reviewerId;
  application.reviewedAt = new Date();
  await application.save();

  return application;
};

const exportApplicationsCsv = async ({ noticeId, status }) => {
  const filter = { notice: noticeId };
  if (status) {
    filter.status = status;
  }

  const items = await ScholarshipApplication.find(filter)
    .populate('student', 'fullName email department')
    .populate('notice', 'title')
    .populate('reviewedBy', 'fullName email')
    .sort({ createdAt: -1 });

  const rows = items.map((item) => ({
    applicationId: item._id.toString(),
    noticeTitle: item.notice.title.en,
    studentName: item.student.fullName,
    studentEmail: item.student.email,
    studentDepartment: item.department,
    gpa: item.gpa,
    status: item.status,
    reviewedBy: item.reviewedBy ? item.reviewedBy.fullName : '',
    reviewedAt: item.reviewedAt ? item.reviewedAt.toISOString() : '',
    submittedAt: item.createdAt.toISOString()
  }));

  return toCsv(rows);
};

module.exports = {
  createNotice,
  listNotices,
  applyForScholarship,
  listApplications,
  reviewApplication,
  exportApplicationsCsv
};
