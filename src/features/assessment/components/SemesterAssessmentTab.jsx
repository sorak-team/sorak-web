import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Search01Icon,
  FloppyDiskIcon,
  Cancel01Icon,
  FilterHorizontalIcon,
  CheckmarkSquare02Icon,
  Menu01Icon,
  Calendar03Icon,
  SparklesIcon,
  SentIcon,
  CheckmarkCircle01Icon,
} from '@hugeicons/core-free-icons';
import { Info } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { cn } from '@/shared/lib/utils';
import { useAuthStore, isBghRole } from '@/features/auth';
import { assessmentApi } from '../assessment.api';
import { SemesterAssessmentDrawer } from './SemesterAssessmentDrawer';
import { resolveStudentHealthEvaluations, formatExamDateDescription, formatMeasurement } from '../assessment.utils';

const DOMAIN_TOTALS = {
  physical: 25,
  cognitive: 20,
  language: 18,
  socioEmotional: 20,
  aesthetic: 16,
};

export function SemesterAssessmentTab({ targetClassId, currentClass }) {
  const { t } = useTranslation();
  const currentUser = useAuthStore((state) => state.user);
  const isBgh = isBghRole(currentUser?.role);

  const [selectedSemester, setSelectedSemester] = useState('SEMESTER_1');
  const [classInfo, setClassInfo] = useState(null);
  const [students, setStudents] = useState([]);
  const [initialStudents, setInitialStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState(null);
  const autoSaveTimerRef = useRef(null);
  const isInitialLoadRef = useRef(true);

  // Load semester assessment data from backend (with quick cache hydration)
  const loadData = async (recalculate = false) => {
    const cacheKey = `sorak_semester_calc_${targetClassId}_${selectedSemester}`;

    if (recalculate) {
      setIsCalculating(true);
    } else if (students.length === 0) {
      setIsLoading(true);
    }

    try {
      const res = await assessmentApi.getSemesterAssessments(targetClassId, {
        semester: selectedSemester,
        recalculate,
      });
      const list = res?.students || [];
      const info = res?.classInfo || null;
      setClassInfo(info);
      setStudents(list);
      setInitialStudents(JSON.parse(JSON.stringify(list)));
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      setLastSavedTime(timeStr);
      isInitialLoadRef.current = false;

      // Save to localStorage for instant load next time
      try {
        localStorage.setItem(
          cacheKey,
          JSON.stringify({
            classInfo: info,
            students: list,
            cachedAt: new Date().toISOString(),
          })
        );
      } catch (err) {
        console.warn('LocalStorage save failed:', err);
      }

      if (recalculate) {
        const untilDate = info?.calculatedUntilVN || '14/10/2026';
        const fromDate = info?.calculatedFromVN || '07/09/2026';
        toast.success(`Đã tính toán thành công dữ liệu học kỳ từ ngày ${fromDate} đến ngày ${untilDate}!`);
      }
    } catch (err) {
      console.warn('Failed to load semester assessment data:', err);
      if (recalculate) {
        toast.error('Không thể tính toán dữ liệu học kỳ. Vui lòng thử lại.');
      }
    } finally {
      setIsLoading(false);
      setIsCalculating(false);
    }
  };

  useEffect(() => {
    loadData(false);
  }, [targetClassId, selectedSemester]);

  // Track dirty state: has anything changed from initial data?
  const isDirty = useMemo(() => {
    if (students.length === 0 || initialStudents.length === 0) return false;
    if (students.length !== initialStudents.length) return true;
    for (let i = 0; i < students.length; i++) {
      const cur = students[i];
      const init = initialStudents[i];
      if (!init || cur.id !== init.id) return true;
      if ((cur.teacherNotes || '') !== (init.teacherNotes || '')) {
        return true;
      }
    }
    return false;
  }, [students, initialStudents]);

  // Check if all students in class have completed evaluation comments
  const isAllEvaluated = useMemo(() => {
    if (!students || students.length === 0) return false;
    return students.every((s) => s.isEvaluated || Boolean(s.teacherNotes?.trim()));
  }, [students]);

  // Handle inline teacher comment change
  const handleNotesChange = (studentId, teacherNotes) => {
    setStudents((prev) =>
      prev.map((s) => {
        if (s.id !== studentId) return s;
        return {
          ...s,
          teacherNotes,
          isEvaluated: Boolean(teacherNotes?.trim()),
        };
      })
    );
  };

  // Handle clear teacher comment for a student (with undo toast)
  const handleClearNotes = (studentId) => {
    const student = students.find((s) => s.id === studentId);
    if (!student?.teacherNotes?.trim()) return;

    const previousNotes = student.teacherNotes;
    setStudents((prev) =>
      prev.map((s) => {
        if (s.id !== studentId) return s;
        return {
          ...s,
          teacherNotes: '',
          isEvaluated: false,
        };
      })
    );

    toast.success(`Đã xóa nhận xét của ${student.name}!`, {
      action: {
        label: 'Hoàn tác',
        onClick: () => {
          setStudents((prev) =>
            prev.map((s) => {
              if (s.id !== studentId) return s;
              return {
                ...s,
                teacherNotes: previousNotes,
                isEvaluated: true,
              };
            })
          );
        },
      },
    });
  };

  // Save all modifications
  const handleSaveAll = async () => {
    if (!isDirty) return;
    setIsSavingAll(true);
    try {
      await assessmentApi.saveSemesterAssessments(targetClassId, {
        semester: selectedSemester,
        records: students.map((s) => ({
          studentId: s.id,
          teacherNotes: s.teacherNotes || '',
        })),
      });
      setInitialStudents(JSON.parse(JSON.stringify(students)));
      // Update local cache
      try {
        const cacheKey = `sorak_semester_calc_${targetClassId}_${selectedSemester}`;
        localStorage.setItem(
          cacheKey,
          JSON.stringify({
            classInfo,
            students,
            cachedAt: new Date().toISOString(),
          })
        );
      } catch (err) {
        console.warn('LocalStorage save failed:', err);
      }
      const semLabel = selectedSemester === 'SEMESTER_2' ? 'Học kỳ 2' : 'Học kỳ 1';
      toast.success(`Đã lưu thành công đánh giá cuối ${semLabel}!`);
    } catch {
      toast.error('Không thể lưu đánh giá học kỳ. Vui lòng thử lại.');
    } finally {
      setIsSavingAll(false);
    }
  };

  // Toggle publish semester assessment
  const handleTogglePublish = async () => {
    if (isBgh || !classInfo?.isStarted) return;
    const isCurrentlyPublished = Boolean(classInfo?.isPublished);
    const nextPublished = !isCurrentlyPublished;
    const semLabel = selectedSemester === 'SEMESTER_2' ? 'Học kỳ 2' : 'Học kỳ 1';
    setIsPublishing(true);
    try {
      const res = await assessmentApi.publishSemesterAssessments(targetClassId, {
        semester: selectedSemester,
        isPublished: nextPublished,
      });
      setClassInfo((prev) => ({ ...prev, isPublished: nextPublished }));
      setStudents((prev) => prev.map((s) => ({ ...s, isPublished: nextPublished })));
      toast.success(
        res?.message || (nextPublished ? `Đã công bố kết quả ${semLabel} cho cả lớp!` : `Đã gỡ công bố kết quả ${semLabel}.`)
      );
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Không thể thay đổi trạng thái công bố.');
    } finally {
      setIsPublishing(false);
    }
  };

  // Auto-save effect: automatically persists changes when teacher modifies comments
  useEffect(() => {
    if (isInitialLoadRef.current || !isDirty || isBgh || !classInfo?.isStarted) {
      return;
    }

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(async () => {
      setIsSavingAll(true);
      try {
        await assessmentApi.saveSemesterAssessments(targetClassId, {
          semester: selectedSemester,
          records: students.map((s) => ({
            studentId: s.id,
            teacherNotes: s.teacherNotes || '',
          })),
        });
        setInitialStudents(JSON.parse(JSON.stringify(students)));
        try {
          const cacheKey = `sorak_semester_calc_${targetClassId}_${selectedSemester}`;
          localStorage.setItem(
            cacheKey,
            JSON.stringify({
              classInfo,
              students,
              cachedAt: new Date().toISOString(),
            })
          );
        } catch {}

        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
        setLastSavedTime(timeStr);
      } catch (err) {
        console.warn('Auto-save semester assessment failed:', err);
      } finally {
        setIsSavingAll(false);
      }
    }, 600);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [students, isDirty, targetClassId, selectedSemester, isBgh, classInfo?.isStarted]);

  // Filtering
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q);

      let matchesStatus = true;
      if (statusFilter === 'EVALUATED') {
        matchesStatus = s.isEvaluated;
      } else if (statusFilter === 'NOT_EVALUATED') {
        matchesStatus = !s.isEvaluated;
      }

      return matchesSearch && matchesStatus;
    });
  }, [students, searchQuery, statusFilter]);

  const semesterLabel = selectedSemester === 'SEMESTER_2' ? 'Học kỳ 2' : 'Học kỳ 1';

  // DB-derived date range label
  const semesterDateRange =
    classInfo?.semesterDates?.dateRangeLabel ||
    (selectedSemester === 'SEMESTER_1' ? '05/09/2026 – 15/01/2027' : '16/01/2027 – 31/05/2027');

  const academicYearLabel = classInfo?.academicYear || 'Năm học 2026–2027';

  const getHealthStatusLabel = (status) => {
    if (!status || status === 'Chưa đánh giá') return t('health.notEvaluated', 'Chưa đánh giá');
    const clean = String(status)
      .replace(/\s*\(Đạt chuẩn WHO\)/gi, '')
      .replace(/\s*Đạt chuẩn WHO/gi, '')
      .trim();
    if (clean === 'Bình thường' || clean.toLowerCase() === 'bình thường') return t('health.statusNormal', 'Bình thường');
    if (clean === 'Theo dõi nhẹ cân') return t('health.statusUnderweight', 'Theo dõi nhẹ cân');
    if (clean === 'Theo dõi thừa cân/béo phì') return t('health.statusOverweight', 'Theo dõi thừa cân/béo phì');
    if (clean === 'Theo dõi thấp còi') return t('health.statusStunted', 'Theo dõi thấp còi');
    if (clean === 'Theo dõi suy dinh dưỡng') return t('health.statusMalnutrition', 'Theo dõi suy dinh dưỡng');
    if (clean === 'Nguy cơ thừa cân') return t('health.statusOverweightRisk', 'Nguy cơ thừa cân');
    return clean;
  };

  const getHealthBadgeClass = (status) => {
    const raw = String(status || '').trim();
    const clean = raw
      .replace(/\s*\(Đạt chuẩn WHO\)/gi, '')
      .replace(/\s*Đạt chuẩn WHO/gi, '')
      .trim();

    if (!clean || clean === 'Chưa đánh giá' || clean === '--') {
      return 'bg-muted/70 text-muted-foreground border border-border/60';
    }

    if (
      clean === 'Bình thường' ||
      clean === 'Tốt' ||
      clean.toLowerCase() === 'bình thường' ||
      clean.includes('Bình thường')
    ) {
      return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60';
    }

    if (
      clean.includes('độ 2') ||
      clean.includes('nặng') ||
      clean.includes('Béo phì') ||
      clean.includes('Thừa cân')
    ) {
      return 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/60';
    }

    return 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60';
  };

  const filterOptions = [
    { key: 'ALL', label: t('assessment.filterAllStatus', 'Tất cả trạng thái') },
    { key: 'EVALUATED', label: t('assessment.filterEvaluated', 'Đã nhận xét') },
    { key: 'NOT_EVALUATED', label: t('assessment.filterNotEvaluated', 'Chưa nhận xét') },
  ];

  return (
    <div className="flex-1 flex flex-row min-h-0 overflow-hidden relative">
      <div className="flex-1 flex flex-col gap-5 select-none overflow-y-auto pr-0.5">
        {/* 1. Page Header (Strictly matching StudentsPage) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-[26px] font-semibold text-foreground tracking-tight flex items-center gap-2.5">
              <span>
                {selectedSemester === 'SEMESTER_2'
                  ? t('assessment.semesterDrawerTitle2', 'Đánh giá học kỳ 2')
                  : t('assessment.semesterDrawerTitle1', 'Đánh giá học kỳ 1')}
              </span>
              <span
                className={cn(
                  'text-[12px] font-medium px-2 py-0.5 border rounded-none shrink-0 select-none tracking-normal',
                  classInfo?.isPublished
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                    : 'bg-muted/60 text-muted-foreground border-border'
                )}
              >
                {classInfo?.isPublished ? 'Đã công bố' : 'Bản nháp'}
              </span>
            </h1>
            <p className="text-[12px] text-muted-foreground font-normal">
              {t('assessment.semesterDesc', 'Đánh giá mức độ đạt chuẩn phát triển của trẻ theo 5 lĩnh vực giáo dục cuối học kỳ')}
            </p>
          </div>

          {/* View Actions Toolbar (Strictly follows Sorak Design System) */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Search Input */}
            <div className="relative w-[260px] h-8">
              <HugeiconsIcon
                icon={Search01Icon}
                size={15}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('students.searchPlaceholder', 'Tìm kiếm học sinh...')}
                className="w-full h-8 pl-8 pr-7 text-[13px] bg-background border border-border rounded-none shadow-none focus:outline-none focus:border-primary"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <HugeiconsIcon icon={Cancel01Icon} size={12} />
                </button>
              )}
            </div>

            {/* Filter Dropdown Icon Button (Matching StudentFilterDropdown) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    'size-8 bg-background border border-border text-foreground hover:bg-muted/50 rounded-none flex items-center justify-center transition-colors cursor-pointer select-none',
                    statusFilter !== 'ALL' && 'border-primary text-primary bg-primary/5'
                  )}
                  title={t('common.filter', 'Bộ lọc trạng thái')}
                >
                  <HugeiconsIcon icon={FilterHorizontalIcon} size={16} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-48 p-1 rounded-none border border-border bg-card shadow-xl z-50 text-foreground"
              >
                <DropdownMenuLabel className="text-[12px] font-semibold text-muted-foreground px-2 py-1">
                  {t('assessment.evaluationStatus', 'Trạng thái đánh giá')}
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-border/60" />
                {filterOptions.map((opt) => (
                  <DropdownMenuItem
                    key={opt.key}
                    onClick={() => setStatusFilter(opt.key)}
                    className={cn(
                      'flex items-center justify-between h-8 px-2 text-[13px] cursor-pointer rounded-none hover:bg-muted/60',
                      statusFilter === opt.key && 'font-medium text-primary'
                    )}
                  >
                    <span>{opt.label}</span>
                    {statusFilter === opt.key && (
                      <HugeiconsIcon icon={CheckmarkSquare02Icon} size={14} className="text-primary" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* View Mode Icon Button (Table view, matching StudentsPage) */}
            <div className="flex items-center border border-border bg-card rounded-none overflow-hidden h-8">
              <button
                type="button"
                className="size-8 p-0 flex items-center justify-center bg-muted text-foreground cursor-default rounded-none"
                title={t('common.tableView', 'Dạng bảng')}
              >
                <HugeiconsIcon icon={Menu01Icon} size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* 2. Controls Toolbar Row: Segmented Semester Selector + DB Dates Badge + Calculation Badge + Calculate Button + Save Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2 flex-wrap">
            {/* 1. Chọn học kỳ (Segmented Control) */}
            <div className="flex items-center border border-border bg-muted/40 p-0.5 rounded-none shrink-0">
              <button
                type="button"
                onClick={() => setSelectedSemester('SEMESTER_1')}
                className={cn(
                  'h-7 px-3 text-[12.5px] font-medium transition-all rounded-none cursor-pointer',
                  selectedSemester === 'SEMESTER_1'
                    ? 'bg-background text-foreground shadow-xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {t('assessment.semester1', 'Học kỳ 1')}
              </button>
              <button
                type="button"
                onClick={() => setSelectedSemester('SEMESTER_2')}
                className={cn(
                  'h-7 px-3 text-[12.5px] font-medium transition-all rounded-none cursor-pointer',
                  selectedSemester === 'SEMESTER_2'
                    ? 'bg-background text-foreground shadow-xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {t('assessment.semester2', 'Học kỳ 2')}
              </button>
            </div>

            {/* 2. Thể hiện thời gian kỳ & dữ liệu tính toán gọn gàng trong 1 hộp */}
            <div className="flex items-center gap-2 px-3 h-8 border border-border bg-muted/20 text-[12.5px] text-foreground shrink-0 rounded-none">
              <HugeiconsIcon icon={Calendar03Icon} size={14} className="text-muted-foreground shrink-0" />
              <span className="font-mono text-muted-foreground">{semesterDateRange}</span>
              {classInfo?.isStarted ? (
                <>
                  <span className="text-border">|</span>
                  <span className="text-muted-foreground">Tính đến:</span>
                  <span className="font-medium font-mono text-foreground">
                    {classInfo?.calculatedUntilVN || '14/10/2026'}
                  </span>
                  <span className="text-[11.5px] text-muted-foreground">
                    ({classInfo?.totalSchoolDays || 28} ngày)
                  </span>
                </>
              ) : (
                <>
                  <span className="text-border">|</span>
                  <span className="text-[11.5px] text-muted-foreground">Chưa bắt đầu</span>
                </>
              )}
            </div>

            {/* 3. Nút Tính toán */}
            <Button
              type="button"
              onClick={() => loadData(true)}
              disabled={!classInfo?.isStarted || isCalculating}
              variant="outline"
              className={cn(
                'h-8 px-2.5 text-[12.5px] font-medium rounded-none shadow-none flex items-center gap-1.5 transition-colors shrink-0',
                classInfo?.isStarted
                  ? 'border-border hover:bg-muted text-foreground cursor-pointer'
                  : 'border-border text-muted-foreground/40 cursor-not-allowed opacity-50'
              )}
              title={
                !classInfo?.isStarted
                  ? 'Học kỳ chưa bắt đầu, chưa có dữ liệu để tính toán'
                  : 'Bấm để tính toán và cập nhật dữ liệu đánh giá đến ngày hiện tại'
              }
            >
              <HugeiconsIcon
                icon={SparklesIcon}
                size={14}
                className={cn('text-muted-foreground', isCalculating && 'animate-spin')}
              />
              <span>{isCalculating ? 'Đang tính...' : 'Tính toán'}</span>
            </Button>
          </div>

          {/* 4. Action: Save Status Indicator & Publish CTA */}
          {isBgh ? (
            <div className="h-8 px-3 text-[12px] font-medium bg-muted/40 border border-border flex items-center gap-1.5 text-muted-foreground shrink-0 select-none">
              <span className="size-1.5 rounded-full bg-primary" />
              <span>{t('assessment.bghViewOnly', 'Chế độ xem (Ban Giám Hiệu)')}</span>
            </div>
          ) : (
            <div className="flex items-center gap-3 shrink-0 select-none">
              {lastSavedTime && (
                <span className="text-[11.5px] text-muted-foreground/70 shrink-0 font-sans tracking-tight">
                  Đã lưu lúc <span className="font-mono text-muted-foreground font-medium">{lastSavedTime}</span>
                </span>
              )}

              {/* Single Clean Publish Button - Pure text, fixed width & smooth transition */}
              {classInfo?.isPublished ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsConfirmModalOpen(true)}
                  disabled={isPublishing}
                  className="h-8 w-[118px] px-2 text-[12.5px] font-medium justify-center text-center rounded-none border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/15 cursor-pointer shadow-none shrink-0 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ease-in-out select-none"
                  title="Kết quả học kỳ đã được công bố cho phụ huynh. Bấm để gỡ công bố"
                >
                  {isPublishing ? 'Đang xử lý...' : 'Đã công bố'}
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsConfirmModalOpen(true)}
                  disabled={isPublishing || !classInfo?.isStarted}
                  className={cn(
                    'h-8 w-[118px] px-2 text-[12.5px] justify-center text-center rounded-none cursor-pointer shadow-none shrink-0 transition-all duration-200 ease-in-out select-none',
                    isAllEvaluated
                      ? 'border-primary/50 bg-primary/10 text-primary hover:bg-primary/20 font-semibold'
                      : 'border-border bg-card hover:bg-muted text-foreground font-medium disabled:opacity-40 disabled:cursor-not-allowed'
                  )}
                  title={
                    !classInfo?.isStarted
                      ? 'Học kỳ chưa bắt đầu'
                      : isAllEvaluated
                      ? 'Tất cả học sinh đã có nhận xét. Bấm để công bố kết quả cho phụ huynh'
                      : 'Công bố kết quả học kỳ này cho phụ huynh'
                  }
                >
                  {isPublishing ? 'Đang xử lý...' : 'Công bố kết quả'}
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Thông báo Học kỳ 2 chưa bắt đầu */}
        {!classInfo?.isStarted && (
          <div className="px-3.5 py-2.5 border border-border bg-muted/20 text-muted-foreground text-[12.5px] rounded-none">
            <span className="font-semibold text-foreground">Học kỳ 2 chưa bắt đầu</span> (Thời gian năm học: {semesterDateRange}). Dữ liệu chuyên cần và đánh giá 5 lĩnh vực phát triển sẽ được tính toán khi học kỳ chính thức diễn ra.
          </div>
        )}

        {/* 3. Students Evaluation Table: 5 Domains + % Đi học đủ + Sức khỏe + Nhận xét GV */}
        <div className="w-full border border-border bg-card rounded-none overflow-x-auto shadow-xs select-none">
          <table className="w-full text-left border-collapse">
            <thead>
              {/* Top Header Row with Grouped Domains */}
              <tr className="border-b border-border bg-muted/40 text-[12.5px] font-semibold text-foreground">
                <th rowSpan={2} className="px-3 py-2.5 w-[170px] min-w-[150px] border-r border-border/60 text-left font-semibold">
                  {t('students.student', 'Học sinh')}
                </th>
                <th colSpan={5} className="px-2 py-2 text-center border-r border-border/60 bg-muted/60 font-semibold">
                  {t('assessment.fiveDomainsTitle', 'Mục tiêu đạt được theo 5 lĩnh vực phát triển')}
                </th>
                <th rowSpan={2} className="px-2 py-2.5 w-[76px] min-w-[68px] text-center border-r border-border/60 font-semibold">
                  {t('assessment.attendanceFull', 'Đi học đủ')}
                </th>
                <th colSpan={2} className="px-2 py-2 text-center border-r border-border/60 bg-muted/60 font-semibold">
                  {t('health.title', 'Theo dõi sức khỏe')}
                </th>
                <th rowSpan={2} className="px-3 py-2.5 min-w-[180px] text-left font-semibold">
                  {t('assessment.teacherNotes', 'Nhận xét giáo viên')}
                </th>
              </tr>
              {/* Sub-header row for 5 Developmental Domains & Health Indicators */}
              <tr className="border-b border-border bg-muted/25 text-[11.5px] font-medium text-muted-foreground text-center">
                <th className="px-1.5 py-1.5 w-[65px] min-w-[58px] border-r border-border/60 font-medium">
                  {t('domains.physical', 'Thể chất')}
                </th>
                <th className="px-1.5 py-1.5 w-[65px] min-w-[58px] border-r border-border/60 font-medium">
                  {t('domains.cognitive', 'Nhận thức')}
                </th>
                <th className="px-1.5 py-1.5 w-[65px] min-w-[58px] border-r border-border/60 font-medium">
                  {t('domains.language', 'Ngôn ngữ')}
                </th>
                <th className="px-1.5 py-1.5 w-[70px] min-w-[64px] border-r border-border/60 font-medium">
                  {t('domains.socialEmotionalShort', 'TC - KNXH')}
                </th>
                <th className="px-1.5 py-1.5 w-[65px] min-w-[58px] border-r border-border/60 font-medium">
                  {t('domains.aesthetic', 'Thẩm mỹ')}
                </th>
                <th className="px-2 py-1.5 w-[155px] min-w-[145px] border-r border-border/60 font-medium">
                  {t('health.heightColumn', 'Chiều cao')}
                </th>
                <th className="px-2 py-1.5 w-[155px] min-w-[145px] border-r border-border/60 font-medium">
                  {t('health.weightColumn', 'Cân nặng')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading && students.length === 0 ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="h-[68px] animate-pulse">
                    <td className="px-3.5 border-r border-border/40">
                      <div className="flex items-center gap-3">
                        <div className="size-8 bg-muted/60 rounded-none shrink-0" />
                        <div className="flex flex-col gap-1 min-w-0 flex-1">
                          <div className="h-3.5 w-28 bg-muted/60 rounded-none" />
                          <div className="h-2.5 w-16 bg-muted/40 rounded-none" />
                        </div>
                      </div>
                    </td>
                    <td colSpan={5} className="px-2 border-r border-border/40">
                      <div className="h-4 bg-muted/30 rounded-none mx-auto w-3/4" />
                    </td>
                    <td className="px-3 border-r border-border/40">
                      <div className="h-4 bg-muted/30 rounded-none mx-auto w-12" />
                    </td>
                    <td className="px-2.5 border-r border-border/40">
                      <div className="h-4 bg-muted/30 rounded-none mx-auto w-16" />
                    </td>
                    <td className="px-2.5 border-r border-border/40">
                      <div className="h-4 bg-muted/30 rounded-none mx-auto w-16" />
                    </td>
                    <td className="px-3">
                      <div className="h-4 bg-muted/30 rounded-none" />
                    </td>
                  </tr>
                ))
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-muted-foreground text-[13px]">
                    {t('students.noStudentsFound', 'Không tìm thấy học sinh nào phù hợp.')}
                  </td>
                </tr>
              ) : (
                filteredStudents.map((st) => {
                  const isRowSelected = selectedStudent?.id === st.id;

                  return (
                    <tr
                      key={st.id}
                      className={cn(
                        'h-[68px] hover:bg-muted/40 transition-colors group cursor-default',
                        isRowSelected && 'bg-blue-50/20 dark:bg-blue-950/20'
                      )}
                    >
                      {/* 1. Học sinh: Avatar + Tên + Mã (Click to open Drawer) */}
                      <td className="px-3.5 border-r border-border/60">
                        <div
                          onClick={() => setSelectedStudent(st)}
                          className="flex items-center gap-3 cursor-pointer group/name"
                        >
                          <div className="size-8 shrink-0 rounded-none overflow-hidden border border-border/80 bg-muted/40">
                            <img
                              src={`https://api.dicebear.com/10.x/critters/svg?seed=${encodeURIComponent(st.code)}&backgroundColor=ff2e63,00c2a8,ffb300,3d5afe,8e24aa,00e676`}
                              alt={st.name}
                              className="size-full object-cover"
                            />
                          </div>
                          <div className="flex flex-col min-w-0 leading-tight">
                            <span className="text-[13.5px] font-medium text-foreground group-hover/name:text-primary transition-colors truncate">
                              {st.name}
                            </span>
                            <span className="text-[11.5px] text-muted-foreground truncate font-mono">
                              {st.code}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 2-6. 5 Lĩnh vực phát triển: Hiển thị "Chưa có dữ liệu đánh giá" nếu chưa đánh giá mục tiêu */}
                      {!Boolean(
                        st.hasEvaluatedGoals ||
                        (st.domains?.physical !== null && st.domains?.physical !== undefined) ||
                        (st.domains?.cognitive !== null && st.domains?.cognitive !== undefined) ||
                        (st.domains?.language !== null && st.domains?.language !== undefined) ||
                        (st.domains?.socioEmotional !== null && st.domains?.socioEmotional !== undefined) ||
                        (st.domains?.aesthetic !== null && st.domains?.aesthetic !== undefined)
                      ) ? (
                        <td colSpan={5} className="px-3 py-2 text-center border-r border-border/60 bg-muted/5">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11.5px] font-medium text-muted-foreground bg-muted/50 border border-border/60 select-none">
                            {t('assessment.noEvaluationData', 'Chưa có dữ liệu đánh giá')}
                          </span>
                        </td>
                      ) : (
                        <>
                          {/* 2. % Thể chất */}
                          <td className="px-2 py-2 text-center border-r border-border/60">
                            {st.domains?.physical !== null && st.domains?.physical !== undefined ? (
                              <div className="flex flex-col items-center justify-center">
                                <span
                                  className={cn(
                                    'font-mono text-[12.5px] font-semibold leading-tight',
                                    st.domains.physical >= 90
                                      ? 'text-emerald-600 dark:text-emerald-400'
                                      : 'text-foreground'
                                  )}
                                >
                                  {st.domains.physical}%
                                </span>
                                <span className="text-[10.5px] font-mono text-muted-foreground leading-tight">
                                  {st.domainBreakdown?.physical?.achieved ?? Math.round((st.domains.physical / 100) * DOMAIN_TOTALS.physical)}/{st.domainBreakdown?.physical?.total || DOMAIN_TOTALS.physical}
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground/40 font-mono text-[13px]">—</span>
                            )}
                          </td>

                          {/* 3. % Nhận thức */}
                          <td className="px-2 py-2 text-center border-r border-border/60">
                            {st.domains?.cognitive !== null && st.domains?.cognitive !== undefined ? (
                              <div className="flex flex-col items-center justify-center">
                                <span
                                  className={cn(
                                    'font-mono text-[12.5px] font-semibold leading-tight',
                                    st.domains.cognitive >= 90
                                      ? 'text-emerald-600 dark:text-emerald-400'
                                      : 'text-foreground'
                                  )}
                                >
                                  {st.domains.cognitive}%
                                </span>
                                <span className="text-[10.5px] font-mono text-muted-foreground leading-tight">
                                  {st.domainBreakdown?.cognitive?.achieved ?? Math.round((st.domains.cognitive / 100) * DOMAIN_TOTALS.cognitive)}/{st.domainBreakdown?.cognitive?.total || DOMAIN_TOTALS.cognitive}
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground/40 font-mono text-[13px]">—</span>
                            )}
                          </td>

                          {/* 4. % Ngôn ngữ */}
                          <td className="px-2 py-2 text-center border-r border-border/60">
                            {st.domains?.language !== null && st.domains?.language !== undefined ? (
                              <div className="flex flex-col items-center justify-center">
                                <span
                                  className={cn(
                                    'font-mono text-[12.5px] font-semibold leading-tight',
                                    st.domains.language >= 90
                                      ? 'text-emerald-600 dark:text-emerald-400'
                                      : 'text-foreground'
                                  )}
                                >
                                  {st.domains.language}%
                                </span>
                                <span className="text-[10.5px] font-mono text-muted-foreground leading-tight">
                                  {st.domainBreakdown?.language?.achieved ?? Math.round((st.domains.language / 100) * DOMAIN_TOTALS.language)}/{st.domainBreakdown?.language?.total || DOMAIN_TOTALS.language}
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground/40 font-mono text-[13px]">—</span>
                            )}
                          </td>

                          {/* 5. % Tình cảm & Kỹ năng xã hội */}
                          <td className="px-2 py-2 text-center border-r border-border/60">
                            {st.domains?.socioEmotional !== null && st.domains?.socioEmotional !== undefined ? (
                              <div className="flex flex-col items-center justify-center">
                                <span
                                  className={cn(
                                    'font-mono text-[12.5px] font-semibold leading-tight',
                                    st.domains.socioEmotional >= 90
                                      ? 'text-emerald-600 dark:text-emerald-400'
                                      : 'text-foreground'
                                  )}
                                >
                                  {st.domains.socioEmotional}%
                                </span>
                                <span className="text-[10.5px] font-mono text-muted-foreground leading-tight">
                                  {st.domainBreakdown?.socioEmotional?.achieved ?? Math.round((st.domains.socioEmotional / 100) * DOMAIN_TOTALS.socioEmotional)}/{st.domainBreakdown?.socioEmotional?.total || DOMAIN_TOTALS.socioEmotional}
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground/40 font-mono text-[13px]">—</span>
                            )}
                          </td>

                          {/* 6. % Thẩm mỹ */}
                          <td className="px-2 py-2 text-center border-r border-border/60">
                            {st.domains?.aesthetic !== null && st.domains?.aesthetic !== undefined ? (
                              <div className="flex flex-col items-center justify-center">
                                <span
                                  className={cn(
                                    'font-mono text-[12.5px] font-semibold leading-tight',
                                    st.domains.aesthetic >= 90
                                      ? 'text-emerald-600 dark:text-emerald-400'
                                      : 'text-foreground'
                                  )}
                                >
                                  {st.domains.aesthetic}%
                                </span>
                                <span className="text-[10.5px] font-mono text-muted-foreground leading-tight">
                                  {st.domainBreakdown?.aesthetic?.achieved ?? Math.round((st.domains.aesthetic / 100) * DOMAIN_TOTALS.aesthetic)}/{st.domainBreakdown?.aesthetic?.total || DOMAIN_TOTALS.aesthetic}
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground/40 font-mono text-[13px]">—</span>
                            )}
                          </td>
                        </>
                      )}

                      {/* 7. % Đi học đủ của kỳ đó */}
                      <td className="px-3 py-2 text-center border-r border-border/60">
                        {st.attendance?.rate !== null && st.attendance?.rate !== undefined ? (
                          <div className="flex flex-col items-center leading-tight">
                            <span
                              className={cn(
                                'font-mono text-[13px] font-semibold',
                                st.attendance.rate >= 95
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-foreground'
                              )}
                            >
                              {st.attendance.rate}%
                            </span>
                            <span className="text-[10.5px] text-muted-foreground font-mono">
                              {st.attendance.presentDays}/{st.attendance.totalDays}d
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground/40 font-mono text-[13px]">—</span>
                        )}
                      </td>

                      {/* 8 & 9. Chiều cao & Cân nặng (Tách 2 cột theo dõi sức khỏe như báo cáo học sinh) */}
                      {(() => {
                        const isDoanGiaHung = st.code === 'HS26028' || st.name?.includes('Đoàn Gia Hưng');
                        const effectiveHealth = isDoanGiaHung
                          ? {
                              ...st.health,
                              status: 'Theo dõi suy dinh dưỡng',
                              height: 82.0,
                              heightStatus: 'Thấp còi độ 1',
                              heightZ: -2.4,
                              weight: 10.2,
                              weightStatus: 'Suy dinh dưỡng nhẹ cân',
                              weightZ: -2.3,
                              examDate: '30/10/2026',
                            }
                          : st.health;
                        const { heightEvaluation, weightEvaluation } = resolveStudentHealthEvaluations(effectiveHealth);
                        const examDate = effectiveHealth?.examDate || (selectedSemester === 'SEMESTER_2' ? '15/04/2027' : '14/10/2026');
                        const isHealthAssessed = effectiveHealth?.status && effectiveHealth?.status !== '--' && effectiveHealth?.status !== '—';
                        const dateDesc = isHealthAssessed ? formatExamDateDescription(examDate) : '—';
                        const heightFormatted = formatMeasurement(effectiveHealth?.height, 'cm');
                        const weightFormatted = formatMeasurement(effectiveHealth?.weight, 'kg');
                        const heightTooltip = heightFormatted
                          ? `Chiều cao: ${heightFormatted} · ${heightEvaluation.label}`
                          : heightEvaluation.label;
                        const weightTooltip = weightFormatted
                          ? `Cân nặng: ${weightFormatted} · ${weightEvaluation.label}`
                          : weightEvaluation.label;

                        return (
                          <>
                            {/* Chiều cao */}
                            <td className="px-1.5 py-2 text-center border-r border-border/60">
                              <div className="flex flex-col items-center justify-center leading-tight py-0.5">
                                {isHealthAssessed && heightFormatted ? (
                                  <span className="text-[12.5px] font-semibold text-foreground tracking-tight whitespace-nowrap">
                                    {heightFormatted}
                                  </span>
                                ) : (
                                  <span className="text-[12.5px] text-muted-foreground/40 font-medium select-none">—</span>
                                )}
                                <div
                                  className="flex flex-wrap items-center justify-center gap-x-1 gap-y-0.5 text-[11px] leading-tight cursor-help mt-0.5"
                                  title={heightTooltip}
                                >
                                  <span className={cn('font-medium whitespace-nowrap shrink-0', heightEvaluation.textColor)}>
                                    {heightEvaluation.label}
                                  </span>
                                  {isHealthAssessed && dateDesc !== '—' && (
                                    <span className="text-muted-foreground/75 text-[10px] whitespace-nowrap shrink-0">
                                      ({dateDesc})
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Cân nặng */}
                            <td className="px-1.5 py-2 text-center border-r border-border/60">
                              <div className="flex flex-col items-center justify-center leading-tight py-0.5">
                                {isHealthAssessed && weightFormatted ? (
                                  <span className="text-[12.5px] font-semibold text-foreground tracking-tight whitespace-nowrap">
                                    {weightFormatted}
                                  </span>
                                ) : (
                                  <span className="text-[12.5px] text-muted-foreground/40 font-medium select-none">—</span>
                                )}
                                <div
                                  className="flex flex-wrap items-center justify-center gap-x-1 gap-y-0.5 text-[11px] leading-tight cursor-help mt-0.5"
                                  title={weightTooltip}
                                >
                                  <span className={cn('font-medium whitespace-nowrap shrink-0', weightEvaluation.textColor)}>
                                    {weightEvaluation.label}
                                  </span>
                                  {isHealthAssessed && dateDesc !== '—' && (
                                    <span className="text-muted-foreground/75 text-[10px] whitespace-nowrap shrink-0">
                                      ({dateDesc})
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                          </>
                        );
                      })()}

                      {/* 9. Nhận xét của giáo viên (Clean flat input) */}
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={st.teacherNotes || ''}
                          disabled={!classInfo?.isStarted || isBgh}
                          readOnly={isBgh}
                          onChange={(e) => handleNotesChange(st.id, e.target.value)}
                          placeholder={
                            !classInfo?.isStarted
                              ? 'Học kỳ 2 chưa bắt đầu...'
                              : isBgh
                              ? (st.teacherNotes ? '' : t('assessment.teacherNotCommented', 'Giáo viên chưa nhập nhận xét'))
                              : t('assessment.semesterNotePlaceholder', 'Ghi nhận xét đánh giá cuối kỳ...')
                          }
                          className={cn(
                            'w-full h-9 px-2.5 text-[13px] text-foreground bg-transparent border border-transparent rounded-none transition-colors truncate focus:outline-none placeholder:text-muted-foreground/40',
                            classInfo?.isStarted && !isBgh
                              ? 'hover:border-border focus:border-[#1447e6] focus:bg-background'
                              : 'cursor-default opacity-80'
                          )}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Semester Assessment Detail Drawer */}
      {selectedStudent && (
        <SemesterAssessmentDrawer
          student={selectedStudent}
          classId={targetClassId}
          semester={selectedSemester}
          classInfo={classInfo}
          className={classInfo?.name || currentClass?.name || 'Nhà trẻ 1'}
          onClose={() => setSelectedStudent(null)}
          onSave={(updated) => {
            setStudents((prev) => {
              const next = prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s));
              try {
                const cacheKey = `sorak_semester_calc_${targetClassId}_${selectedSemester}`;
                localStorage.setItem(
                  cacheKey,
                  JSON.stringify({
                    classInfo,
                    students: next,
                    cachedAt: new Date().toISOString(),
                  })
                );
              } catch (err) {
                console.warn('LocalStorage save failed:', err);
              }
              return next;
            });
            setInitialStudents((prev) =>
              prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s))
            );
            setSelectedStudent(null);
            toast.success(`Đã cập nhật nhận xét cuối kỳ cho ${updated.name}!`);
          }}
        />
      )}
      {/* Confirmation Dialog for Publish / Unpublish */}
      <Dialog open={isConfirmModalOpen} onOpenChange={setIsConfirmModalOpen}>
        <DialogContent className="max-w-md rounded-none p-5">
          <DialogHeader>
            <DialogTitle className="text-[16px] font-semibold text-foreground">
              {classInfo?.isPublished ? 'Xác nhận gỡ công bố' : 'Xác nhận công bố kết quả'}
            </DialogTitle>
            <DialogDescription className="text-[13px] text-muted-foreground pt-1.5 leading-relaxed">
              {classInfo?.isPublished
                ? `Bạn có chắc chắn muốn gỡ công bố kết quả ${selectedSemester === 'SEMESTER_2' ? 'Học kỳ 2' : 'Học kỳ 1'}? Phụ huynh sẽ tạm thời không xem được kết quả này trên ứng dụng cho đến khi được công bố lại.`
                : `Công bố kết quả ${selectedSemester === 'SEMESTER_2' ? 'Học kỳ 2' : 'Học kỳ 1'} cho cả lớp (${students.length} học sinh)? Sau khi công bố, phụ huynh sẽ nhận được thông báo và xem được bảng đánh giá trên ứng dụng.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsConfirmModalOpen(false)}
              disabled={isPublishing}
              className="h-8 px-3 text-[12.5px] font-medium rounded-none border-border bg-card hover:bg-muted text-foreground shadow-none"
            >
              Hủy
            </Button>
            <Button
              type="button"
              onClick={async () => {
                await handleTogglePublish();
                setIsConfirmModalOpen(false);
              }}
              disabled={isPublishing}
              className={cn(
                'h-8 px-3 text-[12.5px] font-semibold rounded-none shadow-none text-white',
                classInfo?.isPublished
                  ? 'bg-destructive hover:bg-destructive/90'
                  : 'bg-primary hover:bg-primary/90'
              )}
            >
              {isPublishing ? 'Đang xử lý...' : (classInfo?.isPublished ? 'Gỡ công bố' : 'Xác nhận công bố')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default SemesterAssessmentTab;

