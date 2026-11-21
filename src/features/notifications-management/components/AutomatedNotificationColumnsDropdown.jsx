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
import { useNotificationsManagementStore } from '../notifications-management.store';

export function AutomatedNotificationColumnsDropdown() {
  const { t } = useTranslation();
  const automatedVisibleColumns = useNotificationsManagementStore(
    (state) => state.automatedVisibleColumns
  );
  const toggleAutomatedColumn = useNotificationsManagementStore(
    (state) => state.toggleAutomatedColumn
  );

  const columns = [
    { key: 'recipient', label: t('notifications.management.colRecipient', 'Người nhận') },
    { key: 'role', label: t('notifications.management.colRole', 'Vai trò') },
    { key: 'createdAt', label: t('notifications.management.automatedDetail.sendTime', 'Thời gian gửi') },
    { key: 'isRead', label: t('notifications.management.colReadStatus', 'Trạng thái đọc') },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="h-8 px-2.5 bg-background border border-border text-[14px] font-medium text-foreground hover:bg-muted/50 rounded-none flex items-center justify-center gap-1 transition-colors cursor-pointer select-none"
          data-name="Columns · Automated Notifications"
        >
          <span>{t('common.columns', 'Cột')}</span>
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
          {t('common.visibleColumns', 'Hiển thị cột')}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="my-1 border-t border-border" />
        {columns.map((col) => (
          <DropdownMenuItem
            key={col.key}
            onClick={(e) => {
              e.preventDefault();
              toggleAutomatedColumn(col.key);
            }}
            className="flex items-center justify-between h-8 px-2 text-[13px] cursor-pointer rounded-none hover:bg-muted/60"
          >
            <span>{col.label}</span>
            {automatedVisibleColumns[col.key] && (
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

export default AutomatedNotificationColumnsDropdown;

