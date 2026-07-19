import { useCallback, useEffect, useMemo, useState } from 'react';
import { eventApi } from '../../api/modules';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import SkeletonCard from '../../components/ui/SkeletonCard';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import useRole from '../../hooks/useRole';
import useLanguage from '../../hooks/useLanguage';
import { ui } from '../../i18n/publicUi';
import { getApiErrorMessage } from '../../utils/http';
import { toIsoDate, toLocalDateTime, toLocalizedText } from '../../utils/localized';

const T = {
  publishedEvents: { en: 'Published Events', bn: 'প্রকাশিত ইভেন্ট' },
  visibleRecords: { en: 'Current visible event records', bn: 'বর্তমানে দৃশ্যমান ইভেন্ট রেকর্ড' },
  calendarEntries: { en: 'Calendar Entries', bn: 'ক্যালেন্ডার এন্ট্রি' },
  inDateRange: { en: 'In selected date range', bn: 'নির্বাচিত তারিখ সীমায়' },
  registrations: { en: 'Registrations', bn: 'নিবন্ধন' },
  acrossCalendar: { en: 'Across loaded calendar items', bn: 'লোড করা ক্যালেন্ডার আইটেম জুড়ে' },
  checkedIn: { en: 'Checked In', bn: 'চেক-ইন হয়েছে' },
  seatsLeft: { en: 'Available seats left:', bn: 'অবশিষ্ট আসন:' },
  eventPrograms: { en: 'EVENT PROGRAMS', bn: 'ইভেন্ট প্রোগ্রাম' },
  publicCalendar: { en: 'Public Event Calendar', bn: 'পাবলিক ইভেন্ট ক্যালেন্ডার' },
  filterByDate: { en: 'Filter by date range', bn: 'তারিখ সীমা দিয়ে ফিল্টার' },
  apply: { en: 'Apply', bn: 'প্রয়োগ' },
  reset: { en: 'Reset', bn: 'রিসেট' },
  noEventsRange: { en: 'No events in this range', bn: 'এই সীমায় কোনো ইভেন্ট নেই' },
  adjustRange: { en: 'Try adjusting the date range above.', bn: 'উপরের তারিখ সীমা পরিবর্তন করে দেখুন।' },
  date: { en: 'Date', bn: 'তারিখ' },
  event: { en: 'Event', bn: 'ইভেন্ট' },
  location: { en: 'Location', bn: 'অবস্থান' },
  registered: { en: 'Registered', bn: 'নিবন্ধিত' },
  availableSeats: { en: 'Available Seats', bn: 'উপলব্ধ আসন' },
  eventsCount: { en: 'events', bn: 'ইভেন্ট' },
  seatInsights: { en: 'Registration and seat insights update from the event calendar.', bn: 'নিবন্ধন ও আসন তথ্য ইভেন্ট ক্যালেন্ডার থেকে আপডেট হয়।' },
  noEventsPublished: { en: 'No events published yet.', bn: 'এখনও কোনো ইভেন্ট প্রকাশিত হয়নি।' },
  upcoming: { en: 'Upcoming', bn: 'আসন্ন' },
  past: { en: 'Past', bn: 'বিগত' },
  seats: { en: 'seats', bn: 'আসন' },
  deadlinePassed: { en: 'Deadline passed', bn: 'শেষ তারিখ পেরিয়েছে' },
  registeredLabel: { en: 'Registered:', bn: 'নিবন্ধিত:' },
  checkedInLabel: { en: 'Checked in:', bn: 'চেক-ইন:' },
  remaining: { en: 'Remaining:', bn: 'অবশিষ্ট:' },
  register: { en: 'Register', bn: 'নিবন্ধন করুন' },
  manage: { en: 'Manage', bn: 'পরিচালনা' },
  showMorePast: { en: 'Show more past events ↓', bn: 'আরও বিগত ইভেন্ট দেখুন ↓' },
  myPasses: { en: 'My Event Passes', bn: 'আমার ইভেন্ট পাস' },
  passesHint: { en: 'Your registrations across all events. Re-open a QR pass any time for check-in.', bn: 'সব ইভেন্টে আপনার নিবন্ধন। চেক-ইনের জন্য যেকোনো সময় QR পাস খুলুন।' },
  when: { en: 'When', bn: 'কখন' },
  status: { en: 'Status', bn: 'অবস্থা' },
  actions: { en: 'Actions', bn: 'পদক্ষেপ' },
  eventFallback: { en: 'Event', bn: 'ইভেন্ট' },
  feedbackLabel: { en: 'Feedback:', bn: 'মতামত:' },
  showQr: { en: 'Show QR', bn: 'QR দেখুন' },
  cancel: { en: 'Cancel', bn: 'বাতিল' },
  yourQr: { en: 'Your Registration QR', bn: 'আপনার নিবন্ধন QR' },
  useQrHint: { en: 'Use this QR token for event check-in.', bn: 'ইভেন্ট চেক-ইনের জন্য এই QR টোকেন ব্যবহার করুন।' },
  qrAlt: { en: 'Event registration QR code', bn: 'ইভেন্ট নিবন্ধন QR কোড' },
  token: { en: 'Token:', bn: 'টোকেন:' },
  feedbackRating: { en: 'Feedback Rating', bn: 'মতামত রেটিং' },
  rate5: { en: '5 - Excellent', bn: '৫ - চমৎকার' },
  rate4: { en: '4 - Good', bn: '৪ - ভালো' },
  rate3: { en: '3 - Average', bn: '৩ - মাঝারি' },
  rate2: { en: '2 - Needs Improvement', bn: '২ - উন্নতি প্রয়োজন' },
  rate1: { en: '1 - Poor', bn: '১ - খারাপ' },
  comment: { en: 'Comment', bn: 'মন্তব্য' },
  submitFeedback: { en: 'Submit Feedback', bn: 'মতামত জমা দিন' },
  editEvent: { en: 'Edit Event', bn: 'ইভেন্ট সম্পাদনা' },
  createEvent: { en: 'Create Event', bn: 'ইভেন্ট তৈরি' },
  eventToEdit: { en: 'Event to edit', bn: 'সম্পাদনার ইভেন্ট' },
  createNewEvent: { en: '— Create new event —', bn: '— নতুন ইভেন্ট তৈরি —' },
  title: { en: 'Title', bn: 'শিরোনাম' },
  description: { en: 'Description', bn: 'বিবরণ' },
  startTime: { en: 'Start Time', bn: 'শুরুর সময়' },
  endTime: { en: 'End Time', bn: 'শেষ সময়' },
  regDeadline: { en: 'Registration Deadline', bn: 'নিবন্ধনের শেষ তারিখ' },
  capacity: { en: 'Capacity', bn: 'ধারণক্ষমতা' },
  updateEvent: { en: 'Update Event', bn: 'ইভেন্ট আপডেট' },
  publishEvent: { en: 'Publish Event', bn: 'ইভেন্ট প্রকাশ' },
  checkInHeading: { en: 'Event Check-in', bn: 'ইভেন্ট চেক-ইন' },
  selectEvent: { en: 'Select event', bn: 'ইভেন্ট নির্বাচন করুন' },
  qrToken: { en: 'QR Token', bn: 'QR টোকেন' },
  confirmCheckIn: { en: 'Confirm Check-in', bn: 'চেক-ইন নিশ্চিত করুন' },
  attendee: { en: 'Attendee', bn: 'অংশগ্রহণকারী' },
  registeredAt: { en: 'Registered At', bn: 'নিবন্ধনের সময়' },
  unknown: { en: 'Unknown', bn: 'অজানা' },
  noRegsForEvent: { en: 'No registrations yet for this event.', bn: 'এই ইভেন্টে এখনও কোনো নিবন্ধন নেই।' },
  cancelRegTitle: { en: 'Cancel registration', bn: 'নিবন্ধন বাতিল' },
  cancelRegLabel: { en: 'Cancel registration', bn: 'নিবন্ধন বাতিল করুন' },
  // messages / toasts
  msgLoadFailed: { en: 'Failed to load events.', bn: 'ইভেন্ট লোড করতে ব্যর্থ।' },
  msgRegistered: { en: 'Registration completed. QR code generated for check-in.', bn: 'নিবন্ধন সম্পন্ন। চেক-ইনের জন্য QR কোড তৈরি হয়েছে।' },
  titleRegistered: { en: 'Event registered', bn: 'ইভেন্ট নিবন্ধিত' },
  msgRegisterFailed: { en: 'Failed to register for event.', bn: 'ইভেন্টে নিবন্ধন করতে ব্যর্থ।' },
  titleRegisterFailed: { en: 'Registration failed', bn: 'নিবন্ধন ব্যর্থ' },
  msgCheckInDone: { en: 'Check-in completed successfully.', bn: 'চেক-ইন সফলভাবে সম্পন্ন।' },
  titleCheckedIn: { en: 'Attendee checked in', bn: 'অংশগ্রহণকারী চেক-ইন হয়েছে' },
  msgCheckInFailed: { en: 'Check-in failed.', bn: 'চেক-ইন ব্যর্থ।' },
  titleCheckInFailed: { en: 'Check-in failed', bn: 'চেক-ইন ব্যর্থ' },
  msgRegisterFirst: { en: 'Register for an event first to submit feedback.', bn: 'মতামত জমা দিতে প্রথমে একটি ইভেন্টে নিবন্ধন করুন।' },
  msgFeedbackDone: { en: 'Feedback submitted successfully.', bn: 'মতামত সফলভাবে জমা হয়েছে।' },
  titleFeedbackSaved: { en: 'Feedback saved', bn: 'মতামত সংরক্ষিত' },
  msgFeedbackFailed: { en: 'Feedback submission failed.', bn: 'মতামত জমা ব্যর্থ।' },
  titleFeedbackFailed: { en: 'Feedback failed', bn: 'মতামত ব্যর্থ' },
  msgRegCancelled: { en: 'Registration cancelled. Your seat has been released.', bn: 'নিবন্ধন বাতিল হয়েছে। আপনার আসন মুক্ত হয়েছে।' },
  titleRegCancelled: { en: 'Registration cancelled', bn: 'নিবন্ধন বাতিল' },
  msgCancelFailed: { en: 'Failed to cancel registration.', bn: 'নিবন্ধন বাতিল করতে ব্যর্থ।' },
  titleCancelFailed: { en: 'Cancellation failed', bn: 'বাতিল ব্যর্থ' },
  msgEventUpdated: { en: 'Event updated successfully.', bn: 'ইভেন্ট সফলভাবে আপডেট হয়েছে।' },
  titleEventUpdated: { en: 'Event updated', bn: 'ইভেন্ট আপডেট হয়েছে' },
  deleteEvent: { en: 'Delete Event', bn: 'ইভেন্ট মুছুন' },
  deleteEventTitle: { en: 'Delete Event', bn: 'ইভেন্ট মুছুন' },
  msgEventDeleted: { en: 'Event deleted.', bn: 'ইভেন্ট মুছে ফেলা হয়েছে।' },
  titleEventDeleted: { en: 'Event deleted', bn: 'ইভেন্ট মুছে ফেলা হয়েছে' },
  msgEventDeleteFailed: {
    en: 'Could not delete the event. Please try again.',
    bn: 'ইভেন্ট মুছে ফেলা যায়নি। আবার চেষ্টা করুন।'
  },
  titleEventDeleteFailed: { en: 'Delete failed', bn: 'মুছে ফেলা ব্যর্থ' },
  msgEventPublished: { en: 'Event published successfully.', bn: 'ইভেন্ট সফলভাবে প্রকাশিত হয়েছে।' },
  titleEventCreated: { en: 'Event created', bn: 'ইভেন্ট তৈরি হয়েছে' },
  msgEventSaveFailed: { en: 'Failed to create/update event.', bn: 'ইভেন্ট তৈরি/আপডেট করতে ব্যর্থ।' },
  titleEventSaveFailed: { en: 'Event save failed', bn: 'ইভেন্ট সংরক্ষণ ব্যর্থ' }
};

function EventsPage() {
  const { language } = useLanguage();
  const t = (key) => toLocalizedText(T[key], language);
  const { isAuthenticated } = useAuth();
  const { success, error: toastError } = useToast();
  const canCheckIn = useRole('admin', 'manager');
  const canManageEvents = useRole('admin', 'manager', 'editor');
  const canAccessEventOps = canCheckIn || canManageEvents;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [viewType, setViewType] = useState('list'); // 'list' | 'grid'
  const [expandedEventId, setExpandedEventId] = useState(null);
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);

  const [events, setEvents] = useState([]);
  const [lastRegistration, setLastRegistration] = useState(null);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [registrations, setRegistrations] = useState([]);
  // The signed-in user's own registrations (QR passes), retrievable any time.
  const [myRegistrations, setMyRegistrations] = useState([]);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [deleteEventTarget, setDeleteEventTarget] = useState(null);
  const [deleteEventBusy, setDeleteEventBusy] = useState(false);
  const [calendarItems, setCalendarItems] = useState([]);
  function getDefaultCalendarRange() {
    const start = new Date();
    const end = new Date(start);
    end.setDate(end.getDate() + 30);

    return {
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10)
    };
  }

  const [calendarRange, setCalendarRange] = useState(getDefaultCalendarRange);

  const [checkInForm, setCheckInForm] = useState({ eventId: '', qrToken: '' });
  const [feedbackForm, setFeedbackForm] = useState({ rating: 5, comment: '' });
  const [createEventForm, setCreateEventForm] = useState({
    title: '',
    description: '',
    location: '',
    startTime: '',
    endTime: '',
    registrationDeadline: '',
    capacity: 120,
    status: 'published'
  });

  const selectedEvent = useMemo(
    () => events.find((event) => event._id === selectedEventId) || null,
    [events, selectedEventId]
  );

  const calendarSummaryByEvent = useMemo(() => {
    const map = new Map();
    for (const item of calendarItems) {
      const payload = {
        registrationCount: item.registrationCount,
        checkedInCount: item.checkedInCount,
        availableSeats: item.availableSeats
      };
      map.set(item._id, payload);
      map.set(String(item._id), payload);
    }
    return map;
  }, [calendarItems]);

  const dashboardStats = useMemo(() => {
    const totalRegistered = calendarItems.reduce(
      (count, item) => count + Number(item.registrationCount || 0),
      0
    );
    const totalCheckedIn = calendarItems.reduce(
      (count, item) => count + Number(item.checkedInCount || 0),
      0
    );
    const totalOpenSeats = calendarItems.reduce(
      (count, item) => count + Math.max(0, Number(item.availableSeats || 0)),
      0
    );

    return {
      publishedEvents: events.length,
      calendarCount: calendarItems.length,
      totalRegistered,
      totalCheckedIn,
      totalOpenSeats
    };
  }, [calendarItems, events.length]);

  const showSecondaryPanels =
    Boolean(lastRegistration?.qrCodeDataUrl) || canManageEvents || myRegistrations.length > 0;

  // Events the user already holds an active pass for (blocks duplicate registration).
  const registeredEventIds = useMemo(() => {
    const ids = new Set();
    for (const registration of myRegistrations) {
      if (registration.status !== 'cancelled') {
        ids.add(String(registration.event?._id || registration.event));
      }
    }
    return ids;
  }, [myRegistrations]);

  const loadEvents = useCallback(async () => {
    const response = canAccessEventOps
      ? await eventApi.listManageEvents({ limit: 30 })
      : await eventApi.listEvents({ limit: 30 });
    const items = response.data.items || [];
    setEvents(items);

    if (!selectedEventId && items.length) {
      setSelectedEventId(items[0]._id);
      setCheckInForm((prev) => ({ ...prev, eventId: items[0]._id }));
    }
  }, [canAccessEventOps, selectedEventId]);

  const loadRegistrations = useCallback(async () => {
    if (!canCheckIn || !selectedEventId) {
      setRegistrations([]);
      return;
    }

    const response = await eventApi.listRegistrations(selectedEventId, { limit: 50 });
    setRegistrations(response.data.items || []);
  }, [canCheckIn, selectedEventId]);

  const loadMyRegistrations = useCallback(async () => {
    if (!isAuthenticated) {
      setMyRegistrations([]);
      return;
    }

    const response = await eventApi.listMyRegistrations({ limit: 50 });
    setMyRegistrations(response.data.items || []);
  }, [isAuthenticated]);

  const loadCalendar = useCallback(async () => {
    const response = canAccessEventOps
      ? await eventApi.listManageCalendar({
          startDate: calendarRange.startDate,
          endDate: calendarRange.endDate,
          limit: 300
        })
      : await eventApi.listCalendar({
          startDate: calendarRange.startDate,
          endDate: calendarRange.endDate,
          limit: 300
        });

    setCalendarItems(response.data.items || []);
  }, [calendarRange.endDate, calendarRange.startDate, canAccessEventOps]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      await Promise.all([loadEvents(), loadCalendar(), loadMyRegistrations()]);
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, t('msgLoadFailed')));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadCalendar, loadEvents, loadMyRegistrations]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Prefill create/edit form when an event is selected for manage
  useEffect(() => {
    if (selectedEvent) {
      const toInput = (iso) => (iso ? new Date(iso).toISOString().slice(0, 16) : '');
      setCreateEventForm({
        title: selectedEvent.title || '',
        description: selectedEvent.description || '',
        location: selectedEvent.location || '',
        startTime: toInput(selectedEvent.startTime),
        endTime: toInput(selectedEvent.endTime),
        registrationDeadline: toInput(selectedEvent.registrationDeadline),
        capacity: selectedEvent.capacity || 120,
        status: selectedEvent.status || 'published'
      });
    }
  }, [selectedEvent]);

  useEffect(() => {
    loadRegistrations();
  }, [loadRegistrations]);

  const registerForEvent = async (eventId) => {
    setMessage('');

    try {
      const response = await eventApi.register(eventId);
      setLastRegistration(response.data.registration);
      setMessage(t('msgRegistered'));
      success(t('msgRegistered'), { title: t('titleRegistered') });
      await Promise.all([loadRegistrations(), loadCalendar(), loadMyRegistrations()]);
    } catch (apiError) {
      const nextMessage = getApiErrorMessage(apiError, t('msgRegisterFailed'));
      setMessage(nextMessage);
      toastError(nextMessage, { title: t('titleRegisterFailed') });
    }
  };

  const submitCheckIn = async (event) => {
    event.preventDefault();
    setMessage('');

    try {
      await eventApi.checkIn(checkInForm);
      setMessage(t('msgCheckInDone'));
      success(t('msgCheckInDone'), { title: t('titleCheckedIn') });
      setCheckInForm((prev) => ({ ...prev, qrToken: '' }));
      await Promise.all([loadRegistrations(), loadCalendar()]);
    } catch (apiError) {
      const nextMessage = getApiErrorMessage(apiError, t('msgCheckInFailed'));
      setMessage(nextMessage);
      toastError(nextMessage, { title: t('titleCheckInFailed') });
    }
  };

  const submitFeedback = async (event) => {
    event.preventDefault();
    setMessage('');

    if (!lastRegistration?._id) {
      setMessage(t('msgRegisterFirst'));
      return;
    }

    try {
      await eventApi.submitFeedback(lastRegistration._id, {
        rating: Number(feedbackForm.rating),
        comment: feedbackForm.comment
      });
      setMessage(t('msgFeedbackDone'));
      success(t('msgFeedbackDone'), { title: t('titleFeedbackSaved') });
      setFeedbackForm({ rating: 5, comment: '' });
      await loadMyRegistrations();
    } catch (apiError) {
      const nextMessage = getApiErrorMessage(apiError, t('msgFeedbackFailed'));
      setMessage(nextMessage);
      toastError(nextMessage, { title: t('titleFeedbackFailed') });
    }
  };

  const confirmCancelRegistration = async () => {
    if (!cancelTarget) {
      return;
    }

    setCancelBusy(true);

    try {
      await eventApi.cancelRegistration(cancelTarget._id);
      success(t('msgRegCancelled'), { title: t('titleRegCancelled') });
      if (lastRegistration?._id === cancelTarget._id) {
        setLastRegistration(null);
      }
      setCancelTarget(null);
      await Promise.all([loadMyRegistrations(), loadCalendar(), loadRegistrations()]);
    } catch (apiError) {
      const nextMessage = getApiErrorMessage(apiError, t('msgCancelFailed'));
      setMessage(nextMessage);
      toastError(nextMessage, { title: t('titleCancelFailed') });
      setCancelTarget(null);
    } finally {
      setCancelBusy(false);
    }
  };

  const submitEvent = async (event) => {
    event.preventDefault();
    setMessage('');

    try {
      if (selectedEventId) {
        await eventApi.updateEvent(selectedEventId, {
          ...createEventForm,
          startTime: new Date(createEventForm.startTime).toISOString(),
          endTime: new Date(createEventForm.endTime).toISOString(),
          registrationDeadline: new Date(createEventForm.registrationDeadline).toISOString(),
          capacity: Number(createEventForm.capacity)
        });

        setMessage(t('msgEventUpdated'));
        success(t('msgEventUpdated'), { title: t('titleEventUpdated') });
        // clear edit state
        setSelectedEventId('');
      } else {
        await eventApi.createEvent({
          ...createEventForm,
          startTime: new Date(createEventForm.startTime).toISOString(),
          endTime: new Date(createEventForm.endTime).toISOString(),
          registrationDeadline: new Date(createEventForm.registrationDeadline).toISOString(),
          capacity: Number(createEventForm.capacity)
        });

        setMessage(t('msgEventPublished'));
        success(t('msgEventPublished'), { title: t('titleEventCreated') });
      }

      setCreateEventForm({
        title: '',
        description: '',
        location: '',
        startTime: '',
        endTime: '',
        registrationDeadline: '',
        capacity: 120,
        status: 'published'
      });
      await Promise.all([loadEvents(), loadCalendar()]);
    } catch (apiError) {
      const nextMessage = getApiErrorMessage(apiError, t('msgEventSaveFailed'));
      setMessage(nextMessage);
      toastError(nextMessage, { title: t('titleEventSaveFailed') });
    }
  };

  const confirmDeleteEvent = async () => {
    if (!deleteEventTarget) {
      return;
    }

    setDeleteEventBusy(true);

    try {
      await eventApi.deleteEvent(deleteEventTarget._id);
      setMessage(t('msgEventDeleted'));
      success(t('msgEventDeleted'), { title: t('titleEventDeleted') });
      if (selectedEventId === deleteEventTarget._id) {
        setSelectedEventId('');
        setCreateEventForm({
          title: '',
          description: '',
          location: '',
          startTime: '',
          endTime: '',
          registrationDeadline: '',
          capacity: 120,
          status: 'published'
        });
      }
      setDeleteEventTarget(null);
      await Promise.all([loadEvents(), loadCalendar()]);
    } catch (apiError) {
      const nextMessage = getApiErrorMessage(apiError, t('msgEventDeleteFailed'));
      setMessage(nextMessage);
      toastError(nextMessage, { title: t('titleEventDeleteFailed') });
      setDeleteEventTarget(null);
    } finally {
      setDeleteEventBusy(false);
    }
  };

  function formatTimeOnly(value) {
    if (!value) return '-';
    try {
      const d = new Date(value);
      return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    } catch {
      return toLocalDateTime(value);
    }
  }

  function toggleExpand(id) {
    setExpandedEventId((prev) => (prev === id ? null : id));
  }

  return (
    <section className="page-wrap desk-page events-page">
      <header className="page-title-bar">
        <div>
          <p className="eyebrow">{ui('events', 'eyebrow', language)}</p>
          <h1>{ui('events', 'title', language)}</h1>
          <p className="page-title-subtitle">{ui('events', 'subtitle', language)}</p>
        </div>
        <button type="button" className="btn btn-ghost" onClick={loadData}>
          {ui('events', 'refresh', language)}
        </button>
      </header>

      <section className="kpi-strip event-kpis" aria-label="Event summary">
        <article className="kpi-card kpi-small">
          <div className="kpi-icon" aria-hidden>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/></svg>
          </div>
          <p className="kpi-label">{t('publishedEvents')}</p>
          <p className="kpi-value">{dashboardStats.publishedEvents}</p>
          <p className="kpi-note">{t('visibleRecords')}</p>
        </article>
        <article className="kpi-card kpi-small">
          <div className="kpi-icon" aria-hidden>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><path d="M8 7h8M8 12h8M8 17h8"/></svg>
          </div>
          <p className="kpi-label">{t('calendarEntries')}</p>
          <p className="kpi-value">{dashboardStats.calendarCount}</p>
          <p className="kpi-note">{t('inDateRange')}</p>
        </article>
        <article className="kpi-card kpi-small">
          <div className="kpi-icon" aria-hidden>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
          </div>
          <p className="kpi-label">{t('registrations')}</p>
          <p className="kpi-value">{dashboardStats.totalRegistered}</p>
          <p className="kpi-note">{t('acrossCalendar')}</p>
        </article>
        <article className="kpi-card kpi-small">
          <div className="kpi-icon" aria-hidden>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
          </div>
          <p className="kpi-label">{t('checkedIn')}</p>
          <p className="kpi-value">{dashboardStats.totalCheckedIn}</p>
          <p className="kpi-note">{t('seatsLeft')} {dashboardStats.totalOpenSeats}</p>
        </article>
      </section>

      {error && <p className="error-text">{error}</p>}
      {message && <p className="meta">{message}</p>}
      {loading && (
        <div className="feature-grid">
          <SkeletonCard showMedia lines={3} />
          <SkeletonCard showMedia lines={3} />
          <SkeletonCard showMedia lines={3} />
        </div>
      )}

      <article className="surface-card">
        <div className="section-head section-head-tight">
          <div>
            <p className="eyebrow">{t('eventPrograms')}</p>
            <h3>{t('publicCalendar')}</h3>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button type="button" className="icon-button" onClick={loadCalendar} aria-label="Refresh calendar">
              ⟳
            </button>
            <div className="view-toggle" role="tablist" aria-label="View toggle">
              <button type="button" className={`icon-button ${viewType === 'list' ? 'is-active' : ''}`} onClick={() => setViewType('list')} aria-pressed={viewType==='list'}>≡</button>
              <button type="button" className={`icon-button ${viewType === 'grid' ? 'is-active' : ''}`} onClick={() => setViewType('grid')} aria-pressed={viewType==='grid'}>▦</button>
            </div>
          </div>
        </div>

        <div className="date-filter" style={{ position: 'relative' }}>
          <label className="date-filter__label">{t('filterByDate')}</label>
          <div className="date-filter__controls">
            <button type="button" className="icon-button" onClick={() => setDatePopoverOpen((s) => !s)} aria-expanded={datePopoverOpen} aria-haspopup="dialog" aria-controls="date-popover">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/></svg>
            </button>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <div style={{ color: 'var(--muted)', fontSize: '13px' }}>{calendarRange.startDate} — {calendarRange.endDate}</div>
            </div>
          </div>

          {datePopoverOpen && (
            <div id="date-popover" role="dialog" className="date-popover">
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input type="date" value={calendarRange.startDate} onChange={(event) => setCalendarRange((prev) => ({ ...prev, startDate: event.target.value }))} required />
                <input type="date" value={calendarRange.endDate} onChange={(event) => setCalendarRange((prev) => ({ ...prev, endDate: event.target.value }))} required />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.6rem' }}>
                <button type="button" className="btn btn-primary" onClick={() => { setDatePopoverOpen(false); loadCalendar(); }}>{t('apply')}</button>
                <button type="button" className="btn btn-ghost" onClick={() => { setCalendarRange(getDefaultCalendarRange()); setDatePopoverOpen(false); }}>{t('reset')}</button>
              </div>
            </div>
          )}
        </div>

        {!calendarItems.length && (
          <div className="empty-state empty-state--center" style={{ padding: '1.6rem', marginTop: '0.8rem' }}>
            <div className="empty-state__icon" style={{ fontSize: '36px' }}>📆</div>
            <h4 className="empty-state__title">{t('noEventsRange')}</h4>
            <p className="empty-state__text">{t('adjustRange')}</p>
          </div>
        )}
        {!!calendarItems.length && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t('date')}</th>
                  <th>{t('event')}</th>
                  <th>{t('location')}</th>
                  <th>{t('registered')}</th>
                  <th>{t('checkedIn')}</th>
                  <th>{t('availableSeats')}</th>
                </tr>
              </thead>
              <tbody>
                {calendarItems.map((item) => (
                  <tr key={item._id}>
                    <td>{toIsoDate(item.startTime)}</td>
                    <td>{item.title}</td>
                    <td>{item.location}</td>
                    <td>{item.registrationCount}</td>
                    <td>{item.checkedInCount}</td>
                    <td>{item.availableSeats}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>

      <article className="surface-card">
        <div className="section-head section-head-tight">
          <h3>{t('publishedEvents')} <span className="count-badge">{events.length} {t('eventsCount')}</span></h3>
          <p className="meta">{t('seatInsights')}</p>
        </div>

        {!events.length && !loading && <p className="meta">{t('noEventsPublished')}</p>}

        {!!events.length && (() => {
          const now = Date.now();
          const upcoming = [];
          const past = [];

          for (const item of events) {
            const endTime = item.endTime || item.startTime || item.createdAt;
            const isPast = endTime ? new Date(endTime).getTime() < now : false;
            if (isPast) past.push(item); else upcoming.push(item);
          }

          upcoming.sort((a, b) => (new Date(a.startTime || a.createdAt).getTime() - new Date(b.startTime || b.createdAt).getTime()));
          past.sort((a, b) => (new Date(b.startTime || b.createdAt).getTime() - new Date(a.startTime || a.createdAt).getTime()));

          return (
            <div className={`events-list ${viewType === 'grid' ? 'events-grid' : 'events-list-vertical'}`}>
              {upcoming.length > 0 && (
                <section className="events-group">
                  <div className="events-group__label">{t('upcoming')}</div>
                  <div className="events-group__items">
                    {upcoming.map((item) => {
                      const summary = calendarSummaryByEvent.get(item._id);
                      const deadlinePassed = item.registrationDeadline && new Date(item.registrationDeadline).getTime() < Date.now();
                      const isFull = typeof summary?.availableSeats === 'number' && summary.availableSeats <= 0;
                      const alreadyRegistered = registeredEventIds.has(String(item._id));
                      const canRegister = isAuthenticated && item.status === 'published' && !deadlinePassed && !isFull && !alreadyRegistered;

                      return (
                        <article key={item._id} className={`event-card ${item.status === 'published' ? 'event--upcoming' : ''}`}>
                          <button type="button" className="event-card__body" onClick={() => toggleExpand(item._id)}>
                            <div className="event-card__date">
                              <div className="event-card__month">{new Date(item.startTime).toLocaleString(undefined, { month: 'short' }).toUpperCase()}</div>
                              <div className="event-card__day">{new Date(item.startTime).getDate()}</div>
                            </div>

                            <div className="event-card__content">
                              <div className="event-card__title">{item.title}</div>
                              <div className="event-card__desc">{item.description}</div>
                              <div className="event-card__meta">
                                <span className="meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 6-9 12-9 12S3 16 3 10a9 9 0 1 1 18 0z"/><circle cx="12" cy="10" r="2"/></svg>{item.location}</span>
                                <span className="meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="8"/><path d="M12 6v6l4 2"/></svg>{formatTimeOnly(item.startTime)}</span>
                                <span className="meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M7 21h10"/><path d="M12 3v18"/></svg>{item.capacity} {t('seats')}</span>
                              </div>
                            </div>

                            <div className="event-card__controls">
                              <span className={`status-badge ${deadlinePassed ? 'status-deadline' : 'status-open'}`}>{deadlinePassed ? t('deadlinePassed') : t('upcoming')}</span>
                              <button type="button" className="icon-button" aria-label="View details">›</button>
                            </div>
                          </button>

                          {expandedEventId === item._id && (
                            <div className="event-card__expanded">
                              <p className="meta">{item.description}</p>
                              <p className="meta">{item.location} • {new Date(item.startTime).toLocaleDateString()} • {formatTimeOnly(item.startTime)}</p>
                              {summary ? (
                                <p className="meta">{t('registeredLabel')} {summary.registrationCount} • {t('checkedInLabel')} {summary.checkedInCount} • {t('remaining')} {summary.availableSeats}</p>
                              ) : null}
                              <div style={{ marginTop: '0.6rem', display: 'flex', gap: '0.5rem' }}>
                                {isAuthenticated && item.status === 'published' && (
                                  <button type="button" className="btn btn-primary" onClick={() => registerForEvent(item._id)} disabled={!canRegister}>{t('register')}</button>
                                )}
                                {canManageEvents && <button type="button" className="btn btn-ghost" onClick={() => setSelectedEventId(item._id)}>{t('manage')}</button>}
                              </div>
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </div>
                </section>
              )}

              {past.length > 0 && (
                <section className="events-group">
                  <div className="events-group__label">{t('past')}</div>
                  <div className="events-group__items">
                    {past.map((item) => {
                      const summary = calendarSummaryByEvent.get(item._id);
                      return (
                        <article key={item._id} className="event-card event--past">
                          <button type="button" className="event-card__body" onClick={() => toggleExpand(item._id)}>
                            <div className="event-card__date">
                              <div className="event-card__month">{new Date(item.startTime).toLocaleString(undefined, { month: 'short' }).toUpperCase()}</div>
                              <div className="event-card__day">{new Date(item.startTime).getDate()}</div>
                            </div>

                            <div className="event-card__content">
                              <div className="event-card__title">{item.title}</div>
                              <div className="event-card__desc">{item.description}</div>
                              <div className="event-card__meta">
                                <span className="meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 6-9 12-9 12S3 16 3 10a9 9 0 1 1 18 0z"/><circle cx="12" cy="10" r="2"/></svg>{item.location}</span>
                                <span className="meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="8"/><path d="M12 6v6l4 2"/></svg>{formatTimeOnly(item.startTime)}</span>
                                <span className="meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M7 21h10"/><path d="M12 3v18"/></svg>{item.capacity} {t('seats')}</span>
                              </div>
                            </div>

                            <div className="event-card__controls">
                              <span className="status-badge status-closed">{t('past')}</span>
                              <button type="button" className="icon-button" aria-label="View details">›</button>
                            </div>
                          </button>

                          {expandedEventId === item._id && (
                            <div className="event-card__expanded">
                              <p className="meta">{item.description}</p>
                              <p className="meta">{item.location} • {new Date(item.startTime).toLocaleDateString()} • {formatTimeOnly(item.startTime)}</p>
                              {summary ? (
                                <p className="meta">{t('registeredLabel')} {summary.registrationCount} • {t('checkedInLabel')} {summary.checkedInCount} • {t('remaining')} {summary.availableSeats}</p>
                              ) : null}
                            </div>
                          )}
                        </article>
                      );
                    })}

                    {past.length > 6 && (
                      <div style={{ marginTop: '0.6rem' }}>
                        <button type="button" className="btn btn-ghost" style={{ width: '100%' }}>{t('showMorePast')}</button>
                      </div>
                    )}
                  </div>
                </section>
              )}
            </div>
          );
        })()}
      </article>

      {showSecondaryPanels && (
        <div className="workflow-grid events-section">
          {isAuthenticated && myRegistrations.length > 0 && (
            <article className="surface-card">
              <h3>{t('myPasses')}</h3>
              <p className="meta">{t('passesHint')}</p>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>{t('event')}</th>
                      <th>{t('when')}</th>
                      <th>{t('status')}</th>
                      <th>{t('actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myRegistrations.map((item) => {
                      const eventStarted =
                        item.event?.startTime &&
                        new Date(item.event.startTime).getTime() <= Date.now();
                      return (
                        <tr key={item._id}>
                          <td>
                            <strong>{item.event?.title || t('eventFallback')}</strong>
                            <br />
                            <span className="meta">{item.event?.location || ''}</span>
                          </td>
                          <td>{toLocalDateTime(item.event?.startTime)}</td>
                          <td>
                            <span className={`status-badge status-${item.status}`}>
                              {item.status.replace('_', ' ')}
                            </span>
                            {item.feedback?.rating ? (
                              <>
                                <br />
                                <span className="meta">{t('feedbackLabel')} {item.feedback.rating}/5</span>
                              </>
                            ) : null}
                          </td>
                          <td>
                            <div className="inline-actions">
                              {item.status !== 'cancelled' && (
                                <button
                                  type="button"
                                  className="btn btn-ghost btn-sm"
                                  onClick={() => setLastRegistration(item)}
                                >
                                  {t('showQr')}
                                </button>
                              )}
                              {item.status === 'registered' && !eventStarted && (
                                <button
                                  type="button"
                                  className="btn btn-danger btn-sm"
                                  onClick={() => setCancelTarget(item)}
                                >
                                  {t('cancel')}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </article>
          )}

          {lastRegistration?.qrCodeDataUrl && (
            <article className="surface-card">
              <h3>
                {t('yourQr')}
                {lastRegistration.event?.title ? ` — ${lastRegistration.event.title}` : ''}
              </h3>
              <p className="meta">{t('useQrHint')}</p>
              <img
                src={lastRegistration.qrCodeDataUrl}
                alt={t('qrAlt')}
                className="qr-preview"
              />
              <p className="meta">{t('token')} {lastRegistration.qrToken}</p>

              <form className="form-grid" onSubmit={submitFeedback}>
                <label>
                  {t('feedbackRating')}
                  <select
                    value={feedbackForm.rating}
                    onChange={(event) =>
                      setFeedbackForm((prev) => ({ ...prev, rating: event.target.value }))
                    }
                  >
                    <option value="5">{t('rate5')}</option>
                    <option value="4">{t('rate4')}</option>
                    <option value="3">{t('rate3')}</option>
                    <option value="2">{t('rate2')}</option>
                    <option value="1">{t('rate1')}</option>
                  </select>
                </label>

                <label>
                  {t('comment')}
                  <textarea
                    value={feedbackForm.comment}
                    onChange={(event) =>
                      setFeedbackForm((prev) => ({ ...prev, comment: event.target.value }))
                    }
                  />
                </label>

                <button type="submit" className="btn btn-ghost">
                  {t('submitFeedback')}
                </button>
              </form>
            </article>
          )}

          {canManageEvents && (
            <article className="surface-card">
              <h3>{selectedEventId ? t('editEvent') : t('createEvent')}</h3>
              <form className="form-grid" onSubmit={submitEvent}>
                <label>
                  {t('eventToEdit')}
                  <select
                    value={selectedEventId}
                    onChange={(event) => {
                      const nextId = event.target.value;
                      setSelectedEventId(nextId);
                      // Clearing the selection returns the form to "create" mode
                      // with a blank slate.
                      if (!nextId) {
                        setCreateEventForm({
                          title: '',
                          description: '',
                          location: '',
                          startTime: '',
                          endTime: '',
                          registrationDeadline: '',
                          capacity: 120,
                          status: 'published'
                        });
                      }
                    }}
                  >
                    <option value="">{t('createNewEvent')}</option>
                    {events.map((item) => (
                      <option key={item._id} value={item._id}>
                        {item.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {t('title')}
                  <input
                    value={createEventForm.title}
                    onChange={(event) =>
                      setCreateEventForm((prev) => ({ ...prev, title: event.target.value }))
                    }
                    required
                  />
                </label>

                <label>
                  {t('location')}
                  <input
                    value={createEventForm.location}
                    onChange={(event) =>
                      setCreateEventForm((prev) => ({ ...prev, location: event.target.value }))
                    }
                    required
                  />
                </label>

                <label>
                  {t('description')}
                  <textarea
                    value={createEventForm.description}
                    minLength={20}
                    onChange={(event) =>
                      setCreateEventForm((prev) => ({ ...prev, description: event.target.value }))
                    }
                    required
                  />
                </label>

                <label>
                  {t('startTime')}
                  <input
                    type="datetime-local"
                    value={createEventForm.startTime}
                    onChange={(event) =>
                      setCreateEventForm((prev) => ({ ...prev, startTime: event.target.value }))
                    }
                    required
                  />
                </label>

                <label>
                  {t('endTime')}
                  <input
                    type="datetime-local"
                    value={createEventForm.endTime}
                    onChange={(event) =>
                      setCreateEventForm((prev) => ({ ...prev, endTime: event.target.value }))
                    }
                    required
                  />
                </label>

                <label>
                  {t('regDeadline')}
                  <input
                    type="datetime-local"
                    value={createEventForm.registrationDeadline}
                    onChange={(event) =>
                      setCreateEventForm((prev) => ({
                        ...prev,
                        registrationDeadline: event.target.value
                      }))
                    }
                    required
                  />
                </label>

                <label>
                  {t('capacity')}
                  <input
                    type="number"
                    min="1"
                    value={createEventForm.capacity}
                    onChange={(event) =>
                      setCreateEventForm((prev) => ({ ...prev, capacity: event.target.value }))
                    }
                    required
                  />
                </label>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button type="submit" className="btn btn-primary">
                    {selectedEventId ? t('updateEvent') : t('publishEvent')}
                  </button>
                  {selectedEventId && (
                    <>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => {
                          setSelectedEventId('');
                          setCreateEventForm({
                            title: '',
                            description: '',
                            location: '',
                            startTime: '',
                            endTime: '',
                            registrationDeadline: '',
                            capacity: 120,
                            status: 'published'
                          });
                        }}
                      >
                        {t('cancel')}
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => setDeleteEventTarget(selectedEvent)}
                      >
                        {t('deleteEvent')}
                      </button>
                    </>
                  )}
                </div>
              </form>
            </article>
          )}
        </div>
      )}

      {canCheckIn && (
        <article className="surface-card">
          <h3>{t('checkInHeading')}</h3>
          <form className="form-grid" onSubmit={submitCheckIn}>
            <label>
              {t('event')}
              <select
                value={checkInForm.eventId}
                onChange={(event) => {
                  setCheckInForm((prev) => ({ ...prev, eventId: event.target.value }));
                  setSelectedEventId(event.target.value);
                }}
                required
              >
                <option value="">{t('selectEvent')}</option>
                {events.map((item) => (
                  <option key={item._id} value={item._id}>
                    {item.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t('qrToken')}
              <input
                value={checkInForm.qrToken}
                onChange={(event) =>
                  setCheckInForm((prev) => ({ ...prev, qrToken: event.target.value }))
                }
                required
              />
            </label>

            <button type="submit" className="btn btn-primary">
              {t('confirmCheckIn')}
            </button>
          </form>

          {!!selectedEvent && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{t('attendee')}</th>
                    <th>{t('status')}</th>
                    <th>{t('registeredAt')}</th>
                  </tr>
                </thead>
                <tbody>
                  {registrations.map((item) => (
                    <tr key={item._id}>
                      <td>{item.attendee?.fullName || t('unknown')}</td>
                      <td>{item.status}</td>
                      <td>{toLocalDateTime(item.createdAt)}</td>
                    </tr>
                  ))}
                  {!registrations.length && (
                    <tr>
                      <td colSpan="3">{t('noRegsForEvent')}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </article>
      )}

      <ConfirmDialog
        isOpen={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        onConfirm={confirmCancelRegistration}
        title={t('cancelRegTitle')}
        message={toLocalizedText(
          {
            en: `Cancel your registration for "${
              cancelTarget?.event?.title || 'this event'
            }"? Your seat will be released to other attendees and your QR pass will no longer work.`,
            bn: `"${
              cancelTarget?.event?.title || 'এই ইভেন্ট'
            }"-এর জন্য আপনার নিবন্ধন বাতিল করবেন? আপনার আসন অন্যদের জন্য মুক্ত হবে এবং QR পাস আর কাজ করবে না।`
          },
          language
        )}
        confirmLabel={t('cancelRegLabel')}
        tone="danger"
        busy={cancelBusy}
      />

      <ConfirmDialog
        isOpen={Boolean(deleteEventTarget)}
        onClose={() => setDeleteEventTarget(null)}
        onConfirm={confirmDeleteEvent}
        title={t('deleteEventTitle')}
        message={toLocalizedText(
          {
            en: `Delete "${
              deleteEventTarget?.title || 'this event'
            }"? This cannot be undone. All registrations will be removed and attendees will lose their passes.`,
            bn: `"${
              deleteEventTarget?.title || 'এই ইভেন্ট'
            }" মুছে ফেলবেন? এটি ফিরিয়ে আনা যাবে না। সমস্ত নিবন্ধন সরানো হবে এবং অংশগ্রহণকারীরা তাদের পাস হারাবেন।`
          },
          language
        )}
        confirmLabel={t('deleteEvent')}
        tone="danger"
        busy={deleteEventBusy}
      />
    </section>
  );
}

export default EventsPage;
