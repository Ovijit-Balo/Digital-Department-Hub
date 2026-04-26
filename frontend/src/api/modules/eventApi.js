import apiClient from '../client';

export const eventApi = {
  listEvents(params = {}) {
    return apiClient.get('/events', { params });
  },
  listManageEvents(params = {}) {
    return apiClient.get('/events/manage', { params });
  },
  listCalendar(params = {}) {
    return apiClient.get('/events/calendar', { params });
  },
  listManageCalendar(params = {}) {
    return apiClient.get('/events/manage/calendar', { params });
  },
  createEvent(payload) {
    return apiClient.post('/events', payload);
  },
  register(eventId) {
    return apiClient.post(`/events/${eventId}/registrations`);
  },
  checkIn(payload) {
    return apiClient.post('/events/check-in', payload);
  },
  submitFeedback(registrationId, payload) {
    return apiClient.patch(`/events/registrations/${registrationId}/feedback`, payload);
  },
  listRegistrations(eventId, params = {}) {
    return apiClient.get(`/events/${eventId}/registrations`, { params });
  }
};
