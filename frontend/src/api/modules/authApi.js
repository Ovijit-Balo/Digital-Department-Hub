import apiClient from '../client';

export const authApi = {
  me() {
    return apiClient.get('/auth/me');
  },
  listUsers(params = {}) {
    return apiClient.get('/auth/users', { params });
  },
  updateUserRoles(userId, payload) {
    return apiClient.patch(`/auth/users/${userId}/roles`, payload);
  }
};
