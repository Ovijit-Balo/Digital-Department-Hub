const express = require('express');
const analyticsController = require('./analytics.controller');
const authenticate = require('../../middlewares/authMiddleware');
const authorize = require('../../middlewares/roleMiddleware');
const { ROLES } = require('../../config/roles');

const router = express.Router();

// Public tracking endpoints (no auth required for basic tracking)
router.post('/track/:entityType/:entityId/view', analyticsController.trackView);
router.post('/track/:entityType/:entityId/:eventType', analyticsController.trackEvent);

// Get view count (public)
router.get('/views/:entityType/:entityId', analyticsController.getViewCount);

// Content-view summary is editorial data, so editors may read it too.
router.get(
  '/summary',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.EDITOR),
  analyticsController.getSummary
);

router.get(
  '/:entityType/:entityId/analytics',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.EDITOR),
  analyticsController.getEntityAnalytics
);

router.get(
  '/popular/:entityType',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.EDITOR),
  analyticsController.getPopularContent
);

module.exports = router;
