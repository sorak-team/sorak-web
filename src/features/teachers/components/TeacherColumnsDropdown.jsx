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
import { useTeacherStore } from '../teachers.store';

export function TeacherColumnsDropdown() {
  const { t } = useTranslation();
  const visibleColumns = useTeacherStore((state) => state.visibleColumns);
  const toggleColumn = useTeacherStore((state) => state.toggleColumn);

  const columns = [
    { key: 'status', label: t('teacher.colStatus', 'Công tác') },
    { key: 'email', label: t('teacher.colEmail', 'Email') },
    { key: 'phone', label: t('teacher.colPhone', 'SĐT') },
    { key: 'gender', label: t('teacher.colGender', 'Giới tính') },
    { key: 'dob', label: t('teacher.colDob', 'Ngày sinh') },
    { key: 'position', label: t('teacher.colPosition', 'Chức vụ') },
    { key: 'joinDate', label: t('teacher.colJoinDate', 'Ngày vào làm') },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="h-8 px-2.5 bg-background border border-border text-[14px] font-medium text-foreground hover:bg-muted/50 rounded-none flex items-center justify-center gap-1 transition-colors cursor-pointer select-none"
          data-node-id="4273:5243"
          data-name="Columns · Teachers"
        >
          <span>{t('teacher.columns', 'Cột')}</span>
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
          {t('teacher.columns', 'Hiển thị cột')}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="my-1 border-t border-border" />
        {columns.map((col) => (
          <DropdownMenuItem
            key={col.key}
            onClick={(e) => {
              e.preventDefault();
              toggleColumn(col.key);
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
