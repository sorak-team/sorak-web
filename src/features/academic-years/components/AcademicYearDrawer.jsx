import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
} from '@hugeicons/core-free-icons';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
import {
  useAcademicYearStore,
  getDayAfterDisplayDate,
  isAcademicYearInUse,
} from '../academic-years.store';
import { cn } from '@/shared/lib/utils';

// Helper to parse DD/MM/YYYY or YYYY-MM-DD or Date into a Date object
function parseDateString(str) {
  if (!str) return null;
  if (str instanceof Date) return str;
  if (typeof str === 'string') {
    // DD/MM/YYYY
    if (str.includes('/')) {
      const parts = str.split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        return new Date(year, month, day);
      }
    }
    // YYYY-MM-DD or ISO string
    if (str.includes('-')) {
      const clean = str.split('T')[0];
      const parts = clean.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        return new Date(year, month, day);
      }
    }
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

// Helper to format Date to DD/MM/YYYY
function formatDateString(date) {
  if (!date) return '';
  const d = date instanceof Date ? date : parseDateString(date);
  if (!d) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function AcademicYearDrawer() {
  const { t } = useTranslation();
  const {
    isDrawerOpen,
    drawerMode,
    drawerYearId,
    academicYears,
    closeDrawer,
    updateAcademicYear,
    createAcademicYear,
  } = useAcademicYearStore();

  const currentYear = academicYears.find(
    (y) =>
      String(y.id) === String(drawerYearId) ||
      (drawerYearId === '2026-2027' && (String(y.id) === '1' || y.name?.includes('2026'))),
  );
  const isCurrentYearInUse = drawerMode === 'edit' && isAcademicYearInUse(currentYear);
  const isCurrentYearEnded =
    drawerMode === 'edit' &&
    (currentYear?.status === 'COMPLETED' || currentYear?.status === 'ended');

  // Calculate next academic year suggestion from existing academic years
  const nextYearSuggestion = useMemo(() => {
    let maxEndYear = 2026;
    let latestOldEndDate = null;
    let previousYearName = '';

    if (academicYears && academicYears.length > 0) {
      academicYears.forEach((y) => {
        const match = (y.name || y.range || '').match(/(\d{4})[–\-](\d{4})/);
        if (match) {
          const sY = parseInt(match[1], 10);
          const eY = parseInt(match[2], 10);
          if (eY > maxEndYear) maxEndYear = eY;
        }
        if (y.endDate) {
          const parsed = parseDateString(y.endDate);
          if (!latestOldEndDate || parsed > latestOldEndDate) {
            latestOldEndDate = parsed;
            previousYearName = y.name || y.range || '';
            if (parsed.getFullYear() > maxEndYear) {
              maxEndYear = parsed.getFullYear();
            }
          }
        }
      });
    }

    if (!latestOldEndDate) {
      latestOldEndDate = new Date(maxEndYear, 4, 31); // 31/05 of maxEndYear
      previousYearName = `${t('schoolYear.title', 'Năm học')} ${maxEndYear - 1}–${maxEndYear}`;
    }

    const nextStartYear = maxEndYear;
    const nextEndYear = maxEndYear + 1;
    return {
      startYear: nextStartYear,
      endYear: nextEndYear,
      name: `${t('schoolYear.title', 'Năm học')} ${nextStartYear}–${nextEndYear}`,
      startDate: `05/09/${nextStartYear}`,
      semester1EndDate: `15/01/${nextEndYear}`,
      endDate: `31/05/${nextEndYear}`,
      latestOldEndDate,
      previousYearName,
    };
  }, [academicYears, t]);

  const [name, setName] = useState('');
  const [active, setActive] = useState(false);
  const [status, setStatus] = useState('draft');
  const [startDate, setStartDate] = useState('');
  const [semester1EndDate, setSemester1EndDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Calendar states
  const [startCalendarOpen, setStartCalendarOpen] = useState(false);
  const [semester1EndCalendarOpen, setSemester1EndCalendarOpen] = useState(false);
  const [endCalendarOpen, setEndCalendarOpen] = useState(false);
  const [startMonthDate, setStartMonthDate] = useState(() => new Date(2026, 8, 1));
  const [semester1EndMonthDate, setSemester1EndMonthDate] = useState(() => new Date(2027, 0, 15));
  const [endMonthDate, setEndMonthDate] = useState(() => new Date(2027, 4, 1));

  // Determine current target start/end years based on name or suggestion
  const parsedYears = useMemo(() => {
    if (drawerMode === 'edit' && currentYear) {
      const match = (name || currentYear.name || '').match(/(\d{4})[–\-](\d{4})/);
      if (match) {
        return {
          startYear: parseInt(match[1], 10),
          endYear: parseInt(match[2], 10),
        };
      }
      const sD = parseDateString(startDate);
      const eD = parseDateString(endDate);
      return {
        startYear: sD ? sD.getFullYear() : 2026,
        endYear: eD ? eD.getFullYear() : 2027,
      };
    }

    const match = (name || '').match(/(\d{4})[–\-](\d{4})/);
    if (match) {
      return {
        startYear: parseInt(match[1], 10),
        endYear: parseInt(match[2], 10),
      };
    }
    return {
      startYear: nextYearSuggestion.startYear,
      endYear: nextYearSuggestion.endYear,
    };
  }, [name, drawerMode, currentYear, nextYearSuggestion, startDate, endDate]);

  // Determine latest end date of earlier school year (for both create and edit mode)
  const previousOldEndDate = useMemo(() => {
    if (drawerMode === 'create') {
      return nextYearSuggestion.latestOldEndDate;
    }
    if (currentYear) {
      let latest = null;
      const currentStartYear = parsedYears.startYear;
      academicYears.forEach((y) => {
        if (y.id === currentYear.id) return;
        const yMatch = (y.name || y.range || '').match(/(\d{4})[–\-](\d{4})/);
        const yStart = yMatch ? parseInt(yMatch[1], 10) : (y.startDate ? parseDateString(y.startDate)?.getFullYear() : null);
        if (yStart && yStart < currentStartYear && y.endDate) {
          const p = parseDateString(y.endDate);
          if (p && (!latest || p > latest)) {
            latest = p;
          }
        }
      });
      return latest;
    }
    return null;
  }, [drawerMode, nextYearSuggestion, currentYear, academicYears, parsedYears.startYear]);

  const isSemester1EndAllowed = Boolean(startDate && endDate);

  const handleSelectStartDate = (newVal) => {
    setStartDate(newVal);
    // If semester1EndDate is set, verify it's still strictly between newVal and endDate
    if (semester1EndDate) {
      const s = parseDateString(newVal);
      const m = parseDateString(semester1EndDate);
      const e = parseDateString(endDate);
      if ((s && m && m <= s) || (e && m && m >= e)) {
        setSemester1EndDate('');
      }
    }
  };

  const handleSelectEndDate = (newVal) => {
    setEndDate(newVal);
    // If semester1EndDate is set, verify it's still strictly between startDate and newVal
    if (semester1EndDate) {
      const s = parseDateString(startDate);
      const m = parseDateString(semester1EndDate);
      const e = parseDateString(newVal);
      if ((s && m && m <= s) || (e && m && m >= e)) {
        setSemester1EndDate('');
      }
    }
  };

  const handleSelectSemester1EndDate = (newVal) => {
    setSemester1EndDate(newVal);
  };

  const handleOpenStartCalendar = (open) => {
    if (open) {
      const s = parseDateString(startDate);
      if (s) setStartMonthDate(s);
      else setStartMonthDate(new Date(parsedYears.startYear, 8, 1));
    }
    setStartCalendarOpen(open);
  };

  const handleOpenEndCalendar = (open) => {
    if (open) {
      const e = parseDateString(endDate);
      if (e) setEndMonthDate(e);
      else setEndMonthDate(new Date(parsedYears.endYear, 4, 1));
    }
    setEndCalendarOpen(open);
  };

  const handleOpenSemester1End = (open) => {
    if (open) {
      const m = parseDateString(semester1EndDate);
      if (m) {
        setSemester1EndMonthDate(m);
      } else {
        setSemester1EndMonthDate(new Date(parsedYears.endYear, 0, 15));
      }
    }
    setSemester1EndCalendarOpen(open);
  };

  useEffect(() => {
    if (isDrawerOpen) {
      if (drawerMode === 'edit' && currentYear) {
        setName(currentYear.name);
        const s =
          currentYear.status === 'ACTIVE' || currentYear.active
            ? 'active'
            : currentYear.status === 'UPCOMING' || currentYear.status === 'DRAFT'
              ? 'draft'
              : 'ended';
        setStatus(s);
        setActive(s === 'active');
        setStartDate(currentYear.startDate || '');
        setSemester1EndDate(currentYear.semester1EndDate || '');
        setEndDate(currentYear.endDate || '');
        const sD = parseDateString(currentYear.startDate);
        const mD = parseDateString(currentYear.semester1EndDate);
        const eD = parseDateString(currentYear.endDate);
        if (sD) setStartMonthDate(sD);
        if (mD) setSemester1EndMonthDate(mD);
        if (eD) setEndMonthDate(eD);
      } else {
        // Tự động điền tên, trạng thái bắt buộc là bản nháp, người dùng chọn các mốc ngày
        const sY = nextYearSuggestion.startYear;
        const eY = nextYearSuggestion.endYear;
        setName(nextYearSuggestion.name);
        setStatus('draft');
        setActive(false);
        setStartDate('');
        setSemester1EndDate('');
        setEndDate('');
        setStartMonthDate(new Date(sY, 8, 1));
        setSemester1EndMonthDate(new Date(eY, 0, 15));
        setEndMonthDate(new Date(eY, 4, 1));
      }
    }
  }, [isDrawerOpen, drawerMode, currentYear, nextYearSuggestion]);

  // Khi người dùng thay đổi tên năm học ở chế độ tạo mới, cập nhật lại các năm đích
  const handleNameChange = (e) => {
    const newName = e.target.value;
    setName(newName);
    if (drawerMode === 'create') {
      const match = newName.match(/(\d{4})[–\-](\d{4})/);
      if (match) {
        const sY = parseInt(match[1], 10);
        const eY = parseInt(match[2], 10);
        setStartDate('');
        setSemester1EndDate('');
        setEndDate('');
        setStartMonthDate(new Date(sY, 8, 1));
        setSemester1EndMonthDate(new Date(eY, 0, 15));
        setEndMonthDate(new Date(eY, 4, 1));
      }
    }
  };

  if (!isDrawerOpen) return null;

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!name.trim()) {
      toast.error('Vui lòng nhập tên năm học');
      return;
    }
    if (!startDate) {
      toast.error('Vui lòng chọn ngày bắt đầu Học kỳ 1');
      return;
    }
    if (!endDate) {
      toast.error('Vui lòng chọn ngày kết thúc Học kỳ 2');
      return;
    }
    if (!semester1EndDate) {
      toast.error('Vui lòng chọn ngày kết thúc Học kỳ 1');
      return;
    }

    const start = parseDateString(startDate);
    const sem1End = parseDateString(semester1EndDate);
    const end = parseDateString(endDate);

    const targetStartYear = parsedYears.startYear;
    const targetEndYear = parsedYears.endYear;

    // Ràng buộc chọn đúng trong năm học
    if (!start || start.getFullYear() !== targetStartYear) {
      toast.error(
        t('schoolYear.startDateMustBeInYear', {
          defaultValue: `Ngày bắt đầu phải nằm trong năm ${targetStartYear} của năm học`,
          year: targetStartYear,
        })
      );
      return;
    }

    if (!end || end.getFullYear() !== targetEndYear) {
      toast.error(
        t('schoolYear.endDateMustBeInYear', {
          defaultValue: `Ngày kết thúc phải nằm trong năm ${targetEndYear} của năm học`,
          year: targetEndYear,
        })
      );
      return;
    }

    // Khóa các ngày trong năm học cũ (khi tạo mới hoặc chỉnh sửa năm học chưa sử dụng)
    if (!isCurrentYearInUse && previousOldEndDate && start <= previousOldEndDate) {
      toast.error(
        t('schoolYear.startDateMustBeAfterOldYear', {
          defaultValue: `Ngày bắt đầu năm học phải sau ngày kết thúc của năm học cũ (${formatDateString(previousOldEndDate)})`,
          date: formatDateString(previousOldEndDate),
        })
      );
      return;
    }

    if (end <= start) {
      toast.error('Ngày kết thúc năm học phải nằm sau ngày bắt đầu năm học');
      return;
    }

    if (!sem1End || sem1End <= start || sem1End >= end) {
      toast.error('Ngày kết thúc Học kỳ 1 phải nằm sau ngày bắt đầu HK1 và trước ngày kết thúc HK2');
      return;
    }

    if (drawerMode === 'edit' && currentYear) {
      updateAcademicYear(currentYear.id, {
        name: currentYear.name,
        active: Boolean(currentYear.active),
        status: currentYear.status,
        startDate: isCurrentYearInUse ? currentYear.startDate : startDate,
        semester1EndDate,
        endDate: isCurrentYearInUse ? currentYear.endDate : endDate,
      });
      toast.success(t('schoolYear.toastUpdated'));
    } else {
      createAcademicYear({
        name,
        active: false,
        status: 'UPCOMING',
        startDate,
        semester1EndDate,
        endDate,
        totalClasses: 0,
      });
      toast.success(t('schoolYear.toastCreated'));
    }

    closeDrawer();
  };

  const renderCalendar = (
    currentValue,
    setValue,
    monthDate,
    setMonthDate,
    setOpen,
    options = {}
  ) => {
    const activeDate = parseDateString(currentValue);
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sunday

    const weekdays = [
      t('calendar.sunShort', 'CN'),
      t('calendar.monShort', 'T2'),
      t('calendar.tueShort', 'T3'),
      t('calendar.wedShort', 'T4'),
      t('calendar.thuShort', 'T5'),
      t('calendar.friShort', 'T6'),
      t('calendar.satShort', 'T7'),
    ];

    // Điều hướng tháng bị giới hạn theo allowedYear và minDate / maxDate
    let canPrevMonth = true;
    if (options.allowedYear && year <= options.allowedYear && month <= 0) {
      canPrevMonth = false;
    }
    if (options.minDate) {
      const lastDayOfPrevMonth = new Date(year, month, 0);
      const mD = new Date(options.minDate.getFullYear(), options.minDate.getMonth(), options.minDate.getDate());
      if (lastDayOfPrevMonth <= mD) {
        canPrevMonth = false;
      }
    }

    let canNextMonth = true;
    if (options.allowedYear && year >= options.allowedYear && month >= 11) {
      canNextMonth = false;
    }
    if (options.maxDate) {
      const firstDayOfNextMonth = new Date(year, month + 1, 1);
      const mD = new Date(options.maxDate.getFullYear(), options.maxDate.getMonth(), options.maxDate.getDate());
      if (firstDayOfNextMonth > mD) {
        canNextMonth = false;
      }
    }

    const handlePrevMonth = () => {
      if (!canPrevMonth) return;
      setMonthDate(new Date(year, month - 1, 1));
    };

    const handleNextMonth = () => {
      if (!canNextMonth) return;
      setMonthDate(new Date(year, month + 1, 1));
    };

    const handleSelectDay = (day) => {
      const selected = new Date(year, month, day);
      setValue(formatDateString(selected));
      setOpen(false);
    };

    const isDayDisabled = (dayNumber) => {
      const thisDate = new Date(year, month, dayNumber);
      // Khóa năm nếu bắt buộc chọn trong năm nhất định
      if (options.allowedYear && year !== options.allowedYear) return true;
      // Khóa các ngày cũ hoặc nhỏ hơn minDate
      if (options.minDate) {
        const mD = new Date(options.minDate.getFullYear(), options.minDate.getMonth(), options.minDate.getDate());
        if (options.strictMin ? thisDate <= mD : thisDate < mD) return true;
      }
      // Khóa các ngày lớn hơn maxDate
      if (options.maxDate) {
        const mD = new Date(options.maxDate.getFullYear(), options.maxDate.getMonth(), options.maxDate.getDate());
        if (options.strictMax ? thisDate >= mD : thisDate > mD) return true;
      }
      return false;
    };

    const monthLabel = `${t('calendar.month', 'Tháng')} ${month + 1} / ${year}`;

    return (
      <div
        className="w-[230px] p-2 bg-card border border-border rounded-none shadow-xl z-50 text-foreground"
        data-node-id="4152:25113"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-border">
          <button
            type="button"
            onClick={handlePrevMonth}
            disabled={!canPrevMonth}
            className={cn(
              "size-7 flex items-center justify-center rounded-none transition-colors",
              canPrevMonth
                ? "hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                : "text-muted-foreground/30 cursor-not-allowed"
            )}
            title={canPrevMonth ? t('calendar.prevMonth', 'Tháng trước') : undefined}
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={14} />
          </button>
          <span className="text-[13px] font-medium text-foreground">
            {monthLabel}
          </span>
          <button
            type="button"
            onClick={handleNextMonth}
            disabled={!canNextMonth}
            className={cn(
              "size-7 flex items-center justify-center rounded-none transition-colors",
              canNextMonth
                ? "hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                : "text-muted-foreground/30 cursor-not-allowed"
            )}
            title={canNextMonth ? t('calendar.nextMonth', 'Tháng sau') : undefined}
          >
            <HugeiconsIcon icon={ArrowRight01Icon} size={14} />
          </button>
        </div>

        {/* Weekdays */}
        <div className="grid grid-cols-7 text-center pb-1">
          {weekdays.map((w) => (
            <span
              key={w}
              className="text-[11px] font-normal text-muted-foreground h-6 flex items-center justify-center"
            >
              {w}
            </span>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-y-1 text-center">
          {Array.from({ length: firstDayIndex }).map((_, i) => (
            <div key={`empty-${i}`} className="size-7" />
          ))}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNumber = i + 1;
            const isSelected = Boolean(
              activeDate &&
              activeDate.getDate() === dayNumber &&
              activeDate.getMonth() === month &&
              activeDate.getFullYear() === year
            );

            const disabled = isDayDisabled(dayNumber);

            if (disabled) {
              return (
                <button
                  key={`day-${dayNumber}`}
                  type="button"
                  disabled
                  className="size-7 text-[12px] flex items-center justify-center rounded-none text-muted-foreground/30 cursor-not-allowed select-none"
                  title="Ngày không khả dụng trong năm học này"
                >
                  {dayNumber}
                </button>
              );
            }

            return (
              <button
                key={`day-${dayNumber}`}
                type="button"
                onClick={() => handleSelectDay(dayNumber)}
                className={cn(
                  'size-7 text-[12px] flex items-center justify-center rounded-none transition-colors cursor-pointer',
                  isSelected
                    ? 'bg-[#1447e6] text-white font-medium'
                    : 'text-foreground hover:bg-muted',
                )}
              >
                {dayNumber}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        onClick={closeDrawer}
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in-0 duration-200"
      />

      {/* Drawer Panel (FE-03C) */}
      <div
        className={cn(
          'relative w-full max-w-[560px] h-full bg-card border-l border-border shadow-2xl flex flex-col',
          'animate-in slide-in-from-right duration-250 ease-out z-10',
        )}
        data-node-id="4152:3235"
        data-name="Academic Year · Edit Drawer"
      >
        {/* Header (Figma 4152:3236) */}
        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-border">
          <div className="flex flex-col gap-1">
            <h2 className="text-[18px] font-semibold text-foreground tracking-tight">
              {drawerMode === 'edit'
                ? t('schoolYear.editYear')
                : t('schoolYear.addYear')}
            </h2>
            <p className="text-[12px] text-muted-foreground font-normal">
              {drawerMode === 'edit'
                ? t('schoolYear.editYearSub')
                : t('schoolYear.createYearSub')}
            </p>
          </div>

          <button
            type="button"
            onClick={closeDrawer}
            className="size-8 rounded-none flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <svg
              className="size-4"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M12 4L4 12M4 4L12 12" />
            </svg>
          </button>
        </div>

        {/* Drawer Body (Figma 4152:25076) */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5"
        >
          {isCurrentYearEnded && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-[13px] rounded-none">
              {t('schoolYear.endedNotice', 'Năm học đã kết thúc. Bạn chỉ có thể xem thông tin.')}
            </div>
          )}

          {/* Field: Tên năm học */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-foreground">
              {t('schoolYear.nameLabel')}
            </label>
            <input
              type="text"
              value={name}
              readOnly
              tabIndex={-1}
              placeholder="Năm học 2027–2028"
              className="h-8 w-full border border-border px-2.5 text-[14px] rounded-none transition-colors bg-muted/50 text-muted-foreground cursor-not-allowed select-none focus:outline-none"
              required
            />
          </div>

          {/* Field: Trạng thái */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-foreground">
              {t('schoolYear.statusLabel')}
            </label>
            <select
              value={drawerMode === 'create' ? 'draft' : status}
              disabled
              className="h-8 w-full border border-border px-2.5 text-[14px] rounded-none transition-colors bg-muted/40 text-muted-foreground cursor-not-allowed select-none"
            >
              <option value="draft">{t('schoolYear.draft', 'Bản nháp')}</option>
              <option value="active">{t('schoolYear.active', 'Đang hoạt động')}</option>
              <option value="ended">{t('schoolYear.ended', 'Đã kết thúc')}</option>
            </select>
          </div>

          {/* Section: Thời gian năm học */}
          <div className="pt-2 flex flex-col gap-1">
            <h4 className="text-[13px] font-semibold text-foreground">
              {t('schoolYear.timeframeLabel')}
            </h4>
            <p className="text-[11px] text-muted-foreground font-normal leading-relaxed">
              {t('schoolYear.timeframeHelp')}
            </p>
          </div>

          {/* Date Pickers Section */}
          <div className="flex flex-col gap-3">
            {/* 1. Ngày bắt đầu HK1 */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-foreground">
                {t('schoolYear.startDate')} ({t('schoolYear.semester1Start', 'Bắt đầu HK1')})
              </label>

              {isCurrentYearInUse || isCurrentYearEnded ? (
                <div className="h-8 w-full border border-border px-2.5 text-[14px] rounded-none bg-muted/40 text-muted-foreground flex items-center justify-between select-none cursor-not-allowed opacity-75">
                  <span>{startDate}</span>
                  <svg className="size-4 text-muted-foreground/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="4" width="18" height="18" rx="0" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </div>
              ) : (
                <Popover
                  open={startCalendarOpen}
                  onOpenChange={handleOpenStartCalendar}
                >
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="h-8 w-full border border-border px-2.5 text-[14px] rounded-none bg-background text-foreground flex items-center justify-between text-left hover:border-foreground/40 transition-colors cursor-pointer"
                    >
                      <span className={cn(!startDate && "text-muted-foreground text-[13px]")}>
                        {startDate || t('schoolYear.chooseStartDate', 'Chọn ngày bắt đầu HK1')}
                      </span>
                      <svg
                        className="size-4 text-muted-foreground"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      >
                        <rect x="3" y="4" width="18" height="18" rx="0" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="p-0 border-none shadow-none">
                    {renderCalendar(
                      startDate,
                      handleSelectStartDate,
                      startMonthDate,
                      setStartMonthDate,
                      setStartCalendarOpen,
                      {
                        allowedYear: parsedYears.startYear,
                        minDate: previousOldEndDate || undefined,
                        maxDate: new Date(parsedYears.startYear, 11, 31),
                      }
                    )}
                  </PopoverContent>
                </Popover>
              )}
            </div>

            {/* 2. Ngày kết thúc HK1 (Ở GIỮA: mở sau khi chọn ngày bắt đầu HK1 và kết thúc HK2) */}
            <div className="flex flex-col gap-1.5">
              <label
                className={cn(
                  "text-[12px] font-medium",
                  (isSemester1EndAllowed && !isCurrentYearEnded) ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {t('schoolYear.semester1End', 'Ngày kết thúc Học kỳ 1')}
              </label>

              {!isSemester1EndAllowed || isCurrentYearEnded ? (
                <div
                  className="h-8 w-full border border-border px-2.5 text-[14px] rounded-none bg-muted/40 text-muted-foreground flex items-center justify-between select-none cursor-not-allowed opacity-75"
                  title={isCurrentYearEnded ? t('schoolYear.endedNotice', 'Năm học đã kết thúc. Bạn chỉ có thể xem thông tin.') : t('schoolYear.chooseSemester1EndAfterStartEnd', 'Chọn ngày bắt đầu HK1 và kết thúc HK2 trước')}
                >
                  <span className="text-[13px] text-muted-foreground">
                    {semester1EndDate || (isCurrentYearEnded ? '—' : t('schoolYear.chooseSemester1EndAfterStartEnd', 'Chọn ngày bắt đầu HK1 và kết thúc HK2 trước'))}
                  </span>
                  <svg
                    className="size-4 text-muted-foreground/50"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <rect x="3" y="4" width="18" height="18" rx="0" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </div>
              ) : (
                <Popover
                  open={semester1EndCalendarOpen}
                  onOpenChange={handleOpenSemester1End}
                >
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="h-8 w-full border border-border px-2.5 text-[14px] rounded-none bg-background text-foreground flex items-center justify-between text-left hover:border-foreground/40 transition-colors cursor-pointer"
                    >
                      <span className={cn(!semester1EndDate && "text-muted-foreground text-[13px]")}>
                        {semester1EndDate || t('schoolYear.chooseSemester1End', 'Chọn ngày kết thúc HK1')}
                      </span>
                      <svg
                        className="size-4 text-muted-foreground"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      >
                        <rect x="3" y="4" width="18" height="18" rx="0" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="p-0 border-none shadow-none">
                    {renderCalendar(
                      semester1EndDate,
                      handleSelectSemester1EndDate,
                      semester1EndMonthDate,
                      setSemester1EndMonthDate,
                      setSemester1EndCalendarOpen,
                      {
                        minDate: parseDateString(startDate),
                        maxDate: parseDateString(endDate),
                        strictMin: true,
                        strictMax: true,
                      }
                    )}
                  </PopoverContent>
                </Popover>
              )}
            </div>

            {/* 3. Ngày kết thúc HK2 */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-foreground">
                {t('schoolYear.endDate')} ({t('schoolYear.semester2End', 'Kết thúc HK2')})
              </label>

              {isCurrentYearInUse || isCurrentYearEnded ? (
                <div className="h-8 w-full border border-border px-2.5 text-[14px] rounded-none bg-muted/40 text-muted-foreground flex items-center justify-between select-none cursor-not-allowed opacity-75">
                  <span>{endDate}</span>
                  <svg className="size-4 text-muted-foreground/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="4" width="18" height="18" rx="0" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </div>
              ) : (
                <Popover open={endCalendarOpen} onOpenChange={handleOpenEndCalendar}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="h-8 w-full border border-border px-2.5 text-[14px] rounded-none bg-background text-foreground flex items-center justify-between text-left hover:border-foreground/40 transition-colors cursor-pointer"
                    >
                      <span className={cn(!endDate && "text-muted-foreground text-[13px]")}>
                        {endDate || t('schoolYear.chooseEndDate', 'Chọn ngày kết thúc HK2')}
                      </span>
                      <svg
                        className="size-4 text-muted-foreground"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      >
                        <rect x="3" y="4" width="18" height="18" rx="0" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="p-0 border-none shadow-none">
                    {renderCalendar(
                      endDate,
                      handleSelectEndDate,
                      endMonthDate,
                      setEndMonthDate,
                      setEndCalendarOpen,
                      {
                        allowedYear: parsedYears.endYear,
                        minDate: new Date(parsedYears.endYear, 0, 1),
                        maxDate: new Date(parsedYears.endYear, 11, 31),
                      }
                    )}
                  </PopoverContent>
                </Popover>
              )}
            </div>

            {/* Semester breakdown preview pill */}
            <div className="mt-2 p-3 bg-muted/40 border border-border text-[12px] flex flex-col gap-1.5 rounded-none">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="font-medium text-foreground">{t('schoolYear.semester1', 'Học kỳ 1')}:</span>
                <span>{startDate || '—'} → {semester1EndDate || '—'}</span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="font-medium text-foreground">{t('schoolYear.semester2', 'Học kỳ 2')}:</span>
                <span>{semester1EndDate ? (getDayAfterDisplayDate(semester1EndDate) || '—') : '—'} → {endDate || '—'}</span>
              </div>
            </div>
          </div>
        </form>

        {/* Footer (Figma 4152:25226) */}
        <div className="h-[72px] px-6 py-4 border-t border-border flex items-center justify-between bg-card">
          <button
            type="button"
            onClick={closeDrawer}
            className="h-8 px-3 border border-border bg-background hover:bg-muted text-foreground text-[14px] font-medium rounded-none transition-colors cursor-pointer"
            data-node-id="4152:25227"
          >
            {isCurrentYearEnded ? t('schoolYear.close', 'Đóng') : t('schoolYear.cancel', 'Hủy')}
          </button>

          {!isCurrentYearEnded && (
            <button
              type="button"
              onClick={handleSubmit}
              className="h-8 px-4 text-white text-[14px] font-medium rounded-none transition-colors shadow-sm bg-[#1447e6] hover:bg-[#1447e6]/90 cursor-pointer"
              data-node-id="4152:25233"
            >
              {t('schoolYear.save', 'Lưu')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
