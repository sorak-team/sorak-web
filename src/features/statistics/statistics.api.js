import { apiClient } from '@/shared/api/client';

export const statisticsApi = {
  /**
   * Xuất báo cáo thống kê tổng kết toàn trường (4 sheet đa chiều) ra Excel
   */
  async exportSchoolStatisticsExcel(params = {}) {
    const response = await apiClient.get('/statistics/export/excel', {
      params,
      responseType: 'blob',
    });
    return response.data;
  },
};

export default statisticsApi;
