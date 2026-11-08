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
   * Tab 2: Swap positions of two slots in weekly timetable (Đổi chỗ)
   */
  async swapWeeklySlots(classId, { sourceSlotId, targetSlotId }) {
    const response = await apiClient.post(`/planning/classes/${classId}/timetable/swap-slots`, {
      sourceSlotId,
      targetSlotId,
    });
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
   * Theme Plan Submission & Approval Workflow
   */
  async getClassThemePlansSummary(classId) {
    const response = await apiClient.get(`/planning/classes/${classId}/theme-plan/summary`);
    return response.data?.data || response.data;
  },

  async getThemePlanStatus(classId, themeId) {
    const response = await apiClient.get(`/planning/classes/${classId}/theme-plan/status`, {
      params: { themeId },
    });
    return response.data?.data || response.data;
  },

  async getThemePlanAppraisalPreview(classId, params = {}) {
    const response = await apiClient.get(`/planning/classes/${classId}/theme-plan/preview`, { params });
    return response.data?.data || response.data;
  },

  async submitThemePlan(classId, payload) {
    const response = await apiClient.post(`/planning/classes/${classId}/theme-plan/submit`, payload);
    return response.data?.data || response.data;
  },

  async approveThemePlan(classId, payload) {
    const response = await apiClient.post(`/planning/classes/${classId}/theme-plan/approve`, payload);
    return response.data?.data || response.data;
  },

  async requestThemePlanRevision(classId, payload) {
    const response = await apiClient.post(`/planning/classes/${classId}/theme-plan/revision-request`, payload);
    return response.data?.data || response.data;
  },

  async getThemePlanMatrix(params = {}) {
    const response = await apiClient.get('/planning/submissions/matrix', { params });
    return response.data?.data || response.data;
  },

  async getThemePlanSubmissions(params = {}) {
    const response = await apiClient.get('/planning/submissions', { params });
    return response.data?.data || response.data;
  },

  /**
   * AI generate activity lesson plan content
   */
  async generateActivityAi(payload) {
    const response = await apiClient.post('/planning/ai/generate-activity', payload);
    return response.data?.data || response.data;
  },

  // ==========================================================================
  // ITERATION 3: EXPORT THEME PLAN, THEME TEACHING PLAN & WEEKLY PLAN
  // ==========================================================================

  /**
   * Xuất kế hoạch phân phối chủ đề 35 tuần ra file Excel
   */
  async exportThemePlanExcel(params = {}) {
    const response = await apiClient.get('/planning/themes/export/excel', {
      params,
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * Lấy URL mở tab in ấn A4 Kế hoạch phân phối chủ đề 35 tuần
   */
  getThemePlanPrintUrl(params = {}) {
    const baseURL = import.meta.env.VITE_API_URL || '/api';
    const qs = new URLSearchParams(params).toString();
    return `${baseURL}/planning/themes/export/print${qs ? `?${qs}` : ''}`;
  },

  /**
   * Lấy URL mở tab in ấn A4 Kế hoạch giáo dục theo chủ đề nhánh của lớp
   */
  getThemeTeachingPlanPrintUrl(classId, themeId) {
    const baseURL = import.meta.env.VITE_API_URL || '/api';
    return `${baseURL}/planning/classes/${classId}/themes/${themeId || ''}/export/print`;
  },

  /**
   * Xuất Kế hoạch phân bổ mục tiêu và kế hoạch giáo dục theo chủ đề ra file Excel (.xlsx)
   */
  async exportThemeTeachingPlanExcel(classId, themeId) {
    const url = themeId
      ? `/planning/classes/${classId}/themes/${themeId}/export/excel`
      : `/planning/classes/${classId}/themes/export/excel`;
    const response = await apiClient.get(url, {
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * Lấy URL mở tab in ấn A4 Kế hoạch giáo dục tuần
   */
  getWeeklyTeachingPlanPrintUrl(classId, weekNumber) {
    const baseURL = import.meta.env.VITE_API_URL || '/api';
    return `${baseURL}/planning/classes/${classId}/weeks/${weekNumber || 1}/export/print`;
  },

  /**
   * Xuất kế hoạch giáo dục tuần ra file Excel
   */
  async exportWeeklyTeachingPlanExcel(classId, weekNumber) {
    const response = await apiClient.get(`/planning/classes/${classId}/weeks/${weekNumber || 1}/export/excel`, {
      responseType: 'blob',
    });
    return response.data;
  },
};

export default planningApi;
