const express = require('express');
const eventController = require('./event.controller');
const eventValidation = require('./event.validation');
const validate = require('../../middlewares/validate');
const authenticate = require('../../middlewares/authMiddleware');
const authorize = require('../../middlewares/roleMiddleware');
const { ROLES } = require('../../config/roles');

const router = express.Router();

router.get('/', validate(eventValidation.listEvents), eventController.listEvents);

router.post(
  '/',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.EDITOR),
  validate(eventValidation.createEvent),
  eventController.createEvent
);

router.post(
  '/:eventId/registrations',
  authenticate,
  authorize(ROLES.STUDENT, ROLES.ADMIN, ROLES.EDITOR, ROLES.MANAGER),
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
