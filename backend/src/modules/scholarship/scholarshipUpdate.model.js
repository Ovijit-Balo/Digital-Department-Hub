const mongoose = require('mongoose');

const localizedTextSchema = new mongoose.Schema(
  {
    en: { type: String, required: true, trim: true },
    bn: { type: String, required: true, trim: true }
  },
  { _id: false }
);

const scholarshipUpdateSchema = new mongoose.Schema(
  {
    notice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ScholarshipNotice',
      required: true,
      index: true
    },
    kind: {
      type: String,
      enum: ['general', 'deadline', 'recipient', 'announcement'],
      default: 'general'
    },
    visibility: {
      type: String,
      enum: ['public', 'internal'],
      default: 'public'
    },
    title: {
      type: localizedTextSchema,
      required: true
    },
    body: {
      type: localizedTextSchema,
      required: true
    },
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

scholarshipUpdateSchema.index({ notice: 1, createdAt: -1 });
scholarshipUpdateSchema.index({ visibility: 1, createdAt: -1 });

module.exports = mongoose.model('ScholarshipUpdate', scholarshipUpdateSchema);
