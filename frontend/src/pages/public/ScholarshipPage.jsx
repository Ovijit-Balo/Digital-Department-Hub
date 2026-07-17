import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { scholarshipApi } from '../../api/modules';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import useLanguage from '../../hooks/useLanguage';
import useRole from '../../hooks/useRole';
import CollapsibleSection from '../../components/ui/CollapsibleSection';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import InlineAlert from '../../components/ui/InlineAlert';
import Modal from '../../components/ui/Modal';
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

// Human-friendly labels + badge classes for the computed application state.
const STATE_META = {
  open: { label: { en: 'Open', bn: 'খোলা' }, badge: 'status-open' },
  closed: { label: { en: 'Closed', bn: 'বন্ধ' }, badge: 'status-closed' },
  scheduled: { label: { en: 'Scheduled', bn: 'নির্ধারিত' }, badge: 'status-scheduled' },
  draft: { label: { en: 'Draft', bn: 'খসড়া' }, badge: 'status-draft' }
};

const stateLabel = (state, language) =>
  STATE_META[state]?.label ? toLocalizedText(STATE_META[state].label, language) : state || '—';
const stateBadgeClass = (state) => STATE_META[state]?.badge || 'status-draft';

const DAY_MS = 24 * 60 * 60 * 1000;

// Explains to an applicant why the form is disabled for a non-open notice.
const applyBlockedMessage = (state, startDate, language) => {
  if (state === 'scheduled') {
    return toLocalizedText(
      {
        en: `Applications for this notice open on ${toIsoDate(startDate)}.`,
        bn: `এই বিজ্ঞপ্তির আবেদন ${toIsoDate(startDate)} তারিখে খুলবে।`
      },
      language
    );
  }
  if (state === 'draft') {
    return toLocalizedText(
      {
        en: 'This notice is still a draft and is not accepting applications yet.',
        bn: 'এই বিজ্ঞপ্তিটি এখনও খসড়া এবং আবেদন গ্রহণ করছে না।'
      },
      language
    );
  }
  return toLocalizedText(
    {
      en: 'The application window for this notice is closed.',
      bn: 'এই বিজ্ঞপ্তির আবেদন সময়সীমা বন্ধ।'
    },
    language
  );
};

const T = {
  step1: { en: 'Choose a notice', bn: 'একটি বিজ্ঞপ্তি নির্বাচন করুন' },
  step2: { en: 'Review & Apply', bn: 'পর্যালোচনা ও আবেদন' },
  step3: { en: 'Confirmation', bn: 'নিশ্চিতকরণ' },
  openNotices: { en: 'Open Notices', bn: 'খোলা বিজ্ঞপ্তি' },
  openNoticesNote: { en: 'Active window-aware opportunities', bn: 'সক্রিয় সময়সীমা-সচেতন সুযোগ' },
  noticeCategories: { en: 'Notice Categories', bn: 'বিজ্ঞপ্তির বিভাগ' },
  noticeCategoriesNote: { en: 'Configured for selected notice', bn: 'নির্বাচিত বিজ্ঞপ্তির জন্য নির্ধারিত' },
  recipientsListed: { en: 'Recipients Listed', bn: 'তালিকাভুক্ত প্রাপক' },
  recipientsNote: { en: 'Visible in current selection', bn: 'বর্তমান নির্বাচনে দৃশ্যমান' },
  pendingReviews: { en: 'Pending Reviews', bn: 'অপেক্ষমাণ পর্যালোচনা' },
  myApplications: { en: 'My Applications', bn: 'আমার আবেদন' },
  submittedOrReview: { en: 'Submitted or under review', bn: 'জমা দেওয়া বা পর্যালোচনাধীন' },
  submittedInAccount: { en: 'Submitted in your account', bn: 'আপনার অ্যাকাউন্টে জমা দেওয়া' },
  type: { en: 'Type', bn: 'ধরন' },
  applicationWindow: { en: 'Application Window', bn: 'আবেদন সময়সীমা' },
  decisionDate: { en: 'Decision Date', bn: 'সিদ্ধান্তের তারিখ' },
  category: { en: 'Category', bn: 'বিভাগ' },
  code: { en: 'Code', bn: 'কোড' },
  amount: { en: 'Amount', bn: 'পরিমাণ' },
  slots: { en: 'Slots', bn: 'স্লট' },
  yourApplication: { en: 'Your Application', bn: 'আপনার আবেদন' },
  submitted: { en: 'Submitted:', bn: 'জমা দেওয়া:' },
  award: { en: 'Award:', bn: 'পুরস্কার:' },
  openFormHint: { en: 'Open the application form.', bn: 'আবেদন ফর্ম খুলুন।' },
  applyNow: { en: 'Apply Now', bn: 'এখনই আবেদন করুন' },
  viewDetails: { en: 'View Details', bn: 'বিস্তারিত দেখুন' },
  downloadInfo: { en: 'Download Info', bn: 'তথ্য ডাউনলোড' },
  openWindow: { en: 'Open Window', bn: 'উইন্ডো খুলুন' },
  closeWindow: { en: 'Close Window', bn: 'উইন্ডো বন্ধ' },
  moveToDraft: { en: 'Move to Draft', bn: 'খসড়ায় নিন' },
  unpublishRecipients: { en: 'Unpublish Recipient List', bn: 'প্রাপক তালিকা অপ্রকাশ' },
  publishRecipientsLabel: { en: 'Publish Recipient List', bn: 'প্রাপক তালিকা প্রকাশ' },
  feedTitle: { en: 'Scholarship Update Feed', bn: 'বৃত্তি আপডেট ফিড' },
  notice: { en: 'Notice:', bn: 'বিজ্ঞপ্তি:' },
  posted: { en: 'Posted:', bn: 'পোস্ট করা:' },
  selectNoticeAbove: { en: 'Select a scholarship notice above to apply.', bn: 'আবেদন করতে উপরে একটি বৃত্তি বিজ্ঞপ্তি নির্বাচন করুন।' },
  cancel: { en: 'Cancel', bn: 'বাতিল' },
  submitApplication: { en: 'Submit Application', bn: 'আবেদন জমা দিন' },
  submitHint: { en: 'Submit your application', bn: 'আপনার আবেদন জমা দিন' },
  notAcceptingHint: { en: 'This notice is not accepting applications right now.', bn: 'এই বিজ্ঞপ্তি এই মুহূর্তে আবেদন গ্রহণ করছে না।' },
  recipientList: { en: 'Recipient List', bn: 'প্রাপক তালিকা' },
  published: { en: 'Published:', bn: 'প্রকাশিত:' },
  noRecipientsYet: { en: 'No recipients listed yet.', bn: 'এখনও কোনো প্রাপক তালিকাভুক্ত নয়।' },
  recipientsAfterPub: { en: 'Recipients will appear here after publication.', bn: 'প্রকাশের পর প্রাপকরা এখানে দেখা যাবে।' },
  recipientNotPublished: { en: 'Recipient list is not published yet.', bn: 'প্রাপক তালিকা এখনও প্রকাশিত হয়নি।' },
  updateTimeline: { en: 'Notice Update Timeline', bn: 'বিজ্ঞপ্তি আপডেট টাইমলাইন' },
  general: { en: 'General', bn: 'সাধারণ' },
  deadline: { en: 'Deadline', bn: 'শেষ তারিখ' },
  recipient: { en: 'Recipient', bn: 'প্রাপক' },
  announcement: { en: 'Announcement', bn: 'ঘোষণা' },
  publicVis: { en: 'Public', bn: 'সর্বজনীন' },
  internalVis: { en: 'Internal', bn: 'অভ্যন্তরীণ' },
  adminPanel: { en: 'Admin Panel', bn: 'অ্যাডমিন প্যানেল' },
  editSelectedNotice: { en: 'Edit Selected Scholarship Notice', bn: 'নির্বাচিত বৃত্তি বিজ্ঞপ্তি সম্পাদনা' },
  monthly: { en: 'Monthly', bn: 'মাসিক' },
  oneOff: { en: 'One-time', bn: 'এককালীন' },
  draftOpt: { en: 'Draft', bn: 'খসড়া' },
  openOpt: { en: 'Open', bn: 'খোলা' },
  closedOpt: { en: 'Closed', bn: 'বন্ধ' },
  categoryMatrix: { en: 'Category Amount Matrix', bn: 'বিভাগ পরিমাণ ম্যাট্রিক্স' },
  publishNotice: { en: 'Publish Scholarship Notice', bn: 'বৃত্তি বিজ্ঞপ্তি প্রকাশ' },
  unknown: { en: 'Unknown', bn: 'অজানা' },
  awarded: { en: 'Awarded', bn: 'প্রদত্ত' },
  noUpdatesYet: { en: 'No updates for this notice yet.', bn: 'এই বিজ্ঞপ্তির জন্য এখনও কোনো আপডেট নেই।' },
  postedBy: { en: 'Posted by', bn: 'পোস্ট করেছেন' },
  systemFallback: { en: 'System', bn: 'সিস্টেম' },
  internalBadge: { en: 'internal', bn: 'অভ্যন্তরীণ' },
  updateType: { en: 'Update Type', bn: 'আপডেটের ধরন' },
  visibility: { en: 'Visibility', bn: 'দৃশ্যমানতা' },
  titleEn: { en: 'Title (EN)', bn: 'শিরোনাম (ইংরেজি)' },
  titleBn: { en: 'Title (BN)', bn: 'শিরোনাম (বাংলা)' },
  descEn: { en: 'Description (EN)', bn: 'বিবরণ (ইংরেজি)' },
  descBn: { en: 'Description (BN)', bn: 'বিবরণ (বাংলা)' },
  eligEn: { en: 'Eligibility (EN)', bn: 'যোগ্যতা (ইংরেজি)' },
  eligBn: { en: 'Eligibility (BN)', bn: 'যোগ্যতা (বাংলা)' },
  bodyEn: { en: 'Body (EN)', bn: 'মূল অংশ (ইংরেজি)' },
  bodyBn: { en: 'Body (BN)', bn: 'মূল অংশ (বাংলা)' },
  publishUpdate: { en: 'Publish Update', bn: 'আপডেট প্রকাশ' },
  selectNoticeToEdit: { en: 'Select a notice to edit.', bn: 'সম্পাদনার জন্য একটি বিজ্ঞপ্তি নির্বাচন করুন।' },
  scholarshipTypeLabel: { en: 'Scholarship Type', bn: 'বৃত্তির ধরন' },
  windowStartLabel: { en: 'Application Window Start', bn: 'আবেদন সময়সীমার শুরু' },
  windowEndLabel: { en: 'Application Window End', bn: 'আবেদন সময়সীমার শেষ' },
  decisionDateLabel: { en: 'Decision Date', bn: 'সিদ্ধান্তের তারিখ' },
  statusLabel: { en: 'Status', bn: 'অবস্থা' },
  addCategoryBtn: { en: 'Add Category', bn: 'বিভাগ যোগ করুন' },
  nameEn: { en: 'Name (EN)', bn: 'নাম (ইংরেজি)' },
  nameBn: { en: 'Name (BN)', bn: 'নাম (বাংলা)' },
  removeCategory: { en: 'Remove Category', bn: 'বিভাগ সরান' },
  updateNoticeBtn: { en: 'Update Notice', bn: 'বিজ্ঞপ্তি আপডেট' },
  initialStatus: { en: 'Initial Status', bn: 'প্রাথমিক অবস্থা' },
  publishNoticeBtn: { en: 'Publish Notice', bn: 'বিজ্ঞপ্তি প্রকাশ' },
  reviewQueue: { en: 'Review Queue', bn: 'পর্যালোচনা সারি' },
  exportCsv: { en: 'Export CSV', bn: 'CSV রপ্তানি' },
  exportPdf: { en: 'Export PDF', bn: 'PDF রপ্তানি' },
  noApplicationsReview: { en: 'No applications to review.', bn: 'পর্যালোচনার জন্য কোনো আবেদন নেই।' },
  student: { en: 'Student', bn: 'শিক্ষার্থী' },
  action: { en: 'Action', bn: 'পদক্ষেপ' },
  reviewBtn: { en: 'Review', bn: 'পর্যালোচনা' },
  approve: { en: 'Approve', bn: 'অনুমোদন' },
  reject: { en: 'Reject', bn: 'প্রত্যাখ্যান' },
  reopenTitle: { en: 'Reopen application window', bn: 'আবেদন সময়সীমা পুনরায় খুলুন' },
  reopenLabel: { en: 'Reopen window', bn: 'উইন্ডো পুনরায় খুলুন' },
  noticeCol: { en: 'Notice', bn: 'বিজ্ঞপ্তি' },
  // messages / toasts
  msgSelectNotice: { en: 'Select a scholarship notice first.', bn: 'প্রথমে একটি বৃত্তি বিজ্ঞপ্তি নির্বাচন করুন।' },
  msgSelectCategory: { en: 'Select a scholarship category before submitting.', bn: 'জমা দেওয়ার আগে একটি বৃত্তি বিভাগ নির্বাচন করুন।' },
  msgNoticeNotFound: { en: 'Selected scholarship notice not found.', bn: 'নির্বাচিত বৃত্তি বিজ্ঞপ্তি পাওয়া যায়নি।' },
  msgWindowClosed: { en: 'Application window has closed', bn: 'আবেদন সময়সীমা বন্ধ হয়েছে' },
  msgWindowNotOpen: { en: 'Application window has not opened yet', bn: 'আবেদন সময়সীমা এখনও খোলেনি' },
  msgAppSubmitted: { en: 'Application submitted successfully.', bn: 'আবেদন সফলভাবে জমা হয়েছে।' },
  titleAppSent: { en: 'Scholarship application sent', bn: 'বৃত্তি আবেদন পাঠানো হয়েছে' },
  msgAppFailed: { en: 'Failed to submit application.', bn: 'আবেদন জমা দিতে ব্যর্থ।' },
  titleAppFailed: { en: 'Application failed', bn: 'আবেদন ব্যর্থ' },
  msgUniqueCodes: { en: 'Category codes must be unique.', bn: 'বিভাগ কোড অনন্য হতে হবে।' },
  msgNoticeCreated: { en: 'Scholarship notice created successfully.', bn: 'বৃত্তি বিজ্ঞপ্তি সফলভাবে তৈরি হয়েছে।' },
  titleNoticeCreated: { en: 'Notice created', bn: 'বিজ্ঞপ্তি তৈরি হয়েছে' },
  msgNoticeCreateFailed: { en: 'Failed to create scholarship notice.', bn: 'বৃত্তি বিজ্ঞপ্তি তৈরি করতে ব্যর্থ।' },
  titleNoticeCreateFailed: { en: 'Notice creation failed', bn: 'বিজ্ঞপ্তি তৈরি ব্যর্থ' },
  msgNoticeUpdated: { en: 'Scholarship notice updated successfully.', bn: 'বৃত্তি বিজ্ঞপ্তি সফলভাবে আপডেট হয়েছে।' },
  titleNoticeUpdated: { en: 'Notice updated', bn: 'বিজ্ঞপ্তি আপডেট হয়েছে' },
  msgNoticeUpdateFailed: { en: 'Failed to update scholarship notice.', bn: 'বৃত্তি বিজ্ঞপ্তি আপডেট করতে ব্যর্থ।' },
  titleNoticeUpdateFailed: { en: 'Notice update failed', bn: 'বিজ্ঞপ্তি আপডেট ব্যর্থ' },
  msgReviewUpdated: { en: 'Application review updated.', bn: 'আবেদন পর্যালোচনা আপডেট হয়েছে।' },
  msgReviewed: { en: 'Application reviewed.', bn: 'আবেদন পর্যালোচিত।' },
  titleReviewSaved: { en: 'Review saved', bn: 'পর্যালোচনা সংরক্ষিত' },
  msgReviewFailed: { en: 'Failed to update review status.', bn: 'পর্যালোচনার অবস্থা আপডেট করতে ব্যর্থ।' },
  titleReviewFailed: { en: 'Review failed', bn: 'পর্যালোচনা ব্যর্থ' },
  msgSelectBeforeExport: { en: 'Select a notice before export.', bn: 'রপ্তানির আগে একটি বিজ্ঞপ্তি নির্বাচন করুন।' },
  msgCsvDownloaded: { en: 'CSV export downloaded.', bn: 'CSV রপ্তানি ডাউনলোড হয়েছে।' },
  msgPdfDownloaded: { en: 'PDF export downloaded.', bn: 'PDF রপ্তানি ডাউনলোড হয়েছে।' },
  titleExportComplete: { en: 'Export complete', bn: 'রপ্তানি সম্পন্ন' },
  msgCsvFailed: { en: 'Failed to export applications.', bn: 'আবেদন রপ্তানি করতে ব্যর্থ।' },
  msgPdfFailed: { en: 'Failed to export applications as PDF.', bn: 'আবেদন PDF হিসেবে রপ্তানি করতে ব্যর্থ।' },
  titleExportFailed: { en: 'Export failed', bn: 'রপ্তানি ব্যর্থ' },
  msgNoticeMarked: { en: 'Notice marked as', bn: 'বিজ্ঞপ্তি চিহ্নিত হয়েছে:' },
  titleScholarshipUpdated: { en: 'Scholarship notice updated', bn: 'বৃত্তি বিজ্ঞপ্তি আপডেট হয়েছে' },
  msgStatusFailed: { en: 'Failed to update scholarship notice status.', bn: 'বৃত্তি বিজ্ঞপ্তির অবস্থা আপডেট করতে ব্যর্থ।' },
  msgWindowOpened: { en: 'Application window opened.', bn: 'আবেদন সময়সীমা খোলা হয়েছে।' },
  msgWindowNowOpen: { en: 'Application window is now open.', bn: 'আবেদন সময়সীমা এখন খোলা।' },
  msgWindowOpenFailed: { en: 'Failed to open the application window.', bn: 'আবেদন সময়সীমা খুলতে ব্যর্থ।' },
  msgRecipientsPublished: { en: 'Recipient list published.', bn: 'প্রাপক তালিকা প্রকাশিত হয়েছে।' },
  msgRecipientsUnpublished: { en: 'Recipient list unpublished.', bn: 'প্রাপক তালিকা অপ্রকাশিত হয়েছে।' },
  titleRecipientsUpdated: { en: 'Recipient list updated', bn: 'প্রাপক তালিকা আপডেট হয়েছে' },
  msgRecipientPubFailed: { en: 'Failed to update recipient publication status.', bn: 'প্রাপক প্রকাশনার অবস্থা আপডেট করতে ব্যর্থ।' },
  titleRecipientPubFailed: { en: 'Recipient publication failed', bn: 'প্রাপক প্রকাশনা ব্যর্থ' },
  msgUpdatePublished: { en: 'Scholarship update published.', bn: 'বৃত্তি আপডেট প্রকাশিত হয়েছে।' },
  titleUpdateFeed: { en: 'Update feed', bn: 'আপডেট ফিড' },
  msgUpdateFailed: { en: 'Failed to publish scholarship update.', bn: 'বৃত্তি আপডেট প্রকাশ করতে ব্যর্থ।' },
  titleUpdateFailed: { en: 'Update publish failed', bn: 'আপডেট প্রকাশ ব্যর্থ' },
  msgTimelineFailed: { en: 'Failed to load scholarship update timeline.', bn: 'বৃত্তি আপডেট টাইমলাইন লোড করতে ব্যর্থ।' },
  msgRecipientsLoadFailed: { en: 'Failed to load scholarship recipients for this notice.', bn: 'এই বিজ্ঞপ্তির বৃত্তিপ্রাপ্ত লোড করতে ব্যর্থ।' },
  msgRecipientsUpdatesFailed: { en: 'Failed to load scholarship recipients and updates.', bn: 'বৃত্তিপ্রাপ্ত ও আপডেট লোড করতে ব্যর্থ।' },
  msgInfoLoadFailed: { en: 'Failed to load scholarship information.', bn: 'বৃত্তি তথ্য লোড করতে ব্যর্থ।' }
};

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
  const t = useCallback((key) => toLocalizedText(T[key], language), [language]);
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

  const [applyModalOpen, setApplyModalOpen] = useState(false);
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

  // The *live* state (computed from the dates by the API) is the single source of
  // truth for whether applications are accepted — not the raw `status` toggle.
  const liveState = selectedNotice
    ? selectedNotice.applicationState || selectedNotice.status
    : '';
  const rawStatus = selectedNotice ? selectedNotice.status : '';
  const canAcceptApplications = liveState === 'open';
  // Admin marked it open, but the calendar says otherwise (window ended / not started).
  const stateMismatch =
    selectedNotice && rawStatus === 'open' && liveState !== 'open' ? liveState : '';

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
          getApiErrorMessage(apiError, t('msgTimelineFailed'))
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
            getApiErrorMessage(recipientResult.reason, t('msgRecipientsLoadFailed'))
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
        setMessage(getApiErrorMessage(apiError, t('msgRecipientsUpdatesFailed')));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      setError(getApiErrorMessage(apiError, t('msgInfoLoadFailed')));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      setMessage(t('msgSelectNotice'));
      return;
    }

    if (selectedNoticeCategories.length && !applicationForm.selectedCategoryCode) {
      setMessage(t('msgSelectCategory'));
      return;
    }

    try {
      // Refresh notice list and details to ensure latest window/status before submitting
      const freshNotices = await loadNotices();
      await loadNoticeDetails();

      const freshNotice = freshNotices.find((n) => n._id === selectedNoticeId);

      if (!freshNotice) {
        setMessage(t('msgNoticeNotFound'));
        return;
      }

      const liveState = freshNotice.applicationState || freshNotice.status;
      if (liveState === 'closed') {
        setMessage(t('msgWindowClosed'));
        return;
      }

      if (liveState === 'scheduled') {
        setMessage(t('msgWindowNotOpen'));
        return;
      }

      await scholarshipApi.apply(selectedNoticeId, {
        statement: applicationForm.statement,
        gpa: Number(applicationForm.gpa),
        department: applicationForm.department,
        selectedCategoryCode: applicationForm.selectedCategoryCode || undefined,
        documents: []
      });

      setMessage(t('msgAppSubmitted'));
      success(t('msgAppSubmitted'), { title: t('titleAppSent') });
      setApplyModalOpen(false);
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
      const nextMessage = getApiErrorMessage(apiError, t('msgAppFailed'));
      setMessage(nextMessage);
      toastError(nextMessage, { title: t('titleAppFailed') });
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
        throw new Error(t('msgUniqueCodes'));
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

      setMessage(t('msgNoticeCreated'));
      success(t('msgNoticeCreated'), { title: t('titleNoticeCreated') });
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
        toastError(apiError.message, { title: t('titleNoticeCreateFailed') });
      } else {
        const nextMessage = getApiErrorMessage(apiError, t('msgNoticeCreateFailed'));
        setMessage(nextMessage);
        toastError(nextMessage, { title: t('titleNoticeCreateFailed') });
      }
    }
  };

  const submitNoticeEdit = async (event) => {
    event.preventDefault();
    setMessage('');

    if (!selectedNoticeId) {
      setMessage(t('msgSelectNotice'));
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

      setMessage(t('msgNoticeUpdated'));
      success(t('msgNoticeUpdated'), { title: t('titleNoticeUpdated') });
      await loadNotices();
      await loadNoticeDetails();
    } catch (apiError) {
      if (apiError instanceof Error && !apiError.response) {
        setMessage(apiError.message);
        toastError(apiError.message, { title: t('titleNoticeUpdateFailed') });
      } else {
        const nextMessage = getApiErrorMessage(apiError, t('msgNoticeUpdateFailed'));
        setMessage(nextMessage);
        toastError(nextMessage, { title: t('titleNoticeUpdateFailed') });
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

      setMessage(t('msgReviewUpdated'));
      success(t('msgReviewed'), { title: t('titleReviewSaved') });
      closeReviewModal();
      await loadApplications();
      await loadMyApplications();
      await loadNoticeDetails();
    } catch (apiError) {
      const nextMessage = getApiErrorMessage(apiError, t('msgReviewFailed'));
      setMessage(nextMessage);
      toastError(nextMessage, { title: t('titleReviewFailed') });
    }
  };

  const exportCsv = async () => {
    if (!selectedNoticeId) {
      setMessage(t('msgSelectBeforeExport'));
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
      setMessage(t('msgCsvDownloaded'));
      info(t('msgCsvDownloaded'), { title: t('titleExportComplete') });
    } catch (apiError) {
      const nextMessage = getApiErrorMessage(apiError, t('msgCsvFailed'));
      setMessage(nextMessage);
      toastError(nextMessage, { title: t('titleExportFailed') });
    }
  };

  const exportPdf = async () => {
    if (!selectedNoticeId) {
      setMessage(t('msgSelectBeforeExport'));
      return;
    }

    try {
      const response = await scholarshipApi.exportApplicationsPdf({ noticeId: selectedNoticeId });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `scholarship-applications-${selectedNoticeId}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
      setMessage(t('msgPdfDownloaded'));
      info(t('msgPdfDownloaded'), { title: t('titleExportComplete') });
    } catch (apiError) {
      const nextMessage = getApiErrorMessage(apiError, t('msgPdfFailed'));
      setMessage(nextMessage);
      toastError(nextMessage, { title: t('titleExportFailed') });
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
      const markedMsg = `${t('msgNoticeMarked')} ${status}.`;
      setMessage(markedMsg);
      success(markedMsg, { title: t('titleScholarshipUpdated') });
      await loadNotices();
      await loadNoticeDetails();
    } catch (apiError) {
      const nextMessage = getApiErrorMessage(apiError, t('msgStatusFailed'));
      setMessage(nextMessage);
      toastError(nextMessage, { title: t('titleNoticeUpdateFailed') });
    }
  };

  // "Open Window" that actually opens it: marks the notice open AND, if the
  // window/deadline has already passed, extends it so applications are truly
  // accepted (a plain status flip would leave the live state "closed").
  const [reopenPlan, setReopenPlan] = useState(null);

  const openApplicationWindow = () => {
    if (!selectedNoticeId || !selectedNotice) {
      return;
    }

    const now = new Date();
    const currentEnd = new Date(
      selectedNotice.applicationWindowEnd || selectedNotice.deadline || 0
    );
    const needsExtension = !currentEnd.getTime() || currentEnd.getTime() <= now.getTime();
    const newEnd = needsExtension ? new Date(now.getTime() + 30 * DAY_MS) : currentEnd;

    const currentDeadline = new Date(selectedNotice.deadline || 0);
    const newDeadline =
      currentDeadline.getTime() >= newEnd.getTime() ? currentDeadline : newEnd;

    const plan = { now, newEnd, newDeadline };

    if (needsExtension) {
      setReopenPlan(plan);
      return;
    }

    executeOpenWindow(plan);
  };

  const executeOpenWindow = async ({ now, newEnd, newDeadline }) => {
    setReopenPlan(null);

    try {
      await scholarshipApi.updateNotice(selectedNoticeId, {
        status: 'open',
        applicationWindowStart: now.toISOString(),
        applicationWindowEnd: newEnd.toISOString(),
        deadline: newDeadline.toISOString()
      });
      setMessage(t('msgWindowOpened'));
      success(t('msgWindowNowOpen'), { title: t('titleScholarshipUpdated') });
      await loadNotices();
      await loadNoticeDetails();
    } catch (apiError) {
      const nextMessage = getApiErrorMessage(apiError, t('msgWindowOpenFailed'));
      setMessage(nextMessage);
      toastError(nextMessage, { title: t('titleNoticeUpdateFailed') });
    }
  };

  const publishRecipients = async (publish) => {
    if (!selectedNoticeId) {
      return;
    }

    try {
      await scholarshipApi.publishRecipients(selectedNoticeId, { publish });
      const recipMsg = publish ? t('msgRecipientsPublished') : t('msgRecipientsUnpublished');
      setMessage(recipMsg);
      success(recipMsg, { title: t('titleRecipientsUpdated') });
      await loadNoticeDetails();
    } catch (apiError) {
      const nextMessage = getApiErrorMessage(apiError, t('msgRecipientPubFailed'));
      setMessage(nextMessage);
      toastError(nextMessage, { title: t('titleRecipientPubFailed') });
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
      setMessage(t('msgSelectNotice'));
      return;
    }

    try {
      await scholarshipApi.createNoticeUpdate(selectedNoticeId, updateForm);
      setMessage(t('msgUpdatePublished'));
      info(t('msgUpdatePublished'), { title: t('titleUpdateFeed') });
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
      const nextMessage = getApiErrorMessage(apiError, t('msgUpdateFailed'));
      setMessage(nextMessage);
      toastError(nextMessage, { title: t('titleUpdateFailed') });
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
              { number: '1', label: t('step1') },
              { number: '2', label: t('step2') },
              { number: '3', label: t('step3') }
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
          <p className="kpi-label">{t('openNotices')}</p>
          <p className="kpi-value">{dashboardStats.openNotices}</p>
          <p className="kpi-note">{t('openNoticesNote')}</p>
        </article>
        <article className="kpi-card">
          <p className="kpi-label">{t('noticeCategories')}</p>
          <p className="kpi-value">{dashboardStats.activeCategories}</p>
          <p className="kpi-note">{t('noticeCategoriesNote')}</p>
        </article>
        <article className="kpi-card">
          <p className="kpi-label">{t('recipientsListed')}</p>
          <p className="kpi-value">{dashboardStats.recipientCount}</p>
          <p className="kpi-note">{t('recipientsNote')}</p>
        </article>
        <article className="kpi-card">
          <p className="kpi-label">{canReview ? t('pendingReviews') : t('myApplications')}</p>
          <p className="kpi-value">{dashboardStats.reviewCount}</p>
          <p className="kpi-note">
            {canReview ? t('submittedOrReview') : t('submittedInAccount')}
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
                {/* Badge reflects the LIVE state (computed from dates), so a notice
                    whose deadline has passed reads "Closed" even if still toggled open. */}
                <span className={`status-badge ${stateBadgeClass(liveState)}`}>
                  {stateLabel(liveState, language)}
                </span>
              </div>

              <p className="scholarship-notice-card__description">
                {toLocalizedText(selectedNotice.description, language)}
              </p>
              <p className="scholarship-notice-card__eligibility">
                {toLocalizedText(selectedNotice.eligibility, language)}
              </p>
              <p className="meta scholarship-notice-card__meta">
                {t('type')}: {selectedNotice.scholarshipType || 'one_off'} • {t('applicationWindow')}:{' '}
                {toIsoDate(selectedNotice.applicationWindowStart) || '—'} to{' '}
                {toIsoDate(selectedNotice.applicationWindowEnd) || '—'} • {t('decisionDate')}:{' '}
                {toIsoDate(selectedNotice.deadline) || '—'}
              </p>

              {stateMismatch === 'closed' && canManageNotices && (
                <InlineAlert type="warning">
                  {toLocalizedText(
                    {
                      en: 'This notice is toggled Open, but its application window has already closed, so students cannot apply. Use "Open Window" below to reopen and extend it.',
                      bn: 'এই বিজ্ঞপ্তিটি "খোলা" করা আছে, কিন্তু আবেদন সময়সীমা ইতিমধ্যে বন্ধ হয়ে গেছে, তাই শিক্ষার্থীরা আবেদন করতে পারছে না। পুনরায় খুলতে ও বাড়াতে নিচের "উইন্ডো খুলুন" ব্যবহার করুন।'
                    },
                    language
                  )}
                </InlineAlert>
              )}
              {stateMismatch === 'scheduled' && canManageNotices && (
                <InlineAlert type="info">
                  {toLocalizedText(
                    {
                      en: `This notice is Open but its window has not started yet (opens ${toIsoDate(selectedNotice.applicationWindowStart)}). Applications open automatically on that date, or use "Open Window" to start now.`,
                      bn: `এই বিজ্ঞপ্তিটি "খোলা" কিন্তু এর উইন্ডো এখনও শুরু হয়নি (খুলবে ${toIsoDate(selectedNotice.applicationWindowStart)})। ওই তারিখে আবেদন স্বয়ংক্রিয়ভাবে খুলবে, অথবা এখনই শুরু করতে "উইন্ডো খুলুন" ব্যবহার করুন।`
                    },
                    language
                  )}
                </InlineAlert>
              )}

              {!!selectedNoticeCategories.length && (
                <div className="table-wrap scholarship-category-table" id="scholarship-category-table">
                  <table>
                    <thead>
                      <tr>
                        <th>{t('category')}</th>
                        <th>{t('code')}</th>
                        <th>{t('amount')}</th>
                        <th>{t('slots')}</th>
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
                    <h4>{t('yourApplication')}</h4>
                    <span className={`status-badge status-${selectedNoticeApplication.status}`}>
                      {selectedNoticeApplication.status}
                    </span>
                  </div>
                  <p className="meta">
                    {t('submitted')} {toIsoDate(selectedNoticeApplication.createdAt)} • GPA:{' '}
                    {selectedNoticeApplication.gpa}
                  </p>
                  {selectedNoticeApplication.decisionNote && (
                    <p>{selectedNoticeApplication.decisionNote}</p>
                  )}
                  {selectedNoticeApplication.awardedAmount && (
                    <p className="meta">
                      {t('award')} {selectedNoticeApplication.awardedAmount}
                      {selectedNoticeApplication.awardedCategoryCode
                        ? ` (${selectedNoticeApplication.awardedCategoryCode})`
                        : ''}
                    </p>
                  )}
                </article>
              )}

              <div className="notice-card-actions">
                {canApply && !selectedNoticeApplication && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setApplyModalOpen(true)}
                    disabled={!selectedNotice || !canAcceptApplications}
                    title={
                      canAcceptApplications
                        ? t('openFormHint')
                        : `${t('notAcceptingHint')} (${stateLabel(liveState, language)})`
                    }
                  >
                    {t('applyNow')}
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => document.getElementById('scholarship-notice-summary')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                >
                  {t('viewDetails')}
                </button>
                <button type="button" className="btn btn-ghost" onClick={downloadSelectedNoticeInfo}>
                  {t('downloadInfo')}
                </button>
              </div>

              {canManageNotices && (
                <div className="inline-actions" style={{ marginTop: '0.7rem' }}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={openApplicationWindow}
                  >
                    {t('openWindow')}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => updateNoticeStatus('closed')}
                  >
                    {t('closeWindow')}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => updateNoticeStatus('draft')}
                  >
                    {t('moveToDraft')}
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
                      ? t('unpublishRecipients')
                      : t('publishRecipientsLabel')}
                  </button>
                </div>
              )}
            </article>
          )}
        </article>

        {!!orderedGlobalUpdates.length && (
          <article className="surface-card scholarship-feed-card">
            <h3>{t('feedTitle')}</h3>
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
                    {t('notice')} {toLocalizedText(item.notice?.title, language)} • {t('posted')}{' '}
                    {toIsoDate(item.createdAt)}
                  </p>
                </article>
              ))}
            </div>
          </article>
        )}
      </div>

      <Modal
        isOpen={applyModalOpen && isAuthenticated && canApply && !selectedNoticeApplication}
        onClose={() => setApplyModalOpen(false)}
        title={ui('scholarship', 'applyTitle', language)}
      >
        <form
          className="modal-form form-grid"
          id="scholarship-application-form"
          onSubmit={submitApplication}
        >
          {selectedNotice && (
            <p className="modal-form__lead">{toLocalizedText(selectedNotice.title, language)}</p>
          )}

          {!selectedNoticeId && (
            <InlineAlert type="info">{t('selectNoticeAbove')}</InlineAlert>
          )}
          {selectedNoticeId && !canAcceptApplications && (
            <InlineAlert type="warning">
              {applyBlockedMessage(liveState, selectedNotice?.applicationWindowStart, language)}
            </InlineAlert>
          )}

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
              rows={6}
              value={applicationForm.statement}
              onChange={(event) =>
                setApplicationForm((prev) => ({ ...prev, statement: event.target.value }))
              }
              required
            />
          </label>

          <div className="modal-form__row">
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
          </div>

          <div className="modal-form__actions">
            <button type="button" className="btn btn-ghost" onClick={() => setApplyModalOpen(false)}>
              {t('cancel')}
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!selectedNoticeId || !canAcceptApplications}
              title={canAcceptApplications ? t('submitHint') : t('notAcceptingHint')}
            >
              {t('submitApplication')}
            </button>
          </div>
        </form>
      </Modal>

      {selectedNotice && (
        <div className="workflow-grid workflow-grid-2 scholarship-notice-panel-grid">
          <CollapsibleSection title={t('recipientList')} defaultOpen={false}>
            {recipientInfo.recipientsPublishedAt && (
              <p className="meta">{t('published')} {toIsoDate(recipientInfo.recipientsPublishedAt)}</p>
            )}

            {!orderedRecipients.length && !recipientInfo.isRestricted && (
              <div className="empty-state empty-state--center">
                <div className="empty-state__icon" aria-hidden="true">
                  •
                </div>
                <p className="empty-state__title">{t('noRecipientsYet')}</p>
                <p className="empty-state__text">{t('recipientsAfterPub')}</p>
              </div>
            )}
            {recipientInfo.isRestricted && !canReview && (
              <p className="meta">{t('recipientNotPublished')}</p>
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
                        <h4>{item.student?.fullName || t('unknown')}</h4>
                        <p>{item.department}</p>
                      </div>
                      <span className="recipient-card__badge">
                        {item.awardedCategoryCode || item.selectedCategoryCode || t('awarded')}
                      </span>
                    </article>
                  );
                })}
              </div>
            )}
          </CollapsibleSection>

          <CollapsibleSection title={t('updateTimeline')} defaultOpen={false}>
            {!orderedNoticeUpdates.length && <p>{t('noUpdatesYet')}</p>}
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
                          <span className="status-badge status-draft">{t('internalBadge')}</span>
                        )}
                      </div>
                      <p>{toLocalizedText(item.body, language)}</p>
                      <p className="meta scholarship-timeline__meta">
                        {item.visibility} • {t('postedBy')} {item.postedBy?.fullName || t('systemFallback')} •{' '}
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
                  {t('updateType')}
                  <select
                    value={updateForm.kind}
                    onChange={(event) =>
                      setUpdateForm((prev) => ({ ...prev, kind: event.target.value }))
                    }
                  >
                    <option value="general">{t('general')}</option>
                    <option value="deadline">{t('deadline')}</option>
                    <option value="recipient">{t('recipient')}</option>
                    <option value="announcement">{t('announcement')}</option>
                  </select>
                </label>

                <label>
                  {t('visibility')}
                  <select
                    value={updateForm.visibility}
                    onChange={(event) =>
                      setUpdateForm((prev) => ({ ...prev, visibility: event.target.value }))
                    }
                  >
                    <option value="public">{t('publicVis')}</option>
                    <option value="internal">{t('internalVis')}</option>
                  </select>
                </label>

                <label>
                  {t('titleEn')}
                  <input
                    value={updateForm.title.en}
                    onChange={(event) =>
                      updateUpdateFormLocalized('title', 'en', event.target.value)
                    }
                    required
                  />
                </label>

                <label>
                  {t('titleBn')}
                  <input
                    value={updateForm.title.bn}
                    onChange={(event) =>
                      updateUpdateFormLocalized('title', 'bn', event.target.value)
                    }
                    required
                  />
                </label>

                <label>
                  {t('bodyEn')}
                  <textarea
                    value={updateForm.body.en}
                    onChange={(event) =>
                      updateUpdateFormLocalized('body', 'en', event.target.value)
                    }
                    required
                  />
                </label>

                <label>
                  {t('bodyBn')}
                  <textarea
                    value={updateForm.body.bn}
                    onChange={(event) =>
                      updateUpdateFormLocalized('body', 'bn', event.target.value)
                    }
                    required
                  />
                </label>

                <button type="submit" className="btn btn-primary">
                  {t('publishUpdate')}
                </button>
              </form>
            )}
          </CollapsibleSection>
        </div>
      )}

      {(canManageNotices || canReview) && (
        <CollapsibleSection title={t('adminPanel')} defaultOpen={false}>
          <div className="workflow-grid workflow-grid-2">
            {canManageNotices && (
              <article className="surface-card">
                <h3>{t('editSelectedNotice')}</h3>
                {!selectedNotice && <p>{t('selectNoticeToEdit')}</p>}
                {selectedNotice && (
                  <form className="form-grid" onSubmit={submitNoticeEdit}>
                  <label>
                    {t('titleEn')}
                    <input
                      value={editNoticeForm.title.en}
                      onChange={(event) =>
                        updateEditNoticeLocalized('title', 'en', event.target.value)
                      }
                      required
                    />
                  </label>
                  <label>
                    {t('titleBn')}
                    <input
                      value={editNoticeForm.title.bn}
                      onChange={(event) =>
                        updateEditNoticeLocalized('title', 'bn', event.target.value)
                      }
                      required
                    />
                  </label>

                  <label>
                    {t('descEn')}
                    <textarea
                      value={editNoticeForm.description.en}
                      onChange={(event) =>
                        updateEditNoticeLocalized('description', 'en', event.target.value)
                      }
                      required
                    />
                  </label>

                  <label>
                    {t('descBn')}
                    <textarea
                      value={editNoticeForm.description.bn}
                      onChange={(event) =>
                        updateEditNoticeLocalized('description', 'bn', event.target.value)
                      }
                      required
                    />
                  </label>

                  <label>
                    {t('eligEn')}
                    <textarea
                      value={editNoticeForm.eligibility.en}
                      onChange={(event) =>
                        updateEditNoticeLocalized('eligibility', 'en', event.target.value)
                      }
                      required
                    />
                  </label>

                  <label>
                    {t('eligBn')}
                    <textarea
                      value={editNoticeForm.eligibility.bn}
                      onChange={(event) =>
                        updateEditNoticeLocalized('eligibility', 'bn', event.target.value)
                      }
                      required
                    />
                  </label>

                  <label>
                    {t('scholarshipTypeLabel')}
                    <select
                      value={editNoticeForm.scholarshipType}
                      onChange={(event) =>
                        setEditNoticeForm((prev) => ({
                          ...prev,
                          scholarshipType: event.target.value
                        }))
                      }
                    >
                      <option value="one_off">{t('oneOff')}</option>
                      <option value="monthly">{t('monthly')}</option>
                    </select>
                  </label>

                  <label>
                    {t('windowStartLabel')}
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
                    {t('windowEndLabel')}
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
                    {t('decisionDateLabel')}
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
                    {t('statusLabel')}
                    <select
                      value={editNoticeForm.status}
                      onChange={(event) =>
                        setEditNoticeForm((prev) => ({ ...prev, status: event.target.value }))
                      }
                    >
                      <option value="draft">{t('draftOpt')}</option>
                      <option value="open">{t('openOpt')}</option>
                      <option value="closed">{t('closedOpt')}</option>
                    </select>
                  </label>

                  <div className="surface-card inner-card">
                    <div className="section-head section-head-tight">
                      <h3>{t('categoryMatrix')}</h3>
                      <button type="button" className="btn btn-ghost" onClick={addEditCategoryRow}>
                        {t('addCategoryBtn')}
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
                              {t('code')}
                              <input
                                value={category.code}
                                onChange={(event) =>
                                  updateEditCategoryField(index, 'code', event.target.value)
                                }
                                placeholder="merit"
                              />
                            </label>
                            <label>
                              {t('nameEn')}
                              <input
                                value={category.nameEn}
                                onChange={(event) =>
                                  updateEditCategoryField(index, 'nameEn', event.target.value)
                                }
                              />
                            </label>
                            <label>
                              {t('nameBn')}
                              <input
                                value={category.nameBn}
                                onChange={(event) =>
                                  updateEditCategoryField(index, 'nameBn', event.target.value)
                                }
                              />
                            </label>
                            <label>
                              {t('amount')}
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
                              {t('slots')}
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
                              {t('removeCategory')}
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>

                  <button type="submit" className="btn btn-primary">
                    {t('updateNoticeBtn')}
                  </button>
                </form>
              )}
            </article>
          )}

          {canManageNotices && (
            <article className="surface-card">
              <h3>{t('publishNotice')}</h3>
              <form className="form-grid" onSubmit={submitNotice}>
                <label>
                  {t('titleEn')}
                  <input
                    value={noticeForm.title.en}
                    onChange={(event) => updateNoticeLocalized('title', 'en', event.target.value)}
                    required
                  />
                </label>
                <label>
                  {t('titleBn')}
                  <input
                    value={noticeForm.title.bn}
                    onChange={(event) => updateNoticeLocalized('title', 'bn', event.target.value)}
                    required
                  />
                </label>

                <label>
                  {t('descEn')}
                  <textarea
                    value={noticeForm.description.en}
                    onChange={(event) =>
                      updateNoticeLocalized('description', 'en', event.target.value)
                    }
                    required
                  />
                </label>

                <label>
                  {t('descBn')}
                  <textarea
                    value={noticeForm.description.bn}
                    onChange={(event) =>
                      updateNoticeLocalized('description', 'bn', event.target.value)
                    }
                    required
                  />
                </label>

                <label>
                  {t('eligEn')}
                  <textarea
                    value={noticeForm.eligibility.en}
                    onChange={(event) =>
                      updateNoticeLocalized('eligibility', 'en', event.target.value)
                    }
                    required
                  />
                </label>

                <label>
                  {t('eligBn')}
                  <textarea
                    value={noticeForm.eligibility.bn}
                    onChange={(event) =>
                      updateNoticeLocalized('eligibility', 'bn', event.target.value)
                    }
                    required
                  />
                </label>

                <label>
                  {t('scholarshipTypeLabel')}
                  <select
                    value={noticeForm.scholarshipType}
                    onChange={(event) =>
                      setNoticeForm((prev) => ({ ...prev, scholarshipType: event.target.value }))
                    }
                  >
                    <option value="one_off">{t('oneOff')}</option>
                    <option value="monthly">{t('monthly')}</option>
                  </select>
                </label>

                <label>
                  {t('windowStartLabel')}
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
                  {t('windowEndLabel')}
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
                  {t('decisionDateLabel')}
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
                  {t('initialStatus')}
                  <select
                    value={noticeForm.status}
                    onChange={(event) =>
                      setNoticeForm((prev) => ({ ...prev, status: event.target.value }))
                    }
                  >
                    <option value="draft">{t('draftOpt')}</option>
                    <option value="open">{t('openOpt')}</option>
                    <option value="closed">{t('closedOpt')}</option>
                  </select>
                </label>

                <div className="surface-card inner-card">
                  <div className="section-head section-head-tight">
                    <h3>{t('categoryMatrix')}</h3>
                    <button type="button" className="btn btn-ghost" onClick={addCategoryRow}>
                      {t('addCategoryBtn')}
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
                            {t('code')}
                            <input
                              value={category.code}
                              onChange={(event) =>
                                updateCategoryField(index, 'code', event.target.value)
                              }
                              placeholder="merit"
                            />
                          </label>
                          <label>
                            {t('nameEn')}
                            <input
                              value={category.nameEn}
                              onChange={(event) =>
                                updateCategoryField(index, 'nameEn', event.target.value)
                              }
                            />
                          </label>
                          <label>
                            {t('nameBn')}
                            <input
                              value={category.nameBn}
                              onChange={(event) =>
                                updateCategoryField(index, 'nameBn', event.target.value)
                              }
                            />
                          </label>
                          <label>
                            {t('amount')}
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
                            {t('slots')}
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
                            {t('removeCategory')}
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>

                <button type="submit" className="btn btn-primary">
                  {t('publishNoticeBtn')}
                </button>
              </form>
            </article>
          )}

          {canReview && (
            <article className="surface-card">
              <div className="section-head section-head-tight">
                <h3>{t('reviewQueue')}</h3>
                <div className="inline-actions">
                  <button type="button" className="btn btn-ghost" onClick={exportCsv}>
                    {t('exportCsv')}
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={exportPdf}>
                    {t('exportPdf')}
                  </button>
                </div>
              </div>

              {!orderedApplications.length && <p>{t('noApplicationsReview')}</p>}
              {!!orderedApplications.length && (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>{t('student')}</th>
                        <th>{t('noticeCol')}</th>
                        <th>{t('category')}</th>
                        <th>GPA</th>
                        <th>{t('statusLabel')}</th>
                        <th>{t('action')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderedApplications.map((item) => (
                        <tr key={item._id}>
                          <td>{item.student?.fullName || t('unknown')}</td>
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
                                {t('reviewBtn')}
                              </button>
                              <button
                                type="button"
                                className="btn btn-ghost"
                                onClick={() => openReviewModal(item, 'approved')}
                              >
                                {t('approve')}
                              </button>
                              <button
                                type="button"
                                className="btn btn-ghost"
                                onClick={() => openReviewModal(item, 'rejected')}
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

      <ConfirmDialog
        isOpen={Boolean(reopenPlan)}
        onClose={() => setReopenPlan(null)}
        onConfirm={() => reopenPlan && executeOpenWindow(reopenPlan)}
        title={t('reopenTitle')}
        message={
          reopenPlan
            ? toLocalizedText(
                {
                  en: `This notice's application window has passed. Reopen it and accept applications until ${toIsoDate(reopenPlan.newEnd)}?`,
                  bn: `এই বিজ্ঞপ্তির আবেদন সময়সীমা পেরিয়ে গেছে। এটি পুনরায় খুলে ${toIsoDate(reopenPlan.newEnd)} পর্যন্ত আবেদন গ্রহণ করবেন?`
                },
                language
              )
            : ''
        }
        confirmLabel={t('reopenLabel')}
        tone="primary"
      />
    </section>
  );
}

export default ScholarshipPage;
