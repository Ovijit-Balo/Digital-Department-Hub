const AnalyticsEvent = require('./analytics.model');
const { StatusCodes } = require('http-status-codes');
const ApiError = require('../../utils/ApiError');

// Lazily resolved to avoid a require cycle (cms.controller requires this service).
const ENTITY_MODELS = {
  news: () => require('../cms/newsPost.model'),
  blog: () => require('../cms/blogPost.model'),
  gallery: () => require('../cms/gallery.model'),
  page: () => require('../cms/page.model')
};

class AnalyticsService {
  /**
   * Track a content view event
   */
  static async trackView(data) {
    const { entityType, entityId, userId, sessionId, ipAddress, userAgent, referrer, metadata } = data;

    const event = await AnalyticsEvent.create({
      entityType,
      entityId,
      eventType: 'view',
      userId,
      sessionId,
      ipAddress,
      userAgent,
      referrer,
      metadata
    });

    return event;
  }

  /**
   * Track a generic event
   */
  static async trackEvent(data) {
    const { entityType, entityId, eventType, userId, sessionId, ipAddress, userAgent, referrer, metadata } = data;

    const event = await AnalyticsEvent.create({
      entityType,
      entityId,
      eventType,
      userId,
      sessionId,
      ipAddress,
      userAgent,
      referrer,
      metadata
    });

    return event;
  }

  /**
   * Get view count for a specific entity
   */
  static async getViewCount(entityType, entityId) {
    const count = await AnalyticsEvent.countDocuments({
      entityType,
      entityId,
      eventType: 'view'
    });

    return count;
  }

  /**
   * Get view counts for multiple entities
   */
  static async getMultipleViewCounts(entityType, entityIds) {
    const results = await AnalyticsEvent.aggregate([
      {
        $match: {
          entityType,
          entityId: { $in: entityIds },
          eventType: 'view'
        }
      },
      {
        $group: {
          _id: '$entityId',
          count: { $sum: 1 }
        }
      }
    ]);

    const countMap = {};
    results.forEach((result) => {
      countMap[result._id.toString()] = result.count;
    });

    return entityIds.map((id) => ({
      entityId: id,
      count: countMap[id.toString()] || 0
    }));
  }

  /**
   * Get analytics for a specific entity
   */
  static async getEntityAnalytics(entityType, entityId, options = {}) {
    const { startDate, endDate, groupBy = 'day' } = options;

    const matchStage = {
      entityType,
      entityId,
      eventType: 'view'
    };

    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = new Date(startDate);
      if (endDate) matchStage.createdAt.$lte = new Date(endDate);
    }

    let groupFormat;
    switch (groupBy) {
      case 'hour':
        groupFormat = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' },
          hour: { $hour: '$createdAt' }
        };
        break;
      case 'week':
        groupFormat = {
          year: { $year: '$createdAt' },
          week: { $week: '$createdAt' }
        };
        break;
      case 'month':
        groupFormat = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        };
        break;
      case 'day':
      default:
        groupFormat = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        };
        break;
    }

    const results = await AnalyticsEvent.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: groupFormat,
          count: { $sum: 1 },
          uniqueUsers: { $addToSet: '$userId' }
        }
      },
      {
        $project: {
          _id: 1,
          count: 1,
          uniqueViews: { $size: { $filter: { input: '$uniqueUsers', cond: { $ne: ['$$this', null] } } } }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const totalViews = await AnalyticsEvent.countDocuments(matchStage);

    return {
      totalViews,
      timeline: results
    };
  }

  /**
   * Get popular content by view count
   */
  static async getPopularContent(entityType, options = {}) {
    const { limit = 10, startDate, endDate } = options;

    const matchStage = {
      entityType,
      eventType: 'view'
    };

    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = new Date(startDate);
      if (endDate) matchStage.createdAt.$lte = new Date(endDate);
    }

    const results = await AnalyticsEvent.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$entityId',
          viewCount: { $sum: 1 },
          uniqueViewers: { $addToSet: '$userId' }
        }
      },
      {
        $project: {
          entityId: '$_id',
          viewCount: 1,
          uniqueViewers: { $size: { $filter: { input: '$uniqueViewers', cond: { $ne: ['$$this', null] } } } }
        }
      },
      { $sort: { viewCount: -1 } },
      { $limit: limit }
    ]);

    // Enrich with the content document's title/slug/status so consumers (e.g.
    // the Teacher Dashboard insights widget) can render meaningful rows
    // instead of bare ObjectIds. Views of since-deleted content are skipped.
    const getModel = ENTITY_MODELS[entityType];
    if (!getModel || results.length === 0) {
      return results;
    }

    const docs = await getModel()
      .find({ _id: { $in: results.map((row) => row.entityId) } })
      .select('title slug status')
      .lean();
    const docMap = new Map(docs.map((doc) => [doc._id.toString(), doc]));

    return results
      .map((row) => {
        const doc = docMap.get(row.entityId.toString());
        if (!doc) {
          return null;
        }
        return {
          entityId: row.entityId,
          viewCount: row.viewCount,
          uniqueViewers: row.uniqueViewers,
          title: doc.title,
          slug: doc.slug,
          status: doc.status
        };
      })
      .filter(Boolean);
  }

  /**
   * Get analytics summary for admin dashboard
   */
  static async getSummary(options = {}) {
    const { startDate, endDate } = options;

    const matchStage = {};
    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = new Date(startDate);
      if (endDate) matchStage.createdAt.$lte = new Date(endDate);
    }

    const [totalViews, newsViews, blogViews, galleryViews, pageViews] = await Promise.all([
      AnalyticsEvent.countDocuments({ ...matchStage, eventType: 'view' }),
      AnalyticsEvent.countDocuments({ ...matchStage, entityType: 'news', eventType: 'view' }),
      AnalyticsEvent.countDocuments({ ...matchStage, entityType: 'blog', eventType: 'view' }),
      AnalyticsEvent.countDocuments({ ...matchStage, entityType: 'gallery', eventType: 'view' }),
      AnalyticsEvent.countDocuments({ ...matchStage, entityType: 'page', eventType: 'view' })
    ]);

    return {
      totalViews,
      byType: {
        news: newsViews,
        blog: blogViews,
        gallery: galleryViews,
        page: pageViews
      }
    };
  }

  /**
   * Delete old analytics data (cleanup)
   */
  static async deleteOldData(daysToKeep = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await AnalyticsEvent.deleteMany({
      createdAt: { $lt: cutoffDate }
    });

    return result.deletedCount;
  }
}

module.exports = AnalyticsService;
