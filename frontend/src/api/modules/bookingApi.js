import apiClient from '../client';

export const bookingApi = {
  listVenues(params = {}) {
    return apiClient.get('/bookings/venues', { params });
  },
  listCalendar(params = {}) {
    return apiClient.get('/bookings/calendar', { params });
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
  listMyBookings(params = {}) {
    return apiClient.get('/bookings/my-requests', { params });
  },
  reviewBooking(bookingId, payload) {
    return apiClient.patch(`/bookings/requests/${bookingId}/decision`, payload);
  },
  checkConflicts(params = {}) {
    return apiClient.get('/bookings/conflicts', { params });
  }
};
