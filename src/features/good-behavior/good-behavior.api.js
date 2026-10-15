import { apiClient } from '@/shared/api/client';

export const goodBehaviorApi = {
  /**
   * Get good behavior overview & student certificates for class
   */
  async getOverview(classId = '1', params = {}) {
    const response = await apiClient.get(`/good-behavior/classes/${classId}`, { params });
    return response.data?.data || response.data;
  },

  /**
   * Save student good behavior certificate
   */
  async saveRecords(classId = '1', payload = {}) {
    const response = await apiClient.post(`/good-behavior/classes/${classId}/records`, payload);
    return response.data?.data || response.data;
  },
};
