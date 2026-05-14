import { toLocalizedText } from '../utils/localized';
import enLocale from '../locales/en.json';
import bnLocale from '../locales/bn.json';

/** Bilingual UI copy for public pages (static strings not stored in CMS). */
export const publicUi = {
  home: {
    eyebrow: {
      en: 'Operational Digital Campus Platform',
      bn: 'অপারেশনাল ডিজিটাল ক্যাম্পাস প্ল্যাটফর্ম'
    },
    heroTitle: {
      en: 'Run your department with one interface, not five disconnected tools.',
      bn: 'একটি ইন্টারফেসে বিভাগ চালান—পাঁচটি বিচ্ছিন্ন টুল নয়।'
    },
    heroLead: {
      en: 'Publish updates, open scholarships, register events, approve venue requests, and handle inquiries from a unified, role-aware workflow.',
      bn: 'আপডেট প্রকাশ, বৃত্তি খোলা, ইভেন্ট রেজিস্ট্রেশন, ভেন্যু অনুরোধ অনুমোদন এবং জিজ্ঞাসা—সব একই রোল-সচেতন ওয়ার্কফ্লোতে।'
    },
    signedInAs: { en: 'Signed in as', bn: 'সাইন ইন করা হয়েছে' },
    exploreNewsroom: { en: 'Explore Newsroom', bn: 'নিউজরুম দেখুন' },
    openScholarshipDesk: { en: 'Open Scholarship Desk', bn: 'বৃত্তি ডেস্ক' },
    submitInquiry: { en: 'Submit Inquiry', bn: 'জিজ্ঞাসা পাঠান' },
    chipBilingual: { en: 'Bilingual Experience', bn: 'দ্বিভাষিক অভিজ্ঞতা' },
    chipRole: { en: 'Role-Based Access', bn: 'রোল ভিত্তিক অ্যাক্সেস' },
    chipAudit: { en: 'Audit Friendly', bn: 'অডিট-বান্ধব' },
    chipDemo: { en: 'Demo Ready', bn: 'ডেমো প্রস্তুত' },
    liveSnapshot: { en: 'Live Snapshot', bn: 'লাইভ স্ন্যাপশট' },
    refresh: { en: 'Refresh', bn: 'রিফ্রেশ' },
    loadingHighlights: { en: 'Loading platform highlights...', bn: 'হাইলাইট লোড হচ্ছে...' },
    statNews: { en: 'Published News', bn: 'প্রকাশিত সংবাদ' },
    statScholarships: { en: 'Open Scholarships', bn: 'খোলা বৃত্তি' },
    statEvents: { en: 'Upcoming Events', bn: 'আসন্ন ইভেন্ট' },
    statVenues: { en: 'Bookable Venues', bn: 'বুকযোগ্য ভেন্যু' },
    nearestEvent: { en: 'Nearest Event', bn: 'নিকটতম ইভেন্ট' },
    latestNews: { en: 'Latest News', bn: 'সর্বশেষ সংবাদ' },
    viewAll: { en: 'View all', bn: 'সব দেখুন' },
    noNews: { en: 'No news published yet.', bn: 'এখনও কোনো সংবাদ প্রকাশিত নয়।' },
    scholarshipBlockTitle: { en: 'Open Scholarships', bn: 'খোলা বৃত্তি' },
    applyNow: { en: 'Apply now', bn: 'আবেদন করুন' },
    noScholarships: { en: 'No open scholarships right now.', bn: 'এখন কোনো খোলা বৃত্তি নেই।' },
    deadline: { en: 'Deadline', bn: 'শেষ তারিখ' },
    upcomingEvents: { en: 'Upcoming Events', bn: 'আসন্ন ইভেন্ট' },
    register: { en: 'Register', bn: 'নিবন্ধন' },
    noEvents: { en: 'No published events currently.', bn: 'এখন কোনো প্রকাশিত ইভেন্ট নেই।' },
    venueAvailability: { en: 'Venue Availability', bn: 'ভেন্যু উপলব্ধতা' },
    requestSlot: { en: 'Request slot', bn: 'স্লট অনুরোধ' },
    noVenues: { en: 'No active venues configured yet.', bn: 'এখনও সক্রিয় ভেন্যু নেই।' },
    capacity: { en: 'Capacity', bn: 'ধারণক্ষমতা' },
    valueStripTitle: {
      en: 'Why This Feels Better Than A Static Department Site',
      bn: 'স্ট্যাটিক সাইটের চেয়ে ভালো লাগার কারণ'
    },
    value1h: { en: 'Action-first pages', bn: 'কাজ-আগে পাতা' },
    value1p: {
      en: 'Visitors can immediately apply, register, request, and inquire from the homepage flow.',
      bn: 'হোমপেজ থেকেই আবেদন, রেজিস্ট্রেশন, অনুরোধ ও জিজ্ঞাসা—তৎক্ষণাৎ।'
    },
    value2h: { en: 'Operational transparency', bn: 'অপারেশনাল স্বচ্ছতা' },
    value2p: {
      en: 'Real module counts and timelines surface what is currently active in the department.',
      bn: 'সংখ্যা ও সময়রেখায় দেখা যায় বিভাগে কী চলছে।'
    },
    value3h: { en: 'Showable for evaluation', bn: 'মূল্যায়নের জন্য উপযোগী' },
    value3p: {
      en: 'The landing page now demonstrates live integrations instead of only static description text.',
      bn: 'ল্যান্ডিং পেজে লাইভ ইন্টিগ্রেশন, শুধু স্ট্যাটিক বর্ণনা নয়।'
    },
    exploreHubTitle: {
      en: 'Explore the hub',
      bn: 'হাবটি ঘুরে দেখুন'
    },
    exploreHubSubtitle: {
      en: 'Content, services, and account tools—organized the same way as the menu above.',
      bn: 'কন্টেন্ট, সেবা ও অ্যাকাউন্ট—উপরের মেনুর মতোই সাজানো।'
    },
    exploreColContent: { en: 'Read & watch', bn: 'পড়ুন ও দেখুন' },
    exploreColServices: { en: 'Apply & reserve', bn: 'আবেদন ও সংরক্ষণ' },
    exploreColConnect: { en: 'Reach us', bn: 'যোগাযোগ' }
  },
  gallery: {
    title: { en: 'Gallery', bn: 'গ্যালারি' },
    loading: { en: 'Loading gallery...', bn: 'গ্যালারি লোড হচ্ছে...' },
    empty: { en: 'No gallery collections published yet.', bn: 'এখনও কোনো গ্যালারি প্রকাশিত নয়।' },
    untitled: { en: 'Untitled media', bn: 'শিরোনামহীন মিডিয়া' },
    mediaMissing: { en: 'Media link missing or invalid.', bn: 'মিডিয়া লিঙ্ক নেই বা ভুল।' }
  },
  contact: {
    title: { en: 'Contact Desk', bn: 'যোগাযোগ ডেস্ক' },
    refreshInquiries: { en: 'Refresh Inquiries', bn: 'জিজ্ঞাসা রিফ্রেশ' },
    sendTitle: { en: 'Send an Inquiry', bn: 'জিজ্ঞাসা পাঠান' },
    sendHint: {
      en: 'Share your question or request with the department office. Required fields are validated on submit.',
      bn: 'আপনার প্রশ্ন বা অনুরোধ বিভাগীয় অফিসে পাঠান। প্রেরণে বাধ্যতামূলক ক্ষেত্র যাচাই হয়।'
    },
    successIntro: {
      en: 'Thank you. Your inquiry has been received.',
      bn: 'ধন্যবাদ। আপনার জিজ্ঞাসা গ্রহণ করা হয়েছে।'
    },
    name: { en: 'Name', bn: 'নাম' },
    email: { en: 'Email', bn: 'ইমেইল' },
    subject: { en: 'Subject', bn: 'বিষয়' },
    message: { en: 'Message', bn: 'বার্তা' },
    submit: { en: 'Submit Inquiry', bn: 'জিজ্ঞাসা জমা দিন' },
    inquiryMgmt: { en: 'Inquiry Management', bn: 'জিজ্ঞাসা ব্যবস্থাপনা' },
    myInquiries: { en: 'My Inquiries', bn: 'আমার জিজ্ঞাসা' },
    allStatuses: { en: 'All statuses', bn: 'সব অবস্থা' },
    statusNew: { en: 'New', bn: 'নতুন' },
    statusProgress: { en: 'In Progress', bn: 'চলমান' },
    statusResolved: { en: 'Resolved', bn: 'সমাধান' },
    noMine: {
      en: 'No inquiries found yet. Submit one using the form above.',
      bn: 'এখনও কিছু নেই। উপরের ফর্ম ব্যবহার করুন।'
    },
    refLine: {
      en: 'Reference',
      bn: 'রেফারেন্স'
    },
    statusLine: { en: 'Current status', bn: 'বর্তমান অবস্থা' },
    guestTrackHint: {
      en: 'Save this reference to follow up. Sign in with the same email to see updates under “My Inquiries”.',
      bn: 'এই রেফারেন্স সংরক্ষণ করুন। একই ইমেইলে সাইন ইন করে “আমার জিজ্ঞাসা” থেকে দেখুন।'
    },
    signedInTrackHint: {
      en: 'You can track status anytime in “My Inquiries” below.',
      bn: 'নিচের “আমার জিজ্ঞাসা” থেকে যেকোনো সময় দেখুন।'
    }
  },
  newsroom: {
    title: { en: 'Newsroom', bn: 'নিউজরুম' },
    composer: { en: 'Content Composer', bn: 'কন্টেন্ট কম্পোজার' },
    news: { en: 'News', bn: 'সংবাদ' },
    blog: { en: 'Blog', bn: 'ব্লগ' },
    latestNews: { en: 'Latest News', bn: 'সর্বশেষ সংবাদ' },
    featuredBlogs: { en: 'Featured Blogs', bn: 'নির্বাচিত ব্লগ' },
    galleryHighlights: { en: 'Gallery Highlights', bn: 'গ্যালারি হাইলাইট' },
    noNews: { en: 'No news found.', bn: 'কোনো সংবাদ নেই।' },
    noBlogs: { en: 'No blog entries found yet.', bn: 'এখনও ব্লগ নেই।' },
    noGallery: { en: 'No gallery collections published yet.', bn: 'গ্যালারি নেই।' },
    slug: { en: 'Slug', bn: 'স্লাগ' },
    mediaItems: { en: 'Media items', bn: 'মিডিয়া আইটেম' },
    pageOf: { en: 'Page', bn: 'পৃষ্ঠা' },
    of: { en: 'of', bn: 'এর' },
    prev: { en: 'Previous', bn: 'আগের' },
    next: { en: 'Next', bn: 'পরের' },
    published: { en: 'Published', bn: 'প্রকাশিত' },
    loadingList: { en: 'Loading...', bn: 'লোড হচ্ছে...' }
  },
  blogs: {
    title: { en: 'Blog', bn: 'ব্লগ' },
    loading: { en: 'Loading blogs...', bn: 'ব্লগ লোড হচ্ছে...' },
    empty: { en: 'No blogs published yet.', bn: 'এখনও ব্লগ প্রকাশিত নয়।' },
    read: { en: 'Read Blog', bn: 'ব্লগ পড়ুন' }
  },
  scholarship: {
    eyebrow: { en: 'Scholarship Operations', bn: 'বৃত্তি অপারেশন' },
    title: { en: 'Scholarship Desk', bn: 'বৃত্তি ডেস্ক' },
    subtitle: {
      en: 'Manage notices, applications, recipient publication, and scholarship update timelines in one place.',
      bn: 'নোটিস, আবেদন, গ্রহীতা প্রকাশ ও আপডেট টাইমলাইন—এক জায়গায়।'
    },
    refresh: { en: 'Refresh', bn: 'রিফ্রেশ' },
    breadcrumbHome: { en: 'Home', bn: 'হোম' },
    breadcrumbScholarship: { en: 'Scholarship', bn: 'বৃত্তি' },
    stepApply: { en: 'Step 2 of 2 — Application', bn: 'ধাপ ২/২ — আবেদন' },
    stepNotice: { en: 'Step 1 of 2 — Choose a notice', bn: 'ধাপ ১/২ — নোটিস বেছে নিন' },
    availableNotices: { en: 'Scholarship notice', bn: 'বৃত্তির নোটিস' },
    selectNoticePlaceholder: { en: 'Select a notice…', bn: 'একটি নোটিস বেছে নিন…' },
    applyTitle: { en: 'Apply for Scholarship', bn: 'বৃত্তির জন্য আবেদন' },
    categoryLabel: {
      en: 'Award category (this notice)',
      bn: 'পুরস্কারের শ্রেণি (এই নোটিসের জন্য)'
    },
    selectCategory: { en: 'Select category', bn: 'শ্রেণি বেছে নিন' },
    statement: { en: 'Statement of Purpose', bn: 'উদ্দেশ্য বিবরণ' },
    gpa: { en: 'GPA', bn: 'জিপিএ' },
    department: { en: 'Department', bn: 'বিভাগ' },
    submitApp: { en: 'Submit Application', bn: 'আবেদন জমা দিন' },
    loading: { en: 'Loading scholarship data...', bn: 'ডেটা লোড হচ্ছে...' },
    noNotices: { en: 'No scholarship notices yet.', bn: 'এখনও কোনো নোটিস নেই।' }
  },
  events: {
    eyebrow: { en: 'Event Programs', bn: 'ইভেন্ট প্রোগ্রাম' },
    title: { en: 'Events', bn: 'ইভেন্ট' },
    subtitle: {
      en: 'Publish events, track registrations and check-ins, and collect participant feedback with a public calendar.',
      bn: 'ইভেন্ট প্রকাশ, রেজিস্ট্রেশন ও চেক-ইন ট্র্যাকিং ও পাবলিক ক্যালেন্ডার।'
    },
    refresh: { en: 'Refresh', bn: 'রিফ্রেশ' },
    seatsTotal: { en: 'Total seats', bn: 'মোট আসন' },
    seatsRemaining: { en: 'Seats remaining', bn: 'বাকি আসন' },
    liveSeatsHint: {
      en: 'Open the calendar panel above for live registration counts.',
      bn: 'লাইভ রেজিস্ট্রেশন সংখ্যার জন্য উপরের ক্যালেন্ডার দেখুন।'
    }
  },
  nav: {
    home: { en: 'Home', bn: 'হোম' },
    contentMedia: { en: 'Content & media', bn: 'কন্টেন্ট ও মিডিয়া' },
    campusServices: { en: 'Campus services', bn: 'ক্যাম্পাস সেবা' },
    contact: { en: 'Contact', bn: 'যোগাযোগ' },
    portals: { en: 'Portals', bn: 'পোর্টাল' },
    connect: { en: 'Connect', bn: 'যোগাযোগ ও অ্যাকাউন্ট' }
  },
  brand: {
    title: { en: 'Digital Department Hub', bn: 'ডিজিটাল ডিপার্টমেন্ট হাব' }
  }
};

export function ui(section, key, language) {
  const block = publicUi[section];
  const jsonLocale = language === 'bn' ? bnLocale : enLocale;
  const jsonValue = jsonLocale?.[section]?.[key];

  if (jsonValue) {
    return jsonValue;
  }

  if (!block || !block[key]) {
    return '';
  }
  return toLocalizedText(block[key], language);
}
