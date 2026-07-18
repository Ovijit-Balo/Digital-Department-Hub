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

// Public: inspect an invitation token (state only, nothing consumed) so the
// accept page can show the right UI on load.
router.get(
  '/invitations/lookup',
  authLimiter,
  validate(authValidation.getInvitation),
  authController.getInvitation
);

// Public: redeem an admin-issued invitation to create an elevated account.
router.post(
  '/invitations/accept',
  authLimiter,
  validate(authValidation.acceptInvitation),
  authController.acceptInvitation
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

// Admin-only invitation management (issue / list / revoke elevated accounts).
router.post(
  '/invitations',
  authenticate,
  authorize(ROLES.ADMIN),
  authLimiter,
  validate(authValidation.createInvitation),
  authController.createInvitation
);

router.get(
  '/invitations',
  authenticate,
  authorize(ROLES.ADMIN),
  validate(authValidation.listInvitations),
  authController.listInvitations
);

router.delete(
  '/invitations/:invitationId',
  authenticate,
  authorize(ROLES.ADMIN),
  validate(authValidation.revokeInvitation),
  authController.revokeInvitation
);

module.exports = router;
