import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArrowLeft02Icon,
  ArrowRight02Icon,
  SidebarRightIcon,
} from '@hugeicons/core-free-icons';
import { assessmentApi } from '../assessment.api';
import { TeacherTimetableGrid } from '@/shared/components/calendar/TeacherTimetableGrid';
import { WeekPickerCalendar } from '@/shared/components/calendar/WeekPickerCalendar';
import { WeeklyAssessmentPanel } from './WeeklyAssessmentPanel';

export function DailyAssessmentTab({ targetClassId, currentClass }) {
  const { t } = useTranslation();

  const [data, setData] = useState(null);
  const [slots, setSlots] = useState([]);
  const [students, setStudents] = useState([]);
  const [activeSlot, setActiveSlot] = useState(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const res = await assessmentApi.getAssessmentOverview(targetClassId);
        setData(res);
        setSlots(res.slots || []);
        setStudents(res.students || []);
      } catch (err) {
        console.warn('Failed to load daily assessment overview:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [targetClassId]);

  const handleSelectSlot = (slot) => {
    setActiveSlot(slot);
  };

  const handleClosePanel = () => {
    setActiveSlot(null);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background select-none">
      {/* 1. Sub Toolbar for Daily Assessment */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-b border-border bg-card/40 shrink-0">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="text-[14.5px] font-semibold text-foreground">
              {t('assessment.dailyTitle', 'Đánh giá hoạt động & mục tiêu trong ngày')}
            </span>
            <span className="text-[11px] px-2 py-0.5 font-medium bg-primary/10 text-primary border border-primary/20">
              {data?.stats?.pCount ?? 14}/{data?.stats?.totalStudents ?? 18} {t('assessment.achievedUnit', 'Đạt')}
            </span>
          </div>
          <p className="text-[12px] text-muted-foreground font-normal">
            {t('assessment.dailyDesc', 'Theo dõi và đánh giá kết quả đạt hay chưa đạt mục tiêu theo từng tiết học trong ngày')}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          {/* Week navigator (< Hôm nay >) */}
          <div className="flex items-center border border-border bg-background text-[13px] rounded-none">
            <button
              type="button"
              className="size-8 flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground border-r border-border transition-colors cursor-pointer"
              title={t('attendance.prevWeek', 'Tuần trước')}
            >
              <HugeiconsIcon icon={ArrowLeft02Icon} size={14} />
            </button>
            <button
              type="button"
              className="px-3.5 h-8 font-medium hover:bg-muted text-foreground border-r border-border transition-colors cursor-pointer text-[12px]"
            >
              {t('attendance.today', 'Hôm nay')}
            </button>
            <button
              type="button"
              className="size-8 flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title={t('attendance.nextWeek', 'Tuần sau')}
            >
              <HugeiconsIcon icon={ArrowRight02Icon} size={14} />
            </button>
          </div>

          {/* Toggle Calendar right sidebar */}
          <button
            type="button"
            onClick={() => setIsCalendarOpen(!isCalendarOpen)}
            className="size-8 flex items-center justify-center border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title={t('attendance.toggleCalendar', 'Thu gọn lịch tuần')}
          >
            <HugeiconsIcon icon={SidebarRightIcon} size={15} />
          </button>
        </div>
      </div>

      {/* 2. Main Daily Split Layout: Timetable Grid + Assessment Details Panel */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Timetable Grid */}
        <div className="flex-1 flex flex-col overflow-y-auto p-4 border-r border-border/80">
          <TeacherTimetableGrid
            slots={slots}
            activeSlotId={activeSlot?.id || 's-t2-2'}
            onSelectSlot={handleSelectSlot}
            className="w-full"
          />
        </div>

        {/* Center/Right Side: Weekly Assessment Panel */}
        <div className="w-[360px] sm:w-[400px] border-r border-border bg-card shrink-0 flex flex-col h-full overflow-hidden shadow-xs">
          <WeeklyAssessmentPanel
            slot={activeSlot || data?.activeActivity}
            activityDetails={data?.activeActivity?.criteria}
            initialStudents={students}
            onClose={handleClosePanel}
            onSaveSuccess={(updated) => setStudents(updated)}
            onCleanSuccess={(resetStudents) => setStudents(resetStudents)}
            className="h-full"
          />
        </div>

        {/* Far Right: Week Picker Calendar Drawer */}
        {isCalendarOpen && (
          <div className="w-[260px] border-l border-border bg-card/50 p-3 shrink-0 hidden xl:flex flex-col gap-4 overflow-y-auto">
            <WeekPickerCalendar
              currentDate={new Date(2026, 9, 5)}
              activeWeekRange="28/09 - 04/10"
              onSelectDate={() => {}}
            />
          </div>
        )}
      </div>
    </div>
  );
}
