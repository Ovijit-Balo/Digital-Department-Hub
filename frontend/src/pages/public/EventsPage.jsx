import { useCallback, useEffect, useMemo, useState } from 'react';
import { eventApi } from '../../api/modules';
import { useAuth } from '../../context/AuthContext';
import useRole from '../../hooks/useRole';
import { getApiErrorMessage } from '../../utils/http';
import { toIsoDate, toLocalDateTime } from '../../utils/localized';

function EventsPage() {
  const { isAuthenticated } = useAuth();
  const canCheckIn = useRole('admin', 'manager');
  const canManageEvents = useRole('admin', 'manager', 'editor');
  const canAccessEventOps = canCheckIn || canManageEvents;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [events, setEvents] = useState([]);
  const [lastRegistration, setLastRegistration] = useState(null);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [registrations, setRegistrations] = useState([]);
  const [calendarItems, setCalendarItems] = useState([]);
  const [calendarRange, setCalendarRange] = useState(() => {
    const start = new Date();
    const end = new Date(start);
    end.setDate(end.getDate() + 30);

    return {
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10)
    };
  });

  const [checkInForm, setCheckInForm] = useState({ eventId: '', qrToken: '' });
  const [feedbackForm, setFeedbackForm] = useState({ rating: 5, comment: '' });
  const [createEventForm, setCreateEventForm] = useState({
    title: '',
    description: '',
    location: '',
    startTime: '',
    endTime: '',
    registrationDeadline: '',
    capacity: 120,
    status: 'published'
  });

  const selectedEvent = useMemo(
    () => events.find((event) => event._id === selectedEventId) || null,
    [events, selectedEventId]
  );

  const calendarSummaryByEvent = useMemo(
    () =>
      new Map(
        calendarItems.map((item) => [
          item._id,
          {
            registrationCount: item.registrationCount,
            checkedInCount: item.checkedInCount,
            availableSeats: item.availableSeats
          }
        ])
      ),
    [calendarItems]
  );

  const dashboardStats = useMemo(() => {
    const totalRegistered = calendarItems.reduce(
      (count, item) => count + Number(item.registrationCount || 0),
      0
    );
    const totalCheckedIn = calendarItems.reduce(
      (count, item) => count + Number(item.checkedInCount || 0),
      0
    );
    const totalOpenSeats = calendarItems.reduce(
      (count, item) => count + Math.max(0, Number(item.availableSeats || 0)),
      0
    );

    return {
      publishedEvents: events.length,
      calendarCount: calendarItems.length,
      totalRegistered,
      totalCheckedIn,
      totalOpenSeats
    };
  }, [calendarItems, events.length]);

  const showSecondaryPanels = Boolean(lastRegistration?.qrCodeDataUrl) || canManageEvents;

  const loadEvents = useCallback(async () => {
    const response = canAccessEventOps
      ? await eventApi.listManageEvents({ limit: 30 })
      : await eventApi.listEvents({ limit: 30 });
    const items = response.data.items || [];
    setEvents(items);

    if (!selectedEventId && items.length) {
      setSelectedEventId(items[0]._id);
      setCheckInForm((prev) => ({ ...prev, eventId: items[0]._id }));
    }
  }, [canAccessEventOps, selectedEventId]);

  const loadRegistrations = useCallback(async () => {
    if (!canCheckIn || !selectedEventId) {
      setRegistrations([]);
      return;
    }

    const response = await eventApi.listRegistrations(selectedEventId, { limit: 50 });
    setRegistrations(response.data.items || []);
  }, [canCheckIn, selectedEventId]);

  const loadCalendar = useCallback(async () => {
    const response = canAccessEventOps
      ? await eventApi.listManageCalendar({
          startDate: calendarRange.startDate,
          endDate: calendarRange.endDate,
          limit: 300
        })
      : await eventApi.listCalendar({
          startDate: calendarRange.startDate,
          endDate: calendarRange.endDate,
          limit: 300
        });

    setCalendarItems(response.data.items || []);
  }, [calendarRange.endDate, calendarRange.startDate, canAccessEventOps]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      await Promise.all([loadEvents(), loadCalendar()]);
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Failed to load events.'));
    } finally {
      setLoading(false);
    }
  }, [loadCalendar, loadEvents]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    loadRegistrations();
  }, [loadRegistrations]);

  const registerForEvent = async (eventId) => {
    setMessage('');

    try {
      const response = await eventApi.register(eventId);
      setLastRegistration(response.data.registration);
      setMessage('Registration completed. QR code generated for check-in.');
      await loadRegistrations();
    } catch (apiError) {
      setMessage(getApiErrorMessage(apiError, 'Failed to register for event.'));
    }
  };

  const submitCheckIn = async (event) => {
    event.preventDefault();
    setMessage('');

    try {
      await eventApi.checkIn(checkInForm);
      setMessage('Check-in completed successfully.');
      setCheckInForm((prev) => ({ ...prev, qrToken: '' }));
      await loadRegistrations();
    } catch (apiError) {
      setMessage(getApiErrorMessage(apiError, 'Check-in failed.'));
    }
  };

  const submitFeedback = async (event) => {
    event.preventDefault();
    setMessage('');

    if (!lastRegistration?._id) {
      setMessage('Register for an event first to submit feedback.');
      return;
    }

    try {
      await eventApi.submitFeedback(lastRegistration._id, {
        rating: Number(feedbackForm.rating),
        comment: feedbackForm.comment
      });
      setMessage('Feedback submitted successfully.');
      setFeedbackForm({ rating: 5, comment: '' });
    } catch (apiError) {
      setMessage(getApiErrorMessage(apiError, 'Feedback submission failed.'));
    }
  };

  const submitEvent = async (event) => {
    event.preventDefault();
    setMessage('');

    try {
      await eventApi.createEvent({
        ...createEventForm,
        startTime: new Date(createEventForm.startTime).toISOString(),
        endTime: new Date(createEventForm.endTime).toISOString(),
        registrationDeadline: new Date(createEventForm.registrationDeadline).toISOString(),
        capacity: Number(createEventForm.capacity)
      });

      setMessage('Event published successfully.');
      setCreateEventForm({
        title: '',
        description: '',
        location: '',
        startTime: '',
        endTime: '',
        registrationDeadline: '',
        capacity: 120,
        status: 'published'
      });
      await Promise.all([loadEvents(), loadCalendar()]);
    } catch (apiError) {
      setMessage(getApiErrorMessage(apiError, 'Failed to create event.'));
    }
  };

  return (
    <section className="page-wrap">
      <header className="page-title-bar">
        <div>
          <p className="eyebrow">Event Programs</p>
          <h1>Events</h1>
          <p className="page-title-subtitle">
            Publish events, track registrations and check-ins, and collect participant feedback with a public calendar.
          </p>
        </div>
        <button type="button" className="btn btn-ghost" onClick={loadData}>
          Refresh
        </button>
      </header>

      <section className="kpi-strip" aria-label="Event summary">
        <article className="kpi-card">
          <p className="kpi-label">Published Events</p>
          <p className="kpi-value">{dashboardStats.publishedEvents}</p>
          <p className="kpi-note">Current visible event records</p>
        </article>
        <article className="kpi-card">
          <p className="kpi-label">Calendar Entries</p>
          <p className="kpi-value">{dashboardStats.calendarCount}</p>
          <p className="kpi-note">In selected date range</p>
        </article>
        <article className="kpi-card">
          <p className="kpi-label">Registrations</p>
          <p className="kpi-value">{dashboardStats.totalRegistered}</p>
          <p className="kpi-note">Across loaded calendar items</p>
        </article>
        <article className="kpi-card">
          <p className="kpi-label">Checked In</p>
          <p className="kpi-value">{dashboardStats.totalCheckedIn}</p>
          <p className="kpi-note">Available seats left: {dashboardStats.totalOpenSeats}</p>
        </article>
      </section>

      {error && <p className="error-text">{error}</p>}
      {message && <p className="meta">{message}</p>}
      {loading && <p>Loading events...</p>}

      <article className="surface-card">
        <div className="section-head section-head-tight">
          <h3>Public Event Calendar</h3>
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
          <button type="submit" className="btn btn-primary">
            Apply Calendar Range
          </button>
        </form>

        {!calendarItems.length && <p>No published events in this date range.</p>}
        {!!calendarItems.length && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Event</th>
                  <th>Location</th>
                  <th>Registered</th>
                  <th>Checked In</th>
                  <th>Available Seats</th>
                </tr>
              </thead>
              <tbody>
                {calendarItems.map((item) => (
                  <tr key={item._id}>
                    <td>{toIsoDate(item.startTime)}</td>
                    <td>{item.title}</td>
                    <td>{item.location}</td>
                    <td>{item.registrationCount}</td>
                    <td>{item.checkedInCount}</td>
                    <td>{item.availableSeats}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>

      <article className="surface-card">
        <div className="section-head section-head-tight">
          <h3>Published Events</h3>
          <p className="meta">Registration and seat insights update from the event calendar.</p>
        </div>
        {!events.length && <p>No events published yet.</p>}
        {!!events.length && (
          <div className="stack-list">
            {events.map((item) => {
              const summary = calendarSummaryByEvent.get(item._id);

              return (
                <article key={item._id} className="surface-card inner-card">
                  <div className="section-head section-head-tight">
                    <h3>{item.title}</h3>
                    <span className={`status-badge status-${item.status}`}>{item.status}</span>
                  </div>
                  <p>{item.description}</p>
                  <p className="meta">
                    {item.location} • {toLocalDateTime(item.startTime)} • Seats: {item.capacity}
                  </p>
                  {summary && (
                    <p className="meta">
                      Registered: {summary.registrationCount} • Checked In: {summary.checkedInCount} •
                      Remaining: {summary.availableSeats}
                    </p>
                  )}
                  <p className="meta">Registration deadline: {toIsoDate(item.registrationDeadline)}</p>

                  {isAuthenticated && item.status === 'published' && (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => registerForEvent(item._id)}
                    >
                      Register for Event
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </article>

      {showSecondaryPanels && (
        <div className="workflow-grid workflow-grid-2">
          {lastRegistration?.qrCodeDataUrl && (
          <article className="surface-card">
            <h3>Your Registration QR</h3>
            <p className="meta">Use this QR token for event check-in.</p>
            <img
              src={lastRegistration.qrCodeDataUrl}
              alt="Event registration QR code"
              className="qr-preview"
            />
            <p className="meta">Token: {lastRegistration.qrToken}</p>

            <form className="form-grid" onSubmit={submitFeedback}>
              <label>
                Feedback Rating
                <select
                  value={feedbackForm.rating}
                  onChange={(event) =>
                    setFeedbackForm((prev) => ({ ...prev, rating: event.target.value }))
                  }
                >
                  <option value="5">5 - Excellent</option>
                  <option value="4">4 - Good</option>
                  <option value="3">3 - Average</option>
                  <option value="2">2 - Needs Improvement</option>
                  <option value="1">1 - Poor</option>
                </select>
              </label>

              <label>
                Comment
                <textarea
                  value={feedbackForm.comment}
                  onChange={(event) =>
                    setFeedbackForm((prev) => ({ ...prev, comment: event.target.value }))
                  }
                />
              </label>

              <button type="submit" className="btn btn-ghost">
                Submit Feedback
              </button>
            </form>
          </article>
          )}

          {canManageEvents && (
            <article className="surface-card">
              <h3>Create Event</h3>
              <form className="form-grid" onSubmit={submitEvent}>
                <label>
                  Title
                  <input
                    value={createEventForm.title}
                    onChange={(event) =>
                      setCreateEventForm((prev) => ({ ...prev, title: event.target.value }))
                    }
                    required
                  />
                </label>

                <label>
                  Location
                  <input
                    value={createEventForm.location}
                    onChange={(event) =>
                      setCreateEventForm((prev) => ({ ...prev, location: event.target.value }))
                    }
                    required
                  />
                </label>

                <label>
                  Description
                  <textarea
                    value={createEventForm.description}
                    minLength={20}
                    onChange={(event) =>
                      setCreateEventForm((prev) => ({ ...prev, description: event.target.value }))
                    }
                    required
                  />
                </label>

                <label>
                  Start Time
                  <input
                    type="datetime-local"
                    value={createEventForm.startTime}
                    onChange={(event) =>
                      setCreateEventForm((prev) => ({ ...prev, startTime: event.target.value }))
                    }
                    required
                  />
                </label>

                <label>
                  End Time
                  <input
                    type="datetime-local"
                    value={createEventForm.endTime}
                    onChange={(event) =>
                      setCreateEventForm((prev) => ({ ...prev, endTime: event.target.value }))
                    }
                    required
                  />
                </label>

                <label>
                  Registration Deadline
                  <input
                    type="datetime-local"
                    value={createEventForm.registrationDeadline}
                    onChange={(event) =>
                      setCreateEventForm((prev) => ({ ...prev, registrationDeadline: event.target.value }))
                    }
                    required
                  />
                </label>

                <label>
                  Capacity
                  <input
                    type="number"
                    min="1"
                    value={createEventForm.capacity}
                    onChange={(event) =>
                      setCreateEventForm((prev) => ({ ...prev, capacity: event.target.value }))
                    }
                    required
                  />
                </label>

                <button type="submit" className="btn btn-primary">
                  Publish Event
                </button>
              </form>
            </article>
          )}
        </div>
      )}

      {canCheckIn && (
        <article className="surface-card">
          <h3>Event Check-in</h3>
          <form className="form-grid" onSubmit={submitCheckIn}>
            <label>
              Event
              <select
                value={checkInForm.eventId}
                onChange={(event) => {
                  setCheckInForm((prev) => ({ ...prev, eventId: event.target.value }));
                  setSelectedEventId(event.target.value);
                }}
                required
              >
                <option value="">Select event</option>
                {events.map((item) => (
                  <option key={item._id} value={item._id}>
                    {item.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              QR Token
              <input
                value={checkInForm.qrToken}
                onChange={(event) =>
                  setCheckInForm((prev) => ({ ...prev, qrToken: event.target.value }))
                }
                required
              />
            </label>

            <button type="submit" className="btn btn-primary">
              Confirm Check-in
            </button>
          </form>

          {!!selectedEvent && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Attendee</th>
                    <th>Status</th>
                    <th>Registered At</th>
                  </tr>
                </thead>
                <tbody>
                  {registrations.map((item) => (
                    <tr key={item._id}>
                      <td>{item.attendee?.fullName || 'Unknown'}</td>
                      <td>{item.status}</td>
                      <td>{toLocalDateTime(item.createdAt)}</td>
                    </tr>
                  ))}
                  {!registrations.length && (
                    <tr>
                      <td colSpan="3">No registrations yet for this event.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </article>
      )}
    </section>
  );
}

export default EventsPage;
