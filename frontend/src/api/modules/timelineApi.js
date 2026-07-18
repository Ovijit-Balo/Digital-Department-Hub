import apiClient from '../client';

export const timelineApi = {
  // The signed-in user's aggregated feed of deadlines, events, and decisions.
  getMyTimeline() {
    return apiClient.get('/timeline/me');
  }
};
