const express = require('express');
const auditController = require('./audit.controller');
const auditValidation = require('./audit.validation');
const validate = require('../../middlewares/validate');
const authenticate = require('../../middlewares/authMiddleware');
const authorize = require('../../middlewares/roleMiddleware');
const { ROLES } = require('../../config/roles');

const router = express.Router();

router.get(
  '/',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  validate(auditValidation.listAuditLogs),
  auditController.listAuditLogs
);

module.exports = router;
