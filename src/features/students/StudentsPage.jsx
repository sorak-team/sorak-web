import React, { useState, useEffect, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Search01Icon,
  Add01Icon,
  Menu01Icon,
  DashboardSquare02Icon,
} from '@hugeicons/core-free-icons';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { downloadBlob } from '@/shared/utils/download';
import { ExcelImportModal } from '@/components/ExcelImportModal';
import { ExcelActionsDropdown } from '@/components/ExcelActionsDropdown';
import { studentsApi } from './students.api';
import { useAuthStore } from '@/features/auth';
import { useAcademicYearStore } from '@/features/academic-years';
import { useClassesStore, findTeacherClassForYear } from '@/features/classes';
import { useStudentStore, sortStudentsByClassTier } from './students.store';
import { StudentTable } from './components/StudentTable';
import { StudentGrid } from './components/StudentGrid';
import { StudentColumnsDropdown } from './components/StudentColumnsDropdown';
import { StudentFilterDropdown } from './components/StudentFilterDropdown';
import { StudentDrawer } from './components/StudentDrawer';
import { DeleteStudentDialog } from './components/DeleteStudentDialog';
import { TransferStudentDialog } from './components/TransferStudentDialog';
import { TablePagination } from '@/shared/components/TablePagination';
import { usePaginationStore } from '@/shared/stores/pagination.store';
import { cn } from '@/shared/lib/utils';

export function StudentsPage() {
  const { t } = useTranslation();
  const pageSize = usePaginationStore((state) => state.pageSize);

  const user = useAuthStore((state) => state.user);
  const classes = useClassesStore((state) => state.classes);
  const selectedYearId = useAcademicYearStore((state) => state.selectedYearId);
  const academicYears = useAcademicYearStore((state) => state.academicYears);
  const currentYearObj =
    academicYears?.find(
      (y) =>
        String(y.id) === String(selectedYearId) ||
        (selectedYearId === '2026-2027' && (String(y.id) === '1' || y.name?.includes('2026'))),
    ) ||
    academicYears?.find((y) => y.active) ||
    {};
  const isYearCompleted = currentYearObj?.status === 'COMPLETED';

  const {
    students,
    viewMode,
    setViewMode,
    searchQuery,
    setSearchQuery,
    statusFilter,
    genderFilter,
    classFilter,
    currentPage,
    setCurrentPage,
    openCreateDrawer,
    fetchStudents,
  } = useStudentStore();

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportExcel = async () => {
    if (filteredStudents.length === 0) {
      toast.warning('Không có dữ liệu học sinh phù hợp để xuất file Excel.');
      return;
    }

    try {
      setIsExporting(true);
      const blob = await studentsApi.exportExcel({
        schoolYearId: selectedYearId,
        classId: classFilter !== 'all' ? classFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        gender: genderFilter !== 'all' ? genderFilter : undefined,
        search: searchQuery || undefined,
      });
      const filename = `Danh_Sach_Hoc_Sinh_${new Date().toISOString().slice(0, 10)}.xlsx`;
      downloadBlob(blob, filename);
      toast.success('Đã xuất danh sách học sinh ra file Excel thành công.');
    } catch (err) {
      toast.error('Không thể xuất file Excel. Vui lòng thử lại sau.');
    } finally {
      setIsExporting(false);
    }
  };

  useEffect(() => {
    fetchStudents(selectedYearId ? { schoolYearId: selectedYearId } : {});
  }, [fetchStudents, selectedYearId]);

  const isTeacher =
    user?.role === 'TEACHER_GV' ||
    user?.role === 'TEACHER' ||
    user?.role?.toLowerCase()?.includes('teacher');


  // Filtered Students
  const filteredStudents = useMemo(() => {
    let list = [...students];

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

    // Status filter
    if (statusFilter !== 'all') {
      list = list.filter((student) => student.status === statusFilter);
    }

    // Gender filter
    if (genderFilter !== 'all') {
      list = list.filter((student) => student.gender === genderFilter);
    }

    // Class filter
    if (classFilter !== 'all') {
      list = list.filter((student) => student.currentClass?.classId === classFilter);
    }

    // Default sort by class age tier: Nhà trẻ -> Mầm -> Chồi -> Lá (smallest to largest)
    list.sort(sortStudentsByClassTier);

    return list;
  }, [students, searchQuery, statusFilter, genderFilter, classFilter]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredStudents.length / pageSize) || 1;
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredStudents.slice(start, start + pageSize);
  }, [filteredStudents, currentPage, pageSize]);

  if (isTeacher) {
    const myClass = findTeacherClassForYear(user, classes, selectedYearId);
    return <Navigate to={myClass ? `/classes/${myClass.id}/students` : '/'} replace />;
  }

  return (
    <div
      className="w-full flex-1 flex flex-col gap-5 max-w-[1300px] mx-auto text-foreground select-none"
      data-name="FE · Students · List"
    >
      {/* Page Header (Strictly consistent with TeachersPage) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Title and Subtitle */}
        <div className="flex flex-col gap-1">
          <h1 className="text-[26px] font-semibold text-foreground tracking-tight">
            {t('student.title', 'Học sinh')}
          </h1>
          <p className="text-[12px] text-muted-foreground font-normal">
            {t(
              'student.subtitle',
              'Quản lý hồ sơ học sinh, thông tin người giám hộ và dữ liệu học vụ'
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

          {/* Columns Dropdown (Visible in List View, exactly like TeachersPage) */}
          {viewMode === 'list' && <StudentColumnsDropdown />}

          {/* Filter Dropdown */}
          <StudentFilterDropdown />

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

          {/* Excel Actions Dropdown (Compact icon button, zero text, rounded-none) */}
          <ExcelActionsDropdown
            onExport={handleExportExcel}
            onImport={!isTeacher && !isYearCompleted ? () => setIsImportModalOpen(true) : null}
            showImport={!isTeacher && !isYearCompleted}
            isExporting={isExporting}
          />

          {/* Add Student Button */}
          {!isYearCompleted ? (
            <Button
              type="button"
              onClick={openCreateDrawer}
              className="h-8 px-3 text-[13px] font-medium bg-[#1447e6] hover:bg-[#1447e6]/90 text-white rounded-none shadow-none cursor-pointer flex items-center gap-1.5"
              data-name="Button · Thêm học sinh"
            >
              <HugeiconsIcon icon={Add01Icon} size={15} />
              <span>{t('student.addStudent', 'Thêm học sinh')}</span>
            </Button>
          ) : (
            <div className="h-8 px-2.5 text-[12px] font-medium bg-muted text-muted-foreground border border-border flex items-center gap-1.5">
              <span>Năm học đã kết thúc (Chỉ xem)</span>
            </div>
          )}
        </div>
      </div>

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
        <StudentTable paginatedStudents={paginatedStudents} />
      ) : (
        <StudentGrid paginatedStudents={paginatedStudents} />
      )}

      {/* Pagination Footer */}
      <TablePagination
        currentPage={currentPage}
        totalItems={filteredStudents.length}
        onPageChange={setCurrentPage}
        itemLabel={t('student.studentUnit', 'học sinh')}
      />

      {/* Global Slide-in Drawer & Action Modals */}
      <StudentDrawer onSuccess={fetchStudents} />
      <DeleteStudentDialog />
      <TransferStudentDialog onSuccess={fetchStudents} />

      {/* Excel Import Modal */}
      <ExcelImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Nhập danh sách học sinh từ Excel"
        description="Tải file mẫu, điền thông tin học sinh và phụ huynh để nhập hàng loạt vào trường."
        templateFileName="Mau_Nhap_Hoc_Sinh_Sorak.xlsx"
        onDownloadTemplate={studentsApi.getImportTemplate}
        onPreview={studentsApi.previewImport}
        onImport={studentsApi.importStudents}
        onSuccess={fetchStudents}
      />
    </div>
  );
}

export default StudentsPage;
