import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Search01Icon,
  FilterIcon,
  DashboardSquare02Icon,
} from '@hugeicons/core-free-icons';
import { cn } from '@/shared/lib/utils';
import { useAcademicYearStore } from '@/features/academic-years';
import { curriculumApi } from './curriculum.api';
import { ThemeCard } from './components/ThemeCard';

export function CurriculumFrameworkPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();

  // Active tab: 'themes' | 'goals' (controlled via sidebar)
  const activeTab = searchParams.get('tab') || 'themes';

  // Connect to Active Academic Year
  const selectedYearId = useAcademicYearStore((state) => state.selectedYearId);
  const academicYears = useAcademicYearStore((state) => state.academicYears);
  const selectedYear = useMemo(
    () => academicYears.find((y) => String(y.id) === String(selectedYearId)) || academicYears[0],
    [academicYears, selectedYearId],
  );

  const targetYearStr = useMemo(() => {
    if (!selectedYear) return '2026-2027';
    const match = (selectedYear.name || selectedYear.range || selectedYear.code || '').match(
      /\d{4}\s*[-–]\s*\d{4}/,
    );
    if (match) return match[0].replace('–', '-').replace(/\s+/g, '');
    if (selectedYear.range) return selectedYear.range.replace('–', '-').trim();
    if (selectedYear.name)
      return selectedYear.name.replace('Năm học ', '').replace('–', '-').trim();
    return '2026-2027';
  }, [selectedYear]);

  const displayYearName = useMemo(() => {
    if (!selectedYear) return '2026–2027';
    if (selectedYear.name && /\d{4}/.test(selectedYear.name)) return selectedYear.name;
    if (selectedYear.range) return selectedYear.range;
    return `Năm học ${targetYearStr.replace('-', '–')}`;
  }, [selectedYear, targetYearStr]);

  const [searchQuery, setSearchQuery] = useState('');

  // Data states
  const [themeData, setThemeData] = useState(null);
  const [goalData, setGoalData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const queryParams = {
          year: targetYearStr,
          schoolYear: targetYearStr,
          schoolYearId: selectedYear?.id,
        };
        if (activeTab === 'themes') {
          const data = await curriculumApi.getThemeOverview(queryParams);
          setThemeData(data);
        } else {
          const data = await curriculumApi.getGoalBanksOverview(queryParams);
          setGoalData(data);
        }
      } catch (err) {
        console.warn('Failed to load curriculum data:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [activeTab, targetYearStr, selectedYear?.id]);

  const currentData = activeTab === 'themes' ? themeData : goalData;

  // Filter cards by active school year & search query
  const filteredGroups = useMemo(() => {
    return (currentData?.groups || []).map((grp) => {
      let cards = grp.cards || [];

      // Ensure cards strictly match target school year
      if (targetYearStr) {
        const yearCards = cards.filter(
          (c) =>
            c.yearId === targetYearStr ||
            c.yearName?.replace('–', '-') === targetYearStr ||
            c.yearName?.replace(/\s+/g, '') === targetYearStr.replace('-', '–') ||
            c.yearName?.includes(targetYearStr) ||
            c.yearName?.includes(targetYearStr.replace('-', '–')),
        );
        if (yearCards.length > 0) {
          cards = yearCards;
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        cards = cards.filter(
          (c) =>
            c.yearName?.toLowerCase().includes(q) ||
            c.ageGroupLabel?.toLowerCase().includes(q) ||
            c.statusLabel?.toLowerCase().includes(q),
        );
      }

      return {
        ...grp,
        cards,
      };
    });
  }, [currentData?.groups, targetYearStr, searchQuery]);

  return (
    <div
      className="w-full flex-1 flex flex-col gap-6 max-w-[1080px] mx-auto text-foreground select-none pb-12"
      data-node-id="4757:9289"
      data-name="Curriculum Framework Page"
    >
      {/* 1. Header & Primary Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border/60 shrink-0">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-[26px] font-semibold text-foreground tracking-tight">
            {activeTab === 'goals'
              ? t('curriculum.tabGoals', 'Ngân hàng mục tiêu')
              : t('curriculum.tabThemes', 'Bộ chủ đề')}
          </h1>
          <p className="text-[12px] text-muted-foreground font-normal">
            {activeTab === 'goals'
              ? 'Ngân hàng mục tiêu giáo dục mầm non đa tầng theo các lĩnh vực phát triển'
              : 'Quản lý bộ chủ đề giáo dục mầm non theo tuần và khối lớp'}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          {/* Search box */}
          <div className="relative min-w-[220px] sm:w-[280px]">
            <HugeiconsIcon
              icon={Search01Icon}
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={activeTab === 'themes' ? t('curriculum.searchThemes') : t('curriculum.searchGoals')}
              className="w-full h-8 pl-8 pr-2.5 bg-background border border-border text-[13px] text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors rounded-none"
            />
          </div>

          {/* Filter button */}
          <button
            type="button"
            title={t('curriculum.filter')}
            className="size-8 flex items-center justify-center bg-background border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-none transition-colors cursor-pointer"
          >
            <HugeiconsIcon icon={FilterIcon} size={14} />
          </button>

          {/* View toggle */}
          <button
            type="button"
            title={t('curriculum.gridView')}
            className="size-8 flex items-center justify-center bg-muted/60 border border-border text-foreground rounded-none transition-colors cursor-pointer"
          >
            <HugeiconsIcon icon={DashboardSquare02Icon} size={15} />
          </button>


        </div>
      </div>

      {/* 2. Main Workspace: Clean 2x2 Grid of 4 Grade Levels */}
      <div className="w-full">
        {isLoading && !currentData ? (
          <div className="p-16 text-center text-muted-foreground text-[13px] border border-dashed border-border/80">
            {t('common.loading', 'Đang tải dữ liệu...')}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredGroups.map((group) => {
              const card = group.cards[0] || {
                id: `${group.key}-${targetYearStr}`,
                yearName: displayYearName,
                yearId: targetYearStr,
                ageGroup: group.key,
                ageGroupLabel: group.label,
                themeCount: 0,
                subThemeCount: 0,
                status: 'DRAFT',
                statusLabel: 'Chưa thiết lập',
                statusBadge: 'neutral',
                updatedAt: 'Chưa có dữ liệu',
              };

              return (
                <ThemeCard
                  key={group.key}
                  card={card}
                  group={group}
                  tab={activeTab}
                />
              );
            })}
          </div>
        )}
      </div>


    </div>
  );
}
