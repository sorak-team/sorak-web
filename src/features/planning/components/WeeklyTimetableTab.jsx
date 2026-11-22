import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArrowLeft02Icon,
  ArrowRight02Icon,
  SidebarRightIcon,
  Menu01Icon,
  Cancel01Icon,
  Search01Icon,
  CheckmarkCircle01Icon,
  BookOpen01Icon,
  PlusSignIcon,
  ArrowDown01Icon,
  ArrowRight01Icon,
  Calendar03Icon,
  Clock01Icon,
  AlertCircleIcon,
} from '@hugeicons/core-free-icons';
import { Info, Copy, Check, Printer } from 'lucide-react';
import { ExcelActionsDropdown } from '@/components/ExcelActionsDropdown';
import { downloadBlob } from '@/shared/utils/download';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/shared/lib/utils';
import { toast } from 'sonner';
import { confirmDialog } from '@/components/ui/confirm-dialog';
import { planningApi } from '../planning.api';
import { PlanningTabLoading } from './PlanningTabLoading';
import {
  TeacherTimetableGrid,
  DEFAULT_DAYS,
  ROUTINE_SLOTS,
} from '@/shared/components/calendar/TeacherTimetableGrid';
import {
  WeekPickerCalendar,
  CALENDAR_WEEKS,
} from '@/shared/components/calendar/WeekPickerCalendar';
import { ActivitySlotPopover } from './ActivitySlotPopover';
import { ActivitySlotDrawer } from './ActivitySlotDrawer';
import { HierarchicalActivityPickerModal } from './HierarchicalActivityPickerModal';
import { useAcademicYearStore } from '@/features/academic-years';
import { useAuthStore } from '@/features/auth';

const ROUTINE_SLOT_SHORT_LABELS = {
  ARRIVAL_PLAY: 'Đón trẻ',
  MORNING_EXERCISE: 'Thể dục sáng',
  DIRECTED_STUDY: 'Học',
  CORNER_PLAY: 'Hoạt động góc',
  OUTDOOR_PLAY: 'Ngoài trời',
  AFTERNOON_ACTIVITY: 'Chiều',
  RETURN_CHILD: 'Trả trẻ',
};


const formatGoalCode = (code) => {
  if (!code) return '';
  const raw = String(code).trim().toUpperCase();
  const digitsMatch = raw.match(/\d+/);
  if (digitsMatch) {
    const num = parseInt(digitsMatch[0], 10);
    if (!isNaN(num)) {
      return `MT ${num < 10 ? '0' + num : num}`;
    }
  }
  return raw;
};

/**
 * Tìm tuần tương ứng cho một chủ đề:
 * - Nếu là chủ đề hiện tại (ngày hôm nay nằm trong khoảng thời gian của chủ đề):
 *   -> Di chuyển tới tuần hiện tại (tuần chứa ngày hôm nay).
 * - Nếu không phải chủ đề hiện tại:
 *   -> Di chuyển tới tuần chứa ngày bắt đầu (startDate) của chủ đề đó.
 */
export function resolveWeekForTheme(themeId, themesList = [], calendarWeeks = CALENDAR_WEEKS) {
  if (!themeId || !themesList?.length) return null;

  const cleanId = String(themeId).trim();
  const matchedTheme = themesList.find(
    (th) =>
      th.id === cleanId ||
      th.publicId === cleanId ||
      String(th.themeId) === cleanId ||
      th.code === cleanId ||
      String(th.code).padStart(2, '0') === cleanId.padStart(2, '0')
  );
  if (!matchedTheme) return null;

  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

  const startDateStr = matchedTheme.startDate ? String(matchedTheme.startDate).slice(0, 10) : '';
  const endDateStr = matchedTheme.endDate ? String(matchedTheme.endDate).slice(0, 10) : '';

  // 1. Kiểm tra xem có phải "Chủ đề hiện tại" không (ngày hôm nay nằm trong khoảng thời gian của chủ đề)
  // -> Di chuyển tới tuần hiện tại (tuần chứa ngày hôm nay)
  const isCurrentTheme = Boolean(
    matchedTheme.isCurrent ||
    (startDateStr && endDateStr && todayStr >= startDateStr && todayStr <= endDateStr)
  );

  if (isCurrentTheme) {
    const curWeek = calendarWeeks.find((w) => w.isCurrentWeek) || calendarWeeks[0];
    return curWeek?.id || null;
  }

  // 2. Nếu không phải chủ đề hiện tại -> di chuyển tới tuần có ngày bắt đầu (startDate) của chủ đề đó
  if (startDateStr) {
    const foundWeek = calendarWeeks.find((w) => {
      if (w.dayDetails && w.dayDetails.some((d) => d.dateStr === startDateStr)) {
        return true;
      }
      if (w.dayDetails && w.dayDetails.length >= 7) {
        const wStart = w.dayDetails[0].dateStr;
        const wEnd = w.dayDetails[6].dateStr;
        if (startDateStr >= wStart && startDateStr <= wEnd) {
          return true;
        }
      }
      return false;
    });

    if (foundWeek) {
      return foundWeek.id;
    }
  }

  return null;
}

export function WeeklyTimetableTab({
  classId = '1',
  isReadOnly: propReadOnly = false,
  selectedThemeId = null,
  onThemeChange = null,
  planStatus = null,
  themes = [],
}) {
  const { t } = useTranslation();

  const user = useAuthStore((state) => state.user);
  const isPrincipal = Boolean(
    user?.role === 'PRINCIPAL_BGH' ||
    user?.role === 'PRINCIPAL' ||
    user?.role?.toLowerCase()?.includes('principal') ||
    user?.role?.toLowerCase()?.includes('bgh')
  );

  // Lấy năm học đang chọn từ store
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

  // 1. Week Picker State (Đồng bộ chuẩn xác với DailyRoutinePage)
  const initialCurrentWeekId = useMemo(
    () => CALENDAR_WEEKS.find((w) => w.isCurrentWeek)?.id || 'w-2',
    []
  );

  const updateUrlWeek = (weekId, themeId) => {
    if (typeof window === 'undefined') return;
    try {
      const url = new URL(window.location.href);
      if (weekId) {
        url.searchParams.set('weekId', weekId);
      }
      if (themeId) {
        url.searchParams.set('themeId', themeId);
      }
      window.history.replaceState(null, '', url.pathname + url.search);
      if (classId && weekId) {
        sessionStorage.setItem(`sorak_timetable_week_${classId}`, weekId);
      }
    } catch (e) {
      console.warn('Failed to update URL weekId:', e);
    }
  };

  // Tính toán tuần ban đầu:
  // 1. Ưu tiên tuần đã lưu trên URL (ví dụ người dùng vừa F5)
  // 2. Ưu tiên tuần đã lưu trong sessionStorage của lớp học này (nếu còn trong cùng phiên)
  // 3. Nếu chuyển chủ đề từ Phân bổ mục tiêu -> tính toán theo chủ đề (hiện tại -> tuần hiện tại; khác -> ngày bắt đầu)
  // 4. Mặc định: tuần hiện tại
  const initialResolvedWeekId = useMemo(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlWeekId = urlParams.get('weekId');
      if (urlWeekId && CALENDAR_WEEKS.some((w) => w.id === urlWeekId)) {
        return urlWeekId;
      }
      try {
        const savedWeek = sessionStorage.getItem(`sorak_timetable_week_${classId}`);
        if (savedWeek && CALENDAR_WEEKS.some((w) => w.id === savedWeek)) {
          return savedWeek;
        }
      } catch {}
    }

    const effectiveThemeId =
      selectedThemeId ||
      (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('themeId') : null);
    if (effectiveThemeId && themes?.length > 0) {
      const resolved = resolveWeekForTheme(effectiveThemeId, themes, CALENDAR_WEEKS);
      if (resolved) return resolved;
    }
    return initialCurrentWeekId;
  }, [selectedThemeId, themes, initialCurrentWeekId, classId]);

  const [selectedWeekId, setSelectedWeekId] = useState(initialResolvedWeekId);
  const selectedWeekIdRef = React.useRef(selectedWeekId);
  selectedWeekIdRef.current = selectedWeekId;
  const lastResolvedThemeRef = React.useRef(selectedThemeId || null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Lưu weekId vào URL và sessionStorage bất kỳ khi nào selectedWeekId thay đổi (đảm bảo F5 không bị mất)
  useEffect(() => {
    if (!selectedWeekId) return;
    updateUrlWeek(selectedWeekId);
  }, [selectedWeekId]);

  // Đồng bộ tuần khi chuyển từ Phân bổ mục tiêu sang Kế hoạch tuần:
  // - Nếu chủ đề được chọn là chủ đề hiện tại -> di chuyển tới tuần hiện tại
  // - Nếu là chủ đề khác -> di chuyển tới tuần có ngày bắt đầu của chủ đề đó
  // - ĐẶC BIỆT: Nếu URL đã có sẵn weekId hợp lệ (ví dụ người dùng vừa F5 lại trang), KHÔNG được tự ý reset tuần!
  useEffect(() => {
    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const urlWeekId = urlParams?.get('weekId');

    if (urlWeekId && CALENDAR_WEEKS.some((w) => w.id === urlWeekId)) {
      lastResolvedThemeRef.current = selectedThemeId || urlParams?.get('themeId');
      return;
    }

    const effectiveThemeId =
      selectedThemeId ||
      urlParams?.get('themeId');
    if (!effectiveThemeId || !themes?.length) return;

    if (lastResolvedThemeRef.current === effectiveThemeId) return;

    const targetWeekId = resolveWeekForTheme(effectiveThemeId, themes, CALENDAR_WEEKS);
    if (targetWeekId && targetWeekId !== selectedWeekIdRef.current) {
      lastResolvedThemeRef.current = effectiveThemeId;
      selectedWeekIdRef.current = targetWeekId;
      setSelectedWeekId(targetWeekId);
      updateUrlWeek(targetWeekId, effectiveThemeId);
    }
  }, [selectedThemeId, themes]);

  const activeWeekObj =
    CALENDAR_WEEKS.find((w) => w.id === selectedWeekId) ||
    CALENDAR_WEEKS.find((w) => w.isCurrentWeek) ||
    CALENDAR_WEEKS[0];

  const handlePrevWeek = () => {
    const currentId = selectedWeekIdRef.current || selectedWeekId;
    const idx = CALENDAR_WEEKS.findIndex((w) => w.id === currentId);
    if (idx > 0) {
      const prevId = CALENDAR_WEEKS[idx - 1].id;
      selectedWeekIdRef.current = prevId;
      setSelectedWeekId(prevId);
      setSelectedSlotForPopover(null);
    }
  };

  const handleNextWeek = () => {
    const currentId = selectedWeekIdRef.current || selectedWeekId;
    const idx = CALENDAR_WEEKS.findIndex((w) => w.id === currentId);
    if (idx >= 0 && idx < CALENDAR_WEEKS.length - 1) {
      const nextId = CALENDAR_WEEKS[idx + 1].id;
      selectedWeekIdRef.current = nextId;
      setSelectedWeekId(nextId);
      setSelectedSlotForPopover(null);
    }
  };

  const handleGoToCurrentWeek = () => {
    const curWeek = CALENDAR_WEEKS.find((w) => w.isCurrentWeek) || CALENDAR_WEEKS[0];
    if (curWeek) {
      selectedWeekIdRef.current = curWeek.id;
      setSelectedWeekId(curWeek.id);
      setSelectedSlotForPopover(null);
    }
  };

  // 2. Data State
  const [timetableData, setTimetableData] = useState(null);
  const [slots, setSlots] = useState([]);
  const [availableActivities, setAvailableActivities] = useState([]);
  const [hierarchicalGoals, setHierarchicalGoals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  const currentWeekNumber = useMemo(() => {
    const idx = CALENDAR_WEEKS.findIndex((w) => w.id === selectedWeekId);
    return idx >= 0 ? idx + 1 : 1;
  }, [selectedWeekId]);

  const handlePrintWeeklyPlan = () => {
    const printUrl = planningApi.getWeeklyTeachingPlanPrintUrl(classId, currentWeekNumber);
    window.open(printUrl, '_blank');
  };

  const handleExportWeeklyExcel = async () => {
    try {
      setIsExportingExcel(true);
      const blob = await planningApi.exportWeeklyTeachingPlanExcel(classId, currentWeekNumber);
      const subThemeName = timetableData?.selectedSubTheme?.name || `Tuan_${currentWeekNumber}`;
      const cleanSubTheme = subThemeName.replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1EA0-\u1EF9]/g, '_');
      downloadBlob(blob, `Ke_Hoach_Chi_Tiet_Tuan_${currentWeekNumber}_${cleanSubTheme}.xlsx`);
      toast.success(t('planning.exportTimetableSuccess', { week: currentWeekNumber, defaultValue: `Đã xuất kế hoạch chi tiết tuần ${currentWeekNumber} ra file Excel thành công` }));
    } catch (err) {
      console.error('Export weekly excel failed:', err);
      toast.error(t('planning.exportExcelError', 'Có lỗi xảy ra khi xuất file Excel'));
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Trạng thái của kế hoạch tuần / chủ đề hiện tại
  const currentPlanStatus = timetableData?.planStatus || (selectedThemeId === planStatus?.themeId ? planStatus?.status : null);
  const isApproved = currentPlanStatus === 'USED';
  const isPendingApproval = currentPlanStatus === 'PENDING_APPROVAL' || currentPlanStatus === 'SUBMITTED' || (Boolean(planStatus?.status === 'PENDING_APPROVAL' || planStatus?.status === 'SUBMITTED') && (!selectedThemeId || selectedThemeId === planStatus?.themeId));
  const isRejected = Boolean(
    currentPlanStatus === 'REJECTED' ||
    (planStatus?.status === 'REJECTED' && (!selectedThemeId || selectedThemeId === planStatus?.themeId))
  );
  const rejectionReason = timetableData?.rejectionReason || planStatus?.rejectionReason || '';

  // Chỉ khóa nếu tuần này thuộc một chủ đề ĐÃ DUYỆT hoặc ĐANG CHỜ DUYỆT
  const isThemeReadOnly = Boolean(timetableData?.isReadOnly || isApproved || isPendingApproval);
  const isReadOnly = isPrincipal || isThemeReadOnly || Boolean(currentAcademicYear?.status === 'COMPLETED');

  // Format dynamic dates for timetable header according to active week (T2 - CN)
  const currentDays = useMemo(() => {
    const baseDays = DEFAULT_DAYS; // T2 to CN (All 7 days)
    const currentWeekIdx = CALENDAR_WEEKS.findIndex((w) => w.isCurrentWeek);
    const selectedWeekIdx = CALENDAR_WEEKS.findIndex((w) => w.id === selectedWeekId);
    const holidays = timetableData?.holidays || [];
    const classAgeGroup = timetableData?.classInfo?.ageGroup || 'NHA_TRE';

    return baseDays.map((day, idx) => {
      const dayDetail = activeWeekObj?.dayDetails?.[idx];
      let formattedDate = day.date;
      let dateIsoStr = dayDetail?.dateStr || '';
      let isOutsideAcademicYear = false;

      if (dayDetail) {
        formattedDate = `${String(dayDetail.day).padStart(2, '0')}/${String(dayDetail.month + 1).padStart(2, '0')}`;
        const dt = new Date(dayDetail.year, dayDetail.month, dayDetail.day);
        isOutsideAcademicYear = dt < academicStartCutoff || dt > academicEndCutoff;
        if (!dateIsoStr && dayDetail.year && dayDetail.month !== undefined && dayDetail.day) {
          dateIsoStr = `${dayDetail.year}-${String(dayDetail.month + 1).padStart(2, '0')}-${String(dayDetail.day).padStart(2, '0')}`;
        }
      }

      // 1. Sunday (CN) is ALWAYS a day off
      const isSunday = day.key === 'CN';

      // 2. Saturday (T7): locked UNLESS configured as makeup day (is_teaching_allowed === true or holiday makeupDate)
      const isSaturday = day.key === 'T7';
      const makeupHoliday = isSaturday && holidays.find((h) => {
        const appliesToGrade = !h.targetGrades?.length || h.targetGrades.includes(classAgeGroup);
        if (!appliesToGrade) return false;
        if (h.makeupDate && dateIsoStr === h.makeupDate) return true;
        return h.isTeachingAllowed && dateIsoStr >= h.startDate && dateIsoStr <= h.endDate;
      });
      const isSaturdayMakeup = Boolean(makeupHoliday);

      // 3. SchoolHoliday where is_teaching_allowed === false
      let isHolidayLocked = false;
      let lockReason = '';
      let lockLabel = '';
      let activeHoliday = null;

      if (dateIsoStr && holidays.length > 0) {
        for (const h of holidays) {
          if (!h.isTeachingAllowed) {
            const appliesToGrade = !h.targetGrades?.length || h.targetGrades.includes(classAgeGroup);
            if (appliesToGrade) {
              if (dateIsoStr >= h.startDate && dateIsoStr <= h.endDate) {
                isHolidayLocked = true;
                lockReason = h.name;
                lockLabel = t('planning.holidayLabel', 'Ngày nghỉ');
                activeHoliday = h;
                break;
              }
            }
          }
        }
      }

      const isCurrentWeek = Boolean(activeWeekObj?.isCurrentWeek);
      const isToday = !isOutsideAcademicYear && Boolean(dayDetail?.isToday);
      let isFuture = selectedWeekIdx > currentWeekIdx;

      let isLocked = false;
      let finalLockReason = '';
      let finalLockLabel = '';

      if (isOutsideAcademicYear) {
        isLocked = true;
        finalLockReason = t('planning.outsideAcademicYear', 'Nằm ngoài năm học đang chọn');
        finalLockLabel = t('planning.extracurricularLabel', 'Ngoại khóa');
      } else if (isSunday) {
        isLocked = true;
        finalLockReason = t('planning.sundayIsHoliday', 'Chủ nhật là ngày nghỉ');
        finalLockLabel = t('planning.holidayLabel', 'Ngày nghỉ');
      } else if (isSaturday && !isSaturdayMakeup) {
        isLocked = true;
        finalLockReason = t('planning.saturdayNoMakeup', 'Thứ Bảy không có lịch học bù');
        finalLockLabel = t('planning.holidayLabel', 'Ngày nghỉ');
      } else if (isHolidayLocked) {
        isLocked = true;
        finalLockReason = lockReason;
        finalLockLabel = t('planning.holidayLabel', 'Ngày nghỉ');
      }

      return {
        ...day,
        date: formattedDate,
        dateStr: dateIsoStr,
        isToday,
        isFuture,
        isLocked,
        isHolidayLocked,
        isSaturdayMakeup,
        makeupHoliday: makeupHoliday || null,
        lockReason: finalLockReason,
        lockLabel: finalLockLabel,
        holiday: activeHoliday,
      };
    });
  }, [activeWeekObj, selectedWeekId, academicStartCutoff, academicEndCutoff, timetableData]);

  // Check if current week has slots on T7 or CN
  const hasWeekendSlots = useMemo(() => {
    return (slots || []).some((s) => s.day === 'T7' || s.day === 'CN');
  }, [slots]);

  // Check if Saturday has makeup teaching configured
  const hasSaturdayMakeup = useMemo(() => {
    return currentDays.some((d) => d.key === 'T7' && d.isSaturdayMakeup);
  }, [currentDays]);

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

  // Tự động mở T7/CN nếu tuần có slot, có lịch học bù thứ 7, hoặc tuần khai giảng dính cuối tuần;
  // nếu không thì theo lựa chọn ghi nhớ của người dùng (mặc định ẩn nếu người dùng không chọn hiện)
  useEffect(() => {
    if (hasWeekendSlots || isStartWeekWithWeekend || hasSaturdayMakeup) {
      setShowWeekend(true);
    } else {
      setShowWeekend(userPrefShowWeekend);
    }
  }, [hasWeekendSlots, isStartWeekWithWeekend, hasSaturdayMakeup, selectedWeekId, userPrefShowWeekend]);

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

  // Modal & Popover States
  const [pickerCell, setPickerCell] = useState(null); // { day, slotDef }
  const [selectedSlotForPopover, setSelectedSlotForPopover] = useState(null);
  const [selectedSlotForDrawer, setSelectedSlotForDrawer] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Keyboard Clipboard & Multi-selection States
  const [clipboardSlot, setClipboardSlot] = useState(null);
  const [selectedTargetCells, setSelectedTargetCells] = useState([]);
  const [lastClickedCell, setLastClickedCell] = useState(null);

  const clipboardSlotRef = React.useRef(clipboardSlot);
  clipboardSlotRef.current = clipboardSlot;
  const selectedTargetCellsRef = React.useRef(selectedTargetCells);
  selectedTargetCellsRef.current = selectedTargetCells;
  const lastClickedCellRef = React.useRef(lastClickedCell);
  lastClickedCellRef.current = lastClickedCell;
  const selectedSlotForPopoverRef = React.useRef(selectedSlotForPopover);
  selectedSlotForPopoverRef.current = selectedSlotForPopover;
  selectedWeekIdRef.current = selectedWeekId;
  const currentDaysRef = React.useRef(currentDays);
  currentDaysRef.current = currentDays;

  // Load timetable and hierarchical activities
  const loadTimetable = async (overrideWeekId) => {
    setIsLoading(true);
    try {
      const targetWeek = overrideWeekId || selectedWeekIdRef.current || selectedWeekId;
      const targetWeekObj = CALENDAR_WEEKS.find((w) => w.id === targetWeek) || activeWeekObj;
      const startDate = targetWeekObj?.dayDetails?.[0]?.dateStr;
      const endDate = targetWeekObj?.dayDetails?.[6]?.dateStr;
      const data = await planningApi.getWeeklyTimetable(classId, {
        weekId: targetWeek,
        startDate,
        endDate,
      });
      setTimetableData(data);
      setSlots(data?.slots || []);
      const formattedActivities = (data?.availableActivities || []).map((a) => ({
        ...a,
        goalCode: formatGoalCode(a.goalCode),
      }));
      setAvailableActivities(formattedActivities);

      const formattedGoals = (data?.goals || []).map((g) => ({
        ...g,
        goalCode: formatGoalCode(g.goalCode || g.code),
        contents: (g.contents || []).map((cnt) => ({
          ...cnt,
          activities: (cnt.activities || []).map((act) => ({
            ...act,
            goalCode: formatGoalCode(act.goalCode || g.goalCode || g.code),
          })),
        })),
      }));
      setHierarchicalGoals(formattedGoals);
      const activeThId = data?.selectedTheme?.id || data?.theme?.id || '';
      if (activeThId) {
        lastResolvedThemeRef.current = activeThId;
      }
      updateUrlWeek(targetWeek, activeThId || undefined);
      if (onThemeChange) {
        onThemeChange(activeThId, undefined, true);
      }
    } catch (err) {
      console.warn('Failed to load weekly timetable:', err);
      setTimetableData(null);
      setSlots([]);
      setAvailableActivities([]);
      setHierarchicalGoals([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTimetable();
  }, [classId, selectedWeekId]);

  // Assign an activity to a specific day & routineSlot
  const handleAssignActivityToSlot = async (activity, dayKey, routineSlotKey, dateStr) => {
    try {
      const targetDay = currentDays.find((d) => d.key === dayKey);
      if (targetDay?.isLocked) {
        const makeupDate = targetDay?.holiday?.makeupDate || targetDay?.makeupDate;
        if (makeupDate) {
          const parts = makeupDate.split('-');
          toast.info(
            t('planning.saturdayMakeupAlert', {
              day: targetDay.name,
              reason: targetDay.lockReason || t('planning.regulation', 'Quy định'),
              date: `${parts[2]}/${parts[1]}`,
              defaultValue: `Ngày ${targetDay.name} là ngày nghỉ (${targetDay.lockReason || 'Quy định'}). Ban Giám Hiệu đã bố trí dạy bù vào Thứ Bảy (${parts[2]}/${parts[1]}). Vui lòng xếp lịch vào Thứ Bảy.`,
            })
          );
        } else {
          toast.error(
            t('planning.cannotScheduleLockedDay', {
              day: targetDay.name,
              date: targetDay.date,
              reason: targetDay.lockReason ? ` bởi "${targetDay.lockReason}"` : '',
              defaultValue: `Không thể xếp kế hoạch tuần vào ngày ${targetDay.name} (${targetDay.date}) vì ngày này đã bị khóa dạy${targetDay.lockReason ? ` bởi "${targetDay.lockReason}"` : ''}.`,
            })
          );
        }
        return;
      }
      const isAdd = Boolean(pickerCell?.isAdd);
      const replacingSlotId = pickerCell?.replacingSlotId || null;
      const currentWeek = selectedWeekIdRef.current || selectedWeekId;

      const existingInCell = slots.filter(
        (s) =>
          s.day === dayKey &&
          (s.routineSlot === routineSlotKey || s.routine_slot === routineSlotKey)
      );

      if (existingInCell.length > 0 && !replacingSlotId) {
        const confirmed = await confirmDialog({
          title: t('planning.replaceActivityConfirmTitle', 'Thay thế hoạt động'),
          description: t('planning.replaceActivityConfirm', 'Khung giờ này đã có hoạt động. Bạn có muốn thay thế hoạt động hiện tại không?'),
          confirmText: t('common.replace', 'Thay thế'),
          cancelText: t('common.cancel', 'Hủy'),
          variant: 'default',
        });
        if (!confirmed) return;
      }

      const payload = {
        activityId: activity.id,
        day: dayKey,
        routineSlot: routineSlotKey,
        date: targetDay?.dateStr || dateStr || targetDay?.date || '2026-10-14',
        slotId: replacingSlotId || existingInCell[0]?.id || null,
        isAdd: false,
        weekId: currentWeek,
        subThemeId: timetableData?.selectedSubTheme?.id || timetableData?.theme?.id,
        orderIndex: 1,
      };
      await planningApi.assignActivityToSlot(classId, payload);

      // Reload timetable directly from backend
      await loadTimetable();

      toast.success(
        isAdd
          ? t('planning.addedToSlot', { title: activity.title, day: dayKey, defaultValue: `Đã thêm "${activity.title}" vào slot ${dayKey}` })
          : t('planning.scheduledInSlot', {
              title: activity.title,
              day: dayKey,
              slot: ROUTINE_SLOT_SHORT_LABELS[routineSlotKey] || routineSlotKey,
              defaultValue: `Đã xếp "${activity.title}" vào ${dayKey} (${ROUTINE_SLOT_SHORT_LABELS[routineSlotKey] || routineSlotKey})`,
            })
      );
    } catch (err) {
      toast.error(err.response?.data?.message || t('planning.assignActivityError', 'Không thể gán hoạt động vào slot'));
    }
  };

  // Lấy toàn bộ danh sách các hoạt động trong ô / slot hiện tại đang mở Drawer
  const currentCellSlots = useMemo(() => {
    if (!selectedSlotForPopover?.slot) return [];
    const targetSlot = selectedSlotForPopover.slot;
    const targetDayKey = selectedSlotForPopover.day?.key || targetSlot.day;
    const routineKey = targetSlot.routineSlot || targetSlot.routine_slot;
    return slots
      .filter(
        (s) => s.day === targetDayKey && (s.routineSlot === routineKey || s.routine_slot === routineKey)
      )
      .sort((a, b) => {
        const orderA = a.orderIndex !== undefined ? Number(a.orderIndex) : (a.order_index !== undefined ? Number(a.order_index) : 1);
        const orderB = b.orderIndex !== undefined ? Number(b.orderIndex) : (b.order_index !== undefined ? Number(b.order_index) : 1);
        return orderA - orderB;
      });
  }, [selectedSlotForPopover, slots]);

  // Remove activity from a slot
  const handleClearSlot = async (slot) => {
    try {
      await planningApi.deleteWeeklySlot(classId, slot.id);
      setSlots((prev) => prev.filter((s) => s.id !== slot.id));

      const remainingInCell = currentCellSlots.filter((s) => s.id !== slot.id);
      if (remainingInCell.length === 0) {
        setSelectedSlotForPopover(null);
      }

      await loadTimetable();
      toast.success(t('planning.removeActivitySuccess', { title: slot.title, defaultValue: `Đã gỡ "${slot.title}" khỏi lịch tuần` }));
    } catch {
      toast.error(t('planning.removeActivityError', 'Không thể gỡ hoạt động khỏi slot'));
    }
  };

  // Cập nhật thứ tự các hoạt động trong cùng slot và lưu xuống cơ sở dữ liệu
  const handleReorderActivities = async (updatedCellSlots) => {
    const reorderedWithIndex = updatedCellSlots.map((s, idx) => ({
      ...s,
      orderIndex: idx + 1,
      order_index: idx + 1,
    }));

    setSlots((prevSlots) => {
      const otherSlots = prevSlots.filter(
        (s) => !reorderedWithIndex.some((us) => us.id === s.id)
      );
      return [...otherSlots, ...reorderedWithIndex];
    });

    try {
      await planningApi.reorderWeeklySlots(
        classId,
        reorderedWithIndex.map((s) => ({
          id: s.id,
          orderIndex: s.orderIndex,
        }))
      );
    } catch (err) {
      console.error('Failed to save reordered activities:', err);
      toast.error(t('planning.saveSlotOrderError', 'Không thể lưu thứ tự hoạt động'));
    }
  };

  // Cập nhật nội dung bài dạy sau khi chỉnh sửa qua drawer
  const handleSaveEditedSlot = async (updatedSlot) => {
    setSlots((prev) =>
      prev.map((s) => (s.id === updatedSlot.id ? { ...s, ...updatedSlot } : s))
    );
    if (selectedSlotForPopover?.slot?.id === updatedSlot.id) {
      setSelectedSlotForPopover((prev) => ({
        ...prev,
        slot: { ...prev.slot, ...updatedSlot },
      }));
    }
    setIsDrawerOpen(false);
    try {
      await planningApi.saveWeeklySlot(classId, updatedSlot);
      toast.success(t('planning.updateSlotSuccess', { title: updatedSlot.title, defaultValue: `Đã cập nhật bài dạy "${updatedSlot.title}"` }));
    } catch {
      toast.error(t('planning.updateSlotError', 'Không thể lưu thay đổi vào cơ sở dữ liệu'));
    }
  };

  // Nhân bản một hoạt động sang ô đích khi giữ phím Alt hoặc Ctrl trong khi kéo thả
  const handleDuplicateSlotToTarget = async ({
    sourceSlot,
    targetDay,
    targetSlotDef,
    targetExistingSlots = [],
  }) => {
    try {
      if (targetDay?.isLocked) {
        toast.error(
          t('planning.duplicateToLockedDayError', {
            day: targetDay.name,
            date: targetDay.date,
            reason: targetDay.lockReason ? ` bởi "${targetDay.lockReason}"` : '',
            defaultValue: `Không thể nhân bản hoạt động sang ngày ${targetDay.name} (${targetDay.date}) vì ngày này đã bị khóa dạy${targetDay.lockReason ? ` bởi "${targetDay.lockReason}"` : ''}.`,
          })
        );
        return;
      }
      if (targetExistingSlots.length > 0) {
        const confirmed = await confirmDialog({
          title: t('planning.replaceActivityConfirmTitle', 'Thay thế hoạt động'),
          description: t('planning.replaceActivityConfirm', 'Khung giờ này đã có hoạt động. Bạn có muốn thay thế hoạt động hiện tại không?'),
          confirmText: t('common.replace', 'Thay thế'),
          cancelText: t('common.cancel', 'Hủy'),
          variant: 'default',
        });
        if (!confirmed) return;

        // Delete existing slot(s) in target cell to guarantee at most 1 activity per slot
        for (const existing of targetExistingSlots) {
          if (existing.id && !String(existing.id).startsWith('s-')) {
            try {
              await planningApi.deleteWeeklySlot(classId, existing.id);
            } catch (delErr) {
              console.warn('Failed to delete existing slot during duplicate:', delErr);
            }
          }
        }
      }
      const routineKey = targetSlotDef.key;
      let saved;

      if (sourceSlot.activityId) {
        saved = await planningApi.assignActivityToSlot(classId, {
          activityId: sourceSlot.activityId,
          day: targetDay.key,
          routineSlot: routineKey,
          date: targetDay.dateStr || targetDay.date,
          subThemeId: timetableData?.selectedSubTheme?.id || timetableData?.theme?.id,
          isAdd: false,
          slotId: targetExistingSlots[0]?.id || null,
          orderIndex: 1,
        });
      } else {
        const newSlot = {
          ...sourceSlot,
          id: `s-${targetDay.key.toLowerCase()}-${Date.now().toString().slice(-4)}-${Math.floor(Math.random() * 1000)}`,
          day: targetDay.key,
          date: targetDay.date,
          routineSlot: routineKey,
          routine_slot: routineKey,
          orderIndex: 1,
          order_index: 1,
          status: 'SCHEDULED',
        };
        saved = await planningApi.saveWeeklySlot(classId, {
          ...newSlot,
          date: targetDay.dateStr || targetDay.date,
        });
      }

      const targetIds = new Set(targetExistingSlots.map((s) => s.id));
      setSlots((prev) => [
        ...prev.filter((s) => !targetIds.has(s.id)),
        { ...saved, date: targetDay.date, orderIndex: 1, order_index: 1 },
      ]);
      await loadTimetable();
      toast.success(
        t('planning.duplicateSuccess', {
          title: sourceSlot.title || sourceSlot.shortTitle,
          day: targetDay.name || targetDay.shortName,
          defaultValue: `Đã nhân bản "${sourceSlot.title || sourceSlot.shortTitle}" sang ${targetDay.name || targetDay.shortName}`,
        })
      );
    } catch (err) {
      console.error('Failed to duplicate slot:', err);
      toast.error(t('planning.duplicateError', 'Không thể nhân bản hoạt động'));
    }
  };

  // Bật chế độ Sao chép (Ctrl+C hoặc nhấp nút Sao chép)
  const handleCopySlot = (slotToCopy) => {
    if (!slotToCopy) return;
    const routineKey = slotToCopy.routineSlot || slotToCopy.routine_slot;
    setClipboardSlot({
      ...slotToCopy,
      weekId: selectedWeekId,
    });
    setSelectedTargetCells([]);
    setLastClickedCell(slotToCopy.day ? { dayKey: slotToCopy.day, routineKey } : null);
    setSelectedSlotForPopover(null); // Đóng drawer để thao tác trực tiếp trên lưới
  };

  // Hủy chế độ Sao chép (Esc)
  const handleCancelClipboard = () => {
    setClipboardSlot(null);
    setSelectedTargetCells([]);
    setLastClickedCell(null);
  };

  // Toggle hoặc Range Select bằng Shift các ô đích trên lưới (lưu theo weekId hiện tại)
  const handleToggleSelectCell = (dayKey, routineKey, isShift = false, isCtrl = false) => {
    const activeClipboard = clipboardSlotRef.current;
    if (!activeClipboard) return;

    // Không cho phép chọn ô thuộc ngày đã bị khóa dạy
    const targetDay = currentDaysRef.current?.find((d) => d.key === dayKey);
    if (targetDay?.isLocked) {
      toast.warning(
        t('planning.pasteToLockedDayError', {
          day: targetDay.name,
          date: targetDay.date,
          reason: targetDay.lockReason ? ` (${targetDay.lockReason})` : '',
          defaultValue: `Ngày ${targetDay.name} (${targetDay.date}) đã bị khóa dạy${targetDay.lockReason ? ` (${targetDay.lockReason})` : ''}, không thể dán vào ngày này.`,
        })
      );
      return;
    }

    const clipboardRoutineKey = activeClipboard.routineSlot || activeClipboard.routine_slot;
    // Chỉ cho phép chọn các ô trong cùng một hoạt động (cùng routineSlot)
    if (routineKey !== clipboardRoutineKey) return;

    const currentWeek = selectedWeekIdRef.current || selectedWeekId;
    const isSameWeek = !activeClipboard.weekId || activeClipboard.weekId === currentWeek;

    // Không chọn chính ô nguồn đang sao chép NẾU ở cùng một tuần
    if (isSameWeek && activeClipboard.day && dayKey === activeClipboard.day) return;

    const DAY_ORDER = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
    const prevClicked = lastClickedCellRef.current;

    // CHỈ KHI đè phím Shift (và KHÔNG đè Ctrl) VÀ đã có ô click trước đó cùng hàng khung giờ trong cùng tuần -> Chọn dải ô liên tục
    if (
      isShift &&
      !isCtrl &&
      prevClicked &&
      prevClicked.routineKey === routineKey &&
      (!prevClicked.weekId || prevClicked.weekId === currentWeek)
    ) {
      const prevIdx = DAY_ORDER.indexOf(prevClicked.dayKey);
      const curIdx = DAY_ORDER.indexOf(dayKey);

      if (prevIdx !== -1 && curIdx !== -1) {
        const start = Math.min(prevIdx, curIdx);
        const end = Math.max(prevIdx, curIdx);
        const rangeDayKeys = DAY_ORDER.slice(start, end + 1).filter((dKey) => {
          if (isSameWeek && dKey === activeClipboard.day) return false;
          const dObj = currentDaysRef.current?.find((d) => d.key === dKey);
          return !dObj?.isLocked;
        });

        setSelectedTargetCells((prev) => {
          const next = [...prev];
          rangeDayKeys.forEach((dKey) => {
            if (
              !next.some(
                (c) =>
                  (c.weekId || currentWeek) === currentWeek &&
                  c.dayKey === dKey &&
                  c.routineKey === routineKey
              )
            ) {
              next.push({ weekId: currentWeek, dayKey: dKey, routineKey });
            }
          });
          return next;
        });
        setLastClickedCell({ weekId: currentWeek, dayKey, routineKey });
        return;
      }
    }

    // Toggle: Nếu ô này đã đang chọn để dán -> BỎ DÁN (xóa khỏi danh sách)
    // Nếu chưa chọn -> THÊM VÀO danh sách chọn dán
    setSelectedTargetCells((prev) => {
      const exists = prev.some(
        (c) =>
          (c.weekId || currentWeek) === currentWeek &&
          c.dayKey === dayKey &&
          c.routineKey === routineKey
      );
      if (exists) {
        return prev.filter(
          (c) =>
            !(
              (c.weekId || currentWeek) === currentWeek &&
              c.dayKey === dayKey &&
              c.routineKey === routineKey
            )
        );
      } else {
        return [...prev, { weekId: currentWeek, dayKey, routineKey }];
      }
    });
    setLastClickedCell({ weekId: currentWeek, dayKey, routineKey });
  };

  // Chọn các ngày còn lại trong tuần cho hàng khung giờ đang copy (trừ ô nguồn nếu cùng tuần và trừ các ngày bị khóa)
  const handleSelectAllWeekForClipboard = () => {
    const activeClipboard = clipboardSlotRef.current;
    if (!activeClipboard) return;
    const currentWeek = selectedWeekIdRef.current || selectedWeekId;
    const routineKey =
      activeClipboard.routineSlot ||
      activeClipboard.routine_slot;
    const isSameWeek = !activeClipboard.weekId || activeClipboard.weekId === currentWeek;
    const DAY_KEYS = showWeekend
      ? ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
      : ['T2', 'T3', 'T4', 'T5', 'T6'];
    const allWeekCells = DAY_KEYS
      .filter((dKey) => {
        if (isSameWeek && dKey === activeClipboard.day) return false;
        const dObj = currentDaysRef.current?.find((d) => d.key === dKey);
        return !dObj?.isLocked;
      })
      .map((dKey) => ({
        weekId: currentWeek,
        dayKey: dKey,
        routineKey,
      }));
    setSelectedTargetCells((prev) => {
      const otherWeeks = prev.filter((c) => c.weekId && c.weekId !== currentWeek);
      return [...otherWeeks, ...allWeekCells];
    });
  };

  // Thực hiện Dán (Enter hoặc Ctrl+V) vào tất cả các ô đã chọn (kể cả ô đã chọn ở các tuần khác nhau)
  const handleExecutePaste = async () => {
    const activeClipboard = clipboardSlotRef.current;
    if (!activeClipboard) return;
    const currentWeek = selectedWeekIdRef.current || selectedWeekId;
    const clipboardRoutineKey = activeClipboard.routineSlot || activeClipboard.routine_slot;

    const currentSelected = selectedTargetCellsRef.current;
    const targets = currentSelected.filter((t) => {
      if (t.routineKey !== clipboardRoutineKey) return false;
      const targetWeek = t.weekId || currentWeek;
      const isSameAsSourceWeek = !activeClipboard.weekId || activeClipboard.weekId === targetWeek;
      if (isSameAsSourceWeek && t.dayKey === activeClipboard.day) return false;
      if (targetWeek === currentWeek) {
        const dObj = currentDaysRef.current?.find((d) => d.key === t.dayKey);
        if (dObj?.isLocked) return false;
      }
      return true;
    });

    if (targets.length === 0) {
      toast.error(t('planning.noValidPasteCells', 'Không có ô hợp lệ để dán (các ô đã chọn có thể đã bị khóa dạy hoặc nằm ngoài năm học)'));
      return;
    }

    try {
      const DAY_KEYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
      const promises = targets.map(async (target) => {
        const targetWeek = target.weekId || currentWeek;
        const targetWeekObj = CALENDAR_WEEKS.find((w) => w.id === targetWeek);
        const dayIdx = DAY_KEYS.indexOf(target.dayKey);
        const dayDetail = targetWeekObj?.dayDetails?.[dayIdx];
        const targetDate = dayDetail
          ? `${String(dayDetail.day).padStart(2, '0')}/${String(dayDetail.month + 1).padStart(2, '0')}`
          : '12/10';

        let saved;
        const existingInTarget = slots.filter(
          (s) =>
            s.day === target.dayKey &&
            (s.routineSlot === target.routineKey || s.routine_slot === target.routineKey)
        );

        if (existingInTarget.length > 0) {
          const confirmed = await confirmDialog({
            title: t('planning.replaceActivityConfirmTitle', 'Thay thế hoạt động'),
            description: t('planning.replaceActivityConfirm', 'Khung giờ này đã có hoạt động. Bạn có muốn thay thế hoạt động hiện tại không?'),
            confirmText: t('common.replace', 'Thay thế'),
            cancelText: t('common.cancel', 'Hủy'),
            variant: 'default',
          });
          if (!confirmed) return null;

          for (const existing of existingInTarget) {
            if (existing.id && !String(existing.id).startsWith('s-')) {
              try {
                await planningApi.deleteWeeklySlot(classId, existing.id);
              } catch (delErr) {
                console.warn('Failed to delete existing slot during paste:', delErr);
              }
            }
          }
        }

        if (activeClipboard.activityId) {
          saved = await planningApi.assignActivityToSlot(classId, {
            activityId: activeClipboard.activityId,
            day: target.dayKey,
            routineSlot: target.routineKey,
            date: targetDate,
            subThemeId: timetableData?.selectedSubTheme?.id || timetableData?.theme?.id,
            isAdd: false,
            slotId: existingInTarget[0]?.id || null,
            weekId: targetWeek,
            orderIndex: 1,
          });
        } else {
          const newSlot = {
            ...activeClipboard,
            id: `s-${target.dayKey.toLowerCase()}-${Date.now().toString().slice(-4)}-${Math.floor(Math.random() * 1000)}`,
            day: target.dayKey,
            date: targetDate,
            routineSlot: target.routineKey,
            routine_slot: target.routineKey,
            orderIndex: 1,
            order_index: 1,
            status: 'SCHEDULED',
            weekId: targetWeek,
          };
          saved = await planningApi.saveWeeklySlot(classId, newSlot);
        }
        return saved;
      });

      await Promise.all(promises);
      await loadTimetable(currentWeek);

      toast.success(
        t('planning.pasteActivitiesSuccess', {
          title: activeClipboard.title || activeClipboard.shortTitle,
          count: targets.length,
          defaultValue: `Đã dán "${activeClipboard.title || activeClipboard.shortTitle}" vào ${targets.length} ô thời khóa biểu`,
        })
      );

      setClipboardSlot(null);
      setSelectedTargetCells([]);
      setLastClickedCell(null);
    } catch (err) {
      console.error('Lỗi khi dán hoạt động:', err);
      toast.error(t('planning.pasteActivitiesError', 'Không thể dán hoạt động vào các ô đã chọn'));
    }
  };

  // Lắng nghe toàn cục phím tắt bàn phím: Ctrl+V (Dán), Esc (Hủy)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target.isContentEditable
      ) {
        return;
      }

      // Không can thiệp nếu người dùng đang bôi đen text bình thường trên trang
      if (window.getSelection()?.toString()?.trim()?.length > 0) {
        return;
      }

      // Phím Enter (hoặc Ctrl + V) -> Dán vào các ô đã chọn
      if (e.key === 'Enter' || ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V'))) {
        if (clipboardSlotRef.current) {
          e.preventDefault();
          handleExecutePaste();
        }
      }

      // Phím Delete hoặc Backspace -> Xoá hoạt động giáo dục (đang sao chép bằng Ctrl hoặc đang mở xem)
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (!pickerCell && !isDrawerOpen) {
          if (clipboardSlotRef.current) {
            e.preventDefault();
            const targetSlot = clipboardSlotRef.current;
            handleCancelClipboard();
            handleClearSlot(targetSlot);
            return;
          }
          if (selectedSlotForPopoverRef.current?.slot) {
            e.preventDefault();
            const targetSlot = selectedSlotForPopoverRef.current.slot;
            handleClearSlot(targetSlot);
            return;
          }
        }
      }

      // Escape -> Hủy chế độ sao chép hoặc đóng popover
      if (e.key === 'Escape') {
        if (selectedSlotForPopoverRef.current) {
          e.preventDefault();
          setSelectedSlotForPopover(null);
          return;
        }
        if (clipboardSlotRef.current || selectedTargetCellsRef.current.length > 0) {
          e.preventDefault();
          handleCancelClipboard();
        }
      }

      // Phím Mũi tên trái (<-) -> Tuần trước
      if (e.key === 'ArrowLeft' && !e.ctrlKey && !e.altKey && !e.metaKey) {
        if (!pickerCell && !isDrawerOpen) {
          e.preventDefault();
          handlePrevWeek();
        }
      }

      // Phím Mũi tên phải (->) -> Tuần sau
      if (e.key === 'ArrowRight' && !e.ctrlKey && !e.altKey && !e.metaKey) {
        if (!pickerCell && !isDrawerOpen) {
          e.preventDefault();
          handleNextWeek();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentDays, pickerCell, isDrawerOpen]);

  // Xử lý kéo thả hoạt động giữa các ô thời khóa biểu
  const handleMoveSlot = async ({
    sourceSlot,
    sourceDay,
    sourceSlotDef,
    sourceExistingSlots,
    targetDay,
    targetSlotDef,
    targetExistingSlots,
    isDuplicate = false,
  }) => {
    if (!sourceSlot || !targetDay) return;
    if (targetDay?.isLocked) {
      toast.error(
        t('planning.cannotMoveToLockedDay', 'Không thể chuyển hoạt động sang ngày {{day}} ({{date}}) vì ngày này đã bị khóa dạy{{reason}}.', {
          day: targetDay.name,
          date: targetDay.date,
          reason: targetDay.lockReason ? ` bởi "${targetDay.lockReason}"` : '',
        })
      );
      return;
    }
    if (!isDuplicate && sourceDay.key === targetDay.key && sourceSlotDef.key === targetSlotDef.key) return;

    // 0. Khi giữ phím Alt hoặc Ctrl -> Nhân bản (Duplicate mode)
    if (isDuplicate) {
      await handleDuplicateSlotToTarget({
        sourceSlot,
        targetDay,
        targetSlotDef,
        targetExistingSlots,
      });
      return;
    }

    const isSameRoutine = (slot, routineKey) =>
      slot.routineSlot === routineKey ||
      slot.routine_slot === routineKey ||
      slot.slotKey === routineKey;

    const sourceSlotsInCell =
      sourceExistingSlots ||
      slots.filter(
        (s) =>
          s.day === sourceDay.key &&
          (isSameRoutine(s, sourceSlotDef.key) ||
            (sourceSlotDef.fallbackTime && s.startTime === sourceSlotDef.fallbackTime))
      );

    const targetSlotsInCell =
      targetExistingSlots ||
      slots.filter(
        (s) =>
          s.day === targetDay.key &&
          (isSameRoutine(s, targetSlotDef.key) ||
            (targetSlotDef.fallbackTime && s.startTime === targetSlotDef.fallbackTime))
      );

    const currentWeek = selectedWeekIdRef.current || selectedWeekId;

    // Khi đem qua ô đã có hoạt động: Hiện alert confirm của browser đơn giản, clean
    if (targetSlotsInCell.length > 0) {
      const targetSlot = targetSlotsInCell[0];
      if (sourceSlot.id === targetSlot.id) return;

      const sourceName = sourceSlot.title || sourceSlot.shortTitle || t('planning.thisActivity', 'hoạt động này');
      const targetName = targetSlot.title || targetSlot.shortTitle || t('planning.existingActivity', 'hoạt động đã có');
      const cellName = `${targetDay.name} (${targetSlotDef.name})`;

      const confirmed = await confirmDialog({
        title: t('planning.swapConfirmTitle', 'Đổi chỗ hoạt động'),
        description: t(
          'planning.swapConfirm',
          'Ô {{cellName}} đã có hoạt động "{{targetName}}".\n\nBạn có muốn đổi chỗ hai hoạt động này cho nhau không?',
          { cellName, targetName }
        ),
        confirmText: t('planning.swap', 'Đổi chỗ'),
        cancelText: t('common.cancel', 'Hủy'),
        variant: 'default',
      });

      if (!confirmed) return;

      // Optimistic update trong UI ngay lập tức
      setSlots((prev) => {
        return prev.map((s) => {
          if (s.id === sourceSlot.id) {
            return {
              ...s,
              day: targetDay.key,
              date: targetDay.dateStr || targetDay.date,
              routineSlot: targetSlotDef.key,
              routine_slot: targetSlotDef.key,
              weekId: currentWeek,
            };
          }
          if (s.id === targetSlot.id) {
            return {
              ...s,
              day: sourceDay.key,
              date: sourceDay.dateStr || sourceDay.date,
              routineSlot: sourceSlotDef.key,
              routine_slot: sourceSlotDef.key,
              weekId: currentWeek,
            };
          }
          return s;
        });
      });

      try {
        await planningApi.swapWeeklySlots(classId, {
          sourceSlotId: sourceSlot.id,
          targetSlotId: targetSlot.id,
        });
        await loadTimetable();
        toast.success(
          t('planning.swapSuccess', 'Đã đổi chỗ "{{source}}" và "{{target}}"', {
            source: sourceName,
            target: targetName,
          })
        );
      } catch (err) {
        console.error('Swap slots error:', err);
        toast.error(err.response?.data?.message || err.message || t('planning.swapError', 'Lỗi khi đổi chỗ hoạt động.'));
        await loadTimetable();
      }
      return;
    }

    // Di chuyển sang ô trống
    const updatedSourceSlot = {
      ...sourceSlot,
      id: sourceSlot.id,
      day: targetDay.key,
      date: targetDay.dateStr || targetDay.date,
      routineSlot: targetSlotDef.key,
      routine_slot: targetSlotDef.key,
      weekId: currentWeek,
      orderIndex: 1,
      order_index: 1,
    };

    setSlots((prev) => {
      const remaining = prev.filter((s) => s.id !== sourceSlot.id);
      return [...remaining, updatedSourceSlot];
    });

    try {
      await planningApi.saveWeeklySlot(classId, {
        ...updatedSourceSlot,
        date: targetDay.dateStr || targetDay.date,
      });
      await loadTimetable();
      toast.success(
        t('planning.moveSuccess', 'Đã chuyển "{{name}}" sang {{targetDay}}', {
          name: sourceSlot.title || sourceSlot.shortTitle,
          targetDay: targetDay.name || targetDay.shortName,
        })
      );
    } catch (err) {
      console.warn('Failed to save moved slot:', err);
      toast.error(t('planning.moveError', 'Lỗi khi chuyển hoạt động.'));
      await loadTimetable();
    }
  };

  // Lọc danh sách ô đã chọn dán thuộc về tuần đang hiển thị
  const currentWeekSelectedTargetCells = useMemo(() => {
    return selectedTargetCells.filter((c) => !c.weekId || c.weekId === selectedWeekId);
  }, [selectedTargetCells, selectedWeekId]);

  if (isLoading && !timetableData) {
    return <PlanningTabLoading message={t('planning.loadingWeeklyTimetable', 'Đang tải dữ liệu kế hoạch tuần...')} />;
  }

  return (
    <div
      className="w-full flex-1 flex flex-col bg-background text-foreground select-none gap-3.5 pb-8"
      data-name="WeeklyTimetableHub"
    >
      {/* 1. Header Toolbar - Hoàn toàn đồng nhất với Nhật ký ngày */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60 shrink-0">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-[26px] font-semibold text-foreground tracking-tight">
              {t('planning.tabTimetable', 'Kế hoạch tuần')}
            </h1>
            {isRejected ? (
              <button
                type="button"
                onClick={() => setIsFeedbackModalOpen(true)}
                className="inline-flex items-center gap-1.5 text-[11.5px] font-medium px-2 py-0.5 select-none border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100/80 dark:hover:bg-rose-900/60 transition-colors cursor-pointer shrink-0"
                title={t('planning.clickToViewFeedback', 'Nhấn để xem chi tiết ý kiến phản hồi')}
              >
                <HugeiconsIcon icon={AlertCircleIcon} size={12} className="shrink-0 text-rose-600 dark:text-rose-400" />
                <span>{t('planning.requestRevision', 'Yêu cầu sửa')}</span>
              </button>
            ) : isPendingApproval ? (
              <span
                className="inline-flex items-center gap-1.5 text-[11.5px] font-medium px-2 py-0.5 select-none border shrink-0 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/50"
                title={t('planning.pendingApprovalTooltip', 'Kế hoạch tuần đang chờ phê duyệt')}
              >
                <HugeiconsIcon
                  icon={Clock01Icon}
                  size={12}
                  className="shrink-0 text-amber-600 dark:text-amber-400"
                />
                <span>{t('planning.pendingApproval', 'Chờ duyệt')}</span>
              </span>
            ) : isApproved ? (
              <span
                className="inline-flex items-center gap-1.5 text-[11.5px] font-medium px-2 py-0.5 select-none border shrink-0 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/50"
                title={t('planning.approvedTooltip', 'Kế hoạch tuần đã được phê duyệt')}
              >
                <HugeiconsIcon
                  icon={CheckmarkCircle01Icon}
                  size={12}
                  className="shrink-0 text-emerald-600 dark:text-emerald-400"
                />
                <span>{t('planning.approved', 'Đã duyệt')}</span>
              </span>
            ) : null}
          </div>
          {!isRejected && !isPendingApproval && !isApproved && (
            <p className="text-[12px] text-muted-foreground font-normal">
              {t(
                'planning.timetableDesc',
                'Sắp xếp kế hoạch tuần và các hoạt động học tập, sinh hoạt theo từng ngày trong tuần'
              )}
            </p>
          )}
        </div>

        {/* Cụm điều chỉnh date & buttons: Tuần hiện tại + Khung tuần đồng bộ + Nút mở lịch + Khay hoạt động */}
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

          {/* Khung đồng bộ hiển thị Tuần (chiều rộng cố định để không bị co giãn) */}
          <div className="flex items-center border border-border bg-background text-[12.5px] rounded-none shadow-2xs">
            <button
              type="button"
              onClick={handlePrevWeek}
              disabled={CALENDAR_WEEKS.findIndex((w) => w.id === selectedWeekId) <= 0}
              className="size-8 flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground border-r border-border transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
              title={t('planning.prevWeek', 'Tuần trước (Phím ←)')}
            >
              <HugeiconsIcon icon={ArrowLeft02Icon} size={14} />
            </button>

            <div className="w-[195px] h-8 flex items-center justify-center font-medium select-none text-[12.5px] text-foreground tabular-nums shrink-0 gap-1.5">
              <span>{t('planning.weekPrefix', 'Tuần')} {activeWeekObj?.label}</span>
              {isReadOnly && isThemeReadOnly && (
                <span title={t('planning.approvedThemeReadOnlyTooltip', 'Tuần thuộc chủ đề đã duyệt (Chỉ đọc)')}>
                  <HugeiconsIcon icon={Clock01Icon} size={12} className="text-blue-600 dark:text-blue-400 shrink-0" />
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleNextWeek}
              disabled={CALENDAR_WEEKS.findIndex((w) => w.id === selectedWeekId) >= CALENDAR_WEEKS.length - 1}
              className="size-8 flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground border-l border-border transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
              title={t('planning.nextWeek', 'Tuần sau (Phím →)')}
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
            title={t('planning.selectWeekFromCalendar', 'Chọn tuần từ lịch')}
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
            title={showWeekend ? t('planning.hideWeekendTooltip', 'Ẩn Thứ 7 & Chủ nhật') : t('planning.showWeekendTooltip', 'Hiện Thứ 7 & Chủ nhật')}
          >
            <HugeiconsIcon icon={Calendar03Icon} size={14} />
            <span>{showWeekend ? t('planning.hideWeekend', 'Ẩn T7, CN') : t('planning.showWeekend', 'Hiện T7, CN')}</span>
          </button>

          {/* Nút Xuất Excel Kế hoạch tuần */}
          <ExcelActionsDropdown
            onExport={handleExportWeeklyExcel}
            isExporting={isExportingExcel}
            showImport={false}
          />
        </div>
      </div>



      {/* 2. Main Workspace: Full-width Timetable Grid tái sử dụng TeacherTimetableGrid */}
      <TeacherTimetableGrid
        title={t('planning.tabTimetable', 'Thời khoá biểu')}
        dateRange={activeWeekObj?.label || '05/10 – 11/10/2026'}
        themeName={timetableData?.selectedTheme?.name || timetableData?.theme?.name}
        subThemeName={timetableData?.selectedSubTheme?.name}
        days={currentDays}
        slots={slots}
        activeSlotId={selectedSlotForPopover?.slot?.id}
        mode="planning"
        clipboardSlot={clipboardSlot}
        currentWeekId={selectedWeekId}
        selectedTargetCells={currentWeekSelectedTargetCells}
        showWeekend={showWeekend}
        onToggleWeekend={handleToggleWeekend}
        onToggleSelectCell={handleToggleSelectCell}
        onCopySlot={handleCopySlot}
        onCancelClipboard={handleCancelClipboard}
        onSelectSlot={(slot, day) => {
          setSelectedSlotForPopover({ slot, day });
        }}
        onSelectEmptyCell={(day, slotDef) => {
          if (isReadOnly) return;
          if (day?.isLocked) {
            const makeupDate = day?.holiday?.makeupDate || day?.makeupDate;
            if (makeupDate) {
              const parts = makeupDate.split('-');
              toast.info(
                t(
                  'planning.holidayMakeupInfo',
                  'Ngày {{day}} là ngày nghỉ. Ban Giám Hiệu đã bố trí dạy bù sang Thứ Bảy ({{date}}). Vui lòng xếp lịch vào Thứ Bảy.',
                  {
                    day: day.name,
                    date: `${parts[2]}/${parts[1]}`,
                  }
                )
              );
            } else {
              toast.error(
                t(
                  'planning.dayLockedError',
                  'Ngày {{day}} ({{date}}) đã bị khóa dạy{{reason}}. Không thể thêm kế hoạch tuần vào ngày này.',
                  {
                    day: day.name,
                    date: day.date,
                    reason: day.lockReason ? ` bởi "${day.lockReason}"` : '',
                  }
                )
              );
            }
            return;
          }
          if (clipboardSlot) {
            handleToggleSelectCell(day.key, slotDef.key, false);
            return;
          }
          setPickerCell({ day, slotDef });
        }}
        onMoveSlot={handleMoveSlot}
        readOnly={isReadOnly}
        hideHeader={false}
      />

      {/* 2.1 Hướng dẫn thao tác nhanh (Đơn giản, dễ hiểu) */}
      <div className="border border-border/80 bg-card/60 p-3.5 rounded-none select-none text-[12px] space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-border/60 text-foreground font-medium text-[12.5px] flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Info className="size-3.5 text-muted-foreground shrink-0" />
            <span>{t('planning.timetableGuideTitle', 'Hướng dẫn thao tác thời khóa biểu')}</span>
          </div>
          <span className="text-[11px] font-normal text-muted-foreground select-none">
            {t('planning.switchWeekKeyHint', 'Chuyển tuần: phím')} <kbd className="px-1.5 py-0.5 bg-muted border border-border text-[10.5px] font-mono text-foreground font-medium">←</kbd> / <kbd className="px-1.5 py-0.5 bg-muted border border-border text-[10.5px] font-mono text-foreground font-medium">→</kbd>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-muted-foreground">
          {/* Cột 1: Kéo thả */}
          <div className="bg-muted/15 p-2.5 border border-border/50 space-y-1">
            <div className="font-medium text-foreground text-[12px]">
              {t('planning.dragActivityTitle', '1. Kéo thả hoạt động')}
            </div>
            <p
              className="text-[11.5px] leading-relaxed"
              dangerouslySetInnerHTML={{
                __html: t(
                  'planning.dragActivityDesc',
                  'Kéo hoạt động sang ô khác để di chuyển. Nếu ô đích đã có hoạt động, hệ thống sẽ tự động <strong>hoán đổi vị trí</strong> (đổi chỗ) giữa 2 hoạt động. Giữ phím <strong>Alt / Ctrl</strong> khi kéo để nhân bản.'
                ),
              }}
            />
          </div>

          {/* Cột 2: Sao chép */}
          <div className="bg-muted/15 p-2.5 border border-border/50 space-y-1">
            <div className="font-medium text-foreground text-[12px]">
              {t('planning.copyActivityTitle', '2. Sao chép (Ctrl + Click)')}
            </div>
            <p
              className="text-[11.5px] leading-relaxed"
              dangerouslySetInnerHTML={{
                __html: t(
                  'planning.copyActivityDesc',
                  'Đè phím <strong>Ctrl</strong> và nhấp vào bài học để sao chép. Nhấp các ô trong cùng hàng để chọn đích (giữ <strong>Shift</strong> để chọn nhanh dải ô).'
                ),
              }}
            />
          </div>

          {/* Cột 3: Dán & Hủy lựa chọn */}
          <div className="bg-muted/15 p-2.5 border border-border/50 space-y-1">
            <div className="font-medium text-foreground text-[12px]">
              {t('planning.pasteActivityTitle', '3. Dán & Hủy lựa chọn')}
            </div>
            <p
              className="text-[11.5px] leading-relaxed"
              dangerouslySetInnerHTML={{
                __html: t(
                  'planning.pasteActivityDesc',
                  'Nhấn <strong>Enter</strong> để dán vào các ô đã chọn. Nhấn <strong>Delete</strong> để xoá hoạt động (khi đang sao chép hoặc chọn). Nhấn <strong>Esc</strong> để hủy lựa chọn.'
                ),
              }}
            />
          </div>
        </div>
      </div>

      {/* 3. Slide-over Week Picker Overlay Drawer (Đồng nhất với DailyRoutinePage) */}
      {isCalendarOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            onClick={() => setIsCalendarOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in-0 duration-200"
          />
          <div
            className="relative w-full max-w-[340px] h-full bg-card border-l border-border shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-250 ease-out z-10 text-foreground"
            onClick={(e) => e.stopPropagation()}
            data-name="WeekPickerDrawer"
          >
            <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-border shrink-0 bg-card">
              <div className="flex flex-col gap-1">
                <h2 className="text-[18px] font-semibold text-foreground tracking-tight">
                  {t('planning.selectWeek', 'Chọn tuần học')}
                </h2>
                <p className="text-[12px] text-muted-foreground font-normal">
                  {t('planning.selectWeekPlanningSubtitle', 'Lựa chọn tuần để sắp xếp và theo dõi kế hoạch hoạt động')}
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

            <div className="flex-1 overflow-y-auto p-4">
              <WeekPickerCalendar
                className="w-full border-l-0 shadow-none p-0"
                selectedWeek={selectedWeekId}
                onSelectWeek={(week) => {
                  selectedWeekIdRef.current = week.id;
                  setSelectedWeekId(week.id);
                  setSelectedSlotForPopover(null);
                  setIsCalendarOpen(false);
                }}
              />
            </div>

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



      {/* 5. Hierarchical Activity Selection Modal (khi click vào ô thời khóa biểu) */}
      <HierarchicalActivityPickerModal
        isOpen={Boolean(pickerCell)}
        onClose={() => setPickerCell(null)}
        targetCell={pickerCell}
        goals={hierarchicalGoals}
        themeAllocations={timetableData?.themeAllocations || []}
        subThemeName={timetableData?.selectedSubTheme?.name}
        onSelectActivity={handleAssignActivityToSlot}
        currentActivityId={pickerCell?.currentActivityId}
      />

      {/* 6. Slot Detail Popover (khi click vào ô đã có hoạt động) */}
      {/* 6. Slot Detail Drawer (Xem chi tiết tất cả hoạt động trong slot theo thứ tự) */}
      <ActivitySlotPopover
        slot={selectedSlotForPopover?.slot}
        day={selectedSlotForPopover?.day}
        allSlotsInCell={currentCellSlots}
        isOpen={Boolean(selectedSlotForPopover)}
        onClose={() => setSelectedSlotForPopover(null)}
        onSelectSlot={(newSlot) => {
          setSelectedSlotForPopover((prev) => (prev ? { ...prev, slot: newSlot } : null));
        }}
        onChangeActivity={(slot, day) => {
          const currentDayObj = currentDays.find((d) => d.key === (day?.key || slot.day)) || day;
          if (currentDayObj?.isLocked) {
            const makeupDate = currentDayObj?.holiday?.makeupDate || currentDayObj?.makeupDate;
            if (makeupDate) {
              const parts = makeupDate.split('-');
              toast.info(
                t('planning.makeupRescheduledInfo', 'Lịch hoạt động này đã được Ban Giám Hiệu dời sang Thứ Bảy ({{date}}).', {
                  date: `${parts[2]}/${parts[1]}`,
                })
              );
            } else {
              toast.error(
                t('planning.dayLockedChangeError', 'Ngày {{day}} ({{date}}) đã bị khóa dạy{{reason}}. Không thể đổi hoạt động.', {
                  day: currentDayObj.name || currentDayObj.key,
                  date: currentDayObj.date || slot.date,
                  reason: currentDayObj.lockReason ? ` bởi "${currentDayObj.lockReason}"` : '',
                })
              );
            }
            return;
          }
          const slotDef = ROUTINE_SLOTS.find(
            (s) => s.key === slot.routineSlot || s.key === slot.routine_slot
          ) || { key: slot.routineSlot, name: t('planning.periodLesson', 'Tiết học'), defaultTime: `${slot.startTime} – ${slot.endTime}` };

          setSelectedSlotForPopover(null);
          setPickerCell({
            day: currentDayObj || { key: slot.day, name: slot.day, date: slot.date },
            slotDef,
            currentActivityId: slot.activityId,
            replacingSlotId: slot.id,
            isAdd: false,
          });
        }}
        onAddActivity={(slot, day) => {
          const currentDayObj = currentDays.find((d) => d.key === (day?.key || slot.day)) || day;
          if (currentDayObj?.isLocked) {
            toast.error(
              t('planning.dayLockedAddError', 'Ngày {{day}} ({{date}}) đã bị khóa dạy{{reason}}. Không thể thêm hoạt động vào ngày này.', {
                day: currentDayObj.name || currentDayObj.key,
                date: currentDayObj.date || slot.date,
                reason: currentDayObj.lockReason ? ` bởi "${currentDayObj.lockReason}"` : '',
              })
            );
            return;
          }
          const slotDef = ROUTINE_SLOTS.find(
            (s) => s.key === slot.routineSlot || s.key === slot.routine_slot
          ) || { key: slot.routineSlot, name: t('planning.periodLesson', 'Tiết học'), defaultTime: `${slot.startTime} – ${slot.endTime}` };

          setSelectedSlotForPopover(null);
          setPickerCell({
            day: currentDayObj || { key: slot.day, name: slot.day, date: slot.date },
            slotDef,
            currentActivityId: null,
            isAdd: true,
          });
        }}
        onOpenDetail={(slot) => {
          setSelectedSlotForDrawer(slot);
          setIsDrawerOpen(true);
        }}
        onEditActivity={(itemSlot) => {
          setSelectedSlotForDrawer(itemSlot);
          setIsDrawerOpen(true);
        }}
        onClearSlot={handleClearSlot}
        onReorderActivities={handleReorderActivities}
        readOnly={isReadOnly}
      />

      {/* 7. Activity Slot Detail Drawer (Chỉnh sửa nội dung hoạt động giáo dục) */}
      <ActivitySlotDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        initialSlot={selectedSlotForDrawer}
        allocatedThemes={timetableData?.themeAllocations || []}
        readOnly={isReadOnly}
        lockRoutineSlot={true}
        onSave={handleSaveEditedSlot}
      />
      {/* 8. Modal: BGH Feedback / Rejection Details */}
      <Dialog open={isFeedbackModalOpen} onOpenChange={setIsFeedbackModalOpen}>
        <DialogContent className="max-w-md rounded-none">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-foreground">
              {t('planning.bghFeedbackTitle', 'Ý kiến phản hồi của Ban Giám Hiệu')}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-1">
              {t('planning.themePrefix', 'Chủ đề:')}{' '}
              <strong>{timetableData?.selectedTheme?.name || timetableData?.theme?.name || t('planning.tabTimetable', 'Kế hoạch tuần')}</strong>
              {activeWeekObj?.label && <span> ({activeWeekObj.label})</span>}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="bg-rose-50/70 dark:bg-rose-950/25 border border-rose-200/80 dark:border-rose-900/40 p-3.5 text-rose-800 dark:text-rose-200 text-xs leading-relaxed font-medium">
              "{rejectionReason || t('planning.bghReviewRequired', 'Ban Giám Hiệu yêu cầu rà soát và bổ sung kế hoạch.')}"
            </div>
            <p className="text-muted-foreground text-[11.5px] leading-relaxed">
              {t('planning.bghFeedbackInstruction', 'Vui lòng kiểm tra lại các nội dung theo góp ý trên và nộp lại cho Ban Giám Hiệu duyệt.')}
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border/60">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFeedbackModalOpen(false)}
              className="text-xs rounded-none h-8 px-4"
            >
              {t('common.close', 'Đóng')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default WeeklyTimetableTab;
