jest.mock('../../src/modules/scholarship/scholarshipNotice.model');
jest.mock('../../src/modules/scholarship/scholarshipApplication.model');
jest.mock('../../src/modules/event/event.model');
jest.mock('../../src/modules/event/eventRegistration.model');
jest.mock('../../src/modules/notification/notificationLog.model');
jest.mock('../../src/modules/auth/user.model');
jest.mock('../../src/services/emailService');

const ScholarshipNotice = require('../../src/modules/scholarship/scholarshipNotice.model');
const ScholarshipApplication = require('../../src/modules/scholarship/scholarshipApplication.model');
const Event = require('../../src/modules/event/event.model');
const EventRegistration = require('../../src/modules/event/eventRegistration.model');
const NotificationLog = require('../../src/modules/notification/notificationLog.model');
const User = require('../../src/modules/auth/user.model');
const EmailService = require('../../src/services/emailService');
const reminderService = require('../../src/modules/reminders/reminder.service');

const DAY_MS = 24 * 60 * 60 * 1000;

// Chainable query stub resolving to `rows` at .lean().
const query = (rows) => {
  const chain = {
    select: () => chain,
    populate: () => chain,
    lean: () => Promise.resolve(rows)
  };
  return chain;
};

describe('runScholarshipReminders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    NotificationLog.find.mockReturnValue(query([])); // nothing reminded yet
    NotificationLog.create.mockResolvedValue({});
    EmailService.sendScholarshipReminder.mockResolvedValue({ success: true });
  });

  it('emails only students who have not applied, once each', async () => {
    const now = new Date();
    const windowEnd = new Date(now.getTime() + 3 * DAY_MS);
    const soon = new Date(now.getTime() + 2 * DAY_MS);

    ScholarshipNotice.find.mockReturnValue(
      query([{ _id: 'n1', title: { en: 'Merit', bn: '' }, deadline: soon }])
    );
    User.find.mockReturnValue(
      query([
        { _id: 's1', email: 's1@uni.edu' },
        { _id: 's2', email: 's2@uni.edu' }
      ])
    );
    // s2 already applied -> only s1 should be emailed.
    ScholarshipApplication.find.mockReturnValue(query([{ student: 's2' }]));

    const counts = await reminderService.runScholarshipReminders(now, windowEnd);

    expect(EmailService.sendScholarshipReminder).toHaveBeenCalledTimes(1);
    expect(EmailService.sendScholarshipReminder).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Merit' }),
      's1@uni.edu'
    );
    expect(counts.sent).toBe(1);
  });

  it('skips students already reminded (idempotent)', async () => {
    const now = new Date();
    const windowEnd = new Date(now.getTime() + 3 * DAY_MS);
    const soon = new Date(now.getTime() + 2 * DAY_MS);

    ScholarshipNotice.find.mockReturnValue(
      query([{ _id: 'n1', title: { en: 'Merit', bn: '' }, deadline: soon }])
    );
    User.find.mockReturnValue(query([{ _id: 's1', email: 's1@uni.edu' }]));
    ScholarshipApplication.find.mockReturnValue(query([]));
    // The reminder key for s1 already exists in the log.
    NotificationLog.find.mockReturnValue(
      query([{ metadata: { reminderKey: 'scholarship:n1:s1' } }])
    );

    const counts = await reminderService.runScholarshipReminders(now, windowEnd);

    expect(EmailService.sendScholarshipReminder).not.toHaveBeenCalled();
    expect(counts.skipped).toBe(1);
    expect(counts.sent).toBe(0);
  });

  it('records a failed reminder without throwing', async () => {
    const now = new Date();
    const windowEnd = new Date(now.getTime() + 3 * DAY_MS);
    const soon = new Date(now.getTime() + 2 * DAY_MS);

    ScholarshipNotice.find.mockReturnValue(
      query([{ _id: 'n1', title: { en: 'Merit', bn: '' }, deadline: soon }])
    );
    User.find.mockReturnValue(query([{ _id: 's1', email: 's1@uni.edu' }]));
    ScholarshipApplication.find.mockReturnValue(query([]));
    EmailService.sendScholarshipReminder.mockRejectedValue(new Error('smtp down'));

    const counts = await reminderService.runScholarshipReminders(now, windowEnd);

    expect(counts.failed).toBe(1);
    expect(NotificationLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'failed', error: 'smtp down' })
    );
  });
});

describe('runEventReminders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    NotificationLog.find.mockReturnValue(query([]));
    NotificationLog.create.mockResolvedValue({});
    EmailService.sendEventReminder.mockResolvedValue({ success: true });
  });

  it('emails registered attendees of an upcoming event', async () => {
    const now = new Date();
    const windowEnd = new Date(now.getTime() + 3 * DAY_MS);
    const soon = new Date(now.getTime() + 1 * DAY_MS);

    Event.find.mockReturnValue(
      query([{ _id: 'e1', title: { en: 'Seminar', bn: '' }, startTime: soon, location: 'Hall A' }])
    );
    EventRegistration.find.mockReturnValue(
      query([{ _id: 'r1', attendee: { _id: 'a1', email: 'a1@uni.edu' } }])
    );

    const counts = await reminderService.runEventReminders(now, windowEnd);

    expect(EmailService.sendEventReminder).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Seminar', location: 'Hall A' }),
      'a1@uni.edu'
    );
    expect(counts.sent).toBe(1);
  });
});

describe('buildReminderKey', () => {
  it('is stable and unique per kind/ref/user', () => {
    expect(reminderService.buildReminderKey('scholarship', 'n1', 's1')).toBe('scholarship:n1:s1');
    expect(reminderService.buildReminderKey('event', 'e1', 'a1')).toBe('event:e1:a1');
  });
});
