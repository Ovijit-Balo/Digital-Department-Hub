const bcrypt = require('bcryptjs');
const { StatusCodes } = require('http-status-codes');
const User = require('./user.model');
const ApiError = require('../../utils/ApiError');
const { signAccessToken } = require('../../utils/jwt');
const { ROLES } = require('../../config/roles');

const sanitizeUser = (user) => ({
  id: user._id,
  fullName: user.fullName,
  email: user.email,
  roles: user.roles,
  department: user.department,
  languagePreference: user.languagePreference,
  isActive: user.isActive,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt
});

const registerUser = async (payload) => {
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
    roles: payload.roles && payload.roles.length ? payload.roles : [ROLES.STUDENT]
  });

  const token = signAccessToken({ sub: user._id.toString(), roles: user.roles });

  return {
    user: sanitizeUser(user),
    token
  };
};

const loginUser = async ({ email, password }) => {
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

  return {
    user: sanitizeUser(user),
    token
  };
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

  return { message: 'Password reset successful' };
};

const getProfile = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
  }

  return sanitizeUser(user);
};

module.exports = {
  registerUser,
  loginUser,
  resetPassword,
  getProfile
};
