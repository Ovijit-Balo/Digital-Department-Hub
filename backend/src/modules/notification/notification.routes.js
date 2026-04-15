const express = require('express');
const notificationController = require('./notification.controller');
const notificationValidation = require('./notification.validation');
const validate = require('../../middlewares/validate');
const authenticate = require('../../middlewares/authMiddleware');
const authorize = require('../../middlewares/roleMiddleware');
const { ROLES } = require('../../config/roles');

const router = express.Router();

router.post(
  '/dispatch',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  validate(notificationValidation.dispatchNotification),
  notificationController.dispatch
);

router.get('/', authenticate, validate(notificationValidation.listNotifications), notificationController.list);

router.patch(
  '/:notificationId/read',
  authenticate,
  validate(notificationValidation.markRead),
  notificationController.markRead
);

module.exports = router;
