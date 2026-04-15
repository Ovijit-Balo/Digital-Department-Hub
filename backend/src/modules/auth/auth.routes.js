const express = require('express');
const authController = require('./auth.controller');
const authValidation = require('./auth.validation');
const validate = require('../../middlewares/validate');
const authenticate = require('../../middlewares/authMiddleware');

const router = express.Router();

router.post('/register', validate(authValidation.register), authController.register);
router.post('/login', validate(authValidation.login), authController.login);
router.post('/reset-password', authenticate, validate(authValidation.resetPassword), authController.resetPassword);
router.get('/me', authenticate, authController.me);

module.exports = router;
