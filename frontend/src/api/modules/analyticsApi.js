import apiClient from '../client';

export const analyticsApi = {
  // Total view counts by content type (admin + editor).
  getSummary(params = {}) {
    return apiClient.get('/analytics/summary', { params });
  },
  // Most viewed content of a type, enriched with title/slug/status (admin + editor).
  getPopularContent(entityType, params = {}) {
    return apiClient.get(`/analytics/popular/${entityType}`, { params });
  },
  // View timeline for a single content item (admin + editor).
  getEntityAnalytics(entityType, entityId, params = {}) {
    return apiClient.get(`/analytics/${entityType}/${entityId}/analytics`, { params });
  }
};
