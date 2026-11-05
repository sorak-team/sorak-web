import { apiClient } from '@/shared/api/client';

export const academicYearsApi = {
  /**
   * Fetch paginated list of school years
   */
  async list(params = {}) {
    const response = await apiClient.get('/school-years', { params });
    return response.data?.data || response.data;
  },

  /**
   * Fetch current active school year
   */
  async getActive() {
    const response = await apiClient.get('/school-years/active');
    return response.data?.data || response.data;
  },

  /**
   * Get single school year by ID
   */
  async getById(id) {
    const response = await apiClient.get(`/school-years/${id}`);
    return response.data?.data || response.data;
  },

  /**
   * Create a new school year
   */
  async create(payload) {
    const response = await apiClient.post('/school-years', payload);
    return response.data?.data || response.data;
  },

  /**
   * Update existing school year
   */
  async update(id, payload) {
    const response = await apiClient.patch(`/school-years/${id}`, payload);
    return response.data?.data || response.data;
  },

  /**
   * Activate school year
   */
  async activate(id) {
    const response = await apiClient.patch(`/school-years/${id}/activate`);
    return response.data?.data || response.data;
  },

  /**
   * Complete school year
   */
  async complete(id) {
    const response = await apiClient.patch(`/school-years/${id}/complete`);
    return response.data?.data || response.data;
  },

  /**
   * Delete school year
   */
  async delete(id) {
    const response = await apiClient.delete(`/school-years/${id}`);
    return response.data?.data || response.data;
  },

  /**
   * Get transition readiness (4-Step Wizard)
   */
  async getTransitionReadiness(id) {
    const response = await apiClient.get(`/school-years/${id}/transition-readiness`);
    return response.data?.data || response.data;
  },

  /**
   * Close remaining active student enrollments
   */
  async closeRemainingEnrollments(id) {
    const response = await apiClient.post(`/school-years/${id}/close-enrollments`);
    return response.data?.data || response.data;
  },

  /**
   * Execute atomic school year transition
   */
  async executeTransition(id, payload = {}) {
    const response = await apiClient.post(`/school-years/${id}/execute-transition`, payload);
    return response.data?.data || response.data;
  },

  /**
   * List holidays & calendar events
   */
  async listHolidays(id, params = {}) {
    const response = await apiClient.get(`/school-years/${id}/holidays`, { params });
    return response.data?.data || response.data;
  },

  /**
   * Create holiday / event
   */
  async createHoliday(id, payload) {
    const response = await apiClient.post(`/school-years/${id}/holidays`, payload);
    return response.data?.data || response.data;
  },

  /**
   * Bulk import holidays
   */
  async importHolidays(id, items) {
    const response = await apiClient.post(`/school-years/${id}/holidays/import`, { items });
    return response.data?.data || response.data;
  },

  /**
   * Update existing holiday / event
   */
  async updateHoliday(id, holidayId, payload) {
    const response = await apiClient.patch(`/school-years/${id}/holidays/${holidayId}`, payload);
    return response.data?.data || response.data;
  },

  /**
   * Delete holiday / event
   */
  async deleteHoliday(id, holidayId) {
    const response = await apiClient.delete(`/school-years/${id}/holidays/${holidayId}`);
    return response.data?.data || response.data;
  },

  /**
   * Tải file Excel mẫu lịch năm học
   */
  async getCalendarTemplate() {
    const response = await apiClient.get('/school-years/calendar/template', {
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * Upload file Excel để xem trước và kiểm tra lỗi lịch năm học
   */
  async previewCalendarImport(id, file) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post(`/school-years/${id}/calendar/preview`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data?.data || response.data;
  },

  /**
   * Thực thi import lịch năm học từ file Excel
   */
  async importCalendarExcel(id, holidays) {
    const response = await apiClient.post(`/school-years/${id}/calendar/import`, { holidays });
    return response.data?.data || response.data;
  },

  /**
   * Xuất toàn bộ Lịch năm học & Ngày lễ ra file Excel (.xlsx)
   */
  async exportCalendarExcel(id) {
    const response = await apiClient.get(`/school-years/${id}/calendar/export/excel`, {
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * Lấy dữ liệu Thống kê Tổng quan Toàn trường (School-wide Statistics Dashboard)
   */
  async getSchoolOverviewStatistics(schoolYearId) {
    const response = await apiClient.get('/statistics/overview', {
      params: { schoolYearId },
    });
    return response.data?.data || response.data;
  },

  /**
   * Xuất file Excel Báo cáo Thống kê Sĩ số 9 tháng và Đánh giá toàn trường
   */
  async exportSchoolStatisticsExcel(schoolYearId) {
    const response = await apiClient.get('/statistics/export/excel', {
      params: { schoolYearId },
      responseType: 'blob',
    });
    return response.data;
  },
};

