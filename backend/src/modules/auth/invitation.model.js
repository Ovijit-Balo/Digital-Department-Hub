const mongoose = require('mongoose');
const { ALL_ROLES } = require('../../config/roles');

// An invitation is an admin-issued grant that lets a specific email create an
// account pre-assigned to one or more elevated roles. Only the SHA-256 hash of
// the raw token is stored, so a DB leak cannot be used to accept an invite
// (same protection as password-reset tokens).
const invitationSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    },
    roles: {
      type: [String],
      enum: ALL_ROLES,
      required: true,
      validate: {
        validator: (value) => Array.isArray(value) && value.length > 0,
        message: 'At least one role is required'
      }
    },
    // Optional prefill shown on the accept form; the invitee can still change it.
    fullName: {
      type: String,
      trim: true,
      maxlength: 120
    },
    department: {
      type: String,
      trim: true,
      maxlength: 120
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    tokenHash: {
      type: String,
      required: true,
      select: false
    },
    expiresAt: {
      type: Date,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'revoked'],
      default: 'pending'
    },
    acceptedAt: Date
  },
  {
    timestamps: true,
    versionKey: false
  }
);

invitationSchema.index({ tokenHash: 1 });
invitationSchema.index({ email: 1, status: 1 });

module.exports = mongoose.model('Invitation', invitationSchema);
