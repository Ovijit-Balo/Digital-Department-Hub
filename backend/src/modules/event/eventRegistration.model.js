const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema(
  {
    rating: { type: Number, min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 1000 },
    submittedAt: Date
  },
  { _id: false }
);

const eventRegistrationSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true
    },
    attendee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ['registered', 'checked_in', 'cancelled'],
      default: 'registered'
    },
    qrToken: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      match: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    },
    qrCodeDataUrl: {
      type: String,
      required: true
    },
    checkedInAt: Date,
    feedback: {
      type: feedbackSchema,
      default: null
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

eventRegistrationSchema.index({ event: 1, attendee: 1 }, { unique: true });
eventRegistrationSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('EventRegistration', eventRegistrationSchema);
