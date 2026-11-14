import React from 'react';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  FilterHorizontalIcon,
  CheckmarkSquare02Icon,
} from '@hugeicons/core-free-icons';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useNotificationsManagementStore } from '../notifications-management.store';
import { cn } from '@/shared/lib/utils';

export function NotificationFilterDropdown() {
  const { t } = useTranslation();
  const scopeFilter = useNotificationsManagementStore((state) => state.scopeFilter);
  const setScopeFilter = useNotificationsManagementStore((state) => state.setScopeFilter);
  const statusFilter = useNotificationsManagementStore((state) => state.statusFilter);
  const setStatusFilter = useNotificationsManagementStore((state) => state.setStatusFilter);

  const broadcastScopes = [
    { key: 'all', label: 'Tất cả phạm vi' },
    { key: 'ALL', label: 'Toàn trường' },
    { key: 'ALL_TEACHERS', label: 'Tất cả Giáo viên' },
    { key: 'ALL_PARENTS', label: 'Tất cả Phụ huynh' },
    { key: 'GRADE', label: 'Theo Khối tuổi' },
    { key: 'CLASS', label: 'Theo Lớp học' },
    { key: 'INDIVIDUAL', label: 'Cá nhân' },
  ];

  const broadcastStatuses = [
    { key: 'all', label: 'Tất cả trạng thái' },
    { key: 'SENT', label: 'Đã phát hành' },
    { key: 'SCHEDULED', label: 'Đã lên lịch' },
  ];

  const isFiltered = scopeFilter !== 'all' || statusFilter !== 'all';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'size-8 bg-background border border-border text-foreground hover:bg-muted/50 rounded-none flex items-center justify-center transition-colors cursor-pointer select-none',
            isFiltered && 'border-primary text-primary bg-primary/5',
          )}
          title="Lọc bản tin"
          data-name="Filter · Notifications"
        >
          <HugeiconsIcon icon={FilterHorizontalIcon} size={16} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-56 p-1.5 rounded-none border border-border bg-card shadow-xl z-50 text-foreground"
      >
        {/* Scope Filter */}
        <DropdownMenuLabel className="px-2 py-1 text-[12px] font-medium text-muted-foreground">
          Phạm vi gửi
        </DropdownMenuLabel>
        {broadcastScopes.map((s) => {
          const isSelected = scopeFilter === s.key;
          return (
            <DropdownMenuItem
              key={s.key}
              onClick={() => setScopeFilter(s.key)}
              className={cn(
                'flex items-center justify-between px-2 py-1.5 text-[13px] rounded-none cursor-pointer',
                isSelected && 'font-medium text-foreground bg-muted/60',
              )}
            >
              <span>{s.label}</span>
              {isSelected && (
                <HugeiconsIcon
                  icon={CheckmarkSquare02Icon}
                  size={15}
                  className="text-primary shrink-0"
                />
              )}
            </DropdownMenuItem>
          );
        })}

        <DropdownMenuSeparator className="my-1 border-border" />

        {/* Status Filter */}
        <DropdownMenuLabel className="px-2 py-1 text-[12px] font-medium text-muted-foreground">
          Trạng thái
        </DropdownMenuLabel>
        {broadcastStatuses.map((st) => {
          const isSelected = statusFilter === st.key;
          return (
            <DropdownMenuItem
              key={st.key}
              onClick={() => setStatusFilter(st.key)}
              className={cn(
                'flex items-center justify-between px-2 py-1.5 text-[13px] rounded-none cursor-pointer',
                isSelected && 'font-medium text-foreground bg-muted/60',
              )}
            >
              <span>{st.label}</span>
              {isSelected && (
                <HugeiconsIcon
                  icon={CheckmarkSquare02Icon}
                  size={15}
                  className="text-primary shrink-0"
                />
              )}
            </DropdownMenuItem>
          );
        })}

        {isFiltered && (
          <>
            <DropdownMenuSeparator className="my-1 border-border" />
            <DropdownMenuItem
              onClick={() => {
                setScopeFilter('all');
                setStatusFilter('all');
              }}
              className="px-2 py-1.5 text-[12px] text-destructive hover:bg-destructive/10 rounded-none cursor-pointer justify-center"
            >
              Đặt lại bộ lọc
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default NotificationFilterDropdown;
