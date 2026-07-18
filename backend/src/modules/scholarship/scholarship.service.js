const mongoose = require('mongoose');
const { StatusCodes } = require('http-status-codes');
const ScholarshipNotice = require('./scholarshipNotice.model');
const ScholarshipApplication = require('./scholarshipApplication.model');
const ScholarshipUpdate = require('./scholarshipUpdate.model');
const ApiError = require('../../utils/ApiError');
const toCsv = require('../../utils/csv');
const { renderTablePdf } = require('../../utils/pdf');

const { ROLES } = require('../../config/roles');

const APPLICATION_STATUSES = [
  'submitted',
  'documents_verified',
  'under_review',
  'shortlisted',
  'approved',
  'rejected'
];

// Multi-step review workflow that separates administrative work from academic
// judgment, mirroring how the department actually operates:
//
//   Student submits -> Staff verifies documents -> Teacher-Reviewer evaluates
//   (screen + shortlist) -> Admin approves/awards.
//
// Each entry lists the statuses reachable from a given status and, for each,
// which roles may make that move.
//   VERIFY_ROLES   Staff (manager) checks documents are complete. Admin too.
//   REVIEW_ROLES   Teacher-Reviewer performs academic evaluation. Admin too.
//   APPROVER_ROLES Only Admin gives the final award/rejection.
const VERIFY_ROLES = [ROLES.ADMIN, ROLES.MANAGER];
const REVIEW_ROLES = [ROLES.ADMIN, ROLES.REVIEWER];
const APPROVER_ROLES = [ROLES.ADMIN];

const WORKFLOW_TRANSITIONS = {
  submitted: {
    // Staff confirms the applicant's documents are complete before evaluation.
    documents_verified: VERIFY_ROLES,
    rejected: VERIFY_ROLES
  },
  documents_verified: {
    // Academic evaluation begins once documents pass verification.
    under_review: REVIEW_ROLES,
    rejected: REVIEW_ROLES
  },
  under_review: {
    shortlisted: REVIEW_ROLES,
    rejected: REVIEW_ROLES
  },
  shortlisted: {
    // Final decision is reserved for the admin.
    approved: APPROVER_ROLES,
    rejected: APPROVER_ROLES,
    // Admin can send a shortlisted candidate back for re-evaluation.
    under_review: APPROVER_ROLES
  },
  // Terminal states can be reopened by the admin to correct a mistake.
  approved: {
    under_review: APPROVER_ROLES
  },
  rejected: {
    under_review: APPROVER_ROLES
  }
};

const {
  notifyScholarshipSubmission,
  notifyScholarshipDecision,
  notifyScholarshipDocumentsVerified,
  notifyScholarshipShortlisted
} = require('../notification/notificationEvents');

// Picks the most privileged role the actor holds that is relevant to review,
// used purely to label history entries. Falls back to the first role.
const resolveActorRole = (roles = []) => {
  const list = Array.isArray(roles) ? roles : [roles].filter(Boolean);
  if (list.includes(ROLES.ADMIN)) return ROLES.ADMIN;
  if (list.includes(ROLES.REVIEWER)) return ROLES.REVIEWER;
  if (list.includes(ROLES.MANAGER)) return ROLES.MANAGER;
  return list[0] || null;
};

// Validates a requested status change against the workflow and the actor's
// roles. Throws ApiError on an illegal transition or insufficient permission.
const assertTransitionAllowed = ({ fromStatus, toStatus, actorRoles }) => {
  const actorList = Array.isArray(actorRoles) ? actorRoles : [actorRoles].filter(Boolean);

  if (fromStatus === toStatus) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Application is already "${toStatus}"`
    );
  }

  const allowedNext = WORKFLOW_TRANSITIONS[fromStatus];
  if (!allowedNext || !allowedNext[toStatus]) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Cannot move a "${fromStatus}" application to "${toStatus}"`
    );
  }

  const permittedRoles = allowedNext[toStatus];
  const hasPermittedRole = actorList.some((role) => permittedRoles.includes(role));
  if (!hasPermittedRole) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      `Your role is not permitted to move an application to "${toStatus}"`
    );
  }
};

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

const updateNotice = async ({ noticeId, payload }) => {
  const notice = await ScholarshipNotice.findById(noticeId);
  if (!notice) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Scholarship notice not found');
  }

  if (payload.title) {
    notice.title = payload.title;
  }

  if (payload.description) {
    notice.description = payload.description;
  }

  if (payload.eligibility) {
    notice.eligibility = payload.eligibility;
  }

  if (payload.scholarshipType) {
    notice.scholarshipType = payload.scholarshipType;
  }

  if (payload.categories) {
    notice.categories = normalizeCategories(payload.categories);
  }

  if (payload.attachments) {
    notice.attachments = payload.attachments;
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

    const hasCategory = notice.categories.some(
      (category) => category.code === normalizedSelectedCategory
    );
    if (!hasCategory) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Selected scholarship category is invalid');
    }
  }

  const application = await ScholarshipApplication.create({
    ...payload,
    selectedCategoryCode: normalizedSelectedCategory || undefined,
    notice: noticeId,
    student: userId
  });

  await notifyScholarshipSubmission({ application, notice });

  return application;
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
  reviewerRoles = [],
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

  const previousStatus = application.status;

  // Enforce the multi-step workflow: legal transition + role permitted for it.
  assertTransitionAllowed({
    fromStatus: previousStatus,
    toStatus: status,
    actorRoles: reviewerRoles
  });

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

      if (category.slots) {
        const approvedCount = await ScholarshipApplication.countDocuments({
          notice: application.notice._id,
          status: 'approved',
          awardedCategoryCode: normalizedAwardCategory,
          _id: { $ne: application._id }
        });

        if (approvedCount >= category.slots) {
          throw new ApiError(
            StatusCodes.BAD_REQUEST,
            `All ${category.slots} slot(s) for category "${normalizedAwardCategory}" are filled`
          );
        }
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

  const actorRole = resolveActorRole(reviewerRoles);
  const now = new Date();

  application.status = status;
  application.decisionNote = decisionNote || '';
  application.reviewedBy = reviewerId;
  application.reviewedAt = now;
  application.reviewHistory.push({
    fromStatus: previousStatus,
    toStatus: status,
    actor: reviewerId,
    actorRole,
    note: decisionNote || '',
    at: now
  });
  await application.save();

  // Notification hooks per step. The applicant is always kept informed; each
  // pipeline hand-off alerts the role that owns the next stage.
  await notifyScholarshipDecision({ application });

  if (status === 'documents_verified') {
    // Staff finished verification; alert Teacher-Reviewers for evaluation.
    await notifyScholarshipDocumentsVerified({ application });
  }

  if (status === 'shortlisted') {
    // Reviewer shortlisted a candidate; alert the Admin for the final award.
    await notifyScholarshipShortlisted({ application });
  }

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
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'Recipient list is not published for this notice yet'
    );
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

const exportApplicationsPdf = async ({ noticeId, status }) => {
  const notice = await ScholarshipNotice.findById(noticeId).select('title scholarshipType');
  if (!notice) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Scholarship notice not found');
  }

  const filter = { notice: noticeId };
  if (status) {
    filter.status = status;
  }

  const items = await ScholarshipApplication.find(filter)
    .populate('student', 'fullName email department')
    .populate('reviewedBy', 'fullName email')
    .sort({ createdAt: -1 });

  const approvedCount = items.filter((item) => item.status === 'approved').length;

  const rows = items.map((item, index) => ({
    idx: index + 1,
    student: item.student ? item.student.fullName : 'Unknown',
    email: item.student ? item.student.email : '',
    department: item.department,
    gpa: item.gpa,
    category: item.awardedCategoryCode || item.selectedCategoryCode || '—',
    amount: item.awardedAmount || '',
    status: item.status,
    submitted: item.createdAt.toISOString().slice(0, 10)
  }));

  const buffer = await renderTablePdf({
    title: notice.title.en,
    subtitle: status
      ? `Scholarship applications report — status: ${status}`
      : 'Scholarship applications report',
    meta: [
      { label: 'Total applications', value: String(items.length) },
      { label: 'Approved', value: String(approvedCount) },
      { label: 'Scholarship type', value: notice.scholarshipType }
    ],
    columns: [
      { key: 'idx', label: '#', width: 22 },
      { key: 'student', label: 'Applicant', width: 92 },
      { key: 'email', label: 'Email', width: 118 },
      { key: 'department', label: 'Department', width: 70 },
      { key: 'gpa', label: 'GPA', width: 32 },
      { key: 'category', label: 'Category', width: 66 },
      { key: 'amount', label: 'Amount', width: 50 },
      { key: 'status', label: 'Status', width: 62 },
      { key: 'submitted', label: 'Submitted', width: 58 }
    ],
    rows
  });

  return { buffer, filename: `scholarship-applications-${noticeId}.pdf` };
};

const getApplicationStatusStats = async ({ noticeId } = {}) => {
  const match = {};
  if (noticeId) {
    match.notice = new mongoose.Types.ObjectId(noticeId);
  }

  const grouped = await ScholarshipApplication.aggregate([
    { $match: match },
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);

  const byStatus = APPLICATION_STATUSES.reduce((acc, key) => ({ ...acc, [key]: 0 }), {});
  let total = 0;

  grouped.forEach((row) => {
    if (row._id in byStatus) {
      byStatus[row._id] = row.count;
    }
    total += row.count;
  });

  const pending =
    byStatus.submitted +
    byStatus.documents_verified +
    byStatus.under_review +
    byStatus.shortlisted;

  return { total, pending, byStatus };
};

module.exports = {
  createNotice,
  listNotices,
  updateNotice,
  setRecipientPublication,
  applyForScholarship,
  listApplications,
  listApplicantApplications,
  reviewApplication,
  listRecipients,
  createUpdate,
  listUpdates,
  exportApplicationsCsv,
  exportApplicationsPdf,
  getApplicationStatusStats,
  // exported for the workflow and unit tests
  WORKFLOW_TRANSITIONS,
  assertTransitionAllowed,
  resolveActorRole
};
