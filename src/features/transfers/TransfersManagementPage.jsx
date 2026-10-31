import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Search01Icon,
  FilterHorizontalIcon,
  ArrowDown01Icon,
  CheckmarkSquare02Icon,
  Add01Icon,
  MoreHorizontalIcon,
  ViewIcon,
  Tick01Icon,
  Cancel01Icon,
} from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { TablePagination } from '@/shared/components/TablePagination';
import { usePaginationStore } from '@/shared/stores/pagination.store';
import { useAcademicYearStore } from '@/features/academic-years';
import { useAuthStore } from '@/features/auth';
import { useClassesStore, findTeacherClassForYear } from '@/features/classes';
import { cn } from '@/shared/lib/utils';
import { classesApi } from '../classes/classes.api';
import { studentsApi } from '../students/students.api';
import { getStudentAvatarUrl } from '../students/students.store';

// Priority sorting order when viewing "ALL"
const STATUS_SORT_WEIGHTS = {
  PENDING: 1,  // Chờ duyệt
  APPROVED: 2, // Đã duyệt
  REJECTED: 3, // Đã từ chối
};

export function TransfersManagementPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const classes = useClassesStore((state) => state.classes) || [];
  const selectedYearId = useAcademicYearStore((state) => state.selectedYearId);
  const academicYears = useAcademicYearStore((state) => state.academicYears);
  const isTeacher = user?.role === 'TEACHER_GV';
  const teacherClass = useMemo(
    () => findTeacherClassForYear(user, classes, selectedYearId),
    [user, classes, selectedYearId],
  );
  const selectedYear = useMemo(
    () => academicYears.find((y) => String(y.id) === String(selectedYearId)) || academicYears[0],
    [academicYears, selectedYearId],
  );

  const [data, setData] = useState({
    items: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL | PENDING | APPROVED | REJECTED
  const [currentPage, setCurrentPage] = useState(1);

  // Column visibility matching TeacherTable
  const [visibleColumns, setVisibleColumns] = useState({
    fromClass: true,
    toClass: true,
    reason: true,
    transferDate: true,
    status: true,
    actions: true,
  });

  const pageSize = usePaginationStore((state) => state.pageSize);

  // Reset page when year or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedYearId, statusFilter, searchQuery]);

  // Rejection modal state (BGH)
  const [transferToReject, setTransferToReject] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Cancellation modal state (Teacher)
  const [transferToCancel, setTransferToCancel] = useState(null);

  // Create Transfer Drawer State (BGH authority)
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [availableStudents, setAvailableStudents] = useState([]);
  const [availableClasses, setAvailableClasses] = useState([]);
  const [isLoadingFormOptions, setIsLoadingFormOptions] = useState(false);
  const [studentSearchInput, setStudentSearchInput] = useState('');

  // Create Form fields
  const [formStudentId, setFormStudentId] = useState('');
  const [formToClassId, setFormToClassId] = useState('');
  const [formTransferDate, setFormTransferDate] = useState(
    new Date().toISOString().split('T')[0],
  );
  const [formReason, setFormReason] = useState('');
  const [formAutoApprove, setFormAutoApprove] = useState(true); // Default to autoApprove = true for BGH
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = {};
      if (selectedYear?.id) {
        params.schoolYearId = selectedYear.id;
      }
      const res = await classesApi.getAllTransfers(params);
      if (res) {
        setData(res);
      }
    } catch (err) {
      console.error('Error loading transfer requests:', err);
      toast.error('Không thể tải danh sách yêu cầu chuyển lớp.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedYear?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load student & class options when opening Create drawer
  const handleOpenCreateDrawer = async () => {
    setIsCreateDrawerOpen(true);
    setIsLoadingFormOptions(true);
    setStudentSearchInput('');
    try {
      const classParams = { limit: 100 };
      if (selectedYear?.id) {
        classParams.schoolYearId = selectedYear.id;
      }
      const [studentsRes, classesRes] = await Promise.all([
        studentsApi.list({ limit: 100 }), // strictly <= 100 to avoid any Joi validation error
        classesApi.list(classParams),
      ]);

      const studentList = Array.isArray(studentsRes)
        ? studentsRes
        : studentsRes?.items || [];
      const classList = Array.isArray(classesRes)
        ? classesRes
        : classesRes?.items || [];

      // Filter only students whose current class belongs to this school year
      const classIdsInYear = new Set(classList.map((c) => String(c.id || c.class_id)));
      let enrolledStudents = studentList.filter((s) => {
        const studentClassId = String(s.currentClass?.classId || s.currentClass?.id || '');
        return classIdsInYear.has(studentClassId);
      });

      // If user is a teacher, restrict available students to teacher's own class
      if (isTeacher) {
        const teacherClassIds = new Set();
        if (teacherClass) {
          teacherClassIds.add(String(teacherClass.id || teacherClass.publicId || teacherClass.class_id));
        }
        const userSub = String(user?.sub || user?.id || user?.accountId || '');
        (classes || []).forEach((c) => {
          const isAssigned = (c.teachers || c.teacher_classes || []).some((tc) => {
            const acc = tc.teacher?.account || tc.account;
            const tId = String(tc.id || tc.teacher_id || tc.account_id || '');
            return (
              (acc && (String(acc.account_id) === userSub || String(acc.public_id) === userSub)) ||
              tId === userSub
            );
          });
          if (isAssigned) {
            teacherClassIds.add(String(c.id || c.publicId || c.class_id));
          }
        });

        enrolledStudents = enrolledStudents.filter((s) => {
          const studentClassId = String(s.currentClass?.classId || s.currentClass?.id || '');
          return teacherClassIds.has(studentClassId);
        });
      }

      setAvailableStudents(enrolledStudents);
      setAvailableClasses(classList);

      if (enrolledStudents.length > 0) {
        setFormStudentId(String(enrolledStudents[0].id || enrolledStudents[0].student_id));
      } else {
        setFormStudentId('');
      }
    } catch (err) {
      console.error('Failed to load students/classes for transfer drawer:', err);
      toast.error('Không thể tải danh sách học sinh và lớp học');
    } finally {
      setIsLoadingFormOptions(false);
    }
  };

  // Filter available students for search input inside drawer
  const filteredAvailableStudents = useMemo(() => {
    if (!studentSearchInput.trim()) return availableStudents;
    const q = studentSearchInput.toLowerCase().trim();
    return availableStudents.filter(
      (s) =>
        (s.fullName || s.full_name || '').toLowerCase().includes(q) ||
        (s.studentCode || s.student_code || '').toLowerCase().includes(q) ||
        (s.currentClass?.className || '').toLowerCase().includes(q),
    );
  }, [availableStudents, studentSearchInput]);

  const selectedStudent = useMemo(() => {
    return availableStudents.find(
      (s) => String(s.id || s.student_id) === String(formStudentId),
    );
  }, [availableStudents, formStudentId]);

  // Automatically select the first search result when quick-searching students in drawer
  useEffect(() => {
    if (!studentSearchInput.trim()) return;
    if (filteredAvailableStudents.length > 0) {
      const isAlreadyInResults = filteredAvailableStudents.some(
        (s) => String(s.id || s.student_id) === String(formStudentId),
      );
      if (!isAlreadyInResults) {
        setFormStudentId(String(filteredAvailableStudents[0].id || filteredAvailableStudents[0].student_id));
        setFormToClassId('');
      }
    } else {
      setFormStudentId('');
      setFormToClassId('');
    }
  }, [studentSearchInput, filteredAvailableStudents, formStudentId]);

  const filteredTargetClasses = useMemo(() => {
    if (!selectedStudent?.currentClass) return availableClasses;
    const currentClassId = String(
      selectedStudent.currentClass.classId || selectedStudent.currentClass.id,
    );
    const studentAgeGroup = String(
      selectedStudent.currentClass.ageGroup || selectedStudent.currentClass.grade || '',
    )
      .toUpperCase()
      .replace(/[^A-Z]/g, '');

    return availableClasses.filter((c) => {
      // Cannot transfer to current class
      if (String(c.id || c.class_id) === currentClassId) return false;

      // BR-43: Target class must match the student's age group / grade
      if (studentAgeGroup) {
        const classAgeGroup = String(c.ageGroup || c.grade || '')
          .toUpperCase()
          .replace(/[^A-Z]/g, '');
        if (classAgeGroup && classAgeGroup !== studentAgeGroup) {
          return false;
        }
      }
      return true;
    });
  }, [availableClasses, selectedStudent]);

  // Keep target class select valid when selected student or filtered target classes change
  useEffect(() => {
    if (filteredTargetClasses.length > 0) {
      const isTargetValid = filteredTargetClasses.some(
        (c) => String(c.id || c.class_id) === String(formToClassId),
      );
      if (!isTargetValid) {
        setFormToClassId(String(filteredTargetClasses[0].id || filteredTargetClasses[0].class_id));
      }
    } else {
      setFormToClassId('');
    }
  }, [filteredTargetClasses, formToClassId]);

  const selectedTargetClass = useMemo(() => {
    return availableClasses.find(
      (c) => String(c.id || c.class_id) === String(formToClassId),
    );
  }, [availableClasses, formToClassId]);

  // Handle Create Submit
  const handleCreateTransferSubmit = async (e) => {
    e.preventDefault();
    if (!formStudentId) {
      toast.error('Vui lòng chọn học sinh cần chuyển lớp');
      return;
    }
    if (!formToClassId) {
      toast.error('Vui lòng chọn lớp học chuyển đến');
      return;
    }

    try {
      setIsSubmittingCreate(true);
      const currentClassId = selectedStudent?.currentClass
        ? String(selectedStudent.currentClass.classId || selectedStudent.currentClass.id)
        : undefined;

      await classesApi.createGlobalTransferRequest({
        studentId: formStudentId,
        fromClassId: currentClassId,
        toClassId: formToClassId,
        transferDate: formTransferDate,
        reason: formReason.trim() || 'Chuyển theo nguyện vọng phụ huynh',
        autoApprove: isTeacher ? false : formAutoApprove,
      });

      if (formAutoApprove) {
        toast.success(
          `BGH đã điều chuyển học sinh ${selectedStudent?.fullName || ''} sang lớp mới thành công!`,
        );
      } else {
        toast.success(
          `Đã tạo yêu cầu chuyển lớp cho học sinh ${selectedStudent?.fullName || ''} thành công!`,
        );
      }
      setIsCreateDrawerOpen(false);
      setFormReason('');
      setFormToClassId('');
      loadData();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Lỗi khi tạo yêu cầu chuyển lớp';
      toast.error(msg);
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  const handleApprove = async (transfer) => {
    try {
      setIsUpdatingStatus(true);
      await classesApi.updateGlobalTransferStatus(transfer.id, {
        status: 'APPROVED',
      });
      toast.success(`Đã phê duyệt yêu cầu chuyển lớp của học sinh ${transfer.studentName}!`);
      loadData();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Lỗi khi phê duyệt';
      toast.error(msg);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!transferToReject) return;
    try {
      setIsUpdatingStatus(true);
      await classesApi.rejectTransfer(transferToReject.id, {
        rejectedReason: rejectReason.trim(),
      });
      toast.success(`Đã từ chối yêu cầu chuyển lớp của học sinh ${transferToReject.studentName}.`);
      setTransferToReject(null);
      setRejectReason('');
      loadData();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Lỗi khi từ chối';
      toast.error(msg);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!transferToCancel) return;
    try {
      setIsUpdatingStatus(true);
      await classesApi.cancelTransfer(transferToCancel.id);
      toast.success(`Đã hủy yêu cầu chuyển lớp của học sinh ${transferToCancel.studentName}.`);
      setTransferToCancel(null);
      loadData();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Lỗi khi hủy yêu cầu';
      toast.error(msg);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Client-side filtering & sorting per rule: Chờ duyệt -> Đã duyệt -> Đã từ chối
  const filteredItems = useMemo(() => {
    let list = [...(data.items || [])];

    // Filter strictly by selected academic year
    if (selectedYear) {
      const yearIdStr = String(selectedYear.id);
      const yearName = (selectedYear.name || '').trim();
      const yearRange = (selectedYear.range || '').trim();

      list = list.filter((i) => {
        if (i.schoolYearId && String(i.schoolYearId) === yearIdStr) return true;
        if (i.fromClassSchoolYearId && String(i.fromClassSchoolYearId) === yearIdStr) return true;
        if (i.toClassSchoolYearId && String(i.toClassSchoolYearId) === yearIdStr) return true;

        if (i.fromClassSchoolYear && (i.fromClassSchoolYear === yearName || (yearRange && i.fromClassSchoolYear.includes(yearRange)))) return true;
        if (i.toClassSchoolYear && (i.toClassSchoolYear === yearName || (yearRange && i.toClassSchoolYear.includes(yearRange)))) return true;
        if (i.schoolYearName && (i.schoolYearName === yearName || (yearRange && i.schoolYearName.includes(yearRange)))) return true;

        // If transfer item has no year info at all, include only if selectedYear is active
        if (!i.schoolYearId && !i.fromClassSchoolYear && !i.toClassSchoolYear) {
          return selectedYear.active || selectedYear.status === 'ACTIVE';
        }
        return false;
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (i) =>
          (i.studentName && i.studentName.toLowerCase().includes(q)) ||
          (i.studentCode && i.studentCode.toLowerCase().includes(q)) ||
          (i.fromClassName && i.fromClassName.toLowerCase().includes(q)) ||
          (i.toClassName && i.toClassName.toLowerCase().includes(q)),
      );
    }

    if (statusFilter === 'ALL') {
      // Sắp xếp ưu tiên: 1. Chờ duyệt -> 2. Đã duyệt -> 3. Đã từ chối
      list.sort((a, b) => {
        const weightA = STATUS_SORT_WEIGHTS[a.status] || 99;
        const weightB = STATUS_SORT_WEIGHTS[b.status] || 99;
        if (weightA !== weightB) {
          return weightA - weightB;
        }
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      });
    } else {
      list = list.filter((i) => i.status === statusFilter);
      list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }

    return list;
  }, [data.items, selectedYear, searchQuery, statusFilter]);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  return (
    <div className="w-full flex-1 flex flex-col gap-6 max-w-[1300px] mx-auto text-foreground select-none pb-12">
      {/* Page Header & Toolbar matching TeachersPage layout */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-[26px] font-semibold text-foreground tracking-tight">
            {t('transfers.title', 'Chuyển lớp')}
          </h1>
          <p className="text-[13px] text-muted-foreground font-normal">
            {t('transfers.subtitle', 'Xem xét, đối chiếu hồ sơ và xử lý các yêu cầu điều chuyển học sinh giữa các lớp')}
          </p>
        </div>

        {/* View Actions Toolbar matching TeachersPage */}
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
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={t('transfers.searchPlaceholder', 'Tìm học sinh, mã HS, lớp...')}
              className="h-8 pl-8 pr-2.5 text-[13px] bg-background border-border rounded-none shadow-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          {/* Columns Dropdown matching TeacherColumnsDropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="h-8 px-2.5 bg-background border border-border text-[14px] font-medium text-foreground hover:bg-muted/50 rounded-none flex items-center justify-center gap-1 transition-colors cursor-pointer select-none"
                data-name="Columns · Transfers"
              >
                <span>{t('teacher.columns', 'Cột')}</span>
                <HugeiconsIcon
                  icon={ArrowDown01Icon}
                  size={14}
                  className="text-muted-foreground shrink-0"
                />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-48 p-1.5 rounded-none border border-border bg-card shadow-xl z-50 text-foreground"
            >
              <DropdownMenuLabel className="px-2 py-1 text-[12px] font-medium text-muted-foreground">
                {t('transfers.showColumns', 'Hiển thị cột')}
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="my-1 border-t border-border" />
              {[
                { key: 'fromClass', label: t('transfers.colFromClass', 'Lớp hiện tại') },
                { key: 'toClass', label: t('transfers.colToClass', 'Lớp chuyển đến') },
                { key: 'reason', label: t('transfers.colReason', 'Lý do chuyển') },
                { key: 'transferDate', label: t('transfers.colTransferDate', 'Ngày hiệu lực') },
                { key: 'status', label: t('transfers.colStatus', 'Trạng thái') },
              ].map((col) => (
                <DropdownMenuItem
                  key={col.key}
                  onClick={(e) => {
                    e.preventDefault();
                    setVisibleColumns((prev) => ({
                      ...prev,
                      [col.key]: !prev[col.key],
                    }));
                  }}
                  className="flex items-center justify-between h-8 px-2 text-[13px] cursor-pointer rounded-none hover:bg-muted/60"
                >
                  <span>{col.label}</span>
                  {visibleColumns[col.key] && (
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

          {/* Filter Dropdown matching TeacherFilterDropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  'size-8 bg-background border border-border text-foreground hover:bg-muted/50 rounded-none flex items-center justify-center transition-colors cursor-pointer select-none',
                  statusFilter !== 'ALL' && 'border-primary text-primary bg-primary/5',
                )}
                title={t('transfers.filterStatus', 'Lọc trạng thái')}
                data-name="Filter · Transfers"
              >
                <HugeiconsIcon icon={FilterHorizontalIcon} size={16} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-44 p-1.5 rounded-none border border-border bg-card shadow-xl z-50 text-foreground"
            >
              <DropdownMenuLabel className="px-2 py-1 text-[12px] font-medium text-muted-foreground">
                {t('transfers.filterStatus', 'Trạng thái yêu cầu')}
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="my-1 border-t border-border" />
              {[
                { key: 'ALL', label: t('transfers.statusAll', 'Tất cả') },
                { key: 'PENDING', label: t('transfers.statusPending', 'Chờ duyệt') },
                { key: 'APPROVED', label: t('transfers.statusApproved', 'Đã duyệt') },
                { key: 'REJECTED', label: t('transfers.statusRejected', 'Đã từ chối') },
                { key: 'CANCELLED', label: t('transfers.statusCancelled', 'Đã hủy') },
              ].map((item) => (
                <DropdownMenuItem
                  key={item.key}
                  onClick={() => {
                    setStatusFilter(item.key);
                    setCurrentPage(1);
                  }}
                  className="flex items-center justify-between h-8 px-2 text-[13px] cursor-pointer rounded-none hover:bg-muted/60"
                >
                  <span>{item.label}</span>
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

          {/* Add Transfer Button matching Teacher Add Button */}
          <Button
            type="button"
            onClick={handleOpenCreateDrawer}
            className="h-8 px-3 text-[13px] font-medium bg-[#1447e6] hover:bg-[#1447e6]/90 text-white rounded-none shadow-none cursor-pointer flex items-center gap-1.5"
            data-name="Button · Thêm yêu cầu"
          >
            <HugeiconsIcon icon={Add01Icon} size={15} />
            <span>{t('transfers.addRequest', 'Thêm yêu cầu')}</span>
          </Button>
        </div>
      </div>

      {/* List Heading matching TeachersPage */}
      <div className="flex items-center justify-between pt-1">
        <h2 className="text-[16px] font-semibold text-foreground">
          {t('transfers.listTitle', 'Danh sách yêu cầu chuyển lớp')}
        </h2>
        <span className="text-[12px] text-muted-foreground font-normal">
          {t('transfers.requestCount', { count: filteredItems.length })}
        </span>
      </div>

      {/* Main Table matching TeacherTable style */}
      <div
        className="w-full border border-border bg-card rounded-none overflow-x-auto shadow-xs select-none"
        data-name="Transfers Table · Unified"
      >
        <table className="w-full text-left border-collapse min-w-[900px]">
          {/* Table Header */}
          <thead>
            <tr className="h-10 border-b border-border bg-muted/30 text-[13px] font-medium text-foreground">
              <th className="px-3 min-w-[200px] font-medium">{t('transfers.colStudent', 'Học sinh')}</th>
              {visibleColumns.fromClass && (
                <th className="px-3 min-w-[130px] font-medium">{t('transfers.colFromClass', 'Lớp hiện tại')}</th>
              )}
              {visibleColumns.toClass && (
                <th className="px-3 min-w-[130px] font-medium">{t('transfers.colToClass', 'Lớp chuyển đến')}</th>
              )}
              {visibleColumns.reason && (
                <th className="px-3 min-w-[220px] font-medium">{t('transfers.colReason', 'Lý do chuyển')}</th>
              )}
              {visibleColumns.transferDate && (
                <th className="px-3 min-w-[120px] font-medium">{t('transfers.colTransferDate', 'Ngày hiệu lực')}</th>
              )}
              {visibleColumns.status && (
                <th className="px-3 min-w-[110px] font-medium">{t('transfers.colStatus', 'Trạng thái')}</th>
              )}
              {visibleColumns.actions && (
                <th className="px-3 min-w-[80px] w-[80px] text-right font-medium whitespace-nowrap">
                  {t('transfers.colActions', 'Thao tác')}
                </th>
              )}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-border/60">
            {isLoading && paginatedItems.length === 0 ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <tr key={idx} className="h-[72px] animate-pulse">
                  <td className="px-3">
                    <div className="flex items-center gap-3">
                      <div className="size-8 bg-muted/60 rounded-none shrink-0" />
                      <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                        <div className="h-3.5 w-28 bg-muted/60 rounded-none" />
                        <div className="h-2.5 w-16 bg-muted/40 rounded-none" />
                      </div>
                    </div>
                  </td>
                  {visibleColumns.fromClass && (
                    <td className="px-3"><div className="h-3.5 w-20 bg-muted/50 rounded-none" /></td>
                  )}
                  {visibleColumns.toClass && (
                    <td className="px-3"><div className="h-3.5 w-20 bg-muted/50 rounded-none" /></td>
                  )}
                  {visibleColumns.reason && (
                    <td className="px-3"><div className="h-3.5 w-32 bg-muted/50 rounded-none" /></td>
                  )}
                  {visibleColumns.transferDate && (
                    <td className="px-3"><div className="h-3.5 w-20 bg-muted/50 rounded-none" /></td>
                  )}
                  {visibleColumns.status && (
                    <td className="px-3"><div className="h-5 w-20 bg-muted/50 rounded-none" /></td>
                  )}
                  {visibleColumns.actions && (
                    <td className="px-3 text-right"><div className="size-7 bg-muted/40 ml-auto rounded-none" /></td>
                  )}
                </tr>
              ))
            ) : paginatedItems.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-muted-foreground rounded-none">
                  <p className="text-[14px]">{t('transfers.emptyList', 'Không tìm thấy yêu cầu chuyển lớp nào phù hợp.')}</p>
                </td>
              </tr>
            ) : (
              paginatedItems.map((transfer) => {
                const dateStr = transfer.transferDate
                  ? new Date(transfer.transferDate).toLocaleDateString('vi-VN')
                  : transfer.createdAt
                    ? new Date(transfer.createdAt).toLocaleDateString('vi-VN')
                    : '—';

                return (
                  <tr
                    key={transfer.id}
                    onClick={() => navigate(`/transfers/${transfer.id}`)}
                    className="h-[72px] hover:bg-muted/40 transition-colors group cursor-pointer"
                  >
                    {/* Student Info matching Teacher Profile column */}
                    <td className="px-3">
                      <div className="flex items-center gap-3">
                        <div className="size-8 shrink-0 rounded-none overflow-hidden border border-border bg-muted">
                          <img
                            src={getStudentAvatarUrl(
                              transfer.studentAvatar,
                              transfer.studentCode || transfer.studentName,
                            )}
                            alt={transfer.studentName}
                            className="size-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = getStudentAvatarUrl(
                                null,
                                transfer.studentCode || transfer.studentName,
                              );
                            }}
                          />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-[13.5px] font-medium text-foreground leading-snug truncate">
                            {transfer.studentName}
                          </span>
                          <span className="font-mono text-[11px] text-muted-foreground truncate">
                            {transfer.studentCode || 'HS---'}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* From Class (Pure text, no school year subtitle) */}
                    {visibleColumns.fromClass && (
                      <td className="px-3">
                        <span className="text-[13px] font-medium text-foreground truncate block">
                          {transfer.fromClassName}
                        </span>
                      </td>
                    )}

                    {/* To Class (Pure text matching From Class, no blue color) */}
                    {visibleColumns.toClass && (
                      <td className="px-3">
                        <span className="text-[13px] font-medium text-foreground truncate block">
                          {transfer.toClassName}
                        </span>
                      </td>
                    )}

                    {/* Reason */}
                    {visibleColumns.reason && (
                      <td className="px-3">
                        <span
                          className="text-[13px] text-foreground font-normal line-clamp-2 max-w-[240px]"
                          title={transfer.reason || '—'}
                        >
                          {transfer.reason || '—'}
                        </span>
                      </td>
                    )}

                    {/* Effective Date */}
                    {visibleColumns.transferDate && (
                      <td className="px-3 text-[13px] text-muted-foreground font-normal whitespace-nowrap">
                        {dateStr}
                      </td>
                    )}

                    {/* Status Badge matching TeacherTable */}
                    {visibleColumns.status && (
                      <td className="px-3 whitespace-nowrap">
                        {transfer.status === 'PENDING' && (
                          <span className="inline-flex items-center justify-center px-2 py-0.5 text-[12px] font-medium bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 rounded-none">
                            {t('transfers.statusPending', 'Chờ duyệt')}
                          </span>
                        )}
                        {transfer.status === 'APPROVED' && (
                          <span className="inline-flex items-center justify-center px-2 py-0.5 text-[12px] font-medium bg-secondary text-secondary-foreground rounded-none">
                            {t('transfers.statusApproved', 'Đã duyệt')}
                          </span>
                        )}
                        {transfer.status === 'REJECTED' && (
                          <span className="inline-flex items-center justify-center px-2 py-0.5 text-[12px] font-medium bg-muted text-muted-foreground rounded-none">
                            {t('transfers.statusRejected', 'Đã từ chối')}
                          </span>
                        )}
                        {transfer.status === 'CANCELLED' && (
                          <span className="inline-flex items-center justify-center px-2 py-0.5 text-[12px] font-medium bg-muted text-muted-foreground rounded-none">
                            {t('transfers.statusCancelled', 'Đã hủy')}
                          </span>
                        )}
                      </td>
                    )}

                    {/* Actions Dropdown matching TeacherTable (...) */}
                    {visibleColumns.actions && (
                      <td
                        className="px-3 min-w-[80px] w-[80px] text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              disabled={isUpdatingStatus}
                              className="size-7 inline-flex items-center justify-center rounded-none text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors cursor-pointer ml-auto disabled:opacity-40"
                              title={t('common.actions', 'Thao tác')}
                              data-name="Actions · More"
                            >
                              <HugeiconsIcon icon={MoreHorizontalIcon} size={16} />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            onClick={(e) => e.stopPropagation()}
                            className="w-40 p-1 rounded-none border border-border bg-card shadow-xl z-50 text-foreground"
                          >
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/transfers/${transfer.id}`);
                              }}
                              className="flex items-center gap-2 h-8 px-2 text-[13px] text-foreground cursor-pointer rounded-none hover:bg-muted/60"
                            >
                              <HugeiconsIcon icon={ViewIcon} size={15} />
                              <span>{t('transfers.viewDetail', 'Xem chi tiết')}</span>
                            </DropdownMenuItem>

                            {transfer.status === 'PENDING' && (
                              <>
                                <DropdownMenuSeparator className="my-1 border-t border-border" />
                                {!isTeacher ? (
                                  <>
                                    <DropdownMenuItem
                                      disabled={isUpdatingStatus}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleApprove(transfer);
                                      }}
                                      className="flex items-center gap-2 h-8 px-2 text-[13px] text-foreground cursor-pointer rounded-none hover:bg-muted/60 disabled:opacity-40"
                                    >
                                      <HugeiconsIcon icon={Tick01Icon} size={15} />
                                      <span>{t('transfers.approveAction', 'Duyệt yêu cầu')}</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      disabled={isUpdatingStatus}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setTransferToReject(transfer);
                                      }}
                                      className="flex items-center gap-2 h-8 px-2 text-[13px] text-foreground cursor-pointer rounded-none hover:bg-muted/60 disabled:opacity-40"
                                    >
                                      <HugeiconsIcon icon={Cancel01Icon} size={15} />
                                      <span>{t('transfers.rejectAction', 'Từ chối')}</span>
                                    </DropdownMenuItem>
                                  </>
                                ) : (
                                  <DropdownMenuItem
                                    disabled={isUpdatingStatus}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setTransferToCancel(transfer);
                                    }}
                                    className="flex items-center gap-2 h-8 px-2 text-[13px] text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer rounded-none disabled:opacity-40"
                                  >
                                    <HugeiconsIcon icon={Cancel01Icon} size={15} />
                                    <span>{t('transfers.cancelAction', 'Hủy yêu cầu')}</span>
                                  </DropdownMenuItem>
                                )}
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer matching TeachersPage */}
      <TablePagination
        currentPage={currentPage}
        totalItems={filteredItems.length}
        onPageChange={setCurrentPage}
        itemLabel="yêu cầu"
      />

      {/* CREATE TRANSFER REQUEST DRAWER (BGH PRIVILEGE) */}
      {isCreateDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            onClick={() => setIsCreateDrawerOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in-0 duration-200"
          />

          {/* Drawer Panel */}
          <div
            className="relative w-full max-w-[560px] h-full bg-card border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-250 ease-out z-10 text-foreground"
            data-name="Create Transfer Drawer · BGH"
          >
            {/* Drawer Header */}
            <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-border shrink-0 bg-card">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-[18px] font-semibold text-foreground tracking-tight">
                    Tạo yêu cầu chuyển lớp
                  </h2>
                  <span className="text-[11px] font-medium bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-none">
                    Ban Giám Hiệu
                  </span>
                </div>
                <p className="text-[12px] text-muted-foreground font-normal">
                  Điều phối và chuyển học sinh giữa các lớp học trong năm học hiện tại
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateDrawerOpen(false)}
                className="size-8 flex items-center justify-center border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer rounded-none"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="size-4" />
              </button>
            </div>

            {/* Drawer Content */}
            {isLoadingFormOptions ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-muted-foreground text-[13px]">
                <div className="size-6 border-2 border-primary border-t-transparent animate-spin rounded-full" />
                <span>Đang tải danh sách học sinh và lớp học...</span>
              </div>
            ) : (
              <form onSubmit={handleCreateTransferSubmit} className="flex-1 flex flex-col min-h-0">
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                  {/* Select Student */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="transferStudent" className="text-[12px] font-medium text-foreground">
                        Học sinh chuyển lớp <span className="text-destructive">*</span>
                      </Label>
                      <span className="text-[11px] text-muted-foreground">
                        {availableStudents.length} học sinh đang học
                      </span>
                    </div>

                    {/* Quick Search Student Input */}
                    <div className="relative">
                      <HugeiconsIcon
                        icon={Search01Icon}
                        size={14}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                      />
                      <Input
                        type="text"
                        value={studentSearchInput}
                        onChange={(e) => setStudentSearchInput(e.target.value)}
                        placeholder="Tìm nhanh theo tên, mã HS..."
                        className="h-8 pl-8 text-[12px] bg-background border-border rounded-none shadow-none"
                      />
                    </div>

                    <select
                      id="transferStudent"
                      value={formStudentId}
                      onChange={(e) => {
                        setFormStudentId(e.target.value);
                        setFormToClassId('');
                      }}
                      className="w-full h-9 px-3 bg-background border border-border rounded-none text-[13px] text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer"
                      required
                    >
                      <option value="">
                        {filteredAvailableStudents.length === 0
                          ? '-- Không tìm thấy học sinh phù hợp --'
                          : `-- Chọn học sinh (${filteredAvailableStudents.length}) --`}
                      </option>
                      {filteredAvailableStudents.map((s) => (
                        <option key={s.id || s.student_id} value={s.id || s.student_id}>
                          {s.fullName || s.full_name} ({s.studentCode || s.student_code}) · {s.currentClass?.className || 'Đang học'}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Selected Student Card */}
                  {selectedStudent && (
                    <div className="p-3.5 border border-border bg-muted/20 flex flex-col gap-2.5">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-none overflow-hidden border border-border bg-muted shrink-0">
                          <img
                            src={getStudentAvatarUrl(
                              selectedStudent.avatarUrl || selectedStudent.avatar,
                              selectedStudent.studentCode || selectedStudent.fullName,
                            )}
                            alt={selectedStudent.fullName}
                            className="size-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = getStudentAvatarUrl(
                                null,
                                selectedStudent.studentCode || selectedStudent.fullName,
                              );
                            }}
                          />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-[14px] font-semibold text-foreground truncate">
                            {selectedStudent.fullName}
                          </span>
                          <span className="font-mono text-[12px] text-muted-foreground">
                            Mã HS: {selectedStudent.studentCode || '—'}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60 text-[12px]">
                        <div>
                          <span className="text-muted-foreground block text-[11px]">Lớp hiện tại:</span>
                          <span className="font-semibold text-foreground">
                            {selectedStudent.currentClass?.className || 'Chưa phân lớp'}
                          </span>
                          {selectedStudent.currentClass?.roomNumber && (
                            <span className="text-muted-foreground block text-[11px]">
                              {selectedStudent.currentClass.roomNumber}
                            </span>
                          )}
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[11px]">Phụ huynh liên hệ:</span>
                          <span className="font-medium text-foreground truncate block">
                            {selectedStudent.primaryParent?.fullName || 'Chưa cập nhật'}
                          </span>
                          {selectedStudent.primaryParent?.phone && (
                            <span className="font-mono text-muted-foreground block text-[11px]">
                              {selectedStudent.primaryParent.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Target Class */}
                  <div className="space-y-1.5">
                    <Label htmlFor="toClass" className="text-[12px] font-medium text-foreground">
                      Lớp chuyển đến <span className="text-destructive">*</span>
                    </Label>
                    <select
                      id="toClass"
                      value={formToClassId}
                      onChange={(e) => setFormToClassId(e.target.value)}
                      className="w-full h-9 px-3 bg-background border border-border rounded-none text-[13px] text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer"
                      required
                    >
                      <option value="">-- Chọn lớp học tiếp nhận --</option>
                      {filteredTargetClasses.map((c) => (
                        <option key={c.id || c.class_id} value={c.id || c.class_id}>
                          {c.name} {c.room ? `(${c.room})` : ''} · Sĩ số: {c.studentCount || 0}/{c.capacity || 25}
                        </option>
                      ))}
                    </select>
                    {selectedTargetClass && (
                      <div className="flex items-center gap-2 p-2 border border-border bg-muted/10 text-[12px] text-muted-foreground">
                        <span>
                          Sĩ số hiện tại: <strong className="text-foreground">{selectedTargetClass.studentCount || 0}/{selectedTargetClass.capacity || 25}</strong>
                        </span>
                        <span>•</span>
                        <span>
                          Số chỗ còn lại: <strong className="text-foreground">{Math.max(0, (selectedTargetClass.capacity || 25) - (selectedTargetClass.studentCount || 0))}</strong>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Transfer Date */}
                  <div className="space-y-1.5">
                    <Label htmlFor="transferDate" className="text-[12px] font-medium text-foreground">
                      Ngày hiệu lực chuyển lớp <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="transferDate"
                      type="date"
                      value={formTransferDate}
                      onChange={(e) => setFormTransferDate(e.target.value)}
                      className="h-9 text-[13px] bg-background border-border rounded-none"
                      required
                    />
                  </div>

                  {/* Reason */}
                  <div className="space-y-1.5">
                    <Label htmlFor="transferReason" className="text-[12px] font-medium text-foreground">
                      Lý do chuyển lớp <span className="text-destructive">*</span>
                    </Label>
                    <textarea
                      id="transferReason"
                      value={formReason}
                      onChange={(e) => setFormReason(e.target.value)}
                      placeholder="Nhập lý do chuyển lớp (VD: Nguyện vọng phụ huynh, sắp xếp sĩ số phòng học, chuyển theo độ tuổi...)"
                      rows={3}
                      className="w-full p-2.5 text-[13px] bg-background border border-border rounded-none outline-none focus:border-primary resize-none text-foreground"
                      required
                    />
                  </div>

                  {/* BGH Privilege: Auto Approve and Move Immediately */}
                  {!isTeacher && (
                    <div className="p-3.5 border border-border bg-muted/20 flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="autoApproveToggle"
                        checked={formAutoApprove}
                        onChange={(e) => setFormAutoApprove(e.target.checked)}
                        className="size-4 mt-0.5 rounded-none text-primary border-border focus:ring-primary cursor-pointer"
                      />
                      <label htmlFor="autoApproveToggle" className="cursor-pointer select-none">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-semibold text-foreground">
                            Phê duyệt & Điều chuyển ngay vào lớp mới
                          </span>
                          <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 bg-primary/10 text-primary border border-primary/20">
                            Quyền BGH
                          </span>
                        </div>
                        <span className="text-[12px] text-muted-foreground block mt-1 leading-relaxed">
                          {formAutoApprove
                            ? 'Học sinh sẽ được rút khỏi lớp cũ và ghi danh vào lớp tiếp nhận ngay lập tức. Hồ sơ chuyển lớp được lưu ở trạng thái Đã duyệt.'
                            : 'Yêu cầu sẽ được tạo ở trạng thái Chờ duyệt để rà soát hoặc biểu quyết thêm.'}
                        </span>
                      </label>
                    </div>
                  )}
                </div>

                {/* Sticky Drawer Footer */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-card shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isSubmittingCreate}
                    onClick={() => setIsCreateDrawerOpen(false)}
                    className="h-8 px-4 rounded-none border-border text-[13px] font-normal shadow-none cursor-pointer"
                  >
                    Hủy
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmittingCreate || !formStudentId || !formToClassId}
                    className={cn(
                      'h-8 px-4 rounded-none text-white text-[13px] font-medium shadow-none cursor-pointer disabled:opacity-40 flex items-center gap-1.5',
                      formAutoApprove
                        ? 'bg-emerald-600 hover:bg-emerald-700'
                        : 'bg-[#1447e6] hover:bg-[#1447e6]/90',
                    )}
                  >
                    <HugeiconsIcon icon={formAutoApprove ? Tick01Icon : Add01Icon} size={15} />
                    <span>
                      {isSubmittingCreate
                        ? 'Đang xử lý...'
                        : formAutoApprove
                          ? 'Phê duyệt & Điều chuyển ngay'
                          : 'Tạo yêu cầu (Chờ duyệt)'}
                    </span>
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}



      {/* Reject Modal */}
      {transferToReject && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-[440px] border border-border bg-card p-5 rounded-none shadow-xl flex flex-col gap-4 select-none">
            <div className="flex flex-col gap-1">
              <h3 className="text-[16px] font-semibold text-foreground">
                {t('transfers.confirmRejectTitle', 'Từ chối yêu cầu chuyển lớp')}
              </h3>
              <p className="text-[13px] text-muted-foreground">
                {t('transfers.confirmRejectDesc', {
                  name: transferToReject.studentName,
                  code: transferToReject.studentCode,
                  defaultValue: `Xác nhận từ chối yêu cầu chuyển lớp của học sinh ${transferToReject.studentName} (Mã HS: ${transferToReject.studentCode})`
                })}
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-foreground">
                {t('transfers.rejectReasonLabel', 'Lý do từ chối')} <span className="text-destructive">*</span>
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder={t('transfers.rejectReasonPlaceholder', 'Nhập lý do từ chối (VD: Sĩ số lớp tiếp nhận đã quá tải, không đúng độ tuổi...)')}
                rows={3}
                className="w-full p-2.5 text-[13px] bg-background border border-border rounded-none outline-none focus:border-primary resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                disabled={isUpdatingStatus}
                onClick={() => {
                  setTransferToReject(null);
                  setRejectReason('');
                }}
                className="h-8 px-4 rounded-none border-border text-[13px] font-normal shadow-none cursor-pointer"
              >
                {t('common.cancel', 'Hủy')}
              </Button>
              <Button
                type="button"
                disabled={isUpdatingStatus || !rejectReason.trim()}
                onClick={handleConfirmReject}
                className="h-8 px-4 rounded-none bg-destructive hover:bg-destructive/90 text-white text-[13px] font-medium shadow-none cursor-pointer disabled:opacity-40"
              >
                {isUpdatingStatus ? t('common.saving', 'Đang lưu...') : t('transfers.rejectAction', 'Xác nhận từ chối')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Modal (Teacher) */}
      {transferToCancel && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-[440px] border border-border bg-card p-5 rounded-none shadow-xl flex flex-col gap-4 select-none">
            <div className="flex flex-col gap-1">
              <h3 className="text-[16px] font-semibold text-foreground">
                {t('transfers.confirmCancelTitle', 'Hủy yêu cầu chuyển lớp')}
              </h3>
              <p className="text-[13px] text-muted-foreground">
                {t('transfers.confirmCancelDesc', {
                  name: transferToCancel.studentName,
                  code: transferToCancel.studentCode,
                  defaultValue: `Bạn có chắc chắn muốn hủy yêu cầu chuyển lớp của học sinh ${transferToCancel.studentName} (Mã HS: ${transferToCancel.studentCode}) không? Sau khi hủy, yêu cầu sẽ không được gửi tới Ban Giám Hiệu.`
                })}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                disabled={isUpdatingStatus}
                onClick={() => setTransferToCancel(null)}
                className="h-8 px-4 rounded-none border-border text-[13px] font-normal shadow-none cursor-pointer"
              >
                {t('common.cancel', 'Đóng')}
              </Button>
              <Button
                type="button"
                disabled={isUpdatingStatus}
                onClick={handleConfirmCancel}
                className="h-8 px-4 rounded-none bg-destructive hover:bg-destructive/90 text-white text-[13px] font-medium shadow-none cursor-pointer disabled:opacity-40"
              >
                {isUpdatingStatus ? t('common.saving', 'Đang hủy...') : t('transfers.cancelAction', 'Xác nhận hủy')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TransfersManagementPage;
