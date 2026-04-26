export const ROLES = Object.freeze({
  ADMIN: 'admin',
  EDITOR: 'editor',
  STUDENT: 'student',
  MANAGER: 'manager',
  REVIEWER: 'reviewer'
});

export const ALL_ROLES = Object.freeze(Object.values(ROLES));
export const ADMIN_PANEL_ROLES = Object.freeze([ROLES.ADMIN, ROLES.EDITOR, ROLES.MANAGER]);
export const ACCESS_CONTROL_VIEW_ROLES = Object.freeze([ROLES.ADMIN, ROLES.MANAGER]);
export const CMS_STUDIO_ROLES = Object.freeze([ROLES.ADMIN, ROLES.EDITOR]);
export const TEACHER_DASHBOARD_ROLES = Object.freeze([ROLES.ADMIN, ROLES.EDITOR]);
export const STAFF_DASHBOARD_ROLES = Object.freeze([ROLES.ADMIN, ROLES.MANAGER]);
export const STUDENT_DASHBOARD_ROLES = Object.freeze([ROLES.STUDENT, ROLES.REVIEWER]);

export const PORTALS = Object.freeze({
  ADMIN: 'admin',
  TEACHER: 'teacher',
  STAFF: 'staff',
  STUDENT: 'student'
});

export const PORTAL_DEFINITIONS = Object.freeze({
  [PORTALS.ADMIN]: {
    key: PORTALS.ADMIN,
    label: 'Admin',
    roles: [ROLES.ADMIN],
    loginPath: '/login/admin',
    workspacePath: '/admin',
    workspaceLabel: 'Admin Dashboard',
    description: 'Access control, platform governance, and full department oversight.'
  },
  [PORTALS.TEACHER]: {
    key: PORTALS.TEACHER,
    label: 'Teacher',
    roles: [ROLES.EDITOR],
    loginPath: '/login/teacher',
    workspacePath: '/admin/teacher',
    workspaceLabel: 'Teacher Dashboard',
    description: 'Content publishing, announcements, and academic review workflows.'
  },
  [PORTALS.STAFF]: {
    key: PORTALS.STAFF,
    label: 'Staff',
    roles: [ROLES.MANAGER],
    loginPath: '/login/staff',
    workspacePath: '/admin/staff',
    workspaceLabel: 'Staff Dashboard',
    description: 'Operational desks for inquiries, venue approvals, and notifications.'
  },
  [PORTALS.STUDENT]: {
    key: PORTALS.STUDENT,
    label: 'Student',
    roles: [ROLES.STUDENT, ROLES.REVIEWER],
    loginPath: '/login/student',
    workspacePath: '/student',
    workspaceLabel: 'Student Dashboard',
    description: 'Personal dashboard for scholarships, events, and student service tasks.'
  }
});

export const PORTAL_KEYS = Object.freeze(Object.keys(PORTAL_DEFINITIONS));

export function getPortalDefinition(portalKey) {
  if (!portalKey) {
    return null;
  }

  return PORTAL_DEFINITIONS[String(portalKey).toLowerCase()] || null;
}

export function userHasAnyRole(user, roles) {
  if (!user || !Array.isArray(user.roles)) {
    return false;
  }

  return user.roles.some((role) => roles.includes(role));
}

export function userCanAccessPortal(user, portalKey) {
  const portal = getPortalDefinition(portalKey);

  if (!portal) {
    return false;
  }

  return userHasAnyRole(user, portal.roles);
}

export function getPrimaryPortalForUser(user) {
  if (userHasAnyRole(user, [ROLES.ADMIN])) {
    return PORTAL_DEFINITIONS[PORTALS.ADMIN];
  }

  if (userHasAnyRole(user, [ROLES.MANAGER])) {
    return PORTAL_DEFINITIONS[PORTALS.STAFF];
  }

  if (userHasAnyRole(user, [ROLES.EDITOR])) {
    return PORTAL_DEFINITIONS[PORTALS.TEACHER];
  }

  if (userHasAnyRole(user, [ROLES.STUDENT, ROLES.REVIEWER])) {
    return PORTAL_DEFINITIONS[PORTALS.STUDENT];
  }

  return null;
}

export function getDefaultWorkspaceForUser(user) {
  if (userHasAnyRole(user, [ROLES.ADMIN])) {
    return '/admin';
  }

  if (userHasAnyRole(user, [ROLES.MANAGER])) {
    return '/admin/staff';
  }

  if (userHasAnyRole(user, [ROLES.EDITOR])) {
    return '/admin/teacher';
  }

  if (userHasAnyRole(user, [ROLES.REVIEWER, ROLES.STUDENT])) {
    return '/student';
  }

  return '/';
}
