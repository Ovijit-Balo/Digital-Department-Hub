const mongoose = require('mongoose');

const localizedTextSchema = new mongoose.Schema(
  {
    en: { type: String, required: true, trim: true },
    bn: { type: String, required: true, trim: true }
  },
  { _id: false }
);

const blogPostSchema = new mongoose.Schema(
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
    excerpt: {
      type: localizedTextSchema,
      required: true
    },
    body: {
      type: localizedTextSchema,
      required: true
    },
    coverImageUrl: {
      type: String,
      trim: true
    },
    tags: {
      type: [String],
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

blogPostSchema.index({ slug: 1 }, { unique: true });
blogPostSchema.index({ status: 1, publishedAt: -1 });
blogPostSchema.index({ tags: 1 });
blogPostSchema.index({ 'title.en': 'text', 'title.bn': 'text', 'body.en': 'text', 'body.bn': 'text' });

module.exports = mongoose.model('BlogPost', blogPostSchema);
