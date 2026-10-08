import React from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { TargetAllocationTab } from './components/TargetAllocationTab';
import { EducationalActivitiesTab } from './components/EducationalActivitiesTab';
import { WeeklyTimetableTab } from './components/WeeklyTimetableTab';

import { useClassesStore } from '@/features/classes';
import { NotFoundPage } from '@/features/error';
import { cn } from '@/shared/lib/utils';

export function ClassPlanningPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const classId = id || '1';
  const [searchParams] = useSearchParams();

  const classes = useClassesStore((state) => state.classes) || [];
  const currentClass = classes.find((c) => c.id === id || c.publicId === id);

  const activeTab = searchParams.get('tab') || 'allocation';
  const hasSelectedGoal = activeTab === 'activities' && Boolean(searchParams.get('goalId'));

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

  return (
    <div
      className={cn(
        'w-full flex-1 flex flex-col bg-background text-foreground select-none',
        activeTab !== 'timetable' && activeTab !== 'allocation' && 'pb-16'
      )}
      data-node-id="4965:16014"
      data-name="Class Educational Planning Page"
    >
      {/* 1. Page Header - Consistent with CurriculumGoalDetailPage (hidden for timetable and allocation which have their own rich headers) */}
      {!hasSelectedGoal && activeTab !== 'timetable' && activeTab !== 'allocation' && (
        <div className="px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60">
          <div className="flex flex-col gap-0.5">
            <h1 className="text-[24px] font-semibold text-foreground tracking-tight">
              {t('planning.tabActivities', 'Xác định hoạt động')}
            </h1>
            <p className="text-[13px] text-muted-foreground font-normal mt-0.5">
              {t(
                'planning.activitiesDesc',
                'Xác định các hoạt động giáo dục cho từng nội dung và mục tiêu giáo dục theo chủ đề',
              )}
            </p>
          </div>
        </div>
      )}

      {/* 2. Active Tab Content */}
      {activeTab === 'allocation' ? (
        <TargetAllocationTab classId={classId} />
      ) : activeTab === 'timetable' ? (
        <WeeklyTimetableTab classId={classId} />
      ) : (
        <EducationalActivitiesTab classId={classId} />
      )}
    </div>
  );
}
export default ClassPlanningPage;
