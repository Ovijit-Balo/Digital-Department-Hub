import { useCallback, useEffect, useMemo, useState } from 'react';
import { eventApi } from '../../api/modules';
import SkeletonCard from '../../components/common/SkeletonCard';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import useRole from '../../hooks/useRole';
import useLanguage from '../../hooks/useLanguage';
import { ui } from '../../i18n/publicUi';
import { getApiErrorMessage } from '../../utils/http';
import { toIsoDate, toLocalDateTime } from '../../utils/localized';

function EventsPage() {
  const { language } = useLanguage();
  const { isAuthenticated } = useAuth();
  const { success, error: toastError } = useToast();
  const canCheckIn = useRole('admin', 'manager');
  const canManageEvents = useRole('admin', 'manager', 'editor');
  const canAccessEventOps = canCheckIn || canManageEvents;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [viewType, setViewType] = useState('list'); // 'list' | 'grid'
  const [expandedEventId, setExpandedEventId] = useState(null);
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);

  const [events, setEvents] = useState([]);
  const [lastRegistration, setLastRegistration] = useState(null);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [registrations, setRegistrations] = useState([]);
  const [calendarItems, setCalendarItems] = useState([]);
  function getDefaultCalendarRange() {
    const start = new Date();
    const end = new Date(start);
    end.setDate(end.getDate() + 30);

    return {
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10)
    };
  }

  const [calendarRange, setCalendarRange] = useState(getDefaultCalendarRange);

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

  const calendarSummaryByEvent = useMemo(() => {
    const map = new Map();
    for (const item of calendarItems) {
      const payload = {
        registrationCount: item.registrationCount,
        checkedInCount: item.checkedInCount,
        availableSeats: item.availableSeats
      };
      map.set(item._id, payload);
      map.set(String(item._id), payload);
    }
    return map;
  }, [calendarItems]);

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

  // Prefill create/edit form when an event is selected for manage
  useEffect(() => {
    if (selectedEvent) {
      const toInput = (iso) => (iso ? new Date(iso).toISOString().slice(0, 16) : '');
      setCreateEventForm({
        title: selectedEvent.title || '',
        description: selectedEvent.description || '',
        location: selectedEvent.location || '',
        startTime: toInput(selectedEvent.startTime),
        endTime: toInput(selectedEvent.endTime),
        registrationDeadline: toInput(selectedEvent.registrationDeadline),
        capacity: selectedEvent.capacity || 120,
        status: selectedEvent.status || 'published'
      });
    }
  }, [selectedEvent]);

  useEffect(() => {
    loadRegistrations();
  }, [loadRegistrations]);

  const registerForEvent = async (eventId) => {
    setMessage('');

    try {
      const response = await eventApi.register(eventId);
      setLastRegistration(response.data.registration);
      setMessage('Registration completed. QR code generated for check-in.');
      success('Registration completed. QR code generated for check-in.', {
        title: 'Event registered'
      });
      await Promise.all([loadRegistrations(), loadCalendar()]);
    } catch (apiError) {
      const nextMessage = getApiErrorMessage(apiError, 'Failed to register for event.');
      setMessage(nextMessage);
      toastError(nextMessage, { title: 'Registration failed' });
    }
  };

  const submitCheckIn = async (event) => {
    event.preventDefault();
    setMessage('');

    try {
      await eventApi.checkIn(checkInForm);
      setMessage('Check-in completed successfully.');
      success('Check-in completed successfully.', { title: 'Attendee checked in' });
      setCheckInForm((prev) => ({ ...prev, qrToken: '' }));
      await Promise.all([loadRegistrations(), loadCalendar()]);
    } catch (apiError) {
      const nextMessage = getApiErrorMessage(apiError, 'Check-in failed.');
      setMessage(nextMessage);
      toastError(nextMessage, { title: 'Check-in failed' });
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
      success('Feedback submitted successfully.', { title: 'Feedback saved' });
      setFeedbackForm({ rating: 5, comment: '' });
    } catch (apiError) {
      const nextMessage = getApiErrorMessage(apiError, 'Feedback submission failed.');
      setMessage(nextMessage);
      toastError(nextMessage, { title: 'Feedback failed' });
    }
  };

  const submitEvent = async (event) => {
    event.preventDefault();
    setMessage('');

    try {
      if (selectedEventId) {
        await eventApi.updateEvent(selectedEventId, {
          ...createEventForm,
          startTime: new Date(createEventForm.startTime).toISOString(),
          endTime: new Date(createEventForm.endTime).toISOString(),
          registrationDeadline: new Date(createEventForm.registrationDeadline).toISOString(),
          capacity: Number(createEventForm.capacity)
        });

        setMessage('Event updated successfully.');
        success('Event updated successfully.', { title: 'Event updated' });
        // clear edit state
        setSelectedEventId('');
      } else {
        await eventApi.createEvent({
          ...createEventForm,
          startTime: new Date(createEventForm.startTime).toISOString(),
          endTime: new Date(createEventForm.endTime).toISOString(),
          registrationDeadline: new Date(createEventForm.registrationDeadline).toISOString(),
          capacity: Number(createEventForm.capacity)
        });

        setMessage('Event published successfully.');
        success('Event published successfully.', { title: 'Event created' });
      }

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
      const nextMessage = getApiErrorMessage(apiError, 'Failed to create/update event.');
      setMessage(nextMessage);
      toastError(nextMessage, { title: 'Event save failed' });
    }
  };

  function formatTimeOnly(value) {
    if (!value) return '-';
    try {
      const d = new Date(value);
      return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    } catch {
      return toLocalDateTime(value);
    }
  }

  function toggleExpand(id) {
    setExpandedEventId((prev) => (prev === id ? null : id));
  }

  return (
    <section className="page-wrap">
      <header className="page-title-bar">
        <div>
          <p className="eyebrow">{ui('events', 'eyebrow', language)}</p>
          <h1>{ui('events', 'title', language)}</h1>
          <p className="page-title-subtitle">{ui('events', 'subtitle', language)}</p>
        </div>
        <button type="button" className="btn btn-ghost" onClick={loadData}>
          {ui('events', 'refresh', language)}
        </button>
      </header>

      <section className="kpi-strip event-kpis" aria-label="Event summary">
        <article className="kpi-card kpi-small">
          <div className="kpi-icon" aria-hidden>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/></svg>
          </div>
          <p className="kpi-label">Published Events</p>
          <p className="kpi-value">{dashboardStats.publishedEvents}</p>
          <p className="kpi-note">Current visible event records</p>
        </article>
        <article className="kpi-card kpi-small">
          <div className="kpi-icon" aria-hidden>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><path d="M8 7h8M8 12h8M8 17h8"/></svg>
          </div>
          <p className="kpi-label">Calendar Entries</p>
          <p className="kpi-value">{dashboardStats.calendarCount}</p>
          <p className="kpi-note">In selected date range</p>
        </article>
        <article className="kpi-card kpi-small">
          <div className="kpi-icon" aria-hidden>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
          </div>
          <p className="kpi-label">Registrations</p>
          <p className="kpi-value">{dashboardStats.totalRegistered}</p>
          <p className="kpi-note">Across loaded calendar items</p>
        </article>
        <article className="kpi-card kpi-small">
          <div className="kpi-icon" aria-hidden>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
          </div>
          <p className="kpi-label">Checked In</p>
          <p className="kpi-value">{dashboardStats.totalCheckedIn}</p>
          <p className="kpi-note">Available seats left: {dashboardStats.totalOpenSeats}</p>
        </article>
      </section>

      {error && <p className="error-text">{error}</p>}
      {message && <p className="meta">{message}</p>}
      {loading && (
        <div className="feature-grid">
          <SkeletonCard showMedia lines={3} />
          <SkeletonCard showMedia lines={3} />
          <SkeletonCard showMedia lines={3} />
        </div>
      )}

      <article className="surface-card">
        <div className="section-head section-head-tight">
          <div>
            <p className="eyebrow">EVENT PROGRAMS</p>
            <h3>Public Event Calendar</h3>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button type="button" className="icon-button" onClick={loadCalendar} aria-label="Refresh calendar">
              ⟳
            </button>
            <div className="view-toggle" role="tablist" aria-label="View toggle">
              <button type="button" className={`icon-button ${viewType === 'list' ? 'is-active' : ''}`} onClick={() => setViewType('list')} aria-pressed={viewType==='list'}>≡</button>
              <button type="button" className={`icon-button ${viewType === 'grid' ? 'is-active' : ''}`} onClick={() => setViewType('grid')} aria-pressed={viewType==='grid'}>▦</button>
            </div>
          </div>
        </div>

        <div className="date-filter" style={{ position: 'relative' }}>
          <label className="date-filter__label">Filter by date range</label>
          <div className="date-filter__controls">
            <button type="button" className="icon-button" onClick={() => setDatePopoverOpen((s) => !s)} aria-expanded={datePopoverOpen} aria-haspopup="dialog" aria-controls="date-popover">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/></svg>
            </button>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <div style={{ color: 'var(--muted)', fontSize: '13px' }}>{calendarRange.startDate} — {calendarRange.endDate}</div>
            </div>
          </div>

          {datePopoverOpen && (
            <div id="date-popover" role="dialog" className="date-popover">
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input type="date" value={calendarRange.startDate} onChange={(event) => setCalendarRange((prev) => ({ ...prev, startDate: event.target.value }))} required />
                <input type="date" value={calendarRange.endDate} onChange={(event) => setCalendarRange((prev) => ({ ...prev, endDate: event.target.value }))} required />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.6rem' }}>
                <button type="button" className="btn btn-primary" onClick={() => { setDatePopoverOpen(false); loadCalendar(); }}>Apply</button>
                <button type="button" className="btn btn-ghost" onClick={() => { setCalendarRange(getDefaultCalendarRange()); setDatePopoverOpen(false); }}>Reset</button>
              </div>
            </div>
          )}
        </div>

        {!calendarItems.length && (
          <div className="empty-state empty-state--center" style={{ padding: '1.6rem', marginTop: '0.8rem' }}>
            <div className="empty-state__icon" style={{ fontSize: '36px' }}>📆</div>
            <h4 className="empty-state__title">No events in this range</h4>
            <p className="empty-state__text">Try adjusting the date range above.</p>
          </div>
        )}
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
          <h3>Published Events <span className="count-badge">{events.length} events</span></h3>
          <p className="meta">Registration and seat insights update from the event calendar.</p>
        </div>

        {!events.length && !loading && <p className="meta">No events published yet.</p>}

        {!!events.length && (() => {
          const now = Date.now();
          const upcoming = [];
          const past = [];

          for (const item of events) {
            const endTime = item.endTime || item.startTime || item.createdAt;
            const isPast = endTime ? new Date(endTime).getTime() < now : false;
            if (isPast) past.push(item); else upcoming.push(item);
          }

          upcoming.sort((a, b) => (new Date(a.startTime || a.createdAt).getTime() - new Date(b.startTime || b.createdAt).getTime()));
          past.sort((a, b) => (new Date(b.startTime || b.createdAt).getTime() - new Date(a.startTime || a.createdAt).getTime()));

          return (
            <div className={`events-list ${viewType === 'grid' ? 'events-grid' : 'events-list-vertical'}`}>
              {upcoming.length > 0 && (
                <section className="events-group">
                  <div className="events-group__label">Upcoming</div>
                  <div className="events-group__items">
                    {upcoming.map((item) => {
                      const summary = calendarSummaryByEvent.get(item._id);
                      const deadlinePassed = item.registrationDeadline && new Date(item.registrationDeadline).getTime() < Date.now();
                      const isFull = typeof summary?.availableSeats === 'number' && summary.availableSeats <= 0;
                      const isJustRegistered = lastRegistration?.event === item._id;
                      const canRegister = isAuthenticated && item.status === 'published' && !deadlinePassed && !isFull && !isJustRegistered;

                      return (
                        <article key={item._id} className={`event-card ${item.status === 'published' ? 'event--upcoming' : ''}`}>
                          <button type="button" className="event-card__body" onClick={() => toggleExpand(item._id)}>
                            <div className="event-card__date">
                              <div className="event-card__month">{new Date(item.startTime).toLocaleString(undefined, { month: 'short' }).toUpperCase()}</div>
                              <div className="event-card__day">{new Date(item.startTime).getDate()}</div>
                            </div>

                            <div className="event-card__content">
                              <div className="event-card__title">{item.title}</div>
                              <div className="event-card__desc">{item.description}</div>
                              <div className="event-card__meta">
                                <span className="meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 6-9 12-9 12S3 16 3 10a9 9 0 1 1 18 0z"/><circle cx="12" cy="10" r="2"/></svg>{item.location}</span>
                                <span className="meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="8"/><path d="M12 6v6l4 2"/></svg>{formatTimeOnly(item.startTime)}</span>
                                <span className="meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M7 21h10"/><path d="M12 3v18"/></svg>{item.capacity} seats</span>
                              </div>
                            </div>

                            <div className="event-card__controls">
                              <span className={`status-badge ${deadlinePassed ? 'status-deadline' : 'status-open'}`}>{deadlinePassed ? 'Deadline passed' : 'Upcoming'}</span>
                              <button type="button" className="icon-button" aria-label="View details">›</button>
                            </div>
                          </button>

                          {expandedEventId === item._id && (
                            <div className="event-card__expanded">
                              <p className="meta">{item.description}</p>
                              <p className="meta">{item.location} • {new Date(item.startTime).toLocaleDateString()} • {formatTimeOnly(item.startTime)}</p>
                              {summary ? (
                                <p className="meta">Registered: {summary.registrationCount} • Checked in: {summary.checkedInCount} • Remaining: {summary.availableSeats}</p>
                              ) : null}
                              <div style={{ marginTop: '0.6rem', display: 'flex', gap: '0.5rem' }}>
                                {isAuthenticated && item.status === 'published' && (
                                  <button type="button" className="btn btn-primary" onClick={() => registerForEvent(item._id)} disabled={!canRegister}>Register</button>
                                )}
                                {canManageEvents && <button type="button" className="btn btn-ghost" onClick={() => setSelectedEventId(item._id)}>Manage</button>}
                              </div>
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </div>
                </section>
              )}

              {past.length > 0 && (
                <section className="events-group">
                  <div className="events-group__label">Past</div>
                  <div className="events-group__items">
                    {past.map((item) => {
                      const summary = calendarSummaryByEvent.get(item._id);
                      return (
                        <article key={item._id} className="event-card event--past">
                          <button type="button" className="event-card__body" onClick={() => toggleExpand(item._id)}>
                            <div className="event-card__date">
                              <div className="event-card__month">{new Date(item.startTime).toLocaleString(undefined, { month: 'short' }).toUpperCase()}</div>
                              <div className="event-card__day">{new Date(item.startTime).getDate()}</div>
                            </div>

                            <div className="event-card__content">
                              <div className="event-card__title">{item.title}</div>
                              <div className="event-card__desc">{item.description}</div>
                              <div className="event-card__meta">
                                <span className="meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 6-9 12-9 12S3 16 3 10a9 9 0 1 1 18 0z"/><circle cx="12" cy="10" r="2"/></svg>{item.location}</span>
                                <span className="meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="8"/><path d="M12 6v6l4 2"/></svg>{formatTimeOnly(item.startTime)}</span>
                                <span className="meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M7 21h10"/><path d="M12 3v18"/></svg>{item.capacity} seats</span>
                              </div>
                            </div>

                            <div className="event-card__controls">
                              <span className="status-badge status-closed">Past</span>
                              <button type="button" className="icon-button" aria-label="View details">›</button>
                            </div>
                          </button>

                          {expandedEventId === item._id && (
                            <div className="event-card__expanded">
                              <p className="meta">{item.description}</p>
                              <p className="meta">{item.location} • {new Date(item.startTime).toLocaleDateString()} • {formatTimeOnly(item.startTime)}</p>
                              {summary ? (
                                <p className="meta">Registered: {summary.registrationCount} • Checked in: {summary.checkedInCount} • Remaining: {summary.availableSeats}</p>
                              ) : null}
                            </div>
                          )}
                        </article>
                      );
                    })}

                    {past.length > 6 && (
                      <div style={{ marginTop: '0.6rem' }}>
                        <button type="button" className="btn btn-ghost" style={{ width: '100%' }}>Show more past events ↓</button>
                      </div>
                    )}
                  </div>
                </section>
              )}
            </div>
          );
        })()}
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
              <h3>{selectedEventId ? 'Edit Event' : 'Create Event'}</h3>
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
                      setCreateEventForm((prev) => ({
                        ...prev,
                        registrationDeadline: event.target.value
                      }))
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

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button type="submit" className="btn btn-primary">
                    {selectedEventId ? 'Update Event' : 'Publish Event'}
                  </button>
                  {selectedEventId && (
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => {
                        setSelectedEventId('');
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
                      }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
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
