import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArrowLeft02Icon,
  ArrowRight02Icon,
} from '@hugeicons/core-free-icons';
import { cn } from '@/shared/lib/utils';

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

export function AttendanceStatsSidebar({ stats = {}, selectedWeek = '05/10 - 11/10' }) {
  const { t, i18n } = useTranslation();
  const isVi = (i18n?.language || 'vi').startsWith('vi');

  // Calendar dates for October 2026 (matching Figma 4906:12018)
  const days = useMemo(() => {
    const list = [];
    for (let i = 28; i <= 30; i++) list.push({ day: i, isCurrentMonth: false });
    for (let i = 1; i <= 31; i++) {
      list.push({
        day: i,
        isCurrentMonth: true,
        isHighlighted: i >= 5 && i <= 11, // active week
      });
    }
    for (let i = 1; i <= 4; i++) list.push({ day: i, isCurrentMonth: false });
    return list.slice(0, 35);
  }, []);

  return (
    <div
      className="w-[280px] shrink-0 border-l border-border bg-card divide-y divide-border/60 overflow-y-auto select-none"
      data-node-id="4906:12015"
      data-name="Attendance Week Sidebar"
    >
      {/* Section 1: Chọn tuần */}
      <div className="p-4 space-y-3.5">
        <h3 className="text-[13.5px] font-semibold text-foreground">
          {t('attendance.selectWeek', 'Chọn tuần')}
        </h3>

        {/* Month Header */}
        <div className="flex items-center justify-between text-[13px] font-medium text-foreground px-1">
          <button
            type="button"
            className="size-6 flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground rounded-none transition-colors"
          >
            <HugeiconsIcon icon={ArrowLeft02Icon} size={13} />
          </button>
          <span>{isVi ? 'Tháng 10 2026' : 'October 2026'}</span>
          <button
            type="button"
            className="size-6 flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground rounded-none transition-colors"
          >
            <HugeiconsIcon icon={ArrowRight02Icon} size={13} />
          </button>
        </div>

        {/* Weekdays */}
        <div className="grid grid-cols-7 text-center text-[11px] font-medium text-muted-foreground">
          {WEEKDAYS.map((wd) => (
            <div key={wd} className="py-1">
              {wd}
            </div>
          ))}
        </div>

        {/* Dates Grid */}
        <div className="grid grid-cols-7 gap-y-1 text-center text-[11.5px]">
          {days.map((cd, idx) => (
            <div
              key={idx}
              className={cn(
                'py-1 flex items-center justify-center',
                !cd.isCurrentMonth && 'text-muted-foreground/40',
                cd.isCurrentMonth && !cd.isHighlighted && 'text-foreground',
                cd.isHighlighted && 'bg-[#1447e6] text-white font-semibold',
              )}
            >
              {cd.day}
            </div>
          ))}
        </div>
      </div>

      {/* Section 2: Chọn nhanh / Thống kê */}
      <div className="p-4 space-y-3">
        <h3 className="text-[13.5px] font-semibold text-foreground">
          {t('attendance.quickSelect', 'Chọn nhanh')}
        </h3>

        <div className="space-y-2.5 text-[12.5px]">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">{t('attendance.mainTeachingHours', 'Tiết dạy chính')}</span>
            <span className="font-semibold text-foreground">
              {stats.mainTeachingHours || 18}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">{t('attendance.assistantHours', 'Tiết trợ giảng')}</span>
            <span className="font-semibold text-foreground">
              {stats.assistantHours || 4}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">{t('attendance.avgStudentsCount', 'Sĩ số trung bình')}</span>
            <span className="font-semibold text-foreground">
              {stats.totalStudents || 24}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">{t('attendance.attendanceRate', 'Tỷ lệ chuyên cần')}</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              95.8%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
