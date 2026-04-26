const mongoose = require('mongoose');

const venueBookingSchema = new mongoose.Schema(
  {
    venue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Venue',
      required: true,
      index: true
    },
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 200
    },
    purpose: {
      type: String,
      required: true,
      trim: true,
      minlength: 20,
      maxlength: 3000
    },
    bookingType: {
      type: String,
      enum: ['class', 'event', 'lab', 'other'],
      default: 'event'
    },
    classCode: {
      type: String,
      trim: true,
      maxlength: 40
    },
    startTime: {
      type: Date,
      required: true
    },
    endTime: {
      type: Date,
      required: true
    },
    attendeeCount: {
      type: Number,
      required: true,
      min: 1
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'cancelled'],
      default: 'pending'
    },
    approver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    decisionAt: Date,
    decisionNote: {
      type: String,
      trim: true,
      maxlength: 1200
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

venueBookingSchema.pre('validate', function validateTime(next) {
  if (this.startTime >= this.endTime) {
    return next(new Error('endTime must be greater than startTime'));
  }

  if (this.bookingType === 'class' && !this.classCode) {
    return next(new Error('classCode is required when bookingType is class'));
  }

  return next();
});

venueBookingSchema.index({ venue: 1, startTime: 1, endTime: 1 });
venueBookingSchema.index({ status: 1, startTime: 1 });
venueBookingSchema.index({ bookingType: 1, startTime: 1 });

module.exports = mongoose.model('VenueBooking', venueBookingSchema);
