/** Public site information architecture — used by header, footer, and home hub.
 *  Groups are visitor-intent based (what people come to do), not CMS-type based. */
export const PUBLIC_NAV_ABOUT = {
  to: '/about',
  label: { en: 'About', bn: 'পরিচিতি' }
};

export const PUBLIC_NAV_CONTENT = [
  { to: '/news', label: { en: 'News', bn: 'সংবাদ' } },
  { to: '/announcements', label: { en: 'Announcements', bn: 'ঘোষণা' } },
  { to: '/blogs', label: { en: 'Blog', bn: 'ব্লগ' } },
  { to: '/gallery', label: { en: 'Gallery', bn: 'গ্যালারি' } }
];

export const PUBLIC_NAV_SERVICES = [
  { to: '/scholarship', label: { en: 'Scholarships', bn: 'বৃত্তি' } },
  { to: '/events', label: { en: 'Events', bn: 'ইভেন্ট' } },
  { to: '/booking', label: { en: 'Venue Booking', bn: 'ভেন্যু বুকিং' } }
];
