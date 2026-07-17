const express = require('express');
const authController = require('./auth.controller');
const authValidation = require('./auth.validation');
const validate = require('../../middlewares/validate');
const authenticate = require('../../middlewares/authMiddleware');
const authorize = require('../../middlewares/roleMiddleware');
const { authLimiter, refreshLimiter } = require('../../middlewares/rateLimiters');
const { ROLES } = require('../../config/roles');

const router = express.Router();

router.post('/register', authLimiter, validate(authValidation.register), authController.register);
router.post('/login', authLimiter, validate(authValidation.login), authController.login);
router.post('/refresh', refreshLimiter, validate(authValidation.refresh), authController.refresh);
router.post(
  '/reset-password',
  authenticate,
  validate(authValidation.resetPassword),
  authController.resetPassword
);

// Public forgot-password flow (FR-PA-047). Rate-limited to blunt abuse/enumeration.
router.post(
  '/password/forgot',
  authLimiter,
  validate(authValidation.forgotPassword),
  authController.forgotPassword
);
router.post(
  '/password/reset',
  authLimiter,
  validate(authValidation.confirmPasswordReset),
  authController.confirmPasswordReset
);
router.get('/me', authenticate, authController.me);
router.get(
  '/users',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  validate(authValidation.listUsers),
  authController.listUsers
);

router.patch(
  '/users/:userId/roles',
  authenticate,
  authorize(ROLES.ADMIN),
  validate(authValidation.updateUserRoles),
  authController.updateUserRoles
);

router.patch(
  '/users/:userId/status',
  authenticate,
  authorize(ROLES.ADMIN),
  validate(authValidation.updateUserStatus),
  authController.updateUserStatus
);

module.exports = router;
