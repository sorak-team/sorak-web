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

export function AutomatedNotificationFilterDropdown() {
  const { t } = useTranslation();
  const automatedCategoryFilter = useNotificationsManagementStore(
    (state) => state.automatedCategoryFilter
  );
  const setAutomatedCategoryFilter = useNotificationsManagementStore(
    (state) => state.setAutomatedCategoryFilter
  );
  const automatedRoleFilter = useNotificationsManagementStore(
    (state) => state.automatedRoleFilter
  );
  const setAutomatedRoleFilter = useNotificationsManagementStore(
    (state) => state.setAutomatedRoleFilter
  );
  const automatedStatusFilter = useNotificationsManagementStore(
    (state) => state.automatedStatusFilter
  );
  const setAutomatedStatusFilter = useNotificationsManagementStore(
    (state) => state.setAutomatedStatusFilter
  );

  const automatedCategories = [
    { key: 'all', label: 'Tất cả sự kiện' },
    { key: 'PICKUP', label: 'Ủy quyền đón hộ' },
    { key: 'TRANSFER', label: 'Chuyển lớp' },
    { key: 'PLANNING', label: 'Kế hoạch giáo dục' },
    { key: 'ASSESSMENT', label: 'Sổ theo dõi & Đánh giá' },
    { key: 'ATTENDANCE', label: 'Điểm danh trẻ' },
    { key: 'CALENDAR', label: 'Lịch năm học' },
    { key: 'ACCOUNT', label: 'Tài khoản & Phân lớp' },
  ];

  const automatedRoles = [
    { key: 'all', label: 'Tất cả vai trò' },
    { key: 'PRINCIPAL_BGH', label: 'Ban giám hiệu' },
    { key: 'TEACHER_GV', label: 'Giáo viên' },
    { key: 'PARENT_PH', label: 'Phụ huynh' },
  ];

  const automatedStatuses = [
    { key: 'all', label: 'Tất cả trạng thái' },
    { key: 'read', label: 'Đã đọc' },
    { key: 'unread', label: 'Chưa đọc' },
  ];

  const isFiltered =
    automatedCategoryFilter !== 'all' ||
    automatedRoleFilter !== 'all' ||
    automatedStatusFilter !== 'all';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'size-8 bg-background border border-border text-foreground hover:bg-muted/50 rounded-none flex items-center justify-center transition-colors cursor-pointer select-none',
            isFiltered && 'border-primary text-primary bg-primary/5',
          )}
          title="Lọc thông báo tự động"
          data-name="Filter · Automated Notifications"
        >
          <HugeiconsIcon icon={FilterHorizontalIcon} size={16} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-60 p-1.5 rounded-none border border-border bg-card shadow-xl z-50 text-foreground max-h-[80vh] overflow-y-auto"
      >
        {/* Category Filter */}
        <DropdownMenuLabel className="px-2 py-1 text-[12px] font-medium text-muted-foreground">
          Loại sự kiện
        </DropdownMenuLabel>
        {automatedCategories.map((c) => {
          const isSelected = automatedCategoryFilter === c.key;
          return (
            <DropdownMenuItem
              key={c.key}
              onClick={() => setAutomatedCategoryFilter(c.key)}
              className={cn(
                'flex items-center justify-between px-2 py-1.5 text-[13px] rounded-none cursor-pointer',
                isSelected && 'font-medium text-foreground bg-muted/60',
              )}
            >
              <span>{c.label}</span>
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

        {/* Role Filter */}
        <DropdownMenuLabel className="px-2 py-1 text-[12px] font-medium text-muted-foreground">
          Vai trò người nhận
        </DropdownMenuLabel>
        {automatedRoles.map((r) => {
          const isSelected = automatedRoleFilter === r.key;
          return (
            <DropdownMenuItem
              key={r.key}
              onClick={() => setAutomatedRoleFilter(r.key)}
              className={cn(
                'flex items-center justify-between px-2 py-1.5 text-[13px] rounded-none cursor-pointer',
                isSelected && 'font-medium text-foreground bg-muted/60',
              )}
            >
              <span>{r.label}</span>
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

        {/* Read Status Filter */}
        <DropdownMenuLabel className="px-2 py-1 text-[12px] font-medium text-muted-foreground">
          Trạng thái đọc
        </DropdownMenuLabel>
        {automatedStatuses.map((st) => {
          const isSelected = automatedStatusFilter === st.key;
          return (
            <DropdownMenuItem
              key={st.key}
              onClick={() => setAutomatedStatusFilter(st.key)}
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
                setAutomatedCategoryFilter('all');
                setAutomatedRoleFilter('all');
                setAutomatedStatusFilter('all');
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

export default AutomatedNotificationFilterDropdown;

