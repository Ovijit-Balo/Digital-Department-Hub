import { useCallback, useEffect, useMemo, useState } from 'react';
import { bookingApi } from '../../api/modules';
import { useAuth } from '../../context/AuthContext';
import useRole from '../../hooks/useRole';
import { getApiErrorMessage } from '../../utils/http';
import { toLocalDateTime } from '../../utils/localized';

function BookingPage() {
  const { user, isAuthenticated } = useAuth();
  const canApprove = useRole('admin', 'manager');
  const canCheckConflicts = useRole('admin', 'manager', 'editor');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [venues, setVenues] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [myBookings, setMyBookings] = useState([]);
  const [calendarItems, setCalendarItems] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [calendarRange, setCalendarRange] = useState(() => {
    const start = new Date();
    const end = new Date(start);
    end.setDate(end.getDate() + 14);

    return {
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
      venue: '',
      bookingType: ''
    };
  });

  const [bookingForm, setBookingForm] = useState({
    venue: '',
    title: '',
    purpose: '',
    bookingType: 'event',
    classCode: '',
    startTime: '',
    endTime: '',
    attendeeCount: 30
  });

  const [venueForm, setVenueForm] = useState({
    name: '',
    location: '',
    capacity: 120,
    amenities: ''
  });

  const selectedVenue = useMemo(
    () => venues.find((venue) => venue._id === bookingForm.venue) || null,
    [venues, bookingForm.venue]
  );

  const dashboardStats = useMemo(
    () => ({
      activeVenues: venues.length,
      calendarEntries: calendarItems.length,
      myRequests: isAuthenticated ? myBookings.length : 0,
      pendingApprovals: canApprove ? bookings.length : 0
    }),
    [bookings.length, calendarItems.length, canApprove, isAuthenticated, myBookings.length, venues.length]
  );

  const loadVenues = useCallback(async () => {
    const response = await bookingApi.listVenues({ isActive: true, limit: 50 });
    const items = response.data.items || [];
    setVenues(items);
    if (!bookingForm.venue && items.length) {
      setBookingForm((prev) => ({ ...prev, venue: items[0]._id }));
    }
  }, [bookingForm.venue]);

  const loadBookings = useCallback(async () => {
    if (!canApprove) {
      setBookings([]);
      return;
    }

    const response = await bookingApi.listBookings({ limit: 50, status: 'pending' });
    setBookings(response.data.items || []);
  }, [canApprove]);

  const loadMyBookings = useCallback(async () => {
    if (!isAuthenticated) {
      setMyBookings([]);
      return;
    }

    const response = await bookingApi.listMyBookings({ limit: 50 });
    setMyBookings(response.data.items || []);
  }, [isAuthenticated]);

  const loadCalendar = useCallback(async () => {
    const response = await bookingApi.listCalendar({
      startDate: calendarRange.startDate,
      endDate: calendarRange.endDate,
      venue: calendarRange.venue || undefined,
      bookingType: calendarRange.bookingType || undefined,
      limit: 300
    });

    setCalendarItems(response.data.items || []);
  }, [calendarRange.bookingType, calendarRange.endDate, calendarRange.startDate, calendarRange.venue]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      await Promise.all([loadVenues(), loadBookings(), loadMyBookings(), loadCalendar()]);
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Failed to load booking data.'));
    } finally {
      setLoading(false);
    }
  }, [loadBookings, loadCalendar, loadMyBookings, loadVenues]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const submitBooking = async (event) => {
    event.preventDefault();
    setMessage('');

    const startTime = new Date(bookingForm.startTime);
    const endTime = new Date(bookingForm.endTime);

    if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
      setMessage('Select valid start and end times before submitting.');
      return;
    }

    if (endTime <= startTime) {
      setMessage('End time must be later than start time.');
      return;
    }

    try {
      await bookingApi.requestBooking({
        ...bookingForm,
        bookingType: bookingForm.bookingType,
        classCode: bookingForm.bookingType === 'class' ? bookingForm.classCode : undefined,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        attendeeCount: Number(bookingForm.attendeeCount)
      });

      setMessage('Booking request submitted successfully.');
      setBookingForm((prev) => ({
        ...prev,
        title: '',
        purpose: '',
        classCode: '',
        startTime: '',
        endTime: '',
        attendeeCount: 30
      }));
      await Promise.all([loadBookings(), loadMyBookings(), loadCalendar()]);
    } catch (apiError) {
      setMessage(getApiErrorMessage(apiError, 'Failed to submit booking request.'));
    }
  };

  const createVenue = async (event) => {
    event.preventDefault();
    setMessage('');

    try {
      await bookingApi.createVenue({
        ...venueForm,
        manager: user.id,
        capacity: Number(venueForm.capacity),
        amenities: venueForm.amenities
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
      });
      setMessage('Venue created successfully.');
      setVenueForm({ name: '', location: '', capacity: 120, amenities: '' });
      await Promise.all([loadVenues(), loadCalendar()]);
    } catch (apiError) {
      setMessage(getApiErrorMessage(apiError, 'Failed to create venue.'));
    }
  };

  const runConflictCheck = async () => {
    if (!bookingForm.venue || !bookingForm.startTime || !bookingForm.endTime) {
      setMessage('Select venue and time range before conflict check.');
      return;
    }

    const startTime = new Date(bookingForm.startTime);
    const endTime = new Date(bookingForm.endTime);

    if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
      setMessage('Select valid start and end times before conflict check.');
      return;
    }

    if (endTime <= startTime) {
      setMessage('End time must be later than start time.');
      return;
    }

    try {
      const response = await bookingApi.checkConflicts({
        venueId: bookingForm.venue,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString()
      });

      setConflicts(response.data.conflicts || []);
      setMessage(response.data.hasConflict ? 'Conflicts found.' : 'No conflicts in this time window.');
    } catch (apiError) {
      setMessage(getApiErrorMessage(apiError, 'Failed to check conflicts.'));
    }
  };

  const reviewBooking = async (bookingId, status) => {
    const decisionNote = window.prompt('Decision note (optional):', '') || '';

    try {
      await bookingApi.reviewBooking(bookingId, { status, decisionNote });
      setMessage(`Booking ${status}.`);
      await Promise.all([loadBookings(), loadMyBookings(), loadCalendar()]);
    } catch (apiError) {
      setMessage(getApiErrorMessage(apiError, 'Failed to update booking decision.'));
    }
  };

  return (
    <section className="page-wrap">
      <header className="page-title-bar">
        <div>
          <p className="eyebrow">Space Scheduling</p>
          <h1>Venue Booking</h1>
          <p className="page-title-subtitle">
            Coordinate class, lab, and event requests with calendar visibility, conflict checks, and approval workflow.
          </p>
        </div>
        <button type="button" className="btn btn-ghost" onClick={loadData}>
          Refresh
        </button>
      </header>

      <section className="kpi-strip" aria-label="Booking summary">
        <article className="kpi-card">
          <p className="kpi-label">Active Venues</p>
          <p className="kpi-value">{dashboardStats.activeVenues}</p>
          <p className="kpi-note">Available for requests</p>
        </article>
        <article className="kpi-card">
          <p className="kpi-label">Calendar Entries</p>
          <p className="kpi-value">{dashboardStats.calendarEntries}</p>
          <p className="kpi-note">Approved in selected window</p>
        </article>
        <article className="kpi-card">
          <p className="kpi-label">My Requests</p>
          <p className="kpi-value">{dashboardStats.myRequests}</p>
          <p className="kpi-note">Visible when signed in</p>
        </article>
        <article className="kpi-card">
          <p className="kpi-label">Pending Approvals</p>
          <p className="kpi-value">{dashboardStats.pendingApprovals}</p>
          <p className="kpi-note">Manager queue load</p>
        </article>
      </section>

      {error && <p className="error-text">{error}</p>}
      {message && <p className="meta">{message}</p>}
      {loading && <p>Loading venues and booking queue...</p>}

      <div className="workflow-grid workflow-grid-2">
        <article className="surface-card">
          <div className="section-head section-head-tight">
            <h3>Booking Calendar (Class / Event / Lab)</h3>
            <button type="button" className="btn btn-ghost" onClick={loadCalendar}>
              Refresh Calendar
            </button>
          </div>

          <form
            className="form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              loadCalendar();
            }}
          >
            <label>
              Start Date
              <input
                type="date"
                value={calendarRange.startDate}
                onChange={(event) =>
                  setCalendarRange((prev) => ({ ...prev, startDate: event.target.value }))
                }
                required
              />
            </label>
            <label>
              End Date
              <input
                type="date"
                value={calendarRange.endDate}
                onChange={(event) =>
                  setCalendarRange((prev) => ({ ...prev, endDate: event.target.value }))
                }
                required
              />
            </label>
            <label>
              Venue
              <select
                value={calendarRange.venue}
                onChange={(event) =>
                  setCalendarRange((prev) => ({ ...prev, venue: event.target.value }))
                }
              >
                <option value="">All venues</option>
                {venues.map((venue) => (
                  <option key={venue._id} value={venue._id}>
                    {venue.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Type
              <select
                value={calendarRange.bookingType}
                onChange={(event) =>
                  setCalendarRange((prev) => ({ ...prev, bookingType: event.target.value }))
                }
              >
                <option value="">All types</option>
                <option value="class">Class</option>
                <option value="event">Event</option>
                <option value="lab">Lab</option>
                <option value="other">Other</option>
              </select>
            </label>
            <button type="submit" className="btn btn-primary">
              Apply Filters
            </button>
          </form>

          {!calendarItems.length && <p>No approved bookings in this range.</p>}
          {!!calendarItems.length && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Venue</th>
                    <th>Type</th>
                    <th>Title</th>
                    <th>Class Code</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {calendarItems.map((item) => (
                    <tr key={item._id}>
                      <td>{toLocalDateTime(item.startTime)}</td>
                      <td>{item.venue?.name || 'Unknown'}</td>
                      <td>{item.bookingType || 'event'}</td>
                      <td>{item.title}</td>
                      <td>{item.classCode || '-'}</td>
                      <td>
                        {toLocalDateTime(item.startTime)} - {toLocalDateTime(item.endTime)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>

        <article className="surface-card">
          <h3>Available Venues</h3>
          {!venues.length && <p>No venues available yet.</p>}
          <div className="stack-list">
            {venues.map((venue) => (
              <article key={venue._id} className="surface-card inner-card">
                <h3>{venue.name}</h3>
                <p>{venue.location}</p>
                <p className="meta">
                  Capacity: {venue.capacity} • Manager: {venue.manager?.fullName || 'Unassigned'}
                </p>
              </article>
            ))}
          </div>
        </article>
      </div>

      {isAuthenticated && (
        <div className="workflow-grid workflow-grid-2">
          <article className="surface-card">
            <h3>Request Booking</h3>
            <form className="form-grid" onSubmit={submitBooking}>
              <label>
                Venue
                <select
                  value={bookingForm.venue}
                  onChange={(event) =>
                    setBookingForm((prev) => ({ ...prev, venue: event.target.value }))
                  }
                  required
                >
                  <option value="">Select venue</option>
                  {venues.map((venue) => (
                    <option key={venue._id} value={venue._id}>
                      {venue.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Booking Title
                <input
                  value={bookingForm.title}
                  onChange={(event) =>
                    setBookingForm((prev) => ({ ...prev, title: event.target.value }))
                  }
                  minLength={3}
                  required
                />
              </label>

              <label>
                Purpose
                <textarea
                  value={bookingForm.purpose}
                  onChange={(event) =>
                    setBookingForm((prev) => ({ ...prev, purpose: event.target.value }))
                  }
                  minLength={20}
                  required
                />
              </label>

              <label>
                Booking Type
                <select
                  value={bookingForm.bookingType}
                  onChange={(event) =>
                    setBookingForm((prev) => ({ ...prev, bookingType: event.target.value }))
                  }
                  required
                >
                  <option value="event">Event</option>
                  <option value="class">Class</option>
                  <option value="lab">Lab</option>
                  <option value="other">Other</option>
                </select>
              </label>

              {bookingForm.bookingType === 'class' && (
                <label>
                  Class Code
                  <input
                    value={bookingForm.classCode}
                    onChange={(event) =>
                      setBookingForm((prev) => ({ ...prev, classCode: event.target.value }))
                    }
                    placeholder="CSE-301"
                    required
                  />
                </label>
              )}

              <label>
                Start Time
                <input
                  type="datetime-local"
                  value={bookingForm.startTime}
                  onChange={(event) => {
                    const nextStartTime = event.target.value;

                    setBookingForm((prev) => {
                      if (!prev.endTime) {
                        return { ...prev, startTime: nextStartTime };
                      }

                      const parsedStart = new Date(nextStartTime);
                      const parsedEnd = new Date(prev.endTime);
                      const shouldResetEnd =
                        !Number.isNaN(parsedStart.getTime()) &&
                        !Number.isNaN(parsedEnd.getTime()) &&
                        parsedEnd <= parsedStart;

                      return {
                        ...prev,
                        startTime: nextStartTime,
                        endTime: shouldResetEnd ? '' : prev.endTime
                      };
                    });
                  }}
                  required
                />
              </label>

              <label>
                End Time
                <input
                  type="datetime-local"
                  min={bookingForm.startTime || undefined}
                  value={bookingForm.endTime}
                  onChange={(event) =>
                    setBookingForm((prev) => ({ ...prev, endTime: event.target.value }))
                  }
                  required
                />
              </label>

              <label>
                Attendee Count
                <input
                  type="number"
                  min="1"
                  max={selectedVenue?.capacity || 100000}
                  value={bookingForm.attendeeCount}
                  onChange={(event) =>
                    setBookingForm((prev) => ({ ...prev, attendeeCount: event.target.value }))
                  }
                  required
                />
              </label>

              <button type="submit" className="btn btn-primary">
                Submit Booking Request
              </button>

              {canCheckConflicts && (
                <button type="button" className="btn btn-ghost" onClick={runConflictCheck}>
                  Check Conflict Window
                </button>
              )}
            </form>

            {!!conflicts.length && (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Status</th>
                      <th>Start</th>
                      <th>End</th>
                    </tr>
                  </thead>
                  <tbody>
                    {conflicts.map((item) => (
                      <tr key={item._id}>
                        <td>{item.title}</td>
                        <td>{item.status}</td>
                        <td>{toLocalDateTime(item.startTime)}</td>
                        <td>{toLocalDateTime(item.endTime)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>

          <article className="surface-card">
            <h3>My Booking Requests</h3>
            {!myBookings.length && <p>No booking requests found for your account.</p>}
            {!!myBookings.length && (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Venue</th>
                      <th>Type</th>
                      <th>Class Code</th>
                      <th>Window</th>
                      <th>Status</th>
                      <th>Decision Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myBookings.map((item) => (
                      <tr key={item._id}>
                        <td>{item.venue?.name || 'Unknown'}</td>
                        <td>{item.bookingType || 'event'}</td>
                        <td>{item.classCode || '-'}</td>
                        <td>
                          {toLocalDateTime(item.startTime)} - {toLocalDateTime(item.endTime)}
                        </td>
                        <td>
                          <span className={`status-badge status-${item.status}`}>{item.status}</span>
                        </td>
                        <td>{item.decisionNote || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>
        </div>
      )}

      {canApprove && (
        <div className="workflow-grid workflow-grid-2">
          <article className="surface-card">
            <h3>Create Venue</h3>
            <form className="form-grid" onSubmit={createVenue}>
              <label>
                Venue Name
                <input
                  value={venueForm.name}
                  onChange={(event) =>
                    setVenueForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                  required
                />
              </label>
              <label>
                Location
                <input
                  value={venueForm.location}
                  onChange={(event) =>
                    setVenueForm((prev) => ({ ...prev, location: event.target.value }))
                  }
                  required
                />
              </label>
              <label>
                Capacity
                <input
                  type="number"
                  min="1"
                  value={venueForm.capacity}
                  onChange={(event) =>
                    setVenueForm((prev) => ({ ...prev, capacity: event.target.value }))
                  }
                  required
                />
              </label>
              <label>
                Amenities (comma separated)
                <input
                  value={venueForm.amenities}
                  onChange={(event) =>
                    setVenueForm((prev) => ({ ...prev, amenities: event.target.value }))
                  }
                />
              </label>

              <button type="submit" className="btn btn-primary">
                Add Venue
              </button>
            </form>
          </article>

          <article className="surface-card">
            <h3>Approval Queue</h3>
            {!bookings.length && <p>No pending requests currently.</p>}
            {!!bookings.length && (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Venue</th>
                      <th>Requester</th>
                      <th>Type</th>
                      <th>Class</th>
                      <th>Window</th>
                      <th>Attendees</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((item) => (
                      <tr key={item._id}>
                        <td>{item.venue?.name || 'Unknown'}</td>
                        <td>{item.requester?.fullName || 'Unknown'}</td>
                        <td>{item.bookingType || 'event'}</td>
                        <td>{item.classCode || '-'}</td>
                        <td>
                          {toLocalDateTime(item.startTime)} - {toLocalDateTime(item.endTime)}
                        </td>
                        <td>{item.attendeeCount}</td>
                        <td>
                          <div className="inline-actions">
                            <button
                              type="button"
                              className="btn btn-ghost"
                              onClick={() => reviewBooking(item._id, 'approved')}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost"
                              onClick={() => reviewBooking(item._id, 'rejected')}
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>
        </div>
      )}
    </section>
  );
}

export default BookingPage;
