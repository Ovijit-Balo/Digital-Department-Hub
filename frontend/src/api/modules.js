import apiClient from './client';

export const cmsApi = {
  listNews(params = {}) {
    return apiClient.get('/cms/news', { params });
  },
  createNews(payload) {
    return apiClient.post('/cms/news', payload);
  },
  listBlogs(params = {}) {
    return apiClient.get('/cms/blogs', { params });
  },
  createBlog(payload) {
    return apiClient.post('/cms/blogs', payload);
  },
  listGalleries(params = {}) {
    return apiClient.get('/cms/galleries', { params });
  }
};

export const scholarshipApi = {
  listNotices(params = {}) {
    return apiClient.get('/scholarships/notices', { params });
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
  reviewApplication(applicationId, payload) {
    return apiClient.patch(`/scholarships/applications/${applicationId}/review`, payload);
  },
  exportApplications(params = {}) {
    return apiClient.get('/scholarships/applications/export', {
      params,
      responseType: 'blob'
    });
  }
};

export const eventApi = {
  listEvents(params = {}) {
    return apiClient.get('/events', { params });
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

export const bookingApi = {
  listVenues(params = {}) {
    return apiClient.get('/bookings/venues', { params });
  },
  createVenue(payload) {
    return apiClient.post('/bookings/venues', payload);
  },
  requestBooking(payload) {
    return apiClient.post('/bookings/requests', payload);
  },
  listBookings(params = {}) {
    return apiClient.get('/bookings/requests', { params });
  },
  reviewBooking(bookingId, payload) {
    return apiClient.patch(`/bookings/requests/${bookingId}/decision`, payload);
  },
  checkConflicts(params = {}) {
    return apiClient.get('/bookings/conflicts', { params });
  }
};
