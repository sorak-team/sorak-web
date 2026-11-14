import React, { useState, useMemo, useEffect } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  AlertCircleIcon,
} from '@hugeicons/core-free-icons';
import { cn } from '@/shared/lib/utils';

// Helper to convert DD/MM/YYYY or ISO to YYYY-MM-DD
function toIso(str) {
  if (!str) return '';
  const clean = String(str).trim();
  if (clean.includes('T')) return clean.split('T')[0];
  if (clean.includes('-')) return clean;
  if (clean.includes('/')) {
    const parts = clean.split('/');
    if (parts.length === 3) {
      const [d, m, y] = parts;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
  }
  return clean;
}

// Helper to convert YYYY-MM-DD to DD/MM/YYYY
function toDmy(str) {
  if (!str) return '';
  const iso = toIso(str);
  const parts = iso.split('-');
  if (parts.length === 3) {
    const [y, m, d] = parts;
    return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
  }
  return str;
}

function getDatesBetween(startIso, endIso) {
  if (!startIso || !endIso || startIso > endIso) return [];
  const dates = [];
  const cur = new Date(`${startIso}T00:00:00.000Z`);
  const end = new Date(`${endIso}T00:00:00.000Z`);
  while (cur <= end) {
    dates.push(cur.toISOString().split('T')[0]);
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return dates;
}

// Clean concise helper for conflict messages
function getBlockedSummaryText(blockedDates, isTodayDismissed, todayIso, maxAllowed, isVi) {
  if (blockedDates.includes(todayIso) && isTodayDismissed) {
    return isVi
      ? `Học sinh đã được hoàn tất đón trong ngày hôm nay (${toDmy(todayIso)}). Vui lòng chọn ngày khác.`
      : `Student already picked up today (${toDmy(todayIso)}). Please choose another date.`;
  }
  const count = blockedDates.length;
  if (count === 1) {
    return isVi
      ? `Ngày ${toDmy(blockedDates[0])} đã đạt tối đa người đón (${maxAllowed} người). Vui lòng chọn ngày khác.`
      : `Date ${toDmy(blockedDates[0])} has reached max limit (${maxAllowed} delegates). Please choose another date.`;
  }
  if (count <= 2) {
    return isVi
      ? `Các ngày ${blockedDates.map(toDmy).join(', ')} đã kín lịch đón (tối đa ${maxAllowed} người/ngày). Vui lòng chọn ngày khác.`
      : `Dates ${blockedDates.map(toDmy).join(', ')} are fully booked (max ${maxAllowed} delegates/day). Please choose other dates.`;
  }
  const first = toDmy(blockedDates[0]);
  const last = toDmy(blockedDates[count - 1]);
  return isVi
    ? `Có ${count} ngày trong khoảng đã chọn đã kín lịch đón (từ ${first} đến ${last}). Vui lòng chọn khoảng thời gian khác.`
    : `${count} days in the selected range are fully booked (from ${first} to ${last}). Please choose another range.`;
}

export function PickupCalendarPicker({
  startDate,
  endDate,
  onChangeRange,
  quotaInfo = null,
  studentName = 'bé',
  isVi = true,
  disabled = false,
  className = '',
}) {
  const todayIso = useMemo(() => new Date().toISOString().split('T')[0], []);

  const rawStartIso = toIso(startDate);
  const rawEndIso = toIso(endDate) || rawStartIso;

  // Clamped start/end: cannot be before today
  const startIso = rawStartIso && rawStartIso < todayIso ? todayIso : rawStartIso;
  const endIso = rawEndIso && rawEndIso < todayIso ? todayIso : rawEndIso;

  // View state: current year and month being displayed
  const [viewDate, setViewDate] = useState(() => {
    const target = startIso || todayIso;
    const parts = target.split('-');
    if (parts.length === 3) {
      return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1);
    }
    return new Date();
  });

  // Keep viewDate in sync if selected startDate changes externally
  useEffect(() => {
    if (startIso) {
      const parts = startIso.split('-');
      if (parts.length === 3) {
        setViewDate(new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1));
      }
    }
  }, [startIso]);

  const parentCount = quotaInfo?.parentCount ?? 2;
  const maxAllowed = quotaInfo?.maxAllowedPerDay ?? (4 - parentCount);
  const isTodayDismissed = Boolean(quotaInfo?.isTodayDismissed);

  const blockedDatesSet = useMemo(() => {
    const set = new Set(quotaInfo?.blockedDates || []);
    if (isTodayDismissed) {
      set.add(todayIso);
    }
    return set;
  }, [quotaInfo, isTodayDismissed, todayIso]);

  // Find all blocked dates currently inside [startIso, endIso]
  const blockedInRange = useMemo(() => {
    if (!startIso || !endIso) return [];
    const all = getDatesBetween(startIso, endIso);
    return all.filter((d) => blockedDatesSet.has(d));
  }, [startIso, endIso, blockedDatesSet]);

  const hasConflict = blockedInRange.length > 0;

  // Notify parent component about validation state
  useEffect(() => {
    if (onChangeRange && startIso && endIso) {
      let errorMessage = null;
      if (hasConflict) {
        errorMessage = getBlockedSummaryText(blockedInRange, isTodayDismissed, todayIso, maxAllowed, isVi);
      }

      onChangeRange({
        startDate: toDmy(startIso),
        endDate: toDmy(endIso),
        startDateIso: startIso,
        endDateIso: endIso,
        hasConflict,
        blockedInRange,
        errorMessage,
      });
    }
  }, [startIso, endIso, hasConflict, blockedInRange, maxAllowed, isTodayDismissed, todayIso, isVi]);

  // Navigation handlers
  const handlePrevMonth = () => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleGoToday = () => {
    const today = new Date();
    setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
    if (!blockedDatesSet.has(todayIso) && !isTodayDismissed) {
      handleSelectDay(todayIso);
    }
  };

  // Selection logic: first click picks start date, second click picks end date
  const handleSelectDay = (dayIso) => {
    if (disabled) return;
    if (dayIso < todayIso) return; // Cannot select past dates
    if (blockedDatesSet.has(dayIso)) return; // Cannot select full or dismissed dates

    if (!startIso || (startIso && endIso && startIso !== endIso)) {
      onChangeRange?.({
        startDate: toDmy(dayIso),
        endDate: toDmy(dayIso),
        startDateIso: dayIso,
        endDateIso: dayIso,
        hasConflict: false,
        blockedInRange: [],
        errorMessage: null,
      });
      return;
    }

    if (startIso && startIso === endIso) {
      if (dayIso >= startIso) {
        const range = getDatesBetween(startIso, dayIso);
        const conflicts = range.filter((d) => blockedDatesSet.has(d));
        onChangeRange?.({
          startDate: toDmy(startIso),
          endDate: toDmy(dayIso),
          startDateIso: startIso,
          endDateIso: dayIso,
          hasConflict: conflicts.length > 0,
          blockedInRange: conflicts,
        });
      } else {
        onChangeRange?.({
          startDate: toDmy(dayIso),
          endDate: toDmy(dayIso),
          startDateIso: dayIso,
          endDateIso: dayIso,
          hasConflict: false,
          blockedInRange: [],
          errorMessage: null,
        });
      }
    }
  };

  // Build calendar matrix (Monday -> Sunday)
  const daysMatrix = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const firstDayIndex = (firstDayOfMonth.getDay() + 6) % 7;
    const totalDays = lastDayOfMonth.getDate();

    const cells = [];

    // Previous month padding days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = prevMonthLastDay - i;
      const prevDate = new Date(year, month - 1, d);
      const iso = prevDate.toISOString().split('T')[0];
      cells.push({
        dayNumber: d,
        dateIso: iso,
        isCurrentMonth: false,
        isPast: iso < todayIso,
        isBlocked: blockedDatesSet.has(iso),
        isTodayDismissed: iso === todayIso && isTodayDismissed,
      });
    }

    // Current month days
    for (let d = 1; d <= totalDays; d++) {
      const curDate = new Date(Date.UTC(year, month, d));
      const iso = curDate.toISOString().split('T')[0];
      cells.push({
        dayNumber: d,
        dateIso: iso,
        isCurrentMonth: true,
        isToday: iso === todayIso,
        isPast: iso < todayIso,
        isBlocked: blockedDatesSet.has(iso),
        isTodayDismissed: iso === todayIso && isTodayDismissed,
      });
    }

    // Next month padding days to complete 35 or 42 cells
    const remaining = 7 - (cells.length % 7);
    if (remaining < 7) {
      for (let d = 1; d <= remaining; d++) {
        const nextDate = new Date(Date.UTC(year, month + 1, d));
        const iso = nextDate.toISOString().split('T')[0];
        cells.push({
          dayNumber: d,
          dateIso: iso,
          isCurrentMonth: false,
          isPast: iso < todayIso,
          isBlocked: blockedDatesSet.has(iso),
          isTodayDismissed: iso === todayIso && isTodayDismissed,
        });
      }
    }

    return cells;
  }, [viewDate, blockedDatesSet, todayIso, isTodayDismissed]);

  const monthNames = [
    'Tháng 1',
    'Tháng 2',
    'Tháng 3',
    'Tháng 4',
    'Tháng 5',
    'Tháng 6',
    'Tháng 7',
    'Tháng 8',
    'Tháng 9',
    'Tháng 10',
    'Tháng 11',
    'Tháng 12',
  ];
  const weekDays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

  return (
    <div className={cn('border border-border bg-card p-3.5 space-y-2.5 shadow-2xs rounded-none text-foreground select-none', className)}>
      {/* Month Navigation - Clean & Focused */}
      <div className="flex items-center justify-between pb-1 border-b border-border/50">
        <span className="text-[13.5px] font-semibold tracking-tight text-foreground">
          {monthNames[viewDate.getMonth()]} / {viewDate.getFullYear()}
        </span>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleGoToday}
            className="h-6 px-2 text-[11px] font-medium border border-border hover:bg-muted text-foreground transition-colors cursor-pointer"
          >
            Hôm nay
          </button>
          <button
            type="button"
            onClick={handlePrevMonth}
            className="size-6 flex items-center justify-center border border-border hover:bg-muted text-foreground transition-colors cursor-pointer"
            title="Tháng trước"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={13} />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className="size-6 flex items-center justify-center border border-border hover:bg-muted text-foreground transition-colors cursor-pointer"
            title="Tháng sau"
          >
            <HugeiconsIcon icon={ArrowRight01Icon} size={13} />
          </button>
        </div>
      </div>

      {/* Day of Week Header */}
      <div className="grid grid-cols-7 gap-1 text-center font-mono text-[11px] text-muted-foreground font-semibold pb-1">
        {weekDays.map((d) => (
          <div key={d}>
            {d}
          </div>
        ))}
      </div>

      {/* Days Matrix - Clean without cluttered 1/2 */}
      <div className="grid grid-cols-7 gap-1">
        {daysMatrix.map((cell) => {
          const isSelectedStart = cell.dateIso === startIso;
          const isSelectedEnd = cell.dateIso === endIso;
          const isInSelectedRange =
            startIso && endIso && cell.dateIso >= startIso && cell.dateIso <= endIso;

          const isPast = cell.isPast;
          const isBlocked = cell.isBlocked;
          const isTodayDismissedCell = cell.isTodayDismissed;
          const isUnselectable = isPast || isBlocked;

          // Conflicted day: inside user's selected range, but it is blocked
          const isConflictDay = isInSelectedRange && isBlocked;

          let cellBg = 'bg-background hover:bg-muted/60 text-foreground';
          if (!cell.isCurrentMonth) {
            cellBg = 'bg-transparent text-muted-foreground/30 hover:bg-muted/20';
          }

          if (isPast) {
            cellBg = 'bg-muted/15 text-muted-foreground/35 cursor-not-allowed';
          } else if (isBlocked) {
            cellBg = 'bg-destructive/10 text-destructive border border-destructive/20 cursor-not-allowed';
          }

          if (isInSelectedRange) {
            if (isConflictDay) {
              cellBg = 'bg-destructive/25 text-destructive font-bold border border-destructive ring-1 ring-destructive';
            } else if (isSelectedStart || isSelectedEnd) {
              cellBg = 'bg-[#1447e6] text-white font-semibold shadow-xs';
            } else {
              cellBg = 'bg-[#1447e6]/15 text-[#1447e6] font-medium border-y border-[#1447e6]/30';
            }
          }

          let tooltip = `Ngày ${toDmy(cell.dateIso)}`;
          if (isPast) {
            tooltip = `Ngày ${toDmy(cell.dateIso)}: Đã qua (không thể chọn)`;
          } else if (isTodayDismissedCell) {
            tooltip = `Ngày ${toDmy(cell.dateIso)}: Bé đã được đón hôm nay (không thể chọn)`;
          } else if (isBlocked) {
            tooltip = `Ngày ${toDmy(cell.dateIso)}: Đã đạt tối đa ${maxAllowed}/${maxAllowed} người đón (không thể chọn)`;
          }

          return (
            <button
              key={cell.dateIso}
              type="button"
              disabled={disabled || isUnselectable}
              onClick={() => handleSelectDay(cell.dateIso)}
              title={tooltip}
              className={cn(
                'relative h-8 w-full flex items-center justify-center p-0.5 rounded-none transition-all text-[12px] font-mono',
                cellBg,
                cell.isToday && !isInSelectedRange && !isUnselectable && 'ring-1 ring-primary/60 font-semibold',
                disabled && 'cursor-not-allowed opacity-50'
              )}
            >
              <span className={cn(isBlocked && 'text-destructive font-semibold')}>
                {cell.dayNumber}
              </span>
            </button>
          );
        })}
      </div>

      {/* Clean Legend & Subtle Note at Bottom */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/60 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="size-2 bg-[#1447e6] inline-block" />
            <span>Đang chọn</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2 bg-destructive/20 border border-destructive/40 inline-block" />
            <span>Đã kín slot</span>
          </div>
        </div>

        {/* Clean Note at the bottom */}
        <span className="text-[11px] font-medium text-muted-foreground/80">
          {isVi
            ? `Tối đa ${maxAllowed} người ủy quyền/ngày`
            : `Max ${maxAllowed} authorized delegates/day`}
        </span>
      </div>

      {/* Alert Banner When Range Violates Quota */}
      {hasConflict && (
        <div className="p-2.5 bg-destructive/10 border border-destructive/25 text-destructive rounded-none flex items-center gap-2 animate-in fade-in-0 duration-150">
          <HugeiconsIcon icon={AlertCircleIcon} size={15} className="shrink-0 text-destructive" />
          <p className="text-[11.5px] leading-snug">
            <span className="font-semibold text-destructive">
              {isVi ? 'Không thể chọn: ' : 'Cannot select: '}
            </span>
            <span className="text-foreground/90">
              {getBlockedSummaryText(blockedInRange, isTodayDismissed, todayIso, maxAllowed, isVi)}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}

export default PickupCalendarPicker;
