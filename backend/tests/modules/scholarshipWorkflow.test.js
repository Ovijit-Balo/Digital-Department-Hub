// Notification hooks touch User + the notification service; stub them so these
// tests focus on the workflow state machine and history recording.
jest.mock('../../src/modules/notification/notificationEvents', () => ({
  notifyScholarshipSubmission: jest.fn().mockResolvedValue(),
  notifyScholarshipDocumentsVerified: jest.fn().mockResolvedValue(),
  notifyScholarshipShortlisted: jest.fn().mockResolvedValue(),
  notifyScholarshipDecision: jest.fn().mockResolvedValue()
}));

const { setupMongoTest, cleanupMongoTest } = require('../helpers/mongoTest');
const User = require('../../src/modules/auth/user.model');
const ScholarshipNotice = require('../../src/modules/scholarship/scholarshipNotice.model');
const ScholarshipApplication = require('../../src/modules/scholarship/scholarshipApplication.model');
const scholarshipService = require('../../src/modules/scholarship/scholarship.service');
const notificationEvents = require('../../src/modules/notification/notificationEvents');

const daysFromNow = (days) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

let mongoServer;
let reviewer;
let manager;
let admin;
let student;
let noticeId;

beforeAll(async () => {
  mongoServer = await setupMongoTest();

  [reviewer, manager, admin, student] = await Promise.all([
    User.create({ fullName: 'Rita Reviewer', email: 'rev@example.com', passwordHash: 'x'.repeat(60), roles: ['reviewer'] }),
    User.create({ fullName: 'Max Manager', email: 'mgr@example.com', passwordHash: 'x'.repeat(60), roles: ['manager'] }),
    User.create({ fullName: 'Ada Admin', email: 'adm@example.com', passwordHash: 'x'.repeat(60), roles: ['admin'] }),
    User.create({ fullName: 'Sam Student', email: 'stu@example.com', passwordHash: 'x'.repeat(60), roles: ['student'] })
  ]);

  const notice = await ScholarshipNotice.create({
    title: { en: 'Merit Award', bn: 'মেধা বৃত্তি' },
    description: { en: 'x', bn: 'x' },
    eligibility: { en: 'x', bn: 'x' },
    deadline: daysFromNow(30),
    applicationWindowStart: daysFromNow(-1),
    applicationWindowEnd: daysFromNow(20),
    createdBy: manager._id
  });
  noticeId = notice._id;
});

afterAll(async () => {
  await cleanupMongoTest(mongoServer);
});

beforeEach(async () => {
  jest.clearAllMocks();
  // One student + notice pair is unique, so clear applications between tests.
  await ScholarshipApplication.deleteMany({});
});

const freshApplication = () =>
  ScholarshipApplication.create({
    notice: noticeId,
    student: student._id,
    statement: 'I meet all the eligibility criteria for this scholarship award program.',
    gpa: 3.8,
    department: 'CSE',
    status: 'submitted'
  });

// Advances an application to documents_verified using staff, so review-stage
// tests can start from the point where academic evaluation begins.
const verifyDocuments = (app) =>
  scholarshipService.reviewApplication({
    applicationId: app._id,
    reviewerId: manager._id,
    reviewerRoles: ['manager'],
    status: 'documents_verified'
  });

describe('scholarship review workflow — transitions', () => {
  it('lets staff verify documents, then a reviewer move to under_review -> shortlisted and records history', async () => {
    const app = await freshApplication();

    await verifyDocuments(app);

    await scholarshipService.reviewApplication({
      applicationId: app._id,
      reviewerId: reviewer._id,
      reviewerRoles: ['reviewer'],
      status: 'under_review'
    });

    const shortlisted = await scholarshipService.reviewApplication({
      applicationId: app._id,
      reviewerId: reviewer._id,
      reviewerRoles: ['reviewer'],
      status: 'shortlisted',
      decisionNote: 'Strong candidate'
    });

    expect(shortlisted.status).toBe('shortlisted');
    expect(shortlisted.reviewHistory).toHaveLength(3);
    expect(shortlisted.reviewHistory[0]).toMatchObject({ fromStatus: 'submitted', toStatus: 'documents_verified', actorRole: 'manager' });
    expect(shortlisted.reviewHistory[1]).toMatchObject({ fromStatus: 'documents_verified', toStatus: 'under_review', actorRole: 'reviewer' });
    expect(shortlisted.reviewHistory[2]).toMatchObject({ fromStatus: 'under_review', toStatus: 'shortlisted', note: 'Strong candidate' });
    // Verification hands off to reviewers; shortlisting hands off to the admin.
    expect(notificationEvents.notifyScholarshipDocumentsVerified).toHaveBeenCalledTimes(1);
    expect(notificationEvents.notifyScholarshipShortlisted).toHaveBeenCalledTimes(1);
  });

  it('forbids staff from doing academic review (documents_verified -> under_review is reviewer/admin only)', async () => {
    const app = await freshApplication();
    await verifyDocuments(app);

    await expect(
      scholarshipService.reviewApplication({
        applicationId: app._id,
        reviewerId: manager._id,
        reviewerRoles: ['manager'],
        status: 'under_review'
      })
    ).rejects.toThrow(/not permitted/i);

    const untouched = await ScholarshipApplication.findById(app._id);
    expect(untouched.status).toBe('documents_verified');
  });

  it('forbids a reviewer from verifying documents (that is staff work)', async () => {
    const app = await freshApplication();

    await expect(
      scholarshipService.reviewApplication({
        applicationId: app._id,
        reviewerId: reviewer._id,
        reviewerRoles: ['reviewer'],
        status: 'documents_verified'
      })
    ).rejects.toThrow(/not permitted/i);
  });

  it('forbids a reviewer from approving (award is admin only)', async () => {
    const app = await freshApplication();
    app.status = 'shortlisted';
    await app.save();

    await expect(
      scholarshipService.reviewApplication({
        applicationId: app._id,
        reviewerId: reviewer._id,
        reviewerRoles: ['reviewer'],
        status: 'approved'
      })
    ).rejects.toThrow(/not permitted/i);

    const untouched = await ScholarshipApplication.findById(app._id);
    expect(untouched.status).toBe('shortlisted');
  });

  it('forbids staff from approving (award is admin only)', async () => {
    const app = await freshApplication();
    app.status = 'shortlisted';
    await app.save();

    await expect(
      scholarshipService.reviewApplication({
        applicationId: app._id,
        reviewerId: manager._id,
        reviewerRoles: ['manager'],
        status: 'approved'
      })
    ).rejects.toThrow(/not permitted/i);
  });

  it('lets the admin approve a shortlisted application', async () => {
    const app = await freshApplication();
    app.status = 'shortlisted';
    await app.save();

    const approved = await scholarshipService.reviewApplication({
      applicationId: app._id,
      reviewerId: admin._id,
      reviewerRoles: ['admin'],
      status: 'approved',
      decisionNote: 'Congratulations'
    });

    expect(approved.status).toBe('approved');
    expect(notificationEvents.notifyScholarshipDecision).toHaveBeenCalledTimes(1);
    // Applicant notified, but a straight approval is not a shortlist hand-off.
    expect(notificationEvents.notifyScholarshipShortlisted).not.toHaveBeenCalled();
  });

  it('rejects an illegal skip (submitted -> approved)', async () => {
    const app = await freshApplication();

    await expect(
      scholarshipService.reviewApplication({
        applicationId: app._id,
        reviewerId: admin._id,
        reviewerRoles: ['admin'],
        status: 'approved'
      })
    ).rejects.toThrow(/Cannot move/i);
  });

  it('rejects a no-op transition to the same status', async () => {
    const app = await freshApplication();

    await expect(
      scholarshipService.reviewApplication({
        applicationId: app._id,
        reviewerId: manager._id,
        reviewerRoles: ['manager'],
        status: 'submitted'
      })
    ).rejects.toThrow(/already/i);
  });
});

describe('scholarship review workflow — helpers', () => {
  it('resolveActorRole prefers the most privileged review role', () => {
    expect(scholarshipService.resolveActorRole(['reviewer', 'admin'])).toBe('admin');
    // Reviewer outranks manager for labelling, since academic review is the
    // more specific scholarship duty.
    expect(scholarshipService.resolveActorRole(['reviewer', 'manager'])).toBe('reviewer');
    expect(scholarshipService.resolveActorRole(['manager'])).toBe('manager');
    expect(scholarshipService.resolveActorRole(['reviewer'])).toBe('reviewer');
  });

  it('assertTransitionAllowed permits the admin to reopen an approved application', () => {
    expect(() =>
      scholarshipService.assertTransitionAllowed({
        fromStatus: 'approved',
        toStatus: 'under_review',
        actorRoles: ['admin']
      })
    ).not.toThrow();
  });

  it('assertTransitionAllowed forbids staff from reopening an approved application', () => {
    expect(() =>
      scholarshipService.assertTransitionAllowed({
        fromStatus: 'approved',
        toStatus: 'under_review',
        actorRoles: ['manager']
      })
    ).toThrow(/not permitted/i);
  });
});
