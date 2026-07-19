import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { bookingApi, contactApi, notificationApi, scholarshipApi, workqueueApi } from '../../api/modules';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import useLanguage from '../../hooks/useLanguage';
import { getApiErrorMessage } from '../../utils/http';
import { toLocalDateTime, toLocalizedText } from '../../utils/localized';

const T = {
  title: { en: 'Staff Dashboard', bn: 'স্টাফ ড্যাশবোর্ড' },
  refresh: { en: 'Refresh', bn: 'রিফ্রেশ' },
  lead: {
    en: 'Operational workspace for daily service desk responsibilities and departmental response queues.',
    bn: 'দৈনন্দিন সার্ভিস ডেস্ক দায়িত্ব ও বিভাগীয় প্রতিক্রিয়া সারির জন্য অপারেশনাল ওয়ার্কস্পেস।'
  },
  loading: { en: 'Loading staff workspace...', bn: 'স্টাফ ওয়ার্কস্পেস লোড হচ্ছে...' },
  quickActions: { en: 'Staff Quick Actions', bn: 'স্টাফ দ্রুত পদক্ষেপ' },
  openVenueDesk: { en: 'Open Venue Desk', bn: 'ভেন্যু ডেস্ক খুলুন' },
  openContactDesk: { en: 'Open Contact Desk', bn: 'যোগাযোগ ডেস্ক খুলুন' },
  openScholarshipDesk: { en: 'Open Scholarship Desk', bn: 'বৃত্তি ডেস্ক খুলুন' },
  openNotificationCenter: { en: 'Open Notification Center', bn: 'নোটিফিকেশন সেন্টার খুলুন' },
  pendingQueue: { en: 'Pending Booking Queue', bn: 'অপেক্ষমাণ বুকিং সারি' },
  noPendingBookings: { en: 'No pending venue requests.', bn: 'কোনো অপেক্ষমাণ ভেন্যু অনুরোধ নেই।' },
  venue: { en: 'Venue', bn: 'ভেন্যু' },
  requester: { en: 'Requester', bn: 'অনুরোধকারী' },
  window: { en: 'Window', bn: 'সময়সীমা' },
  status: { en: 'Status', bn: 'অবস্থা' },
  actions: { en: 'Actions', bn: 'পদক্ষেপ' },
  unknown: { en: 'Unknown', bn: 'অজানা' },
  approve: { en: 'Approve', bn: 'অনুমোদন' },
  reject: { en: 'Reject', bn: 'প্রত্যাখ্যান' },
  ownRequestNote: {
    en: 'Your own request — another reviewer must decide',
    bn: 'আপনার নিজের অনুরোধ — অন্য পর্যালোচককে সিদ্ধান্ত নিতে হবে'
  },
  inquiryQueue: { en: 'New Inquiry Queue', bn: 'নতুন জিজ্ঞাসা সারি' },
  noInquiries: { en: 'No new inquiries at the moment.', bn: 'এই মুহূর্তে কোনো নতুন জিজ্ঞাসা নেই।' },
  sender: { en: 'Sender', bn: 'প্রেরক' },
  subject: { en: 'Subject', bn: 'বিষয়' },
  created: { en: 'Created', bn: 'তৈরি' },
  inProgress: { en: 'In Progress', bn: 'চলমান' },
  resolve: { en: 'Resolve', bn: 'সমাধান' },
  // cards
  cardPendingBookings: { en: 'Pending Bookings', bn: 'অপেক্ষমাণ বুকিং' },
  cardPendingBookingsSub: { en: 'Venue requests waiting for staff decision', bn: 'স্টাফ সিদ্ধান্তের অপেক্ষায় ভেন্যু অনুরোধ' },
  cardNewInquiries: { en: 'New Inquiries', bn: 'নতুন জিজ্ঞাসা' },
  cardNewInquiriesSub: { en: 'Contact form submissions requiring attention', bn: 'মনোযোগ প্রয়োজন এমন যোগাযোগ ফর্ম জমা' },
  cardScholarshipSubmissions: { en: 'Scholarship Submissions', bn: 'বৃত্তি জমা' },
  cardScholarshipSubmissionsSub: { en: 'Applications currently in submitted state', bn: 'বর্তমানে জমা অবস্থায় থাকা আবেদন' },
  cardQueuedNotifications: { en: 'Queued Notifications', bn: 'সারিবদ্ধ বিজ্ঞপ্তি' },
  cardQueuedNotificationsSub: { en: 'Dispatch items still awaiting delivery', bn: 'ডেলিভারির অপেক্ষায় থাকা ডিসপ্যাচ আইটেম' },
  // confirm dialogs
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
  confirm: { en: 'Confirm', bn: 'নিশ্চিত করুন' },
  notePlaceholder: { en: 'Visible to the requester alongside the decision', bn: 'সিদ্ধান্তের সাথে অনুরোধকারীর কাছে দৃশ্যমান' },
  // toasts / messages
  bookingApproved: { en: 'Booking approved successfully.', bn: 'বুকিং সফলভাবে অনুমোদিত।' },
  bookingRejected: { en: 'Booking rejected successfully.', bn: 'বুকিং সফলভাবে প্রত্যাখ্যাত।' },
  bookingUpdated: { en: 'Booking updated', bn: 'বুকিং আপডেট হয়েছে' },
  inquiryUpdatedMsg: { en: 'Inquiry status updated successfully.', bn: 'জিজ্ঞাসার অবস্থা সফলভাবে আপডেট হয়েছে।' },
  inquiryUpdated: { en: 'Inquiry updated', bn: 'জিজ্ঞাসা আপডেট হয়েছে' },
  actionFailedMsg: { en: 'Failed to complete the action.', bn: 'পদক্ষেপটি সম্পন্ন করা যায়নি।' },
  actionFailed: { en: 'Action failed', bn: 'পদক্ষেপ ব্যর্থ' },
  msgLoadFailed: { en: 'Failed to load staff dashboard.', bn: 'স্টাফ ড্যাশবোর্ড লোড করতে ব্যর্থ।' },
  // unified priority queue
  priorityQueue: { en: 'Priority Action Queue', bn: 'অগ্রাধিকার কর্ম সারি' },
  priorityQueueSub: {
    en: 'Everything waiting on you, oldest and most overdue first.',
    bn: 'আপনার সিদ্ধান্তের অপেক্ষায় থাকা সবকিছু, পুরনো ও সর্বাধিক বিলম্বিত আগে।'
  },
  queueEmpty: { en: 'You are all caught up. Nothing is waiting.', bn: 'সব কাজ সম্পন্ন। কিছুই অপেক্ষমাণ নেই।' },
  overdueLabel: { en: 'overdue', bn: 'বিলম্বিত' },
  warningLabel: { en: 'aging', bn: 'পুরনো হচ্ছে' },
  item: { en: 'Item', bn: 'আইটেম' },
  type: { en: 'Type', bn: 'ধরন' },
  age: { en: 'Waiting', bn: 'অপেক্ষা' },
  open: { en: 'Open', bn: 'খুলুন' },
  kindBooking: { en: 'Booking', bn: 'বুকিং' },
  kindInquiry: { en: 'Inquiry', bn: 'জিজ্ঞাসা' },
  kindScholarship: { en: 'Scholarship', bn: 'বৃত্তি' },
  ageDays: { en: 'd', bn: 'দি' },
  ageHours: { en: 'h', bn: 'ঘ' },
  overdueSummary: { en: 'overdue', bn: 'বিলম্বিত' },
  agingSummary: { en: 'aging', bn: 'পুরনো' }
};

function StaffDashboardPage() {
  const { language } = useLanguage();
  const t = (key) => toLocalizedText(T[key], language);
  const { success, error: toastError, info } = useToast();
  const { user } = useAuth();

  // The API rejects self-approval (separation of duties), so don't offer the
  // decision buttons on a request this user raised themselves. Note the shapes
  // differ: the signed-in user carries `id`, populated requesters carry `_id`.
  const isOwnRequest = (booking) =>
    Boolean(user?.id) && String(booking.requester?._id || '') === String(user.id);

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
  const [queue, setQueue] = useState({ items: [], summary: { total: 0, overdue: 0, warning: 0 } });

  const cards = useMemo(
    () => [
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
        title: t('cardScholarshipSubmissions'),
        value: snapshot.metrics.submittedScholarships,
        subtitle: t('cardScholarshipSubmissionsSub'),
        to: '/scholarship'
      },
      {
        title: t('cardQueuedNotifications'),
        value: snapshot.metrics.queuedNotifications,
        subtitle: t('cardQueuedNotificationsSub'),
        to: '/admin/notifications'
      }
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [snapshot.metrics, language]
  );

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [
        bookingsResponse,
        inquiriesResponse,
        scholarshipResponse,
        notificationsResponse,
        queueResponse
      ] = await Promise.all([
        bookingApi.listBookings({ status: 'pending', page: 1, limit: 5 }),
        contactApi.listInquiries({ status: 'new', page: 1, limit: 5 }),
        scholarshipApi.listApplications({ status: 'submitted', page: 1, limit: 1 }),
        notificationApi.listNotifications({ status: 'queued', page: 1, limit: 1 }),
        // The unified queue is the centrepiece; degrade gracefully if it fails.
        workqueueApi.getStaffQueue().catch(() => ({ data: { items: [], summary: { total: 0, overdue: 0, warning: 0 } } }))
      ]);

      setQueue(queueResponse.data || { items: [], summary: { total: 0, overdue: 0, warning: 0 } });
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
      setError(getApiErrorMessage(apiError, t('msgLoadFailed')));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Queue decisions run through the shared confirm dialog (with an optional
  // note relayed to the requester), mirroring the admin dashboard pattern.
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
        success(confirmAction.status === 'approved' ? t('bookingApproved') : t('bookingRejected'), {
          title: t('bookingUpdated')
        });
      } else {
        await contactApi.updateInquiryStatus(confirmAction.id, {
          status: confirmAction.status,
          resolutionNote: note
        });
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

  const kindLabel = (kind) => {
    if (kind === 'booking') return t('kindBooking');
    if (kind === 'inquiry') return t('kindInquiry');
    if (kind === 'scholarship') return t('kindScholarship');
    return kind;
  };

  // Compact "waiting" label: days once past a day old, otherwise hours.
  const ageLabel = (queueItem) =>
    queueItem.ageDays >= 1 ? `${queueItem.ageDays}${t('ageDays')}` : `${queueItem.ageHours}${t('ageHours')}`;

  return (
    <section>
      <div className="section-head">
        <h1>{t('title')}</h1>
        <button type="button" className="btn btn-ghost" onClick={loadDashboard}>
          {t('refresh')}
        </button>
      </div>

      <p className="meta">{t('lead')}</p>

      {error && <p className="error-text">{error}</p>}
      {loading && <p>{t('loading')}</p>}

      <div className="feature-grid">
        {cards.map((card) => (
          <Link key={card.title} to={card.to} className="feature-card feature-card--link">
            <p className="meta">{card.title}</p>
            <h2>{card.value}</h2>
            <p>{card.subtitle}</p>
          </Link>
        ))}
      </div>

      <article className="surface-card">
        <div className="section-head">
          <div>
            <h3>{t('priorityQueue')}</h3>
            <p className="meta">{t('priorityQueueSub')}</p>
          </div>
          {(queue.summary.overdue > 0 || queue.summary.warning > 0) && (
            <div className="inline-actions">
              {queue.summary.overdue > 0 && (
                <span className="status-badge status-rejected">
                  {queue.summary.overdue} {t('overdueSummary')}
                </span>
              )}
              {queue.summary.warning > 0 && (
                <span className="status-badge status-pending">
                  {queue.summary.warning} {t('agingSummary')}
                </span>
              )}
            </div>
          )}
        </div>

        {!queue.items.length && <p>{t('queueEmpty')}</p>}

        {!!queue.items.length && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t('type')}</th>
                  <th>{t('item')}</th>
                  <th>{t('requester')}</th>
                  <th>{t('age')}</th>
                  <th>{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {queue.items.map((queueItem) => (
                  <tr key={`${queueItem.kind}-${queueItem.id}`}>
                    <td>
                      <span className="status-badge">{kindLabel(queueItem.kind)}</span>
                    </td>
                    <td>{queueItem.title}</td>
                    <td>{queueItem.requester}</td>
                    <td>
                      <span
                        className={
                          queueItem.severity === 'overdue'
                            ? 'status-badge status-rejected'
                            : queueItem.severity === 'warning'
                              ? 'status-badge status-pending'
                              : 'meta'
                        }
                      >
                        {ageLabel(queueItem)}
                        {queueItem.severity === 'overdue' ? ` · ${t('overdueLabel')}` : ''}
                        {queueItem.severity === 'warning' ? ` · ${t('warningLabel')}` : ''}
                      </span>
                    </td>
                    <td>
                      <Link to={queueItem.actionPath} className="btn btn-ghost">
                        {t('open')}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>

      <article className="surface-card">
        <h3>{t('quickActions')}</h3>
        <div className="action-row">
          <Link to="/booking" className="btn btn-primary">
            {t('openVenueDesk')}
          </Link>
          <Link to="/contact" className="btn btn-primary">
            {t('openContactDesk')}
          </Link>
          <Link to="/scholarship" className="btn btn-primary">
            {t('openScholarshipDesk')}
          </Link>
          <Link to="/admin/notifications" className="btn btn-primary">
            {t('openNotificationCenter')}
          </Link>
        </div>
      </article>

      <article className="surface-card">
        <h3>{t('pendingQueue')}</h3>
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
                      {isOwnRequest(item) ? (
                        <span className="meta">{t('ownRequestNote')}</span>
                      ) : (
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
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>

      <article className="surface-card">
        <h3>{t('inquiryQueue')}</h3>
        {!snapshot.newInquiries.length && <p>{t('noInquiries')}</p>}

        {!!snapshot.newInquiries.length && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t('sender')}</th>
                  <th>{t('subject')}</th>
                  <th>{t('created')}</th>
                  <th>{t('actions')}</th>
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

      <ConfirmDialog
        isOpen={Boolean(confirmAction)}
        onClose={() => setConfirmAction(null)}
        onConfirm={executeConfirmAction}
        title={confirmAction?.title || ''}
        message={confirmAction?.message || ''}
        confirmLabel={confirmAction?.confirmLabel || t('confirm')}
        tone={confirmAction?.tone || 'primary'}
        noteLabel={confirmAction?.noteLabel || ''}
        notePlaceholder={t('notePlaceholder')}
        busy={confirmBusy}
      />
    </section>
  );
}

export default StaffDashboardPage;
