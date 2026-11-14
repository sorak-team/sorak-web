import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Settings01Icon,
  TaskDone01Icon,
  Notification03Icon,
  MedicalFileIcon,
  Exchange01Icon,
  UserCheck01Icon,
  CalendarCheck01Icon,
  Calendar03Icon,
  Megaphone01Icon,
  Award01Icon,
  CheckmarkCircle02Icon,
  RefreshIcon,
  Cancel01Icon,
  ArrowRight01Icon,
} from '@hugeicons/core-free-icons';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/shared/lib/utils';
import { useAuthStore } from '@/features/auth';
import { useNotificationStore } from './notifications.store';

// Vietnamese relative time formatter
function formatRelativeTime(dateInput) {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '';

  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Vừa xong';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} phút trước`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} giờ trước`;
  if (diffInSeconds < 172800) return 'Hôm qua';

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
}

// Full detail date/time formatter: HH:mm - DD/MM/YYYY
function formatDetailDateTime(dateInput) {
  if (!dateInput) return '—';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${hours}:${minutes} - ${day}/${month}/${year}`;
  } catch {
    return String(dateInput);
  }
}

// Resolver for notification action navigation
function getNotificationAction(item, userRole) {
  if (!item) return null;
  const type = String(item.data?.type || item.type || '').toUpperCase();
  const data = item.data || {};
  const isParent = userRole === 'PARENT';
  const isBGH = userRole === 'PRINCIPAL_BGH' || userRole === 'ADMIN_BGH';

  if (type.startsWith('PICKUP')) {
    if (isParent) {
      return {
        label: 'Xem hồ sơ & ủy quyền đón',
        path: '/parent/profile',
      };
    }
    const classTarget = data.class_public_id || data.class_id;
    return {
      label: 'Xem danh sách đón trẻ',
      path: classTarget ? `/classes/${classTarget}/daily?tab=dismissal` : '/classes',
    };
  }

  if (type.startsWith('TRANSFER')) {
    return {
      label: 'Xem đơn chuyển lớp',
      path: data.transfer_id ? `/transfers/${data.transfer_id}` : '/transfers',
    };
  }

  if (type.startsWith('THEME') || type.startsWith('PLANNING')) {
    if (isBGH) {
      return {
        label: 'Xem khung giáo dục',
        path: '/curriculum',
      };
    }
    const classTarget = data.class_public_id || data.class_id;
    return {
      label: 'Xem kế hoạch giáo dục',
      path: classTarget ? `/classes/${classTarget}/planning` : '/classes',
    };
  }

  if (type.startsWith('ATTENDANCE')) {
    const classTarget = data.class_public_id || data.class_id;
    return {
      label: 'Xem điểm danh lớp',
      path: classTarget ? `/classes/${classTarget}/daily?tab=attendance` : '/classes',
    };
  }

  if (type.startsWith('ACADEMIC_CALENDAR')) {
    return {
      label: 'Xem lịch năm học',
      path: '/school-years',
    };
  }

  if (type === 'SCHOOL_ANNOUNCEMENT' || data.batch_id) {
    if (isBGH) {
      return {
        label: 'Xem chi tiết bản tin',
        path: data.batch_id ? `/notifications/${data.batch_id}` : '/notifications',
      };
    }
  }

  return null;
}

// Smart icon resolver based on notification metadata and type
function resolveNotificationIcon(item) {
  const type = String(item?.data?.type || item?.type || '').toUpperCase();

  if (type.startsWith('TRANSFER')) {
    return {
      icon: Exchange01Icon,
      color: 'text-indigo-600 dark:text-indigo-400',
    };
  }
  if (type.startsWith('PICKUP')) {
    return {
      icon: UserCheck01Icon,
      color: 'text-emerald-600 dark:text-emerald-400',
    };
  }
  if (type.startsWith('THEME') || type.startsWith('PLANNING')) {
    return {
      icon: TaskDone01Icon,
      color: 'text-blue-600 dark:text-blue-400',
    };
  }
  if (type.startsWith('ATTENDANCE')) {
    return {
      icon: CalendarCheck01Icon,
      color: 'text-amber-600 dark:text-amber-400',
    };
  }
  if (type.startsWith('HEALTH') || type.startsWith('GROWTH')) {
    return {
      icon: MedicalFileIcon,
      color: 'text-rose-600 dark:text-rose-400',
    };
  }
  if (type.startsWith('ASSESSMENT') || type.startsWith('BEHAVIOR')) {
    return {
      icon: Award01Icon,
      color: 'text-purple-600 dark:text-purple-400',
    };
  }
  if (type.startsWith('ACADEMIC_CALENDAR')) {
    return {
      icon: Calendar03Icon,
      color: 'text-orange-600 dark:text-orange-400',
    };
  }
  if (type === 'SCHOOL_ANNOUNCEMENT' || item?.data?.batch_id) {
    return {
      icon: Megaphone01Icon,
      color: 'text-blue-600 dark:text-blue-400',
    };
  }

  return {
    icon: Notification03Icon,
    color: 'text-foreground',
  };
}

export function NotificationsPanel({
  open,
  onOpenChange,
  onOpenSettings,
  sidebarCollapsed = false,
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  // 2 Tabs: 'broadcasts' (Bản tin trường) | 'classActivities' (Hoạt động lớp)
  const [activeTab, setActiveTab] = useState('broadcasts');
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [showPushBanner, setShowPushBanner] = useState(() => {
    return (
      localStorage.getItem('sorak_push_dismissed') !== 'true' &&
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission !== 'granted'
    );
  });

  const {
    notifications,
    unreadCount,
    isLoading,
    fetchMyNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotificationStore();

  // Sync real notifications whenever panel opens
  useEffect(() => {
    if (open) {
      fetchMyNotifications();
    }
  }, [open, fetchMyNotifications]);

  // Count unread per tab: Bản tin trường vs Hoạt động lớp
  const unreadCounts = useMemo(() => {
    if (!notifications) return { broadcasts: 0, classActivities: 0 };
    let broadcasts = 0;
    let classActivities = 0;
    notifications.forEach((n) => {
      if (!n.isRead) {
        if (n.data?.batch_id) {
          broadcasts += 1;
        } else {
          classActivities += 1;
        }
      }
    });
    return {
      broadcasts,
      classActivities,
    };
  }, [notifications]);

  // Tab filtering: Bản tin trường (broadcasts) hoặc Hoạt động lớp (automated events)
  const displayedNotifications = useMemo(() => {
    if (!notifications) return [];

    if (activeTab === 'classActivities') {
      return notifications.filter((n) => !n.data?.batch_id);
    }

    // Default: 'broadcasts' (Bản tin trường)
    return notifications.filter((n) => !!n.data?.batch_id);
  }, [notifications, activeTab]);

  const handleMarkAllRead = async () => {
    await markAllAsRead();
    toast.success(t('notifications.toastMarkRead', 'Đã đánh dấu đã đọc tất cả thông báo'));
  };

  const handleDismissPush = () => {
    setShowPushBanner(false);
    localStorage.setItem('sorak_push_dismissed', 'true');
  };

  const handleEnablePush = async () => {
    if ('Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        if (perm === 'granted') {
          toast.success(t('notifications.toastPushEnabled', 'Đã bật thông báo trên trình duyệt'));
        }
      } catch (e) {
        console.error(e);
      }
    }
    handleDismissPush();
  };

  const handleItemClick = (item) => {
    if (!item.isRead) {
      markAsRead(item.id);
    }
    setSelectedNotification(item);
  };

  const handleNavigateToAction = (action) => {
    if (!action?.path) {
      toast.info('Thông báo không có liên kết hành động trực tiếp.');
      return;
    }
    setSelectedNotification(null);
    onOpenChange(false);
    navigate(action.path);
  };

  if (!open && !selectedNotification) return null;

  return (
    <>
      {open && (
        <>
          {/* Backdrop for closing when clicking outside */}
          <div
            className="fixed inset-0 z-40 bg-transparent"
            onClick={() => onOpenChange(false)}
          />

          {/* Floating Notifications Panel */}
          <div
            className={cn(
              'fixed bottom-6 w-[400px] max-w-[calc(100vw-32px)] h-[510px] max-h-[calc(100vh-24px)] bg-card border border-border shadow-2xl rounded-none z-50 flex flex-col select-none overflow-hidden animate-in fade-in zoom-in-95 duration-150',
              sidebarCollapsed ? 'left-[70px]' : 'left-[262px]',
            )}
            data-name="Notifications Panel · Functional"
          >
        {/* Header with Tabs */}
        <div className="h-[45px] px-3 flex items-center justify-between border-b border-border shrink-0">
          <div className="flex items-center gap-4 h-full">
            {/* Tab 1: Bản tin trường */}
            <button
              type="button"
              onClick={() => setActiveTab('broadcasts')}
              className={cn(
                'relative h-full flex items-center gap-1.5 px-1 text-[14px] font-medium transition-colors cursor-pointer',
                activeTab === 'broadcasts'
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <span>{t('notifications.tabSchoolNews', 'Bản tin trường')}</span>
              {unreadCounts.broadcasts > 0 && (
                <span className="px-1.5 py-0.2 text-[10px] font-semibold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 rounded-full">
                  {unreadCounts.broadcasts}
                </span>
              )}
              {activeTab === 'broadcasts' && (
                <div className="absolute bottom-0 inset-x-0 h-[2px] bg-foreground" />
              )}
            </button>

            {/* Tab 2: Hoạt động lớp */}
            <button
              type="button"
              onClick={() => setActiveTab('classActivities')}
              className={cn(
                'relative h-full flex items-center gap-1.5 px-1 text-[14px] font-medium transition-colors cursor-pointer',
                activeTab === 'classActivities'
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <span>{t('notifications.tabClassActivities', 'Hoạt động lớp')}</span>
              {unreadCounts.classActivities > 0 && (
                <span className="px-1.5 py-0.2 text-[10px] font-semibold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 rounded-full">
                  {unreadCounts.classActivities}
                </span>
              )}
              {activeTab === 'classActivities' && (
                <div className="absolute bottom-0 inset-x-0 h-[2px] bg-foreground" />
              )}
            </button>
          </div>

          {/* Header Action Buttons (Refresh & Settings) */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={async () => {
                await fetchMyNotifications();
                toast.success('Đã cập nhật thông báo mới');
              }}
              disabled={isLoading}
              title="Làm mới thông báo"
              className="size-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-none transition-colors cursor-pointer"
            >
              <HugeiconsIcon
                icon={RefreshIcon}
                size={16}
                className={cn(isLoading && 'animate-spin')}
              />
            </button>
            <button
              type="button"
              onClick={() => {
                onOpenChange(false);
                if (onOpenSettings) onOpenSettings();
              }}
              title={t('settings.title', 'Cài đặt')}
              className="size-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-none transition-colors cursor-pointer"
            >
              <HugeiconsIcon icon={Settings01Icon} size={18} />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto divide-y divide-border/40">
          {isLoading && displayedNotifications.length === 0 ? (
            // Skeleton loader
            Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="h-[68px] px-3.5 flex items-center gap-3 animate-pulse">
                <div className="size-8 bg-muted/60 rounded-none shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-3/4 bg-muted/60 rounded-none" />
                  <div className="h-2.5 w-1/2 bg-muted/40 rounded-none" />
                </div>
                <div className="h-2.5 w-12 bg-muted/40 rounded-none shrink-0" />
              </div>
            ))
          ) : displayedNotifications.length === 0 ? (
            // Empty state
            <div className="h-full flex flex-col items-center justify-center p-8 text-center text-muted-foreground select-none">
              <HugeiconsIcon icon={CheckmarkCircle02Icon} size={32} className="text-muted-foreground/60 mb-2" />
              <p className="text-[13px] font-medium text-foreground">
                {activeTab === 'broadcasts'
                  ? 'Chưa có bản tin trường nào'
                  : 'Chưa có thông báo hoạt động lớp nào'}
              </p>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                {activeTab === 'broadcasts'
                  ? 'Các bản tin, thông báo lịch nghỉ và họp chuyên môn sẽ xuất hiện tại đây'
                  : 'Các thông báo điểm danh, đón hộ, chuyển lớp, sức khỏe sẽ xuất hiện tại đây'}
              </p>
            </div>
          ) : (
            displayedNotifications.map((item) => {
              const { icon: ItemIcon, color: iconColor } = resolveNotificationIcon(item);

              return (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className={cn(
                    'h-[68px] px-3.5 flex items-center gap-3 transition-colors cursor-pointer group',
                    !item.isRead
                      ? 'bg-[#fafbff] dark:bg-muted/30 hover:bg-muted/60'
                      : 'bg-card hover:bg-muted/20',
                  )}
                >
                  {/* Icon */}
                  <div className={cn('size-8 flex items-center justify-center shrink-0', iconColor)}>
                    <HugeiconsIcon icon={ItemIcon} size={20} />
                  </div>

                  {/* Title & Body */}
                  <div className="flex-1 min-w-0 pr-1 space-y-0.5">
                    <p
                      className={cn(
                        'text-[13px] truncate',
                        !item.isRead
                          ? 'font-semibold text-foreground group-hover:text-primary transition-colors'
                          : 'font-normal text-foreground/85',
                      )}
                    >
                      {item.title}
                    </p>
                    <p className="text-[12px] text-muted-foreground truncate font-normal leading-normal">
                      {item.body}
                    </p>
                  </div>

                  {/* Time & Unread Indicator */}
                  <div className="flex flex-col items-end gap-1.5 shrink-0 pl-1">
                    <span className="text-[11px] text-muted-foreground font-normal whitespace-nowrap">
                      {formatRelativeTime(item.createdAt)}
                    </span>
                    {!item.isRead && (
                      <span className="size-2 bg-[#1447e6] rounded-full shadow-xs shrink-0" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Push Notification Banner (chỉ hiển thị khi người dùng chưa cấp quyền trình duyệt) */}
        {showPushBanner && (
          <div
            className="p-3 mx-2 my-1 border border-border bg-muted/60 flex flex-col gap-2.5 rounded-none shrink-0"
            data-name="Push Banner"
          >
            <div className="flex gap-2.5 items-start">
              <HugeiconsIcon
                icon={Notification03Icon}
                size={18}
                className="text-foreground shrink-0 mt-0.5"
              />
              <div className="flex flex-col leading-tight">
                <p className="text-[12px] font-medium text-foreground">
                  {t('notifications.pushTitle', 'Bật thông báo để nhận cập nhật mới')}
                </p>
                <p className="text-[12px] text-muted-foreground font-normal">
                  {t('notifications.pushDesc', 'Nhận thông báo về lớp học và phụ huynh')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-0.5">
              <Button
                type="button"
                variant="outline"
                onClick={handleDismissPush}
                className="h-8 flex-1 text-[13px] font-medium border-border bg-background hover:bg-muted text-foreground rounded-none shadow-none cursor-pointer"
              >
                {t('notifications.later', 'Để sau')}
              </Button>
              <Button
                type="button"
                onClick={handleEnablePush}
                className="h-8 flex-1 text-[13px] font-medium bg-[#1447e6] hover:bg-[#1447e6]/90 text-white rounded-none shadow-none cursor-pointer"
              >
                {t('notifications.enablePush', 'Bật thông báo')}
              </Button>
            </div>
          </div>
        )}

        {/* Footer: Mark All Read */}
        <div className="h-[44px] border-t border-border flex items-center justify-center shrink-0 bg-card">
          <button
            type="button"
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
            className={cn(
              'text-[13px] font-medium transition-colors w-full h-full flex items-center justify-center',
              unreadCount > 0
                ? 'text-foreground hover:text-primary cursor-pointer'
                : 'text-muted-foreground/60 cursor-default',
            )}
          >
            {unreadCount > 0
              ? t('notifications.markAllRead', 'Đánh dấu đã đọc tất cả')
              : 'Đã đọc tất cả thông báo'}
          </button>
        </div>
      </div>
    </>
  )}

  {/* Dialog: Chi tiết thông báo */}
  {selectedNotification && (() => {
    const { icon: DetailIcon, color: detailIconColor } = resolveNotificationIcon(selectedNotification);
    const action = getNotificationAction(selectedNotification, user?.role);
    const notifData = selectedNotification.data || {};

    return (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in-0 duration-150"
        onClick={() => setSelectedNotification(null)}
      >
        <div
          className="w-full max-w-md bg-card border border-border shadow-2xl p-5 flex flex-col gap-4 text-foreground rounded-none animate-in zoom-in-95 duration-150 select-text"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header: Icon + Title + Close Button */}
          <div className="flex items-start justify-between gap-3 pb-3 border-b border-border/70">
            <div className="flex items-start gap-3 min-w-0">
              <div className={cn('size-9 flex items-center justify-center shrink-0 border border-border/60 bg-muted/30', detailIconColor)}>
                <HugeiconsIcon icon={DetailIcon} size={20} />
              </div>
              <div className="flex flex-col min-w-0">
                <h3 className="text-[15px] font-semibold text-foreground leading-snug">
                  {selectedNotification.title}
                </h3>
                <span className="text-[11.5px] text-muted-foreground mt-0.5">
                  {formatDetailDateTime(selectedNotification.createdAt)}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedNotification(null)}
              className="size-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer shrink-0"
              title="Đóng (Esc)"
            >
              <HugeiconsIcon icon={Cancel01Icon} size={15} />
            </button>
          </div>

          {/* Body Content */}
          <div className="space-y-3 py-1">
            <div className="p-3 bg-muted/20 border border-border/70 text-[13px] text-foreground leading-relaxed whitespace-pre-wrap">
              {selectedNotification.body || 'Không có nội dung chi tiết.'}
            </div>

            {/* Additional Metadata if present */}
            {(notifData.studentName || notifData.className || notifData.senderName) && (
              <div className="grid grid-cols-2 gap-2 text-[12px] bg-muted/10 border border-border/50 p-2.5">
                {notifData.studentName && (
                  <div>
                    <span className="text-muted-foreground">Học sinh: </span>
                    <strong className="text-foreground font-medium">{notifData.studentName}</strong>
                  </div>
                )}
                {notifData.className && (
                  <div>
                    <span className="text-muted-foreground">Lớp: </span>
                    <strong className="text-foreground font-medium">{notifData.className}</strong>
                  </div>
                )}
                {notifData.senderName && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Người gửi: </span>
                    <strong className="text-foreground font-medium">{notifData.senderName}</strong>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/70">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSelectedNotification(null)}
              className="h-8 px-3.5 text-[12.5px] rounded-none cursor-pointer"
            >
              Đóng
            </Button>
            {action && (
              <Button
                type="button"
                onClick={() => handleNavigateToAction(action)}
                className="h-8 px-3.5 text-[12.5px] font-medium bg-[#1447e6] hover:bg-[#123ec4] text-white rounded-none cursor-pointer flex items-center gap-1.5 shadow-none"
              >
                <span>{action.label}</span>
                <HugeiconsIcon icon={ArrowRight01Icon} size={13} />
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  })()}
</>
  );
}

export default NotificationsPanel;
