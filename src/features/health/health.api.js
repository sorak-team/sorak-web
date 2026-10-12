import { apiClient } from '@/shared/api/client';

export const healthApi = {
  /**
   * Get health timetable overview and student measurements
   */
  async getHealthOverview(classId = '1', params = {}) {
    const response = await apiClient.get(`/student-health/classes/${classId}`, { params });
    return response.data?.data || response.data;
  },

  /**
   * Save student growth measurements
   */
  async saveHealthRecords(classId = '1', payload = {}) {
    const response = await apiClient.post(`/student-health/classes/${classId}/records`, payload);
    return response.data?.data || response.data;
  },

  /**
   * Delete student growth measurements
   */
  async clearHealthRecords(classId = '1', params = {}) {
    const response = await apiClient.delete(`/student-health/classes/${classId}/records`, { params });
    return response.data?.data || response.data;
  },
};
