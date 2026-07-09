const mongoose = require('mongoose');

// Mock collaborators so the trigger logic can be tested without a database.
jest.mock('../../src/modules/notification/notification.service', () => ({
  dispatchNotification: jest.fn().mockResolvedValue({})
}));
jest.mock('../../src/modules/auth/user.model', () => ({
  find: jest.fn()
}));

const { dispatchNotification } = require('../../src/modules/notification/notification.service');
const User = require('../../src/modules/auth/user.model');
const {
  notifyScholarshipSubmission,
  notifyScholarshipDecision,
  notifyEventRegistration,
  notifyBookingDecision
} = require('../../src/modules/notification/notificationEvents');

const oid = () => new mongoose.Types.ObjectId();

const lastPayloadsFor = (source) =>
  dispatchNotification.mock.calls
    .map(([arg]) => arg.payload)
    .filter((payload) => payload.metadata && payload.metadata.source === source);

describe('Workflow notification triggers (FR-PA-049)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    User.find.mockReturnValue({ select: jest.fn().mockResolvedValue([]) });
  });

  it('acknowledges the applicant and alerts reviewers on scholarship submission', async () => {
    const reviewerId = oid();
    User.find.mockReturnValue({ select: jest.fn().mockResolvedValue([{ _id: reviewerId }]) });

    const application = { _id: oid(), student: oid(), status: 'submitted' };
    const notice = { _id: oid(), title: { en: 'Merit Award', bn: 'মেধা বৃত্তি' } };

    await notifyScholarshipSubmission({ application, notice });

    const payloads = lastPayloadsFor('scholarship-application');
    expect(payloads).toHaveLength(2);

    const applicantPayload = payloads.find(
      (p) => p.recipient.toString() === application.student.toString()
    );
    expect(applicantPayload).toBeDefined();
    expect(applicantPayload.channel).toBe('in_app');
    expect(applicantPayload.subject).toContain('Merit Award');

    const reviewerPayload = payloads.find(
      (p) => p.recipient.toString() === reviewerId.toString()
    );
    expect(reviewerPayload).toBeDefined();
  });

  it('notifies the applicant on a review decision', async () => {
    const application = {
      _id: oid(),
      student: oid(),
      status: 'shortlisted',
      decisionNote: 'Strong candidate',
      notice: { title: { en: 'Need Grant', bn: '' } }
    };

    await notifyScholarshipDecision({ application });

    const [payload] = lastPayloadsFor('scholarship-review');
    expect(payload).toBeDefined();
    expect(payload.recipient.toString()).toBe(application.student.toString());
    expect(payload.message).toContain('shortlisted');
    expect(payload.message).toContain('Strong candidate');
  });

  it('confirms registration to the attendee', async () => {
    const registration = { _id: oid(), attendee: oid(), event: oid() };

    await notifyEventRegistration({ registration, eventTitle: { en: 'Tech Talk', bn: '' } });

    const [payload] = lastPayloadsFor('event-registration');
    expect(payload).toBeDefined();
    expect(payload.recipient.toString()).toBe(registration.attendee.toString());
    expect(payload.subject).toContain('Tech Talk');
  });

  it('notifies the requester of a booking decision', async () => {
    const booking = {
      _id: oid(),
      requester: oid(),
      status: 'approved',
      title: 'Seminar',
      decisionNote: ''
    };

    await notifyBookingDecision({ booking, venueName: 'Auditorium' });

    const [payload] = lastPayloadsFor('booking-decision');
    expect(payload).toBeDefined();
    expect(payload.recipient.toString()).toBe(booking.requester.toString());
    expect(payload.message).toContain('approved');
    expect(payload.message).toContain('Auditorium');
  });

  it('never throws when dispatch fails (best-effort delivery)', async () => {
    dispatchNotification.mockRejectedValueOnce(new Error('queue down'));
    const registration = { _id: oid(), attendee: oid(), event: oid() };

    await expect(
      notifyEventRegistration({ registration, eventTitle: { en: 'Resilient', bn: '' } })
    ).resolves.toBeUndefined();
  });
});
