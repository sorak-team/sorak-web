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
import { useStudentStore } from '../students.store';

export function StudentColumnsDropdown({ hideClassOption = false, isClassContext = false }) {
  const { t } = useTranslation();
  const visibleColumns = useStudentStore((state) => state.visibleColumns);
  const toggleColumn = useStudentStore((state) => state.toggleColumn);

  const isClass = hideClassOption || isClassContext;

  const columns = [
    { key: 'currentClass', label: t('student.colClass', 'Lớp học') },
    {
      key: 'status',
      label: isClass
        ? t('student.colClassStatus', 'Trạng thái tại lớp')
        : t('student.colGlobalStatus', 'Trạng thái tại trường'),
    },
    { key: 'gender', label: t('student.colGender', 'Giới tính') },
    { key: 'age', label: t('student.colDob', 'Ngày sinh') },
    {
      key: 'joinDate',
      label: isClass
        ? t('student.colClassEnrolledAt', 'Ngày vào lớp')
        : t('student.colJoinDate', 'Ngày nhập học'),
    },
    ...(isClass
      ? [{ key: 'leftAt', label: t('student.colClassLeftAt', 'Ngày rời lớp') }]
      : []),
    { key: 'notes', label: t('student.colPreviousSchool', 'Trường cũ / Chuyển đến') },
  ].filter((col) => !isClass || col.key !== 'currentClass');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="h-8 px-2.5 bg-background border border-border text-[14px] font-medium text-foreground hover:bg-muted/50 rounded-none flex items-center justify-center gap-1 transition-colors cursor-pointer select-none"
          data-name="Columns · Students"
        >
          <span>{t('student.columns', 'Cột')}</span>
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
          {t('student.toggleColumns', 'Hiển thị cột')}
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

export default StudentColumnsDropdown;
