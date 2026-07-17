import { useCallback, useEffect, useMemo, useState } from 'react';
import { bookingApi } from '../../api/modules';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import InlineAlert from '../../components/ui/InlineAlert';
import SkeletonList from '../../components/ui/SkeletonList';
import { useAuth } from '../../context/AuthContext';
import useRole from '../../hooks/useRole';
import useLanguage from '../../hooks/useLanguage';
import { getApiErrorMessage } from '../../utils/http';
import { toLocalDateTime, toLocalizedText } from '../../utils/localized';
import { validateBookingForm } from '../../utils/formValidation';

const T = {
  eyebrow: { en: 'Space Scheduling', bn: 'স্থান সময়সূচি' },
  title: { en: 'Venue Booking', bn: 'ভেন্যু বুকিং' },
  subtitle: {
    en: 'Coordinate class, lab, and event requests with calendar visibility, conflict checks, and approval workflow.',
    bn: 'ক্যালেন্ডার দৃশ্যমানতা, দ্বন্দ্ব যাচাই ও অনুমোদন ওয়ার্কফ্লোর সাথে ক্লাস, ল্যাব ও ইভেন্ট অনুরোধ সমন্বয় করুন।'
  },
  refresh: { en: 'Refresh', bn: 'রিফ্রেশ' },
  activeVenues: { en: 'Active Venues', bn: 'সক্রিয় ভেন্যু' },
  availableForRequests: { en: 'Available for requests', bn: 'অনুরোধের জন্য উপলব্ধ' },
  calendarEntries: { en: 'Calendar Entries', bn: 'ক্যালেন্ডার এন্ট্রি' },
  approvedInWindow: { en: 'Approved in selected window', bn: 'নির্বাচিত সময়ে অনুমোদিত' },
  myRequests: { en: 'My Requests', bn: 'আমার অনুরোধ' },
  visibleSignedIn: { en: 'Visible when signed in', bn: 'সাইন ইন করলে দৃশ্যমান' },
  pendingApprovals: { en: 'Pending Approvals', bn: 'অপেক্ষমাণ অনুমোদন' },
  managerQueue: { en: 'Manager queue load', bn: 'ম্যানেজার সারির চাপ' },
  calendarHeading: { en: 'Booking Calendar (Class / Event / Lab)', bn: 'বুকিং ক্যালেন্ডার (ক্লাস / ইভেন্ট / ল্যাব)' },
  refreshCalendar: { en: 'Refresh Calendar', bn: 'ক্যালেন্ডার রিফ্রেশ' },
  startDate: { en: 'Start Date', bn: 'শুরুর তারিখ' },
  endDate: { en: 'End Date', bn: 'শেষ তারিখ' },
  venue: { en: 'Venue', bn: 'ভেন্যু' },
  allVenues: { en: 'All venues', bn: 'সব ভেন্যু' },
  type: { en: 'Type', bn: 'ধরন' },
  allTypes: { en: 'All types', bn: 'সব ধরন' },
  class: { en: 'Class', bn: 'ক্লাস' },
  event: { en: 'Event', bn: 'ইভেন্ট' },
  lab: { en: 'Lab', bn: 'ল্যাব' },
  other: { en: 'Other', bn: 'অন্যান্য' },
  applyFilters: { en: 'Apply Filters', bn: 'ফিল্টার প্রয়োগ' },
  noApprovedInRange: { en: 'No approved bookings in this range.', bn: 'এই সীমার মধ্যে কোনো অনুমোদিত বুকিং নেই।' },
  date: { en: 'Date', bn: 'তারিখ' },
  titleCol: { en: 'Title', bn: 'শিরোনাম' },
  classCode: { en: 'Class Code', bn: 'ক্লাস কোড' },
  time: { en: 'Time', bn: 'সময়' },
  unknown: { en: 'Unknown', bn: 'অজানা' },
  availableVenues: { en: 'Available Venues', bn: 'উপলব্ধ ভেন্যু' },
  noVenuesYet: { en: 'No venues available yet.', bn: 'এখনও কোনো ভেন্যু উপলব্ধ নেই।' },
  capacity: { en: 'Capacity', bn: 'ধারণক্ষমতা' },
  manager: { en: 'Manager', bn: 'ম্যানেজার' },
  unassigned: { en: 'Unassigned', bn: 'অনির্ধারিত' },
  requestBooking: { en: 'Request Booking', bn: 'বুকিং অনুরোধ' },
  selectVenue: { en: 'Select venue', bn: 'ভেন্যু নির্বাচন করুন' },
  bookingTitle: { en: 'Booking Title', bn: 'বুকিং শিরোনাম' },
  purpose: { en: 'Purpose', bn: 'উদ্দেশ্য' },
  bookingType: { en: 'Booking Type', bn: 'বুকিংয়ের ধরন' },
  startTime: { en: 'Start Time', bn: 'শুরুর সময়' },
  endTime: { en: 'End Time', bn: 'শেষ সময়' },
  attendeeCount: { en: 'Attendee Count', bn: 'অংশগ্রহণকারীর সংখ্যা' },
  submitBooking: { en: 'Submit Booking Request', bn: 'বুকিং অনুরোধ জমা দিন' },
  checkConflict: { en: 'Check Conflict Window', bn: 'দ্বন্দ্ব যাচাই করুন' },
  status: { en: 'Status', bn: 'অবস্থা' },
  start: { en: 'Start', bn: 'শুরু' },
  end: { en: 'End', bn: 'শেষ' },
  myBookingRequests: { en: 'My Booking Requests', bn: 'আমার বুকিং অনুরোধ' },
  noRequestsForAccount: {
    en: 'No booking requests found for your account.',
    bn: 'আপনার অ্যাকাউন্টে কোনো বুকিং অনুরোধ পাওয়া যায়নি।'
  },
  window: { en: 'Window', bn: 'সময়সীমা' },
  decisionNote: { en: 'Decision Note', bn: 'সিদ্ধান্ত নোট' },
  actions: { en: 'Actions', bn: 'পদক্ষেপ' },
  cancel: { en: 'Cancel', bn: 'বাতিল' },
  editVenueHeading: { en: 'Edit Venue', bn: 'ভেন্যু সম্পাদনা' },
  createVenueHeading: { en: 'Create Venue', bn: 'ভেন্যু তৈরি' },
  venueName: { en: 'Venue Name', bn: 'ভেন্যুর নাম' },
  location: { en: 'Location', bn: 'অবস্থান' },
  amenities: { en: 'Amenities (comma separated)', bn: 'সুবিধাসমূহ (কমা দিয়ে পৃথক)' },
  saveChanges: { en: 'Save Changes', bn: 'পরিবর্তন সংরক্ষণ' },
  addVenue: { en: 'Add Venue', bn: 'ভেন্যু যোগ করুন' },
  cancelEdit: { en: 'Cancel Edit', bn: 'সম্পাদনা বাতিল' },
  manageVenues: { en: 'Manage Venues', bn: 'ভেন্যু পরিচালনা' },
  total: { en: 'total', bn: 'মোট' },
  noVenuesCreated: { en: 'No venues created yet.', bn: 'এখনও কোনো ভেন্যু তৈরি হয়নি।' },
  active: { en: 'active', bn: 'সক্রিয়' },
  retired: { en: 'retired', bn: 'অবসরপ্রাপ্ত' },
  edit: { en: 'Edit', bn: 'সম্পাদনা' },
  retire: { en: 'Retire', bn: 'অবসর' },
  reactivate: { en: 'Reactivate', bn: 'পুনঃসক্রিয়' },
  approvalQueue: { en: 'Approval Queue', bn: 'অনুমোদন সারি' },
  noPendingRequests: { en: 'No pending requests currently.', bn: 'এখন কোনো অপেক্ষমাণ অনুরোধ নেই।' },
  requester: { en: 'Requester', bn: 'অনুরোধকারী' },
  attendees: { en: 'Attendees', bn: 'অংশগ্রহণকারী' },
  action: { en: 'Action', bn: 'পদক্ষেপ' },
  approve: { en: 'Approve', bn: 'অনুমোদন' },
  reject: { en: 'Reject', bn: 'প্রত্যাখ্যান' },
  // Confirm dialogs
  approveBooking: { en: 'Approve booking', bn: 'বুকিং অনুমোদন' },
  rejectBooking: { en: 'Reject booking', bn: 'বুকিং প্রত্যাখ্যান' },
  confirmReviewApprove: {
    en: 'Are you sure you want to approve this booking request?',
    bn: 'আপনি কি নিশ্চিত এই বুকিং অনুরোধটি অনুমোদন করতে চান?'
  },
  confirmReviewReject: {
    en: 'Are you sure you want to reject this booking request?',
    bn: 'আপনি কি নিশ্চিত এই বুকিং অনুরোধটি প্রত্যাখ্যান করতে চান?'
  },
  decisionNoteLabel: { en: 'Decision note (optional)', bn: 'সিদ্ধান্ত নোট (ঐচ্ছিক)' },
  decisionNotePlaceholder: {
    en: 'Visible to the requester alongside the decision',
    bn: 'সিদ্ধান্তের সাথে অনুরোধকারীর কাছে দৃশ্যমান'
  },
  retireVenueTitle: { en: 'Retire venue', bn: 'ভেন্যু অবসর' },
  reactivateVenueTitle: { en: 'Reactivate venue', bn: 'ভেন্যু পুনঃসক্রিয়' },
  retireVenueLabel: { en: 'Retire', bn: 'অবসর' },
  reactivateVenueLabel: { en: 'Reactivate', bn: 'পুনঃসক্রিয়' },
  cancelBookingTitle: { en: 'Cancel booking request', bn: 'বুকিং অনুরোধ বাতিল' },
  cancelRequestLabel: { en: 'Cancel request', bn: 'অনুরোধ বাতিল' },
  thisVenue: { en: 'this venue', bn: 'এই ভেন্যু' },
  // Messages
  msgFixFields: { en: 'Please fix the highlighted booking fields.', bn: 'অনুগ্রহ করে চিহ্নিত বুকিং ঘরগুলো ঠিক করুন।' },
  msgValidTimes: { en: 'Select valid start and end times before submitting.', bn: 'জমা দেওয়ার আগে বৈধ শুরু ও শেষ সময় নির্বাচন করুন।' },
  msgEndAfterStart: { en: 'End time must be later than start time.', bn: 'শেষ সময় শুরুর সময়ের পরে হতে হবে।' },
  msgBookingSubmitted: { en: 'Booking request submitted successfully.', bn: 'বুকিং অনুরোধ সফলভাবে জমা হয়েছে।' },
  msgBookingFailed: { en: 'Failed to submit booking request.', bn: 'বুকিং অনুরোধ জমা দিতে ব্যর্থ।' },
  msgVenueRequired: { en: 'Venue name and location are required.', bn: 'ভেন্যুর নাম ও অবস্থান আবশ্যক।' },
  msgVenueUpdated: { en: 'Venue updated successfully.', bn: 'ভেন্যু সফলভাবে আপডেট হয়েছে।' },
  msgVenueCreated: { en: 'Venue created successfully.', bn: 'ভেন্যু সফলভাবে তৈরি হয়েছে।' },
  msgVenueUpdateFailed: { en: 'Failed to update venue.', bn: 'ভেন্যু আপডেট করতে ব্যর্থ।' },
  msgVenueCreateFailed: { en: 'Failed to create venue.', bn: 'ভেন্যু তৈরি করতে ব্যর্থ।' },
  msgVenueStatusFailed: { en: 'Failed to update venue status.', bn: 'ভেন্যুর অবস্থা আপডেট করতে ব্যর্থ।' },
  msgSelectVenueTime: { en: 'Select venue and time range before conflict check.', bn: 'দ্বন্দ্ব যাচাইয়ের আগে ভেন্যু ও সময়সীমা নির্বাচন করুন।' },
  msgValidTimesConflict: { en: 'Select valid start and end times before conflict check.', bn: 'দ্বন্দ্ব যাচাইয়ের আগে বৈধ শুরু ও শেষ সময় নির্বাচন করুন।' },
  msgConflictsFound: { en: 'Conflicts found.', bn: 'দ্বন্দ্ব পাওয়া গেছে।' },
  msgNoConflicts: { en: 'No conflicts in this time window.', bn: 'এই সময়সীমায় কোনো দ্বন্দ্ব নেই।' },
  msgConflictFailed: { en: 'Failed to check conflicts.', bn: 'দ্বন্দ্ব যাচাই করতে ব্যর্থ।' },
  msgBookingCancelled: { en: 'Booking request cancelled.', bn: 'বুকিং অনুরোধ বাতিল হয়েছে।' },
  msgCancelFailed: { en: 'Failed to cancel booking request.', bn: 'বুকিং অনুরোধ বাতিল করতে ব্যর্থ।' },
  msgDecisionFailed: { en: 'Failed to update booking decision.', bn: 'বুকিং সিদ্ধান্ত আপডেট করতে ব্যর্থ।' },
  msgLoadFailed: { en: 'Failed to load booking data.', bn: 'বুকিং ডেটা লোড করতে ব্যর্থ।' }
};

function BookingPage() {
  const { user, isAuthenticated } = useAuth();
  const { language } = useLanguage();
  const t = (key) => toLocalizedText(T[key], language);
  const canApprove = useRole('admin', 'manager');
  const canCheckConflicts = useRole('admin', 'manager', 'editor');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [venues, setVenues] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [myBookings, setMyBookings] = useState([]);
  const [calendarItems, setCalendarItems] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [calendarRange, setCalendarRange] = useState(() => {
    const start = new Date();
    const end = new Date(start);
    end.setDate(end.getDate() + 14);

    return {
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
      venue: '',
      bookingType: ''
    };
  });

  const [bookingForm, setBookingForm] = useState({
    venue: '',
    title: '',
    purpose: '',
    bookingType: 'event',
    classCode: '',
    startTime: '',
    endTime: '',
    attendeeCount: 30
  });

  const [venueForm, setVenueForm] = useState({
    id: '',
    name: '',
    location: '',
    capacity: 120,
    amenities: ''
  });
  // Full venue directory (incl. inactive) for the manager area.
  const [allVenues, setAllVenues] = useState([]);
  const [venueStatusTarget, setVenueStatusTarget] = useState(null);
  const [venueStatusBusy, setVenueStatusBusy] = useState(false);

  const selectedVenue = useMemo(
    () => venues.find((venue) => venue._id === bookingForm.venue) || null,
    [venues, bookingForm.venue]
  );

  const dashboardStats = useMemo(
    () => ({
      activeVenues: venues.length,
      calendarEntries: calendarItems.length,
      myRequests: isAuthenticated ? myBookings.length : 0,
      pendingApprovals: canApprove ? bookings.length : 0
    }),
    [
      bookings.length,
      calendarItems.length,
      canApprove,
      isAuthenticated,
      myBookings.length,
      venues.length
    ]
  );

  const loadVenues = useCallback(async () => {
    const response = await bookingApi.listVenues({ isActive: true, limit: 50 });
    const items = response.data.items || [];
    setVenues(items);
    if (!bookingForm.venue && items.length) {
      setBookingForm((prev) => ({ ...prev, venue: items[0]._id }));
    }
  }, [bookingForm.venue]);

  const loadBookings = useCallback(async () => {
    if (!canApprove) {
      setBookings([]);
      return;
    }

    const response = await bookingApi.listBookings({ limit: 50, status: 'pending' });
    setBookings(response.data.items || []);
  }, [canApprove]);

  const loadAllVenues = useCallback(async () => {
    if (!canApprove) {
      setAllVenues([]);
      return;
    }

    // No isActive filter: managers need to see retired venues to reactivate them.
    const response = await bookingApi.listVenues({ limit: 100 });
    setAllVenues(response.data.items || []);
  }, [canApprove]);

  const loadMyBookings = useCallback(async () => {
    if (!isAuthenticated) {
      setMyBookings([]);
      return;
    }

    const response = await bookingApi.listMyBookings({ limit: 50 });
    setMyBookings(response.data.items || []);
  }, [isAuthenticated]);

  const loadCalendar = useCallback(async () => {
    const response = await bookingApi.listCalendar({
      startDate: calendarRange.startDate,
      endDate: calendarRange.endDate,
      venue: calendarRange.venue || undefined,
      bookingType: calendarRange.bookingType || undefined,
      limit: 300
    });

    setCalendarItems(response.data.items || []);
  }, [
    calendarRange.bookingType,
    calendarRange.endDate,
    calendarRange.startDate,
    calendarRange.venue
  ]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      await Promise.all([
        loadVenues(),
        loadAllVenues(),
        loadBookings(),
        loadMyBookings(),
        loadCalendar()
      ]);
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, t('msgLoadFailed')));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadAllVenues, loadBookings, loadCalendar, loadMyBookings, loadVenues]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const submitBooking = async (event) => {
    event.preventDefault();
    setMessage('');

    const nextErrors = validateBookingForm(bookingForm);
    setFormErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setMessage(t('msgFixFields'));
      return;
    }

    const startTime = new Date(bookingForm.startTime);
    const endTime = new Date(bookingForm.endTime);

    if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
      setMessage(t('msgValidTimes'));
      return;
    }

    if (endTime <= startTime) {
      setMessage(t('msgEndAfterStart'));
      return;
    }

    try {
      await bookingApi.requestBooking({
        ...bookingForm,
        bookingType: bookingForm.bookingType,
        classCode: bookingForm.bookingType === 'class' ? bookingForm.classCode : undefined,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        attendeeCount: Number(bookingForm.attendeeCount)
      });

      setMessage(t('msgBookingSubmitted'));
      setBookingForm((prev) => ({
        ...prev,
        title: '',
        purpose: '',
        classCode: '',
        startTime: '',
        endTime: '',
        attendeeCount: 30
      }));
      await Promise.all([loadBookings(), loadMyBookings(), loadCalendar()]);
    } catch (apiError) {
      setMessage(getApiErrorMessage(apiError, t('msgBookingFailed')));
    }
  };

  const resetVenueForm = () => {
    setVenueForm({ id: '', name: '', location: '', capacity: 120, amenities: '' });
  };

  const editVenue = (venue) => {
    setVenueForm({
      id: venue._id,
      name: venue.name,
      location: venue.location,
      capacity: venue.capacity,
      amenities: (venue.amenities || []).join(', ')
    });
  };

  const saveVenue = async (event) => {
    event.preventDefault();
    setMessage('');

    if (!venueForm.name.trim() || !venueForm.location.trim()) {
      setMessage(t('msgVenueRequired'));
      return;
    }

    const payload = {
      name: venueForm.name,
      location: venueForm.location,
      capacity: Number(venueForm.capacity),
      amenities: venueForm.amenities
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    };

    try {
      if (venueForm.id) {
        await bookingApi.updateVenue(venueForm.id, payload);
        setMessage(t('msgVenueUpdated'));
      } else {
        await bookingApi.createVenue({ ...payload, manager: user.id });
        setMessage(t('msgVenueCreated'));
      }
      resetVenueForm();
      await Promise.all([loadVenues(), loadAllVenues(), loadCalendar()]);
    } catch (apiError) {
      setMessage(
        getApiErrorMessage(apiError, venueForm.id ? t('msgVenueUpdateFailed') : t('msgVenueCreateFailed'))
      );
    }
  };

  const confirmVenueStatus = async () => {
    if (!venueStatusTarget) {
      return;
    }

    setVenueStatusBusy(true);

    try {
      await bookingApi.updateVenue(venueStatusTarget._id, {
        isActive: !venueStatusTarget.isActive
      });
      setMessage(
        venueStatusTarget.isActive
          ? toLocalizedText(
              {
                en: `${venueStatusTarget.name} retired. New booking requests are blocked; existing approvals stay on the calendar.`,
                bn: `${venueStatusTarget.name} অবসরে গেছে। নতুন বুকিং অনুরোধ বন্ধ; বিদ্যমান অনুমোদন ক্যালেন্ডারে থাকবে।`
              },
              language
            )
          : toLocalizedText(
              {
                en: `${venueStatusTarget.name} reactivated and open for requests.`,
                bn: `${venueStatusTarget.name} পুনঃসক্রিয় এবং অনুরোধের জন্য উন্মুক্ত।`
              },
              language
            )
      );
      setVenueStatusTarget(null);
      await Promise.all([loadVenues(), loadAllVenues()]);
    } catch (apiError) {
      setMessage(getApiErrorMessage(apiError, t('msgVenueStatusFailed')));
      setVenueStatusTarget(null);
    } finally {
      setVenueStatusBusy(false);
    }
  };

  const runConflictCheck = async () => {
    if (!bookingForm.venue || !bookingForm.startTime || !bookingForm.endTime) {
      setMessage(t('msgSelectVenueTime'));
      return;
    }

    const startTime = new Date(bookingForm.startTime);
    const endTime = new Date(bookingForm.endTime);

    if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
      setMessage(t('msgValidTimesConflict'));
      return;
    }

    if (endTime <= startTime) {
      setMessage(t('msgEndAfterStart'));
      return;
    }

    try {
      const response = await bookingApi.checkConflicts({
        venueId: bookingForm.venue,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString()
      });

      setConflicts(response.data.conflicts || []);
      setMessage(response.data.hasConflict ? t('msgConflictsFound') : t('msgNoConflicts'));
    } catch (apiError) {
      setMessage(getApiErrorMessage(apiError, t('msgConflictFailed')));
    }
  };

  const [reviewTarget, setReviewTarget] = useState(null);
  const [reviewBusy, setReviewBusy] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelBusy, setCancelBusy] = useState(false);

  const confirmCancelBooking = async () => {
    if (!cancelTarget) {
      return;
    }

    setCancelBusy(true);

    try {
      await bookingApi.cancelMyBooking(cancelTarget._id);
      setMessage(t('msgBookingCancelled'));
      setCancelTarget(null);
      await Promise.all([loadBookings(), loadMyBookings(), loadCalendar()]);
    } catch (apiError) {
      setMessage(getApiErrorMessage(apiError, t('msgCancelFailed')));
      setCancelTarget(null);
    } finally {
      setCancelBusy(false);
    }
  };

  const reviewBooking = (bookingId, status) => {
    setReviewTarget({ id: bookingId, status });
  };

  const confirmReviewBooking = async (decisionNote) => {
    if (!reviewTarget) {
      return;
    }

    setReviewBusy(true);

    try {
      await bookingApi.reviewBooking(reviewTarget.id, {
        status: reviewTarget.status,
        decisionNote
      });
      setMessage(
        reviewTarget.status === 'approved'
          ? toLocalizedText({ en: 'Booking approved.', bn: 'বুকিং অনুমোদিত।' }, language)
          : toLocalizedText({ en: 'Booking rejected.', bn: 'বুকিং প্রত্যাখ্যাত।' }, language)
      );
      setReviewTarget(null);
      await Promise.all([loadBookings(), loadMyBookings(), loadCalendar()]);
    } catch (apiError) {
      setMessage(getApiErrorMessage(apiError, t('msgDecisionFailed')));
      setReviewTarget(null);
    } finally {
      setReviewBusy(false);
    }
  };

  return (
    <section className="page-wrap desk-page booking-page">
      <header className="page-title-bar">
        <div>
          <p className="eyebrow">{t('eyebrow')}</p>
          <h1>{t('title')}</h1>
          <p className="page-title-subtitle">{t('subtitle')}</p>
        </div>
        <button type="button" className="btn btn-ghost" onClick={loadData}>
          {t('refresh')}
        </button>
      </header>

      <section className="kpi-strip" aria-label="Booking summary">
        <article className="kpi-card">
          <p className="kpi-label">{t('activeVenues')}</p>
          {formErrors.venue && <span className="error-text">{formErrors.venue}</span>}
          <p className="kpi-value">{dashboardStats.activeVenues}</p>
          <p className="kpi-note">{t('availableForRequests')}</p>
        </article>
        <article className="kpi-card">
          <p className="kpi-label">{t('calendarEntries')}</p>
          <p className="kpi-value">{dashboardStats.calendarEntries}</p>
          <p className="kpi-note">{t('approvedInWindow')}</p>
        </article>
        <article className="kpi-card">
          <p className="kpi-label">{t('myRequests')}</p>
          <p className="kpi-value">{dashboardStats.myRequests}</p>
          <p className="kpi-note">{t('visibleSignedIn')}</p>
        </article>
        <article className="kpi-card">
          <p className="kpi-label">{t('pendingApprovals')}</p>
          <p className="kpi-value">{dashboardStats.pendingApprovals}</p>
          <p className="kpi-note">{t('managerQueue')}</p>
        </article>
      </section>

      {error && <InlineAlert type="error">{error}</InlineAlert>}
      {message && <InlineAlert type="info">{message}</InlineAlert>}
      {loading && <SkeletonList count={3} showMedia lines={3} />}

      <div className="workflow-grid booking-section">
        <article className="surface-card">
          <div className="section-head section-head-tight">
            <h3>{t('calendarHeading')}</h3>
            <button type="button" className="btn btn-ghost" onClick={loadCalendar}>
              {t('refreshCalendar')}
            </button>
          </div>

          <form
            className="form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              loadCalendar();
            }}
          >
            <label>
              {t('startDate')}
              <input
                type="date"
                value={calendarRange.startDate}
                onChange={(event) =>
                  setCalendarRange((prev) => ({ ...prev, startDate: event.target.value }))
                }
                required
              />
            </label>
            <label>
              {t('endDate')}
              <input
                type="date"
                value={calendarRange.endDate}
                onChange={(event) =>
                  setCalendarRange((prev) => ({ ...prev, endDate: event.target.value }))
                }
                required
              />
            </label>
            <label>
              {t('venue')}
              <select
                value={calendarRange.venue}
                onChange={(event) =>
                  setCalendarRange((prev) => ({ ...prev, venue: event.target.value }))
                }
              >
                <option value="">{t('allVenues')}</option>
                {venues.map((venue) => (
                  <option key={venue._id} value={venue._id}>
                    {venue.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t('type')}
              <select
                value={calendarRange.bookingType}
                onChange={(event) =>
                  setCalendarRange((prev) => ({ ...prev, bookingType: event.target.value }))
                }
              >
                <option value="">{t('allTypes')}</option>
                <option value="class">{t('class')}</option>
                <option value="event">{t('event')}</option>
                <option value="lab">{t('lab')}</option>
                <option value="other">{t('other')}</option>
              </select>
            </label>
            <button type="submit" className="btn btn-primary">
              {t('applyFilters')}
            </button>
          </form>

          {!calendarItems.length && <p>{t('noApprovedInRange')}</p>}
          {!!calendarItems.length && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{t('date')}</th>
                    <th>{t('venue')}</th>
                    <th>{t('type')}</th>
                    <th>{t('titleCol')}</th>
                    <th>{t('classCode')}</th>
                    <th>{t('time')}</th>
                  </tr>
                </thead>
                <tbody>
                  {calendarItems.map((item) => (
                    <tr key={item._id}>
                      <td>{toLocalDateTime(item.startTime)}</td>
                      <td>{item.venue?.name || t('unknown')}</td>
                      <td>{item.bookingType || 'event'}</td>
                      <td>{item.title}</td>
                      <td>{item.classCode || '-'}</td>
                      <td>
                        {toLocalDateTime(item.startTime)} - {toLocalDateTime(item.endTime)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>

        <article className="surface-card">
          <h3>{t('availableVenues')}</h3>
          {!venues.length && <p>{t('noVenuesYet')}</p>}
          <div className="stack-list venue-grid">
            {venues.map((venue) => (
              <article key={venue._id} className="surface-card inner-card">
                <h3>{venue.name}</h3>
                <p>{venue.location}</p>
                <p className="meta">
                  {t('capacity')}: {venue.capacity} • {t('manager')}:{' '}
                  {venue.manager?.fullName || t('unassigned')}
                </p>
              </article>
            ))}
          </div>
        </article>
      </div>

      {isAuthenticated && (
        <div className="workflow-grid booking-section">
          <article className="surface-card">
            <h3>{t('requestBooking')}</h3>
            <form className="form-grid" onSubmit={submitBooking}>
              <label>
                {t('venue')}
                <select
                  value={bookingForm.venue}
                  onChange={(event) =>
                    setBookingForm((prev) => ({ ...prev, venue: event.target.value }))
                  }
                  required
                >
                  <option value="">{t('selectVenue')}</option>
                  {venues.map((venue) => (
                    <option key={venue._id} value={venue._id}>
                      {venue.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                {t('bookingTitle')}
                <input
                  value={bookingForm.title}
                  onChange={(event) =>
                    setBookingForm((prev) => ({ ...prev, title: event.target.value }))
                  }
                  minLength={3}
                  required
                />
                {formErrors.title && <span className="error-text">{formErrors.title}</span>}
              </label>

              <label>
                {t('purpose')}
                <textarea
                  value={bookingForm.purpose}
                  onChange={(event) =>
                    setBookingForm((prev) => ({ ...prev, purpose: event.target.value }))
                  }
                  minLength={20}
                  required
                />
                {formErrors.purpose && <span className="error-text">{formErrors.purpose}</span>}
              </label>

              <label>
                {t('bookingType')}
                <select
                  value={bookingForm.bookingType}
                  onChange={(event) =>
                    setBookingForm((prev) => ({ ...prev, bookingType: event.target.value }))
                  }
                  required
                >
                  <option value="event">{t('event')}</option>
                  <option value="class">{t('class')}</option>
                  <option value="lab">{t('lab')}</option>
                  <option value="other">{t('other')}</option>
                </select>
              </label>

              {bookingForm.bookingType === 'class' && (
                <label>
                  {t('classCode')}
                  <input
                    value={bookingForm.classCode}
                    onChange={(event) =>
                      setBookingForm((prev) => ({ ...prev, classCode: event.target.value }))
                    }
                    placeholder="CSE-301"
                    required
                  />
                  {formErrors.classCode && (
                    <span className="error-text">{formErrors.classCode}</span>
                  )}
                </label>
              )}

              <label>
                {t('startTime')}
                <input
                  type="datetime-local"
                  value={bookingForm.startTime}
                  onChange={(event) => {
                    const nextStartTime = event.target.value;

                    setBookingForm((prev) => {
                      if (!prev.endTime) {
                        return { ...prev, startTime: nextStartTime };
                      }

                      const parsedStart = new Date(nextStartTime);
                      const parsedEnd = new Date(prev.endTime);
                      const shouldResetEnd =
                        !Number.isNaN(parsedStart.getTime()) &&
                        !Number.isNaN(parsedEnd.getTime()) &&
                        parsedEnd <= parsedStart;

                      return {
                        ...prev,
                        startTime: nextStartTime,
                        endTime: shouldResetEnd ? '' : prev.endTime
                      };
                    });
                  }}
                  required
                />
                {formErrors.startTime && <span className="error-text">{formErrors.startTime}</span>}
              </label>

              <label>
                {t('endTime')}
                <input
                  type="datetime-local"
                  min={bookingForm.startTime || undefined}
                  value={bookingForm.endTime}
                  onChange={(event) =>
                    setBookingForm((prev) => ({ ...prev, endTime: event.target.value }))
                  }
                  required
                />
                {formErrors.endTime && <span className="error-text">{formErrors.endTime}</span>}
              </label>

              <label>
                {t('attendeeCount')}
                <input
                  type="number"
                  min="1"
                  max={selectedVenue?.capacity || 100000}
                  value={bookingForm.attendeeCount}
                  onChange={(event) =>
                    setBookingForm((prev) => ({ ...prev, attendeeCount: event.target.value }))
                  }
                  required
                />
                {formErrors.attendeeCount && (
                  <span className="error-text">{formErrors.attendeeCount}</span>
                )}
              </label>

              <button type="submit" className="btn btn-primary">
                {t('submitBooking')}
              </button>

              {canCheckConflicts && (
                <button type="button" className="btn btn-ghost" onClick={runConflictCheck}>
                  {t('checkConflict')}
                </button>
              )}
            </form>

            {!!conflicts.length && (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>{t('titleCol')}</th>
                      <th>{t('status')}</th>
                      <th>{t('start')}</th>
                      <th>{t('end')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {conflicts.map((item) => (
                      <tr key={item._id}>
                        <td>{item.title}</td>
                        <td>{item.status}</td>
                        <td>{toLocalDateTime(item.startTime)}</td>
                        <td>{toLocalDateTime(item.endTime)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>

          <article className="surface-card">
            <h3>{t('myBookingRequests')}</h3>
            {!myBookings.length && <p>{t('noRequestsForAccount')}</p>}
            {!!myBookings.length && (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>{t('venue')}</th>
                      <th>{t('type')}</th>
                      <th>{t('classCode')}</th>
                      <th>{t('window')}</th>
                      <th>{t('status')}</th>
                      <th>{t('decisionNote')}</th>
                      <th>{t('actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myBookings.map((item) => (
                      <tr key={item._id}>
                        <td>{item.venue?.name || t('unknown')}</td>
                        <td>{item.bookingType || 'event'}</td>
                        <td>{item.classCode || '-'}</td>
                        <td>
                          {toLocalDateTime(item.startTime)} - {toLocalDateTime(item.endTime)}
                        </td>
                        <td>
                          <span className={`status-badge status-${item.status}`}>
                            {item.status}
                          </span>
                        </td>
                        <td>{item.decisionNote || '-'}</td>
                        <td>
                          {item.status === 'pending' ? (
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={() => setCancelTarget(item)}
                            >
                              {t('cancel')}
                            </button>
                          ) : (
                            '-'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>
        </div>
      )}

      {canApprove && (
        <div className="workflow-grid booking-section">
          <article className="surface-card">
            <h3>{venueForm.id ? t('editVenueHeading') : t('createVenueHeading')}</h3>
            <form className="form-grid" onSubmit={saveVenue}>
              <label>
                {t('venueName')}
                <input
                  value={venueForm.name}
                  onChange={(event) =>
                    setVenueForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                  required
                />
              </label>
              <label>
                {t('location')}
                <input
                  value={venueForm.location}
                  onChange={(event) =>
                    setVenueForm((prev) => ({ ...prev, location: event.target.value }))
                  }
                  required
                />
              </label>
              <label>
                {t('capacity')}
                <input
                  type="number"
                  min="1"
                  value={venueForm.capacity}
                  onChange={(event) =>
                    setVenueForm((prev) => ({ ...prev, capacity: event.target.value }))
                  }
                  required
                />
              </label>
              <label>
                {t('amenities')}
                <input
                  value={venueForm.amenities}
                  onChange={(event) =>
                    setVenueForm((prev) => ({ ...prev, amenities: event.target.value }))
                  }
                />
              </label>

              <div className="inline-actions">
                <button type="submit" className="btn btn-primary">
                  {venueForm.id ? t('saveChanges') : t('addVenue')}
                </button>
                {venueForm.id && (
                  <button type="button" className="btn btn-ghost" onClick={resetVenueForm}>
                    {t('cancelEdit')}
                  </button>
                )}
              </div>
            </form>

            <div className="section-head section-head-tight">
              <h3>{t('manageVenues')}</h3>
              <span className="meta">
                {allVenues.length} {t('total')}
              </span>
            </div>
            {!allVenues.length && <p>{t('noVenuesCreated')}</p>}
            {!!allVenues.length && (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>{t('venue')}</th>
                      <th>{t('capacity')}</th>
                      <th>{t('status')}</th>
                      <th>{t('actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allVenues.map((venue) => (
                      <tr key={venue._id}>
                        <td>
                          <strong>{venue.name}</strong>
                          <br />
                          <span className="meta">{venue.location}</span>
                        </td>
                        <td>{venue.capacity}</td>
                        <td>
                          <span
                            className={`status-badge ${
                              venue.isActive ? 'status-approved' : 'status-rejected'
                            }`}
                          >
                            {venue.isActive ? t('active') : t('retired')}
                          </span>
                        </td>
                        <td>
                          <div className="inline-actions">
                            <button
                              type="button"
                              className="btn btn-ghost"
                              onClick={() => editVenue(venue)}
                            >
                              {t('edit')}
                            </button>
                            <button
                              type="button"
                              className={`btn ${venue.isActive ? 'btn-danger btn-sm' : 'btn-ghost'}`}
                              onClick={() => setVenueStatusTarget(venue)}
                            >
                              {venue.isActive ? t('retire') : t('reactivate')}
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

          <article className="surface-card">
            <h3>{t('approvalQueue')}</h3>
            {!bookings.length && <p>{t('noPendingRequests')}</p>}
            {!!bookings.length && (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>{t('venue')}</th>
                      <th>{t('requester')}</th>
                      <th>{t('type')}</th>
                      <th>{t('class')}</th>
                      <th>{t('window')}</th>
                      <th>{t('attendees')}</th>
                      <th>{t('action')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((item) => (
                      <tr key={item._id}>
                        <td>{item.venue?.name || t('unknown')}</td>
                        <td>{item.requester?.fullName || t('unknown')}</td>
                        <td>{item.bookingType || 'event'}</td>
                        <td>{item.classCode || '-'}</td>
                        <td>
                          {toLocalDateTime(item.startTime)} - {toLocalDateTime(item.endTime)}
                        </td>
                        <td>{item.attendeeCount}</td>
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
        </div>
      )}

      <ConfirmDialog
        isOpen={Boolean(reviewTarget)}
        onClose={() => setReviewTarget(null)}
        onConfirm={confirmReviewBooking}
        title={reviewTarget?.status === 'approved' ? t('approveBooking') : t('rejectBooking')}
        message={
          reviewTarget?.status === 'approved' ? t('confirmReviewApprove') : t('confirmReviewReject')
        }
        confirmLabel={reviewTarget?.status === 'approved' ? t('approve') : t('reject')}
        tone={reviewTarget?.status === 'approved' ? 'primary' : 'danger'}
        noteLabel={t('decisionNoteLabel')}
        notePlaceholder={t('decisionNotePlaceholder')}
        busy={reviewBusy}
      />

      <ConfirmDialog
        isOpen={Boolean(venueStatusTarget)}
        onClose={() => setVenueStatusTarget(null)}
        onConfirm={confirmVenueStatus}
        title={venueStatusTarget?.isActive ? t('retireVenueTitle') : t('reactivateVenueTitle')}
        message={
          venueStatusTarget?.isActive
            ? toLocalizedText(
                {
                  en: `${venueStatusTarget?.name} will stop accepting new booking requests. Existing approved bookings remain on the calendar.`,
                  bn: `${venueStatusTarget?.name} নতুন বুকিং অনুরোধ নেওয়া বন্ধ করবে। বিদ্যমান অনুমোদিত বুকিং ক্যালেন্ডারে থাকবে।`
                },
                language
              )
            : toLocalizedText(
                {
                  en: `${venueStatusTarget?.name} will be open for booking requests again.`,
                  bn: `${venueStatusTarget?.name} আবার বুকিং অনুরোধের জন্য উন্মুক্ত হবে।`
                },
                language
              )
        }
        confirmLabel={venueStatusTarget?.isActive ? t('retireVenueLabel') : t('reactivateVenueLabel')}
        tone={venueStatusTarget?.isActive ? 'danger' : 'primary'}
        busy={venueStatusBusy}
      />

      <ConfirmDialog
        isOpen={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        onConfirm={confirmCancelBooking}
        title={t('cancelBookingTitle')}
        message={toLocalizedText(
          {
            en: `Withdraw your pending request for ${
              cancelTarget?.venue?.name || 'this venue'
            }? The time slot will be released.`,
            bn: `${
              cancelTarget?.venue?.name || 'এই ভেন্যু'
            }-এর জন্য আপনার অপেক্ষমাণ অনুরোধ প্রত্যাহার করবেন? সময় স্লটটি মুক্ত হয়ে যাবে।`
          },
          language
        )}
        confirmLabel={t('cancelRequestLabel')}
        tone="danger"
        busy={cancelBusy}
      />
    </section>
  );
}

export default BookingPage;
