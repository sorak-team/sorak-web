import React, { useState, useEffect, useMemo } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  PlusSignIcon,
  File02Icon,
  Calendar03Icon,
  TableIcon,
  PencilEdit02Icon,
  Delete02Icon,
  Search01Icon,
  FilterHorizontalIcon,
  CheckmarkSquare02Icon,
  MoreHorizontalIcon,
} from '@hugeicons/core-free-icons';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { TablePagination } from '@/shared/components/TablePagination';
import { academicYearsApi } from '../academic-years.api';
import { HolidayEditDrawer } from './HolidayEditDrawer';
import { HolidayImportDrawer } from './HolidayImportDrawer';
import { cn } from '@/shared/lib/utils';

// Helper to parse date strings (YYYY-MM-DD or DD/MM/YYYY)
function parseDate(dateInput) {
  if (!dateInput) return null;
  if (dateInput instanceof Date) return dateInput;
  if (typeof dateInput === 'string') {
    if (dateInput.includes('/')) {
      const [d, m, y] = dateInput.split('/');
      return new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
    }
    if (dateInput.includes('-')) {
      const [y, m, d] = dateInput.split('T')[0].split('-');
      return new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
    }
  }
  return new Date(dateInput);
}

// Helper to format date to YYYY-MM-DD
function formatYMD(d) {
  if (!d) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper to format date string to DD/MM/YYYY
function formatDisplayDate(dateInput) {
  if (!dateInput) return '';
  const d = parseDate(dateInput);
  if (!d || isNaN(d.getTime())) return dateInput;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function AcademicCalendarView({
  schoolYearId,
  schoolYearName,
  startDate,
  endDate,
  onCountersUpdate,
}) {
  const [holidaysData, setHolidaysData] = useState(null);
  const [loading, setLoading] = useState(true);

  // 1. Calculate school year boundaries
  const schoolYearBounds = useMemo(() => {
    const s = parseDate(startDate) || new Date(2026, 8, 5); // default: 05/09/2026
    const e = parseDate(endDate) || new Date(2027, 4, 31);   // default: 31/05/2027

    // Build array of valid months strictly between start date and end date
    const months = [];
    const cur = new Date(s.getFullYear(), s.getMonth(), 1);
    const endMonth = new Date(e.getFullYear(), e.getMonth(), 1);

    while (cur <= endMonth) {
      months.push({
        year: cur.getFullYear(),
        month: cur.getMonth(),
        label: `Tháng ${cur.getMonth() + 1}/${cur.getFullYear()}`,
        value: `${cur.getFullYear()}-${cur.getMonth()}`,
      });
      cur.setMonth(cur.getMonth() + 1);
    }

    return {
      startDateObj: s,
      endDateObj: e,
      startDateStr: formatYMD(s),
      endDateStr: formatYMD(e),
      months,
      initialMonth: s.getMonth(),
      initialYear: s.getFullYear(),
    };
  }, [startDate, endDate]);

  // Current navigation month/year (strictly within the school year)
  const [currentMonth, setCurrentMonth] = useState(() => schoolYearBounds.initialMonth);
  const [currentYear, setCurrentYear] = useState(() => schoolYearBounds.initialYear);

  // Sync if school year changes
  useEffect(() => {
    if (schoolYearBounds.months.length > 0) {
      const inBounds = schoolYearBounds.months.some(
        (m) => m.year === currentYear && m.month === currentMonth,
      );
      if (!inBounds) {
        setCurrentYear(schoolYearBounds.initialYear);
        setCurrentMonth(schoolYearBounds.initialMonth);
      }
    }
  }, [schoolYearBounds]);

  // Check navigation limits
  const canPrevMonth = useMemo(() => {
    if (schoolYearBounds.months.length === 0) return false;
    const first = schoolYearBounds.months[0];
    return !(currentYear === first.year && currentMonth === first.month);
  }, [schoolYearBounds, currentYear, currentMonth]);

  const canNextMonth = useMemo(() => {
    if (schoolYearBounds.months.length === 0) return false;
    const last = schoolYearBounds.months[schoolYearBounds.months.length - 1];
    return !(currentYear === last.year && currentMonth === last.month);
  }, [schoolYearBounds, currentYear, currentMonth]);

  // View & Filter states
  const [viewMode, setViewMode] = useState('GRID'); // 'GRID' | 'LIST'
  const [filterType, setFilterType] = useState('ALL'); // 'ALL' | 'HOLIDAY' | 'EVENT'
  const [scopeFilter, setScopeFilter] = useState('ALL'); // 'ALL' | 'TOAN_TRUONG' | 'NHA_TRE' | 'MAM' | 'CHOI' | 'LA'
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Selected date & Drawers
  const [selectedDate, setSelectedDate] = useState('2026-09-05');
  const [holidayToEdit, setHolidayToEdit] = useState(null);
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [isImportDrawerOpen, setIsImportDrawerOpen] = useState(false);

  const fetchHolidays = async () => {
    try {
      setLoading(true);
      const res = await academicYearsApi.listHolidays(schoolYearId);
      setHolidaysData(res);
      if (onCountersUpdate && res?.counters) {
        onCountersUpdate(res.counters);
      }
    } catch (err) {
      console.error('Failed to load holidays:', err);
      toast.error('Không thể tải lịch năm học');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (schoolYearId) {
      fetchHolidays();
    }
  }, [schoolYearId]);

  // Navigation handlers bounded to school year
  const handlePrevMonth = () => {
    if (!canPrevMonth) return;
    const idx = schoolYearBounds.months.findIndex(
      (m) => m.year === currentYear && m.month === currentMonth,
    );
    if (idx > 0) {
      const prev = schoolYearBounds.months[idx - 1];
      setCurrentYear(prev.year);
      setCurrentMonth(prev.month);
    }
  };

  const handleNextMonth = () => {
    if (!canNextMonth) return;
    const idx = schoolYearBounds.months.findIndex(
      (m) => m.year === currentYear && m.month === currentMonth,
    );
    if (idx !== -1 && idx < schoolYearBounds.months.length - 1) {
      const next = schoolYearBounds.months[idx + 1];
      setCurrentYear(next.year);
      setCurrentMonth(next.month);
    }
  };

  // Keyboard navigation for switching months with ArrowLeft / ArrowRight
  useEffect(() => {
    if (viewMode !== 'GRID') return;

    const handleKeyDown = (e) => {
      // Ignore if user is typing in form controls
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || document.activeElement?.isContentEditable) {
        return;
      }
      // Ignore if drawers or dialogs are open
      if (isEditDrawerOpen || isImportDrawerOpen) {
        return;
      }

      if (e.key === 'ArrowLeft') {
        if (canPrevMonth) {
          e.preventDefault();
          handlePrevMonth();
        }
      } else if (e.key === 'ArrowRight') {
        if (canNextMonth) {
          e.preventDefault();
          handleNextMonth();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, canPrevMonth, canNextMonth, isEditDrawerOpen, isImportDrawerOpen, currentYear, currentMonth, schoolYearBounds]);

  const handleOpenAdd = (dateStr = null) => {
    setHolidayToEdit(null);
    setSelectedDate(
      dateStr || `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-15`,
    );
    setIsEditDrawerOpen(true);
  };

  const handleOpenEdit = (holiday) => {
    setHolidayToEdit(holiday);
    setIsEditDrawerOpen(true);
  };

  const handleDeleteQuick = async (holiday) => {
    if (window.confirm(`Xóa "${holiday.name}" khỏi lịch năm học?`)) {
      try {
        await academicYearsApi.deleteHoliday(schoolYearId, holiday.id);
        toast.success(`Đã xóa "${holiday.name}"!`);
        fetchHolidays();
      } catch (err) {
        toast.error('Xóa thất bại', {
          description: err.response?.data?.message || err.message,
        });
      }
    }
  };

  // Generate calendar cells for current month
  // NOTE: Padding cells before/after the month are left completely BLANK (no faded numbers)
  const calendarCells = useMemo(() => {
    const cells = [];
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
    // Monday = index 0 in Vietnam calendar
    const startOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

    // Blank cells before the 1st of the month (NO numbers)
    for (let i = 0; i < startOffset; i++) {
      cells.push({
        day: null,
        isCurrentMonth: false,
        dateString: null,
        isOutsideSchoolYear: true,
      });
    }

    // Days belonging strictly to the current month
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(currentYear, currentMonth, i);
      const dateString = formatYMD(d);
      const isOutside =
        dateString < schoolYearBounds.startDateStr ||
        dateString > schoolYearBounds.endDateStr;

      cells.push({
        day: i,
        isCurrentMonth: true,
        dateString,
        isOutsideSchoolYear: isOutside,
      });
    }

    // Blank trailing cells: ALWAYS pad to exactly 42 cells (6 full rows x 7 days)
    // to prevent vertical layout shift (jumping up/down) when navigating between months
    while (cells.length < 42) {
      cells.push({
        day: null,
        isCurrentMonth: false,
        dateString: null,
        isOutsideSchoolYear: true,
      });
    }

    return cells;
  }, [currentYear, currentMonth, schoolYearBounds]);

  const rawItems = holidaysData?.items || [];

  const filteredItems = useMemo(() => {
    return rawItems.filter((item) => {
      if (filterType === 'HOLIDAY' && item.isTeachingAllowed) return false;
      if (filterType === 'EVENT' && !item.isTeachingAllowed) return false;

      // Scope filter
      if (scopeFilter !== 'ALL') {
        const itemScope = item.scope || 'Toàn trường';
        const tg = Array.isArray(item.targetGrades) ? item.targetGrades : [];
        if (scopeFilter === 'TOAN_TRUONG') {
          if (tg.length > 0) return false;
          if (!itemScope.includes('Toàn trường')) return false;
        } else {
          if (tg.length > 0) {
            if (!tg.includes(scopeFilter)) return false;
          } else {
            if (scopeFilter === 'NHA_TRE' && !itemScope.includes('Nhà trẻ')) return false;
            if (scopeFilter === 'MAM' && !itemScope.includes('Mầm')) return false;
            if (scopeFilter === 'CHOI' && !itemScope.includes('Chồi')) return false;
            if (scopeFilter === 'LA' && !itemScope.includes('Lá')) return false;
          }
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = item.name?.toLowerCase().includes(q);
        const matchDesc = item.description?.toLowerCase().includes(q);
        const matchScope = item.scope?.toLowerCase().includes(q);
        if (!matchName && !matchDesc && !matchScope) return false;
      }
      return true;
    });
  }, [rawItems, filterType, scopeFilter, searchQuery]);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  const getEventsForDate = (dateString) => {
    if (!dateString) return [];
    return filteredItems.filter(
      (h) => dateString >= h.startDate && dateString <= h.endDate,
    );
  };

  return (
    <div className="flex flex-col gap-3.5" data-node-id="5232:24798">
      {/* 1. TOP TOOLBAR: UNIFORM HEIGHT (h-8), CLEAN ALIGNMENT */}
      <div className="border border-border bg-card p-3 sm:px-4 sm:py-3 rounded-none shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left: Clean Month Navigation (In Grid) or Section Title (In List) */}
        <div className="flex items-center gap-2 flex-wrap">
          {viewMode === 'GRID' ? (
            <div className="flex items-center gap-2.5">
              <h2 className="text-[17px] font-semibold text-foreground tracking-tight min-w-[125px]">
                Tháng {currentMonth + 1}/{currentYear}
              </h2>

              {/* Prev / Next buttons bounded to school year */}
              <div className="flex items-center border border-border bg-background rounded-none h-8 overflow-hidden">
                <button
                  type="button"
                  disabled={!canPrevMonth}
                  onClick={handlePrevMonth}
                  title="Tháng trước"
                  className="size-8 inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-colors"
                >
                  <HugeiconsIcon icon={ArrowLeft01Icon} size={14} />
                </button>
                <button
                  type="button"
                  disabled={!canNextMonth}
                  onClick={handleNextMonth}
                  title="Tháng sau"
                  className="size-8 inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-colors border-l border-border"
                >
                  <HugeiconsIcon icon={ArrowRight01Icon} size={14} />
                </button>
              </div>
            </div>
          ) : (
            <div>
              <h2 className="text-[16px] font-semibold text-foreground tracking-tight">
                Danh sách ngày nghỉ & sự kiện năm học
              </h2>
            </div>
          )}
        </div>

        {/* Right: Filters & Actions - strictly uniform h-8 */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Filter Segmented Control */}
          <div className="flex items-center border border-border bg-card rounded-none overflow-hidden h-8 text-[12.5px]">
            <button
              type="button"
              onClick={() => {
                setFilterType('ALL');
                setCurrentPage(1);
              }}
              className={cn(
                'h-full px-3 font-medium transition-colors cursor-pointer border-r border-border',
                filterType === 'ALL'
                  ? 'bg-muted text-foreground font-semibold'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
              )}
            >
              Tất cả
            </button>
            <button
              type="button"
              onClick={() => {
                setFilterType('HOLIDAY');
                setCurrentPage(1);
              }}
              className={cn(
                'h-full px-3 font-medium transition-colors cursor-pointer border-r border-border',
                filterType === 'HOLIDAY'
                  ? 'bg-muted text-[#1447e6] font-semibold'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
              )}
            >
              Ngày nghỉ
            </button>
            <button
              type="button"
              onClick={() => {
                setFilterType('EVENT');
                setCurrentPage(1);
              }}
              className={cn(
                'h-full px-3 font-medium transition-colors cursor-pointer',
                filterType === 'EVENT'
                  ? 'bg-muted text-foreground font-semibold'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
              )}
            >
              Sự kiện
            </button>
          </div>

          {/* View Toggle (Grid vs List) - strictly h-8 matching StudentsPage */}
          <div className="flex items-center border border-border bg-card rounded-none overflow-hidden h-8">
            <button
              type="button"
              onClick={() => setViewMode('GRID')}
              title="Xem theo Lịch tháng"
              className={cn(
                'size-8 flex items-center justify-center transition-colors cursor-pointer border-r border-border',
                viewMode === 'GRID'
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
              )}
            >
              <HugeiconsIcon icon={Calendar03Icon} size={15} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('LIST')}
              title="Xem theo Danh sách bảng"
              className={cn(
                'size-8 flex items-center justify-center transition-colors cursor-pointer',
                viewMode === 'LIST'
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
              )}
            >
              <HugeiconsIcon icon={TableIcon} size={15} />
            </button>
          </div>

          {/* Import */}
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsImportDrawerOpen(true)}
            className="h-8 px-3 inline-flex items-center gap-1.5 text-[13px] font-medium border-border rounded-none shadow-none hover:bg-muted cursor-pointer"
          >
            <HugeiconsIcon icon={File02Icon} size={14} />
            <span>Import</span>
          </Button>

          {/* Add Holiday Button */}
          <Button
            type="button"
            onClick={() => handleOpenAdd()}
            className="h-8 px-3.5 inline-flex items-center gap-1.5 text-[13px] font-medium bg-[#1447e6] hover:bg-[#1447e6]/90 text-white rounded-none shadow-none cursor-pointer"
          >
            <HugeiconsIcon icon={PlusSignIcon} size={14} />
            <span>Thêm lịch</span>
          </Button>
        </div>
      </div>

      {/* 2. CALENDAR GRID VIEW */}
      {viewMode === 'GRID' ? (
        <div className="border border-border bg-card rounded-none shadow-2xs overflow-hidden">
          {/* Days of week header (T2 -> CN) */}
          <div className="grid grid-cols-7 border-b border-border bg-muted/20 text-center text-[11.5px] font-medium text-muted-foreground py-2 select-none tracking-wider">
            <span>Thứ 2</span>
            <span>Thứ 3</span>
            <span>Thứ 4</span>
            <span>Thứ 5</span>
            <span>Thứ 6</span>
            <span>Thứ 7</span>
            <span>Chủ nhật</span>
          </div>

          {/* 7-column Calendar Cells */}
          <div className="grid grid-cols-7 divide-x divide-y divide-border min-w-[700px]">
            {calendarCells.map((cell, idx) => {
              // Blank padding cells before 1st and after last day of month (no blurred numbers)
              if (!cell.isCurrentMonth) {
                return (
                  <div
                    key={idx}
                    className="h-[108px] min-h-[108px] p-2 bg-muted/5 select-none"
                    aria-hidden="true"
                  />
                );
              }

              const cellEvents = getEventsForDate(cell.dateString);
              const isSelectedDay = cell.dateString === selectedDate;
              const isOutside = cell.isOutsideSchoolYear;

              return (
                <div
                  key={idx}
                  onClick={() => {
                    if (isOutside) return;
                    setSelectedDate(cell.dateString);
                    if (cellEvents.length === 0) {
                      handleOpenAdd(cell.dateString);
                    }
                  }}
                  className={cn(
                    'h-[108px] min-h-[108px] p-1.5 sm:p-2 transition-colors relative flex flex-col justify-between rounded-none overflow-hidden',
                    isOutside
                      ? 'bg-muted/10 cursor-not-allowed select-none'
                      : isSelectedDay
                        ? 'bg-blue-50/40 dark:bg-blue-950/20 cursor-pointer'
                        : 'bg-card hover:bg-muted/15 cursor-pointer group',
                  )}
                >
                  {/* Cell Top Header: Date number */}
                  <div className="flex items-center justify-between mb-1">
                    {isSelectedDay && !isOutside ? (
                      <span className="size-5 bg-[#1447e6] text-white flex items-center justify-center text-[11px] font-semibold font-mono rounded-none">
                        {cell.day}
                      </span>
                    ) : (
                      <span
                        className={cn(
                          'text-[12px] font-mono',
                          isOutside
                            ? 'text-muted-foreground/30'
                            : 'font-medium text-foreground',
                        )}
                      >
                        {cell.day}
                      </span>
                    )}

                    {/* Quick Add on cell hover */}
                    {!isOutside && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenAdd(cell.dateString);
                        }}
                        className="opacity-0 group-hover:opacity-100 size-4.5 inline-flex items-center justify-center text-muted-foreground hover:text-[#1447e6] transition-opacity cursor-pointer"
                        title="Thêm lịch vào ngày này"
                      >
                        <HugeiconsIcon icon={PlusSignIcon} size={11} />
                      </button>
                    )}
                  </div>

                  {/* Event Text wrapping to next lines (Text rớt xuống dòng) */}
                  <div className="flex-1 space-y-1 overflow-y-auto scrollbar-none">
                    {cellEvents.map((evt, eIdx) => {
                      const isHoliday = !evt.isTeachingAllowed;

                      return (
                        <div
                          key={evt.id || eIdx}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEdit(evt);
                          }}
                          className={cn(
                            'w-full text-left px-2 py-1 text-[11px] font-medium leading-snug rounded-none border-l-2 transition-all cursor-pointer whitespace-normal break-words select-none shadow-2xs hover:opacity-90',
                            isHoliday
                              ? 'bg-blue-50/90 text-[#1447e6] border-l-[#1447e6] border-y border-r border-blue-200/60 dark:bg-blue-950/40 dark:text-blue-300'
                              : 'bg-muted/60 text-foreground border-l-slate-400 border-y border-r border-border hover:bg-muted',
                          )}
                          title={`${evt.name} (${isHoliday ? 'Ngày nghỉ' : 'Sự kiện'})`}
                        >
                          <span className="break-words leading-tight block">
                            {evt.name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Clean 1-line Footer: Realistic Legend & Keyboard Shortcut Hint */}
          <div className="px-5 py-3 border-t border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[12.5px] select-none">
            {/* Left: Clean, realistic event tag legends */}
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center px-2.5 py-0.5 text-[11.5px] font-medium border-l-2 border-l-[#1447e6] border-y border-r border-blue-200/60 bg-blue-50/90 text-[#1447e6] dark:bg-blue-950/40 dark:text-blue-300 rounded-none shadow-2xs">
                Ngày nghỉ
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 text-[11.5px] font-medium border-l-2 border-l-slate-400 border-y border-r border-border bg-muted/60 text-foreground rounded-none shadow-2xs">
                Sự kiện
              </span>
            </div>

            {/* Right: Keyboard navigation hint (matching user design) */}
            <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
              <span>Chuyển tháng: phím</span>
              <kbd className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-[11px] font-mono bg-muted/70 border border-border rounded-none text-foreground shadow-2xs font-semibold">
                ←
              </kbd>
              <span>/</span>
              <kbd className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-[11px] font-mono bg-muted/70 border border-border rounded-none text-foreground shadow-2xs font-semibold">
                →
              </kbd>
            </div>
          </div>
        </div>
      ) : (
        /* 3. TABLE / LIST VIEW - Strictly follows StudentsPage / StudentTable standard */
        <div className="flex flex-col gap-4">
          <div className="border border-border bg-card rounded-none shadow-2xs overflow-hidden">
            {/* Table Search & Filter Toolbar: Count on left, Search & Filter on right */}
            <div className="px-6 py-4 border-b border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <span className="text-[13px] text-muted-foreground font-normal">
                {filteredItems.length} mục trong năm học
              </span>

              <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap justify-end">
                {/* Search Input */}
                <div className="relative w-full sm:w-[260px] h-8">
                  <HugeiconsIcon
                    icon={Search01Icon}
                    size={15}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                  />
                  <Input
                    type="text"
                    placeholder="Tìm ngày nghỉ, sự kiện..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="h-8 pl-8 pr-2.5 text-[13px] bg-background border-border rounded-none shadow-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>

                {/* Scope Filter Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        'size-8 bg-background border border-border text-foreground hover:bg-muted/50 rounded-none flex items-center justify-center transition-colors cursor-pointer select-none',
                        scopeFilter !== 'ALL' && 'border-primary text-primary bg-primary/5',
                      )}
                      title="Lọc theo khối"
                    >
                      <HugeiconsIcon icon={FilterHorizontalIcon} size={16} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-56 p-1.5 rounded-none border border-border bg-card shadow-xl z-50 text-foreground"
                  >
                    <DropdownMenuLabel className="px-2 py-1 text-[12px] font-medium text-muted-foreground">
                      Lọc theo phạm vi áp dụng
                    </DropdownMenuLabel>
                    {[
                      { key: 'ALL', label: 'Tất cả phạm vi' },
                      { key: 'TOAN_TRUONG', label: 'Toàn trường' },
                      { key: 'NHA_TRE', label: 'Khối Nhà trẻ' },
                      { key: 'MAM', label: 'Khối Mầm' },
                      { key: 'CHOI', label: 'Khối Chồi' },
                      { key: 'LA', label: 'Khối Lá' },
                    ].map((item) => (
                      <DropdownMenuItem
                        key={item.key}
                        onClick={() => {
                          setScopeFilter(item.key);
                          setCurrentPage(1);
                        }}
                        className="flex items-center justify-between h-8 px-2 text-[13px] cursor-pointer rounded-none hover:bg-muted/60"
                      >
                        <span>{item.label}</span>
                        {scopeFilter === item.key && (
                          <HugeiconsIcon
                            icon={CheckmarkSquare02Icon}
                            size={14}
                            className="text-primary shrink-0"
                          />
                        )}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {(searchQuery || scopeFilter !== 'ALL' || filterType !== 'ALL') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setScopeFilter('ALL');
                      setFilterType('ALL');
                      setCurrentPage(1);
                    }}
                    className="h-8 px-2 text-[12px] text-muted-foreground hover:text-foreground underline cursor-pointer"
                  >
                    Xóa bộ lọc
                  </button>
                )}
              </div>
            </div>

            {/* Table: Fit 100% container without horizontal scrollbar */}
            <div className="w-full">
              <table className="w-full text-left border-collapse table-fixed">
                <thead>
                  <tr className="h-11 border-b border-border bg-muted/20 text-[13px] font-medium text-foreground">
                    <th className="px-4 py-3 font-medium w-[25%]">Tên ngày nghỉ / Sự kiện</th>
                    <th className="px-3 py-3 font-medium w-[24%]">Thời gian</th>
                    <th className="px-3 py-3 font-medium w-[12%]">Phân loại</th>
                    <th className="px-3 py-3 font-medium w-[15%]">Thời khóa biểu</th>
                    <th className="px-3 py-3 font-medium w-[12%]">Phạm vi áp dụng</th>
                    <th className="px-3 py-3 font-medium w-[12%]">Ghi chú</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {paginatedItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-16 text-center text-muted-foreground text-[13.5px]">
                        Không tìm thấy ngày nghỉ hoặc sự kiện nào phù hợp.
                      </td>
                    </tr>
                  ) : (
                    paginatedItems.map((item) => {
                      const isHoliday = !item.isTeachingAllowed;
                      const s = new Date(item.startDate);
                      const e = new Date(item.endDate);
                      const days = Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1;

                      return (
                        <tr
                          key={item.id}
                          onClick={() => handleOpenEdit(item)}
                          className="h-[60px] hover:bg-muted/30 transition-colors cursor-pointer group"
                        >
                          <td className="px-4 py-3.5">
                            <span
                              className="font-medium text-foreground group-hover:text-primary transition-colors block text-[13.5px] truncate"
                              title={item.name}
                            >
                              {item.name}
                            </span>
                          </td>
                          <td className="px-3 py-3.5 whitespace-nowrap">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[13px] text-foreground font-medium whitespace-nowrap">
                                {item.startDate === item.endDate
                                  ? formatDisplayDate(item.startDate)
                                  : `${formatDisplayDate(item.startDate)} – ${formatDisplayDate(item.endDate)}`}
                              </span>
                              <span className="text-[12px] text-muted-foreground">
                                {days} ngày
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-3.5">
                            {isHoliday ? (
                              <span className="inline-flex items-center justify-center px-2 py-0.5 text-[12px] font-medium bg-blue-100 text-[#1447e6] dark:bg-blue-950/60 dark:text-blue-300 rounded-none whitespace-nowrap">
                                Ngày nghỉ
                              </span>
                            ) : (
                              <span className="inline-flex items-center justify-center px-2 py-0.5 text-[12px] font-medium bg-secondary text-secondary-foreground rounded-none whitespace-nowrap">
                                Sự kiện
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-3.5">
                            <span className="text-[13px] text-muted-foreground font-normal whitespace-nowrap">
                              {isHoliday ? 'Khóa lịch dạy' : 'Dạy bình thường'}
                            </span>
                          </td>
                          <td className="px-3 py-3.5">
                            <span
                              className="text-[13px] text-foreground font-normal truncate block"
                              title={item.scope || 'Toàn trường'}
                            >
                              {item.scope || 'Toàn trường'}
                            </span>
                          </td>
                          <td className="px-3 py-3.5">
                            <span
                              className="text-[13px] text-muted-foreground truncate block"
                              title={item.description || ''}
                            >
                              {item.description || '—'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination Footer */}
          <TablePagination
            currentPage={currentPage}
            totalItems={filteredItems.length}
            onPageChange={setCurrentPage}
            itemLabel="ngày nghỉ & sự kiện"
          />
        </div>
      )}

      {/* Drawers */}
      <HolidayEditDrawer
        isOpen={isEditDrawerOpen}
        onClose={() => setIsEditDrawerOpen(false)}
        schoolYearId={schoolYearId}
        selectedDate={selectedDate}
        holidayToEdit={holidayToEdit}
        onSuccess={fetchHolidays}
      />

      <HolidayImportDrawer
        isOpen={isImportDrawerOpen}
        onClose={() => setIsImportDrawerOpen(false)}
        schoolYearId={schoolYearId}
        onSuccess={fetchHolidays}
      />
    </div>
  );
}

export default AcademicCalendarView;
