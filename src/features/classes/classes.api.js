import { apiClient } from '@/shared/api/client';

export const classesApi = {
  /**
   * Fetch paginated list of classrooms with filtering
   */
  async list(params = {}) {
    const response = await apiClient.get('/classes', { params });
    return response.data?.data || response.data;
  },

  /**
   * Get single classroom detail
   */
  async getById(id) {
    const response = await apiClient.get(`/classes/${id}`);
    return response.data?.data || response.data;
  },

  /**
   * Create new classroom
   */
  async create(payload) {
    const response = await apiClient.post('/classes', payload);
    return response.data?.data || response.data;
  },

  /**
   * Update classroom
   */
  async update(id, payload) {
    const response = await apiClient.patch(`/classes/${id}`, payload);
    return response.data?.data || response.data;
  },

  /**
   * Delete classroom (soft delete)
   */
  async delete(id) {
    const response = await apiClient.delete(`/classes/${id}`);
    return response.data?.data || response.data;
  },

  /**
   * Assign teacher to classroom
   */
  async assignTeacher(classId, payload) {
    const response = await apiClient.post(`/classes/${classId}/teachers`, {
      classId,
      ...payload,
    });
    return response.data?.data || response.data;
  },

  /**
   * Remove teacher from classroom
   */
  async removeTeacher(classId, teacherId) {
    const response = await apiClient.delete(`/classes/${classId}/teachers/${teacherId}`);
    return response.data?.data || response.data;
  },

  /**
   * Get class roster (current active students)
   */
  async getClassStudents(classId, params = {}) {
    const response = await apiClient.get(`/classes/${classId}/students`, { params });
    return response.data?.data || response.data;
  },

  /**
   * Get eligible students pool for allocation
   */
  async getStudentPool(classId, params = {}) {
    const response = await apiClient.get(`/classes/${classId}/student-pool`, { params });
    return response.data?.data || response.data;
  },

  /**
   * Batch allocate students into classroom
   */
  async allocateStudents(classId, studentIds) {
    const response = await apiClient.post(`/classes/${classId}/students`, { studentIds });
    return response.data?.data || response.data;
  },

  /**
   * Unassign a single student from classroom (BGH only, before semester 1 start date)
   */
  async unassignStudent(classId, studentId) {
    const response = await apiClient.delete(`/classes/${classId}/students/${studentId}`);
    return response.data?.data || response.data;
  },

  /**
   * Batch unassign students from classroom (BGH only, before semester 1 start date)
   */
  async unassignStudents(classId, studentIds) {
    const response = await apiClient.delete(`/classes/${classId}/students`, {
      data: { studentIds },
    });
    return response.data?.data || response.data;
  },

  async removeStudents(classId, studentIds) {
    return this.unassignStudents(classId, studentIds);
  },

  /**
   * Get history sources (years and classes) for student allocation
   */
  async getHistorySources(classId) {
    const response = await apiClient.get(`/classes/${classId}/history-sources`);
    return response.data?.data || response.data;
  },

  /**
   * Get students from past class for historical allocation
   */
  async getHistoryStudents(classId, params = {}) {
    const response = await apiClient.get(`/classes/${classId}/history-students`, { params });
    return response.data?.data || response.data;
  },

  /**
   * Import students from file data into system
   */
  async importStudents(classId, payload) {
    const response = await apiClient.post(`/classes/${classId}/import-students`, payload);
    return response.data?.data || response.data;
  },

  /**
   * Get class teachers and allocation pool
   */
  async getClassTeachers(classId) {
    const response = await apiClient.get(`/classes/${classId}/teachers`);
    return response.data?.data || response.data;
  },

  /**
   * @deprecated All assigned teachers are equal co-teachers. Maintained for backward compatibility.
   */
  async updateTeacherRole(classId, teacherId, isPrimary) {
    const response = await apiClient.patch(`/classes/${classId}/teachers/${teacherId}/role`, {
      isPrimary,
    });
    return response.data?.data || response.data;
  },

  /**
   * Get class transfers (inbound and outbound)
   */
  async getClassTransfers(classId, params = {}) {
    const response = await apiClient.get(`/classes/${classId}/transfers`, { params });
    return response.data?.data || response.data;
  },

  /**
   * Create new class transfer request
   */
  async createTransferRequest(classId, payload) {
    const response = await apiClient.post(`/classes/${classId}/transfers`, payload);
    return response.data?.data || response.data;
  },

  /**
   * Approve or reject class transfer request
   */
  async updateTransferStatus(classId, transferId, payload) {
    const response = await apiClient.patch(
      `/classes/${classId}/transfers/${transferId}`,
      payload,
    );
    return response.data?.data || response.data;
  },

  /**
   * Get all transfer requests across school for Principal / Admin
   */
  async getAllTransfers(params = {}) {
    const response = await apiClient.get('/classes/transfers/all', { params });
    return response.data?.data || response.data;
  },

  /**
   * Update transfer status globally for Principal / Admin
   */
  async updateGlobalTransferStatus(transferId, payload) {
    const response = await apiClient.patch(`/classes/transfers/${transferId}`, payload);
    return response.data?.data || response.data;
  },

  /**
   * Reject transfer request for Principal / Admin (BGH)
   */
  async rejectTransfer(transferId, payload) {
    const response = await apiClient.patch(`/classes/transfers/${transferId}/reject`, payload);
    return response.data?.data || response.data;
  },

  /**
   * Cancel transfer request for Teacher (GV)
   */
  async cancelTransfer(transferId) {
    const response = await apiClient.patch(`/classes/transfers/${transferId}/cancel`);
    return response.data?.data || response.data;
  },

  /**
   * Get single transfer request details
   */
  async getTransferById(transferId) {
    const response = await apiClient.get(`/classes/transfers/${transferId}`);
    return response.data?.data || response.data;
  },

  /**
   * Create transfer request globally (auto detects from_class)
   */
  async createGlobalTransferRequest(payload) {
    const response = await apiClient.post('/classes/transfers', payload);
    return response.data?.data || response.data;
  },

  /**
   * Get complete class dataset for export
   */
  async getClassExportData(classId) {
    const response = await apiClient.get(`/classes/${classId}/export-data`);
    return response.data?.data || response.data;
  },

  /**
   * Get daily comprehensive report for a class on a specific date
   */
  async getDailyReport(classId, params = {}) {
    const response = await apiClient.get(`/classes/${classId}/daily-report`, { params });
    return response.data?.data || response.data;
  },

  /**
   * Update student daily report (attendance, health, assessments)
   */
  async saveStudentDailyReport(classId, payload = {}) {
    const response = await apiClient.put(`/classes/${classId}/daily-report/student`, payload);
    return response.data?.data || response.data;
  },

  /**
   * Batch update students daily report
   */
  async batchSaveDailyReport(classId, payload = {}) {
    const response = await apiClient.post(`/classes/${classId}/daily-report/batch`, payload);
    return response.data?.data || response.data;
  },

  /**
   * Get comprehensive individual student report (health, attendance, daily assessments)
   */
  async getStudentReport(classId, params = {}) {
    const response = await apiClient.get(`/classes/${classId}/student-report`, { params });
    return response.data?.data || response.data;
  },

  /**
   * Complete / graduate student from classroom
   */
  async graduateStudent(classId, studentId) {
    const response = await apiClient.post(`/classes/${classId}/students/${studentId}/graduate`);
    return response.data?.data || response.data;
  },
};



