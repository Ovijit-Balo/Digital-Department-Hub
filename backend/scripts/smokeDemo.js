const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:5000/api/v1';

const args = process.argv.slice(2);
const getArg = (name) => {
  const index = args.indexOf(name);
  if (index === -1 || index + 1 >= args.length) {
    return null;
  }
  return args[index + 1];
};

const adminEmail = getArg('--admin-email') || process.env.DEMO_ADMIN_EMAIL;
const adminPassword = getArg('--admin-password') || process.env.DEMO_ADMIN_PASSWORD;

if (!adminEmail || !adminPassword) {
  console.error(
    'Usage: node scripts/smokeDemo.js --admin-email <email> --admin-password <password>'
  );
  process.exit(1);
}

const results = [];
const context = {
  adminToken: null,
  studentToken: null,
  noticeId: null,
  eventId: null,
  venueId: null,
  registrationId: null,
  qrToken: null,
  bookingId: null
};

const addResult = (step, ok, detail) => {
  results.push({ step, ok, detail });
};

const isConflictError = (message) =>
  typeof message === 'string' && message.toLowerCase().includes('booking conflict detected');

const safeJsonParse = async (response) => {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const callApi = async (path, options = {}) => {
  const response = await fetch(`${baseUrl}${path}`, options);
  const payload = await safeJsonParse(response);

  if (!response.ok) {
    const errorMessage =
      (payload && payload.message) ||
      (typeof payload === 'string' ? payload : `HTTP ${response.status}`);
    throw new Error(`${path} failed (${response.status}): ${errorMessage}`);
  }

  return payload;
};

const callHealth = async () => {
  const response = await fetch('http://127.0.0.1:5000/health');
  const payload = await safeJsonParse(response);

  if (!response.ok) {
    throw new Error(`/health failed (${response.status})`);
  }

  return payload;
};

const authHeaders = (token) => ({
  Authorization: `Bearer ${token}`
});

const run = async () => {
  try {
    const health = await callHealth();
    addResult('health', true, health.status || 'ok');
  } catch (error) {
    addResult('health', false, error.message);
  }

  try {
    const login = await callApi('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, password: adminPassword })
    });

    context.adminToken = login.token;
    addResult('admin_login', true, login.user.email);
  } catch (error) {
    addResult('admin_login', false, error.message);
  }

  if (context.adminToken) {
    try {
      const me = await callApi('/auth/me', {
        headers: authHeaders(context.adminToken)
      });
      addResult('admin_me', true, me.user.roles.join(','));
    } catch (error) {
      addResult('admin_me', false, error.message);
    }

    try {
      const news = await callApi('/cms/news?status=published&limit=5');
      addResult('cms_news', true, `count=${news.total}`);
    } catch (error) {
      addResult('cms_news', false, error.message);
    }

    try {
      const blogs = await callApi('/cms/blogs?status=published&limit=5');
      addResult('cms_blogs', true, `count=${blogs.total}`);
    } catch (error) {
      addResult('cms_blogs', false, error.message);
    }

    try {
      const galleries = await callApi('/cms/galleries?status=published&limit=5');
      addResult('cms_galleries', true, `count=${galleries.total}`);
    } catch (error) {
      addResult('cms_galleries', false, error.message);
    }

    try {
      const notices = await callApi('/scholarships/notices?status=open&limit=5');
      context.noticeId = notices?.items?.[0]?._id || null;
      context.noticeCategoryCode = notices?.items?.[0]?.categories?.[0]?.code || '';
      addResult(
        'scholarship_notices',
        notices.total > 0 && Boolean(context.noticeId),
        `count=${notices.total}; first=${context.noticeId || 'none'}`
      );
    } catch (error) {
      addResult('scholarship_notices', false, error.message);
    }

    try {
      const events = await callApi('/events?status=published&limit=5');
      context.eventId = events?.items?.[0]?._id || null;
      addResult(
        'events_list',
        events.total > 0 && Boolean(context.eventId),
        `count=${events.total}; first=${context.eventId || 'none'}`
      );
    } catch (error) {
      addResult('events_list', false, error.message);
    }

    try {
      const venues = await callApi('/bookings/venues?limit=5');
      context.venueId = venues?.items?.[0]?._id || null;
      addResult(
        'venues_list',
        venues.total > 0 && Boolean(context.venueId),
        `count=${venues.total}; first=${context.venueId || 'none'}`
      );
    } catch (error) {
      addResult('venues_list', false, error.message);
    }
  }

  try {
    const stamp = Date.now();
    const studentEmail = `demo.student.${stamp}@departmenthubdemo.com`;

    const register = await callApi('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Demo Student',
        email: studentEmail,
        password: 'Password123!',
        department: 'CSE',
        languagePreference: 'en',
        roles: ['student']
      })
    });

    context.studentToken = register.token;
    addResult('student_register', true, register.user.email);
  } catch (error) {
    addResult('student_register', false, error.message);
  }

  if (context.studentToken && context.noticeId) {
    try {
      const application = await callApi(`/scholarships/notices/${context.noticeId}/applications`, {
        method: 'POST',
        headers: {
          ...authHeaders(context.studentToken),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          statement:
            'I am applying for this scholarship because of strong academic performance and active participation in department activities.',
          gpa: 3.8,
          department: 'CSE',
          selectedCategoryCode: context.noticeCategoryCode || undefined,
          documents: [{ name: 'Transcript', url: 'https://example.com/transcript.pdf' }]
        })
      });

      addResult('scholarship_apply', true, application.application._id);
    } catch (error) {
      addResult('scholarship_apply', false, error.message);
    }
  }

  if (context.studentToken && context.eventId) {
    try {
      const registration = await callApi(`/events/${context.eventId}/registrations`, {
        method: 'POST',
        headers: authHeaders(context.studentToken)
      });

      context.registrationId = registration.registration._id;
      context.qrToken = registration.registration.qrToken;
      addResult('event_register', true, context.registrationId);
    } catch (error) {
      addResult('event_register', false, error.message);
    }
  }

  if (context.adminToken && context.eventId && context.qrToken) {
    try {
      const checkIn = await callApi('/events/check-in', {
        method: 'POST',
        headers: {
          ...authHeaders(context.adminToken),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ eventId: context.eventId, qrToken: context.qrToken })
      });

      addResult('event_checkin', true, checkIn.registration.status);
    } catch (error) {
      addResult('event_checkin', false, error.message);
    }
  }

  if (context.studentToken && context.registrationId) {
    try {
      const feedback = await callApi(`/events/registrations/${context.registrationId}/feedback`, {
        method: 'PATCH',
        headers: {
          ...authHeaders(context.studentToken),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ rating: 5, comment: 'Very useful event for students.' })
      });

      addResult('event_feedback', true, `rating=${feedback.registration.feedback.rating}`);
    } catch (error) {
      addResult('event_feedback', false, error.message);
    }
  }

  let bookingWindow = null;

  if (context.studentToken && context.venueId) {
    try {
      const candidateWindows = [];
      for (let i = 2; i < 12; i += 1) {
        const startTime = new Date(Date.now() + i * 24 * 60 * 60 * 1000);
        startTime.setUTCHours(10, 0, 0, 0);
        const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000);
        candidateWindows.push({
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString()
        });
      }

      if (context.adminToken) {
        for (const candidate of candidateWindows) {
          const probe = await callApi(
            `/bookings/conflicts?venueId=${context.venueId}&startTime=${encodeURIComponent(
              candidate.startTime
            )}&endTime=${encodeURIComponent(candidate.endTime)}`,
            {
              headers: authHeaders(context.adminToken)
            }
          );

          if (!probe.hasConflict) {
            bookingWindow = candidate;
            break;
          }
        }
      }

      if (!bookingWindow) {
        bookingWindow = candidateWindows[0];
      }

      const booking = await callApi('/bookings/requests', {
        method: 'POST',
        headers: {
          ...authHeaders(context.studentToken),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          venue: context.venueId,
          title: 'Demo Seminar Session',
          purpose: 'This booking is for a demonstration seminar session with faculty and students.',
          startTime: bookingWindow.startTime,
          endTime: bookingWindow.endTime,
          attendeeCount: 40
        })
      });

      context.bookingId = booking.booking._id;
      addResult(
        'booking_request',
        true,
        `${context.bookingId}; window=${bookingWindow.startTime}..${bookingWindow.endTime}`
      );
    } catch (error) {
      if (isConflictError(error.message)) {
        addResult('booking_request', false, `${error.message}; try rerun smoke script for next free slot`);
      } else {
        addResult('booking_request', false, error.message);
      }
    }
  }

  if (context.adminToken && context.venueId && bookingWindow) {
    try {
      const conflict = await callApi(
        `/bookings/conflicts?venueId=${context.venueId}&startTime=${encodeURIComponent(
          bookingWindow.startTime
        )}&endTime=${encodeURIComponent(bookingWindow.endTime)}`,
        {
          headers: authHeaders(context.adminToken)
        }
      );

      addResult('booking_conflict_check', conflict.hasConflict === true, `hasConflict=${conflict.hasConflict}`);
    } catch (error) {
      addResult('booking_conflict_check', false, error.message);
    }
  }

  if (context.adminToken && context.bookingId) {
    try {
      const decision = await callApi(`/bookings/requests/${context.bookingId}/decision`, {
        method: 'PATCH',
        headers: {
          ...authHeaders(context.adminToken),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'approved', decisionNote: 'Approved for demo run.' })
      });

      addResult('booking_approve', decision.booking.status === 'approved', decision.booking.status);
    } catch (error) {
      addResult('booking_approve', false, error.message);
    }
  }

  try {
    const frontend = await fetch('http://127.0.0.1:5173');
    addResult('frontend_reachable', frontend.ok, `status=${frontend.status}`);
  } catch (error) {
    addResult('frontend_reachable', false, error.message);
  }

  const failed = results.filter((item) => !item.ok).length;
  const summary = {
    ok: failed === 0,
    failed,
    results
  };

  console.log(JSON.stringify(summary, null, 2));

  if (failed > 0) {
    process.exitCode = 1;
  }
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
