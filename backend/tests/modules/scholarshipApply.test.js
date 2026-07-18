// Notification hooks touch User + the notification service; stub them so these
// tests focus on how applications persist applicant-supplied data.
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

const daysFromNow = (days) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

let mongoServer;
let student;
let noticeId;

beforeAll(async () => {
  mongoServer = await setupMongoTest();

  student = await User.create({
    fullName: 'Sam Student',
    email: 'apply-stu@example.com',
    passwordHash: 'x'.repeat(60),
    roles: ['student']
  });

  const notice = await ScholarshipNotice.create({
    title: { en: 'Merit Award', bn: 'মেধা বৃত্তি' },
    description: { en: 'x', bn: 'x' },
    eligibility: { en: 'x', bn: 'x' },
    status: 'open',
    deadline: daysFromNow(30),
    applicationWindowStart: daysFromNow(-1),
    applicationWindowEnd: daysFromNow(20),
    createdBy: student._id
  });
  noticeId = notice._id;
});

afterAll(async () => {
  await cleanupMongoTest(mongoServer);
});

beforeEach(async () => {
  await ScholarshipApplication.deleteMany({});
});

const basePayload = {
  statement: 'I meet all the eligibility criteria for this scholarship award program.',
  gpa: 3.8,
  department: 'CSE'
};

describe('applyForScholarship — supporting documents', () => {
  it('persists the name + url documents the applicant attaches', async () => {
    const application = await scholarshipService.applyForScholarship({
      noticeId,
      userId: student._id,
      payload: {
        ...basePayload,
        documents: [
          { name: 'Academic Transcript', url: 'https://drive.example.com/transcript' },
          { name: 'Income Certificate', url: 'https://drive.example.com/income' }
        ]
      }
    });

    const stored = await ScholarshipApplication.findById(application._id).lean();
    expect(stored.documents).toHaveLength(2);
    expect(stored.documents[0]).toMatchObject({
      name: 'Academic Transcript',
      url: 'https://drive.example.com/transcript'
    });
    expect(stored.documents[1].url).toBe('https://drive.example.com/income');
  });

  it('defaults to an empty documents array when none are attached', async () => {
    const application = await scholarshipService.applyForScholarship({
      noticeId,
      userId: student._id,
      payload: { ...basePayload }
    });

    const stored = await ScholarshipApplication.findById(application._id).lean();
    expect(stored.documents).toEqual([]);
  });
});

describe('applyForScholarship — documentsRequired enforcement', () => {
  let requiredNoticeId;

  beforeAll(async () => {
    const notice = await ScholarshipNotice.create({
      title: { en: 'Need-Based Grant', bn: 'প্রয়োজনভিত্তিক অনুদান' },
      description: { en: 'x', bn: 'x' },
      eligibility: { en: 'x', bn: 'x' },
      status: 'open',
      documentsRequired: true,
      deadline: daysFromNow(30),
      applicationWindowStart: daysFromNow(-1),
      applicationWindowEnd: daysFromNow(20),
      createdBy: student._id
    });
    requiredNoticeId = notice._id;
  });

  it('rejects an application with no documents when the notice requires them', async () => {
    await expect(
      scholarshipService.applyForScholarship({
        noticeId: requiredNoticeId,
        userId: student._id,
        payload: { ...basePayload }
      })
    ).rejects.toMatchObject({ statusCode: 400 });

    const count = await ScholarshipApplication.countDocuments({ notice: requiredNoticeId });
    expect(count).toBe(0);
  });

  it('accepts an application that includes a document when required', async () => {
    const application = await scholarshipService.applyForScholarship({
      noticeId: requiredNoticeId,
      userId: student._id,
      payload: {
        ...basePayload,
        documents: [{ name: 'Income Certificate', url: 'https://drive.example.com/income' }]
      }
    });

    expect(application.documents).toHaveLength(1);
  });
});

describe('applyForScholarship — minimum GPA gate', () => {
  let gpaNoticeId;

  beforeAll(async () => {
    const notice = await ScholarshipNotice.create({
      title: { en: 'High Achiever', bn: 'উচ্চ অর্জনকারী' },
      description: { en: 'x', bn: 'x' },
      eligibility: { en: 'x', bn: 'x' },
      status: 'open',
      minimumGpa: 3.5,
      deadline: daysFromNow(30),
      applicationWindowStart: daysFromNow(-1),
      applicationWindowEnd: daysFromNow(20),
      createdBy: student._id
    });
    gpaNoticeId = notice._id;
  });

  it('rejects an application below the minimum GPA', async () => {
    await expect(
      scholarshipService.applyForScholarship({
        noticeId: gpaNoticeId,
        userId: student._id,
        payload: { ...basePayload, gpa: 3.0 }
      })
    ).rejects.toMatchObject({ statusCode: 400 });

    const count = await ScholarshipApplication.countDocuments({ notice: gpaNoticeId });
    expect(count).toBe(0);
  });

  it('accepts an application meeting the minimum GPA', async () => {
    const application = await scholarshipService.applyForScholarship({
      noticeId: gpaNoticeId,
      userId: student._id,
      payload: { ...basePayload, gpa: 3.6 }
    });

    expect(application.gpa).toBe(3.6);
  });
});

describe('applicant self-service — edit, resubmit, withdraw', () => {
  const makeApplication = () =>
    scholarshipService.applyForScholarship({
      noticeId,
      userId: student._id,
      payload: { ...basePayload }
    });

  it('lets a student edit their own still-submitted application', async () => {
    const created = await makeApplication();

    const updated = await scholarshipService.updateOwnApplication({
      applicationId: created._id,
      studentId: student._id,
      payload: { department: 'EEE', gpa: 3.9 }
    });

    expect(updated.department).toBe('EEE');
    expect(updated.gpa).toBe(3.9);
    expect(updated.status).toBe('submitted');
  });

  it('forbids editing someone else’s application', async () => {
    const created = await makeApplication();
    const other = await User.create({
      fullName: 'Other Student',
      email: `other-${Date.now()}@example.com`,
      passwordHash: 'x'.repeat(60),
      roles: ['student']
    });

    await expect(
      scholarshipService.updateOwnApplication({
        applicationId: created._id,
        studentId: other._id,
        payload: { department: 'EEE' }
      })
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('resubmits a returned (needs_info) application back to submitted', async () => {
    const created = await makeApplication();
    created.status = 'needs_info';
    await created.save();

    const updated = await scholarshipService.updateOwnApplication({
      applicationId: created._id,
      studentId: student._id,
      payload: { statement: 'Updated statement that comfortably exceeds the minimum length.' }
    });

    expect(updated.status).toBe('submitted');
    expect(updated.reviewHistory.at(-1)).toMatchObject({
      fromStatus: 'needs_info',
      toStatus: 'submitted'
    });
  });

  it('blocks editing once the application is under review', async () => {
    const created = await makeApplication();
    created.status = 'under_review';
    await created.save();

    await expect(
      scholarshipService.updateOwnApplication({
        applicationId: created._id,
        studentId: student._id,
        payload: { department: 'EEE' }
      })
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('withdraws a pending application and frees the slot to reapply', async () => {
    const created = await makeApplication();

    await scholarshipService.withdrawOwnApplication({
      applicationId: created._id,
      studentId: student._id
    });

    const count = await ScholarshipApplication.countDocuments({ _id: created._id });
    expect(count).toBe(0);

    // Unique (notice, student) index is freed, so a fresh apply succeeds.
    const reapplied = await makeApplication();
    expect(reapplied._id).toBeDefined();
  });

  it('blocks withdrawing once the application is under review', async () => {
    const created = await makeApplication();
    created.status = 'documents_verified';
    await created.save();

    await expect(
      scholarshipService.withdrawOwnApplication({
        applicationId: created._id,
        studentId: student._id
      })
    ).rejects.toMatchObject({ statusCode: 409 });
  });
});

describe('generateAwardLetter', () => {
  it('produces a PDF for an approved application owned by the student', async () => {
    const created = await scholarshipService.applyForScholarship({
      noticeId,
      userId: student._id,
      payload: { ...basePayload }
    });
    created.status = 'approved';
    created.awardedAmount = 25000;
    created.reviewedAt = new Date();
    await created.save();

    const { buffer, filename } = await scholarshipService.generateAwardLetter({
      applicationId: created._id,
      requesterId: student._id,
      requesterRoles: ['student']
    });

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(500);
    expect(buffer.slice(0, 4).toString()).toBe('%PDF');
    expect(filename).toContain(created._id.toString());
  });

  it('refuses an award letter for a non-approved application', async () => {
    const created = await scholarshipService.applyForScholarship({
      noticeId,
      userId: student._id,
      payload: { ...basePayload }
    });

    await expect(
      scholarshipService.generateAwardLetter({
        applicationId: created._id,
        requesterId: student._id,
        requesterRoles: ['student']
      })
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});
