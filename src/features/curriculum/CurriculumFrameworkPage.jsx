import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '@/shared/lib/utils';
import { useAcademicYearStore } from '@/features/academic-years';
import { curriculumApi } from './curriculum.api';
import { planningApi } from '@/features/planning/planning.api';
import { ThemeCard } from './components/ThemeCard';
import { ExcelActionsDropdown } from '@/components/ExcelActionsDropdown';
import { downloadBlob } from '@/shared/utils/download';
import { toast } from 'sonner';

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

  // Data states
  const [themeData, setThemeData] = useState(null);
  const [goalData, setGoalData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      const safeYear = targetYearStr.replace(/\s+/g, '_');
      if (activeTab === 'themes') {
        const blob = await planningApi.exportThemePlanExcel({
          schoolYearId: selectedYear?.id,
          year: targetYearStr,
        });
        downloadBlob(blob, `Ke_Hoach_Phan_Phoi_Bo_Chu_De_${safeYear}.xlsx`);
        toast.success('Đã xuất kế hoạch phân phối bộ chủ đề thành công');
      } else {
        const blob = await curriculumApi.exportFrameworkExcel({
          year: targetYearStr,
        });
        downloadBlob(blob, `Khung_Chuong_Trinh_GDMN_${safeYear}.xlsx`);
        toast.success('Đã xuất khung chương trình GDMN (Ngân hàng mục tiêu) thành công');
      }
    } catch (err) {
      toast.error('Lỗi khi xuất dữ liệu', {
        description: err.message || 'Vui lòng thử lại sau.',
      });
    } finally {
      setIsExporting(false);
    }
  };

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

      return {
        ...grp,
        cards,
      };
    });
  }, [currentData?.groups, targetYearStr]);

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
          {/* Export Educational Framework Excel */}
          <ExcelActionsDropdown
            onExport={handleExportExcel}
            isExporting={isExporting}
            showImport={false}
          />
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
