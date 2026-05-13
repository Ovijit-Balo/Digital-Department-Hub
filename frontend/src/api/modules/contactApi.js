import apiClient from '../client';

export const contactApi = {
  submitInquiry(payload) {
    return apiClient.post('/contacts/inquiries', payload);
  },
  listMyInquiries(params = {}) {
    return apiClient.get('/contacts/inquiries/mine', { params });
  },
  listInquiries(params = {}) {
    return apiClient.get('/contacts/inquiries', { params });
  },
  updateInquiryStatus(inquiryId, payload) {
    return apiClient.patch(`/contacts/inquiries/${inquiryId}/status`, payload);
  }
};
