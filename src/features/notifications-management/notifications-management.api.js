import { apiClient } from '@/shared/api/client';

export const notificationsManagementApi = {
  /**
   * Fetch paginated list of broadcast notifications created by Principal
   */
  async list(params = {}) {
    const response = await apiClient.get('/notifications/broadcasts', { params });
    return response.data?.data || response.data;
  },

  /**
   * Fetch paginated list of automated system event notifications
   */
  async listAutomated(params = {}) {
    const response = await apiClient.get('/notifications/automated', { params });
    return response.data?.data || response.data;
  },

  /**
   * Get single automated notification detail
   */
  async getAutomatedById(id) {
    const response = await apiClient.get(`/notifications/automated/${id}`);
    return response.data?.data || response.data;
  },

  /**
   * Get single broadcast notification detail with recipient audit
   */
  async getById(batchId) {
    const response = await apiClient.get(`/notifications/broadcasts/${batchId}`);
    return response.data?.data || response.data;
  },

  /**
   * Create or schedule a new broadcast notification
   */
  async create(payload) {
    const response = await apiClient.post('/notifications/broadcasts', payload);
    return response.data?.data || response.data;
  },

  /**
   * Update a broadcast notification
   */
  async update(batchId, payload) {
    const response = await apiClient.put(`/notifications/broadcasts/${batchId}`, payload);
    return response.data?.data || response.data;
  },

  /**
   * Soft-delete / revoke a broadcast notification
   */
  async delete(batchId) {
    const response = await apiClient.delete(`/notifications/broadcasts/${batchId}`);
    return response.data?.data || response.data;
  },
};

