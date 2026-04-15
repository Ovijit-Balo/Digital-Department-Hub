const mongoose = require('mongoose');

const venueSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },
    location: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300
    },
    capacity: {
      type: Number,
      required: true,
      min: 1,
      max: 100000
    },
    amenities: {
      type: [String],
      default: []
    },
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

venueSchema.index({ name: 1 }, { unique: true });
venueSchema.index({ isActive: 1, manager: 1 });

module.exports = mongoose.model('Venue', venueSchema);
