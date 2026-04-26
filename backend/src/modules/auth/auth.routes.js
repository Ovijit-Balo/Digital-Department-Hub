const express = require('express');
const authController = require('./auth.controller');
const authValidation = require('./auth.validation');
const validate = require('../../middlewares/validate');
const authenticate = require('../../middlewares/authMiddleware');
const authorize = require('../../middlewares/roleMiddleware');
const { ROLES } = require('../../config/roles');

const router = express.Router();

router.post('/register', validate(authValidation.register), authController.register);
router.post('/login', validate(authValidation.login), authController.login);
router.post('/reset-password', authenticate, validate(authValidation.resetPassword), authController.resetPassword);
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

module.exports = router;
