import { useCallback, useEffect, useState } from 'react';
import { authApi, notificationApi } from '../../api/modules';
import { useAuth } from '../../context/AuthContext';
import useRole from '../../hooks/useRole';
import { getApiErrorMessage } from '../../utils/http';
import { toLocalDateTime } from '../../utils/localized';

function NotificationCenterPage() {
  const { user } = useAuth();
  const canDispatch = useRole('admin', 'manager');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [users, setUsers] = useState([]);

  const [filters, setFilters] = useState({
    status: '',
    channel: ''
  });

  const [userSearch, setUserSearch] = useState('');

  const [dispatchForm, setDispatchForm] = useState({
    recipient: '',
    channel: 'in_app',
    subject: '',
    message: ''
  });

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await notificationApi.listNotifications({
        status: filters.status || undefined,
        channel: filters.channel || undefined,
        limit: 40
      });
      setNotifications(response.data.items || []);
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Failed to load notifications.'));
    } finally {
      setLoading(false);
    }
  }, [filters.channel, filters.status]);

  const loadUsers = useCallback(async (searchTerm = '') => {
    if (!canDispatch) {
      setUsers([]);
      return;
    }

    try {
      const response = await authApi.listUsers({
        isActive: true,
        search: searchTerm || undefined,
        limit: 100
      });
      const items = response.data.items || [];
      setUsers(items);

      setDispatchForm((prev) => {
        if (prev.recipient) {
          return prev;
        }

        const preferredRecipient = items.find((item) => item.id !== user?.id)?.id || user?.id;

        return {
          ...prev,
          recipient: preferredRecipient || ''
        };
      });
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Failed to load users for notification dispatch.'));
    }
  }, [canDispatch, user?.id]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const refreshData = async () => {
    await Promise.all([loadNotifications(), loadUsers()]);
  };

  const markRead = async (notificationId) => {
    setMessage('');
    setError('');

    try {
      await notificationApi.markRead(notificationId);
      setMessage('Notification marked as read.');
      await loadNotifications();
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Failed to mark notification as read.'));
    }
  };

  const submitDispatch = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');

    try {
      await notificationApi.dispatch({
        recipient: dispatchForm.recipient,
        channel: dispatchForm.channel,
        subject: dispatchForm.subject,
        message: dispatchForm.message
      });

      setMessage('Notification dispatched successfully.');
      setDispatchForm((prev) => ({
        ...prev,
        subject: '',
        message: ''
      }));
      await loadNotifications();
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Failed to dispatch notification.'));
    }
  };

  return (
    <section className="page-wrap">
      <div className="section-head">
        <h1>Notification Center</h1>
        <button type="button" className="btn btn-ghost" onClick={refreshData}>
          Refresh
        </button>
      </div>

      {error && <p className="error-text">{error}</p>}
      {message && <p className="meta">{message}</p>}

      {canDispatch && (
        <article className="surface-card">
          <h3>Dispatch Notification</h3>

          <div className="action-row">
            <input
              value={userSearch}
              onChange={(event) => setUserSearch(event.target.value)}
              placeholder="Search recipient by name/email"
            />
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => loadUsers(userSearch)}
            >
              Search Users
            </button>
          </div>

          <form className="form-grid" onSubmit={submitDispatch}>
            <label>
              Recipient
              <select
                value={dispatchForm.recipient}
                onChange={(event) =>
                  setDispatchForm((prev) => ({ ...prev, recipient: event.target.value }))
                }
                required
              >
                <option value="">Select recipient</option>
                {users.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.fullName} ({item.email})
                  </option>
                ))}
              </select>
            </label>

            <label>
              Channel
              <select
                value={dispatchForm.channel}
                onChange={(event) =>
                  setDispatchForm((prev) => ({ ...prev, channel: event.target.value }))
                }
              >
                <option value="in_app">In App</option>
                <option value="email">Email</option>
              </select>
            </label>

            <label>
              Subject (optional)
              <input
                value={dispatchForm.subject}
                onChange={(event) =>
                  setDispatchForm((prev) => ({ ...prev, subject: event.target.value }))
                }
              />
            </label>

            <label>
              Message
              <textarea
                minLength={1}
                value={dispatchForm.message}
                onChange={(event) =>
                  setDispatchForm((prev) => ({ ...prev, message: event.target.value }))
                }
                required
              />
            </label>

            <button type="submit" className="btn btn-primary">
              Dispatch Notification
            </button>
          </form>
        </article>
      )}

      <article className="surface-card">
        <div className="section-head section-head-tight">
          <h3>Inbox</h3>
          <div className="action-row">
            <select
              value={filters.channel}
              onChange={(event) => setFilters((prev) => ({ ...prev, channel: event.target.value }))}
            >
              <option value="">All channels</option>
              <option value="in_app">In app</option>
              <option value="email">Email</option>
            </select>
            <select
              value={filters.status}
              onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
            >
              <option value="">All status</option>
              <option value="queued">Queued</option>
              <option value="sent">Sent</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>

        {loading && <p>Loading notifications...</p>}
        {!loading && !notifications.length && <p>No notifications available for this filter.</p>}

        {!!notifications.length && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Recipient</th>
                  <th>Channel</th>
                  <th>Subject</th>
                  <th>Message</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Read At</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {notifications.map((item) => (
                  <tr key={item._id}>
                    <td>
                      {String(item.recipient) === String(user?.id) ? 'You' : item.recipient}
                    </td>
                    <td>{item.channel}</td>
                    <td>{item.subject || '-'}</td>
                    <td>{item.message}</td>
                    <td>
                      <span className={`status-badge status-${item.status}`}>{item.status}</span>
                    </td>
                    <td>{toLocalDateTime(item.createdAt)}</td>
                    <td>{toLocalDateTime(item.readAt)}</td>
                    <td>
                      {!item.readAt && (
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => markRead(item._id)}
                        >
                          Mark Read
                        </button>
                      )}
                    </td>
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

export default NotificationCenterPage;
