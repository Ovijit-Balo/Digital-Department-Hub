import { useCallback, useEffect, useMemo, useState } from 'react';
import { scholarshipApi } from '../../api/modules';
import { useAuth } from '../../context/AuthContext';
import useLanguage from '../../hooks/useLanguage';
import useRole from '../../hooks/useRole';
import { getApiErrorMessage } from '../../utils/http';
import { toIsoDate, toLocalizedText } from '../../utils/localized';

function ScholarshipPage() {
  const { user, isAuthenticated } = useAuth();
  const { language } = useLanguage();
  const canReview = useRole('admin', 'manager', 'reviewer');
  const canManageNotices = useRole('admin', 'manager', 'editor');
  const canApply = useRole('student', 'admin');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notices, setNotices] = useState([]);
  const [applications, setApplications] = useState([]);
  const [selectedNoticeId, setSelectedNoticeId] = useState('');
  const [message, setMessage] = useState('');

  const [applicationForm, setApplicationForm] = useState({
    statement: '',
    gpa: '',
    department: user?.department || ''
  });

  const [noticeForm, setNoticeForm] = useState({
    title: { en: '', bn: '' },
    description: { en: '', bn: '' },
    eligibility: { en: '', bn: '' },
    deadline: '',
    status: 'open'
  });

  const selectedNotice = useMemo(
    () => notices.find((notice) => notice._id === selectedNoticeId) || null,
    [selectedNoticeId, notices]
  );

  const loadNotices = useCallback(async () => {
    const response = await scholarshipApi.listNotices({ limit: 50 });
    const items = response.data.items || [];
    setNotices(items);

    if (!selectedNoticeId && items.length) {
      setSelectedNoticeId(items[0]._id);
    }
  }, [selectedNoticeId]);

  const loadApplications = useCallback(async () => {
    if (!canReview) {
      setApplications([]);
      return;
    }

    const response = await scholarshipApi.listApplications({ limit: 25 });
    setApplications(response.data.items || []);
  }, [canReview]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      await Promise.all([loadNotices(), loadApplications()]);
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Failed to load scholarship information.'));
    } finally {
      setLoading(false);
    }
  }, [loadApplications, loadNotices]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const submitApplication = async (event) => {
    event.preventDefault();
    setMessage('');

    if (!selectedNoticeId) {
      setMessage('Select a scholarship notice first.');
      return;
    }

    try {
      await scholarshipApi.apply(selectedNoticeId, {
        statement: applicationForm.statement,
        gpa: Number(applicationForm.gpa),
        department: applicationForm.department,
        documents: []
      });
      setMessage('Application submitted successfully.');
      setApplicationForm((prev) => ({
        ...prev,
        statement: '',
        gpa: ''
      }));
      await loadApplications();
    } catch (apiError) {
      setMessage(getApiErrorMessage(apiError, 'Failed to submit application.'));
    }
  };

  const submitNotice = async (event) => {
    event.preventDefault();
    setMessage('');

    try {
      await scholarshipApi.createNotice(noticeForm);
      setMessage('Scholarship notice created successfully.');
      setNoticeForm({
        title: { en: '', bn: '' },
        description: { en: '', bn: '' },
        eligibility: { en: '', bn: '' },
        deadline: '',
        status: 'open'
      });
      await loadNotices();
    } catch (apiError) {
      setMessage(getApiErrorMessage(apiError, 'Failed to create scholarship notice.'));
    }
  };

  const reviewApplication = async (applicationId, status) => {
    const decisionNote = window.prompt('Decision note (optional):', '') || '';

    try {
      await scholarshipApi.reviewApplication(applicationId, { status, decisionNote });
      setMessage('Application review updated.');
      await loadApplications();
    } catch (apiError) {
      setMessage(getApiErrorMessage(apiError, 'Failed to update review status.'));
    }
  };

  const exportCsv = async () => {
    if (!selectedNoticeId) {
      setMessage('Select a notice before export.');
      return;
    }

    try {
      const response = await scholarshipApi.exportApplications({ noticeId: selectedNoticeId });
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `scholarship-applications-${selectedNoticeId}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
      setMessage('CSV export downloaded.');
    } catch (apiError) {
      setMessage(getApiErrorMessage(apiError, 'Failed to export applications.'));
    }
  };

  const updateNoticeLocalized = (field, locale, value) => {
    setNoticeForm((prev) => ({
      ...prev,
      [field]: {
        ...prev[field],
        [locale]: value
      }
    }));
  };

  return (
    <section className="page-wrap">
      <div className="section-head">
        <h1>Scholarship Desk</h1>
        <button type="button" className="btn btn-ghost" onClick={loadData}>
          Refresh
        </button>
      </div>

      {error && <p className="error-text">{error}</p>}
      {message && <p className="meta">{message}</p>}

      {loading && <p>Loading scholarship data...</p>}

      <article className="surface-card">
        <div className="section-head section-head-tight">
          <h3>Available Notices</h3>
          <select
            value={selectedNoticeId}
            onChange={(event) => setSelectedNoticeId(event.target.value)}
          >
            {notices.map((notice) => (
              <option key={notice._id} value={notice._id}>
                {toLocalizedText(notice.title, language)}
              </option>
            ))}
          </select>
        </div>

        {!notices.length && <p>No scholarship notices yet.</p>}

        {selectedNotice && (
          <article className="surface-card inner-card">
            <h3>{toLocalizedText(selectedNotice.title, language)}</h3>
            <p>{toLocalizedText(selectedNotice.description, language)}</p>
            <p>{toLocalizedText(selectedNotice.eligibility, language)}</p>
            <p className="meta">
              Deadline: {toIsoDate(selectedNotice.deadline)} • Status: {selectedNotice.status}
            </p>
          </article>
        )}
      </article>

      {canApply && isAuthenticated && (
        <article className="surface-card">
          <h3>Apply for Scholarship</h3>
          <form className="form-grid" onSubmit={submitApplication}>
            <label>
              Statement of Purpose
              <textarea
                minLength={30}
                value={applicationForm.statement}
                onChange={(event) =>
                  setApplicationForm((prev) => ({ ...prev, statement: event.target.value }))
                }
                required
              />
            </label>

            <label>
              GPA
              <input
                type="number"
                step="0.01"
                min="0"
                max="4"
                value={applicationForm.gpa}
                onChange={(event) =>
                  setApplicationForm((prev) => ({ ...prev, gpa: event.target.value }))
                }
                required
              />
            </label>

            <label>
              Department
              <input
                value={applicationForm.department}
                onChange={(event) =>
                  setApplicationForm((prev) => ({ ...prev, department: event.target.value }))
                }
                required
              />
            </label>

            <button type="submit" className="btn btn-primary">
              Submit Application
            </button>
          </form>
        </article>
      )}

      {canManageNotices && (
        <article className="surface-card">
          <h3>Publish Scholarship Notice</h3>
          <form className="form-grid" onSubmit={submitNotice}>
            <label>
              Title (EN)
              <input
                value={noticeForm.title.en}
                onChange={(event) => updateNoticeLocalized('title', 'en', event.target.value)}
                required
              />
            </label>
            <label>
              Title (BN)
              <input
                value={noticeForm.title.bn}
                onChange={(event) => updateNoticeLocalized('title', 'bn', event.target.value)}
                required
              />
            </label>
            <label>
              Description (EN)
              <textarea
                value={noticeForm.description.en}
                onChange={(event) => updateNoticeLocalized('description', 'en', event.target.value)}
                required
              />
            </label>
            <label>
              Description (BN)
              <textarea
                value={noticeForm.description.bn}
                onChange={(event) => updateNoticeLocalized('description', 'bn', event.target.value)}
                required
              />
            </label>
            <label>
              Eligibility (EN)
              <textarea
                value={noticeForm.eligibility.en}
                onChange={(event) => updateNoticeLocalized('eligibility', 'en', event.target.value)}
                required
              />
            </label>
            <label>
              Eligibility (BN)
              <textarea
                value={noticeForm.eligibility.bn}
                onChange={(event) => updateNoticeLocalized('eligibility', 'bn', event.target.value)}
                required
              />
            </label>
            <label>
              Deadline
              <input
                type="date"
                value={noticeForm.deadline}
                onChange={(event) =>
                  setNoticeForm((prev) => ({ ...prev, deadline: event.target.value }))
                }
                required
              />
            </label>
            <label>
              Status
              <select
                value={noticeForm.status}
                onChange={(event) =>
                  setNoticeForm((prev) => ({ ...prev, status: event.target.value }))
                }
              >
                <option value="draft">Draft</option>
                <option value="open">Open</option>
                <option value="closed">Closed</option>
              </select>
            </label>

            <button type="submit" className="btn btn-primary">
              Publish Notice
            </button>
          </form>
        </article>
      )}

      {canReview && (
        <article className="surface-card">
          <div className="section-head section-head-tight">
            <h3>Review Queue</h3>
            <button type="button" className="btn btn-ghost" onClick={exportCsv}>
              Export CSV
            </button>
          </div>

          {!applications.length && <p>No applications to review.</p>}
          {!!applications.length && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Notice</th>
                    <th>GPA</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map((item) => (
                    <tr key={item._id}>
                      <td>{item.student?.fullName || 'Unknown'}</td>
                      <td>{toLocalizedText(item.notice?.title, language)}</td>
                      <td>{item.gpa}</td>
                      <td>{item.status}</td>
                      <td>
                        <div className="inline-actions">
                          <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => reviewApplication(item._id, 'under_review')}
                          >
                            Review
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => reviewApplication(item._id, 'approved')}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => reviewApplication(item._id, 'rejected')}
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
    </section>
  );
}

export default ScholarshipPage;
