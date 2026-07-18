const express = require('express');
const workqueueController = require('./workqueue.controller');
const authenticate = require('../../middlewares/authMiddleware');
const authorize = require('../../middlewares/roleMiddleware');
const { ROLES } = require('../../config/roles');

const router = express.Router();

// The staff desk is the manager role; admins can see it too.
router.get(
  '/staff',
  authenticate,
  authorize(ROLES.MANAGER, ROLES.ADMIN),
  workqueueController.getStaffWorkQueue
);

module.exports = router;
