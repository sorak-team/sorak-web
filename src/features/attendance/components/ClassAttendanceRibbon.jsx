import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { attendanceApi } from '../attendance.api';
import { ClassAttendanceDialog } from './ClassAttendanceDialog';
import { cn } from '@/shared/lib/utils';

export function ClassAttendanceRibbon({ classId, className = '' }) {
  const { t } = useTranslation();
  const [statsData, setStatsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    if (!classId) return;

    let isMounted = true;
    const fetchStats = async () => {
      try {
        setLoading(true);
        const res = await attendanceApi.getClassAttendanceStats(classId, { period: 'month', month: 11, year: 2026 });
        if (isMounted && res) {
          setStatsData(res);
        }
      } catch (err) {
        console.error('Failed to fetch class attendance stats:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchStats();
    return () => {
      isMounted = false;
    };
  }, [classId]);

  const stats = statsData?.stats || {
    presentRate: 100,
    presentCount: 0,
    excusedCount: 0,
    unexcusedCount: 0,
    totalRecordedSlots: 0,
    totalLoggedDays: 0,
  };

  return (
    <>
      <div
        className={cn(
          'w-full border border-border bg-card text-foreground select-none flex flex-col md:flex-row md:items-center justify-between gap-3 px-5 py-3',
          className
        )}
        data-name="FE · Class Attendance · Metric Ribbon"
      >
        {/* Left: Section Label */}
        <div className="flex items-center gap-2.5 shrink-0">
          <span className="text-[13.5px] font-semibold text-foreground tracking-tight">
            {t('attendance.classAttendanceTitle', 'Chuyên cần lớp')}
          </span>
          <span className="text-[12px] text-muted-foreground font-normal">
            ({t('attendance.periodMonth', 'Tháng 11/2026')})
          </span>
        </div>

        {/* Center: 4 Clean Metrics */}
        <div className="flex items-center flex-wrap sm:flex-nowrap gap-x-5 gap-y-2 text-[12.5px]">
          {/* Metric 1: Tỷ lệ đi học đủ buổi */}
          <div className="flex items-baseline gap-1.5">
            <span className="text-muted-foreground text-[12px]">
              {t('attendance.fullAttendanceRate', 'Đi học đủ buổi:')}
            </span>
            <span className="font-mono font-bold text-[15px] text-foreground tracking-tight">
              {stats.presentRate ?? 100}%
            </span>
          </div>

          <div className="hidden sm:block h-3.5 w-px bg-border/70" />

          {/* Metric 2: Lượt có mặt */}
          <div className="flex items-baseline gap-1.5">
            <span className="text-muted-foreground text-[12px]">
              {t('attendance.presentCountLabel', 'Có mặt:')}
            </span>
            <span className="font-mono font-bold text-[14.5px] text-foreground">
              {stats.presentCount ?? 0}
            </span>
            <span className="text-[11.5px] text-muted-foreground font-mono">
              /{stats.totalRecordedSlots ?? 0}
            </span>
          </div>

          <div className="hidden sm:block h-3.5 w-px bg-border/70" />

          {/* Metric 3: Nghỉ có phép */}
          <div className="flex items-baseline gap-1.5">
            <span className="text-muted-foreground text-[12px]">
              {t('attendance.excusedCountLabel', 'Nghỉ phép:')}
            </span>
            <span className="font-mono font-bold text-[14.5px] text-foreground">
              {stats.excusedCount ?? 0}
            </span>
          </div>

          <div className="hidden sm:block h-3.5 w-px bg-border/70" />

          {/* Metric 4: Nghỉ không phép */}
          <div className="flex items-baseline gap-1.5">
            <span className="text-muted-foreground text-[12px]">
              {t('attendance.unexcusedCountLabel', 'Không phép:')}
            </span>
            <span className="font-mono font-bold text-[14.5px] text-foreground">
              {stats.unexcusedCount ?? 0}
            </span>
          </div>
        </div>

        {/* Right: Open Dialog Button (Restrained, Clean, Professional) */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsDialogOpen(true)}
            className="h-8 px-3 text-[12.5px] font-medium rounded-none border-border bg-background hover:bg-muted text-foreground cursor-pointer transition-colors shadow-none"
          >
            {t('common.viewDetails', 'Xem chi tiết')}
          </Button>
        </div>
      </div>

      {/* Clean & Professional Popup Dialog */}
      <ClassAttendanceDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        classId={classId}
        className={statsData?.classInfo?.name}
      />
    </>
  );
}

export default ClassAttendanceRibbon;
