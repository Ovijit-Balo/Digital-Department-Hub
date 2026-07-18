const { StatusCodes } = require('http-status-codes');
const asyncHandler = require('../../utils/asyncHandler');
const authService = require('./auth.service');

const register = asyncHandler(async (req, res) => {
  const result = await authService.registerUser(req.body, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });

  res.locals.auditMeta = {
    action: 'REGISTER_USER',
    entityType: 'User',
    entityId: result.user.id,
    after: { email: result.user.email, roles: result.user.roles }
  };

  res.status(StatusCodes.CREATED).json(result);
});

const login = asyncHandler(async (req, res) => {
  const result = await authService.loginUser(req.body, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });

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

const forgotPassword = asyncHandler(async (req, res) => {
  const result = await authService.requestPasswordReset({ email: req.body.email });
  res.status(StatusCodes.OK).json(result);
});

const confirmPasswordReset = asyncHandler(async (req, res) => {
  const result = await authService.confirmPasswordReset({
    token: req.body.token,
    newPassword: req.body.newPassword
  });
  res.status(StatusCodes.OK).json(result);
});

const me = asyncHandler(async (req, res) => {
  const user = await authService.getProfile(req.user._id);
  res.status(StatusCodes.OK).json({ user });
});

const listUsers = asyncHandler(async (req, res) => {
  const data = await authService.listUsers(req.query);
  res.status(StatusCodes.OK).json(data);
});

const updateUserRoles = asyncHandler(async (req, res) => {
  const user = await authService.updateUserRoles({
    actorId: req.user._id,
    targetUserId: req.params.userId,
    roles: req.body.roles
  });

  res.locals.auditMeta = {
    action: 'UPDATE_USER_ROLES',
    entityType: 'User',
    entityId: user.id,
    after: { roles: user.roles }
  };

  res.status(StatusCodes.OK).json({ user });
});

const createInvitation = asyncHandler(async (req, res) => {
  const invitation = await authService.createInvitation({
    actorId: req.user._id,
    email: req.body.email,
    roles: req.body.roles,
    fullName: req.body.fullName || undefined,
    department: req.body.department || undefined
  });

  res.locals.auditMeta = {
    action: 'INVITE_USER',
    entityType: 'Invitation',
    entityId: invitation.id,
    after: { email: invitation.email, roles: invitation.roles }
  };

  res.status(StatusCodes.CREATED).json({ invitation });
});

const listInvitations = asyncHandler(async (req, res) => {
  const data = await authService.listInvitations(req.query);
  res.status(StatusCodes.OK).json(data);
});

const revokeInvitation = asyncHandler(async (req, res) => {
  const invitation = await authService.revokeInvitation({
    invitationId: req.params.invitationId
  });

  res.locals.auditMeta = {
    action: 'REVOKE_INVITATION',
    entityType: 'Invitation',
    entityId: invitation.id,
    after: { status: invitation.status }
  };

  res.status(StatusCodes.OK).json({ invitation });
});

const acceptInvitation = asyncHandler(async (req, res) => {
  const result = await authService.acceptInvitation(
    {
      token: req.body.token,
      fullName: req.body.fullName,
      password: req.body.password
    },
    { ip: req.ip, userAgent: req.get('user-agent') }
  );

  res.locals.auditMeta = {
    action: 'ACCEPT_INVITATION',
    entityType: 'User',
    entityId: result.user.id,
    after: { email: result.user.email, roles: result.user.roles }
  };

  res.status(StatusCodes.CREATED).json(result);
});

const getInvitation = asyncHandler(async (req, res) => {
  const invitation = await authService.getInvitationByToken(req.query.token);
  res.status(StatusCodes.OK).json({ invitation });
});

const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  const data = await authService.refreshAuth(refreshToken, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  res.status(StatusCodes.OK).json(data);
});

const updateUserStatus = asyncHandler(async (req, res) => {
  const user = await authService.updateUserStatus({
    actorId: req.user._id,
    targetUserId: req.params.userId,
    isActive: req.body.isActive
  });

  res.locals.auditMeta = {
    action: req.body.isActive ? 'ACTIVATE_USER' : 'DEACTIVATE_USER',
    entityType: 'User',
    entityId: user.id,
    after: { isActive: user.isActive }
  };

  res.status(StatusCodes.OK).json({ user });
});

module.exports = {
  register,
  login,
  resetPassword,
  forgotPassword,
  confirmPasswordReset,
  me,
  listUsers,
  updateUserRoles,
  updateUserStatus,
  refresh,
  createInvitation,
  listInvitations,
  revokeInvitation,
  acceptInvitation,
  getInvitation
};
