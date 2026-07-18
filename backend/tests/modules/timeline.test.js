// The timeline service aggregates across five models. We mock all of them so
// the merge/sort/urgency logic can be tested without a database.
jest.mock('../../src/modules/scholarship/scholarshipNotice.model');
jest.mock('../../src/modules/scholarship/scholarshipApplication.model');
jest.mock('../../src/modules/event/event.model');
jest.mock('../../src/modules/event/eventRegistration.model');
jest.mock('../../src/modules/booking/venueBooking.model');

const ScholarshipNotice = require('../../src/modules/scholarship/scholarshipNotice.model');
const ScholarshipApplication = require('../../src/modules/scholarship/scholarshipApplication.model');
const Event = require('../../src/modules/event/event.model');
const EventRegistration = require('../../src/modules/event/eventRegistration.model');
const VenueBooking = require('../../src/modules/booking/venueBooking.model');
const timelineService = require('../../src/modules/timeline/timeline.service');

const DAY_MS = 24 * 60 * 60 * 1000;

// Chainable query stub: find().select().lean() / find().populate().lean() all
// resolve to `rows`.
const query = (rows) => {
  const chain = {
    select: () => chain,
    populate: () => chain,
    lean: () => Promise.resolve(rows)
  };
  return chain;
};

describe('timeline.service helpers', () => {
  it('bands urgency by days remaining', () => {
    expect(timelineService.urgencyFor(0)).toBe('urgent');
    expect(timelineService.urgencyFor(3)).toBe('urgent');
    expect(timelineService.urgencyFor(5)).toBe('soon');
    expect(timelineService.urgencyFor(7)).toBe('soon');
    expect(timelineService.urgencyFor(30)).toBe('upcoming');
  });

  it('computes whole days until a future date', () => {
    const now = new Date('2026-01-01T00:00:00Z');
    const inThree = new Date(now.getTime() + 3 * DAY_MS);
    expect(timelineService.daysUntil(inThree, now)).toBe(3);
  });
});

describe('getUserTimeline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('excludes scholarships the student already applied to and sorts soonest-first', async () => {
    const soon = new Date(Date.now() + 2 * DAY_MS);
    const later = new Date(Date.now() + 20 * DAY_MS);

    ScholarshipNotice.find.mockReturnValue(
      query([
        { _id: 'n1', title: { en: 'Merit', bn: '' }, deadline: later },
        { _id: 'n2', title: { en: 'Need-based', bn: '' }, deadline: soon }
      ])
    );
    // Student already applied to n1 -> it must be filtered out.
    ScholarshipApplication.find
      .mockReturnValueOnce(query([{ notice: 'n1' }])) // applied list for deadline filter
      .mockReturnValueOnce(query([])); // decisions

    Event.find.mockReturnValue(query([]));
    EventRegistration.find.mockReturnValue(query([]));
    VenueBooking.find.mockReturnValue(query([]));

    const result = await timelineService.getUserTimeline('student-1');

    const scholarshipItems = result.items.filter((i) => i.category === 'scholarship');
    expect(scholarshipItems).toHaveLength(1);
    expect(scholarshipItems[0].id).toBe('scholarship-deadline-n2');
    expect(scholarshipItems[0].urgency).toBe('urgent');
    expect(scholarshipItems[0].actionable).toBe(true);
  });

  it('orders upcoming items before past decisions', async () => {
    const future = new Date(Date.now() + 5 * DAY_MS);
    const past = new Date(Date.now() - 2 * DAY_MS);

    ScholarshipNotice.find.mockReturnValue(query([]));
    ScholarshipApplication.find
      .mockReturnValueOnce(query([])) // applied list
      .mockReturnValueOnce(
        query([
          {
            _id: 'a1',
            status: 'approved',
            reviewedAt: past,
            notice: { title: { en: 'Merit', bn: '' } },
            decisionNote: 'Congrats'
          }
        ])
      );

    Event.find.mockReturnValue(query([]));
    EventRegistration.find
      .mockReturnValueOnce(
        query([
          { _id: 'r1', event: { title: { en: 'Seminar', bn: '' }, startTime: future, location: 'Hall A' } }
        ])
      )
      .mockReturnValueOnce(query([])); // registered-ids for reg-deadline filter
    VenueBooking.find.mockReturnValue(query([]));

    const result = await timelineService.getUserTimeline('student-1');

    expect(result.items[0].kind).toBe('event_upcoming'); // future first
    expect(result.items[result.items.length - 1].kind).toBe('scholarship_decision'); // past last
  });
});
