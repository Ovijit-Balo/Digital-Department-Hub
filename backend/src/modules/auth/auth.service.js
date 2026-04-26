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
    roles: [ROLES.STUDENT]
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

module.exports = {
  registerUser,
  loginUser,
  resetPassword,
  getProfile,
  listUsers,
  updateUserRoles
};
