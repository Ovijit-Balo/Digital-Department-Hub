const express = require('express');
const contactController = require('./contact.controller');
const contactValidation = require('./contact.validation');
const validate = require('../../middlewares/validate');
const authenticate = require('../../middlewares/authMiddleware');
const authorize = require('../../middlewares/roleMiddleware');
const { ROLES } = require('../../config/roles');

const router = express.Router();

const canManageInquiries = [ROLES.ADMIN, ROLES.MANAGER, ROLES.EDITOR];

router.post('/inquiries', validate(contactValidation.submitInquiry), contactController.submitInquiry);

router.get(
  '/inquiries',
  authenticate,
  authorize(...canManageInquiries),
  validate(contactValidation.listInquiries),
  contactController.listInquiries
);

router.patch(
  '/inquiries/:inquiryId/status',
  authenticate,
  authorize(...canManageInquiries),
  validate(contactValidation.updateStatus),
  contactController.updateInquiryStatus
);

module.exports = router;
