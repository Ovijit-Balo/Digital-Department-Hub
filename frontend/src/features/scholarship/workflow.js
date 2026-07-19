// Client-side mirror of the backend scholarship review workflow
// (backend/src/modules/scholarship/scholarship.service.js). This is used only
// to present the legal, role-permitted next steps in the UI; the backend
// remains the source of truth and re-validates every transition.

// Staff (manager) verifies documents; Teacher-Reviewer evaluates; Admin awards.
const VERIFY_ROLES = ['admin', 'manager'];
const REVIEW_ROLES = ['admin', 'reviewer'];
const APPROVER_ROLES = ['admin'];

export const WORKFLOW_TRANSITIONS = {
  submitted: {
    documents_verified: VERIFY_ROLES,
    // Bounce a fixable application back to the applicant instead of rejecting.
    needs_info: VERIFY_ROLES,
    rejected: VERIFY_ROLES
  },
  needs_info: {
    rejected: VERIFY_ROLES
  },
  documents_verified: {
    under_review: REVIEW_ROLES,
    needs_info: REVIEW_ROLES,
    rejected: REVIEW_ROLES
  },
  under_review: {
    shortlisted: REVIEW_ROLES,
    needs_info: REVIEW_ROLES,
    rejected: REVIEW_ROLES
  },
  shortlisted: {
    approved: APPROVER_ROLES,
    rejected: APPROVER_ROLES,
    under_review: APPROVER_ROLES
  },
  approved: {
    under_review: APPROVER_ROLES
  },
  rejected: {
    under_review: APPROVER_ROLES
  }
};

// Returns the status values the given user (by roles) may move an application
// to from its current status. Empty array means no action is available.
export const nextReviewSteps = (currentStatus, userRoles = []) => {
  const roles = Array.isArray(userRoles) ? userRoles : [userRoles].filter(Boolean);
  const allowed = WORKFLOW_TRANSITIONS[currentStatus] || {};

  return Object.entries(allowed)
    .filter(([, permittedRoles]) => roles.some((role) => permittedRoles.includes(role)))
    .map(([toStatus]) => toStatus);
};
