import apiClient from '../client';

export const scholarshipApi = {
  listNotices(params = {}) {
    return apiClient.get('/scholarships/notices', { params });
  },
  listManageNotices(params = {}) {
    return apiClient.get('/scholarships/manage/notices', { params });
  },
  updateNotice(noticeId, payload) {
    return apiClient.patch(`/scholarships/notices/${noticeId}`, payload);
  },
  createNotice(payload) {
    return apiClient.post('/scholarships/notices', payload);
  },
  apply(noticeId, payload) {
    return apiClient.post(`/scholarships/notices/${noticeId}/applications`, payload);
  },
  listApplications(params = {}) {
    return apiClient.get('/scholarships/applications', { params });
  },
  listMyApplications(params = {}) {
    return apiClient.get('/scholarships/my-applications', { params });
  },
  reviewApplication(applicationId, payload) {
    return apiClient.patch(`/scholarships/applications/${applicationId}/review`, payload);
  },
  publishRecipients(noticeId, payload) {
    return apiClient.patch(`/scholarships/notices/${noticeId}/recipients/publish`, payload);
  },
  listRecipients(noticeId, params = {}) {
    return apiClient.get(`/scholarships/notices/${noticeId}/recipients`, { params });
  },
  listManageRecipients(noticeId, params = {}) {
    return apiClient.get(`/scholarships/notices/${noticeId}/recipients/manage`, { params });
  },
  listUpdates(params = {}) {
    return apiClient.get('/scholarships/updates', { params });
  },
  listNoticeUpdates(noticeId, params = {}) {
    return apiClient.get(`/scholarships/notices/${noticeId}/updates`, { params });
  },
  createNoticeUpdate(noticeId, payload) {
    return apiClient.post(`/scholarships/notices/${noticeId}/updates`, payload);
  },
  exportApplications(params = {}) {
    return apiClient.get('/scholarships/applications/export', {
      params,
      responseType: 'blob'
    });
  }
};
