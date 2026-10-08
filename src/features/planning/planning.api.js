import { apiClient } from '@/shared/api/client';

export const planningApi = {
  /**
   * Tab 1: Get Educational Activities for a theme & class
   */
  async getThemeActivities(classId, params = {}) {
    const response = await apiClient.get(`/planning/classes/${classId}/activities`, { params });
    return response.data?.data || response.data;
  },

  /**
   * Tab 1: Save (create or update) an educational activity
   */
  async saveEducationalActivity(classId, activity) {
    const response = await apiClient.post(`/planning/classes/${classId}/activities`, activity);
    return response.data?.data || response.data;
  },

  /**
   * Tab 1: Delete an educational activity
   */
  async deleteEducationalActivity(classId, activityId) {
    const response = await apiClient.delete(`/planning/classes/${classId}/activities/${activityId}`);
    return response.data?.data || response.data;
  },

  /**
   * Tab 2: Get weekly timetable for a class & sub-theme
   */
  async getWeeklyTimetable(classId, params = {}) {
    const response = await apiClient.get(`/planning/classes/${classId}/timetable`, { params });
    return response.data?.data || response.data;
  },

  /**
   * Tab 2: Assign an activity from Tab 1 to a day & routine slot
   */
  async assignActivityToSlot(classId, payload) {
    const response = await apiClient.post(`/planning/classes/${classId}/timetable/assign-activity`, payload);
    return response.data?.data || response.data;
  },

  /**
   * Tab 2: Save (create or update) a slot in weekly timetable directly
   */
  async saveWeeklySlot(classId, slot) {
    const response = await apiClient.post(`/planning/classes/${classId}/timetable/slots`, slot);
    return response.data?.data || response.data;
  },

  /**
   * Tab 2: Reorder activities in weekly timetable
   */
  async reorderWeeklySlots(classId, slots) {
    const response = await apiClient.post(`/planning/classes/${classId}/timetable/reorder`, { slots });
    return response.data?.data || response.data;
  },

  /**
   * Tab 2: Delete a slot in weekly timetable
   */
  async deleteWeeklySlot(classId, slotId) {
    const response = await apiClient.delete(`/planning/classes/${classId}/timetable/slots/${slotId}`);
    return response.data?.data || response.data;
  },

  /**
   * Backward compatibility: Target Allocation
   */
  async getTargetAllocation(classId) {
    const response = await apiClient.get(`/planning/classes/${classId}/allocation`);
    return response.data?.data || response.data;
  },

  async saveTargetAllocation(classId, payload) {
    const response = await apiClient.post(`/planning/classes/${classId}/allocation`, payload);
    return response.data?.data || response.data;
  },

  async publishAllocation(classId) {
    const response = await apiClient.post(`/planning/classes/${classId}/allocation/publish`);
    return response.data?.data || response.data;
  },

  async queryAiAllocation(payload) {
    const response = await apiClient.post('/planning/ai/allocation', payload);
    return response.data?.data || response.data;
  },

  /**
   * AI generate activity lesson plan content
   */
  async generateActivityAi(payload) {
    const response = await apiClient.post('/planning/ai/generate-activity', payload);
    return response.data?.data || response.data;
  },
};

export default planningApi;
