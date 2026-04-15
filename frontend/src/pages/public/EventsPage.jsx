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

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [events, setEvents] = useState([]);
  const [lastRegistration, setLastRegistration] = useState(null);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [registrations, setRegistrations] = useState([]);

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

  const loadEvents = useCallback(async () => {
    const response = await eventApi.listEvents({ limit: 30 });
    const items = response.data.items || [];
    setEvents(items);

    if (!selectedEventId && items.length) {
      setSelectedEventId(items[0]._id);
      setCheckInForm((prev) => ({ ...prev, eventId: items[0]._id }));
    }
  }, [selectedEventId]);

  const loadRegistrations = useCallback(async () => {
    if (!canCheckIn || !selectedEventId) {
      setRegistrations([]);
      return;
    }

    const response = await eventApi.listRegistrations(selectedEventId, { limit: 50 });
    setRegistrations(response.data.items || []);
  }, [canCheckIn, selectedEventId]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      await loadEvents();
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Failed to load events.'));
    } finally {
      setLoading(false);
    }
  }, [loadEvents]);

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
      await loadEvents();
    } catch (apiError) {
      setMessage(getApiErrorMessage(apiError, 'Failed to create event.'));
    }
  };

  return (
    <section className="page-wrap">
      <div className="section-head">
        <h1>Events</h1>
        <button type="button" className="btn btn-ghost" onClick={loadData}>
          Refresh
        </button>
      </div>

      {error && <p className="error-text">{error}</p>}
      {message && <p className="meta">{message}</p>}
      {loading && <p>Loading events...</p>}

      <div className="stack-list">
        {events.map((item) => (
          <article key={item._id} className="surface-card">
            <div className="section-head section-head-tight">
              <h3>{item.title}</h3>
              <span className={`status-badge status-${item.status}`}>{item.status}</span>
            </div>
            <p>{item.description}</p>
            <p className="meta">
              {item.location} • {toLocalDateTime(item.startTime)} • Seats: {item.capacity}
            </p>
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
        ))}
      </div>

      {lastRegistration?.qrCodeDataUrl && (
        <article className="surface-card">
          <h3>Your Registration QR</h3>
          <p className="meta">Use this QR token for event check-in.</p>
          <img src={lastRegistration.qrCodeDataUrl} alt="Event registration QR code" className="qr-preview" />
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
