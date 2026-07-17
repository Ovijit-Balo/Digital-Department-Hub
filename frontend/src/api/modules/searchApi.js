import apiClient from '../client';

export const searchApi = {
  search(params = {}) {
    return apiClient.get('/search', { params });
  }
};
