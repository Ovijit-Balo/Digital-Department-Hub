const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true, index: true },
    expiresAt: { type: Date, required: true },
    createdByIp: { type: String },
    userAgent: { type: String },
    deviceLabel: { type: String, trim: true, maxlength: 120 },
    lastUsedAt: { type: Date, default: null },
    revoked: { type: Boolean, default: false },
    replacedByTokenHash: { type: String, default: null }
  },
  { timestamps: true }
);

refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);
