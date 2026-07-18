const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true }
  },
  { _id: false }
);

// One entry per workflow transition, capturing who moved the application, in
// what role, to which status, and why. Appended to on every review action.
const reviewHistorySchema = new mongoose.Schema(
  {
    fromStatus: { type: String },
    toStatus: { type: String, required: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    actorRole: { type: String },
    note: { type: String, trim: true, maxlength: 1000 },
    at: { type: Date, default: Date.now }
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
    selectedCategoryCode: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 40
    },
    documents: {
      type: [documentSchema],
      default: []
    },
    status: {
      type: String,
      enum: [
        'submitted',
        'needs_info',
        'documents_verified',
        'under_review',
        'shortlisted',
        'approved',
        'rejected'
      ],
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
    },
    // Ordered audit trail of every workflow transition (screening, shortlist,
    // final decision). Powers step-by-step visibility for staff and applicants.
    reviewHistory: {
      type: [reviewHistorySchema],
      default: []
    },
    awardedCategoryCode: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 40
    },
    awardedAmount: {
      type: Number,
      min: 0
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

scholarshipApplicationSchema.index({ notice: 1, student: 1 }, { unique: true });
scholarshipApplicationSchema.index({ status: 1, createdAt: -1 });
scholarshipApplicationSchema.index({ notice: 1, status: 1, awardedCategoryCode: 1 });

module.exports = mongoose.model('ScholarshipApplication', scholarshipApplicationSchema);
