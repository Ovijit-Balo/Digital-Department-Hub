const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const env = require('../../config/env');
const { StatusCodes } = require('http-status-codes');
const User = require('./user.model');
const RefreshToken = require('./refreshToken.model');
const Invitation = require('./invitation.model');
const ApiError = require('../../utils/ApiError');
const { signAccessToken } = require('../../utils/jwt');
const { ROLES, ALL_ROLES } = require('../../config/roles');
const EmailService = require('../../services/emailService');
const logger = require('../../config/logger');

// How long a password-reset link stays valid after it is issued.
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

// How long an admin-issued account invitation stays valid.
const INVITATION_TTL_MS = 72 * 60 * 60 * 1000; // 72 hours

// Same response whether or not the email exists, so the endpoint cannot be used
// to discover which emails have accounts (user-enumeration protection).
const GENERIC_RESET_REQUEST_MESSAGE =
  'If an account exists for that email, a password reset link has been sent.';

// Shared one-way hash for single-use tokens (password reset, invitations). Only
// the hash is persisted, so a DB leak cannot be used to redeem a live token.
const hashToken = (rawToken) =>
  crypto.createHash('sha256').update(rawToken).digest('hex');

// Backward-compatible alias used by the password-reset flow below.
const hashResetToken = hashToken;

const sanitizeUser = (user) => ({
  id: user._id,
  fullName: user.fullName,
  email: user.email,
  roles: user.roles,
  department: user.department,
  languagePreference: user.languagePreference,
  isActive: user.isActive,
  lastLoginAt: user.lastLoginAt,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt
});

const buildPagination = ({ page, limit }) => {
  const parsedPage = Number(page || 1);
  const parsedLimit = Number(limit || 20);

  return {
    page: parsedPage,
    limit: parsedLimit,
    skip: (parsedPage - 1) * parsedLimit
  };
};

const issueRefreshToken = async (user, requestMeta = {}) => {
  const refreshToken = crypto.randomBytes(48).toString('hex');
  const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const expiresAt = new Date(
    Date.now() + Number(env.REFRESH_TOKEN_EXPIRES_DAYS) * 24 * 60 * 60 * 1000
  );

  await RefreshToken.create({
    user: user._id,
    tokenHash: hash,
    expiresAt,
    createdByIp: requestMeta.ip || null,
    userAgent: requestMeta.userAgent || null,
    deviceLabel: requestMeta.deviceLabel || null
  });

  return refreshToken;
};

const registerUser = async (payload, requestMeta = {}) => {
  const exists = await User.findOne({ email: payload.email.toLowerCase() });
  if (exists) {
    throw new ApiError(StatusCodes.CONFLICT, 'Email already registered');
  }

  const passwordHash = await bcrypt.hash(payload.password, 12);

  const user = await User.create({
    fullName: payload.fullName,
    email: payload.email,
    passwordHash,
    department: payload.department,
    languagePreference: payload.languagePreference || 'en',
    roles: [ROLES.STUDENT]
  });

  const token = signAccessToken({ sub: user._id.toString(), roles: user.roles });
  const refreshToken = await issueRefreshToken(user, requestMeta);

  return {
    user: sanitizeUser(user),
    token,
    refreshToken
  };
};

const loginUser = async ({ email, password }, requestMeta = {}) => {
  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');

  if (!user || !user.isActive) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid credentials');
  }

  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid credentials');
  }

  user.lastLoginAt = new Date();
  await user.save();

  const token = signAccessToken({ sub: user._id.toString(), roles: user.roles });
  const refreshToken = await issueRefreshToken(user, requestMeta);

  return {
    user: sanitizeUser(user),
    token,
    refreshToken
  };
};

const refreshAuth = async (rawRefreshToken, requestMeta = {}) => {
  if (!rawRefreshToken) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid refresh token');
  }
  const hash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');

  const tokenDoc = await RefreshToken.findOne({ tokenHash: hash, revoked: false }).populate('user');
  if (!tokenDoc || tokenDoc.expiresAt.getTime() <= Date.now()) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid refresh token');
  }

  // rotate: revoke old token and create a new one
  const newRefreshToken = crypto.randomBytes(48).toString('hex');
  const newHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
  const expiresAt = new Date(
    Date.now() + Number(env.REFRESH_TOKEN_EXPIRES_DAYS) * 24 * 60 * 60 * 1000
  );

  // mark current token as revoked and set replacedByTokenHash
  tokenDoc.revoked = true;
  tokenDoc.replacedByTokenHash = newHash;
  tokenDoc.lastUsedAt = new Date();
  await tokenDoc.save();

  // persist new token
  await RefreshToken.create({
    user: tokenDoc.user._id,
    tokenHash: newHash,
    expiresAt,
    createdByIp: requestMeta.ip || tokenDoc.createdByIp || null,
    userAgent: requestMeta.userAgent || tokenDoc.userAgent || null,
    deviceLabel: tokenDoc.deviceLabel || null
  });

  const accessToken = signAccessToken({
    sub: tokenDoc.user._id.toString(),
    roles: tokenDoc.user.roles
  });

  return { token: accessToken, refreshToken: newRefreshToken };
};

const resetPassword = async ({ userId, currentPassword, newPassword }) => {
  const user = await User.findById(userId).select('+passwordHash');

  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
  }

  const isCurrentPasswordValid = await user.comparePassword(currentPassword);
  if (!isCurrentPasswordValid) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Current password is incorrect');
  }

  user.passwordHash = await bcrypt.hash(newPassword, 12);
  user.passwordChangedAt = new Date();
  await user.save();
  await RefreshToken.updateMany({ user: user._id, revoked: false }, { $set: { revoked: true } });

  return { message: 'Password reset successful' };
};

// FR-PA-047: forgot-password step 1 — issue a time-limited reset token and
// email the reset link. Only the SHA-256 hash of the token is stored, so a DB
// leak cannot be used to reset anyone's password.
const requestPasswordReset = async ({ email }) => {
  const user = await User.findOne({ email: email.toLowerCase() });

  if (user && user.isActive) {
    const rawToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetTokenHash = hashResetToken(rawToken);
    user.passwordResetExpires = new Date(Date.now() + PASSWORD_RESET_TTL_MS);
    await user.save();

    try {
      await EmailService.sendPasswordResetEmail(user.email, rawToken);
    } catch (error) {
      // Never surface delivery failures to the caller (would leak account
      // existence and expose infra detail); log for operators instead.
      logger.error('Failed to send password reset email', error);
    }
  }

  return { message: GENERIC_RESET_REQUEST_MESSAGE };
};

// FR-PA-047: forgot-password step 2 — verify the token and set the new password.
const confirmPasswordReset = async ({ token, newPassword }) => {
  const user = await User.findOne({
    passwordResetTokenHash: hashResetToken(token),
    passwordResetExpires: { $gt: new Date() }
  }).select('+passwordResetTokenHash +passwordResetExpires');

  if (!user) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid or expired password reset token.');
  }

  user.passwordHash = await bcrypt.hash(newPassword, 12);
  user.passwordChangedAt = new Date();
  user.passwordResetTokenHash = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // Any sessions that existed before the reset are no longer trusted.
  await RefreshToken.updateMany({ user: user._id, revoked: false }, { $set: { revoked: true } });

  return { message: 'Password has been reset. You can now sign in with your new password.' };
};

const getProfile = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
  }

  return sanitizeUser(user);
};

const listUsers = async (query) => {
  const filter = {};

  if (query.search) {
    filter.$or = [
      { fullName: { $regex: query.search, $options: 'i' } },
      { email: { $regex: query.search, $options: 'i' } },
      { department: { $regex: query.search, $options: 'i' } }
    ];
  }

  if (query.role) {
    filter.roles = query.role;
  }

  if (query.isActive !== undefined) {
    filter.isActive = query.isActive;
  }

  const { page, limit, skip } = buildPagination(query);

  const [items, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter)
  ]);

  return {
    items: items.map((item) => sanitizeUser(item)),
    page,
    limit,
    total
  };
};

const updateUserRoles = async ({ actorId, targetUserId, roles }) => {
  const target = await User.findById(targetUserId);

  if (!target) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
  }

  const normalizedRoles = Array.from(new Set(roles));

  if (!normalizedRoles.length) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'At least one role is required');
  }

  if (actorId.toString() === targetUserId.toString() && !normalizedRoles.includes(ROLES.ADMIN)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'You cannot remove your own admin role');
  }

  target.roles = normalizedRoles;
  await target.save();

  return sanitizeUser(target);
};

// --- Account invitations (admin-issued elevated accounts) ------------------
// Fixes the weakpoint where every registration was hardcoded to Student and
// non-students had to self-register then wait for a manual promotion. Elevated
// accounts (admin/editor/manager/reviewer, or even student) are now created by
// an admin who sends an invite; the invitee sets their own name + password.

const sanitizeInvitation = (invite) => ({
  id: invite._id,
  email: invite.email,
  roles: invite.roles,
  fullName: invite.fullName,
  department: invite.department,
  status: invite.status,
  expiresAt: invite.expiresAt,
  acceptedAt: invite.acceptedAt,
  createdAt: invite.createdAt
});

const createInvitation = async ({ actorId, email, roles, fullName, department }) => {
  const normalizedEmail = email.toLowerCase();

  const normalizedRoles = Array.from(new Set(roles || []));
  if (!normalizedRoles.length) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'At least one role is required');
  }
  const invalidRole = normalizedRoles.find((role) => !ALL_ROLES.includes(role));
  if (invalidRole) {
    throw new ApiError(StatusCodes.BAD_REQUEST, `Unknown role: ${invalidRole}`);
  }

  // Cannot invite an email that already has an account.
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw new ApiError(
      StatusCodes.CONFLICT,
      'An account with this email already exists. Update their roles from the user directory instead.'
    );
  }

  const rawToken = crypto.randomBytes(32).toString('hex');

  // Supersede any earlier pending invite for the same email so only the newest
  // link works (avoids multiple valid tokens floating around).
  await Invitation.updateMany(
    { email: normalizedEmail, status: 'pending' },
    { $set: { status: 'revoked' } }
  );

  const invitation = await Invitation.create({
    email: normalizedEmail,
    roles: normalizedRoles,
    fullName,
    department,
    invitedBy: actorId,
    tokenHash: hashToken(rawToken),
    expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
    status: 'pending'
  });

  try {
    await EmailService.sendInvitationEmail(normalizedEmail, rawToken, normalizedRoles);
  } catch (error) {
    // Delivery failure shouldn't lose the invite (admin can resend); log it.
    logger.error('Failed to send invitation email', error);
  }

  return sanitizeInvitation(invitation);
};

const listInvitations = async (query = {}) => {
  const filter = {};
  if (query.status) {
    filter.status = query.status;
  }

  const { page, limit, skip } = buildPagination(query);

  const [items, total] = await Promise.all([
    Invitation.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Invitation.countDocuments(filter)
  ]);

  return {
    items: items.map((item) => sanitizeInvitation(item)),
    page,
    limit,
    total
  };
};

const revokeInvitation = async ({ invitationId }) => {
  const invitation = await Invitation.findById(invitationId);
  if (!invitation) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Invitation not found');
  }
  if (invitation.status === 'accepted') {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'This invitation has already been accepted');
  }

  invitation.status = 'revoked';
  await invitation.save();

  return sanitizeInvitation(invitation);
};

// Look up an invitation by its raw token without consuming it. Lets the accept
// page show the right state on load (usable / already accepted / revoked /
// expired) instead of only discovering a dead link after the user fills the form.
const getInvitationByToken = async (token) => {
  const invitation = await Invitation.findOne({ tokenHash: hashToken(token) });

  if (!invitation) {
    return { state: 'invalid' };
  }

  if (invitation.status === 'accepted') {
    return { state: 'accepted', email: invitation.email };
  }
  if (invitation.status === 'revoked') {
    return { state: 'revoked', email: invitation.email };
  }
  if (invitation.expiresAt.getTime() <= Date.now()) {
    return { state: 'expired', email: invitation.email };
  }

  return {
    state: 'pending',
    email: invitation.email,
    roles: invitation.roles,
    fullName: invitation.fullName || '',
    expiresAt: invitation.expiresAt
  };
};

const acceptInvitation = async ({ token, fullName, password }, requestMeta = {}) => {
  const invitation = await Invitation.findOne({
    tokenHash: hashToken(token),
    status: 'pending',
    expiresAt: { $gt: new Date() }
  }).select('+tokenHash');

  if (!invitation) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'This invitation is invalid or has expired.');
  }

  // Guard against the email being claimed between invite and accept.
  const existingUser = await User.findOne({ email: invitation.email });
  if (existingUser) {
    invitation.status = 'revoked';
    await invitation.save();
    throw new ApiError(StatusCodes.CONFLICT, 'An account with this email already exists.');
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await User.create({
    fullName: fullName || invitation.fullName || invitation.email.split('@')[0],
    email: invitation.email,
    passwordHash,
    department: invitation.department,
    languagePreference: 'en',
    roles: invitation.roles
  });

  invitation.status = 'accepted';
  invitation.acceptedAt = new Date();
  await invitation.save();

  const authToken = signAccessToken({ sub: user._id.toString(), roles: user.roles });
  const refreshToken = await issueRefreshToken(user, requestMeta);

  return {
    user: sanitizeUser(user),
    token: authToken,
    refreshToken
  };
};

const updateUserStatus = async ({ actorId, targetUserId, isActive }) => {
  const target = await User.findById(targetUserId);

  if (!target) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
  }

  if (actorId.toString() === targetUserId.toString() && !isActive) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'You cannot deactivate your own account');
  }

  target.isActive = isActive;
  await target.save();

  if (!isActive) {
    await RefreshToken.updateMany({ user: target._id, revoked: false }, { $set: { revoked: true } });
  }

  return sanitizeUser(target);
};

module.exports = {
  registerUser,
  loginUser,
  resetPassword,
  requestPasswordReset,
  confirmPasswordReset,
  getProfile,
  listUsers,
  updateUserRoles,
  updateUserStatus,
  refreshAuth,
  createInvitation,
  listInvitations,
  revokeInvitation,
  acceptInvitation,
  getInvitationByToken
};
