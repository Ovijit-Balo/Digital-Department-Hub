const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 200
    },
    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 20,
      maxlength: 5000
    },
    location: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },
    startTime: {
      type: Date,
      required: true
    },
    endTime: {
      type: Date,
      required: true
    },
    registrationDeadline: {
      type: Date,
      required: true
    },
    capacity: {
      type: Number,
      required: true,
      min: 1,
      max: 50000
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'cancelled'],
      default: 'draft'
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    // Set when this event was auto-created from an approved venue booking.
    // Links the two records so cancelling/deleting one can cascade to the other.
    sourceBooking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VenueBooking',
      default: null
    },
    // The user who originally requested the source booking (may differ from
    // createdBy, which is the approver for auto-created events).
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

eventSchema.pre('validate', function validateTime(next) {
  if (this.startTime >= this.endTime) {
    return next(new Error('endTime must be greater than startTime'));
  }

  if (this.registrationDeadline > this.startTime) {
    return next(new Error('registrationDeadline cannot be after event startTime'));
  }

  return next();
});

eventSchema.index({ startTime: 1, endTime: 1 });
eventSchema.index({ status: 1, startTime: 1 });

module.exports = mongoose.model('Event', eventSchema);
