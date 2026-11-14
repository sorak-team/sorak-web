import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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

export function NotificationTable({ paginatedBroadcasts }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isLoading = useNotificationsManagementStore((state) => state.isLoading);
  const visibleColumns = useNotificationsManagementStore((state) => state.visibleColumns);
  const openEditDrawer = useNotificationsManagementStore((state) => state.openEditDrawer);
  const openDeleteDialog = useNotificationsManagementStore((state) => state.openDeleteDialog);

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const getScopeLabel = (scope, grade, classIds = []) => {
    switch (scope) {
      case 'ALL':
        return 'Toàn trường';
      case 'ALL_TEACHERS':
        return 'Tất cả Giáo viên';
      case 'ALL_PARENTS':
        return 'Tất cả Phụ huynh';
      case 'GRADE': {
        const gradeMap = {
          NHA_TRE: 'Nhà trẻ',
          MAM: 'Khối Mầm',
          CHOI: 'Khối Chồi',
          LA: 'Khối Lá',
        };
        return gradeMap[grade] || `Khối ${grade || ''}`;
      }
      case 'CLASS':
        return classIds.length > 1 ? `${classIds.length} lớp học` : 'Theo lớp học';
      case 'INDIVIDUAL':
        return 'Cá nhân';
      default:
        return scope;
    }
  };

  const getStatusBadge = (status) => {
    if (status === 'SCHEDULED') {
      return (
        <span className="inline-flex items-center justify-center px-2 py-0.5 text-[12px] font-medium bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 rounded-none">
          Đã lên lịch
        </span>
      );
    }
    return (
      <span className="inline-flex items-center justify-center px-2 py-0.5 text-[12px] font-medium bg-secondary text-secondary-foreground rounded-none">
        Đã phát hành
      </span>
    );
  };

  if (!isLoading && (!paginatedBroadcasts || paginatedBroadcasts.length === 0)) {
    return (
      <div className="w-full border border-border bg-card p-12 text-center text-muted-foreground rounded-none">
        <p className="text-[14px]">Không tìm thấy bản tin nào phù hợp.</p>
      </div>
    );
  }

  return (
    <div
      className="w-full border border-border bg-card rounded-none overflow-x-auto shadow-xs select-none"
      data-name="Notification Table · Component-based"
    >
      <table className="w-full text-left border-collapse min-w-[900px]">
        {/* Table Header strictly matching StudentTable */}
        <thead>
          <tr className="h-10 border-b border-border bg-muted/30 text-[13px] font-medium text-foreground">
            <th className="px-3 min-w-[260px] font-medium">
              Bản tin
            </th>
            {visibleColumns.targetScope && (
              <th className="px-3 min-w-[140px] font-medium">
                Phạm vi gửi
              </th>
            )}
            {visibleColumns.status && (
              <th className="px-3 min-w-[120px] font-medium">
                Trạng thái
              </th>
            )}
            {visibleColumns.dispatchTime && (
              <th className="px-3 min-w-[140px] font-medium">
                Ngày phát hành
              </th>
            )}
            {visibleColumns.readRate && (
              <th className="px-3 min-w-[140px] font-medium">
                Tỷ lệ đã đọc
              </th>
            )}
            <th className="px-3 min-w-[95px] w-[95px] text-right font-medium whitespace-nowrap">
              Thao tác
            </th>
          </tr>
        </thead>

        {/* Table Body matching StudentTable */}
        <tbody className="divide-y divide-border/60">
          {isLoading && paginatedBroadcasts.length === 0 ? (
            Array.from({ length: 5 }).map((_, idx) => (
              <tr key={idx} className="h-[72px] animate-pulse">
                <td className="px-3">
                  <div className="flex flex-col gap-1.5 min-w-0">
                    <div className="h-3.5 w-40 bg-muted/60 rounded-none" />
                    <div className="h-2.5 w-24 bg-muted/40 rounded-none" />
                  </div>
                </td>
                {visibleColumns.targetScope && (
                  <td className="px-3"><div className="h-3.5 w-24 bg-muted/50 rounded-none" /></td>
                )}
                {visibleColumns.status && (
                  <td className="px-3"><div className="h-5 w-20 bg-muted/50 rounded-none" /></td>
                )}
                {visibleColumns.dispatchTime && (
                  <td className="px-3"><div className="h-3.5 w-24 bg-muted/50 rounded-none" /></td>
                )}
                {visibleColumns.readRate && (
                  <td className="px-3"><div className="h-3.5 w-20 bg-muted/50 rounded-none" /></td>
                )}
                <td className="px-3 text-right">
                  <div className="size-7 bg-muted/40 rounded-none ml-auto" />
                </td>
              </tr>
            ))
          ) : (
            paginatedBroadcasts.map((item) => {
              const total = item.totalRecipients || 0;
              const read = item.readCount || 0;
              const percentage = total > 0 ? Math.round((read / total) * 100) : 0;

              return (
                <tr
                  key={item.batchId}
                  className="h-[72px] hover:bg-muted/40 transition-colors group cursor-default"
                  data-node-id={`notification-row-${item.batchId}`}
                >
                  {/* Notification Info (Title + Code) */}
                  <td className="px-3">
                    <div
                      onClick={() => navigate(`/notifications/${item.batchId}`)}
                      className="flex flex-col min-w-0 leading-tight cursor-pointer group/name"
                    >
                      <span className="text-[14px] font-medium text-foreground group-hover/name:text-primary transition-colors truncate max-w-[360px]">
                        {item.title}
                      </span>
                      <span className="text-[12px] text-muted-foreground truncate font-mono">
                        {item.batchId ? item.batchId.substring(0, 8).toUpperCase() : 'BT-SORAK'}
                      </span>
                    </div>
                  </td>

                  {/* Scope */}
                  {visibleColumns.targetScope && (
                    <td className="px-3 whitespace-nowrap">
                      <span className="text-[14px] text-foreground font-normal">
                        {getScopeLabel(item.targetScope, item.targetGrade, item.targetClassIds)}
                      </span>
                    </td>
                  )}

                  {/* Status Badge matching StudentTable status */}
                  {visibleColumns.status && (
                    <td className="px-3 whitespace-nowrap">
                      {getStatusBadge(item.status)}
                    </td>
                  )}

                  {/* Date */}
                  {visibleColumns.dispatchTime && (
                    <td className="px-3 text-[14px] text-foreground font-normal whitespace-nowrap">
                      {formatDate(item.scheduledAt || item.createdAt)}
                    </td>
                  )}

                  {/* Read Rate */}
                  {visibleColumns.readRate && (
                    <td className="px-3 text-[14px] text-foreground font-normal whitespace-nowrap">
                      <span>{read}/{total} đã xem</span>
                      <span className="text-[12px] text-muted-foreground ml-1 font-mono">
                        ({percentage}%)
                      </span>
                    </td>
                  )}

                  {/* Actions Dropdown matching StudentTable */}
                  <td className="px-3 min-w-[95px] w-[95px] text-right whitespace-nowrap">
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

export default NotificationTable;
