import React from 'react';
import { useNavigate } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  MoreHorizontalIcon,
  ViewIcon,
  PencilEdit02Icon,
  Delete02Icon,
} from '@hugeicons/core-free-icons';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useNotificationsManagementStore } from '../notifications-management.store';
import { cn } from '@/shared/lib/utils';

export function NotificationGrid({ paginatedBroadcasts }) {
  const navigate = useNavigate();
  const isLoading = useNotificationsManagementStore((state) => state.isLoading);
  const openEditDrawer = useNotificationsManagementStore((state) => state.openEditDrawer);
  const openDeleteDialog = useNotificationsManagementStore((state) => state.openDeleteDialog);

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getScopeLabel = (scope, grade) => {
    switch (scope) {
      case 'ALL':
        return 'Toàn trường';
      case 'ALL_TEACHERS':
        return 'Tất cả Giáo viên';
      case 'ALL_PARENTS':
        return 'Tất cả Phụ huynh';
      case 'GRADE':
        return `Khối ${grade || ''}`;
      case 'CLASS':
        return 'Theo lớp học';
      case 'INDIVIDUAL':
        return 'Cá nhân';
      default:
        return scope;
    }
  };

  if (!isLoading && (!paginatedBroadcasts || paginatedBroadcasts.length === 0)) {
    return (
      <div className="w-full border border-border bg-card p-12 text-center text-muted-foreground rounded-none">
        <p className="text-[14px]">Không tìm thấy bản tin nào phù hợp.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 select-none" data-name="Notification Grid">
      {isLoading && paginatedBroadcasts.length === 0 ? (
        Array.from({ length: 4 }).map((_, idx) => (
          <div
            key={idx}
            className="border border-border bg-card p-5 rounded-none shadow-xs animate-pulse flex flex-col justify-between gap-4 h-[180px]"
          >
            <div className="flex items-center gap-3.5">
              <div className="size-10 rounded-none bg-muted/60" />
              <div className="flex flex-col gap-2 flex-1">
                <div className="h-4 w-40 bg-muted/60 rounded-none" />
                <div className="h-3 w-28 bg-muted/40 rounded-none" />
              </div>
            </div>
            <div className="h-6 w-32 bg-muted/40 rounded-none" />
          </div>
        ))
      ) : (
        paginatedBroadcasts.map((item) => {
          const total = item.totalRecipients || 0;
          const read = item.readCount || 0;
          const percentage = total > 0 ? Math.round((read / total) * 100) : 0;

          return (
            <div
              key={item.batchId}
              className="border border-border bg-card p-5 rounded-none shadow-xs flex flex-col justify-between gap-4 hover:border-border/80 transition-all group"
            >
              {/* Top: Title & Code */}
              <div
                onClick={() => navigate(`/notifications/${item.batchId}`)}
                className="flex flex-col min-w-0 leading-tight cursor-pointer"
              >
                <h3 className="text-[15px] font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                  {item.title}
                </h3>
                <span className="text-[12px] text-muted-foreground font-mono mt-0.5 truncate">
                  {item.batchId ? item.batchId.substring(0, 8).toUpperCase() : 'BT-SORAK'} · {getScopeLabel(item.targetScope, item.targetGrade)}
                </span>
              </div>

              {/* Middle: Body preview */}
              <p className="text-[13px] text-muted-foreground line-clamp-2 leading-relaxed">
                {item.body}
              </p>

              {/* Bottom: Status, Stats & Actions */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/60 text-[13px]">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center justify-center px-2 py-0.5 text-[12px] font-medium bg-secondary text-secondary-foreground rounded-none">
                    {item.status === 'SCHEDULED' ? 'Đã lên lịch' : 'Đã phát hành'}
                  </span>
                  <span className="text-[12px] text-muted-foreground">
                    {read}/{total} đã xem ({percentage}%)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[12px] text-muted-foreground">
                    {formatDateTime(item.scheduledAt || item.createdAt)}
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="size-7 inline-flex items-center justify-center rounded-none text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                      >
                        <HugeiconsIcon icon={MoreHorizontalIcon} size={15} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="w-44 p-1 rounded-none border border-border bg-card shadow-xl z-50 text-foreground"
                    >
                      <DropdownMenuItem
                        onClick={() => navigate(`/notifications/${item.batchId}`)}
                        className="flex items-center gap-2 h-8 px-2 text-[13px] cursor-pointer rounded-none hover:bg-muted/60 focus:bg-muted/60"
                      >
                        <HugeiconsIcon icon={ViewIcon} size={15} />
                        <span>Xem chi tiết</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => openEditDrawer(item)}
                        className="flex items-center gap-2 h-8 px-2 text-[13px] cursor-pointer rounded-none hover:bg-muted/60 focus:bg-muted/60"
                      >
                        <HugeiconsIcon icon={PencilEdit02Icon} size={15} />
                        <span>Chỉnh sửa</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="my-1 border-t border-border" />
                      <DropdownMenuItem
                        onClick={() => openDeleteDialog(item.batchId)}
                        className="flex items-center gap-2 h-8 px-2 text-[13px] text-destructive hover:text-destructive hover:bg-destructive/10 focus:text-destructive focus:bg-destructive/10 data-[highlighted]:text-destructive data-[highlighted]:bg-destructive/10 cursor-pointer rounded-none"
                      >
                        <HugeiconsIcon icon={Delete02Icon} size={15} />
                        <span>Thu hồi bản tin</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

export default NotificationGrid;

