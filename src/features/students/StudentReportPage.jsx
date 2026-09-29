import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  PencilEdit02Icon,
  Delete02Icon,
  Upload01Icon,
  ArrowReloadHorizontalIcon,
  ArrowLeft01Icon,
  ArrowLeft02Icon,
  ArrowRight02Icon,
  Search01Icon,
  Calendar03Icon,
  Tick02Icon,
  Cancel01Icon,
} from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { useStudentStore, getStudentAvatarUrl, transformBackendStudent } from './students.store';
import { studentsApi } from './students.api';
import { StudentDrawer } from './components/StudentDrawer';
import { DeleteStudentDialog } from './components/DeleteStudentDialog';
import { uploadApi } from '@/shared/api/upload.api';
import { useAuthStore } from '@/features/auth';
import { useAcademicYearStore } from '@/features/academic-years';
import { classesApi } from '@/features/classes/classes.api';
import { NotFoundPage } from '@/features/error';
import { cn } from '@/shared/lib/utils';

function formatDateDisplay(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function getAgeGroupLabel(ageGroup) {
  switch ((ageGroup || '').toUpperCase()) {
    case 'NHA_TRE':
      return 'Khối Nhà trẻ';
    case 'MAM':
      return 'Khối Mầm';
    case 'CHOI':
      return 'Khối Chồi';
    case 'LA':
      return 'Khối Lá';
    default:
      return ageGroup || '';
  }
}

function calculateAge(dobStr) {
  if (!dobStr) return '';
  const dob = new Date(dobStr);
  if (isNaN(dob.getTime())) return '';
  const refDate = new Date('2026-10-14');
  let years = refDate.getFullYear() - dob.getFullYear();
  let months = refDate.getMonth() - dob.getMonth();
  if (refDate.getDate() < dob.getDate()) {
    months--;
  }
  if (months < 0) {
    years--;
    months += 12;
  }
  if (years <= 0) return `${months} tháng`;
  return `${years} tuổi ${months > 0 ? `${months} tháng` : ''}`;
}

function formatRecordedBy(name) {
  if (!name) return 'Cán bộ Y tế';
  if (/^HS\d+$/i.test(name.trim())) return 'Cán bộ Y tế';
  if (/^admin$/i.test(name.trim())) return 'Cán bộ Y tế';
  return name;
}

export function StudentReportPage() {
  const params = useParams();
  const routeStudentId = params.studentId;
  const routeClassId = params.studentId ? params.id : null;
  const effectiveStudentId = routeStudentId || params.id;

  if (effectiveStudentId && /^\d+$/.test(String(effectiveStudentId).trim())) {
    return <NotFoundPage />;
  }

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation();

  const user = useAuthStore((state) => state.user);
  const isTeacher =
    user?.role === 'TEACHER_GV' ||
    user?.role === 'TEACHER' ||
    user?.role?.toLowerCase()?.includes('teacher');

  const students = useStudentStore((state) => state.students);
  const isLoading = useStudentStore((state) => state.isLoading);
  const fetchStudents = useStudentStore((state) => state.fetchStudents);
  const updateStudent = useStudentStore((state) => state.updateStudent);
  const openEditDrawer = useStudentStore((state) => state.openEditDrawer);
  const openDeleteDialog = useStudentStore((state) => state.openDeleteDialog);

  const fileInputRef = useRef(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [detailStudent, setDetailStudent] = useState(null);

  // Tab State: 'profile' | 'health' | 'attendance' | 'assessments' | 'authorizations'
  const tabFromUrl = searchParams.get('tab') || 'profile';
  const [activeTab, setActiveTab] = useState(tabFromUrl);

  // Semester State & Report Data
  const [selectedSemester, setSelectedSemester] = useState('SEMESTER_1');
  const [reportData, setReportData] = useState(null);
  const [isReportLoading, setIsReportLoading] = useState(false);
  const reportCacheRef = useRef(new Map());

  // Student Switcher Dropdown State
  const studentDropdownRef = useRef(null);
  const [isStudentMenuOpen, setIsStudentMenuOpen] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');

  // Lightbox Preview Modal for Portrait Photo
  const [previewPhoto, setPreviewPhoto] = useState(null);

  // Sync tab with URL
  useEffect(() => {
    const tab = searchParams.get('tab') || 'profile';
    setActiveTab(tab);
  }, [searchParams]);

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      if (newTab === 'profile') {
        params.delete('tab');
      } else {
        params.set('tab', newTab);
      }
      return params;
    });
  };

  const reloadDetail = useCallback(async () => {
    if (!effectiveStudentId) return;
    try {
      const res = await studentsApi.getById(effectiveStudentId);
      if (res) {
        setDetailStudent(transformBackendStudent(res));
      }
    } catch (err) {
      console.warn('Could not fetch student detail from API:', err);
    }
  }, [effectiveStudentId]);

  useEffect(() => {
    fetchStudents();
    reloadDetail();
  }, [fetchStudents, reloadDetail]);

  const rawStudent = students.find(
    (item) => String(item.id) === String(effectiveStudentId) || item.studentCode === effectiveStudentId
  );
  const student = detailStudent || rawStudent;
  const classIdFromQuery = searchParams.get('classId');
  const classIdFromUrl = routeClassId || classIdFromQuery;
  const currentClassId = classIdFromUrl || student?.currentClass?.classId || student?.classId;

  // Class students list for switcher & navigation (< >)
  const classStudents = useMemo(() => {
    if (!currentClassId) return [];
    return students
      .filter((s) => {
        const inCurrent = String(s.currentClass?.classId || s.classId) === String(currentClassId);
        const inHistory = (s.enrollmentHistory || []).some(
          (e) => String(e.classId) === String(currentClassId)
        );
        return inCurrent || inHistory;
      })
      .sort((a, b) => (a.studentCode || '').localeCompare(b.studentCode || '', undefined, { numeric: true }));
  }, [students, currentClassId]);

  const currentStudentIndex = useMemo(() => {
    if (!student || classStudents.length === 0) return -1;
    return classStudents.findIndex(
      (s) => String(s.id) === String(student.id) || s.studentCode === student.studentCode
    );
  }, [student, classStudents]);

  const hasPrev = currentStudentIndex > 0;
  const hasNext = currentStudentIndex >= 0 && currentStudentIndex < classStudents.length - 1;

  const navigateToStudent = useCallback(
    (targetStudentId) => {
      const queryParams = new URLSearchParams();
      if (activeTab !== 'profile') queryParams.set('tab', activeTab);
      const qs = queryParams.toString();
      const searchStr = qs ? `?${qs}` : '';

      const activeClassId = routeClassId || classIdFromUrl;
      if (activeClassId) {
        navigate(`/classes/${activeClassId}/students/${targetStudentId}${searchStr}`);
      } else {
        navigate(`/students/${targetStudentId}${searchStr}`);
      }
    },
    [activeTab, routeClassId, classIdFromUrl, navigate]
  );

  const handlePrevStudent = () => {
    if (hasPrev) {
      navigateToStudent(classStudents[currentStudentIndex - 1].id);
    }
  };

  const handleNextStudent = () => {
    if (hasNext) {
      navigateToStudent(classStudents[currentStudentIndex + 1].id);
    }
  };

  // Keyboard navigation: Left/Right arrow keys
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      if (e.key === 'ArrowLeft' && hasPrev) {
        handlePrevStudent();
      } else if (e.key === 'ArrowRight' && hasNext) {
        handleNextStudent();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasPrev, hasNext, currentStudentIndex, classStudents, activeTab]);

  // Click outside to close student menu
  useEffect(() => {
    function handleClickOutside(event) {
      if (studentDropdownRef.current && !studentDropdownRef.current.contains(event.target)) {
        setIsStudentMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Escape key to close student menu
  useEffect(() => {
    function handleEscape(event) {
      if (event.key === 'Escape') {
        setIsStudentMenuOpen(false);
      }
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  // Filtered students for dropdown search
  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return classStudents;
    const term = studentSearch.toLowerCase().trim();
    return classStudents.filter(
      (s) =>
        s.fullName?.toLowerCase().includes(term) ||
        s.studentCode?.toLowerCase().includes(term)
    );
  }, [classStudents, studentSearch]);

  // Load individual student report with session memory cache for instant transition
  const loadStudentReport = useCallback(
    async (studentIdToFetch, classIdToFetch, semesterToFetch) => {
      if (!classIdToFetch || !studentIdToFetch) return;
      const activeSem = semesterToFetch || selectedSemester;
      const cacheKey = `${classIdToFetch}_${studentIdToFetch}_${activeSem}`;

      if (reportCacheRef.current.has(cacheKey)) {
        setReportData(reportCacheRef.current.get(cacheKey));
        setIsReportLoading(false);
        return;
      }

      setIsReportLoading(true);
      try {
        const res = await classesApi.getStudentReport(classIdToFetch, {
          studentId: studentIdToFetch,
          semester: activeSem,
        });
        setReportData(res);
        if (res) {
          reportCacheRef.current.set(cacheKey, res);
        }
      } catch (err) {
        console.warn('Could not load student report:', err);
      } finally {
        setIsReportLoading(false);
      }
    },
    [selectedSemester]
  );

  useEffect(() => {
    if (student?.id && currentClassId) {
      loadStudentReport(student.id, currentClassId, selectedSemester);
    }
  }, [student?.id, currentClassId, selectedSemester, loadStudentReport]);

  const healthData = reportData?.health || { totalChecks: 0, latest: null, history: [] };
  const attendanceData = reportData?.attendance || {
    totalDays: 0,
    presentCount: 0,
    excusedCount: 0,
    unexcusedCount: 0,
    attendanceRate: 100,
    history: [],
  };
  const assessmentsData = reportData?.assessments || {
    totalAssessed: 0,
    achievedCount: 0,
    outstandingCount: 0,
    notAchievedCount: 0,
    history: [],
  };
  const authorizationsData = reportData?.authorizations || {
    total: 0,
    approvedCount: 0,
    pendingCount: 0,
    history: [],
  };

  const isSem2Available = reportData?.semesterInfo?.isSem2Available ?? false;
  const activeDateRangeLabel = reportData?.semesterInfo?.activeDateRangeLabel || '07/09/2026 – 15/01/2027';

  const handleSemesterChange = (newSem) => {
    if (newSem === 'SEMESTER_2' && !isSem2Available) {
      toast.info(
        `Học kỳ 2 chưa bắt đầu (bắt đầu từ ${reportData?.semesterInfo?.sem2StartDateVN || '16/01/2027'})`
      );
      return;
    }
    setSelectedSemester(newSem);
  };

  const pastEnrollments = (student?.enrollmentHistory || [])
    .filter((e) => !e.isActive && String(e.classId) !== String(student?.currentClass?.classId))
    .sort((a, b) => {
      const dateA = new Date(a.leftAt || a.enrolledAt || 0).getTime();
      const dateB = new Date(b.leftAt || b.enrolledAt || 0).getTime();
      return dateB - dateA;
    });

  const selectedYearId = useAcademicYearStore((state) => state.selectedYearId);
  const academicYears = useAcademicYearStore((state) => state.academicYears);

  const currentClassEnrollment = useMemo(() => {
    if (!currentClassId || !student) return null;
    return (student?.enrollmentHistory || []).find(
      (e) => String(e.classId) === String(currentClassId)
    ) || null;
  }, [currentClassId, student]);

  // Contextual status:
  // - In BGH global student management without classId: read directly from student.status (students table).
  // - In class context (isTeacher or classIdFromUrl): read from student_enrollments of that class!
  const contextualStatus = useMemo(() => {
    // 1. If not viewed within a specific class context, use student.status directly from students table
    if (!classIdFromUrl && !isTeacher) {
      return { status: student?.status || 'studying', reason: null };
    }

    if (currentClassEnrollment?.status) {
      const enrStatus = String(currentClassEnrollment.status).toUpperCase();
      switch (enrStatus) {
        case 'ENROLLED':
          return { status: 'studying', reason: null };
        case 'COMPLETED':
          return { status: 'completed', reason: currentClassEnrollment.leaveReason || 'Hoàn thành năm học' };
        case 'GRADUATED':
          return { status: 'graduated', reason: currentClassEnrollment.leaveReason || 'Đã tốt nghiệp' };
        case 'TRANSFERRED_CLASS':
          return { status: 'transferred_class', reason: currentClassEnrollment.leaveReason || 'Chuyển lớp' };
        case 'TRANSFERRED_SCHOOL':
          return { status: 'transferred', reason: currentClassEnrollment.leaveReason || 'Chuyển trường' };
        case 'RESERVED':
          return { status: 'reserved', reason: currentClassEnrollment.leaveReason || 'Bảo lưu' };
        case 'DROPPED_OUT':
          return { status: 'dropped_out', reason: currentClassEnrollment.leaveReason || 'Thôi học' };
        default:
          break;
      }
    }

    if (currentClassEnrollment?.leftAt) {
      return { status: 'completed', reason: 'Hoàn thành' };
    }

    return { status: student?.status || 'studying', reason: null };
  }, [student, currentClassEnrollment, classIdFromUrl, isTeacher]);

  const handleAvatarFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Kích thước ảnh tối đa là 2MB');
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const res = await uploadApi.uploadAvatar(file);
      if (res && res.url) {
        await updateStudent(student.id, { avatar: res.url });
        toast.success(t('student.avatarUploadSuccess', 'Đã cập nhật ảnh đại diện học sinh'));
      }
    } catch (err) {
      console.error('Avatar upload failed:', err);
      toast.error(err.response?.data?.message || err.message || 'Tải ảnh thất bại');
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleResetAvatar = async (e) => {
    e.stopPropagation();
    try {
      await updateStudent(student.id, { avatar: '' });
      toast.info(t('student.avatarResetNotice', 'Đã đặt lại linh vật mặc định (DiceBear Critters)'));
    } catch (err) {
      console.error('Reset avatar failed:', err);
      toast.error('Đặt lại ảnh thất bại');
    }
  };

  const getStatusBadge = (statusObj) => {
    const status = typeof statusObj === 'object' && statusObj !== null ? statusObj.status : statusObj;
    const reason = typeof statusObj === 'object' && statusObj !== null ? statusObj.reason : null;

    switch (status) {
      case 'studying':
        return (
          <span className="inline-flex items-center justify-center px-2.5 py-0.5 text-[12px] font-medium bg-secondary text-secondary-foreground rounded-none">
            {t('student.statusStudying', 'Đang học')}
          </span>
        );
      case 'completed':
        return (
          <span
            title={reason || undefined}
            className="inline-flex items-center justify-center px-2.5 py-0.5 text-[12px] font-medium bg-blue-100 text-blue-900 dark:bg-blue-950/60 dark:text-blue-300 rounded-none cursor-default"
          >
            {t('student.statusCompleted', 'Hoàn thành')}
          </span>
        );
      case 'graduated':
        return (
          <span
            title={reason || undefined}
            className="inline-flex items-center justify-center px-2.5 py-0.5 text-[12px] font-medium bg-purple-100 text-purple-900 dark:bg-purple-950/60 dark:text-purple-300 rounded-none cursor-default"
          >
            {t('student.statusGraduated', 'Đã tốt nghiệp')}
          </span>
        );
      case 'transferred_class':
        return (
          <span
            title={reason || undefined}
            className="inline-flex items-center justify-center px-2.5 py-0.5 text-[12px] font-medium bg-cyan-100 text-cyan-900 dark:bg-cyan-950/60 dark:text-cyan-300 rounded-none cursor-default"
          >
            {t('student.statusTransferredClass', 'Đã chuyển lớp')}
          </span>
        );
      case 'transferred':
        return (
          <span
            title={reason || undefined}
            className="inline-flex items-center justify-center px-2.5 py-0.5 text-[12px] font-medium bg-indigo-100 text-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-300 rounded-none cursor-default"
          >
            {t('student.statusTransferred', 'Chuyển trường')}
          </span>
        );
      case 'reserved':
        return (
          <span
            title={reason || undefined}
            className="inline-flex items-center justify-center px-2.5 py-0.5 text-[12px] font-medium bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 rounded-none cursor-default"
          >
            {t('student.statusReserved', 'Bảo lưu')}
          </span>
        );
      case 'dropped_out':
        return (
          <span
            title={reason || undefined}
            className="inline-flex items-center justify-center px-2.5 py-0.5 text-[12px] font-medium bg-muted text-muted-foreground rounded-none cursor-default"
          >
            {t('student.statusDroppedOut', 'Thôi học')}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center justify-center px-2.5 py-0.5 text-[12px] font-medium bg-muted text-muted-foreground rounded-none">
            {status}
          </span>
        );
    }
  };

  if (isLoading && !student) {
    return (
      <div className="flex flex-col gap-6 animate-pulse max-w-[1300px] mx-auto w-full">
        <div className="h-10 border-b border-border bg-card/50" />
        <div className="h-28 border border-border bg-card p-6 rounded-none flex items-center gap-4">
          <div className="size-16 bg-muted/60 rounded-none shrink-0" />
          <div className="flex flex-col gap-2 flex-1">
            <div className="h-5 w-48 bg-muted/60 rounded-none" />
            <div className="h-3 w-32 bg-muted/40 rounded-none" />
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 border border-border bg-card" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64 border border-border bg-card rounded-none" />
          <div className="h-64 border border-border bg-card rounded-none" />
        </div>
      </div>
    );
  }

  if (!student) {
    return <NotFoundPage />;
  }

  return (
    <div
      className="w-full flex-1 flex flex-col gap-5 max-w-[1300px] mx-auto text-foreground select-none pb-12"
      data-name="FE · Student · Overview"
    >
      {/* 1. Student Hero Card (With Integrated Toolbar & Controls) */}
      <div
        className="border border-border bg-card rounded-none shadow-xs divide-y divide-border/60"
        data-name="Student Hero · Integrated Box"
      >
        {/* Top Control Bar inside the Hero Box */}
        <div className="px-5 py-2.5 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Left: Class Student Stepper & Searchable Switcher */}
          <div className="flex items-center gap-2 flex-wrap">
            {classStudents.length > 0 ? (
              <div className="flex items-center gap-2">
                {/* Searchable Dropdown */}
                <div className="relative" ref={studentDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsStudentMenuOpen(!isStudentMenuOpen)}
                    className="inline-flex items-center justify-between border border-border bg-background hover:bg-muted/70 transition-colors h-7 px-2.5 gap-2 rounded-none text-[12px] font-medium text-foreground cursor-pointer shadow-2xs max-w-[220px]"
                    title="Chọn học sinh khác trong lớp"
                  >
                    <span className="truncate">{student.fullName}</span>
                  </button>

                  {isStudentMenuOpen && (
                    <div className="absolute top-full left-0 mt-1.5 w-[280px] bg-card border border-border shadow-xl z-50 rounded-none overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100">
                      <div className="flex items-center gap-2 px-2.5 py-1.5 border-b border-border bg-background">
                        <HugeiconsIcon icon={Search01Icon} size={14} className="text-muted-foreground shrink-0" />
                        <input
                          type="text"
                          value={studentSearch}
                          onChange={(e) => setStudentSearch(e.target.value)}
                          placeholder="Tìm học sinh trong lớp..."
                          autoFocus
                          className="flex-1 bg-transparent text-[12px] text-foreground placeholder:text-muted-foreground outline-none border-0 focus:outline-none focus:border-0 focus:ring-0 shadow-none"
                        />
                      </div>
                      <div className="max-h-[240px] overflow-y-auto p-1 divide-y divide-border/30">
                        {filteredStudents.length === 0 ? (
                          <div className="p-3 text-center text-[12px] text-muted-foreground">
                            Không tìm thấy
                          </div>
                        ) : (
                          filteredStudents.map((st) => {
                            const isSel = String(st.id) === String(student.id);
                            return (
                              <button
                                key={st.id}
                                type="button"
                                onClick={() => {
                                  setIsStudentMenuOpen(false);
                                  setStudentSearch('');
                                  navigateToStudent(st.id);
                                }}
                                className={cn(
                                  'w-full flex items-center gap-2.5 px-2 py-1.5 text-left rounded-none transition-colors cursor-pointer text-[12px]',
                                  isSel ? 'bg-muted text-foreground font-semibold' : 'hover:bg-muted/60 text-foreground'
                                )}
                              >
                                <div className="flex flex-col min-w-0 flex-1 leading-tight">
                                  <span className="truncate font-medium">{st.fullName}</span>
                                  <span className="text-[11px] text-muted-foreground truncate">
                                    {st.studentCode} · {st.gender}
                                  </span>
                                </div>
                                {isSel && <HugeiconsIcon icon={Tick02Icon} size={14} className="text-primary shrink-0" />}
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Prev / Next buttons */}
                <div className="flex items-center border border-border bg-card rounded-none h-7 shrink-0">
                  <button
                    type="button"
                    onClick={handlePrevStudent}
                    disabled={!hasPrev}
                    title="Học sinh trước (Phím ←)"
                    className="size-7 flex items-center justify-center border-r border-border text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  >
                    <HugeiconsIcon icon={ArrowLeft02Icon} size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextStudent}
                    disabled={!hasNext}
                    title="Học sinh tiếp theo (Phím →)"
                    className="size-7 flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  >
                    <HugeiconsIcon icon={ArrowRight02Icon} size={13} />
                  </button>
                </div>

                {currentStudentIndex >= 0 && (
                  <span className="text-xs text-muted-foreground font-mono tabular-nums">
                    {currentStudentIndex + 1}/{classStudents.length}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-[12px] font-medium text-muted-foreground">
                {t('student.detail', 'Hồ sơ học sinh')}
              </span>
            )}
          </div>

          {/* Right: Semester selector + Date badge */}
          <div className="flex items-center gap-2 self-start sm:self-center">
            <div className="inline-flex items-center p-0.5 border border-border bg-background rounded-none shrink-0 shadow-2xs">
              <button
                type="button"
                onClick={() => handleSemesterChange('SEMESTER_1')}
                className={cn(
                  'h-6 px-2 text-[11.5px] font-medium transition-all rounded-none cursor-pointer',
                  selectedSemester === 'SEMESTER_1'
                    ? 'bg-muted text-foreground shadow-xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Học kỳ 1
              </button>
              <button
                type="button"
                disabled={!isSem2Available}
                onClick={() => handleSemesterChange('SEMESTER_2')}
                title={
                  !isSem2Available
                    ? `Học kỳ 2 chưa bắt đầu (bắt đầu từ ${reportData?.semesterInfo?.sem2StartDateVN || '16/01/2027'})`
                    : 'Xem dữ liệu Học kỳ 2'
                }
                className={cn(
                  'h-6 px-2 text-[11.5px] font-medium transition-all rounded-none',
                  !isSem2Available
                    ? 'text-muted-foreground/40 cursor-not-allowed opacity-50'
                    : selectedSemester === 'SEMESTER_2'
                    ? 'bg-muted text-foreground shadow-xs font-semibold cursor-pointer'
                    : 'text-muted-foreground hover:text-foreground cursor-pointer'
                )}
              >
                Học kỳ 2
              </button>
            </div>

            <div className="inline-flex items-center gap-1.5 px-2 h-7 border border-border bg-background font-mono text-[11px] text-muted-foreground shadow-2xs">
              <HugeiconsIcon icon={Calendar03Icon} size={12} className="text-muted-foreground" />
              <span>{activeDateRangeLabel}</span>
            </div>
          </div>
        </div>

        {/* Main Body of the Hero Card */}
        <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4 sm:gap-5 min-w-0">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/jpeg,image/png,image/webp"
              onChange={handleAvatarFileChange}
              className="hidden"
            />
            <div className="relative group size-16 rounded-none overflow-hidden border border-border/80 bg-muted/40 shrink-0">
              <img
                src={getStudentAvatarUrl(student.avatar, student.studentCode || student.fullName)}
                alt={student.fullName}
                className="size-full object-cover"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = getStudentAvatarUrl(null, student.studentCode || student.fullName);
                }}
              />
              {isUploadingAvatar ? (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white">
                  <HugeiconsIcon icon={ArrowReloadHorizontalIcon} size={18} className="animate-spin" />
                </div>
              ) : (
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-1">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    title={t('common.uploadAvatar', 'Tải ảnh lên')}
                    className="size-7 bg-white/20 hover:bg-white/35 text-white flex items-center justify-center rounded-none transition-colors cursor-pointer"
                  >
                    <HugeiconsIcon icon={Upload01Icon} size={14} />
                  </button>
                  {student.avatar && !student.avatar.includes('api.dicebear.com') && (
                    <button
                      type="button"
                      onClick={handleResetAvatar}
                      title={t('common.resetAvatar', 'Đặt lại mặc định')}
                      className="size-7 bg-white/20 hover:bg-white/35 text-white flex items-center justify-center rounded-none transition-colors cursor-pointer"
                    >
                      <HugeiconsIcon icon={ArrowReloadHorizontalIcon} size={14} />
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col min-w-0 gap-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-[22px] font-semibold text-foreground tracking-tight leading-tight">
                  {student.fullName}
                </h1>
                {getStatusBadge(contextualStatus)}
              </div>
              <p className="text-[13px] text-muted-foreground font-normal truncate">
                {student.studentCode ? `${t('student.studentCodePrefix', 'Mã HS')}: ${student.studentCode}` : ''}
                {student.currentClass
                  ? ` · ${student.currentClass.className}`
                  : pastEnrollments.length > 0
                    ? ` · Chưa xếp lớp (Lớp cũ: ${pastEnrollments[0].className})`
                    : ` · ${t('student.notAssigned', 'Chưa phân lớp')}`}
                {student.primaryParent && ` · ${t('student.parentLabel', 'Phụ huynh')}: ${student.primaryParent.fullName} (${student.primaryParent.phone})`}
              </p>
            </div>
          </div>

          {/* Action Buttons: Edit for everyone, Delete hidden for Teachers */}
          <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => openEditDrawer(student.id)}
              className="size-8 rounded-none border border-border bg-background hover:bg-muted text-foreground cursor-pointer"
              title={t('common.edit', 'Chỉnh sửa')}
            >
              <HugeiconsIcon icon={PencilEdit02Icon} size={15} />
            </Button>

            {!isTeacher && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => openDeleteDialog(student)}
                className="size-8 rounded-none border border-border bg-background hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 text-foreground cursor-pointer transition-colors"
                title={t('common.delete', 'Xóa')}
              >
                <HugeiconsIcon icon={Delete02Icon} size={15} />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 2. 4 Quick Metric KPI Panels - Mirrors ClassOverviewPage */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => handleTabChange('health')}
          className={cn(
            'border border-border p-3 text-left rounded-none transition-colors cursor-pointer',
            activeTab === 'health'
              ? 'bg-muted border-foreground/40'
              : 'bg-card hover:bg-muted/40 shadow-2xs'
          )}
        >
          <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
            Sức khỏe ({healthData.totalChecks} đợt)
          </div>
          <div className="text-xs font-medium text-foreground mt-1 truncate">
            {healthData.latest ? (
              <span>
                {healthData.latest.height}cm · {healthData.latest.weight}kg
              </span>
            ) : (
              'Chưa có dữ liệu'
            )}
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('attendance')}
          className={cn(
            'border border-border p-3 text-left rounded-none transition-colors cursor-pointer',
            activeTab === 'attendance'
              ? 'bg-muted border-foreground/40'
              : 'bg-card hover:bg-muted/40 shadow-2xs'
          )}
        >
          <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
            Chuyên cần ({attendanceData.attendanceRate}%)
          </div>
          <div className="text-xs font-medium text-foreground mt-1 truncate">
            {attendanceData.presentCount}/{attendanceData.totalDays} buổi có mặt
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('assessments')}
          className={cn(
            'border border-border p-3 text-left rounded-none transition-colors cursor-pointer',
            activeTab === 'assessments'
              ? 'bg-muted border-foreground/40'
              : 'bg-card hover:bg-muted/40 shadow-2xs'
          )}
        >
          <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
            Đánh giá ({assessmentsData.totalAssessed} tiết)
          </div>
          <div className="text-xs font-medium text-foreground mt-1 truncate">
            {assessmentsData.achievedCount} Đạt · {assessmentsData.outstandingCount} Vượt trội
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('authorizations')}
          className={cn(
            'border border-border p-3 text-left rounded-none transition-colors cursor-pointer',
            activeTab === 'authorizations'
              ? 'bg-muted border-foreground/40'
              : 'bg-card hover:bg-muted/40 shadow-2xs'
          )}
        >
          <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
            Ủy quyền ({authorizationsData.total} đơn)
          </div>
          <div className="text-xs font-medium text-foreground mt-1 truncate">
            {authorizationsData.approvedCount} Đã duyệt
            {authorizationsData.pendingCount > 0 ? ` · ${authorizationsData.pendingCount} Chờ` : ''}
          </div>
        </button>
      </div>

      {/* 3. Underline Tabs Header */}
      <div className="border-b border-border flex items-center gap-6 text-[13px] overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => handleTabChange('profile')}
          className={cn(
            'py-2.5 font-medium border-b-2 -mb-px transition-colors cursor-pointer whitespace-nowrap',
            activeTab === 'profile'
              ? 'border-primary text-foreground font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          Hồ sơ lý lịch
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('health')}
          className={cn(
            'py-2.5 font-medium border-b-2 -mb-px transition-colors cursor-pointer whitespace-nowrap',
            activeTab === 'health'
              ? 'border-primary text-foreground font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          Theo dõi Sức khỏe
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('attendance')}
          className={cn(
            'py-2.5 font-medium border-b-2 -mb-px transition-colors cursor-pointer whitespace-nowrap',
            activeTab === 'attendance'
              ? 'border-primary text-foreground font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          Lịch sử Điểm danh
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('assessments')}
          className={cn(
            'py-2.5 font-medium border-b-2 -mb-px transition-colors cursor-pointer whitespace-nowrap',
            activeTab === 'assessments'
              ? 'border-primary text-foreground font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          Đánh giá Hoạt động
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('authorizations')}
          className={cn(
            'py-2.5 font-medium border-b-2 -mb-px transition-colors cursor-pointer whitespace-nowrap',
            activeTab === 'authorizations'
              ? 'border-primary text-foreground font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          Ủy quyền đưa đón
        </button>
      </div>

      {/* 4. Tab 1: Profile Overview (4 Detailed Cards) */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start" data-name="Student Overview Grid">
          {/* Left Column: Thông tin cá nhân & Sức khỏe */}
          <div className="space-y-6">
            {/* Card 1: Thông tin cá nhân */}
            <div className="border border-border bg-card rounded-none overflow-hidden shadow-xs">
              <div className="p-4 border-b border-border bg-muted/20">
                <h2 className="text-[14px] font-semibold text-foreground">
                  {t('student.personalInfo', 'Thông tin cá nhân')}
                </h2>
                <p className="text-[12px] text-muted-foreground font-normal">
                  {t('student.personalInfoSub', 'Lý lịch cơ bản của học sinh')}
                </p>
              </div>

              <div className="divide-y divide-border/60">
                <div className="flex items-center justify-between p-4 h-[52px]">
                  <span className="text-[14px] text-foreground/80 font-normal">{t('student.code', 'Mã học sinh')}</span>
                  <span className="text-[14px] font-mono text-foreground font-medium">
                    {student.studentCode}
                  </span>
                </div>

                <div className="flex items-center justify-between p-4 h-[52px]">
                  <span className="text-[14px] text-foreground/80 font-normal">{t('student.fullName', 'Họ và tên')}</span>
                  <span className="text-[14px] text-foreground font-medium">
                    {student.fullName}
                  </span>
                </div>

                <div className="flex items-center justify-between p-4 h-[52px]">
                  <span className="text-[14px] text-foreground/80 font-normal">{t('student.dob', 'Ngày sinh')}</span>
                  <span className="text-[14px] text-foreground font-normal">
                    {student.dob || '—'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-4 h-[52px]">
                  <span className="text-[14px] text-foreground/80 font-normal">{t('student.gender', 'Giới tính')}</span>
                  <span className="text-[14px] text-foreground font-medium">
                    {student.gender || '—'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-4 h-[52px]">
                  <span className="text-[14px] text-foreground/80 font-normal">{t('student.ethnic', 'Dân tộc')}</span>
                  <span className="text-[14px] text-foreground font-normal">
                    {student.ethnic || 'Kinh'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-4 h-[52px]">
                  <span className="text-[14px] text-foreground/80 font-normal">{t('student.nationality', 'Quốc tịch')}</span>
                  <span className="text-[14px] text-foreground font-normal">
                    {student.nationality || 'Việt Nam'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-4 min-h-[52px]">
                  <span className="text-[14px] text-foreground/80 font-normal shrink-0 pr-4">{t('student.placeOfBirth', 'Nơi sinh')}</span>
                  <span className="text-[14px] text-foreground font-normal text-right">
                    {student.placeOfBirth || '—'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-4 min-h-[52px]">
                  <span className="text-[14px] text-foreground/80 font-normal shrink-0 pr-4">{t('student.permanentResidence', 'Thường trú')}</span>
                  <span className="text-[14px] text-foreground font-normal text-right">
                    {student.permanentResidence || '—'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-4 min-h-[52px]">
                  <span className="text-[14px] text-foreground/80 font-normal shrink-0 pr-4">{t('student.currentResidence', 'Tạm trú')}</span>
                  <span className="text-[14px] text-foreground font-normal text-right">
                    {student.currentResidence || '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Card 2: Sức khỏe & Ghi chú chăm sóc */}
            <div className="border border-border bg-card rounded-none overflow-hidden shadow-xs">
              <div className="p-4 border-b border-border bg-muted/20">
                <h2 className="text-[14px] font-semibold text-foreground">
                  {t('student.healthNotes', 'Sức khỏe & Ghi chú chăm sóc')}
                </h2>
                <p className="text-[12px] text-muted-foreground font-normal">
                  {t('student.healthNotesSub', 'Lưu ý dị ứng, bệnh lý và ghi chú của giáo viên')}
                </p>
              </div>

              <div className="divide-y divide-border/60 text-[13px]">
                <div className="p-4">
                  <span className="text-[12px] text-muted-foreground block font-medium">
                    {t('student.allergies', 'Dị ứng thức ăn / thuốc')}
                  </span>
                  <p className="text-[14px] text-foreground mt-1">
                    {student.allergyNotes || t('student.noAllergies', 'Không ghi nhận dị ứng.')}
                  </p>
                </div>

                <div className="p-4">
                  <span className="text-[12px] text-muted-foreground block font-medium">
                    {t('student.medicalHistory', 'Tiền sử bệnh lý')}
                  </span>
                  <p className="text-[14px] text-foreground mt-1">
                    {student.medicalNotes || t('student.noMedicalHistory', 'Không ghi nhận bệnh lý đặc biệt.')}
                  </p>
                </div>

                <div className="p-4">
                  <span className="text-[12px] text-muted-foreground block font-medium">
                    {t('student.previousSchoolTitle', 'Trường mầm non trước đây')}
                  </span>
                  <p className="text-[14px] text-foreground mt-1">
                    {student.previousSchool || student.notes || t('student.noPreviousSchool', 'Chưa có thông tin trường cũ.')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Phụ huynh & Lớp học */}
          <div className="space-y-6">
            {/* Card 3: Phụ huynh & Người giám hộ */}
            <div className="border border-border bg-card rounded-none overflow-hidden shadow-xs">
              <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
                <div>
                  <h2 className="text-[14px] font-semibold text-foreground">
                    {t('student.parentsGuardians', 'Phụ huynh & Người giám hộ')}
                  </h2>
                  <p className="text-[12px] text-muted-foreground font-normal">
                    {t('student.parentsGuardiansSub', 'Thông tin liên lạc khẩn cấp và bảo mật bàn giao trẻ')}
                  </p>
                </div>
                <span className="text-[12px] font-medium text-muted-foreground">
                  {t('student.peopleCount', '{{count}} người', { count: student.parents?.length || 0 })}
                </span>
              </div>

              <div className="divide-y divide-border/60">
                {student.parents && student.parents.length > 0 ? (
                  student.parents.map((p, idx) => (
                    <div key={p.id || idx} className="p-4 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[14px] font-medium text-foreground">
                          {p.relationship}: <strong className="font-semibold">{p.fullName}</strong>
                        </span>
                        <span className="text-[12px] text-muted-foreground font-normal">
                          {p.canPickup !== false ? 'Được đón bé' : 'Chưa đăng ký đón'}
                        </span>
                      </div>
                      <div className="text-[13px] text-muted-foreground space-y-0.5">
                        <div>
                          {t('student.phone', 'SĐT')}:{' '}
                          <span className="font-mono text-foreground font-medium">
                            {p.phone || '—'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-[13px] text-muted-foreground italic">
                    {t('student.noParents', 'Chưa có thông tin phụ huynh')}
                  </div>
                )}
              </div>
            </div>

            {/* Card 4: Lớp học & Học vụ */}
            <div className="border border-border bg-card rounded-none overflow-hidden shadow-xs">
              <div className="p-4 border-b border-border bg-muted/20">
                <h2 className="text-[14px] font-semibold text-foreground">
                  {t('student.academicHistory', 'Lớp học & Lịch sử học vụ')}
                </h2>
                <p className="text-[12px] text-muted-foreground font-normal">
                  {t('student.academicHistorySub', 'Phân lớp hiện tại và thông tin niên khóa')}
                </p>
              </div>

              <div className="divide-y divide-border/60">
                <div className="flex items-center justify-between p-4 h-[52px]">
                  <span className="text-[14px] text-foreground/80 font-normal">{t('student.currentClass', 'Lớp đang học')}</span>
                  <span className="text-[14px] text-foreground font-medium">
                    {student.currentClass?.className || (
                      <span className="text-muted-foreground italic font-normal">
                        {t('student.notAssigned', 'Chưa phân lớp')}
                      </span>
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between p-4 h-[52px]">
                  <span className="text-[14px] text-foreground/80 font-normal">{t('student.classroom', 'Phòng học')}</span>
                  <span className="text-[14px] text-foreground font-normal">
                    {student.currentClass?.roomNumber || '—'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-4 h-[52px]">
                  <span className="text-[14px] text-foreground/80 font-normal">{t('student.schoolYear', 'Năm học')}</span>
                  <span className="text-[14px] text-foreground font-normal">
                    {student.currentClass?.schoolYearName || 'Năm học 2026–2027'}
                  </span>
                </div>

                {/* Ngày vào lớp này (khi xem trong ngữ cảnh lớp) */}
                {currentClassId && (
                  <div className="flex items-center justify-between p-4 h-[52px]">
                    <span className="text-[14px] text-foreground/80 font-normal">
                      {t('student.colClassEnrolledAt', 'Ngày vào lớp')}
                    </span>
                    <span className="text-[14px] text-foreground font-normal">
                      {currentClassEnrollment?.enrolledAt
                        ? formatDateDisplay(currentClassEnrollment.enrolledAt)
                        : (student.joinDate || '—')}
                    </span>
                  </div>
                )}

                {/* Ngày rời lớp (nếu có) */}
                {currentClassId && currentClassEnrollment?.leftAt && (
                  <div className="flex items-center justify-between p-4 h-[52px]">
                    <span className="text-[14px] text-foreground/80 font-normal">
                      {t('student.colClassLeftAt', 'Ngày rời lớp')}
                    </span>
                    <span
                      className="text-[14px] text-foreground font-normal"
                      title={currentClassEnrollment.leaveReason || undefined}
                    >
                      {formatDateDisplay(currentClassEnrollment.leftAt)}
                      {currentClassEnrollment.leaveReason ? ` (${currentClassEnrollment.leaveReason})` : ''}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between p-4 h-[52px]">
                  <span className="text-[14px] text-foreground/80 font-normal">{t('student.joinDate', 'Ngày nhập học')}</span>
                  <span className="text-[14px] text-foreground font-normal">
                    {student.joinDate || '—'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Tab 2: Health Monitoring Table */}
      {activeTab === 'health' && (
        <div className="border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/40 font-medium text-muted-foreground uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="px-4 py-2.5">Đợt đo</th>
                  <th className="px-4 py-2.5">Ngày đo</th>
                  <th className="px-4 py-2.5 text-right">Chiều cao</th>
                  <th className="px-4 py-2.5 text-right">Cân nặng</th>
                  <th className="px-4 py-2.5 text-right">BMI</th>
                  <th className="px-4 py-2.5">Thể trạng (WHO)</th>
                  <th className="px-4 py-2.5">Ghi chú y tế</th>
                  <th className="px-4 py-2.5">Người ghi nhận</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isReportLoading ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-muted-foreground">
                      Đang tải dữ liệu đo sức khỏe...
                    </td>
                  </tr>
                ) : healthData.history.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-muted-foreground">
                      Chưa có dữ liệu đo sức khỏe cho học sinh này.
                    </td>
                  </tr>
                ) : (
                  healthData.history.map((record) => {
                    const isUnderweight = record.classification?.toLowerCase().includes('nhẹ cân');
                    const isOverweight = record.classification?.toLowerCase().includes('thừa cân') || record.classification?.toLowerCase().includes('béo phì');
                    return (
                      <tr key={record.id} className="transition-colors hover:bg-muted/30">
                        <td className="px-4 py-2.5 font-semibold text-foreground">
                          {record.roundName}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-muted-foreground">
                          {record.dateFormatted}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-foreground">
                          {record.height} cm
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-foreground">
                          {record.weight} kg
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono font-bold text-foreground">
                          {record.bmi}
                        </td>
                        <td className="px-4 py-2.5">
                          {isUnderweight ? (
                            <span className="inline-flex items-center px-2 py-0.5 text-[11.5px] font-medium rounded-none bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50">
                              {record.classification || 'Theo dõi nhẹ cân'}
                            </span>
                          ) : isOverweight ? (
                            <span className="inline-flex items-center px-2 py-0.5 text-[11.5px] font-medium rounded-none bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50">
                              {record.classification || 'Theo dõi thừa cân'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 text-[11.5px] font-medium rounded-none bg-blue-100 dark:bg-blue-950/60 text-[#1447e6] dark:text-blue-400 border border-blue-200 dark:border-blue-800/50">
                              {record.classification || 'Bình thường'}
                            </span>
                          )}
                        </td>
                        <td className="max-w-xs px-4 py-2.5 text-muted-foreground">
                          {record.notes || 'Bình thường, thể trạng ổn định'}
                        </td>
                        <td className="px-4 py-2.5 text-foreground font-medium">
                          {formatRecordedBy(record.recordedBy)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. Tab 3: Attendance History Table */}
      {activeTab === 'attendance' && (
        <div className="border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/40 font-medium text-muted-foreground uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="px-4 py-2.5">Ngày</th>
                  <th className="px-4 py-2.5">Thứ</th>
                  <th className="px-4 py-2.5">Trạng thái</th>
                  <th className="px-4 py-2.5">Giờ đón</th>
                  <th className="px-4 py-2.5">Giờ về</th>
                  <th className="px-4 py-2.5">Người đón trẻ</th>
                  <th className="px-4 py-2.5">Ghi chú & Lý do</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isReportLoading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      Đang tải lịch sử điểm danh...
                    </td>
                  </tr>
                ) : attendanceData.history.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      Không tìm thấy bản ghi điểm danh nào.
                    </td>
                  </tr>
                ) : (
                  attendanceData.history.map((att) => {
                    let statusBadge = (
                      <span className="inline-flex items-center px-2 py-0.5 text-[11.5px] font-medium rounded-none bg-blue-100 dark:bg-blue-950/60 text-[#1447e6] dark:text-blue-400 border border-blue-200 dark:border-blue-800/50">
                        Có mặt
                      </span>
                    );
                    if (att.status === 'EXCUSED_ABSENCE') {
                      statusBadge = (
                        <span className="inline-flex items-center px-2 py-0.5 text-[11.5px] font-medium rounded-none bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50">
                          Nghỉ có phép
                        </span>
                      );
                    } else if (att.status === 'UNEXCUSED_ABSENCE') {
                      statusBadge = (
                        <span className="inline-flex items-center px-2 py-0.5 text-[11.5px] font-medium rounded-none bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50">
                          Nghỉ không phép
                        </span>
                      );
                    }

                    return (
                      <tr key={att.id} className="transition-colors hover:bg-muted/30">
                        <td className="px-4 py-2.5 font-mono text-foreground font-medium">
                          {att.dateFormatted}
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">
                          {att.dayName}
                        </td>
                        <td className="px-4 py-2.5">{statusBadge}</td>
                        <td className="px-4 py-2.5 font-mono text-muted-foreground">
                          {att.checkInTime || '—'}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-muted-foreground">
                          {att.checkOutTime || '—'}
                        </td>
                        <td className="px-4 py-2.5 text-foreground">
                          {att.pickupPerson ? (
                            <span>
                              {att.pickupPerson}
                              {att.pickupRelationship && (
                                <span className="text-muted-foreground ml-1">
                                  ({att.pickupRelationship})
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="max-w-xs px-4 py-2.5 text-muted-foreground">
                          {att.notes || att.pickupNote || '—'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7. Tab 4: Daily Assessments Table */}
      {activeTab === 'assessments' && (
        <div className="border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/40 font-medium text-muted-foreground uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="px-4 py-2.5">Ngày</th>
                  <th className="px-4 py-2.5">Khung giờ</th>
                  <th className="px-4 py-2.5">Hoạt động giáo dục</th>
                  <th className="px-4 py-2.5">Kết quả</th>
                  <th className="px-4 py-2.5">Nhận xét của giáo viên</th>
                  <th className="px-4 py-2.5">Giáo viên</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isReportLoading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
                      Đang tải đánh giá hoạt động...
                    </td>
                  </tr>
                ) : assessmentsData.history.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
                      Không tìm thấy hoạt động đánh giá nào phù hợp.
                    </td>
                  </tr>
                ) : (
                  assessmentsData.history.map((ass) => {
                    let statusBadge = (
                      <span className="inline-flex items-center px-2 py-0.5 text-[11.5px] font-medium rounded-none bg-blue-100 dark:bg-blue-950/60 text-[#1447e6] dark:text-blue-400 border border-blue-200 dark:border-blue-800/50">
                        Đạt yêu cầu
                      </span>
                    );
                    if (ass.status === 'OUTSTANDING') {
                      statusBadge = (
                        <span className="inline-flex items-center px-2 py-0.5 text-[11.5px] font-medium rounded-none bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800/50 font-semibold">
                          Vượt trội ★
                        </span>
                      );
                    } else if (ass.status === 'NOT_ACHIEVED') {
                      statusBadge = (
                        <span className="inline-flex items-center px-2 py-0.5 text-[11.5px] font-medium rounded-none bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50">
                          Cần rèn luyện
                        </span>
                      );
                    }

                    return (
                      <tr key={ass.id} className="transition-colors hover:bg-muted/30">
                        <td className="px-4 py-2.5 font-mono text-muted-foreground whitespace-nowrap">
                          {ass.dateFormatted}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-none bg-muted text-foreground border border-border">
                            {ass.routineSlotLabel}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-medium text-foreground max-w-[240px]">
                          {ass.activityTitle}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap">{statusBadge}</td>
                        <td className="max-w-[260px] px-4 py-2.5 text-foreground">
                          {ass.notes || '—'}
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                          {ass.evaluatorName || 'Giáo viên'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 8. Tab 5: Pickup Authorizations Table */}
      {activeTab === 'authorizations' && (
        <div className="border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/40 font-medium text-muted-foreground uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="px-4 py-2.5">Người được ủy quyền</th>
                  <th className="px-4 py-2.5">Quan hệ</th>
                  <th className="px-4 py-2.5">Số điện thoại</th>
                  <th className="px-4 py-2.5">Thời gian hiệu lực</th>
                  <th className="px-4 py-2.5">Trạng thái</th>
                  <th className="px-4 py-2.5">Dặn dò / Ghi chú</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isReportLoading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
                      Đang tải danh sách ủy quyền...
                    </td>
                  </tr>
                ) : authorizationsData.history.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
                      Không có yêu cầu ủy quyền đưa đón nào của học sinh này trong{' '}
                      {selectedSemester === 'SEMESTER_1' ? 'Học kỳ 1' : 'Học kỳ 2'}.
                    </td>
                  </tr>
                ) : (
                  authorizationsData.history.map((auth) => (
                    <tr key={auth.id} className="transition-colors hover:bg-muted/30">
                      {/* Người được ủy quyền */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-9 h-9 min-w-[36px] min-h-[36px] max-w-[36px] max-h-[36px] border border-border overflow-hidden bg-background shrink-0 cursor-zoom-in hover:opacity-85 transition-opacity"
                            onClick={() =>
                              auth.photoUrl &&
                              setPreviewPhoto({
                                url: auth.photoUrl,
                                title: `Ảnh người được ủy quyền: ${auth.pickupPersonName}`,
                              })
                            }
                            title={auth.photoUrl ? 'Bấm để phóng to ảnh' : undefined}
                          >
                            <img
                              src={
                                auth.photoUrl ||
                                `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(auth.pickupPersonName || 'UQ')}`
                              }
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-foreground text-[12.5px] truncate">
                              {auth.pickupPersonName}
                            </span>
                            {auth.pickupCitizenId ? (
                              <span className="text-[11px] text-muted-foreground font-mono">
                                CCCD: {auth.pickupCitizenId}
                              </span>
                            ) : (
                              <span className="text-[11px] text-muted-foreground/50 font-mono">
                                Chưa có CCCD
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Quan hệ */}
                      <td className="px-4 py-3 whitespace-nowrap text-foreground text-[12.5px] font-medium">
                        {auth.relationship}
                      </td>

                      {/* Số điện thoại */}
                      <td className="px-4 py-3 whitespace-nowrap font-mono text-muted-foreground text-[12px]">
                        {auth.pickupPersonPhone || '—'}
                      </td>

                      {/* Thời gian hiệu lực */}
                      <td className="px-4 py-3 whitespace-nowrap font-mono text-foreground font-medium text-[12px]">
                        {auth.dateRangeFormatted}
                      </td>

                      {/* Trạng thái */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {auth.status === 'APPROVED' ? (
                          auth.isActiveNow ? (
                            <span className="inline-flex items-center px-2 py-0.5 text-[11.5px] font-medium rounded-none bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                              Đang hiệu lực
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 text-[11.5px] font-medium rounded-none bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200/60">
                              Đã duyệt
                            </span>
                          )
                        ) : auth.status === 'PENDING' ? (
                          <span className="inline-flex items-center px-2 py-0.5 text-[11.5px] font-medium rounded-none bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200">
                            Chờ duyệt
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 text-[11.5px] font-medium rounded-none bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200">
                            Đã từ chối
                          </span>
                        )}
                      </td>

                      {/* Dặn dò / Ghi chú */}
                      <td className="px-4 py-3 max-w-[240px]">
                        {auth.note ? (
                          <p className="text-[12px] text-muted-foreground line-clamp-2" title={auth.note}>
                            {auth.note}
                          </p>
                        ) : (
                          <span className="text-muted-foreground/40 italic">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Lightbox Preview Modal for Portrait Photo */}
      {previewPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in-0 duration-150"
          onClick={() => setPreviewPhoto(null)}
        >
          <div
            className="bg-card border border-border p-3 shadow-xl max-w-sm w-full space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="text-[13px] font-semibold text-foreground truncate">
                {previewPhoto.title || 'Ảnh chân dung người được ủy quyền'}
              </span>
              <button
                type="button"
                onClick={() => setPreviewPhoto(null)}
                className="size-6 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={15} />
              </button>
            </div>
            <div className="w-full aspect-square max-h-[300px] overflow-hidden bg-background border border-border flex items-center justify-center">
              <img
                src={previewPhoto.url}
                alt=""
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* Slide-out Drawer Panel */}
      <StudentDrawer />

      {/* Delete Confirmation Modal */}
      <DeleteStudentDialog />
    </div>
  );
}

export default StudentReportPage;
