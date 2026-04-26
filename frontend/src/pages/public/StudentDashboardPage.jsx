import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { bookingApi, eventApi, notificationApi, scholarshipApi } from '../../api/modules';
import useLanguage from '../../hooks/useLanguage';
import { getApiErrorMessage } from '../../utils/http';
import { toIsoDate, toLocalDateTime, toLocalizedText } from '../../utils/localized';

function StudentDashboardPage() {
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [snapshot, setSnapshot] = useState({
    metrics: {
      openScholarships: 0,
      myApplications: 0,
      publishedEvents: 0,
      activeVenues: 0,
      notifications: 0
    },
    openNotices: [],
    upcomingEvents: [],
    myRecentApplications: [],
    recentNotifications: []
  });

  const cards = useMemo(
    () => [
      {
        title: 'Open Scholarships',
        value: snapshot.metrics.openScholarships,
        subtitle: 'Scholarships currently accepting applications'
      },
      {
        title: 'My Applications',
        value: snapshot.metrics.myApplications,
        subtitle: 'Applications you have submitted'
      },
      {
        title: 'Published Events',
        value: snapshot.metrics.publishedEvents,
        subtitle: 'Events available for registration'
      },
      {
        title: 'Bookable Venues',
        value: snapshot.metrics.activeVenues,
        subtitle: 'Venues currently open for booking requests'
      },
      {
        title: 'Notifications',
        value: snapshot.metrics.notifications,
        subtitle: 'Recent alerts and service updates'
      }
    ],
    [snapshot.metrics]
  );

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [noticesResponse, myApplicationsResponse, eventsResponse, venuesResponse, notificationsResponse] =
        await Promise.all([
          scholarshipApi.listNotices({ status: 'open', page: 1, limit: 4 }),
          scholarshipApi.listMyApplications({ page: 1, limit: 6 }),
          eventApi.listEvents({ status: 'published', page: 1, limit: 4 }),
          bookingApi.listVenues({ isActive: true, page: 1, limit: 4 }),
          notificationApi.listNotifications({ page: 1, limit: 6 })
        ]);

      setSnapshot({
        metrics: {
          openScholarships: noticesResponse.data.total || 0,
          myApplications: myApplicationsResponse.data.total || 0,
          publishedEvents: eventsResponse.data.total || 0,
          activeVenues: venuesResponse.data.total || 0,
          notifications: notificationsResponse.data.total || 0
        },
        openNotices: noticesResponse.data.items || [],
        upcomingEvents: eventsResponse.data.items || [],
        myRecentApplications: myApplicationsResponse.data.items || [],
        recentNotifications: notificationsResponse.data.items || []
      });
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Failed to load student dashboard.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  return (
    <section className="page-wrap">
      <div className="section-head">
        <h1>Student Dashboard</h1>
        <button type="button" className="btn btn-ghost" onClick={loadDashboard}>
          Refresh
        </button>
      </div>

      <p className="meta">
        Your personal workspace for scholarships, events, bookings, and service updates.
      </p>

      {error && <p className="error-text">{error}</p>}
      {loading && <p>Loading dashboard...</p>}

      <div className="feature-grid">
        {cards.map((card) => (
          <article key={card.title} className="feature-card">
            <p className="meta">{card.title}</p>
            <h2>{card.value}</h2>
            <p>{card.subtitle}</p>
          </article>
        ))}
      </div>

      <article className="surface-card">
        <h3>Quick Actions</h3>
        <div className="action-row">
          <Link to="/scholarship" className="btn btn-primary">
            Open Scholarship Desk
          </Link>
          <Link to="/events" className="btn btn-primary">
            Open Event Desk
          </Link>
          <Link to="/booking" className="btn btn-primary">
            Open Venue Booking
          </Link>
          <Link to="/contact" className="btn btn-primary">
            Open Contact Desk
          </Link>
        </div>
      </article>

      <article className="surface-card">
        <h3>Open Scholarship Notices</h3>
        {!snapshot.openNotices.length && <p>No open scholarship notices right now.</p>}

        <div className="stack-list">
          {snapshot.openNotices.map((notice) => (
            <article key={notice._id} className="surface-card inner-card">
              <h4>{toLocalizedText(notice.title, language)}</h4>
              <p>{toLocalizedText(notice.description, language)}</p>
              <p className="meta">Deadline: {toIsoDate(notice.deadline)}</p>
            </article>
          ))}
        </div>
      </article>

      <article className="surface-card">
        <h3>My Recent Applications</h3>
        {!snapshot.myRecentApplications.length && <p>You have not submitted any applications yet.</p>}

        {!!snapshot.myRecentApplications.length && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Notice</th>
                  <th>Status</th>
                  <th>Submitted</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.myRecentApplications.map((item) => (
                  <tr key={item._id}>
                    <td>{toLocalizedText(item.notice?.title, language)}</td>
                    <td>
                      <span className={`status-badge status-${item.status}`}>{item.status}</span>
                    </td>
                    <td>{toIsoDate(item.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>

      <article className="surface-card">
        <h3>Upcoming Events</h3>
        {!snapshot.upcomingEvents.length && <p>No published events available currently.</p>}

        <div className="stack-list">
          {snapshot.upcomingEvents.map((eventItem) => (
            <article key={eventItem._id} className="surface-card inner-card">
              <h4>{eventItem.title}</h4>
              <p>{eventItem.description}</p>
              <p className="meta">
                {toLocalDateTime(eventItem.startTime)} • {eventItem.location}
              </p>
            </article>
          ))}
        </div>
      </article>

      <article className="surface-card">
        <h3>Recent Notifications</h3>
        {!snapshot.recentNotifications.length && <p>No notifications found.</p>}

        <div className="stack-list">
          {snapshot.recentNotifications.map((item) => (
            <article key={item._id} className="surface-card inner-card">
              <h4>{item.subject || 'Notification'}</h4>
              <p>{item.message}</p>
              <p className="meta">
                {toLocalDateTime(item.createdAt)} • {item.readAt ? 'Read' : 'Unread'}
              </p>
            </article>
          ))}
        </div>
      </article>
    </section>
  );
}

export default StudentDashboardPage;
