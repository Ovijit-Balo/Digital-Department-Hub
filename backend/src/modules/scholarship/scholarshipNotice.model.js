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
    deadline: {
      type: Date,
      required: true
    },
    status: {
      type: String,
      enum: ['draft', 'open', 'closed'],
      default: 'draft'
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
    publishedAt: Date
  },
  {
    timestamps: true,
    versionKey: false
  }
);

scholarshipNoticeSchema.index({ deadline: 1, status: 1 });
scholarshipNoticeSchema.index({ status: 1, createdAt: -1 });
scholarshipNoticeSchema.index({ 'title.en': 'text', 'title.bn': 'text', 'description.en': 'text', 'description.bn': 'text' });

module.exports = mongoose.model('ScholarshipNotice', scholarshipNoticeSchema);
