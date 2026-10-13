import React, { useState, useEffect, useMemo } from 'react';
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
import { toast } from 'sonner';
import { cn } from '@/shared/lib/utils';
import { assessmentApi } from '../assessment.api';
import { SemesterAssessmentDrawer } from './SemesterAssessmentDrawer';

const DOMAIN_TOTALS = {
  physical: 25,
  cognitive: 20,
  language: 18,
  socioEmotional: 20,
  aesthetic: 16,
};

export function SemesterAssessmentTab({ targetClassId, currentClass }) {
  const { t } = useTranslation();

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

  // Load semester assessment data from local cache or backend
  const loadData = async (recalculate = false) => {
    const cacheKey = `sorak_semester_calc_${targetClassId}_${selectedSemester}`;

    // Read from client-side cache first if not recalculating (Instant load, save server resources)
    if (!recalculate) {
      try {
        const cachedStr = localStorage.getItem(cacheKey);
        if (cachedStr) {
          const cached = JSON.parse(cachedStr);
          if (cached?.students?.length > 0) {
            setClassInfo(cached.classInfo || null);
            setStudents(cached.students);
            setInitialStudents(JSON.parse(JSON.stringify(cached.students)));
            setIsLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn('Failed to parse cached semester data:', err);
      }
    }

    if (recalculate) {
      setIsCalculating(true);
    } else {
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
        toast.success(`Đã tính toán thành công dữ liệu học kỳ từ ngày ${fromDate} đến ngày ${untilDate}! Dữ liệu đã được lưu bộ nhớ đệm.`);
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
    if (!status) return t('health.statusNormal', 'Bình thường');
    if (status === 'Bình thường') return t('health.statusNormal', 'Bình thường');
    if (status === 'Theo dõi nhẹ cân') return t('health.statusUnderweight', 'Theo dõi nhẹ cân');
    if (status === 'Theo dõi thừa cân/béo phì') return t('health.statusOverweight', 'Theo dõi thừa cân/béo phì');
    if (status === 'Theo dõi thấp còi') return t('health.statusStunted', 'Theo dõi thấp còi');
    if (status === 'Theo dõi suy dinh dưỡng') return t('health.statusMalnutrition', 'Theo dõi suy dinh dưỡng');
    if (status === 'Nguy cơ thừa cân') return t('health.statusOverweightRisk', 'Nguy cơ thừa cân');
    return status;
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
            <h1 className="text-[26px] font-semibold text-foreground tracking-tight">
              {selectedSemester === 'SEMESTER_2'
                ? t('assessment.semesterDrawerTitle2', 'Đánh giá học kỳ 2')
                : t('assessment.semesterDrawerTitle1', 'Đánh giá học kỳ 1')}
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

          {/* 4. Save Button */}
          <Button
            type="button"
            onClick={handleSaveAll}
            disabled={!isDirty || isSavingAll || !classInfo?.isStarted}
            className={cn(
              'h-8 px-3 text-[12.5px] font-medium rounded-none shadow-none flex items-center justify-center gap-1.5 transition-colors shrink-0',
              isDirty && classInfo?.isStarted
                ? 'bg-[#1447e6] hover:bg-[#1447e6]/90 text-white cursor-pointer'
                : 'bg-muted text-muted-foreground border border-border cursor-not-allowed opacity-60'
            )}
          >
            <HugeiconsIcon icon={FloppyDiskIcon} size={14} />
            <span>{isSavingAll ? t('common.saving', 'Đang lưu...') : isDirty ? t('common.saveChanges', 'Lưu thay đổi') : t('common.saved', 'Đã lưu')}</span>
          </Button>
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
                <th rowSpan={2} className="px-3 py-2.5 w-[180px] min-w-[160px] border-r border-border/60 text-left font-semibold">
                  {t('students.student', 'Học sinh')}
                </th>
                <th colSpan={5} className="px-2 py-2 text-center border-r border-border/60 bg-muted/60 font-semibold">
                  {t('assessment.fiveDomainsTitle', 'Mục tiêu đạt được theo 5 lĩnh vực phát triển')}
                </th>
                <th rowSpan={2} className="px-2 py-2.5 w-[85px] min-w-[75px] text-center border-r border-border/60 font-semibold">
                  {t('assessment.attendanceFull', 'Đi học đủ')}
                </th>
                <th rowSpan={2} className="px-2.5 py-2.5 w-[110px] min-w-[100px] text-center border-r border-border/60 font-semibold">
                  {t('health.title', 'Sức khỏe')}
                </th>
                <th rowSpan={2} className="px-3 py-2.5 min-w-[180px] text-left font-semibold">
                  {t('assessment.teacherNotes', 'Nhận xét giáo viên')}
                </th>
              </tr>
              {/* Sub-header row for 5 Developmental Domains */}
              <tr className="border-b border-border bg-muted/25 text-[11.5px] font-medium text-muted-foreground text-center">
                <th className="px-1.5 py-1.5 w-[68px] min-w-[62px] border-r border-border/60 font-medium">
                  {t('domains.physical', 'Thể chất')}
                </th>
                <th className="px-1.5 py-1.5 w-[68px] min-w-[62px] border-r border-border/60 font-medium">
                  {t('domains.cognitive', 'Nhận thức')}
                </th>
                <th className="px-1.5 py-1.5 w-[68px] min-w-[62px] border-r border-border/60 font-medium">
                  {t('domains.language', 'Ngôn ngữ')}
                </th>
                <th className="px-1.5 py-1.5 w-[72px] min-w-[66px] border-r border-border/60 font-medium">
                  {t('domains.socialEmotionalShort', 'TC - KNXH')}
                </th>
                <th className="px-1.5 py-1.5 w-[68px] min-w-[62px] border-r border-border/60 font-medium">
                  {t('domains.aesthetic', 'Thẩm mỹ')}
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
                    <td className="px-3 border-r border-border/40">
                      <div className="h-4 bg-muted/30 rounded-none mx-auto w-20" />
                    </td>
                    <td className="px-3">
                      <div className="h-4 bg-muted/30 rounded-none" />
                    </td>
                  </tr>
                ))
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-muted-foreground text-[13px]">
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
                              {st.domainBreakdown?.physical?.achieved ?? Math.round((st.domains.physical / 100) * DOMAIN_TOTALS.physical)}/{DOMAIN_TOTALS.physical}
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
                              {st.domainBreakdown?.cognitive?.achieved ?? Math.round((st.domains.cognitive / 100) * DOMAIN_TOTALS.cognitive)}/{DOMAIN_TOTALS.cognitive}
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
                              {st.domainBreakdown?.language?.achieved ?? Math.round((st.domains.language / 100) * DOMAIN_TOTALS.language)}/{DOMAIN_TOTALS.language}
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
                              {st.domainBreakdown?.socioEmotional?.achieved ?? Math.round((st.domains.socioEmotional / 100) * DOMAIN_TOTALS.socioEmotional)}/{DOMAIN_TOTALS.socioEmotional}
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
                              {st.domainBreakdown?.aesthetic?.achieved ?? Math.round((st.domains.aesthetic / 100) * DOMAIN_TOTALS.aesthetic)}/{DOMAIN_TOTALS.aesthetic}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground/40 font-mono text-[13px]">—</span>
                        )}
                      </td>

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

                      {/* 8. Tình trạng sức khỏe */}
                      <td className="px-3 py-2 text-center border-r border-border/60">
                        {st.health?.status && st.health?.status !== '--' ? (
                          <span
                            className={cn(
                              'inline-flex items-center px-2 py-0.5 text-[11.5px] font-medium rounded-none whitespace-nowrap',
                              st.health?.status === 'Bình thường'
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200'
                            )}
                          >
                            {getHealthStatusLabel(st.health?.status)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/40 font-mono text-[13px]">—</span>
                        )}
                      </td>

                      {/* 9. Nhận xét của giáo viên (Clean flat input) */}
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={st.teacherNotes || ''}
                          disabled={!classInfo?.isStarted}
                          onChange={(e) => handleNotesChange(st.id, e.target.value)}
                          placeholder={
                            !classInfo?.isStarted
                              ? 'Học kỳ 2 chưa bắt đầu...'
                              : t('assessment.semesterNotePlaceholder', 'Ghi nhận xét đánh giá cuối kỳ...')
                          }
                          className={cn(
                            'w-full h-9 px-2.5 text-[13px] text-foreground bg-transparent border border-transparent rounded-none transition-colors truncate focus:outline-none placeholder:text-muted-foreground/40',
                            classInfo?.isStarted
                              ? 'hover:border-border focus:border-[#1447e6] focus:bg-background'
                              : 'cursor-not-allowed opacity-60'
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
    </div>
  );
}

export default SemesterAssessmentTab;

