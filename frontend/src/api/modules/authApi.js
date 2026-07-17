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
  }
};
