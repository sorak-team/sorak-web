import { apiClient } from '@/shared/api/client';

export const parentApi = {
  getHome: async (params) => {
    const res = await apiClient.get('/parent/home', { params });
    return res.data?.data || res.data;
  },

  getSchedule: async (params) => {
    const res = await apiClient.get('/parent/schedule', { params });
    return res.data?.data || res.data;
  },

  getProfile: async (params) => {
    const res = await apiClient.get('/parent/profile', { params });
    return res.data?.data || res.data;
  },

  getRequests: async (params) => {
    const res = await apiClient.get('/parent/requests', { params });
    return res.data?.data || res.data;
  },

  createPickupRequest: async (data) => {
    const res = await apiClient.post('/parent/requests/pickup', data);
    return res.data?.data || res.data;
  },

  cancelPickupRequest: async (requestId) => {
    const res = await apiClient.post(`/parent/requests/pickup/${requestId}/cancel`);
    return res.data?.data || res.data;
  },

  getGoodBehavior: async (params) => {
    const res = await apiClient.get('/parent/good-behavior', { params });
    return res.data?.data || res.data;
  },

  submitGoodBehaviorFeedback: async (data) => {
    const res = await apiClient.post('/parent/good-behavior/feedback', data);
    return res.data?.data || res.data;
  },

  getNotifications: async () => {
    const res = await apiClient.get('/parent/notifications');
    return res.data?.data || res.data;
  },

  markNotificationRead: async (id = 'all') => {
    const res = await apiClient.patch(`/parent/notifications/${id}/read`);
    return res.data?.data || res.data;
  },
};

export default parentApi;
