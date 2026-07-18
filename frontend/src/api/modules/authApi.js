import apiClient from '../client';

export const authApi = {
  me() {
    return apiClient.get('/auth/me');
  },
  forgotPassword(email) {
    return apiClient.post('/auth/password/forgot', { email });
  },
  resetPassword(payload) {
    return apiClient.post('/auth/password/reset', payload);
  },
  // Authenticated change-password (verifies the current password, revokes sessions).
  changePassword(payload) {
    return apiClient.post('/auth/reset-password', payload);
  },
  listUsers(params = {}) {
    return apiClient.get('/auth/users', { params });
  },
  updateUserRoles(userId, payload) {
    return apiClient.patch(`/auth/users/${userId}/roles`, payload);
  },
  updateUserStatus(userId, payload) {
    return apiClient.patch(`/auth/users/${userId}/status`, payload);
  },
  // Admin: issue an invitation for an elevated account.
  createInvitation(payload) {
    return apiClient.post('/auth/invitations', payload);
  },
  listInvitations(params = {}) {
    return apiClient.get('/auth/invitations', { params });
  },
  revokeInvitation(invitationId) {
    return apiClient.delete(`/auth/invitations/${invitationId}`);
  },
  // Public: inspect an invitation token's state before showing the setup form.
  lookupInvitation(token) {
    return apiClient.get('/auth/invitations/lookup', { params: { token } });
  },
  // Public: redeem an invitation token to create the account.
  acceptInvitation(payload) {
    return apiClient.post('/auth/invitations/accept', payload);
  }
};
