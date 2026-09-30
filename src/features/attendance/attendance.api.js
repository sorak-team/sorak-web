import { apiClient } from '@/shared/api/client';

export const attendanceApi = {
  /**
   * Get teacher timetable and attendance overview for a class
   */
  async getTimetableOverview(classId = '1', params = {}) {
    const response = await apiClient.get(`/attendance/classes/${classId}/timetable`, { params });
    return response.data?.data || response.data;
  },

  /**
   * Update student attendance records
   */
  async updateAttendance(classId = '1', payload = {}) {
    const response = await apiClient.post(`/attendance/classes/${classId}/records`, payload);
    return response.data?.data || response.data;
  },
  /**
   * Delete / clear attendance records
   */
  async clearAttendance(classId = '1', payload = {}) {
    const response = await apiClient.delete(`/attendance/classes/${classId}/records`, { data: payload, params: payload });
    return response.data?.data || response.data;
  },

  /**
   * Get child dismissal overview for a class and date
   */
  async getDismissalOverview(classId = '1', params = {}) {
    const response = await apiClient.get(`/attendance/classes/${classId}/dismissal`, { params });
    return response.data?.data || response.data;
  },

  /**
   * Record child dismissal (check-out)
   */
  async recordDismissal(classId = '1', payload = {}) {
    const response = await apiClient.post(`/attendance/classes/${classId}/dismissal`, payload);
    return response.data?.data || response.data;
  },

  /**
   * Cancel / undo child dismissal
   */
  async cancelDismissal(classId = '1', studentId, params = {}) {
    const response = await apiClient.delete(`/attendance/classes/${classId}/dismissal/${studentId}`, { params });
    return response.data?.data || response.data;
  },

  /**
   * Clear all child dismissals for class and date
   */
  async clearAllDismissals(classId = '1', params = {}) {
    const response = await apiClient.delete(`/attendance/classes/${classId}/dismissal`, { params });
    return response.data?.data || response.data;
  },

  /**
   * Get pickup authorizations for a class
   */
  async getPickupAuthorizations(classId = '1', params = {}) {
    const response = await apiClient.get(`/attendance/classes/${classId}/authorizations`, { params });
    return response.data?.data || response.data;
  },

  /**
   * Create a pickup authorization
   */
  async createPickupAuthorization(classId = '1', payload = {}) {
    const response = await apiClient.post(`/attendance/classes/${classId}/authorizations`, payload);
    return response.data?.data || response.data;
  },

  /**
   * Approve a pickup authorization
   */
  async approvePickupAuthorization(classId = '1', authId) {
    const response = await apiClient.patch(`/attendance/classes/${classId}/authorizations/${authId}/approve`);
    return response.data?.data || response.data;
  },

  /**
   * Reject a pickup authorization
   */
  async rejectPickupAuthorization(classId = '1', authId, payload = {}) {
    const response = await apiClient.patch(`/attendance/classes/${classId}/authorizations/${authId}/reject`, payload);
    return response.data?.data || response.data;
  },
};
