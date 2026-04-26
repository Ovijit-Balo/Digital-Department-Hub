const mongoose = require('mongoose');

const localizedTextSchema = new mongoose.Schema(
  {
    en: { type: String, default: '', trim: true },
    bn: { type: String, default: '', trim: true }
  },
  { _id: false }
);

const translationWorkflowSchema = new mongoose.Schema(
  {
    sourceLanguage: {
      type: String,
      enum: ['en', 'bn'],
      default: 'en'
    },
    enStatus: {
      type: String,
      enum: ['source', 'pending', 'translated', 'reviewed'],
      default: 'source'
    },
    bnStatus: {
      type: String,
      enum: ['source', 'pending', 'translated', 'reviewed'],
      default: 'pending'
    },
    lastUpdatedAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const newsPostSchema = new mongoose.Schema(
  {
    title: {
      type: localizedTextSchema,
      required: true
    },
    summary: {
      type: localizedTextSchema,
      required: true
    },
    body: {
      type: localizedTextSchema,
      required: true
    },
    category: {
      type: String,
      enum: ['news', 'announcement'],
      default: 'news'
    },
    coverImageUrl: {
      type: String,
      trim: true
    },
    translationWorkflow: {
      type: translationWorkflowSchema,
      default: () => ({})
    },
    status: {
      type: String,
      enum: ['draft', 'published'],
      default: 'draft'
    },
    tags: {
      type: [String],
      default: []
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    publishedAt: Date
  },
  {
    timestamps: true,
    versionKey: false
  }
);

newsPostSchema.index({ status: 1, publishedAt: -1 });
newsPostSchema.index({ category: 1, status: 1, publishedAt: -1 });
newsPostSchema.index({ tags: 1 });
newsPostSchema.index({ 'title.en': 'text', 'title.bn': 'text', 'body.en': 'text', 'body.bn': 'text' });

module.exports = mongoose.model('NewsPost', newsPostSchema);
