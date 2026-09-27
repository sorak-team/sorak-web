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
import { useStudentStore } from '../students.store';
import { useClassesStore } from '../../classes/classes.store';
import { cn } from '@/shared/lib/utils';

export function StudentFilterDropdown({ hideClassFilter = false, isClassContext = false }) {
  const { t } = useTranslation();
  const statusFilter = useStudentStore((state) => state.statusFilter);
  const setStatusFilter = useStudentStore((state) => state.setStatusFilter);
  const genderFilter = useStudentStore((state) => state.genderFilter);
  const setGenderFilter = useStudentStore((state) => state.setGenderFilter);
  const classFilter = useStudentStore((state) => state.classFilter);
  const setClassFilter = useStudentStore((state) => state.setClassFilter);
  const classes = useClassesStore((state) => state.classes) || [];

  const isClass = hideClassFilter || isClassContext;

  const statuses = isClass
    ? [
        { key: 'all', label: t('schoolYear.all', 'Tất cả trạng thái') },
        { key: 'studying', label: t('student.statusStudying', 'Đang học') },
        { key: 'completed', label: t('student.statusCompleted', 'Hoàn thành') },
        { key: 'transferred_class', label: t('student.statusTransferredClass', 'Đã chuyển lớp') },
        { key: 'transferred', label: t('student.statusTransferred', 'Chuyển trường') },
        { key: 'reserved', label: t('student.statusReserved', 'Bảo lưu') },
        { key: 'dropped_out', label: t('student.statusDroppedOut', 'Thôi học') },
        { key: 'graduated', label: t('student.statusGraduated', 'Đã tốt nghiệp') },
      ]
    : [
        { key: 'all', label: t('schoolYear.all', 'Tất cả trạng thái') },
        { key: 'studying', label: t('student.statusStudying', 'Đang học') },
        { key: 'reserved', label: t('student.statusReserved', 'Bảo lưu') },
        { key: 'transferred', label: t('student.statusTransferred', 'Chuyển trường') },
        { key: 'dropped_out', label: t('student.statusDroppedOut', 'Thôi học') },
        { key: 'graduated', label: t('student.statusGraduated', 'Đã tốt nghiệp') },
      ];

  const genders = [
    { key: 'all', label: t('student.allGenders', 'Tất cả giới tính') },
    { key: 'Nam', label: 'Bé trai (Nam)' },
    { key: 'Nữ', label: 'Bé gái (Nữ)' },
  ];

  const isFiltered = statusFilter !== 'all' || genderFilter !== 'all' || (!isClass && classFilter !== 'all');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'size-8 bg-background border border-border text-foreground hover:bg-muted/50 rounded-none flex items-center justify-center transition-colors cursor-pointer select-none',
            isFiltered && 'border-primary text-primary bg-primary/5',
          )}
          title={t('student.filter', 'Lọc')}
          data-name="Filter · Students"
        >
          <HugeiconsIcon icon={FilterHorizontalIcon} size={16} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-52 p-1.5 rounded-none border border-border bg-card shadow-xl z-50 text-foreground"
      >
        {/* Status Filter */}
        <DropdownMenuLabel className="px-2 py-1 text-[12px] font-medium text-muted-foreground">
          {isClass
            ? t('student.filterClassStatus', 'Trạng thái tại lớp')
            : t('student.filterGlobalStatus', 'Trạng thái tại trường')}
        </DropdownMenuLabel>
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

        <DropdownMenuSeparator className="my-1 border-t border-border" />

        {/* Gender Filter */}
        <DropdownMenuLabel className="px-2 py-1 text-[12px] font-medium text-muted-foreground">
          {t('student.colGender', 'Giới tính')}
        </DropdownMenuLabel>
        {genders.map((item) => (
          <DropdownMenuItem
            key={item.key}
            onClick={() => setGenderFilter(item.key)}
            className="flex items-center justify-between h-8 px-2 text-[13px] cursor-pointer rounded-none hover:bg-muted/60"
          >
            <span>{item.label}</span>
            {genderFilter === item.key && (
              <HugeiconsIcon
                icon={CheckmarkSquare02Icon}
                size={14}
                className="text-primary shrink-0"
              />
            )}
          </DropdownMenuItem>
        ))}

        {!hideClassFilter && (
          <>
            <DropdownMenuSeparator className="my-1 border-t border-border" />

            {/* Class Filter */}
            <DropdownMenuLabel className="px-2 py-1 text-[12px] font-medium text-muted-foreground">
              {t('student.colClass', 'Lớp học')}
            </DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => setClassFilter('all')}
              className="flex items-center justify-between h-8 px-2 text-[13px] cursor-pointer rounded-none hover:bg-muted/60"
            >
              <span>Tất cả lớp học</span>
              {classFilter === 'all' && (
                <HugeiconsIcon
                  icon={CheckmarkSquare02Icon}
                  size={14}
                  className="text-primary shrink-0"
                />
              )}
            </DropdownMenuItem>
            {classes.map((cls) => (
              <DropdownMenuItem
                key={cls.id}
                onClick={() => setClassFilter(cls.id)}
                className="flex items-center justify-between h-8 px-2 text-[13px] cursor-pointer rounded-none hover:bg-muted/60"
              >
                <span className="truncate">{cls.name}</span>
                {classFilter === cls.id && (
                  <HugeiconsIcon
                    icon={CheckmarkSquare02Icon}
                    size={14}
                    className="text-primary shrink-0"
                  />
                )}
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default StudentFilterDropdown;
