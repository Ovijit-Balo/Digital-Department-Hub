import { useCallback, useEffect, useMemo, useState } from 'react';
import { scholarshipApi } from '../../api/modules';
import { useAuth } from '../../context/AuthContext';
import useLanguage from '../../hooks/useLanguage';
import useRole from '../../hooks/useRole';
import { getApiErrorMessage } from '../../utils/http';
import { toIsoDate, toLocalizedText } from '../../utils/localized';

const createEmptyCategory = () => ({
  code: '',
  nameEn: '',
  nameBn: '',
  amount: '',
  slots: 1
});

function ScholarshipPage() {
  const { user, isAuthenticated } = useAuth();
  const { language } = useLanguage();

  const canReview = useRole('admin', 'manager', 'reviewer');
  const canManageNotices = useRole('admin', 'manager', 'editor');
  const canApply = useRole('student');
  const canPostUpdates = useRole('admin', 'manager', 'editor', 'reviewer');
  const canViewManageNotices = canReview || canManageNotices;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [notices, setNotices] = useState([]);
  const [applications, setApplications] = useState([]);
  const [myApplications, setMyApplications] = useState([]);
  const [selectedNoticeId, setSelectedNoticeId] = useState('');

  const [recipients, setRecipients] = useState([]);
  const [recipientInfo, setRecipientInfo] = useState({
    isPublished: false,
    recipientsPublishedAt: null,
    isRestricted: false
  });
  const [noticeUpdates, setNoticeUpdates] = useState([]);
  const [globalUpdates, setGlobalUpdates] = useState([]);

  const [applicationForm, setApplicationForm] = useState({
    statement: '',
    gpa: '',
    department: user?.department || '',
    selectedCategoryCode: ''
  });

  const [noticeForm, setNoticeForm] = useState({
    title: { en: '', bn: '' },
    description: { en: '', bn: '' },
    eligibility: { en: '', bn: '' },
    scholarshipType: 'one_off',
    applicationWindowStart: '',
    applicationWindowEnd: '',
    deadline: '',
    status: 'draft',
    categories: [createEmptyCategory()]
  });

  const [updateForm, setUpdateForm] = useState({
    kind: 'general',
    visibility: 'public',
    title: { en: '', bn: '' },
    body: { en: '', bn: '' }
  });

  const selectedNotice = useMemo(
    () => notices.find((notice) => notice._id === selectedNoticeId) || null,
    [selectedNoticeId, notices]
  );

  const selectedNoticeCategories = useMemo(
    () => selectedNotice?.categories || [],
    [selectedNotice]
  );

  const dashboardStats = useMemo(
    () => ({
      openNotices: notices.filter(
        (notice) => (notice.applicationState || notice.status) === 'open'
      ).length,
      activeCategories: selectedNoticeCategories.length,
      recipientCount: recipients.length,
      reviewCount: canReview
        ? applications.filter((item) => ['submitted', 'under_review'].includes(item.status)).length
        : myApplications.length
    }),
    [applications, canReview, myApplications.length, notices, recipients.length, selectedNoticeCategories.length]
  );

  useEffect(() => {
    if (!selectedNotice) {
      return;
    }

    const selectedStillValid = selectedNoticeCategories.some(
      (category) => category.code === applicationForm.selectedCategoryCode
    );

    if (selectedStillValid) {
      return;
    }

    setApplicationForm((prev) => ({
      ...prev,
      selectedCategoryCode: selectedNoticeCategories[0]?.code || ''
    }));
  }, [applicationForm.selectedCategoryCode, selectedNotice, selectedNoticeCategories]);

  const loadNotices = useCallback(async () => {
    const response = canViewManageNotices
      ? await scholarshipApi.listManageNotices({ limit: 100 })
      : await scholarshipApi.listNotices({ limit: 100 });
    const items = response.data.items || [];
    setNotices(items);

    if (!selectedNoticeId && items.length) {
      setSelectedNoticeId(items[0]._id);
    }

    if (selectedNoticeId && !items.some((item) => item._id === selectedNoticeId)) {
      setSelectedNoticeId(items[0]?._id || '');
    }
  }, [canViewManageNotices, selectedNoticeId]);

  const loadApplications = useCallback(async () => {
    if (!canReview) {
      setApplications([]);
      return;
    }

    const response = await scholarshipApi.listApplications({ limit: 50 });
    setApplications(response.data.items || []);
  }, [canReview]);

  const loadMyApplications = useCallback(async () => {
    if (!isAuthenticated) {
      setMyApplications([]);
      return;
    }

    const response = await scholarshipApi.listMyApplications({ limit: 50 });
    setMyApplications(response.data.items || []);
  }, [isAuthenticated]);

  const loadGlobalUpdates = useCallback(async () => {
    const response = await scholarshipApi.listUpdates({ limit: 8 });
    setGlobalUpdates(response.data.items || []);
  }, []);

  const loadNoticeDetails = useCallback(async () => {
    if (!selectedNoticeId) {
      setRecipients([]);
      setNoticeUpdates([]);
      setRecipientInfo({ isPublished: false, recipientsPublishedAt: null, isRestricted: false });
      return;
    }

    try {
      const recipientsRequest = canReview
        ? scholarshipApi.listManageRecipients(selectedNoticeId, { limit: 100 })
        : scholarshipApi.listRecipients(selectedNoticeId, { limit: 100 });

      const [recipientResult, updatesResult] = await Promise.allSettled([
        recipientsRequest,
        scholarshipApi.listNoticeUpdates(selectedNoticeId, { limit: 20 })
      ]);

      if (recipientResult.status === 'fulfilled') {
        setRecipients(recipientResult.value.data.items || []);
        setRecipientInfo({
          isPublished: Boolean(recipientResult.value.data.isPublished),
          recipientsPublishedAt: recipientResult.value.data.recipientsPublishedAt || null,
          isRestricted: false
        });
      } else {
        setRecipients([]);
        const responseStatus = recipientResult.reason?.response?.status;
        if (responseStatus === 403) {
          setRecipientInfo({
            isPublished: false,
            recipientsPublishedAt: null,
            isRestricted: true
          });
        } else {
          setMessage(
            getApiErrorMessage(
              recipientResult.reason,
              'Failed to load scholarship recipients for this notice.'
            )
          );
        }
      }

      if (updatesResult.status === 'fulfilled') {
        setNoticeUpdates(updatesResult.value.data.items || []);
      } else {
        setNoticeUpdates([]);
        setMessage(
          getApiErrorMessage(updatesResult.reason, 'Failed to load scholarship update timeline.')
        );
      }
    } catch (apiError) {
      setNoticeUpdates([]);
      setRecipients([]);

      const responseStatus = apiError?.response?.status;
      if (responseStatus === 403) {
        setRecipientInfo({
          isPublished: false,
          recipientsPublishedAt: null,
          isRestricted: true
        });
      } else {
        setMessage(getApiErrorMessage(apiError, 'Failed to load scholarship recipients and updates.'));
      }
    }
  }, [canReview, selectedNoticeId]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      await Promise.all([loadNotices(), loadApplications(), loadMyApplications(), loadGlobalUpdates()]);
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Failed to load scholarship information.'));
    } finally {
      setLoading(false);
    }
  }, [loadApplications, loadGlobalUpdates, loadMyApplications, loadNotices]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    loadNoticeDetails();
  }, [loadNoticeDetails]);

  const submitApplication = async (event) => {
    event.preventDefault();
    setMessage('');

    if (!selectedNoticeId) {
      setMessage('Select a scholarship notice first.');
      return;
    }

    if (selectedNoticeCategories.length && !applicationForm.selectedCategoryCode) {
      setMessage('Select a scholarship category before submitting.');
      return;
    }

    try {
      await scholarshipApi.apply(selectedNoticeId, {
        statement: applicationForm.statement,
        gpa: Number(applicationForm.gpa),
        department: applicationForm.department,
        selectedCategoryCode: applicationForm.selectedCategoryCode || undefined,
        documents: []
      });

      setMessage('Application submitted successfully.');
      setApplicationForm((prev) => ({
        ...prev,
        statement: '',
        gpa: ''
      }));

      await loadApplications();
      await loadMyApplications();
      await loadNoticeDetails();
    } catch (apiError) {
      setMessage(getApiErrorMessage(apiError, 'Failed to submit application.'));
    }
  };

  const normalizeNoticeCategories = () => {
    const normalized = noticeForm.categories
      .filter(
        (item) =>
          item.code.trim() &&
          item.nameEn.trim() &&
          item.nameBn.trim() &&
          item.amount !== '' &&
          Number(item.amount) >= 0
      )
      .map((item) => ({
        code: item.code.trim().toLowerCase(),
        name: {
          en: item.nameEn.trim(),
          bn: item.nameBn.trim()
        },
        amount: Number(item.amount),
        slots: Math.max(1, Number(item.slots || 1))
      }));

    if (!normalized.length) {
      return [];
    }

    const codes = new Set();
    for (const item of normalized) {
      if (codes.has(item.code)) {
        throw new Error('Category codes must be unique.');
      }
      codes.add(item.code);
    }

    return normalized;
  };

  const submitNotice = async (event) => {
    event.preventDefault();
    setMessage('');

    try {
      const categories = normalizeNoticeCategories();

      await scholarshipApi.createNotice({
        title: noticeForm.title,
        description: noticeForm.description,
        eligibility: noticeForm.eligibility,
        scholarshipType: noticeForm.scholarshipType,
        applicationWindowStart: new Date(noticeForm.applicationWindowStart).toISOString(),
        applicationWindowEnd: new Date(noticeForm.applicationWindowEnd).toISOString(),
        deadline: new Date(noticeForm.deadline).toISOString(),
        status: noticeForm.status,
        categories
      });

      setMessage('Scholarship notice created successfully.');
      setNoticeForm({
        title: { en: '', bn: '' },
        description: { en: '', bn: '' },
        eligibility: { en: '', bn: '' },
        scholarshipType: 'one_off',
        applicationWindowStart: '',
        applicationWindowEnd: '',
        deadline: '',
        status: 'draft',
        categories: [createEmptyCategory()]
      });
      await loadNotices();
    } catch (apiError) {
      if (apiError instanceof Error && !apiError.response) {
        setMessage(apiError.message);
      } else {
        setMessage(getApiErrorMessage(apiError, 'Failed to create scholarship notice.'));
      }
    }
  };

  const reviewApplication = async (applicationId, status, fallbackCategoryCode = '') => {
    const decisionNote = window.prompt('Decision note (optional):', '') || '';
    let awardedCategoryCode = '';
    let awardedAmount;

    if (status === 'approved') {
      awardedCategoryCode =
        window.prompt(
          'Award category code (optional, leave blank for non-category awards):',
          fallbackCategoryCode || ''
        ) || '';

      const amountRaw = window.prompt('Award amount (optional):', '') || '';
      if (amountRaw.trim()) {
        const parsedAmount = Number(amountRaw);
        if (Number.isNaN(parsedAmount) || parsedAmount < 0) {
          setMessage('Award amount must be a positive number.');
          return;
        }
        awardedAmount = parsedAmount;
      }
    }

    try {
      await scholarshipApi.reviewApplication(applicationId, {
        status,
        decisionNote,
        awardedCategoryCode: awardedCategoryCode || undefined,
        awardedAmount
      });

      setMessage('Application review updated.');
      await loadApplications();
      await loadMyApplications();
      await loadNoticeDetails();
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

  const updateCategoryField = (index, field, value) => {
    setNoticeForm((prev) => ({
      ...prev,
      categories: prev.categories.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const addCategoryRow = () => {
    setNoticeForm((prev) => ({
      ...prev,
      categories: [...prev.categories, createEmptyCategory()]
    }));
  };

  const removeCategoryRow = (index) => {
    setNoticeForm((prev) => {
      const next = prev.categories.filter((_, categoryIndex) => categoryIndex !== index);
      return {
        ...prev,
        categories: next.length ? next : [createEmptyCategory()]
      };
    });
  };

  const updateNoticeStatus = async (status) => {
    if (!selectedNoticeId) {
      return;
    }

    try {
      await scholarshipApi.updateNotice(selectedNoticeId, { status });
      setMessage(`Notice marked as ${status}.`);
      await loadNotices();
      await loadNoticeDetails();
    } catch (apiError) {
      setMessage(getApiErrorMessage(apiError, 'Failed to update scholarship notice status.'));
    }
  };

  const publishRecipients = async (publish) => {
    if (!selectedNoticeId) {
      return;
    }

    try {
      await scholarshipApi.publishRecipients(selectedNoticeId, { publish });
      setMessage(publish ? 'Recipient list published.' : 'Recipient list unpublished.');
      await loadNoticeDetails();
    } catch (apiError) {
      setMessage(getApiErrorMessage(apiError, 'Failed to update recipient publication status.'));
    }
  };

  const updateUpdateFormLocalized = (field, locale, value) => {
    setUpdateForm((prev) => ({
      ...prev,
      [field]: {
        ...prev[field],
        [locale]: value
      }
    }));
  };

  const submitNoticeUpdate = async (event) => {
    event.preventDefault();
    setMessage('');

    if (!selectedNoticeId) {
      setMessage('Select a scholarship notice first.');
      return;
    }

    try {
      await scholarshipApi.createNoticeUpdate(selectedNoticeId, updateForm);
      setMessage('Scholarship update published.');
      setUpdateForm({
        kind: 'general',
        visibility: 'public',
        title: { en: '', bn: '' },
        body: { en: '', bn: '' }
      });

      await loadNoticeDetails();
      await loadGlobalUpdates();
      await loadNotices();
    } catch (apiError) {
      setMessage(getApiErrorMessage(apiError, 'Failed to publish scholarship update.'));
    }
  };

  return (
    <section className="page-wrap">
      <header className="page-title-bar">
        <div>
          <p className="eyebrow">Scholarship Operations</p>
          <h1>Scholarship Desk</h1>
          <p className="page-title-subtitle">
            Manage notices, applications, recipient publication, and scholarship update timelines in one place.
          </p>
        </div>
        <button type="button" className="btn btn-ghost" onClick={loadData}>
          Refresh
        </button>
      </header>

      <section className="kpi-strip" aria-label="Scholarship summary">
        <article className="kpi-card">
          <p className="kpi-label">Open Notices</p>
          <p className="kpi-value">{dashboardStats.openNotices}</p>
          <p className="kpi-note">Active window-aware opportunities</p>
        </article>
        <article className="kpi-card">
          <p className="kpi-label">Notice Categories</p>
          <p className="kpi-value">{dashboardStats.activeCategories}</p>
          <p className="kpi-note">Configured for selected notice</p>
        </article>
        <article className="kpi-card">
          <p className="kpi-label">Recipients Listed</p>
          <p className="kpi-value">{dashboardStats.recipientCount}</p>
          <p className="kpi-note">Visible in current selection</p>
        </article>
        <article className="kpi-card">
          <p className="kpi-label">{canReview ? 'Pending Reviews' : 'My Applications'}</p>
          <p className="kpi-value">{dashboardStats.reviewCount}</p>
          <p className="kpi-note">
            {canReview ? 'Submitted or under review' : 'Submitted in your account'}
          </p>
        </article>
      </section>

      {error && <p className="error-text">{error}</p>}
      {message && <p className="meta">{message}</p>}
      {loading && <p>Loading scholarship data...</p>}

      <div className="workflow-grid workflow-grid-2">
        {!!globalUpdates.length && (
          <article className="surface-card">
            <h3>Scholarship Update Feed</h3>
            <div className="stack-list">
              {globalUpdates.map((item) => (
                <article key={item._id} className="surface-card inner-card">
                  <div className="section-head section-head-tight">
                    <h3>{toLocalizedText(item.title, language)}</h3>
                    <span className={`status-badge status-${item.kind}`}>{item.kind}</span>
                  </div>
                  <p>{toLocalizedText(item.body, language)}</p>
                  <p className="meta">
                    Notice: {toLocalizedText(item.notice?.title, language)} • Posted: {toIsoDate(item.createdAt)}
                  </p>
                </article>
              ))}
            </div>
          </article>
        )}

        <article className="surface-card">
        <div className="section-head section-head-tight">
          <h3>Available Notices</h3>
          <select value={selectedNoticeId} onChange={(event) => setSelectedNoticeId(event.target.value)}>
            <option value="">Select notice</option>
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
            <div className="section-head section-head-tight">
              <h3>{toLocalizedText(selectedNotice.title, language)}</h3>
              <span className={`status-badge status-${selectedNotice.status}`}>
                {selectedNotice.status}
              </span>
            </div>

            <p>{toLocalizedText(selectedNotice.description, language)}</p>
            <p>{toLocalizedText(selectedNotice.eligibility, language)}</p>
            <p className="meta">
              Type: {selectedNotice.scholarshipType || 'one_off'} • Application Window:{' '}
              {toIsoDate(selectedNotice.applicationWindowStart)} to{' '}
              {toIsoDate(selectedNotice.applicationWindowEnd)} • Decision Date: {toIsoDate(selectedNotice.deadline)}
            </p>
            <p className="meta">Live State: {selectedNotice.applicationState || selectedNotice.status}</p>

            {!!selectedNoticeCategories.length && (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Code</th>
                      <th>Amount</th>
                      <th>Slots</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedNoticeCategories.map((category) => (
                      <tr key={category.code}>
                        <td>{toLocalizedText(category.name, language)}</td>
                        <td>{category.code}</td>
                        <td>{category.amount}</td>
                        <td>{category.slots}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {canManageNotices && (
              <div className="inline-actions" style={{ marginTop: '0.7rem' }}>
                <button type="button" className="btn btn-ghost" onClick={() => updateNoticeStatus('open')}>
                  Open Window
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => updateNoticeStatus('closed')}>
                  Close Window
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => updateNoticeStatus('draft')}>
                  Move to Draft
                </button>
              </div>
            )}

            {canReview && (
              <div className="inline-actions" style={{ marginTop: '0.7rem' }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => publishRecipients(!recipientInfo.isPublished)}
                >
                  {recipientInfo.isPublished ? 'Unpublish Recipient List' : 'Publish Recipient List'}
                </button>
              </div>
            )}
          </article>
        )}
        </article>
      </div>

      {isAuthenticated && (
        <div className="workflow-grid workflow-grid-2">
          {canApply && isAuthenticated && (
          <article className="surface-card">
            <h3>Apply for Scholarship</h3>
            <form className="form-grid" onSubmit={submitApplication}>
              {!!selectedNoticeCategories.length && (
                <label>
                  Scholarship Category
                  <select
                    value={applicationForm.selectedCategoryCode}
                    onChange={(event) =>
                      setApplicationForm((prev) => ({ ...prev, selectedCategoryCode: event.target.value }))
                    }
                    required
                  >
                    <option value="">Select category</option>
                    {selectedNoticeCategories.map((category) => (
                      <option key={category.code} value={category.code}>
                        {toLocalizedText(category.name, language)} ({category.code})
                      </option>
                    ))}
                  </select>
                </label>
              )}

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

          <article className="surface-card">
            <h3>My Application Tracker</h3>
            {!myApplications.length && <p>You have not submitted any scholarship applications yet.</p>}
            {!!myApplications.length && (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Notice</th>
                      <th>Category</th>
                      <th>Status</th>
                      <th>Award</th>
                      <th>Submitted</th>
                      <th>Reviewed By</th>
                      <th>Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myApplications.map((item) => (
                      <tr key={item._id}>
                        <td>{toLocalizedText(item.notice?.title, language)}</td>
                        <td>{item.selectedCategoryCode || '-'}</td>
                        <td>
                          <span className={`status-badge status-${item.status}`}>{item.status}</span>
                        </td>
                        <td>
                          {item.awardedAmount ? `${item.awardedAmount} (${item.awardedCategoryCode || 'custom'})` : '-'}
                        </td>
                        <td>{toIsoDate(item.createdAt)}</td>
                        <td>{item.reviewedBy?.fullName || '-'}</td>
                        <td>{item.decisionNote || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>
        </div>
      )}

      {selectedNotice && (
        <div className="workflow-grid workflow-grid-2">
          <article className="surface-card">
            <div className="section-head section-head-tight">
              <h3>Recipient List</h3>
              {recipientInfo.recipientsPublishedAt && (
                <p className="meta">Published: {toIsoDate(recipientInfo.recipientsPublishedAt)}</p>
              )}
            </div>

            {!recipients.length && !recipientInfo.isRestricted && <p>No recipients listed yet.</p>}
            {recipientInfo.isRestricted && !canReview && (
              <p className="meta">Recipient list is not published yet.</p>
            )}

            {!!recipients.length && (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Department</th>
                      <th>Category</th>
                      <th>Award Amount</th>
                      <th>Reviewed At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recipients.map((item) => (
                      <tr key={item._id}>
                        <td>{item.student?.fullName || 'Unknown'}</td>
                        <td>{item.department}</td>
                        <td>{item.awardedCategoryCode || item.selectedCategoryCode || '-'}</td>
                        <td>{item.awardedAmount || '-'}</td>
                        <td>{toIsoDate(item.reviewedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>

          <article className="surface-card">
            <h3>Notice Update Timeline</h3>
            {!noticeUpdates.length && <p>No updates for this notice yet.</p>}
            {!!noticeUpdates.length && (
              <div className="stack-list">
                {noticeUpdates.map((item) => (
                  <article key={item._id} className="surface-card inner-card">
                    <div className="section-head section-head-tight">
                      <h3>{toLocalizedText(item.title, language)}</h3>
                      <span className={`status-badge status-${item.kind}`}>{item.kind}</span>
                    </div>
                    <p>{toLocalizedText(item.body, language)}</p>
                    <p className="meta">
                      {item.visibility} • Posted by {item.postedBy?.fullName || 'System'} • {toIsoDate(item.createdAt)}
                    </p>
                  </article>
                ))}
              </div>
            )}

            {canPostUpdates && (
              <form className="form-grid" onSubmit={submitNoticeUpdate}>
                <label>
                  Update Type
                  <select
                    value={updateForm.kind}
                    onChange={(event) => setUpdateForm((prev) => ({ ...prev, kind: event.target.value }))}
                  >
                    <option value="general">General</option>
                    <option value="deadline">Deadline</option>
                    <option value="recipient">Recipient</option>
                    <option value="announcement">Announcement</option>
                  </select>
                </label>

                <label>
                  Visibility
                  <select
                    value={updateForm.visibility}
                    onChange={(event) =>
                      setUpdateForm((prev) => ({ ...prev, visibility: event.target.value }))
                    }
                  >
                    <option value="public">Public</option>
                    <option value="internal">Internal</option>
                  </select>
                </label>

                <label>
                  Title (EN)
                  <input
                    value={updateForm.title.en}
                    onChange={(event) => updateUpdateFormLocalized('title', 'en', event.target.value)}
                    required
                  />
                </label>

                <label>
                  Title (BN)
                  <input
                    value={updateForm.title.bn}
                    onChange={(event) => updateUpdateFormLocalized('title', 'bn', event.target.value)}
                    required
                  />
                </label>

                <label>
                  Body (EN)
                  <textarea
                    value={updateForm.body.en}
                    onChange={(event) => updateUpdateFormLocalized('body', 'en', event.target.value)}
                    required
                  />
                </label>

                <label>
                  Body (BN)
                  <textarea
                    value={updateForm.body.bn}
                    onChange={(event) => updateUpdateFormLocalized('body', 'bn', event.target.value)}
                    required
                  />
                </label>

                <button type="submit" className="btn btn-primary">
                  Publish Update
                </button>
              </form>
            )}
          </article>
        </div>
      )}

      {(canManageNotices || canReview) && (
        <div className="workflow-grid workflow-grid-2">
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
              Scholarship Type
              <select
                value={noticeForm.scholarshipType}
                onChange={(event) =>
                  setNoticeForm((prev) => ({ ...prev, scholarshipType: event.target.value }))
                }
              >
                <option value="one_off">One-Off</option>
                <option value="monthly">Monthly</option>
              </select>
            </label>

            <label>
              Application Window Start
              <input
                type="date"
                value={noticeForm.applicationWindowStart}
                onChange={(event) =>
                  setNoticeForm((prev) => ({ ...prev, applicationWindowStart: event.target.value }))
                }
                required
              />
            </label>

            <label>
              Application Window End
              <input
                type="date"
                value={noticeForm.applicationWindowEnd}
                onChange={(event) =>
                  setNoticeForm((prev) => ({ ...prev, applicationWindowEnd: event.target.value }))
                }
                required
              />
            </label>

            <label>
              Decision Date
              <input
                type="date"
                value={noticeForm.deadline}
                onChange={(event) => setNoticeForm((prev) => ({ ...prev, deadline: event.target.value }))}
                required
              />
            </label>

            <label>
              Initial Status
              <select
                value={noticeForm.status}
                onChange={(event) => setNoticeForm((prev) => ({ ...prev, status: event.target.value }))}
              >
                <option value="draft">Draft</option>
                <option value="open">Open</option>
                <option value="closed">Closed</option>
              </select>
            </label>

            <div className="surface-card inner-card">
              <div className="section-head section-head-tight">
                <h3>Category Amount Matrix</h3>
                <button type="button" className="btn btn-ghost" onClick={addCategoryRow}>
                  Add Category
                </button>
              </div>

              <div className="stack-list">
                {noticeForm.categories.map((category, index) => (
                  <article key={`${index}-${category.code || 'new'}`} className="surface-card inner-card">
                    <div className="form-grid">
                      <label>
                        Code
                        <input
                          value={category.code}
                          onChange={(event) => updateCategoryField(index, 'code', event.target.value)}
                          placeholder="merit"
                        />
                      </label>
                      <label>
                        Name (EN)
                        <input
                          value={category.nameEn}
                          onChange={(event) => updateCategoryField(index, 'nameEn', event.target.value)}
                        />
                      </label>
                      <label>
                        Name (BN)
                        <input
                          value={category.nameBn}
                          onChange={(event) => updateCategoryField(index, 'nameBn', event.target.value)}
                        />
                      </label>
                      <label>
                        Amount
                        <input
                          type="number"
                          min="0"
                          value={category.amount}
                          onChange={(event) => updateCategoryField(index, 'amount', event.target.value)}
                        />
                      </label>
                      <label>
                        Slots
                        <input
                          type="number"
                          min="1"
                          value={category.slots}
                          onChange={(event) => updateCategoryField(index, 'slots', event.target.value)}
                        />
                      </label>

                      <button type="button" className="btn btn-ghost" onClick={() => removeCategoryRow(index)}>
                        Remove Category
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>

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
                      <th>Category</th>
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
                        <td>{item.selectedCategoryCode || '-'}</td>
                        <td>{item.gpa}</td>
                        <td>{item.status}</td>
                        <td>
                          <div className="inline-actions">
                            <button
                              type="button"
                              className="btn btn-ghost"
                              onClick={() =>
                                reviewApplication(item._id, 'under_review', item.selectedCategoryCode)
                              }
                            >
                              Review
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost"
                              onClick={() => reviewApplication(item._id, 'approved', item.selectedCategoryCode)}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost"
                              onClick={() => reviewApplication(item._id, 'rejected', item.selectedCategoryCode)}
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
        </div>
      )}
    </section>
  );
}

export default ScholarshipPage;
