const { StatusCodes } = require('http-status-codes');
const asyncHandler = require('../../utils/asyncHandler');
const authService = require('./auth.service');

const register = asyncHandler(async (req, res) => {
  const result = await authService.registerUser(req.body);

  res.locals.auditMeta = {
    action: 'REGISTER_USER',
    entityType: 'User',
    entityId: result.user.id,
    after: { email: result.user.email, roles: result.user.roles }
  };

  res.status(StatusCodes.CREATED).json(result);
});

const login = asyncHandler(async (req, res) => {
  const result = await authService.loginUser(req.body);

  res.locals.auditMeta = {
    action: 'LOGIN',
    entityType: 'User',
    entityId: result.user.id
  };

  res.status(StatusCodes.OK).json(result);
});

const resetPassword = asyncHandler(async (req, res) => {
  const result = await authService.resetPassword({
    userId: req.user._id,
    currentPassword: req.body.currentPassword,
    newPassword: req.body.newPassword
  });

  res.locals.auditMeta = {
    action: 'RESET_PASSWORD',
    entityType: 'User',
    entityId: req.user._id.toString()
  };

  res.status(StatusCodes.OK).json(result);
});

const me = asyncHandler(async (req, res) => {
  const user = await authService.getProfile(req.user._id);
  res.status(StatusCodes.OK).json({ user });
});

module.exports = {
  register,
  login,
  resetPassword,
  me
};
