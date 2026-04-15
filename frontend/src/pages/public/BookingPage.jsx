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
  const [conflicts, setConflicts] = useState([]);

  const [bookingForm, setBookingForm] = useState({
    venue: '',
    title: '',
    purpose: '',
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

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      await Promise.all([loadVenues(), loadBookings()]);
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Failed to load booking data.'));
    } finally {
      setLoading(false);
    }
  }, [loadBookings, loadVenues]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const submitBooking = async (event) => {
    event.preventDefault();
    setMessage('');

    try {
      await bookingApi.requestBooking({
        ...bookingForm,
        startTime: new Date(bookingForm.startTime).toISOString(),
        endTime: new Date(bookingForm.endTime).toISOString(),
        attendeeCount: Number(bookingForm.attendeeCount)
      });

      setMessage('Booking request submitted successfully.');
      setBookingForm((prev) => ({
        ...prev,
        title: '',
        purpose: '',
        startTime: '',
        endTime: '',
        attendeeCount: 30
      }));
      await loadBookings();
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
      await loadVenues();
    } catch (apiError) {
      setMessage(getApiErrorMessage(apiError, 'Failed to create venue.'));
    }
  };

  const runConflictCheck = async () => {
    if (!bookingForm.venue || !bookingForm.startTime || !bookingForm.endTime) {
      setMessage('Select venue and time range before conflict check.');
      return;
    }

    try {
      const response = await bookingApi.checkConflicts({
        venueId: bookingForm.venue,
        startTime: new Date(bookingForm.startTime).toISOString(),
        endTime: new Date(bookingForm.endTime).toISOString()
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
      await loadBookings();
    } catch (apiError) {
      setMessage(getApiErrorMessage(apiError, 'Failed to update booking decision.'));
    }
  };

  return (
    <section className="page-wrap">
      <div className="section-head">
        <h1>Venue Booking</h1>
        <button type="button" className="btn btn-ghost" onClick={loadData}>
          Refresh
        </button>
      </div>

      {error && <p className="error-text">{error}</p>}
      {message && <p className="meta">{message}</p>}
      {loading && <p>Loading venues and booking queue...</p>}

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

      {isAuthenticated && (
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
              Start Time
              <input
                type="datetime-local"
                value={bookingForm.startTime}
                onChange={(event) =>
                  setBookingForm((prev) => ({ ...prev, startTime: event.target.value }))
                }
                required
              />
            </label>

            <label>
              End Time
              <input
                type="datetime-local"
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
      )}

      {canApprove && (
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
      )}

      {canApprove && (
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
      )}
    </section>
  );
}

export default BookingPage;
