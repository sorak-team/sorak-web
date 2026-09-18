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
};

