const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true }
  },
  { _id: false }
);

const scholarshipApplicationSchema = new mongoose.Schema(
  {
    notice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ScholarshipNotice',
      required: true,
      index: true
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    statement: {
      type: String,
      required: true,
      minlength: 30,
      maxlength: 5000,
      trim: true
    },
    gpa: {
      type: Number,
      min: 0,
      max: 4,
      required: true
    },
    department: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120
    },
    documents: {
      type: [documentSchema],
      default: []
    },
    status: {
      type: String,
      enum: ['submitted', 'under_review', 'approved', 'rejected'],
      default: 'submitted'
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewedAt: Date,
    decisionNote: {
      type: String,
      trim: true,
      maxlength: 1000
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

scholarshipApplicationSchema.index({ notice: 1, student: 1 }, { unique: true });
scholarshipApplicationSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('ScholarshipApplication', scholarshipApplicationSchema);
