const express = require('express');
const timelineController = require('./timeline.controller');
const authenticate = require('../../middlewares/authMiddleware');

const router = express.Router();

// Any signed-in user can read their own aggregated timeline.
router.get('/me', authenticate, timelineController.getMyTimeline);

module.exports = router;
