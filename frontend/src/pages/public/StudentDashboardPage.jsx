import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { bookingApi, eventApi, notificationApi, scholarshipApi } from '../../api/modules';
import { useAuth } from '../../context/AuthContext';
import useLanguage from '../../hooks/useLanguage';
import { getApiErrorMessage } from '../../utils/http';
import { toIsoDate, toLocalDateTime, toLocalizedText } from '../../utils/localized';

const METRIC_ICONS = {
  openScholarships: (
    <path d="M12 4 3 8.5 12 13l9-4.5L12 4Zm-5 6.7V15c0 1.2 2.2 2.5 5 2.5s5-1.3 5-2.5v-4.3M21 8.5V14" />
  ),
  myApplications: (
    <path d="M7 3h7l4 4v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm7 0v4h4M9 12h6m-6 3.5h6m-6-7h3" />
  ),
  publishedEvents: (
    <path d="M6 4v3m12-3v3M4 9h16M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Zm3 8h3v3H8v-3Z" />
  ),
  activeVenues: (
    <path d="M4 20V6a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v14M4 20h16M15 9h4a1 1 0 0 1 1 1v10M7.5 9h2m-2 3.5h2M7.5 16h2" />
  ),
  notifications: <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6m3.5 9a2.5 2.5 0 0 0 5 0" />
};

function StudentDashboardPage() {
  const { language } = useLanguage();
  const { user } = useAuth();
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
        key: 'openScholarships',
        title: 'Open Scholarships',
        value: snapshot.metrics.openScholarships,
        subtitle: 'Scholarships currently accepting applications'
      },
      {
        key: 'myApplications',
        title: 'My Applications',
        value: snapshot.metrics.myApplications,
        subtitle: 'Applications you have submitted'
      },
      {
        key: 'publishedEvents',
        title: 'Published Events',
        value: snapshot.metrics.publishedEvents,
        subtitle: 'Events available for registration'
      },
      {
        key: 'activeVenues',
        title: 'Bookable Venues',
        value: snapshot.metrics.activeVenues,
        subtitle: 'Venues currently open for booking requests'
      },
      {
        key: 'notifications',
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
      const [
        noticesResponse,
        myApplicationsResponse,
        eventsResponse,
        venuesResponse,
        notificationsResponse
      ] = await Promise.all([
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

  const firstName = (user?.fullName || '').trim().split(' ')[0];

  return (
    <section className="page-wrap dashboard-page">
      <header className="dashboard-header">
        <div className="dashboard-header__intro">
          <p className="dashboard-eyebrow">Student Workspace</p>
          <h1 className="dashboard-title">
            {firstName ? `Welcome back, ${firstName}` : 'Student Dashboard'}
          </h1>
          <p className="dashboard-lead">
            Your personal workspace for scholarships, events, bookings, and service updates.
          </p>
        </div>
        <button type="button" className="btn btn-ghost" onClick={loadDashboard}>
          Refresh
        </button>
      </header>

      {error && <p className="error-text">{error}</p>}
      {loading && <p>Loading dashboard...</p>}

      <div className="dash-metrics">
        {cards.map((card) => (
          <article key={card.title} className="dash-metric">
            <span className="dash-metric__icon" aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {METRIC_ICONS[card.key]}
              </svg>
            </span>
            <p className="dash-metric__label">{card.title}</p>
            <p className="dash-metric__value">{card.value}</p>
            <p className="dash-metric__sub">{card.subtitle}</p>
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
        {!snapshot.myRecentApplications.length && (
          <p>You have not submitted any applications yet.</p>
        )}

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
