import React, { useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Search01Icon,
  Menu01Icon,
  DashboardSquare02Icon,
  PencilEdit02Icon,
} from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  useAcademicYearStore,
  getDayAfterDisplayDate,
  isAcademicYearInUse,
} from './academic-years.store';
import { AcademicYearGlassEmblem } from './components/AcademicYearGlassEmblem';
import { AcademicYearCard } from './components/AcademicYearCard';
import { AcademicYearFilterDropdown } from './components/AcademicYearFilterDropdown';
import { AcademicYearDrawer } from './components/AcademicYearDrawer';
import { QuickColorPopover } from './components/QuickColorPopover';
import { cn } from '@/shared/lib/utils';

export function AcademicYearsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isViewAll = searchParams.get('view') === 'all' || searchParams.get('list') === 'true';

  const {
    academicYears,
    isLoading,
    viewMode,
    setViewMode,
    searchQuery,
    setSearchQuery,
    filterStatus,
    sortBy,
    hideEnded,
    onlyActive,
    openEditDrawer,
    fetchAcademicYears,
  } = useAcademicYearStore();

  useEffect(() => {
    fetchAcademicYears();
  }, [fetchAcademicYears]);

  // Mặc định chọn năm học đang hoạt động khi truy cập tab năm học
  useEffect(() => {
    if (!isViewAll && !isLoading && academicYears.length > 0) {
      const activeYear =
        academicYears.find((y) => y.status === 'ACTIVE' || y.active) ||
        academicYears[0];
      if (activeYear?.id) {
        useAcademicYearStore.getState().setSelectedYearId(String(activeYear.id));
        navigate(`/school-years/${activeYear.id}`, { replace: true });
      }
    }
  }, [isViewAll, isLoading, academicYears, navigate]);

  // Filter and sort
  const filteredYears = useMemo(() => {
    let list = [...academicYears];

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (y) =>
          y.name.toLowerCase().includes(q) ||
          y.range.toLowerCase().includes(q),
      );
    }

    // Filter status
    if (onlyActive || filterStatus === 'active') {
      list = list.filter((y) => y.active);
    } else if (filterStatus === 'ended') {
      list = list.filter((y) => !y.active);
    }

    // Hide ended
    if (hideEnded) {
      list = list.filter((y) => y.active);
    }

    // Sort
    list.sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return a.range.localeCompare(b.range);
        case 'name':
          return a.name.localeCompare(b.name);
        case 'startDate':
          return a.startDate.localeCompare(b.startDate);
        case 'endDate':
          return a.endDate.localeCompare(b.endDate);
        case 'classCount':
          return b.totalClasses - a.totalClasses;
        case 'newest':
        default:
          return b.range.localeCompare(a.range);
      }
    });

    return list;
  }, [academicYears, searchQuery, filterStatus, sortBy, hideEnded, onlyActive]);

  if (!isViewAll && (isLoading || academicYears.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 text-muted-foreground select-none">
        <div className="size-7 border-2 border-primary border-t-transparent animate-spin rounded-full" />
        <span className="text-[13px] font-medium">Đang mở năm học đang hoạt động...</span>
      </div>
    );
  }

  return (
    <div
      className="w-full flex-1 flex flex-col gap-6 max-w-[1300px] mx-auto text-foreground"
      data-node-id="4144:2263"
      data-name="FE-03A · Academic Years · List"
    >
      {/* Top Header Section (Figma 4144:2264) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Title and Subtitle */}
        <div className="flex flex-col gap-1">
          <h1 className="text-[24px] font-semibold text-foreground tracking-tight">
            {t('schoolYear.title')}
          </h1>
          <p className="text-[13px] text-muted-foreground font-normal">
            {t('schoolYear.subtitle')}
          </p>
        </div>

        {/* Right Action Bar */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Search Input */}
          <div className="relative w-[260px] h-8">
            <HugeiconsIcon
              icon={Search01Icon}
              size={15}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('schoolYear.searchPlaceholder', 'Tìm kiếm năm học...')}
              className="h-8 pl-8 pr-2.5 text-[13px] bg-background border-border rounded-none shadow-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          {/* Filter Dropdown Popover (Figma 4173:3219) */}
          <AcademicYearFilterDropdown />

          {/* View Mode Switcher (Matching TeachersPage and AccountsPage) */}
          <div className="flex items-center border border-border bg-card rounded-none overflow-hidden h-8">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              title={t('schoolYear.listView', 'Dạng bảng')}
              className={cn(
                'size-8 flex items-center justify-center transition-colors cursor-pointer border-r border-border',
                viewMode === 'list'
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
              )}
              data-name="List View"
            >
              <HugeiconsIcon icon={Menu01Icon} size={15} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              title={t('schoolYear.gridView', 'Dạng lưới')}
              className={cn(
                'size-8 flex items-center justify-center transition-colors cursor-pointer',
                viewMode === 'grid'
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
              )}
              data-name="Grid View"
            >
              <HugeiconsIcon icon={DashboardSquare02Icon} size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Section Subheader: "Danh sách năm học" - "{count} năm học" (Figma 4150:2991) */}
      <div className="flex items-center justify-between border-b border-border/40 pb-2">
        <h2 className="text-[16px] font-semibold text-foreground tracking-tight">
          {t('schoolYear.listTitle')}
        </h2>
        <span className="text-[12px] text-muted-foreground font-normal">
          {isLoading && academicYears.length === 0
            ? 'Đang tải...'
            : t('schoolYear.yearCount', { count: filteredYears.length })}
        </span>
      </div>

      {/* View Content: List vs Grid */}
      {viewMode === 'list' ? (
        /* FE-03A · Academic Years · List (Figma 4150:2994) */
        <div
          className="w-full bg-card border border-border rounded-none overflow-x-auto shadow-xs"
          data-node-id="4150:2994"
        >
          {/* Table Header (Figma 4150:2995) */}
          <div className="bg-[#f7f7f7] dark:bg-muted/40 h-10 px-4 flex items-center text-[12px] font-medium text-muted-foreground border-b border-border min-w-[820px]">
            <div className="flex-[2] min-w-[280px]">
              {t('schoolYear.colName')}
            </div>
            <div className="w-[150px]">{t('schoolYear.colStatus')}</div>
            <div className="w-[130px]">{t('schoolYear.colTotalClasses')}</div>
            <div className="w-[200px]">{t('schoolYear.semester1', 'Học kỳ 1')}</div>
            <div className="w-[200px]">{t('schoolYear.semester2', 'Học kỳ 2')}</div>
            <div className="w-[110px] text-right font-medium">Thao tác</div>
          </div>

          {/* Table Rows */}
          {isLoading && academicYears.length === 0 ? (
            Array.from({ length: 4 }).map((_, idx) => (
              <div
                key={idx}
                className="min-h-[92px] px-4 flex items-center border-b border-border last:border-b-0 animate-pulse min-w-[820px]"
              >
                <div className="flex-[2] min-w-[280px] flex items-center gap-3 py-3">
                  <div className="size-14 bg-muted/60 rounded-none shrink-0" />
                  <div className="flex flex-col gap-2">
                    <div className="h-4 w-36 bg-muted/60 rounded-none" />
                    <div className="h-3 w-24 bg-muted/40 rounded-none" />
                  </div>
                </div>
                <div className="w-[150px]">
                  <div className="h-5 w-20 bg-muted/50 rounded-none" />
                </div>
                <div className="w-[130px]">
                  <div className="h-4 w-16 bg-muted/50 rounded-none" />
                </div>
                <div className="w-[200px]">
                  <div className="h-4 w-32 bg-muted/50 rounded-none" />
                </div>
                <div className="w-[200px]">
                  <div className="h-4 w-32 bg-muted/50 rounded-none" />
                </div>
                <div className="w-[110px] flex justify-end">
                  <div className="size-7 bg-muted/50 rounded-none" />
                </div>
              </div>
            ))
          ) : filteredYears.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              Không tìm thấy năm học phù hợp
            </div>
          ) : (
            filteredYears.map((year) => (
              <div
                key={year.id}
                onClick={() => navigate(`/school-years/${year.id}`)}
                className="min-h-[92px] px-4 flex items-center border-b border-border last:border-b-0 hover:bg-muted/40 transition-colors cursor-pointer select-none min-w-[820px]"
                data-node-id={`Academic Year Row · ${year.name}`}
              >
                {/* Column 1: Emblem + Title + Subtitle */}
                <div className="flex-[2] min-w-[280px] flex items-center gap-3 py-3">
                  <AcademicYearGlassEmblem
                    theme={year.colorTheme}
                    size={56}
                    avatarUrl={year.avatarUrl}
                    year={year}
                    alt={year.name}
                  />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[14px] font-semibold text-foreground">
                      {year.name}
                    </span>
                    <span className="text-[12px] text-muted-foreground font-normal">
                      {t('schoolYear.clickToOverview')}
                    </span>
                  </div>
                </div>

                {/* Column 2: Status */}
                <div className="w-[150px]">
                  <span
                    className={cn(
                      'text-[14px] font-medium',
                      year.active || year.status === 'ACTIVE'
                        ? 'text-[#1447e6] dark:text-[#3B82F6]'
                        : year.status === 'UPCOMING' || year.status === 'DRAFT'
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-muted-foreground',
                    )}
                  >
                    {year.active || year.status === 'ACTIVE'
                      ? t('schoolYear.active', 'Đang hoạt động')
                      : year.status === 'UPCOMING' || year.status === 'DRAFT'
                        ? t('schoolYear.draft', 'Bản nháp')
                        : t('schoolYear.ended', 'Đã kết thúc')}
                  </span>
                </div>

                {/* Column 3: Total Classes */}
                <div className="w-[130px] text-[14px] text-foreground font-normal">
                  {year.totalClasses} {t('schoolYear.classesSuffix')}
                </div>

                {/* Column 4: Semester 1 */}
                <div className="w-[200px] text-[13px] text-foreground font-normal">
                  {year.startDate} – {year.semester1EndDate || '15/01/2027'}
                </div>

                {/* Column 5: Semester 2 */}
                <div className="w-[200px] text-[13px] text-foreground font-normal">
                  {getDayAfterDisplayDate(year.semester1EndDate) || '16/01/2027'} – {year.endDate}
                </div>

                {/* Column 6: Actions (Quick Color & Edit) */}
                <div
                  className="w-[110px] flex items-center justify-end gap-1.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <QuickColorPopover year={year} />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditDrawer(year.id);
                    }}
                    title={t('schoolYear.editYear', 'Chỉnh sửa năm học & biểu tượng')}
                    className="size-7 flex items-center justify-center border border-border rounded-none transition-colors bg-background hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <HugeiconsIcon icon={PencilEdit02Icon} size={13} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* FE-03D · Academic Years · Grid (Figma 4171:3149) */
        <div
          className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full"
          data-node-id="4171:3149"
        >
          {isLoading && academicYears.length === 0 ? (
            Array.from({ length: 4 }).map((_, idx) => (
              <div
                key={idx}
                className="w-full bg-card border border-border rounded-none p-6 flex flex-col justify-between gap-5 animate-pulse h-[190px]"
              >
                <div className="flex flex-col gap-2">
                  <div className="h-4 w-36 bg-muted/60 rounded-none" />
                  <div className="h-3 w-24 bg-muted/40 rounded-none" />
                </div>
                <div className="flex items-center gap-6 pt-1">
                  <div className="size-20 bg-muted/60 rounded-none shrink-0" />
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 flex-1">
                    <div className="h-8 bg-muted/40 rounded-none" />
                    <div className="h-8 bg-muted/40 rounded-none" />
                    <div className="h-8 bg-muted/40 rounded-none" />
                    <div className="h-8 bg-muted/40 rounded-none" />
                  </div>
                </div>
              </div>
            ))
          ) : filteredYears.length === 0 ? (
            <div className="col-span-2 p-12 text-center text-sm text-muted-foreground border border-border bg-card">
              Không tìm thấy năm học phù hợp
            </div>
          ) : (
            filteredYears.map((year) => (
              <AcademicYearCard key={year.id} year={year} />
            ))
          )}
        </div>
      )}

      {/* Slide-over Drawer for Edit & Create (FE-03C) */}
      <AcademicYearDrawer />
    </div>
  );
}
