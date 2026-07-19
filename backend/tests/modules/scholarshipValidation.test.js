const scholarshipValidation = require('../../src/modules/scholarship/scholarship.validation');

const VALID_NOTICE_ID = 'a'.repeat(24);

// Regression guard: the export status filter was missing `documents_verified`
// (and `needs_info`), so exporting a report filtered by those stages returned a
// 400 even though the pipeline produces them. These tests hit the Joi schema
// directly — the service-level tests bypass validation and never caught it.
describe('exportApplications validation — status filter', () => {
  const ALL_APPLICATION_STATUSES = [
    'submitted',
    'needs_info',
    'documents_verified',
    'under_review',
    'shortlisted',
    'approved',
    'rejected'
  ];

  it.each(ALL_APPLICATION_STATUSES)('accepts the %s status filter', (status) => {
    const { error } = scholarshipValidation.exportApplications.query.validate({
      noticeId: VALID_NOTICE_ID,
      status
    });

    expect(error).toBeUndefined();
  });

  it('accepts an export with no status filter', () => {
    const { error } = scholarshipValidation.exportApplications.query.validate({
      noticeId: VALID_NOTICE_ID
    });

    expect(error).toBeUndefined();
  });

  it('rejects an unknown status filter', () => {
    const { error } = scholarshipValidation.exportApplications.query.validate({
      noticeId: VALID_NOTICE_ID,
      status: 'not_a_status'
    });

    expect(error).toBeDefined();
  });

  it('requires a notice id', () => {
    const { error } = scholarshipValidation.exportApplications.query.validate({
      status: 'documents_verified'
    });

    expect(error).toBeDefined();
  });
});

// The list endpoints (staff queue + applicant "my applications") share the same
// full status set. Guard that documents_verified is accepted there too.
describe('listApplications / listMyApplications validation — status filter', () => {
  it('accepts documents_verified for the review queue', () => {
    const { error } = scholarshipValidation.listApplications.query.validate({
      noticeId: VALID_NOTICE_ID,
      status: 'documents_verified'
    });

    expect(error).toBeUndefined();
  });

  it('accepts needs_info for the applicant list', () => {
    const { error } = scholarshipValidation.listMyApplications.query.validate({
      status: 'needs_info'
    });

    expect(error).toBeUndefined();
  });
});
