import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArrowLeft02Icon,
  ArrowRight02Icon,
  SidebarRightIcon,
} from '@hugeicons/core-free-icons';
import { healthApi } from './health.api';
import { TeacherTimetableGrid } from '@/shared/components/calendar/TeacherTimetableGrid';
import { WeekPickerCalendar } from '@/shared/components/calendar/WeekPickerCalendar';
import { HealthMeasurementPanel } from './components/HealthMeasurementPanel';
import { useClassesStore, ClassHeaderNav } from '@/features/classes';
import { NotFoundPage } from '@/features/error';

export function HealthPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const classes = useClassesStore((state) => state.classes) || [];
  const attachedClassId = useClassesStore((state) => state.attachedClassId);
  const currentClass = classes.find((c) => c.id === id || c.publicId === id);
  const targetClassId = id || attachedClassId || '1';

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
        const res = await healthApi.getHealthOverview(targetClassId);
        setData(res);
        setSlots(res.slots || []);
        setStudents(res.students || []);
      } catch (err) {
        console.warn('Failed to load health overview:', err);
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

  if (id && /^\d+$/.test(String(id))) {
    return <NotFoundPage />;
  }

  if (id && !currentClass) {
    return (
      <div className="p-12 text-center text-muted-foreground select-none">
        <p className="text-[14px]">{t('common.loading', 'Đang tải thông tin lớp học...')}</p>
      </div>
    );
  }

  return (
    <div
      className="w-full flex-1 flex flex-col bg-background text-foreground select-none pb-6 h-full overflow-y-auto"
      data-node-id="4919:12545"
      data-name="Student Health & Growth Monitoring Page"
    >
      {/* 1. Page Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-border bg-card/60 shrink-0">
        <div className="flex flex-col gap-1">
          <h1 className="text-[26px] font-semibold text-foreground tracking-tight">
            {t('health.title', 'Sức khỏe')}
          </h1>
          <p className="text-[12px] text-muted-foreground font-normal">
            {t('health.subtitle', 'Theo dõi sự phát triển thể chất, chiều cao, cân nặng và chỉ số BMI của học sinh')}
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
              className="px-3.5 h-8 font-medium hover:bg-muted text-foreground border-r border-border transition-colors cursor-pointer text-[12.5px]"
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
            onClick={() => {
              if (activeSlot) {
                setActiveSlot(null);
              } else {
                setIsCalendarOpen(!isCalendarOpen);
              }
            }}
            className="size-8 flex items-center justify-center border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground rounded-none transition-colors cursor-pointer"
            title={t('attendance.toggleCalendar', 'Ẩn / Hiện bảng chọn tuần')}
          >
            <HugeiconsIcon icon={SidebarRightIcon} size={15} />
          </button>
        </div>
      </div>

      {/* 2. Main Workspace: Timetable + Active Panel (Calendar or Health Measurement) */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Timetable Area */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col">
          <TeacherTimetableGrid
            title={t('attendance.thisWeekSchedule', 'Lịch dạy tuần này')}
            dateRange={data?.classInfo?.dateRange || '28/09/2026 – 04/10/2026'}
            days={data?.days}
            slots={slots}
            activeSlotId={activeSlot?.id}
            mode="health"
            onSelectSlot={handleSelectSlot}
          />
        </div>

        {/* Right Area: Either HealthMeasurementPanel or WeekPickerCalendar */}
        {activeSlot ? (
          <HealthMeasurementPanel
            slot={activeSlot}
            initialStudents={students}
            onClose={handleClosePanel}
            onSaveSuccess={(updated) => {
              setStudents(updated);
            }}
            onCleanSuccess={(resetStudents) => {
              setStudents(resetStudents);
            }}
          />
        ) : isCalendarOpen ? (
          <WeekPickerCalendar
            selectedWeek="w-1"
            onSelectWeek={(week) => {
              console.log('Selected week:', week);
            }}
          />
        ) : null}
      </div>
    </div>
  );
}

export default HealthPage;
