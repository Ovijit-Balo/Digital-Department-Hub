import { useCallback, useEffect, useMemo, useState } from 'react';
import { authApi, notificationApi } from '../../api/modules';
import FilterBar from '../../components/ui/FilterBar';
import SkeletonList from '../../components/ui/SkeletonList';
import { useToast } from '../../context/ToastContext';
import useDebounce from '../../hooks/useDebounce';
import useRole from '../../hooks/useRole';
import { getApiErrorMessage } from '../../utils/http';
import { toLocalDateTime } from '../../utils/localized';

function NotificationCenterPage() {
  const canDispatch = useRole('admin', 'manager');
  const { success, error: toastError } = useToast();

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [message, setMessage] = useState('');
  const [subject, setSubject] = useState('Department Notification');
  const [body, setBody] = useState('');
  const [channel, setChannel] = useState('in_app');
  const [notifications, setNotifications] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedRecipientId, setSelectedRecipientId] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const debouncedUserSearch = useDebounce(userSearch, 250);

  const [filters, setFilters] = useState({
    status: '',
    channel: ''
  });

  const fetchUsers = useCallback(async () => {
    if (!canDispatch) {
      return;
    }

    try {
      const response = await authApi.listUsers({ limit: 100, isActive: true });
      setUsers(response.data.items || []);
    } catch (err) {
      toastError(getApiErrorMessage(err, 'Failed to fetch users'));
    }
  }, [canDispatch, toastError]);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setErrorMessage('');

    try {
      const params = {};
      if (filters.status) {
        params.status = filters.status;
      }
      if (filters.channel) {
        params.channel = filters.channel;
      }

      const response = await notificationApi.listNotifications(params);
      setNotifications(response.data.items || []);
    } catch (err) {
      setErrorMessage(getApiErrorMessage(err, 'Failed to load notification log.'));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchUsers();
    fetchNotifications();
  }, [fetchNotifications, fetchUsers]);

  const filteredUsers = useMemo(() => {
    if (!debouncedUserSearch) {
      return users.slice(0, 8);
    }

    return users
      .filter(
        (user) =>
          user.email.toLowerCase().includes(debouncedUserSearch.toLowerCase()) ||
          user.fullName.toLowerCase().includes(debouncedUserSearch.toLowerCase())
      )
      .slice(0, 8);
  }, [debouncedUserSearch, users]);

  const handleDispatch = async (event) => {
    event.preventDefault();

    if (!body.trim()) {
      return;
    }

    const recipients = selectedRecipientId
      ? users.filter((user) => user.id === selectedRecipientId)
      : users;

    if (!recipients.length) {
      toastError('No active recipients available to notify.');
      return;
    }

    try {
      await Promise.all(
        recipients.map((recipient) =>
          notificationApi.dispatch({
            recipient: recipient.id,
            channel,
            subject: subject.trim() || 'Department Notification',
            message: body.trim()
          })
        )
      );

      setBody('');
      setUserSearch('');
      setSelectedRecipientId('');
      setMessage(
        selectedRecipientId
          ? 'Notification dispatched to the selected user.'
          : `Notification dispatched to ${recipients.length} users.`
      );
      success('Notification dispatched successfully');
      fetchNotifications();
    } catch (err) {
      toastError(getApiErrorMessage(err, 'Failed to dispatch notification.'));
    }
  };

  return (
    <section className="page-wrap desk-page notifications-page">
      <div className="section-head">
        <div>
          <h1>Notification Center</h1>
          <p className="meta">Send in-app or email notifications and review delivery logs.</p>
        </div>
        <button type="button" className="btn btn-ghost" onClick={fetchNotifications}>
          Refresh
        </button>
      </div>

      {message && <p className="meta">{message}</p>}

      {canDispatch && (
        <article className="surface-card">
          <h3>Send Notification</h3>
          <form className="form-grid" onSubmit={handleDispatch}>
            <label>
              Subject
              <input
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                maxLength={200}
              />
            </label>

            <label>
              Channel
              <select value={channel} onChange={(event) => setChannel(event.target.value)}>
                <option value="in_app">In-app</option>
                <option value="email">Email</option>
                <option value="all">In-app + Email</option>
              </select>
            </label>

            <label>
              Message
              <textarea
                rows={4}
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder="Enter notification message..."
                required
              />
            </label>

            <div className="stack-list">
              <label>
                Target User (optional)
                <FilterBar
                  searchValue={userSearch}
                  searchPlaceholder="Search by name or email..."
                  onSearchChange={(event) => {
                    setUserSearch(event.target.value);
                    setSelectedRecipientId('');
                  }}
                />
              </label>

              {!!filteredUsers.length && (
                <div className="stack-list">
                  {filteredUsers.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      className={`btn btn-ghost${
                        selectedRecipientId === user.id ? ' btn-primary' : ''
                      }`}
                      onClick={() => {
                        setSelectedRecipientId(user.id);
                        setUserSearch(`${user.fullName} (${user.email})`);
                      }}
                    >
                      {user.fullName} — {user.email}
                    </button>
                  ))}
                </div>
              )}

              <p className="meta">
                Leave recipient blank to broadcast to all active users ({users.length}).
              </p>
            </div>

            <button type="submit" className="btn btn-primary">
              Dispatch Notification
            </button>
          </form>
        </article>
      )}

      <article className="surface-card">
        <div className="section-head section-head-tight">
          <h3>Delivery Log</h3>
          <div className="inline-actions">
            <select
              value={filters.status}
              onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
            >
              <option value="">All statuses</option>
              <option value="queued">Queued</option>
              <option value="sent">Sent</option>
              <option value="failed">Failed</option>
            </select>
            <select
              value={filters.channel}
              onChange={(event) => setFilters((prev) => ({ ...prev, channel: event.target.value }))}
            >
              <option value="">All channels</option>
              <option value="in_app">In-app</option>
              <option value="email">Email</option>
              <option value="all">In-app + Email</option>
            </select>
          </div>
        </div>

        {loading && <SkeletonList count={3} lines={3} />}
        {!loading && errorMessage && <p className="error-text">{errorMessage}</p>}
        {!loading && !errorMessage && !notifications.length && (
          <p className="empty-state">No notifications logged yet.</p>
        )}

        {!loading && !errorMessage && !!notifications.length && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Message</th>
                  <th>Channel</th>
                  <th>Status</th>
                  <th>Recipient</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {notifications.map((item) => (
                  <tr key={item._id}>
                    <td>{item.message}</td>
                    <td>{item.channel}</td>
                    <td>
                      <span className={`status-badge status-${item.status}`}>{item.status}</span>
                    </td>
                    <td>{item.recipient?.toString?.() || item.recipient || '—'}</td>
                    <td>{toLocalDateTime(item.createdAt || item.sentAt)}</td>
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
