const { StatusCodes } = require('http-status-codes');
const ScholarshipNotice = require('./scholarshipNotice.model');
const ScholarshipApplication = require('./scholarshipApplication.model');
const ScholarshipUpdate = require('./scholarshipUpdate.model');
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

const normalizeCategoryCode = (value) => {
  if (!value) {
    return '';
  }

  return String(value).trim().toLowerCase();
};

const normalizeCategories = (categories = []) => {
  return categories.map((category) => ({
    ...category,
    code: normalizeCategoryCode(category.code)
  }));
};

const resolveApplicationWindow = (notice) => {
  return {
    start: new Date(notice.applicationWindowStart || notice.createdAt),
    end: new Date(notice.applicationWindowEnd || notice.deadline)
  };
};

const mapApplicationState = (notice) => {
  const now = Date.now();
  const { start, end } = resolveApplicationWindow(notice);

  if (notice.status === 'draft') {
    return 'draft';
  }

  if (notice.status === 'closed') {
    return 'closed';
  }

  if (start.getTime() > now) {
    return 'scheduled';
  }

  if (end.getTime() < now) {
    return 'closed';
  }

  return 'open';
};

const createNotice = async (payload, userId) => {
  const categories = normalizeCategories(payload.categories || []);

  const windowStart = payload.applicationWindowStart
    ? new Date(payload.applicationWindowStart)
    : new Date();
  const windowEnd = payload.applicationWindowEnd
    ? new Date(payload.applicationWindowEnd)
    : new Date(payload.deadline);

  return ScholarshipNotice.create({
    ...payload,
    categories,
    applicationWindowStart: windowStart,
    applicationWindowEnd: windowEnd,
    createdBy: userId,
    publishedAt: payload.status === 'open' ? new Date() : null
  });
};

const listNotices = async (query, options = {}) => {
  const filter = {};

  if (options.publicOnly) {
    if (query.status) {
      filter.status = query.status;
    } else {
      filter.status = { $in: ['open', 'closed'] };
    }
  } else if (query.status) {
    filter.status = query.status;
  }
  if (query.scholarshipType) {
    filter.scholarshipType = query.scholarshipType;
  }

  const { page, limit, skip } = buildPagination(query);
  const [items, total] = await Promise.all([
    ScholarshipNotice.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    ScholarshipNotice.countDocuments(filter)
  ]);

  return {
    items: items.map((notice) => ({
      ...notice.toObject(),
      applicationState: mapApplicationState(notice)
    })),
    page,
    limit,
    total
  };
};

const updateNoticeStatus = async ({ noticeId, payload }) => {
  const notice = await ScholarshipNotice.findById(noticeId);
  if (!notice) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Scholarship notice not found');
  }

  if (payload.applicationWindowStart) {
    notice.applicationWindowStart = new Date(payload.applicationWindowStart);
  }

  if (payload.applicationWindowEnd) {
    notice.applicationWindowEnd = new Date(payload.applicationWindowEnd);
  }

  if (payload.deadline) {
    notice.deadline = new Date(payload.deadline);
  }

  if (payload.status) {
    notice.status = payload.status;

    if (payload.status === 'open' && !notice.publishedAt) {
      notice.publishedAt = new Date();
    }

    if (payload.status === 'closed' && notice.applicationWindowEnd > new Date()) {
      notice.applicationWindowEnd = new Date();
    }
  }

  await notice.save();
  return notice;
};

const setRecipientPublication = async ({ noticeId, publish }) => {
  const notice = await ScholarshipNotice.findById(noticeId);
  if (!notice) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Scholarship notice not found');
  }

  notice.recipientsPublishedAt = publish ? new Date() : null;

  if (publish) {
    notice.latestUpdateAt = new Date();
  }

  await notice.save();
  return notice;
};

const applyForScholarship = async ({ noticeId, userId, payload }) => {
  const notice = await ScholarshipNotice.findById(noticeId);
  if (!notice) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Scholarship notice not found');
  }

  if (notice.status !== 'open') {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'This scholarship is not open for applications');
  }

  const now = new Date();
  const { start, end } = resolveApplicationWindow(notice);

  if (now < start) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Application window has not opened yet');
  }

  if (now > end) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Application window has closed');
  }

  const existing = await ScholarshipApplication.findOne({ notice: noticeId, student: userId });
  if (existing) {
    throw new ApiError(StatusCodes.CONFLICT, 'Application already submitted for this notice');
  }

  const normalizedSelectedCategory = normalizeCategoryCode(payload.selectedCategoryCode);
  if (notice.categories.length) {
    if (!normalizedSelectedCategory) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Select a scholarship category before applying to this notice'
      );
    }

    const hasCategory = notice.categories.some((category) => category.code === normalizedSelectedCategory);
    if (!hasCategory) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Selected scholarship category is invalid');
    }
  }

  return ScholarshipApplication.create({
    ...payload,
    selectedCategoryCode: normalizedSelectedCategory || undefined,
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
      .populate('notice', 'title deadline status scholarshipType categories')
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

const listApplicantApplications = async ({ studentId, query }) => {
  const filter = {
    student: studentId
  };

  if (query.noticeId) {
    filter.notice = query.noticeId;
  }

  if (query.status) {
    filter.status = query.status;
  }

  const { page, limit, skip } = buildPagination(query);

  const [items, total] = await Promise.all([
    ScholarshipApplication.find(filter)
      .populate('notice', 'title deadline status scholarshipType categories')
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

const reviewApplication = async ({
  applicationId,
  reviewerId,
  status,
  decisionNote,
  awardedCategoryCode,
  awardedAmount
}) => {
  const application = await ScholarshipApplication.findById(applicationId).populate(
    'notice',
    'categories title'
  );

  if (!application) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Scholarship application not found');
  }

  const normalizedAwardCategory = normalizeCategoryCode(
    awardedCategoryCode || application.selectedCategoryCode
  );

  if (status === 'approved') {
    if (application.notice.categories.length && !normalizedAwardCategory) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Award category is required when approving a category-based scholarship'
      );
    }

    if (normalizedAwardCategory) {
      const category = application.notice.categories.find(
        (item) => item.code === normalizedAwardCategory
      );

      if (!category) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Award category is not part of this notice');
      }

      application.awardedCategoryCode = normalizedAwardCategory;
      application.awardedAmount =
        awardedAmount !== undefined && awardedAmount !== null && awardedAmount !== ''
          ? Number(awardedAmount)
          : category.amount;
    } else {
      application.awardedCategoryCode = undefined;
      application.awardedAmount =
        awardedAmount !== undefined && awardedAmount !== null && awardedAmount !== ''
          ? Number(awardedAmount)
          : undefined;
    }
  } else {
    application.awardedCategoryCode = undefined;
    application.awardedAmount = undefined;
  }

  application.status = status;
  application.decisionNote = decisionNote || '';
  application.reviewedBy = reviewerId;
  application.reviewedAt = new Date();
  await application.save();

  return application;
};

const listRecipients = async ({ noticeId, query, includeUnpublished = false }) => {
  const notice = await ScholarshipNotice.findById(noticeId).select(
    'title scholarshipType categories recipientsPublishedAt status'
  );

  if (!notice) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Scholarship notice not found');
  }

  if (!notice.recipientsPublishedAt && !includeUnpublished) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Recipient list is not published for this notice yet');
  }

  const filter = {
    notice: noticeId,
    status: 'approved'
  };

  if (query.awardedCategoryCode) {
    filter.awardedCategoryCode = normalizeCategoryCode(query.awardedCategoryCode);
  }

  const { page, limit, skip } = buildPagination(query);

  const [items, total] = await Promise.all([
    ScholarshipApplication.find(filter)
      .populate('student', 'fullName email department')
      .populate('reviewedBy', 'fullName email')
      .sort({ awardedAmount: -1, gpa: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit),
    ScholarshipApplication.countDocuments(filter)
  ]);

  return {
    notice,
    isPublished: Boolean(notice.recipientsPublishedAt),
    recipientsPublishedAt: notice.recipientsPublishedAt,
    items,
    page,
    limit,
    total
  };
};

const createUpdate = async ({ noticeId, payload, userId }) => {
  const notice = await ScholarshipNotice.findById(noticeId).select('_id');
  if (!notice) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Scholarship notice not found');
  }

  const update = await ScholarshipUpdate.create({
    ...payload,
    notice: noticeId,
    postedBy: userId
  });

  await ScholarshipNotice.findByIdAndUpdate(noticeId, { latestUpdateAt: new Date() });

  return update;
};

const listUpdates = async (query) => {
  const filter = {};

  if (query.noticeId) {
    filter.notice = query.noticeId;
  }

  if (query.includeInternal) {
    filter.visibility = query.visibility || { $in: ['public', 'internal'] };
  } else {
    filter.visibility = 'public';
  }

  const { page, limit, skip } = buildPagination(query);

  const [items, total] = await Promise.all([
    ScholarshipUpdate.find(filter)
      .populate('notice', 'title status scholarshipType')
      .populate('postedBy', 'fullName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    ScholarshipUpdate.countDocuments(filter)
  ]);

  return {
    items,
    page,
    limit,
    total
  };
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
    selectedCategoryCode: item.selectedCategoryCode || '',
    awardedCategoryCode: item.awardedCategoryCode || '',
    awardedAmount: item.awardedAmount || '',
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
  updateNoticeStatus,
  setRecipientPublication,
  applyForScholarship,
  listApplications,
  listApplicantApplications,
  reviewApplication,
  listRecipients,
  createUpdate,
  listUpdates,
  exportApplicationsCsv
};
