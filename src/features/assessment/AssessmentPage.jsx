import React from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useClassesStore } from '@/features/classes';
import { NotFoundPage } from '@/features/error';
import { useTranslation } from 'react-i18next';
import { MonthlyAssessmentTab } from './components/MonthlyAssessmentTab';
import { SemesterAssessmentTab } from './components/SemesterAssessmentTab';

export function AssessmentPage({ defaultTab }) {
  const { t } = useTranslation();
  const { id } = useParams();
  const [searchParams] = useSearchParams();

  const classes = useClassesStore((state) => state.classes) || [];
  const attachedClassId = useClassesStore((state) => state.attachedClassId);
  const currentClass = classes.find((c) => c.id === id || c.publicId === id);
  const targetClassId = id || attachedClassId || '1';
  const activeTab = searchParams.get('tab') || defaultTab || 'monthly';

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
      className="w-full flex-1 flex flex-col gap-5 max-w-[1300px] mx-auto text-foreground select-none pb-12"
      data-name="Unified Assessment Hub Page"
    >
      {activeTab === 'monthly' ? (
        <MonthlyAssessmentTab
          targetClassId={targetClassId}
          currentClass={currentClass}
        />
      ) : (
        <SemesterAssessmentTab
          targetClassId={targetClassId}
          currentClass={currentClass}
        />
      )}
    </div>
  );
}

export default AssessmentPage;
