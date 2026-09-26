import { apiClient } from '@/shared/api/client';

export const accountsApi = {
  /**
   * Fetch paginated list of accounts with filtering
   */
  async list(params = {}) {
    const response = await apiClient.get('/accounts', { params });
    return response.data?.data || response.data;
  },

  /**
   * Get single account detail
   */
  async getById(id) {
    const response = await apiClient.get(`/accounts/${id}`);
    return response.data?.data || response.data;
  },

  /**
   * Create new account
   */
  async create(payload) {
    const response = await apiClient.post('/accounts', payload);
    return response.data?.data || response.data;
  },

  /**
   * Update account information
   */
  async update(id, payload) {
    const response = await apiClient.patch(`/accounts/${id}`, payload);
    return response.data?.data || response.data;
  },

  /**
   * Toggle account status (active/inactive)
   */
  async toggleStatus(id, isActive) {
    const response = await apiClient.patch(`/accounts/${id}/status`, { isActive });
    return response.data?.data || response.data;
  },

  /**
   * Reset account password
   */
  async resetPassword(id, newPassword) {
    const response = await apiClient.post(`/accounts/${id}/reset-password`, { newPassword });
    return response.data?.data || response.data;
  },

  /**
   * Delete account (soft delete)
   */
  async delete(id) {
    const response = await apiClient.delete(`/accounts/${id}`);
    return response.data?.data || response.data;
  },
};
