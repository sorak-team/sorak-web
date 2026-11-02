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
} from '@hugeicons/core-free-icons';
import { Info, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/shared/lib/utils';
import { toast } from 'sonner';
import { planningApi } from '../planning.api';
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


export function WeeklyTimetableTab({ classId = '1' }) {
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

  const isReadOnly = isPrincipal || Boolean(currentAcademicYear?.status === 'COMPLETED');

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
  const [selectedWeekId, setSelectedWeekId] = useState(initialCurrentWeekId);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

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

      // Check if this date is locked by a SchoolHoliday where isTeachingAllowed is false
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
                lockLabel = h.name;
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

      const isLocked = isOutsideAcademicYear || isHolidayLocked;
      const finalLockReason = isOutsideAcademicYear
        ? 'Nằm ngoài năm học đang chọn'
        : lockReason;
      const finalLockLabel = isOutsideAcademicYear
        ? 'Ngoại khóa'
        : lockLabel;

      return {
        ...day,
        date: formattedDate,
        dateStr: dateIsoStr,
        isToday,
        isFuture,
        isLocked,
        isHolidayLocked,
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

  // Tự động mở T7/CN nếu tuần có slot hoặc tuần khai giảng dính cuối tuần;
  // nếu không thì theo lựa chọn ghi nhớ của người dùng (mặc định ẩn nếu người dùng không chọn hiện)
  useEffect(() => {
    if (hasWeekendSlots || isStartWeekWithWeekend) {
      setShowWeekend(true);
    } else {
      setShowWeekend(userPrefShowWeekend);
    }
  }, [hasWeekendSlots, isStartWeekWithWeekend, selectedWeekId, userPrefShowWeekend]);

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
  const selectedWeekIdRef = React.useRef(selectedWeekId);
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
      setAvailableActivities(data?.availableActivities || []);
      setHierarchicalGoals(data?.goals || []);
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
        toast.error(
          `Không thể xếp kế hoạch tuần vào ngày ${targetDay.name} (${targetDay.date}) vì ngày này đã bị khóa dạy${targetDay.lockReason ? ` bởi "${targetDay.lockReason}"` : ''}.`
        );
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

      const payload = {
        activityId: activity.id,
        day: dayKey,
        routineSlot: routineSlotKey,
        date: targetDay?.dateStr || dateStr || targetDay?.date || '2026-10-14',
        slotId: replacingSlotId,
        isAdd,
        weekId: currentWeek,
        subThemeId: timetableData?.selectedSubTheme?.id || timetableData?.theme?.id,
        orderIndex: isAdd ? existingInCell.length + 1 : 1,
      };
      await planningApi.assignActivityToSlot(classId, payload);

      // Reload timetable directly from backend
      await loadTimetable();

      toast.success(
        isAdd
          ? `Đã thêm "${activity.title}" vào slot ${dayKey}`
          : `Đã xếp "${activity.title}" vào ${dayKey} (${ROUTINE_SLOT_SHORT_LABELS[routineSlotKey] || routineSlotKey})`
      );
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể gán hoạt động vào slot');
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
      toast.success(`Đã gỡ "${slot.title}" khỏi lịch tuần`);
    } catch {
      toast.error('Không thể gỡ hoạt động khỏi slot');
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
      toast.error('Không thể lưu thứ tự hoạt động');
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
      toast.success(`Đã cập nhật bài dạy "${updatedSlot.title}"`);
    } catch {
      toast.error('Không thể lưu thay đổi vào cơ sở dữ liệu');
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
          `Không thể nhân bản hoạt động sang ngày ${targetDay.name} (${targetDay.date}) vì ngày này đã bị khóa dạy${targetDay.lockReason ? ` bởi "${targetDay.lockReason}"` : ''}.`
        );
        return;
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
          isAdd: true,
          orderIndex: targetExistingSlots.length + 1,
        });
      } else {
        const newSlot = {
          ...sourceSlot,
          id: `s-${targetDay.key.toLowerCase()}-${Date.now().toString().slice(-4)}-${Math.floor(Math.random() * 1000)}`,
          day: targetDay.key,
          date: targetDay.date,
          routineSlot: routineKey,
          routine_slot: routineKey,
          orderIndex: targetExistingSlots.length + 1,
          order_index: targetExistingSlots.length + 1,
          status: 'SCHEDULED',
        };
        saved = await planningApi.saveWeeklySlot(classId, {
          ...newSlot,
          date: targetDay.dateStr || targetDay.date,
        });
      }

      setSlots((prev) => [...prev, { ...saved, date: targetDay.date, orderIndex: targetExistingSlots.length + 1, order_index: targetExistingSlots.length + 1 }]);
      await loadTimetable();
      toast.success(
        `Đã nhân bản "${sourceSlot.title || sourceSlot.shortTitle}" sang ${targetDay.name || targetDay.shortName}`
      );
    } catch (err) {
      console.error('Failed to duplicate slot:', err);
      toast.error('Không thể nhân bản hoạt động');
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
        `Ngày ${targetDay.name} (${targetDay.date}) đã bị khóa dạy${targetDay.lockReason ? ` (${targetDay.lockReason})` : ''}, không thể dán vào ngày này.`
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
      toast.error('Không có ô hợp lệ để dán (các ô đã chọn có thể đã bị khóa dạy hoặc nằm ngoài năm học)');
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
        const nextOrderIndex = existingInTarget.length + 1;

        if (activeClipboard.activityId) {
          saved = await planningApi.assignActivityToSlot(classId, {
            activityId: activeClipboard.activityId,
            day: target.dayKey,
            routineSlot: target.routineKey,
            date: targetDate,
            subThemeId: timetableData?.selectedSubTheme?.id || timetableData?.theme?.id,
            isAdd: true,
            weekId: targetWeek,
            orderIndex: nextOrderIndex,
          });
        } else {
          const newSlot = {
            ...activeClipboard,
            id: `s-${target.dayKey.toLowerCase()}-${Date.now().toString().slice(-4)}-${Math.floor(Math.random() * 1000)}`,
            day: target.dayKey,
            date: targetDate,
            routineSlot: target.routineKey,
            routine_slot: target.routineKey,
            orderIndex: nextOrderIndex,
            order_index: nextOrderIndex,
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
        `Đã dán "${activeClipboard.title || activeClipboard.shortTitle}" vào ${targets.length} ô thời khóa biểu`
      );

      setClipboardSlot(null);
      setSelectedTargetCells([]);
      setLastClickedCell(null);
    } catch (err) {
      console.error('Lỗi khi dán hoạt động:', err);
      toast.error('Không thể dán hoạt động vào các ô đã chọn');
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
        `Không thể chuyển hoạt động sang ngày ${targetDay.name} (${targetDay.date}) vì ngày này đã bị khóa dạy${targetDay.lockReason ? ` bởi "${targetDay.lockReason}"` : ''}.`
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
    const nextOrder = targetSlotsInCell.length + 1;
    const updatedSourceSlot = {
      ...sourceSlot,
      day: targetDay.key,
      date: targetDay.date,
      routineSlot: targetSlotDef.key,
      routine_slot: targetSlotDef.key,
      weekId: currentWeek,
      orderIndex: nextOrder,
      order_index: nextOrder,
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
    } catch (err) {
      console.warn('Failed to save moved slot:', err);
    }

    toast.success(
      targetSlotsInCell.length > 0
        ? `Đã thêm "${sourceSlot.title || sourceSlot.shortTitle}" vào ${targetDay.name || targetDay.shortName}`
        : `Đã chuyển "${sourceSlot.title || sourceSlot.shortTitle}" sang ${targetDay.name || targetDay.shortName}`
    );
  };

  // Lọc danh sách ô đã chọn dán thuộc về tuần đang hiển thị
  const currentWeekSelectedTargetCells = useMemo(() => {
    return selectedTargetCells.filter((c) => !c.weekId || c.weekId === selectedWeekId);
  }, [selectedTargetCells, selectedWeekId]);

  return (
    <div
      className="w-full flex-1 flex flex-col bg-background text-foreground select-none gap-3.5 pb-8"
      data-name="WeeklyTimetableHub"
    >
      {/* 1. Header Toolbar - Hoàn toàn đồng nhất với Nhật ký ngày */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60 shrink-0">
        <div className="flex flex-col gap-1">
          <h1 className="text-[26px] font-semibold text-foreground tracking-tight">
            {t('planning.tabTimetable', 'Kế hoạch tuần')}
          </h1>
          <p className="text-[12px] text-muted-foreground font-normal">
            {t(
              'planning.timetableDesc',
              'Sắp xếp kế hoạch tuần và các hoạt động học tập, sinh hoạt theo từng ngày trong tuần'
            )}
          </p>
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

            <div className="w-[195px] h-8 flex items-center justify-center font-medium select-none text-[12.5px] text-foreground tabular-nums shrink-0">
              <span>{t('planning.weekPrefix', 'Tuần')} {activeWeekObj?.label}</span>
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
            title="Chọn tuần từ lịch"
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
            title={showWeekend ? 'Ẩn Thứ 7 & Chủ nhật' : 'Hiện Thứ 7 & Chủ nhật'}
          >
            <HugeiconsIcon icon={Calendar03Icon} size={14} />
            <span>{showWeekend ? 'Ẩn T7, CN' : 'Hiện T7, CN'}</span>
          </button>
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
            toast.error(
              `Ngày ${day.name} (${day.date}) đã bị khóa dạy${day.lockReason ? ` bởi "${day.lockReason}"` : ''}. Không thể thêm kế hoạch tuần vào ngày này.`
            );
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
                  'Kéo hoạt động sang ô khác để chuyển/thêm vào ô đó. Giữ phím <strong>Alt / Ctrl</strong> khi kéo để nhân bản.'
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
            toast.error(
              `Ngày ${currentDayObj.name || currentDayObj.key} (${currentDayObj.date || slot.date}) đã bị khóa dạy${currentDayObj.lockReason ? ` bởi "${currentDayObj.lockReason}"` : ''}. Không thể đổi hoạt động.`
            );
            return;
          }
          const slotDef = ROUTINE_SLOTS.find(
            (s) => s.key === slot.routineSlot || s.key === slot.routine_slot
          ) || { key: slot.routineSlot, name: 'Tiết học', defaultTime: `${slot.startTime} – ${slot.endTime}` };

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
              `Ngày ${currentDayObj.name || currentDayObj.key} (${currentDayObj.date || slot.date}) đã bị khóa dạy${currentDayObj.lockReason ? ` bởi "${currentDayObj.lockReason}"` : ''}. Không thể thêm hoạt động vào ngày này.`
            );
            return;
          }
          const slotDef = ROUTINE_SLOTS.find(
            (s) => s.key === slot.routineSlot || s.key === slot.routine_slot
          ) || { key: slot.routineSlot, name: 'Tiết học', defaultTime: `${slot.startTime} – ${slot.endTime}` };

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
        readOnly={isReadOnly}
        lockRoutineSlot={true}
        onSave={handleSaveEditedSlot}
      />
    </div>
  );
}

export default WeeklyTimetableTab;
