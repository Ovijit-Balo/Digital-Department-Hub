import apiClient from '../client';

export const auditApi = {
  listLogs(params = {}) {
    return apiClient.get('/audits', { params });
  }
};
