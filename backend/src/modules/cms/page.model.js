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

const pageSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: /^[a-z0-9-]+$/
    },
    title: {
      type: localizedTextSchema,
      required: true
    },
    content: {
      type: localizedTextSchema,
      required: true
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

pageSchema.index({ slug: 1 }, { unique: true });
pageSchema.index({ status: 1, updatedAt: -1 });
pageSchema.index({ 'title.en': 'text', 'title.bn': 'text', 'content.en': 'text', 'content.bn': 'text' });

module.exports = mongoose.model('Page', pageSchema);
