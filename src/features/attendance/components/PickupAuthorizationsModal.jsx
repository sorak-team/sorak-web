import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Search01Icon,
  Cancel01Icon,
  Tick02Icon,
  FilterHorizontalIcon,
  MoreHorizontalIcon,
  CheckmarkSquare02Icon,
  PlusSignIcon,
  Upload01Icon,
  ArrowDown01Icon,
  Calendar03Icon,
} from '@hugeicons/core-free-icons';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { cn } from '@/shared/lib/utils';
import { uploadApi } from '@/shared/api/upload.api';
import { getStudentAvatarUrl } from '@/features/students/students.store';
import { useAcademicYearStore, getDayAfterDisplayDate } from '@/features/academic-years';
import { attendanceApi } from '../attendance.api';

// Helper to convert any date (YYYY-MM-DD or ISO) to DD/MM/YYYY
function toDmyString(dateStr) {
  if (!dateStr) return '';
  const clean = String(dateStr).trim();
  if (clean.includes('/')) return clean; // already DD/MM/YYYY
  const iso = clean.split('T')[0];
  const parts = iso.split('-');
  if (parts.length === 3) {
    const [y, m, d] = parts;
    return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
  }
  return clean;
}

// Helper to convert DD/MM/YYYY to YYYY-MM-DD for backend or native date picker
function toIsoDateString(dmy) {
  if (!dmy) return '';
  const clean = String(dmy).trim();
  if (clean.includes('-')) {
    return clean.split('T')[0]; // already ISO
  }
  const parts = clean.split('/');
  if (parts.length === 3) {
    const [d, m, y] = parts;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return clean;
}

// Helper for authorized delegate avatar (uses uploaded photo if present, otherwise Dicebear initials based on name)
function getDelegateAvatarUrl(photoUrl, name) {
  if (
    photoUrl &&
    typeof photoUrl === 'string' &&
    photoUrl.trim() !== '' &&
    !photoUrl.includes('default-avatar.webp')
  ) {
    return photoUrl;
  }
  const seed = (name || 'PH').trim();
  return `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(seed)}`;
}

const STATUS_PRIORITY = {
  PENDING: 1,
  APPROVED: 2,
  REJECTED: 3,
};

export function PickupAuthorizationsModal({
  isOpen,
  onClose,
  classId,
  targetDate,
  students = [],
  onAuthorizationChanged,
}) {
  const { t, i18n } = useTranslation();
  const isVi = i18n.language === 'vi';

  const [authorizations, setAuthorizations] = useState([]);
  const [stats, setStats] = useState({
    pendingCount: 0,
    approvedCount: 0,
    rejectedCount: 0,
    totalCount: 0,
  });
  const [loading, setLoading] = useState(false);
  // Mặc định filter là "Tất cả"
  const [activeTab, setActiveTab] = useState('ALL'); // ALL | PENDING | APPROVED | REJECTED
  const [searchQuery, setSearchQuery] = useState('');
  const [processingId, setProcessingId] = useState(null);

  // Rejection modal state
  const [authToReject, setAuthToReject] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  // Large image preview state
  const [previewPhoto, setPreviewPhoto] = useState(null); // { url, title }

  // Create Authorization Modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = useRef(null);

  // Searchable student dropdown combobox state
  const [isStudentDropdownOpen, setIsStudentDropdownOpen] = useState(false);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const studentSelectRef = useRef(null);

  // Lấy dữ liệu năm học thực tế từ useAcademicYearStore
  const academicYears = useAcademicYearStore((state) => state.academicYears);
  const selectedYearId = useAcademicYearStore((state) => state.selectedYearId);

  useEffect(() => {
    if (!academicYears || academicYears.length === 0) {
      useAcademicYearStore.getState().fetchAcademicYears();
    }
  }, [academicYears]);

  const currentAcademicYear = useMemo(() => {
    return (
      academicYears.find((y) => String(y.id) === String(selectedYearId)) ||
      academicYears.find((y) => y.active) ||
      academicYears[0]
    );
  }, [academicYears, selectedYearId]);

  // Bộ preset ngày thật của năm học: Học kỳ 1, Học kỳ 2, Cả năm (định dạng DD/MM/YYYY)
  const datePresets = useMemo(() => {
    const sem1EndDmy = toDmyString(currentAcademicYear?.semester1EndDate) || '15/01/2027';
    const sem2StartDmy = getDayAfterDisplayDate(sem1EndDmy) || '16/01/2027';

    const hk1Start = toDmyString(currentAcademicYear?.startDate) || '07/09/2026';
    const hk1End = sem1EndDmy;

    const hk2Start = sem2StartDmy;
    const hk2End = toDmyString(currentAcademicYear?.endDate) || '28/05/2027';

    const fullYearStart = hk1Start;
    const fullYearEnd = hk2End;

    return {
      hk1: {
        id: 'HK1',
        label: isVi ? 'Học kỳ 1' : 'Semester 1',
        start: hk1Start,
        end: hk1End,
        displayRange: `${hk1Start} – ${hk1End}`,
      },
      hk2: {
        id: 'HK2',
        label: isVi ? 'Học kỳ 2' : 'Semester 2',
        start: hk2Start,
        end: hk2End,
        displayRange: `${hk2Start} – ${hk2End}`,
      },
      fullYear: {
        id: 'FULL_YEAR',
        label: isVi ? 'Cả năm' : 'Full Year',
        start: fullYearStart,
        end: fullYearEnd,
        displayRange: `${fullYearStart} – ${fullYearEnd}`,
      },
    };
  }, [currentAcademicYear, isVi]);

  const [createForm, setCreateForm] = useState({
    studentId: '',
    pickupPersonName: '',
    relationship: 'Dì',
    pickupPersonPhone: '',
    pickupCitizenId: '',
    startDate: toDmyString(targetDate || new Date().toISOString().slice(0, 10)),
    endDate: toDmyString(targetDate || new Date().toISOString().slice(0, 10)),
    note: '',
    photoUrl: '',
  });

  // Tự động nhận diện preset ngày đang được chọn (nếu khớp)
  const activeDatePreset = useMemo(() => {
    if (createForm.startDate === datePresets.hk1.start && createForm.endDate === datePresets.hk1.end) {
      return 'HK1';
    }
    if (createForm.startDate === datePresets.hk2.start && createForm.endDate === datePresets.hk2.end) {
      return 'HK2';
    }
    if (createForm.startDate === datePresets.fullYear.start && createForm.endDate === datePresets.fullYear.end) {
      return 'FULL_YEAR';
    }
    return null;
  }, [createForm.startDate, createForm.endDate, datePresets]);

  // Đóng combobox học sinh khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (studentSelectRef.current && !studentSelectRef.current.contains(e.target)) {
        setIsStudentDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Đóng combobox học sinh hoặc ảnh phóng to khi nhấn Esc
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (previewPhoto) {
          setPreviewPhoto(null);
          return;
        }
        if (isStudentDropdownOpen) {
          setIsStudentDropdownOpen(false);
          return;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isStudentDropdownOpen, previewPhoto]);

  // Lọc học sinh theo tên, mã HS và loại bỏ học sinh đã chuyển lớp
  const activeStudents = useMemo(() => {
    return (students || []).filter(
      (s) =>
        !s.isTransferred &&
        !s.leftAt &&
        s.status !== 'TRANSFERRED' &&
        s.status !== 'TRANSFERRED_CLASS' &&
        s.status !== 'TRANSFERRED_SCHOOL' &&
        s.status !== 'DROPPED_OUT' &&
        (!s.enrollmentStatus || s.enrollmentStatus === 'ENROLLED')
    );
  }, [students]);

  const filteredStudentsList = useMemo(() => {
    if (!studentSearchQuery.trim()) return activeStudents;
    const q = studentSearchQuery.toLowerCase().trim();
    return activeStudents.filter(
      (s) =>
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.code && s.code.toLowerCase().includes(q))
    );
  }, [activeStudents, studentSearchQuery]);

  const selectedStudent = useMemo(() => {
    return activeStudents.find((s) => String(s.id) === String(createForm.studentId)) || null;
  }, [activeStudents, createForm.studentId]);

  const handleOpenCreate = () => {
    const initialDateDmy = toDmyString(targetDate || new Date().toISOString().slice(0, 10));
    setCreateForm({
      studentId: activeStudents[0]?.id ? String(activeStudents[0].id) : '',
      pickupPersonName: '',
      relationship: 'Dì',
      pickupPersonPhone: '',
      pickupCitizenId: '',
      startDate: initialDateDmy,
      endDate: initialDateDmy,
      note: '',
      photoUrl: '',
    });
    setStudentSearchQuery('');
    setIsStudentDropdownOpen(false);
    setIsCreateOpen(true);
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      toast.error(
        isVi
          ? 'Định dạng tệp không được hỗ trợ. Vui lòng chọn ảnh JPG, PNG hoặc WebP.'
          : 'Please select a JPG, PNG or WebP image.'
      );
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error(isVi ? 'Kích thước ảnh tối đa là 2MB' : 'Max image size is 2MB');
      return;
    }

    setIsUploadingPhoto(true);
    try {
      const res = await uploadApi.uploadPickupPhoto(file);
      const photoUrl = res?.url || res?.relativeUrl;
      if (photoUrl) {
        setCreateForm((prev) => ({ ...prev, photoUrl }));
        toast.success(isVi ? 'Đã tải ảnh người ủy quyền lên thành công!' : 'Photo uploaded successfully!');
      }
    } catch (err) {
      console.error('Failed to upload delegate photo:', err);
      toast.error(isVi ? 'Tải ảnh thất bại' : 'Failed to upload photo');
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmitCreate = async (e) => {
    e.preventDefault();
    if (!createForm.studentId) {
      toast.warning(isVi ? 'Vui lòng chọn học sinh' : 'Please select a student');
      return;
    }
    if (!createForm.pickupPersonName.trim()) {
      toast.warning(isVi ? 'Vui lòng nhập họ và tên người được ủy quyền' : 'Please enter delegate name');
      return;
    }
    if (!createForm.pickupPersonPhone.trim()) {
      toast.warning(isVi ? 'Vui lòng nhập số điện thoại người được ủy quyền' : 'Please enter delegate phone');
      return;
    }
    const startIso = toIsoDateString(createForm.startDate);
    const endIso = toIsoDateString(createForm.endDate);

    if (!createForm.startDate || !createForm.endDate || !startIso || !endIso) {
      toast.warning(isVi ? 'Vui lòng nhập ngày theo định dạng DD/MM/YYYY' : 'Please enter date in DD/MM/YYYY');
      return;
    }
    if (startIso > endIso) {
      toast.warning(isVi ? 'Ngày bắt đầu không được lớn hơn ngày kết thúc' : 'Start date cannot be after end date');
      return;
    }

    setIsSubmittingCreate(true);
    try {
      await attendanceApi.createPickupAuthorization(classId, {
        studentId: createForm.studentId,
        pickupPersonName: createForm.pickupPersonName.trim(),
        pickupPersonPhone: createForm.pickupPersonPhone.trim(),
        pickupCitizenId: createForm.pickupCitizenId.trim() || null,
        relationship: createForm.relationship.trim(),
        startDate: startIso,
        endDate: endIso,
        note: createForm.note.trim() || null,
        photoUrl: createForm.photoUrl || null,
        status: 'APPROVED',
      });
      toast.success(
        isVi
          ? 'Đã tạo yêu cầu ủy quyền đưa đón thành công!'
          : 'Pickup authorization created successfully!'
      );
      // Xóa cài đặt người đón cũ trong localStorage để người được ủy quyền mới lập tức có hiệu lực
      try {
        const key = `sorak_pickup_defaults_${classId}`;
        const raw = localStorage.getItem(key);
        if (raw) {
          const existing = JSON.parse(raw);
          delete existing[createForm.studentId];
          localStorage.setItem(key, JSON.stringify(existing));
        }
      } catch (e) {
        console.warn('Failed to clear old default:', e);
      }

      setIsCreateOpen(false);
      if (onAuthorizationChanged) {
        onAuthorizationChanged();
      }
      fetchAuthorizations();
    } catch (err) {
      console.error('Failed to create pickup authorization:', err);
      toast.error(
        err?.response?.data?.message ||
        (isVi ? 'Tạo ủy quyền thất bại. Vui lòng thử lại.' : 'Failed to create authorization.')
      );
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  // Fetch authorizations from API
  const fetchAuthorizations = useCallback(async () => {
    if (!classId) return;
    try {
      setLoading(true);
      const res = await attendanceApi.getPickupAuthorizations(classId, {
        status: activeTab === 'ALL' ? undefined : activeTab,
        date: targetDate,
      });
      setAuthorizations(res?.authorizations || []);
      if (res?.stats) {
        setStats(res.stats);
      }
    } catch (err) {
      console.error('Failed to load pickup authorizations:', err);
      toast.error(isVi ? 'Không thể tải danh sách ủy quyền đưa đón.' : 'Failed to load authorizations.');
    } finally {
      setLoading(false);
    }
  }, [classId, activeTab, targetDate, isVi]);

  useEffect(() => {
    if (isOpen) {
      fetchAuthorizations();
    }
  }, [isOpen, fetchAuthorizations]);

  // Handle Approve Authorization
  const handleApprove = async (auth) => {
    const confirmMessage = isVi
      ? `Bạn có chắc chắn muốn duyệt cho ${auth.relationship} (${auth.pickupPersonName}) đón bé ${auth.student.name}?`
      : `Approve ${auth.pickupPersonName} to pick up ${auth.student.name}?`;
    if (!window.confirm(confirmMessage)) return;

    setProcessingId(auth.id);
    try {
      await attendanceApi.approvePickupAuthorization(classId, auth.id);
      toast.success(
        isVi
          ? `Đã duyệt ủy quyền đón cho bé ${auth.student.name}!`
          : `Approved authorization for ${auth.student.name}!`
      );
      if (onAuthorizationChanged) {
        onAuthorizationChanged();
      }
      fetchAuthorizations();
    } catch (err) {
      console.error('Failed to approve authorization:', err);
      toast.error(
        err?.response?.data?.message ||
        (isVi ? 'Duyệt ủy quyền thất bại. Vui lòng thử lại.' : 'Failed to approve authorization.')
      );
    } finally {
      setProcessingId(null);
    }
  };

  // Open Reject Dialog
  const handleOpenRejectDialog = (auth) => {
    setAuthToReject(auth);
    setRejectReason(isVi ? 'Không liên lạc được phụ huynh để xác thực thông tin' : 'Cannot verify with parent');
  };

  // Confirm Reject Authorization
  const handleConfirmReject = async () => {
    if (!authToReject) return;
    const authId = authToReject.id;
    const studentName = authToReject.student.name;
    const reason = rejectReason.trim();

    setProcessingId(authId);
    try {
      await attendanceApi.rejectPickupAuthorization(classId, authId, { reason });
      toast.success(
        isVi
          ? `Đã từ chối yêu cầu ủy quyền đón cho bé ${studentName}`
          : `Rejected authorization for ${studentName}`
      );
      setAuthToReject(null);
      setRejectReason('');
      if (onAuthorizationChanged) {
        onAuthorizationChanged();
      }
      fetchAuthorizations();
    } catch (err) {
      console.error('Failed to reject authorization:', err);
      toast.error(
        err?.response?.data?.message ||
        (isVi ? 'Từ chối ủy quyền thất bại.' : 'Failed to reject authorization.')
      );
    } finally {
      setProcessingId(null);
    }
  };

  // Filter & Sắp xếp authorizations theo: Chờ duyệt -> Đã duyệt -> Từ chối
  const filteredAuthorizations = useMemo(() => {
    let list = [...authorizations];
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (a) =>
          a.student.name.toLowerCase().includes(q) ||
          (a.student.code && a.student.code.toLowerCase().includes(q)) ||
          a.pickupPersonName.toLowerCase().includes(q) ||
          (a.pickupPersonPhone && a.pickupPersonPhone.includes(q)) ||
          (a.relationship && a.relationship.toLowerCase().includes(q)) ||
          (a.note && a.note.toLowerCase().includes(q))
      );
    }

    // Sắp xếp: Chờ duyệt (1) -> Đã duyệt (2) -> Từ chối (3)
    list.sort((a, b) => {
      const orderA = STATUS_PRIORITY[a.status] || 99;
      const orderB = STATUS_PRIORITY[b.status] || 99;
      if (orderA !== orderB) return orderA - orderB;
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });

    return list;
  }, [authorizations, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs animate-in fade-in-0 duration-200"
        onClick={onClose}
      />

      {/* Main Table Modal Dialog */}
      <div
        className="relative w-full max-w-[1140px] max-h-[88vh] bg-card border border-border shadow-2xl rounded-none z-10 animate-in zoom-in-95 duration-150 overflow-hidden flex flex-col select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-card shrink-0">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-[16.5px] font-semibold text-foreground tracking-tight">
              {isVi ? 'Yêu cầu ủy quyền đưa đón' : 'Pickup Authorizations'}
            </h2>
            <p className="text-[12.5px] text-muted-foreground">
              {isVi
                ? 'Danh sách yêu cầu ủy quyền người đưa đón trẻ từ phụ huynh cần xét duyệt'
                : 'Review authorization requests submitted by parents'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="size-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors rounded-none cursor-pointer"
            title={t('common.close', 'Đóng (Esc)')}
          >
            <HugeiconsIcon icon={Cancel01Icon} size={16} />
          </button>
        </div>

        {/* Sub-toolbar: Current Status & Search & Status Filter Dropdown */}
        <div className="px-6 py-3 border-b border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
            <span>{isVi ? 'Trạng thái lọc:' : 'Filter status:'}</span>
            <span className="font-semibold text-foreground">
              {activeTab === 'ALL' && (isVi ? 'Tất cả' : 'All')}
              {activeTab === 'PENDING' && (isVi ? 'Chờ duyệt' : 'Pending')}
              {activeTab === 'APPROVED' && (isVi ? 'Đã duyệt' : 'Approved')}
              {activeTab === 'REJECTED' && (isVi ? 'Từ chối' : 'Rejected')}
            </span>
            {searchQuery && (
              <>
                <span className="text-muted-foreground/40">·</span>
                <span>{isVi ? `Tìm thấy ${filteredAuthorizations.length} kết quả` : `Found ${filteredAuthorizations.length}`}</span>
              </>
            )}
          </div>

          {/* Search bar & Filter dropdown */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-[260px] h-8 shrink-0">
              <HugeiconsIcon
                icon={Search01Icon}
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              />
              <Input
                type="text"
                placeholder={isVi ? 'Tìm kiếm học sinh, người đón...' : 'Search student, delegate...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 pr-2.5 text-[12.5px] bg-background border-border rounded-none shadow-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            {/* Filter Dropdown - Sắp xếp theo: Tất cả -> Chờ duyệt -> Đã duyệt -> Từ chối */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    'size-8 bg-background border border-border text-foreground hover:bg-muted/50 rounded-none flex items-center justify-center transition-colors cursor-pointer select-none shrink-0',
                    activeTab !== 'ALL' && 'border-[#1447e6] text-[#1447e6] bg-blue-50/40'
                  )}
                  title={isVi ? 'Lọc trạng thái' : 'Filter by status'}
                >
                  <HugeiconsIcon icon={FilterHorizontalIcon} size={15} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-40 p-1 rounded-none border border-border bg-card shadow-xl z-50 text-foreground"
              >
                <DropdownMenuLabel className="px-2 py-1 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  {isVi ? 'Trạng thái' : 'Status'}
                </DropdownMenuLabel>
                {[
                  { key: 'ALL', label: isVi ? 'Tất cả' : 'All' },
                  { key: 'PENDING', label: isVi ? 'Chờ duyệt' : 'Pending' },
                  { key: 'APPROVED', label: isVi ? 'Đã duyệt' : 'Approved' },
                  { key: 'REJECTED', label: isVi ? 'Từ chối' : 'Rejected' },
                ].map((item) => (
                  <DropdownMenuItem
                    key={item.key}
                    onClick={() => setActiveTab(item.key)}
                    className="flex items-center justify-between h-8 px-2 text-[12.5px] cursor-pointer rounded-none hover:bg-muted/60"
                  >
                    <span>{item.label}</span>
                    {activeTab === item.key && (
                      <HugeiconsIcon icon={CheckmarkSquare02Icon} size={14} className="text-[#1447e6] shrink-0" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Nút Tạo ủy quyền mới của Giáo viên */}
            <Button
              type="button"
              onClick={handleOpenCreate}
              className="h-8 px-3 text-[12.5px] font-medium bg-[#1447e6] hover:bg-[#123ec4] text-white rounded-none cursor-pointer shrink-0 shadow-none flex items-center gap-1.5 transition-colors"
            >
              <HugeiconsIcon icon={PlusSignIcon} size={14} />
              <span>{isVi ? 'Tạo ủy quyền' : 'New Authorization'}</span>
            </Button>
          </div>
        </div>

        {/* Table Content Area - Margin left, right, bottom với viền bao quanh */}
        <div className="flex-1 overflow-y-auto overflow-x-auto select-none bg-card px-4 pb-4 pt-3">
          <div className="w-full border border-border bg-card rounded-none overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[820px]">
              <thead>
                <tr className="h-10 border-b border-border bg-muted/30 text-[12.5px] font-medium text-foreground sticky top-0 z-10 bg-muted/40">
                  <th className="px-4 min-w-[170px] font-medium">
                    {isVi ? 'Học sinh' : 'Student'}
                  </th>
                  <th className="px-4 min-w-[190px] font-medium">
                    {isVi ? 'Người được ủy quyền' : 'Authorized Delegate'}
                  </th>
                  <th className="px-3 min-w-[120px] font-medium">
                    {isVi ? 'Số điện thoại' : 'Phone'}
                  </th>
                  <th className="px-3 min-w-[145px] font-medium">
                    {isVi ? 'Khoảng thời gian hiệu lực' : 'Validity period'}
                  </th>
                  <th className="px-4 min-w-[210px] font-medium">
                    {isVi ? 'Dặn dò phụ huynh' : 'Parent Note'}
                  </th>
                  <th className="px-3 min-w-[95px] font-medium">
                    {isVi ? 'Trạng thái' : 'Status'}
                  </th>
                  <th className="px-4 min-w-[60px] w-[60px] text-right font-medium whitespace-nowrap">
                    {isVi ? 'Thao tác' : 'Actions'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {loading && authorizations.length === 0 ? (
                  Array.from({ length: 3 }).map((_, idx) => (
                    <tr key={idx} className="h-[68px] animate-pulse">
                      <td className="px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 bg-muted/60 rounded-none shrink-0" />
                          <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                            <div className="h-3.5 w-24 bg-muted/60" />
                            <div className="h-2.5 w-16 bg-muted/40" />
                          </div>
                        </div>
                      </td>
                      <td className="px-4"><div className="h-3.5 w-28 bg-muted/50" /></td>
                      <td className="px-3"><div className="h-3.5 w-24 bg-muted/50" /></td>
                      <td className="px-3"><div className="h-3.5 w-24 bg-muted/50" /></td>
                      <td className="px-4"><div className="h-3.5 w-36 bg-muted/50" /></td>
                      <td className="px-3"><div className="h-5 w-16 bg-muted/50" /></td>
                      <td className="px-4 text-right"><div className="size-6 bg-muted/40 ml-auto" /></td>
                    </tr>
                  ))
                ) : filteredAuthorizations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-14 text-center text-muted-foreground text-[13px]">
                      {searchQuery.trim()
                        ? isVi
                          ? 'Không tìm thấy yêu cầu ủy quyền nào phù hợp.'
                          : 'No matching authorizations found.'
                        : activeTab === 'PENDING'
                        ? isVi
                          ? 'Hiện không có yêu cầu ủy quyền nào đang chờ duyệt.'
                          : 'No pending authorization requests.'
                        : isVi
                        ? 'Không có yêu cầu ủy quyền nào trong mục này.'
                        : 'No authorizations found.'}
                    </td>
                  </tr>
                ) : (
                  filteredAuthorizations.map((auth) => {
                    const isPending = auth.status === 'PENDING';
                    const isApproved = auth.status === 'APPROVED';
                    const isRejected = auth.status === 'REJECTED';
                    const isProcessing = processingId === auth.id;

                    const startDateFormatted = auth.startDate.split('-').reverse().join('/');
                    const endDateFormatted = auth.endDate.split('-').reverse().join('/');

                    // Calculate range duration label to eliminate teacher confusion
                    const getRangeLabel = () => {
                      if (auth.startDate === auth.endDate) {
                        return isVi ? '1 ngày duy nhất' : 'Single day';
                      }
                      if (
                        datePresets?.hk1?.start &&
                        startDateFormatted === datePresets.hk1.start &&
                        endDateFormatted === datePresets.hk1.end
                      ) {
                        return isVi ? 'Suốt Học kỳ 1' : 'Semester 1';
                      }
                      if (
                        datePresets?.hk2?.start &&
                        startDateFormatted === datePresets.hk2.start &&
                        endDateFormatted === datePresets.hk2.end
                      ) {
                        return isVi ? 'Suốt Học kỳ 2' : 'Semester 2';
                      }
                      if (
                        datePresets?.fullYear?.start &&
                        startDateFormatted === datePresets.fullYear.start &&
                        endDateFormatted === datePresets.fullYear.end
                      ) {
                        return isVi ? 'Suốt cả năm học' : 'Full school year';
                      }
                      const [d1, m1, y1] = startDateFormatted.split('/').map(Number);
                      const [d2, m2, y2] = endDateFormatted.split('/').map(Number);
                      const startObj = new Date(y1, m1 - 1, d1);
                      const endObj = new Date(y2, m2 - 1, d2);
                      const diffDays = Math.round((endObj.getTime() - startObj.getTime()) / 86400000) + 1;
                      if (diffDays > 1) {
                        return isVi ? `Suốt ${diffDays} ngày` : `${diffDays} days total`;
                      }
                      return isVi ? 'Trong khoảng này' : 'Inclusive';
                    };
                    const rangeLabel = getRangeLabel();

                    const studentAvatarUrl = getStudentAvatarUrl(
                      auth.student.avatarUrl,
                      auth.student.code || auth.student.name
                    );
                    const delegateAvatarUrl = getDelegateAvatarUrl(
                      auth.photoUrl,
                      auth.pickupPersonName
                    );

                    return (
                      <tr
                        key={auth.id}
                        className={cn(
                          'hover:bg-muted/30 transition-colors group cursor-default text-[12.5px]',
                          isPending && 'bg-blue-50/15 dark:bg-blue-950/10'
                        )}
                      >
                        {/* 1. Học sinh (Đồng nhất Avatar theo Student Store) */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={studentAvatarUrl}
                              alt=""
                              className="w-9 h-9 min-w-[36px] min-h-[36px] max-w-[36px] max-h-[36px] rounded-none border border-border/80 object-cover shrink-0 bg-muted/30"
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = `https://api.dicebear.com/10.x/critters/svg?seed=${encodeURIComponent(auth.student.code || auth.student.name)}&backgroundColor=ff2e63,00c2a8,ffb300,3d5afe,8e24aa,00e676`;
                              }}
                            />
                            <div className="flex flex-col min-w-0">
                              <span className="font-semibold text-foreground text-[13px] leading-tight truncate">
                                {auth.student.name}
                              </span>
                              <span className="text-[11px] font-mono text-muted-foreground mt-0.5">
                                {auth.student.code}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* 2. Người được ủy quyền (Tên ở trên, Quan hệ ở dưới) */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            {/* Photo preview with zoom (Đồng nhất với xem chi tiết) */}
                            <div
                              className="w-9 h-9 min-w-[36px] min-h-[36px] max-w-[36px] max-h-[36px] rounded-none bg-muted border border-border flex items-center justify-center shrink-0 overflow-hidden cursor-zoom-in hover:opacity-85 transition-opacity"
                              onClick={() => {
                                setPreviewPhoto({
                                  url: delegateAvatarUrl,
                                  title: `${isVi ? 'Người được ủy quyền' : 'Authorized Person'}: ${auth.pickupPersonName}`,
                                });
                              }}
                              title={isVi ? 'Bấm để phóng to ảnh' : 'Click to zoom photo'}
                            >
                              <img
                                src={delegateAvatarUrl}
                                alt={auth.pickupPersonName}
                                className="w-full h-full object-cover shrink-0"
                                onError={(e) => {
                                  e.currentTarget.onerror = null;
                                  e.currentTarget.src = `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(auth.pickupPersonName || 'User')}`;
                                }}
                              />
                            </div>

                            <div className="flex flex-col min-w-0 leading-tight">
                              <span className="font-semibold text-foreground text-[13px] truncate">
                                {auth.pickupPersonName}
                              </span>
                              <span className="text-[11.5px] text-muted-foreground mt-0.5 truncate">
                                {auth.relationship || 'Người đón'}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* 3. Cột Số điện thoại người được ủy quyền */}
                        <td className="px-3 py-3 font-mono text-[12.5px] whitespace-nowrap">
                          {auth.pickupPersonPhone ? (
                            <a
                              href={`tel:${auth.pickupPersonPhone}`}
                              className="text-foreground/90 hover:underline hover:text-[#1447e6] font-medium"
                            >
                              {auth.pickupPersonPhone}
                            </a>
                          ) : (
                            <span className="text-muted-foreground/60">—</span>
                          )}
                        </td>

                        {/* 4. Khoảng thời gian hiệu lực: rõ ràng Từ/Đến và huy hiệu số ngày suốt khoảng */}
                        <td className="px-3 py-3 text-[12.5px] whitespace-nowrap">
                          {auth.startDate === auth.endDate ? (
                            <div className="flex flex-col leading-tight select-none">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] text-muted-foreground font-normal min-w-[26px]">
                                  {isVi ? 'Ngày:' : 'Date:'}
                                </span>
                                <span className="font-medium text-foreground text-[12.5px]">
                                  {startDateFormatted}
                                </span>
                              </div>
                              <span className="text-[10.5px] text-muted-foreground mt-0.5">
                                {isVi ? '(1 ngày duy nhất)' : '(Single day only)'}
                              </span>
                            </div>
                          ) : (
                            <div className="flex flex-col text-[12px] leading-tight select-none gap-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] text-muted-foreground font-normal min-w-[26px]">
                                  {isVi ? 'Từ:' : 'From:'}
                                </span>
                                <span className="font-medium text-foreground text-[12.5px]">
                                  {startDateFormatted}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] text-muted-foreground font-normal min-w-[26px]">
                                  {isVi ? 'Đến:' : 'To:'}
                                </span>
                                <span className="font-medium text-foreground text-[12.5px]">
                                  {endDateFormatted}
                                </span>
                              </div>
                              <div className="mt-0.5">
                                <span className="inline-flex items-center px-1.5 py-0.5 text-[10.5px] font-medium bg-muted text-foreground/80 border border-border/70 rounded-none">
                                  {rangeLabel}
                                </span>
                              </div>
                            </div>
                          )}
                        </td>

                        {/* 5. Dặn dò phụ huynh (Không hiển thị người gửi) */}
                        <td className="px-4 py-3">
                          <span
                            className="text-[12.5px] text-foreground italic line-clamp-2"
                            title={auth.note || undefined}
                          >
                            {auth.note ? `"${auth.note}"` : '—'}
                          </span>
                        </td>

                        {/* 6. Trạng thái (Chuẩn ClassTransferRequests) */}
                        <td className="px-3 py-3 whitespace-nowrap">
                          {isPending && (
                            <span className="inline-flex items-center justify-center px-2 py-0.5 text-[11px] font-medium bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 rounded-none">
                              {isVi ? 'Chờ duyệt' : 'Pending'}
                            </span>
                          )}
                          {isApproved && (
                            <span className="inline-flex items-center justify-center px-2 py-0.5 text-[11px] font-medium bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40 rounded-none">
                              {isVi ? 'Đã duyệt' : 'Approved'}
                            </span>
                          )}
                          {isRejected && (
                            <span
                              className="inline-flex items-center justify-center px-2 py-0.5 text-[11px] font-medium bg-muted text-muted-foreground rounded-none"
                              title={auth.rejectedReason ? `${isVi ? 'Lý do: ' : 'Reason: '}${auth.rejectedReason}` : undefined}
                            >
                              {isVi ? 'Đã từ chối' : 'Rejected'}
                            </span>
                          )}
                        </td>

                        {/* 7. Thao tác dạng menu 3 chấm (Khi không còn thao tác thì để trống, không hiện --) */}
                        <td className="px-4 py-3 min-w-[60px] w-[60px] text-right whitespace-nowrap">
                          {isPending && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  disabled={isProcessing}
                                  className="size-7 inline-flex items-center justify-center rounded-none text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors cursor-pointer select-none"
                                  title={isVi ? 'Thao tác xét duyệt' : 'Actions'}
                                >
                                  <HugeiconsIcon icon={MoreHorizontalIcon} size={16} />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                className="w-38 p-1 rounded-none border border-border bg-card shadow-xl z-50 text-foreground"
                              >
                                <DropdownMenuItem
                                  onClick={() => handleApprove(auth)}
                                  className="flex items-center gap-2 px-2.5 py-1.5 text-[12.5px] cursor-pointer rounded-none hover:bg-muted text-foreground focus:bg-muted focus:text-foreground"
                                >
                                  <HugeiconsIcon icon={Tick02Icon} size={14} className="shrink-0 text-muted-foreground" />
                                  <span>{isVi ? 'Duyệt ủy quyền' : 'Approve'}</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleOpenRejectDialog(auth)}
                                  className="flex items-center gap-2 px-2.5 py-1.5 text-[12.5px] cursor-pointer rounded-none hover:bg-muted text-foreground focus:bg-muted focus:text-foreground"
                                >
                                  <HugeiconsIcon icon={Cancel01Icon} size={14} className="shrink-0 text-muted-foreground" />
                                  <span>{isVi ? 'Từ chối yêu cầu' : 'Reject'}</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border bg-card flex items-center justify-between shrink-0">
          <span className="text-[12px] text-muted-foreground">
            {isVi
              ? 'Người được ủy quyền sau khi duyệt sẽ tự động có mặt trong danh sách đón trẻ của lớp.'
              : 'Approved delegates will automatically appear in the dismissal list.'}
          </span>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="h-8 px-4 text-[13px] rounded-none border-border hover:bg-muted/70 shadow-none cursor-pointer"
          >
            {t('common.close', 'Đóng')}
          </Button>
        </div>
      </div>

      {/* Clean Rejection Dialog matching ClassTransferRequests standard */}
      {authToReject && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-[100] flex items-center justify-center p-4">
          <div className="w-full max-w-[420px] border border-border bg-card p-5 rounded-none shadow-xl flex flex-col gap-4 select-none animate-in zoom-in-95">
            <div className="flex flex-col gap-1">
              <h3 className="text-[16px] font-semibold text-foreground">
                {isVi ? 'Từ chối yêu cầu ủy quyền' : 'Reject Authorization Request'}
              </h3>
              <p className="text-[13px] text-muted-foreground leading-relaxed">
                {isVi
                  ? `Từ chối cho ${authToReject.relationship} (${authToReject.pickupPersonName}) đón bé ${authToReject.student.name}:`
                  : `Reject ${authToReject.pickupPersonName} for ${authToReject.student.name}:`}
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[12.5px] font-medium text-foreground">
                {isVi ? 'Lý do từ chối' : 'Rejection Reason'}
              </label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder={isVi ? 'Nhập lý do từ chối để phụ huynh nắm thông tin...' : 'Enter rejection reason...'}
                className="w-full p-2.5 text-[13px] bg-background border border-border rounded-none shadow-none focus:outline-none focus:border-primary placeholder:text-muted-foreground/60 resize-none text-foreground"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                disabled={processingId === authToReject.id}
                onClick={() => {
                  setAuthToReject(null);
                  setRejectReason('');
                }}
                className="h-8 px-4 rounded-none border-border text-[13px] font-normal hover:bg-muted/70 shadow-none cursor-pointer"
              >
                {t('common.cancel', 'Hủy')}
              </Button>
              <Button
                type="button"
                disabled={processingId === authToReject.id}
                onClick={handleConfirmReject}
                className="h-8 px-4 rounded-none bg-rose-600 hover:bg-rose-700 text-white text-[13px] font-medium shadow-none cursor-pointer"
              >
                {isVi ? 'Xác nhận từ chối' : 'Confirm Reject'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Large Image Preview Modal (Đồng nhất kích thước và cấu trúc với xem chi tiết) */}
      {previewPhoto && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in-0 duration-150"
          onClick={() => setPreviewPhoto(null)}
        >
          <div
            className="relative max-w-lg w-full bg-background border border-border shadow-2xl p-3 flex flex-col items-center animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between pb-2 border-b border-border/60 mb-3">
              <span className="text-[13px] font-semibold text-foreground truncate pr-2">
                {previewPhoto.title || (isVi ? 'Người được ủy quyền' : 'Authorized Person')}
              </span>
              <button
                type="button"
                onClick={() => setPreviewPhoto(null)}
                className="size-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
                title="Đóng (Esc)"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={16} />
              </button>
            </div>
            <div className="w-full max-h-[70vh] flex items-center justify-center bg-muted/20 overflow-hidden border border-border/50">
              <img
                src={previewPhoto.url}
                alt={previewPhoto.title || 'Ảnh'}
                className="max-h-[70vh] max-w-full object-contain select-none"
              />
            </div>
          </div>
        </div>
      )}
      {/* Create Pickup Authorization Dialog */}
      {isCreateOpen && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in-0 duration-150"
          onClick={() => !isSubmittingCreate && setIsCreateOpen(false)}
        >
          <div
            className="relative w-full max-w-lg bg-card border border-border rounded-none shadow-2xl z-20 flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 py-3.5 border-b border-border flex items-center justify-between bg-card shrink-0">
              <div className="flex flex-col gap-0.5">
                <h3 className="text-[15px] font-semibold text-foreground tracking-tight">
                  {isVi ? 'Tạo yêu cầu ủy quyền đưa đón' : 'Create Pickup Authorization'}
                </h3>
                <span className="text-[12px] text-muted-foreground">
                  {isVi
                    ? 'Giáo viên chủ động tạo đơn ủy quyền người đón cho học sinh'
                    : 'Teacher manually creates authorization request'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="size-7 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={15} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitCreate} className="p-5 flex flex-col gap-3.5 overflow-y-auto max-h-[75vh]">
              {/* 1. Chọn học sinh dạng Combobox có tìm kiếm nhanh chuẩn Sorak */}
              <div className="flex flex-col gap-1 relative" ref={studentSelectRef}>
                <label className="text-[12px] font-medium text-foreground">
                  {isVi ? 'Học sinh được ủy quyền' : 'Student'} <span className="text-rose-500">*</span>
                </label>

                {/* Hidden input hỗ trợ form submit validation */}
                <input
                  type="text"
                  required
                  value={createForm.studentId}
                  onChange={() => {}}
                  className="sr-only"
                  tabIndex={-1}
                />

                {/* Trigger button mở combobox */}
                <button
                  type="button"
                  onClick={() => setIsStudentDropdownOpen((prev) => !prev)}
                  className={cn(
                    'w-full min-h-[46px] px-3 py-1.5 flex items-center justify-between gap-2.5 bg-background border rounded-none transition-colors cursor-pointer text-left',
                    isStudentDropdownOpen
                      ? 'border-primary ring-1 ring-primary'
                      : 'border-border hover:bg-muted/30'
                  )}
                >
                  {selectedStudent ? (
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 min-w-[32px] min-h-[32px] max-w-[32px] max-h-[32px] rounded-none border border-border/80 overflow-hidden bg-background shrink-0">
                        <img
                          src={`https://api.dicebear.com/10.x/critters/svg?seed=${encodeURIComponent(selectedStudent.code || selectedStudent.name)}&backgroundColor=ff2e63,00c2a8,ffb300,3d5afe,8e24aa,00e676`}
                          alt={selectedStudent.name}
                          className="w-full h-full object-cover shrink-0"
                        />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-foreground text-[13px] truncate">
                          {selectedStudent.name}
                        </span>
                        <span className="text-[11px] text-muted-foreground truncate font-mono">
                          Mã HS: {selectedStudent.code}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-[12.5px] text-muted-foreground">
                      {isVi ? '-- Tìm và chọn học sinh trong lớp --' : '-- Search and select student --'}
                    </span>
                  )}
                  <HugeiconsIcon
                    icon={ArrowDown01Icon}
                    size={16}
                    className={cn(
                      'text-muted-foreground shrink-0 transition-transform duration-150',
                      isStudentDropdownOpen && 'rotate-180 text-foreground'
                    )}
                  />
                </button>

                {/* Dropdown Popover tìm kiếm học sinh (chuẩn ClassCommandMenu) */}
                {isStudentDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border shadow-2xl z-50 rounded-none overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100">
                    {/* Search Bar with Esc shortcut badge */}
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-background">
                      <HugeiconsIcon
                        icon={Search01Icon}
                        size={15}
                        className="text-muted-foreground shrink-0"
                      />
                      <input
                        type="text"
                        value={studentSearchQuery}
                        onChange={(e) => setStudentSearchQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (filteredStudentsList.length > 0) {
                              setCreateForm((prev) => ({ ...prev, studentId: String(filteredStudentsList[0].id) }));
                              setIsStudentDropdownOpen(false);
                              setStudentSearchQuery('');
                            }
                          }
                        }}
                        placeholder={isVi ? 'Tìm học sinh theo tên, mã HS...' : 'Search student by name, code...'}
                        autoFocus
                        className="flex-1 bg-transparent text-[12.5px] text-foreground placeholder:text-muted-foreground outline-none border-0 focus:outline-none focus:border-0 focus:ring-0 shadow-none"
                      />
                      {studentSearchQuery ? (
                        <button
                          type="button"
                          onClick={() => setStudentSearchQuery('')}
                          className="text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          <HugeiconsIcon icon={Cancel01Icon} size={13} />
                        </button>
                      ) : (
                        <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground bg-muted border border-border rounded-none">
                          Esc
                        </kbd>
                      )}
                    </div>

                    {/* Students List */}
                    <div className="max-h-[220px] overflow-y-auto p-1 divide-y divide-border/30">
                      {filteredStudentsList.length === 0 ? (
                        <div className="p-4 text-center text-[12px] text-muted-foreground">
                          {isVi ? 'Không tìm thấy học sinh phù hợp.' : 'No matching student found.'}
                        </div>
                      ) : (
                        filteredStudentsList.map((st) => {
                          const isSelected = String(st.id) === String(createForm.studentId);
                          return (
                            <button
                              key={st.id}
                              type="button"
                              onClick={() => {
                                setCreateForm((prev) => ({ ...prev, studentId: String(st.id) }));
                                setIsStudentDropdownOpen(false);
                                setStudentSearchQuery('');
                              }}
                              className={cn(
                                'w-full flex items-center justify-between gap-2.5 px-3 py-2 text-left rounded-none transition-colors cursor-pointer text-[12.5px]',
                                isSelected
                                  ? 'bg-muted text-foreground font-medium'
                                  : 'hover:bg-muted/60 text-foreground'
                              )}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-8 h-8 min-w-[32px] min-h-[32px] max-w-[32px] max-h-[32px] rounded-none border border-border/80 overflow-hidden bg-background shrink-0">
                                  <img
                                    src={`https://api.dicebear.com/10.x/critters/svg?seed=${encodeURIComponent(st.code || st.name)}&backgroundColor=ff2e63,00c2a8,ffb300,3d5afe,8e24aa,00e676`}
                                    alt={st.name}
                                    className="w-full h-full object-cover shrink-0"
                                  />
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <span className="truncate font-medium">{st.name}</span>
                                  <span className="text-[11px] text-muted-foreground truncate font-mono">
                                    Mã HS: {st.code}
                                  </span>
                                </div>
                              </div>
                              {isSelected && (
                                <HugeiconsIcon
                                  icon={Tick02Icon}
                                  size={16}
                                  className="text-[#1447e6] shrink-0"
                                />
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Họ tên & Mối quan hệ */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[12px] font-medium text-foreground">
                    {isVi ? 'Họ tên người được ủy quyền' : 'Delegate name'} <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    required
                    type="text"
                    placeholder="Ví dụ: Đỗ Ngọc Lan"
                    value={createForm.pickupPersonName}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, pickupPersonName: e.target.value }))}
                    className="h-8 text-[12.5px] rounded-none border-border"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[12px] font-medium text-foreground">
                    {isVi ? 'Mối quan hệ với bé' : 'Relationship'} <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    required
                    type="text"
                    placeholder="Ví dụ: Dì, Bác, Chú, Bà..."
                    value={createForm.relationship}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, relationship: e.target.value }))}
                    className="h-8 text-[12.5px] rounded-none border-border"
                  />
                </div>
              </div>

              {/* 3. SĐT & CCCD */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[12px] font-medium text-foreground">
                    {isVi ? 'Số điện thoại' : 'Phone'} <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    required
                    type="tel"
                    placeholder="0933 112 233"
                    value={createForm.pickupPersonPhone}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, pickupPersonPhone: e.target.value }))}
                    className="h-8 text-[12.5px] rounded-none border-border font-mono"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[12px] font-medium text-foreground">
                    {isVi ? 'Số CCCD' : 'Citizen ID'}
                  </label>
                  <Input
                    type="text"
                    maxLength={12}
                    placeholder="12 chữ số CCCD"
                    value={createForm.pickupCitizenId}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, pickupCitizenId: e.target.value }))}
                    className="h-8 text-[12.5px] rounded-none border-border font-mono"
                  />
                </div>
              </div>

              {/* 4. Thời gian hiệu lực: Nút chọn nhanh (HK1, HK2, Cả năm) & Ngày định dạng DD/MM/YYYY */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[12px] font-medium text-foreground">
                    {isVi ? 'Thời gian hiệu lực' : 'Validity period'} <span className="text-rose-500">*</span>
                  </label>

                  {/* Nút thời gian chọn nhanh: Học kỳ 1, Học kỳ 2, Cả năm (Dữ liệu thật của năm học) */}
                  <div className="flex items-center gap-1.5">
                    {[datePresets.hk1, datePresets.hk2, datePresets.fullYear].map((preset) => {
                      const isActive = activeDatePreset === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => {
                            setCreateForm((prev) => ({
                              ...prev,
                              startDate: preset.start,
                              endDate: preset.end,
                            }));
                          }}
                          className={cn(
                            'h-6 px-2.5 text-[11px] font-medium rounded-none border transition-colors cursor-pointer select-none',
                            isActive
                              ? 'bg-[#1447e6] text-white border-[#1447e6] shadow-2xs font-semibold'
                              : 'bg-muted/30 hover:bg-muted text-muted-foreground hover:text-foreground border-border'
                          )}
                          title={`${preset.label}: ${preset.displayRange}`}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] text-muted-foreground font-medium">
                      {isVi ? 'Từ ngày' : 'From date'}
                    </span>
                    <div className="relative">
                      <Input
                        required
                        type="text"
                        placeholder="DD/MM/YYYY"
                        value={createForm.startDate}
                        onChange={(e) => setCreateForm((prev) => ({ ...prev, startDate: e.target.value }))}
                        className="h-8 text-[12.5px] rounded-none border-border pr-8 font-mono"
                      />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center">
                        <HugeiconsIcon icon={Calendar03Icon} size={15} className="text-muted-foreground pointer-events-none" />
                        <input
                          type="date"
                          tabIndex={-1}
                          value={toIsoDateString(createForm.startDate)}
                          onChange={(e) => {
                            if (e.target.value) {
                              setCreateForm((prev) => ({ ...prev, startDate: toDmyString(e.target.value) }));
                            }
                          }}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          title={isVi ? 'Chọn ngày từ lịch' : 'Pick date from calendar'}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] text-muted-foreground font-medium">
                      {isVi ? 'Đến ngày' : 'To date'}
                    </span>
                    <div className="relative">
                      <Input
                        required
                        type="text"
                        placeholder="DD/MM/YYYY"
                        value={createForm.endDate}
                        onChange={(e) => setCreateForm((prev) => ({ ...prev, endDate: e.target.value }))}
                        className="h-8 text-[12.5px] rounded-none border-border pr-8 font-mono"
                      />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center">
                        <HugeiconsIcon icon={Calendar03Icon} size={15} className="text-muted-foreground pointer-events-none" />
                        <input
                          type="date"
                          tabIndex={-1}
                          value={toIsoDateString(createForm.endDate)}
                          onChange={(e) => {
                            if (e.target.value) {
                              setCreateForm((prev) => ({ ...prev, endDate: toDmyString(e.target.value) }));
                            }
                          }}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          title={isVi ? 'Chọn ngày từ lịch' : 'Pick date from calendar'}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 5. Ghi chú / Dặn dò */}
              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-medium text-foreground">
                  {isVi ? 'Dặn dò / Ghi chú' : 'Notes'}
                </label>
                <textarea
                  rows={2}
                  placeholder={isVi ? 'Ví dụ: Đón bé về nhà bà ngoại, dặn cô cho bé uống thuốc...' : 'Notes...'}
                  value={createForm.note}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, note: e.target.value }))}
                  className="w-full p-2 text-[12.5px] bg-background border border-border text-foreground rounded-none focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              </div>

              {/* 6. Ảnh chân dung người được ủy quyền */}
              <div className="flex flex-col gap-1.5 pt-0.5">
                <label className="text-[12px] font-medium text-foreground flex items-center gap-1.5">
                  <HugeiconsIcon icon={Upload01Icon} size={13} className="text-muted-foreground" />
                  <span>{isVi ? 'Ảnh chân dung người được ủy quyền' : 'Portrait photo'}</span>
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
                {createForm.photoUrl ? (
                  <div className="flex items-center justify-between p-2 border border-border bg-muted/20 rounded-none">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-10 h-10 border border-border overflow-hidden bg-background shrink-0 cursor-zoom-in hover:opacity-85 transition-opacity"
                        onClick={() =>
                          setPreviewPhoto({
                            url: createForm.photoUrl,
                            title: `${isVi ? 'Người được ủy quyền' : 'Authorized Person'}: ${createForm.pickupPersonName || (isVi ? 'Ảnh chân dung' : 'Portrait photo')}`,
                          })
                        }
                        title={isVi ? 'Bấm để phóng to ảnh' : 'Click to zoom photo'}
                      >
                        <img src={createForm.photoUrl} alt="" className="w-full h-full object-cover" />
                      </div>
                      <span className="text-[12px] font-medium text-foreground truncate">
                        {isVi ? 'Đã tải ảnh lên' : 'Photo uploaded'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCreateForm((prev) => ({ ...prev, photoUrl: '' }))}
                      className="h-7 px-2 text-[11px] font-medium border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                    >
                      {isVi ? 'Xóa' : 'Remove'}
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-2 border border-dashed border-border bg-muted/10 rounded-none">
                    <span className="text-[11.5px] text-muted-foreground truncate pr-2">
                      {isVi ? 'Chưa tải ảnh chân dung' : 'No portrait photo'}
                    </span>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingPhoto}
                      className="h-7 px-2.5 text-[11.5px] font-medium border border-border bg-background hover:bg-muted text-foreground flex items-center gap-1 cursor-pointer transition-colors shrink-0"
                    >
                      <HugeiconsIcon icon={Upload01Icon} size={12} />
                      <span>{isUploadingPhoto ? (isVi ? 'Đang tải...' : 'Uploading...') : (isVi ? 'Tải ảnh' : 'Upload')}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                  className="h-8 px-3 text-[12.5px] rounded-none cursor-pointer"
                >
                  {isVi ? 'Hủy' : 'Cancel'}
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmittingCreate || isUploadingPhoto}
                  className="h-8 px-4 text-[12.5px] font-medium bg-[#1447e6] hover:bg-[#123ec4] text-white rounded-none cursor-pointer shadow-none transition-colors"
                >
                  {isSubmittingCreate ? (isVi ? 'Đang tạo...' : 'Creating...') : (isVi ? 'Tạo ủy quyền' : 'Create')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
