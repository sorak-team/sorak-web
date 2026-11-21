import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Search01Icon,
  Add01Icon,
  Menu01Icon,
  DashboardSquare02Icon,
} from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ExcelActionsDropdown } from '@/components/ExcelActionsDropdown';
import { downloadBlob } from '@/shared/utils/download';
import { classesApi } from './classes.api';
import { useAuthStore } from '@/features/auth';
import { useAcademicYearStore } from '@/features/academic-years';
import { useClassesStore, findTeacherClassForYear } from '@/features/classes';
import { useStudentStore, sortStudentsByClassTier } from '../students/students.store';
import { StudentTable } from '../students/components/StudentTable';
import { StudentGrid } from '../students/components/StudentGrid';
import { StudentColumnsDropdown } from '../students/components/StudentColumnsDropdown';
import { StudentFilterDropdown } from '../students/components/StudentFilterDropdown';
import { StudentDrawer } from '../students/components/StudentDrawer';
import { DeleteStudentDialog } from '../students/components/DeleteStudentDialog';
import { TransferStudentDialog } from '../students/components/TransferStudentDialog';
import { TablePagination } from '@/shared/components/TablePagination';
import { usePaginationStore } from '@/shared/stores/pagination.store';
import { ClassAttendanceRibbon } from '@/features/attendance/components/ClassAttendanceRibbon';
import { NotFoundPage } from '@/features/error';
import { cn } from '@/shared/lib/utils';

export function ClassStudentsPage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const pageSize = usePaginationStore((state) => state.pageSize) || 10;

  const user = useAuthStore((state) => state.user);
  const classes = useClassesStore((state) => state.classes) || [];
  const selectedYearId = useAcademicYearStore((state) => state.selectedYearId);
  const academicYears = useAcademicYearStore((state) => state.academicYears);

  const activeYearObj = useMemo(() => {
    return academicYears.find(
      (y) => String(y.id) === String(selectedYearId) || y.name?.includes(selectedYearId)
    );
  }, [academicYears, selectedYearId]);

  const isPastYear = activeYearObj && (
    activeYearObj.status === 'ended' ||
    activeYearObj.status === 'ENDED' ||
    activeYearObj.status === 'completed' ||
    activeYearObj.status === 'COMPLETED'
  );

  const teacherClass = useMemo(() => {
    return findTeacherClassForYear(user, classes, selectedYearId);
  }, [user, classes, selectedYearId]);

  const targetClass = useMemo(() => {
    if (id) {
      return classes.find((c) => String(c.id) === String(id) || String(c.publicId) === String(id)) || null;
    }
    return teacherClass;
  }, [id, classes, teacherClass]);

  const targetClassId = targetClass?.id || id;

  const {
    students,
    viewMode,
    setViewMode,
    searchQuery,
    setSearchQuery,
    statusFilter,
    genderFilter,
    currentPage,
    setCurrentPage,
    openCreateDrawer,
    fetchStudents,
  } = useStudentStore();

  useEffect(() => {
    fetchStudents(selectedYearId ? { schoolYearId: selectedYearId } : {});
  }, [fetchStudents, selectedYearId]);

  const [isExporting, setIsExporting] = useState(false);

  const handleExportRoster = async () => {
    if (!targetClassId) return;
    try {
      setIsExporting(true);
      const cleanClassName = (targetClass?.name || 'Lop').replace(/\s+/g, '_');
      const fileName = `Danh_sach_lop_${cleanClassName}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      const blob = await classesApi.exportClassRosterExcel(targetClassId);
      downloadBlob(blob, fileName);
      toast.success(
        t('classes.exportSuccess', 'Đã tải xuống danh sách lớp {{name}} thành công!', {
          name: targetClass?.name || '',
        })
      );
    } catch (err) {
      console.error('Failed to export class roster:', err);
      toast.error(t('classes.exportFailed', 'Có lỗi xảy ra trong quá trình xuất danh sách.'));
    } finally {
      setIsExporting(false);
    }
  };

  // Always reset pagination and filters on mount or class switch
  useEffect(() => {
    useStudentStore.setState({
      currentPage: 1,
      searchQuery: '',
      statusFilter: 'all',
      genderFilter: 'all',
    });
  }, [targetClassId]);

  // Filtered Students strictly for this teacher's class and active year
  const filteredStudents = useMemo(() => {
    let list = [...students];

    // Filter by class: Check current class or enrollment history in this class
    const matchIds = targetClassId
      ? new Set(
          [
            String(targetClassId),
            String(targetClass?.id || ''),
            String(targetClass?.publicId || ''),
            String(targetClass?.classId || ''),
          ].filter(Boolean)
        )
      : null;

    if (matchIds && matchIds.size > 0) {
      list = list.filter((student) => {
        const studentClassId = String(student.currentClass?.classId || student.classId || '');
        const inCurrent = matchIds.has(studentClassId);
        const inHistory = (student.enrollmentHistory || []).some(
          (e) => matchIds.has(String(e.classId || ''))
        );
        return inCurrent || inHistory;
      });
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (student) =>
          student.fullName.toLowerCase().includes(q) ||
          student.studentCode.toLowerCase().includes(q) ||
          (student.currentClass?.className && student.currentClass.className.toLowerCase().includes(q)) ||
          (student.primaryParent?.fullName && student.primaryParent.fullName.toLowerCase().includes(q)) ||
          (student.primaryParent?.phone && student.primaryParent.phone.includes(q))
      );
    }

    // Map status strictly according to student_enrollments for this class
    list = list.map((s) => {
      const classEnrollment = (s.enrollmentHistory || []).find(
        (e) => matchIds ? matchIds.has(String(e.classId || '')) : String(e.classId) === String(targetClassId)
      );

      let contextualStatus = s.status || 'studying';
      if (classEnrollment?.status) {
        const enrStatus = String(classEnrollment.status).toUpperCase();
        switch (enrStatus) {
          case 'ENROLLED':
            contextualStatus = isPastYear ? 'completed' : 'studying';
            break;
          case 'COMPLETED':
            contextualStatus = 'completed';
            break;
          case 'GRADUATED':
            contextualStatus = 'graduated';
            break;
          case 'TRANSFERRED_CLASS':
            contextualStatus = 'transferred_class';
            break;
          case 'TRANSFERRED_SCHOOL':
            contextualStatus = 'transferred';
            break;
          case 'RESERVED':
            contextualStatus = 'reserved';
            break;
          case 'DROPPED_OUT':
            contextualStatus = 'dropped_out';
            break;
          default:
            contextualStatus = isPastYear ? 'completed' : 'studying';
            break;
        }
      } else if (isPastYear || classEnrollment?.leftAt) {
        contextualStatus = 'completed';
      }

      return {
        ...s,
        contextualStatus,
      };
    });

    // Status filter
    if (statusFilter !== 'all') {
      list = list.filter((student) => (student.contextualStatus || student.status) === statusFilter);
    }

    // Gender filter
    if (genderFilter !== 'all') {
      list = list.filter((student) => student.gender === genderFilter);
    }

    // Sort by class tier and student code
    list.sort(sortStudentsByClassTier);

    return list;
  }, [students, targetClassId, searchQuery, statusFilter, genderFilter, isPastYear]);

  // Safe pagination calculation (clamps currentPage to totalPages)
  const validPageSize = Math.max(1, Number(pageSize) || 10);
  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / validPageSize));
  const safeCurrentPage = Math.min(Math.max(1, Number(currentPage) || 1), totalPages);

  const paginatedStudents = useMemo(() => {
    if (!filteredStudents || filteredStudents.length === 0) return [];
    const start = (safeCurrentPage - 1) * validPageSize;
    const slice = filteredStudents.slice(start, start + validPageSize);
    return slice.length > 0 ? slice : filteredStudents.slice(0, validPageSize);
  }, [filteredStudents, safeCurrentPage, validPageSize]);

  if (id && /^\d+$/.test(String(id))) {
    return <NotFoundPage />;
  }

  // If user is a teacher, restrict access strictly to their assigned class
  const isTeacher = user?.role === 'TEACHER_GV';
  if (isTeacher) {
    if (teacherClass) {
      const isOwnClass =
        String(id) === String(teacherClass.id) ||
        String(id) === String(teacherClass.publicId) ||
        (targetClass &&
          (String(targetClass.id) === String(teacherClass.id) ||
            String(targetClass.publicId) === String(teacherClass.publicId)));
      if (id && !isOwnClass) {
        return <Navigate to={`/classes/${teacherClass.id}/students`} replace />;
      }
    } else if (classes.length > 0) {
      return <Navigate to="/" replace />;
    }
  }

  if (id && !targetClass) {
    return (
      <div className="p-12 text-center text-muted-foreground select-none">
        <p className="text-[14px]">{t('common.loading', 'Đang tải thông tin lớp học...')}</p>
      </div>
    );
  }

  return (
    <div
      className="w-full flex-1 flex flex-col gap-5 max-w-[1300px] mx-auto text-foreground select-none"
      data-name="FE · Class Students · List"
    >
      {/* Page Header (Strictly mirrors StudentsPage) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Title and Subtitle */}
        <div className="flex flex-col gap-1">
          <h1 className="text-[26px] font-semibold text-foreground tracking-tight">
            {t('classes.reports', 'Báo cáo')}
          </h1>
          <p className="text-[12px] text-muted-foreground font-normal">
            {t(
              'classes.reportsSubtitle',
              'Theo dõi thông tin hồ sơ, báo cáo phát triển, chuyên cần và yêu cầu chuyển lớp của học sinh trong lớp'
            )}
          </p>
        </div>

        {/* View Actions Toolbar (Strictly follows Sorak Design Consistency System) */}
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
              placeholder={t('student.searchPlaceholder', 'Tìm kiếm học sinh...')}
              className="h-8 pl-8 pr-2.5 text-[13px] bg-background border-border rounded-none shadow-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          {/* Columns Dropdown (Visible in List View, without class column option) */}
          {viewMode === 'list' && (
            <StudentColumnsDropdown hideClassOption={true} isClassContext={true} />
          )}

          {/* Filter Dropdown (hide class filter since it's already scoped to this class) */}
          <StudentFilterDropdown hideClassFilter={true} isClassContext={true} />

          {/* View Mode Switcher (Matching TeachersPage & AccountsPage) */}
          <div className="flex items-center border border-border bg-card rounded-none overflow-hidden h-8">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              title={t('student.listView', 'Dạng bảng')}
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
              title={t('student.gridView', 'Dạng lưới')}
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

          {/* Excel Actions Dropdown */}
          <ExcelActionsDropdown
            onExport={handleExportRoster}
            showImport={false}
            isExporting={isExporting}
          />
        </div>
      </div>

      {/* UC 66: Class Attendance Statistics Metric Ribbon */}
      {targetClassId && (
        <ClassAttendanceRibbon classId={targetClassId} />
      )}

      {/* List Heading (Matching TeachersPage) */}
      <div className="flex items-center justify-between pt-1">
        <h2 className="text-[16px] font-semibold text-foreground">
          {t('student.listTitle', 'Danh sách học sinh')}
        </h2>
        <span className="text-[12px] text-muted-foreground font-normal">
          {t('student.studentCount', '{{count}} học sinh', {
            count: filteredStudents.length,
          })}
        </span>
      </div>

      {/* Content: Main Table or Grid View */}
      {viewMode === 'list' ? (
        <StudentTable paginatedStudents={paginatedStudents} hideClassColumn={true} classId={targetClassId} />
      ) : (
        <StudentGrid paginatedStudents={paginatedStudents} classId={targetClassId} />
      )}

      {/* Pagination Footer */}
      <TablePagination
        currentPage={safeCurrentPage}
        totalItems={filteredStudents.length}
        onPageChange={setCurrentPage}
        itemLabel={t('student.studentUnit', 'học sinh')}
      />

      {/* Global Slide-in Drawer & Action Modals */}
      <StudentDrawer />
      <DeleteStudentDialog />
      <TransferStudentDialog />
    </div>
  );
}

export default ClassStudentsPage;
