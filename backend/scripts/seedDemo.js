/* eslint-disable no-console */
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const baseUrl = 'http://localhost:5000/api/v1';

const postJson = async ({ pathName, body, token }) => {
  const response = await fetch(`${baseUrl}${pathName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(body)
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`${pathName} failed: ${JSON.stringify(data)}`);
  }

  return data;
};

const run = async () => {
  const timestamp = Date.now();
  const email = `demo.admin.${timestamp}@departmenthubdemo.com`;
  const password = 'Password123!';

  const registerData = await postJson({
    pathName: '/auth/register',
    body: {
      fullName: 'Demo Admin',
      email,
      password,
      department: 'CSE',
      languagePreference: 'en',
      roles: ['admin']
    }
  });

  const token = registerData.token;
  const adminId = registerData.user.id;

  const now = new Date();
  const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const nextWeekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000);
  const registrationDeadline = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

  const news = await postJson({
    pathName: '/cms/news',
    token,
    body: {
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
    }
  });

  const blog = await postJson({
    pathName: '/cms/blogs',
    token,
    body: {
      slug: `digital-campus-experience-${timestamp}`,
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
    }
  });

  const gallery = await postJson({
    pathName: '/cms/galleries',
    token,
    body: {
      slug: `campus-highlights-${timestamp}`,
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
          imageUrl: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1200&q=80',
          caption: {
            en: 'Student project exhibition',
            bn: 'Student project exhibition (BN)'
          },
          order: 1
        }
      ],
      status: 'published'
    }
  });

  const notice = await postJson({
    pathName: '/scholarships/notices',
    token,
    body: {
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
      deadline: nextMonth.toISOString(),
      status: 'open'
    }
  });

  const event = await postJson({
    pathName: '/events',
    token,
    body: {
      title: 'Career Readiness Workshop',
      description: 'A practical workshop on CV building, interview strategy, and communication readiness for graduating students.',
      location: 'Auditorium A',
      startTime: nextWeek.toISOString(),
      endTime: nextWeekEnd.toISOString(),
      registrationDeadline: registrationDeadline.toISOString(),
      capacity: 180,
      status: 'published'
    }
  });

  const venue = await postJson({
    pathName: '/bookings/venues',
    token,
    body: {
      name: `Seminar Hall Demo ${timestamp}`,
      location: 'Academic Building - Level 3',
      capacity: 120,
      amenities: ['Projector', 'Air Conditioning', 'PA System'],
      manager: adminId,
      isActive: true
    }
  });

  console.log(
    JSON.stringify(
      {
        seeded: true,
        demoAdmin: {
          email,
          password
        },
        created: {
          newsId: news.post._id,
          blogId: blog.post._id,
          galleryId: gallery.gallery._id,
          noticeId: notice.notice._id,
          eventId: event.event._id,
          venueId: venue.venue._id
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
