/** Structured, bilingual content for the public About page (/about).
 *  Kept as data (not JSX) so copy edits never touch the component, and so the
 *  same source can later be moved into the CMS if the department wants to edit
 *  it without a deploy. Each string is an { en, bn } pair resolved through
 *  toLocalizedText at render time. */

export const ABOUT_HERO = {
  eyebrow: {
    en: 'About the Department',
    bn: 'বিভাগ সম্পর্কে'
  },
  title: {
    en: 'Department of Computer Science and Engineering, University of Dhaka',
    bn: 'কম্পিউটার সায়েন্স অ্যান্ড ইঞ্জিনিয়ারিং বিভাগ, ঢাকা বিশ্ববিদ্যালয়'
  },
  lead: {
    en: 'Under the Faculty of Engineering and Technology, CSEDU focuses on quality education and research across diverse areas of computing.',
    bn: 'ইঞ্জিনিয়ারিং ও প্রযুক্তি অনুষদের অধীনে, সিএসইডিইউ কম্পিউটিং-এর বিভিন্ন ক্ষেত্রে মানসম্পন্ন শিক্ষা ও গবেষণার উপর গুরুত্ব দেয়।'
  }
};

export const ABOUT_HIGHLIGHTS = [
  {
    key: 'graduates',
    value: { en: '95%+', bn: '৯৫%+' },
    label: { en: 'Graduates employed', bn: 'কর্মসংস্থানপ্রাপ্ত স্নাতক' }
  },
  {
    key: 'programs',
    value: { en: '5', bn: '৫' },
    label: { en: 'Degree programs', bn: 'ডিগ্রি প্রোগ্রাম' }
  },
  {
    key: 'undergrad',
    value: { en: '4 yr', bn: '৪ বছর' },
    label: { en: 'BSc (Honours) track', bn: 'বিএসসি (সম্মান) প্রোগ্রাম' }
  }
];

/** Ordered content sections. `body` paragraphs render in sequence. */
export const ABOUT_SECTIONS = [
  {
    key: 'mission',
    icon: '🎯',
    title: { en: 'Mission & History', bn: 'লক্ষ্য ও ইতিহাস' },
    body: [
      {
        en: 'The Department of Computer Science and Engineering at the University of Dhaka (CSEDU) is under the Faculty of Engineering and Technology and focuses on quality education and research across diverse areas of computing.',
        bn: 'ঢাকা বিশ্ববিদ্যালয়ের কম্পিউটার সায়েন্স অ্যান্ড ইঞ্জিনিয়ারিং বিভাগ (সিএসইডিইউ) ইঞ্জিনিয়ারিং ও প্রযুক্তি অনুষদের অধীনে এবং কম্পিউটিং-এর বিভিন্ন ক্ষেত্রে মানসম্পন্ন শিক্ষা ও গবেষণার উপর গুরুত্ব দেয়।'
      },
      {
        en: 'It offers 4-year BSc (Honours), 1.5-year MSc, 2-year M.Phil and PhD programs in Computer Science and Engineering, plus a 1.5-year Professional Masters in Information and Cyber Security (PMICS). These programs have helped it grow into one of the strongest computing departments in the region, with a long track record in competitive programming and research.',
        bn: 'এটি কম্পিউটার সায়েন্স অ্যান্ড ইঞ্জিনিয়ারিং-এ ৪ বছরের বিএসসি (সম্মান), ১.৫ বছরের এমএসসি, ২ বছরের এমফিল ও পিএইচডি প্রোগ্রাম, এবং ১.৫ বছরের প্রফেশনাল মাস্টার্স ইন ইনফরমেশন অ্যান্ড সাইবার সিকিউরিটি (পিএমআইসিএস) প্রদান করে। এই প্রোগ্রামগুলো একে প্রতিযোগিতামূলক প্রোগ্রামিং ও গবেষণায় দীর্ঘ সাফল্যের ধারা সহ অঞ্চলের অন্যতম শক্তিশালী কম্পিউটিং বিভাগে পরিণত করতে সহায়তা করেছে।'
      }
    ]
  },
  {
    key: 'leadership',
    icon: '👥',
    title: { en: 'Leadership & People', bn: 'নেতৃত্ব ও জনবল' },
    body: [
      {
        en: 'CSEDU is led by a department chairman and a group of dedicated faculty members whose research spans topics such as artificial intelligence, cloud computing, networking, image intelligence, crowdsourcing and knowledge engineering.',
        bn: 'সিএসইডিইউ একজন বিভাগীয় চেয়ারম্যান এবং একদল নিবেদিতপ্রাণ শিক্ষক দ্বারা পরিচালিত, যাদের গবেষণা কৃত্রিম বুদ্ধিমত্তা, ক্লাউড কম্পিউটিং, নেটওয়ার্কিং, ইমেজ ইন্টেলিজেন্স, ক্রাউডসোর্সিং ও নলেজ ইঞ্জিনিয়ারিং-এর মতো বিষয় জুড়ে বিস্তৃত।'
      },
      {
        en: 'Faculty and staff work closely with student-focused advisors, and an external advisory board that includes members from companies like Amazon, Google, Microsoft and Meta, which helps keep the curriculum aligned with industry practice and supports strong graduate outcomes.',
        bn: 'শিক্ষক ও কর্মীরা শিক্ষার্থী-কেন্দ্রিক উপদেষ্টাদের সাথে, এবং অ্যামাজন, গুগল, মাইক্রোসফট ও মেটার মতো প্রতিষ্ঠানের সদস্যদের নিয়ে গঠিত একটি বহিরাগত উপদেষ্টা বোর্ডের সাথে ঘনিষ্ঠভাবে কাজ করেন, যা পাঠ্যক্রমকে শিল্পক্ষেত্রের সাথে সামঞ্জস্যপূর্ণ রাখতে এবং শক্তিশালী স্নাতক ফলাফল নিশ্চিত করতে সহায়তা করে।'
      }
    ]
  },
  {
    key: 'programs',
    icon: '🎓',
    title: { en: 'Programs Offered', bn: 'প্রদত্ত প্রোগ্রাম' },
    body: [
      {
        en: 'Undergraduate students can enroll in the BSc (Honours) in Computer Science and Engineering, which takes four years over eight semesters and admits a small, highly selective cohort each year.',
        bn: 'স্নাতক শিক্ষার্থীরা কম্পিউটার সায়েন্স অ্যান্ড ইঞ্জিনিয়ারিং-এ বিএসসি (সম্মান) প্রোগ্রামে ভর্তি হতে পারে, যা আট সেমিস্টারে চার বছরে সম্পন্ন হয় এবং প্রতি বছর একটি ছোট, অত্যন্ত নির্বাচিত ব্যাচ ভর্তি করে।'
      },
      {
        en: 'Graduate options include the regular MSc in CSE, M.Phil and PhD programs, plus the PMICS professional master’s program focused on information and cyber security, with scholarship support available through the Faculty of Engineering and Technology.',
        bn: 'স্নাতকোত্তর বিকল্পগুলোর মধ্যে রয়েছে সিএসই-তে নিয়মিত এমএসসি, এমফিল ও পিএইচডি প্রোগ্রাম, এবং তথ্য ও সাইবার নিরাপত্তা কেন্দ্রিক পিএমআইসিএস প্রফেশনাল মাস্টার্স প্রোগ্রাম, যেখানে ইঞ্জিনিয়ারিং ও প্রযুক্তি অনুষদের মাধ্যমে বৃত্তি সহায়তা পাওয়া যায়।'
      }
    ]
  },
  {
    key: 'facilities',
    icon: '🔬',
    title: { en: 'Facilities & Research', bn: 'সুবিধা ও গবেষণা' },
    body: [
      {
        en: 'Students have access to labs, research groups and computing facilities that support work in algorithms, AI, data science, distributed systems, graphics and visualization, networking, IoT, machine learning and pattern mining, and related areas.',
        bn: 'শিক্ষার্থীরা ল্যাব, গবেষণা গ্রুপ ও কম্পিউটিং সুবিধায় প্রবেশাধিকার পায় যা অ্যালগরিদম, এআই, ডেটা সায়েন্স, ডিস্ট্রিবিউটেড সিস্টেম, গ্রাফিক্স ও ভিজ্যুয়ালাইজেশন, নেটওয়ার্কিং, আইওটি, মেশিন লার্নিং ও প্যাটার্ন মাইনিং এবং সংশ্লিষ্ট ক্ষেত্রে কাজকে সমর্থন করে।'
      },
      {
        en: 'In recent years the department has attracted several million taka in research funding and expanded its faculty with multiple hires who have strong academic and research profiles, which has helped grow its publication record in leading journals and conferences.',
        bn: 'সাম্প্রতিক বছরগুলোতে বিভাগটি কয়েক মিলিয়ন টাকার গবেষণা তহবিল আকর্ষণ করেছে এবং শক্তিশালী একাডেমিক ও গবেষণা প্রোফাইলসম্পন্ন একাধিক নতুন শিক্ষক নিয়োগের মাধ্যমে তার শিক্ষকমণ্ডলী সম্প্রসারিত করেছে, যা শীর্ষস্থানীয় জার্নাল ও সম্মেলনে এর প্রকাশনার রেকর্ড বৃদ্ধিতে সহায়তা করেছে।'
      }
    ]
  },
  {
    key: 'achievements',
    icon: '🏆',
    title: { en: 'Achievements & Community', bn: 'অর্জন ও সম্প্রদায়' },
    body: [
      {
        en: 'CSEDU highlights that its teams have repeatedly won regional and national competitive programming contests, and that more than 95% of graduates secure jobs, supported by its alumni network and advisory board links to major tech companies and universities worldwide.',
        bn: 'সিএসইডিইউ তুলে ধরে যে তার দলগুলো বারবার আঞ্চলিক ও জাতীয় প্রতিযোগিতামূলক প্রোগ্রামিং প্রতিযোগিতায় জয়ী হয়েছে এবং ৯৫%-এর বেশি স্নাতক চাকরি পায়, যা এর অ্যালামনাই নেটওয়ার্ক এবং বিশ্বজুড়ে বড় প্রযুক্তি প্রতিষ্ঠান ও বিশ্ববিদ্যালয়ের সাথে উপদেষ্টা বোর্ডের সংযোগ দ্বারা সমর্থিত।'
      },
      {
        en: 'The department emphasizes its role in AI, ML, IoT, cloud, big data analytics, cybersecurity and other “5IR” technologies, and its contribution to smart city and smart society initiatives through research-driven education and public and industrial outreach.',
        bn: 'বিভাগটি এআই, এমএল, আইওটি, ক্লাউড, বিগ ডেটা অ্যানালিটিক্স, সাইবার নিরাপত্তা ও অন্যান্য “৫আইআর” প্রযুক্তিতে তার ভূমিকা এবং গবেষণা-চালিত শিক্ষা ও পাবলিক ও শিল্প সম্পৃক্ততার মাধ্যমে স্মার্ট সিটি ও স্মার্ট সোসাইটি উদ্যোগে তার অবদানের উপর জোর দেয়।'
      }
    ]
  }
];

/** Contact & location — rendered as a dedicated card with a map embed. */
export const ABOUT_CONTACT = {
  title: { en: 'Contact & Location', bn: 'যোগাযোগ ও অবস্থান' },
  intro: {
    en: 'The department is located at the University of Dhaka campus in the New Science Complex area, Dhaka-1000, Bangladesh.',
    bn: 'বিভাগটি ঢাকা বিশ্ববিদ্যালয় ক্যাম্পাসের নিউ সায়েন্স কমপ্লেক্স এলাকায়, ঢাকা-১০০০, বাংলাদেশে অবস্থিত।'
  },
  addressLabel: { en: 'Address', bn: 'ঠিকানা' },
  address: {
    en: 'New Science Complex, University of Dhaka, Dhaka-1000, Bangladesh',
    bn: 'নিউ সায়েন্স কমপ্লেক্স, ঢাকা বিশ্ববিদ্যালয়, ঢাকা-১০০০, বাংলাদেশ'
  },
  emailLabel: { en: 'Email', bn: 'ইমেইল' },
  email: 'office@cse.du.ac.bd',
  phoneLabel: { en: 'Phone', bn: 'ফোন' },
  phone: '+880-2-9661900',
  mapLabel: {
    en: 'Department location map',
    bn: 'বিভাগের অবস্থানের মানচিত্র'
  },
  // OpenStreetMap embed centred on the University of Dhaka Science Complex.
  mapEmbedUrl:
    'https://www.openstreetmap.org/export/embed.html?bbox=90.3960%2C23.7275%2C90.4060%2C23.7345&layer=mapnik&marker=23.7310%2C90.4010',
  mapLinkUrl: 'https://www.openstreetmap.org/?mlat=23.7310&mlon=90.4010#map=17/23.7310/90.4010'
};

export const ABOUT_CTA = {
  title: { en: 'Explore the department', bn: 'বিভাগ ঘুরে দেখুন' },
  lead: {
    en: 'Browse the latest news, open scholarships, and upcoming events, or reach out with a question.',
    bn: 'সর্বশেষ সংবাদ, খোলা বৃত্তি ও আসন্ন ইভেন্ট দেখুন, অথবা কোনো প্রশ্ন নিয়ে যোগাযোগ করুন।'
  },
  newsroom: { en: 'Visit Newsroom', bn: 'নিউজরুম দেখুন' },
  contact: { en: 'Contact Desk', bn: 'যোগাযোগ ডেস্ক' }
};
