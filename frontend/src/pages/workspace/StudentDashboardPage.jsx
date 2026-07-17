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

const T = {
  eyebrow: { en: 'Student Workspace', bn: 'শিক্ষার্থী ওয়ার্কস্পেস' },
  welcomeBack: { en: 'Welcome back', bn: 'স্বাগতম' },
  dashboard: { en: 'Student Dashboard', bn: 'শিক্ষার্থী ড্যাশবোর্ড' },
  lead: {
    en: 'Your personal workspace for scholarships, events, bookings, and service updates.',
    bn: 'বৃত্তি, ইভেন্ট, বুকিং ও সেবা আপডেটের জন্য আপনার ব্যক্তিগত ওয়ার্কস্পেস।'
  },
  refresh: { en: 'Refresh', bn: 'রিফ্রেশ' },
  loading: { en: 'Loading dashboard...', bn: 'ড্যাশবোর্ড লোড হচ্ছে...' },
  quickActions: { en: 'Quick Actions', bn: 'দ্রুত পদক্ষেপ' },
  openScholarshipDesk: { en: 'Open Scholarship Desk', bn: 'বৃত্তি ডেস্ক খুলুন' },
  openEventDesk: { en: 'Open Event Desk', bn: 'ইভেন্ট ডেস্ক খুলুন' },
  openVenueBooking: { en: 'Open Venue Booking', bn: 'ভেন্যু বুকিং খুলুন' },
  openContactDesk: { en: 'Open Contact Desk', bn: 'যোগাযোগ ডেস্ক খুলুন' },
  openNotices: { en: 'Open Scholarship Notices', bn: 'খোলা বৃত্তি বিজ্ঞপ্তি' },
  noNotices: { en: 'No open scholarship notices right now.', bn: 'এখন কোনো খোলা বৃত্তি বিজ্ঞপ্তি নেই।' },
  deadline: { en: 'Deadline:', bn: 'শেষ তারিখ:' },
  myApplicationsHeading: { en: 'My Recent Applications', bn: 'আমার সাম্প্রতিক আবেদন' },
  noApplications: { en: 'You have not submitted any applications yet.', bn: 'আপনি এখনও কোনো আবেদন জমা দেননি।' },
  notice: { en: 'Notice', bn: 'বিজ্ঞপ্তি' },
  status: { en: 'Status', bn: 'অবস্থা' },
  submitted: { en: 'Submitted', bn: 'জমা দেওয়া' },
  upcomingEvents: { en: 'Upcoming Events', bn: 'আসন্ন ইভেন্ট' },
  noEvents: { en: 'No published events available currently.', bn: 'এখন কোনো প্রকাশিত ইভেন্ট নেই।' },
  myNotifications: { en: 'My Notifications', bn: 'আমার বিজ্ঞপ্তি' },
  markAllRead: { en: 'Mark all read', bn: 'সব পঠিত চিহ্নিত করুন' },
  noNotifications: { en: 'No notifications yet.', bn: 'এখনও কোনো বিজ্ঞপ্তি নেই।' },
  notificationFallback: { en: 'Notification', bn: 'বিজ্ঞপ্তি' },
  read: { en: 'Read', bn: 'পঠিত' },
  unread: { en: 'Unread', bn: 'অপঠিত' },
  view: { en: 'View', bn: 'দেখুন' },
  markRead: { en: 'Mark read', bn: 'পঠিত চিহ্নিত করুন' },
  // cards
  cardOpenScholarships: { en: 'Open Scholarships', bn: 'খোলা বৃত্তি' },
  cardOpenScholarshipsSub: { en: 'Scholarships currently accepting applications', bn: 'বর্তমানে আবেদন গ্রহণকারী বৃত্তি' },
  cardMyApplications: { en: 'My Applications', bn: 'আমার আবেদন' },
  cardMyApplicationsSub: { en: 'Applications you have submitted', bn: 'আপনার জমা দেওয়া আবেদন' },
  cardPublishedEvents: { en: 'Published Events', bn: 'প্রকাশিত ইভেন্ট' },
  cardPublishedEventsSub: { en: 'Events available for registration', bn: 'নিবন্ধনের জন্য উপলব্ধ ইভেন্ট' },
  cardBookableVenues: { en: 'Bookable Venues', bn: 'বুকযোগ্য ভেন্যু' },
  cardBookableVenuesSub: { en: 'Venues currently open for booking requests', bn: 'বর্তমানে বুকিং অনুরোধের জন্য খোলা ভেন্যু' },
  cardUnreadNotifications: { en: 'Unread Notifications', bn: 'অপঠিত বিজ্ঞপ্তি' },
  cardUnreadNotificationsSub: { en: 'Alerts waiting for you below', bn: 'নিচে আপনার জন্য অপেক্ষমাণ সতর্কতা' },
  msgLoadFailed: { en: 'Failed to load student dashboard.', bn: 'শিক্ষার্থী ড্যাশবোর্ড লোড করতে ব্যর্থ।' },
  msgRefreshNotifFailed: { en: 'Failed to refresh notifications.', bn: 'বিজ্ঞপ্তি রিফ্রেশ করতে ব্যর্থ।' },
  msgMarkReadFailed: { en: 'Failed to mark notification as read.', bn: 'বিজ্ঞপ্তি পঠিত চিহ্নিত করতে ব্যর্থ।' },
  msgMarkAllFailed: { en: 'Failed to mark notifications as read.', bn: 'বিজ্ঞপ্তিসমূহ পঠিত চিহ্নিত করতে ব্যর্থ।' }
};

function StudentDashboardPage() {
  const { language } = useLanguage();
  const t = (key) => toLocalizedText(T[key], language);
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
  const [notificationBusy, setNotificationBusy] = useState(false);

  const cards = useMemo(
    () => [
      {
        key: 'openScholarships',
        title: t('cardOpenScholarships'),
        value: snapshot.metrics.openScholarships,
        subtitle: t('cardOpenScholarshipsSub'),
        to: '/scholarship'
      },
      {
        key: 'myApplications',
        title: t('cardMyApplications'),
        value: snapshot.metrics.myApplications,
        subtitle: t('cardMyApplicationsSub'),
        to: '/scholarship'
      },
      {
        key: 'publishedEvents',
        title: t('cardPublishedEvents'),
        value: snapshot.metrics.publishedEvents,
        subtitle: t('cardPublishedEventsSub'),
        to: '/events'
      },
      {
        key: 'activeVenues',
        title: t('cardBookableVenues'),
        value: snapshot.metrics.activeVenues,
        subtitle: t('cardBookableVenuesSub'),
        to: '/booking'
      },
      {
        key: 'notifications',
        title: t('cardUnreadNotifications'),
        value: snapshot.metrics.notifications,
        subtitle: t('cardUnreadNotificationsSub')
      }
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [snapshot.metrics, language]
  );

  // Personal in-app notifications (unread count + latest items).
  const loadNotifications = useCallback(async () => {
    const [notificationsResponse, unreadResponse] = await Promise.all([
      notificationApi.getUserNotifications({ page: 1, limit: 6 }),
      notificationApi.getUnreadCount()
    ]);

    return {
      items: notificationsResponse.data.items || [],
      unread: unreadResponse.data.count || 0
    };
  }, []);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [noticesResponse, myApplicationsResponse, eventsResponse, venuesResponse, inbox] =
        await Promise.all([
          scholarshipApi.listNotices({ status: 'open', page: 1, limit: 4 }),
          scholarshipApi.listMyApplications({ page: 1, limit: 6 }),
          eventApi.listEvents({ status: 'published', page: 1, limit: 4 }),
          bookingApi.listVenues({ isActive: true, page: 1, limit: 4 }),
          loadNotifications()
        ]);

      setSnapshot({
        metrics: {
          openScholarships: noticesResponse.data.total || 0,
          myApplications: myApplicationsResponse.data.total || 0,
          publishedEvents: eventsResponse.data.total || 0,
          activeVenues: venuesResponse.data.total || 0,
          notifications: inbox.unread
        },
        openNotices: noticesResponse.data.items || [],
        upcomingEvents: eventsResponse.data.items || [],
        myRecentApplications: myApplicationsResponse.data.items || [],
        recentNotifications: inbox.items
      });
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, t('msgLoadFailed')));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadNotifications]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const refreshNotifications = useCallback(async () => {
    try {
      const inbox = await loadNotifications();
      setSnapshot((prev) => ({
        ...prev,
        metrics: { ...prev.metrics, notifications: inbox.unread },
        recentNotifications: inbox.items
      }));
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, t('msgRefreshNotifFailed')));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadNotifications]);

  const markNotificationRead = async (notificationId) => {
    setNotificationBusy(true);
    try {
      await notificationApi.markUserNotificationRead(notificationId);
      await refreshNotifications();
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, t('msgMarkReadFailed')));
    } finally {
      setNotificationBusy(false);
    }
  };

  const markAllNotificationsRead = async () => {
    setNotificationBusy(true);
    try {
      await notificationApi.markAllUserNotificationsRead();
      await refreshNotifications();
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, t('msgMarkAllFailed')));
    } finally {
      setNotificationBusy(false);
    }
  };

  const firstName = (user?.fullName || '').trim().split(' ')[0];

  return (
    <section className="page-wrap dashboard-page">
      <header className="dashboard-header">
        <div className="dashboard-header__intro">
          <p className="dashboard-eyebrow">{t('eyebrow')}</p>
          <h1 className="dashboard-title">
            {firstName ? `${t('welcomeBack')}, ${firstName}` : t('dashboard')}
          </h1>
          <p className="dashboard-lead">{t('lead')}</p>
        </div>
        <button type="button" className="btn btn-ghost" onClick={loadDashboard}>
          {t('refresh')}
        </button>
      </header>

      {error && <p className="error-text">{error}</p>}
      {loading && <p>{t('loading')}</p>}

      <div className="dash-metrics">
        {cards.map((card) => {
          const body = (
            <>
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
            </>
          );

          return card.to ? (
            <Link key={card.title} to={card.to} className="dash-metric dash-metric--link">
              {body}
            </Link>
          ) : (
            <article key={card.title} className="dash-metric">
              {body}
            </article>
          );
        })}
      </div>

      <article className="surface-card">
        <h3>{t('quickActions')}</h3>
        <div className="action-row">
          <Link to="/scholarship" className="btn btn-primary">
            {t('openScholarshipDesk')}
          </Link>
          <Link to="/events" className="btn btn-primary">
            {t('openEventDesk')}
          </Link>
          <Link to="/booking" className="btn btn-primary">
            {t('openVenueBooking')}
          </Link>
          <Link to="/contact" className="btn btn-primary">
            {t('openContactDesk')}
          </Link>
        </div>
      </article>

      <article className="surface-card">
        <h3>{t('openNotices')}</h3>
        {!snapshot.openNotices.length && <p>{t('noNotices')}</p>}

        <div className="stack-list">
          {snapshot.openNotices.map((notice) => (
            <article key={notice._id} className="surface-card inner-card">
              <h4>{toLocalizedText(notice.title, language)}</h4>
              <p>{toLocalizedText(notice.description, language)}</p>
              <p className="meta">
                {t('deadline')} {toIsoDate(notice.deadline)}
              </p>
            </article>
          ))}
        </div>
      </article>

      <article className="surface-card">
        <h3>{t('myApplicationsHeading')}</h3>
        {!snapshot.myRecentApplications.length && <p>{t('noApplications')}</p>}

        {!!snapshot.myRecentApplications.length && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t('notice')}</th>
                  <th>{t('status')}</th>
                  <th>{t('submitted')}</th>
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
        <h3>{t('upcomingEvents')}</h3>
        {!snapshot.upcomingEvents.length && <p>{t('noEvents')}</p>}

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
        <div className="section-head section-head-tight">
          <h3>{t('myNotifications')}</h3>
          {snapshot.metrics.notifications > 0 && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={markAllNotificationsRead}
              disabled={notificationBusy}
            >
              {t('markAllRead')} ({snapshot.metrics.notifications})
            </button>
          )}
        </div>
        {!snapshot.recentNotifications.length && <p>{t('noNotifications')}</p>}

        <div className="stack-list">
          {snapshot.recentNotifications.map((item) => (
            <article
              key={item._id}
              className={`surface-card inner-card${item.read ? '' : ' notification-unread'}`}
            >
              <h4>{item.title || t('notificationFallback')}</h4>
              <p>{item.message}</p>
              <div className="inline-actions">
                <p className="meta">
                  {toLocalDateTime(item.createdAt)} • {item.read ? t('read') : t('unread')}
                </p>
                {item.link && (
                  <Link to={item.link} className="btn btn-ghost btn-sm">
                    {t('view')}
                  </Link>
                )}
                {!item.read && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => markNotificationRead(item._id)}
                    disabled={notificationBusy}
                  >
                    {t('markRead')}
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      </article>
    </section>
  );
}

export default StudentDashboardPage;
