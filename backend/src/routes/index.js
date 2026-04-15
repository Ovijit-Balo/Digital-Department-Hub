const express = require('express');
const authRoutes = require('../modules/auth/auth.routes');
const cmsRoutes = require('../modules/cms/cms.routes');
const scholarshipRoutes = require('../modules/scholarship/scholarship.routes');
const eventRoutes = require('../modules/event/event.routes');
const bookingRoutes = require('../modules/booking/booking.routes');
const notificationRoutes = require('../modules/notification/notification.routes');
const auditRoutes = require('../modules/audit/audit.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/cms', cmsRoutes);
router.use('/scholarships', scholarshipRoutes);
router.use('/events', eventRoutes);
router.use('/bookings', bookingRoutes);
router.use('/notifications', notificationRoutes);
router.use('/audits', auditRoutes);

module.exports = router;
