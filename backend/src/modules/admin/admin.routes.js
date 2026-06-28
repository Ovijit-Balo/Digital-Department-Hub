const express = require('express');
const adminController = require('./admin.controller');
const authenticate = require('../../middlewares/authMiddleware');
const authorize = require('../../middlewares/roleMiddleware');
const { ROLES } = require('../../config/roles');

const router = express.Router();

router.get(
  '/dashboard/stats',
  authenticate,
  authorize(ROLES.ADMIN),
  adminController.getDashboardStats
);

router.get(
  '/dashboard/rate-limits',
  authenticate,
  authorize(ROLES.ADMIN),
  adminController.getRateLimitStats
);

router.get(
  '/dashboard/health',
  authenticate,
  authorize(ROLES.ADMIN),
  adminController.getSystemHealth
);

module.exports = router;
