const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { ALL_ROLES, ROLES } = require('../../config/roles');

const userSchema = new mongoose.Schema(
  {
    fullName: {
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
    passwordHash: {
      type: String,
      required: true,
      select: false
    },
    roles: {
      type: [String],
      enum: ALL_ROLES,
      default: [ROLES.STUDENT]
    },
    department: {
      type: String,
      trim: true,
      maxlength: 120
    },
    languagePreference: {
      type: String,
      enum: ['en', 'bn'],
      default: 'en'
    },
    isActive: {
      type: Boolean,
      default: true
    },
    lastLoginAt: Date,
    passwordChangedAt: Date
  },
  {
    timestamps: true,
    versionKey: false
  }
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ roles: 1, isActive: 1 });

userSchema.methods.comparePassword = function comparePassword(rawPassword) {
  return bcrypt.compare(rawPassword, this.passwordHash);
};

module.exports = mongoose.model('User', userSchema);
