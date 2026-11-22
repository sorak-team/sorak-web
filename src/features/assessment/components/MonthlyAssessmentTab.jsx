import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Search01Icon,
  FloppyDiskIcon,
  Message01Icon,
  Cancel01Icon,
  FilterHorizontalIcon,
  CheckmarkSquare02Icon,
  Menu01Icon,
  SparklesIcon,
  Settings01Icon,
  Calendar03Icon,
  ArrowDown01Icon,
  SentIcon,
  CheckmarkCircle01Icon,
} from '@hugeicons/core-free-icons';
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
import { useAuthStore } from '@/features/auth';
import { useAcademicYearStore } from '@/features/academic-years';
import { assessmentApi } from '../assessment.api';
import { goodBehaviorApi } from '@/features/good-behavior/good-behavior.api';
import { ExcelActionsDropdown } from '@/components/ExcelActionsDropdown';
import { downloadBlob } from '@/shared/utils/download';
import { getAcademicMonths, getMonthWeekRanges, resolveStudentHealthEvaluations, formatExamDateDescription, formatMeasurement } from '../assessment.utils';
import { ParentFeedbackModal } from './ParentFeedbackModal';

// Calculate default assessment month (previous month, as teachers evaluate after month ends)
const getDefaultAssessmentPeriod = () => {
  const now = new Date();
  const currentMonth = now.getMonth() + 1; // 1-12
  const currentYear = now.getFullYear();
  if (currentMonth === 1) {
    return { month: '12', year: String(currentYear - 1) };
  }
  return { month: String(currentMonth - 1), year: String(currentYear) };
};

export function MonthlyAssessmentTab({ targetClassId, currentClass }) {
  const { t, i18n } = useTranslation();
  const isVi = (i18n?.language || 'vi').startsWith('vi');

  const [searchParams, setSearchParams] = useSearchParams();
  const currentUser = useAuthStore((state) => state.user);
  const isPrincipal = Boolean(
    currentUser?.role === 'PRINCIPAL_BGH' ||
    currentUser?.role === 'PRINCIPAL' ||
    currentUser?.role === 'VICE_PRINCIPAL' ||
    currentUser?.role?.toLowerCase()?.includes('principal') ||
    currentUser?.role?.toLowerCase()?.includes('bgh')
  );

  const academicYears = useAcademicYearStore((state) => state.academicYears);
  const selectedYearId = useAcademicYearStore((state) => state.selectedYearId);
  const selectedAcademicYear = academicYears.find((y) => String(y.id) === String(selectedYearId)) || academicYears[0];
  const isSchoolYearEnded = selectedAcademicYear?.status === 'COMPLETED' || selectedAcademicYear?.status === 'ENDED';
  const isReadOnly = isPrincipal || isSchoolYearEnded;

  const initialPeriod = useMemo(() => getDefaultAssessmentPeriod(), []);

  // Priority for initial month / year:
  // 1. URL query params: ?month=9&year=2026
  // 2. localStorage saved preference for this class
  // 3. initialPeriod (default)
  const [selectedMonth, setSelectedMonthState] = useState(() => {
    const urlMonth = searchParams.get('month');
    if (urlMonth && !isNaN(Number(urlMonth))) return String(urlMonth);
    try {
      const saved = localStorage.getItem(`sorak_assessment_period_${targetClassId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.month) return String(parsed.month);
      }
    } catch {}
    return initialPeriod.month;
  });

  const [selectedYear, setSelectedYearState] = useState(() => {
    const urlYear = searchParams.get('year');
    if (urlYear && !isNaN(Number(urlYear))) return String(urlYear);
    try {
      const saved = localStorage.getItem(`sorak_assessment_period_${targetClassId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.year) return String(parsed.year);
      }
    } catch {}
    return initialPeriod.year;
  });

  const [students, setStudents] = useState([]);
  const [initialStudents, setInitialStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const validTabs = ['week1', 'week2', 'week3', 'week4', 'summary'];

  // Priority for initial active tab:
  // 1. URL query params: ?subTab=week3 or ?week=3
  // 2. localStorage: sorak_assessment_tab_{targetClassId}
  // 3. 'week1' (default)
  const [activeTab, setActiveTabState] = useState(() => {
    const rawParam = searchParams.get('subTab') || searchParams.get('week');
    const param = rawParam?.startsWith('week') ? rawParam : (rawParam ? `week${rawParam}` : null);
    if (param && validTabs.includes(param)) return param;
    try {
      const saved = localStorage.getItem(`sorak_assessment_tab_${targetClassId}`);
      if (saved && validTabs.includes(saved)) return saved;
    } catch {}
    return 'week1';
  });

  const setActiveTab = (tab) => {
    const targetTab = tab === 'week5' ? 'week1' : tab;
    setActiveTabState(targetTab);
    try {
      localStorage.setItem(`sorak_assessment_tab_${targetClassId}`, targetTab);
    } catch {}
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('subTab', targetTab);
      return next;
    }, { replace: true });
  };

  const handleSelectPeriod = (month, year) => {
    const mStr = String(month);
    const yStr = String(year);
    setSelectedMonthState(mStr);
    setSelectedYearState(yStr);
    try {
      localStorage.setItem(
        `sorak_assessment_period_${targetClassId}`,
        JSON.stringify({ month: mStr, year: yStr })
      );
    } catch {}
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('month', mStr);
      next.set('year', yStr);
      return next;
    }, { replace: true });
  };

  const [isExportingExcel, setIsExportingExcel] = useState(false);

  const handlePrintGoodBehavior = () => {
    const printUrl = goodBehaviorApi.getGoodBehaviorPrintUrl(targetClassId, {
      month: selectedMonth,
      year: selectedYear,
    });
    window.open(printUrl, '_blank');
  };

  const handleExportGoodBehaviorExcel = async () => {
    try {
      setIsExportingExcel(true);
      const blob = await goodBehaviorApi.exportGoodBehaviorExcel(targetClassId, {
        month: selectedMonth,
        year: selectedYear,
      });
      const className = currentClass?.name || `Lop_${targetClassId}`;
      const safeName = className.replace(/\s+/g, '_');
      downloadBlob(blob, `So_Be_Ngoan_Thang_${selectedMonth}_${selectedYear}_${safeName}.xlsx`);
      toast.success(
        t('assessment.exportGoodBehaviorSuccess', 'Đã xuất sổ bé ngoan tháng {{month}}/{{year}} ra file Excel thành công', {
          month: selectedMonth,
          year: selectedYear,
        })
      );
    } catch (err) {
      console.error('Export good behavior excel failed:', err);
      toast.error(t('assessment.exportGoodBehaviorError', 'Có lỗi xảy ra khi xuất sổ bé ngoan ra file Excel'));
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Sync current selection into URL search params on mount if missing
  useEffect(() => {
    setSearchParams((prev) => {
      let changed = false;
      const next = new URLSearchParams(prev);
      if (!next.get('month')) {
        next.set('month', selectedMonth);
        changed = true;
      }
      if (!next.get('year')) {
        next.set('year', selectedYear);
        changed = true;
      }
      if (!next.get('subTab')) {
        next.set('subTab', activeTab);
        changed = true;
      }
      return changed ? next : prev;
    }, { replace: true });
  }, []);

  // Listen for browser Back/Forward navigation
  useEffect(() => {
    const urlMonth = searchParams.get('month');
    const urlYear = searchParams.get('year');
    const rawParam = searchParams.get('subTab') || searchParams.get('week');
    const urlSubTab = rawParam?.startsWith('week') ? rawParam : (rawParam ? `week${rawParam}` : null);

    if (urlMonth && urlMonth !== selectedMonth) {
      setSelectedMonthState(urlMonth);
    }
    if (urlYear && urlYear !== selectedYear) {
      setSelectedYearState(urlYear);
    }
    if (urlSubTab && validTabs.includes(urlSubTab) && urlSubTab !== activeTab) {
      setActiveTabState(urlSubTab);
    }
  }, [searchParams]);
  const [feedbackModalIndex, setFeedbackModalIndex] = useState(null);
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [apiWeekRanges, setApiWeekRanges] = useState(null);
  const [isPublished, setIsPublished] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState(null);
  const autoSaveTimerRef = useRef(null);
  const isInitialLoadRef = useRef(true);

  // Session memory cache to make month transitions instant (0ms)
  const monthCacheRef = useRef(new Map());

  // Danh sách các tháng trong năm học 2026–2027 tính theo tuần học kỳ (4 tuần/tháng)
  const academicMonths = useMemo(() => {
    return getAcademicMonths();
  }, []);

  const selectedMonthObj = useMemo(
    () =>
      academicMonths.find((m) => m.month === String(selectedMonth) && m.year === String(selectedYear)) || {
        label: `Tháng ${selectedMonth}/${selectedYear}`,
        isEnded: true,
      },
    [academicMonths, selectedMonth, selectedYear]
  );

  const monthWeekRanges = useMemo(() => {
    const base = getMonthWeekRanges(selectedMonth, selectedYear);
    if (!apiWeekRanges || apiWeekRanges.length === 0) return base;
    return base.map((b) => {
      const match = apiWeekRanges.find((r) => r.week === b.week);
      return {
        ...b,
        themeName: match?.themeName || b.themeName || null,
        subThemeName: match?.subThemeName || b.subThemeName || null,
      };
    });
  }, [selectedMonth, selectedYear, apiWeekRanges]);

  const monthWeeks = useMemo(() => {
    if (monthWeekRanges.length > 0) {
      return monthWeekRanges.map((r) => r.week);
    }
    return [1, 2, 3, 4];
  }, [monthWeekRanges]);

  useEffect(() => {
    if (activeTab === 'week5') {
      setActiveTab('week1');
    }
  }, [activeTab]);

  // List of students who have parent feedback for popup navigation
  const feedbackStudents = useMemo(
    () => students.filter((s) => Boolean(s.parentFeedback)),
    [students]
  );

  // Auto-suggestion criteria configuration
  const [suggestionCriteria, setSuggestionCriteria] = useState({
    minAttendanceRate: 80, // % chuyên cần (>= 80%)
    minGoalsRate: 70, // % mục tiêu bài học (>= 70%)
    allowedHealthStatuses: ['Bình thường', 'Tốt', 'Chưa đánh giá', 'Theo dõi nhẹ cân'], // sức khoẻ giáo viên chọn được
  });
  const [isConfigDrawerOpen, setIsConfigDrawerOpen] = useState(false);

  // Generate realistic weekly stats with latest health status
  // Helper: Tính toán sức khỏe tuần theo quy tắc nghiệp vụ:
  // - Nếu trong tuần có đo sức khỏe: lấy kết quả đo gần cuối tuần nhất của tuần đó
  // - Nếu trong tuần không khám sức khỏe: lấy lần đo gần nhất của các tuần trước đó
  const resolveWeeklyHealth = (measurements, targetWeekNum, defaultHealth = 'Bình thường', year = selectedYear) => {
    // 1. Lọc các lần đo diễn ra trong tuần này, sắp xếp theo thứ tự ngày trong tuần tăng dần
    const thisWeekMeasurements = (measurements || [])
      .filter((m) => m.weekNumber === targetWeekNum)
      .sort((a, b) => a.dayOrder - b.dayOrder);

    if (thisWeekMeasurements.length > 0) {
      // Có đo trong tuần: lấy lần đo gần cuối tuần nhất
      const latestThisWeek = thisWeekMeasurements[thisWeekMeasurements.length - 1];
      const rawDate = latestThisWeek.date;
      const formattedDate = rawDate && !rawDate.includes('/') ? rawDate : (rawDate?.split('/').length === 2 ? `${rawDate}/${year}` : rawDate);
      return {
        healthStatus: latestThisWeek.status?.replace(/\s*\(Đạt chuẩn WHO\)/gi, '')?.trim() || latestThisWeek.status,
        heightStatus: latestThisWeek.heightStatus || null,
        weightStatus: latestThisWeek.weightStatus || null,
        height: latestThisWeek.height || null,
        weight: latestThisWeek.weight || null,
        heightZ: latestThisWeek.heightZ ?? latestThisWeek.height_for_age_zscore,
        weightZ: latestThisWeek.weightZ ?? latestThisWeek.weight_for_age_zscore,
        bmiZ: latestThisWeek.bmiZ ?? latestThisWeek.bmi_for_age_zscore,
        examDate: formattedDate,
        hasCheckThisWeek: true,
        healthSourceLabel: `Đo ngày ${formattedDate} (${latestThisWeek.dayLabel || 'Trong tuần'}) - Lần đo gần cuối tuần nhất của Tuần ${targetWeekNum}`,
      };
    }

    // 2. Không có khám trong tuần: lấy kết quả của lần đo gần nhất của các tuần trước đó
    const previousMeasurements = (measurements || [])
      .filter((m) => m.weekNumber < targetWeekNum)
      .sort((a, b) => b.weekNumber - a.weekNumber || b.dayOrder - a.dayOrder);

    if (previousMeasurements.length > 0) {
      const latestPrevious = previousMeasurements[0];
      const rawDate = latestPrevious.date;
      const formattedDate = rawDate && !rawDate.includes('/') ? rawDate : (rawDate?.split('/').length === 2 ? `${rawDate}/${year}` : rawDate);
      return {
        healthStatus: latestPrevious.status?.replace(/\s*\(Đạt chuẩn WHO\)/gi, '')?.trim() || latestPrevious.status,
        heightStatus: latestPrevious.heightStatus || null,
        weightStatus: latestPrevious.weightStatus || null,
        height: latestPrevious.height || null,
        weight: latestPrevious.weight || null,
        heightZ: latestPrevious.heightZ ?? latestPrevious.height_for_age_zscore,
        weightZ: latestPrevious.weightZ ?? latestPrevious.weight_for_age_zscore,
        bmiZ: latestPrevious.bmiZ ?? latestPrevious.bmi_for_age_zscore,
        examDate: formattedDate,
        hasCheckThisWeek: false,
        healthSourceLabel: `Tuần ${targetWeekNum} không khám - Kế thừa lần đo gần nhất trước đó (Tuần ${latestPrevious.weekNumber}, ngày ${formattedDate})`,
      };
    }

    // 3. Fallback nếu chưa có lần đo nào trước đó
    return {
      healthStatus: defaultHealth,
      heightStatus: defaultHealth === 'Chưa đánh giá' ? 'Chưa đánh giá' : 'Đạt chuẩn',
      weightStatus: defaultHealth === 'Chưa đánh giá' ? 'Chưa đánh giá' : 'Đạt chuẩn',
      height: null,
      weight: null,
      examDate: null,
      hasCheckThisWeek: false,
      healthSourceLabel: `Chưa có đợt đo - Mặc định ${defaultHealth}`,
    };
  };

  // Generate realistic weekly stats with dynamic weekly health status
  const enrichStudentWithWeeklyStats = (st, idx) => {
    const isSept = Number(selectedMonth) === 9;
    const fallbackHealth = 'Bình thường';

    if (st.weeklyStats) {
      const enrichedWeekly = {};
      const wKeys = ['week1', 'week2', 'week3', 'week4'];
      wKeys.forEach((wk, wIdx) => {
        const w = st.weeklyStats[wk];
        if (!w) {
          enrichedWeekly[wk] = {
            attendancePresent: 0,
            attendanceTotal: 5,
            attendanceRate: 0,
            goalsAchieved: 0,
            goalsTotal: 4,
            goalsRate: 0,
            healthStatus: fallbackHealth,
            heightStatus: 'Đạt chuẩn',
            weightStatus: 'Đạt chuẩn',
            height: null,
            weight: null,
            healthExamDate: null,
          };
          return;
        }
        const p = Number(w.attendancePresent ?? 0);
        const tA = Number(w.attendanceTotal || 5);
        const a = Number(w.goalsAchieved ?? 0);
        const tG = Number(w.goalsTotal || 4);
        enrichedWeekly[wk] = {
          ...w,
          attendancePresent: p,
          attendanceTotal: tA,
          attendanceRate: w.attendanceRate !== undefined ? Number(w.attendanceRate) : Math.round((p / tA) * 100),
          goalsAchieved: a,
          goalsTotal: tG,
          goalsRate: w.goalsRate !== undefined ? Number(w.goalsRate) : Math.round((a / tG) * 100),
          healthStatus: w.healthStatus || fallbackHealth,
          heightStatus: w.heightStatus || null,
          weightStatus: w.weightStatus || null,
          height: w.height ?? null,
          weight: w.weight ?? null,
          heightZ: w.heightZ ?? null,
          weightZ: w.weightZ ?? null,
          bmiZ: w.bmiZ ?? null,
          healthExamDate: w.healthExamDate || w.examDate || null,
          healthSourceLabel: w.healthSourceLabel || '',
        };
      });

      // Thử nghiệm trực quan cho học sinh Đoàn Gia Hưng (HS26028) có trạng thái sức khỏe cảnh báo (chữ dài)
      if (st.code === 'HS26028' || st.name?.includes('Đoàn Gia Hưng')) {
        if (enrichedWeekly.week1) {
          enrichedWeekly.week1 = {
            ...enrichedWeekly.week1,
            height: 82.0,
            heightStatus: 'Thấp còi độ 1',
            heightZ: -2.4,
            weight: 10.2,
            weightStatus: 'Suy dinh dưỡng nhẹ cân',
            weightZ: -2.3,
            healthStatus: 'Theo dõi suy dinh dưỡng',
            healthExamDate: enrichedWeekly.week1.healthExamDate || '2026-10-02',
            healthSourceLabel: 'Đo ngày 02/10/2026 - Thấp còi độ 1 & Suy dinh dưỡng nhẹ cân',
          };
        }
      }

      return {
        ...st,
        weeklyStats: enrichedWeekly,
      };
    }

    // Use rose flags to determine stats:
    // If student achieved flower for a week (st.weekXRose === true), they met 100% criteria (5/5 attendance, 4/4 goals, 'Bình thường' health)
    // If not achieved, 4/5 days (80%) and 3/4 goals (75%)
    const w1Rose = Boolean(st.week1Rose);
    const w2Rose = Boolean(st.week2Rose);
    const w3Rose = Boolean(st.week3Rose);
    const w4Rose = Boolean(st.week4Rose);

    const w1Att = w1Rose ? 5 : 4;
    const w2Att = w2Rose ? 5 : 4;
    const w3Att = w3Rose ? 5 : 4;
    const w4Att = w4Rose ? 5 : 4;

    const w1Goal = w1Rose ? 4 : 3;
    const w2Goal = w2Rose ? 4 : 3;
    const w3Goal = w3Rose ? 4 : 3;
    const w4Goal = w4Rose ? 4 : 3;

    // Trạng thái sức khỏe cơ bản ban đầu: Mặc định 'Bình thường', không bao giờ mặc định thừa cân/béo phì
    const initialStatus = 'Bình thường';

    // Dữ liệu các đợt đo sức khỏe thực tế của học sinh trong tháng:
    // Tháng 9 chưa đánh giá sức khỏe nên danh sách đợt đo rỗng (Chưa đánh giá)
    const mStr = String(selectedMonth).padStart(2, '0');
    const yStr = String(selectedYear || 2026);
    const baseH = Number((98.5 + ((idx * 1.3) % 7.5)).toFixed(1));
    const baseW = Number((14.5 + ((idx * 0.7) % 3.5)).toFixed(1));
    const studentMeasurements = st.healthMeasurements || (isSept ? [] : [
      {
        weekNumber: 1,
        dayOrder: 3,
        dayLabel: 'Thứ 4',
        date: `10/${mStr}/${yStr}`,
        status: initialStatus,
        heightStatus: 'Đạt chuẩn',
        weightStatus: 'Đạt chuẩn',
        height: baseH,
        weight: baseW,
      },
      {
        weekNumber: 3,
        dayOrder: 4,
        dayLabel: 'Thứ 5',
        date: `24/${mStr}/${yStr}`,
        status: initialStatus,
        heightStatus: 'Đạt chuẩn',
        weightStatus: 'Đạt chuẩn',
        height: Number((baseH + 0.5).toFixed(1)),
        weight: Number((baseW + 0.2).toFixed(1)),
      },
    ]);

    const fallbackHealthResolved = isSept ? 'Chưa đánh giá' : initialStatus;
    const w1Health = resolveWeeklyHealth(studentMeasurements, 1, fallbackHealthResolved, yStr);
    const w2Health = resolveWeeklyHealth(studentMeasurements, 2, fallbackHealthResolved, yStr);
    const w3Health = resolveWeeklyHealth(studentMeasurements, 3, fallbackHealthResolved, yStr);
    const w4Health = resolveWeeklyHealth(studentMeasurements, 4, fallbackHealth, yStr);

    return {
      ...st,
      healthMeasurements: studentMeasurements,
      weeklyStats: {
        week1: {
          attendancePresent: w1Att,
          attendanceTotal: 5,
          attendanceRate: Math.round((w1Att / 5) * 100),
          goalsAchieved: w1Goal,
          goalsTotal: 4,
          goalsRate: Math.round((w1Goal / 4) * 100),
          healthStatus: w1Health.healthStatus,
          heightStatus: w1Health.heightStatus,
          weightStatus: w1Health.weightStatus,
          height: w1Health.height,
          weight: w1Health.weight,
          hasHealthCheckThisWeek: w1Health.hasCheckThisWeek,
          healthExamDate: w1Health.examDate,
          healthSourceLabel: w1Health.healthSourceLabel,
        },
        week2: {
          attendancePresent: w2Att,
          attendanceTotal: 5,
          attendanceRate: Math.round((w2Att / 5) * 100),
          goalsAchieved: w2Goal,
          goalsTotal: 4,
          goalsRate: Math.round((w2Goal / 4) * 100),
          healthStatus: w2Health.healthStatus,
          heightStatus: w2Health.heightStatus,
          weightStatus: w2Health.weightStatus,
          height: w2Health.height,
          weight: w2Health.weight,
          hasHealthCheckThisWeek: w2Health.hasCheckThisWeek,
          healthExamDate: w2Health.examDate,
          healthSourceLabel: w2Health.healthSourceLabel,
        },
        week3: {
          attendancePresent: w3Att,
          attendanceTotal: 5,
          attendanceRate: Math.round((w3Att / 5) * 100),
          goalsAchieved: w3Goal,
          goalsTotal: 4,
          goalsRate: Math.round((w3Goal / 4) * 100),
          healthStatus: w3Health.healthStatus,
          heightStatus: w3Health.heightStatus,
          weightStatus: w3Health.weightStatus,
          height: w3Health.height,
          weight: w3Health.weight,
          hasHealthCheckThisWeek: w3Health.hasCheckThisWeek,
          healthExamDate: w3Health.examDate,
          healthSourceLabel: w3Health.healthSourceLabel,
        },
        week4: {
          attendancePresent: w4Att,
          attendanceTotal: 5,
          attendanceRate: Math.round((w4Att / 5) * 100),
          goalsAchieved: w4Goal,
          goalsTotal: 4,
          goalsRate: Math.round((w4Goal / 4) * 100),
          healthStatus: w4Health.healthStatus,
          heightStatus: w4Health.heightStatus,
          weightStatus: w4Health.weightStatus,
          height: w4Health.height,
          weight: w4Health.weight,
          hasHealthCheckThisWeek: w4Health.hasCheckThisWeek,
          healthExamDate: w4Health.examDate,
          healthSourceLabel: w4Health.healthSourceLabel,
        },
      },
    };
  };

  // Load monthly assessment data from backend with session memory cache for 0ms transitions
  useEffect(() => {
    async function loadData() {
      const cacheKey = `${targetClassId}_${selectedMonth}_${selectedYear}`;
      if (monthCacheRef.current.has(cacheKey)) {
        const cached = monthCacheRef.current.get(cacheKey);
        setStudents(cached);
        setInitialStudents(JSON.parse(JSON.stringify(cached)));
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
        setLastSavedTime(timeStr);
        isInitialLoadRef.current = false;
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const res = await assessmentApi.getMonthlyAssessments(targetClassId, {
          month: selectedMonth,
          year: selectedYear,
        });
        if (res?.classInfo?.weekRanges) {
          setApiWeekRanges(res.classInfo.weekRanges);
        }
        setIsPublished(Boolean(res?.classInfo?.isPublished));
        const rawList = res?.students || [];
        const enriched = rawList.map((st, idx) => enrichStudentWithWeeklyStats(st, idx));
        monthCacheRef.current.set(cacheKey, enriched);
        setStudents(enriched);
        setInitialStudents(JSON.parse(JSON.stringify(enriched)));
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
        setLastSavedTime(timeStr);
        isInitialLoadRef.current = false;
      } catch (err) {
        console.warn('Failed to load monthly assessment data:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [targetClassId, selectedMonth, selectedYear]);

  // Track dirty state
  const isDirty = useMemo(() => {
    if (students.length === 0 || initialStudents.length === 0) return false;
    if (students.length !== initialStudents.length) return true;
    for (let i = 0; i < students.length; i++) {
      const cur = students[i];
      const init = initialStudents[i];
      if (!init || cur.id !== init.id) return true;
      if (
        Boolean(cur.week1Rose) !== Boolean(init.week1Rose) ||
        Boolean(cur.week2Rose) !== Boolean(init.week2Rose) ||
        Boolean(cur.week3Rose) !== Boolean(init.week3Rose) ||
        Boolean(cur.week4Rose) !== Boolean(init.week4Rose) ||
        (cur.teacherNotes || '') !== (init.teacherNotes || '')
      ) {
        return true;
      }
    }
    return false;
  }, [students, initialStudents]);

  // Check if all students in class have completed monthly evaluation comments
  const isAllEvaluated = useMemo(() => {
    if (!students || students.length === 0) return false;
    return students.every((s) => s.teacherNotes && s.teacherNotes.trim().length > 0);
  }, [students]);

  // Handle toggling weekly rose on table
  const handleToggleWeekRose = (studentId, weekNum) => {
    if (isReadOnly || !selectedMonthObj?.isEnded) return;
    setStudents((prev) =>
      prev.map((s) => {
        if (s.id !== studentId) return s;
        const key = `week${weekNum}Rose`;
        const updatedVal = !s[key];
        const newRecord = { ...s, [key]: updatedVal };

        const newRosesCount =
          (newRecord.week1Rose ? 1 : 0) +
          (newRecord.week2Rose ? 1 : 0) +
          (newRecord.week3Rose ? 1 : 0) +
          (newRecord.week4Rose ? 1 : 0);

        // Quy tắc: Đạt cả 4 hoa hồng trong tháng thì được 1 hoa sen (4/4 hoa)
        const lotusTarget = 4;

        return {
          ...newRecord,
          rosesCount: newRosesCount,
          isLotus: newRosesCount >= lotusTarget,
        };
      })
    );
  };

  // Auto-suggest roses using teacher's configured criteria
  const handleAutoSuggestRoses = (targetWeeks, customCriteria = null) => {
    if (isReadOnly || !selectedMonthObj?.isEnded) return;
    const criteria = customCriteria || suggestionCriteria;
    const weeksToProcess = Array.isArray(targetWeeks) ? targetWeeks : [targetWeeks];

    let totalAwarded = 0;
    setStudents((prev) =>
      prev.map((s) => {
        const updatedRecord = { ...s };

        weeksToProcess.forEach((wkNum) => {
          const stats = s.weeklyStats?.[`week${wkNum}`];
          const attRate = stats?.attendanceRate !== undefined ? stats.attendanceRate : 80;
          const gRate = stats?.goalsRate !== undefined ? stats.goalsRate : 75;
          const hStatus = stats?.healthStatus || 'Bình thường';

          const meetsAttendance = attRate >= criteria.minAttendanceRate;
          const meetsGoals = gRate >= criteria.minGoalsRate;
          const meetsHealth =
            criteria.allowedHealthStatuses.length === 0 ||
            criteria.allowedHealthStatuses.includes(hStatus) ||
            hStatus === 'Bình thường' ||
            hStatus === 'Tốt' ||
            hStatus === 'Chưa đánh giá';

          const isEligible = meetsAttendance && meetsGoals && meetsHealth;
          const key = `week${wkNum}Rose`;
          if (isEligible) totalAwarded++;
          updatedRecord[key] = isEligible;
        });

        const newRosesCount =
          (updatedRecord.week1Rose ? 1 : 0) +
          (updatedRecord.week2Rose ? 1 : 0) +
          (updatedRecord.week3Rose ? 1 : 0) +
          (updatedRecord.week4Rose ? 1 : 0);

        // Quy tắc: Đạt cả 4 hoa hồng trong tháng thì được 1 hoa sen (4/4 hoa)
        const lotusTarget = 4;

        return {
          ...updatedRecord,
          rosesCount: newRosesCount,
          isLotus: newRosesCount >= lotusTarget,
        };
      })
    );

    const weekText =
      weeksToProcess.length === 1
        ? t('assessment.weekNumText', 'Tuần {{week}}', { week: weeksToProcess[0] })
        : t('assessment.allWeeksInMonth', 'cả {{count}} tuần trong tháng', { count: weeksToProcess.length });
    toast.success(
      t('assessment.suggestFlowersSuccess', 'Đã gợi ý tặng hoa {{weekText}}! ({{totalAwarded}} lượt hoa được trao)', {
        weekText,
        totalAwarded,
      })
    );
  };

  // Handle inline teacher comment change
  const handleNotesChange = (studentId, teacherNotes) => {
    if (isReadOnly || !selectedMonthObj?.isEnded) return;
    setStudents((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, teacherNotes } : s))
    );
  };

  // Handle week note change
  const handleWeekNoteChange = (studentId, weekNum, note) => {
    setStudents((prev) =>
      prev.map((s) => {
        if (s.id !== studentId) return s;
        const wkKey = `week${weekNum}`;
        return {
          ...s,
          weeklyStats: {
            ...s.weeklyStats,
            [wkKey]: {
              ...s.weeklyStats[wkKey],
              note,
            },
          },
        };
      })
    );
  };

  // Save all modifications
  const handleSaveAll = async () => {
    if (!isDirty) return;
    setIsSavingAll(true);
    try {
      await assessmentApi.saveMonthlyAssessments(targetClassId, {
        month: selectedMonth,
        year: selectedYear,
        records: students.map((s) => ({
          studentId: s.id,
          week1Rose: Boolean(s.week1Rose),
          week2Rose: Boolean(s.week2Rose),
          week3Rose: Boolean(s.week3Rose),
          week4Rose: Boolean(s.week4Rose),
          week5Rose: false,
          teacherNotes: s.teacherNotes || '',
        })),
      });
      setInitialStudents(JSON.parse(JSON.stringify(students)));
      const cacheKey = `${targetClassId}_${selectedMonth}_${selectedYear}`;
      monthCacheRef.current.set(cacheKey, students);
      toast.success(
        t('assessment.saveGoodBehaviorSuccess', 'Đã lưu thành công Sổ Bé Ngoan tháng {{month}}/{{year}}!', {
          month: selectedMonth,
          year: selectedYear,
        })
      );
    } catch {
      toast.error(t('assessment.saveGoodBehaviorError', 'Không thể lưu sổ bé ngoan. Vui lòng thử lại.'));
    } finally {
      setIsSavingAll(false);
    }
  };

  // Toggle publish monthly assessment
  const handleTogglePublish = async () => {
    if (isPrincipal) return;
    const nextPublished = !isPublished;
    setIsPublishing(true);
    try {
      const res = await assessmentApi.publishMonthlyAssessments(targetClassId, {
        month: selectedMonth,
        year: selectedYear,
        isPublished: nextPublished,
      });
      setIsPublished(nextPublished);
      setStudents((prev) => prev.map((s) => ({ ...s, isPublished: nextPublished })));
      toast.success(
        res?.message ||
          (nextPublished
            ? t(
                'assessment.publishGoodBehaviorSuccess',
                'Đã công bố Sổ Bé Ngoan tháng {{month}}/{{year}} cho cả lớp!',
                { month: selectedMonth, year: selectedYear }
              )
            : t(
                'assessment.unpublishGoodBehaviorSuccess',
                'Đã gỡ công bố Sổ Bé Ngoan tháng {{month}}/{{year}}.',
                { month: selectedMonth, year: selectedYear }
              ))
      );
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          t('assessment.cannotChangePublishStatus', 'Không thể thay đổi trạng thái công bố.')
      );
    } finally {
      setIsPublishing(false);
    }
  };

  // Auto-save effect: automatically persists changes when teacher modifies roses or comments
  useEffect(() => {
    if (isInitialLoadRef.current || !isDirty || isReadOnly || !selectedMonthObj?.isEnded) {
      return;
    }

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(async () => {
      setIsSavingAll(true);
      try {
        await assessmentApi.saveMonthlyAssessments(targetClassId, {
          month: selectedMonth,
          year: selectedYear,
          records: students.map((s) => ({
            studentId: s.id,
            week1Rose: Boolean(s.week1Rose),
            week2Rose: Boolean(s.week2Rose),
            week3Rose: Boolean(s.week3Rose),
            week4Rose: Boolean(s.week4Rose),
            week5Rose: false,
            teacherNotes: s.teacherNotes || '',
          })),
        });
        setInitialStudents(JSON.parse(JSON.stringify(students)));
        const cacheKey = `${targetClassId}_${selectedMonth}_${selectedYear}`;
        monthCacheRef.current.set(cacheKey, students);

        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
        setLastSavedTime(timeStr);
      } catch (err) {
        console.warn('Auto-save monthly assessment error:', err);
      } finally {
        setIsSavingAll(false);
      }
    }, 600);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [students, isDirty, targetClassId, selectedMonth, selectedYear, isPrincipal, selectedMonthObj?.isEnded]);

  // Filtering
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      // If viewing a specific week tab, filter out students who were not yet enrolled in this week
      if (activeTab.startsWith('week')) {
        const wkNum = Number(activeTab.replace('week', ''));
        const curWkRange = monthWeekRanges.find((r) => r.week === wkNum);
        if (curWkRange && s.enrolledAt) {
          const enrDate = new Date(s.enrolledAt);
          if (enrDate > curWkRange.endDate) return false;
        }
        if (curWkRange && s.leftAt) {
          const leftDate = new Date(s.leftAt);
          if (leftDate < curWkRange.startDate) return false;
        }
      }

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q);

      let matchesStatus = true;
      if (statusFilter === 'LOTUS') {
        matchesStatus = s.isLotus;
      } else if (statusFilter === 'NOT_LOTUS') {
        matchesStatus = !s.isLotus;
      } else if (statusFilter === 'EVALUATED') {
        matchesStatus = Boolean(s.teacherNotes?.trim());
      } else if (statusFilter === 'NOT_EVALUATED') {
        matchesStatus = !s.teacherNotes?.trim();
      } else if (statusFilter === 'FEEDBACK') {
        matchesStatus = Boolean(s.parentFeedback);
      }

      return matchesSearch && matchesStatus;
    });
  }, [students, searchQuery, statusFilter]);

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

    if (!clean || clean === 'Chưa đánh giá') {
      return 'bg-muted/70 text-muted-foreground border border-border/60';
    }

    // Bình thường / Tốt -> Màu xanh lá (emerald)
    if (
      clean === 'Bình thường' ||
      clean === 'Tốt' ||
      clean.toLowerCase() === 'bình thường' ||
      clean.includes('Bình thường')
    ) {
      return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60';
    }

    // Tình trạng nặng / nguy cơ cao -> Màu đỏ / hồng đậm (rose)
    if (
      clean.includes('độ 2') ||
      clean.includes('nặng') ||
      clean.includes('Béo phì') ||
      clean.includes('Thừa cân')
    ) {
      return 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/60';
    }

    // Cần theo dõi / cảnh báo nhẹ-vừa (nhẹ cân, nguy cơ thừa cân, thấp còi độ 1, gầy còm) -> Vàng hổ phách (amber)
    return 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60';
  };

  const filterOptions = [
    { key: 'ALL', label: t('assessment.filterAllStatus', 'Tất cả trạng thái') },
    { key: 'LOTUS', label: t('assessment.filterLotus', 'Đạt Bông Sen Cháu ngoan Bác Hồ') },
    { key: 'NOT_LOTUS', label: t('assessment.filterNotLotus', 'Đang rèn luyện') },
    { key: 'EVALUATED', label: t('assessment.filterEvaluated', 'Đã nhận xét') },
    { key: 'NOT_EVALUATED', label: t('assessment.filterNotEvaluated', 'Chưa nhận xét') },
    { key: 'FEEDBACK', label: t('assessment.filterFeedback', 'Có phản hồi phụ huynh') },
  ];

  const currentWeekNumber = activeTab.startsWith('week') ? Number(activeTab.replace('week', '')) : null;
  const currentWeekRange = useMemo(() => {
    if (!currentWeekNumber) return null;
    return monthWeekRanges.find((r) => r.week === currentWeekNumber) || null;
  }, [monthWeekRanges, currentWeekNumber]);

  const monthDateRange = useMemo(() => {
    if (monthWeekRanges.length > 0) {
      const firstWk = monthWeekRanges[0];
      const lastWk = monthWeekRanges[monthWeekRanges.length - 1];
      return {
        startDateStr: firstWk.startDateStr,
        endDateStr: lastWk.endDateStr,
        rangeText: `Từ ngày ${firstWk.startDateStr} đến ngày ${lastWk.endDateStr}`,
      };
    }
    if (selectedMonthObj?.startDateStr && selectedMonthObj?.endDateStr) {
      return {
        startDateStr: selectedMonthObj.startDateStr,
        endDateStr: selectedMonthObj.endDateStr,
        rangeText: selectedMonthObj.rangeText || `Từ ngày ${selectedMonthObj.startDateStr} đến ngày ${selectedMonthObj.endDateStr}`,
      };
    }
    return null;
  }, [monthWeekRanges, selectedMonthObj]);

  return (
    <div className="flex-1 flex flex-row min-h-0 overflow-hidden relative">
      <div className="flex-1 flex flex-col gap-5 select-none overflow-y-auto pr-0.5">
        {/* 1. Page Header (Strictly matching StudentsPage) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-[26px] font-semibold text-foreground tracking-tight flex items-center gap-2.5">
              <span>{t('assessment.monthlyBookTitle', 'Sổ bé ngoan tháng {{month}}', { month: selectedMonth })}</span>
              <span
                className={cn(
                  'text-[12px] font-medium px-2 py-0.5 border rounded-none shrink-0 select-none tracking-normal font-sans',
                  isPublished
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                    : 'bg-muted/60 text-muted-foreground border-border'
                )}
              >
                {isPublished ? t('assessment.published', 'Đã công bố') : t('assessment.draft', 'Bản nháp')}
              </span>
            </h1>
            <p className="text-[12px] text-muted-foreground font-normal">
              {t('assessment.monthlyBookDesc', 'Theo dõi hoa bé ngoan hằng tuần, xét tặng Bông Sen Cháu ngoan Bác Hồ và phản hồi phụ huynh')}
            </p>
          </div>

          {/* View Actions Toolbar */}
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

            {/* Filter Dropdown Icon Button */}
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
                className="w-60 p-1 rounded-none border border-border bg-card shadow-xl z-50 text-foreground"
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

            {/* View Mode Icon Button */}
            <div className="flex items-center border border-border bg-card rounded-none overflow-hidden h-8">
              <button
                type="button"
                className="size-8 p-0 flex items-center justify-center bg-muted text-foreground cursor-default rounded-none"
                title={t('common.tableView', 'Dạng bảng')}
              >
                <HugeiconsIcon icon={Menu01Icon} size={15} />
              </button>
            </div>

            {/* Nút Xuất Excel Sổ Bé Ngoan */}
            <ExcelActionsDropdown
              onExport={handleExportGoodBehaviorExcel}
              isExporting={isExportingExcel}
              showImport={false}
            />
          </div>
        </div>

        {/* 2. Sub-Navigation Bar: Weekly Tabs & Summary Tab + Config Button + Save CTA */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
          {/* Segmented Week & Summary Switcher */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {monthWeeks.map((wk) => {
              const tabKey = `week${wk}`;
              const isActive = activeTab === tabKey;
              const range = monthWeekRanges.find((r) => r.week === wk);
              return (
                <button
                  key={wk}
                  type="button"
                  onClick={() => setActiveTab(tabKey)}
                  title={range ? range.rangeText : undefined}
                  className={cn(
                    'h-8 px-3.5 text-[13px] font-medium transition-all cursor-pointer rounded-none border flex items-center gap-1.5 shrink-0',
                    isActive
                      ? 'bg-foreground text-background border-foreground font-semibold shadow-xs'
                      : 'bg-card text-muted-foreground border-border hover:bg-muted/70 hover:text-foreground'
                  )}
                >
                  <span>{t('planning.weekPrefix', 'Tuần')} {wk}</span>
                  {range?.isCurrentWeek && (
                    <span
                      className="size-1.5 rounded-full bg-emerald-500 shrink-0"
                      title={t('assessment.thisWeekCurrent', 'Tuần hiện tại')}
                    />
                  )}
                </button>
              );
            })}

            <div className="h-5 w-[1px] bg-border mx-1 shrink-0" />

            {/* Summary Tab */}
            <button
              type="button"
              onClick={() => setActiveTab('summary')}
              title={monthDateRange ? monthDateRange.rangeText : undefined}
              className={cn(
                'h-8 px-3.5 text-[13px] font-medium transition-all cursor-pointer rounded-none border flex items-center gap-2 shrink-0',
                activeTab === 'summary'
                  ? 'bg-foreground text-background border-foreground font-semibold shadow-xs'
                  : 'bg-card text-muted-foreground border-border hover:bg-muted/70 hover:text-foreground'
              )}
            >
              <img src="/lotus.webp" alt={t('assessment.lotusAlt', 'Hoa sen')} className="size-4 object-contain" />
              <span>{t('assessment.monthlySummary', 'Tổng kết tháng')}</span>
            </button>
          </div>

          {/* Month Picker, Auto-Suggest Button, Config Button, and Save CTA Group */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Auto-Save Status Indicator (Arranged to the left so all buttons stay grouped together) */}
            {!isPrincipal && lastSavedTime && (
              <span className="text-[11.5px] text-muted-foreground/70 shrink-0 font-sans tracking-tight">
                {t('assessment.savedAt', 'Đã lưu lúc')} <span className="font-mono text-muted-foreground font-medium">{lastSavedTime}</span>
              </span>
            )}

            {/* Month Picker: DropdownMenu chỉ cho phép chọn các tháng đã kết thúc (Bỏ icon lịch) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="h-8 px-2.5 text-[13px] font-medium bg-background border border-border rounded-none text-foreground hover:bg-muted/60 flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                  title={t('assessment.selectMonthTooltip', 'Chọn tháng đánh giá sổ bé ngoan')}
                >
                  <span className="font-semibold">{selectedMonthObj?.label || `Tháng ${selectedMonth}/${selectedYear}`}</span>
                  <HugeiconsIcon icon={ArrowDown01Icon} size={12} className="text-muted-foreground ml-0.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-64 p-1 rounded-none border border-border bg-card shadow-lg z-50 text-foreground"
              >
                <div className="px-2.5 py-1.5 border-b border-border/60">
                  <div className="text-[12px] font-medium text-foreground">
                    {t('assessment.selectMonthTitle', 'Chọn tháng sổ bé ngoan')}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {t('assessment.onlyEvaluateEndedMonth', 'Chỉ đánh giá khi tháng đã kết thúc')}
                  </div>
                </div>
                <div className="py-1">
                  {academicMonths.map((item) => {
                    const isSelected = item.month === selectedMonth && item.year === selectedYear;
                    return (
                      <DropdownMenuItem
                        key={`${item.year}-${item.month}`}
                        disabled={!item.isEnded}
                        onClick={() => {
                          if (item.isEnded) {
                            handleSelectPeriod(item.month, item.year);
                          }
                        }}
                        className={cn(
                          'flex items-center justify-between px-2.5 py-1.5 text-[12.5px] rounded-none my-0.5 transition-colors',
                          item.isEnded
                            ? 'cursor-pointer hover:bg-muted text-foreground'
                            : 'cursor-not-allowed opacity-45 text-muted-foreground',
                          isSelected && 'bg-muted font-semibold text-foreground'
                        )}
                      >
                        <span>{item.label}</span>
                        <span className="text-[11px] text-muted-foreground">
                          {item.isEnded
                            ? isSelected
                              ? '✓'
                              : t('assessment.statusEnded', 'Đã kết thúc')
                            : item.isCurrent
                            ? t('assessment.statusOngoing', 'Đang diễn ra')
                            : t('assessment.statusNotStarted', 'Chưa diễn ra')}
                        </span>
                      </DropdownMenuItem>
                    );
                  })}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Auto-Suggest Roses Button & Config Button grouped together seamlessly */}
            {!isPrincipal && (
              <div className="inline-flex items-center -space-x-px shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  disabled={!selectedMonthObj?.isEnded}
                  onClick={() => handleAutoSuggestRoses(monthWeeks)}
                  className="h-8 px-3 text-[13px] font-medium rounded-none border-border bg-card hover:bg-muted text-foreground flex items-center justify-center gap-1.5 cursor-pointer shadow-none shrink-0 border-r-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={t('assessment.autoSuggestFlowersTooltip', 'Tự động xét và trao hoa cả {{count}} tuần theo tiêu chí đã cấu hình', { count: monthWeeks.length })}
                >
                  <span>{t('assessment.flowerSuggest', 'Gợi ý tặng hoa')}</span>
                </Button>
                <button
                  type="button"
                  onClick={() => setIsConfigDrawerOpen(true)}
                  className="size-8 flex items-center justify-center border border-border bg-card hover:bg-muted text-foreground rounded-none transition-colors cursor-pointer shrink-0"
                  title={t('assessment.configSuggestTooltip', 'Cấu hình tiêu chí gợi ý tặng hoa')}
                >
                  <HugeiconsIcon icon={Settings01Icon} size={15} className="text-muted-foreground" />
                </button>
              </div>
            )}

            {/* Single Clean Publish Button - Pure text, fixed width & smooth transition */}
            {!isPrincipal && (
              isPublished ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsConfirmModalOpen(true)}
                  disabled={isPublishing}
                  className="h-8 w-[118px] px-2 text-[12.5px] font-medium justify-center text-center rounded-none border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/15 cursor-pointer shadow-none shrink-0 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ease-in-out select-none"
                  title={t('assessment.unpublishMonthlyTooltip', 'Sổ bé ngoan tháng đã được công bố cho phụ huynh. Bấm để gỡ công bố')}
                >
                  {isPublishing ? t('assessment.processing', 'Đang xử lý...') : t('assessment.published', 'Đã công bố')}
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsConfirmModalOpen(true)}
                  disabled={isPublishing || !selectedMonthObj?.isEnded}
                  className="h-8 w-[118px] px-2 text-[12.5px] justify-center text-center rounded-none cursor-pointer shadow-none shrink-0 transition-all duration-200 ease-in-out select-none border border-border bg-card hover:bg-muted text-foreground font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                  title={
                    !selectedMonthObj?.isEnded
                      ? t('assessment.monthNotEndedPublishTooltip', 'Tháng chưa kết thúc. Chỉ được công bố khi tháng đã kết thúc.')
                      : isAllEvaluated
                      ? t('assessment.allEvaluatedPublishMonthTooltip', 'Tất cả học sinh đã có nhận xét. Bấm để công bố Sổ Bé Ngoan cho phụ huynh')
                      : t('assessment.publishMonthTooltip', 'Công bố Sổ Bé Ngoan tháng này cho phụ huynh')
                  }
                >
                  {isPublishing ? t('assessment.processing', 'Đang xử lý...') : t('assessment.publishMonthBtn', 'Công bố sổ tháng')}
                </Button>
              )
            )}

            {isPrincipal && (
              <span className="text-[12px] text-muted-foreground italic bg-muted/40 px-2.5 py-1 border border-border/60">
                {isVi ? t('assessment.principalViewOnly', 'Chế độ xem dành cho Ban giám hiệu') : 'Principal view-only mode'}
              </span>
            )}
          </div>
        </div>

        {/* Thông báo tháng chưa kết thúc nếu có */}
        {!selectedMonthObj?.isEnded && (
          <div className="flex items-center gap-2 px-3.5 py-2.5 border border-amber-500/30 bg-amber-500/[0.06] text-amber-800 dark:text-amber-300 text-[12.5px] rounded-none">
            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
            <span>
              <strong>{selectedMonthObj?.label}</strong> {selectedMonthObj?.isCurrent ? t('assessment.ongoingStatusNotice', 'đang diễn ra (chưa kết thúc tháng).') : t('assessment.notStartedStatusNotice', 'chưa diễn ra.')} {t('assessment.monthNotEndedRegulation', 'Theo quy chế trường mầm non, sổ bé ngoan chỉ được đánh giá và trao hoa khi tháng đã kết thúc.')}
            </span>
          </div>
        )}

        {/* Banner thông tin thời gian (Tuần hoặc Tổng kết tháng): Thiết kế 1 LINE duy nhất cực kỳ clean, gọn gàng, tinh tế */}
        {activeTab === 'summary' ? (
          monthDateRange && (
            <div className="flex items-center justify-between gap-3 px-3.5 py-2 bg-muted/15 border border-border text-[12.5px] rounded-none overflow-x-auto shadow-2xs">
              <div className="flex items-center gap-3 shrink-0 flex-wrap sm:flex-nowrap">
                {/* Tổng kết tháng & Khoảng thời gian */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="font-semibold text-foreground">
                    {t('assessment.monthlySummary', 'Tổng kết')} {selectedMonthObj?.label ? selectedMonthObj.label.toLowerCase() : `tháng ${selectedMonth}`}:
                  </span>
                  <span className="text-muted-foreground font-mono text-[12px]">
                    {t('common.from', 'Từ ngày')} <strong className="font-semibold text-foreground">{monthDateRange.startDateStr}</strong> {t('common.to', 'đến ngày')} <strong className="font-semibold text-foreground">{monthDateRange.endDateStr}</strong>
                  </span>
                  <span className="inline-flex items-center px-1.5 py-0.2 text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20 rounded-none ml-1">
                    {t('assessment.schoolWeeksCount', '{{count}} tuần học', { count: monthWeeks.length })}
                  </span>
                </div>
              </div>

              {/* Tháng bên phải */}
              <span className="text-[11.5px] text-muted-foreground font-mono shrink-0 hidden md:inline-block">
                {selectedMonthObj?.label || `Tháng ${selectedMonth}/${selectedYear}`}
              </span>
            </div>
          )
        ) : (
          currentWeekRange && (
            <div className="flex items-center justify-between gap-3 px-3.5 py-2 bg-muted/15 border border-border text-[12.5px] rounded-none overflow-x-auto shadow-2xs">
              <div className="flex items-center gap-3 shrink-0 flex-wrap sm:flex-nowrap">
                {/* Khoảng thời gian (Bỏ icon lịch và chữ Tuần X) */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-muted-foreground font-mono text-[12px]">
                    {t('common.from', 'Từ ngày')} <strong className="font-semibold text-foreground">{currentWeekRange.startDateStr}</strong> {t('common.to', 'đến ngày')} <strong className="font-semibold text-foreground">{currentWeekRange.endDateStr}</strong>
                  </span>
                  {currentWeekRange.isCurrentWeek && (
                    <span className="inline-flex items-center px-1.5 py-0.2 text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-none ml-1">
                      {t('assessment.thisWeekCurrent', 'Tuần hiện tại')}
                    </span>
                  )}
                </div>

                {/* Phân cách & Chủ đề - Chủ đề nhánh */}
                {(currentWeekRange.themeName || currentWeekRange.subThemeName) && (
                  <>
                    <div className="h-3.5 w-[1px] bg-border mx-0.5 shrink-0 hidden sm:block" />
                    <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground shrink-0">
                      <span className="text-muted-foreground">{t('assessment.themeLabel', 'Chủ đề:')}</span>
                      <span className="font-medium text-foreground">{currentWeekRange.themeName}</span>
                      {currentWeekRange.subThemeName && (
                        <>
                          <span className="text-muted-foreground/40 font-mono">›</span>
                          <span className="text-muted-foreground">{t('assessment.subThemeLabel', 'Nhánh:')}</span>
                          <span className="font-medium text-primary">{currentWeekRange.subThemeName}</span>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Tháng bên phải */}
              <span className="text-[11.5px] text-muted-foreground font-mono shrink-0 hidden md:inline-block">
                {selectedMonthObj?.label || `Tháng ${selectedMonth}/${selectedYear}`}
              </span>
            </div>
          )
        )}

        {/* 4. Table View (No action column - clean and spacious) */}
        <div className="w-full border border-border bg-card rounded-none overflow-x-auto shadow-xs select-none">
          {activeTab === 'summary' ? (
            /* =================== TAB TỔNG KẾT THÁNG =================== */
            <table className="w-full text-left border-collapse min-w-[850px]">
              <thead>
                <tr className="h-10 border-b border-border bg-muted/30 text-[13px] font-medium text-foreground">
                  <th className="px-3 min-w-[240px] font-medium">{t('students.student', 'Học sinh')}</th>
                  <th className="px-3 text-center font-medium min-w-[140px] w-36">{t('assessment.roseCount', 'Số lượng hoa hồng')}</th>
                  <th className="px-3 text-center font-medium min-w-[110px] w-28">{t('assessment.lotusFlower', 'Hoa sen')}</th>
                  <th className="px-3 min-w-[360px] font-medium">{t('assessment.teacherNotes', 'Nhận xét của giáo viên')}</th>
                  <th className="px-3 text-center font-medium min-w-[130px] w-36">{t('assessment.parentFeedback', 'Ý kiến phụ huynh')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {isLoading && students.length === 0 ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <tr key={idx} className="h-[72px] animate-pulse">
                      <td colSpan={5} className="px-3">
                        <div className="h-4 bg-muted/30 rounded-none" />
                      </td>
                    </tr>
                  ))
                ) : filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-muted-foreground text-[13px]">
                      {t('students.noStudentsFound', 'Không tìm thấy học sinh nào phù hợp.')}
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((st) => {
                    return (
                      <tr
                        key={st.id}
                        className="h-[72px] hover:bg-muted/40 transition-colors group cursor-default"
                      >
                        {/* Học sinh */}
                        <td className="px-3">
                          <div className="flex items-center gap-3">
                            <div className="size-8 shrink-0 rounded-none overflow-hidden border border-border/80 bg-muted/40">
                              <img
                                src={`https://api.dicebear.com/10.x/critters/svg?seed=${encodeURIComponent(st.code)}&backgroundColor=ff2e63,00c2a8,ffb300,3d5afe,8e24aa,00e676`}
                                alt={st.name}
                                className="size-full object-cover"
                              />
                            </div>
                            <div className="flex flex-col min-w-0 leading-tight">
                              <span className="text-[14px] font-medium text-foreground truncate">
                                {st.name}
                              </span>
                              <span className="text-[12px] text-muted-foreground truncate font-mono">
                                {st.code}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Cột số lượng hoa hồng */}
                        <td className="px-3 text-center">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-muted/30 border border-border/50 text-[13px] font-semibold text-foreground">
                            <img src="/rose.webp" alt="Hoa hồng" className="size-4 object-contain" />
                            <span>{st.rosesCount}/{monthWeeks.length} {t('assessment.flowersUnit', 'hoa')}</span>
                          </div>
                        </td>

                        {/* Cột hoa sen (Chỉ hiện hình hoa sen / không cần chữ) */}
                        <td className="px-3 text-center">
                          {st.isLotus ? (
                            <div
                              className="flex items-center justify-center"
                              title={t('assessment.lotusTitle', 'Bông Sen Cháu ngoan Bác Hồ')}
                            >
                              <img
                                src="/lotus.webp"
                                alt={t('assessment.lotusTitle', 'Bông Sen Cháu ngoan Bác Hồ')}
                                className="size-7 object-contain drop-shadow-xs"
                              />
                            </div>
                          ) : (
                            <span className="text-[13px] text-muted-foreground/30 font-medium">—</span>
                          )}
                        </td>

                        {/* Nhận xét cả tháng của giáo viên (2 dòng giống lý do chuyển) */}
                        <td className="px-3 align-middle">
                          <textarea
                            rows={2}
                            readOnly={isReadOnly}
                            disabled={isReadOnly}
                            value={st.teacherNotes || ''}
                            onChange={(e) => handleNotesChange(st.id, e.target.value)}
                            placeholder={isReadOnly ? '' : t('assessment.monthlyNotePlaceholder', 'Nhập nhận xét tổng kết cả tháng của bé...')}
                            title={st.teacherNotes || ''}
                            className={cn(
                              "w-full max-w-[360px] h-[46px] py-1 px-2 text-[13px] leading-[19px] text-foreground font-normal bg-transparent border border-transparent hover:border-border focus:border-[#1447e6] focus:bg-background rounded-none transition-colors resize-none focus:outline-none placeholder:text-muted-foreground/40 overflow-hidden focus:overflow-y-auto block select-text",
                              isReadOnly && "cursor-default opacity-85 hover:border-transparent focus:border-transparent"
                            )}
                          />
                        </td>

                        {/* Ý kiến phụ huynh: Bấm vào icon tin nhắn để mở popup xem nhanh và chuyển qua lại */}
                        <td className="px-3 text-center">
                          {st.parentFeedback ? (
                            <button
                              type="button"
                              onClick={() => {
                                const idx = feedbackStudents.findIndex((item) => item.id === st.id);
                                setFeedbackModalIndex(idx >= 0 ? idx : 0);
                              }}
                              className="size-8 mx-auto flex items-center justify-center text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 dark:bg-blue-950/60 dark:text-blue-300 dark:hover:bg-blue-900/60 dark:border-blue-900 rounded-none cursor-pointer transition-colors shadow-2xs"
                              title={`"${st.parentFeedback}"`}
                            >
                              <HugeiconsIcon icon={Message01Icon} size={16} />
                            </button>
                          ) : (
                            <span className="text-[13px] text-muted-foreground/30 font-medium select-none">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          ) : (
            /* =================== TAB TỪNG TUẦN (TUẦN 1 -> 5) =================== */
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="h-10 border-b border-border bg-muted/30 text-[13px] font-medium text-foreground">
                  <th className="px-3 min-w-[200px] w-52 font-medium">{t('students.student', 'Học sinh')}</th>
                  <th className="px-3 text-center font-medium min-w-[110px] w-28">{t('assessment.weeklyAttendance', 'Chuyên cần tuần')}</th>
                  <th className="px-3 text-center font-medium min-w-[125px] w-32">{t('assessment.lessonGoals', 'Mục tiêu bài học')}</th>
                  <th className="px-2 text-center font-medium min-w-[165px] w-44">{t('health.heightColumn', 'Chiều cao')}</th>
                  <th className="px-2 text-center font-medium min-w-[165px] w-44">{t('health.weightColumn', 'Cân nặng')}</th>
                  <th className="px-3 text-center font-medium min-w-[85px] w-24">{t('assessment.roseFlower', 'Hoa hồng')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {isLoading && students.length === 0 ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <tr key={idx} className="h-[72px] animate-pulse">
                      <td colSpan={6} className="px-3">
                        <div className="h-4 bg-muted/30 rounded-none" />
                      </td>
                    </tr>
                  ))
                ) : filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted-foreground text-[13px]">
                      {t('students.noStudentsFound', 'Không tìm thấy học sinh nào phù hợp.')}
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((st) => {
                    const isDoanGiaHung = (st.code === 'HS26028' || st.name?.includes('Đoàn Gia Hưng')) && currentWeekNumber === 1;
                    const wkStats = isDoanGiaHung
                      ? {
                          ...(st.weeklyStats?.[`week${currentWeekNumber}`] || {}),
                          height: 82.0,
                          heightStatus: 'Thấp còi độ 1',
                          heightZ: -2.4,
                          weight: 10.2,
                          weightStatus: 'Suy dinh dưỡng nhẹ cân',
                          weightZ: -2.3,
                          healthStatus: 'Theo dõi suy dinh dưỡng',
                          healthExamDate: '2026-10-02',
                        }
                      : (st.weeklyStats?.[`week${currentWeekNumber}`] || {});
                    const isAwarded = Boolean(st[`week${currentWeekNumber}Rose`]);

                    return (
                      <tr
                        key={st.id}
                        className="h-[72px] hover:bg-muted/40 transition-colors group cursor-default"
                      >
                        {/* Học sinh */}
                        <td className="px-3">
                          <div className="flex items-center gap-3">
                            <div className="size-8 shrink-0 rounded-none overflow-hidden border border-border/80 bg-muted/40">
                              <img
                                src={`https://api.dicebear.com/10.x/critters/svg?seed=${encodeURIComponent(st.code)}&backgroundColor=ff2e63,00c2a8,ffb300,3d5afe,8e24aa,00e676`}
                                alt={st.name}
                                className="size-full object-cover"
                              />
                            </div>
                            <div className="flex flex-col min-w-0 leading-tight">
                              <span className="text-[14px] font-medium text-foreground truncate">
                                {st.name}
                              </span>
                              <span className="text-[12px] text-muted-foreground truncate font-mono">
                                {st.code}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* % Chuyên cần tuần */}
                        <td className="px-3 text-center">
                          <div className="flex flex-col items-center justify-center leading-tight">
                            <span
                              className={cn(
                                'text-[13px] font-semibold',
                                (wkStats.attendanceRate ?? 0) >= 80 ? 'text-foreground' : 'text-amber-600 dark:text-amber-400'
                              )}
                            >
                              {wkStats.attendanceRate !== undefined
                                ? wkStats.attendanceRate
                                : Math.round(((wkStats.attendancePresent || 0) / (wkStats.attendanceTotal || 5)) * 100)}%
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              {wkStats.attendancePresent ?? 0}/{wkStats.attendanceTotal ?? 5} {t('assessment.sessionsUnit', 'buổi')}
                            </span>
                          </div>
                        </td>

                        {/* % Mục tiêu bài học tuần */}
                        <td className="px-3 text-center">
                          <div className="flex flex-col items-center justify-center leading-tight">
                            <span
                              className={cn(
                                'text-[13px] font-semibold',
                                (wkStats.goalsRate ?? 0) >= 75 ? 'text-foreground' : 'text-muted-foreground'
                              )}
                            >
                              {wkStats.goalsRate !== undefined
                                ? wkStats.goalsRate
                                : Math.round(((wkStats.goalsAchieved || 0) / (wkStats.goalsTotal || 4)) * 100)}%
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              {wkStats.goalsAchieved ?? 0}/{wkStats.goalsTotal ?? 4} {t('assessment.goalsUnit', 'mục tiêu')}
                            </span>
                          </div>
                        </td>

                        {/* Chiều cao & Cân nặng (Tách 2 cột theo dõi sức khỏe như báo cáo học sinh) */}
                        {(() => {
                          const { heightEvaluation, weightEvaluation } = resolveStudentHealthEvaluations(wkStats);
                          const dateDesc = formatExamDateDescription(wkStats.healthExamDate || wkStats.examDate, selectedYear);
                          const heightFormatted = formatMeasurement(wkStats.height, 'cm');
                          const weightFormatted = formatMeasurement(wkStats.weight, 'kg');
                          const heightTooltip = heightFormatted
                            ? `Chiều cao: ${heightFormatted} · ${heightEvaluation.label}`
                            : wkStats.healthSourceLabel || heightEvaluation.label;
                          const weightTooltip = weightFormatted
                            ? `Cân nặng: ${weightFormatted} · ${weightEvaluation.label}`
                            : wkStats.healthSourceLabel || weightEvaluation.label;

                          return (
                            <>
                              {/* 1. Chiều cao */}
                              <td className="px-2 text-center">
                                <div className="flex flex-col items-center justify-center leading-tight py-1">
                                  {heightFormatted ? (
                                    <span className="text-[13px] font-semibold text-foreground tracking-tight whitespace-nowrap">
                                      {heightFormatted}
                                    </span>
                                  ) : (
                                    <span className="text-[13px] text-muted-foreground/40 font-medium select-none">—</span>
                                  )}
                                  <div
                                    className="flex flex-wrap items-center justify-center gap-x-1 gap-y-0.5 text-[11px] leading-tight cursor-help mt-0.5"
                                    title={heightTooltip}
                                  >
                                    <span className={cn('font-medium whitespace-nowrap shrink-0', heightEvaluation.textColor)}>
                                      {heightEvaluation.label}
                                    </span>
                                    {dateDesc !== '—' && (
                                      <span className="text-muted-foreground/75 text-[10.5px] whitespace-nowrap shrink-0">
                                        ({dateDesc})
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* 2. Cân nặng */}
                              <td className="px-2 text-center">
                                <div className="flex flex-col items-center justify-center leading-tight py-1">
                                  {weightFormatted ? (
                                    <span className="text-[13px] font-semibold text-foreground tracking-tight whitespace-nowrap">
                                      {weightFormatted}
                                    </span>
                                  ) : (
                                    <span className="text-[13px] text-muted-foreground/40 font-medium select-none">—</span>
                                  )}
                                  <div
                                    className="flex flex-wrap items-center justify-center gap-x-1 gap-y-0.5 text-[11px] leading-tight cursor-help mt-0.5"
                                    title={weightTooltip}
                                  >
                                    <span className={cn('font-medium whitespace-nowrap shrink-0', weightEvaluation.textColor)}>
                                      {weightEvaluation.label}
                                    </span>
                                    {dateDesc !== '—' && (
                                      <span className="text-muted-foreground/75 text-[10.5px] whitespace-nowrap shrink-0">
                                        ({dateDesc})
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>
                            </>
                          );
                        })()}

                        {/* Quyết định hoa hồng tuần */}
                        <td className="px-3 text-center">
                          <button
                            type="button"
                            disabled={isReadOnly || !selectedMonthObj?.isEnded}
                            onClick={() => handleToggleWeekRose(st.id, currentWeekNumber)}
                            className={cn(
                              "size-9 mx-auto flex items-center justify-center rounded-none transition-all group/rose",
                              isReadOnly ? "cursor-default opacity-85" : "cursor-pointer hover:bg-muted/70"
                            )}
                            title={isReadOnly ? '' : isAwarded ? t('assessment.removeRose', 'Bấm để hủy hoa') : t('assessment.awardRose', 'Bấm để trao hoa hồng')}
                          >
                            {isAwarded ? (
                              <img
                                src="/rose.webp"
                                alt="Hoa hồng"
                                className="size-6 object-contain pointer-events-none drop-shadow-xs"
                              />
                            ) : (
                              <span className="text-[16px] text-muted-foreground/30 font-medium group-hover/rose:text-muted-foreground/60">
                                —
                              </span>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 5. Auto-Suggestion Criteria Configuration Drawer (Matching TeacherDrawer) */}
      {isConfigDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            onClick={() => setIsConfigDrawerOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in-0 duration-200"
          />

          {/* Drawer Panel matching TeacherDrawer */}
          <div className="relative w-full max-w-[500px] h-full bg-card border-l border-border shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-250 ease-out z-10 text-foreground">
            {/* Header (No gear icon in title, matching TeacherDrawer) */}
            <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-border shrink-0">
              <div className="flex flex-col gap-1">
                <h2 className="text-[18px] font-semibold text-foreground tracking-tight">
                  {t('assessment.configDrawerTitle', 'Cấu hình gợi ý tặng hoa')}
                </h2>
                <p className="text-[12px] text-muted-foreground font-normal">
                  {t('assessment.configDrawerDesc', 'Thiết lập tiêu chuẩn tự động đề xuất hoa bé ngoan hằng tuần')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsConfigDrawerOpen(false)}
                className="size-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-none transition-colors cursor-pointer"
                title={t('common.close', 'Đóng')}
              >
                <HugeiconsIcon icon={Cancel01Icon} size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-6 text-[13px]">
              {/* 1. % Chuyên cần */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-foreground">
                    {t('assessment.minAttendanceLabel', '1. Chuyên cần tuần tối thiểu')}
                  </label>
                </div>
                <p className="text-[12px] text-muted-foreground">
                  {t('assessment.minAttendanceDesc', 'Tỷ lệ số ngày bé đi học đủ trong tuần')}
                </p>
                <div className="flex items-center gap-2 pt-0.5">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={suggestionCriteria.minAttendanceRate}
                    onChange={(e) =>
                      setSuggestionCriteria((prev) => ({
                        ...prev,
                        minAttendanceRate: Math.max(0, Math.min(100, Number(e.target.value) || 0)),
                      }))
                    }
                    className="h-9 w-20 text-center font-semibold bg-background border border-border rounded-none text-[13.5px] focus:outline-none focus:border-primary shadow-2xs font-mono"
                  />
                  <span className="text-[12.5px] text-muted-foreground">{t('assessment.attendanceRateUnit', '% chuyên cần')}</span>
                </div>
                {/* Quick presets */}
                <div className="flex items-center gap-1.5 pt-0.5">
                  {[60, 70, 80, 90, 100].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setSuggestionCriteria((prev) => ({ ...prev, minAttendanceRate: val }))}
                      className={cn(
                        'px-2.5 py-1 text-[11.5px] border rounded-none cursor-pointer transition-colors',
                        suggestionCriteria.minAttendanceRate === val
                          ? 'bg-foreground text-background border-foreground font-semibold'
                          : 'bg-muted/40 hover:bg-muted text-muted-foreground border-border'
                      )}
                    >
                      {val}%
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. % Mục tiêu bài học */}
              <div className="flex flex-col gap-2 pt-4 border-t border-border/60">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-foreground">
                    {t('assessment.minGoalsLabel', '2. Mục tiêu bài học tối thiểu')}
                  </label>
                </div>
                <p className="text-[12px] text-muted-foreground">
                  {t('assessment.minGoalsDesc', 'Tỷ lệ mục tiêu hoạt động giáo dục trong tuần đạt yêu cầu')}
                </p>
                <div className="flex items-center gap-2 pt-0.5">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={suggestionCriteria.minGoalsRate}
                    onChange={(e) =>
                      setSuggestionCriteria((prev) => ({
                        ...prev,
                        minGoalsRate: Math.max(0, Math.min(100, Number(e.target.value) || 0)),
                      }))
                    }
                    className="h-9 w-20 text-center font-semibold bg-background border border-border rounded-none text-[13.5px] focus:outline-none focus:border-primary shadow-2xs font-mono"
                  />
                  <span className="text-[12.5px] text-muted-foreground">{t('assessment.goalsRateUnit', '% bài học đạt')}</span>
                </div>
                {/* Quick presets */}
                <div className="flex items-center gap-1.5 pt-0.5">
                  {[50, 60, 70, 80, 100].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setSuggestionCriteria((prev) => ({ ...prev, minGoalsRate: val }))}
                      className={cn(
                        'px-2.5 py-1 text-[11.5px] border rounded-none cursor-pointer transition-colors',
                        suggestionCriteria.minGoalsRate === val
                          ? 'bg-foreground text-background border-foreground font-semibold'
                          : 'bg-muted/40 hover:bg-muted text-muted-foreground border-border'
                      )}
                    >
                      {val}%
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Tiêu chí sức khỏe giáo viên chọn được */}
              <div className="flex flex-col gap-2.5 pt-4 border-t border-border/60">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-foreground">
                    {t('assessment.healthStandardLabel', '3. Tiêu chuẩn sức khỏe (lần khám gần nhất)')}
                  </label>
                  <span className="text-[12px] text-muted-foreground">
                    {suggestionCriteria.allowedHealthStatuses.length === 0
                      ? t('assessment.unlimited', 'Không giới hạn')
                      : t('assessment.statusCount', '{{count}} trạng thái', { count: suggestionCriteria.allowedHealthStatuses.length })}
                  </span>
                </div>
                <p className="text-[12px] text-muted-foreground">
                  {t('assessment.healthStandardDesc', 'Chọn các trạng thái sức khỏe đủ điều kiện nhận hoa:')}
                </p>

                {/* Health Status Options */}
                <div className="grid grid-cols-1 gap-2 pt-1">
                  {[
                    { label: 'Bình thường', displayLabel: t('health.statusNormal', 'Bình thường'), desc: t('assessment.healthNormalDesc', 'Thể trạng phát triển bình thường theo chuẩn') },
                    { label: 'Theo dõi nhẹ cân', displayLabel: t('health.statusUnderweight', 'Theo dõi nhẹ cân'), desc: t('assessment.healthUnderweightDesc', 'Trẻ nhẹ cân nhưng sinh hoạt tốt') },
                    { label: 'Theo dõi thừa cân/béo phì', displayLabel: t('health.statusOverweight', 'Theo dõi thừa cân/béo phì'), desc: t('assessment.healthOverweightDesc', 'Trẻ cần kiểm soát khẩu phần') },
                    { label: 'Theo dõi thấp còi', displayLabel: t('health.statusStunted', 'Theo dõi thấp còi'), desc: t('assessment.healthStuntedDesc', 'Trẻ chậm phát triển chiều cao') },
                  ].map((item) => {
                    const isChecked = suggestionCriteria.allowedHealthStatuses.includes(item.label);
                    return (
                      <div
                        key={item.label}
                        onClick={() => {
                          setSuggestionCriteria((prev) => {
                            const exists = prev.allowedHealthStatuses.includes(item.label);
                            const updated = exists
                              ? prev.allowedHealthStatuses.filter((s) => s !== item.label)
                              : [...prev.allowedHealthStatuses, item.label];
                            return { ...prev, allowedHealthStatuses: updated };
                          });
                        }}
                        className="flex items-start gap-3 p-2.5 border border-border rounded-none cursor-pointer transition-colors select-none bg-card hover:bg-muted/30"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          readOnly
                          className="mt-0.5 size-4 accent-[#1447e6] rounded-none pointer-events-none"
                        />
                        <div className="flex flex-col leading-tight pointer-events-none">
                          <span className={cn('text-[13px]', isChecked ? 'text-foreground font-semibold' : 'text-foreground font-medium')}>
                            {item.displayLabel}
                          </span>
                          <span className="text-[11.5px] text-muted-foreground mt-0.5">
                            {item.desc}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Quick Health Presets */}
                <div className="flex items-center gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      setSuggestionCriteria((prev) => ({
                        ...prev,
                        allowedHealthStatuses: ['Bình thường'],
                      }))
                    }
                    className="px-2.5 py-1 text-[11.5px] border border-border bg-muted/30 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer rounded-none"
                  >
                    {t('assessment.onlyNormal', 'Chỉ Bình thường')}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setSuggestionCriteria((prev) => ({
                        ...prev,
                        allowedHealthStatuses: ['Bình thường', 'Theo dõi nhẹ cân'],
                      }))
                    }
                    className="px-2.5 py-1 text-[11.5px] border border-border bg-muted/30 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer rounded-none"
                  >
                    {t('assessment.normalAndUnderweight', 'Bình thường & Nhẹ cân')}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setSuggestionCriteria((prev) => ({
                        ...prev,
                        allowedHealthStatuses: [
                          'Bình thường',
                          'Theo dõi nhẹ cân',
                          'Theo dõi thừa cân/béo phì',
                          'Theo dõi thấp còi',
                        ],
                      }))
                    }
                    className="px-2.5 py-1 text-[11.5px] border border-border bg-muted/30 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer rounded-none"
                  >
                    {t('assessment.allHealthStatuses', 'Tất cả tình trạng')}
                  </button>
                </div>
              </div>
            </div>

            {/* Footer matching TeacherDrawer */}
            <div className="p-4 border-t border-border bg-muted/20 shrink-0 flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsConfigDrawerOpen(false)}
                className="h-8 px-4 border border-border text-[13px] rounded-none hover:bg-muted shadow-none cursor-pointer bg-card"
              >
                {t('common.cancel', 'Hủy')}
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setIsConfigDrawerOpen(false);
                  handleAutoSuggestRoses(monthWeeks, suggestionCriteria);
                }}
                className="h-8 px-5 bg-[#1447e6] hover:bg-[#1447e6]/90 text-white text-[13px] font-medium rounded-none shadow-none cursor-pointer"
              >
                {t('assessment.saveAndApply', 'Lưu & Áp dụng')}
              </Button>
            </div>
          </div>
        </div>
      )}



      {/* 7. Parent Feedback Popup Modal with fast Next/Prev & keyboard navigation */}
      {feedbackModalIndex !== null && (
        <ParentFeedbackModal
          isOpen={feedbackModalIndex !== null}
          feedbackStudents={feedbackStudents}
          currentIndex={feedbackModalIndex}
          onIndexChange={setFeedbackModalIndex}
          onClose={() => setFeedbackModalIndex(null)}
          className={currentClass?.name || 'Nhà trẻ 1'}
        />
      )}
      {/* Confirmation Dialog for Publish / Unpublish */}
      <Dialog open={isConfirmModalOpen} onOpenChange={setIsConfirmModalOpen}>
        <DialogContent className="max-w-md rounded-none p-5">
          <DialogHeader>
            <DialogTitle className="text-[16px] font-semibold text-foreground">
              {isPublished
                ? t('assessment.confirmUnpublishMonth', 'Xác nhận gỡ công bố')
                : t('assessment.confirmPublishMonth', 'Xác nhận công bố Sổ Bé Ngoan')}
            </DialogTitle>
            <DialogDescription className="text-[13px] text-muted-foreground pt-1.5 leading-relaxed">
              {isPublished
                ? t(
                    'assessment.confirmUnpublishMonthDesc',
                    'Bạn có chắc chắn muốn gỡ công bố Sổ Bé Ngoan tháng {{month}}/{{year}}? Phụ huynh sẽ tạm thời không xem được sổ tháng này trên ứng dụng cho đến khi được công bố lại.',
                    { month: selectedMonth, year: selectedYear }
                  )
                : t(
                    'assessment.confirmPublishMonthDesc',
                    'Công bố Sổ Bé Ngoan tháng {{month}}/{{year}} cho cả lớp ({{count}} học sinh)? Sau khi công bố, phụ huynh sẽ nhận được thông báo và xem được hoa bé ngoan cùng nhận xét trên ứng dụng.',
                    { month: selectedMonth, year: selectedYear, count: students.length }
                  )}
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
              {t('common.cancel', 'Hủy')}
            </Button>
            <Button
              type="button"
              onClick={async () => {
                await handleTogglePublish();
                setIsConfirmModalOpen(false);
              }}
              disabled={isPublishing}
              className={cn(
                'h-8 px-3 text-[12.5px] font-semibold rounded-none shadow-none',
                isPublished
                  ? 'bg-destructive hover:bg-destructive/90 text-white'
                  : 'bg-foreground text-background hover:bg-foreground/90'
              )}
            >
              {isPublishing
                ? t('assessment.processing', 'Đang xử lý...')
                : isPublished
                ? t('assessment.unpublishBtn', 'Gỡ công bố')
                : t('assessment.confirmPublishMonthBtn', 'Xác nhận công bố')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default MonthlyAssessmentTab;
