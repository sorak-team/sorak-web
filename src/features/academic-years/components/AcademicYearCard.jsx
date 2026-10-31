import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import { PencilEdit02Icon } from '@hugeicons/core-free-icons';
import { AcademicYearGlassEmblem } from './AcademicYearGlassEmblem';
import { QuickColorPopover } from './QuickColorPopover';
import { toast } from 'sonner';
import {
  useAcademicYearStore,
  getDayAfterDisplayDate,
  isAcademicYearInUse,
} from '../academic-years.store';
import { cn } from '@/shared/lib/utils';

export function AcademicYearCard({ year }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { openEditDrawer } = useAcademicYearStore();
  const isUsed = isAcademicYearInUse(year);

  const handleCardClick = () => {
    navigate(`/school-years/${year.id}`);
  };

  return (
    <div
      onClick={handleCardClick}
      className={cn(
        'w-full bg-card border border-border rounded-none p-6 flex flex-col justify-between gap-5',
        'hover:border-foreground/40 hover:shadow-sm transition-all cursor-pointer select-none',
      )}
      data-node-id={`Card · ${year.name}`}
    >
      {/* Card Header with Title and Quick Actions */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1 min-w-0">
          <h3 className="text-[16px] font-semibold text-foreground tracking-tight">
            {year.name?.replace(/^(Năm học|Niên khóa|School Year)\s*/i, `${t('schoolYear.title', 'School Year')} `)}
          </h3>
          <p className="text-[14px] text-muted-foreground font-normal">
            {t('schoolYear.clickToOverview')}
          </p>
        </div>

        <div
          className="flex items-center gap-1.5 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <QuickColorPopover year={year} />
          {year.status !== 'COMPLETED' && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openEditDrawer(year.id);
              }}
              title={t('schoolYear.editYear', 'Chỉnh sửa năm học')}
              className="size-7 flex items-center justify-center border border-border rounded-none transition-colors bg-background hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <HugeiconsIcon icon={PencilEdit02Icon} size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Card Body */}
      <div className="flex items-center gap-6 pt-1">
        {/* Emblem 80x80 */}
        <AcademicYearGlassEmblem
          theme={year.colorTheme}
          size={80}
          avatarUrl={year.avatarUrl}
          year={year}
          alt={year.name}
        />

        {/* Metadata columns */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 flex-1">
          {/* Trạng thái */}
          <div className="flex flex-col gap-1">
            <span className="text-[12px] text-muted-foreground font-normal">
              {t('schoolYear.colStatus')}
            </span>
            <span
              className={cn(
                'text-[14px] font-medium leading-tight',
                year.active || year.status === 'ACTIVE'
                  ? 'text-[#1447E6] dark:text-[#3B82F6]'
                  : year.status === 'UPCOMING' || year.status === 'DRAFT'
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-foreground/80',
              )}
            >
              {year.active || year.status === 'ACTIVE'
                ? t('schoolYear.active', 'Đang hoạt động')
                : year.status === 'UPCOMING' || year.status === 'DRAFT'
                  ? t('schoolYear.draft', 'Bản nháp')
                  : t('schoolYear.ended', 'Đã kết thúc')}
            </span>
          </div>

          {/* Tổng số lớp */}
          <div className="flex flex-col gap-1">
            <span className="text-[12px] text-muted-foreground font-normal">
              {t('schoolYear.colTotalClasses')}
            </span>
            <span className="text-[14px] font-medium text-foreground leading-tight">
              {year.totalClasses} {t('schoolYear.classesSuffix')}
            </span>
          </div>

          {/* Học kỳ 1 */}
          <div className="flex flex-col gap-1">
            <span className="text-[12px] text-muted-foreground font-normal">
              {t('schoolYear.semester1', 'Học kỳ 1')}
            </span>
            <span className="text-[13px] font-normal text-foreground leading-tight">
              {year.startDate} – {year.semester1EndDate || '15/01/2027'}
            </span>
          </div>

          {/* Học kỳ 2 */}
          <div className="flex flex-col gap-1">
            <span className="text-[12px] text-muted-foreground font-normal">
              {t('schoolYear.semester2', 'Học kỳ 2')}
            </span>
            <span className="text-[13px] font-normal text-foreground leading-tight">
              {getDayAfterDisplayDate(year.semester1EndDate) || '16/01/2027'} – {year.endDate}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
