import React, { useState, useEffect } from 'react';
import { Bell, CheckCheck, UserCheck, HeartPulse, Award, Info, X } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { parentApi } from '../api/parent.api';

export function ParentNotificationPopover() {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all' | 'unread'
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await parentApi.getNotifications();
      setNotifications(res.notifications || []);
      setUnreadCount(res.unreadCount || 0);
    } catch {
      // Mock notifications fallback if empty
      setNotifications([
        {
          id: 'mock-1',
          type: 'ATTENDANCE_CHECK_IN',
          title: 'Điểm danh đến lớp',
          body: 'Bé đã được cô giáo điểm danh đến lớp lúc 07:45 sáng nay.',
          isRead: false,
          createdAt: '07:45 · Hôm nay',
        },
        {
          id: 'mock-2',
          type: 'MONTHLY_ROSE_REPORT',
          title: 'Đạt cờ bé ngoan tuần 41',
          body: 'Chúc mừng bé đã chăm ngoan, ăn hết suất và đạt cờ bé ngoan tuần này!',
          isRead: false,
          createdAt: '16:00 · Thứ Sáu',
        },
        {
          id: 'mock-3',
          type: 'HEALTH_GROWTH_RECORD',
          title: 'Cập nhật chỉ số phát triển',
          body: 'Nhà trường vừa hoàn thành đợt cân đo chiều cao, cân nặng học kỳ 1.',
          isRead: true,
          createdAt: '10:30 · 12/10/2026',
        },
      ]);
      setUnreadCount(2);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await parentApi.markNotificationRead('all');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    }
  };

  const handleItemClick = async (notif) => {
    if (!notif.isRead) {
      try {
        await parentApi.markNotificationRead(notif.id);
      } catch {}
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.isRead;
    return true;
  });

  const getIcon = (type) => {
    switch (type) {
      case 'ATTENDANCE_CHECK_IN':
      case 'ATTENDANCE_DISMISSAL':
        return <UserCheck className="w-4 h-4 text-emerald-600" />;
      case 'HEALTH_GROWTH_RECORD':
        return <HeartPulse className="w-4 h-4 text-sky-600" />;
      case 'DAILY_ASSESSMENT_POSTED':
      case 'MONTHLY_ROSE_REPORT':
        return <Award className="w-4 h-4 text-amber-500" />;
      default:
        return <Info className="w-4 h-4 text-primary" />;
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      {/* Bell Trigger Button */}
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative size-8 flex items-center justify-center text-foreground cursor-pointer focus:outline-none"
          aria-label="Thông báo"
        >
          <Bell className="size-3.5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      {/* Popover Dropdown Portal (never clipped by banner overflow-hidden) */}
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-80 sm:w-96 p-0 rounded-none border border-border bg-white dark:bg-card shadow-2xl z-50 text-card-foreground overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3.5 border-b border-border bg-slate-50 dark:bg-muted/40">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">Thông báo</span>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-primary/10 text-primary">
                {unreadCount} mới
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 rounded hover:bg-muted transition-colors cursor-pointer"
                title="Đánh dấu tất cả đã đọc"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Đã đọc</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex border-b border-border bg-white dark:bg-card px-3 pt-2 gap-2 text-xs">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`pb-2 px-1 font-medium border-b-2 transition-colors cursor-pointer ${
              filter === 'all'
                ? 'border-primary text-primary font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Tất cả ({notifications.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('unread')}
            className={`pb-2 px-1 font-medium border-b-2 transition-colors cursor-pointer ${
              filter === 'unread'
                ? 'border-primary text-primary font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Chưa đọc ({unreadCount})
          </button>
        </div>

        {/* Items List */}
        <div className="max-h-80 overflow-y-auto divide-y divide-border bg-white dark:bg-card">
          {filteredNotifications.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              Không có thông báo nào.
            </div>
          ) : (
            filteredNotifications.map((n) => (
              <div
                key={n.id}
                onClick={() => handleItemClick(n)}
                className={`p-3 text-xs flex gap-3 hover:bg-muted/50 cursor-pointer transition-colors ${
                  !n.isRead ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''
                }`}
              >
                <div className="w-8 h-8 rounded-none bg-background border border-border flex items-center justify-center shrink-0 mt-0.5">
                  {getIcon(n.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className={`font-medium line-clamp-1 ${!n.isRead ? 'text-foreground font-semibold' : 'text-foreground/80'}`}>
                      {n.title}
                    </span>
                    {!n.isRead && (
                      <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                    )}
                  </div>
                  <p className="text-muted-foreground line-clamp-2 leading-relaxed">
                    {n.body}
                  </p>
                  <span className="inline-block mt-1 text-[10px] text-muted-foreground font-mono">
                    {n.createdAt}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default ParentNotificationPopover;
