const { StatusCodes } = require('http-status-codes');
const ApiError = require('../utils/ApiError');
const { ROLES } = require('../config/roles');

const normalizeRoles = (roles) =>
  Array.isArray(roles)
    ? roles.filter(Boolean)
    : roles
      ? [roles]
      : [];

const authorize = (...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return next(new ApiError(StatusCodes.UNAUTHORIZED, 'Authentication required'));
  }

  const requesterRoles = normalizeRoles(req.user.roles);
  const permittedRoles = normalizeRoles(allowedRoles);

  if (!requesterRoles.length) {
    return next(new ApiError(StatusCodes.FORBIDDEN, 'No role assigned to the current user'));
  }

  if (!permittedRoles.length) {
    return next(new ApiError(StatusCodes.FORBIDDEN, 'No permitted roles defined for this route'));
  }

  const hasRole = requesterRoles.some((role) => permittedRoles.includes(role));

  if (!hasRole) {
    return next(new ApiError(StatusCodes.FORBIDDEN, 'You do not have permission to perform this action'));
  }

  return next();
};

const requireAdmin = authorize(ROLES.ADMIN);
const requireEditor = authorize(ROLES.EDITOR);
const requireStudent = authorize(ROLES.STUDENT);
const requireAdminOrEditor = authorize(ROLES.ADMIN, ROLES.EDITOR);
const requireAdminEditorStudent = authorize(ROLES.ADMIN, ROLES.EDITOR, ROLES.STUDENT);

module.exports = authorize;
module.exports.authorize = authorize;
module.exports.requireAdmin = requireAdmin;
module.exports.requireEditor = requireEditor;
module.exports.requireStudent = requireStudent;
module.exports.requireAdminOrEditor = requireAdminOrEditor;
module.exports.requireAdminEditorStudent = requireAdminEditorStudent;
