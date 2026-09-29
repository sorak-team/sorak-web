import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
} from '@hugeicons/core-free-icons';
import { cn } from '@/shared/lib/utils';
import { useAcademicYearStore } from '@/features/academic-years';

const pad = (n) => String(n).padStart(2, '0');

// Generate 39 academic year weeks (2026 - 2027) starting Monday 07/09/2026 to Sunday 06/06/2027
function generateAcademicYearWeeks() {
  const weeks = [];
  const startMonday = new Date(2026, 8, 7); // 07 Sep 2026 (Month 8 in 0-indexed JS Date: Monday 07/09/2026)
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

  // 39 weeks completely cover up to the end of the academic year (31/05/2027 falls in Week 39)
  for (let i = 1; i <= 39; i++) {
    const curStart = new Date(startMonday);
    curStart.setDate(startMonday.getDate() + (i - 1) * 7);

    const curEnd = new Date(curStart);
    curEnd.setDate(curStart.getDate() + 6);

    let hasToday = false;
    const days = [];
    const dayDetails = [];

    for (let j = 0; j < 7; j++) {
      const d = new Date(curStart);
      d.setDate(curStart.getDate() + j);
      const dStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      const isToday = dStr === todayStr;
      if (isToday) hasToday = true;
      days.push(d.getDate());
      dayDetails.push({
        day: d.getDate(),
        month: d.getMonth(),
        year: d.getFullYear(),
        dateStr: dStr,
        isToday,
      });
    }

    // Unique ID for each of the 39 academic weeks (avoid collision between Sept weeks and end-of-year weeks)
    let id = `w-${i}`;
    if (i === 1) id = 'w-sep-1';
    else if (i === 2) id = 'w-sep-2';
    else if (i === 3) id = 'w-sep-3';
    else if (i === 4) id = 'w-sep-4';
    else if (i >= 5) id = `w-${i - 4}`; // w-1 to w-35

    const label = `${pad(curStart.getDate())}/${pad(curStart.getMonth() + 1)} – ${pad(curEnd.getDate())}/${pad(curEnd.getMonth() + 1)}/${curEnd.getFullYear()}`;

    // Array of "YYYY-M" keys this week touches
    const monthsTouched = Array.from(new Set(dayDetails.map((x) => `${x.year}-${x.month}`)));

    // Clamping: Week 39 contains 31/05/2027 (last day of academic year), so it belongs to Tháng 5 (month 4)
    let mMonth = dayDetails[3].month;
    let mYear = dayDetails[3].year;
    if (i === 39) {
      mMonth = 4; // Tháng 5 (0-indexed)
      mYear = 2027;
    }

    weeks.push({
      id,
      label,
      days,
      dayDetails,
      isCurrentWeek: hasToday,
      startDate: curStart,
      endDate: curEnd,
      monthsTouched,
      midMonth: mMonth,
      midYear: mYear,
    });
  }
  return weeks;
}

export const CALENDAR_WEEKS = generateAcademicYearWeeks();

export function WeekPickerCalendar({
  selectedWeek,
  onSelectWeek,
  className,
}) {
  const { t } = useTranslation();
  const weekDays = [
    t('calendar.mon', 'T2'),
    t('calendar.tue', 'T3'),
    t('calendar.wed', 'T4'),
    t('calendar.thu', 'T5'),
    t('calendar.fri', 'T6'),
    t('calendar.sat', 'T7'),
    t('calendar.sun', 'CN'),
  ];

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

  // Giới hạn năm học
  const {
    startYearNum,
    endYearNum,
    startMonthIdx,
    endMonthIdx,
    academicStartDate,
    academicEndDate,
    minYear,
    minMonth,
    maxYear,
    maxMonth,
  } = useMemo(() => {
    let sy = 2026;
    let ey = 2027;
    let sMonth = 8; // Tháng 9 (0-indexed: 8)
    let sDay = 5;
    let eMonth = 4; // Tháng 5 (0-indexed: 4)
    let eDay = 31;

    if (currentAcademicYear?.startDate) {
      const parts = currentAcademicYear.startDate.split('/').map(Number);
      if (parts.length === 3) {
        sDay = parts[0];
        sMonth = parts[1] - 1; // Month of startDate
        sy = parts[2];
      }
    }
    if (currentAcademicYear?.endDate) {
      const parts = currentAcademicYear.endDate.split('/').map(Number);
      if (parts.length === 3) {
        eDay = parts[0];
        eMonth = parts[1] - 1; // Month of endDate
        ey = parts[2];
      }
    } else if (currentAcademicYear?.range) {
      const parts = currentAcademicYear.range.split(/[-–]/).map((p) => parseInt(p.trim(), 10));
      if (parts[0]) sy = parts[0];
      if (parts[1]) ey = parts[1];
    }

    return {
      startYearNum: sy,
      endYearNum: ey,
      startMonthIdx: sMonth,
      endMonthIdx: eMonth,
      academicStartDate: new Date(sy, sMonth, sDay, 0, 0, 0),
      academicEndDate: new Date(ey, eMonth, eDay, 23, 59, 59),
      minYear: sy,
      minMonth: sMonth, // Tháng bắt đầu = tháng của ngày bắt đầu năm học (Tháng 9)
      maxYear: ey,
      maxMonth: eMonth, // Tháng kết thúc = tháng của ngày kết thúc năm học (Tháng 5)
    };
  }, [currentAcademicYear]);

  // Kiểm tra ngày nằm ngoài năm học
  const isDayOutsideAcademicYear = (d) => {
    const dt = new Date(d.year, d.month, d.day);
    return dt < academicStartDate || dt > academicEndDate;
  };

  const now = useMemo(() => new Date(), []);
  const initialCurrentWeek = useMemo(
    () => CALENDAR_WEEKS.find((w) => w.isCurrentWeek) || CALENDAR_WEEKS[5],
    []
  );

  const [activeWeekId, setActiveWeekId] = useState(
    selectedWeek || initialCurrentWeek.id
  );

  // Month navigation state: default to month of selected week or current date, clamped within academic year
  const initialWeekObj = useMemo(
    () => CALENDAR_WEEKS.find((w) => w.id === (selectedWeek || initialCurrentWeek.id)) || initialCurrentWeek,
    [selectedWeek, initialCurrentWeek]
  );

  const initialView = useMemo(() => {
    let y = initialWeekObj.midYear;
    let m = initialWeekObj.midMonth;
    if (y < minYear || (y === minYear && m < minMonth)) {
      y = minYear;
      m = minMonth;
    }
    if (y > maxYear || (y === maxYear && m >= maxMonth)) {
      y = maxYear;
      m = Math.max(minMonth, maxMonth - 1);
    }
    return { y, m };
  }, [initialWeekObj, minYear, minMonth, maxYear, maxMonth]);

  const [viewYear, setViewYear] = useState(initialView.y);
  const [viewMonth, setViewMonth] = useState(initialView.m);

  const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;
  const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;

  // Sử dụng ref để chỉ nhảy tháng khi selectedWeek thay đổi từ bên ngoài,
  // KHÔNG nhảy lại khi người dùng chủ động bấm chuyển tháng qua các nút điều hướng
  const lastSelectedWeekRef = useRef(selectedWeek);

  useEffect(() => {
    if (selectedWeek && selectedWeek !== lastSelectedWeekRef.current) {
      lastSelectedWeekRef.current = selectedWeek;
      setActiveWeekId(selectedWeek);
      const wObj = CALENDAR_WEEKS.find((w) => w.id === selectedWeek);
      if (wObj) {
        let targetY = wObj.midYear;
        let targetM = wObj.midMonth;
        if (targetY < minYear || (targetY === minYear && targetM < minMonth)) {
          targetY = minYear;
          targetM = minMonth;
        }
        if (targetY > maxYear || (targetY === maxYear && targetM >= maxMonth)) {
          targetY = maxYear;
          targetM = Math.max(minMonth, maxMonth - 1);
        }
        setViewYear(targetY);
        setViewMonth(targetM);
      }
    }
  }, [selectedWeek, minYear, minMonth, maxYear, maxMonth]);

  // Weeks belonging to Month 1 (Primary month)
  const month1Weeks = useMemo(() => {
    return CALENDAR_WEEKS.filter(
      (w) => w.midYear === viewYear && w.midMonth === viewMonth
    );
  }, [viewYear, viewMonth]);

  // Weeks belonging to Month 2 (Next month)
  const month2Weeks = useMemo(() => {
    return CALENDAR_WEEKS.filter(
      (w) => w.midYear === nextYear && w.midMonth === nextMonth
    );
  }, [nextYear, nextMonth]);

  // Giới hạn điều hướng tháng trong năm học:
  // Tháng đầu tiên là minMonth (Tháng 9/2026), tháng kết thúc là maxMonth (Tháng 5/2027)
  const isPrevDisabled = viewYear < minYear || (viewYear === minYear && viewMonth <= minMonth);
  const isNextDisabled = nextYear > maxYear || (nextYear === maxYear && nextMonth >= maxMonth);

  const handlePrevMonth = () => {
    if (isPrevDisabled) return;
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (isNextDisabled) return;
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleWeekClick = (week, isLocked = false) => {
    if (isLocked) return;
    setActiveWeekId(week.id);
    if (onSelectWeek) onSelectWeek(week);
  };

  const handleGoToday = () => {
    if (initialCurrentWeek) {
      setViewYear(initialCurrentWeek.midYear);
      setViewMonth(initialCurrentWeek.midMonth);
      handleWeekClick(initialCurrentWeek);
    } else {
      setViewYear(now.getFullYear());
      setViewMonth(now.getMonth());
    }
  };

  const renderMonthBlock = (mIdx, yNum, weeksList, isFirst = false) => {
    return (
      <div className={cn('flex flex-col gap-2', !isFirst && 'pt-3.5 border-t border-border/70')}>
        {/* Month Sub-header */}
        <div className="flex items-center justify-between px-1">
          <span className="text-[13px] font-bold text-foreground tracking-tight">
            {t('calendar.month', 'Tháng')} {mIdx + 1}/{yNum}
          </span>
          <span className="text-[11px] font-mono text-muted-foreground/80">
            {weeksList.length} {t('calendar.weekUnit', 'tuần')}
          </span>
        </div>

        {/* Calendar Days Header: T2, T3, T4, T5, T6, T7, CN */}
        <div className="grid grid-cols-7 text-center text-[11px] font-medium text-muted-foreground/80 pt-0.5">
          {weekDays.map((day) => (
            <div key={day} className="py-0.5">
              {day}
            </div>
          ))}
        </div>

        {/* Weeks Matrix */}
        <div className="flex flex-col gap-1">
          {weeksList.length === 0 ? (
            <div className="py-4 text-center text-[12px] text-muted-foreground/60 italic">
              {t('calendar.noWeeksFound', 'Không có tuần học nào')}
            </div>
          ) : (
            weeksList.map((week) => {
              const isSelected = week.id === activeWeekId;
              // Tuần chỉ bị khóa hoàn toàn nếu toàn bộ 7 ngày trong tuần đều nằm ngoài năm học
              const isWeekLocked = week.dayDetails.every(isDayOutsideAcademicYear);

              return (
                <div
                  key={week.id}
                  onClick={() => handleWeekClick(week, isWeekLocked)}
                  className={cn(
                    'grid grid-cols-7 text-center text-[12.5px] h-8 items-stretch transition-all rounded-none group relative overflow-hidden',
                    isWeekLocked
                      ? 'opacity-35 bg-muted/20 select-none cursor-default'
                      : 'cursor-pointer',
                    !isWeekLocked && isSelected
                      ? 'bg-[#1447e6] text-white font-medium shadow-xs'
                      : !isWeekLocked && 'text-foreground hover:bg-muted/70',
                    !isWeekLocked && week.isCurrentWeek && !isSelected && 'ring-1 ring-primary/40 bg-primary/5'
                  )}
                  title={
                    isWeekLocked
                      ? `Tuần ${week.label} (Ngoài năm học - Đã khóa)`
                      : `Tuần ${week.label}${week.isCurrentWeek ? ' (Tuần hiện tại)' : ''}`
                  }
                >
                  {week.dayDetails.map((d, dIdx) => {
                    const isCurrentMonth = d.month === mIdx;
                    const isToday = d.isToday;
                    const isDayOutside = isDayOutsideAcademicYear(d);

                    return (
                      <div
                        key={dIdx}
                        className={cn(
                          'h-full flex items-center justify-center text-[12px] relative transition-colors',
                          // Ngày ngoài năm học: Tuyệt đối không có màu xanh dương, không cho bấm, con trỏ default
                          isDayOutside && 'bg-muted text-muted-foreground/35 select-none cursor-default z-10'
                        )}
                      >
                        {isDayOutside ? (
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                            className="w-full h-full flex items-center justify-center text-[12px] text-muted-foreground/35 select-none cursor-default"
                            title="Ngày ngoài năm học (Đã khóa)"
                          >
                            {d.day}
                          </span>
                        ) : isToday ? (
                          <span
                            className={cn(
                              'w-full h-full flex items-center justify-center rounded-none text-[12px] font-bold transition-all',
                              isSelected
                                ? 'bg-white/25 text-white ring-1 ring-inset ring-white/50 shadow-2xs'
                                : 'bg-primary/15 text-primary ring-1 ring-inset ring-primary/35 shadow-2xs'
                            )}
                            title="Hôm nay"
                          >
                            {d.day}
                          </span>
                        ) : (
                          <span
                            className={cn(
                              'w-full h-full flex items-center justify-center text-[12px] transition-colors',
                              !isSelected
                                ? isCurrentMonth
                                  ? 'text-foreground font-normal'
                                  : 'text-muted-foreground/35 font-light'
                                : isCurrentMonth
                                ? 'text-white font-medium'
                                : 'text-white/55 font-light',
                            )}
                          >
                            {d.day}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      className={cn(
        'w-full bg-card p-4 flex flex-col justify-between shrink-0 select-none',
        className
      )}
      data-name="WeekPickerCalendar"
    >
      <div className="flex flex-col gap-3">
        {/* Month Navigation Toolbar */}
        <div className="flex items-center justify-between py-1 border-b border-border/60 pb-2.5">
          <button
            type="button"
            disabled={isPrevDisabled}
            onClick={handlePrevMonth}
            className="size-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors rounded-none cursor-pointer"
            title={isPrevDisabled ? t('calendar.firstMonthReached', 'Đã ở tháng đầu năm học') : t('calendar.prevMonth', 'Lùi 1 tháng')}
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={15} />
          </button>

          <span className="text-[13.5px] font-semibold text-foreground tracking-tight">
            {t('calendar.month', 'Tháng')} {viewMonth + 1}/{viewYear} – {nextMonth + 1}/{nextYear}
          </span>

          <button
            type="button"
            disabled={isNextDisabled}
            onClick={handleNextMonth}
            className="size-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors rounded-none cursor-pointer"
            title={isNextDisabled ? t('calendar.lastMonthReached', 'Đã ở tháng cuối năm học') : t('calendar.nextMonth', 'Tiến 1 tháng')}
          >
            <HugeiconsIcon icon={ArrowRight01Icon} size={15} />
          </button>
        </div>

        {/* 2 Months Stacked Vertically */}
        <div className="flex flex-col gap-3">
          {renderMonthBlock(viewMonth, viewYear, month1Weeks, true)}
          {renderMonthBlock(nextMonth, nextYear, month2Weeks, false)}
        </div>

        {/* Footer: Nút Hôm nay & tổng số tuần */}
        <div className="flex items-center justify-between pt-2.5 border-t border-border/50 text-[11px] text-muted-foreground">
          <button
            type="button"
            onClick={handleGoToday}
            className="text-[11.5px] font-medium text-primary hover:text-primary/85 hover:underline px-2 py-0.5 rounded-none bg-primary/10 hover:bg-primary/15 transition-colors cursor-pointer"
            title={t('calendar.jumpToToday', 'Nhảy về tháng & tuần hiện tại')}
          >
            {t('calendar.today', 'Hôm nay')}
          </button>
          <span className="text-[10.5px] text-muted-foreground/80 font-mono">
            {month1Weeks.length + month2Weeks.length} {t('calendar.weekUnit', 'tuần')}
          </span>
        </div>
      </div>
    </div>
  );
}

export default WeekPickerCalendar;
