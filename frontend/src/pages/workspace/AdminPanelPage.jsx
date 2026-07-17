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
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useToast } from '../../context/ToastContext';
import useRole from '../../hooks/useRole';
import useLanguage from '../../hooks/useLanguage';
import { getApiErrorMessage } from '../../utils/http';
import { toIsoDate, toLocalDateTime, toLocalizedText } from '../../utils/localized';

const APPLICATION_STATUS_META = [
  { key: 'submitted', label: { en: 'Submitted', bn: 'জমা দেওয়া' }, className: 'status-bar--submitted' },
  { key: 'under_review', label: { en: 'Under review', bn: 'পর্যালোচনাধীন' }, className: 'status-bar--review' },
  { key: 'shortlisted', label: { en: 'Shortlisted', bn: 'সংক্ষিপ্ত তালিকাভুক্ত' }, className: 'status-bar--shortlisted' },
  { key: 'approved', label: { en: 'Approved', bn: 'অনুমোদিত' }, className: 'status-bar--approved' },
  { key: 'rejected', label: { en: 'Rejected', bn: 'প্রত্যাখ্যাত' }, className: 'status-bar--rejected' }
];

const T = {
  title: { en: 'Admin Operations Dashboard', bn: 'অ্যাডমিন অপারেশন ড্যাশবোর্ড' },
  openNotificationCenter: { en: 'Open Notification Center', bn: 'নোটিফিকেশন সেন্টার খুলুন' },
  refresh: { en: 'Refresh', bn: 'রিফ্রেশ' },
  loading: { en: 'Loading live metrics...', bn: 'লাইভ মেট্রিক্স লোড হচ্ছে...' },
  appsByStatus: { en: 'Applications by Status', bn: 'অবস্থা অনুযায়ী আবেদন' },
  total: { en: 'total', bn: 'মোট' },
  noApps: { en: 'No scholarship applications recorded yet.', bn: 'এখনও কোনো বৃত্তি আবেদন রেকর্ড হয়নি।' },
  upcomingDeadlines: { en: 'Upcoming Scholarship Deadlines', bn: 'আসন্ন বৃত্তির শেষ তারিখ' },
  openScholarshipDesk: { en: 'Open Scholarship Desk', bn: 'বৃত্তি ডেস্ক খুলুন' },
  noDeadlines: { en: 'No open scholarships with a deadline.', bn: 'শেষ তারিখসহ কোনো খোলা বৃত্তি নেই।' },
  pendingQueue: { en: 'Pending Booking Queue', bn: 'অপেক্ষমাণ বুকিং সারি' },
  openVenueDesk: { en: 'Open Venue Desk', bn: 'ভেন্যু ডেস্ক খুলুন' },
  noPendingBookings: { en: 'No pending booking requests.', bn: 'কোনো অপেক্ষমাণ বুকিং অনুরোধ নেই।' },
  venue: { en: 'Venue', bn: 'ভেন্যু' },
  requester: { en: 'Requester', bn: 'অনুরোধকারী' },
  window: { en: 'Window', bn: 'সময়সীমা' },
  status: { en: 'Status', bn: 'অবস্থা' },
  actions: { en: 'Actions', bn: 'পদক্ষেপ' },
  unknown: { en: 'Unknown', bn: 'অজানা' },
  approve: { en: 'Approve', bn: 'অনুমোদন' },
  reject: { en: 'Reject', bn: 'প্রত্যাখ্যান' },
  inquiryQueue: { en: 'New Inquiry Queue', bn: 'নতুন জিজ্ঞাসা সারি' },
  openContactDesk: { en: 'Open Contact Desk', bn: 'যোগাযোগ ডেস্ক খুলুন' },
  noInquiries: { en: 'No new inquiries currently.', bn: 'এই মুহূর্তে কোনো নতুন জিজ্ঞাসা নেই।' },
  sender: { en: 'Sender', bn: 'প্রেরক' },
  subject: { en: 'Subject', bn: 'বিষয়' },
  messageCol: { en: 'Message', bn: 'বার্তা' },
  created: { en: 'Created', bn: 'তৈরি' },
  inProgress: { en: 'In Progress', bn: 'চলমান' },
  resolve: { en: 'Resolve', bn: 'সমাধান' },
  recentAudit: { en: 'Recent Audit Activity', bn: 'সাম্প্রতিক অডিট কার্যক্রম' },
  noAudits: { en: 'No audit entries available.', bn: 'কোনো অডিট এন্ট্রি নেই।' },
  actor: { en: 'Actor', bn: 'কর্তা' },
  actionCol: { en: 'Action', bn: 'পদক্ষেপ' },
  entity: { en: 'Entity', bn: 'সত্তা' },
  route: { en: 'Route', bn: 'রুট' },
  time: { en: 'Time', bn: 'সময়' },
  system: { en: 'System', bn: 'সিস্টেম' },
  closed: { en: 'Closed', bn: 'বন্ধ' },
  today: { en: 'Today', bn: 'আজ' },
  daysLeft: { en: 'd left', bn: ' দিন বাকি' },
  // cards
  cardPublishedNews: { en: 'Published News', bn: 'প্রকাশিত সংবাদ' },
  cardPublishedNewsSub: { en: 'Live count of published newsroom posts', bn: 'প্রকাশিত নিউজরুম পোস্টের লাইভ গণনা' },
  cardFeaturedBlogs: { en: 'Featured Blogs', bn: 'ফিচার্ড ব্লগ' },
  cardFeaturedBlogsSub: { en: 'Published blog articles visible to visitors', bn: 'দর্শকদের কাছে দৃশ্যমান প্রকাশিত ব্লগ' },
  cardOpenScholarships: { en: 'Open Scholarships', bn: 'খোলা বৃত্তি' },
  cardOpenScholarshipsSub: { en: 'Scholarship notices currently accepting applications', bn: 'বর্তমানে আবেদন গ্রহণকারী বৃত্তি বিজ্ঞপ্তি' },
  cardScholarshipReviews: { en: 'Scholarship Reviews', bn: 'বৃত্তি পর্যালোচনা' },
  cardScholarshipReviewsSub: { en: 'Submitted applications awaiting review', bn: 'পর্যালোচনার অপেক্ষায় জমা আবেদন' },
  cardPublishedEvents: { en: 'Published Events', bn: 'প্রকাশিত ইভেন্ট' },
  cardPublishedEventsSub: { en: 'Events that are open for registration', bn: 'নিবন্ধনের জন্য খোলা ইভেন্ট' },
  cardPendingBookings: { en: 'Pending Bookings', bn: 'অপেক্ষমাণ বুকিং' },
  cardPendingBookingsSub: { en: 'Venue requests waiting for approval', bn: 'অনুমোদনের অপেক্ষায় ভেন্যু অনুরোধ' },
  cardNewInquiries: { en: 'New Inquiries', bn: 'নতুন জিজ্ঞাসা' },
  cardNewInquiriesSub: { en: 'Contact inquiries not yet processed', bn: 'এখনও প্রক্রিয়া না হওয়া যোগাযোগ জিজ্ঞাসা' },
  cardNotifications: { en: 'Notifications', bn: 'বিজ্ঞপ্তি' },
  cardNotificationsSub: { en: 'Notifications visible for your current role', bn: 'আপনার বর্তমান ভূমিকার জন্য দৃশ্যমান বিজ্ঞপ্তি' },
  cardAuditEntries: { en: 'Audit Entries', bn: 'অডিট এন্ট্রি' },
  cardAuditEntriesSub: { en: 'Tracked operations in the audit stream', bn: 'অডিট স্ট্রিমে ট্র্যাক করা অপারেশন' },
  // confirm
  approveBooking: { en: 'Approve booking', bn: 'বুকিং অনুমোদন' },
  rejectBooking: { en: 'Reject booking', bn: 'বুকিং প্রত্যাখ্যান' },
  confirmApprove: { en: 'Are you sure you want to approve this booking request?', bn: 'আপনি কি নিশ্চিত এই বুকিং অনুরোধটি অনুমোদন করতে চান?' },
  confirmReject: { en: 'Are you sure you want to reject this booking request?', bn: 'আপনি কি নিশ্চিত এই বুকিং অনুরোধটি প্রত্যাখ্যান করতে চান?' },
  decisionNoteLabel: { en: 'Decision note (optional)', bn: 'সিদ্ধান্ত নোট (ঐচ্ছিক)' },
  updateInquiryTitle: { en: 'Update inquiry status', bn: 'জিজ্ঞাসার অবস্থা আপডেট' },
  markInquiryInProgress: { en: 'Mark this inquiry as in progress?', bn: 'এই জিজ্ঞাসাটি চলমান হিসেবে চিহ্নিত করবেন?' },
  markInquiryResolved: { en: 'Mark this inquiry as resolved?', bn: 'এই জিজ্ঞাসাটি সমাধান হিসেবে চিহ্নিত করবেন?' },
  resolutionNoteLabel: { en: 'Resolution note (optional)', bn: 'সমাধান নোট (ঐচ্ছিক)' },
  update: { en: 'Update', bn: 'আপডেট' },
  notePlaceholder: { en: 'Visible to the requester alongside the decision', bn: 'সিদ্ধান্তের সাথে অনুরোধকারীর কাছে দৃশ্যমান' },
  // toasts / messages
  bookingApproved: { en: 'Booking approved successfully.', bn: 'বুকিং সফলভাবে অনুমোদিত।' },
  bookingRejected: { en: 'Booking rejected successfully.', bn: 'বুকিং সফলভাবে প্রত্যাখ্যাত।' },
  bookingUpdated: { en: 'Booking updated', bn: 'বুকিং আপডেট হয়েছে' },
  inquiryUpdatedMsg: { en: 'Inquiry status updated successfully.', bn: 'জিজ্ঞাসার অবস্থা সফলভাবে আপডেট হয়েছে।' },
  inquiryUpdated: { en: 'Inquiry updated', bn: 'জিজ্ঞাসা আপডেট হয়েছে' },
  actionFailedMsg: { en: 'Failed to complete the action.', bn: 'পদক্ষেপটি সম্পন্ন করা যায়নি।' },
  actionFailed: { en: 'Action failed', bn: 'পদক্ষেপ ব্যর্থ' },
  msgLoadFailed: { en: 'Failed to load admin dashboard metrics.', bn: 'অ্যাডমিন ড্যাশবোর্ড মেট্রিক্স লোড করতে ব্যর্থ।' }
};

const daysUntil = (date) => {
  if (!date) {
    return null;
  }
  const diff = new Date(date).getTime() - Date.now();
  return Math.ceil(diff / (24 * 60 * 60 * 1000));
};

const deadlineUrgencyClass = (days) => {
  if (days === null || days > 7) {
    return 'deadline-chip--normal';
  }
  return days <= 3 ? 'deadline-chip--urgent' : 'deadline-chip--soon';
};

function AdminPanelPage() {
  const { success, error: toastError, info } = useToast();
  const { language } = useLanguage();
  const t = (key) => toLocalizedText(T[key], language);

  const deadlineLabel = (days) => {
    if (days === null) {
      return '—';
    }
    if (days < 0) {
      return t('closed');
    }
    return days === 0 ? t('today') : `${days}${t('daysLeft')}`;
  };

  const canManageBookings = useRole('admin', 'manager');
  const canManageInquiries = useRole('admin', 'manager', 'editor');
  const canReviewScholarships = useRole('admin', 'manager', 'reviewer');
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
    recentAudits: [],
    applicationStats: null,
    upcomingDeadlines: []
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
        auditResponse,
        applicationStatsResponse,
        deadlinesResponse
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
          : Promise.resolve({ data: { items: [], total: 0 } }),
        canReviewScholarships
          ? scholarshipApi.applicationStats()
          : Promise.resolve({ data: null }),
        scholarshipApi.listNotices({ status: 'open', page: 1, limit: 50 })
      ]);

      const upcomingDeadlines = (deadlinesResponse.data.items || [])
        .map((notice) => ({
          id: notice._id,
          title: notice.title,
          deadlineAt: notice.applicationWindowEnd || notice.deadline
        }))
        .filter((notice) => notice.deadlineAt)
        .sort((a, b) => new Date(a.deadlineAt) - new Date(b.deadlineAt))
        .slice(0, 5);

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
        recentAudits: auditResponse.data.items || [],
        applicationStats: applicationStatsResponse.data || null,
        upcomingDeadlines
      });
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, t('msgLoadFailed')));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManageBookings, canManageInquiries, canReviewScholarships, canViewAudits]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const reviewBooking = (bookingId, status) => {
    setConfirmAction({
      kind: 'booking',
      id: bookingId,
      status,
      title: status === 'approved' ? t('approveBooking') : t('rejectBooking'),
      message: status === 'approved' ? t('confirmApprove') : t('confirmReject'),
      noteLabel: t('decisionNoteLabel'),
      tone: status === 'approved' ? 'primary' : 'danger',
      confirmLabel: status === 'approved' ? t('approve') : t('reject')
    });
  };

  const updateInquiryStatus = (inquiryId, status) => {
    setConfirmAction({
      kind: 'inquiry',
      id: inquiryId,
      status,
      title: t('updateInquiryTitle'),
      message: status === 'resolved' ? t('markInquiryResolved') : t('markInquiryInProgress'),
      noteLabel: t('resolutionNoteLabel'),
      tone: 'primary',
      confirmLabel: t('update')
    });
  };

  const executeConfirmAction = async (note) => {
    if (!confirmAction) {
      return;
    }

    setConfirmBusy(true);

    try {
      if (confirmAction.kind === 'booking') {
        await bookingApi.reviewBooking(confirmAction.id, {
          status: confirmAction.status,
          decisionNote: note
        });
        const bookingMsg =
          confirmAction.status === 'approved' ? t('bookingApproved') : t('bookingRejected');
        setMessage(bookingMsg);
        success(bookingMsg, { title: t('bookingUpdated') });
      } else {
        await contactApi.updateInquiryStatus(confirmAction.id, {
          status: confirmAction.status,
          resolutionNote: note
        });
        setMessage(t('inquiryUpdatedMsg'));
        info(t('inquiryUpdatedMsg'), { title: t('inquiryUpdated') });
      }

      setConfirmAction(null);
      await loadDashboard();
    } catch (apiError) {
      const nextError = getApiErrorMessage(apiError, t('actionFailedMsg'));
      setError(nextError);
      toastError(nextError, { title: t('actionFailed') });
      setConfirmAction(null);
    } finally {
      setConfirmBusy(false);
    }
  };

  const cards = useMemo(
    () => [
      {
        title: t('cardPublishedNews'),
        value: snapshot.metrics.publishedNews,
        subtitle: t('cardPublishedNewsSub'),
        to: '/admin/cms'
      },
      {
        title: t('cardFeaturedBlogs'),
        value: snapshot.metrics.featuredBlogs,
        subtitle: t('cardFeaturedBlogsSub'),
        to: '/admin/cms'
      },
      {
        title: t('cardOpenScholarships'),
        value: snapshot.metrics.openScholarships,
        subtitle: t('cardOpenScholarshipsSub'),
        to: '/scholarship'
      },
      {
        title: t('cardScholarshipReviews'),
        value: snapshot.metrics.scholarshipReviews,
        subtitle: t('cardScholarshipReviewsSub'),
        to: '/scholarship'
      },
      {
        title: t('cardPublishedEvents'),
        value: snapshot.metrics.publishedEvents,
        subtitle: t('cardPublishedEventsSub'),
        to: '/events'
      },
      {
        title: t('cardPendingBookings'),
        value: snapshot.metrics.pendingBookings,
        subtitle: t('cardPendingBookingsSub'),
        to: '/booking'
      },
      {
        title: t('cardNewInquiries'),
        value: snapshot.metrics.newInquiries,
        subtitle: t('cardNewInquiriesSub'),
        to: '/contact'
      },
      {
        title: t('cardNotifications'),
        value: snapshot.metrics.notifications,
        subtitle: t('cardNotificationsSub'),
        to: '/admin/notifications'
      },
      {
        title: t('cardAuditEntries'),
        value: snapshot.metrics.auditEntries,
        subtitle: t('cardAuditEntriesSub')
      }
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [snapshot.metrics, language]
  );

  return (
    <section>
      <div className="section-head">
        <h1>{t('title')}</h1>
        <div className="action-row">
          <Link to="/admin/notifications" className="btn btn-primary">
            {t('openNotificationCenter')}
          </Link>
          <button type="button" className="btn btn-ghost" onClick={loadDashboard}>
            {t('refresh')}
          </button>
        </div>
      </div>

      {error && <p className="error-text">{error}</p>}
      {message && <p className="meta">{message}</p>}
      {loading && <p>{t('loading')}</p>}

      <div className="feature-grid">
        {cards.map((card) =>
          card.to ? (
            <Link key={card.title} to={card.to} className="feature-card feature-card--link">
              <p className="meta">{card.title}</p>
              <h2>{card.value}</h2>
              <p>{card.subtitle}</p>
            </Link>
          ) : (
            <article key={card.title} className="feature-card">
              <p className="meta">{card.title}</p>
              <h2>{card.value}</h2>
              <p>{card.subtitle}</p>
            </article>
          )
        )}
      </div>

      <div className="insight-grid">
        {canReviewScholarships && snapshot.applicationStats && (
          <article className="surface-card insight-card">
            <div className="section-head section-head-tight">
              <h3>{t('appsByStatus')}</h3>
              <span className="meta">
                {snapshot.applicationStats.total} {t('total')}
              </span>
            </div>

            {snapshot.applicationStats.total === 0 ? (
              <p>{t('noApps')}</p>
            ) : (
              <div className="status-bars">
                {APPLICATION_STATUS_META.map((status) => {
                  const count = snapshot.applicationStats.byStatus[status.key] || 0;
                  const pct = snapshot.applicationStats.total
                    ? Math.round((count / snapshot.applicationStats.total) * 100)
                    : 0;
                  return (
                    <div key={status.key} className="status-bar-row">
                      <span className="status-bar-label">{toLocalizedText(status.label, language)}</span>
                      <span className="status-bar-track">
                        <span
                          className={`status-bar-fill ${status.className}`}
                          style={{ width: `${pct}%` }}
                        />
                      </span>
                      <span className="status-bar-value">{count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </article>
        )}

        <article className="surface-card insight-card">
          <div className="section-head section-head-tight">
            <h3>{t('upcomingDeadlines')}</h3>
            <Link to="/scholarship" className="btn btn-ghost">
              {t('openScholarshipDesk')}
            </Link>
          </div>

          {!snapshot.upcomingDeadlines.length && <p>{t('noDeadlines')}</p>}

          {!!snapshot.upcomingDeadlines.length && (
            <ul className="deadline-list">
              {snapshot.upcomingDeadlines.map((notice) => {
                const days = daysUntil(notice.deadlineAt);
                return (
                  <li key={notice.id} className="deadline-item">
                    <div className="deadline-item__info">
                      <span className="deadline-item__title">
                        {toLocalizedText(notice.title, language)}
                      </span>
                      <span className="meta">{toIsoDate(notice.deadlineAt)}</span>
                    </div>
                    <span className={`deadline-chip ${deadlineUrgencyClass(days)}`}>
                      {deadlineLabel(days)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </article>
      </div>

      {canManageBookings && (
        <article className="surface-card">
          <div className="section-head section-head-tight">
            <h3>{t('pendingQueue')}</h3>
            <Link to="/booking" className="btn btn-ghost">
              {t('openVenueDesk')}
            </Link>
          </div>

          {!snapshot.pendingBookings.length && <p>{t('noPendingBookings')}</p>}

          {!!snapshot.pendingBookings.length && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{t('venue')}</th>
                    <th>{t('requester')}</th>
                    <th>{t('window')}</th>
                    <th>{t('status')}</th>
                    <th>{t('actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.pendingBookings.map((item) => (
                    <tr key={item._id}>
                      <td>{item.venue?.name || t('unknown')}</td>
                      <td>{item.requester?.fullName || t('unknown')}</td>
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
                            {t('approve')}
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => reviewBooking(item._id, 'rejected')}
                          >
                            {t('reject')}
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
            <h3>{t('inquiryQueue')}</h3>
            <Link to="/contact" className="btn btn-ghost">
              {t('openContactDesk')}
            </Link>
          </div>

          {!snapshot.inquiryQueue.length && <p>{t('noInquiries')}</p>}

          {!!snapshot.inquiryQueue.length && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{t('sender')}</th>
                    <th>{t('subject')}</th>
                    <th>{t('messageCol')}</th>
                    <th>{t('created')}</th>
                    <th>{t('actions')}</th>
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
                            {t('inProgress')}
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => updateInquiryStatus(item._id, 'resolved')}
                          >
                            {t('resolve')}
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
          <h3>{t('recentAudit')}</h3>

          {!snapshot.recentAudits.length && <p>{t('noAudits')}</p>}

          {!!snapshot.recentAudits.length && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{t('actor')}</th>
                    <th>{t('actionCol')}</th>
                    <th>{t('entity')}</th>
                    <th>{t('route')}</th>
                    <th>{t('status')}</th>
                    <th>{t('time')}</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.recentAudits.map((item) => (
                    <tr key={item._id}>
                      <td>{item.actor?.fullName || t('system')}</td>
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

      <ConfirmDialog
        isOpen={Boolean(confirmAction)}
        onClose={() => setConfirmAction(null)}
        onConfirm={executeConfirmAction}
        title={confirmAction?.title}
        message={confirmAction?.message}
        confirmLabel={confirmAction?.confirmLabel}
        tone={confirmAction?.tone}
        noteLabel={confirmAction?.noteLabel}
        notePlaceholder={t('notePlaceholder')}
        busy={confirmBusy}
      />
    </section>
  );
}

export default AdminPanelPage;
