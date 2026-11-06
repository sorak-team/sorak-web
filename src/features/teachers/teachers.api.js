import { apiClient } from '@/shared/api/client';

export const teachersApi = {
  /**
   * Fetch paginated list of teachers with filtering
   */
  async list(params = {}) {
    const response = await apiClient.get('/teachers', { params });
    return response.data?.data || response.data;
  },

  /**
   * Get full teacher profile detail with assignments history
   */
  async getById(id) {
    const response = await apiClient.get(`/teachers/${id}`);
    return response.data?.data || response.data;
  },

  /**
   * Create new teacher profile (and bound account)
   */
  async create(payload) {
    const response = await apiClient.post('/teachers', payload);
    return response.data?.data || response.data;
  },

  /**
   * Update teacher profile information
   */
  async update(id, payload) {
    const response = await apiClient.patch(`/teachers/${id}`, payload);
    return response.data?.data || response.data;
  },

  /**
   * Soft delete teacher profile
   */
  async delete(id) {
    const response = await apiClient.delete(`/teachers/${id}`);
    return response.data?.data || response.data;
  },

  /**
   * Assign teacher to homeroom class
   */
  async assignClass(teacherId, payload) {
    const response = await apiClient.post(`/teachers/${teacherId}/classes`, payload);
    return response.data?.data || response.data;
  },

  /**
   * Remove teacher from class assignment
   */
  async removeClass(teacherId, classId) {
    const response = await apiClient.delete(`/teachers/${teacherId}/classes/${classId}`);
    return response.data?.data || response.data;
  },

  /**
   * Tải file Excel mẫu nhập giáo viên
   */
  async getImportTemplate() {
    const response = await apiClient.get('/teachers/import/template', {
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * Upload file Excel để xem trước và kiểm tra lỗi giáo viên
   */
  async previewImport(file) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/teachers/import/preview', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data?.data || response.data;
  },

  /**
   * Thực thi import danh sách giáo viên
   */
  async importTeachers(teachers) {
    const response = await apiClient.post('/teachers/import', { teachers });
    return response.data?.data || response.data;
  },

  /**
   * Xuất danh sách giáo viên ra file Excel
   */
  async exportExcel(params = {}) {
    const response = await apiClient.get('/teachers/export/excel', {
      params,
      responseType: 'blob',
    });
    return response.data;
  },
};
