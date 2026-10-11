import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Settings01Icon,
  TaskDone01Icon,
  Notification03Icon,
  MedicalFileIcon,
  PieChartIcon,
} from '@hugeicons/core-free-icons';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/shared/lib/utils';

import { useNotificationStore } from './notifications.store';

const iconMap = {
  task: TaskDone01Icon,
  notification: Notification03Icon,
  medical: MedicalFileIcon,
  chart: PieChartIcon,
};

export function NotificationsPanel({
  open,
  onOpenChange,
  onOpenSettings,
  sidebarCollapsed = false,
}) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('inbox');
  const [showPushBanner, setShowPushBanner] = useState(true);

  const notifications = useNotificationStore((state) => state.notifications);
  const markAsRead = useNotificationStore((state) => state.markAsRead);
  const markAllAsRead = useNotificationStore((state) => state.markAllAsRead);

  if (!open) return null;

  const handleMarkAllRead = () => {
    markAllAsRead();
    toast.success(t('notifications.toastMarkRead'));
  };

  const handleEnablePush = () => {
    setShowPushBanner(false);
    toast.success(t('notifications.toastPushEnabled'));
  };

  return (
    <>
      {/* Backdrop for closing when clicking outside */}
      <div
        className="fixed inset-0 z-40 bg-transparent"
        onClick={() => onOpenChange(false)}
      />

      {/* Floating Notifications Panel matching Figma frame 4097:24757 */}
      <div
        className={cn(
          'fixed bottom-6 w-[400px] max-w-[calc(100vw-32px)] h-[510px] max-h-[calc(100vh-24px)] bg-card border border-border shadow-2xl rounded-none z-50 flex flex-col select-none overflow-hidden animate-in fade-in zoom-in-95 duration-150',
          sidebarCollapsed ? 'left-[70px]' : 'left-[262px]',
        )}
        data-node-id="4097:24757"
        data-name="Notifications Panel · Open"
      >
        {/* Header with Tabs */}
        <div className="h-[45px] px-3 flex items-center justify-between border-b border-border shrink-0">
          <div className="flex items-center gap-4 h-full">
            {/* Tab: Hộp thư */}
            <button
              type="button"
              onClick={() => setActiveTab('inbox')}
              className={cn(
                'relative h-full flex items-center px-1 text-[14px] font-medium transition-colors cursor-pointer',
                activeTab === 'inbox'
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <span>{t('notifications.tabInbox')}</span>
              {activeTab === 'inbox' && (
                <div className="absolute bottom-0 inset-x-0 h-[2px] bg-foreground" />
              )}
            </button>

            {/* Tab: Đã lưu trữ */}
            <button
              type="button"
              onClick={() => setActiveTab('archived')}
              className={cn(
                'relative h-full flex items-center px-1 text-[14px] font-medium transition-colors cursor-pointer',
                activeTab === 'archived'
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <span>{t('notifications.tabArchived')}</span>
              {activeTab === 'archived' && (
                <div className="absolute bottom-0 inset-x-0 h-[2px] bg-foreground" />
              )}
            </button>

            {/* Tab: Nhắc việc */}
            <button
              type="button"
              onClick={() => setActiveTab('tasks')}
              className={cn(
                'relative h-full flex items-center px-1 text-[14px] font-medium transition-colors cursor-pointer',
                activeTab === 'tasks'
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <span>{t('notifications.tabTasks')}</span>
              {activeTab === 'tasks' && (
                <div className="absolute bottom-0 inset-x-0 h-[2px] bg-foreground" />
              )}
            </button>
          </div>

          {/* Settings Icon Button */}
          <button
            type="button"
            onClick={() => {
              onOpenChange(false);
              if (onOpenSettings) onOpenSettings();
            }}
            title={t('settings.title')}
            className="size-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-none transition-colors cursor-pointer"
            data-node-id="4097:24775"
          >
            <HugeiconsIcon icon={Settings01Icon} size={18} />
          </button>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto divide-y divide-border/40">
          {notifications.map((item) => {
            const Icon = iconMap[item.iconType] || Notification03Icon;
            return (
              <div
                key={item.id}
                onClick={() => markAsRead(item.id)}
                className={cn(
                  'h-[68px] px-3.5 flex items-center gap-3 transition-colors cursor-pointer',
                  !item.read
                    ? 'bg-[#fafbff] dark:bg-muted/40 hover:bg-muted/60'
                    : 'bg-card hover:bg-muted/30',
                )}
              >
                {/* Icon */}
                <div className="size-8 flex items-center justify-center text-foreground shrink-0">
                  <HugeiconsIcon icon={Icon} size={20} />
                </div>

                {/* Title & Desc */}
                <div className="flex-1 min-w-0 pr-1 space-y-0.5">
                  <p
                    className={cn(
                      'text-[12px] truncate',
                      !item.read
                        ? 'font-semibold text-foreground'
                        : 'font-normal text-foreground/85',
                    )}
                  >
                    {t(item.titleKey)}
                  </p>
                  <p className="text-[12px] text-muted-foreground truncate font-normal">
                    {t(item.descKey)}
                  </p>
                </div>

                {/* Time & Unread dot */}
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className="text-[11px] text-muted-foreground font-normal">
                    {t(item.timeKey)}
                  </span>
                  {!item.read && (
                    <span className="size-2 bg-primary rounded-full shadow-xs" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Push Notification Banner */}
        {showPushBanner && (
          <div
            className="p-3 mx-2 my-1 border border-border bg-muted/60 flex flex-col gap-2.5 rounded-none shrink-0"
            data-node-id="4097:24819"
          >
            <div className="flex gap-2.5 items-start">
              <HugeiconsIcon
                icon={Notification03Icon}
                size={18}
                className="text-foreground shrink-0 mt-0.5"
              />
              <div className="flex flex-col leading-tight">
                <p className="text-[12px] font-medium text-foreground">
                  {t('notifications.pushTitle')}
                </p>
                <p className="text-[12px] text-muted-foreground font-normal">
                  {t('notifications.pushDesc')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-0.5">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPushBanner(false)}
                className="h-8 flex-1 text-[14px] font-medium border-border bg-background hover:bg-muted text-foreground rounded-none shadow-none cursor-pointer"
              >
                {t('notifications.later')}
              </Button>
              <Button
                type="button"
                onClick={handleEnablePush}
                className="h-8 flex-1 text-[14px] font-medium bg-[#1447e6] hover:bg-[#1447e6]/90 text-white rounded-none shadow-none cursor-pointer"
              >
                {t('notifications.enablePush')}
              </Button>
            </div>
          </div>
        )}

        {/* Footer: Mark All Read */}
        <div className="h-[44px] border-t border-border flex items-center justify-center shrink-0">
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="text-[14px] font-medium text-foreground hover:text-primary transition-colors cursor-pointer w-full h-full flex items-center justify-center"
          >
            {t('notifications.markAllRead')}
          </button>
        </div>
      </div>
    </>
  );
}
