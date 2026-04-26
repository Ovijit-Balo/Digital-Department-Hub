import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { bookingApi, contactApi, notificationApi, scholarshipApi } from '../../api/modules';
import { getApiErrorMessage } from '../../utils/http';
import { toLocalDateTime } from '../../utils/localized';

function StaffDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [snapshot, setSnapshot] = useState({
    metrics: {
      pendingBookings: 0,
      newInquiries: 0,
      submittedScholarships: 0,
      queuedNotifications: 0
    },
    pendingBookings: [],
    newInquiries: []
  });

  const cards = useMemo(
    () => [
      {
        title: 'Pending Bookings',
        value: snapshot.metrics.pendingBookings,
        subtitle: 'Venue requests waiting for staff decision'
      },
      {
        title: 'New Inquiries',
        value: snapshot.metrics.newInquiries,
        subtitle: 'Contact form submissions requiring attention'
      },
      {
        title: 'Scholarship Submissions',
        value: snapshot.metrics.submittedScholarships,
        subtitle: 'Applications currently in submitted state'
      },
      {
        title: 'Queued Notifications',
        value: snapshot.metrics.queuedNotifications,
        subtitle: 'Dispatch items still awaiting delivery'
      }
    ],
    [snapshot.metrics]
  );

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [bookingsResponse, inquiriesResponse, scholarshipResponse, notificationsResponse] =
        await Promise.all([
          bookingApi.listBookings({ status: 'pending', page: 1, limit: 5 }),
          contactApi.listInquiries({ status: 'new', page: 1, limit: 5 }),
          scholarshipApi.listApplications({ status: 'submitted', page: 1, limit: 1 }),
          notificationApi.listNotifications({ status: 'queued', page: 1, limit: 1 })
        ]);

      setSnapshot({
        metrics: {
          pendingBookings: bookingsResponse.data.total || 0,
          newInquiries: inquiriesResponse.data.total || 0,
          submittedScholarships: scholarshipResponse.data.total || 0,
          queuedNotifications: notificationsResponse.data.total || 0
        },
        pendingBookings: bookingsResponse.data.items || [],
        newInquiries: inquiriesResponse.data.items || []
      });
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Failed to load staff dashboard.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  return (
    <section>
      <div className="section-head">
        <h1>Staff Dashboard</h1>
        <button type="button" className="btn btn-ghost" onClick={loadDashboard}>
          Refresh
        </button>
      </div>

      <p className="meta">
        Operational workspace for daily service desk responsibilities and departmental response queues.
      </p>

      {error && <p className="error-text">{error}</p>}
      {loading && <p>Loading staff workspace...</p>}

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
        <h3>Staff Quick Actions</h3>
        <div className="action-row">
          <Link to="/booking" className="btn btn-primary">
            Open Venue Desk
          </Link>
          <Link to="/contact" className="btn btn-primary">
            Open Contact Desk
          </Link>
          <Link to="/scholarship" className="btn btn-primary">
            Open Scholarship Desk
          </Link>
          <Link to="/admin/notifications" className="btn btn-primary">
            Open Notification Center
          </Link>
        </div>
      </article>

      <article className="surface-card">
        <h3>Pending Booking Queue</h3>
        {!snapshot.pendingBookings.length && <p>No pending venue requests.</p>}

        {!!snapshot.pendingBookings.length && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Venue</th>
                  <th>Requester</th>
                  <th>Window</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.pendingBookings.map((item) => (
                  <tr key={item._id}>
                    <td>{item.venue?.name || 'Unknown'}</td>
                    <td>{item.requester?.fullName || 'Unknown'}</td>
                    <td>
                      {toLocalDateTime(item.startTime)} - {toLocalDateTime(item.endTime)}
                    </td>
                    <td>
                      <span className={`status-badge status-${item.status}`}>{item.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>

      <article className="surface-card">
        <h3>New Inquiry Queue</h3>
        {!snapshot.newInquiries.length && <p>No new inquiries at the moment.</p>}

        {!!snapshot.newInquiries.length && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Sender</th>
                  <th>Subject</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.newInquiries.map((item) => (
                  <tr key={item._id}>
                    <td>
                      <strong>{item.name}</strong>
                      <br />
                      <span className="meta">{item.email}</span>
                    </td>
                    <td>{item.subject}</td>
                    <td>{toLocalDateTime(item.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </section>
  );
}

export default StaffDashboardPage;
