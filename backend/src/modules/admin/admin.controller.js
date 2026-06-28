const { StatusCodes } = require('http-status-codes');
const asyncHandler = require('../../utils/asyncHandler');
const User = require('../auth/user.model');
const NewsPost = require('../cms/newsPost.model');
const BlogPost = require('../cms/blogPost.model');
const Gallery = require('../cms/gallery.model');
const AnalyticsService = require('../analytics/analytics.service');

const getDashboardStats = asyncHandler(async (req, res) => {
  const [
    totalUsers,
    totalNews,
    totalBlogs,
    totalGalleries,
    publishedNews,
    publishedBlogs,
    publishedGalleries
  ] = await Promise.all([
    User.countDocuments(),
    NewsPost.countDocuments(),
    BlogPost.countDocuments(),
    Gallery.countDocuments(),
    NewsPost.countDocuments({ status: 'published' }),
    BlogPost.countDocuments({ status: 'published' }),
    Gallery.countDocuments({ status: 'published' })
  ]);

  const analytics = await AnalyticsService.getSummary();

  res.status(StatusCodes.OK).json({
    users: {
      total: totalUsers
    },
    content: {
      news: { total: totalNews, published: publishedNews },
      blogs: { total: totalBlogs, published: publishedBlogs },
      galleries: { total: totalGalleries, published: publishedGalleries }
    },
    analytics
  });
});

const getRateLimitStats = asyncHandler(async (req, res) => {
  // Since express-rate-limit doesn't expose internal stats by default,
  // we'll provide a summary based on the configured limits
  const rateLimitConfig = {
    api: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      limit: 300,
      description: 'General API rate limit'
    },
    auth: {
      windowMs: 15 * 60 * 1000,
      limit: 20,
      description: 'Authentication endpoints (login, register)'
    },
    refresh: {
      windowMs: 15 * 60 * 1000,
      limit: 60,
      description: 'Token refresh endpoint'
    }
  };

  res.status(StatusCodes.OK).json({
    rateLimits: rateLimitConfig,
    note: 'Detailed rate limit statistics require Redis store configuration'
  });
});

const getSystemHealth = asyncHandler(async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0'
  };

  res.status(StatusCodes.OK).json(health);
});

module.exports = {
  getDashboardStats,
  getRateLimitStats,
  getSystemHealth
};
