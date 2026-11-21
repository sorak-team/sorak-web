import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  MoreHorizontalIcon,
  ViewIcon,
} from '@hugeicons/core-free-icons';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { useNotificationsManagementStore } from '../notifications-management.store';
import { cn } from '@/shared/lib/utils';

export function AutomatedNotificationTable({ paginatedNotifications }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isAutomatedLoading = useNotificationsManagementStore((state) => state.isAutomatedLoading);
  const automatedVisibleColumns = useNotificationsManagementStore(
    (state) => state.automatedVisibleColumns
  );

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${hours}:${minutes} ${day}/${month}/${year}`;
  };

  if (!isAutomatedLoading && (!paginatedNotifications || paginatedNotifications.length === 0)) {
    return (
      <div className="w-full border border-border bg-card p-12 text-center text-muted-foreground rounded-none">
        <p className="text-[14px]">{t('notifications.management.noAutomatedFound', 'Chưa có thông báo tự động nào được ghi nhận.')}</p>
      </div>
    );
  }

  return (
    <div
      className="w-full border border-border bg-card rounded-none overflow-x-auto shadow-xs select-none"
      data-name="Automated Notification Table"
    >
      <table className="w-full text-left border-collapse min-w-[850px]">
        {/* Table Header matching NotificationTable */}
        <thead>
          <tr className="h-10 border-b border-border bg-muted/30 text-[13px] font-medium text-foreground">
            <th className="px-4 min-w-[320px] font-medium">
              {t('notifications.title', 'Thông báo')}
            </th>
            {automatedVisibleColumns.recipient && (
              <th className="px-4 min-w-[180px] font-medium">
                {t('notifications.management.colRecipient', 'Người nhận')}
              </th>
            )}
            {automatedVisibleColumns.role && (
              <th className="px-4 min-w-[140px] font-medium">
                {t('account.role', 'Vai trò')}
              </th>
            )}
            {automatedVisibleColumns.createdAt && (
              <th className="px-4 min-w-[160px] font-medium">
                {t('notifications.management.colDispatchDate', 'Thời gian gửi')}
              </th>
            )}
            {automatedVisibleColumns.isRead && (
              <th className="px-4 min-w-[130px] font-medium">
                {t('notifications.management.colReadRate', 'Trạng thái đọc')}
              </th>
            )}
            <th className="px-4 min-w-[80px] w-[80px] text-right font-medium whitespace-nowrap">
              {t('notifications.management.colActions', 'Thao tác')}
            </th>
          </tr>
        </thead>

        {/* Table Body */}
        <tbody className="divide-y divide-border/60">
          {isAutomatedLoading && paginatedNotifications.length === 0 ? (
            Array.from({ length: 6 }).map((_, idx) => (
              <tr key={idx} className="h-[72px] animate-pulse">
                <td className="px-4">
                  <div className="flex flex-col gap-1.5 min-w-0">
                    <div className="h-4 w-44 bg-muted/60 rounded-none" />
                    <div className="h-3 w-20 bg-muted/40 rounded-none" />
                  </div>
                </td>
                {automatedVisibleColumns.recipient && (
                  <td className="px-4"><div className="h-4 w-28 bg-muted/50 rounded-none" /></td>
                )}
                {automatedVisibleColumns.role && (
                  <td className="px-4"><div className="h-4 w-20 bg-muted/50 rounded-none" /></td>
                )}
                {automatedVisibleColumns.createdAt && (
                  <td className="px-4"><div className="h-4 w-28 bg-muted/50 rounded-none" /></td>
                )}
                {automatedVisibleColumns.isRead && (
                  <td className="px-4"><div className="h-4 w-16 bg-muted/50 rounded-none" /></td>
                )}
                <td className="px-4 text-right">
                  <div className="size-7 bg-muted/40 rounded-none ml-auto" />
                </td>
              </tr>
            ))
          ) : (
            paginatedNotifications.map((item) => {
              return (
                <tr
                  key={item.id || item.notificationId}
                  onClick={() => navigate(`/notifications/automated/${item.id || item.notificationId}`)}
                  className="h-[72px] hover:bg-muted/40 transition-colors cursor-pointer group"
                >
                  {/* Column 1: Notification Title & Code */}
                  <td className="px-4 py-3">
                    <div className="flex flex-col min-w-0 leading-tight">
                      <span className="text-[14px] font-medium text-foreground group-hover:text-primary transition-colors truncate max-w-[420px]">
                        {item.title}
                      </span>
                      <span className="text-[12px] text-muted-foreground font-mono mt-1">
                        TB-{item.notificationId || item.id?.slice(0, 6)}
                      </span>
                    </div>
                  </td>

                  {/* Column 2: Recipient */}
                  {automatedVisibleColumns.recipient && (
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-[14px] text-foreground font-normal">
                        {item.recipient?.name || '—'}
                      </span>
                    </td>
                  )}

                  {/* Column 3: Role */}
                  {automatedVisibleColumns.role && (
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-[14px] text-foreground font-normal">
                        {item.recipient?.role || 'Khác'}
                      </span>
                    </td>
                  )}

                  {/* Column 4: Created At */}
                  {automatedVisibleColumns.createdAt && (
                    <td className="px-4 py-3 text-[14px] text-foreground font-normal whitespace-nowrap">
                      {formatDateTime(item.createdAt)}
                    </td>
                  )}

                  {/* Column 5: Read Status */}
                  {automatedVisibleColumns.isRead && (
                    <td className="px-4 py-3 text-[14px] whitespace-nowrap">
                      {item.isRead ? (
                        <span className="text-foreground font-normal">
                          {t('notifications.read', 'Đã xem')}
                        </span>
                      ) : (
                        <span className="text-muted-foreground font-normal">
                          {t('notifications.unread', 'Chưa xem')}
                        </span>
                      )}
                    </td>
                  )}

                  {/* Column 6: Actions */}
                  <td
                    className="px-4 py-3 text-right whitespace-nowrap"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="size-7 inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-none transition-colors cursor-pointer"
                          title={t('notifications.management.colActions', 'Thao tác')}
                        >
                          <HugeiconsIcon icon={MoreHorizontalIcon} size={15} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-[160px] rounded-none">
                        <DropdownMenuItem
                          onClick={() => navigate(`/notifications/automated/${item.id || item.notificationId}`)}
                          className="flex items-center gap-2 text-[13px] cursor-pointer"
                        >
                          <HugeiconsIcon icon={ViewIcon} size={14} />
                          <span>{t('notifications.management.viewDetail', 'Xem chi tiết')}</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

export default AutomatedNotificationTable;
