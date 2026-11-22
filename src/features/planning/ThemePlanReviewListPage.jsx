import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Search01Icon,
  FilterHorizontalIcon,
  CheckmarkSquare02Icon,
  RefreshIcon,
  Target01Icon,
  Calendar01Icon,
  ArrowDown01Icon,
} from '@hugeicons/core-free-icons';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/shared/lib/utils';
import { toast } from 'sonner';
import { useAuthStore, isBghRole } from '@/features/auth';
import { ClassVisual } from '@/features/classes';
import { useAcademicYearStore } from '@/features/academic-years';
import { planningApi } from './planning.api';
import { ThemePlanReviewDrawer } from './components/ThemePlanReviewDrawer';

// Age Groups for Filter Dropdown
const AGE_GROUPS = [
  { key: 'ALL', labelKey: 'planning.gradeAll', defaultLabel: 'Tất cả các khối' },
  { key: 'NHA_TRE', labelKey: 'classes.gradeNhaTre', defaultLabel: 'Khối Nhà trẻ' },
  { key: 'MAM', labelKey: 'classes.gradeMam', defaultLabel: 'Khối Mầm' },
  { key: 'CHOI', labelKey: 'classes.gradeChoi', defaultLabel: 'Khối Chồi' },
  { key: 'LA', labelKey: 'classes.gradeLa', defaultLabel: 'Khối Lá' },
];

// Statuses for Filter Dropdown (Role BGH duyệt kế hoạch không lọc bản nháp)
const STATUS_OPTIONS = [
  { key: 'ALL', labelKey: 'planning.statusAll', defaultLabel: 'Tất cả trạng thái' },
  { key: 'PENDING_APPROVAL', labelKey: 'common.pending', defaultLabel: 'Chờ duyệt' },
  { key: 'USED', labelKey: 'common.approved', defaultLabel: 'Đã phê duyệt' },
  { key: 'REJECTED', labelKey: 'planning.statusNeedsRevisionShort', defaultLabel: 'Cần sửa lại' },
];

const getScopeLabels = (t) => ({
  COUNT_2: t('planning.scope2Themes', '2 chủ đề'),
  COUNT_3: t('planning.scope3ThemesFocus', '3 chủ đề (Trọng tâm)'),
  COUNT_4: t('planning.scope4Themes', '4 chủ đề'),
  SEMESTER_1: t('planning.scopeSem1', 'Học kỳ 1 (Chủ đề 1 – 5)'),
  SEMESTER_2: t('planning.scopeSem2', 'Học kỳ 2 (Chủ đề 6 – 10)'),
  FULL_YEAR: t('planning.scopeFullYear', 'Cả năm học (Tất cả Chủ đề)'),
});

// Format short date helper (dd/mm)
function formatDateShort(dateStr) {
  if (!dateStr) return '';
  try {
    const parts = String(dateStr).split('T')[0].split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
    return new Date(dateStr).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  } catch {
    return dateStr;
  }
}

// Helper to find the current active theme based on today's date
function findActiveThemeIndex(cols) {
  if (!cols || cols.length === 0) return 0;
  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Check if today falls within any theme's date range
  const exactIdx = cols.findIndex((c) => {
    if (!c.startDate || !c.endDate) return false;
    return todayStr >= c.startDate && todayStr <= c.endDate;
  });
  if (exactIdx >= 0) return exactIdx;

  // 2. Otherwise find the first upcoming theme (where today <= endDate)
  const upcomingIdx = cols.findIndex((c) => {
    if (!c.endDate) return false;
    return todayStr <= c.endDate;
  });
  if (upcomingIdx >= 0) return upcomingIdx;

  // 3. Fallback: if past all themes, return the last one
  return Math.max(0, cols.length - 1);
}

export function ThemePlanReviewListPage() {
  const { t } = useTranslation();
  const SCOPE_LABELS = useMemo(() => getScopeLabels(t), [t]);
  const [searchParams, setSearchParams] = useSearchParams();

  const user = useAuthStore((state) => state.user);
  const isBGH = isBghRole(user?.role);
  const selectedYearId = useAcademicYearStore((state) => state.selectedYearId);

  // Scope mode: 'COUNT_3' (default), 'COUNT_2', 'COUNT_4', 'SEMESTER_1', 'SEMESTER_2', 'FULL_YEAR'
  const [viewScope, setViewScope] = useState(searchParams.get('scope') || 'COUNT_3');

  // Filter States (matching StudentsPage filter dropdown)
  const [selectedAgeGroup, setSelectedAgeGroup] = useState(searchParams.get('ageGroup') || 'ALL');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Data States
  const [isLoading, setIsLoading] = useState(true);
  const [matrixData, setMatrixData] = useState({
    schoolYear: null,
    stats: { totalClasses: 0, totalPlans: 0, pendingCount: 0, approvedCount: 0, rejectedCount: 0, draftCount: 0 },
    groups: [],
    matrix: {},
  });

  // Executive Review Drawer State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedDrawerData, setSelectedDrawerData] = useState(null); // { classId, themeId, classIndex, activeThemeIdx }

  // Fetch Matrix Data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const targetYear = selectedYearId || undefined;
      const matrixRes = await planningApi.getThemePlanMatrix({
        schoolYearId: targetYear,
      });

      if (matrixRes) {
        setMatrixData(matrixRes);
      }
    } catch (err) {
      console.error('Error fetching review plans matrix:', err);
      toast.error(t('planning.loadReviewError', 'Không thể tải dữ liệu duyệt kế hoạch.'));
    } finally {
      setIsLoading(false);
    }
  }, [selectedYearId, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Sync Search Params
  useEffect(() => {
    const params = new URLSearchParams();
    if (viewScope !== 'COUNT_3') params.set('scope', viewScope);
    if (selectedAgeGroup !== 'ALL') params.set('ageGroup', selectedAgeGroup);
    if (statusFilter !== 'ALL') params.set('status', statusFilter);
    setSearchParams(params, { replace: true });
  }, [viewScope, selectedAgeGroup, statusFilter, setSearchParams]);

  const isFiltered = selectedAgeGroup !== 'ALL' || statusFilter !== 'ALL';

  // Compute columns for each age group independently based on its own curriculum themes and dates
  const getGroupColumns = useCallback(
    (groupThemes) => {
      if (!groupThemes || groupThemes.length === 0) return [];

      const rawCols = groupThemes.map((th, idx) => ({
        idx,
        id: th.id,
        title: t('planning.themePrefix', { index: idx + 1, defaultValue: `Chủ đề ${idx + 1}` }),
        themeName: th.name,
        startDate: th.startDate,
        endDate: th.endDate,
        semester: idx < Math.ceil(groupThemes.length / 2) ? 1 : 2,
        dateRange:
          th.startDate && th.endDate
            ? `${formatDateShort(th.startDate)} – ${formatDateShort(th.endDate)}`
            : '',
        themeObj: th,
      }));

      // Determine currently active theme for this specific grade
      const activeIdx = findActiveThemeIndex(rawCols);

      let sliced = rawCols;
      switch (viewScope) {
        case 'COUNT_2': {
          const maxStart = Math.max(0, rawCols.length - 2);
          const start = Math.max(0, Math.min(activeIdx, maxStart));
          sliced = rawCols.slice(start, start + 2);
          break;
        }
        case 'COUNT_3': {
          const maxStart = Math.max(0, rawCols.length - 3);
          const start = Math.max(0, Math.min(activeIdx - 1, maxStart));
          sliced = rawCols.slice(start, start + 3);
          break;
        }
        case 'COUNT_4': {
          const maxStart = Math.max(0, rawCols.length - 4);
          const start = Math.max(0, Math.min(activeIdx - 1, maxStart));
          sliced = rawCols.slice(start, start + 4);
          break;
        }
        case 'SEMESTER_1':
          sliced = rawCols.filter((c) => c.semester === 1);
          break;
        case 'SEMESTER_2':
          sliced = rawCols.filter((c) => c.semester === 2);
          break;
        case 'FULL_YEAR':
        default:
          sliced = rawCols;
          break;
      }

      return sliced.map((c) => ({
        ...c,
        isCurrent: c.idx === activeIdx,
      }));
    },
    [viewScope]
  );

  // Filtered Groups & Classes for Matrix View
  const filteredGroups = useMemo(() => {
    if (!matrixData?.groups) return [];

    let groups = matrixData.groups;

    if (selectedAgeGroup !== 'ALL') {
      groups = groups.filter((g) => g.key === selectedAgeGroup);
    }

    // Filter by class name / room / teacher
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      groups = groups
        .map((g) => {
          const matched = g.classes.filter(
            (c) =>
              c.name.toLowerCase().includes(q) ||
              (c.roomNumber && c.roomNumber.toLowerCase().includes(q)) ||
              (c.teachers && c.teachers.some((t) => t.toLowerCase().includes(q)))
          );
          return { ...g, classes: matched };
        })
        .filter((g) => g.classes.length > 0);
    }

    // Filter by status: only show classes that have matching plans
    if (statusFilter !== 'ALL') {
      groups = groups
        .map((g) => {
          const matched = g.classes.filter((c) =>
            g.themes.some((th) => {
              const plan = matrixData.matrix[`${c.id}_${th.id}`];
              return plan?.status === statusFilter;
            })
          );
          return { ...g, classes: matched };
        })
        .filter((g) => g.classes.length > 0);
    }

    return groups;
  }, [matrixData, selectedAgeGroup, searchQuery, statusFilter]);

  // Flattened array of active classes for sequential navigation in Drawer
  const allActiveClasses = useMemo(() => {
    return filteredGroups.flatMap((g) =>
      g.classes.map((c) => ({
        ...c,
        groupKey: g.key,
        groupLabel: g.label,
      }))
    );
  }, [filteredGroups]);

  // Open Drawer on Item / Cell Click
  const handleOpenDrawer = (cls, theme, colIdx = 0) => {
    if (!theme) return;
    const idx = allActiveClasses.findIndex((c) => c.id === cls.id);
    setSelectedDrawerData({
      classId: cls.id,
      themeId: theme.id,
      classIndex: idx >= 0 ? idx : 0,
      activeThemeIdx: colIdx,
    });
    setIsDrawerOpen(true);
  };

  // Auto open drawer when navigated from notification with classId and themeId params
  useEffect(() => {
    const targetClassId = searchParams.get('classId');
    const targetThemeId = searchParams.get('themeId');
    if (targetClassId && matrixData.groups?.length > 0 && !isDrawerOpen) {
      for (const g of matrixData.groups) {
        const cls = g.classes.find(
          (c) => String(c.id) === String(targetClassId) || c.publicId === targetClassId
        );
        if (cls) {
          const th = targetThemeId
            ? g.themes.find((t) => String(t.id) === String(targetThemeId) || t.publicId === targetThemeId)
            : g.themes[0];
          if (th) {
            handleOpenDrawer(cls, th);
            break;
          }
        }
      }
    }
  }, [searchParams, matrixData.groups]);

  // Sequential Navigation: Previous Class
  const handlePrevClass = () => {
    if (!selectedDrawerData || selectedDrawerData.classIndex <= 0) return;
    const nextIdx = selectedDrawerData.classIndex - 1;
    const nextClass = allActiveClasses[nextIdx];
    if (!nextClass) return;

    const group = matrixData.groups?.find((g) => g.key === nextClass.ageGroup);
    const colIdx = selectedDrawerData.activeThemeIdx >= 0 ? selectedDrawerData.activeThemeIdx : 0;
    const nextTheme = group?.themes?.[colIdx] || group?.themes?.[0];

    setSelectedDrawerData({
      classId: nextClass.id,
      themeId: nextTheme?.id || selectedDrawerData.themeId,
      classIndex: nextIdx,
      activeThemeIdx: colIdx,
    });
  };

  // Sequential Navigation: Next Class
  const handleNextClass = () => {
    if (!selectedDrawerData || selectedDrawerData.classIndex >= allActiveClasses.length - 1) return;
    const nextIdx = selectedDrawerData.classIndex + 1;
    const nextClass = allActiveClasses[nextIdx];
    if (!nextClass) return;

    const group = matrixData.groups?.find((g) => g.key === nextClass.ageGroup);
    const colIdx = selectedDrawerData.activeThemeIdx >= 0 ? selectedDrawerData.activeThemeIdx : 0;
    const nextTheme = group?.themes?.[colIdx] || group?.themes?.[0];

    setSelectedDrawerData({
      classId: nextClass.id,
      themeId: nextTheme?.id || selectedDrawerData.themeId,
      classIndex: nextIdx,
      activeThemeIdx: colIdx,
    });
  };

  return (
    <div
      className="w-full flex-1 flex flex-col gap-5 max-w-[1300px] mx-auto text-foreground select-none"
      data-name="FE · Planning · Reviews"
    >
      {/* 1. PAGE HEADER (Strictly identical to StudentsPage standard) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Title and Subtitle - No badge next to title */}
        <div className="flex flex-col gap-1">
          <h1 className="text-[26px] font-semibold text-foreground tracking-tight">
            {t('planning.reviewPlanTitle', 'Duyệt kế hoạch')}
          </h1>
          <p className="text-[12px] text-muted-foreground font-normal">
            {t('planning.reviewPlanSubtitle', 'Thẩm định, đối chiếu mục tiêu và phê duyệt kế hoạch giáo dục theo chủ đề của các lớp')}
          </p>
        </div>

        {/* View Actions Toolbar (Strictly follows Sorak StudentsPage standard) */}
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
              placeholder={t('planning.searchClassTeacherPlaceholder', 'Tìm kiếm lớp học, giáo viên...')}
              className="h-8 pl-8 pr-2.5 text-[13px] bg-background border-border rounded-none shadow-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          {/* Scope Selector: Đồng nhất với các dropdown khác */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="h-8 px-2.5 bg-background border border-border text-[13px] font-medium text-foreground hover:bg-muted/50 rounded-none flex items-center justify-center gap-1.5 transition-colors cursor-pointer select-none"
                data-name="Scope Dropdown"
                title={t('planning.scopeFilterTitle', 'Phạm vi chủ đề hiển thị')}
              >
                <span>{SCOPE_LABELS[viewScope] || t('planning.scope3ThemesFocus', '3 chủ đề (Trọng tâm)')}</span>
                <HugeiconsIcon icon={ArrowDown01Icon} size={14} className="text-muted-foreground shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 p-1.5 rounded-none border border-border bg-card shadow-xl z-50 text-foreground"
            >
              {/* Nhóm 1: Theo số lượng */}
              <DropdownMenuLabel className="px-2 py-1 text-[12px] font-medium text-muted-foreground">
                {t('planning.scopeByCount', 'Số lượng chủ đề')}
              </DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => setViewScope('COUNT_2')}
                className="flex items-center justify-between h-8 px-2 text-[13px] cursor-pointer rounded-none hover:bg-muted/60"
              >
                <span>{t('planning.scope2Themes', '2 chủ đề')}</span>
                {viewScope === 'COUNT_2' && (
                  <HugeiconsIcon icon={CheckmarkSquare02Icon} size={14} className="text-primary shrink-0" />
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setViewScope('COUNT_3')}
                className="flex items-center justify-between h-8 px-2 text-[13px] cursor-pointer rounded-none hover:bg-muted/60"
              >
                <span>{t('planning.scope3ThemesFocus', '3 chủ đề (Trọng tâm)')}</span>
                {viewScope === 'COUNT_3' && (
                  <HugeiconsIcon icon={CheckmarkSquare02Icon} size={14} className="text-primary shrink-0" />
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setViewScope('COUNT_4')}
                className="flex items-center justify-between h-8 px-2 text-[13px] cursor-pointer rounded-none hover:bg-muted/60"
              >
                <span>{t('planning.scope4Themes', '4 chủ đề')}</span>
                {viewScope === 'COUNT_4' && (
                  <HugeiconsIcon icon={CheckmarkSquare02Icon} size={14} className="text-primary shrink-0" />
                )}
              </DropdownMenuItem>

              <DropdownMenuSeparator className="my-1 border-t border-border" />

              {/* Nhóm 2: Theo kỳ học */}
              <DropdownMenuLabel className="px-2 py-1 text-[12px] font-medium text-muted-foreground">
                {t('planning.scopeBySemester', 'Theo kỳ học')}
              </DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => setViewScope('SEMESTER_1')}
                className="flex items-center justify-between h-8 px-2 text-[13px] cursor-pointer rounded-none hover:bg-muted/60"
              >
                <span>{t('planning.scopeSem1', 'Học kỳ 1 (Chủ đề 1 – 5)')}</span>
                {viewScope === 'SEMESTER_1' && (
                  <HugeiconsIcon icon={CheckmarkSquare02Icon} size={14} className="text-primary shrink-0" />
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setViewScope('SEMESTER_2')}
                className="flex items-center justify-between h-8 px-2 text-[13px] cursor-pointer rounded-none hover:bg-muted/60"
              >
                <span>{t('planning.scopeSem2', 'Học kỳ 2 (Chủ đề 6 – 10)')}</span>
                {viewScope === 'SEMESTER_2' && (
                  <HugeiconsIcon icon={CheckmarkSquare02Icon} size={14} className="text-primary shrink-0" />
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setViewScope('FULL_YEAR')}
                className="flex items-center justify-between h-8 px-2 text-[13px] cursor-pointer rounded-none hover:bg-muted/60"
              >
                <span>{t('planning.scopeFullYear', 'Cả năm học (Tất cả Chủ đề)')}</span>
                {viewScope === 'FULL_YEAR' && (
                  <HugeiconsIcon icon={CheckmarkSquare02Icon} size={14} className="text-primary shrink-0" />
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Filter Dropdown (Icon only, size-8 square button identical to StudentsPage) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  'size-8 bg-background border border-border text-foreground hover:bg-muted/50 rounded-none flex items-center justify-center transition-colors cursor-pointer select-none',
                  isFiltered && 'border-primary text-primary bg-primary/5',
                )}
                title={t('planning.filterTooltip', 'Lọc')}
                data-name="Filter · Plan Reviews"
              >
                <HugeiconsIcon icon={FilterHorizontalIcon} size={16} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-52 p-1.5 rounded-none border border-border bg-card shadow-xl z-50 text-foreground"
            >
              {/* Section 1: Khối lớp */}
              <DropdownMenuLabel className="px-2 py-1 text-[12px] font-medium text-muted-foreground">
                {t('planning.gradeSection', 'Khối lớp')}
              </DropdownMenuLabel>
              {AGE_GROUPS.map((item) => (
                <DropdownMenuItem
                  key={item.key}
                  onClick={() => setSelectedAgeGroup(item.key)}
                  className="flex items-center justify-between h-8 px-2 text-[13px] cursor-pointer rounded-none hover:bg-muted/60"
                >
                  <span>{t(item.labelKey, item.defaultLabel)}</span>
                  {selectedAgeGroup === item.key && (
                    <HugeiconsIcon
                      icon={CheckmarkSquare02Icon}
                      size={14}
                      className="text-primary shrink-0"
                    />
                  )}
                </DropdownMenuItem>
              ))}

              <DropdownMenuSeparator className="my-1 border-t border-border" />

              {/* Section 2: Trạng thái kế hoạch */}
              <DropdownMenuLabel className="px-2 py-1 text-[12px] font-medium text-muted-foreground">
                {t('planning.planStatusSection', 'Trạng thái kế hoạch')}
              </DropdownMenuLabel>
              {STATUS_OPTIONS.map((item) => (
                <DropdownMenuItem
                  key={item.key}
                  onClick={() => setStatusFilter(item.key)}
                  className="flex items-center justify-between h-8 px-2 text-[13px] cursor-pointer rounded-none hover:bg-muted/60"
                >
                  <span>{t(item.labelKey, item.defaultLabel)}</span>
                  {statusFilter === item.key && (
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

          {/* Refresh Button */}
          <button
            type="button"
            onClick={fetchData}
            className="size-8 bg-background border border-border text-foreground hover:bg-muted/50 rounded-none flex items-center justify-center transition-colors cursor-pointer select-none"
            title={t('planning.refreshTooltip', 'Làm mới dữ liệu')}
            data-name="Button · Refresh"
          >
            <HugeiconsIcon icon={RefreshIcon} size={15} className={cn(isLoading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* 2. TABLE CONTENT - STACKED GRADE MATRICES */}
      {isLoading ? (
        <div className="w-full border border-border bg-card p-12 text-center text-muted-foreground rounded-none">
          <p className="text-[13px]">{t('planning.loadingMatrix', 'Đang tải ma trận kế hoạch giáo dục...')}</p>
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="w-full border border-border bg-card p-12 text-center text-muted-foreground rounded-none">
          <p className="text-[13px]">{t('planning.emptyFilteredPlans', 'Không có kế hoạch nào phù hợp với bộ lọc hiện tại.')}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredGroups.map((group) => {
            const groupCols = getGroupColumns(group.themes);

            return (
              <div key={group.key} className="space-y-2">
                {/* Khối Header Bar */}
                <div className="flex items-center gap-2 px-1">
                  <span className="font-semibold text-[13.5px] text-foreground uppercase tracking-wide">
                    {group.key === 'NHA_TRE' ? t('classes.gradeNhaTre', group.label) :
                     group.key === 'MAM' ? t('classes.gradeMam', group.label) :
                     group.key === 'CHOI' ? t('classes.gradeChoi', group.label) :
                     group.key === 'LA' ? t('classes.gradeLa', group.label) : group.label}
                  </span>
                  <span className="text-[12px] text-muted-foreground">
                    {t('planning.classesAndThemesCount', {
                      classCount: group.classes.length,
                      themeCount: group.themes?.length || 0,
                      defaultValue: `(${group.classes.length} lớp · ${group.themes?.length || 0} chủ đề)`,
                    })}
                  </span>
                </div>

                {/* Khối Table */}
                <div className="w-full border border-border bg-card rounded-none overflow-x-auto shadow-2xs select-none">
                  <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                      <tr className="border-b border-border bg-muted/30 text-[12.5px] font-medium text-foreground">
                        <th className="py-2.5 px-3 w-[320px] min-w-[320px] max-w-[320px] font-medium sticky left-0 bg-background/95 backdrop-blur-xs z-10 border-r border-border/60">
                          {t('planning.colClass', 'Lớp học')}
                        </th>
                        {groupCols.map((col) => (
                          <th
                            key={col.id || col.idx}
                            className={cn(
                              'py-2 px-3 text-center min-w-[160px] font-medium select-none transition-colors border-r last:border-r-0 border-border/60',
                              col.isCurrent && 'bg-blue-50/50'
                            )}
                          >
                            {/* Dòng 1: Cột mốc lịch trình (Chủ đề X + Ngày tháng) */}
                            <div className="text-[11px] text-muted-foreground font-normal flex items-center justify-center gap-1">
                              <span>{col.title}</span>
                              {col.dateRange && (
                                <span className="font-mono">({col.dateRange})</span>
                              )}
                            </div>

                            {/* Dòng 2: Tên chủ đề chính (Chữ đậm màu đen text-foreground) */}
                            <div
                              className="font-semibold text-[13px] text-foreground tracking-tight truncate max-w-[200px] mx-auto mt-0.5"
                              title={
                                col.themeName
                                  ? `${col.title}: ${col.themeName}${col.isCurrent ? t('planning.currentThemeTag', ' (Chủ đề hiện tại)') : ''}`
                                  : col.title
                              }
                            >
                              <span>{col.themeName || col.title}</span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-border/60">
                      {group.classes.map((cls) => (
                        <tr
                          key={cls.id}
                          className="h-[54px] hover:bg-muted/40 transition-colors group cursor-default"
                        >
                          {/* Class Info Cell */}
                          <td className="px-3 w-[320px] min-w-[320px] max-w-[320px] sticky left-0 bg-background/95 backdrop-blur-xs z-10 border-r border-border/60">
                            <div className="flex items-center gap-3">
                              <div className="size-8 shrink-0 rounded-none overflow-hidden border border-border/80 bg-muted/40 flex items-center justify-center">
                                <ClassVisual grade={cls.ageGroup} size={28} />
                              </div>
                              <div className="flex flex-col min-w-0 leading-tight">
                                <span className="text-[13.5px] font-medium text-foreground truncate">
                                  {cls.name}
                                </span>
                                <span
                                  className="text-[11.5px] text-muted-foreground truncate"
                                  title={cls.teachers?.join(', ')}
                                >
                                  {cls.teachers?.length > 0
                                    ? cls.teachers.join(', ')
                                    : t('planning.unassignedTeacher', 'Chưa phân công')}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Theme Matrix Cells for this Class */}
                          {groupCols.map((col) => {
                            const theme = col.themeObj;
                            const key = theme ? `${cls.id}_${theme.id}` : null;
                            const plan = key ? matrixData.matrix[key] : null;

                            return (
                              <td
                                key={col.id || col.idx}
                                className={cn(
                                  'px-3 text-center align-middle transition-colors border-r last:border-r-0 border-border/60',
                                  col.isCurrent && 'bg-blue-50/25',
                                  theme && plan && 'cursor-pointer hover:bg-muted/60'
                                )}
                                onClick={() => theme && plan && handleOpenDrawer(cls, theme, col.idx)}
                                title={
                                  theme && plan
                                    ? `${cls.name} · ${theme.name} · ${
                                        plan.status === 'USED'
                                          ? t('common.approved', 'Đã phê duyệt')
                                          : plan.status === 'PENDING_APPROVAL'
                                          ? t('common.pending', 'Chờ duyệt')
                                          : plan.status === 'REJECTED'
                                          ? t('planning.statusNeedsRevision', 'Yêu cầu sửa')
                                          : t('planning.statusDraft', 'Bản nháp')
                                      }. ${t('planning.clickToReview', 'Bấm để thẩm định toàn cảnh.')}`
                                    : undefined
                                }
                              >
                                {!theme || !plan ? (
                                  <span className="text-muted-foreground/30 text-[13px]">—</span>
                                ) : (
                                  <div className="flex items-center justify-center">
                                    {plan.status === 'USED' ? (
                                      <span className="inline-flex items-center justify-center px-2.5 py-1 text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-none hover:bg-emerald-100 transition-colors">
                                        {t('common.approved', 'Đã phê duyệt')}
                                      </span>
                                    ) : plan.status === 'PENDING_APPROVAL' ? (
                                      <span className="inline-flex items-center justify-center px-2.5 py-1 text-[11px] font-medium bg-blue-50 text-blue-800 border border-blue-300 rounded-none hover:bg-blue-100 transition-colors">
                                        {t('common.pending', 'Chờ duyệt')}
                                      </span>
                                    ) : plan.status === 'REJECTED' ? (
                                      <span className="inline-flex items-center justify-center px-2.5 py-1 text-[11px] font-medium bg-rose-50 text-rose-800 border border-rose-300 rounded-none hover:bg-rose-100 transition-colors">
                                        {t('planning.statusNeedsRevision', 'Yêu cầu sửa')}
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center justify-center px-2.5 py-1 text-[11px] font-medium bg-muted text-muted-foreground border border-border rounded-none hover:bg-muted/80 transition-colors">
                                        {t('planning.statusDraft', 'Bản nháp')}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. EXECUTIVE REVIEW DRAWER (Ngăn Thẩm Định Toàn Cảnh Ngay Tại Chỗ) */}
      <ThemePlanReviewDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        classId={selectedDrawerData?.classId}
        themeId={selectedDrawerData?.themeId}
        onPrevClass={handlePrevClass}
        onNextClass={handleNextClass}
        hasPrevClass={selectedDrawerData?.classIndex > 0}
        hasNextClass={selectedDrawerData?.classIndex < allActiveClasses.length - 1}
        classIndexText={t('planning.classIndexText', {
          current: (selectedDrawerData?.classIndex ?? 0) + 1,
          total: allActiveClasses.length,
          defaultValue: `Lớp ${(selectedDrawerData?.classIndex ?? 0) + 1} / ${allActiveClasses.length}`,
        })}
        onPlanStatusUpdated={fetchData}
      />
    </div>
  );
}

export default ThemePlanReviewListPage;
