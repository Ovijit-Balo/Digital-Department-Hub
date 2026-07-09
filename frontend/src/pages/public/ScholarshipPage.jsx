import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { scholarshipApi } from '../../api/modules';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import useLanguage from '../../hooks/useLanguage';
import useRole from '../../hooks/useRole';
import CollapsibleSection from '../../components/ui/CollapsibleSection';
import ReviewModal from '../../features/scholarship/components/ReviewModal';
import { ui } from '../../i18n/publicUi';
import { getApiErrorMessage } from '../../utils/http';
import { toIsoDate, toLocalizedText } from '../../utils/localized';

const createEmptyCategory = () => ({
  code: '',
  nameEn: '',
  nameBn: '',
  amount: '',
  slots: 1
});

function sortByDateDesc(list, field) {
  return [...list].sort((left, right) => {
    const leftTime = new Date(left?.[field] || 0).getTime();
    const rightTime = new Date(right?.[field] || 0).getTime();

    return rightTime - leftTime;
  });
}

function sortByDeadlineThenTitle(list) {
  return [...list].sort((left, right) => {
    const leftState = left.applicationState || left.status || '';
    const rightState = right.applicationState || right.status || '';
    const leftPriority = leftState === 'open' ? 0 : 1;
    const rightPriority = rightState === 'open' ? 0 : 1;

    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }

    const leftDeadline = new Date(left.deadline || left.applicationWindowEnd || 0).getTime();
    const rightDeadline = new Date(right.deadline || right.applicationWindowEnd || 0).getTime();

    if (leftDeadline !== rightDeadline) {
      return leftDeadline - rightDeadline;
    }

    return (toLocalizedText(left.title, 'en') || '').localeCompare(
      toLocalizedText(right.title, 'en') || ''
    );
  });
}

function ScholarshipPage() {
  const { user, isAuthenticated } = useAuth();
  const { language } = useLanguage();
  const { success, error: toastError, info } = useToast();

  const canReview = useRole('admin', 'manager', 'reviewer');
  const canManageNotices = useRole('admin', 'manager', 'editor');
  const canApply = useRole('student', 'reviewer');
  const canPostUpdates = useRole('admin', 'manager', 'editor', 'reviewer');
  const canViewManageNotices = canReview || canManageNotices;

  const [reviewModal, setReviewModal] = useState({
    isOpen: false,
    applicationId: '',
    currentStatus: 'submitted',
    fallbackCategoryCode: '',
    initialStatus: 'under_review',
    categories: []
  });

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
  const [applicationDrafts, setApplicationDrafts] = useState({});

  const [applicationForm, setApplicationForm] = useState({
    statement: '',
    gpa: '',
    department: user?.department || '',
    selectedCategoryCode: ''
  });

  const lastNoticeIdRef = useRef('');
  const lastEditNoticeIdRef = useRef('');

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

  const [editNoticeForm, setEditNoticeForm] = useState({
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

  const orderedNotices = useMemo(() => sortByDeadlineThenTitle(notices), [notices]);
  const orderedApplications = useMemo(
    () => sortByDateDesc(applications, 'createdAt'),
    [applications]
  );
  const orderedMyApplications = useMemo(
    () => sortByDateDesc(myApplications, 'createdAt'),
    [myApplications]
  );
  const orderedRecipients = useMemo(() => sortByDateDesc(recipients, 'reviewedAt'), [recipients]);
  const orderedGlobalUpdates = useMemo(
    () => sortByDateDesc(globalUpdates, 'createdAt'),
    [globalUpdates]
  );
  const orderedNoticeUpdates = useMemo(
    () => sortByDateDesc(noticeUpdates, 'createdAt'),
    [noticeUpdates]
  );

  const selectedNoticeApplication = useMemo(() => {
    if (!selectedNoticeId) {
      return null;
    }

    return (
      myApplications.find((application) => {
        const noticeId = application.notice?._id || application.notice;
        return noticeId === selectedNoticeId;
      }) || null
    );
  }, [myApplications, selectedNoticeId]);

  const currentStep = !selectedNoticeId ? 1 : selectedNoticeApplication ? 3 : 2;
  const isSelectedNoticeClosed =
    selectedNotice && (selectedNotice.applicationState || selectedNotice.status) === 'closed';

  const downloadSelectedNoticeInfo = useCallback(() => {
    if (!selectedNotice) {
      return;
    }

    const summaryLines = [
      `Title: ${toLocalizedText(selectedNotice.title, language)}`,
      `Status: ${selectedNotice.applicationState || selectedNotice.status}`,
      `Description: ${toLocalizedText(selectedNotice.description, language)}`,
      `Eligibility: ${toLocalizedText(selectedNotice.eligibility, language)}`,
      `Window: ${toIsoDate(selectedNotice.applicationWindowStart)} to ${toIsoDate(selectedNotice.applicationWindowEnd)}`,
      `Decision Date: ${toIsoDate(selectedNotice.deadline)}`,
      '',
      'Categories:'
    ];

    for (const category of selectedNoticeCategories) {
      summaryLines.push(
        `- ${toLocalizedText(category.name, language)} | ${category.code} | ${category.amount} | ${category.slots}`
      );
    }

    const blob = new Blob([summaryLines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `scholarship-notice-${selectedNotice._id}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [language, selectedNotice, selectedNoticeCategories]);

  const scrollToApplyForm = useCallback(() => {
    document.getElementById('scholarship-application-form')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  }, []);

  const dashboardStats = useMemo(
    () => ({
      openNotices: notices.filter((notice) => (notice.applicationState || notice.status) === 'open')
        .length,
      activeCategories: selectedNoticeCategories.length,
      recipientCount: recipients.length,
      reviewCount: canReview
        ? applications.filter((item) => ['submitted', 'under_review'].includes(item.status)).length
        : selectedNoticeApplication
          ? 1
          : myApplications.filter((item) => {
              const noticeId = item.notice?._id || item.notice;
              return noticeId === selectedNoticeId;
            }).length
    }),
    [
      applications,
      canReview,
      myApplications,
      notices,
      recipients.length,
      selectedNoticeApplication,
      selectedNoticeCategories.length,
      selectedNoticeId
    ]
  );

  useEffect(() => {
    if (!selectedNoticeId || !selectedNotice) {
      return;
    }

    if (lastNoticeIdRef.current !== selectedNoticeId) {
      const draft = applicationDrafts[selectedNoticeId];
      const nextCategoryCode =
        draft?.selectedCategoryCode || selectedNoticeCategories[0]?.code || '';

      setApplicationForm({
        statement: draft?.statement || '',
        gpa: draft?.gpa || '',
        department: draft?.department || user?.department || '',
        selectedCategoryCode: nextCategoryCode
      });

      lastNoticeIdRef.current = selectedNoticeId;
      return;
    }

    const selectedStillValid = selectedNoticeCategories.some(
      (category) => category.code === applicationForm.selectedCategoryCode
    );

    if (!selectedStillValid) {
      setApplicationForm((prev) => ({
        ...prev,
        selectedCategoryCode: selectedNoticeCategories[0]?.code || ''
      }));
    }
  }, [
    applicationDrafts,
    applicationForm.selectedCategoryCode,
    selectedNotice,
    selectedNoticeCategories,
    selectedNoticeId,
    user?.department
  ]);

  useEffect(() => {
    if (!selectedNotice || !selectedNoticeId || !canManageNotices) {
      return;
    }

    if (lastEditNoticeIdRef.current === selectedNoticeId) {
      return;
    }

    const mappedCategories = (selectedNotice.categories || []).map((category) => ({
      code: category.code || '',
      nameEn: category.name?.en || '',
      nameBn: category.name?.bn || '',
      amount: category.amount ?? '',
      slots: category.slots ?? 1
    }));

    setEditNoticeForm({
      title: {
        en: selectedNotice.title?.en || '',
        bn: selectedNotice.title?.bn || ''
      },
      description: {
        en: selectedNotice.description?.en || '',
        bn: selectedNotice.description?.bn || ''
      },
      eligibility: {
        en: selectedNotice.eligibility?.en || '',
        bn: selectedNotice.eligibility?.bn || ''
      },
      scholarshipType: selectedNotice.scholarshipType || 'one_off',
      applicationWindowStart: toIsoDate(selectedNotice.applicationWindowStart),
      applicationWindowEnd: toIsoDate(selectedNotice.applicationWindowEnd),
      deadline: toIsoDate(selectedNotice.deadline),
      status: selectedNotice.status || 'draft',
      categories: mappedCategories.length ? mappedCategories : [createEmptyCategory()]
    });

    lastEditNoticeIdRef.current = selectedNoticeId;
  }, [canManageNotices, selectedNotice, selectedNoticeId]);

  useEffect(() => {
    if (!selectedNoticeId) {
      return;
    }

    setApplicationDrafts((prev) => ({
      ...prev,
      [selectedNoticeId]: applicationForm
    }));
  }, [applicationForm, selectedNoticeId]);

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

    return items;
  }, [canViewManageNotices, selectedNoticeId]);

  const loadApplications = useCallback(async () => {
    if (!canReview || !selectedNoticeId) {
      setApplications([]);
      return;
    }

    const response = await scholarshipApi.listApplications({
      noticeId: selectedNoticeId,
      limit: 50
    });
    setApplications(response.data.items || []);
  }, [canReview, selectedNoticeId]);

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

    const selectedNoticeNow = notices.find((notice) => notice._id === selectedNoticeId) || null;
    const isRecipientListPublished = Boolean(selectedNoticeNow?.recipientsPublishedAt);

    if (!canReview && !isRecipientListPublished) {
      setRecipients([]);
      setRecipientInfo({ isPublished: false, recipientsPublishedAt: null, isRestricted: true });

      try {
        const updatesRequest = canPostUpdates
          ? scholarshipApi.listManageNoticeUpdates(selectedNoticeId, { limit: 20 })
          : scholarshipApi.listNoticeUpdates(selectedNoticeId, { limit: 20 });
        const updatesResult = await updatesRequest;
        setNoticeUpdates(updatesResult.data.items || []);
      } catch (apiError) {
        setNoticeUpdates([]);
        setMessage(
          getApiErrorMessage(apiError, 'Failed to load scholarship update timeline.')
        );
      }

      return;
    }

    try {
      const recipientsRequest = canReview
        ? scholarshipApi.listManageRecipients(selectedNoticeId, { limit: 100 })
        : scholarshipApi.listRecipients(selectedNoticeId, { limit: 100 });

      const updatesRequest = canPostUpdates
        ? scholarshipApi.listManageNoticeUpdates(selectedNoticeId, { limit: 20 })
        : scholarshipApi.listNoticeUpdates(selectedNoticeId, { limit: 20 });

      const [recipientResult, updatesResult] = await Promise.allSettled([
        recipientsRequest,
        updatesRequest
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
        setMessage(
          getApiErrorMessage(apiError, 'Failed to load scholarship recipients and updates.')
        );
      }
    }
  }, [canPostUpdates, canReview, notices, selectedNoticeId]);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      await Promise.all([
        loadNotices(),
        loadApplications(),
        loadMyApplications(),
        loadGlobalUpdates()
      ]);
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
      // Refresh notice list and details to ensure latest window/status before submitting
      const freshNotices = await loadNotices();
      await loadNoticeDetails();

      const freshNotice = freshNotices.find((n) => n._id === selectedNoticeId);

      if (!freshNotice) {
        setMessage('Selected scholarship notice not found.');
        return;
      }

      const liveState = freshNotice.applicationState || freshNotice.status;
      if (liveState === 'closed') {
        setMessage('Application window has closed');
        return;
      }

      if (liveState === 'scheduled') {
        setMessage('Application window has not opened yet');
        return;
      }

      await scholarshipApi.apply(selectedNoticeId, {
        statement: applicationForm.statement,
        gpa: Number(applicationForm.gpa),
        department: applicationForm.department,
        selectedCategoryCode: applicationForm.selectedCategoryCode || undefined,
        documents: []
      });

      setMessage('Application submitted successfully.');
      success('Application submitted successfully.', { title: 'Scholarship application sent' });
      setApplicationForm((prev) => ({
        ...prev,
        statement: '',
        gpa: '',
        selectedCategoryCode: ''
      }));
      setApplicationDrafts((prev) => ({
        ...prev,
        [selectedNoticeId]: {
          statement: '',
          gpa: '',
          department: applicationForm.department,
          selectedCategoryCode: ''
        }
      }));

      await loadApplications();
      await loadMyApplications();
      await loadNoticeDetails();
    } catch (apiError) {
      const nextMessage = getApiErrorMessage(apiError, 'Failed to submit application.');
      setMessage(nextMessage);
      toastError(nextMessage, { title: 'Application failed' });
    }
  };

  const normalizeNoticeCategories = (categories) => {
    const normalized = categories
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
      const categories = normalizeNoticeCategories(noticeForm.categories);

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
      success('Scholarship notice created successfully.', { title: 'Notice created' });
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
        toastError(apiError.message, { title: 'Notice creation failed' });
      } else {
        const nextMessage = getApiErrorMessage(apiError, 'Failed to create scholarship notice.');
        setMessage(nextMessage);
        toastError(nextMessage, { title: 'Notice creation failed' });
      }
    }
  };

  const submitNoticeEdit = async (event) => {
    event.preventDefault();
    setMessage('');

    if (!selectedNoticeId) {
      setMessage('Select a scholarship notice first.');
      return;
    }

    try {
      const categories = normalizeNoticeCategories(editNoticeForm.categories);

      await scholarshipApi.updateNotice(selectedNoticeId, {
        title: editNoticeForm.title,
        description: editNoticeForm.description,
        eligibility: editNoticeForm.eligibility,
        scholarshipType: editNoticeForm.scholarshipType,
        applicationWindowStart: new Date(editNoticeForm.applicationWindowStart).toISOString(),
        applicationWindowEnd: new Date(editNoticeForm.applicationWindowEnd).toISOString(),
        deadline: new Date(editNoticeForm.deadline).toISOString(),
        status: editNoticeForm.status,
        categories
      });

      setMessage('Scholarship notice updated successfully.');
      success('Scholarship notice updated successfully.', { title: 'Notice updated' });
      await loadNotices();
      await loadNoticeDetails();
    } catch (apiError) {
      if (apiError instanceof Error && !apiError.response) {
        setMessage(apiError.message);
        toastError(apiError.message, { title: 'Notice update failed' });
      } else {
        const nextMessage = getApiErrorMessage(apiError, 'Failed to update scholarship notice.');
        setMessage(nextMessage);
        toastError(nextMessage, { title: 'Notice update failed' });
      }
    }
  };

  const openReviewModal = (application, initialStatus = 'under_review') => {
    const noticeCategories = application.notice?.categories || selectedNoticeCategories;

    setReviewModal({
      isOpen: true,
      applicationId: application._id,
      currentStatus: application.status,
      fallbackCategoryCode: application.selectedCategoryCode || '',
      initialStatus,
      categories: noticeCategories
    });
  };

  const closeReviewModal = () => {
    setReviewModal((prev) => ({ ...prev, isOpen: false }));
  };

  const handleReviewConfirm = async (payload) => {
    try {
      await scholarshipApi.reviewApplication(reviewModal.applicationId, payload);

      setMessage('Application review updated.');
      success(`Application ${payload.status}.`, { title: 'Review saved' });
      closeReviewModal();
      await loadApplications();
      await loadMyApplications();
      await loadNoticeDetails();
    } catch (apiError) {
      const nextMessage = getApiErrorMessage(apiError, 'Failed to update review status.');
      setMessage(nextMessage);
      toastError(nextMessage, { title: 'Review failed' });
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
      info('CSV export downloaded.', { title: 'Export complete' });
    } catch (apiError) {
      const nextMessage = getApiErrorMessage(apiError, 'Failed to export applications.');
      setMessage(nextMessage);
      toastError(nextMessage, { title: 'Export failed' });
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

  const updateEditNoticeLocalized = (field, locale, value) => {
    setEditNoticeForm((prev) => ({
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

  const updateEditCategoryField = (index, field, value) => {
    setEditNoticeForm((prev) => ({
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

  const addEditCategoryRow = () => {
    setEditNoticeForm((prev) => ({
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

  const removeEditCategoryRow = (index) => {
    setEditNoticeForm((prev) => {
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
      success(`Notice marked as ${status}.`, { title: 'Scholarship notice updated' });
      await loadNotices();
      await loadNoticeDetails();
    } catch (apiError) {
      const nextMessage = getApiErrorMessage(
        apiError,
        'Failed to update scholarship notice status.'
      );
      setMessage(nextMessage);
      toastError(nextMessage, { title: 'Notice update failed' });
    }
  };

  const publishRecipients = async (publish) => {
    if (!selectedNoticeId) {
      return;
    }

    try {
      await scholarshipApi.publishRecipients(selectedNoticeId, { publish });
      setMessage(publish ? 'Recipient list published.' : 'Recipient list unpublished.');
      success(publish ? 'Recipient list published.' : 'Recipient list unpublished.', {
        title: 'Recipient list updated'
      });
      await loadNoticeDetails();
    } catch (apiError) {
      const nextMessage = getApiErrorMessage(
        apiError,
        'Failed to update recipient publication status.'
      );
      setMessage(nextMessage);
      toastError(nextMessage, { title: 'Recipient publication failed' });
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
      info('Scholarship update published.', { title: 'Update feed' });
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
      const nextMessage = getApiErrorMessage(apiError, 'Failed to publish scholarship update.');
      setMessage(nextMessage);
      toastError(nextMessage, { title: 'Update publish failed' });
    }
  };

  return (
    <section className="page-wrap desk-page scholarship-page">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/" className="breadcrumb-link">
          {ui('scholarship', 'breadcrumbHome', language)}
        </Link>
        <span className="breadcrumb-sep" aria-hidden="true">
          /
        </span>
        <span className="breadcrumb-current">
          {ui('scholarship', 'breadcrumbScholarship', language)}
        </span>
      </nav>

      <header className="page-title-bar">
        <div>
          <p className="eyebrow">{ui('scholarship', 'eyebrow', language)}</p>
          <h1>{ui('scholarship', 'title', language)}</h1>
          <p className="page-title-subtitle">{ui('scholarship', 'subtitle', language)}</p>
          <div className="scholarship-stepper" aria-label="Scholarship steps">
            {[
              { number: '1', label: 'Choose a notice' },
              { number: '2', label: 'Review & Apply' },
              { number: '3', label: 'Confirmation' }
            ].map((step, index) => {
              const stepIndex = index + 1;
              const isCompleted = currentStep > stepIndex;
              const isActive = currentStep === stepIndex;

              return (
                <div
                  key={step.label}
                  className={`scholarship-stepper__item${isCompleted ? ' is-completed' : ''}${
                    isActive ? ' is-active' : ''
                  }`}
                >
                  <span className="scholarship-stepper__circle" aria-hidden="true">
                    {isCompleted ? '✓' : step.number}
                  </span>
                  <span className="scholarship-stepper__label">{step.label}</span>
                  {stepIndex < 3 && <span className="scholarship-stepper__line" aria-hidden="true" />}
                </div>
              );
            })}
          </div>
        </div>
        <button type="button" className="btn btn-ghost" onClick={loadData}>
          {ui('scholarship', 'refresh', language)}
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
      {loading && <p>{ui('scholarship', 'loading', language)}</p>}

      <div className="workflow-grid workflow-grid-2 scholarship-overview-grid">
        <article className="surface-card scholarship-notice-card" id="scholarship-notice-summary">
          <div className="section-head section-head-tight">
            <h3>{ui('scholarship', 'availableNotices', language)}</h3>
            <div className="notice-selector-shell">
              <select
                className="notice-selector"
                aria-label={ui('scholarship', 'availableNotices', language)}
                value={selectedNoticeId}
                onChange={(event) => setSelectedNoticeId(event.target.value)}
              >
                <option value="">{ui('scholarship', 'selectNoticePlaceholder', language)}</option>
                {orderedNotices.map((notice) => (
                  <option key={notice._id} value={notice._id}>
                    {toLocalizedText(notice.title, language)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {!orderedNotices.length && <p>{ui('scholarship', 'noNotices', language)}</p>}

          {selectedNotice && (
            <article className="surface-card inner-card scholarship-notice-card__body">
              <div className="section-head section-head-tight">
                <h3>{toLocalizedText(selectedNotice.title, language)}</h3>
                <span className={`status-badge status-${selectedNotice.status}`}>
                  {selectedNotice.status}
                </span>
              </div>

              <p className="scholarship-notice-card__description">
                {toLocalizedText(selectedNotice.description, language)}
              </p>
              <p className="scholarship-notice-card__eligibility">
                {toLocalizedText(selectedNotice.eligibility, language)}
              </p>
              <p className="meta scholarship-notice-card__meta">
                Type: {selectedNotice.scholarshipType || 'one_off'} • Application Window:{' '}
                {toIsoDate(selectedNotice.applicationWindowStart)} to{' '}
                {toIsoDate(selectedNotice.applicationWindowEnd)} • Decision Date:{' '}
                {toIsoDate(selectedNotice.deadline)}
              </p>
              <p className="meta scholarship-notice-card__meta">
                Live State: {selectedNotice.applicationState || selectedNotice.status}
              </p>

              {!!selectedNoticeCategories.length && (
                <div className="table-wrap scholarship-category-table" id="scholarship-category-table">
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
                          <td>
                            <span className="code-pill">{category.code}</span>
                          </td>
                          <td>
                            <strong>{category.amount}</strong>
                          </td>
                          <td>{category.slots}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {selectedNoticeApplication && (
                <article className="surface-card inner-card scholarship-application-status">
                  <div className="section-head section-head-tight">
                    <h4>Your Application</h4>
                    <span className={`status-badge status-${selectedNoticeApplication.status}`}>
                      {selectedNoticeApplication.status}
                    </span>
                  </div>
                  <p className="meta">
                    Submitted: {toIsoDate(selectedNoticeApplication.createdAt)} • GPA:{' '}
                    {selectedNoticeApplication.gpa}
                  </p>
                  {selectedNoticeApplication.decisionNote && (
                    <p>{selectedNoticeApplication.decisionNote}</p>
                  )}
                  {selectedNoticeApplication.awardedAmount && (
                    <p className="meta">
                      Award: {selectedNoticeApplication.awardedAmount}
                      {selectedNoticeApplication.awardedCategoryCode
                        ? ` (${selectedNoticeApplication.awardedCategoryCode})`
                        : ''}
                    </p>
                  )}
                </article>
              )}

              <div className="notice-card-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={scrollToApplyForm}
                  disabled={!selectedNotice || isSelectedNoticeClosed}
                  title={isSelectedNoticeClosed ? 'This notice is closed.' : 'Jump to the application form.'}
                >
                  Apply Now
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => document.getElementById('scholarship-notice-summary')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                >
                  View Details
                </button>
                <button type="button" className="btn btn-ghost" onClick={downloadSelectedNoticeInfo}>
                  Download Info
                </button>
              </div>

              {canManageNotices && (
                <div className="inline-actions" style={{ marginTop: '0.7rem' }}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => updateNoticeStatus('open')}
                  >
                    Open Window
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => updateNoticeStatus('closed')}
                  >
                    Close Window
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => updateNoticeStatus('draft')}
                  >
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
                    {recipientInfo.isPublished
                      ? 'Unpublish Recipient List'
                      : 'Publish Recipient List'}
                  </button>
                </div>
              )}
            </article>
          )}
        </article>

        {!!orderedGlobalUpdates.length && (
          <article className="surface-card scholarship-feed-card">
            <h3>Scholarship Update Feed</h3>
            <div className="stack-list">
              {orderedGlobalUpdates.map((item) => (
                <article key={item._id} className="surface-card inner-card scholarship-feed-item">
                  <div className="section-head section-head-tight scholarship-feed-item__head">
                    <h3>{toLocalizedText(item.title, language)}</h3>
                    <span className={`status-badge scholarship-badge scholarship-badge--${item.kind}`}>
                      {item.kind}
                    </span>
                  </div>
                  <p className="scholarship-feed-item__body">{toLocalizedText(item.body, language)}</p>
                  <p className="meta scholarship-feed-item__meta">
                    Notice: {toLocalizedText(item.notice?.title, language)} • Posted:{' '}
                    {toIsoDate(item.createdAt)}
                  </p>
                </article>
              ))}
            </div>
          </article>
        )}
      </div>

      {isAuthenticated && (canApply || selectedNoticeApplication) && (
        <div className="workflow-grid workflow-grid-2">
          {canApply && !selectedNoticeApplication && (
            <article className="surface-card scholarship-apply-card">
              <p className="meta">{ui('scholarship', 'stepApply', language)}</p>
              <h3>{ui('scholarship', 'applyTitle', language)}</h3>
              <form className="form-grid" id="scholarship-application-form" onSubmit={submitApplication}>
                {!!selectedNoticeCategories.length && (
                  <label>
                    {ui('scholarship', 'categoryLabel', language)}
                    <select
                      value={applicationForm.selectedCategoryCode}
                      onChange={(event) =>
                        setApplicationForm((prev) => ({
                          ...prev,
                          selectedCategoryCode: event.target.value
                        }))
                      }
                      required
                    >
                      <option value="">{ui('scholarship', 'selectCategory', language)}</option>
                      {selectedNoticeCategories.map((category) => (
                        <option key={category.code} value={category.code}>
                          {toLocalizedText(category.name, language)} ({category.code})
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                <label>
                  {ui('scholarship', 'statement', language)}
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
                  {ui('scholarship', 'gpa', language)}
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
                  {ui('scholarship', 'department', language)}
                  <input
                    value={applicationForm.department}
                    onChange={(event) =>
                      setApplicationForm((prev) => ({ ...prev, department: event.target.value }))
                    }
                    required
                  />
                </label>

                <button type="submit" className="btn btn-primary scholarship-apply-card__submit">
                  Submit Application
                </button>
              </form>
            </article>
          )}
          </div>
          )}

      {selectedNotice && (
        <div className="workflow-grid workflow-grid-2 scholarship-notice-panel-grid">
          <CollapsibleSection title="Recipient List" defaultOpen={false}>
            {recipientInfo.recipientsPublishedAt && (
              <p className="meta">Published: {toIsoDate(recipientInfo.recipientsPublishedAt)}</p>
            )}

            {!orderedRecipients.length && !recipientInfo.isRestricted && (
              <div className="empty-state empty-state--center">
                <div className="empty-state__icon" aria-hidden="true">
                  •
                </div>
                <p className="empty-state__title">No recipients listed yet.</p>
                <p className="empty-state__text">Recipients will appear here after publication.</p>
              </div>
            )}
            {recipientInfo.isRestricted && !canReview && (
              <p className="meta">Recipient list is not published yet.</p>
            )}

            {!!orderedRecipients.length && (
              <div className="recipient-grid">
                {orderedRecipients.map((item) => {
                  const initials = (item.student?.fullName || 'Unknown')
                    .split(' ')
                    .map((part) => part[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase();

                  return (
                    <article key={item._id} className="recipient-card">
                      <span className="recipient-card__avatar" aria-hidden="true">
                        {initials}
                      </span>
                      <div className="recipient-card__body">
                        <h4>{item.student?.fullName || 'Unknown'}</h4>
                        <p>{item.department}</p>
                      </div>
                      <span className="recipient-card__badge">
                        {item.awardedCategoryCode || item.selectedCategoryCode || 'Awarded'}
                      </span>
                    </article>
                  );
                })}
              </div>
            )}
          </CollapsibleSection>

          <CollapsibleSection title="Notice Update Timeline" defaultOpen={false}>
            {!orderedNoticeUpdates.length && <p>No updates for this notice yet.</p>}
            {!!orderedNoticeUpdates.length && (
              <div className="scholarship-timeline">
                {orderedNoticeUpdates.map((item) => (
                  <article key={item._id} className="scholarship-timeline__item">
                    <span className="scholarship-timeline__dot" aria-hidden="true" />
                    <div className="scholarship-timeline__content">
                      <div className="section-head section-head-tight scholarship-timeline__head">
                        <h3>{toLocalizedText(item.title, language)}</h3>
                        <span className={`status-badge scholarship-badge scholarship-badge--${item.kind}`}>
                          {item.kind}
                        </span>
                        {item.visibility === 'internal' && (
                          <span className="status-badge status-draft">internal</span>
                        )}
                      </div>
                      <p>{toLocalizedText(item.body, language)}</p>
                      <p className="meta scholarship-timeline__meta">
                        {item.visibility} • Posted by {item.postedBy?.fullName || 'System'} •{' '}
                        {toIsoDate(item.createdAt)}
                      </p>
                    </div>
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
                    onChange={(event) =>
                      setUpdateForm((prev) => ({ ...prev, kind: event.target.value }))
                    }
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
                    onChange={(event) =>
                      updateUpdateFormLocalized('title', 'en', event.target.value)
                    }
                    required
                  />
                </label>

                <label>
                  Title (BN)
                  <input
                    value={updateForm.title.bn}
                    onChange={(event) =>
                      updateUpdateFormLocalized('title', 'bn', event.target.value)
                    }
                    required
                  />
                </label>

                <label>
                  Body (EN)
                  <textarea
                    value={updateForm.body.en}
                    onChange={(event) =>
                      updateUpdateFormLocalized('body', 'en', event.target.value)
                    }
                    required
                  />
                </label>

                <label>
                  Body (BN)
                  <textarea
                    value={updateForm.body.bn}
                    onChange={(event) =>
                      updateUpdateFormLocalized('body', 'bn', event.target.value)
                    }
                    required
                  />
                </label>

                <button type="submit" className="btn btn-primary">
                  Publish Update
                </button>
              </form>
            )}
          </CollapsibleSection>
        </div>
      )}

      {(canManageNotices || canReview) && (
        <CollapsibleSection title="Admin Panel" defaultOpen={false}>
          <div className="workflow-grid workflow-grid-2">
            {canManageNotices && (
              <article className="surface-card">
                <h3>Edit Selected Scholarship Notice</h3>
                {!selectedNotice && <p>Select a notice to edit.</p>}
                {selectedNotice && (
                  <form className="form-grid" onSubmit={submitNoticeEdit}>
                  <label>
                    Title (EN)
                    <input
                      value={editNoticeForm.title.en}
                      onChange={(event) =>
                        updateEditNoticeLocalized('title', 'en', event.target.value)
                      }
                      required
                    />
                  </label>
                  <label>
                    Title (BN)
                    <input
                      value={editNoticeForm.title.bn}
                      onChange={(event) =>
                        updateEditNoticeLocalized('title', 'bn', event.target.value)
                      }
                      required
                    />
                  </label>

                  <label>
                    Description (EN)
                    <textarea
                      value={editNoticeForm.description.en}
                      onChange={(event) =>
                        updateEditNoticeLocalized('description', 'en', event.target.value)
                      }
                      required
                    />
                  </label>

                  <label>
                    Description (BN)
                    <textarea
                      value={editNoticeForm.description.bn}
                      onChange={(event) =>
                        updateEditNoticeLocalized('description', 'bn', event.target.value)
                      }
                      required
                    />
                  </label>

                  <label>
                    Eligibility (EN)
                    <textarea
                      value={editNoticeForm.eligibility.en}
                      onChange={(event) =>
                        updateEditNoticeLocalized('eligibility', 'en', event.target.value)
                      }
                      required
                    />
                  </label>

                  <label>
                    Eligibility (BN)
                    <textarea
                      value={editNoticeForm.eligibility.bn}
                      onChange={(event) =>
                        updateEditNoticeLocalized('eligibility', 'bn', event.target.value)
                      }
                      required
                    />
                  </label>

                  <label>
                    Scholarship Type
                    <select
                      value={editNoticeForm.scholarshipType}
                      onChange={(event) =>
                        setEditNoticeForm((prev) => ({
                          ...prev,
                          scholarshipType: event.target.value
                        }))
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
                      value={editNoticeForm.applicationWindowStart}
                      onChange={(event) =>
                        setEditNoticeForm((prev) => ({
                          ...prev,
                          applicationWindowStart: event.target.value
                        }))
                      }
                      required
                    />
                  </label>

                  <label>
                    Application Window End
                    <input
                      type="date"
                      value={editNoticeForm.applicationWindowEnd}
                      onChange={(event) =>
                        setEditNoticeForm((prev) => ({
                          ...prev,
                          applicationWindowEnd: event.target.value
                        }))
                      }
                      required
                    />
                  </label>

                  <label>
                    Decision Date
                    <input
                      type="date"
                      value={editNoticeForm.deadline}
                      onChange={(event) =>
                        setEditNoticeForm((prev) => ({ ...prev, deadline: event.target.value }))
                      }
                      required
                    />
                  </label>

                  <label>
                    Status
                    <select
                      value={editNoticeForm.status}
                      onChange={(event) =>
                        setEditNoticeForm((prev) => ({ ...prev, status: event.target.value }))
                      }
                    >
                      <option value="draft">Draft</option>
                      <option value="open">Open</option>
                      <option value="closed">Closed</option>
                    </select>
                  </label>

                  <div className="surface-card inner-card">
                    <div className="section-head section-head-tight">
                      <h3>Category Amount Matrix</h3>
                      <button type="button" className="btn btn-ghost" onClick={addEditCategoryRow}>
                        Add Category
                      </button>
                    </div>

                    <div className="stack-list">
                      {editNoticeForm.categories.map((category, index) => (
                        <article
                          key={`${index}-${category.code || 'new'}`}
                          className="surface-card inner-card"
                        >
                          <div className="form-grid">
                            <label>
                              Code
                              <input
                                value={category.code}
                                onChange={(event) =>
                                  updateEditCategoryField(index, 'code', event.target.value)
                                }
                                placeholder="merit"
                              />
                            </label>
                            <label>
                              Name (EN)
                              <input
                                value={category.nameEn}
                                onChange={(event) =>
                                  updateEditCategoryField(index, 'nameEn', event.target.value)
                                }
                              />
                            </label>
                            <label>
                              Name (BN)
                              <input
                                value={category.nameBn}
                                onChange={(event) =>
                                  updateEditCategoryField(index, 'nameBn', event.target.value)
                                }
                              />
                            </label>
                            <label>
                              Amount
                              <input
                                type="number"
                                min="0"
                                value={category.amount}
                                onChange={(event) =>
                                  updateEditCategoryField(index, 'amount', event.target.value)
                                }
                              />
                            </label>
                            <label>
                              Slots
                              <input
                                type="number"
                                min="1"
                                value={category.slots}
                                onChange={(event) =>
                                  updateEditCategoryField(index, 'slots', event.target.value)
                                }
                              />
                            </label>

                            <button
                              type="button"
                              className="btn btn-ghost"
                              onClick={() => removeEditCategoryRow(index)}
                            >
                              Remove Category
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>

                  <button type="submit" className="btn btn-primary">
                    Update Notice
                  </button>
                </form>
              )}
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
                    onChange={(event) =>
                      updateNoticeLocalized('description', 'en', event.target.value)
                    }
                    required
                  />
                </label>

                <label>
                  Description (BN)
                  <textarea
                    value={noticeForm.description.bn}
                    onChange={(event) =>
                      updateNoticeLocalized('description', 'bn', event.target.value)
                    }
                    required
                  />
                </label>

                <label>
                  Eligibility (EN)
                  <textarea
                    value={noticeForm.eligibility.en}
                    onChange={(event) =>
                      updateNoticeLocalized('eligibility', 'en', event.target.value)
                    }
                    required
                  />
                </label>

                <label>
                  Eligibility (BN)
                  <textarea
                    value={noticeForm.eligibility.bn}
                    onChange={(event) =>
                      updateNoticeLocalized('eligibility', 'bn', event.target.value)
                    }
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
                      setNoticeForm((prev) => ({
                        ...prev,
                        applicationWindowStart: event.target.value
                      }))
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
                      setNoticeForm((prev) => ({
                        ...prev,
                        applicationWindowEnd: event.target.value
                      }))
                    }
                    required
                  />
                </label>

                <label>
                  Decision Date
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
                  Initial Status
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

                <div className="surface-card inner-card">
                  <div className="section-head section-head-tight">
                    <h3>Category Amount Matrix</h3>
                    <button type="button" className="btn btn-ghost" onClick={addCategoryRow}>
                      Add Category
                    </button>
                  </div>

                  <div className="stack-list">
                    {noticeForm.categories.map((category, index) => (
                      <article
                        key={`${index}-${category.code || 'new'}`}
                        className="surface-card inner-card"
                      >
                        <div className="form-grid">
                          <label>
                            Code
                            <input
                              value={category.code}
                              onChange={(event) =>
                                updateCategoryField(index, 'code', event.target.value)
                              }
                              placeholder="merit"
                            />
                          </label>
                          <label>
                            Name (EN)
                            <input
                              value={category.nameEn}
                              onChange={(event) =>
                                updateCategoryField(index, 'nameEn', event.target.value)
                              }
                            />
                          </label>
                          <label>
                            Name (BN)
                            <input
                              value={category.nameBn}
                              onChange={(event) =>
                                updateCategoryField(index, 'nameBn', event.target.value)
                              }
                            />
                          </label>
                          <label>
                            Amount
                            <input
                              type="number"
                              min="0"
                              value={category.amount}
                              onChange={(event) =>
                                updateCategoryField(index, 'amount', event.target.value)
                              }
                            />
                          </label>
                          <label>
                            Slots
                            <input
                              type="number"
                              min="1"
                              value={category.slots}
                              onChange={(event) =>
                                updateCategoryField(index, 'slots', event.target.value)
                              }
                            />
                          </label>

                          <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => removeCategoryRow(index)}
                          >
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

              {!orderedApplications.length && <p>No applications to review.</p>}
              {!!orderedApplications.length && (
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
                      {orderedApplications.map((item) => (
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
                                onClick={() => openReviewModal(item, 'under_review')}
                              >
                                Review
                              </button>
                              <button
                                type="button"
                                className="btn btn-ghost"
                                onClick={() => openReviewModal(item, 'approved')}
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                className="btn btn-ghost"
                                onClick={() => openReviewModal(item, 'rejected')}
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
        </CollapsibleSection>
      )}

      <ReviewModal
        isOpen={reviewModal.isOpen}
        onClose={closeReviewModal}
        currentStatus={reviewModal.currentStatus}
        fallbackCategoryCode={reviewModal.fallbackCategoryCode}
        initialStatus={reviewModal.initialStatus}
        categories={reviewModal.categories}
        onConfirm={handleReviewConfirm}
      />
    </section>
  );
}

export default ScholarshipPage;
