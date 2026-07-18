const { dispatchNotification } = require('./notification.service');
const User = require('../auth/user.model');
const { ROLES } = require('../../config/roles');
const logger = require('../../config/logger');

/**
 * Workflow notification triggers (FR-PA-049).
 *
 * These helpers translate domain events (scholarship submission, status change,
 * event registration, booking decision) into in-app notification log entries via
 * the unified notification service. Every helper is best-effort: a failure to
 * notify must never break the underlying workflow, so all errors are swallowed
 * and logged instead of thrown.
 */

const pickLocalized = (value, lang = 'en') => {
  if (!value) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  return value[lang] || value.en || value.bn || '';
};

const safeDispatch = async (payload, context) => {
  try {
    await dispatchNotification({ payload });
  } catch (error) {
    logger.warn(`Failed to dispatch ${context} notification: ${error.message}`);
  }
};

const notifyScholarshipSubmission = async ({ application, notice }) => {
  const noticeTitle = pickLocalized(notice.title);

  // Acknowledge the applicant.
  await safeDispatch(
    {
      recipient: application.student,
      channel: 'in_app',
      subject: `Application received: ${noticeTitle}`,
      message: `Your scholarship application for "${noticeTitle}" has been submitted and is now pending review.`,
      metadata: {
        type: 'scholarship',
        applicationId: application._id.toString(),
        noticeId: notice._id.toString(),
        status: application.status,
        source: 'scholarship-application'
      }
    },
    'scholarship submission (applicant)'
  );

  // First stop in the pipeline is document verification, so alert Staff (and
  // Admin) that a new application needs its documents checked.
  const verifiers = await User.find({
    isActive: true,
    roles: { $in: [ROLES.ADMIN, ROLES.MANAGER] }
  }).select('_id');

  await Promise.all(
    verifiers.map((verifier) =>
      safeDispatch(
        {
          recipient: verifier._id,
          channel: 'in_app',
          subject: `New scholarship application: ${noticeTitle}`,
          message: `A new application was submitted for "${noticeTitle}" and is awaiting document verification.`,
          metadata: {
            type: 'scholarship',
            applicationId: application._id.toString(),
            noticeId: notice._id.toString(),
            source: 'scholarship-application'
          }
        },
        'scholarship submission (verifier)'
      )
    )
  );
};

// Alerts Teacher-Reviewers (and Admin) that an application has passed document
// verification by Staff and is ready for academic evaluation. This is the
// administrative-to-academic hand-off in the workflow.
const notifyScholarshipDocumentsVerified = async ({ application }) => {
  const noticeTitle = pickLocalized(application.notice && application.notice.title);

  const reviewers = await User.find({
    isActive: true,
    roles: { $in: [ROLES.ADMIN, ROLES.REVIEWER] }
  }).select('_id');

  await Promise.all(
    reviewers.map((reviewer) =>
      safeDispatch(
        {
          recipient: reviewer._id,
          channel: 'in_app',
          subject: `Ready for review: ${noticeTitle}`,
          message: `An application for "${noticeTitle}" passed document verification and is ready for academic evaluation.`,
          metadata: {
            type: 'scholarship',
            applicationId: application._id.toString(),
            status: application.status,
            source: 'scholarship-documents-verified'
          }
        },
        'scholarship documents verified (reviewer)'
      )
    )
  );
};

// Alerts the Admin that a candidate has been shortlisted by a Teacher-Reviewer
// and now awaits the final award decision. Final approval is Admin-only, so
// only admins are notified here.
const notifyScholarshipShortlisted = async ({ application }) => {
  const noticeTitle = pickLocalized(application.notice && application.notice.title);

  const approvers = await User.find({
    isActive: true,
    roles: { $in: [ROLES.ADMIN] }
  }).select('_id');

  await Promise.all(
    approvers.map((approver) =>
      safeDispatch(
        {
          recipient: approver._id,
          channel: 'in_app',
          subject: `Shortlisted, awaiting decision: ${noticeTitle}`,
          message: `An application for "${noticeTitle}" has been shortlisted and is ready for a final award decision.`,
          metadata: {
            type: 'scholarship',
            applicationId: application._id.toString(),
            status: application.status,
            source: 'scholarship-shortlist'
          }
        },
        'scholarship shortlisted (approver)'
      )
    )
  );
};

const notifyScholarshipDecision = async ({ application }) => {
  const noticeTitle = pickLocalized(application.notice && application.notice.title);
  const statusLabel = String(application.status).replace(/_/g, ' ');
  const noteSnippet = application.decisionNote ? ` Note: ${application.decisionNote}` : '';

  await safeDispatch(
    {
      recipient: application.student,
      channel: 'in_app',
      subject: `Scholarship update: ${noticeTitle}`,
      message: `Your application for "${noticeTitle}" is now ${statusLabel}.${noteSnippet}`,
      metadata: {
        type: 'scholarship',
        applicationId: application._id.toString(),
        status: application.status,
        source: 'scholarship-review'
      }
    },
    'scholarship decision'
  );
};

const notifyEventRegistration = async ({ registration, eventTitle }) => {
  const title = pickLocalized(eventTitle);

  await safeDispatch(
    {
      recipient: registration.attendee,
      channel: 'in_app',
      subject: `Registration confirmed: ${title}`,
      message: `You are registered for "${title}". Use your QR pass to check in at the event.`,
      metadata: {
        type: 'event',
        registrationId: registration._id.toString(),
        eventId: registration.event.toString(),
        source: 'event-registration'
      }
    },
    'event registration'
  );
};

const notifyBookingDecision = async ({ booking, venueName }) => {
  const statusLabel = String(booking.status).replace(/_/g, ' ');
  const noteSnippet = booking.decisionNote ? ` Note: ${booking.decisionNote}` : '';
  const venueLabel = venueName ? ` for ${venueName}` : '';

  await safeDispatch(
    {
      recipient: booking.requester,
      channel: 'in_app',
      subject: `Booking ${statusLabel}: ${booking.title || venueName || ''}`.trim(),
      message: `Your venue booking request${venueLabel} has been ${statusLabel}.${noteSnippet}`,
      metadata: {
        type: 'booking',
        bookingId: booking._id.toString(),
        status: booking.status,
        source: 'booking-decision'
      }
    },
    'booking decision'
  );
};

module.exports = {
  notifyScholarshipSubmission,
  notifyScholarshipDocumentsVerified,
  notifyScholarshipShortlisted,
  notifyScholarshipDecision,
  notifyEventRegistration,
  notifyBookingDecision
};
