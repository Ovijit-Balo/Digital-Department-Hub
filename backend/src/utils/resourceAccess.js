const { ROLES } = require('../config/roles');

const normalizeRoles = (roles) =>
  Array.isArray(roles) ? roles.filter(Boolean) : roles ? [roles] : [];

const toId = (value) => {
  if (!value) return '';
  // Handles ObjectId, populated docs ({ _id }), and plain strings.
  if (typeof value === 'object') {
    return (value._id || value).toString();
  }
  return value.toString();
};

/**
 * Shared authorization rule for owned resources: the creator may always manage
 * their own resource, and any role in `privilegedRoles` may manage anyone's.
 * Admin is always privileged. Used by events and bookings so the "creator or
 * privileged user, admin too" rule lives in exactly one place.
 *
 * @param {object} user - the acting user (req.user); expects `_id` and `roles`.
 * @param {*} ownerId - the resource owner id (ObjectId, string, or populated doc).
 * @param {string[]} privilegedRoles - roles allowed to manage any resource.
 */
const canManageResource = (user, ownerId, privilegedRoles = [ROLES.ADMIN, ROLES.MANAGER]) => {
  if (!user) return false;

  const roles = normalizeRoles(user.roles);
  const privileged = new Set([ROLES.ADMIN, ...privilegedRoles]);

  if (roles.some((role) => privileged.has(role))) {
    return true;
  }

  return toId(user._id) === toId(ownerId);
};

module.exports = { canManageResource, toId };
