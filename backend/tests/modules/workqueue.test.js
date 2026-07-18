jest.mock('../../src/modules/booking/venueBooking.model');
jest.mock('../../src/modules/contact/contactInquiry.model');
jest.mock('../../src/modules/scholarship/scholarshipApplication.model');

const VenueBooking = require('../../src/modules/booking/venueBooking.model');
const ContactInquiry = require('../../src/modules/contact/contactInquiry.model');
const ScholarshipApplication = require('../../src/modules/scholarship/scholarshipApplication.model');
const workqueueService = require('../../src/modules/workqueue/workqueue.service');

const HOUR_MS = 60 * 60 * 1000;

// Chainable query stub whose terminal .lean() resolves to `rows`.
const query = (rows) => {
  const chain = {
    sort: () => chain,
    limit: () => chain,
    populate: () => chain,
    lean: () => Promise.resolve(rows)
  };
  return chain;
};

const hoursAgo = (h) => new Date(Date.now() - h * HOUR_MS);

describe('workqueue.severityFor', () => {
  it('bands a booking by age against its SLA thresholds', () => {
    expect(workqueueService.severityFor('booking', 1 * HOUR_MS)).toBe('normal');
    expect(workqueueService.severityFor('booking', 30 * HOUR_MS)).toBe('warning');
    expect(workqueueService.severityFor('booking', 80 * HOUR_MS)).toBe('overdue');
  });

  it('uses tighter thresholds for inquiries than scholarships', () => {
    // 24h: inquiry is already warning, scholarship still normal.
    expect(workqueueService.severityFor('inquiry', 24 * HOUR_MS)).toBe('warning');
    expect(workqueueService.severityFor('scholarship', 24 * HOUR_MS)).toBe('normal');
  });
});

describe('getStaffWorkQueue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('merges all three sources and sorts overdue-first then oldest-first', async () => {
    VenueBooking.find.mockReturnValue(
      query([
        {
          _id: 'b1',
          title: 'Lab session',
          status: 'pending',
          venue: { _id: 'v1', name: 'Lab A' },
          requester: { fullName: 'Dr Rahman' },
          createdAt: hoursAgo(80) // overdue (>72h)
        }
      ])
    );
    ContactInquiry.find.mockReturnValue(
      query([
        {
          _id: 'i1',
          subject: 'Admission query',
          name: 'Karim',
          email: 'karim@x.com',
          status: 'new',
          createdAt: hoursAgo(2) // normal
        }
      ])
    );
    ScholarshipApplication.find.mockReturnValue(
      query([
        {
          _id: 's1',
          status: 'submitted',
          notice: { _id: 'n1', title: { en: 'Merit', bn: '' } },
          student: { fullName: 'Nadia' },
          createdAt: hoursAgo(20) // normal (scholarship warning is 48h)
        }
      ])
    );

    const { items, summary } = await workqueueService.getStaffWorkQueue();

    expect(summary.total).toBe(3);
    expect(summary.overdue).toBe(1);
    expect(summary.byKind).toEqual({ booking: 1, inquiry: 1, scholarship: 1 });

    // Overdue booking must sort first.
    expect(items[0].kind).toBe('booking');
    expect(items[0].severity).toBe('overdue');

    // Remaining two are 'normal'; the older one (scholarship, 20h) precedes the
    // newer inquiry (2h).
    expect(items[1].kind).toBe('scholarship');
    expect(items[2].kind).toBe('inquiry');
  });

  it('returns an empty queue when nothing is pending', async () => {
    VenueBooking.find.mockReturnValue(query([]));
    ContactInquiry.find.mockReturnValue(query([]));
    ScholarshipApplication.find.mockReturnValue(query([]));

    const { items, summary } = await workqueueService.getStaffWorkQueue();

    expect(items).toHaveLength(0);
    expect(summary.total).toBe(0);
    expect(summary.overdue).toBe(0);
  });
});
