import { create } from 'zustand';
import { notificationsApi } from './notifications.api';

export const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,

  fetchMyNotifications: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await notificationsApi.getMyNotifications({ limit: 50 });
      const items = data?.items || [];
      const unreadCount = typeof data?.unreadCount === 'number'
        ? data.unreadCount
        : items.filter((n) => !n.isRead).length;

      set({
        notifications: items,
        unreadCount,
        isLoading: false,
      });
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
      set({
        isLoading: false,
        error: err.response?.data?.message || 'Không thể tải thông báo',
      });
    }
  },

  markAsRead: async (id) => {
    if (!id) return;

    // Optimistic update
    const prevNotifications = get().notifications;
    const targetItem = prevNotifications.find((n) => n.id === id);
    if (!targetItem || targetItem.isRead) return;

    const updated = prevNotifications.map((n) =>
      n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n
    );
    const newUnreadCount = Math.max(0, get().unreadCount - 1);

    set({
      notifications: updated,
      unreadCount: newUnreadCount,
    });

    try {
      await notificationsApi.markAsRead(id);
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
      // Revert if API fails
      set({
        notifications: prevNotifications,
        unreadCount: get().unreadCount + 1,
      });
    }
  },

  markAllAsRead: async () => {
    const prevNotifications = get().notifications;
    const prevUnreadCount = get().unreadCount;

    if (prevUnreadCount === 0) return;

    // Optimistic update
    const updated = prevNotifications.map((n) => ({
      ...n,
      isRead: true,
      readAt: n.readAt || new Date().toISOString(),
    }));

    set({
      notifications: updated,
      unreadCount: 0,
    });

    try {
      await notificationsApi.markAllAsRead();
    } catch (err) {
      console.error('Failed to mark all as read:', err);
      set({
        notifications: prevNotifications,
        unreadCount: prevUnreadCount,
      });
    }
  },
}));
