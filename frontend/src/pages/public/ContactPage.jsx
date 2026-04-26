import { useCallback, useEffect, useState } from 'react';
import { contactApi } from '../../api/modules';
import { useAuth } from '../../context/AuthContext';
import useRole from '../../hooks/useRole';
import { getApiErrorMessage } from '../../utils/http';
import { toLocalDateTime } from '../../utils/localized';

function ContactPage() {
  const { isAuthenticated } = useAuth();
  const canManageInquiries = useRole('admin', 'manager', 'editor');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [inquiryFilter, setInquiryFilter] = useState('');
  const [inquiries, setInquiries] = useState([]);

  const [inquiryForm, setInquiryForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

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

  const submitInquiry = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');

    try {
      await contactApi.submitInquiry(inquiryForm);
      setMessage('Your inquiry has been submitted. The department team will review it soon.');
      setInquiryForm({
        name: '',
        email: '',
        subject: '',
        message: ''
      });
      await loadInquiries();
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
        <h1>Contact Desk</h1>
        {canManageInquiries && (
          <button type="button" className="btn btn-ghost" onClick={loadInquiries}>
            Refresh Inquiries
          </button>
        )}
      </div>

      {error && <p className="error-text">{error}</p>}
      {message && <p className="meta">{message}</p>}

      <article className="surface-card">
        <h3>Send an Inquiry</h3>
        <p className="meta">
          Share your question or request with the department office. Required fields are marked by
          validation at submission.
        </p>

        <form className="form-grid" onSubmit={submitInquiry}>
          <label>
            Name
            <input
              value={inquiryForm.name}
              onChange={(event) =>
                setInquiryForm((prev) => ({ ...prev, name: event.target.value }))
              }
              required
            />
          </label>

          <label>
            Email
            <input
              type="email"
              value={inquiryForm.email}
              onChange={(event) =>
                setInquiryForm((prev) => ({ ...prev, email: event.target.value }))
              }
              required
            />
          </label>

          <label>
            Subject
            <input
              value={inquiryForm.subject}
              onChange={(event) =>
                setInquiryForm((prev) => ({ ...prev, subject: event.target.value }))
              }
              required
            />
          </label>

          <label>
            Message
            <textarea
              minLength={10}
              value={inquiryForm.message}
              onChange={(event) =>
                setInquiryForm((prev) => ({ ...prev, message: event.target.value }))
              }
              required
            />
          </label>

          <button type="submit" className="btn btn-primary">
            Submit Inquiry
          </button>
        </form>
      </article>

      {canManageInquiries && (
        <article className="surface-card">
          <div className="section-head section-head-tight">
            <h3>Inquiry Management</h3>
            <select
              value={inquiryFilter}
              onChange={(event) => setInquiryFilter(event.target.value)}
            >
              <option value="">All statuses</option>
              <option value="new">New</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>

          {loading && <p>Loading inquiries...</p>}
          {!loading && !inquiries.length && <p>No inquiries found for this filter.</p>}

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
    </section>
  );
}

export default ContactPage;
