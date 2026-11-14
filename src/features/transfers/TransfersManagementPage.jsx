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
  Calendar03Icon,
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
import { useAuthStore, isTeacherRole, isBghRole } from '@/features/auth';
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
  const isTeacher =
    isTeacherRole(user?.role) ||
    user?.role === 'TEACHER_GV' ||
    user?.role === 'TEACHER' ||
    user?.role?.toLowerCase()?.includes('teacher');
  const teacherClass = useMemo(
    () => (isTeacher ? findTeacherClassForYear(user, classes, selectedYearId) : null),
    [isTeacher, user, classes, selectedYearId],
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
  const [drawerClassFilter, setDrawerClassFilter] = useState('ALL');
  const [isStudentComboboxOpen, setIsStudentComboboxOpen] = useState(false);

  // Helper to convert any date (YYYY-MM-DD or ISO) to DD/MM/YYYY
  const toDmyString = (dateStr) => {
    if (!dateStr) return '';
    const clean = String(dateStr).trim();
    if (clean.includes('/')) return clean;
    const iso = clean.split('T')[0];
    const parts = iso.split('-');
    if (parts.length === 3) {
      const [y, m, d] = parts;
      return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
    }
    return clean;
  };

  // Helper to convert DD/MM/YYYY to YYYY-MM-DD for backend or native date picker
  const toIsoDateString = (dmy) => {
    if (!dmy) return '';
    const clean = String(dmy).trim();
    if (clean.includes('-')) return clean.split('T')[0];
    const parts = clean.split('/');
    if (parts.length === 3) {
      const [d, m, y] = parts;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    return clean;
  };

  // Create Form fields
  const [formStudentId, setFormStudentId] = useState('');
  const [formToClassId, setFormToClassId] = useState('');
  const [formTransferDate, setFormTransferDate] = useState(() => {
    return toDmyString(new Date().toISOString().split('T')[0]);
  });
  const [formReason, setFormReason] = useState('');
  const [formAutoApprove, setFormAutoApprove] = useState(false);
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);

  // Helper to strip Vietnamese diacritics for insensitive search
  const stripDiacritics = (str) => {
    if (!str) return '';
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase();
  };

  // Set of student IDs currently having a PENDING transfer request
  const pendingStudentIds = useMemo(() => {
    const ids = new Set();
    (data?.items || []).forEach((item) => {
      if (item.status === 'PENDING') {
        if (item.studentId) ids.add(String(item.studentId));
        if (item.student?.id) ids.add(String(item.student.id));
        if (item.studentCode) ids.add(String(item.studentCode));
      }
    });
    return ids;
  }, [data?.items]);

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

      setFormStudentId('');
      setFormToClassId('');
      setFormTransferDate(toDmyString(new Date().toISOString().split('T')[0]));
      if (isTeacher) {
        setFormAutoApprove(false);
        const tCId = String(teacherClass?.id || teacherClass?.publicId || teacherClass?.class_id || 'ALL');
        setDrawerClassFilter(tCId);
      } else {
        setFormAutoApprove(true);
        setDrawerClassFilter('ALL');
      }
      setIsStudentComboboxOpen(false);
    } catch (err) {
      console.error('Failed to load students/classes for transfer drawer:', err);
      toast.error('Không thể tải danh sách học sinh và lớp học');
    } finally {
      setIsLoadingFormOptions(false);
    }
  };

  // Filter available students for search input inside drawer (diacritics-insensitive)
  const filteredAvailableStudents = useMemo(() => {
    let list = availableStudents;
    if (!isTeacher && drawerClassFilter !== 'ALL') {
      list = list.filter((s) => {
        const sClassId = String(s.currentClass?.classId || s.currentClass?.id || '');
        return sClassId === String(drawerClassFilter);
      });
    }
    if (!studentSearchInput.trim()) return list;
    const q = stripDiacritics(studentSearchInput.trim());
    return list.filter((s) => {
      const name = stripDiacritics(s.fullName || s.full_name || '');
      const code = stripDiacritics(s.studentCode || s.student_code || '');
      const className = stripDiacritics(s.currentClass?.className || '');
      return name.includes(q) || code.includes(q) || className.includes(q);
    });
  }, [availableStudents, drawerClassFilter, studentSearchInput, isTeacher]);

  const selectedStudent = useMemo(() => {
    return availableStudents.find(
      (s) => String(s.id || s.student_id) === String(formStudentId),
    );
  }, [availableStudents, formStudentId]);

  const filteredTargetClasses = useMemo(() => {
    // Current class id to exclude
    const currentClassId = selectedStudent?.currentClass
      ? String(selectedStudent.currentClass.classId || selectedStudent.currentClass.id || '')
      : isTeacher && teacherClass
        ? String(teacherClass.id || teacherClass.publicId || teacherClass.class_id || '')
        : '';

    const studentAgeGroup = String(
      selectedStudent?.currentClass?.ageGroup ||
      selectedStudent?.currentClass?.grade ||
      (isTeacher && teacherClass?.grade ? teacherClass.grade : '')
    )
      .toUpperCase()
      .replace(/[^A-Z]/g, '');

    return availableClasses.filter((c) => {
      const cId = String(c.id || c.publicId || c.class_id || '');
      // Cannot transfer to current class
      if (currentClassId && cId === currentClassId) return false;

      // Also if teacher, ensure teacherClass is never in target
      if (isTeacher && teacherClass) {
        const tId = String(teacherClass.id || teacherClass.publicId || teacherClass.class_id || '');
        if (tId && cId === tId) return false;
      }

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
  }, [availableClasses, selectedStudent, isTeacher, teacherClass]);

  // Keep target class select valid when selected student or filtered target classes change
  useEffect(() => {
    if (formToClassId) {
      const isTargetValid = filteredTargetClasses.some(
        (c) => String(c.id || c.class_id) === String(formToClassId),
      );
      if (!isTargetValid) {
        setFormToClassId('');
      }
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

    const effectiveDateIso = toIsoDateString(formTransferDate);
    if (!effectiveDateIso || !/^\d{4}-\d{2}-\d{2}$/.test(effectiveDateIso)) {
      toast.error('Ngày hiệu lực không hợp lệ. Vui lòng nhập theo định dạng dd/mm/yyyy');
      return;
    }

    try {
      setIsSubmittingCreate(true);
      const currentClassId = selectedStudent?.currentClass
        ? String(selectedStudent.currentClass.classId || selectedStudent.currentClass.id)
        : undefined;

      const isAutoApproveActive = !isTeacher && formAutoApprove;
      await classesApi.createGlobalTransferRequest({
        studentId: formStudentId,
        fromClassId: currentClassId,
        toClassId: formToClassId,
        transferDate: effectiveDateIso,
        reason: formReason.trim() || 'Chuyển theo nguyện vọng phụ huynh',
        autoApprove: isAutoApproveActive,
      });

      if (isAutoApproveActive) {
        toast.success(
          `BGH đã điều chuyển học sinh ${selectedStudent?.fullName || ''} sang lớp mới thành công!`,
        );
      } else {
        toast.success(
          isTeacher
            ? `Đã gửi yêu cầu chuyển lớp cho học sinh ${selectedStudent?.fullName || ''} thành công (chờ BGH xét duyệt)!`
            : `Đã tạo yêu cầu chuyển lớp cho học sinh ${selectedStudent?.fullName || ''} thành công!`,
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
            className="relative w-full max-w-[540px] h-full bg-card border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-250 ease-out z-10 text-foreground select-none"
            data-name="Create Transfer Drawer"
          >
            {/* Drawer Header */}
            <div className="flex items-start justify-between px-7 pt-6 pb-5 border-b border-border shrink-0 bg-card">
              <div className="flex flex-col gap-1.5">
                <h2 className="text-[19px] font-semibold text-foreground tracking-tight">
                  Tạo yêu cầu chuyển lớp
                </h2>
                <p className="text-[12.5px] text-muted-foreground font-normal leading-relaxed">
                  {isTeacher
                    ? 'Khởi tạo đề xuất chuyển học sinh sang lớp mới để Ban Giám Hiệu xét duyệt'
                    : 'Điều phối và chuyển học sinh giữa các lớp học trong năm học hiện tại'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateDrawerOpen(false)}
                className="size-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-none transition-colors cursor-pointer"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={17} />
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
                <div className="flex-1 overflow-y-auto px-7 py-7 space-y-6">
                  {/* Field 1: Chọn học sinh chuyển lớp */}
                  <div className="space-y-2">
                    <Label htmlFor="studentSelect" className="text-[12.5px] font-medium text-foreground">
                      Học sinh chuyển lớp <span className="text-destructive">*</span>
                    </Label>

                    {/* BGH Only: Filter by Class */}
                    {!isTeacher && (
                      <div className="space-y-1 mb-2">
                        <select
                          value={drawerClassFilter}
                          onChange={(e) => {
                            setDrawerClassFilter(e.target.value);
                            setFormStudentId('');
                            setFormToClassId('');
                          }}
                          className="w-full h-9 px-3 bg-background border border-border rounded-none text-[12.5px] text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer mb-2"
                        >
                          <option value="ALL">Tất cả các lớp ({availableStudents.length} học sinh)</option>
                          {availableClasses.map((c) => (
                            <option key={c.id || c.class_id} value={c.id || c.class_id}>
                              {c.name} {c.room ? `(${c.room})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Standard Select - Familiar, instant, reliable */}
                    <select
                      id="studentSelect"
                      value={formStudentId}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormStudentId(val);
                        setFormToClassId('');
                      }}
                      className="w-full h-10 px-3.5 bg-background border border-border rounded-none text-[13.5px] text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer"
                      required
                    >
                      <option value="">
                        {isTeacher
                          ? `-- Chọn học sinh lớp ${teacherClass?.name || ''} (${availableStudents.length} học sinh) --`
                          : `-- Chọn học sinh cần chuyển (${filteredAvailableStudents.length} học sinh) --`}
                      </option>
                      {filteredAvailableStudents.map((s) => {
                        const sId = String(s.id || s.student_id);
                        const hasPending =
                          pendingStudentIds.has(sId) ||
                          pendingStudentIds.has(String(s.studentCode || '')) ||
                          pendingStudentIds.has(String(s.student_code || ''));
                        return (
                          <option key={sId} value={sId} disabled={hasPending}>
                            {s.studentCode || s.student_code} · {s.fullName || s.full_name} {s.currentClass?.className ? `(${s.currentClass.className})` : ''} {hasPending ? '— [Đang chờ duyệt]' : ''}
                          </option>
                        );
                      })}
                    </select>

                    {/* Selected Student Confirmation Preview with Avatar */}
                    {selectedStudent && (
                      <div className="mt-2.5 p-3 border border-border bg-muted/20 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="size-9 rounded-none overflow-hidden border border-border bg-muted shrink-0">
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
                            <div className="flex items-center gap-1.5">
                              <span className="text-[13.5px] font-semibold text-foreground truncate">
                                {selectedStudent.fullName}
                              </span>
                              <span className="font-mono text-[11.5px] text-muted-foreground">
                                ({selectedStudent.studentCode})
                              </span>
                            </div>
                            <span className="text-[12px] text-muted-foreground truncate font-normal">
                              Lớp hiện tại: {selectedStudent.currentClass?.className || teacherClass?.name || 'Chưa phân lớp'}
                              {selectedStudent.gender && ` · Giới tính: ${selectedStudent.gender === 'FEMALE' ? 'Nữ' : 'Nam'}`}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setFormStudentId('');
                            setFormToClassId('');
                          }}
                          className="text-[12px] text-muted-foreground hover:text-destructive cursor-pointer px-2 py-1 shrink-0 font-normal hover:underline"
                          title="Bỏ chọn học sinh"
                        >
                          Bỏ chọn
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Field 2: Lớp chuyển đến */}
                  <div className="space-y-2">
                    <Label htmlFor="toClass" className="text-[12.5px] font-medium text-foreground">
                      Lớp chuyển đến <span className="text-destructive">*</span>
                    </Label>
                    <select
                      id="toClass"
                      value={formToClassId}
                      onChange={(e) => setFormToClassId(e.target.value)}
                      className="w-full h-10 px-3.5 bg-background border border-border rounded-none text-[13.5px] text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer"
                      required
                    >
                      <option value="">-- Chọn lớp học tiếp nhận --</option>
                      {filteredTargetClasses.map((c) => (
                        <option key={c.id || c.class_id} value={c.id || c.class_id}>
                          {c.name} {c.room ? `(${c.room})` : ''} · {c.studentCount || 0}/{c.capacity || 25} học sinh
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Field 3: Ngày hiệu lực chuyển lớp (dd/mm/yyyy) */}
                  <div className="space-y-2">
                    <Label htmlFor="transferDate" className="text-[12.5px] font-medium text-foreground">
                      Ngày hiệu lực chuyển lớp <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="transferDate"
                        type="text"
                        placeholder="dd/mm/yyyy"
                        value={formTransferDate}
                        onChange={(e) => setFormTransferDate(e.target.value)}
                        className="h-10 px-3.5 pr-10 text-[13.5px] bg-background border-border rounded-none font-mono"
                        required
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center">
                        <HugeiconsIcon
                          icon={Calendar03Icon}
                          size={18}
                          className="text-muted-foreground pointer-events-none"
                        />
                        <input
                          type="date"
                          tabIndex={-1}
                          value={toIsoDateString(formTransferDate)}
                          onChange={(e) => {
                            if (e.target.value) {
                              setFormTransferDate(toDmyString(e.target.value));
                            }
                          }}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          title="Chọn ngày từ lịch"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Field 4: Lý do chuyển lớp */}
                  <div className="space-y-2">
                    <Label htmlFor="transferReason" className="text-[12.5px] font-medium text-foreground">
                      Lý do chuyển lớp <span className="text-destructive">*</span>
                    </Label>
                    <textarea
                      id="transferReason"
                      value={formReason}
                      onChange={(e) => setFormReason(e.target.value)}
                      placeholder="Nhập lý do chuyển lớp (VD: Nguyện vọng phụ huynh, sắp xếp sĩ số phòng học, chuyển theo độ tuổi...)"
                      rows={4}
                      className="w-full min-h-[110px] p-3 text-[13.5px] bg-background border border-border rounded-none outline-none focus:border-primary resize-none text-foreground placeholder:text-muted-foreground/60 leading-relaxed"
                      required
                    />
                  </div>

                  {/* BGH Privilege Checkbox (ONLY for BGH) */}
                  {!isTeacher && (
                    <div className="p-3.5 border border-border bg-muted/20 flex items-start gap-3 mt-1">
                      <input
                        type="checkbox"
                        id="autoApproveToggle"
                        checked={formAutoApprove}
                        onChange={(e) => setFormAutoApprove(e.target.checked)}
                        className="size-4 mt-0.5 rounded-none accent-[#1447e6] cursor-pointer"
                      />
                      <label htmlFor="autoApproveToggle" className="cursor-pointer select-none text-[12.5px]">
                        <span className="font-semibold text-foreground block">
                          Phê duyệt & Điều chuyển ngay vào lớp mới
                        </span>
                        <span className="text-muted-foreground text-[12px] block mt-1 leading-relaxed">
                          {formAutoApprove
                            ? 'Học sinh sẽ được chuyển lớp ngay lập tức và lưu ở trạng thái Đã duyệt.'
                            : 'Yêu cầu sẽ được tạo ở trạng thái Chờ duyệt.'}
                        </span>
                      </label>
                    </div>
                  )}
                </div>

                {/* Sticky Drawer Footer */}
                <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border bg-card shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isSubmittingCreate}
                    onClick={() => setIsCreateDrawerOpen(false)}
                    className="h-8 px-4 text-[13px] rounded-none border-border cursor-pointer shadow-none"
                  >
                    Hủy
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmittingCreate || !formStudentId || !formToClassId}
                    className="h-8 px-4 text-[13px] rounded-none bg-[#1447e6] hover:bg-[#1447e6]/90 text-white cursor-pointer font-medium shadow-none disabled:opacity-40"
                  >
                    {isSubmittingCreate
                      ? 'Đang gửi...'
                      : isTeacher
                        ? 'Gửi yêu cầu chuyển lớp'
                        : formAutoApprove
                          ? 'Phê duyệt & Điều chuyển ngay'
                          : 'Tạo yêu cầu (Chờ duyệt)'}
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
