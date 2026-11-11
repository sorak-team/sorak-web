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

  /**
   * Xuất sổ bé ngoan ra file Excel
   */
  async exportGoodBehaviorExcel(classId, params = {}) {
    const response = await apiClient.get(`/good-behavior/classes/${classId}/export/excel`, {
      params,
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * Lấy URL mở tab in ấn Phiếu Bé Ngoan khổ A4 cho cả lớp
   */
  getGoodBehaviorPrintUrl(classId, params = {}) {
    const baseURL = import.meta.env.VITE_API_URL || '/api';
    const qs = new URLSearchParams(params).toString();
    return `${baseURL}/good-behavior/classes/${classId}/export/print${qs ? `?${qs}` : ''}`;
  },

  /**
   * Lấy URL mở tab in ấn Phiếu Bé Ngoan cho một học sinh cụ thể
   */
  getStudentGoodBehaviorPrintUrl(studentId, params = {}) {
    const baseURL = import.meta.env.VITE_API_URL || '/api';
    const qs = new URLSearchParams(params).toString();
    return `${baseURL}/good-behavior/students/${studentId}/export/print${qs ? `?${qs}` : ''}`;
  },
};

export default goodBehaviorApi;
