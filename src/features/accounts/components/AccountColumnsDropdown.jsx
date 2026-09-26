import React from 'react';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArrowDown01Icon,
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

export function AccountColumnsDropdown() {
  const { t } = useTranslation();
  const activeTab = useAccountStore((state) => state.activeTab);
  const staffVisibleColumns = useAccountStore((state) => state.staffVisibleColumns);
  const studentVisibleColumns = useAccountStore((state) => state.studentVisibleColumns);
  const toggleColumn = useAccountStore((state) => state.toggleColumn);

  const isStaffTab = activeTab === 'staff';
  const visibleColumns = isStaffTab ? staffVisibleColumns : studentVisibleColumns;

  const staffColumns = [
    { key: 'role', label: t('account.colRole', 'Vai trò hệ thống') },
    { key: 'workStatus', label: t('account.colWorkStatus', 'Công tác') },
    { key: 'accountStatus', label: t('account.colAccountStatus', 'Tài khoản') },
    { key: 'lastLogin', label: t('account.colLastLogin', 'Đăng nhập gần nhất') },
  ];

  const studentColumns = [
    { key: 'studentClass', label: t('account.colClass', 'Lớp học') },
    { key: 'accountStatus', label: t('account.colAccountStatus', 'Tài khoản') },
    { key: 'lastLogin', label: t('account.colLastLogin', 'Đăng nhập gần nhất') },
  ];

  const columns = isStaffTab ? staffColumns : studentColumns;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="h-8 px-2.5 bg-background border border-border text-[14px] font-medium text-foreground hover:bg-muted/50 rounded-none flex items-center justify-center gap-1 transition-colors cursor-pointer select-none"
          data-node-id="4233:5063"
          data-name="Columns · Accounts"
        >
          <span>{t('account.columns', 'Cột')}</span>
          <HugeiconsIcon
            icon={ArrowDown01Icon}
            size={14}
            className="text-muted-foreground shrink-0"
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-48 p-1.5 rounded-none border border-border bg-card shadow-xl z-50 text-foreground"
      >
        <DropdownMenuLabel className="px-2 py-1 text-[12px] font-medium text-muted-foreground">
          {t('account.columnsDisplay', 'Hiển thị cột')}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="my-1 border-t border-border" />
        {columns.map((col) => (
          <DropdownMenuItem
            key={col.key}
            onClick={(e) => {
              e.preventDefault();
              toggleColumn(col.key, activeTab);
            }}
            className="flex items-center justify-between h-8 px-2 text-[13px] cursor-pointer rounded-none hover:bg-muted/60"
          >
            <span>{col.label}</span>
            {visibleColumns[col.key] && (
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
