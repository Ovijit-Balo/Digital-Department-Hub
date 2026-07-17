import { useCallback, useEffect, useState } from 'react';
import { contactApi } from '../../api/modules';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import InlineAlert from '../../components/ui/InlineAlert';
import SkeletonList from '../../components/ui/SkeletonList';
import { useAuth } from '../../context/AuthContext';
import useRole from '../../hooks/useRole';
import useLanguage from '../../hooks/useLanguage';
import { ui } from '../../i18n/publicUi';
import { getApiErrorMessage } from '../../utils/http';
import { toLocalDateTime, toLocalizedText } from '../../utils/localized';
import { validateInquiryForm } from '../../utils/formValidation';

const T = {
  loadFailed: { en: 'Failed to load inquiries.', bn: 'অনুসন্ধান লোড করতে ব্যর্থ।' },
  loadMineFailed: { en: 'Failed to load your inquiries.', bn: 'আপনার অনুসন্ধান লোড করতে ব্যর্থ।' },
  fixFields: { en: 'Please fix the highlighted inquiry fields.', bn: 'অনুগ্রহ করে চিহ্নিত অনুসন্ধান ক্ষেত্রগুলো ঠিক করুন।' },
  submitFailed: { en: 'Failed to submit inquiry.', bn: 'অনুসন্ধান জমা দিতে ব্যর্থ।' },
  statusUpdated: { en: 'Inquiry status updated successfully.', bn: 'অনুসন্ধানের স্ট্যাটাস সফলভাবে হালনাগাদ হয়েছে।' },
  statusUpdateFailed: { en: 'Failed to update inquiry status.', bn: 'অনুসন্ধানের স্ট্যাটাস হালনাগাদ করতে ব্যর্থ।' },
  noneForFilter: { en: 'No inquiries found for this filter.', bn: 'এই ফিল্টারের জন্য কোনো অনুসন্ধান পাওয়া যায়নি।' },
  sender: { en: 'Sender', bn: 'প্রেরক' },
  subject: { en: 'Subject', bn: 'বিষয়' },
  message: { en: 'Message', bn: 'বার্তা' },
  status: { en: 'Status', bn: 'স্ট্যাটাস' },
  updated: { en: 'Updated', bn: 'হালনাগাদ' },
  actions: { en: 'Actions', bn: 'ক্রিয়া' },
  resolutionNote: { en: 'Resolution Note', bn: 'সমাধান নোট' },
  markNew: { en: 'Mark New', bn: 'নতুন চিহ্নিত করুন' },
  inProgress: { en: 'In Progress', bn: 'চলমান' },
  resolve: { en: 'Resolve', bn: 'সমাধান' },
  dialogTitle: { en: 'Update inquiry status', bn: 'অনুসন্ধানের স্ট্যাটাস হালনাগাদ করুন' },
  dialogUpdate: { en: 'Update', bn: 'হালনাগাদ' },
  dialogNoteLabel: { en: 'Status note (optional)', bn: 'স্ট্যাটাস নোট (ঐচ্ছিক)' },
  dialogNotePlaceholder: { en: 'Add context for this status change', bn: 'এই স্ট্যাটাস পরিবর্তনের জন্য প্রসঙ্গ যোগ করুন' }
};

const STATUS_LABELS = {
  new: { en: 'New', bn: 'নতুন' },
  in_progress: { en: 'In Progress', bn: 'চলমান' },
  resolved: { en: 'Resolved', bn: 'সমাধান হয়েছে' }
};

function ContactPage() {
  const { language } = useLanguage();
  const t = (key) => toLocalizedText(T[key], language);
  const statusLabel = (status) =>
    STATUS_LABELS[status] ? toLocalizedText(STATUS_LABELS[status], language) : status;
  const { isAuthenticated, user } = useAuth();
  const canManageInquiries = useRole('admin', 'manager', 'editor');
  const canViewMyInquiries = isAuthenticated && !canManageInquiries;

  const [loading, setLoading] = useState(false);
  const [myLoading, setMyLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [inquiryFilter, setInquiryFilter] = useState('');
  const [inquiries, setInquiries] = useState([]);
  const [myInquiryFilter, setMyInquiryFilter] = useState('');
  const [myInquiries, setMyInquiries] = useState([]);

  const [inquiryForm, setInquiryForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  useEffect(() => {
    if (!isAuthenticated || !user) {
      return;
    }

    setInquiryForm((prev) => ({
      ...prev,
      name: prev.name || user.fullName || '',
      email: prev.email || user.email || ''
    }));
  }, [isAuthenticated, user]);

  const loadInquiries = useCallback(async () => {
    if (!isAuthenticated || !canManageInquiries) {
      setInquiries([]);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await contactApi.listInquiries({
        status: inquiryFilter || undefined,
        limit: 50
      });
      setInquiries(response.data.items || []);
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, t('loadFailed')));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManageInquiries, inquiryFilter, isAuthenticated, language]);

  useEffect(() => {
    loadInquiries();
  }, [loadInquiries]);

  const loadMyInquiries = useCallback(async () => {
    if (!canViewMyInquiries) {
      setMyInquiries([]);
      return;
    }

    setMyLoading(true);
    setError('');

    try {
      const response = await contactApi.listMyInquiries({
        status: myInquiryFilter || undefined,
        limit: 50
      });
      setMyInquiries(response.data.items || []);
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, t('loadMineFailed')));
    } finally {
      setMyLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canViewMyInquiries, myInquiryFilter, language]);

  useEffect(() => {
    loadMyInquiries();
  }, [loadMyInquiries]);

  const submitInquiry = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');

    const nextErrors = validateInquiryForm(inquiryForm);
    setFormErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setError(t('fixFields'));
      return;
    }

    try {
      const response = await contactApi.submitInquiry(inquiryForm);
      const inquiry = response.data?.inquiry;
      const ref = inquiry?._id ? String(inquiry._id) : '';
      const status = inquiry?.status || 'new';
      const intro = ui('contact', 'successIntro', language);
      const refLabel = ui('contact', 'refLine', language);
      const statusLabel = ui('contact', 'statusLine', language);
      const trackHint = isAuthenticated
        ? ui('contact', 'signedInTrackHint', language)
        : ui('contact', 'guestTrackHint', language);
      setMessage(`${intro} ${refLabel}: ${ref || '—'}. ${statusLabel}: ${status}. ${trackHint}`);
      setInquiryForm({
        name: isAuthenticated ? user?.fullName || '' : '',
        email: isAuthenticated ? user?.email || '' : '',
        subject: '',
        message: ''
      });
      await Promise.all([loadInquiries(), loadMyInquiries()]);
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, t('submitFailed')));
    }
  };

  const [statusTarget, setStatusTarget] = useState(null);
  const [statusBusy, setStatusBusy] = useState(false);

  const updateInquiryStatus = (inquiryId, status) => {
    setStatusTarget({ id: inquiryId, status });
  };

  const confirmInquiryStatus = async (resolutionNote) => {
    if (!statusTarget) {
      return;
    }

    setStatusBusy(true);

    try {
      await contactApi.updateInquiryStatus(statusTarget.id, {
        status: statusTarget.status,
        resolutionNote
      });
      setMessage(t('statusUpdated'));
      setStatusTarget(null);
      await loadInquiries();
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, t('statusUpdateFailed')));
      setStatusTarget(null);
    } finally {
      setStatusBusy(false);
    }
  };

  return (
    <section className="page-wrap">
      <div className="section-head">
        <h1>{ui('contact', 'title', language)}</h1>
        {canManageInquiries && (
          <button type="button" className="btn btn-ghost" onClick={loadInquiries}>
            {ui('contact', 'refreshInquiries', language)}
          </button>
        )}
      </div>

      {error && <InlineAlert type="error">{error}</InlineAlert>}
      {message && <InlineAlert type="info">{message}</InlineAlert>}

      <article className="surface-card">
        <h3>{ui('contact', 'sendTitle', language)}</h3>
        <p className="meta">{ui('contact', 'sendHint', language)}</p>

        <form className="form-grid" onSubmit={submitInquiry}>
          <label>
            {ui('contact', 'name', language)}
            <input
              value={inquiryForm.name}
              onChange={(event) =>
                setInquiryForm((prev) => ({ ...prev, name: event.target.value }))
              }
              required
            />
            {formErrors.name && <span className="error-text">{formErrors.name}</span>}
          </label>

          <label>
            {ui('contact', 'email', language)}
            <input
              type="email"
              value={inquiryForm.email}
              onChange={(event) =>
                setInquiryForm((prev) => ({ ...prev, email: event.target.value }))
              }
              required
            />
            {formErrors.email && <span className="error-text">{formErrors.email}</span>}
          </label>

          <label>
            {ui('contact', 'subject', language)}
            <input
              value={inquiryForm.subject}
              onChange={(event) =>
                setInquiryForm((prev) => ({ ...prev, subject: event.target.value }))
              }
              required
            />
            {formErrors.subject && <span className="error-text">{formErrors.subject}</span>}
          </label>

          <label>
            {ui('contact', 'message', language)}
            <textarea
              minLength={10}
              value={inquiryForm.message}
              onChange={(event) =>
                setInquiryForm((prev) => ({ ...prev, message: event.target.value }))
              }
              required
            />
            {formErrors.message && <span className="error-text">{formErrors.message}</span>}
          </label>

          <button type="submit" className="btn btn-primary">
            {ui('contact', 'submit', language)}
          </button>
        </form>
      </article>

      {canManageInquiries && (
        <article className="surface-card">
          <div className="section-head section-head-tight">
            <h3>{ui('contact', 'inquiryMgmt', language)}</h3>
            <select
              value={inquiryFilter}
              onChange={(event) => setInquiryFilter(event.target.value)}
            >
              <option value="">{ui('contact', 'allStatuses', language)}</option>
              <option value="new">{ui('contact', 'statusNew', language)}</option>
              <option value="in_progress">{ui('contact', 'statusProgress', language)}</option>
              <option value="resolved">{ui('contact', 'statusResolved', language)}</option>
            </select>
          </div>

          {loading && <SkeletonList count={3} lines={3} />}
          {!loading && !inquiries.length && (
            <InlineAlert type="info">{t('noneForFilter')}</InlineAlert>
          )}

          {!!inquiries.length && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{t('sender')}</th>
                    <th>{t('subject')}</th>
                    <th>{t('message')}</th>
                    <th>{t('status')}</th>
                    <th>{t('updated')}</th>
                    <th>{t('actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {inquiries.map((item) => (
                    <tr key={item._id}>
                      <td>
                        <strong>{item.name}</strong>
                        <br />
                        <span className="meta">{item.email}</span>
                      </td>
                      <td>{item.subject}</td>
                      <td>{item.message}</td>
                      <td>
                        <span className={`status-badge status-${item.status}`}>{statusLabel(item.status)}</span>
                      </td>
                      <td>{toLocalDateTime(item.updatedAt)}</td>
                      <td>
                        <div className="inline-actions">
                          <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => updateInquiryStatus(item._id, 'new')}
                          >
                            {t('markNew')}
                          </button>
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

      {canViewMyInquiries && (
        <article className="surface-card">
          <div className="section-head section-head-tight">
            <h3>{ui('contact', 'myInquiries', language)}</h3>
            <button type="button" className="btn btn-ghost" onClick={loadMyInquiries}>
              {ui('home', 'refresh', language)}
            </button>
          </div>

          <div className="action-row">
            <select
              value={myInquiryFilter}
              onChange={(event) => setMyInquiryFilter(event.target.value)}
            >
              <option value="">{ui('contact', 'allStatuses', language)}</option>
              <option value="new">{ui('contact', 'statusNew', language)}</option>
              <option value="in_progress">{ui('contact', 'statusProgress', language)}</option>
              <option value="resolved">{ui('contact', 'statusResolved', language)}</option>
            </select>
          </div>

          {myLoading && <SkeletonList count={2} lines={2} />}
          {!myLoading && !myInquiries.length && (
            <InlineAlert type="info">{ui('contact', 'noMine', language)}</InlineAlert>
          )}

          {!!myInquiries.length && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{t('subject')}</th>
                    <th>{t('status')}</th>
                    <th>{t('updated')}</th>
                    <th>{t('resolutionNote')}</th>
                  </tr>
                </thead>
                <tbody>
                  {myInquiries.map((item) => (
                    <tr key={item._id}>
                      <td>{item.subject}</td>
                      <td>
                        <span className={`status-badge status-${item.status}`}>{statusLabel(item.status)}</span>
                      </td>
                      <td>{toLocalDateTime(item.updatedAt)}</td>
                      <td>{item.resolutionNote || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      )}

      <ConfirmDialog
        isOpen={Boolean(statusTarget)}
        onClose={() => setStatusTarget(null)}
        onConfirm={confirmInquiryStatus}
        title={t('dialogTitle')}
        message={toLocalizedText(
          {
            en: `Mark this inquiry as ${statusTarget ? statusLabel(statusTarget.status) : ''}?`,
            bn: `এই অনুসন্ধানটিকে ${statusTarget ? statusLabel(statusTarget.status) : ''} হিসেবে চিহ্নিত করবেন?`
          },
          language
        )}
        confirmLabel={t('dialogUpdate')}
        tone="primary"
        noteLabel={t('dialogNoteLabel')}
        notePlaceholder={t('dialogNotePlaceholder')}
        busy={statusBusy}
      />
    </section>
  );
}

export default ContactPage;
