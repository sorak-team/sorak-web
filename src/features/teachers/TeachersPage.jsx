import React, { useState, useMemo, useEffect } from 'react';
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
import { useAcademicYearStore } from '@/features/academic-years';
import { teachersApi } from './teachers.api';
import { useTeacherStore } from './teachers.store';
import { TeacherTable } from './components/TeacherTable';
import { TeacherGrid } from './components/TeacherGrid';
import { TeacherColumnsDropdown } from './components/TeacherColumnsDropdown';
import { TeacherFilterDropdown } from './components/TeacherFilterDropdown';
import { TeacherDrawer } from './components/TeacherDrawer';
import { DeleteTeacherDialog } from './components/DeleteTeacherDialog';
import { TablePagination } from '@/shared/components/TablePagination';
import { usePaginationStore } from '@/shared/stores/pagination.store';
import { cn } from '@/shared/lib/utils';

export function TeachersPage() {
  const { t } = useTranslation();
  const pageSize = usePaginationStore((state) => state.pageSize);
  const selectedYearId = useAcademicYearStore((state) => state.selectedYearId);

  const {
    teachers,
    viewMode,
    setViewMode,
    searchQuery,
    setSearchQuery,
    statusFilter,
    currentPage,
    setCurrentPage,
    openCreateDrawer,
    fetchTeachers,
  } = useTeacherStore();

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      const blob = await teachersApi.exportExcel({
        workStatus: statusFilter !== 'all' ? statusFilter : undefined,
        search: searchQuery || undefined,
        schoolYearId: selectedYearId || undefined,
      });
      const filename = `Danh_Sach_Giao_Vien_${new Date().toISOString().slice(0, 10)}.xlsx`;
      downloadBlob(blob, filename);
      toast.success('Đã xuất danh sách cán bộ giáo viên ra file Excel thành công.');
    } catch (err) {
      toast.error('Không thể xuất file Excel. Vui lòng thử lại sau.');
    } finally {
      setIsExporting(false);
    }
  };


  // Filtered Teachers
  const filteredTeachers = useMemo(() => {
    let list = [...teachers];

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (teacher) =>
          (teacher.fullName && teacher.fullName.toLowerCase().includes(q)) ||
          (teacher.employeeCode && teacher.employeeCode.toLowerCase().includes(q)) ||
          (teacher.email && teacher.email.toLowerCase().includes(q)) ||
          (teacher.phone && teacher.phone.includes(q)) ||
          (teacher.account?.username && teacher.account.username.toLowerCase().includes(q)) ||
          ((teacher.role || teacher.position || '').toLowerCase().includes(q)),
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      list = list.filter((teacher) => teacher.status === statusFilter);
    } else {
      list = list.filter((teacher) => !teacher.isDeleted);
    }

    // Default sort by teacher code (GV001, GV002, ...)
    list.sort((a, b) => {
      const codeA = String(a.employeeCode || a.code || '').trim();
      const codeB = String(b.employeeCode || b.code || '').trim();
      return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' });
    });

    return list;
  }, [teachers, searchQuery, statusFilter]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredTeachers.length / pageSize) || 1;
  const paginatedTeachers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTeachers.slice(start, start + pageSize);
  }, [filteredTeachers, currentPage, pageSize]);

  return (
    <div
      className="w-full flex-1 flex flex-col gap-5 max-w-[1300px] mx-auto text-foreground select-none"
      data-node-id="4273:5204"
      data-name="FE-03A · Teachers · List"
    >
      {/* Page Header (Figma 4273:5237) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Title and Subtitle */}
        <div className="flex flex-col gap-1">
          <h1 className="text-[26px] font-semibold text-foreground tracking-tight">
            {t('teacher.title', 'Cán bộ')}
          </h1>
          <p className="text-[12px] text-muted-foreground font-normal">
            {t(
              'teacher.subtitle',
              'Quản lý hồ sơ, thông tin công tác và dữ liệu cán bộ',
            )}
          </p>
        </div>

        {/* View Actions Toolbar (Figma 4273:5241) */}
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
              placeholder={t('teacher.searchPlaceholder', 'Tìm kiếm cán bộ...')}
              className="h-8 pl-8 pr-2.5 text-[13px] bg-background border-border rounded-none shadow-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          {/* Columns Dropdown (Visible in List View) */}
          {viewMode === 'list' && <TeacherColumnsDropdown />}

          {/* Filter Dropdown */}
          <TeacherFilterDropdown />

          {/* View Mode Switcher (Matching AccountsPage) */}
          <div className="flex items-center border border-border bg-card rounded-none overflow-hidden h-8">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              title={t('teacher.listView', 'Dạng bảng')}
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
              title={t('teacher.gridView', 'Dạng lưới')}
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
            onImport={() => setIsImportModalOpen(true)}
            isExporting={isExporting}
          />

          {/* Add Teacher Button */}
          <Button
            type="button"
            onClick={openCreateDrawer}
            className="h-8 px-3 text-[13px] font-medium bg-[#1447e6] hover:bg-[#1447e6]/90 text-white rounded-none shadow-none cursor-pointer flex items-center gap-1.5"
            data-node-id="4273:5247"
            data-name="Button · Thêm giáo viên"
          >
            <HugeiconsIcon icon={Add01Icon} size={15} />
            <span>{t('teacher.addTeacher', 'Thêm cán bộ')}</span>
          </Button>
        </div>
      </div>

      {/* List Heading (Figma 4273:5251) */}
      <div className="flex items-center justify-between pt-1">
        <h2 className="text-[16px] font-semibold text-foreground">
          {t('teacher.listTitle', 'Danh sách cán bộ')}
        </h2>
        <span className="text-[12px] text-muted-foreground font-normal">
          {t('teacher.teacherCount', '{{count}} cán bộ', {
            count: filteredTeachers.length,
          })}
        </span>
      </div>

      {/* Content: Main Table or Grid View */}
      {viewMode === 'list' ? (
        <TeacherTable paginatedTeachers={paginatedTeachers} />
      ) : (
        <TeacherGrid paginatedTeachers={paginatedTeachers} />
      )}

      {/* Pagination Footer */}
      <TablePagination
        currentPage={currentPage}
        totalItems={filteredTeachers.length}
        onPageChange={setCurrentPage}
        itemLabel={t('teacher.staffUnit', 'cán bộ')}
      />

      {/* Global Slide-in Drawer & Delete Modal */}
      <TeacherDrawer />
      <DeleteTeacherDialog />

      {/* Excel Import Modal */}
      <ExcelImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Nhập cán bộ giáo viên từ Excel"
        description="Tải file mẫu, điền thông tin nhân sự để nhập hàng loạt và tự động cấp tài khoản cho giáo viên."
        templateFileName="Mau_Nhap_Giao_Vien_Sorak.xlsx"
        onDownloadTemplate={teachersApi.getImportTemplate}
        onPreview={teachersApi.previewImport}
        onImport={teachersApi.importTeachers}
        onSuccess={fetchTeachers}
      />
    </div>
  );
}
