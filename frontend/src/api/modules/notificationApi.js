import apiClient from '../client';

export const notificationApi = {
  dispatch(payload) {
    return apiClient.post('/notifications/dispatch', payload);
  },
  listNotifications(params = {}) {
    return apiClient.get('/notifications', { params });
  },
  markRead(notificationId) {
    return apiClient.patch(`/notifications/${notificationId}/read`);
  }
};
