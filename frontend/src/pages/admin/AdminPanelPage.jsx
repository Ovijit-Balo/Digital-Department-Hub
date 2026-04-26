import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  auditApi,
  bookingApi,
  cmsApi,
  contactApi,
  eventApi,
  notificationApi,
  scholarshipApi
} from '../../api/modules';
import useRole from '../../hooks/useRole';
import { getApiErrorMessage } from '../../utils/http';
import { toLocalDateTime } from '../../utils/localized';

function AdminPanelPage() {
  const canManageBookings = useRole('admin', 'manager');
  const canManageInquiries = useRole('admin', 'manager', 'editor');
  const canReviewScholarships = useRole('admin', 'manager');
  const canViewAudits = useRole('admin', 'manager');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [snapshot, setSnapshot] = useState({
    metrics: {
      publishedNews: 0,
      featuredBlogs: 0,
      openScholarships: 0,
      scholarshipReviews: 0,
      publishedEvents: 0,
      pendingBookings: 0,
      newInquiries: 0,
      notifications: 0,
      auditEntries: 0
    },
    pendingBookings: [],
    inquiryQueue: [],
    recentAudits: []
  });

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [
        newsResponse,
        blogsResponse,
        scholarshipResponse,
        scholarshipReviewResponse,
        eventsResponse,
        bookingResponse,
        inquiryResponse,
        notificationResponse,
        auditResponse
      ] = await Promise.all([
        cmsApi.listNews({ status: 'published', page: 1, limit: 1 }),
        cmsApi.listBlogs({ status: 'published', page: 1, limit: 1 }),
        scholarshipApi.listNotices({ status: 'open', page: 1, limit: 1 }),
        canReviewScholarships
          ? scholarshipApi.listApplications({ status: 'submitted', page: 1, limit: 1 })
          : Promise.resolve({ data: { items: [], total: 0 } }),
        eventApi.listEvents({ status: 'published', page: 1, limit: 1 }),
        canManageBookings
          ? bookingApi.listBookings({ status: 'pending', page: 1, limit: 8 })
          : Promise.resolve({ data: { items: [], total: 0 } }),
        canManageInquiries
          ? contactApi.listInquiries({ status: 'new', page: 1, limit: 8 })
          : Promise.resolve({ data: { items: [], total: 0 } }),
        notificationApi.listNotifications({ page: 1, limit: 1 }),
        canViewAudits
          ? auditApi.listLogs({ page: 1, limit: 8 })
          : Promise.resolve({ data: { items: [], total: 0 } })
      ]);

      setSnapshot({
        metrics: {
          publishedNews: newsResponse.data.total || 0,
          featuredBlogs: blogsResponse.data.total || 0,
          openScholarships: scholarshipResponse.data.total || 0,
          scholarshipReviews: scholarshipReviewResponse.data.total || 0,
          publishedEvents: eventsResponse.data.total || 0,
          pendingBookings: bookingResponse.data.total || 0,
          newInquiries: inquiryResponse.data.total || 0,
          notifications: notificationResponse.data.total || 0,
          auditEntries: auditResponse.data.total || 0
        },
        pendingBookings: bookingResponse.data.items || [],
        inquiryQueue: inquiryResponse.data.items || [],
        recentAudits: auditResponse.data.items || []
      });
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Failed to load admin dashboard metrics.'));
    } finally {
      setLoading(false);
    }
  }, [canManageBookings, canManageInquiries, canReviewScholarships, canViewAudits]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const reviewBooking = async (bookingId, status) => {
    const decisionNote = window.prompt('Decision note (optional):', '') || '';

    try {
      await bookingApi.reviewBooking(bookingId, {
        status,
        decisionNote
      });
      setMessage(`Booking ${status} successfully.`);
      await loadDashboard();
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Failed to update booking request.'));
    }
  };

  const updateInquiryStatus = async (inquiryId, status) => {
    const resolutionNote = window.prompt('Resolution note (optional):', '') || '';

    try {
      await contactApi.updateInquiryStatus(inquiryId, {
        status,
        resolutionNote
      });
      setMessage('Inquiry status updated successfully.');
      await loadDashboard();
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Failed to update inquiry status.'));
    }
  };

  const cards = useMemo(
    () => [
      {
        title: 'Published News',
        value: snapshot.metrics.publishedNews,
        subtitle: 'Live count of published newsroom posts'
      },
      {
        title: 'Featured Blogs',
        value: snapshot.metrics.featuredBlogs,
        subtitle: 'Published blog articles visible to visitors'
      },
      {
        title: 'Open Scholarships',
        value: snapshot.metrics.openScholarships,
        subtitle: 'Scholarship notices currently accepting applications'
      },
      {
        title: 'Scholarship Reviews',
        value: snapshot.metrics.scholarshipReviews,
        subtitle: 'Submitted applications awaiting review'
      },
      {
        title: 'Published Events',
        value: snapshot.metrics.publishedEvents,
        subtitle: 'Events that are open for registration'
      },
      {
        title: 'Pending Bookings',
        value: snapshot.metrics.pendingBookings,
        subtitle: 'Venue requests waiting for approval'
      },
      {
        title: 'New Inquiries',
        value: snapshot.metrics.newInquiries,
        subtitle: 'Contact inquiries not yet processed'
      },
      {
        title: 'Notifications',
        value: snapshot.metrics.notifications,
        subtitle: 'Notifications visible for your current role'
      },
      {
        title: 'Audit Entries',
        value: snapshot.metrics.auditEntries,
        subtitle: 'Tracked operations in the audit stream'
      }
    ],
    [snapshot.metrics]
  );

  return (
    <section>
      <div className="section-head">
        <h1>Admin Operations Dashboard</h1>
        <div className="action-row">
          <Link to="/admin/notifications" className="btn btn-primary">
            Open Notification Center
          </Link>
          <button type="button" className="btn btn-ghost" onClick={loadDashboard}>
            Refresh
          </button>
        </div>
      </div>

      {error && <p className="error-text">{error}</p>}
      {message && <p className="meta">{message}</p>}
      {loading && <p>Loading live metrics...</p>}

      <div className="feature-grid">
        {cards.map((card) => (
          <article key={card.title} className="feature-card">
            <p className="meta">{card.title}</p>
            <h2>{card.value}</h2>
            <p>{card.subtitle}</p>
          </article>
        ))}
      </div>

      {canManageBookings && (
        <article className="surface-card">
          <div className="section-head section-head-tight">
            <h3>Pending Booking Queue</h3>
            <Link to="/booking" className="btn btn-ghost">
              Open Venue Desk
            </Link>
          </div>

          {!snapshot.pendingBookings.length && <p>No pending booking requests.</p>}

          {!!snapshot.pendingBookings.length && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Venue</th>
                    <th>Requester</th>
                    <th>Window</th>
                    <th>Status</th>
                    <th>Actions</th>
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

      {canManageInquiries && (
        <article className="surface-card">
          <div className="section-head section-head-tight">
            <h3>New Inquiry Queue</h3>
            <Link to="/contact" className="btn btn-ghost">
              Open Contact Desk
            </Link>
          </div>

          {!snapshot.inquiryQueue.length && <p>No new inquiries currently.</p>}

          {!!snapshot.inquiryQueue.length && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Sender</th>
                    <th>Subject</th>
                    <th>Message</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.inquiryQueue.map((item) => (
                    <tr key={item._id}>
                      <td>
                        <strong>{item.name}</strong>
                        <br />
                        <span className="meta">{item.email}</span>
                      </td>
                      <td>{item.subject}</td>
                      <td>{item.message}</td>
                      <td>{toLocalDateTime(item.createdAt)}</td>
                      <td>
                        <div className="inline-actions">
                          <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => updateInquiryStatus(item._id, 'in_progress')}
                          >
                            In Progress
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => updateInquiryStatus(item._id, 'resolved')}
                          >
                            Resolve
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

      {canViewAudits && (
        <article className="surface-card">
          <h3>Recent Audit Activity</h3>

          {!snapshot.recentAudits.length && <p>No audit entries available.</p>}

          {!!snapshot.recentAudits.length && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Actor</th>
                    <th>Action</th>
                    <th>Entity</th>
                    <th>Route</th>
                    <th>Status</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.recentAudits.map((item) => (
                    <tr key={item._id}>
                      <td>{item.actor?.fullName || 'System'}</td>
                      <td>{item.action}</td>
                      <td>{item.entityType}</td>
                      <td>{item.route}</td>
                      <td>{item.statusCode}</td>
                      <td>{toLocalDateTime(item.createdAt)}</td>
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

export default AdminPanelPage;
