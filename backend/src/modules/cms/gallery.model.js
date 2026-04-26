const mongoose = require('mongoose');

const localizedTextSchema = new mongoose.Schema(
  {
    en: { type: String, default: '', trim: true },
    bn: { type: String, default: '', trim: true }
  },
  { _id: false }
);

const localizedTextOptionalSchema = new mongoose.Schema(
  {
    en: { type: String, default: '', trim: true },
    bn: { type: String, default: '', trim: true }
  },
  { _id: false }
);

const galleryItemSchema = new mongoose.Schema(
  {
    mediaType: {
      type: String,
      enum: ['image', 'video'],
      default: 'image'
    },
    mediaUrl: {
      type: String,
      required: true,
      trim: true
    },
    thumbnailUrl: {
      type: String,
      trim: true,
      default: ''
    },
    caption: {
      type: localizedTextOptionalSchema,
      default: () => ({})
    },
    order: {
      type: Number,
      default: 0
    }
  },
  {
    _id: false
  }
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

const gallerySchema = new mongoose.Schema(
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
    description: {
      type: localizedTextOptionalSchema,
      default: () => ({})
    },
    translationWorkflow: {
      type: translationWorkflowSchema,
      default: () => ({})
    },
    items: {
      type: [galleryItemSchema],
      default: []
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

gallerySchema.index({ slug: 1 }, { unique: true });
gallerySchema.index({ status: 1, publishedAt: -1 });
gallerySchema.index({ 'title.en': 'text', 'title.bn': 'text', 'description.en': 'text', 'description.bn': 'text' });

module.exports = mongoose.model('Gallery', gallerySchema);
