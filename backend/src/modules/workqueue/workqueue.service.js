const VenueBooking = require('../booking/venueBooking.model');
const ContactInquiry = require('../contact/contactInquiry.model');
const ScholarshipApplication = require('../scholarship/scholarshipApplication.model');

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

// SLA thresholds (in hours) after which a pending item is considered aging.
// Kept deliberately simple: "warning" nudges, "overdue" demands action. These
// are service-desk expectations, not hard deadlines, so they only drive sorting
// and colour — nothing is auto-rejected.
const SLA_HOURS = {
  booking: { warning: 24, overdue: 72 },
  inquiry: { warning: 12, overdue: 48 },
  scholarship: { warning: 48, overdue: 120 }
};

const severityFor = (kind, ageMs) => {
  const ageHours = ageMs / HOUR_MS;
  const thresholds = SLA_HOURS[kind];
  if (ageHours >= thresholds.overdue) return 'overdue';
  if (ageHours >= thresholds.warning) return 'warning';
  return 'normal';
};

// Rank so the queue sorts overdue-first, then by age within each band.
const SEVERITY_RANK = { overdue: 0, warning: 1, normal: 2 };

const toQueueItem = ({ kind, id, title, subtitle, requester, createdAt, actionPath, meta }) => {
  const createdMs = new Date(createdAt).getTime();
  const ageMs = Date.now() - createdMs;
  return {
    kind,
    id: String(id),
    title,
    subtitle,
    requester,
    createdAt,
    ageDays: Math.floor(ageMs / DAY_MS),
    ageHours: Math.floor(ageMs / HOUR_MS),
    severity: severityFor(kind, ageMs),
    actionPath,
    meta: meta || {}
  };
};

const fetchPendingBookings = async (limit) => {
  const bookings = await VenueBooking.find({ status: 'pending' })
    .sort({ createdAt: 1 })
    .limit(limit)
    .populate('venue', 'name')
    .populate('requester', 'fullName email')
    .lean();

  return bookings.map((booking) =>
    toQueueItem({
      kind: 'booking',
      id: booking._id,
      title: booking.title || (booking.venue && booking.venue.name) || 'Venue booking',
      subtitle: booking.venue ? booking.venue.name : '',
      requester: booking.requester ? booking.requester.fullName : 'Unknown',
      createdAt: booking.createdAt,
      actionPath: '/booking',
      meta: {
        venue: booking.venue ? booking.venue.name : null,
        startTime: booking.startTime,
        endTime: booking.endTime,
        bookingType: booking.type
      }
    })
  );
};

const fetchNewInquiries = async (limit) => {
  const inquiries = await ContactInquiry.find({ status: 'new' })
    .sort({ createdAt: 1 })
    .limit(limit)
    .lean();

  return inquiries.map((inquiry) =>
    toQueueItem({
      kind: 'inquiry',
      id: inquiry._id,
      title: inquiry.subject || 'Contact inquiry',
      subtitle: inquiry.name || inquiry.email || '',
      requester: inquiry.name || inquiry.email || 'Unknown',
      createdAt: inquiry.createdAt,
      actionPath: '/contact',
      meta: { email: inquiry.email }
    })
  );
};

const fetchSubmittedScholarships = async (limit) => {
  const applications = await ScholarshipApplication.find({ status: 'submitted' })
    .sort({ createdAt: 1 })
    .limit(limit)
    .populate('notice', 'title')
    .populate('student', 'fullName email')
    .lean();

  return applications.map((application) => {
    const noticeTitle = application.notice && application.notice.title;
    const title =
      (noticeTitle && (noticeTitle.en || noticeTitle.bn)) || 'Scholarship application';
    return toQueueItem({
      kind: 'scholarship',
      id: application._id,
      title,
      subtitle: application.student ? application.student.fullName : '',
      requester: application.student ? application.student.fullName : 'Unknown',
      createdAt: application.createdAt,
      actionPath: '/scholarship',
      meta: { noticeId: application.notice ? String(application.notice._id) : null }
    });
  });
};

// Builds the unified staff work queue: pending bookings + new inquiries +
// submitted scholarship applications, merged and sorted overdue-first then
// oldest-first. `perKindLimit` caps how many of each source we pull so one busy
// queue can't drown the others.
const getStaffWorkQueue = async ({ perKindLimit = 25 } = {}) => {
  const [bookings, inquiries, scholarships] = await Promise.all([
    fetchPendingBookings(perKindLimit),
    fetchNewInquiries(perKindLimit),
    fetchSubmittedScholarships(perKindLimit)
  ]);

  const items = [...bookings, ...inquiries, ...scholarships].sort((a, b) => {
    const rankDiff = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
    if (rankDiff !== 0) return rankDiff;
    // Older first within the same severity band.
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  const summary = {
    total: items.length,
    overdue: items.filter((item) => item.severity === 'overdue').length,
    warning: items.filter((item) => item.severity === 'warning').length,
    byKind: {
      booking: bookings.length,
      inquiry: inquiries.length,
      scholarship: scholarships.length
    }
  };

  return { items, summary, generatedAt: new Date() };
};

module.exports = {
  getStaffWorkQueue,
  // exported for testing
  severityFor,
  SLA_HOURS
};
