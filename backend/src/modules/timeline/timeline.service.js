const ScholarshipNotice = require('../scholarship/scholarshipNotice.model');
const ScholarshipApplication = require('../scholarship/scholarshipApplication.model');
const Event = require('../event/event.model');
const EventRegistration = require('../event/eventRegistration.model');
const VenueBooking = require('../booking/venueBooking.model');

// How far ahead to surface upcoming deadlines, and how far back to keep showing
// a decision that already happened. Keeps the feed relevant, not a full history.
const UPCOMING_HORIZON_DAYS = 60;
const DECISION_LOOKBACK_DAYS = 30;
const MAX_ITEMS = 20;

const DAY_MS = 24 * 60 * 60 * 1000;

const daysUntil = (date, now) => Math.ceil((new Date(date).getTime() - now.getTime()) / DAY_MS);

// A single urgency band drives the colour/label on the frontend. Anything due
// within 3 days is "urgent", within 7 is "soon", otherwise "upcoming".
const urgencyFor = (days) => {
  if (days <= 3) return 'urgent';
  if (days <= 7) return 'soon';
  return 'upcoming';
};

// Upcoming scholarship deadlines the student has NOT applied to yet — the
// actionable "apply before it closes" nudge.
const scholarshipDeadlineItems = async (userId, now, horizon) => {
  const [openNotices, myApplications] = await Promise.all([
    ScholarshipNotice.find({
      status: 'open',
      deadline: { $gt: now, $lte: horizon }
    })
      .select('title deadline')
      .lean(),
    ScholarshipApplication.find({ student: userId }).select('notice').lean()
  ]);

  const appliedNoticeIds = new Set(myApplications.map((app) => String(app.notice)));

  return openNotices
    .filter((notice) => !appliedNoticeIds.has(String(notice._id)))
    .map((notice) => {
      const days = daysUntil(notice.deadline, now);
      return {
        id: `scholarship-deadline-${notice._id}`,
        kind: 'scholarship_deadline',
        category: 'scholarship',
        title: notice.title,
        date: notice.deadline,
        days,
        urgency: urgencyFor(days),
        actionable: true,
        link: '/scholarship'
      };
    });
};

// Decisions on the student's own applications (approved / shortlisted /
// rejected / under review) made within the lookback window.
const scholarshipDecisionItems = async (userId, now, lookback) => {
  const decided = await ScholarshipApplication.find({
    student: userId,
    reviewedAt: { $gte: lookback },
    status: { $in: ['under_review', 'shortlisted', 'approved', 'rejected'] }
  })
    .populate('notice', 'title')
    .select('status reviewedAt notice decisionNote')
    .lean();

  return decided.map((app) => ({
    id: `scholarship-decision-${app._id}`,
    kind: 'scholarship_decision',
    category: 'scholarship',
    title: app.notice ? app.notice.title : 'Scholarship application',
    date: app.reviewedAt,
    status: app.status,
    note: app.decisionNote || '',
    urgency: 'info',
    actionable: false,
    link: '/scholarship'
  }));
};

// Events the student registered for that are still upcoming (their QR pass).
const registeredEventItems = async (userId, now, horizon) => {
  const registrations = await EventRegistration.find({
    attendee: userId,
    status: { $in: ['registered', 'checked_in'] }
  })
    .populate({
      path: 'event',
      match: { status: 'published', startTime: { $gt: now, $lte: horizon } },
      select: 'title startTime location'
    })
    .lean();

  return registrations
    .filter((reg) => reg.event) // populate match drops events outside the window
    .map((reg) => {
      const days = daysUntil(reg.event.startTime, now);
      return {
        id: `event-registered-${reg._id}`,
        kind: 'event_upcoming',
        category: 'event',
        title: reg.event.title,
        location: reg.event.location,
        date: reg.event.startTime,
        days,
        urgency: urgencyFor(days),
        actionable: false,
        link: '/events'
      };
    });
};

// Published events with a registration deadline approaching that the student is
// NOT registered for yet — the "register before it closes" nudge.
const eventRegistrationDeadlineItems = async (userId, now, horizon) => {
  const [events, myRegistrations] = await Promise.all([
    Event.find({
      status: 'published',
      registrationDeadline: { $gt: now, $lte: horizon }
    })
      .select('title registrationDeadline location')
      .lean(),
    EventRegistration.find({
      attendee: userId,
      status: { $in: ['registered', 'checked_in'] }
    })
      .select('event')
      .lean()
  ]);

  const registeredEventIds = new Set(myRegistrations.map((reg) => String(reg.event)));

  return events
    .filter((event) => !registeredEventIds.has(String(event._id)))
    .map((event) => {
      const days = daysUntil(event.registrationDeadline, now);
      return {
        id: `event-regdeadline-${event._id}`,
        kind: 'event_registration_deadline',
        category: 'event',
        title: event.title,
        location: event.location,
        date: event.registrationDeadline,
        days,
        urgency: urgencyFor(days),
        actionable: true,
        link: '/events'
      };
    });
};

// The student's own venue bookings: recent decisions and upcoming approved slots.
const bookingItems = async (userId, now, horizon, lookback) => {
  const bookings = await VenueBooking.find({
    requester: userId,
    $or: [
      { decisionAt: { $gte: lookback } },
      { status: 'approved', startTime: { $gt: now, $lte: horizon } }
    ]
  })
    .populate('venue', 'name')
    .select('title status startTime decisionAt decisionNote venue')
    .lean();

  const items = [];

  for (const booking of bookings) {
    const venueName = booking.venue ? booking.venue.name : '';

    // A decision that landed recently.
    if (booking.decisionAt && new Date(booking.decisionAt) >= lookback) {
      items.push({
        id: `booking-decision-${booking._id}`,
        kind: 'booking_decision',
        category: 'booking',
        title: booking.title,
        venue: venueName,
        date: booking.decisionAt,
        status: booking.status,
        note: booking.decisionNote || '',
        urgency: 'info',
        actionable: false,
        link: '/booking'
      });
    }

    // An approved slot that is still upcoming.
    if (
      booking.status === 'approved' &&
      new Date(booking.startTime) > now &&
      new Date(booking.startTime) <= horizon
    ) {
      const days = daysUntil(booking.startTime, now);
      items.push({
        id: `booking-upcoming-${booking._id}`,
        kind: 'booking_upcoming',
        category: 'booking',
        title: booking.title,
        venue: venueName,
        date: booking.startTime,
        days,
        urgency: urgencyFor(days),
        actionable: false,
        link: '/booking'
      });
    }
  }

  return items;
};

// Merge every source into one time-ordered personal feed. Deadlines/upcoming
// items sort by soonest first; decisions (already in the past) sort by most
// recent. We interleave by absolute date so "what's next" reads top to bottom.
const getUserTimeline = async (userId) => {
  const now = new Date();
  const horizon = new Date(now.getTime() + UPCOMING_HORIZON_DAYS * DAY_MS);
  const lookback = new Date(now.getTime() - DECISION_LOOKBACK_DAYS * DAY_MS);

  const groups = await Promise.all([
    scholarshipDeadlineItems(userId, now, horizon),
    scholarshipDecisionItems(userId, now, lookback),
    registeredEventItems(userId, now, horizon),
    eventRegistrationDeadlineItems(userId, now, horizon),
    bookingItems(userId, now, horizon, lookback)
  ]);

  const items = groups.flat();

  // Upcoming items (future date) first, soonest at the top; then recent
  // decisions, newest first.
  items.sort((a, b) => {
    const aFuture = new Date(a.date).getTime() >= now.getTime();
    const bFuture = new Date(b.date).getTime() >= now.getTime();

    if (aFuture && bFuture) {
      return new Date(a.date) - new Date(b.date); // soonest first
    }
    if (!aFuture && !bFuture) {
      return new Date(b.date) - new Date(a.date); // most recent decision first
    }
    return aFuture ? -1 : 1; // upcoming before past
  });

  return {
    items: items.slice(0, MAX_ITEMS),
    total: items.length,
    generatedAt: now
  };
};

module.exports = {
  getUserTimeline,
  // exported for unit testing
  urgencyFor,
  daysUntil
};
