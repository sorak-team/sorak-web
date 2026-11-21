import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArrowLeft02Icon,
  ArrowRight02Icon,
  SidebarRightIcon,
  Cancel01Icon,
  TaskDone01Icon,
  CheckListIcon,
  MedicalFileIcon,
  BookOpen01Icon,
  MoreHorizontalIcon,
  Calendar03Icon,
  Door01Icon,
  UndoIcon,
} from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { confirmDialog } from '@/components/ui/confirm-dialog';
import { Info } from 'lucide-react';
import { useClassesStore } from '@/features/classes';
import { attendanceApi } from '@/features/attendance/attendance.api';
import { healthApi } from '@/features/health/health.api';
import { assessmentApi } from '@/features/assessment/assessment.api';
import { NotFoundPage } from '@/features/error';
import { TeacherTimetableGrid, DEFAULT_DAYS } from '@/shared/components/calendar/TeacherTimetableGrid';
import { WeekPickerCalendar, CALENDAR_WEEKS } from '@/shared/components/calendar/WeekPickerCalendar';
import { AttendanceCheckInPanel, ChildDismissalPanel } from '@/features/attendance';
import { WeeklyAssessmentPanel } from '@/features/assessment/components/WeeklyAssessmentPanel';
import { HealthMeasurementPanel } from '@/features/health/components/HealthMeasurementPanel';
import { useAcademicYearStore } from '@/features/academic-years';
import { useAuthStore } from '@/features/auth';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/shared/lib/utils';

export function DailyRoutinePage() {
  const { t, i18n } = useTranslation();
  const isVi = (i18n?.language || 'vi').startsWith('vi');
  const { id } = useParams();
  const [searchParams] = useSearchParams();

  const currentUser = useAuthStore((state) => state.user);
  const isBgh = useMemo(() => {
    const r = String(currentUser?.role || '').toUpperCase();
    return r === 'PRINCIPAL_BGH' || r === 'PRINCIPAL' || r === 'VICE_PRINCIPAL' || r.includes('BGH') || r.includes('PRINCIPAL');
  }, [currentUser]);

  const classes = useClassesStore((state) => state.classes) || [];
  const attachedClassId = useClassesStore((state) => state.attachedClassId);
  const currentClass = classes.find((c) => c.id === id || c.publicId === id);
  const targetClassId = id || attachedClassId || '1';

  // Tab inside Day Drawer: attendance | health | dismissal
  const initialTab = searchParams.get('tab') || 'attendance';
  const [dayTab, setDayTab] = useState(
    ['attendance', 'health', 'dismissal'].includes(initialTab) ? initialTab : 'attendance'
  );

  // Tab inside Activity Drawer: content | assessment
  const [activityTab, setActivityTab] = useState('content');

  const [data, setData] = useState(null);
  const [slots, setSlots] = useState([]);
  const [students, setStudents] = useState([]);
  const [activeSlot, setActiveSlot] = useState(null);
  const [activeDay, setActiveDay] = useState(null);

  // Lấy thông tin Chủ đề & Chủ đề nhánh của tuần đang chọn
  const activeTheme = useMemo(() => {
    return data?.theme || data?.selectedTheme || null;
  }, [data]);

  const activeSubTheme = useMemo(() => {
    return data?.subTheme || data?.selectedSubTheme || null;
  }, [data]);

  const currentThemeName = useMemo(() => {
    return (
      activeTheme?.name ||
      data?.classInfo?.themeName ||
      ''
    );
  }, [activeTheme, data?.classInfo?.themeName]);

  const currentSubThemeName = useMemo(() => {
    return (
      activeSubTheme?.name ||
      data?.classInfo?.subThemeName ||
      ''
    );
  }, [activeSubTheme, data?.classInfo?.subThemeName]);

  // Trạng thái đã điểm danh theo ngày (mặc định các ngày T2, T3 đã được ghi nhận, T4 hôm nay chưa điểm danh)
  const [attendanceOverrides, setAttendanceOverrides] = useState({});
  const [recordedAttendanceDays, setRecordedAttendanceDays] = useState({
    T2: true,
    T3: true,
    T4: false,
  });

  // Trạng thái đã ghi nhận số đo sức khỏe theo ngày (mặc định T2 đã ghi nhận)
  const [healthOverrides, setHealthOverrides] = useState({});
  const [recordedHealthDays, setRecordedHealthDays] = useState({
    T2: true,
  });

  // Lấy năm học đang chọn từ store để giới hạn phạm vi tuần
  const academicYears = useAcademicYearStore((state) => state.academicYears);
  const selectedYearId = useAcademicYearStore((state) => state.selectedYearId);
  const currentAcademicYear = useMemo(() => {
    return (
      academicYears.find((y) => String(y.id) === String(selectedYearId)) ||
      academicYears.find((y) => y.active) ||
      academicYears[0] ||
      null
    );
  }, [academicYears, selectedYearId]);

  const isSchoolYearEnded = useMemo(() => {
    return currentAcademicYear?.status === 'COMPLETED' || currentAcademicYear?.status === 'ENDED';
  }, [currentAcademicYear]);

  const { academicStartCutoff, academicEndCutoff, academicStartDate } = useMemo(() => {
    let startDate = new Date(2026, 8, 7); // Default: Thứ 2, 07/09/2026
    let endDate = new Date(2027, 4, 31, 23, 59, 59);

    if (currentAcademicYear?.startDate) {
      const raw = currentAcademicYear.startDate;
      if (raw.includes('/')) {
        const parts = raw.split('/').map(Number);
        if (parts.length === 3) {
          startDate = new Date(parts[2], parts[1] - 1, parts[0]);
        }
      } else if (raw.includes('-')) {
        const parts = raw.split('T')[0].split('-').map(Number);
        if (parts.length === 3) {
          startDate = new Date(parts[0], parts[1] - 1, parts[2]);
        }
      }
    }

    if (currentAcademicYear?.endDate) {
      const raw = currentAcademicYear.endDate;
      if (raw.includes('/')) {
        const parts = raw.split('/').map(Number);
        if (parts.length === 3) {
          endDate = new Date(parts[2], parts[1] - 1, parts[0], 23, 59, 59);
        }
      } else if (raw.includes('-')) {
        const parts = raw.split('T')[0].split('-').map(Number);
        if (parts.length === 3) {
          endDate = new Date(parts[0], parts[1] - 1, parts[2], 23, 59, 59);
        }
      }
    }

    return {
      academicStartCutoff: startDate,
      academicEndCutoff: endDate,
      academicStartDate: startDate,
    };
  }, [currentAcademicYear]);

  const initialCurrentWeekId = useMemo(
    () => CALENDAR_WEEKS.find((w) => w.isCurrentWeek)?.id || 'w-2',
    []
  );
  const [selectedWeekId, setSelectedWeekId] = useState(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlWeekId = urlParams.get('weekId');
      if (urlWeekId && CALENDAR_WEEKS.some((w) => w.id === urlWeekId)) {
        return urlWeekId;
      }
    }
    return initialCurrentWeekId;
  });
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Lưu weekId vào URL để khi F5 không bị mất tuần
  useEffect(() => {
    if (typeof window === 'undefined' || !selectedWeekId) return;
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.get('weekId') !== selectedWeekId) {
        url.searchParams.set('weekId', selectedWeekId);
        window.history.replaceState(null, '', url.pathname + url.search);
      }
    } catch (e) {
      console.warn('Failed to update DailyRoutinePage weekId:', e);
    }
  }, [selectedWeekId]);

  const activeWeekObj =
    CALENDAR_WEEKS.find((w) => w.id === selectedWeekId) ||
    CALENDAR_WEEKS.find((w) => w.isCurrentWeek) ||
    CALENDAR_WEEKS[0];

  // Check if current week has slots on T7 or CN
  const hasWeekendSlots = useMemo(() => {
    return (slots || []).some((s) => s.day === 'T7' || s.day === 'CN');
  }, [slots]);

  // Check if school year start date falls on weekend and belongs to this week
  const isStartWeekWithWeekend = useMemo(() => {
    if (!academicStartDate) return false;
    const dayOfWeek = academicStartDate.getDay();
    const isWeekendStart = dayOfWeek === 6 || dayOfWeek === 0;
    if (!isWeekendStart) return false;
    return (activeWeekObj?.dayDetails || []).some(
      (d) => d.dateStr === academicStartDate.toISOString().slice(0, 10)
    );
  }, [academicStartDate, activeWeekObj]);

  // Lấy trạng thái ghi nhớ từ localStorage (mặc định là false nếu chưa chọn)
  const [userPrefShowWeekend, setUserPrefShowWeekend] = useState(() => {
    try {
      return localStorage.getItem('sorak_show_weekend') === 'true';
    } catch {
      return false;
    }
  });

  const [showWeekend, setShowWeekend] = useState(() => {
    try {
      return localStorage.getItem('sorak_show_weekend') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleWeekend = (val) => {
    const nextVal = typeof val === 'boolean' ? val : !showWeekend;
    setShowWeekend(nextVal);
    setUserPrefShowWeekend(nextVal);
    try {
      localStorage.setItem('sorak_show_weekend', String(nextVal));
    } catch (e) {
      console.warn('Failed to save weekend preference:', e);
    }
  };

  const handlePrevWeek = () => {
    const idx = CALENDAR_WEEKS.findIndex((w) => w.id === selectedWeekId);
    if (idx > 0) {
      setSelectedWeekId(CALENDAR_WEEKS[idx - 1].id);
      setActiveSlot(null);
      setActiveDay(null);
    }
  };

  const handleNextWeek = () => {
    const idx = CALENDAR_WEEKS.findIndex((w) => w.id === selectedWeekId);
    if (idx >= 0 && idx < CALENDAR_WEEKS.length - 1) {
      setSelectedWeekId(CALENDAR_WEEKS[idx + 1].id);
      setActiveSlot(null);
      setActiveDay(null);
    }
  };

  const handleGoToCurrentWeek = () => {
    const curWeek = CALENDAR_WEEKS.find((w) => w.isCurrentWeek) || CALENDAR_WEEKS[0];
    if (curWeek) {
      setSelectedWeekId(curWeek.id);
      setActiveSlot(null);
      setActiveDay(null);
    }
  };

  // Load timetable overview data for the class and selected week
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setIsLoading(true);
      try {
        const startDate = activeWeekObj?.dayDetails?.[0]?.dateStr;
        const endDate = activeWeekObj?.dayDetails?.[6]?.dateStr;
        const res = await attendanceApi.getTimetableOverview(targetClassId, {
          weekId: selectedWeekId,
          startDate,
          endDate,
        });
        if (isMounted) {
          setData(res);
          setSlots(res.slots || []);
          setStudents(res.students || []);
        }
      } catch (err) {
        console.warn('Failed to load daily routine timetable:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [targetClassId, selectedWeekId]);

  const handleSelectSlot = (slot, day) => {
    if (day?.isLocked) {
      const makeupDate = day?.holiday?.makeupDate || day?.makeupDate;
      if (makeupDate) {
        const parts = makeupDate.split('-');
        toast.info(
          t(
            'daily.makeupClassRescheduledByBGH',
            'Lịch dạy này đã được Ban Giám Hiệu dời sang Thứ Bảy ({{date}}).',
            { date: `${parts[2]}/${parts[1]}` }
          )
        );
      } else {
        toast.info(
          t(
            'daily.holidayScheduledByBGH',
            'Ngày này đã được Ban Giám Hiệu xếp lịch nghỉ ({{reason}}).',
            {
              reason:
                day?.holiday?.name ||
                day?.lockReason ||
                t('daily.schoolPolicy', 'Trường quy định'),
            }
          )
        );
      }
      return;
    }
    const resolvedFullDate = slot.fullDate || day?.fullDate;

    setActiveSlot({
      ...slot,
      day: slot.day || day?.key,
      dayKey: slot.dayKey || slot.day || day?.key,
      fullDate: resolvedFullDate,
      date: resolvedFullDate || slot.date,
    });
    setActiveDay(null);
  };

  const handleSelectDay = async (day, explicitTab = null) => {
    if (day?.isLocked) return;

    // Tab mặc định luôn là Điểm danh ('attendance') trừ khi có hành động chỉ định rõ ràng qua explicitTab
    const targetTab = explicitTab || 'attendance';
    setDayTab(targetTab);
    setActiveDay(day);
    setActiveSlot(null);
    if (day?.fullDate && targetClassId) {
      try {
        const res = await attendanceApi.getTimetableOverview(targetClassId, { date: day.fullDate });
        if (res?.students) {
          setStudents(res.students);
        }
        if (res?.stats?.isHealthRecorded !== undefined && day.key) {
          setRecordedHealthDays((prev) => ({
            ...prev,
            [day.key]: res.stats.isHealthRecorded,
          }));
        }
        if (res?.stats?.isDismissalRecorded !== undefined && day.key) {
          setRecordedDismissalDays((prev) => ({
            ...prev,
            [day.key]: res.stats.isDismissalRecorded,
          }));
          setActiveDay((prev) => (prev ? { ...prev, isDismissalRecorded: res.stats.isDismissalRecorded } : null));

          // Giữ nguyên tab người dùng đang xem hoặc explicitTab, không tự ý nhảy sang 'dismissal'
          if (explicitTab) {
            setDayTab(explicitTab);
          }
        }
      } catch (err) {
        console.warn('Failed to load day attendance:', err);
      }
    }
  };

  const handleCloseSlot = () => {
    setActiveSlot(null);
  };

  const handleCloseDay = () => {
    setActiveDay(null);
  };

  const [isCleaningDay, setIsCleaningDay] = useState(false);
  const [isCleaningSlot, setIsCleaningSlot] = useState(false);
  const [dismissalOverrides, setDismissalOverrides] = useState({});
  const [recordedDismissalDays, setRecordedDismissalDays] = useState({});
  const [dismissalRefreshKey, setDismissalRefreshKey] = useState(0);
  const [cleanConfirmDialog, setCleanConfirmDialog] = useState(null);
  const [dismissalStatsOverride, setDismissalStatsOverride] = useState(null);

  const handleDismissalChange = useCallback((res) => {
    const students = res?.students || [];
    const presentStudents = students.filter(
      (s) =>
        s.isPresent !== false &&
        s.attendanceStatus !== 'ABSENT' &&
        s.attendanceStatus !== 'EXCUSED_ABSENCE' &&
        s.attendanceStatus !== 'UNEXCUSED_ABSENCE'
    );
    const isFullDismissed = Boolean(
      (res?.summary?.presentCount > 0 && res?.summary?.remainingInClassCount === 0) ||
      (presentStudents.length > 0 && presentStudents.every((s) => s.isDismissed))
    );

    const dateStr = res?.date || activeDay?.fullDate;
    if (dateStr) {
      setDismissalOverrides((prev) => ({
        ...prev,
        [dateStr]: isFullDismissed,
      }));
    }
    if (res?.summary) {
      setDismissalStatsOverride({
        dateStr,
        dismissedCount: res.summary.dismissedCount,
        presentCount: res.summary.presentCount,
        remainingInClassCount: res.summary.remainingInClassCount,
        totalStudents: res.summary.totalStudents,
      });
    }
    if (activeDay?.key) {
      setRecordedDismissalDays((prev) => {
        if (prev[activeDay.key] === isFullDismissed) return prev;
        return {
          ...prev,
          [activeDay.key]: isFullDismissed,
        };
      });
      setActiveDay((prev) => (prev ? { ...prev, isDismissalRecorded: isFullDismissed } : null));
    }
  }, [activeDay?.key, activeDay?.fullDate]);

  const isSlotAssessed = Boolean(activeSlot?.status === 'COMPLETED' || activeSlot?.isEvaluated);

  const handleExecuteClean = async () => {
    if (!cleanConfirmDialog || !activeDay) return;
    const { type } = cleanConfirmDialog;
    setCleanConfirmDialog(null);

    const targetDateStr = activeDay.fullDate || '2026-10-13';
    const dayLabel = activeDay.date || activeDay.name;

    if (type === 'attendance') {
      setIsCleaningDay(true);
      try {
        await attendanceApi.clearAttendance(targetClassId, { date: targetDateStr });
        try {
          await attendanceApi.clearAllDismissals(targetClassId, { date: targetDateStr });
        } catch (e) {
          console.warn('Dismissals already cleared or none existed:', e);
        }
        const resetStudents = students.map((s) => ({
          ...s,
          status: 'PRESENT',
          note: '',
          checkOutTime: null,
          checkOutTimeFormatted: null,
          pickupPerson: '',
          pickupPersonName: null,
          pickupRelationship: null,
        }));
        setStudents(resetStudents);
        if (activeDay.key) {
          setAttendanceOverrides((prev) => ({
            ...prev,
            [`${activeWeekObj.id}-${activeDay.key}`]: false,
          }));
          setRecordedDismissalDays((prev) => ({
            ...prev,
            [activeDay.key]: false,
          }));
          if (activeDay.fullDate) {
            setDismissalOverrides((prev) => ({
              ...prev,
              [activeDay.fullDate]: false,
            }));
          }
          setActiveDay((prev) => (prev ? { ...prev, isAttendanceRecorded: false, isDismissalRecorded: false } : null));
        }
        setDismissalRefreshKey((prev) => prev + 1);
        if (dayTab === 'dismissal') {
          setDayTab('attendance');
        }
        toast.success(t('daily.deletedAttendanceDay', 'Đã xóa điểm danh ngày {{date}}', { date: dayLabel }));
      } catch {
        toast.error(t('daily.cannotDeleteAttendance', 'Không thể xóa điểm danh.'));
      } finally {
        setIsCleaningDay(false);
      }
    } else if (type === 'health') {
      setIsCleaningDay(true);
      try {
        await healthApi.clearHealthRecords(targetClassId);
        const resetStudents = students.map((s) => ({ ...s, height: '', weight: '', bmi: '', note: '' }));
        setStudents(resetStudents);
        if (activeDay.key) {
          setRecordedHealthDays((prev) => {
            const next = { ...prev };
            delete next[activeDay.key];
            return next;
          });
        }
        toast.success(t('daily.deletedHealthDay', 'Đã xóa dữ liệu sức khỏe ngày {{date}}', { date: dayLabel }));
      } catch {
        toast.error(t('daily.cannotDeleteHealth', 'Không thể xóa dữ liệu sức khỏe.'));
      } finally {
        setIsCleaningDay(false);
      }
    } else if (type === 'dismissal') {
      setIsCleaningDay(true);
      try {
        await attendanceApi.clearAllDismissals(targetClassId, { date: targetDateStr });
        const resetStudents = students.map((s) => ({
          ...s,
          checkOutTime: null,
          pickupPerson: '',
        }));
        setStudents(resetStudents);
        if (activeDay.key) {
          setRecordedDismissalDays((prev) => ({
            ...prev,
            [activeDay.key]: false,
          }));
          if (activeDay.fullDate) {
            setDismissalOverrides((prev) => ({
              ...prev,
              [activeDay.fullDate]: false,
            }));
          }
          setActiveDay((prev) => (prev ? { ...prev, isDismissalRecorded: false } : null));
        }
        setDismissalRefreshKey((prev) => prev + 1);
        toast.success(t('daily.deletedDismissalDay', 'Đã xóa thông tin đón trẻ ngày {{date}}', { date: dayLabel }));
      } catch {
        toast.error(t('daily.cannotDeleteDismissal', 'Không thể xóa đón trẻ.'));
      } finally {
        setIsCleaningDay(false);
      }
    }
  };

  const handleCleanSlotAssessment = async () => {
    if (!activeSlot) return;
    if (!isSlotAssessed) {
      toast.warning(t('daily.slotNotEvaluatedYet', 'Tiết này chưa được đánh giá.'));
      return;
    }
    const confirmed = await confirmDialog({
      title: t('daily.confirmDeleteSlotEvalTitle', 'Xác nhận xóa đánh giá tiết học'),
      description: t(
        'daily.confirmDeleteSlotEvalDesc',
        'Bạn có chắc chắn muốn xóa toàn bộ đánh giá của tiết "{{title}}" không? Thao tác này không thể hoàn tác.',
        { title: activeSlot.title || activeSlot.shortTitle }
      ),
      confirmText: t('common.delete', 'Xóa'),
      cancelText: t('common.cancel', 'Hủy'),
      variant: 'destructive',
    });
    if (!confirmed) return;
    setIsCleaningSlot(true);
    try {
      await assessmentApi.clearAssessmentRecords(targetClassId, {
        slotId: activeSlot.id,
        activityId: activeSlot.activityId || activeSlot.activity_id,
        date: activeSlot.fullDate || activeSlot.date,
      });
      const resetStudents = students.map((s) => ({ ...s, status: 'ACHIEVED', note: '' }));
      setStudents(resetStudents);
      setSlots((prev) =>
        prev.map((s) => (s.id === activeSlot.id ? { ...s, status: 'SCHEDULED', isEvaluated: false } : s))
      );
      setActiveSlot((prev) => (prev ? { ...prev, status: 'SCHEDULED', isEvaluated: false } : null));
      toast.success(
        t('daily.deletedSlotEvalSuccess', 'Đã xóa đánh giá của tiết "{{title}}"', {
          title: activeSlot.title || activeSlot.shortTitle,
        })
      );
    } catch {
      toast.error(t('daily.cannotDeleteSlotEval', 'Không thể xóa đánh giá.'));
    } finally {
      setIsCleaningSlot(false);
    }
  };

  const currentWeekIdx = CALENDAR_WEEKS.findIndex((w) => w.isCurrentWeek);
  const selectedWeekIdx = CALENDAR_WEEKS.findIndex((w) => w.id === selectedWeekId);

  const pad = (n) => String(n).padStart(2, '0');
  const now = new Date();
  const todayIsoStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

  // Format dynamic dates for timetable header according to active week
  const currentDays = (data?.days || DEFAULT_DAYS).map((day, idx) => {
    const detail = activeWeekObj?.dayDetails?.[idx];
    let formattedDate = day.date;
    let fullIsoDate = '';
    let isOutsideAcademicYear = false;
    if (detail) {
      formattedDate = `${pad(detail.day)}/${pad(detail.month + 1)}`;
      fullIsoDate = detail.dateStr;
      const dt = new Date(detail.year, detail.month, detail.day);
      isOutsideAcademicYear = dt < academicStartCutoff || dt > academicEndCutoff;
    } else {
      const dayNum = activeWeekObj?.days?.[idx];
      if (dayNum !== undefined) {
        formattedDate = `${pad(dayNum)}/10`;
      }
    }

    const weekDayKey = `${activeWeekObj.id}-${day.key}`;
    const isWeekend = day.key === 'T7' || day.key === 'CN';

    // Kiểm tra khóa bởi ngày nghỉ / sự kiện (SchoolHoliday)
    const holidays = data?.holidays || [];
    const classAgeGroup = currentClass?.ageGroup || data?.classInfo?.ageGroup || 'NHA_TRE';

    // Kiểm tra Thứ 7 dạy bù
    const isSaturday = day.key === 'T7';
    const makeupHoliday = isSaturday && holidays.find((h) => {
      const appliesToGrade = !h.targetGrades?.length || h.targetGrades.includes(classAgeGroup);
      if (!appliesToGrade) return false;
      if (h.makeupDate && fullIsoDate === h.makeupDate) return true;
      return h.isTeachingAllowed && fullIsoDate >= h.startDate && fullIsoDate <= h.endDate;
    });
    const isSaturdayMakeup = Boolean(makeupHoliday);
    const isWeekendLocked = isWeekend && !hasWeekendSlots && !isSaturdayMakeup;

    let isHolidayLocked = false;
    let holidayLockReason = '';
    let activeHoliday = null;

    if (fullIsoDate && holidays.length > 0) {
      for (const h of holidays) {
        if (!h.isTeachingAllowed) {
          const appliesToGrade = !h.targetGrades?.length || h.targetGrades.includes(classAgeGroup);
          if (appliesToGrade) {
            if (fullIsoDate >= h.startDate && fullIsoDate <= h.endDate) {
              isHolidayLocked = true;
              holidayLockReason = h.name;
              activeHoliday = h;
              break;
            }
          }
        }
      }
    }

    const isDayLocked = isOutsideAcademicYear || isWeekendLocked || isHolidayLocked;
    const finalLockReason = isOutsideAcademicYear
      ? t('daily.outsideAcademicYear', 'Nằm ngoài năm học đang chọn')
      : isHolidayLocked
        ? holidayLockReason
        : isWeekendLocked
          ? t('daily.weekendHoliday', 'Ngày nghỉ cuối tuần')
          : t('common.locked', 'Khóa');
    const finalLockLabel = isOutsideAcademicYear
      ? t('daily.extracurricular', 'Ngoại khóa')
      : isHolidayLocked
        ? t('daily.holiday', 'Ngày nghỉ')
        : isWeekendLocked
          ? t('daily.holiday', 'Ngày nghỉ')
          : t('common.locked', 'Khóa');

    const isToday = Boolean(fullIsoDate ? fullIsoDate === todayIsoStr : (activeWeekObj?.isCurrentWeek && day.key === 'T4'));
    const isFuture = Boolean(fullIsoDate ? fullIsoDate > todayIsoStr : (selectedWeekIdx > currentWeekIdx));

    // Trạng thái điểm danh thật từ DB:
    // 1. Kiểm tra override nếu người dùng vừa bấm lưu trong phiên này
    // 2. Nếu lớp không có học sinh (ví dụ Nhà trẻ 2) -> luôn là false, không điểm danh
    // 3. Nếu ngày bị khóa (isDayLocked) -> luôn là false
    // 4. Kiểm tra xem ngày đó có bản ghi thật trong database hay không
    const hasStudents = (data?.classInfo?.studentCount ?? students.length) > 0;
    let isAttendanceRecorded = false;
    if (attendanceOverrides[weekDayKey] !== undefined) {
      isAttendanceRecorded = attendanceOverrides[weekDayKey];
    } else if (!hasStudents || isDayLocked) {
      isAttendanceRecorded = false;
    } else if (data?.attendanceDays && fullIsoDate) {
      isAttendanceRecorded = Boolean(data.attendanceDays[fullIsoDate]);
    }

    let isHealthRecorded = false;
    if (healthOverrides[weekDayKey] !== undefined) {
      isHealthRecorded = healthOverrides[weekDayKey];
    } else if (!hasStudents || isDayLocked) {
      isHealthRecorded = false;
    } else if (data?.healthDays && fullIsoDate) {
      isHealthRecorded = Boolean(data.healthDays[fullIsoDate]);
    }

    let isDismissalRecorded = false;
    if (fullIsoDate && dismissalOverrides[fullIsoDate] !== undefined) {
      isDismissalRecorded = dismissalOverrides[fullIsoDate];
    } else if (!hasStudents || isDayLocked) {
      isDismissalRecorded = false;
    } else if (data?.dismissalDays && fullIsoDate) {
      isDismissalRecorded = Boolean(data.dismissalDays[fullIsoDate]);
    } else if (recordedDismissalDays[day.key] !== undefined && (activeWeekObj?.isCurrentWeek || fullIsoDate === todayIsoStr)) {
      isDismissalRecorded = Boolean(recordedDismissalDays[day.key]);
    }

    const normalizedDayName = t(`days.${day.key}.name`, day.name);

    return {
      ...day,
      name: normalizedDayName,
      date: formattedDate,
      fullDate: fullIsoDate,
      isToday,
      isFuture,
      isAttendanceRecorded,
      isHealthRecorded,
      isDismissalRecorded,
      isLocked: isDayLocked,
      isHolidayLocked,
      isSaturdayMakeup,
      makeupHoliday: makeupHoliday || null,
      lockReason: finalLockReason,
      lockLabel: finalLockLabel,
      holiday: activeHoliday,
    };
  });

  // Check if Saturday has makeup teaching configured
  const hasSaturdayMakeup = useMemo(() => {
    return (currentDays || []).some((d) => d.key === 'T7' && d.isSaturdayMakeup);
  }, [currentDays]);

  // Tự động mở T7/CN nếu tuần có slot, có lịch học bù thứ 7, hoặc tuần khai giảng dính cuối tuần;
  // nếu không thì theo lựa chọn ghi nhớ của người dùng (mặc định ẩn nếu người dùng không chọn hiện)
  useEffect(() => {
    if (hasWeekendSlots || isStartWeekWithWeekend || hasSaturdayMakeup) {
      setShowWeekend(true);
    } else {
      setShowWeekend(userPrefShowWeekend);
    }
  }, [hasWeekendSlots, isStartWeekWithWeekend, hasSaturdayMakeup, selectedWeekId, userPrefShowWeekend]);

  // Tìm thông tin ngày hôm nay (trong tuần hiện tại hoặc fallback ngày thực tế)
  const todayDay = useMemo(() => {
    const inCurrent = currentDays.find((d) => d.isToday);
    if (inCurrent) return inCurrent;

    const dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const dayKeys = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const dayOfWeek = now.getDay();
    const todayKey = dayKeys[dayOfWeek] || 'T6';
    const dayName = t(`days.${todayKey}.name`, dayNames[dayOfWeek] || 'Thứ Sáu');
    const formattedDate = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}`;
    const fullDate = todayIsoStr;

    const dt = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const isOutsideAcademicYear = dt < academicStartCutoff || dt > academicEndCutoff;
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    let isTodayHolidayLocked = false;
    let todayHolidayReason = '';
    const holidays = data?.holidays || [];
    const classAgeGroup = currentClass?.ageGroup || data?.classInfo?.ageGroup || 'NHA_TRE';
    if (fullDate && holidays.length > 0) {
      for (const h of holidays) {
        if (!h.isTeachingAllowed) {
          const appliesToGrade = !h.targetGrades?.length || h.targetGrades.includes(classAgeGroup);
          if (appliesToGrade && fullDate >= h.startDate && fullDate <= h.endDate) {
            isTodayHolidayLocked = true;
            todayHolidayReason = h.name;
            break;
          }
        }
      }
    }

    const isLocked = isOutsideAcademicYear || (isWeekend && !hasWeekendSlots) || isTodayHolidayLocked;

    return {
      key: todayKey,
      name: dayName,
      date: formattedDate,
      fullDate,
      isToday: true,
      isFuture: false,
      isAttendanceRecorded: Boolean(data?.attendanceDays?.[fullDate]),
      isHealthRecorded: Boolean(data?.healthDays?.[fullDate]),
      isDismissalRecorded: Boolean(data?.dismissalDays?.[fullDate]),
      isLocked,
      lockReason: isTodayHolidayLocked
        ? todayHolidayReason
        : isOutsideAcademicYear
          ? t('daily.outsideAcademicYear', 'Nằm ngoài năm học')
          : t('daily.holiday', 'Ngày nghỉ'),
      lockLabel: isTodayHolidayLocked
        ? t('daily.holiday', 'Ngày nghỉ')
        : isOutsideAcademicYear
          ? t('daily.extracurricular', 'Ngoại khóa')
          : t('daily.holiday', 'Ngày nghỉ'),
    };
  }, [currentDays, data, todayIsoStr, now, academicStartCutoff, academicEndCutoff, hasWeekendSlots, t, currentClass]);

  const isTodayLocked = Boolean(todayDay?.isLocked);

  // Sĩ số và các chỉ số tức thì của hôm nay (Điểm danh, Đón trẻ, Sức khỏe)
  const todayMetrics = useMemo(() => {
    const totalStudents = data?.classInfo?.studentCount ?? students.length ?? 0;
    const isAttDone = Boolean(todayDay?.isAttendanceRecorded);
    const isDisDone = Boolean(todayDay?.isDismissalRecorded);
    const isHlthDone = Boolean(todayDay?.isHealthRecorded);

    const isOverrideActive = dismissalStatsOverride && dismissalStatsOverride.dateStr === todayIsoStr;
    const activePresentCount = isOverrideActive && dismissalStatsOverride.presentCount !== undefined
      ? dismissalStatsOverride.presentCount
      : (data?.stats?.presentCount ?? students.filter((s) => s.status === 'PRESENT').length ?? totalStudents);
    const presentCount = isAttDone ? activePresentCount : 0;
    const absentCount = totalStudents > 0 && isAttDone ? Math.max(0, totalStudents - presentCount) : 0;

    const activeDismissedCount = isOverrideActive && dismissalStatsOverride.dismissedCount !== undefined
      ? dismissalStatsOverride.dismissedCount
      : (data?.stats?.dismissedCount ?? students.filter((s) => s.status === 'PRESENT' && s.checkOutTime).length ?? 0);
    const dismissedCount = isDisDone
      ? presentCount
      : activeDismissedCount;
    const remainingCount = isAttDone ? Math.max(0, presentCount - dismissedCount) : 0;

    const healthCount = isHlthDone
      ? (data?.stats?.healthCount ?? students.filter((s) => s.height || s.weight || s.healthNote).length ?? totalStudents)
      : 0;
    const healthAttentionCount = students.filter((s) => s.healthNote && s.healthNote.trim()).length;

    let classStatus = 'NOT_STARTED';
    if (isTodayLocked) {
      classStatus = 'LOCKED';
    } else if (isDisDone || (isAttDone && presentCount > 0 && remainingCount === 0)) {
      classStatus = 'COMPLETED';
    } else if (isAttDone) {
      if (dismissedCount > 0) {
        classStatus = 'DISMISSING';
      } else {
        const curHour = now.getHours();
        const curMin = now.getMinutes();
        const isPickupTime = curHour > 15 || (curHour === 15 && curMin >= 30);
        classStatus = isPickupTime ? 'DISMISSING' : 'IN_PROGRESS';
      }
    }

    return {
      totalStudents,
      isAttDone,
      presentCount,
      absentCount,
      isDisDone,
      dismissedCount,
      remainingCount,
      isHlthDone,
      healthCount,
      healthAttentionCount,
      classStatus,
    };
  }, [data, students, todayDay, now, isTodayLocked, dismissalStatsOverride, todayIsoStr]);

  const handleOpenTodayTab = (tab = 'attendance') => {
    if (isTodayLocked) return;
    if (!activeWeekObj?.isCurrentWeek) {
      handleGoToCurrentWeek();
    }
    if (todayDay) {
      handleSelectDay(todayDay, tab);
    }
  };

  // Danh sách các hoạt động trong cùng ngày của slot đang mở, sắp xếp theo trình tự thời gian và thứ tự thực hiện
  const effectiveSlots = useMemo(() => {
    const hasT7Slots = (slots || []).some((s) => (s.dayKey || s.day) === 'T7');
    if (hasT7Slots) return slots;

    const satDay = (currentDays || []).find((d) => d.key === 'T7' && d.isSaturdayMakeup && d.makeupHoliday);
    if (!satDay || !satDay.makeupHoliday?.startDate) return slots;

    const origHolidayDate = satDay.makeupHoliday.startDate;
    const origDayObj = (currentDays || []).find((d) => d.fullDate === origHolidayDate);
    const origDayKey = origDayObj?.key;

    const origSlots = (slots || []).filter((s) => {
      if (s.fullDate && s.fullDate === origHolidayDate) return true;
      if (origDayKey && (s.dayKey || s.day) === origDayKey) return true;
      return false;
    });

    if (origSlots.length === 0) return slots;

    const mirroredT7Slots = origSlots.map((s, idx) => ({
      ...s,
      id: `makeup-t7-${s.id || idx}`,
      day: 'T7',
      dayKey: 'T7',
      date: satDay.date,
      fullDate: satDay.fullDate,
      notes: s.notes ? `[Bù cho ${origDayObj?.name || 'ngày nghỉ'}] ${s.notes}` : `[Bù cho ${origDayObj?.name || 'ngày nghỉ'}]`,
    }));

    return [...slots, ...mirroredT7Slots];
  }, [slots, currentDays]);

  const activeDaySlots = useMemo(() => {
    if (!activeSlot) return [];
    const dayKey = activeSlot.dayKey || activeSlot.day;
    if (!dayKey) return [];

    const routineSlotOrder = {
      ARRIVAL_PLAY: 0,
      MORNING_EXERCISE: 1,
      DIRECTED_STUDY: 2,
      CORNER_PLAY: 3,
      OUTDOOR_PLAY: 4,
      AFTERNOON_ACTIVITY: 5,
      RETURN_CHILD: 6,
    };

    return effectiveSlots
      .filter((s) => {
        const sDayKey = s.dayKey || s.day;
        return sDayKey === dayKey;
      })
      .sort((a, b) => {
        const orderA = routineSlotOrder[a.routineSlot || a.routine_slot || a.slotKey] ?? 99;
        const orderB = routineSlotOrder[b.routineSlot || b.routine_slot || b.slotKey] ?? 99;
        if (orderA !== orderB) return orderA - orderB;
        const subOrderA = a.orderIndex !== undefined ? Number(a.orderIndex) : (a.order_index !== undefined ? Number(a.order_index) : 1);
        const subOrderB = b.orderIndex !== undefined ? Number(b.orderIndex) : (b.order_index !== undefined ? Number(b.order_index) : 1);
        if (subOrderA !== subOrderB) return subOrderA - subOrderB;
        return (a.startTime || '').localeCompare(b.startTime || '');
      });
  }, [effectiveSlots, activeSlot]);

  const currentSlotIndex = useMemo(() => {
    if (!activeSlot || activeDaySlots.length === 0) return -1;
    const byId = activeDaySlots.findIndex((s) => String(s.id) === String(activeSlot.id));
    if (byId !== -1) return byId;
    return activeDaySlots.findIndex(
      (s) =>
        (s.routineSlot || s.routine_slot || s.slotKey) ===
        (activeSlot.routineSlot || activeSlot.routine_slot || activeSlot.slotKey)
    );
  }, [activeDaySlots, activeSlot]);

  const prevSlot = currentSlotIndex > 0 ? activeDaySlots[currentSlotIndex - 1] : null;
  const nextSlot =
    currentSlotIndex >= 0 && currentSlotIndex < activeDaySlots.length - 1
      ? activeDaySlots[currentSlotIndex + 1]
      : null;

  const handlePrevSlot = () => {
    if (prevSlot) {
      const dayObj = currentDays.find((d) => d.key === (prevSlot.dayKey || prevSlot.day));
      handleSelectSlot(prevSlot, dayObj);
    }
  };

  const handleNextSlot = () => {
    if (nextSlot) {
      const dayObj = currentDays.find((d) => d.key === (nextSlot.dayKey || nextSlot.day));
      handleSelectSlot(nextSlot, dayObj);
    }
  };

  // Close modals on Escape key or navigate slots / weeks with ArrowLeft / ArrowRight
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target?.tagName) || e.target?.isContentEditable) return;

      if (e.key === 'Escape') {
        if (cleanConfirmDialog) {
          setCleanConfirmDialog(null);
          return;
        }
        if (activeSlot) setActiveSlot(null);
        if (activeDay) setActiveDay(null);
        if (isCalendarOpen) setIsCalendarOpen(false);
        return;
      }

      // Phím tắt điều hướng hoạt động trong ngày khi Drawer đang mở
      if (activeSlot) {
        if (e.key === 'ArrowLeft' && prevSlot) {
          e.preventDefault();
          handlePrevSlot();
        } else if (e.key === 'ArrowRight' && nextSlot) {
          e.preventDefault();
          handleNextSlot();
        }
        return;
      }

      // Khi không mở Drawer nào: Phím Mũi tên trái/phải -> Chuyển tuần học
      if (!activeSlot && !activeDay && !isCalendarOpen) {
        if (e.key === 'ArrowLeft' && !e.ctrlKey && !e.altKey && !e.metaKey) {
          e.preventDefault();
          handlePrevWeek();
        } else if (e.key === 'ArrowRight' && !e.ctrlKey && !e.altKey && !e.metaKey) {
          e.preventDefault();
          handleNextWeek();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeSlot, activeDay, isCalendarOpen, prevSlot, nextSlot, selectedWeekId, currentDays]);

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
      className="w-full flex-1 flex flex-col bg-background text-foreground select-none gap-3.5 pb-8"
      data-name="DailyRoutineHubPage"
    >
      {/* 1. Header Toolbar (Nằm phía trên table, tiêu đề "Nhật ký ngày" và cụm điều chỉnh tuần) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60 shrink-0">
        <div className="flex flex-col gap-1">
          <h1 className="text-[26px] font-semibold text-foreground tracking-tight">
            {t('nav.dailyRoutine', 'Nhật ký ngày')}
          </h1>
          <p className="text-[12px] text-muted-foreground font-normal">
            {t('dailyRoutine.subtitle', 'Theo dõi thời khóa biểu, điểm danh, đánh giá và sức khỏe học sinh theo từng tiết học')}
          </p>
        </div>

        {/* Cụm điều chỉnh date: Tuần hiện tại bên ngoài + Khung tuần đồng bộ + Nút mở lịch */}
        <div className="relative flex items-center gap-2.5 self-start sm:self-center shrink-0 flex-wrap sm:flex-nowrap">
          {/* Badge / Nút Tuần hiện tại: Xanh lá khi ở tuần hiện tại, Xám & bấm để quay về khi ở tuần khác */}
          <button
            type="button"
            onClick={!activeWeekObj?.isCurrentWeek ? handleGoToCurrentWeek : undefined}
            disabled={activeWeekObj?.isCurrentWeek}
            className={cn(
              'inline-flex items-center px-2.5 h-8 text-[12px] font-medium rounded-none border shrink-0 select-none whitespace-nowrap transition-all',
              activeWeekObj?.isCurrentWeek
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 cursor-default'
                : 'bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground border-border hover:border-foreground/30 cursor-pointer shadow-2xs active:scale-[0.98]'
            )}
            title={
              activeWeekObj?.isCurrentWeek
                ? t('planning.currentWeekBadge', 'Tuần hiện tại')
                : t('planning.backToCurrentWeek', 'Về tuần hiện tại')
            }
          >
            {activeWeekObj?.isCurrentWeek
              ? t('planning.currentWeekBadge', 'Tuần hiện tại')
              : t('planning.backToCurrentWeek', 'Về tuần hiện tại')}
          </button>

          {/* Khung đồng bộ hiển thị Tuần (chiều rộng cố định để không bị co giãn hay nhảy khung) */}
          <div className="flex items-center border border-border bg-background text-[12.5px] rounded-none shadow-2xs">
            <button
              type="button"
              onClick={handlePrevWeek}
              disabled={CALENDAR_WEEKS.findIndex((w) => w.id === selectedWeekId) <= 0}
              className="size-8 flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground border-r border-border transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
              title={t('attendance.prevWeek', 'Tuần trước (Phím ←)')}
            >
              <HugeiconsIcon icon={ArrowLeft02Icon} size={14} />
            </button>

            <div className="w-[195px] h-8 flex items-center justify-center font-medium select-none text-[12.5px] text-foreground tabular-nums shrink-0">
              <span>{t('common.week', 'Tuần')} {activeWeekObj?.label}</span>
            </div>

            <button
              type="button"
              onClick={handleNextWeek}
              disabled={CALENDAR_WEEKS.findIndex((w) => w.id === selectedWeekId) >= CALENDAR_WEEKS.length - 1}
              className="size-8 flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground border-l border-border transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
              title={t('attendance.nextWeek', 'Tuần sau (Phím →)')}
            >
              <HugeiconsIcon icon={ArrowRight02Icon} size={14} />
            </button>
          </div>

          {/* Nút mở Drawer chọn tuần từ lịch */}
          <button
            type="button"
            onClick={() => setIsCalendarOpen(!isCalendarOpen)}
            className={cn(
              'size-8 flex items-center justify-center border border-border transition-colors cursor-pointer rounded-none shrink-0',
              isCalendarOpen
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background hover:bg-muted text-muted-foreground hover:text-foreground'
            )}
            title={t('attendance.toggleCalendar', 'Chọn tuần từ lịch')}
          >
            <HugeiconsIcon icon={SidebarRightIcon} size={15} />
          </button>

          {/* Nút bật/tắt hiển thị Thứ 7 & Chủ nhật */}
          <button
            type="button"
            onClick={handleToggleWeekend}
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 h-8 text-[12px] font-medium border rounded-none transition-colors cursor-pointer shrink-0 select-none',
              showWeekend
                ? 'bg-primary/10 text-primary border-primary/40 font-semibold'
                : 'bg-background hover:bg-muted text-muted-foreground hover:text-foreground border-border'
            )}
            title={showWeekend ? t('daily.hideWeekend', 'Ẩn Thứ 7 & Chủ nhật') : t('daily.showWeekend', 'Hiện Thứ 7 & Chủ nhật')}
          >
            <HugeiconsIcon icon={Calendar03Icon} size={14} />
            <span>{showWeekend ? t('daily.hideWeekendShort', 'Ẩn T7, CN') : t('daily.showWeekendShort', 'Hiện T7, CN')}</span>
          </button>
        </div>
      </div>

      {/* 1.1 Thanh tổng quan hôm nay (Today's Pulse Strip: Tinh gọn, chuyên nghiệp, gắn liền với nhịp vận hành) */}
      <div className="flex items-center justify-between gap-3 px-3.5 py-2 border border-border bg-card text-[12.5px] rounded-none select-none shadow-2xs overflow-hidden">
        {/* Khối bên trái: Hôm nay & Trạng thái hoạt động & Chủ đề/Chủ đề nhánh trên cùng 1 hàng */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Thứ & Ngày */}
          <div className="flex items-center gap-2.5 shrink-0">
            <span className="text-[14px] font-bold tracking-tight text-foreground whitespace-nowrap">
              {todayDay ? `${todayDay.name}, ${todayDay.date}` : `${t('daily.badgeToday', 'Hôm nay')}, ${pad(now.getDate())}/${pad(now.getMonth() + 1)}`}
            </span>
          </div>

          {/* Vạch phân cách */}
          <div className="h-3.5 w-px bg-border/80 hidden sm:block shrink-0" />

          {/* Chủ đề & Chủ đề nhánh dạng phân cấp chuyên nghiệp với Tooltip & Truncate thông minh */}
          <div
            className="flex items-center gap-1.5 text-[12.5px] text-muted-foreground min-w-0 flex-1 overflow-hidden"
            title={`${t('daily.theme', 'Chủ đề')}: ${currentThemeName || t('daily.noTheme', 'Chưa có chủ đề')}${currentSubThemeName ? ` / ${currentSubThemeName}` : ''}`}
          >
            <span className="text-muted-foreground/80 font-normal shrink-0">{t('daily.theme', 'Chủ đề')}:</span>
            <span
              className={cn(
                'truncate shrink min-w-0',
                currentThemeName
                  ? 'font-semibold text-foreground max-w-[240px]'
                  : 'font-normal italic text-muted-foreground/80'
              )}
              title={currentThemeName || t('daily.noTheme', 'Chưa có chủ đề')}
            >
              {currentThemeName || t('daily.noTheme', 'Chưa có chủ đề')}
            </span>
            {currentSubThemeName && (
              <>
                <span className="text-muted-foreground/40 font-light select-none shrink-0">/</span>
                <span
                  className="font-medium text-primary truncate min-w-0 flex-1"
                  title={currentSubThemeName}
                >
                  {currentSubThemeName}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Khối bên phải (Sát bên phải): Metric thu gọn (1 trong 2: Điểm danh hoặc Đón trẻ; Sức khỏe nếu có) + Nút mở nhật ký */}
        <div className="flex items-center gap-2.5 ml-auto shrink-0">
          {(() => {
            const showDismissalInstead = Boolean(
              todayMetrics.classStatus === 'DISMISSING' ||
              todayMetrics.classStatus === 'COMPLETED' ||
              (todayMetrics.isAttDone && todayMetrics.dismissedCount > 0)
            );
            const hasHealthData = Boolean(
              todayMetrics.isHlthDone || todayMetrics.healthAttentionCount > 0
            );

            return (
              <div
                className={cn(
                  'inline-flex items-center border border-border divide-x divide-border bg-background shadow-2xs rounded-none overflow-hidden shrink-0',
                  isTodayLocked && 'opacity-60'
                )}
              >
                {!showDismissalInstead ? (
                  /* 1. Điểm danh */
                  <button
                    type="button"
                    disabled={isTodayLocked}
                    onClick={() => !isTodayLocked && handleOpenTodayTab('attendance')}
                    className={cn(
                      'inline-flex items-center gap-2 px-3 py-1.5 text-[12px] transition-colors',
                      isTodayLocked
                        ? 'cursor-not-allowed text-muted-foreground pointer-events-none'
                        : 'hover:bg-muted/60 cursor-pointer text-foreground'
                    )}
                    title={isTodayLocked ? t('daily.lockedDayTooltip', 'Ngày đã khóa') : t('attendance.quickCheckInTooltip', 'Nhấp để xem hoặc điểm danh hôm nay')}
                  >
                    <HugeiconsIcon icon={TaskDone01Icon} size={14} className="text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground text-[11.5px] font-medium">{t('attendance.title', 'Điểm danh')}:</span>
                    {isTodayLocked ? (
                      <span className="text-muted-foreground/60">—</span>
                    ) : todayMetrics.isAttDone ? (
                      <span className="font-medium text-foreground tabular-nums">
                        {todayMetrics.presentCount}/{todayMetrics.totalStudents} <span className="font-normal text-muted-foreground">{t('attendance.presentUnit', 'có mặt')}</span>
                        {todayMetrics.absentCount > 0 && (
                          <span className="ml-1 text-[11px] text-rose-600 dark:text-rose-400 font-medium">({todayMetrics.absentCount} {t('attendance.absentUnit', 'vắng')})</span>
                        )}
                      </span>
                    ) : (
                      <span className="text-muted-foreground font-normal">{t('attendance.notRecordedYet', 'Chưa điểm danh')}</span>
                    )}
                  </button>
                ) : (
                  /* 2. Đón trẻ */
                  <button
                    type="button"
                    disabled={isTodayLocked}
                    onClick={() => !isTodayLocked && handleOpenTodayTab('dismissal')}
                    className={cn(
                      'inline-flex items-center gap-2 px-3 py-1.5 text-[12px] transition-colors',
                      isTodayLocked
                        ? 'cursor-not-allowed text-muted-foreground pointer-events-none'
                        : 'hover:bg-muted/60 cursor-pointer text-foreground'
                    )}
                    title={isTodayLocked ? t('daily.lockedDayTooltip', 'Ngày đã khóa') : t('attendance.quickDismissalTooltip', 'Nhấp để xem hoặc ghi nhận đón trẻ hôm nay')}
                  >
                    <HugeiconsIcon icon={Door01Icon} size={14} className="text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground text-[11.5px] font-medium">{t('attendance.tabDismissal', 'Đón trẻ')}:</span>
                    {isTodayLocked ? (
                      <span className="text-muted-foreground/60">—</span>
                    ) : todayMetrics.classStatus === 'COMPLETED' ? (
                      <span className="font-medium text-emerald-700 dark:text-emerald-400 tabular-nums">
                        {t('attendance.allDismissedDone', 'Đã đón hết')} ({todayMetrics.dismissedCount}/{todayMetrics.presentCount})
                      </span>
                    ) : todayMetrics.isAttDone ? (
                      <span className="font-medium text-foreground tabular-nums">
                        {todayMetrics.dismissedCount}/{todayMetrics.presentCount} <span className="font-normal text-muted-foreground">{t('attendance.dismissedUnit', 'đã về')}</span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground font-normal">{t('attendance.waitingAttendance', 'Chờ điểm danh')}</span>
                    )}
                  </button>
                )}

                {/* 3. Sức khỏe: Chỉ hiển thị khi có dữ liệu ghi nhận */}
                {hasHealthData && (
                  <button
                    type="button"
                    disabled={isTodayLocked}
                    onClick={() => !isTodayLocked && handleOpenTodayTab('health')}
                    className={cn(
                      'inline-flex items-center gap-2 px-3 py-1.5 text-[12px] transition-colors',
                      isTodayLocked
                        ? 'cursor-not-allowed text-muted-foreground pointer-events-none'
                        : 'hover:bg-muted/60 cursor-pointer text-foreground'
                    )}
                    title={isTodayLocked ? t('daily.lockedDayTooltip', 'Ngày đã khóa') : t('health.quickHealthTooltip', 'Nhấp để xem hoặc cập nhật sức khỏe hôm nay')}
                  >
                    <HugeiconsIcon icon={MedicalFileIcon} size={14} className="text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground text-[11.5px] font-medium">{t('health.title', 'Sức khỏe')}:</span>
                    {isTodayLocked ? (
                      <span className="text-muted-foreground/60">—</span>
                    ) : todayMetrics.healthAttentionCount > 0 ? (
                      <span className="font-medium text-amber-700 dark:text-amber-400">
                        {todayMetrics.healthAttentionCount} {t('health.needAttentionUnit', 'bé cần lưu ý')}
                      </span>
                    ) : (
                      <span className="font-medium text-foreground tabular-nums">
                        {todayMetrics.healthCount}/{todayMetrics.totalStudents} <span className="font-normal text-muted-foreground">{t('health.checkedUnit', 'đã kiểm tra')}</span>
                      </span>
                    )}
                  </button>
                )}
              </div>
            );
          })()}

          {/* Nút thao tác mở nhật ký hôm nay */}
          {isTodayLocked ? (
            <button
              type="button"
              disabled
              className="inline-flex items-center gap-1.5 px-3 h-8 text-[12px] font-medium bg-muted/60 text-muted-foreground/45 border border-border/80 rounded-none cursor-not-allowed select-none shadow-none shrink-0"
              title={t('daily.todayLockedTooltip', 'Hôm nay đã bị khóa (ngày nghỉ hoặc ngoài năm học)')}
            >
              <span>{t('daily.openTodayJournal', 'Nhật ký hôm nay')}</span>
              <HugeiconsIcon icon={ArrowRight02Icon} size={13} className="opacity-30" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleOpenTodayTab()}
              className="inline-flex items-center gap-1.5 px-3.5 h-8 text-[12px] font-medium bg-[#1447e6] hover:bg-[#1447e6]/90 text-white rounded-none transition-colors cursor-pointer shadow-2xs select-none active:scale-[0.98] shrink-0"
              title={!activeWeekObj?.isCurrentWeek ? t('daily.openTodayJournalOtherWeekTooltip', 'Mở nhật ký ngày hôm nay (Đang xem tuần khác)') : undefined}
            >
              <span>{t('daily.openTodayJournal', 'Mở nhật ký hôm nay')}</span>
              <HugeiconsIcon icon={ArrowRight02Icon} size={13} />
            </button>
          )}
        </div>
      </div>

      {/* 2. Main Workspace: Full-width Timetable Grid với Header Bar tích hợp Chủ đề & Chủ đề nhánh */}
      <TeacherTimetableGrid
        title={t('planning.tabTimetable', 'Thời khoá biểu')}
        dateRange={activeWeekObj?.label || '28/09/2026 – 04/10/2026'}
        themeName={currentThemeName}
        subThemeName={currentSubThemeName}
        days={currentDays}
        slots={effectiveSlots}
        activeSlotId={activeSlot?.id}
        activeDayKey={activeDay?.key || activeSlot?.day || activeSlot?.dayKey}
        mode="daily"
        readOnly={isBgh}
        onSelectSlot={handleSelectSlot}
        onSelectDay={handleSelectDay}
        hideHeader={true}
        showWeekend={showWeekend}
        onToggleWeekend={handleToggleWeekend}
        isDrawerOpen={Boolean(activeDay || activeSlot)}
      />

      {/* 3. Slide-over Week Picker Overlay Drawer (Thiết kế đồng bộ với TeacherDrawer) */}
      {isCalendarOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            onClick={() => setIsCalendarOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in-0 duration-200"
          />

          {/* Drawer Panel */}
          <div
            className="relative w-full max-w-[340px] h-full bg-card border-l border-border shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-250 ease-out z-10 text-foreground"
            onClick={(e) => e.stopPropagation()}
            data-name="WeekPickerDrawer"
          >
            {/* Header đồng bộ TeacherDrawer */}
            <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-border shrink-0 bg-card">
              <div className="flex flex-col gap-1">
                <h2 className="text-[18px] font-semibold text-foreground tracking-tight">
                  {t('planning.selectWeek', 'Chọn tuần học')}
                </h2>
                <p className="text-[12px] text-muted-foreground font-normal">
                  {t('daily.selectWeekDrawerSubtitle', 'Lựa chọn tuần để xem thời khóa biểu và nhật ký ngày')}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsCalendarOpen(false)}
                className="size-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-none transition-colors cursor-pointer"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={16} />
              </button>
            </div>

            {/* Scrollable Calendar Body */}
            <div className="flex-1 overflow-y-auto p-4">
              <WeekPickerCalendar
                className="w-full border-l-0 shadow-none p-0"
                selectedWeek={selectedWeekId}
                onSelectWeek={(week) => {
                  setSelectedWeekId(week.id);
                  setActiveSlot(null);
                  setActiveDay(null);
                  setIsCalendarOpen(false);
                }}
              />
            </div>

            {/* Footer đồng bộ TeacherDrawer */}
            <div className="flex items-center justify-end px-6 py-4 border-t border-border shrink-0 bg-background">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCalendarOpen(false)}
                className="h-8 px-4 text-[13px] rounded-none border-border cursor-pointer"
              >
                {t('common.close', 'Đóng')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Day Drawer: Điểm danh & Sức khoẻ theo thứ / ngày */}
      {activeDay && (() => {
        // Mở cho phép điểm danh, sức khoẻ, đón trẻ trong tương lai theo yêu cầu
        const isDayInPast = false;
        const todayStr = new Date().toISOString().slice(0, 10);
        const isDayInFuture = false;
        const isDayLockedForEdit = isBgh || Boolean(activeDay?.isLocked) || isSchoolYearEnded;
        const isHealthLockedForEdit = isBgh || Boolean(activeDay?.isLocked) || isSchoolYearEnded;

        return (
          <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <div
              onClick={handleCloseDay}
              className="fixed inset-0 bg-black/15 transition-opacity animate-in fade-in-0 duration-200"
            />

            {/* Large Day Drawer Panel */}
            <div
              className="relative w-full max-w-[680px] sm:max-w-[740px] h-full bg-card border-l border-border shadow-2xl flex flex-col justify-between text-foreground select-none overflow-hidden animate-in slide-in-from-right duration-250 ease-out z-10"
              onClick={(e) => e.stopPropagation()}
              data-name="DayRoutineDrawer"
            >
              {/* Header: Sạch sẽ, có badge thứ/ngày tinh tế để giáo viên không nhầm lẫn */}
              <div className="px-6 pt-5 pb-0 border-b border-border shrink-0 bg-card flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-[18px] font-semibold text-foreground tracking-tight truncate">
                        {t('daily.attendanceHealthDrawerTitle', 'Điểm danh & Sức khỏe')}
                      </h2>
                      {activeDay?.isToday && (
                        <span className="inline-flex items-center h-6 px-2.5 text-[11.5px] font-semibold border border-blue-500/25 bg-blue-500/10 text-[#1447e6] dark:text-blue-400 rounded-none shrink-0 select-none whitespace-nowrap">
                          {t('daily.badgeToday', 'Hôm nay')}
                        </span>
                      )}
                      {isDayInPast && (
                        <span className="inline-flex items-center h-6 px-2.5 text-[11.5px] font-medium border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-none shrink-0 select-none whitespace-nowrap">
                          {t('daily.pastDayViewOnly', 'Đã qua ngày (Chỉ xem)')}
                        </span>
                      )}
                      {activeDay?.date && (
                        <span className="inline-flex items-center h-6 px-2 text-[11.5px] font-medium bg-muted/80 text-foreground border border-border/80 shrink-0 select-none">
                          {activeDay.name ? `${activeDay.name}, ${activeDay.date}` : activeDay.date}
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] text-muted-foreground font-normal">
                      {t('daily.attendanceHealthDrawerDesc', 'Ghi nhận điểm danh và theo dõi chỉ số sức khỏe của học sinh')}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Menu 3 chấm Tùy chọn khác */}
                    {!isDayLockedForEdit && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="size-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-none transition-colors cursor-pointer shrink-0"
                            title={t('common.moreOptions', 'Tùy chọn khác')}
                          >
                            <HugeiconsIcon icon={MoreHorizontalIcon} size={16} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52 rounded-none shadow-md">
                          <DropdownMenuItem
                        disabled={!activeDay?.isAttendanceRecorded || isCleaningDay}
                        onClick={() =>
                          setCleanConfirmDialog({
                            type: 'attendance',
                            title: t('daily.deleteAttendanceDayTitle', 'Xóa điểm danh ngày này'),
                            message: t(
                              'daily.confirmDeleteAttendanceDayDesc',
                              'Bạn có chắc chắn muốn xóa toàn bộ điểm danh của ngày {{date}}? Thao tác này không thể hoàn tác.',
                              { date: activeDay?.date || activeDay?.name }
                            ),
                          })
                        }
                        className="cursor-pointer text-[12.5px] py-2 px-3 text-foreground rounded-none disabled:opacity-35 disabled:cursor-not-allowed"
                      >
                        <span>{t('daily.deleteAttendanceDayBtn', 'Xoá điểm danh ngày này')}</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={!Boolean(activeDay && recordedHealthDays[activeDay.key]) || isCleaningDay}
                        onClick={() =>
                          setCleanConfirmDialog({
                            type: 'health',
                            title: t('daily.deleteHealthDayTitle', 'Xóa sức khỏe ngày này'),
                            message: t(
                              'daily.confirmDeleteHealthDayDesc',
                              'Bạn có chắc chắn muốn xóa toàn bộ dữ liệu sức khỏe của ngày {{date}}? Thao tác này không thể hoàn tác.',
                              { date: activeDay?.date || activeDay?.name }
                            ),
                          })
                        }
                        className="cursor-pointer text-[12.5px] py-2 px-3 text-foreground rounded-none disabled:opacity-35 disabled:cursor-not-allowed"
                      >
                        <span>{t('daily.deleteHealthDayBtn', 'Xoá sức khỏe ngày này')}</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={
                          !Boolean(activeDay && (recordedDismissalDays[activeDay.key] || students.some((s) => s.checkOutTime))) ||
                          isCleaningDay
                        }
                        onClick={() =>
                          setCleanConfirmDialog({
                            type: 'dismissal',
                            title: t('daily.deleteDismissalDayTitle', 'Xóa đón trẻ ngày này'),
                            message: t(
                              'daily.confirmDeleteDismissalDayDesc',
                              'Bạn có chắc chắn muốn xóa toàn bộ thông tin đón trẻ của ngày {{date}}? Tất cả học sinh đã đón sẽ quay về trạng thái "Đang ở lớp".',
                              { date: activeDay?.date || activeDay?.name }
                            ),
                          })
                        }
                        className="cursor-pointer text-[12.5px] py-2 px-3 text-foreground rounded-none disabled:opacity-35 disabled:cursor-not-allowed"
                      >
                        <span>{t('daily.deleteDismissalDayBtn', 'Xoá đón trẻ ngày này')}</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  )}

                  <button
                    type="button"
                    onClick={handleCloseDay}
                    className="size-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-none transition-colors cursor-pointer shrink-0"
                    title={t('common.close', 'Đóng (Esc)')}
                  >
                    <HugeiconsIcon icon={Cancel01Icon} size={16} />
                  </button>
                </div>
              </div>

              {/* 3 Tabs: Điểm danh · Sức khỏe · Đón trẻ */}
              <div className="flex items-center gap-4 border-b border-border/80 -mx-6 px-6 text-[13px] pt-1">
                <button
                  type="button"
                  onClick={() => setDayTab('attendance')}
                  className={cn(
                    'pb-2.5 px-1 font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-2 -mb-[1px]',
                    dayTab === 'attendance'
                      ? 'border-primary text-foreground font-semibold'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  )}
                >
                  <HugeiconsIcon icon={TaskDone01Icon} size={15} />
                  <span>{t('attendance.title', 'Điểm danh')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDayTab('health')}
                  className={cn(
                    'pb-2.5 px-1 font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-2 -mb-[1px]',
                    dayTab === 'health'
                      ? 'border-primary text-foreground font-semibold'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  )}
                >
                  <HugeiconsIcon icon={MedicalFileIcon} size={15} />
                  <span>{t('health.title', 'Sức khỏe')}</span>
                </button>
                <button
                  type="button"
                  disabled={!activeDay?.isAttendanceRecorded}
                  onClick={() => activeDay?.isAttendanceRecorded && setDayTab('dismissal')}
                  className={cn(
                    'pb-2.5 px-1 font-medium border-b-2 transition-colors flex items-center gap-2 -mb-[1px]',
                    !activeDay?.isAttendanceRecorded
                      ? 'border-transparent text-muted-foreground/35 cursor-not-allowed'
                      : dayTab === 'dismissal'
                        ? 'border-primary text-foreground font-semibold cursor-pointer'
                        : 'border-transparent text-muted-foreground hover:text-foreground cursor-pointer'
                  )}
                  title={
                    !activeDay?.isAttendanceRecorded
                      ? t('attendance.dismissalDisabledHint', 'Cần hoàn thành điểm danh ngày này trước khi đón trẻ')
                      : undefined
                  }
                >
                  <HugeiconsIcon
                    icon={Door01Icon}
                    size={15}
                  />
                  <span>{t('attendance.tabDismissal', 'Đón trẻ')}</span>
                </button>
              </div>
            </div>

            {/* Tab Body Content */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-background/50">
              {dayTab === 'attendance' && (
                <AttendanceCheckInPanel
                  classId={targetClassId}
                  date={activeDay?.fullDate || '2026-10-13'}
                  initialStudents={students}
                  isRecorded={Boolean(activeDay?.isAttendanceRecorded)}
                  readOnly={isDayLockedForEdit}
                  onTabChange={setDayTab}
                  onClose={handleCloseDay}
                  onStudentsChange={setStudents}
                  onSaveSuccess={(updated) => {
                    setStudents(updated);
                    if (activeDay?.key) {
                      setAttendanceOverrides((prev) => ({
                        ...prev,
                        [`${activeWeekObj.id}-${activeDay.key}`]: true,
                      }));
                      setActiveDay((prev) => prev ? { ...prev, isAttendanceRecorded: true } : null);
                    }
                  }}
                  onCleanSuccess={(resetStudents) => {
                    const cleaned = resetStudents.map((s) => ({
                      ...s,
                      checkOutTime: null,
                      checkOutTimeFormatted: null,
                      pickupPerson: '',
                      pickupPersonName: null,
                      pickupRelationship: null,
                    }));
                    setStudents(cleaned);
                    if (activeDay?.key) {
                      setAttendanceOverrides((prev) => ({
                        ...prev,
                        [`${activeWeekObj.id}-${activeDay.key}`]: false,
                      }));
                      setRecordedDismissalDays((prev) => ({
                        ...prev,
                        [activeDay.key]: false,
                      }));
                      if (activeDay?.fullDate) {
                        setDismissalOverrides((prev) => ({
                          ...prev,
                          [activeDay.fullDate]: false,
                        }));
                      }
                      setActiveDay((prev) => prev ? { ...prev, isAttendanceRecorded: false, isDismissalRecorded: false } : null);
                    }
                    setDismissalRefreshKey((prev) => prev + 1);
                    if (dayTab === 'dismissal') {
                      setDayTab('attendance');
                    }
                  }}
                  hideHeader
                />
              )}
              {dayTab === 'health' && (
                <HealthMeasurementPanel
                  classId={targetClassId}
                  date={activeDay?.fullDate || '2026-10-12'}
                  initialStudents={students}
                  isRecorded={Boolean(activeDay && (recordedHealthDays[activeDay.key] || activeDay.isHealthRecorded))}
                  readOnly={isHealthLockedForEdit}
                  onTabChange={setDayTab}
                  onClose={handleCloseDay}
                  onStudentsChange={setStudents}
                  onSaveSuccess={(updated) => {
                    setStudents(updated);
                    if (activeDay?.key) {
                      setRecordedHealthDays((prev) => ({ ...prev, [activeDay.key]: true }));
                    }
                  }}
                  onCleanSuccess={(resetStudents) => {
                    setStudents(resetStudents);
                    if (activeDay?.key) {
                      setRecordedHealthDays((prev) => {
                        const next = { ...prev };
                        delete next[activeDay.key];
                        return next;
                      });
                    }
                  }}
                  hideHeader
                />
              )}
              {dayTab === 'dismissal' && (
                <ChildDismissalPanel
                  key={`${targetClassId}-${activeDay?.fullDate || '2026-10-13'}-${dismissalRefreshKey}`}
                  classId={targetClassId}
                  date={activeDay?.fullDate || '2026-10-13'}
                  readOnly={isDayLockedForEdit}
                  onTabChange={setDayTab}
                  onClose={handleCloseDay}
                  onDismissalChange={handleDismissalChange}
                  hideHeader
                />
              )}
            </div>
          </div>
        </div>
        );
      })()}

      {/* 5. Slot Drawer: Hoạt động giáo dục (Tab 1: Nội dung, Tab 2: Chấm điểm) */}
      {activeSlot && (() => {
        const slotDayObj = currentDays.find(
          (d) => d.key === activeSlot?.day || d.key === activeSlot?.dayKey
        );
        const slotDayDate = slotDayObj?.date;
        const slotTimeStr = activeSlot?.startTime ? `${activeSlot.startTime}${activeSlot.endTime ? ` – ${activeSlot.endTime}` : ''}` : null;

        const slotTitle = (activeSlot?.title || '').trim();
        const slotRoutineKey = activeSlot?.routineSlot || activeSlot?.routine_slot || activeSlot?.slotKey;
        let slotActivityType = activeSlot?.activityType || activeSlot?.activity_type;
        if (!slotActivityType) {
          if (slotTitle.startsWith('Tạo hình') || slotTitle.includes('Tô màu')) {
            slotActivityType = 'Tạo hình';
          } else if (slotTitle.startsWith('Thơ') || slotTitle.includes('Đèn giao thông')) {
            slotActivityType = 'Thơ';
          } else if (slotTitle.startsWith('Âm nhạc')) {
            slotActivityType = 'Âm nhạc';
          } else if (slotTitle.startsWith('Vận động')) {
            slotActivityType = slotRoutineKey === 'MORNING_EXERCISE' ? 'Thể dục sáng' : 'Vận động';
          } else if (slotTitle.startsWith('Kể chuyện')) {
            slotActivityType = 'Kể chuyện';
          } else if (slotRoutineKey === 'CORNER_PLAY' || slotTitle.includes('Góc')) {
            slotActivityType = 'Hoạt động góc';
          } else if (slotRoutineKey === 'OUTDOOR_PLAY' || slotTitle.includes('Ngoài trời')) {
            slotActivityType = 'Chơi ngoài trời';
          } else if (slotRoutineKey === 'ARRIVAL_PLAY' || slotTitle.includes('Đón trẻ')) {
            slotActivityType = 'Đón trẻ, chơi';
          } else if (slotRoutineKey === 'AFTERNOON_ACTIVITY' || slotTitle.includes('Hoạt động chiều')) {
            slotActivityType = 'Hoạt động chiều';
          } else if (slotRoutineKey === 'RETURN_CHILD' || slotTitle.includes('Trả trẻ')) {
            slotActivityType = 'Trả trẻ';
          } else if (slotRoutineKey === 'DIRECTED_STUDY') {
            slotActivityType = 'Hoạt động học';
          } else {
            slotActivityType = 'Hoạt động giáo dục';
          }
        }

        const isSlotAssessed = Boolean(activeSlot?.status === 'COMPLETED' || activeSlot?.isEvaluated);
        const slotFullDate = activeSlot?.fullDate || slotDayObj?.fullDate;
        // Tạm thời tắt khóa qua ngày theo yêu cầu để phục vụ kiểm thử (Thread #8 - ID: 10)
        const isSlotInPast = false;
        const isSlotLockedForEdit = isBgh || Boolean(slotDayObj?.isLocked);

        return (
          <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <div
              onClick={handleCloseSlot}
              className="fixed inset-0 bg-black/15 transition-opacity animate-in fade-in-0 duration-200"
            />

            {/* Activity Drawer Panel */}
            <div
              className="relative w-full max-w-[680px] sm:max-w-[740px] h-full bg-card border-l border-border shadow-2xl flex flex-col justify-between text-foreground select-none overflow-hidden animate-in slide-in-from-right duration-250 ease-out z-10"
              onClick={(e) => e.stopPropagation()}
              data-name="ActivityAssessmentDrawer"
            >
              {/* Header: Sạch sẽ, có badge ngày/giờ và Hôm nay riêng biệt */}
              <div className="px-6 pt-5 pb-0 border-b border-border shrink-0 bg-card flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-[18px] font-semibold text-foreground tracking-tight truncate">
                        {activeSlot.title || activeSlot.shortTitle || t('planning.educationalActivity', 'Hoạt động giáo dục')}
                      </h2>
                      {isSlotInPast && (
                        <span className="inline-flex items-center h-6 px-2.5 text-[11.5px] font-medium border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-none shrink-0 select-none whitespace-nowrap">
                          {t('daily.pastDayViewOnly', 'Đã qua ngày (Chỉ xem)')}
                        </span>
                      )}
                      {activeSlot.notes?.includes('[Dạy bù') && (
                        <span className="inline-flex items-center h-6 px-2.5 text-[11.5px] font-medium border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-none shrink-0 select-none whitespace-nowrap">
                          {activeSlot.notes.match(/\[Dạy bù ngày (.*?)\]/)?.[0] || t('daily.makeupSlotBadge', 'Dạy bù')}
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] text-muted-foreground font-normal">
                      {t('daily.activitySlotDrawerDesc', 'Kế hoạch hoạt động và đánh giá kết quả học sinh')}
                    </p>
                  </div>

                  {/* Right controls: Next/Previous trong ngày + Nút Đóng */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {activeDaySlots.length > 1 && (
                      <div className="flex items-center border border-border bg-background rounded-none shadow-2xs mr-1">
                        <button
                          type="button"
                          onClick={handlePrevSlot}
                          disabled={!prevSlot}
                          className="size-7 flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground border-r border-border transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                          title={prevSlot ? `${t('daily.prevSlot', 'Tiết trước')} (Phím ←): ${prevSlot.title || prevSlot.shortTitle}` : t('daily.noPrevSlot', 'Không có tiết trước trong ngày')}
                        >
                          <HugeiconsIcon icon={ArrowLeft02Icon} size={14} />
                        </button>

                        <div className="px-2 text-[11.5px] font-medium text-muted-foreground select-none tabular-nums whitespace-nowrap">
                          {currentSlotIndex >= 0 ? `${currentSlotIndex + 1} / ${activeDaySlots.length}` : '—'}
                        </div>

                        <button
                          type="button"
                          onClick={handleNextSlot}
                          disabled={!nextSlot}
                          className="size-7 flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                          title={nextSlot ? `${t('daily.nextSlot', 'Tiết sau')} (Phím →): ${nextSlot.title || nextSlot.shortTitle}` : t('daily.noNextSlot', 'Không có tiết sau trong ngày')}
                        >
                          <HugeiconsIcon icon={ArrowRight02Icon} size={14} />
                        </button>
                      </div>
                    )}

                    {/* Menu 3 chấm Tùy chọn khác */}
                    {!isSlotLockedForEdit && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="size-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-none transition-colors cursor-pointer shrink-0"
                            title={t('common.moreOptions', 'Tùy chọn khác')}
                          >
                            <HugeiconsIcon icon={MoreHorizontalIcon} size={16} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52 rounded-none shadow-md">
                          <DropdownMenuItem
                            disabled={!isSlotAssessed || isCleaningSlot}
                            onClick={handleCleanSlotAssessment}
                            className="cursor-pointer text-[12.5px] py-2 px-3 text-foreground rounded-none disabled:opacity-35 disabled:cursor-not-allowed"
                          >
                            <span>{t('daily.deleteSlotEvalBtn', 'Xoá đánh giá tiết này')}</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}

                    <button
                      type="button"
                      onClick={handleCloseSlot}
                      className="size-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-none transition-colors cursor-pointer shrink-0"
                      title={t('common.close', 'Đóng (Esc)')}
                    >
                      <HugeiconsIcon icon={Cancel01Icon} size={16} />
                    </button>
                  </div>
                </div>

                {/* 2 Tabs: Nội dung hoạt động · Đánh giá học sinh */}
                <div className="flex items-center gap-4 border-b border-border/80 -mx-6 px-6 text-[13px] pt-1">
                  <button
                    type="button"
                    onClick={() => setActivityTab('content')}
                    className={cn(
                      'pb-2.5 px-1 font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-2 -mb-[1px]',
                      activityTab === 'content'
                        ? 'border-primary text-foreground font-semibold'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <HugeiconsIcon icon={BookOpen01Icon} size={15} />
                    <span>{t('daily.activityContentTab', 'Nội dung hoạt động')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivityTab('assessment')}
                    className={cn(
                      'pb-2.5 px-1 font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-2 -mb-[1px]',
                      activityTab === 'assessment'
                        ? 'border-primary text-foreground font-semibold'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <HugeiconsIcon icon={CheckListIcon} size={15} />
                    <span>{t('daily.studentAssessmentTab', 'Đánh giá học sinh')}</span>
                  </button>
                </div>
              </div>

              {/* Activity Evaluation Body */}
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-background/50">
                <WeeklyAssessmentPanel
                  key={activeSlot.id}
                  classId={targetClassId}
                  isAttendanceRecorded={Boolean(
                    slotDayObj?.isAttendanceRecorded ??
                    (activeSlot?.dayKey && recordedAttendanceDays[activeSlot.dayKey]) ??
                    activeSlot?.isAttendanceRecorded
                  )}
                  slot={{
                    ...activeSlot,
                    themeName: activeSlot.themeName || currentThemeName,
                    subThemeName: activeSlot.subThemeName || currentSubThemeName,
                    fullDate: activeSlot.fullDate || slotDayObj?.fullDate,
                    date: activeSlot.fullDate || slotDayObj?.fullDate || activeSlot.date,
                    isToday: Boolean(slotDayObj?.isToday),
                    dayName: slotDayObj?.name,
                    isAttendanceRecorded: Boolean(
                      slotDayObj?.isAttendanceRecorded ??
                      (activeSlot?.dayKey && recordedAttendanceDays[activeSlot.dayKey]) ??
                      activeSlot?.isAttendanceRecorded
                    ),
                  }}
                  activityDetails={activeSlot}
                  initialStudents={students}
                  isEvaluated={isSlotAssessed}
                  readOnly={isSlotLockedForEdit}
                  tab={activityTab}
                  onTabChange={setActivityTab}
                  onClose={handleCloseSlot}
                  onSaveSuccess={() => {
                    setSlots((prev) =>
                      prev.map((s) => (s.id === activeSlot.id ? { ...s, status: 'COMPLETED', isEvaluated: true } : s))
                    );
                    setActiveSlot((prev) => (prev ? { ...prev, status: 'COMPLETED', isEvaluated: true } : null));
                  }}
                  onCleanSuccess={() => {
                    setSlots((prev) =>
                      prev.map((s) => (s.id === activeSlot.id ? { ...s, status: 'SCHEDULED', isEvaluated: false } : s))
                    );
                    setActiveSlot((prev) => (prev ? { ...prev, status: 'SCHEDULED', isEvaluated: false } : null));
                  }}
                  prevSlot={prevSlot}
                  nextSlot={nextSlot}
                  onPrevSlot={handlePrevSlot}
                  onNextSlot={handleNextSlot}
                  hideHeader
                />
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal Xác nhận Xóa dữ liệu ngày (Điểm danh / Sức khỏe / Đón trẻ) */}
      {cleanConfirmDialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs animate-in fade-in-0 duration-150"
            onClick={() => setCleanConfirmDialog(null)}
          />
          <div
            className="relative w-full max-w-[400px] bg-card border border-border shadow-2xl rounded-none z-10 animate-in zoom-in-95 duration-150 overflow-hidden flex flex-col p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between pb-3 border-b border-border/60 mb-3">
              <div className="flex flex-col gap-0.5">
                <h3 className="text-[15px] font-semibold text-rose-600 dark:text-rose-400 tracking-tight">
                  {cleanConfirmDialog.title}
                </h3>
                <span className="text-[12px] text-muted-foreground">
                  {t('common.date', 'Ngày')} {activeDay?.date || activeDay?.name}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setCleanConfirmDialog(null)}
                className="size-6 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={15} />
              </button>
            </div>

            <div className="text-[13px] text-foreground/90 space-y-2 mb-4">
              <p>{cleanConfirmDialog.message}</p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCleanConfirmDialog(null)}
                className="h-8 px-3 text-[12.5px] rounded-none cursor-pointer"
              >
                {t('common.cancel', 'Huỷ')}
              </Button>
              <Button
                type="button"
                onClick={handleExecuteClean}
                disabled={isCleaningDay}
                className="h-8 px-4 text-[12.5px] font-medium bg-rose-600 hover:bg-rose-700 text-white rounded-none cursor-pointer shadow-none transition-colors"
              >
                {isCleaningDay ? t('common.deleting', 'Đang xóa...') : t('common.confirmDelete', 'Xác nhận xóa')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DailyRoutinePage;
