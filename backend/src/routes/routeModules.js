const authRoutes = require('../modules/auth/auth.routes');
const cmsRoutes = require('../modules/cms/cms.routes');
const scholarshipRoutes = require('../modules/scholarship/scholarship.routes');
const eventRoutes = require('../modules/event/event.routes');
const bookingRoutes = require('../modules/booking/booking.routes');
const contactRoutes = require('../modules/contact/contact.routes');
const notificationRoutes = require('../modules/notification/notification.routes');
const auditRoutes = require('../modules/audit/audit.routes');

module.exports = [
  { path: '/auth', router: authRoutes },
  { path: '/cms', router: cmsRoutes },
  { path: '/scholarships', router: scholarshipRoutes },
  { path: '/events', router: eventRoutes },
  { path: '/bookings', router: bookingRoutes },
  { path: '/contacts', router: contactRoutes },
  { path: '/notifications', router: notificationRoutes },
  { path: '/audits', router: auditRoutes }
];
