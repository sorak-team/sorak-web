import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Calendar03Icon,
  PlusSignIcon,
  MinusSignIcon,
  Delete02Icon,
  SentIcon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ArrowDown01Icon,
  SidebarRightIcon,
  CheckmarkCircle01Icon,
  Cancel01Icon,
  InformationCircleIcon,
  Menu01Icon,
} from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Printer } from 'lucide-react';
import { ExcelActionsDropdown } from '@/components/ExcelActionsDropdown';
import { downloadBlob } from '@/shared/utils/download';
import { planningApi } from '@/features/planning/planning.api';
import { cn } from '@/shared/lib/utils';
import { toast } from 'sonner';
import { useAuthStore, isTeacherRole } from '@/features/auth';
import { useAcademicYearStore } from '@/features/academic-years';
import { academicYearsApi } from '@/features/academic-years/academic-years.api';
import { curriculumApi } from './curriculum.api';

// Days of the week in VN matching WeekPickerCalendar
const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

// Format ISO date (YYYY-MM-DD) to VN format (DD/MM/YYYY)
const formatDateVn = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

// Format date range as dd/mm → dd/mm
const formatDateRangeDdMm = (startDateStr, endDateStr) => {
  if (!startDateStr && !endDateStr) return 'Chưa xếp ngày';
  const formatDdMm = (str) => {
    if (!str) return '';
    const parts = str.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
    return str;
  };
  if (!startDateStr) return `→ ${formatDdMm(endDateStr)}`;
  if (!endDateStr) return `${formatDdMm(startDateStr)} →`;
  return `${formatDdMm(startDateStr)} → ${formatDdMm(endDateStr)}`;
};

// Format date range clean: dd/mm – dd/mm/yyyy (hoặc dd/mm/yyyy – dd/mm/yyyy nếu khác năm)
const formatDateRangeClean = (startStr, endStr) => {
  if (!startStr || !endStr) return '';
  const sParts = startStr.split('-');
  const eParts = endStr.split('-');
  if (sParts.length === 3 && eParts.length === 3) {
    if (sParts[0] === eParts[0]) {
      return `${sParts[2]}/${sParts[1]} – ${eParts[2]}/${eParts[1]}/${eParts[0]}`;
    }
    return `${sParts[2]}/${sParts[1]}/${sParts[0]} – ${eParts[2]}/${eParts[1]}/${eParts[0]}`;
  }
  return `${formatDateVn(startStr)} – ${formatDateVn(endStr)}`;
};

// Format timestamp/Date to HH:mm:ss chuẩn UX đồng bộ hệ thống
const formatDateTime = (val) => {
  const formatTime = (d) => {
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  if (!val) {
    return formatTime(new Date());
  }

  if (val instanceof Date && !isNaN(val.getTime())) {
    return formatTime(val);
  }

  const d = new Date(val);
  if (!isNaN(d.getTime())) {
    return formatTime(d);
  }

  return formatTime(new Date());
};

// Helper add days to ISO date string (YYYY-MM-DD)
const addDaysToDate = (dateStr, days) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) return '';
  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  date.setDate(date.getDate() + days);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// Check if a YYYY-MM-DD date is Monday
const isMonday = (dateStr) => {
  if (!dateStr) return false;
  const parts = dateStr.slice(0, 10).split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return false;
  return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2])).getUTCDay() === 1;
};

// Check if a YYYY-MM-DD date is Sunday
const isSunday = (dateStr) => {
  if (!dateStr) return false;
  const parts = dateStr.slice(0, 10).split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return false;
  return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2])).getUTCDay() === 0;
};

// Get the Monday of the week containing dateStr (YYYY-MM-DD)
const getMondayOfWeek = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.slice(0, 10).split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return '';
  const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  const day = date.getUTCDay(); // 0 is Sun, 1 is Mon, ..., 6 is Sat
  const diffToMon = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + diffToMon);
  return date.toISOString().slice(0, 10);
};

// Get the Sunday of the week containing dateStr (YYYY-MM-DD)
const getSundayOfWeek = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.slice(0, 10).split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return '';
  const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  const day = date.getUTCDay(); // 0 is Sun, 1 is Mon, ..., 6 is Sat
  const diffToSun = day === 0 ? 0 : 7 - day;
  date.setUTCDate(date.getUTCDate() + diffToSun);
  return date.toISOString().slice(0, 10);
};

// Cascade subthemes so they run consecutively without gaps or overlaps
const cascadeSubThemes = (subThemesList, themeStart, themeEnd) => {
  if (!Array.isArray(subThemesList) || subThemesList.length === 0) return [];

  let curStart = themeStart || subThemesList[0]?.startDate || '';
  if (!curStart) return subThemesList;

  return subThemesList.map((st) => {
    let weeks = 1;
    if (st.startDate && st.endDate) {
      const diffDays = Math.round((new Date(st.endDate) - new Date(st.startDate)) / 86400000) + 1;
      weeks = Math.min(5, Math.max(1, Math.round(diffDays / 7) || 1));
    }

    let start = '';
    let end = '';
    if (curStart && (!themeEnd || curStart <= themeEnd)) {
      start = curStart;
      end = addDaysToDate(curStart, weeks * 7 - 1);
      if (themeEnd && end > themeEnd) {
        end = themeEnd;
      }
      curStart = addDaysToDate(end, 1);
    }

    return {
      ...st,
      startDate: start,
      endDate: end,
    };
  });
};

// Normalize subThemes array ensuring object shape { id, name, startDate, endDate }
const normalizeSubThemes = (rawList, themeStart = '', themeEnd = '') => {
  if (!Array.isArray(rawList)) return [];
  const normalized = rawList.map((item, idx) => {
    if (typeof item === 'object' && item !== null) {
      return {
        id: item.id || `st-${idx}-${Date.now()}`,
        name: item.name || '',
        startDate: item.startDate || '',
        endDate: item.endDate || '',
      };
    }
    return {
      id: `st-${idx}-${Date.now()}`,
      name: typeof item === 'string' ? item : '',
      startDate: '',
      endDate: '',
    };
  });
  if (themeStart) {
    return cascadeSubThemes(normalized, themeStart, themeEnd);
  }
  return normalized;
};

// Generate calendar days matrix with Monday as day 0
function generateMonthDays(year, month) {
  const firstDay = new Date(year, month, 1);
  const startDayOfWeek = (firstDay.getDay() + 6) % 7; // Monday = 0, Sunday = 6
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const days = [];
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // Previous month trailing days
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    const m = month === 0 ? 11 : month - 1;
    const y = month === 0 ? year - 1 : year;
    const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    days.push({
      day: d,
      month: m,
      year: y,
      dateStr,
      isCurrentMonth: false,
      isToday: false,
    });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    days.push({
      day: d,
      month,
      year,
      dateStr,
      isCurrentMonth: true,
      isToday: false,
    });
  }

  // Next month leading days to complete current week row only
  const remaining = (7 - (days.length % 7)) % 7;
  for (let d = 1; d <= remaining; d++) {
    const m = month === 11 ? 0 : month + 1;
    const y = month === 11 ? year + 1 : year;
    const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    days.push({
      day: d,
      month: m,
      year: y,
      dateStr,
      isCurrentMonth: false,
      isToday: false,
    });
  }

  return days;
}

// Custom DatePicker for Theme Date Bounds (enforcing whole-week Monday-start / Sunday-end and format dd/mm/yyyy)
function ThemeDatePicker({
  value,
  onChange,
  disabled,
  type = 'start', // 'start' (must be Monday) or 'end' (must be Sunday)
  minDate,
  maxDate,
  referenceStartDate,
  placeholder = 'dd/mm/yyyy',
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const initialDate = value || referenceStartDate || minDate || new Date().toISOString().slice(0, 10);
  const parts = initialDate.split('-').map(Number);
  const [viewYear, setViewYear] = useState(parts[0] || new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(parts[1] ? parts[1] - 1 : new Date().getMonth());

  useEffect(() => {
    if (open) {
      const dStr = value || referenceStartDate || minDate;
      if (dStr) {
        const p = dStr.split('-').map(Number);
        if (p.length === 3 && !isNaN(p[0]) && !isNaN(p[1])) {
          setViewYear(p[0]);
          setViewMonth(p[1] - 1);
        }
      }
    }
  }, [open, value, referenceStartDate, minDate]);

  const monthDays = useMemo(() => generateMonthDays(viewYear, viewMonth), [viewYear, viewMonth]);

  const handlePrevMonth = (e) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = (e) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleSelectDate = (dateStr) => {
    if (type === 'start') {
      if (!isMonday(dateStr)) return;
      if (minDate && dateStr < minDate) return;
      if (maxDate && dateStr > maxDate) return;
      onChange(dateStr);
      setOpen(false);
    } else if (type === 'end') {
      if (!isSunday(dateStr)) return;
      if (minDate && dateStr < minDate) return;
      if (maxDate && dateStr > maxDate) return;
      onChange(dateStr);
      setOpen(false);
    } else {
      // General date (e.g. deadline)
      if (minDate && dateStr < minDate) return;
      if (maxDate && dateStr > maxDate) return;
      onChange(dateStr);
      setOpen(false);
    }
  };

  const handleQuickWeeks = (weeks) => {
    if (!referenceStartDate) return;
    const targetEnd = addDaysToDate(referenceStartDate, weeks * 7 - 1);
    onChange(targetEnd);
    setOpen(false);
  };

  const displayValue = value ? formatDateVn(value) : '';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            'w-full h-8 px-2.5 bg-background border border-border text-[12.5px] font-mono text-foreground rounded-none outline-none focus:border-primary transition-colors flex items-center justify-between cursor-pointer text-left',
            disabled && 'bg-muted/40 text-muted-foreground cursor-not-allowed',
            !displayValue && 'text-muted-foreground',
          )}
        >
          <span>{displayValue || placeholder}</span>
          <HugeiconsIcon icon={Calendar03Icon} size={14} className="text-muted-foreground shrink-0 ml-1.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-3 rounded-none bg-card border-border shadow-xl z-50" align="start">
        {/* Quick week chips if type === 'end' and referenceStartDate is provided */}
        {type === 'end' && referenceStartDate && (
          <div className="mb-2.5 pb-2.5 border-b border-border/80">
            <div className="text-[11px] font-medium text-muted-foreground mb-1.5 flex items-center justify-between">
              <span>{t('curriculum.quickSelectThemeDuration', 'Chọn nhanh thời lượng chủ đề:')}</span>
            </div>
            <div className="grid grid-cols-5 gap-1">
              {[2, 3, 4, 5, 6].map((w) => {
                const calculatedEnd = addDaysToDate(referenceStartDate, w * 7 - 1);
                const isCurrent = value === calculatedEnd;
                return (
                  <button
                    key={w}
                    type="button"
                    onClick={() => handleQuickWeeks(w)}
                    className={cn(
                      'px-1 py-1 text-[11px] font-medium border text-center transition-colors cursor-pointer',
                      isCurrent
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted/30 border-border hover:bg-muted text-foreground',
                    )}
                    title={`${w} ${t('common.weeks', 'tuần')}: ${formatDateVn(referenceStartDate)} – ${formatDateVn(calculatedEnd)}`}
                  >
                    {w} {t('common.weeks', 'tuần')}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Calendar Header */}
        <div className="flex items-center justify-between pb-2 mb-1 border-b border-border/60">
          <span className="text-[12.5px] font-semibold text-foreground">
            {t('curriculum.monthLabel', 'Tháng')} {viewMonth + 1}/{viewYear}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="size-6 flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} size={14} />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className="size-6 flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
            >
              <HugeiconsIcon icon={ArrowRight01Icon} size={14} />
            </button>
          </div>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-0.5 text-center mb-1">
          {WEEKDAYS.map((wd, idx) => (
            <div
              key={wd}
              className={cn(
                'text-[10.5px] font-semibold py-0.5',
                type === 'start' && idx === 0 && 'text-primary font-bold',
                type === 'end' && idx === 6 && 'text-primary font-bold',
                (type === 'start' && idx !== 0) || (type === 'end' && idx !== 6) ? 'text-muted-foreground/60' : '',
              )}
            >
              {wd}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-0.5">
          {monthDays.map((d, idx) => {
            const isColTarget =
              type === 'start' ? idx % 7 === 0 : type === 'end' ? idx % 7 === 6 : true;
            const isOutBounds = Boolean(
              (minDate && d.dateStr < minDate) || (maxDate && d.dateStr > maxDate),
            );
            const isSelected = value === d.dateStr;
            const isClickable = d.isCurrentMonth && isColTarget && !isOutBounds;

            return (
              <button
                key={d.dateStr + idx}
                type="button"
                disabled={!isClickable}
                onClick={() => isClickable && handleSelectDate(d.dateStr)}
                className={cn(
                  'h-7 text-[11.5px] flex items-center justify-center font-mono transition-colors relative',
                  !d.isCurrentMonth && 'opacity-20 pointer-events-none text-muted-foreground',
                  d.isCurrentMonth && !isColTarget && 'opacity-35 text-muted-foreground cursor-not-allowed',
                  d.isCurrentMonth && isColTarget && isOutBounds && 'opacity-30 text-muted-foreground cursor-not-allowed line-through',
                  d.isCurrentMonth && isColTarget && !isOutBounds && !isSelected && 'hover:bg-primary/10 hover:text-primary font-semibold text-foreground cursor-pointer ring-1 ring-primary/30',
                  isSelected && 'bg-primary text-primary-foreground font-bold ring-1 ring-primary cursor-pointer',
                )}
                title={
                  type === 'start' && idx % 7 !== 0
                    ? t('curriculum.startMustBeMonday', 'Ngày bắt đầu phải là Thứ Hai (cột T2)')
                    : type === 'end' && idx % 7 !== 6
                    ? t('curriculum.endMustBeSunday', 'Ngày kết thúc phải là Chủ Nhật (cột CN)')
                    : t('curriculum.selectDate', 'Chọn ngày {{date}}', { date: formatDateVn(d.dateStr) })
                }
              >
                {d.day}
              </button>
            );
          })}
        </div>

        <div className="mt-2 pt-2 border-t border-border/60 text-[10.5px] text-muted-foreground flex items-center justify-between">
          <span>
            {type === 'start'
              ? t('curriculum.onlySelectMonday', 'Chỉ chọn Thứ Hai (T2)')
              : type === 'end'
              ? t('curriculum.onlySelectSunday', 'Chỉ chọn Chủ Nhật (CN)')
              : t('curriculum.selectDeadlineDate', 'Chọn ngày hạn nộp BGH')}
          </span>
          {type === 'deadline' && value && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
                setOpen(false);
              }}
              className="text-[10.5px] text-destructive hover:underline cursor-pointer"
            >
              {t('curriculum.deleteDeadline', 'Xóa hạn nộp')}
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function CurriculumThemeDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { yearId = '2025-2026', ageGroup = 'nhatre' } = useParams();

  const currentUser = useAuthStore((state) => state.user);
  const isTeacher = isTeacherRole(currentUser?.role);

  const academicYears = useAcademicYearStore((state) => state.academicYears);
  const fetchAcademicYears = useAcademicYearStore((state) => state.fetchAcademicYears);

  useEffect(() => {
    if (academicYears.length === 0 && fetchAcademicYears) {
      fetchAcademicYears();
    }
  }, [academicYears.length, fetchAcademicYears]);

  const matchedYear = useMemo(() => {
    const cleanYear = String(yearId || '').replace('–', '-').replace(/^năm\s*học\s*/i, '').trim();
    return academicYears.find((y) => {
      const yCleanName = String(y.name || '').replace('–', '-').replace(/^năm\s*học\s*/i, '').trim();
      return (
        String(y.id) === String(yearId) ||
        (y.publicId && String(y.publicId) === String(yearId)) ||
        yCleanName === cleanYear ||
        yCleanName.includes(cleanYear) ||
        (cleanYear && String(y.name || '').includes(cleanYear))
      );
    });
  }, [academicYears, yearId]);

  const [isLoading, setIsLoading] = useState(true);
  const [themeSetInfo, setThemeSetInfo] = useState(null);

  const isSchoolYearEnded = useMemo(() => {
    const cleanYear = String(yearId || '').replace('–', '-');
    const isYear2025 = cleanYear.includes('2025') || cleanYear === '1';
    return Boolean(
      matchedYear?.status === 'COMPLETED' ||
      matchedYear?.status === 'ENDED' ||
      themeSetInfo?.isSchoolYearEnded === true ||
      themeSetInfo?.schoolYearStatus === 'COMPLETED' ||
      themeSetInfo?.schoolYearStatus === 'ENDED' ||
      (isYear2025 && (!matchedYear || matchedYear.status !== 'ACTIVE'))
    );
  }, [matchedYear, themeSetInfo, yearId]);
  const [themes, setThemes] = useState([]);
  const [selectedTopicIndex, setSelectedTopicIndex] = useState(-1);
  const [showRightSidebar, setShowRightSidebar] = useState(true);
  const [showMobileTopics, setShowMobileTopics] = useState(false);
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [isExportingThemeExcel, setIsExportingThemeExcel] = useState(false);

  const handlePrintThemePlan = () => {
    const printUrl = planningApi.getThemePlanPrintUrl({ ageGroup });
    window.open(printUrl, '_blank');
  };

  const handleExportThemePlanExcel = async () => {
    try {
      setIsExportingThemeExcel(true);
      const blob = await planningApi.exportThemePlanExcel({ ageGroup });
      downloadBlob(blob, `Ke_Hoach_Phan_Phoi_Chu_De_35_Tuan_${ageGroup}.xlsx`);
      toast.success(t('curriculum.exportTheme35WeeksSuccess', 'Đã xuất kế hoạch phân phối chủ đề 35 tuần ra file Excel thành công'));
    } catch (err) {
      console.error('Export theme plan excel failed:', err);
      toast.error(t('curriculum.exportExcelError', 'Có lỗi xảy ra khi xuất file Excel'));
    } finally {
      setIsExportingThemeExcel(false);
    }
  };

  // Form state for current selected topic
  const [topicName, setTopicName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [submissionDeadline, setSubmissionDeadline] = useState('');
  const [allowLateSubmit, setAllowLateSubmit] = useState(true);
  const [subThemes, setSubThemes] = useState([]);
  const [note, setNote] = useState('');
  const [status, setStatus] = useState('DRAFT');
  const [updatedAt, setUpdatedAt] = useState(() => new Date());
  const [holidays, setHolidays] = useState([]);
  const topicNameInputRef = React.useRef(null);

  // Interactive calendar scheduling state for sub-themes (Two-Click Range Selection)
  const [activeSubThemeIndex, setActiveSubThemeIndex] = useState(null); // index of sub-theme currently being scheduled on calendar
  const [rangeSelectionStart, setRangeSelectionStart] = useState(null); // start date selected on calendar
  const [hoveredCalendarDate, setHoveredCalendarDate] = useState(null); // date hovered for visual range preview

  // Calendar state
  const now = useMemo(() => new Date(), []);
  const initialYear = useMemo(() => {
    const m = (yearId || '').match(/\d{4}/);
    return m ? parseInt(m[0], 10) : new Date().getFullYear();
  }, [yearId]);

  const [calendarYear, setCalendarYear] = useState(() => {
    const m = (yearId || '').match(/\d{4}/);
    return m ? parseInt(m[0], 10) : new Date().getFullYear();
  });
  const [calendarMonth, setCalendarMonth] = useState(8); // September (0-indexed: 8)

  // Auto-sync calendar view to the start date of selected topic, or school year start
  useEffect(() => {
    if (startDate) {
      const parts = startDate.split('-').map(Number);
      if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        setCalendarYear(parts[0]);
        setCalendarMonth(parts[1] - 1);
      }
    } else {
      const m = (yearId || '').match(/\d{4}/);
      if (m) {
        setCalendarYear(parseInt(m[0], 10));
        setCalendarMonth(8);
      }
    }
  }, [startDate, selectedTopicIndex, yearId]);

  // Load theme set details
  useEffect(() => {
    async function fetchDetail() {
      setIsLoading(true);
      try {
        const data = await curriculumApi.getThemeSetDetail({
          year: yearId.replace('-', '–'),
          ageGroup,
        });
        setThemeSetInfo(data.info);
        if (data.info?.updatedAt) {
          setUpdatedAt(data.info.updatedAt);
        }
        if (data.holidays && Array.isArray(data.holidays) && data.holidays.length > 0) {
          setHolidays(data.holidays);
        } else if (data.info?.schoolYearId) {
          academicYearsApi
            .listHolidays(data.info.schoolYearId)
            .then((res) => {
              setHolidays(res.items || res || []);
            })
            .catch(() => {});
        }
        let themeList = data.themes || [];
        const localStatus = localStorage.getItem(`sorak_curriculum_${yearId}_${ageGroup}_status`);
        if (localStatus) {
          themeList = themeList.map((t) => ({ ...t, status: localStatus }));
        }
        setThemes(themeList);
        if (themeList.length > 0) {
          const idx = 0;
          setSelectedTopicIndex(idx);
          loadTopicIntoForm(themeList[idx]);
        } else {
          setSelectedTopicIndex(-1);
          loadTopicIntoForm(null);
        }
      } catch (err) {
        console.warn('Failed to load theme set details:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchDetail();
  }, [yearId, ageGroup]);

  // Lấy thông tin ngày nghỉ lễ / sự kiện theo ngày
  const getHolidayForDate = useCallback(
    (dateStr) => {
      if (!dateStr || !Array.isArray(holidays) || holidays.length === 0) return null;
      return (
        holidays.find((h) => {
          const s = (h.startDate || '').slice(0, 10);
          const e = (h.endDate || '').slice(0, 10);
          return s && e && dateStr >= s && dateStr <= e;
        }) || null
      );
    },
    [holidays],
  );

  const loadTopicIntoForm = (topic) => {
    if (!topic) {
      setTopicName('');
      setStartDate('');
      setEndDate('');
      setSubmissionDeadline('');
      setAllowLateSubmit(true);
      setSubThemes([]);
      setNote('');
      setStatus('DRAFT');
      setActiveSubThemeIndex(null);
      setRangeSelectionStart(null);
      setHoveredCalendarDate(null);
      return;
    }
    setTopicName(topic.name || '');
    setStartDate(topic.startDate || '');
    setEndDate(topic.endDate || '');
    setSubmissionDeadline(topic.submissionDeadline || '');
    setAllowLateSubmit(topic.allowLateSubmit !== undefined ? Boolean(topic.allowLateSubmit) : true);
    setSubThemes(normalizeSubThemes(topic.subThemes, topic.startDate, topic.endDate));
    setNote(topic.note || '');
    setStatus(topic.status || 'DRAFT');
    setActiveSubThemeIndex(null);
    setRangeSelectionStart(null);
    setHoveredCalendarDate(null);
  };

  const handleSelectTopic = (index) => {
    setSelectedTopicIndex(index);
    loadTopicIntoForm(themes[index]);
  };

  // Phím tắt bàn phím ← / → để chuyển chủ đề lớn nhanh khi không focus gõ text
  useEffect(() => {
    const handleKeyDown = (e) => {
      const activeEl = document.activeElement;
      const tagName = activeEl?.tagName?.toLowerCase();
      const isEditing =
        tagName === 'input' ||
        tagName === 'textarea' ||
        tagName === 'select' ||
        activeEl?.isContentEditable;

      if (isEditing) return;

      if (e.key === 'ArrowLeft') {
        if (selectedTopicIndex > 0) {
          e.preventDefault();
          handleSelectTopic(selectedTopicIndex - 1);
        }
      } else if (e.key === 'ArrowRight') {
        if (selectedTopicIndex < themes.length - 1) {
          e.preventDefault();
          handleSelectTopic(selectedTopicIndex + 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedTopicIndex, themes]);

  const selectedTopic = (selectedTopicIndex >= 0 && selectedTopicIndex < themes.length) ? themes[selectedTopicIndex] : null;
  const hasSelectedTopic = Boolean(selectedTopic);

  // Helper tính khoảng ngày hợp lệ cho một nhánh cụ thể
  const getMinMaxForSubTheme = useCallback(
    (index, subThemesList = subThemes, themeStart = startDate, themeEnd = endDate) => {
      const prevBranch = index > 0 ? subThemesList[index - 1] : null;
      const nextBranch = index < subThemesList.length - 1 ? subThemesList[index + 1] : null;

      let minDate = prevBranch?.endDate
        ? addDaysToDate(prevBranch.endDate, 1)
        : themeStart || '';
      if (themeStart && minDate < themeStart) minDate = themeStart;

      let maxDate = nextBranch?.startDate
        ? addDaysToDate(nextBranch.startDate, -1)
        : themeEnd || '';
      if (themeEnd && maxDate > themeEnd) maxDate = themeEnd;

      return { minDate, maxDate };
    },
    [subThemes, startDate, endDate],
  );

  // Kiểm tra chủ đề đã phân bổ đủ thời gian (đã phủ kín đến hết endDate của chủ đề lớn) hoặc đủ số nhánh (tối đa 6 nhánh)
  const isThemeFull = useMemo(() => {
    if (!Array.isArray(subThemes) || subThemes.length === 0) return false;
    if (subThemes.length >= 6) return true;
    if (!endDate) return false;
    const lastBranch = subThemes[subThemes.length - 1];
    if (lastBranch?.endDate && lastBranch.endDate >= endDate) {
      return true;
    }
    return false;
  }, [subThemes, endDate]);

  // Handlers for branch topics (Chủ đề nhánh)
  const handleAddSubTheme = () => {
    if (isSchoolYearEnded) {
      toast.warning('Năm học đã kết thúc. Không thể thêm chủ đề nhánh.');
      return;
    }
    if (isAllPublished) {
      toast.warning(t('curriculum.unpublishToAddSubTheme', 'Bộ chủ đề đã công bố. Vui lòng gỡ công bố ở trang tổng quan để thêm nhánh.'));
      return;
    }
    if (subThemes.length >= 6) {
      toast.warning(t('curriculum.maxSubThemesReached', 'Mỗi chủ đề chỉ được có tối đa 6 chủ đề nhánh.'));
      return;
    }
    if (!startDate || !endDate) {
      toast.warning(t('curriculum.themeMissingDateRange', 'Chủ đề chưa có khoảng thời gian bắt đầu và kết thúc.'));
      return;
    }
    if (isThemeFull) {
      toast.warning(t('curriculum.themeFullyAllocated', 'Chủ đề đã phân bổ đủ thời gian (đến hết {{date}}).', { date: formatDateVn(endDate) }));
      return;
    }
    let nextStart = startDate || '';
    if (subThemes.length > 0) {
      const lastBranch = subThemes[subThemes.length - 1];
      if (lastBranch.endDate) {
        nextStart = addDaysToDate(lastBranch.endDate, 1);
      }
    }
    let nextEnd = nextStart ? addDaysToDate(nextStart, 6) : '';
    if (endDate && nextEnd > endDate) {
      nextEnd = endDate;
    }
    const newBranch = {
      id: `st-${Date.now()}`,
      name: '',
      startDate: nextStart,
      endDate: nextEnd,
    };
    const newIdx = subThemes.length;
    setSubThemes((prev) => [...prev, newBranch]);
    setShowRightSidebar(true);
    setActiveSubThemeIndex(newIdx);
    setRangeSelectionStart(null);
    setHoveredCalendarDate(null);
    toast.info(t('curriculum.addedSubThemeInfo', 'Đã thêm nhánh mới. Bạn có thể chọn ngày trực tiếp trên lịch hoặc bấm "+1 Tuần".'));
  };

  const handleAssignSubThemeWeek = (index, wStart, wEnd) => {
    if (isAllPublished) return;
    setSubThemes((prev) => {
      const updated = [...prev];
      if (!updated[index]) return prev;
      updated[index] = {
        ...updated[index],
        startDate: wStart || '',
        endDate: wEnd || '',
      };
      return updated;
    });
  };

  const handleChangeBranchDuration = (bIdx, targetWeeks) => {
    if (isAllPublished) return;
    if (bIdx !== subThemes.length - 1) {
      toast.warning(t('curriculum.onlyEditLastSubThemeDuration', 'Chỉ được sửa thời lượng cho chủ đề nhánh ở cuối.'));
      return;
    }
    if (targetWeeks < 1 || targetWeeks > 5) {
      toast.warning(t('curriculum.subThemeDurationRangeError', 'Thời lượng chủ đề nhánh phải từ 1 đến 5 tuần (không được là 6 tuần).'));
      return;
    }
    const branch = subThemes[bIdx];
    if (!branch) return;

    // Tính tổng số tuần của chủ đề lớn
    let themeTotalWeeks = 0;
    if (startDate && endDate) {
      const diffDays = Math.round((new Date(endDate) - new Date(startDate)) / 86400000) + 1;
      themeTotalWeeks = Math.round(diffDays / 7);
    }

    // Tính số tuần của các nhánh phía trước
    let precedingWeeks = 0;
    for (let i = 0; i < bIdx; i++) {
      const b = subThemes[i];
      let w = 1;
      if (b?.startDate && b?.endDate) {
        const d = Math.round((new Date(b.endDate) - new Date(b.startDate)) / 86400000) + 1;
        w = Math.min(5, Math.max(1, Math.round(d / 7) || 1));
      }
      precedingWeeks += w;
    }

    // Số nhánh phía sau cần tối thiểu 1 tuần mỗi nhánh
    const remainingBranchesCount = subThemes.length - 1 - bIdx;

    if (themeTotalWeeks > 0) {
      const minNeededForRemaining = remainingBranchesCount * 1;
      const maxAllowed = Math.max(1, Math.min(5, themeTotalWeeks - precedingWeeks - minNeededForRemaining));

      if (targetWeeks > maxAllowed) {
        toast.warning(
          `Với ${subThemes.length} nhánh trong chủ đề ${themeTotalWeeks} tuần, nhánh ${bIdx + 1} tối đa chỉ có thể là ${maxAllowed} tuần để các nhánh còn lại diễn ra liên tục và không vượt quá thời gian chủ đề.`,
        );
        return;
      }
    }

    // Cập nhật và tự động căn chỉnh liên tục tất cả các nhánh để không bị chồng chéo
    let curStart = startDate || subThemes[0]?.startDate || '';
    const updated = subThemes.map((st, idx) => {
      let weeks = 1;
      if (idx === bIdx) {
        weeks = targetWeeks;
      } else if (st.startDate && st.endDate) {
        const d = Math.round((new Date(st.endDate) - new Date(st.startDate)) / 86400000) + 1;
        weeks = Math.min(5, Math.max(1, Math.round(d / 7) || 1));
      }

      let curEnd = '';
      let sDate = '';
      if (curStart && (!endDate || curStart <= endDate)) {
        sDate = curStart;
        curEnd = addDaysToDate(curStart, weeks * 7 - 1);
        if (endDate && curEnd > endDate) {
          curEnd = endDate;
        }
        curStart = addDaysToDate(curEnd, 1);
      }

      return {
        ...st,
        startDate: sDate,
        endDate: curEnd,
      };
    });

    setSubThemes(updated);
    toast.success(
      `Đã cập nhật nhánh ${bIdx + 1} thành ${targetWeeks} tuần. Các nhánh đã được căn chỉnh liên tục, không chồng chéo.`,
    );
  };

  const handleUpdateSubTheme = (index, field, value) => {
    if (isAllPublished) return;
    setSubThemes((prev) => {
      const updated = [...prev];
      const cur = { ...updated[index], [field]: value };
      // Khi người dùng chọn ngày bắt đầu, nếu chưa có ngày kết thúc hoặc ngày kết thúc < ngày bắt đầu, gợi ý ngày kết thúc (+6 ngày)
      if (field === 'startDate' && value) {
        if (!cur.endDate || cur.endDate < value) {
          let suggestedEnd = addDaysToDate(value, 6);
          if (endDate && suggestedEnd > endDate) suggestedEnd = endDate;
          cur.endDate = suggestedEnd;
        }
      }
      updated[index] = cur;
      return updated;
    });
  };

  const handleDeleteSubTheme = (index) => {
    if (isSchoolYearEnded) {
      toast.warning('Năm học đã kết thúc. Không thể xóa chủ đề nhánh.');
      return;
    }
    if (isAllPublished) return;
    if (index !== subThemes.length - 1) {
      toast.warning(t('curriculum.onlyDeleteLastSubTheme', 'Chỉ được xóa chủ đề nhánh ở cuối (xóa dần từ nhánh cuối lên).'));
      return;
    }
    if (activeSubThemeIndex === index) {
      setActiveSubThemeIndex(null);
      setRangeSelectionStart(null);
      setHoveredCalendarDate(null);
    } else if (activeSubThemeIndex !== null && activeSubThemeIndex > index) {
      setActiveSubThemeIndex(activeSubThemeIndex - 1);
    }
    const filtered = subThemes.filter((_, i) => i !== index);
    const cascaded = cascadeSubThemes(filtered, startDate, endDate);
    setSubThemes(cascaded);
    toast.info(t('curriculum.deletedLastSubTheme', 'Đã xóa chủ đề nhánh ở cuối.'));
  };

  // Tự động phân bổ lại thời gian các nhánh khớp chính xác khoảng thời gian của chủ đề lớn
  const handleAutoAlignSubThemes = () => {
    if (isAllPublished || isReadOnly) return;
    if (!startDate || !endDate) {
      toast.warning(t('curriculum.pleaseSetThemeDatesFirst', 'Vui lòng thiết lập ngày bắt đầu và kết thúc của chủ đề chính trước.'));
      return;
    }
    if (!isMonday(startDate) || !isSunday(endDate)) {
      toast.warning(t('curriculum.mainThemeMondaySunday', 'Chủ đề chính phải bắt đầu vào Thứ Hai và kết thúc vào Chủ Nhật.'));
      return;
    }
    if (!Array.isArray(subThemes) || subThemes.length === 0) return;

    const totalDays = Math.round((new Date(endDate) - new Date(startDate)) / 86400000) + 1;
    if (totalDays % 7 !== 0) {
      toast.warning(t('curriculum.themeMustBeWholeWeeks', 'Thời lượng chủ đề ({{days}} ngày) phải là các tuần trọn vẹn (chia hết cho 7 ngày).', { days: totalDays }));
      return;
    }

    const totalWeeks = totalDays / 7;
    // Mỗi nhánh tối đa 5 tuần (không được là 6 tuần), do đó nếu chủ đề từ 6 tuần trở lên cần tối thiểu 2 nhánh
    const minBranchesNeeded = Math.ceil(totalWeeks / 5);
    let workingList = [...subThemes];

    if (workingList.length < minBranchesNeeded) {
      const toAdd = minBranchesNeeded - workingList.length;
      for (let i = 0; i < toAdd; i++) {
        workingList.push({
          id: `st-${Date.now()}-${i}`,
          name: t('curriculum.subThemeDefaultName', 'Chủ đề nhánh {{index}}', { index: workingList.length + 1 }),
          startDate: '',
          endDate: '',
        });
      }
    }

    const count = workingList.length;
    if (count > totalWeeks) {
      toast.error(t('curriculum.subThemesExceedThemeWeeks', 'Số lượng nhánh ({{count}}) nhiều hơn số tuần của chủ đề ({{weeks}} tuần).', { count, weeks: totalWeeks }));
      return;
    }

    // Phân bổ các tuần trọn vẹn (Thứ Hai – Chủ Nhật), mỗi nhánh 1-5 tuần (tối đa 5 tuần)
    const weeksPerBranch = Math.floor(totalWeeks / count);
    let remainderWeeks = totalWeeks % count;

    let curStart = startDate;
    const aligned = workingList.map((st, idx) => {
      const weeks = weeksPerBranch + (remainderWeeks > 0 ? 1 : 0);
      if (remainderWeeks > 0) remainderWeeks--;
      const curEnd = idx === count - 1 ? endDate : addDaysToDate(curStart, weeks * 7 - 1);
      const updated = {
        ...st,
        startDate: curStart,
        endDate: curEnd,
      };
      curStart = addDaysToDate(curEnd, 1);
      return updated;
    });

    setSubThemes(aligned);
    toast.success(
      t('curriculum.alignedSubThemesSuccess', 'Đã tự động căn chỉnh {{count}} chủ đề nhánh theo tuần trọn vẹn ({{start}} – {{end}})', { count: aligned.length, start: formatDateVn(startDate), end: formatDateVn(endDate) }),
    );
  };

  // Kích hoạt / Tắt chế độ chọn ngày trên lịch cho một nhánh
  const handleToggleSelectSubThemeOnCalendar = (bIdx) => {
    if (isAllPublished) {
      toast.warning(t('curriculum.unpublishToEditDates', 'Bộ chủ đề đã công bố. Vui lòng bấm "Gỡ công bố" để chỉnh sửa thời gian.'));
      return;
    }
    if (activeSubThemeIndex === bIdx) {
      setActiveSubThemeIndex(null);
      setRangeSelectionStart(null);
      setHoveredCalendarDate(null);
    } else {
      setShowRightSidebar(true);
      setActiveSubThemeIndex(bIdx);
      setRangeSelectionStart(null);
      setHoveredCalendarDate(null);

      // Tự động chuyển trang lịch sang tháng của nhánh
      const branch = subThemes[bIdx];
      const targetDate = branch?.startDate || branch?.endDate || startDate;
      if (targetDate) {
        const parts = targetDate.split('-').map(Number);
        if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          setCalendarYear(parts[0]);
          setCalendarMonth(parts[1] - 1);
        }
      }
    }
  };

  // Gán nhanh 1 tuần (+6 ngày từ ngày bắt đầu / ngày hợp lệ)
  const handleQuickAssignWeek = (bIdx) => {
    if (isAllPublished) {
      toast.warning('Bộ chủ đề đã công bố. Vui lòng bấm "Gỡ công bố" để chỉnh sửa thời gian.');
      return;
    }
    const branch = subThemes[bIdx];
    if (!branch) return;

    const { minDate, maxDate } = getMinMaxForSubTheme(bIdx, subThemes, startDate, endDate);
    const start = branch.startDate || minDate;
    if (!start) {
      toast.warning(t('curriculum.noValidStartDate', 'Chưa có mốc ngày bắt đầu hợp lệ.'));
      return;
    }

    let end = addDaysToDate(start, 6);
    if (maxDate && end > maxDate) {
      end = maxDate;
    }

    setSubThemes((prev) => {
      const updated = [...prev];
      updated[bIdx] = {
        ...updated[bIdx],
        startDate: start,
        endDate: end,
      };
      return cascadeSubThemes(updated, startDate, endDate);
    });

    setRangeSelectionStart(null);
    setHoveredCalendarDate(null);
    toast.success(t('curriculum.assignedOneWeekSuccess', 'Đã gán 1 tuần ({{start}} – {{end}}) cho nhánh {{index}}', { start: formatDateVn(start), end: formatDateVn(end), index: bIdx + 1 }));

    // Nếu đang chọn nhánh này trên lịch, chuyển sang nhánh tiếp theo nếu có
    if (activeSubThemeIndex === bIdx) {
      if (bIdx + 1 < subThemes.length) {
        setActiveSubThemeIndex(bIdx + 1);
      } else {
        setActiveSubThemeIndex(null);
      }
    }
  };

  // Xử lý 2 lần click trên lịch (Click 1: ngày bắt đầu -> Click 2: ngày kết thúc)
  const handleCalendarDateSelectForSubTheme = (dateStr) => {
    if (activeSubThemeIndex === null || isAllPublished) return;
    const curBranch = subThemes[activeSubThemeIndex];
    if (!curBranch) return;

    const { minDate, maxDate } = getMinMaxForSubTheme(activeSubThemeIndex, subThemes, startDate, endDate);

    if (minDate && dateStr < minDate) {
      toast.warning(`Ngày chọn (${formatDateVn(dateStr)}) phải từ ${formatDateVn(minDate)} trở đi (nối tiếp nhánh trước).`);
      return;
    }
    if (maxDate && dateStr > maxDate) {
      toast.warning(`Ngày chọn (${formatDateVn(dateStr)}) không được vượt quá ngày kết thúc chủ đề (${formatDateVn(maxDate)}).`);
      return;
    }

    // Lần click 1: Chọn ngày bắt đầu
    if (!rangeSelectionStart) {
      if (!isMonday(dateStr)) {
        toast.warning(t('curriculum.subThemeMondayStart', 'Ngày bắt đầu nhánh phải là Thứ Hai (cột T2 trên lịch).'));
        return;
      }
      setRangeSelectionStart(dateStr);
      setHoveredCalendarDate(dateStr);
      handleUpdateSubTheme(activeSubThemeIndex, 'startDate', dateStr);
      let suggestedEnd = addDaysToDate(dateStr, 6);
      if (maxDate && suggestedEnd > maxDate) suggestedEnd = maxDate;
      handleUpdateSubTheme(activeSubThemeIndex, 'endDate', suggestedEnd);
      toast.info(`Bước 1: Đã chọn ngày bắt đầu ${formatDateVn(dateStr)}. Hãy bấm ngày kết thúc (cột CN) trên lịch.`);
      return;
    }

    // Lần click 2: Chọn ngày kết thúc
    if (dateStr < rangeSelectionStart) {
      // Người dùng bấm ngày sớm hơn -> Đổi lại ngày bắt đầu
      if (!isMonday(dateStr)) {
        toast.warning('Ngày bắt đầu nhánh phải là Thứ Hai (cột T2 trên lịch).');
        return;
      }
      setRangeSelectionStart(dateStr);
      setHoveredCalendarDate(dateStr);
      handleUpdateSubTheme(activeSubThemeIndex, 'startDate', dateStr);
      toast.info(`Đã đổi ngày bắt đầu thành ${formatDateVn(dateStr)}. Tiếp tục bấm ngày kết thúc.`);
      return;
    }

    if (!isSunday(dateStr)) {
      toast.warning(t('curriculum.subThemeSundayEnd', 'Ngày kết thúc nhánh phải là Chủ Nhật (cột CN trên lịch).'));
      return;
    }

    // Hoàn tất khoảng thời gian
    const finalStart = rangeSelectionStart;
    const finalEnd = dateStr;
    setSubThemes((prev) => {
      const next = [...prev];
      next[activeSubThemeIndex] = {
        ...next[activeSubThemeIndex],
        startDate: finalStart,
        endDate: finalEnd,
      };
      return cascadeSubThemes(next, startDate, endDate);
    });

    setRangeSelectionStart(null);
    setHoveredCalendarDate(null);
    toast.success(`Đã xếp ngày cho nhánh ${activeSubThemeIndex + 1}: ${formatDateVn(finalStart)} – ${formatDateVn(finalEnd)}`);

    // Tự động chuyển sang nhánh tiếp theo nếu có và chưa có ngày
    if (activeSubThemeIndex + 1 < subThemes.length) {
      const nextBranch = subThemes[activeSubThemeIndex + 1];
      if (!nextBranch.startDate || !nextBranch.endDate) {
        setActiveSubThemeIndex(activeSubThemeIndex + 1);
        toast.info(`Chuyển sang chọn ngày cho nhánh ${activeSubThemeIndex + 2}`);
        return;
      }
    }
    setActiveSubThemeIndex(null);
  };

  // Helper tìm chủ đề chứa ngày bất kỳ
  const getThemeForDate = useCallback(
    (dateStr) => {
      if (!dateStr || !Array.isArray(themes)) return null;
      return (
        themes.find((t) => {
          if (!t.startDate || !t.endDate) return false;
          const s = t.startDate.slice(0, 10);
          const e = t.endDate.slice(0, 10);
          return dateStr >= s && dateStr <= e;
        }) || null
      );
    },
    [themes],
  );

  // Helper tìm chủ đề nhánh đang diễn ra trong ngày
  const getSubThemeForDate = useCallback(
    (dateStr) => {
      if (!dateStr || !Array.isArray(subThemes)) return null;
      return (
        subThemes.find(
          (st) =>
            st.startDate &&
            st.endDate &&
            dateStr >= st.startDate &&
            dateStr <= st.endDate,
        ) || null
      );
    },
    [subThemes],
  );

  // Publish / Unpublish entire theme set (Unified: công bố thì full, nháp thì hết)
  const isAllPublished = useMemo(
    () => themes.length > 0 && themes.every((t) => t.status === 'PUBLISHED'),
    [themes],
  );
  const isReadOnly = Boolean(isAllPublished || isTeacher || isSchoolYearEnded);

  // Kiểm tra có thay đổi so với dữ liệu gốc của chủ đề đang chọn hay không
  const hasChanges = useMemo(() => {
    if (!selectedTopic) return false;
    const origName = selectedTopic.name || '';
    const origStart = selectedTopic.startDate || '';
    const origEnd = selectedTopic.endDate || '';
    const origNote = selectedTopic.note || '';
    const origSubThemes = normalizeSubThemes(selectedTopic.subThemes);

    const isSubChanged =
      subThemes.length !== origSubThemes.length ||
      subThemes.some((s, idx) => {
        const orig = origSubThemes[idx] || {};
        return (
          (s.name || '').trim() !== (orig.name || '').trim() ||
          (s.startDate || '') !== (orig.startDate || '') ||
          (s.endDate || '') !== (orig.endDate || '')
        );
      });

    return (
      topicName.trim() !== origName.trim() ||
      startDate !== origStart ||
      endDate !== origEnd ||
      (submissionDeadline || '') !== (selectedTopic.submissionDeadline || '') ||
      (allowLateSubmit ?? true) !== (selectedTopic.allowLateSubmit ?? true) ||
      (note || '').trim() !== origNote.trim() ||
      isSubChanged
    );
  }, [selectedTopic, topicName, startDate, endDate, submissionDeadline, allowLateSubmit, note, subThemes]);

  // Kiểm tra trùng lặp tên chủ đề trong cùng bộ chủ đề
  const isDuplicateThemeName = useMemo(() => {
    const current = topicName.trim().toLowerCase();
    if (!current) return false;
    return themes.some(
      (t, idx) => idx !== selectedTopicIndex && (t.name || '').trim().toLowerCase() === current,
    );
  }, [topicName, themes, selectedTopicIndex]);

  // Kiểm tra trùng lặp tên chủ đề nhánh trong cùng một chủ đề
  const duplicateSubThemeIndexes = useMemo(() => {
    const counts = {};
    subThemes.forEach((st) => {
      const name = (st.name || '').trim().toLowerCase();
      if (name) {
        counts[name] = (counts[name] || 0) + 1;
      }
    });
    const duplicates = new Set();
    subThemes.forEach((st, idx) => {
      const name = (st.name || '').trim().toLowerCase();
      if (name && counts[name] > 1) {
        duplicates.add(idx);
      }
    });
    return duplicates;
  }, [subThemes]);

  // Khung thời gian năm học (để phân biệt ngày trong năm học vs ngoài năm học)
  const academicYearBounds = useMemo(() => {
    // 1. Phân tích năm từ yearId (ví dụ "2026-2027" -> 2026 và 2027)
    const yearMatch = (yearId || '').match(/\d{4}/g);
    let startYear = 2026;
    let endYear = 2027;
    if (yearMatch && yearMatch.length >= 2) {
      startYear = parseInt(yearMatch[0], 10);
      endYear = parseInt(yearMatch[1], 10);
    } else if (yearMatch && yearMatch.length === 1) {
      startYear = parseInt(yearMatch[0], 10);
      endYear = startYear + 1;
    }

    // Nếu themeSetInfo có startDate / endDate và khớp năm học được chọn
    if (
      themeSetInfo?.startDate &&
      themeSetInfo?.endDate &&
      /^\d{4}-\d{2}-\d{2}$/.test(themeSetInfo.startDate) &&
      /^\d{4}-\d{2}-\d{2}$/.test(themeSetInfo.endDate) &&
      parseInt(themeSetInfo.endDate.slice(0, 4), 10) >= endYear
    ) {
      return {
        start: themeSetInfo.startDate,
        end: themeSetInfo.endDate,
      };
    }

    return {
      start: `${startYear}-09-01`,
      end: `${endYear}-05-31`,
    };
  }, [yearId, themeSetInfo]);

  // Kiểm tra đã đạt tối đa số lượng chủ đề lớn trong năm học (tối đa 20 chủ đề)
  const isAcademicYearFull = useMemo(() => {
    if (!themes || themes.length === 0) return false;
    if (themes.length >= 20) return true;
    return false;
  }, [themes]);

  // Giới hạn các ngày hữu dụng cho chủ đề đang chọn (themeDateBounds)
  const themeDateBounds = useMemo(() => {
    const academicYearStart = academicYearBounds.start || '2026-09-01';
    const academicYearEnd = academicYearBounds.end || '2027-05-31';

    const prevTopic = selectedTopicIndex > 0 ? themes[selectedTopicIndex - 1] : null;
    const nextTopic =
      selectedTopicIndex >= 0 && selectedTopicIndex < themes.length - 1 ? themes[selectedTopicIndex + 1] : null;

    // 1. minAllowedStart:
    // - Sau chủ đề liền trước (prevTopic.endDate + 1 ngày).
    // - Nếu là chủ đề đầu tiên: bắt buộc từ ngày đầu năm học (academicYearStart).
    let minAllowedStart = academicYearStart;
    if (prevTopic?.endDate) {
      minAllowedStart = addDaysToDate(prevTopic.endDate, 1);
      if (minAllowedStart < academicYearStart) minAllowedStart = academicYearStart;
    }
    if (minAllowedStart && !isMonday(minAllowedStart)) {
      minAllowedStart = getMondayOfWeek(minAllowedStart);
    }

    // 2. maxAllowedEnd:
    // - Khi đã xuất bản (isAllPublished): chặn chặt chẽ trước chủ đề liền sau (nextTopic.startDate - 1 ngày).
    // - Khi là BẢN NHÁP (!isAllPublished): Cho phép chọn ngày kết thúc trong phạm vi năm học (academicYearEnd),
    //   đáp ứng yêu cầu thời lượng 2–6 tuần (14–42 ngày).
    let maxAllowedEnd = academicYearEnd;
    if (isAllPublished && nextTopic?.startDate) {
      maxAllowedEnd = addDaysToDate(nextTopic.startDate, -1);
      if (maxAllowedEnd > academicYearEnd) maxAllowedEnd = academicYearEnd;
    }

    // 3. Ràng buộc với startDate:
    let minAllowedEnd = startDate ? addDaysToDate(startDate, 13) : (minAllowedStart ? addDaysToDate(minAllowedStart, 13) : academicYearStart);

    if (startDate) {
      const max6Weeks = addDaysToDate(startDate, 41);
      if (maxAllowedEnd > max6Weeks) {
        maxAllowedEnd = max6Weeks;
      }
    }

    let maxAllowedStart = endDate ? addDaysToDate(endDate, -13) : maxAllowedEnd;
    if (maxAllowedEnd && maxAllowedStart > maxAllowedEnd) {
      maxAllowedStart = maxAllowedEnd;
    }

    // Đảm bảo không bao giờ minAllowedEnd > maxAllowedEnd do lỗi dữ liệu
    if (minAllowedEnd && maxAllowedEnd && minAllowedEnd > maxAllowedEnd) {
      maxAllowedEnd = academicYearEnd;
    }

    return {
      academicYearStart,
      academicYearEnd,
      minAllowedStart,
      maxAllowedStart,
      minAllowedEnd,
      maxAllowedEnd,
      prevTopicName: prevTopic?.name,
      prevTopicEndDate: prevTopic?.endDate,
      nextTopicName: nextTopic?.name,
      nextTopicStartDate: nextTopic?.startDate,
    };
  }, [academicYearBounds, selectedTopicIndex, themes, subThemes, startDate, endDate, isAllPublished]);

  const handleStartDateChange = (val) => {
    if (isAllPublished) return;
    if (!val) {
      setStartDate('');
      return;
    }

    if (!isMonday(val)) {
      toast.error(t('curriculum.mainThemeMondayStartError', 'Ngày bắt đầu chủ đề phải là Thứ Hai (đầu tuần).'));
      return;
    }

    // Cảnh báo nếu thay đổi làm thời gian nhánh nằm ngoài chủ đề lớn
    if (val && Array.isArray(subThemes) && subThemes.length > 0) {
      const hasBranchOutside = subThemes.some((b) => (b.startDate && b.startDate < val) || (b.endDate && b.endDate < val));
      if (hasBranchOutside) {
        toast.warning(
          'Ngày bắt đầu chủ đề lớn đã thay đổi. Có chủ đề nhánh nằm ngoài khoảng thời gian này, vui lòng điều chỉnh lại thời gian các chủ đề nhánh.',
        );
      }
    }

    // 1. Ngoại lệ: Nằm ngoài năm học
    if (themeDateBounds.academicYearStart && val < themeDateBounds.academicYearStart) {
      toast.error(
        `Ngày bắt đầu (${formatDateVn(val)}) không được nằm ngoài năm học (năm học bắt đầu từ ngày ${formatDateVn(themeDateBounds.academicYearStart)}).`,
      );
      return;
    }
    if (themeDateBounds.academicYearEnd && val > themeDateBounds.academicYearEnd) {
      toast.error(
        `Ngày bắt đầu (${formatDateVn(val)}) không được sau ngày kết thúc năm học (${formatDateVn(themeDateBounds.academicYearEnd)}).`,
      );
      return;
    }

    // 2. Ngoại lệ: Nằm trong hoặc trước chủ đề liền trước
    if (themeDateBounds.prevTopicEndDate && val <= themeDateBounds.prevTopicEndDate) {
      toast.error(
        `Ngày bắt đầu không được nằm trong hoặc trước chủ đề trước ("${themeDateBounds.prevTopicName}" kết thúc ngày ${formatDateVn(themeDateBounds.prevTopicEndDate)}). Ngày sớm nhất cho phép là ${formatDateVn(themeDateBounds.minAllowedStart)}.`,
      );
      return;
    }

    // 3. Ngoại lệ: Đè lên hoặc sau chủ đề tiếp theo (chỉ kiểm tra khi đã xuất bản)
    if (isAllPublished && themeDateBounds.nextTopicStartDate && val >= themeDateBounds.nextTopicStartDate) {
      toast.error(
        `Ngày bắt đầu không được đè lên hoặc sau chủ đề tiếp theo ("${themeDateBounds.nextTopicName}" bắt đầu ngày ${formatDateVn(themeDateBounds.nextTopicStartDate)}).`,
      );
      return;
    }

    setStartDate(val);
    let targetEnd = endDate;

    // Tự động điều chỉnh endDate nếu chưa có hoặc không khớp tuần (mặc định gợi ý 3 tuần = 21 ngày)
    if (!endDate || endDate < val) {
      const defaultEnd = addDaysToDate(val, 20); // 3 weeks
      targetEnd = defaultEnd;
      setEndDate(defaultEnd);
      toast.info(`Đã đặt ngày kết thúc là ${formatDateVn(defaultEnd)} (3 tuần).`);
    } else {
      const diffDays = Math.round((new Date(endDate) - new Date(val)) / 86400000) + 1;
      if (diffDays < 14 || diffDays > 42 || diffDays % 7 !== 0) {
        const defaultEnd = addDaysToDate(val, 20); // 3 weeks
        targetEnd = defaultEnd;
        setEndDate(defaultEnd);
        toast.info(`Đã điều chỉnh ngày kết thúc thành ${formatDateVn(defaultEnd)} (3 tuần).`);
      }
    }

    if (Array.isArray(subThemes) && subThemes.length > 0) {
      setSubThemes((prev) => cascadeSubThemes(prev, val, targetEnd));
    }
  };

  const handleEndDateChange = (val) => {
    if (isAllPublished) return;
    if (!val) {
      setEndDate('');
      return;
    }

    if (!isSunday(val)) {
      toast.error(t('curriculum.mainThemeSundayEndError', 'Ngày kết thúc chủ đề phải là Chủ Nhật (cuối tuần).'));
      return;
    }

    // Cảnh báo nếu thay đổi làm thời gian nhánh nằm ngoài chủ đề lớn
    if (val && Array.isArray(subThemes) && subThemes.length > 0) {
      const hasBranchOutside = subThemes.some((b) => (b.startDate && b.startDate > val) || (b.endDate && b.endDate > val));
      if (hasBranchOutside) {
        toast.warning(
          'Ngày kết thúc chủ đề lớn đã thay đổi. Có chủ đề nhánh nằm ngoài khoảng thời gian này, vui lòng điều chỉnh lại thời gian các chủ đề nhánh.',
        );
      }
    }

    // 1. Ngoại lệ: Nằm ngoài năm học
    if (themeDateBounds.academicYearEnd && val > themeDateBounds.academicYearEnd) {
      toast.error(
        `Ngày kết thúc (${formatDateVn(val)}) không được nằm ngoài năm học (năm học kết thúc ngày ${formatDateVn(themeDateBounds.academicYearEnd)}).`,
      );
      return;
    }
    if (themeDateBounds.academicYearStart && val < themeDateBounds.academicYearStart) {
      toast.error(
        `Ngày kết thúc (${formatDateVn(val)}) không được trước ngày bắt đầu năm học (${formatDateVn(themeDateBounds.academicYearStart)}).`,
      );
      return;
    }

    // 2. Ngoại lệ: Trước ngày bắt đầu của chính chủ đề
    if (startDate && val < startDate) {
      toast.error(
        `Ngày kết thúc (${formatDateVn(val)}) không được trước ngày bắt đầu (${formatDateVn(startDate)}).`,
      );
      return;
    }

    // 3. Ngoại lệ: Đè lên hoặc sau chủ đề tiếp theo (chỉ kiểm tra khi đã xuất bản)
    if (isAllPublished && themeDateBounds.nextTopicStartDate && val >= themeDateBounds.nextTopicStartDate) {
      toast.error(
        `Ngày kết thúc không được đè lên hoặc sau chủ đề tiếp theo ("${themeDateBounds.nextTopicName}" bắt đầu ngày ${formatDateVn(themeDateBounds.nextTopicStartDate)}). Ngày muộn nhất cho phép là ${formatDateVn(themeDateBounds.maxAllowedEnd)}.`,
      );
      return;
    }

    // 4. Ngoại lệ: Nằm trong hoặc trước chủ đề liền trước
    if (themeDateBounds.prevTopicEndDate && val <= themeDateBounds.prevTopicEndDate) {
      toast.error(
        `Ngày kết thúc không được nằm trong hoặc trước chủ đề trước ("${themeDateBounds.prevTopicName}" kết thúc ngày ${formatDateVn(themeDateBounds.prevTopicEndDate)}).`,
      );
      return;
    }

    // 5. Kiểm tra thời lượng chủ đề tối thiểu 2 tuần (14 ngày), tối đa 6 tuần (42 ngày), chia hết cho 7
    if (startDate && val) {
      const diffDays = Math.round((new Date(val) - new Date(startDate)) / 86400000) + 1;
      if (diffDays < 14) {
        toast.warning(`Thời lượng chủ đề tối thiểu là 2 tuần (14 ngày). Hiện tại là ${diffDays} ngày.`);
        return;
      }
      if (diffDays > 42) {
        toast.warning(`Thời lượng chủ đề tối đa là 6 tuần (42 ngày). Hiện tại là ${diffDays} ngày.`);
        return;
      }
      if (diffDays % 7 !== 0) {
        toast.error(`Thời lượng chủ đề phải là các tuần trọn vẹn (chia hết cho 7 ngày). Hiện tại là ${diffDays} ngày.`);
        return;
      }
    }

    setEndDate(val);
  };

  // Kiểm tra chủ đề còn ngày nào chưa được xếp nhánh hay không (chỉ áp dụng khi đã có chủ đề nhánh)
  const hasUnassignedDaysInTheme = useMemo(() => {
    if (!startDate || !endDate) return false;
    if (!Array.isArray(subThemes) || subThemes.length === 0) return false;
    for (let i = 0; i < subThemes.length; i++) {
      const cur = subThemes[i];
      if (!cur.name?.trim() || !cur.startDate || !cur.endDate) return true;
      if (i === 0 && cur.startDate !== startDate) return true;
      if (i > 0) {
        const prev = subThemes[i - 1];
        const expectedStart = addDaysToDate(prev.endDate, 1);
        if (cur.startDate !== expectedStart) return true;
      }
    }
    const last = subThemes[subThemes.length - 1];
    if (!last?.endDate || last.endDate !== endDate) return true;
    return false;
  }, [startDate, endDate, subThemes]);

  // Cho phép lưu khi có thay đổi và không ở chế độ chỉ đọc
  const canSave = !isReadOnly && hasChanges;

  // Save changes to current topic
  const handleSaveTopic = async (isSilent = false) => {
    if (isTeacher || isReadOnly || isSaving) return;
    if (!topicName.trim()) {
      if (!isSilent) toast.error(t('curriculum.topicNameRequired', 'Tên chủ đề không được để trống.'));
      return;
    }
    if (isDuplicateThemeName) {
      if (!isSilent) toast.error(t('curriculum.themeNameExistsDesc', 'Tên chủ đề đã tồn tại trong bộ chủ đề này. Vui lòng nhập tên khác.'));
      return;
    }
    if (duplicateSubThemeIndexes.size > 0) {
      if (!isSilent) toast.error(t('curriculum.subThemeNameExistsDesc', 'Tên chủ đề nhánh đã tồn tại trong chủ đề này. Vui lòng nhập tên khác.'));
      return;
    }
    if (!startDate || !endDate) {
      if (!isSilent) toast.error(t('curriculum.missingDatesError', 'Vui lòng chọn đầy đủ ngày bắt đầu và ngày kết thúc.'));
      return;
    }
    if (startDate > endDate) {
      if (!isSilent) toast.error('Ngày bắt đầu không được sau ngày kết thúc.');
      return;
    }

    // Ngoại lệ: Nằm ngoài năm học
    if (themeDateBounds.academicYearStart && startDate < themeDateBounds.academicYearStart) {
      if (!isSilent) toast.error(`Ngày bắt đầu (${formatDateVn(startDate)}) không được trước ngày bắt đầu năm học (${formatDateVn(themeDateBounds.academicYearStart)}).`);
      return;
    }
    if (themeDateBounds.academicYearEnd && endDate > themeDateBounds.academicYearEnd) {
      if (!isSilent) toast.error(`Ngày kết thúc (${formatDateVn(endDate)}) không được sau ngày kết thúc năm học (${formatDateVn(themeDateBounds.academicYearEnd)}).`);
      return;
    }

    // Kiểm tra thời lượng chủ đề tối thiểu 2 tuần (14 ngày), tối đa 6 tuần (42 ngày)
    const diffDays = Math.round((new Date(endDate) - new Date(startDate)) / 86400000) + 1;
    if (diffDays < 14) {
      if (!isSilent) toast.error(`Thời lượng chủ đề tối thiểu là 2 tuần (14 ngày). Hiện tại là ${diffDays} ngày.`);
      return;
    }
    if (diffDays > 42) {
      if (!isSilent) toast.error(`Thời lượng chủ đề tối đa là 6 tuần (42 ngày). Hiện tại là ${diffDays} ngày.`);
      return;
    }

    // Ràng buộc tuần chuẩn: Chủ đề phải bắt đầu Thứ Hai và kết thúc Chủ Nhật
    if (!isMonday(startDate)) {
      if (!isSilent) toast.error(`Ngày bắt đầu chủ đề (${formatDateVn(startDate)}) phải là Thứ Hai.`);
      return;
    }
    if (!isSunday(endDate)) {
      if (!isSilent) toast.error(`Ngày kết thúc chủ đề (${formatDateVn(endDate)}) phải là Chủ Nhật.`);
      return;
    }
    if (diffDays % 7 !== 0) {
      if (!isSilent) toast.error(`Thời lượng chủ đề (${diffDays} ngày) phải là các tuần trọn vẹn (chia hết cho 7 ngày).`);
      return;
    }

    if (themeDateBounds.minAllowedStart && startDate < themeDateBounds.minAllowedStart) {
      if (!isSilent) {
        toast.error(
          `Ngày bắt đầu (${formatDateVn(startDate)}) không được trước ${formatDateVn(themeDateBounds.minAllowedStart)}${themeDateBounds.prevTopicName ? ` (sau chủ đề "${themeDateBounds.prevTopicName}")` : ''
          }.`,
        );
      }
      return;
    }

    if (isAllPublished && themeDateBounds.maxAllowedEnd && endDate > themeDateBounds.maxAllowedEnd) {
      if (!isSilent) {
        toast.error(
          `Ngày kết thúc (${formatDateVn(endDate)}) không được sau ${formatDateVn(themeDateBounds.maxAllowedEnd)}${themeDateBounds.nextTopicName ? ` (trước chủ đề "${themeDateBounds.nextTopicName}")` : ''
          }.`,
        );
      }
      return;
    }

    // Chuẩn hóa tên nhánh: nếu chưa nhập thì đặt tên mặc định
    const preparedSubThemes = subThemes.map((st, idx) => ({
      ...st,
      name: (st.name || '').trim() || `Chủ đề nhánh ${idx + 1}`,
    }));

    // Kiểm tra không trùng tên chủ đề nhánh
    const seenBranchNames = new Set();
    for (const b of preparedSubThemes) {
      const lower = b.name.toLowerCase();
      if (seenBranchNames.has(lower)) {
        if (!isSilent) toast.error('Tên chủ đề nhánh đã tồn tại trong chủ đề này. Vui lòng nhập tên khác.');
        return;
      }
      seenBranchNames.add(lower);
    }

    // Validate các chủ đề nhánh
    if (preparedSubThemes.length > 0) {
      if (startDate && preparedSubThemes[0].startDate && preparedSubThemes[0].startDate !== startDate) {
        if (!isSilent) toast.error(`Nhánh đầu tiên ("${preparedSubThemes[0].name}") phải bắt đầu từ ngày bắt đầu chủ đề chính (${formatDateVn(startDate)}).`);
        return;
      }
      const lastBranch = preparedSubThemes[preparedSubThemes.length - 1];
      if (isAllPublished && endDate && lastBranch.endDate !== endDate) {
        if (!isSilent) toast.error(`Nhánh cuối cùng ("${lastBranch.name}") phải kết thúc vào ngày kết thúc chủ đề chính (${formatDateVn(endDate)}).`);
        return;
      }
    }

    for (let i = 0; i < preparedSubThemes.length; i++) {
      const cur = preparedSubThemes[i];
      if (cur.startDate && cur.endDate) {
        if (cur.startDate > cur.endDate) {
          if (!isSilent) toast.error(`Chủ đề nhánh "${cur.name}": Ngày bắt đầu không được sau ngày kết thúc.`);
          return;
        }
        if (startDate && cur.startDate < startDate) {
          if (!isSilent) {
            toast.error(
              `Chủ đề nhánh "${cur.name}": Ngày bắt đầu (${formatDateVn(cur.startDate)}) không được trước ngày bắt đầu chủ đề chính (${formatDateVn(startDate)}).`,
            );
          }
          return;
        }
        if (endDate && cur.endDate > endDate) {
          if (!isSilent) {
            toast.error(
              `Chủ đề nhánh "${cur.name}": Ngày kết thúc (${formatDateVn(cur.endDate)}) không được sau ngày kết thúc chủ đề chính (${formatDateVn(endDate)}).`,
            );
          }
          return;
        }
        if (!isMonday(cur.startDate)) {
          if (!isSilent) toast.error(`Chủ đề nhánh số ${i + 1} ("${cur.name}"): Ngày bắt đầu (${formatDateVn(cur.startDate)}) phải là Thứ Hai.`);
          return;
        }
        if (!isSunday(cur.endDate)) {
          if (!isSilent) toast.error(`Chủ đề nhánh số ${i + 1} ("${cur.name}"): Ngày kết thúc (${formatDateVn(cur.endDate)}) phải là Chủ Nhật.`);
          return;
        }
        const stDiffMs = new Date(cur.endDate) - new Date(cur.startDate);
        const stDiffDays = Math.round(stDiffMs / 86400000) + 1;
        if (stDiffDays % 7 !== 0) {
          if (!isSilent) toast.error(`Chủ đề nhánh số ${i + 1} ("${cur.name}"): Thời lượng (${stDiffDays} ngày) phải là các tuần trọn vẹn (chia hết cho 7 ngày).`);
          return;
        }
        if (i > 0) {
          const prev = preparedSubThemes[i - 1];
          if (prev.endDate) {
            const expectedStart = addDaysToDate(prev.endDate, 1);
            if (cur.startDate !== expectedStart) {
              if (!isSilent) {
                toast.error(
                  `Chủ đề nhánh số ${i + 1} ("${cur.name}") phải bắt đầu liền kề vào Thứ Hai (${formatDateVn(expectedStart)}) ngay sau nhánh số ${i} ("${prev.name}").`,
                );
              }
              return;
            }
          }
        }
      }
    }

    setIsSaving(true);
    const updatedThemes = [...themes];
    if (updatedThemes[selectedTopicIndex]) {
      // Sắp xếp tự nhiên theo ngày bắt đầu
      const sortedSubThemes = preparedSubThemes
        .slice()
        .sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));

      updatedThemes[selectedTopicIndex] = {
        ...updatedThemes[selectedTopicIndex],
        name: topicName.trim(),
        startDate,
        endDate,
        submissionDeadline: submissionDeadline || null,
        allowLateSubmit: allowLateSubmit ?? true,
        subThemes: sortedSubThemes,
        note,
      };

      setThemes(updatedThemes);
      setSubThemes(sortedSubThemes);
      setUpdatedAt(new Date());

      try {
        const res = await curriculumApi.updateThemeSetDetail({
          year: yearId.replace('-', '–'),
          ageGroup,
          themes: updatedThemes,
        });
        if (res?.themes && Array.isArray(res.themes)) {
          setThemes(res.themes);
        }
        setLastSavedAt(new Date());
        if (!isSilent) {
          toast.success(`Đã lưu thay đổi cho chủ đề "${topicName.trim()}"`);
        }
      } catch (err) {
        console.warn('Failed to save themes on server:', err);
        if (!isSilent) {
          toast.error(err?.response?.data?.message || err?.message || 'Lỗi khi lưu dữ liệu lên máy chủ.');
        }
      } finally {
        setIsSaving(false);
      }
    }
  };

  // Tự động lưu chủ đề khi có thay đổi hợp lệ (Debounced auto-save)
  useEffect(() => {
    if (
      isTeacher ||
      isReadOnly ||
      !hasChanges ||
      isSaving ||
      isDuplicateThemeName ||
      duplicateSubThemeIndexes.size > 0
    ) {
      return;
    }
    if (!topicName.trim() || !startDate || !endDate || startDate > endDate) return;

    const timer = setTimeout(() => {
      handleSaveTopic(true);
    }, 1200);

    return () => clearTimeout(timer);
  }, [
    topicName,
    startDate,
    endDate,
    submissionDeadline,
    allowLateSubmit,
    subThemes,
    note,
    hasChanges,
    isTeacher,
    isReadOnly,
    isSaving,
    isDuplicateThemeName,
    duplicateSubThemeIndexes,
  ]);

  const handleTogglePublish = async () => {
    if (isSchoolYearEnded) {
      toast.warning('Năm học đã kết thúc. Không thể thay đổi trạng thái công bố bộ chủ đề.');
      return;
    }
    if (!isAllPublished) {
      // Kiểm tra tính liên tục hoặc khoảng cách tròn tuần giữa các chủ đề
      for (let i = 1; i < themes.length; i++) {
        const prev = themes[i - 1];
        const cur = themes[i];
        if (cur.startDate && prev.endDate && cur.startDate <= prev.endDate) {
          toast.error(
            `Không thể công bố: Chủ đề "${cur.name || cur.code}" (${formatDateVn(cur.startDate)}) bị trùng hoặc đi trước ngày kết thúc của chủ đề trước "${prev.name || prev.code}" (${formatDateVn(prev.endDate)}).`,
          );
          return;
        }
        if (cur.startDate && prev.endDate) {
          const gapDays = Math.round((new Date(cur.startDate) - new Date(prev.endDate)) / 86400000);
          if ((gapDays - 1) % 7 !== 0) {
            toast.error(
              `Không thể công bố: Khoảng cách giữa chủ đề "${prev.name || prev.code}" và "${cur.name || cur.code}" không hợp lệ. Khoảng cách phải là các tuần trọn vẹn (bắt đầu vào Thứ Hai và kết thúc vào Chủ Nhật).`,
            );
            return;
          }
        }
      }

      // Kiểm tra tất cả chủ đề: thời lượng 2–6 tuần, từ 2 đến 6 nhánh, và nhánh bao phủ trọn thời gian
      for (const th of themes) {
        if (!th.startDate || !th.endDate) {
          toast.error(`Không thể công bố: Chủ đề "${th.name || th.code}" chưa có đầy đủ ngày bắt đầu và ngày kết thúc.`);
          return;
        }

        const diffDays = Math.round((new Date(th.endDate) - new Date(th.startDate)) / 86400000) + 1;
        if (diffDays < 14) {
          toast.error(
            `Không thể công bố: Chủ đề "${th.name || th.code}" có thời lượng ${diffDays} ngày (tối thiểu cần 2 tuần - 14 ngày trọn vẹn từ Thứ Hai đến Chủ Nhật).`
          );
          return;
        }
        if (diffDays > 42) {
          toast.error(
            `Không thể công bố: Chủ đề "${th.name || th.code}" có thời lượng ${diffDays} ngày (tối đa là 6 tuần - 42 ngày).`
          );
          return;
        }
        if (diffDays % 7 !== 0) {
          toast.error(
            `Không thể công bố: Chủ đề "${th.name || th.code}" có thời lượng ${diffDays} ngày (phải là các tuần trọn vẹn, chia hết cho 7 ngày).`
          );
          return;
        }

        const normSubs = normalizeSubThemes(th.subThemes);
        if (normSubs.length < 2 || normSubs.length > 6) {
          toast.error(
            `Không thể công bố: Chủ đề "${th.name || th.code}" phải có từ 2 đến 6 chủ đề nhánh (hiện có ${normSubs.length} nhánh).`
          );
          return;
        }

        for (let i = 0; i < normSubs.length; i++) {
          const cur = normSubs[i];
          if (!cur.startDate || !cur.endDate) {
            toast.error(`Không thể công bố: Chủ đề nhánh "${cur.name}" chưa có ngày bắt đầu và kết thúc.`);
            return;
          }
          if (i === 0 && cur.startDate !== th.startDate) {
            toast.error(
              `Không thể công bố: Nhánh đầu tiên ("${cur.name}") phải bắt đầu đúng ngày bắt đầu của chủ đề (${formatDateVn(th.startDate)}).`
            );
            return;
          }
          if (i > 0) {
            const prev = normSubs[i - 1];
            const expectedStart = addDaysToDate(prev.endDate, 1);
            if (cur.startDate !== expectedStart) {
              toast.error(
                `Không thể công bố: Nhánh "${cur.name}" phải bắt đầu liền kề (${formatDateVn(expectedStart)}) ngay sau nhánh "${prev.name}".`
              );
              return;
            }
          }
        }

        const last = normSubs[normSubs.length - 1];
        if (!last?.endDate || last.endDate !== th.endDate) {
          toast.error(
            `Không thể công bố: Nhánh cuối cùng ("${last?.name}") kết thúc ngày ${formatDateVn(last?.endDate)}, trong khi chủ đề "${th.name || th.code}" kết thúc ngày ${formatDateVn(th.endDate)}. Vui lòng phân bổ nhánh bao phủ hết thời gian chủ đề.`
          );
          return;
        }
      }
    }

    const nextStatus = isAllPublished ? 'DRAFT' : 'PUBLISHED';

    try {
      const res = await curriculumApi.updateThemeSetStatus({
        year: yearId.replace('-', '–'),
        ageGroup,
        status: nextStatus,
      });
      if (res && res.success === false) {
        throw new Error(res.message || 'Không thể cập nhật trạng thái bộ chủ đề');
      }

      setStatus(nextStatus);
      const updatedThemes = themes.map((t) => ({ ...t, status: nextStatus }));
      setThemes(updatedThemes);
      setUpdatedAt(new Date().toLocaleDateString('vi-VN'));
      localStorage.setItem(`sorak_curriculum_${yearId}_${ageGroup}_status`, nextStatus);

      toast.success(
        nextStatus === 'PUBLISHED'
          ? 'Đã công bố toàn bộ chủ đề trong năm học cho khối này!'
          : 'Đã chuyển toàn bộ chủ đề về bản nháp (Được phép chỉnh sửa và lưu)',
      );
    } catch (err) {
      console.warn('Failed to update theme set status on server:', err);
      const errMsg = err.response?.data?.message || err.message || 'Không thể cập nhật trạng thái bộ chủ đề.';
      toast.error(errMsg);
    }
  };

  const handleDeleteCurrentTopic = async () => {
    if (isSchoolYearEnded) {
      toast.warning('Năm học đã kết thúc. Không thể xóa chủ đề.');
      return;
    }
    if (isAllPublished) {
      toast.error('Không thể xóa chủ đề khi bộ chủ đề đã công bố.');
      return;
    }
    if (themes.length <= 1) {
      toast.error('Phải giữ lại ít nhất một chủ đề trong năm học.');
      return;
    }

    const curTopic = themes[selectedTopicIndex];
    const topicToDeleteName = curTopic?.name || `Chủ đề ${curTopic?.code || ''}`;

    const updated = themes.filter((_, idx) => idx !== selectedTopicIndex);
    const reindexed = updated.map((t, idx) => ({
      ...t,
      code: String(idx + 1).padStart(2, '0'),
    }));

    setThemes(reindexed);
    const nextIdx = Math.max(0, selectedTopicIndex - 1);
    setSelectedTopicIndex(nextIdx);
    if (reindexed[nextIdx]) {
      loadTopicIntoForm(reindexed[nextIdx]);
    }

    try {
      await curriculumApi.updateThemeSetDetail({
        year: yearId.replace('-', '–'),
        ageGroup,
        themes: reindexed,
      });
      toast.success(`Đã xóa "${topicToDeleteName}"`);
    } catch (err) {
      console.warn('Failed to sync deleted topic to server:', err);
      toast.error('Không thể xóa chủ đề. Vui lòng thử lại.');
    }
  };

  // Add new topic
  const handleAddNewTopic = async () => {
    if (isSchoolYearEnded) {
      toast.warning('Năm học đã kết thúc. Không thể thêm chủ đề mới.');
      return;
    }
    if (isAllPublished) {
      toast.warning('Bộ chủ đề đã công bố. Vui lòng gỡ công bố để thêm chủ đề mới.');
      return;
    }
    if (isAcademicYearFull) {
      toast.warning('Một năm học tối đa 20 chủ đề lớn.');
      return;
    }
    const nextCode = String(themes.length + 1).padStart(2, '0');
    const lastTheme = themes[themes.length - 1];

    let defaultStart = '';
    if (lastTheme?.endDate) {
      defaultStart = addDaysToDate(lastTheme.endDate, 1);
    } else {
      const syStart = academicYearBounds.start || '2026-09-01';
      defaultStart = isMonday(syStart) ? syStart : getMondayOfWeek(syStart);
      if (defaultStart < syStart) {
        defaultStart = addDaysToDate(defaultStart, 7);
      }
    }

    if (academicYearBounds.end && defaultStart > academicYearBounds.end) {
      toast.warning(
        `Ngày bắt đầu (${formatDateVn(defaultStart)}) vượt quá ngày kết thúc năm học (${formatDateVn(academicYearBounds.end)}).`,
      );
      return;
    }

    // Kiểm tra thời gian còn lại của năm học có đủ tối thiểu 2 tuần (14 ngày) hay không
    const remainingDays = academicYearBounds.end
      ? Math.round((new Date(academicYearBounds.end) - new Date(defaultStart)) / 86400000) + 1
      : 999;

    if (remainingDays < 14) {
      toast.error(
        `Không thể tạo chủ đề mới vì thời gian còn lại của năm học chỉ có ${remainingDays} ngày (${remainingDays === 1 ? formatDateVn(defaultStart) : `${formatDateVn(defaultStart)} – ${formatDateVn(academicYearBounds.end)}`}). Chủ đề cần từ 2 đến 6 tuần trọn vẹn (Thứ Hai–Chủ Nhật). Vui lòng điều chỉnh thời gian các chủ đề trước đó.`
      );
      return;
    }

    // Chọn khoảng 2 tuần (14 ngày, từ defaultStart + 13 ngày)
    let defaultEnd = addDaysToDate(defaultStart, 13);
    if (academicYearBounds.end && defaultEnd > academicYearBounds.end) {
      defaultEnd = academicYearBounds.end;
    }

    const newTopic = {
      id: `th-${Date.now()}`,
      code: nextCode,
      name: `Chủ đề mới ${nextCode}`,
      startDate: defaultStart,
      endDate: defaultEnd,
      submissionDeadline: '',
      allowLateSubmit: true,
      status: 'DRAFT',
      subThemes: [],
      note: '',
    };
    const updated = [...themes, newTopic];
    setThemes(updated);
    setSelectedTopicIndex(updated.length - 1);
    loadTopicIntoForm(newTopic);
    toast.success(`Đã thêm chủ đề mới ${nextCode} (${formatDateVn(defaultStart)} – ${formatDateVn(defaultEnd)})`);

    setTimeout(() => {
      topicNameInputRef.current?.focus?.();
    }, 150);

    try {
      setIsSaving(true);
      const res = await curriculumApi.updateThemeSetDetail({
        year: yearId.replace('-', '–'),
        ageGroup,
        themes: updated,
      });
      if (res?.themes && Array.isArray(res.themes)) {
        setThemes(res.themes);
      }
      setLastSavedAt(new Date());
    } catch (err) {
      console.warn('Failed to sync new topic to server:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Auto select theme matching a target month
  const autoSelectTopicForMonth = (year, month) => {
    if (!themes || themes.length === 0) return;
    const monthStart = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const daysInM = new Date(year, month + 1, 0).getDate();
    const monthEnd = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInM).padStart(2, '0')}`;

    // If current selected topic is active in this month, retain it
    const cur = selectedTopic;
    if (cur?.startDate && cur?.endDate && !(cur.endDate < monthStart || cur.startDate > monthEnd)) {
      return;
    }

    // Find first topic overlapping this month
    const matchedIdx = themes.findIndex((t) => {
      if (!t.startDate || !t.endDate) return false;
      return !(t.endDate < monthStart || t.startDate > monthEnd);
    });

    if (matchedIdx !== -1) {
      setSelectedTopicIndex(matchedIdx);
      loadTopicIntoForm(themes[matchedIdx]);
    }
  };

  // Calendar Days computation cho cả 2 tháng liên tiếp
  const month2Year = calendarMonth === 11 ? calendarYear + 1 : calendarYear;
  const month2 = calendarMonth === 11 ? 0 : calendarMonth + 1;

  // Giới hạn điều hướng tháng trong năm học
  const { minYear, minMonth, maxYear, maxMonth } = useMemo(() => {
    const startParts = (academicYearBounds.start || '2026-09-05').split('-').map(Number);
    const endParts = (academicYearBounds.end || '2027-05-31').split('-').map(Number);
    return {
      minYear: startParts[0] || 2026,
      minMonth: (startParts[1] || 9) - 1,
      maxYear: endParts[0] || 2027,
      maxMonth: (endParts[1] || 5) - 1,
    };
  }, [academicYearBounds]);

  const isPrevDisabled = calendarYear < minYear || (calendarYear === minYear && calendarMonth <= minMonth);
  const isNextDisabled = month2Year > maxYear || (month2Year === maxYear && month2 >= maxMonth);

  // Calendar Navigation
  const handlePrevMonth = () => {
    if (isPrevDisabled) return;
    let newYear = calendarYear;
    let newMonth = calendarMonth;
    if (calendarMonth === 0) {
      newMonth = 11;
      newYear = calendarYear - 1;
    } else {
      newMonth = calendarMonth - 1;
    }
    setCalendarYear(newYear);
    setCalendarMonth(newMonth);
    autoSelectTopicForMonth(newYear, newMonth);
  };

  const handleNextMonth = () => {
    if (isNextDisabled) return;
    let newYear = calendarYear;
    let newMonth = calendarMonth;
    if (calendarMonth === 11) {
      newMonth = 0;
      newYear = calendarYear + 1;
    } else {
      newMonth = calendarMonth + 1;
    }
    setCalendarYear(newYear);
    setCalendarMonth(newMonth);
    autoSelectTopicForMonth(newYear, newMonth);
  };

  // Click on date in calendar to auto select corresponding theme OR toggle sub-theme week (Mon-Sun)
  const handleDateClick = (dateStr) => {
    if (isAllPublished || !hasSelectedTopic || themes.length === 0) return;

    // 1. Kiểm tra ngày có thuộc chủ đề đang chọn không
    if (!startDate || !endDate || dateStr < startDate || dateStr > endDate) {
      // Nếu nhấp vào ngày thuộc một chủ đề khác, chuyển sang chủ đề đó
      const matchedIdx = themes.findIndex(
        (t) => t.startDate && t.endDate && dateStr >= t.startDate && dateStr <= t.endDate,
      );
      if (matchedIdx !== -1 && matchedIdx !== selectedTopicIndex) {
        setSelectedTopicIndex(matchedIdx);
        loadTopicIntoForm(themes[matchedIdx]);
      } else {
        toast.warning(
          `Ngày ${formatDateVn(dateStr)} không thuộc khung thời gian của chủ đề này (${formatDateRangeDdMm(startDate, endDate)}).`,
        );
      }
      return;
    }

    const weekStart = getMondayOfWeek(dateStr);
    const weekEnd = getSundayOfWeek(dateStr);

    // Kiểm tra tuần có nằm trọn trong chủ đề không
    if (weekStart < startDate || weekEnd > endDate) {
      toast.warning(
        `Tuần ${formatDateVn(weekStart)} – ${formatDateVn(weekEnd)} vượt khỏi khung thời gian chủ đề (${formatDateVn(startDate)} – ${formatDateVn(endDate)}).`,
      );
      return;
    }

    // 2. Nếu đang chọn một nhánh
    if (activeSubThemeIndex !== null) {
      const isLastBranch = activeSubThemeIndex === subThemes.length - 1;
      const cur = subThemes[activeSubThemeIndex];
      if (!cur) return;

      // Chỉ cho phép sửa hoặc mở rộng/thu bớt thời lượng đối với chủ đề nhánh ở cuối
      if (!isLastBranch) {
        const otherIdx = subThemes.findIndex(
          (st) => st.startDate && st.endDate && weekStart >= st.startDate && weekEnd <= st.endDate,
        );
        if (otherIdx !== -1 && otherIdx !== activeSubThemeIndex) {
          setActiveSubThemeIndex(otherIdx);
          toast.info(`Đã chuyển sang xem "${subThemes[otherIdx].name || `Nhánh ${otherIdx + 1}`}".`);
          return;
        }
        toast.info('Chỉ được sửa hoặc thu bớt thời lượng cho chủ đề nhánh ở cuối.');
        return;
      }

      // TH1: Nhánh chưa có ngày -> Gán tuần này (1 tuần)
      if (!cur.startDate || !cur.endDate) {
        handleAssignSubThemeWeek(activeSubThemeIndex, weekStart, weekEnd);
        toast.success(
          `Đã chọn tuần ${formatDateVn(weekStart)} – ${formatDateVn(weekEnd)} (1 tuần) cho "${cur.name || `Nhánh ${activeSubThemeIndex + 1}`}". Nhấp tuần tiếp theo để mở rộng 2–5 tuần, hoặc nhấp lại để bỏ chọn.`,
        );
        return;
      }

      const curDiffDays = Math.round((new Date(cur.endDate) - new Date(cur.startDate)) / 86400000) + 1;
      const curWeeks = Math.round(curDiffDays / 7);

      // TH2: Nhấp vào tuần NẰM TRONG khoảng ngày hiện tại của nhánh
      if (weekStart >= cur.startDate && weekEnd <= cur.endDate) {
        if (curWeeks === 1) {
          // Không xoá khi nhấp lần 2 (nhánh giữ tối thiểu 1 tuần)
          toast.info(
            `"${cur.name || `Nhánh ${activeSubThemeIndex + 1}`}" đang là 1 tuần (thời lượng tối thiểu). Nhấp tuần tiếp theo để mở rộng.`,
          );
          return;
        }

        // Xoá thì phải xoá từ tuần cuối trước xoá dần lên:
        // Nhấp vào tuần cuối cùng: thu bớt 1 tuần (xoá tuần cuối)
        if (weekEnd === cur.endDate) {
          const newEnd = addDaysToDate(cur.endDate, -7);
          handleAssignSubThemeWeek(activeSubThemeIndex, cur.startDate, newEnd);
          toast.info(
            `Đã giảm tuần cuối của "${cur.name || `Nhánh ${activeSubThemeIndex + 1}`}", thời lượng còn ${curWeeks - 1} tuần (${formatDateVn(cur.startDate)} – ${formatDateVn(newEnd)}).`,
          );
          return;
        }

        // Nếu nhấp vào một tuần ở phía trước tuần cuối: thu gọn từ tuần cuối dần lên tới tuần này
        if (weekEnd < cur.endDate) {
          handleAssignSubThemeWeek(activeSubThemeIndex, cur.startDate, weekEnd);
          const updatedWeeks = Math.round((new Date(weekEnd) - new Date(cur.startDate)) / 86400000 / 7) + 1;
          toast.info(
            `Đã thu bớt tuần từ cuối lên, thời lượng còn ${updatedWeeks} tuần (${formatDateVn(cur.startDate)} – ${formatDateVn(weekEnd)}).`,
          );
          return;
        }

        return;
      }

      // TH3: Nhấp vào tuần của nhánh khác -> chuyển sang xem nhánh đó
      const otherSubIdx = subThemes.findIndex(
        (st, idx) =>
          idx !== activeSubThemeIndex &&
          st.startDate &&
          st.endDate &&
          weekStart >= st.startDate &&
          weekEnd <= st.endDate,
      );
      if (otherSubIdx !== -1) {
        setActiveSubThemeIndex(otherSubIdx);
        toast.info(`Đã chuyển sang xem nhánh "${subThemes[otherSubIdx].name || `Nhánh ${otherSubIdx + 1}`}".`);
        return;
      }

      // TH4: Nhấp vào tuần trống phía sau cur.endDate -> Mở rộng nhánh lên 2, 3, 4, 5 tuần (không được là 6 tuần)
      if (weekStart > cur.endDate) {
        const newDiffDays = Math.round((new Date(weekEnd) - new Date(cur.startDate)) / 86400000) + 1;
        const newWeeks = Math.round(newDiffDays / 7);

        // Kiểm tra xem có đè lên nhánh nào khác nằm giữa không
        const hasConflict = subThemes.some(
          (st, idx) =>
            idx !== activeSubThemeIndex &&
            st.startDate &&
            st.endDate &&
            !(st.endDate < cur.startDate || st.startDate > weekEnd),
        );

        if (!hasConflict && newWeeks <= 5) {
          handleAssignSubThemeWeek(activeSubThemeIndex, cur.startDate, weekEnd);
          toast.success(
            `Đã mở rộng "${cur.name || `Nhánh ${activeSubThemeIndex + 1}`}" thành ${newWeeks} tuần (${formatDateVn(cur.startDate)} – ${formatDateVn(weekEnd)}).`,
          );
          return;
        }

        if (newWeeks > 5) {
          toast.warning(
            `Một chủ đề nhánh chỉ có thể từ 1 đến 5 tuần (không được là 6 tuần). Bạn có thể chọn nhánh tiếp theo để gán tuần này.`,
          );
          return;
        }
      }

      // TH5: Nhấp vào tuần trống ở vị trí khác -> dời nhánh sang tuần này (1 tuần)
      handleAssignSubThemeWeek(activeSubThemeIndex, weekStart, weekEnd);
      toast.success(
        `Đã chọn tuần ${formatDateVn(weekStart)} – ${formatDateVn(weekEnd)} (1 tuần) cho "${cur.name || `Nhánh ${activeSubThemeIndex + 1}`}". Nhấp tuần tiếp theo để mở rộng 2–5 tuần.`,
      );
      return;
    }

    // 3. Nếu chưa chọn nhánh nào (activeSubThemeIndex === null):
    // Kiểm tra xem tuần này đã thuộc nhánh nào chưa
    const existingSubIdx = subThemes.findIndex(
      (st) => st.startDate && st.endDate && weekStart >= st.startDate && weekEnd <= st.endDate,
    );
    if (existingSubIdx !== -1) {
      setActiveSubThemeIndex(existingSubIdx);
      toast.info(`Đã chọn nhánh "${subThemes[existingSubIdx].name || `Nhánh ${existingSubIdx + 1}`}".`);
      return;
    }

    // Nếu là tuần trống: tìm nhánh đầu tiên chưa có ngày để gán
    const firstEmptyIdx = subThemes.findIndex((st) => !st.startDate || !st.endDate);
    if (firstEmptyIdx !== -1) {
      setActiveSubThemeIndex(firstEmptyIdx);
      handleAssignSubThemeWeek(firstEmptyIdx, weekStart, weekEnd);
      toast.success(
        `Đã chọn tuần ${formatDateVn(weekStart)} – ${formatDateVn(weekEnd)} cho "${subThemes[firstEmptyIdx].name || `Nhánh ${firstEmptyIdx + 1}`}".`,
      );
    } else {
      toast.info(
        `Tất cả các nhánh hiện tại đều đã được phân bổ tuần. Bạn có thể bấm "Thêm chủ đề nhánh" để phân bổ tuần này.`,
      );
    }
  };

  const calendarDaysM1 = useMemo(
    () => generateMonthDays(calendarYear, calendarMonth),
    [calendarYear, calendarMonth],
  );

  const calendarDaysM2 = useMemo(
    () => generateMonthDays(month2Year, month2),
    [month2Year, month2],
  );

  const activeTopic = themes[selectedTopicIndex] || { code: '01', name: '' };
  const activeBranch = activeSubThemeIndex !== null ? subThemes[activeSubThemeIndex] : null;

  const publishedCount = useMemo(
    () => themes.filter((t) => t.status === 'PUBLISHED').length,
    [themes],
  );
  const draftCount = useMemo(
    () => themes.filter((t) => t.status === 'DRAFT').length,
    [themes],
  );

  return (
    <div
      className="w-full flex-1 flex flex-col bg-background text-foreground select-none"
      data-node-id="4772:9956"
      data-name="Curriculum Theme Detail Page"
    >
      {/* Warning banner for ended school year */}
      {isSchoolYearEnded && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-[13px] font-medium flex items-center gap-2 shrink-0">
          <span>⚠️ Năm học đã kết thúc. Kế hoạch phân phối chủ đề ở chế độ chỉ xem.</span>
        </div>
      )}

      {/* Main Workspace (3 columns layout: Topics Navigator + Topic Editor + Topic Settings Sidebar) */}
      <div className="flex flex-1 overflow-hidden h-[calc(100vh-104px)] lg:h-[calc(100vh-120px)]">
        {/* Left Column: Desktop Topics Navigator */}
        <div className="hidden lg:flex w-[240px] xl:w-[260px] shrink-0 border-r border-border bg-card flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-border/80">
            <h2 className="text-[17px] font-semibold text-foreground tracking-tight">
              {t('curriculum.topicList')}
            </h2>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              {t('curriculum.themesHeaderDesc', 'Các chủ đề giáo dục được phân bổ trong năm học')}
            </p>
          </div>

          {/* Button: Thêm chủ đề */}
          <div className="p-3 border-b border-border/60">
            <Button
              type="button"
              variant="outline"
              disabled={isAllPublished || isAcademicYearFull || isSchoolYearEnded}
              onClick={handleAddNewTopic}
              className={cn(
                'w-full h-8 border border-border text-[13px] font-medium rounded-none flex items-center justify-center gap-1.5 shadow-none transition-colors',
                (isAllPublished || isAcademicYearFull || isSchoolYearEnded)
                  ? 'opacity-50 cursor-not-allowed bg-muted/40 text-muted-foreground'
                  : 'hover:bg-muted cursor-pointer',
              )}
              title={
                isSchoolYearEnded
                  ? 'Năm học đã kết thúc. Không thể thêm chủ đề mới'
                  : isAllPublished
                  ? 'Vui lòng gỡ công bố để thêm chủ đề mới'
                  : isAcademicYearFull
                  ? 'Đã đạt tối đa 20 chủ đề trong một năm học'
                  : t('curriculum.createTheme')
              }
            >
              <HugeiconsIcon icon={PlusSignIcon} size={14} />
              <span>{isSchoolYearEnded ? 'Năm học đã kết thúc' : isAcademicYearFull ? 'Đã đủ tối đa 20 chủ đề' : t('curriculum.createTheme')}</span>
            </Button>
          </div>

          {/* Topic List */}
          <div className="flex-1 overflow-y-auto divide-y divide-border/40 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {themes.length === 0 ? (
              <div className="p-6 text-center text-[12.5px] text-muted-foreground italic select-none">
                {t('curriculum.noThemesYet', 'Chưa có chủ đề nào')}
              </div>
            ) : (
              themes.map((topic, idx) => {
                const isSelected = selectedTopicIndex === idx;

                return (
                  <div
                    key={topic.id || idx}
                    onClick={() => handleSelectTopic(idx)}
                    className={cn(
                      'flex items-center gap-3 px-3.5 py-3 cursor-pointer transition-colors select-none text-left',
                      isSelected
                        ? 'bg-muted/70 font-semibold'
                        : 'hover:bg-muted/40 text-foreground',
                    )}
                  >
                    {/* Topic Index square badge */}
                    <div
                      className={cn(
                        'size-7 rounded-none flex items-center justify-center text-[12px] font-semibold shrink-0 overflow-hidden',
                        isSelected
                          ? 'bg-[#1447e6] text-white'
                          : 'bg-muted text-muted-foreground border border-border/60',
                      )}
                    >
                      {(() => {
                        const c = String(topic.code || '');
                        const match = c.match(/(\d+)$/);
                        return match ? match[1].padStart(2, '0') : String(idx + 1).padStart(2, '0');
                      })()}
                    </div>

                    {/* Topic info: Name + Date Range */}
                    <div className="flex flex-col min-w-0 flex-1 leading-tight">
                      <span className="text-[13.5px] truncate text-foreground">
                        {isSelected ? (topicName || topic.name) : topic.name}
                      </span>
                      <span className="text-[11.5px] text-muted-foreground font-normal mt-0.5">
                        {formatDateVn(isSelected ? (startDate || topic.startDate) : topic.startDate)?.slice(0, 5)} – {formatDateVn(isSelected ? (endDate || topic.endDate) : topic.endDate)?.slice(0, 5)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Mobile/Tablet Topics Drawer */}
        {showMobileTopics && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
              onClick={() => setShowMobileTopics(false)}
            />
            <div className="relative w-[280px] max-w-[85vw] bg-card border-r border-border h-full flex flex-col shadow-2xl z-10 animate-in slide-in-from-left duration-200">
              <div className="p-3.5 border-b border-border flex items-center justify-between">
                <div>
                  <h2 className="text-[15px] font-semibold text-foreground tracking-tight">
                    {t('curriculum.topicList')}
                  </h2>
                  <p className="text-[11.5px] text-muted-foreground mt-0.5">
                    {t('curriculum.themesInSchoolYear', '{{count}} chủ đề trong năm học', { count: themes.length })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMobileTopics(false)}
                  className="size-7 flex items-center justify-center hover:bg-muted text-muted-foreground rounded-xs cursor-pointer"
                >
                  <HugeiconsIcon icon={Cancel01Icon} size={15} />
                </button>
              </div>

              <div className="p-3 border-b border-border/60">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isAllPublished || isAcademicYearFull || isSchoolYearEnded}
                  onClick={() => {
                    handleAddNewTopic();
                    setShowMobileTopics(false);
                  }}
                  className={cn(
                    'w-full h-8 border border-border text-[12.5px] font-medium rounded-none flex items-center justify-center gap-1.5 shadow-none transition-colors',
                    (isAllPublished || isAcademicYearFull || isSchoolYearEnded)
                      ? 'opacity-50 cursor-not-allowed bg-muted/40 text-muted-foreground'
                      : 'hover:bg-muted cursor-pointer',
                  )}
                >
                  <HugeiconsIcon icon={PlusSignIcon} size={14} />
                  <span>{isSchoolYearEnded ? 'Năm học đã kết thúc' : isAcademicYearFull ? 'Đã đủ tối đa 20 chủ đề' : t('curriculum.createTheme')}</span>
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-border/40 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                {themes.length === 0 ? (
                  <div className="p-6 text-center text-[12.5px] text-muted-foreground italic select-none">
                    Chưa có chủ đề nào
                  </div>
                ) : (
                  themes.map((topic, idx) => {
                    const isSelected = selectedTopicIndex === idx;
                    return (
                      <div
                        key={topic.id || idx}
                        onClick={() => {
                          handleSelectTopic(idx);
                          setShowMobileTopics(false);
                        }}
                        className={cn(
                          'flex items-center gap-3 px-3.5 py-3 cursor-pointer transition-colors select-none text-left',
                          isSelected
                            ? 'bg-muted/70 font-semibold'
                            : 'hover:bg-muted/40 text-foreground',
                        )}
                      >
                        <div
                          className={cn(
                            'size-7 rounded-none flex items-center justify-center text-[12px] font-semibold shrink-0 overflow-hidden',
                            isSelected
                              ? 'bg-[#1447e6] text-white'
                              : 'bg-muted text-muted-foreground border border-border/60',
                          )}
                        >
                          {(() => {
                            const c = String(topic.code || '');
                            const match = c.match(/(\d+)$/);
                            return match ? match[1].padStart(2, '0') : String(idx + 1).padStart(2, '0');
                          })()}
                        </div>
                        <div className="flex flex-col min-w-0 flex-1 leading-tight">
                          <span className="text-[13.5px] truncate text-foreground">
                            {isSelected ? (topicName || topic.name) : topic.name}
                          </span>
                          <span className="text-[11.5px] text-muted-foreground font-normal mt-0.5">
                            {formatDateVn(isSelected ? (startDate || topic.startDate) : topic.startDate)?.slice(0, 5)} – {formatDateVn(isSelected ? (endDate || topic.endDate) : topic.endDate)?.slice(0, 5)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* Middle Column: Topic Editor (Figma 4772:10428) */}
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
          {!hasSelectedTopic ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-background select-none">
              {/* Mobile Topics List Toggle Button */}
              <div className="lg:hidden mb-6">
                <button
                  type="button"
                  onClick={() => setShowMobileTopics(true)}
                  className="h-8 px-3 flex items-center gap-1.5 border border-border bg-background hover:bg-muted text-foreground text-[12px] font-medium rounded-none transition-colors shrink-0 cursor-pointer"
                  title="Xem danh sách chủ đề"
                >
                  <HugeiconsIcon icon={Menu01Icon} size={15} />
                  <span>Danh sách chủ đề ({themes.length})</span>
                </button>
              </div>

              <div className="size-16 rounded-full bg-muted/60 border border-border/80 flex items-center justify-center text-muted-foreground mb-4">
                <HugeiconsIcon icon={Calendar03Icon} size={30} />
              </div>
              <h3 className="text-[17px] font-semibold text-foreground tracking-tight">
                Chưa có chủ đề giáo dục nào
              </h3>
              <p className="text-[13px] text-muted-foreground mt-1.5 max-w-md leading-relaxed">
                Năm học này chưa có chủ đề nào được tạo. Vui lòng nhấn nút <span className="font-semibold text-foreground">&ldquo;+ Tạo chủ đề&rdquo;</span> ở danh sách bên trái hoặc nhấn nút bên dưới để bắt đầu thiết lập thông tin và phân bổ thời gian.
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={handleAddNewTopic}
                disabled={isAllPublished || isAcademicYearFull || isSchoolYearEnded}
                className="mt-5 h-8.5 px-4 text-[13px] font-medium border-border hover:bg-muted text-foreground rounded-none shadow-none flex items-center gap-1.5 cursor-pointer"
              >
                <HugeiconsIcon icon={PlusSignIcon} size={15} />
                <span>{isSchoolYearEnded ? 'Năm học đã kết thúc' : t('curriculum.createThemeBtn', 'Tạo chủ đề')}</span>
              </Button>
            </div>
          ) : (
            <>
              {/* Scrollable content area */}
              <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 space-y-4 sm:space-y-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {/* Header: Title, Subtitle + Integrated Controls */}
            <div className="flex flex-col gap-2 pb-4 border-b border-border/60">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  {/* Mobile Topics List Toggle Button */}
                  <button
                    type="button"
                    onClick={() => setShowMobileTopics(true)}
                    className="lg:hidden h-8 px-2.5 flex items-center gap-1.5 border border-border bg-background hover:bg-muted text-foreground text-[12px] font-medium rounded-none transition-colors shrink-0 cursor-pointer"
                    title="Xem danh sách chủ đề"
                  >
                    <HugeiconsIcon icon={Menu01Icon} size={15} />
                    <span>Chủ đề ({themes.length})</span>
                  </button>

                  <h1 className="text-[20px] sm:text-[24px] font-semibold text-foreground tracking-tight truncate">
                    {topicName || t('curriculum.tabThemes')}
                  </h1>
                </div>

                {/* Top Right Controls: Toggle Lịch, In Kế hoạch & Nút Xóa */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Nút Xuất Excel Kế hoạch chủ đề 35 tuần */}
                  <ExcelActionsDropdown
                    onExport={handleExportThemePlanExcel}
                    isExporting={isExportingThemeExcel}
                    showImport={false}
                  />

                  <button
                    type="button"
                    onClick={() => setShowRightSidebar(!showRightSidebar)}
                    className={cn(
                      'size-8 flex items-center justify-center border border-border transition-colors cursor-pointer rounded-none',
                      showRightSidebar
                        ? 'bg-muted text-foreground font-medium'
                        : 'bg-background text-muted-foreground hover:text-foreground hover:bg-muted/50',
                    )}
                    title={showRightSidebar ? t('curriculum.collapseCalendar', 'Thu gọn lịch') : t('curriculum.openCalendarAndProgress', 'Mở lịch & tiến độ')}
                  >
                    <HugeiconsIcon icon={SidebarRightIcon} size={16} />
                  </button>

                  <button
                    type="button"
                    onClick={handleDeleteCurrentTopic}
                    disabled={isAllPublished || isSchoolYearEnded}
                    className="size-8 flex items-center justify-center border border-border bg-background hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer rounded-none disabled:opacity-40 disabled:cursor-not-allowed"
                    title={
                      isSchoolYearEnded
                        ? 'Năm học đã kết thúc. Không thể xóa chủ đề'
                        : isAllPublished
                        ? 'Không thể xóa chủ đề khi bộ chủ đề đã công bố'
                        : t('curriculum.deleteThisTheme', 'Xóa chủ đề này')
                    }
                  >
                    <HugeiconsIcon icon={Delete02Icon} size={16} />
                  </button>
                </div>
              </div>

              {/* Hàng dưới: Badge trạng thái và Trạng thái lưu tự động */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <span
                  className={cn(
                    'px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase rounded-none shrink-0',
                    isAllPublished
                      ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30'
                      : 'bg-muted text-muted-foreground border border-border',
                  )}
                >
                  {isAllPublished ? t('curriculum.published', 'Đã công bố') : t('curriculum.draft', 'Bản nháp')}
                </span>

                <span className="text-[11.5px] text-muted-foreground/70 shrink-0 font-sans tracking-tight select-none">
                  {isSaving ? (
                    <span className="text-primary font-medium">{t('common.saving', 'Đang lưu...')}</span>
                  ) : isDuplicateThemeName ? (
                    <span className="text-destructive font-medium">{t('curriculum.themeNameAlreadyExists', 'Tên chủ đề đã tồn tại trong bộ chủ đề này')}</span>
                  ) : duplicateSubThemeIndexes.size > 0 ? (
                    <span className="text-destructive font-medium">{t('curriculum.subThemeNameAlreadyExists', 'Tên chủ đề nhánh đã tồn tại trong chủ đề này')}</span>
                  ) : hasChanges ? (
                    <span className="text-amber-600 font-medium">{t('curriculum.waitingToSave', 'Đang chờ lưu...')}</span>
                  ) : (
                    <>
                      {t('curriculum.savedAtTime', 'Đã lưu lúc')} <span className="font-mono text-muted-foreground font-medium">{formatDateTime(lastSavedAt || updatedAt)}</span>
                    </>
                  )}
                </span>
              </div>
            </div>

            {/* Card 1: Thông tin chủ đề (Figma 4772:10432) */}
            <div className="border border-border bg-card p-4 sm:p-5 rounded-none space-y-4 shadow-2xs">
              <div className="flex flex-col gap-0.5">
                <h2 className="text-[14.5px] font-semibold text-foreground">
                  {t('curriculum.topicInfo')}
                </h2>
              </div>

              <div className="space-y-4 pt-1">
                {/* Field: Tên chủ đề */}
                <div className="space-y-1.5">
                  <label className="text-[12.5px] font-medium text-foreground">
                    {t('curriculum.topicName')}
                  </label>
                  <input
                    ref={topicNameInputRef}
                    type="text"
                    value={topicName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTopicName(val);
                      setThemes((prev) => {
                        const copy = [...prev];
                        if (copy[selectedTopicIndex]) {
                          copy[selectedTopicIndex] = { ...copy[selectedTopicIndex], name: val };
                        }
                        return copy;
                      });
                    }}
                    disabled={isReadOnly}
                    placeholder={t('curriculum.topicName')}
                    className={cn(
                      'w-full h-8 px-3 bg-background border text-[13px] text-foreground rounded-none outline-none transition-colors',
                      isDuplicateThemeName
                        ? 'border-destructive focus:border-destructive text-destructive'
                        : 'border-border focus:border-primary',
                      isReadOnly && 'bg-muted/40 text-muted-foreground cursor-not-allowed',
                    )}
                  />
                  {isDuplicateThemeName && (
                    <p className="text-[12px] text-destructive font-medium mt-1">
                      Tên chủ đề đã tồn tại trong bộ chủ đề này. Vui lòng nhập tên khác.
                    </p>
                  )}
                </div>

                {/* Timing Fields: Ngày bắt đầu, Ngày kết thúc, {t('curriculum.planSubmissionDeadline', 'Hạn nộp kế hoạch')} */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[12.5px] font-medium text-foreground">
                      {t('curriculum.startDate')}
                    </label>
                    <ThemeDatePicker
                      value={startDate}
                      onChange={handleStartDateChange}
                      disabled={isReadOnly}
                      type="start"
                      minDate={themeDateBounds.minAllowedStart || undefined}
                      maxDate={themeDateBounds.maxAllowedStart || undefined}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[12.5px] font-medium text-foreground">
                      {t('curriculum.endDate')}
                    </label>
                    <ThemeDatePicker
                      value={endDate}
                      onChange={handleEndDateChange}
                      disabled={isReadOnly}
                      type="end"
                      referenceStartDate={startDate}
                      minDate={themeDateBounds.minAllowedEnd || undefined}
                      maxDate={themeDateBounds.maxAllowedEnd || undefined}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[12.5px] font-medium text-foreground">
                      Hạn nộp kế hoạch
                    </label>
                    <ThemeDatePicker
                      value={submissionDeadline || (startDate ? addDaysToDate(startDate, -5) : '')}
                      onChange={(val) => setSubmissionDeadline(val)}
                      disabled={isReadOnly}
                      type="deadline"
                      placeholder="dd/mm/yyyy"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Nhánh chủ đề (Clean theo thiết kế Figma) */}
            <div className="border border-border bg-card p-5 rounded-none space-y-4 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b border-border/60">
                <div className="flex flex-col gap-0.5">
                  <h2 className="text-[14.5px] font-semibold text-foreground">
                    {t('curriculum.subThemes', 'Nhánh chủ đề')}
                  </h2>
                  <p className="text-[12px] text-muted-foreground">
                    {t('curriculum.subThemeGuideDesc', 'Một chủ đề có thể có nhiều chủ đề nhánh.')}
                  </p>
                </div>

                {/* Nút Thêm nhánh */}
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddSubTheme}
                    disabled={isReadOnly || isThemeFull}
                    className={cn(
                      'h-8 px-2.5 text-[12.5px] font-medium border-border rounded-none shadow-none flex items-center gap-1.5 transition-colors',
                      isReadOnly || isThemeFull
                        ? 'opacity-40 cursor-not-allowed bg-muted/30 text-muted-foreground'
                        : 'hover:bg-muted text-foreground cursor-pointer',
                    )}
                    title={
                      isSchoolYearEnded
                        ? 'Năm học đã kết thúc. Không thể thêm chủ đề nhánh'
                        : isAllPublished
                        ? 'Bộ chủ đề đã công bố'
                        : isThemeFull
                        ? `Chủ đề đã phân bổ đủ thời gian (đến hết ${formatDateVn(endDate)})`
                        : 'Thêm chủ đề nhánh mới'
                    }
                  >
                    <HugeiconsIcon icon={PlusSignIcon} size={14} />
                    <span>{isSchoolYearEnded ? 'Năm học đã kết thúc' : isThemeFull ? 'Đã đủ chủ đề nhánh' : 'Thêm chủ đề nhánh'}</span>
                  </Button>
                </div>
              </div>

              {/* Danh sách các nhánh hiển thị clean, phẳng theo Figma */}
              <div className="space-y-2 pt-1">
                {subThemes.length === 0 ? (
                  <div className="py-7 px-4 text-center border border-dashed border-border/80 text-[12.5px] text-muted-foreground bg-muted/10 space-y-3">
                    <p className="italic">{t('curriculum.noSubThemesInTheme', 'Chủ đề này chưa có chủ đề nhánh nào.')}</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddSubTheme}
                      disabled={isReadOnly}
                      className="h-8 px-3 text-[12.5px] font-medium border-border hover:bg-muted text-foreground rounded-none cursor-pointer shadow-none inline-flex items-center gap-1.5"
                    >
                      <HugeiconsIcon icon={PlusSignIcon} size={14} />
                      <span>{isSchoolYearEnded ? 'Năm học đã kết thúc' : t('curriculum.addFirstSubTheme', 'Thêm chủ đề nhánh đầu tiên')}</span>
                    </Button>
                  </div>
                ) : (
                  <div className="border border-border/80 bg-card divide-y divide-border/40">
                    {subThemes.map((branch, bIdx) => {
                      const hasDates = branch.startDate && branch.endDate;
                      let durationDays = 0;
                      if (hasDates) {
                        const diffTime = Math.abs(new Date(branch.endDate) - new Date(branch.startDate));
                        durationDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                      }
                      const isSelected = activeSubThemeIndex === bIdx;
                      const isDuplicateSubName = duplicateSubThemeIndexes.has(bIdx);

                      return (
                        <div
                          key={branch.id || bIdx}
                          onClick={() => {
                            if (isSelected) {
                              setActiveSubThemeIndex(null);
                            } else {
                              setActiveSubThemeIndex(bIdx);
                              // Tự động chuyển lịch sang tháng của nhánh nếu có
                              if (branch.startDate) {
                                const parts = branch.startDate.split('-').map(Number);
                                if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                                  setCalendarYear(parts[0]);
                                  setCalendarMonth(parts[1] - 1);
                                }
                              }
                            }
                          }}
                          className={cn(
                            'group px-3.5 py-2.5 flex flex-col gap-1.5 cursor-pointer transition-colors select-none',
                            isSelected
                              ? 'bg-primary/[0.04] ring-1 ring-inset ring-primary/25'
                              : 'hover:bg-muted/20 text-foreground',
                          )}
                          title={isSelected ? 'Bấm để bỏ chọn nhánh này' : 'Bấm để xem nhánh này trên lịch'}
                        >
                          {/* Dòng 1: STT vuông góc + Ô nhập tên nhánh full chiều rộng + Nút xóa ở góc phải */}
                          <div className="flex items-center gap-2.5 w-full">
                            <span
                              className={cn(
                                'size-5 flex items-center justify-center text-[10.5px] font-mono font-medium rounded-xs shrink-0 transition-colors',
                                isSelected
                                  ? 'bg-primary text-primary-foreground font-semibold'
                                  : 'bg-muted/70 text-muted-foreground/80',
                              )}
                            >
                              {bIdx + 1}
                            </span>
                            <input
                              type="text"
                              value={branch.name || ''}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!isSelected) {
                                  setActiveSubThemeIndex(bIdx);
                                  if (branch.startDate) {
                                    const parts = branch.startDate.split('-').map(Number);
                                    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                                      setCalendarYear(parts[0]);
                                      setCalendarMonth(parts[1] - 1);
                                    }
                                  }
                                }
                              }}
                              onChange={(e) => handleUpdateSubTheme(bIdx, 'name', e.target.value)}
                              disabled={isReadOnly}
                              placeholder={`Tên chủ đề nhánh ${bIdx + 1}...`}
                              className={cn(
                                'flex-1 min-w-0 h-7 px-2 bg-transparent text-[13px] text-foreground outline-none transition-colors rounded-xs',
                                isDuplicateSubName
                                  ? 'border border-destructive focus:ring-1 focus:ring-destructive text-destructive font-medium'
                                  : 'border-0 hover:bg-muted/30 focus:bg-background focus:ring-1 focus:ring-border',
                                isSelected ? 'font-medium' : 'font-normal',
                                isReadOnly && 'cursor-not-allowed text-muted-foreground',
                              )}
                            />

                            {/* Nút xóa nhánh ở góc trên bên phải (chỉ hiện khi hover vào nhánh cuối) */}
                            {!isReadOnly && bIdx === subThemes.length - 1 ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteSubTheme(bIdx);
                                }}
                                className="size-6 flex items-center justify-center text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 rounded-xs transition-all cursor-pointer opacity-0 group-hover:opacity-100 focus:opacity-100 shrink-0"
                                title={t('curriculum.deleteThisSubThemeAtEnd', 'Xóa nhánh ở cuối này')}
                              >
                                <HugeiconsIcon icon={Cancel01Icon} size={14} />
                              </button>
                            ) : (
                              <div className="size-6 shrink-0" aria-hidden="true" />
                            )}
                          </div>

                          {isDuplicateSubName && (
                            <p className="text-[11px] text-destructive font-medium pl-[30px] -mt-1">
                              Tên chủ đề nhánh đã tồn tại trong chủ đề này. Vui lòng nhập tên khác.
                            </p>
                          )}

                          {/* Dòng 2: Ngày tháng bên trái - Ô thời lượng tuần nằm SÁT PHẢI (chuẩn 76px x 24px cả 3 hàng) */}
                          <div
                            className="flex items-center justify-between gap-3 pl-[30px] select-none text-xs"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {/* Bên trái: Khoảng thời gian */}
                            {hasDates ? (
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
                                <HugeiconsIcon icon={Calendar03Icon} size={13} className="text-muted-foreground/60 shrink-0" />
                                <span className="font-medium text-foreground/80 tracking-tight whitespace-nowrap">
                                  {formatDateRangeClean(branch.startDate, branch.endDate)}
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60 italic">
                                <HugeiconsIcon icon={Calendar03Icon} size={13} className="text-muted-foreground/40 shrink-0" />
                                <span>{t('curriculum.notScheduledWeeks', 'Chưa chọn tuần')}</span>
                              </div>
                            )}

                            {/* Bên phải: Ô thời lượng tuần NẰM SÁT PHẢI - CÙNG KÍCH THƯỚC CHÍNH XÁC w-[76px] h-[24px] CHO TẤT CẢ CÁC HÀNG */}
                            {hasDates ? (
                              !isReadOnly && bIdx === subThemes.length - 1 ? (
                                (() => {
                                  let themeTotalWeeks = 0;
                                  if (startDate && endDate) {
                                    const diffDays = Math.round((new Date(endDate) - new Date(startDate)) / 86400000) + 1;
                                    themeTotalWeeks = Math.round(diffDays / 7);
                                  }
                                  let precedingWeeks = 0;
                                  for (let i = 0; i < bIdx; i++) {
                                    const b = subThemes[i];
                                    let w = 1;
                                    if (b?.startDate && b?.endDate) {
                                      const d = Math.round((new Date(b.endDate) - new Date(b.startDate)) / 86400000) + 1;
                                      w = Math.min(5, Math.max(1, Math.round(d / 7) || 1));
                                    }
                                    precedingWeeks += w;
                                  }
                                  const maxAllowed = themeTotalWeeks > 0
                                    ? Math.max(1, Math.min(5, themeTotalWeeks - precedingWeeks))
                                    : 5;
                                  const currentWeeks = Math.min(maxAllowed, Math.max(1, Math.round(durationDays / 7) || 1));

                                  return (
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <button
                                          type="button"
                                          className="w-[82px] h-7 px-2.5 flex items-center justify-between text-[12px] font-medium text-foreground bg-muted/40 hover:bg-muted/70 border border-border/70 hover:border-border rounded-xs transition-colors cursor-pointer outline-none shrink-0 focus-visible:ring-1 focus-visible:ring-ring"
                                          title={`Thời lượng nhánh cuối (tối đa ${maxAllowed} tuần)`}
                                        >
                                          <span>{t('curriculum.weeksCount', '{{count}} tuần', { count: currentWeeks })}</span>
                                          <HugeiconsIcon icon={ArrowDown01Icon} size={12} className="text-muted-foreground/60 shrink-0" />
                                        </button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent
                                        align="end"
                                        sideOffset={4}
                                        className="min-w-0 w-[82px] p-1 bg-popover text-popover-foreground border border-border/80 shadow-md rounded-xs z-50 animate-in fade-in-50 zoom-in-95 duration-100"
                                      >
                                        {Array.from({ length: maxAllowed }, (_, i) => i + 1).map((w) => {
                                          const isCur = w === currentWeeks;
                                          return (
                                            <DropdownMenuItem
                                              key={w}
                                              onClick={() => handleChangeBranchDuration(bIdx, w)}
                                              className={cn(
                                                'flex items-center justify-start px-2 py-1.5 text-xs font-medium rounded-xs cursor-pointer transition-colors',
                                                isCur
                                                  ? 'bg-primary/10 text-primary font-semibold'
                                                  : 'text-foreground hover:bg-muted/70',
                                              )}
                                            >
                                              <span>{t('curriculum.weeksCount', '{{count}} tuần', { count: w })}</span>
                                            </DropdownMenuItem>
                                          );
                                        })}
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  );
                                })()
                              ) : (
                                <div className="w-[82px] h-7 px-2.5 flex items-center justify-between text-[12px] font-medium text-muted-foreground/80 bg-muted/20 border border-border/40 rounded-xs select-none shrink-0">
                                  <span>{t('curriculum.weeksCount', '{{count}} tuần', { count: Math.round(durationDays / 7) || 1 })}</span>
                                  <span className="w-3 shrink-0" aria-hidden="true" />
                                </div>
                              )
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Card 3: Ghi chú chủ đề (Figma 4772:10575) */}
            <div className="border border-border bg-card p-5 rounded-none space-y-3 shadow-2xs">
              <div className="flex flex-col gap-0.5">
                <h2 className="text-[14.5px] font-semibold text-foreground">
                  {t('curriculum.note')}
                </h2>
                <p className="text-[12px] text-muted-foreground">
                  {t('curriculum.noteDesc')}
                </p>
              </div>

              <textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                disabled={isReadOnly}
                placeholder={t('curriculum.note')}
                className={cn(
                  'w-full p-3 bg-background border border-border text-[13px] text-foreground rounded-none outline-none focus:border-primary transition-colors resize-none placeholder:text-muted-foreground',
                  isReadOnly && 'bg-muted/40 text-muted-foreground cursor-not-allowed',
                )}
              />
            </div>

            {/* Chú thích hướng dẫn sử dụng clean, không màu, không icon (nằm bên dưới Ghi chú) */}
            <div className="text-[12px] text-muted-foreground leading-relaxed select-none px-1 pt-1">
              <span className="font-medium text-foreground">{t('curriculum.themeGuidanceNote', 'Hướng dẫn:')}</span> {t('curriculum.themeGuidanceFullText', 'Thời gian chủ đề chính gồm các tuần trọn vẹn từ 2 đến 6 tuần (Thứ Hai – Chủ Nhật). Các chủ đề nhánh (từ 1 đến 5 tuần, không được là 6 tuần) cần được phân bổ nối tiếp liên tục để phủ trọn vẹn thời gian của chủ đề. Bạn có thể nhấp trực tiếp vào tên nhánh để sửa tên, chọn tuần trên lịch hoặc điều chỉnh thời lượng (từ 1 đến 5 tuần) cho từng nhánh.')}
            </div>

          </div>

          {/* Bottom Action Bar: Chỉ hiển thị ở cột giữa nếu đã thu gọn sidebar lịch */}
          {!showRightSidebar && !isSchoolYearEnded && (
            <div className="p-3 px-6 bg-card border-t border-border flex items-center justify-end shrink-0 select-none">
              <div className="flex items-center gap-2.5">
                {isAllPublished ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleTogglePublish}
                    className="h-10 px-4 border border-border bg-card hover:bg-muted text-foreground text-[13.5px] font-medium rounded-none shadow-none cursor-pointer flex items-center gap-2 transition-colors"
                  >
                    <HugeiconsIcon icon={Cancel01Icon} size={16} className="text-muted-foreground" />
                    <span>{t('curriculum.unpublish', 'Gỡ công bố')}</span>
                  </Button>
                ) : (
                  <Button
                    type="button"
                    disabled={!hasSelectedTopic || themes.length === 0}
                    onClick={handleTogglePublish}
                    className="h-10 px-4 bg-[#1447e6] hover:bg-[#1447e6]/90 text-white text-[13.5px] font-semibold rounded-none shadow-sm cursor-pointer flex items-center gap-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    title={!hasSelectedTopic || themes.length === 0 ? 'Cần tạo ít nhất một chủ đề để công bố' : 'Công bố bộ chủ đề'}
                  >
                    <HugeiconsIcon icon={SentIcon} size={16} className="text-white" />
                    <span>Công bố bộ chủ đề</span>
                  </Button>
                )}
              </div>
            </div>
          )}
          </>
        )}
        </div>

        {/* Right Column: Topic Settings & Calendar Sidebar */}
        {showRightSidebar && (
          <>
            {/* Mobile/Tablet Backdrop when opened on screen < xl */}
            <div
              onClick={() => setShowRightSidebar(false)}
              className="fixed inset-0 bg-black/50 z-40 xl:hidden backdrop-blur-xs transition-opacity"
            />
            <div className="fixed inset-y-0 right-0 z-50 w-[340px] max-w-[92vw] shadow-2xl border-l border-border bg-card overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden h-full flex flex-col xl:static xl:z-auto xl:w-[320px] 2xl:w-[340px] xl:shadow-none animate-in slide-in-from-right duration-200">
              {/* Mobile close bar */}
              <div className="xl:hidden p-3 border-b border-border flex items-center justify-between bg-muted/30 shrink-0">
                <span className="text-[13px] font-semibold text-foreground">{t('curriculum.calendarAndProgress', 'Lịch chủ đề & tiến độ')}</span>
                <button
                  type="button"
                  onClick={() => setShowRightSidebar(false)}
                  className="size-7 flex items-center justify-center hover:bg-muted text-muted-foreground rounded-xs cursor-pointer"
                  title={t('curriculum.closeCalendar', 'Đóng lịch')}
                >
                  <HugeiconsIcon icon={Cancel01Icon} size={15} />
                </button>
              </div>

              {/* Section: Lịch chủ đề 2 tháng liên tiếp */}
              <div className="p-3.5 space-y-3">
              {/* Month Header Toolbar: Hiển thị 2 tháng liên tiếp */}
              <div className="flex items-center justify-between py-1 border-b border-border/70 pb-2">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  disabled={isPrevDisabled}
                  className={cn(
                    'size-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors rounded-none',
                    isPrevDisabled
                      ? 'opacity-25 cursor-not-allowed hover:bg-transparent text-muted-foreground/40'
                      : 'cursor-pointer'
                  )}
                  title={isPrevDisabled ? t('curriculum.firstMonthInYear', 'Đã ở tháng đầu tiên của năm học') : t('curriculum.prevOneMonth', 'Lùi 1 tháng')}
                >
                  <HugeiconsIcon icon={ArrowLeft01Icon} size={15} />
                </button>

                <span className="text-[13px] font-semibold text-foreground tracking-tight tabular-nums select-none">
                  {t('curriculum.monthLabel', 'Tháng')} {calendarMonth + 1}/{calendarYear} – {month2 + 1}/{month2Year}
                </span>

                <button
                  type="button"
                  onClick={handleNextMonth}
                  disabled={isNextDisabled}
                  className={cn(
                    'size-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors rounded-none',
                    isNextDisabled
                      ? 'opacity-25 cursor-not-allowed hover:bg-transparent text-muted-foreground/40'
                      : 'cursor-pointer'
                  )}
                  title={isNextDisabled ? t('curriculum.lastMonthInYear', 'Đã ở tháng cuối cùng của năm học') : t('curriculum.nextOneMonth', 'Tiến 1 tháng')}
                >
                  <HugeiconsIcon icon={ArrowRight01Icon} size={15} />
                </button>
              </div>

              {/* 2 Tháng Lịch Liên Tiếp (Stacked 2 Months - Full height tự nhiên, không scrollbar con) */}
              <div className="space-y-4 pt-0.5">
                {[
                  { key: 'm1', year: calendarYear, month: calendarMonth, days: calendarDaysM1, isFirst: true },
                  { key: 'm2', year: month2Year, month: month2, days: calendarDaysM2, isFirst: false },
                ].map((mObj) => (
                  <div key={mObj.key} className={cn('flex flex-col gap-1.5', !mObj.isFirst && 'pt-3.5 border-t border-border/70')}>
                    <div className="flex items-center justify-between px-0.5">
                      <span className="text-[13px] font-bold text-foreground tracking-tight">
                        {t('curriculum.monthLabel', 'Tháng')} {mObj.month + 1}/{mObj.year}
                      </span>
                    </div>

                    {/* Weekday headers: T2, T3, T4, T5, T6, T7, CN */}
                    <div className="grid grid-cols-7 text-center text-[11px] font-medium text-muted-foreground/80 py-1">
                      {WEEKDAYS.map((wd) => (
                        <div key={wd}>{wd}</div>
                      ))}
                    </div>

                    {/* Dates Grid */}
                    <div className="grid grid-cols-7 gap-y-1 text-center text-[12px]">
                      {mObj.days.map((d, i) => {
                        // Nếu là ngày ngoài tháng (trailing/leading days của tháng khác), chỉ hiện số mờ không tô màu
                        // để tránh trùng lặp ngày giữa 2 tháng!
                        if (!d.isCurrentMonth) {
                          return (
                            <div
                              key={i}
                              className="h-8 flex items-center justify-center select-none opacity-20 pointer-events-none text-muted-foreground/30 text-[12px] font-light"
                            >
                              {d.day}
                            </div>
                          );
                        }

                        const col = i % 7; // 0 = T2, ..., 6 = CN
                        const normStart = (startDate || '').slice(0, 10);
                        const normEnd = (endDate || '').slice(0, 10);
                        const isSelectedDate = Boolean(
                          normStart && normEnd && d.dateStr >= normStart && d.dateStr <= normEnd,
                        );

                        // Phân biệt: Ngày ngoài năm học vs Ngày trong năm học nhưng chưa có chủ đề
                        const isOutsideAcademicYear = Boolean(
                          academicYearBounds.start &&
                          academicYearBounds.end &&
                          (d.dateStr < academicYearBounds.start || d.dateStr > academicYearBounds.end),
                        );

                        // If not in selected theme, check other themes
                        const otherTheme = !isSelectedDate ? getThemeForDate(d.dateStr) : null;
                        const isInOtherTheme = Boolean(otherTheme);

                        // Ngày trong năm học nhưng chưa thuộc chủ đề nào
                        const isUnassignedInAcademicYear = Boolean(
                          !isOutsideAcademicYear && !isSelectedDate && !isInOtherTheme,
                        );

                        // Thông tin ngày nghỉ lễ / Tết / Sự kiện
                        const matchedHoliday = getHolidayForDate(d.dateStr);
                        const isHolidayDay = Boolean(matchedHoliday && !matchedHoliday.isTeachingAllowed);
                        const isSchoolEventDay = Boolean(matchedHoliday && matchedHoliday.isTeachingAllowed);

                        // Consecutive connectivity in the same week row
                        const prevObj = col > 0 ? mObj.days[i - 1] : null;
                        const nextObj = col < 6 ? mObj.days[i + 1] : null;
                        const prevDate = prevObj?.isCurrentMonth ? prevObj.dateStr : null;
                        const nextDate = nextObj?.isCurrentMonth ? nextObj.dateStr : null;

                        // Holiday connectivity
                        const prevHoliday = prevDate ? getHolidayForDate(prevDate) : null;
                        const nextHoliday = nextDate ? getHolidayForDate(nextDate) : null;
                        const prevSameHoliday = Boolean(
                          isHolidayDay &&
                            prevHoliday &&
                            !prevHoliday.isTeachingAllowed &&
                            (prevHoliday.id === matchedHoliday?.id || prevHoliday.name === matchedHoliday?.name),
                        );
                        const nextSameHoliday = Boolean(
                          isHolidayDay &&
                            nextHoliday &&
                            !nextHoliday.isTeachingAllowed &&
                            (nextHoliday.id === matchedHoliday?.id || nextHoliday.name === matchedHoliday?.name),
                        );

                        // Other theme connectivity
                        const prevTheme = prevDate ? getThemeForDate(prevDate) : null;
                        const nextTheme = nextDate ? getThemeForDate(nextDate) : null;
                        const prevSameOtherTheme = Boolean(
                          isInOtherTheme && prevTheme && (prevTheme.id === otherTheme?.id || prevTheme.code === otherTheme?.code),
                        );
                        const nextSameOtherTheme = Boolean(
                          isInOtherTheme && nextTheme && (nextTheme.id === otherTheme?.id || nextTheme.code === otherTheme?.code),
                        );

                        // Sub-theme matching
                        const matchedSubTheme = isSelectedDate ? getSubThemeForDate(d.dateStr) : null;
                        const matchedSubIdx = matchedSubTheme
                          ? subThemes.findIndex((st) => st.id === matchedSubTheme.id)
                          : -1;
                        const isSubThemeStart = Boolean(matchedSubTheme && d.dateStr === matchedSubTheme.startDate);

                        // Phân loại: Ngày đã có nhánh vs Chưa xếp nhánh
                        const isAssignedSubTheme = Boolean(isSelectedDate && matchedSubTheme);
                        const isUnassignedInTheme = Boolean(isSelectedDate && !matchedSubTheme);

                        const prevSubTheme = prevDate && normStart && normEnd && prevDate >= normStart && prevDate <= normEnd
                          ? getSubThemeForDate(prevDate)
                          : null;
                        const nextSubTheme = nextDate && normStart && normEnd && nextDate >= normStart && nextDate <= normEnd
                          ? getSubThemeForDate(nextDate)
                          : null;

                        const prevInAssigned = Boolean(col > 0 && isAssignedSubTheme && prevSubTheme);
                        const nextInAssigned = Boolean(col < 6 && isAssignedSubTheme && nextSubTheme);

                        const prevInUnassigned = Boolean(
                          col > 0 && isUnassignedInTheme && prevDate && normStart && normEnd && prevDate >= normStart && prevDate <= normEnd && !prevSubTheme,
                        );
                        const nextInUnassigned = Boolean(
                          col < 6 && isUnassignedInTheme && nextDate && normStart && normEnd && nextDate >= normStart && nextDate <= normEnd && !nextSubTheme,
                        );

                        // Kiểm tra ngày có thuộc nhánh đang chọn hay không
                        const isDateInActiveBranch = Boolean(
                          activeBranch?.startDate &&
                          activeBranch?.endDate &&
                          d.dateStr >= activeBranch.startDate &&
                          d.dateStr <= activeBranch.endDate,
                        );

                        const prevInActiveBranch = Boolean(
                          isDateInActiveBranch &&
                          col > 0 &&
                          prevDate &&
                          activeBranch?.startDate &&
                          activeBranch?.endDate &&
                          prevDate >= activeBranch.startDate &&
                          prevDate <= activeBranch.endDate,
                        );
                        const nextInActiveBranch = Boolean(
                          isDateInActiveBranch &&
                          col < 6 &&
                          nextDate &&
                          activeBranch?.startDate &&
                          activeBranch?.endDate &&
                          nextDate >= activeBranch.startDate &&
                          nextDate <= activeBranch.endDate,
                        );

                        return (
                          <div
                            key={i}
                            onClick={() => {
                              if (isOutsideAcademicYear || !hasSelectedTopic) return;
                              handleDateClick(d.dateStr);
                            }}
                            className={cn(
                              'h-8 flex items-center justify-center relative select-none transition-all',
                              isOutsideAcademicYear
                                ? 'opacity-20 pointer-events-none select-none bg-transparent cursor-not-allowed'
                                : !hasSelectedTopic
                                ? 'cursor-default opacity-60'
                                : 'cursor-pointer group/day',
                            )}
                            title={
                              isOutsideAcademicYear
                                ? `Ngày ${formatDateVn(d.dateStr)} · Ngoài khung năm học`
                                : isHolidayDay
                                ? `Ngày ${formatDateVn(d.dateStr)} · ${matchedHoliday.name} (Nghỉ lễ)`
                                : isSchoolEventDay
                                ? `Ngày ${formatDateVn(d.dateStr)} · ${matchedHoliday.name} (Sự kiện)`
                                : !hasSelectedTopic
                                ? `Ngày ${formatDateVn(d.dateStr)} · Chưa tạo/chọn chủ đề`
                                : isUnassignedInAcademicYear
                                  ? `Ngày ${formatDateVn(d.dateStr)} · Trong năm học (Chưa xếp chủ đề)`
                                  : isAssignedSubTheme
                                    ? `Ngày ${formatDateVn(d.dateStr)} · Chủ đề: ${topicName} · Nhánh: ${matchedSubTheme.name}`
                                    : isUnassignedInTheme
                                      ? `Ngày ${formatDateVn(d.dateStr)} · Chủ đề: ${topicName} (Chưa xếp nhánh)`
                                      : isInOtherTheme
                                        ? `Ngày ${formatDateVn(d.dateStr)} · Chủ đề: ${otherTheme.name} (Khoá)`
                                        : `Ngày ${formatDateVn(d.dateStr)} · Ngoài thời gian chủ đề này (Khoá)`
                            }
                          >
                            {/* Nền ngày nghỉ lễ: Dải màu vàng nhạt tinh tế, đồng nhất và phẳng như các dải chủ đề */}
                            {isHolidayDay && !isSelectedDate && (
                              <div
                                className={cn(
                                  'absolute inset-y-0.5 bg-amber-100/75 dark:bg-amber-950/40 transition-colors',
                                  prevSameHoliday ? 'left-0' : 'left-0.5',
                                  nextSameHoliday ? 'right-0' : 'right-0.5',
                                )}
                              />
                            )}

                            {/* Ngày trong năm học nhưng chưa có chủ đề (không phải ngày nghỉ): Viền nét đứt nhẹ */}
                            {isUnassignedInAcademicYear && !isHolidayDay && (
                              <div className="absolute inset-0.5 border border-dashed border-border/80 bg-muted/15 pointer-events-none" />
                            )}

                            {/* Ngày trong chủ đề ĐÃ CÓ NHÁNH */}
                            {isAssignedSubTheme && (
                              <div
                                className={cn(
                                  'absolute inset-y-0.5 bg-[#1447e6]',
                                  prevInAssigned ? 'left-0' : 'left-0.5',
                                  nextInAssigned ? 'right-0' : 'right-0.5',
                                )}
                              />
                            )}

                            {/* Cảnh báo ngày trong chủ đề đang chọn trùng với ngày nghỉ lễ */}
                            {isHolidayDay && isSelectedDate && (
                              <div
                                className={cn(
                                  'absolute inset-y-0.5 border-y border-amber-400 z-15 pointer-events-none',
                                  prevSameHoliday ? 'left-0' : 'left-0.5 border-l',
                                  nextSameHoliday ? 'right-0' : 'right-0.5 border-r',
                                )}
                                style={{
                                  background:
                                    'repeating-linear-gradient(45deg, rgba(245, 158, 11, 0.4), rgba(245, 158, 11, 0.4) 3px, rgba(20, 71, 230, 0.75) 3px, rgba(20, 71, 230, 0.75) 7px)',
                                }}
                              />
                            )}

                            {/* Ngày trong chủ đề CHƯA XẾP NHÁNH (Dải sọc chéo mờ) */}
                            {isUnassignedInTheme && !isHolidayDay && (
                              <div
                                className={cn(
                                  'absolute inset-y-0.5 border-y border-[#1447e6]/35 z-10 pointer-events-none',
                                  prevInUnassigned ? 'left-0' : 'left-0.5 border-l',
                                  nextInUnassigned ? 'right-0' : 'right-0.5 border-r',
                                )}
                                style={{
                                  background:
                                    'repeating-linear-gradient(45deg, rgba(20, 71, 230, 0.08), rgba(20, 71, 230, 0.08) 5px, rgba(20, 71, 230, 0.20) 5px, rgba(20, 71, 230, 0.20) 10px)',
                                }}
                              />
                            )}

                            {/* Chủ đề khác - Dải màu xám nhạt nhẹ nhàng (nếu không phải ngày nghỉ lễ) */}
                            {isInOtherTheme && !isHolidayDay && (
                              <div
                                className={cn(
                                  'absolute inset-y-0.5 bg-slate-100/90 dark:bg-slate-800/40 transition-colors group-hover/day:bg-slate-200/70 dark:group-hover/day:bg-slate-700/50',
                                  prevSameOtherTheme ? 'left-0' : 'left-0.5',
                                  nextSameOtherTheme ? 'right-0' : 'right-0.5',
                                )}
                              />
                            )}

                            {/* Nhánh đang chọn: Nâng sáng nhẹ + Viền trắng mỏng liền mạch */}
                            {isDateInActiveBranch && (
                              <div
                                className={cn(
                                  'absolute inset-y-0.5 bg-white/18 border-y border-white/85 z-15 pointer-events-none',
                                  prevInActiveBranch ? 'left-0' : 'left-0.5 border-l',
                                  nextInActiveBranch ? 'right-0' : 'right-0.5 border-r',
                                )}
                              />
                            )}

                            {/* Badge mốc bắt đầu của chủ đề nhánh (N1, N2, ...) */}
                            {isSubThemeStart && matchedSubIdx !== -1 && (
                              <span
                                className={cn(
                                  'absolute top-0.5 left-0.5 z-20 text-[8px] font-mono font-bold leading-none px-0.5 py-0.2 rounded-none shadow-xs transition-colors',
                                  activeSubThemeIndex === matchedSubIdx
                                    ? 'bg-white text-[#1447e6] ring-1 ring-[#1447e6]/40 font-extrabold shadow-sm'
                                    : 'bg-slate-900 text-white',
                                )}
                                title={`Bắt đầu Nhánh ${matchedSubIdx + 1}: ${matchedSubTheme.name}`}
                              >
                                N{matchedSubIdx + 1}
                              </span>
                            )}

                            {/* Số ngày */}
                            <span
                              className={cn(
                                'relative z-20 w-full h-full flex items-center justify-center text-[12px] transition-colors',
                                isAssignedSubTheme && 'text-white font-semibold',
                                isUnassignedInTheme && !isHolidayDay && 'text-[#1447e6] dark:text-blue-400 font-bold',
                                isHolidayDay && !isSelectedDate && 'text-amber-800 dark:text-amber-200 font-semibold',
                                isInOtherTheme && !isHolidayDay && 'text-muted-foreground/80 dark:text-muted-foreground font-normal',
                                isUnassignedInAcademicYear && !isHolidayDay && 'text-foreground/80 font-normal',
                                isOutsideAcademicYear && 'text-muted-foreground/30 font-light',
                                !isSelectedDate && !isInOtherTheme && !isUnassignedInAcademicYear && !isOutsideAcademicYear && !isHolidayDay && 'text-foreground/75',
                              )}
                            >
                              {d.day}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Thanh chú thích tinh gọn & cân đối (Lưới 2 cột đều nhau) */}
              <div className="pt-2.5 border-t border-border/60 grid grid-cols-2 gap-x-2 gap-y-2 text-[11px] text-muted-foreground select-none">
                <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap" title="Chủ đề đang xem">
                  <span className="size-2.5 bg-[#1447e6] shrink-0" />
                  <span className="font-medium text-foreground/85">{t('curriculum.thisTheme', 'Chủ đề này')}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap" title="Chưa xếp nhánh">
                  <span
                    className="size-2.5 border border-[#1447e6]/40 shrink-0"
                    style={{
                      background:
                        'repeating-linear-gradient(45deg, rgba(20, 71, 230, 0.2), rgba(20, 71, 230, 0.2) 2px, rgba(20, 71, 230, 0.4) 2px, rgba(20, 71, 230, 0.4) 4px)',
                    }}
                  />
                  <span>{t('curriculum.unallocatedSubTheme', 'Chưa xếp nhánh')}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap" title="Ngày nghỉ lễ">
                  <span className="size-2.5 bg-amber-100/80 border border-amber-300/40 dark:bg-amber-950/50 dark:border-amber-700/40 shrink-0" />
                  <span>Nghỉ lễ</span>
                </div>

                {/* Popover Hướng dẫn quy ước màu sắc chuẩn UX */}
                <div className="flex items-center">
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0 whitespace-nowrap"
                        title="Xem quy ước hiển thị lịch"
                      >
                        <HugeiconsIcon icon={InformationCircleIcon} size={12} className="shrink-0" />
                        <span>Quy ước</span>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      side="top"
                      align="end"
                      sideOffset={8}
                      className="w-72 p-3 bg-card border border-border shadow-md rounded-none text-[11.5px] space-y-2.5 z-50"
                    >
                      <div className="flex items-center justify-between pb-1 border-b border-border/60">
                        <span className="font-semibold text-foreground text-[12px]">
                          Quy ước hiển thị lịch
                        </span>
                      </div>

                      <div className="space-y-1.5 text-[11px]">
                        <div className="flex items-center gap-2">
                          <span className="size-3 bg-[#1447e6] shrink-0" />
                          <span className="text-foreground">{t('curriculum.selectedTheme', 'Chủ đề đang chọn')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className="size-3 border border-[#1447e6]/40 shrink-0"
                            style={{
                              background:
                                'repeating-linear-gradient(45deg, rgba(20, 71, 230, 0.2), rgba(20, 71, 230, 0.2) 2px, rgba(20, 71, 230, 0.4) 2px, rgba(20, 71, 230, 0.4) 4px)',
                            }}
                          />
                          <span className="text-foreground">{t('curriculum.unallocatedSubTheme', 'Chưa xếp nhánh')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="size-3 bg-amber-100/80 border border-amber-300/40 dark:bg-amber-950/50 dark:border-amber-700/40 shrink-0" />
                          <span className="text-foreground">Ngày nghỉ lễ</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="size-3 bg-slate-100 dark:bg-slate-800/60 border border-border/60 shrink-0" />
                          <span className="text-muted-foreground">{t('curriculum.otherTheme', 'Chủ đề khác')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="size-3 border border-dashed border-border/80 bg-muted/20 shrink-0" />
                          <span className="text-muted-foreground">{t('curriculum.noThemeYet', 'Chưa có chủ đề')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="size-3 opacity-25 bg-muted/40 shrink-0" />
                          <span className="text-muted-foreground/70">{t('curriculum.outOfSchoolYear', 'Ngoài năm học')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold px-1 py-0.2 bg-slate-900 text-white shrink-0">
                            N1
                          </span>
                          <span className="text-foreground">{t('curriculum.branchStartMilestone', 'Mốc bắt đầu chủ đề nhánh')}</span>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Thanh thao tác: Công bố bộ chủ đề */}
              {!isSchoolYearEnded && (
                <div className="pt-2.5 border-t border-border/70 select-none">
                  <div className="flex items-center gap-2">
                    {isAllPublished ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleTogglePublish}
                        className="w-full h-10 px-4 border border-border bg-card hover:bg-muted text-foreground text-[13.5px] font-medium rounded-none shadow-none cursor-pointer flex items-center justify-center gap-2 transition-colors"
                      >
                        <HugeiconsIcon icon={Cancel01Icon} size={16} className="text-muted-foreground" />
                        <span>{t('curriculum.unpublishThemeSet', 'Gỡ công bố bộ chủ đề')}</span>
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        disabled={!hasSelectedTopic || themes.length === 0 || isTeacher || isSaving}
                        onClick={handleTogglePublish}
                        className="w-full h-10 px-4 bg-[#1447e6] hover:bg-[#1447e6]/90 text-white text-[13.5px] font-semibold rounded-none shadow-sm cursor-pointer flex items-center justify-center gap-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        title={!hasSelectedTopic || themes.length === 0 ? 'Cần tạo ít nhất một chủ đề để công bố' : 'Công bố bộ chủ đề'}
                      >
                        <HugeiconsIcon icon={SentIcon} size={16} className="text-white" />
                        <span>Công bố bộ chủ đề</span>
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
      </div>
    </div>
  );
}

export default CurriculumThemeDetailPage;
