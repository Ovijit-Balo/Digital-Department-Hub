import { useCallback, useEffect, useMemo, useState } from 'react';
import { authApi, notificationApi } from '../../api/modules';
import FilterBar from '../../components/ui/FilterBar';
import PaginationBar from '../../components/ui/PaginationBar';
import SkeletonList from '../../components/ui/SkeletonList';
import { useToast } from '../../context/ToastContext';
import useDebounce from '../../hooks/useDebounce';
import useLanguage from '../../hooks/useLanguage';
import useRole from '../../hooks/useRole';
import { getApiErrorMessage } from '../../utils/http';
import { toLocalDateTime, toLocalizedText } from '../../utils/localized';

const LOG_PAGE_SIZE = 10;

const T = {
  defaultSubject: { en: 'Department Notification', bn: 'বিভাগীয় বিজ্ঞপ্তি' },
  title: { en: 'Notification Center', bn: 'নোটিফিকেশন সেন্টার' },
  lead: { en: 'Send in-app or email notifications and review delivery logs.', bn: 'ইন-অ্যাপ বা ইমেইল বিজ্ঞপ্তি পাঠান এবং ডেলিভারি লগ দেখুন।' },
  refresh: { en: 'Refresh', bn: 'রিফ্রেশ' },
  sendNotification: { en: 'Send Notification', bn: 'বিজ্ঞপ্তি পাঠান' },
  subject: { en: 'Subject', bn: 'বিষয়' },
  channel: { en: 'Channel', bn: 'চ্যানেল' },
  inApp: { en: 'In-app', bn: 'ইন-অ্যাপ' },
  email: { en: 'Email', bn: 'ইমেইল' },
  inAppEmail: { en: 'In-app + Email', bn: 'ইন-অ্যাপ + ইমেইল' },
  message: { en: 'Message', bn: 'বার্তা' },
  messagePlaceholder: { en: 'Enter notification message...', bn: 'বিজ্ঞপ্তির বার্তা লিখুন...' },
  targetUser: { en: 'Target User (optional)', bn: 'লক্ষ্য ব্যবহারকারী (ঐচ্ছিক)' },
  userSearchPlaceholder: { en: 'Search by name or email...', bn: 'নাম বা ইমেইল দিয়ে খুঁজুন...' },
  broadcastHint: { en: 'Leave recipient blank to broadcast to all active users', bn: 'সব সক্রিয় ব্যবহারকারীর কাছে পাঠাতে প্রাপক ফাঁকা রাখুন' },
  dispatch: { en: 'Dispatch Notification', bn: 'বিজ্ঞপ্তি প্রেরণ করুন' },
  deliveryLog: { en: 'Delivery Log', bn: 'ডেলিভারি লগ' },
  allStatuses: { en: 'All statuses', bn: 'সব অবস্থা' },
  queued: { en: 'Queued', bn: 'সারিবদ্ধ' },
  sent: { en: 'Sent', bn: 'প্রেরিত' },
  failed: { en: 'Failed', bn: 'ব্যর্থ' },
  allChannels: { en: 'All channels', bn: 'সব চ্যানেল' },
  noLogs: { en: 'No notifications logged yet.', bn: 'এখনও কোনো বিজ্ঞপ্তি লগ হয়নি।' },
  colMessage: { en: 'Message', bn: 'বার্তা' },
  colStatus: { en: 'Status', bn: 'অবস্থা' },
  colRecipient: { en: 'Recipient', bn: 'প্রাপক' },
  colDate: { en: 'Date', bn: 'তারিখ' },
  msgFetchUsersFailed: { en: 'Failed to fetch users', bn: 'ব্যবহারকারী আনতে ব্যর্থ' },
  msgLoadLogFailed: { en: 'Failed to load notification log.', bn: 'বিজ্ঞপ্তি লগ লোড করতে ব্যর্থ।' },
  msgNoRecipients: { en: 'No active recipients available to notify.', bn: 'বিজ্ঞপ্তি পাঠানোর জন্য কোনো সক্রিয় প্রাপক নেই।' },
  msgDispatchedSelected: { en: 'Notification dispatched to the selected user.', bn: 'নির্বাচিত ব্যবহারকারীর কাছে বিজ্ঞপ্তি প্রেরিত হয়েছে।' },
  msgDispatchSuccess: { en: 'Notification dispatched successfully', bn: 'বিজ্ঞপ্তি সফলভাবে প্রেরিত হয়েছে' },
  msgDispatchFailed: { en: 'Failed to dispatch notification.', bn: 'বিজ্ঞপ্তি প্রেরণে ব্যর্থ।' }
};

function NotificationCenterPage() {
  const canDispatch = useRole('admin', 'manager');
  const { success, error: toastError } = useToast();
  const { language } = useLanguage();
  const t = (key) => toLocalizedText(T[key], language);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [message, setMessage] = useState('');
  const [subject, setSubject] = useState(toLocalizedText(T.defaultSubject, language));
  const [body, setBody] = useState('');
  const [channel, setChannel] = useState('in_app');
  const [notifications, setNotifications] = useState([]);
  const [logPage, setLogPage] = useState(1);
  const [logTotal, setLogTotal] = useState(0);
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
      toastError(getApiErrorMessage(err, t('msgFetchUsersFailed')));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canDispatch, toastError]);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setErrorMessage('');

    try {
      const params = { page: logPage, limit: LOG_PAGE_SIZE };
      if (filters.status) {
        params.status = filters.status;
      }
      if (filters.channel) {
        params.channel = filters.channel;
      }

      const response = await notificationApi.listNotifications(params);
      setNotifications(response.data.items || []);
      setLogTotal(Number(response.data.total ?? 0));
    } catch (err) {
      setErrorMessage(getApiErrorMessage(err, t('msgLoadLogFailed')));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, logPage]);

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
      toastError(t('msgNoRecipients'));
      return;
    }

    try {
      await Promise.all(
        recipients.map((recipient) =>
          notificationApi.dispatch({
            recipient: recipient.id,
            channel,
            subject: subject.trim() || toLocalizedText(T.defaultSubject, language),
            message: body.trim()
          })
        )
      );

      setBody('');
      setUserSearch('');
      setSelectedRecipientId('');
      setMessage(
        selectedRecipientId
          ? t('msgDispatchedSelected')
          : toLocalizedText(
              {
                en: `Notification dispatched to ${recipients.length} users.`,
                bn: `${recipients.length} জন ব্যবহারকারীর কাছে বিজ্ঞপ্তি প্রেরিত হয়েছে।`
              },
              language
            )
      );
      success(t('msgDispatchSuccess'));
      fetchNotifications();
    } catch (err) {
      toastError(getApiErrorMessage(err, t('msgDispatchFailed')));
    }
  };

  return (
    <section className="page-wrap desk-page notifications-page">
      <div className="section-head">
        <div>
          <h1>{t('title')}</h1>
          <p className="meta">{t('lead')}</p>
        </div>
        <button type="button" className="btn btn-ghost" onClick={fetchNotifications}>
          {t('refresh')}
        </button>
      </div>

      {message && <p className="meta">{message}</p>}

      {canDispatch && (
        <article className="surface-card">
          <h3>{t('sendNotification')}</h3>
          <form className="form-grid" onSubmit={handleDispatch}>
            <label>
              {t('subject')}
              <input
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                maxLength={200}
              />
            </label>

            <label>
              {t('channel')}
              <select value={channel} onChange={(event) => setChannel(event.target.value)}>
                <option value="in_app">{t('inApp')}</option>
                <option value="email">{t('email')}</option>
                <option value="all">{t('inAppEmail')}</option>
              </select>
            </label>

            <label>
              {t('message')}
              <textarea
                rows={4}
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder={t('messagePlaceholder')}
                required
              />
            </label>

            <div className="stack-list">
              <label>
                {t('targetUser')}
                <FilterBar
                  searchValue={userSearch}
                  searchPlaceholder={t('userSearchPlaceholder')}
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
                {t('broadcastHint')} ({users.length}).
              </p>
            </div>

            <button type="submit" className="btn btn-primary">
              {t('dispatch')}
            </button>
          </form>
        </article>
      )}

      <article className="surface-card">
        <div className="section-head section-head-tight">
          <h3>{t('deliveryLog')}</h3>
          <div className="inline-actions">
            <select
              value={filters.status}
              onChange={(event) => {
                setLogPage(1);
                setFilters((prev) => ({ ...prev, status: event.target.value }));
              }}
            >
              <option value="">{t('allStatuses')}</option>
              <option value="queued">{t('queued')}</option>
              <option value="sent">{t('sent')}</option>
              <option value="failed">{t('failed')}</option>
            </select>
            <select
              value={filters.channel}
              onChange={(event) => {
                setLogPage(1);
                setFilters((prev) => ({ ...prev, channel: event.target.value }));
              }}
            >
              <option value="">{t('allChannels')}</option>
              <option value="in_app">{t('inApp')}</option>
              <option value="email">{t('email')}</option>
              <option value="all">{t('inAppEmail')}</option>
            </select>
          </div>
        </div>

        {loading && <SkeletonList count={3} lines={3} />}
        {!loading && errorMessage && <p className="error-text">{errorMessage}</p>}
        {!loading && !errorMessage && !notifications.length && (
          <p className="empty-state">{t('noLogs')}</p>
        )}

        {!loading && !errorMessage && !!notifications.length && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t('subject')}</th>
                  <th>{t('colMessage')}</th>
                  <th>{t('channel')}</th>
                  <th>{t('colStatus')}</th>
                  <th>{t('colRecipient')}</th>
                  <th>{t('colDate')}</th>
                </tr>
              </thead>
              <tbody>
                {notifications.map((item) => (
                  <tr key={item._id}>
                    <td>{item.subject || '—'}</td>
                    <td>{item.message}</td>
                    <td>{item.channel}</td>
                    <td>
                      <span className={`status-badge status-${item.status}`}>{item.status}</span>
                    </td>
                    <td>
                      {item.recipient?.fullName ? (
                        <>
                          <strong>{item.recipient.fullName}</strong>
                          <br />
                          <span className="meta">{item.recipient.email}</span>
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>{toLocalDateTime(item.createdAt || item.sentAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <PaginationBar
          language={language}
          page={logPage}
          total={logTotal}
          limit={LOG_PAGE_SIZE}
          disabled={loading}
          onPageChange={setLogPage}
        />
      </article>
    </section>
  );
}

export default NotificationCenterPage;
