const express = require('express');
const bookingController = require('./booking.controller');
const bookingValidation = require('./booking.validation');
const validate = require('../../middlewares/validate');
const authenticate = require('../../middlewares/authMiddleware');
const authorize = require('../../middlewares/roleMiddleware');
const { ROLES } = require('../../config/roles');

const router = express.Router();

router.get('/venues', validate(bookingValidation.listVenues), bookingController.listVenues);
router.get('/calendar', validate(bookingValidation.listCalendar), bookingController.listCalendar);
router.post(
  '/venues',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  validate(bookingValidation.createVenue),
  bookingController.createVenue
);

router.post(
  '/requests',
  authenticate,
  authorize(ROLES.STUDENT, ROLES.ADMIN, ROLES.EDITOR, ROLES.MANAGER),
  validate(bookingValidation.requestBooking),
  bookingController.requestBooking
);

router.get(
  '/requests',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  validate(bookingValidation.listBookings),
  bookingController.listBookings
);

router.get(
  '/my-requests',
  authenticate,
  validate(bookingValidation.listMyBookings),
  bookingController.listMyBookings
);

router.patch(
  '/requests/:bookingId/decision',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  validate(bookingValidation.decision),
  bookingController.decision
);

router.get(
  '/conflicts',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.EDITOR),
  validate(bookingValidation.checkConflicts),
  bookingController.checkConflicts
);

module.exports = router;
