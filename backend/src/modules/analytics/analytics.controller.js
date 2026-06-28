const { StatusCodes } = require('http-status-codes');
const asyncHandler = require('../../utils/asyncHandler');
const AnalyticsService = require('./analytics.service');

const trackView = asyncHandler(async (req, res) => {
  const { entityType, entityId } = req.params;
  const { sessionId, referrer, metadata } = req.body;

  const event = await AnalyticsService.trackView({
    entityType,
    entityId,
    userId: req.user?._id || null,
    sessionId,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    referrer,
    metadata
  });

  res.status(StatusCodes.CREATED).json({ event });
});

const trackEvent = asyncHandler(async (req, res) => {
  const { entityType, entityId, eventType } = req.params;
  const { sessionId, referrer, metadata } = req.body;

  const event = await AnalyticsService.trackEvent({
    entityType,
    entityId,
    eventType,
    userId: req.user?._id || null,
    sessionId,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    referrer,
    metadata
  });

  res.status(StatusCodes.CREATED).json({ event });
});

const getViewCount = asyncHandler(async (req, res) => {
  const { entityType, entityId } = req.params;

  const count = await AnalyticsService.getViewCount(entityType, entityId);

  res.status(StatusCodes.OK).json({ count });
});

const getEntityAnalytics = asyncHandler(async (req, res) => {
  const { entityType, entityId } = req.params;
  const { startDate, endDate, groupBy } = req.query;

  const analytics = await AnalyticsService.getEntityAnalytics(entityType, entityId, {
    startDate,
    endDate,
    groupBy
  });

  res.status(StatusCodes.OK).json(analytics);
});

const getPopularContent = asyncHandler(async (req, res) => {
  const { entityType } = req.params;
  const { limit, startDate, endDate } = req.query;

  const popular = await AnalyticsService.getPopularContent(entityType, {
    limit: parseInt(limit) || 10,
    startDate,
    endDate
  });

  res.status(StatusCodes.OK).json({ popular });
});

const getSummary = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  const summary = await AnalyticsService.getSummary({
    startDate,
    endDate
  });

  res.status(StatusCodes.OK).json(summary);
});

module.exports = {
  trackView,
  trackEvent,
  getViewCount,
  getEntityAnalytics,
  getPopularContent,
  getSummary
};
