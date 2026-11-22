import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

export const ROUTINE_SLOTS = [
  {
    key: 'ARRIVAL_PLAY',
    name: 'Đón Trẻ, Chơi',
    lines: ['Đón Trẻ, Chơi'],
    shortName: 'Đón trẻ',
    defaultTime: '07:15 – 08:00',
    fallbackTime: '07:30',
  },
  {
    key: 'MORNING_EXERCISE',
    name: 'Thể Dục Sáng',
    lines: ['Thể Dục Sáng'],
    shortName: 'Thể dục sáng',
    defaultTime: '08:00 – 08:30',
    fallbackTime: '08:00',
  },
  {
    key: 'DIRECTED_STUDY',
    name: 'Học',
    lines: ['Học'],
    shortName: 'Học',
    defaultTime: '08:30 – 09:15',
    fallbackTime: '08:30',
  },
  {
    key: 'CORNER_PLAY',
    name: 'Chơi, Hoạt Động Ở Các Góc',
    lines: ['Chơi, Hoạt', 'Động Ở Các', 'Góc'],
    shortName: 'Hoạt động góc',
    defaultTime: '09:15 – 10:15',
    fallbackTime: '10:30',
  },
  {
    key: 'OUTDOOR_PLAY',
    name: 'Chơi Ngoài Trời',
    lines: ['Chơi Ngoài', 'Trời'],
    shortName: 'Ngoài trời',
    defaultTime: '10:15 – 11:00',
    fallbackTime: '09:30',
  },
  {
    key: 'AFTERNOON_ACTIVITY',
    name: 'Chơi, Hoạt Động Theo Ý Thích',
    lines: ['Chơi, Hoạt', 'Động Theo Ý', 'Thích'],
    shortName: 'Hoạt động chiều',
    defaultTime: '14:00 – 14:45',
    fallbackTime: '14:00',
  },
  {
    key: 'RETURN_CHILD',
    name: 'Trả Trẻ',
    lines: ['Trả Trẻ'],
    shortName: 'Trả trẻ',
    defaultTime: '15:30 – 16:30',
    fallbackTime: '15:00',
  },
];

export const TIME_ROWS = ROUTINE_SLOTS.map((s) => s.fallbackTime);

export const DEFAULT_DAYS = [
  { key: 'T2', shortName: 'T2', name: 'Thứ Hai', date: '28/09' },
  { key: 'T3', shortName: 'T3', name: 'Thứ Ba', date: '29/09' },
  { key: 'T4', shortName: 'T4', name: 'Thứ Tư', date: '30/09' },
  { key: 'T5', shortName: 'T5', name: 'Thứ Năm', date: '01/10' },
  { key: 'T6', shortName: 'T6', name: 'Thứ Sáu', date: '02/10' },
  { key: 'T7', shortName: 'T7', name: 'Thứ Bảy', date: '03/10' },
  { key: 'CN', shortName: 'CN', name: 'Chủ Nhật', date: '04/10' },
];

export const getScheduledStatusColor = (status) => {
  switch (status) {
    case 'COMPLETED':
      return 'bg-emerald-600';
    case 'SCHEDULED':
    default:
      return null;
  }
};

export const getScheduledStatusBorder = (status) => {
  switch (status) {
    case 'COMPLETED':
      return '!border-l-2 !border-l-emerald-600 !bg-emerald-500/[0.07] hover:!bg-emerald-500/[0.11] dark:!bg-emerald-950/30 border-emerald-600/30';
    case 'SCHEDULED':
    default:
      return '';
  }
};

export const getScheduledStatusClass = (status) => {
  return getScheduledStatusBorder(status);
};

export const getScheduledStatusLabel = (status, t = (k, def) => def) => {
  switch (status) {
    case 'COMPLETED':
      return t('planning.statusCompleted', 'Đã thực hiện');
    case 'SCHEDULED':
    default:
      return t('planning.statusPending', 'Chưa đánh giá');
  }
};

export function getSlotMakeupBadge(slot, day, slotDef = null, t = (k, def) => def) {
  // Case 1: Slot nằm trong ngày nghỉ bị khóa (ngày gốc có lịch dạy được dời đi)
  if (day?.isLocked) {
    const makeupDate = day?.holiday?.makeupDate || day?.makeupDate;
    if (makeupDate) {
      const parts = makeupDate.split('-');
      const d = parts[2];
      const m = parts[1];
      const y = parts[0];
      let makeupDayName = 'T7';
      if (y && m && d) {
        const dt = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
        const dows = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
        makeupDayName = dows[dt.getDay()] || 'T7';
      }
      const routineName = slotDef?.name ? t(`routineSlots.${slotDef.key}.name`, slotDef.name) : (slot?.routineSlotName || '');
      const dayLabel = makeupDayName === 'T7' ? t('days.T7.name', 'Thứ Bảy') : t(`days.${makeupDayName}.name`, makeupDayName);
      return {
        type: 'MOVED_OUT',
        label: t('planning.movedToDay', 'Dời sang {{day}} ({{date}})', { day: makeupDayName, date: `${d}/${m}` }),
        tooltip: routineName
          ? t('planning.movedToDayTooltip', 'Lịch dạy ô "{{routineName}}" được chuyển sang {{day}} ({{date}}) theo lịch dạy bù của Ban Giám Hiệu ({{holiday}})', {
              routineName,
              day: dayLabel,
              date: `${d}/${m}`,
              holiday: day.holiday?.name || t('planning.holidayConflict', 'Lịch nghỉ'),
            })
          : t('planning.movedToDayGeneralTooltip', 'Lịch dạy này được chuyển sang {{day}} ({{date}}) theo lịch dạy bù của Ban Giám Hiệu ({{holiday}})', {
              day: dayLabel,
              date: `${d}/${m}`,
              holiday: day.holiday?.name || t('planning.holidayConflict', 'Lịch nghỉ'),
            }),
        badgeClass: 'bg-blue-600 text-white',
        containerClass: '',
      };
    }
    return {
      type: 'HOLIDAY_CONFLICT',
      label: t('planning.holidayConflict', 'Trùng lịch nghỉ'),
      tooltip: t('planning.holidayConflictTooltip', 'Trùng lịch nghỉ "{{holiday}}" do Ban Giám Hiệu sắp xếp', {
        holiday: day.holiday?.name || day.lockReason || t('planning.schoolRegulation', 'Trường quy định'),
      }),
      badgeClass: 'bg-amber-600 text-white',
      containerClass: '',
    };
  }

  // Case 2: Slot nằm trong ngày dạy bù (ngày đích nhận hoạt động) hoặc slot có ghi chú dạy bù
  const notes = slot?.notes || '';
  const notesMatch = notes.match(/\[Dạy bù ngày (.*?)\]/);
  if (notesMatch || day?.isSaturdayMakeup) {
    let originDateText = '';
    if (notesMatch) {
      originDateText = notesMatch[1]; // ví dụ: "18/11"
    } else if (day?.makeupHoliday?.startDate) {
      const parts = day.makeupHoliday.startDate.split('-');
      originDateText = `${parts[2]}/${parts[1]}`;
    }

    let originDayName = '';
    if (originDateText) {
      const [dStr, mStr] = originDateText.split('/');
      const year = day?.fullDate ? parseInt(day.fullDate.slice(0, 4), 10) : new Date().getFullYear();
      if (dStr && mStr) {
        const dt = new Date(year, parseInt(mStr, 10) - 1, parseInt(dStr, 10));
        const dows = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
        originDayName = dows[dt.getDay()] || '';
      }
    } else if (day?.makeupHoliday?.startDate) {
      const dt = new Date(day.makeupHoliday.startDate);
      const dows = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
      originDayName = dows[dt.getUTCDay()] || '';
    }

    const targetLabel = originDayName
      ? t('planning.makeupFor', 'Bù cho {{day}} ({{date}})', { day: originDayName, date: originDateText })
      : originDateText
        ? t('planning.makeupForDate', 'Bù cho {{date}}', { date: originDateText })
        : t('planning.makeup', 'Dạy bù');

    const originDayFull = originDayName ? t(`days.${originDayName}.name`, originDayName) : '';

    const routineName = slotDef?.name ? t(`routineSlots.${slotDef.key}.name`, slotDef.name) : (slot?.routineSlotName || '');

    return {
      type: 'MOVED_IN',
      label: targetLabel,
      tooltip: routineName
        ? t('planning.makeupSlotTooltip', 'Ô "{{routineName}}" dạy bù cho {{day}}{{date}} theo lịch sắp xếp của Ban Giám Hiệu', {
            routineName,
            day: originDayFull ? `${originDayFull}, ` : '',
            date: originDateText,
          })
        : t('planning.makeupGeneralTooltip', 'Hoạt động dạy bù cho {{day}}{{date}} theo lịch sắp xếp của Ban Giám Hiệu', {
            day: originDayFull ? `${originDayFull}, ` : '',
            date: originDateText,
          }),
      badgeClass: 'bg-emerald-600 text-white',
      containerClass: '',
    };
  }

  return null;
}

export function TeacherTimetableGrid({
  title,
  dateRange = '28/09/2026 – 04/10/2026',
  themeName = null,
  subThemeName = null,
  days = DEFAULT_DAYS,
  slots = [],
  activeSlotId = null,
  activeDayKey = null,
  mode = 'attendance', // 'attendance' | 'health' | 'assessment' | 'daily' | 'planning'
  readOnly = false,
  onSelectSlot,
  onSelectDay,
  onSelectEmptyCell,
  onMoveSlot,
  onCellDragOver,
  onCellDragLeave,
  onCellDrop,
  dragOverCell = null,
  headerActions,
  hideHeader = false,
  className,
  clipboardSlot = null,
  currentWeekId = null,
  selectedTargetCells = [],
  onToggleSelectCell,
  onCopySlot,
  onQuickCopySlot,
  onCancelClipboard,
  showWeekend = undefined,
  onToggleWeekend,
  isDrawerOpen = false,
}) {
  const { t } = useTranslation();
  const displayTitle = title || t('planning.tabTimetable', 'Kế hoạch tuần');

  // Internal drag-and-drop state
  const [draggedItem, setDraggedItem] = useState(null);
  const [internalDragOverCell, setInternalDragOverCell] = useState(null);
  const [isAltKeyHeld, setIsAltKeyHeld] = useState(false);

  // Lắng nghe phím Alt hoặc Ctrl khi đang kéo thả để cập nhật ngay trạng thái Nhân bản
  useEffect(() => {
    if (!draggedItem) {
      setIsAltKeyHeld(false);
      return;
    }
    const handleKeyChange = (e) => {
      setIsAltKeyHeld(Boolean(e.altKey || e.ctrlKey));
    };
    window.addEventListener('keydown', handleKeyChange);
    window.addEventListener('keyup', handleKeyChange);
    return () => {
      window.removeEventListener('keydown', handleKeyChange);
      window.removeEventListener('keyup', handleKeyChange);
    };
  }, [draggedItem]);

  const handleSlotDragStart = (e, slot, day, slotDef) => {
    if (readOnly || mode !== 'planning') return;
    setDraggedItem({ slot, day, slotDef });
    e.dataTransfer.effectAllowed = 'copyMove';
    try {
      e.dataTransfer.setData('text/plain', String(slot.id));
    } catch {
      // ignore
    }
  };

  const handleSlotDragEnd = () => {
    setDraggedItem(null);
    setInternalDragOverCell(null);
    setIsAltKeyHeld(false);
  };

  const hasSaturdaySlots = slots.some((s) => s.day === 'T7');
  const hasSundaySlots = slots.some((s) => s.day === 'CN');
  const hasWeekendSlots = hasSaturdaySlots || hasSundaySlots;

  const [internalShowWeekend, setInternalShowWeekend] = useState(false);

  useEffect(() => {
    if (hasWeekendSlots) {
      setInternalShowWeekend(true);
    }
  }, [hasWeekendSlots]);

  const isWeekendVisible =
    showWeekend !== undefined ? showWeekend : internalShowWeekend || hasWeekendSlots;

  const isSingleDayFocus = Boolean(isDrawerOpen && activeDayKey);

  // Khi mở Drawer: Focus hiển thị duy nhất cột ngày đang được chọn cạnh cột Tiết học (Single-Day Focus View)
  const visibleDays = useMemo(() => {
    const allDays = (days || DEFAULT_DAYS).filter((day) => {
      if (day.key === 'T7' || day.key === 'CN') return isWeekendVisible;
      return true;
    });

    if (isSingleDayFocus) {
      const matched = allDays.filter((d) => d.key === activeDayKey);
      if (matched.length > 0) return matched;
    }

    return allDays;
  }, [days, isWeekendVisible, isSingleDayFocus, activeDayKey]);

  const getCellSlots = (dayInput, routineSlotKey, fallbackTime) => {
    const dayKey = typeof dayInput === 'object' && dayInput !== null ? dayInput.key : dayInput;
    const dayDate = typeof dayInput === 'object' && dayInput !== null ? dayInput.date : null;
    return slots
      .filter((s) => {
        if (s.day !== dayKey) return false;
        if (dayDate && s.date && s.date !== dayDate) return false;
        if (
          s.routineSlot === routineSlotKey ||
          s.routine_slot === routineSlotKey ||
          s.slotKey === routineSlotKey
        ) {
          return true;
        }
        if (fallbackTime && s.startTime === fallbackTime) {
          return true;
        }
        return false;
      })
      .sort((a, b) => {
        const orderA = a.orderIndex !== undefined ? Number(a.orderIndex) : (a.order_index !== undefined ? Number(a.order_index) : 1);
        const orderB = b.orderIndex !== undefined ? Number(b.orderIndex) : (b.order_index !== undefined ? Number(b.order_index) : 1);
        return orderA - orderB;
      });
  };

  const getSlot = (dayKey, routineSlotKey, fallbackTime) => {
    return getCellSlots(dayKey, routineSlotKey, fallbackTime)[0] || null;
  };

  return (
    <div
      className={cn(
        'flex-1 flex flex-col border border-border bg-card rounded-none overflow-hidden select-none transition-all duration-200',
        isSingleDayFocus && 'lg:max-w-[min(calc(100%-755px),540px)]',
        className
      )}
      data-name="TeacherTimetableGrid"
    >
      {/* 1. Header Bar */}
      {!hideHeader && (
        <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-border bg-card gap-3 flex-wrap min-h-11">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-[13.5px] font-semibold text-foreground tracking-tight">
              {displayTitle}
            </span>
            {dateRange && (
              <span className="text-[12px] text-muted-foreground font-normal">
                ({dateRange})
              </span>
            )}
            <span className="text-muted-foreground/35 select-none">•</span>
            <span className="text-[12.5px] text-muted-foreground font-normal">
              {t('daily.theme', 'Chủ đề')}:{' '}
              <span className={cn(themeName ? 'font-semibold text-foreground' : 'font-normal italic text-muted-foreground/80')}>
                {themeName || t('daily.noTheme', 'Chưa có chủ đề')}
              </span>
            </span>
            {subThemeName && (
              <>
                <span className="text-muted-foreground/35 select-none">•</span>
                <span className="text-[12.5px] text-muted-foreground font-normal">
                  {t('daily.subTheme', 'Chủ đề nhánh')}:{' '}
                  <span className="font-semibold text-primary">
                    {subThemeName}
                  </span>
                </span>
              </>
            )}
          </div>

          {headerActions && (
            <div className="flex items-center gap-2 shrink-0">{headerActions}</div>
          )}
        </div>
      )}

      {/* 2. Grid Table */}
      <div className="flex-1 overflow-x-auto overflow-y-auto">
        <table className={cn('w-full border-collapse text-[12.5px] table-fixed', !isSingleDayFocus && 'min-w-[820px]')}>
          {/* Day Columns Header */}
          <thead className="sticky top-0 z-10 bg-card">
            <tr className="border-b border-border text-center bg-card">
              <th className="w-[115px] sm:w-[130px] p-2 border-r border-border font-semibold text-center text-foreground uppercase tracking-tight bg-muted/15 text-[12px] select-none" />
              {visibleDays.map((day, dIdx) => {
                const isDaySelected = activeDayKey === day.key;
                const isClickable = Boolean(onSelectDay);
                const isDismissalDone = Boolean(day.isDismissalRecorded);
                const isAttendanceDone = Boolean(day.isAttendanceRecorded);
                const todayIdx = visibleDays.findIndex((d) => d.isToday);
                const isFuture = day.isFuture !== undefined
                  ? Boolean(day.isFuture)
                  : (todayIdx >= 0 && dIdx > todayIdx);
                const isTodayColumn = (mode === 'daily' || mode === 'attendance') && Boolean(day.isToday) && !day.isLocked;

                const borderTopClass = 'border-t-2 border-t-transparent';

                const dayNameColorClass = day.isLocked
                  ? 'text-muted-foreground/40 font-normal'
                  : (mode !== 'planning' && day.isToday)
                    ? 'text-[#1447e6] dark:text-blue-400 font-bold'
                    : 'text-foreground font-semibold';

                const dayDateColorClass = day.isLocked
                  ? 'text-muted-foreground/35 font-normal'
                  : (mode !== 'planning' && day.isToday)
                    ? 'text-[#1447e6]/80 dark:text-blue-400 font-medium'
                    : 'text-muted-foreground font-normal';

                let statusBadge = null;
                if (mode === 'daily') {
                  if (day.isLocked) {
                    const makeupDate = day?.holiday?.makeupDate || day?.makeupDate;
                    if (makeupDate) {
                      const parts = makeupDate.split('-');
                      const d = parts[2];
                      const m = parts[1];
                      const y = parts[0];
                      let makeupDayName = 'T7';
                      if (y && m && d) {
                        const dt = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
                        const dows = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
                        makeupDayName = dows[dt.getDay()] || 'T7';
                      }
                      statusBadge = {
                        label: `Dời sang ${makeupDayName} (${d}/${m})`,
                        className: 'bg-blue-50 text-[#1447e6] border border-blue-200/90 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60 font-semibold',
                      };
                    } else {
                      const lockText = (day.isHolidayLocked || day.holiday || day.lockLabel === 'Ngày nghỉ')
                        ? t('daily.badgeHoliday', 'Ngày nghỉ')
                        : (day.lockLabel && day.lockLabel.length <= 15 ? day.lockLabel : t('daily.badgeHoliday', 'Ngày nghỉ'));
                      statusBadge = {
                        label: lockText,
                        className: 'bg-muted/75 text-muted-foreground border border-border/70 font-normal',
                      };
                    }
                  } else if (isDismissalDone) {
                    statusBadge = {
                      label: t('daily.badgeDismissalDoneShort', 'Đã đón'),
                      className: 'bg-emerald-50 text-emerald-700 border border-emerald-200/90 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60 font-medium',
                    };
                  } else if (isAttendanceDone) {
                    statusBadge = {
                      label: t('daily.badgeAttendanceDone', 'Đã điểm danh'),
                      className: 'bg-amber-50 text-amber-700 border border-amber-200/90 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60 font-medium',
                    };
                  } else if (day.isToday) {
                    statusBadge = {
                      label: t('daily.badgeToday', 'Hôm nay'),
                      className: 'bg-blue-50 text-[#1447e6] border border-blue-200/90 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60 font-semibold',
                    };
                  } else if (day.isSaturdayMakeup) {
                    let originText = '';
                    if (day?.makeupHoliday?.startDate) {
                      const parts = day.makeupHoliday.startDate.split('-');
                      const dt = new Date(day.makeupHoliday.startDate);
                      const dows = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
                      const originDayName = dows[dt.getUTCDay()] || '';
                      originText = originDayName ? `${originDayName} (${parts[2]}/${parts[1]})` : `${parts[2]}/${parts[1]}`;
                    }
                    const label = originText ? `Bù cho ${originText}` : t('daily.badgeMakeup', 'Dạy bù');
                    statusBadge = {
                      label,
                      className: 'bg-emerald-50 text-emerald-700 border border-emerald-200/90 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60 font-semibold',
                    };
                  } else {
                    statusBadge = {
                      label: t('daily.badgeNotAttended', 'Chưa điểm danh'),
                      className: 'bg-muted/75 text-muted-foreground border border-border/70 font-normal',
                    };
                  }
                }

                return (
                  <th
                    key={day.key}
                    data-day-key={day.key}
                    onClick={() => isClickable && !day.isLocked && onSelectDay(day)}
                    className={cn(
                      'p-2.5 border-r last:border-r-0 border-border font-normal text-center relative transition-colors select-none',
                      day.isLocked && 'bg-muted/15 opacity-60 cursor-default',
                      isClickable && !day.isLocked && 'cursor-pointer hover:bg-muted/40 group',
                      borderTopClass,
                      isTodayColumn && 'bg-blue-50/70 dark:bg-blue-950/35',
                      isClickable && !day.isLocked && isTodayColumn && 'hover:bg-blue-100/60 dark:hover:bg-blue-900/40',
                      isDaySelected && !day.isLocked && 'ring-1 ring-[#1447e6] ring-inset dark:ring-blue-400 z-10'
                    )}
                    title={
                      day.isLocked
                        ? (day.lockReason
                            ? t('planning.lockedReason', '{{name}} · {{reason}} (Đã khóa dạy)', {
                                name: t(`days.${day.key}.name`, day.name || day.shortName),
                                reason: day.lockReason,
                              })
                            : t('planning.lockedOnly', '{{name}} · Đã khóa', {
                                name: t(`days.${day.key}.name`, day.name || day.shortName),
                              }))
                        : isClickable
                          ? t('planning.dayActionTooltip', 'Chọn {{name}} để điểm danh, sức khoẻ hoặc đón trẻ ({{status}})', {
                              name: t(`days.${day.key}.name`, day.name || day.shortName),
                              status: isDismissalDone
                                ? t('daily.badgeDismissalDone', 'Đã đón trẻ')
                                : isAttendanceDone
                                  ? t('daily.badgeAttendanceDone', 'Đã điểm danh')
                                  : day.isToday
                                    ? t('daily.todayNotAttended', 'Hôm nay (Chưa điểm danh)')
                                    : isFuture
                                      ? t('daily.futureDay', 'Chưa đến ngày')
                                      : t('daily.notStarted', 'Chưa bắt đầu'),
                            })
                          : undefined
                    }
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <div className="flex items-center gap-1 justify-center">
                        <span
                          className={cn(
                            'text-[13px] tracking-tight',
                            day.isToday && !day.isLocked ? 'font-bold' : 'font-semibold',
                            dayNameColorClass
                          )}
                        >
                          {t(`days.${day.key}.short`, day.shortName || day.key)}
                        </span>
                      </div>
                      <div
                        className={cn(
                          'text-[11.5px] font-mono leading-tight',
                          dayDateColorClass
                        )}
                      >
                        {day.date}
                      </div>

                      {/* Khung cố định chiều cao cho nhãn trạng thái: Giữ cho mọi cột luôn thẳng hàng 100% giống phụ huynh */}
                      {mode === 'daily' ? (
                        <div className="h-5 min-h-[20px] flex items-center justify-center mt-1 w-full px-1">
                          {statusBadge ? (
                            <span
                              title={day.lockReason || statusBadge.label}
                              className={cn(
                                'text-[10px] px-1.5 py-0.5 border leading-none shadow-2xs select-none inline-flex items-center justify-center gap-0.5 max-w-full',
                                statusBadge.className
                              )}
                            >
                              {statusBadge.icon && <span className="text-[9px] shrink-0">{statusBadge.icon}</span>}
                              <span className="truncate">{statusBadge.label}</span>
                            </span>
                          ) : (
                            <span className="text-[10px] px-1.5 py-0.5 leading-none invisible select-none" aria-hidden="true">
                              —
                            </span>
                          )}
                        </div>
                      ) : mode === 'planning' ? (
                        <div className="h-5 min-h-[20px] flex items-center justify-center mt-1 w-full px-1">
                          {(() => {
                            const dayActsCount = day.isLocked ? 0 : (slots || []).filter(
                              (s) => (s.day === day.key || s.dayOfWeek === day.dayOfWeek) && (s.activityId || s.title)
                            ).length;
                            if (day.isLocked) {
                              const makeupDate = day?.holiday?.makeupDate || day?.makeupDate;
                              if (makeupDate) {
                                const parts = makeupDate.split('-');
                                const d = parts[2];
                                const m = parts[1];
                                const y = parts[0];
                                let makeupDayName = 'T7';
                                if (y && m && d) {
                                  const dt = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
                                  const dows = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
                                  makeupDayName = dows[dt.getDay()] || 'T7';
                                }
                                const dayNameStr = makeupDayName === 'T7' ? t('days.T7.name', 'Thứ Bảy') : t(`days.${makeupDayName}.name`, makeupDayName);
                                return (
                                  <span
                                    title={t('planning.makeupRescheduledInfo', 'Lịch dạy đã được dời sang {{day}} ({{date}})', { day: dayNameStr, date: `${d}/${m}` })}
                                    className="text-[10px] px-1.5 py-0.5 border leading-none bg-blue-50 text-[#1447e6] border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800 font-semibold"
                                  >
                                    {t('planning.movedToDay', 'Dời sang {{day}} ({{date}})', { day: makeupDayName, date: `${d}/${m}` })}
                                  </span>
                                );
                              }
                              return (
                                <span className="text-[10px] px-1.5 py-0.5 border leading-none bg-muted/60 text-muted-foreground/70 border-border/60">
                                  {day.lockLabel || t('daily.badgeHoliday', 'Ngày nghỉ')}
                                </span>
                              );
                            }
                            if (day.key === 'CN') {
                              return dayActsCount > 0 ? (
                                <span title={t('planning.sundayNoClassesTooltip', 'Không được xếp lịch học vào Chủ nhật')} className="text-[10px] px-1.5 py-0.5 border leading-none bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800">
                                  {t('planning.sundayNoClasses', 'CN không học')}
                                </span>
                              ) : null;
                            }
                            if (day.isSaturdayMakeup) {
                              let originText = '';
                              if (day?.makeupHoliday?.startDate) {
                                const parts = day.makeupHoliday.startDate.split('-');
                                const dt = new Date(day.makeupHoliday.startDate);
                                const dows = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
                                const originDayName = dows[dt.getUTCDay()] || '';
                                originText = originDayName ? `${t(`days.${originDayName}.short`, originDayName)} (${parts[2]}/${parts[1]})` : `${parts[2]}/${parts[1]}`;
                              }
                              const label = originText ? t('planning.makeupForDate', 'Bù cho {{date}}', { date: originText }) : t('planning.makeup', 'Dạy bù');
                              return (
                                <span
                                  title={t('planning.saturdayMakeupTooltip', 'Thứ Bảy dạy bù theo kế hoạch ({{count}} hoạt động)', { count: dayActsCount })}
                                  className="text-[10px] px-1.5 py-0.5 border leading-none bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 font-semibold"
                                >
                                  {label}
                                </span>
                              );
                            }
                            if (dayActsCount === 0) {
                              return (
                                <span className="text-[10px] px-1.5 py-0.5 leading-none text-muted-foreground/40 select-none">
                                  0 {t('planning.activityCountSuffix', 'HĐ')}
                                </span>
                              );
                            }
                            if (dayActsCount < 3) {
                              return (
                                <span
                                  title={t('planning.activitiesQuotaWarning', 'Theo quy định của nhà trường, mỗi ngày dạy học cần có tối thiểu 3 hoạt động giáo dục')}
                                  className="text-[10px] px-1.5 py-0.5 border leading-none shadow-2xs bg-amber-50 text-amber-700 border-amber-200/90 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60 font-medium"
                                >
                                  {dayActsCount}/3 {t('planning.activityCountSuffix', 'HĐ')}
                                </span>
                              );
                            }
                            return (
                              <span
                                title={t('planning.activitiesQuotaMet', 'Đạt định mức tối thiểu (min 3 – max 7 HĐ)')}
                                className="text-[10px] px-1.5 py-0.5 border leading-none shadow-2xs bg-emerald-50 text-emerald-700 border-emerald-200/90 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60 font-medium"
                              >
                                {dayActsCount} {t('planning.activityCountSuffix', 'HĐ')}
                              </span>
                            );
                          })()}
                        </div>
                      ) : null}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Routine Slot Rows */}
          <tbody className="divide-y divide-border">
            {ROUTINE_SLOTS.map((slotDef) => {
              const isRowDragCompatible = !draggedItem || (
                draggedItem.slotDef.key === slotDef.key ||
                (draggedItem.slot.routineSlot || draggedItem.slot.routine_slot) === slotDef.key
              );

              const clipboardRoutineKey = clipboardSlot
                ? clipboardSlot.routineSlot || clipboardSlot.routine_slot || clipboardSlot.slotDef?.key
                : null;
              const isRowPasteCompatible = !clipboardSlot || clipboardRoutineKey === slotDef.key;
              const isSameWeek = !clipboardSlot?.weekId || !currentWeekId || clipboardSlot.weekId === currentWeekId;

              return (
                <tr
                  key={slotDef.key}
                  className={cn(
                    'min-h-[105px] transition-opacity',
                    draggedItem && !isRowDragCompatible && 'opacity-25',
                    clipboardSlot && !isRowPasteCompatible && 'opacity-25'
                  )}
                >
                  {/* Routine slot header cell */}
                  <td
                    className="w-[115px] sm:w-[130px] p-2 border-r border-border font-semibold text-center align-middle bg-muted/10 text-[12.5px] leading-snug"
                  >
                    <div className="flex flex-col items-center justify-center gap-1">
                      <div className="flex flex-col items-center justify-center gap-0.5">
                        {(() => {
                          const translatedLines = t(`routineSlots.${slotDef.key}.lines`, { returnObjects: true });
                          const linesToRender = Array.isArray(translatedLines) && translatedLines.length > 0
                            ? translatedLines
                            : (slotDef.lines || [t(`routineSlots.${slotDef.key}.name`, slotDef.name)]);
                          return linesToRender.map((line, idx) => (
                            <span
                              key={idx}
                              className="font-semibold text-foreground text-[12.5px] leading-tight whitespace-nowrap"
                            >
                              {line}
                            </span>
                          ));
                        })()}
                      </div>
                      {slotDef.defaultTime && (
                        <span className="text-[11px] text-muted-foreground font-mono font-normal tracking-tight">
                          {slotDef.defaultTime}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Days Cells */}
                  {visibleDays.map((day) => {
                    const cellSlots = getCellSlots(day, slotDef.key, slotDef.fallbackTime);
                    const isSunday = day.key === 'CN';
                    const isTodayCell = (mode === 'daily' || mode === 'attendance') && Boolean(day.isToday) && !day.isLocked;

                    const isSourceCell = Boolean(
                      draggedItem &&
                      draggedItem.day.key === day.key &&
                      (draggedItem.slotDef.key === slotDef.key ||
                        (draggedItem.slot.routineSlot || draggedItem.slot.routine_slot) === slotDef.key)
                    );

                    const isAvailableTarget = Boolean(
                      mode === 'planning' &&
                      !day.isLocked &&
                      draggedItem &&
                      isRowDragCompatible &&
                      !isSourceCell
                    );

                    const isCellDragOver = Boolean(
                      (internalDragOverCell &&
                        internalDragOverCell.dayKey === day.key &&
                        internalDragOverCell.routineKey === slotDef.key) ||
                      (dragOverCell &&
                        dragOverCell.dayKey === day.key &&
                        dragOverCell.routineSlotKey === slotDef.key)
                    );

                    const isSourceCopyCell = Boolean(
                      clipboardSlot &&
                      isSameWeek &&
                      clipboardRoutineKey === slotDef.key &&
                      day.key === clipboardSlot.day
                    );

                    const isPasteTargetEligible = Boolean(
                      clipboardSlot &&
                      isRowPasteCompatible &&
                      !day.isLocked &&
                      !isSunday &&
                      !isSourceCopyCell
                    );

                    const isCellSelectedForPaste = Boolean(
                      isPasteTargetEligible &&
                      selectedTargetCells?.some(
                        (c) =>
                          (!c.weekId || !currentWeekId || c.weekId === currentWeekId) &&
                          c.dayKey === day.key &&
                          c.routineKey === slotDef.key
                      )
                    );

                    return (
                      <td
                        key={day.key}
                        onClick={(e) => {
                          if (clipboardSlot && onToggleSelectCell) {
                            if (isPasteTargetEligible) {
                              e.stopPropagation();
                              onToggleSelectCell(day.key, slotDef.key, e.shiftKey, e.ctrlKey);
                            }
                            return;
                          }
                        }}
                        onDragOver={(e) => {
                          if (isAvailableTarget) {
                            e.preventDefault();
                            const isCopyMode = Boolean(e.altKey || e.ctrlKey);
                            setIsAltKeyHeld(isCopyMode);
                            e.dataTransfer.dropEffect = isCopyMode ? 'copy' : 'move';
                            if (
                              !internalDragOverCell ||
                              internalDragOverCell.dayKey !== day.key ||
                              internalDragOverCell.routineKey !== slotDef.key
                            ) {
                              setInternalDragOverCell({ dayKey: day.key, routineKey: slotDef.key });
                            }
                          } else if (draggedItem) {
                            e.dataTransfer.dropEffect = 'none';
                          }
                          if (onCellDragOver) onCellDragOver(e, day, slotDef);
                        }}
                        onDragLeave={(e) => {
                          setIsAltKeyHeld(false);
                          if (
                            internalDragOverCell?.dayKey === day.key &&
                            internalDragOverCell?.routineKey === slotDef.key
                          ) {
                            setInternalDragOverCell(null);
                          }
                          if (onCellDragLeave) onCellDragLeave(e, day, slotDef);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (isAvailableTarget && draggedItem) {
                            const isDuplicate = Boolean(e.altKey || e.ctrlKey || isAltKeyHeld);
                            if (onMoveSlot) {
                              onMoveSlot({
                                sourceSlot: draggedItem.slot,
                                sourceDay: draggedItem.day,
                                sourceSlotDef: draggedItem.slotDef,
                                sourceExistingSlots: getCellSlots(draggedItem.day, draggedItem.slotDef.key, draggedItem.slotDef.fallbackTime),
                                targetDay: day,
                                targetSlotDef: slotDef,
                                targetExistingSlots: cellSlots,
                                isDuplicate,
                              });
                            }
                            setDraggedItem(null);
                            setInternalDragOverCell(null);
                            setIsAltKeyHeld(false);
                          }
                          if (onCellDrop) onCellDrop(e, day, slotDef);
                        }}
                        className={cn(
                          'p-1.5 border-r last:border-r-0 border-border align-top min-h-[105px] h-[105px] transition-all relative',
                          isTodayCell && 'bg-blue-50/40 dark:bg-blue-950/20',
                          isSunday && cellSlots.length === 0 && 'bg-muted/5',
                          // Highlight Available Target Cell
                          isAvailableTarget && !isCellDragOver && 'border-2 border-dashed border-[#1447e6]/50 bg-blue-500/[0.04]',
                          isAvailableTarget && isCellDragOver && !isAltKeyHeld && 'border-2 border-[#1447e6] bg-[#1447e6]/15 ring-2 ring-[#1447e6]/30',
                          isAvailableTarget && isCellDragOver && isAltKeyHeld && 'border-2 border-emerald-600 bg-emerald-500/15 ring-2 ring-emerald-500/30',
                          draggedItem && isSourceCell && 'opacity-40 bg-muted/10',
                          draggedItem && !isRowDragCompatible && 'cursor-not-allowed bg-muted/20',
                          // Highlight selected cell for paste: Giữ border bảng nguyên bản, dùng nền và khung nét đứt lọt lòng
                          isCellSelectedForPaste && 'bg-primary/[0.08] cursor-pointer',
                          clipboardSlot && !isCellSelectedForPaste && isPasteTargetEligible && 'hover:bg-primary/[0.04] cursor-pointer',
                          clipboardSlot && !isPasteTargetEligible && !isSourceCopyCell && 'cursor-not-allowed',
                          isSourceCopyCell && 'bg-primary/[0.03]'
                        )}
                      >
                        {/* Khung viền nét đứt bên trong ô đã chọn dán (nằm hoàn toàn bên trong ô, không tác động border của bảng) */}
                        {isCellSelectedForPaste && (
                          <div className="absolute inset-1 border border-primary/50 border-dashed pointer-events-none z-10" />
                        )}

                        {/* Paste target selection badge */}
                        {isCellSelectedForPaste && (
                          <div className="absolute top-1.5 left-1.5 z-20 bg-primary text-primary-foreground text-[10px] font-semibold px-1.5 py-0.5 shadow-xs flex items-center gap-1 select-none animate-in fade-in-50">
                            <span>✓</span>
                            <span>{t('common.paste', 'Dán')}</span>
                          </div>
                        )}

                        {/* Duplicate badge when dragging with Alt/Ctrl */}
                        {isAvailableTarget && isCellDragOver && isAltKeyHeld && (
                          <div className="absolute top-1 right-1 z-20 bg-emerald-600 text-white text-[11px] font-medium px-2 py-0.5 rounded-none shadow-md flex items-center gap-1 animate-in fade-in-50 select-none">
                            <span className="font-bold">+</span>
                            <span>{t('common.duplicate', 'Nhân bản')}</span>
                          </div>
                        )}

                        {cellSlots.length > 1 ? (
                          <div className="flex flex-col gap-1.5 h-full w-full justify-between">
                            {cellSlots.map((itemSlot, slotIdx) => {
                              const isItemSelected = activeSlotId === itemSlot.id;
                              const isBeingDragged = draggedItem?.slot?.id === itemSlot.id;
                              const isBeingCopied = Boolean(
                                clipboardSlot &&
                                isSameWeek &&
                                (clipboardSlot.id ? itemSlot.id === clipboardSlot.id : (day.key === clipboardSlot.day && slotDef.key === clipboardRoutineKey))
                              );
                              const makeupBadge = getSlotMakeupBadge(itemSlot, day, slotDef, t);

                              return (
                                <div
                                  key={itemSlot.id}
                                  draggable={!readOnly && mode === 'planning' && !day.isLocked}
                                  onDragStart={(e) => handleSlotDragStart(e, itemSlot, day, slotDef)}
                                  onDragEnd={handleSlotDragEnd}
                                  onClick={(e) => {
                                    if (clipboardSlot) {
                                      if (isBeingCopied) {
                                        e.stopPropagation();
                                        if (onCancelClipboard) onCancelClipboard();
                                        return;
                                      }
                                      if (isPasteTargetEligible) {
                                        e.stopPropagation();
                                        if (onToggleSelectCell) {
                                          onToggleSelectCell(day.key, slotDef.key, e.shiftKey, e.ctrlKey);
                                        }
                                        return;
                                      }
                                    }
                                    if ((e.ctrlKey || e.metaKey) && (onCopySlot || onQuickCopySlot)) {
                                      e.stopPropagation();
                                      const copyFn = onCopySlot || onQuickCopySlot;
                                      copyFn({
                                        ...itemSlot,
                                        day: itemSlot.day || day.key,
                                        routineSlot: itemSlot.routineSlot || slotDef.key,
                                      });
                                      return;
                                    }
                                    if (onSelectSlot) onSelectSlot(itemSlot, day);
                                  }}
                                  title={
                                    makeupBadge?.tooltip
                                      ? `${makeupBadge.tooltip} · ${itemSlot.title || itemSlot.shortTitle}`
                                      : mode === 'planning'
                                        ? `${itemSlot.title || itemSlot.shortTitle}${itemSlot.slotCreatorName || itemSlot.creatorName ? ` (${t('planning.scheduledBy', 'Xếp bởi: {{name}}', { name: itemSlot.slotCreatorName || itemSlot.creatorName })})` : ''}`
                                        : `${itemSlot.title || itemSlot.shortTitle} · ${getScheduledStatusLabel(itemSlot.status, t)}`
                                  }
                                  className={cn(
                                    'flex-1 p-1.5 flex flex-col justify-center items-center text-center rounded-none transition-all group border min-h-[44px] relative',
                                    day.isLocked
                                      ? 'opacity-25 grayscale border-dashed border-border/40 bg-muted/20 select-none cursor-default'
                                      : 'bg-card border-border/80 hover:border-foreground/30 hover:shadow-2xs cursor-pointer',
                                    !readOnly && mode === 'planning' && !day.isLocked && 'cursor-grab active:cursor-grabbing hover:border-foreground/50',
                                    readOnly && !day.isLocked && 'hover:border-foreground/50',
                                    isBeingDragged && 'opacity-30 border-dashed border-[#1447e6]',
                                    isBeingCopied
                                      ? 'border-2 border-dashed border-primary bg-primary/[0.06] shadow-xs'
                                      : isCellSelectedForPaste
                                        ? 'border-2 border-dashed border-primary bg-primary/[0.08] shadow-xs'
                                        : isItemSelected
                                          ? 'border-foreground/70 ring-1 ring-foreground/20 shadow-xs'
                                          : isTodayCell
                                            ? 'border-blue-200/90 dark:border-blue-800/70 bg-card/95 hover:border-[#1447e6]/60 hover:shadow-2xs'
                                            : '',
                                    mode !== 'planning' && !day.isLocked && getScheduledStatusBorder(itemSlot.status)
                                  )}
                                >
                                  {/* Badge ô đang sao chép */}
                                  {isBeingCopied && (
                                    <div className="absolute top-0.5 right-0.5 z-20 bg-primary text-primary-foreground text-[9.5px] font-semibold px-1 py-0.2 shadow-xs flex items-center gap-1 select-none">
                                      <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground animate-pulse" />
                                      <span>{t('planning.copying', 'Đang chép')}</span>
                                    </div>
                                  )}

                                  <div className="flex-1 flex flex-col items-center justify-center text-center w-full px-1">
                                    <span className={cn("font-normal text-[11.5px] line-clamp-2 leading-tight text-center", day.isLocked ? "text-muted-foreground" : "text-foreground")}>
                                      {itemSlot.title || itemSlot.shortTitle}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : cellSlots.length === 1 ? (
                          (() => {
                            const slot = cellSlots[0];
                            const isSelected = activeSlotId === slot.id;
                            const isBeingDragged = draggedItem?.slot?.id === slot.id;
                            const isBeingCopied = Boolean(
                              clipboardSlot &&
                              isSameWeek &&
                              (clipboardSlot.id ? slot.id === clipboardSlot.id : (day.key === clipboardSlot.day && slotDef.key === clipboardRoutineKey))
                            );
                            const makeupBadge = getSlotMakeupBadge(slot, day, slotDef, t);

                            return (
                              <div
                                draggable={!readOnly && mode === 'planning' && !day.isLocked}
                                onDragStart={(e) => handleSlotDragStart(e, slot, day, slotDef)}
                                onDragEnd={handleSlotDragEnd}
                                onClick={(e) => {
                                  if (clipboardSlot) {
                                    if (isBeingCopied) {
                                      e.stopPropagation();
                                      if (onCancelClipboard) onCancelClipboard();
                                      return;
                                    }
                                    if (isPasteTargetEligible) {
                                      e.stopPropagation();
                                      if (onToggleSelectCell) {
                                        onToggleSelectCell(day.key, slotDef.key, e.shiftKey, e.ctrlKey);
                                      }
                                      return;
                                    }
                                  }
                                  if ((e.ctrlKey || e.metaKey) && (onCopySlot || onQuickCopySlot)) {
                                    e.stopPropagation();
                                    const copyFn = onCopySlot || onQuickCopySlot;
                                    copyFn({
                                      ...slot,
                                      day: slot.day || day.key,
                                      routineSlot: slot.routineSlot || slotDef.key,
                                    });
                                    return;
                                  }
                                  if (onSelectSlot) onSelectSlot(slot, day);
                                }}
                                title={
                                  makeupBadge?.tooltip
                                    ? `${makeupBadge?.tooltip} · ${slot.title || slot.shortTitle}`
                                    : mode === 'planning'
                                      ? `${slot.title || slot.shortTitle}${slot.slotCreatorName || slot.creatorName ? ` (${t('planning.scheduledBy', 'Xếp bởi: {{name}}', { name: slot.slotCreatorName || slot.creatorName })})` : ''}`
                                      : `${slot.title || slot.shortTitle} · ${getScheduledStatusLabel(slot.status, t)}`
                                }
                                className={cn(
                                  'h-full p-2.5 flex flex-col justify-center items-center text-center rounded-none transition-all group border relative',
                                  day.isLocked
                                    ? 'opacity-25 grayscale border-dashed border-border/40 bg-muted/20 select-none cursor-default'
                                    : 'bg-card border-border/80 hover:border-foreground/30 hover:shadow-2xs cursor-pointer',
                                  !readOnly && mode === 'planning' && !day.isLocked && 'cursor-grab active:cursor-grabbing hover:border-foreground/50',
                                  readOnly && !day.isLocked && 'hover:border-foreground/50',
                                  isBeingDragged && 'opacity-30 border-dashed border-[#1447e6]',
                                  isBeingCopied
                                    ? 'border-2 border-dashed border-primary bg-primary/[0.06] shadow-xs'
                                    : isCellSelectedForPaste
                                      ? 'border-2 border-dashed border-primary bg-primary/[0.08] shadow-xs'
                                      : isSelected
                                        ? 'border-foreground/70 ring-1 ring-foreground/20 shadow-xs'
                                        : isTodayCell
                                          ? 'border-blue-200/90 dark:border-blue-800/70 bg-card/95 hover:border-[#1447e6]/60 hover:shadow-2xs'
                                          : '',
                                  mode !== 'planning' && !day.isLocked && getScheduledStatusBorder(slot.status)
                                )}
                              >
                                {/* Badge thể hiện ô đang sao chép */}
                                {isBeingCopied && (
                                  <div className="absolute top-1 right-1 z-20 bg-primary text-primary-foreground text-[10px] font-semibold px-1.5 py-0.5 shadow-xs flex items-center gap-1 select-none">
                                    <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground animate-pulse" />
                                    <span>{t('planning.copying', 'Đang sao chép')}</span>
                                  </div>
                                )}

                                <div className="flex-1 flex flex-col items-center justify-center text-center w-full px-1">
                                  <span className={cn("font-normal text-[12.5px] line-clamp-3 leading-snug text-center", day.isLocked ? "text-muted-foreground" : "text-foreground")}>
                                    {slot.title || slot.shortTitle}
                                  </span>
                                </div>

                                {mode !== 'daily' && mode !== 'planning' && (
                                  <div className="mt-1 flex items-center justify-center w-full pt-0.5">
                                    {mode === 'assessment' ? (
                                      <button
                                        type="button"
                                        className="text-[11.5px] text-[#1447e6] hover:underline flex items-center gap-1 font-normal"
                                      >
                                        <span>{t('assessment.rating')}</span>
                                        <span>→</span>
                                      </button>
                                    ) : mode === 'health' ? (
                                      slot.hasHealthCheck ? (
                                        <button
                                          type="button"
                                          className="text-[11.5px] text-[#1447e6] hover:underline flex items-center gap-1 font-normal"
                                        >
                                          <span>{t('health.title')}</span>
                                          <span>→</span>
                                        </button>
                                      ) : (
                                        <button
                                          type="button"
                                          className="text-[11.5px] text-[#1447e6] hover:underline flex items-center gap-1 font-normal"
                                        >
                                          <span>{t('attendance.title')}</span>
                                          <span>→</span>
                                        </button>
                                      )
                                    ) : (
                                      // Attendance mode
                                      <button
                                        type="button"
                                        className="text-[11.5px] text-[#1447e6] hover:underline flex items-center gap-1 font-normal"
                                      >
                                        <span>{t('attendance.title')}</span>
                                        <span>→</span>
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })()
                        ) : day.isLocked ? (
                          <div
                            className="w-full h-full min-h-[85px] flex flex-col items-center justify-center p-2.5 text-center select-none bg-muted/10 border border-dashed border-border/30 opacity-60 cursor-not-allowed"
                            title={day.lockReason ? `Đã khóa: ${day.lockReason}` : t('planning.locked', 'Đã khóa')}
                          >
                            <span
                              className="text-[11.5px] font-normal text-muted-foreground line-clamp-3 leading-snug px-1 select-none"
                              title={day.lockReason || day.lockLabel}
                            >
                              {day.lockReason || day.lockLabel || t('planning.locked', 'Đã khóa')}
                            </span>
                          </div>
                        ) : mode === 'planning' ? (
                          readOnly ? (
                            <div className="w-full h-full min-h-[85px] flex items-center justify-center p-2 text-center select-none border border-dashed border-border/20 opacity-30">
                              <span className="text-[12px] text-muted-foreground/60 font-light">—</span>
                            </div>
                          ) : (
                            <div
                              onClick={(e) => {
                                if (clipboardSlot && onToggleSelectCell) {
                                  if (isPasteTargetEligible) {
                                    e.stopPropagation();
                                    onToggleSelectCell(day.key, slotDef.key, e.shiftKey, e.ctrlKey);
                                  }
                                  return;
                                }
                                if (!draggedItem && onSelectEmptyCell) onSelectEmptyCell(day, slotDef);
                              }}
                              className={cn(
                                'w-full h-full min-h-[85px] flex flex-col items-center justify-center transition-all p-2 text-center select-none',
                                isAvailableTarget
                                  ? 'border-0 pointer-events-none'
                                  : clipboardSlot && !isPasteTargetEligible
                                    ? 'border border-dashed border-border/25 opacity-30 cursor-not-allowed'
                                    : 'border border-dashed border-border/50 hover:border-foreground/30 hover:bg-muted/30 cursor-pointer group'
                              )}
                              title={
                                clipboardSlot
                                  ? isPasteTargetEligible
                                    ? t('planning.clickToSelectPasteCell', 'Bấm để chọn ô dán cho {{day}} · {{slot}}', {
                                        day: t(`days.${day.key}.name`, day.name || day.shortName),
                                        slot: t(`routineSlots.${slotDef.key}.name`, slotDef.name),
                                      })
                                    : t('planning.pasteNotAvailable', 'Không khả dụng (chỉ dán vào các ô trong cùng hoạt động)')
                                  : t('planning.clickToAssignActivity', 'Bấm để chọn hoạt động cho {{day}} · {{slot}}', {
                                      day: t(`days.${day.key}.name`, day.name || day.shortName),
                                      slot: t(`routineSlots.${slotDef.key}.name`, slotDef.name),
                                    })
                              }
                            >
                              {(!clipboardSlot || isPasteTargetEligible) && (
                                <span className="text-[13px] text-muted-foreground/40 group-hover:text-foreground font-light mb-0.5 leading-none transition-colors">
                                  +
                                </span>
                              )}
                              <span className="text-[11.5px] text-muted-foreground/50 group-hover:text-foreground transition-colors">
                                {clipboardSlot
                                  ? isPasteTargetEligible
                                    ? isCellSelectedForPaste
                                      ? 'Enter'
                                      : t('planning.selectToPaste', 'Chọn dán')
                                    : ''
                                  : t('planning.assignActivity', 'Gán hoạt động')}
                              </span>
                            </div>
                          )
                        ) : null}
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
  );
}

export default TeacherTimetableGrid;
