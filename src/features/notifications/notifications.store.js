import { create } from 'zustand';

export const initialNotifications = [
  {
    id: '1',
    titleKey: 'notifications.item1Title',
    descKey: 'notifications.item1Desc',
    timeKey: 'notifications.item1Time',
    iconType: 'task',
    read: false,
  },
  {
    id: '2',
    titleKey: 'notifications.item2Title',
    descKey: 'notifications.item2Desc',
    timeKey: 'notifications.item2Time',
    iconType: 'notification',
    read: false,
  },
  {
    id: '3',
    titleKey: 'notifications.item3Title',
    descKey: 'notifications.item3Desc',
    timeKey: 'notifications.item3Time',
    iconType: 'medical',
    read: true,
  },
  {
    id: '4',
    titleKey: 'notifications.item4Title',
    descKey: 'notifications.item4Desc',
    timeKey: 'notifications.item4Time',
    iconType: 'chart',
    read: true,
  },
];

export const useNotificationStore = create((set, get) => ({
  notifications: initialNotifications,

  unreadCount: initialNotifications.filter((n) => !n.read).length,

  markAsRead: (id) => {
    set((state) => {
      const updated = state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n,
      );
      return {
        notifications: updated,
        unreadCount: updated.filter((n) => !n.read).length,
      };
    });
  },

  markAllAsRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    }));
  },
}));
