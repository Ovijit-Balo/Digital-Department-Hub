const mongoose = require('mongoose');

const analyticsEventSchema = new mongoose.Schema(
  {
    entityType: {
      type: String,
      enum: ['news', 'blog', 'gallery', 'page'],
      required: true
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    eventType: {
      type: String,
      enum: ['view', 'click', 'share', 'download'],
      default: 'view'
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    sessionId: {
      type: String,
      default: null
    },
    ipAddress: {
      type: String,
      default: null
    },
    userAgent: {
      type: String,
      default: null
    },
    referrer: {
      type: String,
      default: null
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

analyticsEventSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
analyticsEventSchema.index({ entityType: 1, eventType: 1, createdAt: -1 });
analyticsEventSchema.index({ userId: 1, createdAt: -1 });
analyticsEventSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AnalyticsEvent', analyticsEventSchema);
