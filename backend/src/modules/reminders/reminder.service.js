const ScholarshipNotice = require('../scholarship/scholarshipNotice.model');
const ScholarshipApplication = require('../scholarship/scholarshipApplication.model');
const Event = require('../event/event.model');
const EventRegistration = require('../event/eventRegistration.model');
const NotificationLog = require('../notification/notificationLog.model');
const User = require('../auth/user.model');
const EmailService = require('../../services/emailService');
const { ROLES } = require('../../config/roles');
const logger = require('../../config/logger');

// How close to a deadline we start reminding. Kept small so people get a timely
// nudge rather than a flood of far-off notices.
const REMINDER_WINDOW_DAYS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

const pickLocalized = (value, lang = 'en') => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value[lang] || value.en || value.bn || '';
};

const formatDate = (date) =>
  new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

// Reminders are idempotent: we record a NotificationLog with a unique
// `reminderKey` and never send the same key twice. This makes the sweep safe to
// run repeatedly (hourly, on retry, on overlapping cron fires).
const buildReminderKey = (kind, refId, userId) => `${kind}:${refId}:${userId}`;

const alreadyReminded = async (reminderKeys) => {
  if (!reminderKeys.length) return new Set();
  const existing = await NotificationLog.find({
    'metadata.reminderKey': { $in: reminderKeys }
  })
    .select('metadata.reminderKey')
    .lean();
  return new Set(existing.map((log) => log.metadata.reminderKey));
};

const recordReminder = async ({ recipient, subject, message, reminderKey, type, status, error }) => {
  await NotificationLog.create({
    recipient,
    channel: 'email',
    subject,
    message,
    status,
    sentAt: status === 'sent' ? new Date() : undefined,
    error: error || null,
    metadata: { type, source: `${type}-reminder`, reminderKey }
  });
};

// Scholarship deadline reminders: every active student who has NOT applied to an
// open notice closing within the window gets one email per notice.
const runScholarshipReminders = async (now, windowEnd) => {
  const notices = await ScholarshipNotice.find({
    status: 'open',
    deadline: { $gt: now, $lte: windowEnd }
  })
    .select('title deadline')
    .lean();

  if (!notices.length) return { sent: 0, skipped: 0, failed: 0 };

  const students = await User.find({ isActive: true, roles: ROLES.STUDENT })
    .select('_id email')
    .lean();

  if (!students.length) return { sent: 0, skipped: 0, failed: 0 };

  const counts = { sent: 0, skipped: 0, failed: 0 };

  for (const notice of notices) {
    const noticeId = String(notice._id);

    // Students who already applied to this notice must not be nudged.
    const applications = await ScholarshipApplication.find({ notice: notice._id })
      .select('student')
      .lean();
    const appliedStudentIds = new Set(applications.map((app) => String(app.student)));

    const candidates = students.filter((student) => !appliedStudentIds.has(String(student._id)));
    const reminderKeys = candidates.map((student) =>
      buildReminderKey('scholarship', noticeId, String(student._id))
    );
    const sentKeys = await alreadyReminded(reminderKeys);

    const title = pickLocalized(notice.title);
    const deadlineLabel = formatDate(notice.deadline);

    for (const student of candidates) {
      const reminderKey = buildReminderKey('scholarship', noticeId, String(student._id));
      if (sentKeys.has(reminderKey)) {
        counts.skipped += 1;
        continue;
      }

      try {
        // The email helper embeds title/deadline as plain values, so pass a
        // resolved (localized, formatted) shape rather than the raw document.
        await EmailService.sendScholarshipReminder(
          { title, deadline: deadlineLabel },
          student.email
        );
        await recordReminder({
          recipient: student._id,
          subject: `Scholarship Deadline Reminder: ${title}`,
          message: `"${title}" closes on ${deadlineLabel}.`,
          reminderKey,
          type: 'scholarship',
          status: 'sent'
        });
        counts.sent += 1;
      } catch (err) {
        await recordReminder({
          recipient: student._id,
          subject: `Scholarship Deadline Reminder: ${title}`,
          message: `"${title}" closes on ${deadlineLabel}.`,
          reminderKey,
          type: 'scholarship',
          status: 'failed',
          error: err.message
        });
        counts.failed += 1;
        logger.warn(`Scholarship reminder failed for ${student.email}: ${err.message}`);
      }
    }
  }

  return counts;
};

// Event reminders: attendees registered for a published event starting within
// the window get one email per event.
const runEventReminders = async (now, windowEnd) => {
  const events = await Event.find({
    status: 'published',
    startTime: { $gt: now, $lte: windowEnd }
  })
    .select('title startTime location')
    .lean();

  if (!events.length) return { sent: 0, skipped: 0, failed: 0 };

  const counts = { sent: 0, skipped: 0, failed: 0 };

  for (const event of events) {
    const eventId = String(event._id);

    const registrations = await EventRegistration.find({
      event: event._id,
      status: { $in: ['registered', 'checked_in'] }
    })
      .populate('attendee', 'email')
      .lean();

    const attendees = registrations.filter((reg) => reg.attendee && reg.attendee.email);
    const reminderKeys = attendees.map((reg) =>
      buildReminderKey('event', eventId, String(reg.attendee._id))
    );
    const sentKeys = await alreadyReminded(reminderKeys);

    const title = pickLocalized(event.title);
    const dateLabel = formatDate(event.startTime);

    for (const reg of attendees) {
      const reminderKey = buildReminderKey('event', eventId, String(reg.attendee._id));
      if (sentKeys.has(reminderKey)) {
        counts.skipped += 1;
        continue;
      }

      try {
        await EmailService.sendEventReminder(
          { title, date: dateLabel, location: event.location },
          reg.attendee.email
        );
        await recordReminder({
          recipient: reg.attendee._id,
          subject: `Event Reminder: ${title}`,
          message: `"${title}" is on ${dateLabel} at ${event.location}.`,
          reminderKey,
          type: 'event',
          status: 'sent'
        });
        counts.sent += 1;
      } catch (err) {
        await recordReminder({
          recipient: reg.attendee._id,
          subject: `Event Reminder: ${title}`,
          message: `"${title}" is on ${dateLabel} at ${event.location}.`,
          reminderKey,
          type: 'event',
          status: 'failed',
          error: err.message
        });
        counts.failed += 1;
        logger.warn(`Event reminder failed for ${reg.attendee.email}: ${err.message}`);
      }
    }
  }

  return counts;
};

// Entry point for the scheduled sweep. Best-effort and idempotent: safe to run
// on any external scheduler (Vercel Cron, GitHub Actions, cron-job.org).
const runReminderSweep = async ({ windowDays = REMINDER_WINDOW_DAYS } = {}) => {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + windowDays * DAY_MS);

  const [scholarship, event] = await Promise.all([
    runScholarshipReminders(now, windowEnd),
    runEventReminders(now, windowEnd)
  ]);

  const summary = {
    windowDays,
    scholarship,
    event,
    totalSent: scholarship.sent + event.sent,
    generatedAt: now
  };

  logger.info(
    `Reminder sweep complete: ${summary.totalSent} sent ` +
      `(scholarship ${scholarship.sent}/${event.sent} event), ` +
      `${scholarship.skipped + event.skipped} skipped, ${scholarship.failed + event.failed} failed`
  );

  return summary;
};

module.exports = {
  runReminderSweep,
  // exported for testing
  runScholarshipReminders,
  runEventReminders,
  buildReminderKey,
  REMINDER_WINDOW_DAYS
};
