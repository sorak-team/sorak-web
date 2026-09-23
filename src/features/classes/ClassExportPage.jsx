import React, { useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useClassesStore, findTeacherClassForYear } from '@/features/classes';
import { useAuthStore } from '@/features/auth';
import { useAcademicYearStore } from '@/features/academic-years';
import { ClassExportRoster } from './components/ClassExportRoster';
import { NotFoundPage } from '@/features/error';

export function ClassExportPage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const classes = useClassesStore((state) => state.classes) || [];
  const selectedYearId = useAcademicYearStore((state) => state.selectedYearId);
  const fetchClasses = useClassesStore((state) => state.fetchClasses);
  const attachedClassId = useClassesStore((state) => state.attachedClassId);
  const attachClass = useClassesStore((state) => state.attachClass);

  const teacherClass = useMemo(() => {
    return findTeacherClassForYear(user, classes, selectedYearId);
  }, [user, classes, selectedYearId]);

  const currentClass = useMemo(() => {
    if (id) {
      return (
        classes.find(
          (c) => String(c.id) === String(id) || String(c.publicId) === String(id),
        ) || null
      );
    }
    return teacherClass;
  }, [id, classes, teacherClass]);

  useEffect(() => {
    if (classes.length === 0) {
      fetchClasses(selectedYearId);
    }
  }, [classes.length, fetchClasses, selectedYearId]);

  useEffect(() => {
    if (currentClass?.id && attachedClassId !== currentClass.id) {
      attachClass(currentClass.id);
    }
  }, [currentClass?.id, attachedClassId, attachClass]);

  if (id && /^\d+$/.test(String(id))) {
    return <NotFoundPage />;
  }

  if (!currentClass) {
    return (
      <div className="p-12 text-center text-muted-foreground select-none">
        <p className="text-[14px]">
          {t('common.loading', 'Đang tải thông tin lớp học...')}
        </p>
      </div>
    );
  }

  return (
    <div
      className="w-full flex-1 flex flex-col gap-6 max-w-[1300px] mx-auto text-foreground select-none pb-12"
      data-name="FE · Class Export · Roster"
    >
      <ClassExportRoster currentClass={currentClass} />
    </div>
  );
}

export default ClassExportPage;
