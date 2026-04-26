const mongoose = require('mongoose');

const localizedTextSchema = new mongoose.Schema(
  {
    en: { type: String, required: true, trim: true },
    bn: { type: String, required: true, trim: true }
  },
  { _id: false }
);

const attachmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true }
  },
  { _id: false }
);

const scholarshipCategorySchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: /^[a-z0-9_-]+$/,
      maxlength: 40
    },
    name: {
      type: localizedTextSchema,
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    slots: {
      type: Number,
      min: 1,
      default: 1
    }
  },
  { _id: false }
);

const scholarshipNoticeSchema = new mongoose.Schema(
  {
    title: {
      type: localizedTextSchema,
      required: true
    },
    description: {
      type: localizedTextSchema,
      required: true
    },
    eligibility: {
      type: localizedTextSchema,
      required: true
    },
    scholarshipType: {
      type: String,
      enum: ['one_off', 'monthly'],
      default: 'one_off'
    },
    deadline: {
      type: Date,
      required: true
    },
    applicationWindowStart: {
      type: Date,
      required: true
    },
    applicationWindowEnd: {
      type: Date,
      required: true
    },
    status: {
      type: String,
      enum: ['draft', 'open', 'closed'],
      default: 'draft'
    },
    categories: {
      type: [scholarshipCategorySchema],
      default: []
    },
    attachments: {
      type: [attachmentSchema],
      default: []
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    publishedAt: Date,
    recipientsPublishedAt: Date,
    latestUpdateAt: Date
  },
  {
    timestamps: true,
    versionKey: false
  }
);

scholarshipNoticeSchema.pre('validate', function validateWindow(next) {
  if (this.applicationWindowStart >= this.applicationWindowEnd) {
    return next(new Error('applicationWindowEnd must be greater than applicationWindowStart'));
  }

  const categoryCodes = new Set();
  for (const category of this.categories) {
    if (categoryCodes.has(category.code)) {
      return next(new Error('Category codes must be unique per scholarship notice'));
    }
    categoryCodes.add(category.code);
  }

  return next();
});

scholarshipNoticeSchema.index({ deadline: 1, status: 1 });
scholarshipNoticeSchema.index({ status: 1, createdAt: -1 });
scholarshipNoticeSchema.index({ scholarshipType: 1, status: 1, applicationWindowStart: 1, applicationWindowEnd: 1 });
scholarshipNoticeSchema.index({ 'title.en': 'text', 'title.bn': 'text', 'description.en': 'text', 'description.bn': 'text' });

module.exports = mongoose.model('ScholarshipNotice', scholarshipNoticeSchema);
