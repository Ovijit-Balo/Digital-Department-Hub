const mongoose = require('mongoose');
const { setupMongoTest, cleanupMongoTest } = require('../helpers/mongoTest');
const User = require('../../src/modules/auth/user.model');
const ScholarshipNotice = require('../../src/modules/scholarship/scholarshipNotice.model');
const ScholarshipApplication = require('../../src/modules/scholarship/scholarshipApplication.model');
const scholarshipService = require('../../src/modules/scholarship/scholarship.service');

let mongoServer;
let noticeId;

const isoDaysFromNow = (days) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

beforeAll(async () => {
  mongoServer = await setupMongoTest();

  const admin = await User.create({
    fullName: 'Report Admin',
    email: 'report.admin@example.com',
    passwordHash: 'x'.repeat(60),
    roles: ['admin']
  });

  const student = await User.create({
    fullName: 'Ada Lovelace',
    email: 'ada@example.com',
    passwordHash: 'x'.repeat(60),
    roles: ['student']
  });

  const notice = await ScholarshipNotice.create({
    title: { en: 'Merit Scholarship 2026', bn: 'মেধা বৃত্তি ২০২৬' },
    description: { en: 'For high achievers', bn: 'কৃতিদের জন্য' },
    eligibility: { en: 'CGPA >= 3.5', bn: 'সিজিপিএ >= ৩.৫' },
    deadline: isoDaysFromNow(30),
    applicationWindowStart: isoDaysFromNow(-1),
    applicationWindowEnd: isoDaysFromNow(20),
    createdBy: admin._id
  });
  noticeId = notice._id;

  await ScholarshipApplication.create({
    notice: notice._id,
    student: student._id,
    statement: 'I am applying because I meet all the eligibility criteria for this award.',
    gpa: 3.9,
    department: 'CSE',
    status: 'approved',
    awardedAmount: 50000
  });

  const student2 = await User.create({
    fullName: 'Alan Turing',
    email: 'alan@example.com',
    passwordHash: 'x'.repeat(60),
    roles: ['student']
  });

  await ScholarshipApplication.create({
    notice: notice._id,
    student: student2._id,
    statement: 'Please consider my application for this scholarship opportunity this year.',
    gpa: 3.7,
    department: 'CSE',
    status: 'submitted'
  });
});

afterAll(async () => {
  await cleanupMongoTest(mongoServer);
});

describe('Scholarship reporting (DB-backed, in-memory Mongo)', () => {
  it('exports applications as CSV with the applicant rows', async () => {
    const csv = await scholarshipService.exportApplicationsCsv({ noticeId });

    expect(csv).toContain('studentName');
    expect(csv).toContain('Ada Lovelace');
    expect(csv).toContain('Alan Turing');
  });

  it('exports applications as a real PDF buffer', async () => {
    const { buffer, filename } = await scholarshipService.exportApplicationsPdf({ noticeId });

    expect(Buffer.isBuffer(buffer)).toBe(true);
    // A valid PDF file always starts with the "%PDF" magic bytes.
    expect(buffer.slice(0, 4).toString()).toBe('%PDF');
    expect(filename).toContain(String(noticeId));
  });

  it('honours the status filter when exporting', async () => {
    const csv = await scholarshipService.exportApplicationsCsv({ noticeId, status: 'approved' });

    expect(csv).toContain('Ada Lovelace');
    expect(csv).not.toContain('Alan Turing');
  });

  it('aggregates application counts by status', async () => {
    const stats = await scholarshipService.getApplicationStatusStats({ noticeId: String(noticeId) });

    expect(stats.total).toBe(2);
    expect(stats.byStatus.approved).toBe(1);
    expect(stats.byStatus.submitted).toBe(1);
    expect(stats.pending).toBe(1);
  });

  it('scopes stats by notice id via ObjectId casting', async () => {
    const otherNoticeStats = await scholarshipService.getApplicationStatusStats({
      noticeId: String(new mongoose.Types.ObjectId())
    });

    expect(otherNoticeStats.total).toBe(0);
  });
});
