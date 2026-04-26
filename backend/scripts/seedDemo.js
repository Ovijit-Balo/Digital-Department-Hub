const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../src/modules/auth/user.model');
const { ROLES } = require('../src/config/roles');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const baseUrl = 'http://localhost:5000/api/v1';
const dummyPassword = 'ABCDef123';

const dummyUsers = [
  {
    accountType: 'admin',
    role: 'admin',
    fullName: 'Demo Admin',
    email: 'admin@example.com',
    department: 'Administration'
  },
  {
    accountType: 'teacher',
    role: 'editor',
    fullName: 'Demo Teacher',
    email: 'teacher@example.com',
    department: 'CSE'
  },
  {
    accountType: 'staff',
    role: 'manager',
    fullName: 'Demo Staff',
    email: 'staff@example.com',
    department: 'Operations'
  },
  {
    accountType: 'reviewer',
    role: 'reviewer',
    fullName: 'Demo Reviewer',
    email: 'reviewer@example.com',
    department: 'Scholarship'
  },
  {
    accountType: 'student',
    role: 'student',
    fullName: 'Demo Student',
    email: 'student@example.com',
    department: 'CSE'
  }
];

const args = process.argv.slice(2);
const getArg = (name) => {
  const index = args.indexOf(name);
  if (index === -1 || index + 1 >= args.length) {
    return null;
  }
  return args[index + 1];
};

const adminEmail =
  getArg('--admin-email') || process.env.DEMO_ADMIN_EMAIL || 'admin@example.com';
const adminPassword =
  getArg('--admin-password') || process.env.DEMO_ADMIN_PASSWORD || dummyPassword;

const requestJson = async ({ pathName, method = 'GET', body, token, query }) => {
  const url = new URL(`${baseUrl}${pathName}`);

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });
  }

  const response = await fetch(url, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });

  const text = await response.text();
  let data = {};

  if (text) {
    try {
      data = JSON.parse(text);
    } catch (error) {
      data = { message: text };
    }
  }

  if (!response.ok) {
    const detailsText = Array.isArray(data?.details)
      ? data.details
          .map((detail) => detail?.message)
          .filter(Boolean)
          .join('; ')
      : '';
    const message = [
      data?.message || `${response.status} ${response.statusText}`,
      detailsText
    ]
      .filter(Boolean)
      .join(' | ');
    const requestError = new Error(`${pathName} failed: ${message}`);
    requestError.status = response.status;
    requestError.data = data;
    throw requestError;
  }

  return data;
};

const postJson = (payload) => requestJson({ ...payload, method: 'POST' });
const patchJson = (payload) => requestJson({ ...payload, method: 'PATCH' });
const getJson = (payload) => requestJson({ ...payload, method: 'GET' });

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
const getEntityId = (item) => item?._id || item?.id || null;
const getUserId = (user) => user?.id || user?._id || null;
const isObjectId = (value) => typeof value === 'string' && /^[a-f0-9]{24}$/i.test(value);

const bootstrapAdminInDb = async ({ email, password }) => {
  const normalizedEmail = normalizeEmail(email);
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/digital_department_hub';

  let openedConnection = false;

  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
      openedConnection = true;
    }

    const existing = await User.findOne({ email: normalizedEmail }).select('+passwordHash');
    const passwordHash = await bcrypt.hash(password, 12);

    if (!existing) {
      const createdUser = await User.create({
        fullName: 'Demo Admin',
        email: normalizedEmail,
        passwordHash,
        roles: [ROLES.ADMIN],
        department: 'Administration',
        languagePreference: 'en',
        isActive: true
      });

      return {
        created: true,
        id: createdUser._id.toString(),
        email: createdUser.email
      };
    }

    existing.passwordHash = passwordHash;
    existing.roles = Array.from(new Set([...(existing.roles || []), ROLES.ADMIN]));
    existing.isActive = true;

    if (!existing.fullName || existing.fullName.trim().length < 2) {
      existing.fullName = 'Demo Admin';
    }

    if (!existing.department) {
      existing.department = 'Administration';
    }

    if (!existing.languagePreference) {
      existing.languagePreference = 'en';
    }

    await existing.save();

    return {
      created: false,
      id: existing._id.toString(),
      email: existing.email
    };
  } finally {
    if (openedConnection) {
      await mongoose.disconnect();
    }
  }
};

const tryLogin = async ({ email, password }) => {
  try {
    return await postJson({
      pathName: '/auth/login',
      body: { email, password }
    });
  } catch (error) {
    if (error.status === 401) {
      return null;
    }

    throw error;
  }
};

const getUserByEmail = async ({ email, token }) => {
  const usersData = await getJson({
    pathName: '/auth/users',
    token,
    query: {
      search: email,
      limit: 100
    }
  });

  return (usersData.items || []).find(
    (item) => item.email.toLowerCase() === email.toLowerCase()
  );
};

const ensureDummyUser = async ({ profile, token }) => {
  let created = false;
  let loginData = await tryLogin({ email: profile.email, password: dummyPassword });

  if (!loginData) {
    try {
      await postJson({
        pathName: '/auth/register',
        body: {
          fullName: profile.fullName,
          email: profile.email,
          password: dummyPassword,
          department: profile.department,
          languagePreference: 'en'
        }
      });
      created = true;
      loginData = await tryLogin({ email: profile.email, password: dummyPassword });
    } catch (error) {
      if (error.status !== 409) {
        throw error;
      }

      throw new Error(
        `User ${profile.email} already exists with a different password. ` +
          `Please reset/delete that user and rerun the seed script to enforce password ${dummyPassword}.`
      );
    }
  }

  if (!loginData?.user?.id) {
    throw new Error(`Unable to authenticate seeded user ${profile.email}`);
  }

  const userFromAdminLookup = await getUserByEmail({ email: profile.email, token });
  const userId = getUserId(userFromAdminLookup) || getUserId(loginData.user);

  if (!isObjectId(userId)) {
    throw new Error(`Unable to resolve a valid user ID for ${profile.email}`);
  }

  await patchJson({
    pathName: `/auth/users/${userId}/roles`,
    token,
    body: { roles: [profile.role] }
  });

  const updated = await getUserByEmail({ email: profile.email, token });

  return {
    accountType: profile.accountType,
    role: profile.role,
    email: profile.email,
    password: dummyPassword,
    created,
    roles: updated?.roles || [profile.role],
    id: userId
  };
};

const ensureNewsPost = async ({ token, payload }) => {
  let list;

  try {
    list = await getJson({
      pathName: '/cms/manage/news',
      token,
      query: {
        search: payload.title.en,
        limit: 100,
        page: 1
      }
    });
  } catch (error) {
    if (error.status !== 404) {
      throw error;
    }

    list = await getJson({
      pathName: '/cms/news',
      query: {
        search: payload.title.en,
        limit: 100,
        page: 1
      }
    });
  }

  const existing = (list.items || []).find((item) => item?.title?.en === payload.title.en);

  if (!existing) {
    const created = await postJson({
      pathName: '/cms/news',
      token,
      body: payload
    });

    return {
      post: created.post,
      created: true
    };
  }

  const existingId = getEntityId(existing);
  const updated = await patchJson({
    pathName: `/cms/news/${existingId}`,
    token,
    body: payload
  });

  return {
    post: updated.post,
    created: false
  };
};

const ensureBlogPost = async ({ token, payload }) => {
  let list;

  try {
    list = await getJson({
      pathName: '/cms/manage/blogs',
      token,
      query: {
        search: payload.slug,
        limit: 100,
        page: 1
      }
    });
  } catch (error) {
    if (error.status !== 404) {
      throw error;
    }

    list = await getJson({
      pathName: '/cms/blogs',
      query: {
        search: payload.slug,
        limit: 100,
        page: 1
      }
    });
  }

  const existing = (list.items || []).find((item) => item?.slug === payload.slug);

  if (!existing) {
    const created = await postJson({
      pathName: '/cms/blogs',
      token,
      body: payload
    });

    return {
      post: created.post,
      created: true
    };
  }

  const existingId = getEntityId(existing);
  const updated = await patchJson({
    pathName: `/cms/blogs/${existingId}`,
    token,
    body: payload
  });

  return {
    post: updated.post,
    created: false
  };
};

const ensureGallery = async ({ token, payload }) => {
  let list;

  try {
    list = await getJson({
      pathName: '/cms/manage/galleries',
      token,
      query: {
        search: payload.slug,
        limit: 100,
        page: 1
      }
    });
  } catch (error) {
    if (error.status !== 404) {
      throw error;
    }

    list = await getJson({
      pathName: '/cms/galleries',
      query: {
        search: payload.slug,
        limit: 100,
        page: 1
      }
    });
  }

  const existing = (list.items || []).find((item) => item?.slug === payload.slug);

  if (!existing) {
    const created = await postJson({
      pathName: '/cms/galleries',
      token,
      body: payload
    });

    return {
      gallery: created.gallery,
      created: true
    };
  }

  const existingId = getEntityId(existing);
  const updated = await patchJson({
    pathName: `/cms/galleries/${existingId}`,
    token,
    body: payload
  });

  return {
    gallery: updated.gallery,
    created: false
  };
};

const ensureScholarshipNotice = async ({ token, payload }) => {
  let list;

  try {
    list = await getJson({
      pathName: '/scholarships/manage/notices',
      token,
      query: {
        limit: 100,
        page: 1
      }
    });
  } catch (error) {
    if (error.status !== 404) {
      throw error;
    }

    list = await getJson({
      pathName: '/scholarships/notices',
      query: {
        limit: 100,
        page: 1
      }
    });
  }

  const existing = (list.items || []).find((item) => item?.title?.en === payload.title.en);

  if (!existing) {
    const created = await postJson({
      pathName: '/scholarships/notices',
      token,
      body: payload
    });

    return {
      notice: created.notice,
      created: true
    };
  }

  const existingId = getEntityId(existing);
  const patched = await patchJson({
    pathName: `/scholarships/notices/${existingId}`,
    token,
    body: {
      status: payload.status,
      applicationWindowStart: payload.applicationWindowStart,
      applicationWindowEnd: payload.applicationWindowEnd,
      deadline: payload.deadline
    }
  });

  return {
    notice: patched.notice,
    created: false
  };
};

const ensureEvent = async ({ token, payload }) => {
  let list;

  try {
    list = await getJson({
      pathName: '/events/manage',
      token,
      query: {
        limit: 100,
        page: 1
      }
    });
  } catch (error) {
    if (error.status !== 404) {
      throw error;
    }

    list = await getJson({
      pathName: '/events',
      query: {
        limit: 100,
        page: 1
      }
    });
  }

  const existing = (list.items || []).find(
    (item) => item?.title === payload.title && item?.location === payload.location
  );

  if (existing) {
    return {
      event: existing,
      created: false
    };
  }

  const created = await postJson({
    pathName: '/events',
    token,
    body: payload
  });

  return {
    event: created.event,
    created: true
  };
};

const ensureVenue = async ({ token, payload }) => {
  const list = await getJson({
    pathName: '/bookings/venues',
    query: {
      isActive: true,
      limit: 100,
      page: 1
    }
  });

  const existing = (list.items || []).find((item) => item?.name === payload.name);

  if (existing) {
    return {
      venue: existing,
      created: false
    };
  }

  const created = await postJson({
    pathName: '/bookings/venues',
    token,
    body: payload
  });

  return {
    venue: created.venue,
    created: true
  };
};

const run = async () => {
  let loginData = await tryLogin({
    email: adminEmail,
    password: adminPassword
  });

  if (!loginData) {
    await bootstrapAdminInDb({
      email: adminEmail,
      password: adminPassword
    });

    loginData = await tryLogin({
      email: adminEmail,
      password: adminPassword
    });
  }

  if (!loginData) {
    throw new Error(
      `Unable to authenticate bootstrap admin ${adminEmail}. ` +
        'Ensure API and MongoDB are running, then rerun the script.'
    );
  }

  if (!loginData.user?.roles?.includes('admin')) {
    throw new Error('Provided credentials do not belong to an admin user');
  }

  const token = loginData.token;
  const profileData = await getJson({
    pathName: '/auth/me',
    token
  });
  const bootstrapAdminId = getUserId(profileData.user) || getUserId(loginData.user);

  if (!isObjectId(bootstrapAdminId)) {
    throw new Error('Unable to resolve a valid bootstrap admin user ID');
  }

  const seededUsers = [];

  for (const profile of dummyUsers) {
    const seededUser = await ensureDummyUser({ profile, token });
    seededUsers.push(seededUser);
  }

  const managerUser = seededUsers.find((item) => item.role === 'manager');
  const venueManagerId = isObjectId(managerUser?.id) ? managerUser.id : bootstrapAdminId;

  const now = new Date();
  const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const nextThreeWeeks = new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000);
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const nextWeekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000);
  const registrationDeadline = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

  const newsPayload = {
    title: {
      en: 'Department Innovation Showcase',
      bn: 'Department Innovation Showcase (BN)'
    },
    summary: {
      en: 'Students are invited to submit project demos for next week.',
      bn: 'Students are invited to submit project demos for next week (BN).'
    },
    body: {
      en: 'The department will host a public innovation showcase featuring student teams and faculty mentors.',
      bn: 'The department will host a public innovation showcase featuring student teams and faculty mentors (BN).'
    },
    status: 'published',
    tags: ['innovation', 'showcase']
  };

  const blogPayload = {
    slug: 'digital-campus-experience-demo',
    title: {
      en: 'Building a Digital Campus Experience',
      bn: 'Building a Digital Campus Experience (BN)'
    },
    excerpt: {
      en: 'How our department is modernizing student services.',
      bn: 'How our department is modernizing student services (BN).'
    },
    body: {
      en: 'We are integrating CMS, scholarships, and events into a single department hub for transparency.',
      bn: 'We are integrating CMS, scholarships, and events into a single department hub for transparency (BN).'
    },
    status: 'published'
  };

  const galleryPayload = {
    slug: 'campus-highlights-demo',
    title: {
      en: 'Campus Highlights',
      bn: 'Campus Highlights (BN)'
    },
    description: {
      en: 'A curated visual record of department events.',
      bn: 'A curated visual record of department events (BN).'
    },
    items: [
      {
        mediaType: 'image',
        mediaUrl:
          'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1200&q=80',
        caption: {
          en: 'Student project exhibition',
          bn: 'Student project exhibition (BN)'
        },
        order: 1
      }
    ],
    status: 'published'
  };

  const noticePayload = {
    title: {
      en: 'Merit Scholarship 2026',
      bn: 'Merit Scholarship 2026 (BN)'
    },
    description: {
      en: 'Support package for high-performing undergraduate students.',
      bn: 'Support package for high-performing undergraduate students (BN).'
    },
    eligibility: {
      en: 'Minimum CGPA 3.50 and active departmental participation.',
      bn: 'Minimum CGPA 3.50 and active departmental participation (BN).'
    },
    scholarshipType: 'one_off',
    applicationWindowStart: now.toISOString(),
    applicationWindowEnd: nextThreeWeeks.toISOString(),
    deadline: nextMonth.toISOString(),
    categories: [
      {
        code: 'merit',
        name: {
          en: 'Merit Grant',
          bn: 'Merit Grant (BN)'
        },
        amount: 15000,
        slots: 25
      },
      {
        code: 'need_support',
        name: {
          en: 'Need-Based Support',
          bn: 'Need-Based Support (BN)'
        },
        amount: 10000,
        slots: 35
      }
    ],
    status: 'open'
  };

  const eventPayload = {
    title: 'Career Readiness Workshop',
    description:
      'A practical workshop on CV building, interview strategy, and communication readiness for graduating students.',
    location: 'Auditorium A',
    startTime: nextWeek.toISOString(),
    endTime: nextWeekEnd.toISOString(),
    registrationDeadline: registrationDeadline.toISOString(),
    capacity: 180,
    status: 'published'
  };

  const venuePayload = {
    name: 'Seminar Hall Demo',
    location: 'Academic Building - Level 3',
    capacity: 120,
    amenities: ['Projector', 'Air Conditioning', 'PA System'],
    manager: venueManagerId,
    isActive: true
  };

  const news = await ensureNewsPost({ token, payload: newsPayload });
  const blog = await ensureBlogPost({ token, payload: blogPayload });
  const gallery = await ensureGallery({ token, payload: galleryPayload });
  const notice = await ensureScholarshipNotice({ token, payload: noticePayload });
  const event = await ensureEvent({ token, payload: eventPayload });
  const venue = await ensureVenue({ token, payload: venuePayload });

  console.log(
    JSON.stringify(
      {
        seeded: true,
        bootstrapAdmin: {
          email: loginData.user.email,
          roles: loginData.user.roles
        },
        dummyPassword,
        dummyUsers: seededUsers.map((item) => ({
          accountType: item.accountType,
          role: item.role,
          email: item.email,
          password: item.password,
          created: item.created,
          roles: item.roles
        })),
        created: {
          news: {
            id: getEntityId(news.post),
            created: news.created
          },
          blog: {
            id: getEntityId(blog.post),
            created: blog.created
          },
          gallery: {
            id: getEntityId(gallery.gallery),
            created: gallery.created
          },
          notice: {
            id: getEntityId(notice.notice),
            created: notice.created
          },
          event: {
            id: getEntityId(event.event),
            created: event.created
          },
          venue: {
            id: getEntityId(venue.venue),
            created: venue.created
          }
        }
      },
      null,
      2
    )
  );
};

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
