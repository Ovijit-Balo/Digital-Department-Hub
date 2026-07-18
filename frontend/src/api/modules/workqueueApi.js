import apiClient from '../client';

export const workqueueApi = {
  // Unified, aged staff approval queue (bookings + inquiries + scholarships).
  getStaffQueue(params = {}) {
    return apiClient.get('/workqueue/staff', { params });
  }
};
