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
  },
  // Personal in-app notifications (any authenticated user).
  getUserNotifications(params = {}) {
    return apiClient.get('/notifications/user', { params });
  },
  markUserNotificationRead(notificationId) {
    return apiClient.patch(`/notifications/user/${notificationId}/read`);
  },
  markAllUserNotificationsRead() {
    return apiClient.patch('/notifications/user/read-all');
  },
  getUnreadCount() {
    return apiClient.get('/notifications/user/unread-count');
  }
};
