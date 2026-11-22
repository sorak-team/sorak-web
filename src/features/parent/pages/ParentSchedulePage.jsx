import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useOutletContext } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArrowLeft02Icon,
  ArrowRight02Icon,
  SidebarRightIcon,
  Calendar03Icon,
  Cancel01Icon,
} from '@hugeicons/core-free-icons';
import {
  Calendar,
  Clock,
  Heart,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Award,
  Sparkles,
  BookOpen,
  Sun,
  Moon,
  Coffee,
  HeartHandshake,
  Trees,
  Gamepad2,
  Activity,
  Info,
  X,
  Layers,
  UserCheck,
  User,
  Check,
  FileText,
} from 'lucide-react';
import { parentApi } from '../api/parent.api';
import { planningApi } from '@/features/planning/planning.api';
import { Button } from '@/components/ui/button';
import { WeekPickerCalendar, CALENDAR_WEEKS } from '@/shared/components/calendar/WeekPickerCalendar';
import { cn } from '@/shared/lib/utils';

export function ParentSchedulePage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const outletCtx = useOutletContext() || {};
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSlotDetail, setSelectedSlotDetail] = useState(null);
  const [selectedDayAttendance, setSelectedDayAttendance] = useState(null);
  const [modalTab, setModalTab] = useState('content');
  const [quickStatusDayKey, setQuickStatusDayKey] = useState(null);

  const classId = searchParams.get('classId') || outletCtx.selectedClassId || null;

  // 1. Quản lý trạng thái Tuần học đồng bộ như giáo viên
  const initialCurrentWeekId = useMemo(
    () => CALENDAR_WEEKS.find((w) => w.isCurrentWeek)?.id || 'w-2',
    []
  );
  const [selectedWeekId, setSelectedWeekId] = useState(initialCurrentWeekId);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Trạng thái hiển thị Thứ 7 & Chủ nhật (lưu localStorage)
  const [showWeekend, setShowWeekend] = useState(() => {
    try {
      return localStorage.getItem('sorak_show_weekend') === 'true';
    } catch {
      return false;
    }
  });

  const activeWeekObj = useMemo(() => {
    return (
      CALENDAR_WEEKS.find((w) => w.id === selectedWeekId) ||
      CALENDAR_WEEKS.find((w) => w.isCurrentWeek) ||
      CALENDAR_WEEKS[0]
    );
  }, [selectedWeekId]);

  const handlePrevWeek = useCallback(() => {
    const idx = CALENDAR_WEEKS.findIndex((w) => w.id === selectedWeekId);
    if (idx > 0) {
      setSelectedWeekId(CALENDAR_WEEKS[idx - 1].id);
      setSelectedSlotDetail(null);
      setSelectedDayAttendance(null);
    }
  }, [selectedWeekId]);

  const handleNextWeek = useCallback(() => {
    const idx = CALENDAR_WEEKS.findIndex((w) => w.id === selectedWeekId);
    if (idx >= 0 && idx < CALENDAR_WEEKS.length - 1) {
      setSelectedWeekId(CALENDAR_WEEKS[idx + 1].id);
      setSelectedSlotDetail(null);
      setSelectedDayAttendance(null);
    }
  }, [selectedWeekId]);

  const handleGoToCurrentWeek = useCallback(() => {
    const curWeek = CALENDAR_WEEKS.find((w) => w.isCurrentWeek) || CALENDAR_WEEKS[0];
    if (curWeek) {
      setSelectedWeekId(curWeek.id);
      setSelectedSlotDetail(null);
      setSelectedDayAttendance(null);
    }
  }, []);

  const handleToggleWeekend = () => {
    setShowWeekend((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('sorak_show_weekend', String(next));
      } catch (e) {
        console.warn('Failed to save weekend preference:', e);
      }
      return next;
    });
  };

  // Keyboard navigation chuyển tuần bằng phím mũi tên & phím Escape đóng popup/drawer
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (selectedDayAttendance) {
          e.preventDefault();
          setSelectedDayAttendance(null);
          return;
        }
        if (selectedSlotDetail) {
          e.preventDefault();
          setSelectedSlotDetail(null);
          return;
        }
        if (isCalendarOpen) {
          e.preventDefault();
          setIsCalendarOpen(false);
          return;
        }
      }
      if (selectedSlotDetail || selectedDayAttendance || isCalendarOpen) return;
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevWeek();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNextWeek();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedSlotDetail, selectedDayAttendance, isCalendarOpen, handlePrevWeek, handleNextWeek]);

  // Target class ID resolution ưu tiên lớp đang theo học của học sinh
  const resolvedClassId = useMemo(() => {
    return (
      classId ||
      outletCtx.selectedClassId ||
      outletCtx.homeroomClass?.id ||
      outletCtx.homeData?.selectedClassId ||
      outletCtx.homeData?.homeroomClass?.id ||
      data?.selectedClassId ||
      data?.classInfo?.id ||
      '1b01db4d-3576-40d4-b85d-e7fe0b5ba8e4'
    );
  }, [classId, outletCtx, data]);

  // Load dữ liệu từ parentApi đồng bộ theo tuần và ngày
  const fetchScheduleData = useCallback(async () => {
    try {
      setLoading(true);
      const startDate = activeWeekObj?.dayDetails?.[0]?.dateStr;
      const endDate = activeWeekObj?.dayDetails?.[6]?.dateStr;
      const res = await parentApi.getSchedule({
        ...(resolvedClassId ? { classId: resolvedClassId } : {}),
        weekId: selectedWeekId,
        startDate,
        endDate,
      });
      setData(res);
    } catch (err) {
      console.error('Failed to load schedule data:', err);
    } finally {
      setLoading(false);
    }
  }, [resolvedClassId, selectedWeekId, activeWeekObj]);

  useEffect(() => {
    fetchScheduleData();
  }, [fetchScheduleData]);

  // Quản lý đồng bộ dữ liệu kế hoạch tuần thực tế từ planningApi (đồng nhất 100% với giáo viên)
  const [weeklyPlanSlots, setWeeklyPlanSlots] = useState([]);
  const [weeklyThemeInfo, setWeeklyThemeInfo] = useState(null);

  useEffect(() => {
    let isCancelled = false;
    const loadRealWeeklyPlan = async () => {
      try {
        const targetClassId = resolvedClassId;
        const startDate = activeWeekObj?.dayDetails?.[0]?.dateStr;
        const endDate = activeWeekObj?.dayDetails?.[6]?.dateStr;
        const res = await planningApi.getWeeklyTimetable(targetClassId, {
          weekId: selectedWeekId,
          startDate,
          endDate,
        });
        if (!isCancelled) {
          if (res?.slots && res.slots.length > 0) {
            setWeeklyPlanSlots(res.slots);
          } else {
            setWeeklyPlanSlots([]);
          }
          setWeeklyThemeInfo({
            theme: res?.selectedTheme || res?.theme || null,
            subTheme: res?.selectedSubTheme || res?.subTheme || null,
          });
        }
      } catch (err) {
        console.warn('Could not fetch weekly timetable from planningApi:', err);
        if (!isCancelled) {
          setWeeklyPlanSlots([]);
          setWeeklyThemeInfo(null);
        }
      }
    };
    loadRealWeeklyPlan();
    return () => {
      isCancelled = true;
    };
  }, [resolvedClassId, selectedWeekId, activeWeekObj]);

  const timetable = data?.timetable || { routineSlots: [], weeklyActivities: [] };
  const holidays = useMemo(() => data?.holidays || data?.timetable?.holidays || [], [data]);
  const attendancesList = useMemo(() => {
    return data?.attendances || data?.attendance?.records || [];
  }, [data]);
  const pad = (n) => String(n).padStart(2, '0');
  const now = new Date();
  const todayIsoStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

  // 2. Tính toán danh sách ngày hiển thị theo tuần đang chọn (T2 – T6, hoặc kèm T7, CN)
  const DAY_INDEX_MAP = { T2: 0, T3: 1, T4: 2, T5: 3, T6: 4, T7: 5, CN: 6 };

  const currentDays = useMemo(() => {
    const baseDays = [
      { key: 'T2', shortName: t('calendar.monShort', 'T2'), name: t('calendar.mon', 'Thứ 2'), dow: 'MONDAY' },
      { key: 'T3', shortName: t('calendar.tueShort', 'T3'), name: t('calendar.tue', 'Thứ 3'), dow: 'TUESDAY' },
      { key: 'T4', shortName: t('calendar.wedShort', 'T4'), name: t('calendar.wed', 'Thứ 4'), dow: 'WEDNESDAY' },
      { key: 'T5', shortName: t('calendar.thuShort', 'T5'), name: t('calendar.thu', 'Thứ 5'), dow: 'THURSDAY' },
      { key: 'T6', shortName: t('calendar.friShort', 'T6'), name: t('calendar.fri', 'Thứ 6'), dow: 'FRIDAY' },
      { key: 'T7', shortName: t('calendar.satShort', 'T7'), name: t('calendar.sat', 'Thứ 7'), dow: 'SATURDAY', isWeekend: true },
      { key: 'CN', shortName: t('calendar.sunShort', 'CN'), name: t('calendar.sun', 'Chủ nhật'), dow: 'SUNDAY', isWeekend: true },
    ];

    // Tự động mở rộng hiển thị Thứ 7, CN nếu tuần này có hoạt động giáo dục xếp vào cuối tuần HOẶC có ngày học bù
    const hasWeekendActivities = (timetable.weeklyActivities || []).some(
      (a) => a.dayOfWeek === 'SATURDAY' || a.dayOfWeek === 'SUNDAY'
    );
    const hasWeekendMakeup = holidays.some((h) => {
      if (h.makeupDate) {
        return activeWeekObj?.dayDetails?.some(
          (det, idx) => (idx === 5 || idx === 6) && det.dateStr === h.makeupDate
        );
      }
      if (h.isTeachingAllowed && (h.affectsClass ?? true)) {
        return activeWeekObj?.dayDetails?.some(
          (det, idx) => (idx === 5 || idx === 6) && det.dateStr >= h.startDate && det.dateStr <= h.endDate
        );
      }
      return false;
    });
    const daysToRender = (showWeekend || hasWeekendActivities || hasWeekendMakeup) ? baseDays : baseDays.filter((d) => !d.isWeekend);

    return daysToRender.map((d) => {
      const dayIdx = DAY_INDEX_MAP[d.key];
      const detail = activeWeekObj?.dayDetails?.[dayIdx];
      let formattedDate = '';
      let fullIsoDate = '';
      if (detail) {
        formattedDate = `${pad(detail.day)}/${pad(detail.month + 1)}`;
        fullIsoDate = detail.dateStr;
      } else {
        const dayNum = activeWeekObj?.days?.[dayIdx];
        formattedDate = dayNum !== undefined ? `${pad(dayNum)}/10` : '';
      }

      const isToday = Boolean(
        detail?.isToday ||
        (fullIsoDate && fullIsoDate === todayIsoStr)
      );

      // Check makeup day (Ngày học bù theo BR-54)
      let makeupHoliday = null;
      let isMakeupDay = false;
      if (fullIsoDate && holidays.length > 0) {
        for (const h of holidays) {
          if (h.affectsClass ?? true) {
            if (h.makeupDate && h.makeupDate === fullIsoDate) {
              makeupHoliday = h;
              isMakeupDay = true;
              break;
            }
            if (h.isTeachingAllowed && fullIsoDate >= h.startDate && fullIsoDate <= h.endDate && (d.key === 'T7' || d.key === 'CN')) {
              makeupHoliday = h;
              isMakeupDay = true;
              break;
            }
          }
        }
      }

      // Check holiday (Ngày nghỉ theo lịch nhà trường) - nếu là ngày học bù thì không tính là holiday nghỉ
      let holiday = null;
      let isHoliday = false;
      if (!isMakeupDay && fullIsoDate && holidays.length > 0) {
        for (const h of holidays) {
          if (!h.isTeachingAllowed && (h.affectsClass ?? true)) {
            if (fullIsoDate >= h.startDate && fullIsoDate <= h.endDate) {
              holiday = h;
              isHoliday = true;
              break;
            }
          }
        }
      }

      return {
        ...d,
        date: formattedDate,
        fullIsoDate,
        isToday,
        isHoliday,
        holiday,
        isMakeupDay,
        makeupHoliday,
      };
    });
  }, [activeWeekObj, showWeekend, holidays, timetable.weeklyActivities, t]);

  // 3. Khung giờ hoạt động chuẩn (Đồng bộ 100% với 7 khung giờ của giáo viên)
  const ROUTINE_SLOTS = [
    {
      key: 'ARRIVAL_PLAY',
      name: 'Đón Trẻ, Chơi',
      lines: ['Đón Trẻ, Chơi'],
      shortName: 'Đón trẻ',
      defaultTime: '07:15 – 08:00',
    },
    {
      key: 'MORNING_EXERCISE',
      name: 'Thể Dục Sáng',
      lines: ['Thể Dục Sáng'],
      shortName: 'Thể dục sáng',
      defaultTime: '08:00 – 08:30',
    },
    {
      key: 'DIRECTED_STUDY',
      name: 'Học',
      lines: ['Học'],
      shortName: 'Học',
      defaultTime: '08:30 – 09:15',
    },
    {
      key: 'CORNER_PLAY',
      name: 'Chơi, Hoạt Động Ở Các Góc',
      lines: ['Chơi, Hoạt', 'Động Ở Các', 'Góc'],
      shortName: 'Hoạt động góc',
      defaultTime: '09:15 – 10:15',
    },
    {
      key: 'OUTDOOR_PLAY',
      name: 'Chơi Ngoài Trời',
      lines: ['Chơi Ngoài', 'Trời'],
      shortName: 'Ngoài trời',
      defaultTime: '10:15 – 11:00',
    },
    {
      key: 'AFTERNOON_ACTIVITY',
      name: 'Chơi, Hoạt Động Theo Ý Thích',
      lines: ['Chơi, Hoạt', 'Động Theo Ý', 'Thích'],
      shortName: 'Hoạt động chiều',
      defaultTime: '14:00 – 14:45',
    },
    {
      key: 'RETURN_CHILD',
      name: 'Trả Trẻ',
      lines: ['Trả Trẻ'],
      shortName: 'Trả trẻ',
      defaultTime: '15:30 – 16:30',
    },
  ];

  // 4. Lấy dữ liệu hoạt động: Ưu tiên dữ liệu thật từ planningApi -> timetable.weeklyActivities -> fallback chuẩn Mầm 1
  const getActivityData = useCallback(
    (slotKey, dayKey) => {
      const dowMap = {
        T2: 'MONDAY',
        T3: 'TUESDAY',
        T4: 'WEDNESDAY',
        T5: 'THURSDAY',
        T6: 'FRIDAY',
        T7: 'SATURDAY',
        CN: 'SUNDAY',
      };
      const dow = dowMap[dayKey];

      const dayObj = currentDays.find((d) => d.key === dayKey);

      // 1. Kiểm tra slot trong kế hoạch tuần thật (planningApi)
      const realSlot = (weeklyPlanSlots || []).find((s) => {
        const slotMatches = s.routineSlot === slotKey || s.routine_slot === slotKey || s.slotKey === slotKey;
        if (!slotMatches) return false;

        const dayMatches = s.day === dayKey || s.dayKey === dayKey || s.dayOfWeek === dow;
        if (!dayMatches) return false;

        if (dayObj?.date && s.date && s.date !== dayObj.date) return false;
        if (dayObj?.fullIsoDate && s.isoDate && s.isoDate !== dayObj.fullIsoDate) return false;

        return true;
      });

      if (realSlot && realSlot.title) {
        return {
          ...realSlot,
          title: realSlot.title || realSlot.shortTitle,
          routineSlot: slotKey,
        };
      }

      // 2. Kiểm tra weeklyActivities trả về từ parentApi.getSchedule
      const backendAct = (timetable.weeklyActivities || []).find((a) => {
        const slotMatches = a.routineSlot === slotKey || a.routine_slot === slotKey;
        if (!slotMatches) return false;

        if (dayObj?.fullIsoDate && a.isoDate) {
          return a.isoDate === dayObj.fullIsoDate;
        }
        if (dayObj?.date && a.date) {
          return a.date === dayObj.date;
        }

        const dayMatches = a.dayOfWeek === dow || a.dayOfWeek === dayKey;
        return dayMatches;
      });

      if (backendAct && backendAct.title) {
        return {
          ...backendAct,
          routineSlot: slotKey,
        };
      }

      // Nếu chưa có hoạt động được xếp trong CSDL cho khung giờ này
      return {
        title: 'Chưa xếp hoạt động',
        isEmpty: true,
        routineSlot: slotKey,
      };
    },
    [weeklyPlanSlots, timetable.weeklyActivities, currentDays]
  );

  // 5. Nhật ký điểm danh & đưa đón theo từng ngày và tuần cụ thể
  const getDayAttendance = useCallback(
    (dayKey) => {
      const dayObj = currentDays.find((d) => d.key === dayKey);

      if ((dayKey === 'T7' || dayKey === 'CN') && !dayObj?.isMakeupDay) {
        return {
          isWeekend: true,
          statusText: 'Nghỉ cuối tuần',
          note: 'Bé nghỉ cuối tuần, sinh hoạt và vui chơi cùng gia đình.',
        };
      }

      // Tích hợp dữ liệu điểm danh thực tế từ backend
      if (!dayObj || (dayObj.isWeekend && !dayObj.isMakeupDay)) {
        return null;
      }

      if (dayObj.isHoliday) {
        return {
          isHoliday: true,
          status: 'HOLIDAY',
          statusText: dayObj.holiday?.name || 'Nghỉ lễ / Ngày nghỉ',
          statusLabel: 'Ngày nghỉ',
          holidayName: dayObj.holiday?.name || 'Ngày nghỉ',
          note: `Bé nghỉ theo lịch của nhà trường: ${dayObj.holiday?.name || 'Ngày nghỉ'}.`,
          date: dayObj.date,
          dayName: dayObj.name,
        };
      }

      const teacherName = data?.primaryTeacher?.fullName || 'Cô Nguyễn Thị Mai (Giáo viên phụ trách)';
      const targetIso = dayObj.fullIsoDate;
      const targetDisplay = dayObj.date;

      const realAtt = attendancesList.find((a) => {
        if (a.isoDate && targetIso && a.isoDate === targetIso) return true;
        if (a.rawDate) {
          const aIso = new Date(a.rawDate).toISOString().slice(0, 10);
          if (aIso === targetIso) return true;
        }
        if (a.date && targetDisplay && a.date.startsWith(targetDisplay)) return true;
        return false;
      });

      if (realAtt) {
        if (realAtt.status === 'NOT_YET') {
          return {
            status: 'NOT_YET',
            statusLabel: 'Chưa điểm danh',
            checkIn: null,
            checkOut: null,
            isNotYet: true,
            date: dayObj.date,
            dayName: dayObj.name,
          };
        }

        if (realAtt.status === 'EXCUSED_ABSENCE' || realAtt.rawStatus === 'EXCUSED_ABSENCE') {
          return {
            status: 'EXCUSED_ABSENCE',
            statusLabel: 'Nghỉ có phép',
            checkIn: {
              time: '—',
              status: 'EXCUSED_ABSENCE',
              statusLabel: 'Nghỉ có phép',
              teacher: teacherName,
              note: realAtt.notes || 'Học sinh nghỉ học có phép theo đơn của gia đình.',
            },
            checkOut: null,
            date: dayObj.date,
            dayName: dayObj.name,
          };
        }

        if (realAtt.status === 'UNEXCUSED_ABSENCE' || realAtt.rawStatus === 'UNEXCUSED_ABSENCE') {
          return {
            status: 'UNEXCUSED_ABSENCE',
            statusLabel: 'Nghỉ không phép',
            checkIn: {
              time: '—',
              status: 'UNEXCUSED_ABSENCE',
              statusLabel: 'Nghỉ không phép',
              teacher: teacherName,
              note: realAtt.notes || 'Học sinh vắng mặt chưa có đơn xin nghỉ phép.',
            },
            checkOut: null,
            date: dayObj.date,
            dayName: dayObj.name,
          };
        }

        const isPrimary = ['bố', 'mẹ', 'ba', 'cha', 'mẹ đẻ', 'bố đẻ'].includes(
          (realAtt.pickupRelationship || '').trim().toLowerCase()
        );

        const hasCheckOut = Boolean(realAtt.checkOutTime || realAtt.pickupPersonName || realAtt.status === 'PICKED_UP');

        return {
          status: hasCheckOut ? 'PICKED_UP' : 'AT_SCHOOL',
          statusLabel: hasCheckOut ? 'Đã đón' : 'Đã điểm danh',
          checkIn: {
            time: realAtt.checkInTime || '07:30',
            status: 'PRESENT',
            statusLabel: 'Có mặt',
            teacher: teacherName,
            note: realAtt.notes || (hasCheckOut ? 'Bé tham gia lớp học đầy đủ.' : 'Bé đã vào lớp, tham gia sinh hoạt cùng các bạn.'),
          },
          checkOut: hasCheckOut ? {
            time: realAtt.checkOutTime || '16:45',
            person: realAtt.pickupPersonName || 'Phụ huynh',
            phone: realAtt.pickupPersonPhone || '',
            citizenId: realAtt.pickupCitizenId || '',
            relation: realAtt.pickupRelationship || 'Người thân',
            guardianType: isPrimary ? 'PRIMARY' : 'AUTHORIZED',
            photoUrl: realAtt.pickupPhotoUrl || null,
            teacher: teacherName,
            note: realAtt.pickupNote || 'Bàn giao bé an toàn cho gia đình.',
          } : null,
          date: dayObj.date,
          dayName: dayObj.name,
        };
      }

      // Không có bản ghi điểm danh trong CSDL -> Chưa điểm danh
      return {
        status: 'NOT_YET',
        statusLabel: 'Chưa điểm danh',
        checkIn: null,
        checkOut: null,
        isNotYet: true,
        date: dayObj.date,
        dayName: dayObj.name,
      };
    },
    [currentDays, attendancesList, data?.primaryTeacher?.fullName]
  );

  // Helper tính toán Style cho ô tiêu đề Thứ (Nền phẳng clean, kèm nhãn trạng thái đã đón, đang ở lớp)
  const getDayAttendanceStyle = useCallback((dayAttendance, day) => {
    if (day.isMakeupDay) {
      const origDateStr = day.makeupHoliday?.startDate;
      let makeupTooltip = `Ngày học bù · ${day.name}`;
      if (origDateStr) {
        const [oy, om, od] = origDateStr.split('-');
        makeupTooltip = `Ngày học bù cho ngày ${od}/${om} (${day.makeupHoliday?.name || 'Nghỉ học'}) · ${day.name}`;
      }
      return {
        type: 'MAKEUP',
        thClass: 'bg-emerald-500/[0.04] text-foreground border-b border-border transition-colors',
        titleClass: cn('text-foreground font-semibold', day.isToday && 'text-[#1447e6] dark:text-blue-400 font-bold'),
        dateClass: cn('text-muted-foreground', day.isToday && 'text-[#1447e6]/80 dark:text-blue-400 font-medium'),
        badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200/90 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60 font-semibold',
        label: 'Ngày học bù',
        tooltip: makeupTooltip,
      };
    }

    if (day.isWeekend) {
      return {
        type: 'WEEKEND',
        thClass: 'bg-muted/15 text-muted-foreground border-b border-border',
        titleClass: 'text-muted-foreground font-medium',
        dateClass: 'text-muted-foreground/80',
        badgeClass: '',
        label: null,
        tooltip: `Cuối tuần · ${day.name}`,
      };
    }

    if (day.isHoliday) {
      let holidayLabel = 'Ngày nghỉ';
      let tooltip = `${day.holiday?.name || 'Ngày nghỉ'} · ${day.name}`;
      if (day.holiday?.makeupDate) {
        const [my, mm, md] = day.holiday.makeupDate.split('-');
        holidayLabel = `Nghỉ (Bù ${md}/${mm})`;
        tooltip = `${day.holiday?.name || 'Ngày nghỉ'} · ${day.name} (Bố trí dạy bù sang Thứ 7, ngày ${md}/${mm})`;
      }
      return {
        type: 'HOLIDAY',
        thClass: 'bg-muted/15 text-muted-foreground border-b border-border',
        titleClass: 'text-muted-foreground font-medium',
        dateClass: 'text-muted-foreground/80',
        badgeClass: 'bg-rose-50 text-rose-700 border border-rose-200/90 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60 font-medium',
        label: holidayLabel,
        tooltip,
      };
    }

    if (!dayAttendance || !dayAttendance.checkIn || dayAttendance.status === 'NOT_YET' || dayAttendance.isNotYet) {
      return {
        type: day.isToday ? 'TODAY' : 'NOT_YET',
        thClass: 'bg-card hover:bg-muted/30 border-b border-border transition-colors',
        titleClass: cn(
          'text-foreground font-semibold',
          day.isToday && 'text-[#1447e6] dark:text-blue-400 font-bold'
        ),
        dateClass: cn(
          'text-muted-foreground',
          day.isToday && 'text-[#1447e6]/80 dark:text-blue-400 font-medium'
        ),
        badgeClass: day.isToday
          ? 'bg-blue-50 text-[#1447e6] border border-blue-200/90 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60 font-semibold'
          : 'bg-muted/75 text-muted-foreground border border-border/70 font-normal',
        label: day.isToday ? 'Hôm nay' : 'Chưa điểm danh',
        tooltip: day.isToday
          ? `Hôm nay · Chưa điểm danh (${day.name})`
          : `Chưa có thông tin điểm danh ngày ${day.name}`,
      };
    }

    const checkIn = dayAttendance.checkIn;
    const checkOut = dayAttendance.checkOut;

    // 1. Vắng không phép
    if (checkIn.status === 'UNEXCUSED_ABSENCE' || dayAttendance.status === 'UNEXCUSED_ABSENCE') {
      return {
        type: 'UNEXCUSED_ABSENCE',
        thClass: 'bg-card hover:bg-muted/30 border-b border-border transition-colors',
        titleClass: cn('text-foreground font-semibold', day.isToday && 'text-[#1447e6] dark:text-blue-400 font-bold'),
        dateClass: cn('text-muted-foreground', day.isToday && 'text-[#1447e6]/80 dark:text-blue-400 font-medium'),
        badgeClass: 'bg-rose-50 text-rose-700 border border-rose-200/90 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60 font-medium',
        label: 'Vắng K.phép',
        tooltip: `Vắng không phép ngày ${day.name} · Chưa có đơn xin phép`,
      };
    }

    // 2. Vắng có phép
    if (checkIn.status === 'EXCUSED_ABSENCE' || dayAttendance.status === 'EXCUSED_ABSENCE') {
      return {
        type: 'EXCUSED_ABSENCE',
        thClass: 'bg-card hover:bg-muted/30 border-b border-border transition-colors',
        titleClass: cn('text-foreground font-semibold', day.isToday && 'text-[#1447e6] dark:text-blue-400 font-bold'),
        dateClass: cn('text-muted-foreground', day.isToday && 'text-[#1447e6]/80 dark:text-blue-400 font-medium'),
        badgeClass: 'bg-amber-50 text-amber-700 border border-amber-200/90 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60 font-medium',
        label: 'Vắng có phép',
        tooltip: `Vắng có phép ngày ${day.name} · Có đơn xin phép được duyệt`,
      };
    }

    // 3. Đã điểm danh (Check-in có mặt, chưa đón)
    if (dayAttendance.status === 'AT_SCHOOL' || (checkIn.status === 'PRESENT' && !checkOut?.time)) {
      return {
        type: 'IN_CLASS',
        thClass: 'bg-card hover:bg-muted/30 border-b border-border transition-colors',
        titleClass: cn('text-foreground font-semibold', day.isToday && 'text-[#1447e6] dark:text-blue-400 font-bold'),
        dateClass: cn('text-muted-foreground', day.isToday && 'text-[#1447e6]/80 dark:text-blue-400 font-medium'),
        badgeClass: 'bg-amber-50 text-amber-700 border border-amber-200/90 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60 font-medium',
        label: 'Đã điểm danh',
        tooltip: `Điểm danh lúc ${checkIn.time || '07:30'} · Đã điểm danh`,
      };
    }

    // 4. Đã đón về (Check-in có mặt, checkOut an toàn)
    if (dayAttendance.status === 'PICKED_UP' || (checkIn.status === 'PRESENT' && checkOut?.time)) {
      return {
        type: 'PICKED_UP',
        thClass: 'bg-card hover:bg-muted/30 border-b border-border transition-colors',
        titleClass: cn('text-foreground font-semibold', day.isToday && 'text-[#1447e6] dark:text-blue-400 font-bold'),
        dateClass: cn('text-muted-foreground', day.isToday && 'text-[#1447e6]/80 dark:text-blue-400 font-medium'),
        badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200/90 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60 font-medium',
        label: 'Đã đón',
        tooltip: `Đến: ${checkIn.time || '07:30'} · Đã đón lúc ${checkOut.time} (${checkOut.relation || 'Phụ huynh'})`,
      };
    }

    return {
      type: day.isToday ? 'TODAY' : 'NORMAL',
      thClass: 'bg-card hover:bg-muted/30 border-b border-border transition-colors',
      titleClass: cn('text-foreground font-semibold', day.isToday && 'text-[#1447e6] dark:text-blue-400 font-bold'),
      dateClass: cn('text-muted-foreground', day.isToday && 'text-[#1447e6]/80 dark:text-blue-400 font-medium'),
      badgeClass: day.isToday
        ? 'bg-blue-50 text-[#1447e6] border border-blue-200/90 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60 font-semibold'
        : 'bg-muted/75 text-muted-foreground border border-border/70 font-normal',
      label: day.isToday ? 'Hôm nay' : 'Chưa điểm danh',
      tooltip: day.isToday
        ? `Hôm nay · Chưa điểm danh (${day.name})`
        : `Chưa có thông tin điểm danh ngày ${day.name}`,
    };
  }, []);

  const dailyAttendanceLog = useMemo(() => {
    return {
      T2: getDayAttendance('T2'),
      T3: getDayAttendance('T3'),
      T4: getDayAttendance('T4'),
      T5: getDayAttendance('T5'),
      T6: getDayAttendance('T6'),
    };
  }, [getDayAttendance]);

  const getDomainBadge = (domain) => {
    switch (domain) {
      case 'PHYSICAL':
        return { label: 'Phát triển Thể chất', color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800' };
      case 'COGNITIVE':
        return { label: 'Phát triển Nhận thức', color: 'bg-blue-50 text-[#1447e6] border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800' };
      case 'LANGUAGE':
        return { label: 'Phát triển Ngôn ngữ', color: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800' };
      case 'SOCIO_EMOTIONAL':
        return { label: 'Tình cảm & Kỹ năng xã hội', color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800' };
      case 'AESTHETIC':
        return { label: 'Phát triển Thẩm mỹ', color: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800' };
      default:
        return { label: 'Kỹ năng mầm non', color: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800' };
    }
  };

  // Lấy đánh giá học sinh cho từng slot hoạt động: 3 mức độ Đạt / Chưa đạt / Vượt trội
  const getSlotEvaluation = useCallback(
    (slotKey, dayKey) => {
      const dayObj = currentDays.find((d) => d.key === dayKey);
      if (!dayObj) return null;

      // 1. Kiểm tra đánh giá từ backend slotAssessments (theo ngày và slot)
      if (data?.slotAssessments?.length) {
        const match = data.slotAssessments.find((sa) => {
          const slotMatches = sa.routineSlot === slotKey || sa.routine_slot === slotKey;
          if (!slotMatches) return false;

          if (sa.isoDate && dayObj.fullIsoDate && sa.isoDate === dayObj.fullIsoDate) return true;
          if (sa.dateFormatted && dayObj.date && sa.dateFormatted === dayObj.date) return true;
          const saDate = sa.date || '';
          if (dayObj.date && (saDate.startsWith(dayObj.date) || saDate.includes(dayObj.date))) return true;
          return false;
        });

        if (match) {
          const st = match.status;
          return {
            status: st,
            label: st === 'OUTSTANDING' || st === 'EXCELLENT' ? 'Vượt trội' : st === 'NOT_ACHIEVED' ? 'Chưa đạt' : 'Đạt',
            notes: match.notes,
            teacher: match.evaluatorName || data?.primaryTeacher?.fullName || 'Cô Phạm Hoàng Anh',
          };
        }
      }

      if (dayKey === 'T7' || dayKey === 'CN') return null;

      // 2. Nếu ngày trong tương lai (sau ngày hôm nay)
      if (dayObj.fullIsoDate && todayIsoStr && dayObj.fullIsoDate > todayIsoStr) {
        return {
          status: 'PENDING',
          label: 'Chưa diễn ra',
          notes: 'Hoạt động giáo dục dự kiến theo kế hoạch tuần của lớp.',
          teacher: data?.primaryTeacher?.fullName || 'Cô giáo chủ nhiệm',
        };
      }

      // Không có bản ghi đánh giá riêng trong CSDL -> trả về null
      return null;
    },
    [currentDays, data?.slotAssessments, data?.primaryTeacher?.fullName, todayIsoStr]
  );

  // Xử lý bấm vào một ô slot trên thời khóa biểu
  const handleCellClick = (slotDef, day) => {
    const act = getActivityData(slotDef.key, day.key);
    // Nếu là cuối tuần (không phải ngày học bù) mà không có hoạt động nào được xếp thì không mở modal
    if (day.isWeekend && !day.isMakeupDay && act.isEmpty) return;

    const dayLog = getDayAttendance(day.key);
    const evaluation = getSlotEvaluation(slotDef.key, day.key);
    setModalTab('content');
    setSelectedSlotDetail({
      slotDef,
      day,
      act,
      dayLog,
      evaluation,
    });
  };

  return (
    <div
      className="w-full flex-1 flex flex-col bg-background text-foreground select-none gap-3.5 pb-8 font-sans"
      data-name="ParentSchedulePage"
    >
      {/* 1. Header Action Toolbar (Hiển thị Kế hoạch giáo dục tuần thực tế & cụm điều hướng tuần) */}
      <div className="flex items-center justify-between gap-3 pb-2 shrink-0 flex-wrap sm:flex-nowrap">
        <div className="flex items-center gap-2 flex-wrap text-[12.5px] py-0.5">
          <span className="font-semibold text-foreground">
            {weeklyThemeInfo?.theme?.name
              ? `Chủ đề: ${weeklyThemeInfo.theme.name}`
              : data?.timetable?.theme?.name
                ? `Chủ đề: ${data.timetable.theme.name}`
                : 'Kế hoạch giáo dục tuần'}
          </span>
          {(weeklyThemeInfo?.subTheme?.name || data?.timetable?.subTheme?.name) && (
            <>
              <span className="text-muted-foreground/40">•</span>
              <span className="text-muted-foreground font-normal">
                Chủ đề nhánh:{' '}
                <span className="text-foreground font-medium">
                  {weeklyThemeInfo?.subTheme?.name || data?.timetable?.subTheme?.name}
                </span>
              </span>
            </>
          )}
        </div>

        {/* Cụm điều chỉnh tuần: Tuần hiện tại + Khung tuần đồng bộ + Nút mở lịch + Nút Hiện T7, CN */}
        <div className="relative flex items-center gap-2.5 ml-auto shrink-0 flex-wrap sm:flex-nowrap">
          {/* Badge / Nút Tuần hiện tại */}
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
            title={activeWeekObj?.isCurrentWeek ? 'Tuần hiện tại' : 'Về tuần hiện tại'}
          >
            {activeWeekObj?.isCurrentWeek ? 'Tuần hiện tại' : 'Về tuần hiện tại'}
          </button>

          {/* Khung tuần cố định có mũi tên chuyển tuần */}
          <div className="flex items-center border border-border bg-background text-[12.5px] rounded-none shadow-2xs">
            <button
              type="button"
              onClick={handlePrevWeek}
              disabled={CALENDAR_WEEKS.findIndex((w) => w.id === selectedWeekId) <= 0}
              className="size-8 flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground border-r border-border transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
              title={`${t('parent.schedule.prevWeek', 'Tuần trước')} (←)`}
            >
              <HugeiconsIcon icon={ArrowLeft02Icon} size={14} />
            </button>

            <div className="w-[195px] h-8 flex items-center justify-center font-medium select-none text-[12.5px] text-foreground tabular-nums shrink-0">
              <span>{t('assessment.week', 'Tuần')} {activeWeekObj?.label}</span>
            </div>

            <button
              type="button"
              onClick={handleNextWeek}
              disabled={CALENDAR_WEEKS.findIndex((w) => w.id === selectedWeekId) >= CALENDAR_WEEKS.length - 1}
              className="size-8 flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground border-l border-border transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
              title={`${t('parent.schedule.nextWeek', 'Tuần sau')} (→)`}
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
            title={t('parent.schedule.selectWeekFromCalendar', 'Chọn tuần từ lịch')}
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
            title={showWeekend ? t('parent.schedule.hideWeekend', 'Ẩn Thứ 7 & Chủ nhật') : t('parent.schedule.showWeekend', 'Hiện Thứ 7 & Chủ nhật')}
          >
            <HugeiconsIcon icon={Calendar03Icon} size={14} />
            <span>{showWeekend ? t('parent.schedule.hideWeekend', 'Ẩn T7, CN') : t('parent.schedule.showWeekend', 'Hiện T7, CN')}</span>
          </button>
        </div>
      </div>

      {/* 2. Main Workspace: Full-width Timetable Grid (Tối giản, chuyên nghiệp) */}
      <div className="border border-border bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-[12.5px] table-fixed">
            {/* Day Columns Header */}
            <thead className="sticky top-0 z-10 bg-card">
              <tr className="border-b border-border text-center bg-card">
                {/* Góc trên bên trái: Ô dành cho cột khung giờ */}
                <th className="w-[115px] sm:w-[130px] p-2.5 border-r border-border bg-muted/15 select-none align-middle" />

                {/* Các cột Thứ trong tuần (T2 – T6, kèm T7, CN nếu có hoạt động/học bù): Gọn gàng, tối giản, chỉ giữ tên Thứ và Ngày */}
                {currentDays.map((day) => {
                  const dayAttendance = (!day.isWeekend || day.isMakeupDay) ? getDayAttendance(day.key) : null;
                  const style = getDayAttendanceStyle(dayAttendance, day);

                  return (
                    <th
                      key={day.key}
                      onClick={() => {
                        if (!day.isWeekend || day.isMakeupDay) {
                          setQuickStatusDayKey(day.key);
                          setSelectedDayAttendance({ day, dayLog: getDayAttendance(day.key) });
                        }
                      }}
                      className={cn(
                        'p-2 sm:p-2.5 align-top border-r last:border-r-0 border-border text-center select-none transition-all group',
                        style.thClass,
                        (!day.isWeekend || day.isMakeupDay) && 'cursor-pointer'
                      )}
                      title={style.tooltip}
                    >
                      <div className="flex flex-col items-center justify-start gap-0.5 py-0.5">
                        <span
                          className={cn(
                            'text-[13px] tracking-tight leading-tight transition-colors',
                            style.titleClass
                          )}
                        >
                          {day.shortName}
                        </span>

                        <div
                          className={cn(
                            'text-[11.5px] font-mono leading-tight',
                            style.dateClass
                          )}
                        >
                          {day.date}
                        </div>

                        {/* Khung cố định chiều cao cho nhãn trạng thái: Giữ cho mọi cột luôn thẳng hàng 100% */}
                        <div className="h-5 min-h-[20px] flex items-center justify-center mt-0.5">
                          {style.label ? (
                            <span
                              className={cn(
                                'text-[10px] px-1.5 py-0.5 border leading-none shrink-0 shadow-2xs select-none',
                                style.badgeClass
                              )}
                            >
                              {style.label}
                            </span>
                          ) : (
                            <span className="text-[10px] px-1.5 py-0.5 leading-none invisible select-none" aria-hidden="true">
                              —
                            </span>
                          )}
                        </div>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            {/* Routine Slot Rows */}
            <tbody className="divide-y divide-border">
              {ROUTINE_SLOTS.map((slotDef) => {
                return (
                  <tr key={slotDef.key} className="min-h-[88px]">
                    {/* Routine slot header cell (bên trái) */}
                    <td className="w-[115px] sm:w-[130px] p-2 border-r border-border font-semibold text-center align-middle bg-muted/10 text-[12.5px] leading-snug">
                      <div className="flex flex-col items-center justify-center gap-1">
                        <div className="flex flex-col items-center justify-center gap-0.5">
                          {slotDef.lines.map((line, idx) => (
                            <span
                              key={idx}
                              className="font-semibold text-foreground text-[12.5px] leading-tight whitespace-nowrap"
                            >
                              {line}
                            </span>
                          ))}
                        </div>
                        {slotDef.defaultTime && (
                          <span className="text-[11px] text-muted-foreground font-mono font-normal tracking-tight">
                            {slotDef.defaultTime}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Các ô hoạt động trong tuần: Cột hôm nay màu xanh blue nhạt, line màu bên trái giống giáo viên (Tím: Vượt trội, Xanh lá: Đạt, Đỏ: Chưa đạt) */}
                    {currentDays.map((day) => {
                      const act = getActivityData(slotDef.key, day.key);
                      const isWeekendDay = day.isWeekend && !day.isMakeupDay;
                      const isHolidayDay = day.isHoliday;
                      const evaluation = getSlotEvaluation(slotDef.key, day.key);

                      return (
                        <td
                          key={day.key}
                          onClick={() => (!isHolidayDay && !(isWeekendDay && act.isEmpty)) && handleCellClick(slotDef, day)}
                          className={cn(
                            'p-1.5 border-r last:border-r-0 border-border align-middle min-w-[145px] h-[88px] transition-colors select-none',
                            isHolidayDay
                              ? 'bg-muted/10 text-center cursor-default'
                              : isWeekendDay && act.isEmpty
                                ? 'bg-muted/10 text-center cursor-default'
                                : 'bg-card hover:bg-muted/30 cursor-pointer'
                          )}
                          title={isHolidayDay ? `${day.holiday?.name || 'Ngày nghỉ'}` : !(isWeekendDay && act.isEmpty) ? `${act.title || slotDef.name} · Nhấp để xem chi tiết` : undefined}
                        >
                          {/* Inner card cách viền ô bên ngoài một khoảng nhỏ giống hình mẫu */}
                          <div
                            className={cn(
                              'h-full w-full p-2 flex items-center justify-center text-center transition-all',
                              isHolidayDay
                                ? 'border border-dashed border-border/40 bg-muted/20 opacity-70'
                                : isWeekendDay && act.isEmpty
                                  ? 'flex items-center justify-center'
                                  : evaluation?.status === 'OUTSTANDING' || evaluation?.status === 'EXCELLENT'
                                    ? 'border border-border/75 border-l-2 border-l-purple-500 bg-purple-500/[0.06] dark:bg-purple-400/[0.10] hover:bg-purple-500/[0.10] hover:border-purple-300 dark:hover:border-purple-700'
                                    : evaluation?.status === 'ACHIEVED'
                                      ? 'border border-border/75 border-l-2 border-l-emerald-500 bg-emerald-500/[0.05] dark:bg-emerald-400/[0.08] hover:bg-emerald-500/[0.09] hover:border-emerald-300 dark:hover:border-emerald-700'
                                      : evaluation?.status === 'NOT_ACHIEVED'
                                        ? 'border border-border/75 border-l-2 border-l-rose-500 bg-rose-500/[0.06] dark:bg-rose-400/[0.10] hover:bg-rose-500/[0.10] hover:border-rose-300 dark:hover:border-rose-700'
                                        : act.status === 'COMPLETED'
                                          ? 'border border-border/75 border-l-2 border-l-emerald-600/70 bg-emerald-500/[0.03] hover:bg-emerald-500/[0.06]'
                                          : 'border border-border/75 bg-card hover:bg-muted/30'
                            )}
                          >
                            {isHolidayDay ? (
                              <span className="text-[11.5px] font-normal text-muted-foreground line-clamp-3 leading-snug px-1 select-none" title={day.holiday?.name || 'Ngày nghỉ'}>
                                {day.holiday?.name || 'Ngày nghỉ'}
                              </span>
                            ) : isWeekendDay && act.isEmpty ? (
                              <span className="text-muted-foreground/30 font-light text-[13px] select-none">—</span>
                            ) : act.isEmpty ? (
                              <span className="text-muted-foreground/40 font-normal text-[11.5px] italic select-none">
                                Chưa xếp hoạt động
                              </span>
                            ) : (
                              <span className="font-normal text-foreground text-[12.5px] line-clamp-3 leading-snug text-center px-1">
                                {act.title}
                              </span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Chú thích & Hướng dẫn gọn gàng, tinh tế */}
      <div className="border border-border/80 bg-card/60 px-4 py-2.5 rounded-none select-none text-[12px] flex items-center justify-between flex-wrap gap-2.5">
        <div className="flex items-center gap-2 text-muted-foreground text-[12px]">
          <Info className="size-3.5 text-muted-foreground shrink-0" />
          <span>Nhấp vào Thứ để xem điểm danh & đón bé. Nhấp vào từng ô để xem chi tiết bài học và đánh giá.</span>
        </div>
        <div className="flex items-center gap-4 text-[11.5px] flex-wrap">
          {/* Chú thích đánh giá học sinh */}
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Đánh giá tiết:</span>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3 bg-purple-500/15 border-l-2 border-l-purple-500 inline-block shrink-0" />
              <span className="text-foreground font-medium">Vượt trội</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3 bg-emerald-500/15 border-l-2 border-l-emerald-500 inline-block shrink-0" />
              <span className="text-foreground font-medium">Đạt</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3 bg-rose-500/15 border-l-2 border-l-rose-500 inline-block shrink-0" />
              <span className="text-foreground font-medium">Chưa đạt</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Slide-over Week Picker Overlay Drawer (Chọn tuần từ lịch đồng bộ với giáo viên) */}
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
            <div className="p-4 border-b border-border flex items-center justify-between">
              <span className="font-semibold text-[14px]">Chọn tuần từ lịch</span>
              <button
                type="button"
                onClick={() => setIsCalendarOpen(false)}
                className="size-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer transition-colors"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <WeekPickerCalendar
                selectedWeek={activeWeekObj}
                onSelectWeek={(wk) => {
                  setSelectedWeekId(wk.id);
                  setIsCalendarOpen(false);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* 5. POPUP CHI TIẾT HOẠT ĐỘNG / TIẾT HỌC GIÁO DỤC */}
      {selectedSlotDetail && (() => {
        const { slotDef, day, act, evaluation } = selectedSlotDetail;

        return (
          <div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
            onClick={() => setSelectedSlotDetail(null)}
          >
            <div
              className="border border-border bg-card max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150 overflow-hidden cursor-default"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header Modal - Để ngày, thứ giống popup thông tin điểm danh đón trả trẻ */}
              <div className="px-6 py-5 border-b border-border bg-card flex items-start justify-between gap-4 shrink-0">
                <div className="flex flex-col gap-1 min-w-0">
                  <h3 className="text-[17.5px] font-bold text-foreground leading-snug">
                    {act.title}
                  </h3>
                  <div className="flex items-center gap-2 text-[12.5px] text-muted-foreground font-normal flex-wrap">
                    <span className="font-medium text-foreground">{day.name}, {day.date}</span>
                    <span>•</span>
                    <span className="font-mono">{slotDef.defaultTime}</span>
                    <span>•</span>
                    <span>Lớp {data?.classInfo?.name || 'Mầm 1'} · {data?.classInfo?.schoolYear || 'Năm học 2026–2027'}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedSlotDetail(null)}
                  className="size-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer transition-colors shrink-0"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Body Modal Content - Chi tiết bài học & Đánh giá của giáo viên đối với học sinh */}
              <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-4 text-[13px] leading-relaxed">
                {/* Nội dung hoạt động giáo dục: Mục đích yêu cầu, Chuẩn bị, Tổ chức hoạt động */}
                {act.isEmpty ? (
                  <div className="p-6 bg-muted/15 border border-border flex flex-col items-center justify-center text-center gap-2">
                    <span className="font-semibold text-foreground text-[14px]">
                      Khung giờ chưa xếp hoạt động
                    </span>
                    <p className="text-muted-foreground text-[12.5px] max-w-sm">
                      Hiện tại khung giờ sinh hoạt này chưa có bài học hoặc hoạt động giáo dục cụ thể được xếp trong kế hoạch tuần của lớp.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    <div className="border border-border p-3.5 bg-card">
                      <div className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider mb-1">
                        Mục đích yêu cầu
                      </div>
                      <div className="text-foreground leading-relaxed">
                        {act.objective || 'Trẻ tham gia hoạt động hào hứng, thực hiện đúng yêu cầu và tương tác tốt cùng cô và các bạn.'}
                      </div>
                    </div>

                    <div className="border border-border p-3.5 bg-card">
                      <div className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider mb-1">
                        Chuẩn bị
                      </div>
                      <div className="text-foreground leading-relaxed">
                        {act.preparation || 'Đồ dùng dạy học, học cụ phù hợp theo lứa tuổi và không gian lớp học sạch thoáng.'}
                      </div>
                    </div>

                    <div className="border border-border p-3.5 bg-card">
                      <div className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider mb-1">
                        Tổ chức hoạt động
                      </div>
                      <div className="text-foreground leading-relaxed whitespace-pre-line">
                        {act.procedure || '1. Cô hướng dẫn và tạo không khí hứng thú đầu giờ cho các bé.\n2. Trẻ tích cực tham gia thực hiện hoạt động dưới sự hướng dẫn của cô.\n3. Nhận xét, tuyên dương trẻ cuối giờ.'}
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Đánh giá học sinh */}
                <div className="border border-border p-3.5 bg-card flex flex-col gap-3">
                  <div className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">
                    Đánh giá học sinh
                  </div>
                  {evaluation ? (
                    <>
                      <div className="flex items-center justify-between pb-2.5 border-b border-border/60">
                        <div>
                          <span className="text-muted-foreground text-[11px] block">Kết quả đánh giá:</span>
                          <span
                            className={cn(
                              'inline-flex items-center px-2.5 py-0.5 text-[12px] font-semibold mt-1 border',
                              evaluation.status === 'OUTSTANDING'
                                ? 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30'
                                : evaluation.status === 'NOT_ACHIEVED'
                                  ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30'
                                  : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                            )}
                          >
                            {evaluation.label}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-muted-foreground text-[11px] block">Giáo viên phụ trách:</span>
                          <span className="text-foreground font-medium text-[12.5px] mt-1 block">
                            {evaluation.teacher}
                          </span>
                        </div>
                      </div>
                      {evaluation.notes && (
                        <div className="flex flex-col gap-1">
                          <span className="text-muted-foreground text-[11px]">Nhận xét của giáo viên:</span>
                          <p className="text-foreground leading-relaxed bg-muted/20 p-2.5 border border-border text-[12.5px]">
                            {evaluation.notes}
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-muted-foreground text-[12px] italic p-3 bg-muted/15 border border-border text-center">
                      Chưa có đánh giá cho hoạt động này.
                    </div>
                  )}
                </div>
              </div>

              {/* Footer Modal - Nút Đóng đặt bên trái đúng theo thiết kế */}
              <div className="p-4 border-t border-border bg-muted/10 flex justify-start shrink-0">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedSlotDetail(null)}
                  className="rounded-none text-[12.5px] h-8 px-5 cursor-pointer hover:bg-muted"
                >
                  Đóng
                </Button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 6. MODAL THÔNG TIN ĐIỂM DANH & ĐÓN TRẢ TRẺ KHI BẤM VÀO THỨ */}
      {selectedDayAttendance && (() => {
        const { day, dayLog } = selectedDayAttendance;
        const isFuture = dayLog?.isFuture;
        const isWeekend = day?.isWeekend && !day?.isMakeupDay;
        const checkIn = dayLog?.checkIn;
        const checkOut = dayLog?.checkOut;

        return (
          <div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
            onClick={() => setSelectedDayAttendance(null)}
          >
            <div
              className="border border-border bg-card max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150 overflow-hidden cursor-default"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header Modal */}
              <div className="px-6 py-5 border-b border-border bg-card flex items-start justify-between gap-4 shrink-0">
                <div className="flex flex-col gap-1 min-w-0">
                  <h3 className="text-[17.5px] font-bold text-foreground leading-snug">
                    Thông tin điểm danh & đón trả trẻ
                  </h3>
                  <div className="flex items-center gap-2 text-[12.5px] text-muted-foreground font-normal">
                    <span className="font-medium text-foreground">{day.name}, {day.date}</span>
                    <span>•</span>
                    <span>Lớp {data?.classInfo?.name || 'Mầm 1'} · {data?.classInfo?.schoolYear || 'Năm học 2026–2027'}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDayAttendance(null)}
                  className="size-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer transition-colors shrink-0"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Body Modal */}
              <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-5 text-[13px] leading-relaxed">
                {isWeekend ? (
                  <div className="p-5 bg-muted/20 border border-border text-center text-muted-foreground text-[12.5px]">
                    Học sinh nghỉ sinh hoạt cuối tuần tại gia đình.
                  </div>
                ) : day?.isMakeupDay && (!checkIn && !checkOut) ? (
                  <div className="p-5 bg-emerald-500/[0.06] border border-emerald-200/80 text-emerald-800 text-[12.5px] text-center">
                    {dayLog?.note || 'Ngày học bù theo quy định và lịch năm học của nhà trường.'}
                  </div>
                ) : day?.isHoliday || dayLog?.isHoliday ? (
                  <div className="p-6 bg-muted/15 border border-border flex flex-col items-center justify-center text-center gap-3">
                    <div className="size-11 rounded-none bg-rose-50 border border-rose-200/80 flex items-center justify-center text-rose-600 dark:bg-rose-950/40 dark:border-rose-800">
                      <Calendar className="size-5" />
                    </div>
                    <div className="flex flex-col gap-1 max-w-md">
                      <span className="font-semibold text-foreground text-[15px]">
                        {day.holiday?.name || dayLog?.holidayName || 'Nghỉ lễ / Ngày nghỉ'}
                      </span>
                      <p className="text-muted-foreground text-[12.5px] leading-relaxed">
                        Học sinh được nghỉ học theo kế hoạch và quy định của nhà trường.
                        {day.holiday?.description ? ` (${day.holiday.description})` : ''}
                      </p>
                    </div>
                    <div className="mt-1 inline-flex items-center gap-1.5 px-2.5 py-1 text-[11.5px] font-medium bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800">
                      <span>Trạng thái:</span>
                      <span className="font-semibold">Ngày nghỉ toàn trường</span>
                    </div>
                  </div>
                ) : (dayLog?.isNotYet || !checkIn || dayLog?.status === 'NOT_YET') ? (
                  <div className="p-6 bg-muted/15 border border-border flex flex-col items-center justify-center text-center gap-3">
                    <div className="size-11 rounded-none bg-muted/40 border border-border/80 flex items-center justify-center text-muted-foreground">
                      <Clock className="size-5 text-muted-foreground" />
                    </div>
                    <div className="flex flex-col gap-1 max-w-md">
                      <span className="font-semibold text-foreground text-[14px]">
                        Chưa có thông tin điểm danh
                      </span>
                      <p className="text-muted-foreground text-[12.5px] leading-relaxed">
                        Ngày {day.name} ({day.date}) hiện chưa ghi nhận dữ liệu điểm danh đến lớp hoặc chưa phát sinh hoạt động đón trả trẻ. Giáo viên phụ trách sẽ cập nhật trạng thái khi bé đến lớp.
                      </p>
                    </div>
                    <div className="mt-1 inline-flex items-center gap-1.5 px-2.5 py-1 text-[11.5px] font-medium bg-muted text-muted-foreground border border-border/80">
                      <span>Trạng thái:</span>
                      <span className="font-semibold text-foreground">Chưa điểm danh</span>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* 1. Điểm danh đến lớp */}
                    <div className="flex flex-col gap-2.5">
                      <div className="pb-1.5 border-b border-border/60">
                        <span className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">
                          1. Thông tin điểm danh đến lớp
                        </span>
                      </div>

                      <div className="border border-border p-3.5 bg-muted/15 flex flex-col gap-2.5 text-[12.5px]">
                        <div className="grid grid-cols-2 gap-3 pb-2 border-b border-border/50">
                          <div>
                            <span className="text-muted-foreground block text-[11px]">Thời gian điểm danh:</span>
                            <span className="font-semibold text-foreground font-mono text-[13.5px]">
                              {checkIn?.time || '—'}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block text-[11px]">Trạng thái điểm danh:</span>
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400 text-[13px]">
                              {checkIn?.statusLabel || 'Có mặt'}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-2.5 pt-0.5">
                          <div>
                            <span className="text-muted-foreground text-[11px] block">Giáo viên tiếp nhận & điểm danh:</span>
                            <span className="font-medium text-foreground">
                              {checkIn?.teacher || data?.primaryTeacher?.fullName || 'Cô Nguyễn Thị Mai (Giáo viên phụ trách)'}
                            </span>
                          </div>
                          {checkIn?.note && (
                            <div className="pt-2 border-t border-border/40">
                              <span className="text-muted-foreground text-[11px] block">Ghi chú & tình trạng đầu giờ:</span>
                              <span className="text-foreground">
                                {checkIn.note}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 2. Thông tin đón trả trẻ */}
                    {(() => {
                      const isAbsent = checkIn?.status === 'EXCUSED_ABSENCE' || checkIn?.status === 'UNEXCUSED_ABSENCE';

                      if (isAbsent) {
                        return (
                          <div className="flex flex-col gap-2.5">
                            <div className="flex items-center justify-between pb-1.5 border-b border-border/60 flex-wrap gap-2">
                              <span className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">
                                2. Thông tin đón trả trẻ
                              </span>
                              <span
                                className={cn(
                                  'inline-flex items-center px-2 py-0.5 text-[11px] font-bold border',
                                  checkIn?.status === 'EXCUSED_ABSENCE'
                                    ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30'
                                    : 'bg-rose-500/15 text-rose-800 dark:text-rose-300 border-rose-500/30'
                                )}
                              >
                                {checkIn?.status === 'EXCUSED_ABSENCE' ? 'Nghỉ có phép' : 'Nghỉ không phép'}
                              </span>
                            </div>

                            <div className="border border-border p-4 bg-muted/15 flex flex-col gap-2 text-[12.5px]">
                              <p className="text-muted-foreground text-[12px] leading-relaxed">
                                {checkIn?.status === 'EXCUSED_ABSENCE'
                                  ? 'Bé nghỉ học có phép trong ngày, không phát sinh thông tin đưa đón tại trường.'
                                  : 'Học sinh vắng mặt không phép, giáo viên đã liên hệ phụ huynh và không phát sinh thông tin đưa đón tại trường.'}
                              </p>
                            </div>
                          </div>
                        );
                      }

                      if (!checkOut) {
                        return (
                          <div className="flex flex-col gap-2.5">
                            <div className="flex items-center justify-between pb-1.5 border-b border-border/60 flex-wrap gap-2">
                              <span className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">
                                2. Thông tin đón trả trẻ
                              </span>
                              <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-bold bg-blue-500/15 text-[#1447e6] dark:text-blue-300 border border-blue-500/30 animate-pulse">
                                Chưa đón · Đang ở lớp
                              </span>
                            </div>

                            <div className="border border-blue-500/30 p-4 bg-blue-50/40 dark:bg-blue-950/20 flex flex-col gap-2 text-[12.5px]">
                              <div className="flex items-center gap-2 text-blue-900 dark:text-blue-300 font-semibold">
                                <Clock className="size-4 text-[#1447e6] dark:text-blue-400" />
                                <span>Học sinh chưa có thông tin đón về · Đang sinh hoạt tại lớp</span>
                              </div>
                              <p className="text-muted-foreground text-[12px] leading-relaxed">
                                Khung giờ đón trẻ buổi chiều theo quy định: <strong>15:30 – 16:30</strong>. Giáo viên phụ trách sẽ ghi nhận thời gian đón, người đón và chụp ảnh xác nhận bàn giao ngay tại thời điểm phụ huynh đón bé.
                              </p>
                              <div className="pt-2 border-t border-blue-500/20 text-[11.5px] text-muted-foreground">
                                Người được phép đón: <strong className="text-foreground">Phụ huynh chính thức (Bố, Mẹ)</strong> hoặc người có giấy ủy quyền đã duyệt.
                              </div>
                            </div>
                          </div>
                        );
                      }

                      const isPrimaryGuardian =
                        checkOut?.guardianType === 'PRIMARY' ||
                        ['bố', 'mẹ', 'ba', 'cha', 'mẹ đẻ', 'bố đẻ'].includes(
                          (checkOut?.relation || '').trim().toLowerCase()
                        );

                      return (
                        <div className="flex flex-col gap-2.5">
                          <div className="flex items-center justify-between pb-1.5 border-b border-border/60 flex-wrap gap-2">
                            <span className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">
                              2. Thông tin đón trả trẻ
                            </span>
                            {isPrimaryGuardian ? (
                              <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20">
                                Phụ huynh chính thức
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                                Người được ủy quyền
                              </span>
                            )}
                          </div>

                          <div className="border border-border p-3.5 bg-muted/15 flex flex-col gap-2.5 text-[12.5px]">
                            <div className="grid grid-cols-2 gap-3 pb-2 border-b border-border/50">
                              <div>
                                <span className="text-muted-foreground block text-[11px]">Thời gian đón trẻ:</span>
                                <span className="font-semibold text-foreground font-mono text-[13.5px]">
                                  {checkOut?.time || '—'}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground block text-[11px]">Tư cách người đón:</span>
                                <span
                                  className={cn(
                                    'font-semibold text-[13px]',
                                    isPrimaryGuardian
                                      ? 'text-blue-700 dark:text-blue-400'
                                      : 'text-amber-700 dark:text-amber-400'
                                  )}
                                >
                                  {isPrimaryGuardian ? 'Phụ huynh chính thức' : 'Người được ủy quyền'}
                                </span>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2.5 pt-0.5">
                              <div>
                                <span className="text-muted-foreground text-[11px] block">Họ và tên người đón:</span>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-semibold text-foreground">
                                    {checkOut?.person || 'Phụ huynh'}
                                  </span>
                                  {checkOut?.relation && (
                                    <span className="text-muted-foreground text-[12px]">
                                      ({checkOut.relation})
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div>
                                <span className="text-muted-foreground text-[11px] block">Số điện thoại:</span>
                                <span className="font-mono text-foreground font-medium">
                                  {checkOut?.phone || 'Chưa cập nhật'}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground text-[11px] block">Số CCCD / CMND:</span>
                                <span className="font-mono text-foreground font-medium">
                                  {checkOut?.citizenId || 'Đã xác thực hồ sơ'}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground text-[11px] block">Xác thực đón trẻ:</span>
                                <span
                                  className={cn(
                                    'font-medium text-[11.5px]',
                                    isPrimaryGuardian
                                      ? 'text-blue-700 dark:text-blue-400'
                                      : 'text-emerald-700 dark:text-emerald-400'
                                  )}
                                >
                                  {isPrimaryGuardian
                                    ? 'Người giám hộ chính thức của học sinh'
                                    : 'Hợp lệ theo danh sách người ủy quyền đã duyệt'}
                                </span>
                              </div>
                              <div className="col-span-2">
                                <span className="text-muted-foreground text-[11px] block">Giáo viên bàn giao:</span>
                                <span className="font-medium text-foreground">
                                  {checkOut?.teacher || data?.primaryTeacher?.fullName || 'Cô Nguyễn Thị Mai (Giáo viên phụ trách)'}
                                </span>
                              </div>
                              {checkOut?.note && (
                                <div className="col-span-2 pt-1 border-t border-border/40">
                                  <span className="text-muted-foreground text-[11px] block">Ghi chú trả trẻ & dặn dò:</span>
                                  <span className="text-foreground">
                                    {checkOut.note}
                                  </span>
                                </div>
                              )}

                              {/* Hình ảnh đón trẻ nếu có */}
                              {checkOut?.photoUrl && (
                                <div className="col-span-2 pt-2 border-t border-border/40 flex flex-col gap-1.5">
                                  <span className="text-muted-foreground text-[11px] block font-medium">
                                    Hình ảnh ghi nhận lúc đón trẻ:
                                  </span>
                                  <div className="flex items-start gap-3 flex-wrap sm:flex-nowrap">
                                    <div className="border border-border bg-card p-1 shadow-2xs shrink-0">
                                      <img
                                        src={checkOut.photoUrl}
                                        alt={`Ảnh người đón ${checkOut?.person || ''}`}
                                        className="w-32 h-24 sm:w-36 sm:h-28 object-cover rounded-none cursor-pointer hover:opacity-90 transition-opacity"
                                        onClick={() => window.open(checkOut.photoUrl, '_blank')}
                                        title="Nhấp để xem ảnh kích thước lớn"
                                      />
                                    </div>
                                    <div className="flex flex-col gap-1 text-[11.5px] text-muted-foreground pt-1">
                                      <span className="font-medium text-foreground">Ảnh xác nhận bàn giao học sinh</span>
                                      <span>Thời điểm: <strong className="text-foreground font-mono">{checkOut.time}</strong></span>
                                      <span className="text-[11px]">Người đón: {checkOut.person} ({checkOut.relation})</span>
                                      <span className="text-[10.5px] text-muted-foreground italic">Nhấp vào ảnh để xem ảnh đầy đủ</span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>

              {/* Footer Modal */}
              <div className="p-4 border-t border-border bg-muted/10 flex justify-start shrink-0">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedDayAttendance(null)}
                  className="rounded-none text-[12.5px] h-8 px-5 cursor-pointer hover:bg-muted"
                >
                  Đóng
                </Button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

export default ParentSchedulePage;
