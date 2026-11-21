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
import { useAccountStore } from '../accounts.store';
import { cn } from '@/shared/lib/utils';

export function AccountFilterDropdown() {
  const { t } = useTranslation();
  const activeTab = useAccountStore((state) => state.activeTab);
  const statusFilter = useAccountStore((state) => state.statusFilter);
  const setStatusFilter = useAccountStore((state) => state.setStatusFilter);
  const roleFilter = useAccountStore((state) => state.roleFilter);
  const setRoleFilter = useAccountStore((state) => state.setRoleFilter);

  const statuses = [
    { key: 'all', label: t('account.filterAll', 'Tất cả trạng thái') },
    { key: 'active', label: t('account.statusActive', 'Hoạt động') },
    { key: 'locked', label: t('account.statusLocked', 'Đã khóa') },
  ];

  const roles = [
    { key: 'all', label: t('account.allRoles', 'Tất cả vai trò') },
    { key: 'leader', label: t('account.roleLeader', 'Ban giám hiệu') },
    { key: 'teacher', label: t('account.roleTeacher', 'Giáo viên') },
  ];

  const isFiltered = statusFilter !== 'all' || (activeTab === 'staff' && roleFilter !== 'all');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'size-8 bg-background border border-border text-foreground hover:bg-muted/50 rounded-none flex items-center justify-center transition-colors cursor-pointer select-none',
            isFiltered && 'border-primary text-primary bg-primary/5',
          )}
          title={t('account.filter', 'Lọc')}
          data-node-id="4212:4137"
          data-name="Filter"
        >
          <HugeiconsIcon icon={FilterHorizontalIcon} size={16} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-56 p-1.5 rounded-none border border-border bg-card shadow-xl z-50 text-foreground"
      >
        {/* System Role Filter (chỉ cho tab Tài khoản nhà trường) */}
        {activeTab === 'staff' && (
          <>
            <DropdownMenuLabel className="px-2 py-1 text-[12px] font-medium text-muted-foreground">
              {t('account.colRole', 'Vai trò hệ thống')}
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="my-1 border-t border-border" />
            {roles.map((item) => (
              <DropdownMenuItem
                key={item.key}
                onClick={() => setRoleFilter(item.key)}
                className="flex items-center justify-between h-8 px-2 text-[13px] cursor-pointer rounded-none hover:bg-muted/60"
              >
                <span>{item.label}</span>
                {roleFilter === item.key && (
                  <HugeiconsIcon
                    icon={CheckmarkSquare02Icon}
                    size={14}
                    className="text-primary shrink-0"
                  />
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator className="my-1.5 border-t border-border" />
          </>
        )}

        {/* Account Status Filter */}
        <DropdownMenuLabel className="px-2 py-1 text-[12px] font-medium text-muted-foreground">
          {t('account.colAccountStatus', 'Trạng thái tài khoản')}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="my-1 border-t border-border" />
        {statuses.map((item) => (
          <DropdownMenuItem
            key={item.key}
            onClick={() => setStatusFilter(item.key)}
            className="flex items-center justify-between h-8 px-2 text-[13px] cursor-pointer rounded-none hover:bg-muted/60"
          >
            <span>{item.label}</span>
            {statusFilter === item.key && (
              <HugeiconsIcon
                icon={CheckmarkSquare02Icon}
                size={14}
                className="text-primary shrink-0"
              />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
