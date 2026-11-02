import { apiClient } from '@/shared/api/client';

export const assessmentApi = {
  /**
   * Get weekly assessment timetable and educational criteria
   */
  async getAssessmentOverview(classId = '1', params = {}) {
    const response = await apiClient.get(`/assessment/classes/${classId}`, { params });
    return response.data?.data || response.data;
  },

  /**
   * Get student developmental assessments for a specific slot/date
   */
  async getSlotAssessmentRecords(classId = '1', params = {}) {
    const response = await apiClient.get(`/assessment/classes/${classId}/records`, { params });
    return response.data?.data || response.data;
  },

  /**
   * Save student developmental assessments
   */
  async saveAssessmentRecords(classId = '1', payload = {}) {
    const response = await apiClient.post(`/assessment/classes/${classId}/records`, payload);
    return response.data?.data || response.data;
  },

  /**
   * Clear / delete student developmental assessments for a slot
   */
  async clearAssessmentRecords(classId = '1', payload = {}) {
    const response = await apiClient.delete(`/assessment/classes/${classId}/records`, { data: payload, params: payload });
    return response.data?.data || response.data;
  },

  /**
   * Get Monthly Assessments (Sổ Bé Ngoan - Table 26)
   */
  async getMonthlyAssessments(classId = '1', params = {}) {
    const response = await apiClient.get(`/assessment/classes/${classId}/monthly`, { params });
    return response.data?.data || response.data;
  },

  /**
   * Save Monthly Assessments (Sổ Bé Ngoan - Table 26)
   */
  async saveMonthlyAssessments(classId = '1', payload = {}) {
    const response = await apiClient.post(`/assessment/classes/${classId}/monthly`, payload);
    return response.data?.data || response.data;
  },

  /**
   * Get Semester Assessments (Đánh giá học kỳ - Table 27)
   */
  async getSemesterAssessments(classId = '1', params = {}) {
    const response = await apiClient.get(`/assessment/classes/${classId}/semester`, { params });
    return response.data?.data || response.data;
  },

  /**
   * Save Semester Assessments (Đánh giá học kỳ - Table 27)
   */
  async saveSemesterAssessments(classId = '1', payload = {}) {
    const response = await apiClient.post(`/assessment/classes/${classId}/semester`, payload);
    return response.data?.data || response.data;
  },
};
