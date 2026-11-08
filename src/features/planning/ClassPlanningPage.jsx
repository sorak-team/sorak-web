import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { TargetAllocationTab } from './components/TargetAllocationTab';
import { EducationalActivitiesTab } from './components/EducationalActivitiesTab';
import { WeeklyTimetableTab } from './components/WeeklyTimetableTab';
import { PlanSubmissionTab } from './components/PlanSubmissionTab';
import { planningApi } from './planning.api';
import { HugeiconsIcon } from '@hugeicons/react';
import { Clock01Icon, AlertCircleIcon } from '@hugeicons/core-free-icons';

import { useClassesStore } from '@/features/classes';
import { NotFoundPage } from '@/features/error';
import { cn } from '@/shared/lib/utils';

export function ClassPlanningPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const classId = id || '1';
  const [searchParams, setSearchParams] = useSearchParams();

  const classes = useClassesStore((state) => state.classes) || [];
  const currentClass = classes.find((c) => c.id === id || c.publicId === id);

  const activeTab = searchParams.get('tab') || 'allocation';
  const urlThemeId = searchParams.get('themeId') || '';

  const [themes, setThemes] = useState([]);
  const [planStatus, setPlanStatus] = useState(null);

  // Load published themes for this class once
  useEffect(() => {
    if (!classId) return;
    let isMounted = true;
    planningApi
      .getTargetAllocation(classId)
      .then((data) => {
        if (!isMounted) return;
        const themeList = data?.publishedThemes || data?.themes || [];
        setThemes(themeList);
      })
      .catch((err) => {
        console.warn('Failed to load themes for status bar:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [classId]);

  // Load plan status for selected theme to determine isReadOnly state across tabs
  useEffect(() => {
    if (!classId) return;
    let isMounted = true;
    planningApi
      .getThemePlanStatus(classId, urlThemeId || undefined)
      .then((data) => {
        if (isMounted) setPlanStatus(data);
      })
      .catch((err) => {
        console.warn('Failed to load plan status for class:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [classId, urlThemeId]);

  const handleThemeChange = (newThemeId, overrideTab, preserveWeek = false) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (newThemeId) next.set('themeId', newThemeId);
      if (overrideTab) next.set('tab', overrideTab);
      // Khi người dùng chủ động chọn một chủ đề khác ở phân bổ mục tiêu -> xóa weekId để khi sang Kế hoạch tuần, nó sẽ tự tính tuần bắt đầu của chủ đề mới
      if (!preserveWeek && newThemeId && urlThemeId && newThemeId !== urlThemeId) {
        next.delete('weekId');
        try {
          sessionStorage.removeItem(`sorak_timetable_week_${classId}`);
        } catch {}
      }
      return next;
    });
  };

  if (id && /^\d+$/.test(String(id))) {
    return <NotFoundPage />;
  }

  if (id && !currentClass) {
    return (
      <div className="p-12 text-center text-muted-foreground select-none">
        <p className="text-[14px]">{t('common.loading', 'Đang tải thông tin lớp học...')}</p>
      </div>
    );
  }

  const isStudioTab = activeTab === 'allocation' || activeTab === 'activities';

  return (
    <div
      className={cn(
        'w-full flex-1 bg-background text-foreground select-none',
        isStudioTab
          ? 'h-full min-h-0 flex flex-col overflow-hidden'
          : 'min-h-full flex flex-col'
      )}
      data-node-id="4965:16014"
      data-name="Class Educational Planning Page"
    >
      {/* Active Tab Content */}
      {activeTab === 'submission' ? (
        <PlanSubmissionTab
          classId={classId}
          currentClass={currentClass}
        />
      ) : activeTab === 'allocation' ? (
        <TargetAllocationTab
          classId={classId}
          isReadOnly={planStatus?.isReadOnly || false}
          selectedThemeId={urlThemeId}
          onThemeChange={handleThemeChange}
          planStatus={planStatus}
        />
      ) : activeTab === 'timetable' ? (
        <WeeklyTimetableTab
          classId={classId}
          isReadOnly={planStatus?.isReadOnly || false}
          selectedThemeId={urlThemeId}
          onThemeChange={handleThemeChange}
          planStatus={planStatus}
          themes={themes}
        />
      ) : (
        <EducationalActivitiesTab
          classId={classId}
          isReadOnly={false}
          selectedThemeId={urlThemeId}
          onThemeChange={handleThemeChange}
          planStatus={planStatus}
        />
      )}
    </div>
  );
}
export default ClassPlanningPage;
