const mongoose = require('mongoose');
const { StatusCodes } = require('http-status-codes');
const ScholarshipNotice = require('./scholarshipNotice.model');
const ScholarshipApplication = require('./scholarshipApplication.model');
const ScholarshipUpdate = require('./scholarshipUpdate.model');
const ApiError = require('../../utils/ApiError');
const toCsv = require('../../utils/csv');
const { renderTablePdf, renderAwardLetterPdf } = require('../../utils/pdf');

const { ROLES } = require('../../config/roles');

const APPLICATION_STATUSES = [
  'submitted',
  'needs_info',
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
    // Staff can bounce a fixable application back to the applicant instead of
    // rejecting it outright (e.g. a dead document link).
    needs_info: VERIFY_ROLES,
    rejected: VERIFY_ROLES
  },
  // Applicant was asked to fix something; only the student resubmits, which is
  // handled as a dedicated applicant action (resubmitApplication), not a
  // reviewer transition. Staff may still reject if the student never responds.
  needs_info: {
    rejected: VERIFY_ROLES
  },
  documents_verified: {
    // Academic evaluation begins once documents pass verification.
    under_review: REVIEW_ROLES,
    // A reviewer can also send it back if something is amiss.
    needs_info: REVIEW_ROLES,
    rejected: REVIEW_ROLES
  },
  under_review: {
    shortlisted: REVIEW_ROLES,
    needs_info: REVIEW_ROLES,
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

  if (payload.documentsRequired !== undefined) {
    notice.documentsRequired = payload.documentsRequired;
  }

  if (payload.minimumGpa !== undefined) {
    notice.minimumGpa = payload.minimumGpa;
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

// Shared eligibility/content checks for both first-time apply and resubmit.
// Validates documents, GPA gate, and category selection against the notice,
// and returns the normalized selected category code.
const validateApplicationContent = (notice, payload) => {
  if (notice.documentsRequired) {
    const hasDocument = Array.isArray(payload.documents)
      && payload.documents.some((doc) => doc && doc.name && doc.url);
    if (!hasDocument) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'This scholarship requires at least one supporting document'
      );
    }
  }

  if (notice.minimumGpa && Number(payload.gpa) < notice.minimumGpa) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `This scholarship requires a minimum GPA of ${notice.minimumGpa}`
    );
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

  return normalizedSelectedCategory;
};

// Confirms the notice is currently accepting applications (open + within the
// window). Shared by apply and resubmit so a student can only (re)submit while
// the window is live.
const assertNoticeAcceptingApplications = (notice) => {
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
};

const applyForScholarship = async ({ noticeId, userId, payload }) => {
  const notice = await ScholarshipNotice.findById(noticeId);
  if (!notice) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Scholarship notice not found');
  }

  assertNoticeAcceptingApplications(notice);

  const existing = await ScholarshipApplication.findOne({ notice: noticeId, student: userId });
  if (existing) {
    throw new ApiError(StatusCodes.CONFLICT, 'Application already submitted for this notice');
  }

  const normalizedSelectedCategory = validateApplicationContent(notice, payload);

  const application = await ScholarshipApplication.create({
    ...payload,
    selectedCategoryCode: normalizedSelectedCategory || undefined,
    notice: noticeId,
    student: userId
  });

  await notifyScholarshipSubmission({ application, notice });

  return application;
};

// Statuses at which the applicant still controls the application and may edit
// or withdraw it: it hasn't entered (or has been returned from) review.
const APPLICANT_EDITABLE_STATUSES = ['submitted', 'needs_info'];

// Loads a student's own application and guards ownership. Used by the
// applicant-facing edit/withdraw/resubmit actions.
const loadOwnedApplication = async ({ applicationId, studentId }) => {
  const application = await ScholarshipApplication.findById(applicationId).populate(
    'notice',
    'categories title status applicationWindowStart applicationWindowEnd deadline documentsRequired minimumGpa'
  );

  if (!application) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Scholarship application not found');
  }

  if (application.student.toString() !== studentId.toString()) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'You can only manage your own applications');
  }

  return application;
};

// Applicant edits their own application while it is still in their hands
// (submitted or returned as needs_info). A needs_info edit also resubmits it,
// moving the application back to "submitted" for another verification pass.
const updateOwnApplication = async ({ applicationId, studentId, payload }) => {
  const application = await loadOwnedApplication({ applicationId, studentId });

  if (!APPLICANT_EDITABLE_STATUSES.includes(application.status)) {
    throw new ApiError(
      StatusCodes.CONFLICT,
      'This application is already under review and can no longer be edited'
    );
  }

  assertNoticeAcceptingApplications(application.notice);

  const normalizedSelectedCategory = validateApplicationContent(application.notice, {
    documents: payload.documents !== undefined ? payload.documents : application.documents,
    gpa: payload.gpa !== undefined ? payload.gpa : application.gpa,
    selectedCategoryCode:
      payload.selectedCategoryCode !== undefined
        ? payload.selectedCategoryCode
        : application.selectedCategoryCode
  });

  if (payload.statement !== undefined) application.statement = payload.statement;
  if (payload.gpa !== undefined) application.gpa = payload.gpa;
  if (payload.department !== undefined) application.department = payload.department;
  if (payload.documents !== undefined) application.documents = payload.documents;
  application.selectedCategoryCode = normalizedSelectedCategory || undefined;

  const wasReturned = application.status === 'needs_info';
  if (wasReturned) {
    // Resubmission: return to the front of the pipeline and record the move.
    application.reviewHistory.push({
      fromStatus: 'needs_info',
      toStatus: 'submitted',
      actor: studentId,
      actorRole: ROLES.STUDENT,
      note: 'Applicant updated and resubmitted the application',
      at: new Date()
    });
    application.status = 'submitted';
  }

  await application.save();

  if (wasReturned) {
    // Alert verifiers that a returned application is ready for another look.
    await notifyScholarshipSubmission({ application, notice: application.notice });
  }

  return application;
};

// Applicant withdraws their own application while it is still in their hands.
// The record is deleted so the unique (notice, student) index frees up and they
// may apply again while the window is open.
const withdrawOwnApplication = async ({ applicationId, studentId }) => {
  const application = await loadOwnedApplication({ applicationId, studentId });

  if (!APPLICANT_EDITABLE_STATUSES.includes(application.status)) {
    throw new ApiError(
      StatusCodes.CONFLICT,
      'This application is already under review and can no longer be withdrawn'
    );
  }

  await application.deleteOne();

  return { id: applicationId };
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

// Resolves a localized ({ en, bn }) or plain-string field to a display string.
const pickLocalizedText = (value, lang = 'en') => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value[lang] || value.en || value.bn || '';
};

// Generates a downloadable award confirmation letter for an approved
// application. The requesting student may only fetch their own; reviewers may
// fetch any. Throws unless the application is actually approved.
const generateAwardLetter = async ({ applicationId, requesterId, requesterRoles = [] }) => {
  const application = await ScholarshipApplication.findById(applicationId)
    .populate('notice', 'title scholarshipType categories')
    .populate('student', 'fullName email department');

  if (!application) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Scholarship application not found');
  }

  const roleList = Array.isArray(requesterRoles)
    ? requesterRoles
    : [requesterRoles].filter(Boolean);
  const isReviewer = roleList.some((role) =>
    [ROLES.ADMIN, ROLES.MANAGER, ROLES.REVIEWER].includes(role)
  );
  const isOwner =
    application.student && application.student._id.toString() === requesterId.toString();

  if (!isOwner && !isReviewer) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'You cannot access this award letter');
  }

  if (application.status !== 'approved') {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'An award letter is only available for approved applications'
    );
  }

  const noticeTitle = pickLocalizedText(application.notice && application.notice.title);
  const recipientName = application.student ? application.student.fullName : 'Applicant';

  let categoryLabel = application.awardedCategoryCode || '';
  if (application.awardedCategoryCode && application.notice && application.notice.categories) {
    const category = application.notice.categories.find(
      (item) => item.code === application.awardedCategoryCode
    );
    if (category) {
      categoryLabel = `${pickLocalizedText(category.name)} (${category.code})`;
    }
  }

  const details = [
    { label: 'Scholarship', value: noticeTitle || '—' },
    { label: 'Recipient', value: recipientName },
    { label: 'Department', value: application.department || '—' }
  ];
  if (categoryLabel) {
    details.push({ label: 'Category', value: categoryLabel });
  }
  if (application.awardedAmount !== undefined && application.awardedAmount !== null) {
    details.push({ label: 'Award amount', value: String(application.awardedAmount) });
  }
  details.push({
    label: 'Award date',
    value: (application.reviewedAt || application.updatedAt || new Date())
      .toISOString()
      .slice(0, 10)
  });

  const buffer = await renderAwardLetterPdf({
    recipientName,
    noticeTitle,
    details,
    reference: application._id.toString()
  });

  return { buffer, filename: `scholarship-award-${applicationId}.pdf` };
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
  updateOwnApplication,
  withdrawOwnApplication,
  listApplications,
  listApplicantApplications,
  reviewApplication,
  listRecipients,
  createUpdate,
  listUpdates,
  exportApplicationsCsv,
  exportApplicationsPdf,
  generateAwardLetter,
  getApplicationStatusStats,
  // exported for the workflow and unit tests
  WORKFLOW_TRANSITIONS,
  assertTransitionAllowed,
  resolveActorRole
};
