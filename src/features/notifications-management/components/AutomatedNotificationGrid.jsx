import React from 'react';
import { useNavigate } from 'react-router-dom';
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

export function AutomatedNotificationGrid({ paginatedNotifications }) {
  const navigate = useNavigate();
  const isAutomatedLoading = useNotificationsManagementStore((state) => state.isAutomatedLoading);

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
        <p className="text-[14px]">Chưa có thông báo tự động nào được ghi nhận.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 select-none" data-name="Automated Notification Grid">
      {isAutomatedLoading && paginatedNotifications.length === 0 ? (
        Array.from({ length: 4 }).map((_, idx) => (
          <div
            key={idx}
            className="border border-border bg-card p-5 rounded-none shadow-xs animate-pulse flex flex-col justify-between gap-4 h-[160px]"
          >
            <div className="flex flex-col gap-2">
              <div className="h-4 w-48 bg-muted/60 rounded-none" />
              <div className="h-3 w-72 bg-muted/40 rounded-none" />
            </div>
            <div className="flex items-center justify-between border-t border-border/60 pt-3">
              <div className="h-3.5 w-24 bg-muted/50 rounded-none" />
              <div className="h-3.5 w-20 bg-muted/50 rounded-none" />
            </div>
          </div>
        ))
      ) : (
        paginatedNotifications.map((item) => {
          return (
            <div
              key={item.id || item.notificationId}
              onClick={() => navigate(`/notifications/automated/${item.id || item.notificationId}`)}
              className="border border-border bg-card p-5 rounded-none shadow-xs flex flex-col justify-between gap-3 hover:border-primary/50 transition-colors cursor-pointer group"
            >
              {/* Top Row: Event badge & Actions */}
              <div className="flex items-start justify-between gap-2">
                <span className="inline-flex items-center px-1.5 py-0.5 text-[11px] font-normal bg-muted text-muted-foreground rounded-none">
                  {item.categoryLabel || 'Hệ thống'}
                </span>

                <div onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="size-7 inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-none transition-colors cursor-pointer"
                        title="Thao tác"
                      >
                        <HugeiconsIcon icon={MoreHorizontalIcon} size={15} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[150px] rounded-none">
                      <DropdownMenuItem
                        onClick={() => navigate(`/notifications/automated/${item.id || item.notificationId}`)}
                        className="flex items-center gap-2 text-[13px] cursor-pointer"
                      >
                        <HugeiconsIcon icon={ViewIcon} size={14} />
                        <span>Xem chi tiết</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Middle: Title & Body */}
              <div className="flex flex-col gap-1 flex-1 min-w-0">
                <h3 className="text-[14px] font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                  {item.title}
                </h3>
                <p className="text-[12px] text-muted-foreground line-clamp-2 font-normal leading-relaxed">
                  {item.body}
                </p>
              </div>

              {/* Bottom Row: Recipient & Time */}
              <div className="flex items-center justify-between border-t border-border/60 pt-3 text-[12px]">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="font-medium text-foreground">
                    {item.recipient?.name || '—'}
                  </span>
                  <span className="text-muted-foreground">
                    ({item.recipient?.role || 'Khác'})
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-muted-foreground font-mono">
                    {formatDateTime(item.createdAt)}
                  </span>
                  <span
                    className={cn(
                      'text-[11px] font-medium',
                      item.isRead ? 'text-emerald-700 dark:text-emerald-400' : 'text-muted-foreground'
                    )}
                  >
                    {item.isRead ? 'Đã đọc' : 'Chưa đọc'}
                  </span>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

export default AutomatedNotificationGrid;

