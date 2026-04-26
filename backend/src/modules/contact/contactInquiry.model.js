const mongoose = require('mongoose');

const contactInquirySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 200
    },
    message: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 5000
    },
    status: {
      type: String,
      enum: ['new', 'in_progress', 'resolved'],
      default: 'new'
    },
    resolutionNote: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: ''
    },
    handledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    resolvedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

contactInquirySchema.index({ status: 1, createdAt: -1 });
contactInquirySchema.index({ email: 1, createdAt: -1 });
contactInquirySchema.index({ subject: 'text', message: 'text', name: 'text' });

module.exports = mongoose.model('ContactInquiry', contactInquirySchema);
