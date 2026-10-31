import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArrowLeft02Icon,
  ArrowRight02Icon,
  Search01Icon,
  Calendar03Icon,
  UnfoldMoreIcon,
  Tick02Icon,
  Cancel01Icon,
} from '@hugeicons/core-free-icons';
import { Input } from '@/components/ui/input';
import { useClassesStore } from './classes.store';
import { classesApi } from './classes.api';
import { useAuthStore } from '@/features/auth';
import { NotFoundPage } from '@/features/error';
import { cn } from '@/shared/lib/utils';

// Helper: Calculate child age in years and months
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

// Helper: Clean recorder name formatting
function formatRecordedBy(name) {
  if (!name) return 'Cán bộ Y tế';
  if (/^HS\d+$/i.test(name.trim())) return 'Cán bộ Y tế';
  if (/^admin$/i.test(name.trim())) return 'Cán bộ Y tế';
  return name;
}

export function ClassOverviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const user = useAuthStore((state) => state.user);
  const isTeacher =
    user?.role === 'TEACHER_GV' ||
    user?.role === 'TEACHER' ||
    user?.role?.toLowerCase()?.includes('teacher');

  const classes = useClassesStore((state) => state.classes) || [];
  const attachedClassId = useClassesStore((state) => state.attachedClassId);
  const attachClass = useClassesStore((state) => state.attachClass);
  const fetchClasses = useClassesStore((state) => state.fetchClasses);
  const hasLoadedClasses = useClassesStore((state) => state.hasLoaded);
  const isClassesLoading = useClassesStore((state) => state.isLoading);

  // Classroom resolution
  const currentClass = id
    ? classes.find((c) => c.id === id || c.publicId === id)
    : classes.find((c) => c.id === attachedClassId) ||
      classes.find((c) => (c.studentCount || 0) > 0) ||
      classes[0];

  const targetClassId = currentClass?.id || id || (classes[0]?.id ?? '');

  // State
  const [selectedSemester, setSelectedSemester] = useState('SEMESTER_1');
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Session memory cache to make flipping between students instantaneous (< > navigation)
  const reportCacheRef = useRef(new Map());

  // Student Command Menu Dropdown State (matching ClassCommandMenu design)
  const studentDropdownRef = useRef(null);
  const [isStudentMenuOpen, setIsStudentMenuOpen] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');

  // Active view tab: 'health' | 'attendance' | 'assessments' | 'parents' | 'authorizations'
  const [activeTab, setActiveTab] = useState('health');
  const [previewPhoto, setPreviewPhoto] = useState(null);

  useEffect(() => {
    if (!hasLoadedClasses && !isClassesLoading) {
      fetchClasses();
    }
  }, [hasLoadedClasses, isClassesLoading, fetchClasses]);

  useEffect(() => {
    if (id && attachedClassId !== id) {
      attachClass(id);
    }
  }, [id, attachedClassId, attachClass]);

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

  // Load individual student report with session memory cache for 0ms instant transition
  const loadStudentReport = useCallback(
    async (studentIdToFetch, semesterToFetch) => {
      const activeSem = semesterToFetch || selectedSemester;
      const cacheKey = `${targetClassId}_${studentIdToFetch || 'default'}_${activeSem}`;

      // Check session memory cache first
      if (reportCacheRef.current.has(cacheKey)) {
        const cached = reportCacheRef.current.get(cacheKey);
        setReportData(cached);
        if (cached?.student?.id && !studentIdToFetch) {
          setSelectedStudentId(cached.student.id);
        }
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const params = {
          ...(studentIdToFetch ? { studentId: studentIdToFetch } : {}),
          semester: activeSem,
        };
        const res = await classesApi.getStudentReport(targetClassId, params);
        setReportData(res);
        if (res?.student?.id) {
          const resolvedKey = `${targetClassId}_${res.student.id}_${activeSem}`;
          reportCacheRef.current.set(resolvedKey, res);
          reportCacheRef.current.set(cacheKey, res);
        }
        if (res?.student?.id && !studentIdToFetch) {
          setSelectedStudentId(res.student.id);
        }
      } catch (err) {
        console.error('Failed to load student report:', err);
        toast.error('Không thể tải báo cáo của học sinh');
      } finally {
        setIsLoading(false);
      }
    },
    [targetClassId, selectedSemester]
  );

  useEffect(() => {
    if (targetClassId) {
      loadStudentReport(selectedStudentId, selectedSemester);
    }
  }, [targetClassId, selectedStudentId, selectedSemester, loadStudentReport]);

  const studentList = reportData?.studentList || [];
  const currentStudent = reportData?.student || null;
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

  // Filtered student list for command menu search
  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return studentList;
    const term = studentSearch.toLowerCase().trim();
    return studentList.filter(
      (s) =>
        s.fullName?.toLowerCase().includes(term) ||
        s.studentCode?.toLowerCase().includes(term)
    );
  }, [studentList, studentSearch]);

  // Student Navigation calculations
  const currentIndex = studentList.findIndex((s) => s.id === currentStudent?.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < studentList.length - 1;

  const handlePrevStudent = () => {
    if (hasPrev) {
      const prevStudent = studentList[currentIndex - 1];
      setSelectedStudentId(prevStudent.id);
    }
  };

  const handleNextStudent = () => {
    if (hasNext) {
      const nextStudent = studentList[currentIndex + 1];
      setSelectedStudentId(nextStudent.id);
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
  }, [hasPrev, hasNext, currentIndex, studentList]);


  // Parents of the current student
  const studentParents = useMemo(() => {
    if (Array.isArray(currentStudent?.parents) && currentStudent.parents.length > 0) {
      return currentStudent.parents;
    }
    if (currentStudent?.parentName) {
      return [
        {
          id: 'primary',
          fullName: currentStudent.parentName,
          phone: currentStudent.parentPhone || '',
          relationship: currentStudent.parentRelationship || 'Phụ huynh',
        },
      ];
    }
    return [];
  }, [currentStudent]);

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

  if (isTeacher) {
    return <Navigate to={`/classes/${targetClassId}/students`} replace />;
  }

  return (
    <div className="min-h-screen bg-background pb-12">
      {/* 1. ADMIN PAGE HEADER - Clean, standard, matching other admin pages */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-[26px] font-semibold text-foreground tracking-tight">
              Báo cáo Học sinh
            </h1>
            <p className="text-[12px] text-muted-foreground font-normal">
              Hồ sơ theo dõi sức khỏe, chuyên cần và đánh giá hoạt động của học sinh
            </p>
          </div>
        </div>
      </div>

      {/* 2. ADMIN TOOLBAR - Student Selector (Design matching ClassCommandMenu) & Navigation */}
      <div className="border-b border-border bg-muted/20">
        <div className="container mx-auto px-4 py-2.5 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 shrink-0">
              <span className="text-xs font-medium text-muted-foreground shrink-0">Lớp:</span>
              <div className="relative shrink-0">
                <select
                  value={currentClass?.id || ''}
                  onChange={(e) => {
                    const newId = e.target.value;
                    const found = classes.find((c) => c.id === newId || c.publicId === newId);
                    if (found) {
                      attachClass(found.id);
                      setSelectedStudentId(null);
                      if (id) {
                        navigate(`/classes/${found.id}/reports`);
                      }
                    }
                  }}
                  className="inline-flex items-center justify-between border border-border bg-background hover:bg-muted/70 transition-colors h-8 px-2.5 rounded-none text-[13px] font-medium text-foreground cursor-pointer shadow-2xs select-none focus:outline-none"
                >
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} {cls.studentCount ? `(${cls.studentCount} HS)` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <span className="text-xs font-medium text-muted-foreground shrink-0 ml-1">Học sinh:</span>

              {/* Student Dropdown Command Menu (matching ClassCommandMenu design) */}
              <div className="relative shrink-0" ref={studentDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsStudentMenuOpen(!isStudentMenuOpen)}
                  className="inline-flex items-center justify-between border border-border bg-background hover:bg-muted/70 transition-colors h-8 px-3 gap-2 rounded-none text-[13px] font-medium text-foreground cursor-pointer shadow-2xs w-[200px] sm:w-[220px] select-none"
                  title="Chọn học sinh để xem báo cáo"
                >
                  <span className="truncate flex-1 text-left font-medium">
                    {currentStudent ? currentStudent.fullName : 'Chọn học sinh...'}
                  </span>
                  <HugeiconsIcon
                    icon={UnfoldMoreIcon}
                    size={14}
                    className="text-muted-foreground shrink-0"
                  />
                </button>

                {/* Dropdown Menu matching ClassCommandMenu design */}
                {isStudentMenuOpen && (
                  <div
                    className="absolute top-full left-0 mt-1.5 w-[320px] sm:w-[360px] bg-card border border-border shadow-xl z-50 rounded-none overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100"
                  >
                    {/* Search Bar with Esc shortcut badge */}
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-background">
                      <HugeiconsIcon
                        icon={Search01Icon}
                        size={15}
                        className="text-muted-foreground shrink-0"
                      />
                      <input
                        type="text"
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                        placeholder="Tìm học sinh theo tên, mã HS..."
                        autoFocus
                        className="flex-1 bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground outline-none border-0 focus:outline-none focus:border-0 focus:ring-0 shadow-none"
                      />
                      <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground bg-muted border border-border rounded-none">
                        Esc
                      </kbd>
                    </div>

                    {/* Students List */}
                    <div className="max-h-[280px] overflow-y-auto p-1 divide-y divide-border/30">
                      {filteredStudents.length === 0 ? (
                        <div className="p-4 text-center text-[13px] text-muted-foreground">
                          Không tìm thấy học sinh phù hợp.
                        </div>
                      ) : (
                        filteredStudents.map((st) => {
                          const isSelected = st.id === currentStudent?.id;
                          return (
                            <button
                              key={st.id}
                              type="button"
                              onClick={() => {
                                setSelectedStudentId(st.id);
                                setIsStudentMenuOpen(false);
                                setStudentSearch('');
                              }}
                              className={cn(
                                'w-full flex items-center gap-3 px-2.5 py-2 text-left rounded-none transition-colors cursor-pointer text-[13px]',
                                isSelected
                                  ? 'bg-muted text-foreground font-medium'
                                  : 'hover:bg-muted/60 text-foreground'
                              )}
                            >
                              <img
                                src={st.avatarUrl}
                                alt={st.fullName}
                                className="size-7 rounded-none border border-border/60 bg-muted object-cover shrink-0"
                              />
                              <div className="flex flex-col min-w-0 flex-1 leading-tight">
                                <span className="truncate font-medium">{st.fullName}</span>
                                <span className="text-[11px] text-muted-foreground truncate">
                                  {st.studentCode} · {st.gender}
                                  {st.dateOfBirth ? ` · ${calculateAge(st.dateOfBirth)}` : ''}
                                </span>
                              </div>
                              {isSelected && (
                                <HugeiconsIcon
                                  icon={Tick02Icon}
                                  size={15}
                                  className="text-primary shrink-0"
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

              {/* Prev / Next buttons */}
              <div className="flex items-center border border-border bg-card rounded-none h-8 shrink-0">
                <button
                  type="button"
                  onClick={handlePrevStudent}
                  disabled={!hasPrev || isLoading}
                  title="Học sinh trước (Phím ←)"
                  className="size-8 flex items-center justify-center border-r border-border text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  <HugeiconsIcon icon={ArrowLeft02Icon} size={14} />
                </button>
                <button
                  type="button"
                  onClick={handleNextStudent}
                  disabled={!hasNext || isLoading}
                  title="Học sinh tiếp theo (Phím →)"
                  className="size-8 flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  <HugeiconsIcon icon={ArrowRight02Icon} size={14} />
                </button>
              </div>

              {studentList.length > 0 && currentIndex >= 0 && (
                <span className="text-xs text-muted-foreground font-mono tabular-nums shrink-0 min-w-[44px] text-left">
                  {currentIndex + 1} / {studentList.length}
                </span>
              )}
            </div>

            {/* Right: Semester Switcher (Học kỳ 1 | Học kỳ 2) + Date Range Badge */}
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center p-0.5 border border-border bg-background rounded-none shrink-0 shadow-2xs">
                <button
                  type="button"
                  onClick={() => handleSemesterChange('SEMESTER_1')}
                  className={cn(
                    'h-7 px-2.5 text-[12px] font-medium transition-all rounded-none cursor-pointer',
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
                    'h-7 px-2.5 text-[12px] font-medium transition-all rounded-none',
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

              {/* Semester Date Range Badge - Brought down from header */}
              <div className="inline-flex items-center gap-1.5 px-2.5 h-8 border border-border bg-background font-mono text-[11.5px] text-muted-foreground shadow-2xs">
                <HugeiconsIcon icon={Calendar03Icon} size={13} className="text-muted-foreground" />
                <span>{activeDateRangeLabel}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. MAIN CONTENT BODY */}
      <main className="container mx-auto px-4 pt-5 sm:px-6 space-y-5">
        {isLoading && !reportData ? (
          <div className="border border-border bg-card p-12 text-center text-xs text-muted-foreground">
            Đang tải dữ liệu hồ sơ học sinh...
          </div>
        ) : !currentStudent ? (
          <div className="border border-border bg-card p-12 text-center text-xs text-muted-foreground">
            Không tìm thấy học sinh nào trong lớp học này.
          </div>
        ) : (
          <>
            {/* STUDENT SUMMARY HERO CARD - Clean, flat, structured */}
            <div className="border border-border bg-card p-4 sm:p-5 rounded-none">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                {/* Left: Avatar & Identity Details */}
                <div className="flex items-start sm:items-center gap-3.5">
                  <img
                    src={currentStudent.avatarUrl}
                    alt={currentStudent.fullName}
                    className="size-14 rounded-none border border-border bg-muted object-cover shrink-0"
                  />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-semibold text-foreground tracking-tight">
                        {currentStudent.fullName}
                      </h2>
                      <span className="text-xs font-mono text-muted-foreground bg-muted/60 px-1.5 py-0.5">
                        {currentStudent.studentCode}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({currentStudent.gender})
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>
                        Ngày sinh:{' '}
                        <span className="text-foreground font-medium">
                          {currentStudent.dateOfBirth
                            ? new Date(currentStudent.dateOfBirth).toLocaleDateString('vi-VN')
                            : 'Chưa có'}
                        </span>
                        {calculateAge(currentStudent.dateOfBirth) && (
                          <span className="text-muted-foreground ml-1">
                            ({calculateAge(currentStudent.dateOfBirth)})
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: 3 Metric KPI Panels */}
                <div className="flex flex-wrap items-center gap-2.5 border-t border-border pt-3 lg:border-t-0 lg:pt-0">
                  <button
                    type="button"
                    onClick={() => setActiveTab('health')}
                    className={cn(
                      'border border-border px-3 py-2 text-left rounded-none transition-colors cursor-pointer min-w-[140px]',
                      activeTab === 'health'
                        ? 'bg-muted border-foreground/40'
                        : 'bg-background hover:bg-muted/40'
                    )}
                  >
                    <div className="text-[11px] text-muted-foreground uppercase tracking-wider">
                      Sức khỏe ({healthData.totalChecks} đợt)
                    </div>
                    <div className="text-xs font-medium text-foreground mt-0.5">
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
                    onClick={() => setActiveTab('attendance')}
                    className={cn(
                      'border border-border px-3 py-2 text-left rounded-none transition-colors cursor-pointer min-w-[140px]',
                      activeTab === 'attendance'
                        ? 'bg-muted border-foreground/40'
                        : 'bg-background hover:bg-muted/40'
                    )}
                  >
                    <div className="text-[11px] text-muted-foreground uppercase tracking-wider">
                      Chuyên cần ({attendanceData.attendanceRate}%)
                    </div>
                    <div className="text-xs font-medium text-foreground mt-0.5">
                      {attendanceData.presentCount}/{attendanceData.totalDays} buổi có mặt
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('assessments')}
                    className={cn(
                      'border border-border px-3 py-2 text-left rounded-none transition-colors cursor-pointer min-w-[140px]',
                      activeTab === 'assessments'
                        ? 'bg-muted border-foreground/40'
                        : 'bg-background hover:bg-muted/40'
                    )}
                  >
                    <div className="text-[11px] text-muted-foreground uppercase tracking-wider">
                      Đánh giá ({assessmentsData.totalAssessed} tiết)
                    </div>
                    <div className="text-xs font-medium text-foreground mt-0.5">
                      {assessmentsData.achievedCount} Đạt · {assessmentsData.outstandingCount} Vượt trội
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('authorizations')}
                    className={cn(
                      'border border-border px-3 py-2 text-left rounded-none transition-colors cursor-pointer min-w-[140px]',
                      activeTab === 'authorizations'
                        ? 'bg-muted border-foreground/40'
                        : 'bg-background hover:bg-muted/40'
                    )}
                  >
                    <div className="text-[11px] text-muted-foreground uppercase tracking-wider">
                      Ủy quyền ({authorizationsData.total} đơn)
                    </div>
                    <div className="text-xs font-medium text-foreground mt-0.5">
                      {authorizationsData.approvedCount} Đã duyệt
                      {authorizationsData.pendingCount > 0 ? ` · ${authorizationsData.pendingCount} Chờ duyệt` : ''}
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* ADMIN TABS HEADER - Underline style */}
            <div className="border-b border-border flex items-center gap-6 text-[13px]">
              <button
                type="button"
                onClick={() => setActiveTab('health')}
                className={cn(
                  'py-2.5 font-medium border-b-2 -mb-px transition-colors cursor-pointer',
                  activeTab === 'health'
                    ? 'border-primary text-foreground font-semibold'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                Theo dõi Sức khỏe
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('attendance')}
                className={cn(
                  'py-2.5 font-medium border-b-2 -mb-px transition-colors cursor-pointer',
                  activeTab === 'attendance'
                    ? 'border-primary text-foreground font-semibold'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                Lịch sử Điểm danh
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('assessments')}
                className={cn(
                  'py-2.5 font-medium border-b-2 -mb-px transition-colors cursor-pointer',
                  activeTab === 'assessments'
                    ? 'border-primary text-foreground font-semibold'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                Đánh giá Hoạt động
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('parents')}
                className={cn(
                  'py-2.5 font-medium border-b-2 -mb-px transition-colors cursor-pointer whitespace-nowrap',
                  activeTab === 'parents'
                    ? 'border-primary text-foreground font-semibold'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                Phụ huynh & Giám hộ
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('authorizations')}
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

            {/* TAB 1: HEALTH ASSESSMENTS TABLE WITH CONSISTENT STATUS BADGES */}
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
                      {healthData.history.length === 0 ? (
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

            {/* TAB 2: ATTENDANCE HISTORY TABLE WITH CONSISTENT STATUS BADGES */}
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
                      {attendanceData.history.length === 0 ? (
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

            {/* TAB 3: DAILY ASSESSMENTS TABLE WITH CONSISTENT STATUS BADGES */}
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
                      {assessmentsData.history.length === 0 ? (
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

            {/* TAB 4: PARENTS & GUARDIANS TABLE */}
            {activeTab === 'parents' && (
              <div className="border border-border bg-card">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-border bg-muted/40 font-medium text-muted-foreground uppercase text-[11px] tracking-wider">
                      <tr>
                        <th className="px-4 py-2.5">Họ và tên</th>
                        <th className="px-4 py-2.5">Quan hệ với trẻ</th>
                        <th className="px-4 py-2.5">Số điện thoại</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {studentParents.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="py-8 text-center text-muted-foreground">
                            Chưa có thông tin phụ huynh hoặc người giám hộ cho học sinh này.
                          </td>
                        </tr>
                      ) : (
                        studentParents.map((p, idx) => (
                          <tr key={p.id || idx} className="transition-colors hover:bg-muted/30">
                            <td className="px-4 py-3 font-medium text-foreground">
                              {p.fullName || '—'}
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-none bg-muted text-foreground border border-border">
                                {p.relationship || 'Phụ huynh'}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-mono text-foreground font-medium">
                              {p.phone || '—'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 5: PICKUP AUTHORIZATIONS TABLE */}
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
                      {authorizationsData.history.length === 0 ? (
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

                            {/* Quan hệ (không để trong badge) */}
                            <td className="px-4 py-3 whitespace-nowrap text-foreground text-[12.5px] font-medium">
                              {auth.relationship}
                            </td>

                            {/* Số điện thoại (tách cột riêng) */}
                            <td className="px-4 py-3 whitespace-nowrap font-mono text-muted-foreground text-[12px]">
                              {auth.pickupPersonPhone || '—'}
                            </td>

                            {/* Thời gian hiệu lực (không để badge học kỳ) */}
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
          </>
        )}
      </main>

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
    </div>
  );
}

export default ClassOverviewPage;
