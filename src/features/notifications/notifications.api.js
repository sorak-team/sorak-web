import { apiClient } from '@/shared/api/client';

export const notificationsApi = {
  /**
   * Get paginated notifications for current user
   */
  async getMyNotifications(params = {}) {
    const response = await apiClient.get('/notifications/my', { params });
    return response.data?.data || response.data;
  },

  /**
   * Mark single notification as read
   */
  async markAsRead(id) {
    const response = await apiClient.patch(`/notifications/${id}/read`);
    return response.data?.data || response.data;
  },

  /**
   * Mark all notifications as read for current user
   */
  async markAllAsRead() {
    const response = await apiClient.patch('/notifications/read-all');
    return response.data?.data || response.data;
  },
};

