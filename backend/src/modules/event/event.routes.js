const express = require('express');
const eventController = require('./event.controller');
const eventValidation = require('./event.validation');
const validate = require('../../middlewares/validate');
const authenticate = require('../../middlewares/authMiddleware');
const authorize = require('../../middlewares/roleMiddleware');
const { ROLES } = require('../../config/roles');

const router = express.Router();

router.get('/', validate(eventValidation.listPublicEvents), eventController.listEvents);
router.get('/calendar', validate(eventValidation.listPublicCalendar), eventController.listCalendar);

router.get(
  '/manage',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.EDITOR),
  validate(eventValidation.listManageEvents),
  eventController.listManageEvents
);

router.get(
  '/manage/calendar',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.EDITOR),
  validate(eventValidation.listManageCalendar),
  eventController.listManageCalendar
);

router.post(
  '/',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.EDITOR),
  validate(eventValidation.createEvent),
  eventController.createEvent
);

router.patch(
  '/:eventId',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.EDITOR),
  validate(eventValidation.updateEvent),
  eventController.updateEvent
);

router.delete(
  '/:eventId',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.EDITOR),
  validate(eventValidation.deleteEvent),
  eventController.deleteEvent
);

// A user's own registrations (QR passes) across events. Must be declared
// before the parameterised routes below.
router.get(
  '/my-registrations',
  authenticate,
  validate(eventValidation.listMyRegistrations),
  eventController.listMyRegistrations
);

router.patch(
  '/registrations/:registrationId/cancel',
  authenticate,
  validate(eventValidation.cancelRegistration),
  eventController.cancelRegistration
);

router.post(
  '/:eventId/registrations',
  authenticate,
  authorize(ROLES.STUDENT, ROLES.ADMIN, ROLES.EDITOR, ROLES.MANAGER, ROLES.REVIEWER),
  validate(eventValidation.registerForEvent),
  eventController.registerForEvent
);

router.post(
  '/check-in',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  validate(eventValidation.checkIn),
  eventController.checkIn
);

router.patch(
  '/registrations/:registrationId/feedback',
  authenticate,
  validate(eventValidation.submitFeedback),
  eventController.submitFeedback
);

router.get(
  '/:eventId/registrations',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.EDITOR),
  validate(eventValidation.listRegistrations),
  eventController.listRegistrations
);

module.exports = router;
