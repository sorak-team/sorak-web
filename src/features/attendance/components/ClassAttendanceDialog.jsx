import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowDown01Icon } from '@hugeicons/core-free-icons';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { attendanceApi } from '../attendance.api';
import { getStudentAvatarUrl } from '@/features/students/students.store';
import { cn } from '@/shared/lib/utils';

const SCHOOL_YEAR_MONTHS = [
  { month: 9, year: 2026, label: 'Tháng 09/2026' },
  { month: 10, year: 2026, label: 'Tháng 10/2026' },
  { month: 11, year: 2026, label: 'Tháng 11/2026', isCurrent: true },
  { month: 12, year: 2026, label: 'Tháng 12/2026' },
  { month: 1, year: 2027, label: 'Tháng 01/2027' },
  { month: 2, year: 2027, label: 'Tháng 02/2027' },
  { month: 3, year: 2027, label: 'Tháng 03/2027' },
  { month: 4, year: 2027, label: 'Tháng 04/2027' },
  { month: 5, year: 2027, label: 'Tháng 05/2027' },
];

export function ClassAttendanceDialog({
  open,
  onOpenChange,
  classId,
  className: targetClassName = '',
}) {
  const { t } = useTranslation();
  const [statsData, setStatsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('students'); // 'students' | 'daily'
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const monthPickerRef = useRef(null);

  // Comprehensive Period Filter State (Current: November 2026)
  const [filterState, setFilterState] = useState({
    type: 'month',
    month: 11,
    year: 2026,
    semester: 1,
    label: 'Tháng 11/2026',
  });

  // Close month dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (monthPickerRef.current && !monthPickerRef.current.contains(e.target)) {
        setIsMonthPickerOpen(false);
      }
    };
    if (isMonthPickerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMonthPickerOpen]);

  useEffect(() => {
    if (!open || !classId) return;

    let isMounted = true;
    const fetchStats = async () => {
      try {
        setLoading(true);
        const params = {};
        if (filterState.type === 'month') {
          params.period = 'month';
          params.month = filterState.month;
          params.year = filterState.year;
        } else if (filterState.type === 'semester') {
          params.period = 'semester';
          params.semester = filterState.semester;
        } else if (filterState.type === 'year') {
          params.period = 'year';
        }

        const res = await attendanceApi.getClassAttendanceStats(classId, params);
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
  }, [open, classId, filterState]);

  const stats = statsData?.stats || {
    presentRate: 100,
    presentCount: 0,
    excusedCount: 0,
    unexcusedCount: 0,
    totalRecordedSlots: 0,
    totalLoggedDays: 0,
  };

  const classTitle = statsData?.classInfo?.name || targetClassName || t('classes.class', 'Lớp học');
  const studentsSummary = statsData?.studentsSummary || [];
  const dailyTrend = statsData?.dailyTrend || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[980px] max-w-[96vw] h-[82vh] max-h-[820px] p-0 gap-0 bg-background border border-border rounded-none shadow-2xl overflow-hidden flex flex-col z-[100] select-none"
        data-name="FE · Class Attendance · Dialog"
      >
        {/* 1. Modal Header (Short Title & Concise Single-Line Description) */}
        <DialogHeader className="px-6 py-3.5 flex flex-row items-center justify-between border-b border-border shrink-0 space-y-0 text-left bg-card">
          <div className="flex flex-col gap-0.5 pr-8">
            <DialogTitle className="text-[17px] font-semibold text-foreground tracking-tight whitespace-nowrap">
              {t('attendance.dialogTitle', 'Thống kê chuyên cần & điểm danh')} — {classTitle}
            </DialogTitle>
            <DialogDescription className="text-[12px] text-muted-foreground font-normal whitespace-nowrap">
              {t('attendance.dialogSubtitle', 'Báo cáo chuyên cần và tỷ lệ đi học của học sinh trong lớp')}
            </DialogDescription>
          </div>
        </DialogHeader>

        {/* 2. Top Section: 4 KPI Cards & Filter Bar (Fixed at top, no vertical scroll) */}
        <div className="px-6 pt-4 pb-3 space-y-3.5 shrink-0">
          {/* Top 4 Summary Metric Cards (No Word Drop) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="border border-border bg-card p-3.5 rounded-none flex flex-col justify-between">
              <span className="text-[11.5px] font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                {t('attendance.fullAttendanceRate', 'Đi học đủ buổi')}
              </span>
              <div className="flex items-baseline gap-1 mt-1.5">
                <span className="text-[24px] font-bold font-mono text-foreground tracking-tight leading-none">
                  {stats.presentRate ?? 100}%
                </span>
              </div>
            </div>

            <div className="border border-border bg-card p-3.5 rounded-none flex flex-col justify-between">
              <span className="text-[11.5px] font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                {t('attendance.presentLabel', 'Lượt có mặt')}
              </span>
              <div className="flex items-baseline gap-1.5 mt-1.5">
                <span className="text-[24px] font-bold font-mono text-foreground tracking-tight leading-none">
                  {stats.presentCount ?? 0}
                </span>
                <span className="text-[12px] text-muted-foreground font-mono whitespace-nowrap">
                  /{stats.totalRecordedSlots ?? 0}
                </span>
              </div>
            </div>

            <div className="border border-border bg-card p-3.5 rounded-none flex flex-col justify-between">
              <span className="text-[11.5px] font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                {t('attendance.excusedLabel', 'Nghỉ có phép')}
              </span>
              <div className="flex items-baseline gap-1.5 mt-1.5">
                <span className="text-[24px] font-bold font-mono text-foreground tracking-tight leading-none">
                  {stats.excusedCount ?? 0}
                </span>
                <span className="text-[12px] text-muted-foreground font-sans whitespace-nowrap">lượt</span>
              </div>
            </div>

            <div className="border border-border bg-card p-3.5 rounded-none flex flex-col justify-between">
              <span className="text-[11.5px] font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                {t('attendance.unexcusedLabel', 'Nghỉ không phép')}
              </span>
              <div className="flex items-baseline gap-1.5 mt-1.5">
                <span className="text-[24px] font-bold font-mono text-foreground tracking-tight leading-none">
                  {stats.unexcusedCount ?? 0}
                </span>
                <span className="text-[12px] text-muted-foreground font-sans whitespace-nowrap">lượt</span>
              </div>
            </div>
          </div>

          {/* Sub-navigation & Comprehensive Period Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-0.5">
            {/* Left: View Tabs */}
            <div className="flex items-center border border-border bg-muted/20 rounded-none p-0.5 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('students')}
                className={cn(
                  'h-8 px-3 text-[12.5px] font-medium transition-colors cursor-pointer rounded-none whitespace-nowrap',
                  activeTab === 'students'
                    ? 'bg-background text-foreground shadow-xs border border-border/80'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {t('attendance.tabPerStudent', 'Danh sách học sinh')} ({studentsSummary.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('daily')}
                className={cn(
                  'h-8 px-3 text-[12.5px] font-medium transition-colors cursor-pointer rounded-none whitespace-nowrap',
                  activeTab === 'daily'
                    ? 'bg-background text-foreground shadow-xs border border-border/80'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {t('attendance.tabPerDay', 'Theo ngày học')} ({dailyTrend.length})
              </button>
            </div>

            {/* Right: Comprehensive Period Filter */}
            <div className="flex items-center border border-border bg-muted/20 rounded-none p-0.5 shrink-0">
              {/* Custom Month Picker Dropdown (No Drop Text) */}
              <div className="relative" ref={monthPickerRef}>
                <button
                  type="button"
                  onClick={() => setIsMonthPickerOpen(!isMonthPickerOpen)}
                  className={cn(
                    'h-8 px-3 text-[12.5px] font-medium transition-colors cursor-pointer rounded-none flex items-center gap-1.5 whitespace-nowrap',
                    filterState.type === 'month'
                      ? 'bg-background text-foreground shadow-xs border border-border/80'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <span>{filterState.type === 'month' ? filterState.label : 'Chọn tháng'}</span>
                  <HugeiconsIcon icon={ArrowDown01Icon} size={12} className="text-muted-foreground" />
                </button>

                {isMonthPickerOpen && (
                  <div className="absolute right-0 top-full mt-1 z-30 w-[215px] bg-card border border-border shadow-xl py-1 rounded-none max-h-[280px] overflow-y-auto">
                    <div className="px-3 py-1.5 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold border-b border-border/60 whitespace-nowrap">
                      Chọn tháng
                    </div>
                    {SCHOOL_YEAR_MONTHS.map((m) => (
                      <button
                        key={`${m.year}-${m.month}`}
                        type="button"
                        onClick={() => {
                          setFilterState({
                            type: 'month',
                            month: m.month,
                            year: m.year,
                            label: m.label,
                          });
                          setIsMonthPickerOpen(false);
                        }}
                        className={cn(
                          'w-full px-3 py-1.5 text-[12.5px] text-left cursor-pointer transition-colors flex items-center justify-between whitespace-nowrap',
                          filterState.type === 'month' && filterState.month === m.month && filterState.year === m.year
                            ? 'font-semibold bg-muted text-foreground'
                            : 'text-foreground hover:bg-muted/60'
                        )}
                      >
                        <span className="whitespace-nowrap">{m.label}</span>
                        {m.isCurrent && (
                          <span className="text-[10.5px] text-muted-foreground font-normal ml-2 shrink-0 whitespace-nowrap">
                            (Hiện tại)
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Học kỳ I */}
              <button
                type="button"
                onClick={() => {
                  setIsMonthPickerOpen(false);
                  setFilterState({
                    type: 'semester',
                    semester: 1,
                    label: 'Học kỳ I',
                  });
                }}
                className={cn(
                  'h-8 px-3 text-[12.5px] font-medium transition-colors cursor-pointer rounded-none whitespace-nowrap',
                  filterState.type === 'semester' && filterState.semester === 1
                    ? 'bg-background text-foreground shadow-xs border border-border/80'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Học kỳ I
              </button>

              {/* Học kỳ II */}
              <button
                type="button"
                onClick={() => {
                  setIsMonthPickerOpen(false);
                  setFilterState({
                    type: 'semester',
                    semester: 2,
                    label: 'Học kỳ II',
                  });
                }}
                className={cn(
                  'h-8 px-3 text-[12.5px] font-medium transition-colors cursor-pointer rounded-none whitespace-nowrap',
                  filterState.type === 'semester' && filterState.semester === 2
                    ? 'bg-background text-foreground shadow-xs border border-border/80'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Học kỳ II
              </button>

              {/* Cả năm học */}
              <button
                type="button"
                onClick={() => {
                  setIsMonthPickerOpen(false);
                  setFilterState({
                    type: 'year',
                    label: 'Cả năm',
                  });
                }}
                className={cn(
                  'h-8 px-3 text-[12.5px] font-medium transition-colors cursor-pointer rounded-none whitespace-nowrap',
                  filterState.type === 'year'
                    ? 'bg-background text-foreground shadow-xs border border-border/80'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Cả năm
              </button>
            </div>
          </div>
        </div>

        {/* 3. Middle Section: Table Container with 100% Fixed Sticky Header */}
        <div className="flex-1 min-h-0 px-6 pb-6 overflow-hidden">
          {/* Tab 1: Chi tiết từng học sinh */}
          {activeTab === 'students' && (
            <div className="w-full h-full border border-border bg-card rounded-none overflow-y-auto overflow-x-auto shadow-xs">
              <table className="w-full text-left border-separate border-spacing-0 min-w-[700px]">
                {/* 100% FIXED STICKY TABLE HEADER (No text dropping) */}
                <thead className="sticky top-0 z-20">
                  <tr className="h-10 text-[13px] font-medium text-foreground">
                    <th className="sticky top-0 z-20 bg-muted border-b border-border px-4 min-w-[220px] font-medium whitespace-nowrap">
                      {t('student.colStudent', 'Học sinh')}
                    </th>
                    <th className="sticky top-0 z-20 bg-muted border-b border-border px-3 min-w-[85px] text-center font-medium whitespace-nowrap">
                      {t('student.colGender', 'Giới tính')}
                    </th>
                    <th className="sticky top-0 z-20 bg-muted border-b border-border px-3 min-w-[85px] text-right font-medium whitespace-nowrap">
                      {t('attendance.presentLabel', 'Có mặt')}
                    </th>
                    <th className="sticky top-0 z-20 bg-muted border-b border-border px-3 min-w-[100px] text-right font-medium whitespace-nowrap">
                      {t('attendance.excusedLabel', 'Nghỉ phép')}
                    </th>
                    <th className="sticky top-0 z-20 bg-muted border-b border-border px-3 min-w-[105px] text-right font-medium whitespace-nowrap">
                      {t('attendance.unexcusedLabel', 'Không phép')}
                    </th>
                    <th className="sticky top-0 z-20 bg-muted border-b border-border px-4 min-w-[130px] text-right font-medium whitespace-nowrap">
                      {t('attendance.rateLabel', 'Tỷ lệ chuyên cần')}
                    </th>
                  </tr>
                </thead>

                {/* Table Body matching StudentTable */}
                <tbody className="divide-y divide-border/60">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-muted-foreground text-[13px] border-b border-border/40 whitespace-nowrap">
                        {t('common.loading', 'Đang tải dữ liệu...')}
                      </td>
                    </tr>
                  ) : studentsSummary.length > 0 ? (
                    studentsSummary.map((student) => (
                      <tr
                        key={student.id}
                        className="h-[60px] hover:bg-muted/40 transition-colors group cursor-default"
                      >
                        {/* Student Info */}
                        <td className="px-4 border-b border-border/60">
                          <div className="flex items-center gap-3">
                            <div className="size-8 shrink-0 rounded-none overflow-hidden border border-border/80 bg-muted/40">
                              <img
                                src={getStudentAvatarUrl(student.avatarUrl, student.studentCode || student.fullName)}
                                alt={student.fullName}
                                className="size-full object-cover"
                                onError={(e) => {
                                  e.target.src = getStudentAvatarUrl(null, student.studentCode || student.fullName);
                                }}
                              />
                            </div>
                            <div className="flex flex-col min-w-0 leading-tight">
                              <span className="text-[14px] font-medium text-foreground truncate whitespace-nowrap">
                                {student.fullName}
                              </span>
                              <span className="text-[12px] text-muted-foreground truncate font-mono whitespace-nowrap">
                                {student.studentCode || '—'}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Gender */}
                        <td className="px-3 text-center text-[13px] text-muted-foreground border-b border-border/60 whitespace-nowrap">
                          {student.gender === 'FEMALE' || student.gender === 'Nữ'
                            ? t('common.female', 'Nữ')
                            : t('common.male', 'Nam')}
                        </td>

                        {/* Present Count */}
                        <td className="px-3 text-right font-mono font-semibold text-foreground text-[13.5px] border-b border-border/60 whitespace-nowrap">
                          {student.presentCount}
                        </td>

                        {/* Excused Absence */}
                        <td className="px-3 text-right font-mono text-muted-foreground text-[13px] border-b border-border/60 whitespace-nowrap">
                          {student.excusedCount}
                        </td>

                        {/* Unexcused Absence */}
                        <td className="px-3 text-right font-mono text-muted-foreground text-[13px] border-b border-border/60 whitespace-nowrap">
                          {student.unexcusedCount}
                        </td>

                        {/* Present Rate */}
                        <td className="px-4 text-right font-mono font-semibold text-foreground text-[13.5px] border-b border-border/60 whitespace-nowrap">
                          {student.presentRate}%
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-muted-foreground text-[13px] border-b border-border/40 whitespace-nowrap">
                        {t('common.noData', 'Không có dữ liệu chuyên cần')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Tab 2: Theo ngày học */}
          {activeTab === 'daily' && (
            <div className="w-full h-full border border-border bg-card rounded-none overflow-y-auto overflow-x-auto shadow-xs">
              <table className="w-full text-left border-separate border-spacing-0 min-w-[700px]">
                {/* 100% FIXED STICKY TABLE HEADER */}
                <thead className="sticky top-0 z-20">
                  <tr className="h-10 text-[13px] font-medium text-foreground">
                    <th className="sticky top-0 z-20 bg-muted border-b border-border px-4 min-w-[130px] font-medium whitespace-nowrap">
                      {t('attendance.date', 'Ngày học')}
                    </th>
                    <th className="sticky top-0 z-20 bg-muted border-b border-border px-3 min-w-[70px] text-center font-medium whitespace-nowrap">
                      {t('attendance.dayOfWeek', 'Thứ')}
                    </th>
                    <th className="sticky top-0 z-20 bg-muted border-b border-border px-3 min-w-[75px] text-right font-medium whitespace-nowrap">
                      {t('attendance.totalStudents', 'Sĩ số')}
                    </th>
                    <th className="sticky top-0 z-20 bg-muted border-b border-border px-3 min-w-[80px] text-right font-medium whitespace-nowrap">
                      {t('attendance.presentLabel', 'Có mặt')}
                    </th>
                    <th className="sticky top-0 z-20 bg-muted border-b border-border px-3 min-w-[95px] text-right font-medium whitespace-nowrap">
                      {t('attendance.excusedLabel', 'Nghỉ phép')}
                    </th>
                    <th className="sticky top-0 z-20 bg-muted border-b border-border px-3 min-w-[100px] text-right font-medium whitespace-nowrap">
                      {t('attendance.unexcusedLabel', 'Không phép')}
                    </th>
                    <th className="sticky top-0 z-20 bg-muted border-b border-border px-4 min-w-[125px] text-right font-medium whitespace-nowrap">
                      {t('attendance.rateLabel', 'Tỷ lệ ngày')}
                    </th>
                  </tr>
                </thead>

                {/* Table Body */}
                <tbody className="divide-y divide-border/60 font-mono">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-muted-foreground text-[13px] font-sans border-b border-border/40 whitespace-nowrap">
                        {t('common.loading', 'Đang tải dữ liệu...')}
                      </td>
                    </tr>
                  ) : dailyTrend.length > 0 ? (
                    dailyTrend.map((d, idx) => (
                      <tr
                        key={d.date || idx}
                        className="h-[52px] hover:bg-muted/40 transition-colors cursor-default"
                      >
                        <td className="px-4 text-foreground font-medium text-[13px] border-b border-border/60 whitespace-nowrap">
                          {d.dateFormatted || d.date}
                        </td>
                        <td className="px-3 text-center text-muted-foreground font-sans text-[13px] border-b border-border/60 whitespace-nowrap">
                          {d.dayOfWeek || '—'}
                        </td>
                        <td className="px-3 text-right text-muted-foreground text-[13px] border-b border-border/60 whitespace-nowrap">
                          {d.totalStudents}
                        </td>
                        <td className="px-3 text-right text-foreground font-semibold text-[13.5px] border-b border-border/60 whitespace-nowrap">
                          {d.presentCount}
                        </td>
                        <td className="px-3 text-right text-muted-foreground text-[13px] border-b border-border/60 whitespace-nowrap">
                          {d.excusedCount}
                        </td>
                        <td className="px-3 text-right text-muted-foreground text-[13px] border-b border-border/60 whitespace-nowrap">
                          {d.unexcusedCount}
                        </td>
                        <td className="px-4 text-right font-semibold text-foreground text-[13.5px] border-b border-border/60 whitespace-nowrap">
                          {d.presentRate}%
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-muted-foreground text-[13px] font-sans border-b border-border/40 whitespace-nowrap">
                        {t('common.noData', 'Không có dữ liệu theo ngày')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ClassAttendanceDialog;
