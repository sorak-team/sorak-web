import { apiClient } from '@/shared/api/client';

export const studentsApi = {
  /**
   * Fetch paginated list of students with search & filter params
   */
  async list(params = {}) {
    const response = await apiClient.get('/students', { params });
    return response.data?.data || response.data;
  },

  /**
   * Get full student profile detail with parents and enrollment history
   */
  async getById(id) {
    const response = await apiClient.get(`/students/${id}`);
    return response.data?.data || response.data;
  },

  /**
   * Create new student profile (with parent accounts and initial enrollment)
   */
  async create(payload) {
    const response = await apiClient.post('/students', payload);
    return response.data?.data || response.data;
  },

  /**
   * Update student profile information
   */
  async update(id, payload) {
    const response = await apiClient.patch(`/students/${id}`, payload);
    return response.data?.data || response.data;
  },

  /**
   * Soft delete student profile
   */
  async delete(id) {
    const response = await apiClient.delete(`/students/${id}`);
    return response.data?.data || response.data;
  },

  /**
   * Enroll student into a class
   */
  async enroll(id, payload) {
    const response = await apiClient.post(`/students/${id}/enroll`, payload);
    return response.data?.data || response.data;
  },

  /**
   * Transfer student between classrooms
   */
  async transfer(id, payload) {
    const response = await apiClient.post(`/students/${id}/transfer`, payload);
    return response.data?.data || response.data;
  },

  /**
   * Add a parent/guardian
   */
  async addParent(studentId, payload) {
    const response = await apiClient.post(`/students/${studentId}/parents`, payload);
    return response.data?.data || response.data;
  },

  /**
   * Update a parent/guardian
   */
  async updateParent(studentId, parentId, payload) {
    const response = await apiClient.patch(`/students/${studentId}/parents/${parentId}`, payload);
    return response.data?.data || response.data;
  },

  /**
   * Delete a parent/guardian
   */
  async deleteParent(studentId, parentId) {
    const response = await apiClient.delete(`/students/${studentId}/parents/${parentId}`);
    return response.data?.data || response.data;
  },

  /**
   * Tải file Excel mẫu nhập học sinh
   */
  async getImportTemplate() {
    const response = await apiClient.get('/students/import/template', {
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * Upload file Excel để xem trước và kiểm tra lỗi
   */
  async previewImport(file) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/students/import/preview', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data?.data || response.data;
  },

  /**
   * Thực thi import danh sách học sinh
   */
  async importStudents(students) {
    const response = await apiClient.post('/students/import', { students });
    return response.data?.data || response.data;
  },

  /**
   * Xuất danh sách học sinh ra file Excel
   */
  async exportExcel(params = {}) {
    const response = await apiClient.get('/students/export/excel', {
      params,
      responseType: 'blob',
    });
    return response.data;
  },
};

export default studentsApi;
