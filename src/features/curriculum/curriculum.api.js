import { apiClient } from '@/shared/api/client';

export const curriculumApi = {
  /**
   * Get themes overview (grades, cards, donut stats, recent activities)
   */
  async getThemeOverview(params = {}) {
    const response = await apiClient.get('/curriculum/themes/overview', { params });
    return response.data?.data || response.data;
  },

  /**
   * Get theme set detail for a specific year and age group
   */
  async getThemeSetDetail(params = {}) {
    const response = await apiClient.get('/curriculum/themes/detail', { params });
    return response.data?.data || response.data;
  },

  /**
   * Update theme set status (switch between DRAFT and PUBLISHED)
   */
  async updateThemeSetStatus(payload = {}) {
    const response = await apiClient.patch('/curriculum/themes/status', payload);
    return response.data?.data || response.data;
  },

  /**
   * Update theme set details and subThemes list
   */
  async updateThemeSetDetail(payload = {}) {
    const response = await apiClient.put('/curriculum/themes/detail', payload);
    return response.data?.data || response.data;
  },

  /**
   * Get goal banks overview
   */
  async getGoalBanksOverview(params = {}) {
    const response = await apiClient.get('/curriculum/goals/overview', { params });
    return response.data?.data || response.data;
  },

  /**
   * Get goal bank detail (multilevel tree)
   */
  async getGoalBankDetail(params = {}) {
    const response = await apiClient.get('/curriculum/goals/detail', { params });
    return response.data?.data || response.data;
  },

  /**
   * Update goal bank status (switch between DRAFT and PUBLISHED)
   */
  async updateGoalBankStatus(payload = {}) {
    const response = await apiClient.patch('/curriculum/goals/status', payload);
    return response.data?.data || response.data;
  },

  /**
   * Get single educational goal detail with educational contents
   */
  async getSingleGoalDetail(params = {}) {
    const response = await apiClient.get('/curriculum/goals/single-detail', { params });
    return response.data?.data || response.data;
  },

  /**
   * Update educational contents of a specific goal
   */
  async updateGoalContents(payload = {}) {
    const response = await apiClient.put('/curriculum/goals/single-detail/contents', payload);
    return response.data?.data || response.data;
  },

  /**
   * Create an educational goal item
   */
  async createGoal(payload = {}) {
    const response = await apiClient.post('/curriculum/goals/item', payload);
    return response.data?.data || response.data;
  },

  /**
   * Update an educational goal item (title, indicatorCode, domain)
   */
  async updateGoal(payload = {}) {
    const response = await apiClient.put('/curriculum/goals/item', payload);
    return response.data?.data || response.data;
  },

  /**
   * Delete an educational goal item
   */
  async deleteGoal(payload = {}) {
    const response = await apiClient.delete('/curriculum/goals/item', { data: payload });
    return response.data?.data || response.data;
  },

  /**
   * Query AI Assistant for goal bank improvements
   */
  async queryAiAssistant(payload = {}) {
    const response = await apiClient.post('/curriculum/goals/ai-assistant', payload);
    return response.data?.data || response.data;
  },

  /**
   * Xuất Khung Chương trình & Mục tiêu Giáo dục Mầm non đa sheet ra Excel
   */
  async exportFrameworkExcel(params = {}) {
    const response = await apiClient.get('/curriculum/framework/export/excel', {
      params,
      responseType: 'blob',
    });
    return response.data;
  },
};
