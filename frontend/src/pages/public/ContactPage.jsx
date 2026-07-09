import { useCallback, useEffect, useState } from 'react';
import { contactApi } from '../../api/modules';
import InlineAlert from '../../components/ui/InlineAlert';
import SkeletonList from '../../components/ui/SkeletonList';
import { useAuth } from '../../context/AuthContext';
import useRole from '../../hooks/useRole';
import useLanguage from '../../hooks/useLanguage';
import { ui } from '../../i18n/publicUi';
import { getApiErrorMessage } from '../../utils/http';
import { toLocalDateTime } from '../../utils/localized';
import { validateInquiryForm } from '../../utils/formValidation';

function ContactPage() {
  const { language } = useLanguage();
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
      setError(getApiErrorMessage(apiError, 'Failed to load inquiries.'));
    } finally {
      setLoading(false);
    }
  }, [canManageInquiries, inquiryFilter, isAuthenticated]);

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
      setError(getApiErrorMessage(apiError, 'Failed to load your inquiries.'));
    } finally {
      setMyLoading(false);
    }
  }, [canViewMyInquiries, myInquiryFilter]);

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
      setError('Please fix the highlighted inquiry fields.');
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
      setError(getApiErrorMessage(apiError, 'Failed to submit inquiry.'));
    }
  };

  const updateInquiryStatus = async (inquiryId, status) => {
    const resolutionNote = window.prompt('Add a status note (optional):', '') || '';

    try {
      await contactApi.updateInquiryStatus(inquiryId, {
        status,
        resolutionNote
      });
      setMessage('Inquiry status updated successfully.');
      await loadInquiries();
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Failed to update inquiry status.'));
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
            <InlineAlert type="info">No inquiries found for this filter.</InlineAlert>
          )}

          {!!inquiries.length && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Sender</th>
                    <th>Subject</th>
                    <th>Message</th>
                    <th>Status</th>
                    <th>Updated</th>
                    <th>Actions</th>
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
                        <span className={`status-badge status-${item.status}`}>{item.status}</span>
                      </td>
                      <td>{toLocalDateTime(item.updatedAt)}</td>
                      <td>
                        <div className="inline-actions">
                          <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => updateInquiryStatus(item._id, 'new')}
                          >
                            Mark New
                          </button>
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
                    <th>Subject</th>
                    <th>Status</th>
                    <th>Updated</th>
                    <th>Resolution Note</th>
                  </tr>
                </thead>
                <tbody>
                  {myInquiries.map((item) => (
                    <tr key={item._id}>
                      <td>{item.subject}</td>
                      <td>
                        <span className={`status-badge status-${item.status}`}>{item.status}</span>
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
    </section>
  );
}

export default ContactPage;
