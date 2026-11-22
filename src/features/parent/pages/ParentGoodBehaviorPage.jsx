import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useOutletContext } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Award,
  Sparkles,
  Send,
  MessageSquare,
  CheckCircle2,
  Calendar,
  BookOpen,
  Brain,
  Activity,
  Heart,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  AlertCircle,
  FileCheck2,
  User,
  Info,
  Edit3,
} from 'lucide-react';
import { toast } from 'sonner';
import { parentApi } from '../api/parent.api';
import { Button } from '@/components/ui/button';
import { cn } from '@/shared/lib/utils';
import { getAcademicMonths, getMonthWeekRanges } from '@/features/assessment';

export function ParentGoodBehaviorPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const outletCtx = useOutletContext() || {};
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeMode, setActiveMode] = useState('monthly'); // 'monthly' | 'semester'
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const m = searchParams.get('month');
    return m && !isNaN(Number(m)) ? Number(m) : null;
  });
  const [selectedYear, setSelectedYear] = useState(() => {
    const y = searchParams.get('year');
    return y && !isNaN(Number(y)) ? Number(y) : null;
  });
  const [feedbackText, setFeedbackText] = useState('');
  const [isEditingFeedback, setIsEditingFeedback] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const tabParam = searchParams.get('tab');
  const classId = searchParams.get('classId') || outletCtx.selectedClassId || null;

  useEffect(() => {
    if (tabParam === 'semester') {
      setActiveMode('semester');
    }
  }, [tabParam]);

  const fetchAssessment = async (month = null, year = null) => {
    try {
      setLoading(true);
      const params = {
        ...(month ? { month } : {}),
        ...(year ? { year } : {}),
        ...(classId ? { classId } : {}),
      };
      const res = await parentApi.getGoodBehavior(params);
      setData(res);
      setFeedbackText(res?.record?.parentFeedback || '');
      setIsEditingFeedback(false);
      if (res?.period) {
        setSelectedMonth(res.period.month);
        setSelectedYear(res.period.year);
        setSearchParams((p) => {
          const next = new URLSearchParams(p);
          if (!next.get('month')) next.set('month', res.period.month);
          if (!next.get('year')) next.set('year', res.period.year);
          return next;
        }, { replace: true });
      }
    } catch (err) {
      console.error('Failed to load good behavior data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Preserve URL month/year on F5 if present
    const urlMonth = searchParams.get('month') ? Number(searchParams.get('month')) : null;
    const urlYear = searchParams.get('year') ? Number(searchParams.get('year')) : null;
    fetchAssessment(urlMonth, urlYear);
  }, [classId]);

  const handleSendFeedback = async (e) => {
    e.preventDefault();
    if (!feedbackText.trim()) {
      toast.error('Vui lòng nhập nội dung ý kiến phản hồi.');
      return;
    }

    try {
      setIsSubmitting(true);
      await parentApi.submitGoodBehaviorFeedback({
        month: selectedMonth,
        year: selectedYear,
        feedback: feedbackText.trim(),
      });
      toast.success('Gửi ý kiến phản hồi thành công!', {
        description: 'Giáo viên phụ trách đã nhận được tin nhắn phản hồi của gia đình.',
      });
      setIsEditingFeedback(false);
      fetchAssessment(selectedMonth, selectedYear);
    } catch (err) {
      toast.error('Gửi ý kiến thất bại', {
        description: err.response?.data?.message || err.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const record = data?.record || {
    rosesCount: 0,
    maxRoses: 4,
    isLotus: false,
    weeks: { week1: false, week2: false, week3: false, week4: false },
    teacherNotes: '',
    evaluatorName: 'Giáo viên chủ nhiệm',
    parentFeedback: '',
    feedbackAt: null,
  };

  const monthWeekRanges = useMemo(() => {
    if (data?.weekRanges && Array.isArray(data.weekRanges) && data.weekRanges.length > 0) {
      return data.weekRanges;
    }
    return getMonthWeekRanges(selectedMonth, selectedYear);
  }, [data, selectedMonth, selectedYear]);

  const monthWeeks = useMemo(() => {
    if (monthWeekRanges.length > 0) {
      return monthWeekRanges.map((r) => r.week);
    }
    if (data?.monthWeeks && Array.isArray(data.monthWeeks)) {
      return data.monthWeeks;
    }
    return [1, 2, 3, 4];
  }, [monthWeekRanges, data]);

  const currentWeekInSelectedMonth = useMemo(() => {
    return monthWeekRanges.find((r) => r.isCurrentWeek) || null;
  }, [monthWeekRanges]);

  const weeklyStats = data?.weeklyStats || {};

  // Tính toán số liệu tổng hợp trong tháng (Chuyên cần, Mục tiêu giáo dục, Thể trạng)
  const monthlySummary = useMemo(() => {
    let totalAttPresent = 0;
    let totalAttTotal = 0;
    let totalGoalsAchieved = 0;
    let totalGoalsTotal = 0;
    let latestHealthStatus = 'Bình thường';

    monthWeeks.forEach((wk) => {
      const stat = weeklyStats[`week${wk}`];
      if (stat) {
        if (stat.attendanceTotal > 0) {
          totalAttPresent += Number(stat.attendancePresent || 0);
          totalAttTotal += Number(stat.attendanceTotal || 0);
        }
        if (stat.goalsTotal > 0) {
          totalGoalsAchieved += Number(stat.goalsAchieved || 0);
          totalGoalsTotal += Number(stat.goalsTotal || 0);
        }
        if (
          stat.healthStatus &&
          stat.healthStatus !== 'Chưa có dữ liệu' &&
          stat.healthStatus !== 'Chưa đánh giá'
        ) {
          latestHealthStatus = stat.healthStatus;
        }
      }
    });

    const attRate = totalAttTotal > 0 ? Math.round((totalAttPresent / totalAttTotal) * 100) : 0;
    const goalsRate = totalGoalsTotal > 0 ? Math.round((totalGoalsAchieved / totalGoalsTotal) * 100) : 0;

    return {
      totalAttPresent,
      totalAttTotal,
      attRate,
      totalGoalsAchieved,
      totalGoalsTotal,
      goalsRate,
      latestHealthStatus,
    };
  }, [weeklyStats, monthWeeks]);

  const availableMonths = useMemo(() => {
    if (data?.historyMonths && data.historyMonths.length > 0) {
      return data.historyMonths;
    }
    const academic = getAcademicMonths();
    return academic.map((m) => ({
      month: Number(m.month),
      year: Number(m.year),
      label: m.isCurrent ? `${m.label} (Hiện tại)` : m.label,
    }));
  }, [data]);

  const isCurrentMonth = useMemo(() => {
    const latest = availableMonths[0];
    return latest && selectedMonth === latest.month && selectedYear === latest.year;
  }, [availableMonths, selectedMonth, selectedYear]);

  const handlePrevMonth = useCallback(() => {
    const currentIdx = availableMonths.findIndex(
      (m) => m.month === selectedMonth && m.year === selectedYear
    );
    if (currentIdx < availableMonths.length - 1) {
      const prev = availableMonths[currentIdx + 1];
      setSelectedMonth(prev.month);
      setSelectedYear(prev.year);
      setSearchParams((p) => {
        const next = new URLSearchParams(p);
        next.set('month', prev.month);
        next.set('year', prev.year);
        return next;
      }, { replace: true });
      fetchAssessment(prev.month, prev.year);
    }
  }, [availableMonths, selectedMonth, selectedYear, setSearchParams]);

  const handleNextMonth = useCallback(() => {
    const currentIdx = availableMonths.findIndex(
      (m) => m.month === selectedMonth && m.year === selectedYear
    );
    if (currentIdx > 0) {
      const next = availableMonths[currentIdx - 1];
      setSelectedMonth(next.month);
      setSelectedYear(next.year);
      setSearchParams((p) => {
        const next = new URLSearchParams(p);
        next.set('month', next.month);
        next.set('year', next.year);
        return next;
      }, { replace: true });
      fetchAssessment(next.month, next.year);
    }
  }, [availableMonths, selectedMonth, selectedYear, setSearchParams]);

  const handleGoToCurrentMonth = useCallback(() => {
    const latest = availableMonths[0];
    if (latest) {
      setSelectedMonth(latest.month);
      setSelectedYear(latest.year);
      setSearchParams((p) => {
        const next = new URLSearchParams(p);
        next.set('month', latest.month);
        next.set('year', latest.year);
        return next;
      }, { replace: true });
      fetchAssessment(latest.month, latest.year);
    }
  }, [availableMonths, setSearchParams]);

  const semesterAssessments = data?.semesterAssessments || [];

  if (loading && !data) {
    return (
      <div className="w-full flex-1 flex items-center justify-center p-16 select-none font-sans">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Activity className="size-6 animate-pulse text-primary" />
          <span className="text-[13px]">{t('parent.behavior.loading', 'Đang tải sổ bé ngoan của bé...')}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="w-full flex-1 flex flex-col bg-background text-foreground select-none gap-4 pb-8 font-sans"
      data-node-id="5294:26028"
      data-name="FE-06D · Phụ huynh · Sổ bé ngoan & Đánh giá"
    >
      {/* 1. Header Action Toolbar (Clean subtitle on left, controls on right) */}
      <div className="flex items-center justify-between gap-3 pb-1 shrink-0 flex-wrap sm:flex-nowrap">
        <span className="text-[12.5px] text-muted-foreground font-normal hidden sm:inline-block">
          {t('parent.behavior.subtitle', 'Sổ theo dõi rèn luyện nề nếp, chuyên cần và hoa bé ngoan của bé')}
        </span>

        {/* Action Toolbar on the right */}
        <div className="relative flex items-center gap-2.5 ml-auto shrink-0 flex-wrap sm:flex-nowrap">
          {/* Mode Switcher: Hàng tháng / HK1 */}
          <div className="flex items-center border border-border bg-background rounded-none shadow-2xs">
            <button
              type="button"
              onClick={() => setActiveMode('monthly')}
              className={cn(
                'px-3 h-8 text-[12px] font-medium transition-colors cursor-pointer border-r border-border',
                activeMode === 'monthly'
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              {t('parent.behavior.monthlyMode', 'Hàng tháng')}
            </button>
            <button
              type="button"
              onClick={() => setActiveMode('semester')}
              className={cn(
                'px-3 h-8 text-[12px] font-medium transition-colors cursor-pointer flex items-center gap-1.5',
                activeMode === 'semester'
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              <BookOpen className="size-3.5" />
              <span>{t('parent.behavior.semesterMode', 'Tổng kết HK1')}</span>
            </button>
          </div>

          {/* Month Controls (Only in Monthly Mode) */}
          {activeMode === 'monthly' && (
            <div className="flex items-center gap-1.5">
              <div className="flex items-center border border-border bg-background text-[12.5px] rounded-none shadow-2xs">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  disabled={
                    availableMonths.findIndex(
                      (m) => m.month === selectedMonth && m.year === selectedYear
                    ) >=
                    availableMonths.length - 1
                  }
                  className="size-8 flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground border-r border-border transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                  title={t('common.prevMonth', 'Tháng trước')}
                >
                  <ChevronLeft className="size-4" />
                </button>

                <div className="w-[125px] h-8 flex items-center justify-center font-medium select-none text-[12px] text-foreground tabular-nums shrink-0">
                  <span>{selectedMonth ? `${t('calendar.month', 'Tháng')} ${selectedMonth}/${selectedYear}` : t('common.loading', 'Đang tải...')}</span>
                </div>

                <button
                  type="button"
                  onClick={handleNextMonth}
                  disabled={
                    availableMonths.findIndex(
                      (m) => m.month === selectedMonth && m.year === selectedYear
                    ) <= 0
                  }
                  className="size-8 flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground border-l border-border transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                  title={t('common.nextMonth', 'Tháng sau')}
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>

              {!isCurrentMonth && (
                <button
                  type="button"
                  onClick={handleGoToCurrentMonth}
                  className="h-8 px-2 text-[11.5px] font-medium text-primary hover:bg-primary/10 border border-primary/20 transition-colors cursor-pointer shrink-0"
                  title={t('common.backToCurrentMonth', 'Quay lại tháng hiện tại')}
                >
                  {t('common.current', 'Hiện tại')}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MODE 1: SỔ BÉ NGOAN HÀNG THÁNG */}
      {activeMode === 'monthly' && (
        <div className="flex flex-col gap-4">
          {/* Thông báo tiến độ nếu tháng đang diễn ra */}
          {!data?.period?.isEnded && !record.id && (
            <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 text-[12px] text-blue-900 dark:text-blue-200">
              <div className="flex items-center gap-2 min-w-0">
                <Info className="size-4 shrink-0 text-blue-600 dark:text-blue-400" />
                <span className="truncate sm:overflow-visible">
                  <strong>Tháng {selectedMonth}/{selectedYear}</strong> đang trong thời gian rèn luyện. Dữ liệu chuyên cần và mục tiêu giáo dục được cập nhật theo từng ngày.
                  {currentWeekInSelectedMonth && (
                    <span className="hidden md:inline ml-1 text-blue-800 dark:text-blue-300 font-medium">
                      (Hiện tại: Tuần {currentWeekInSelectedMonth.week}, {currentWeekInSelectedMonth.shortLabel || `${currentWeekInSelectedMonth.startDateStr} – ${currentWeekInSelectedMonth.endDateStr}`})
                    </span>
                  )}
                </span>
              </div>
              <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400 shrink-0 hidden sm:inline">
                Tổng kết cuối tháng
              </span>
            </div>
          )}

          {/* 1. THẺ TỔNG KẾT THÁNG DUY NHẤT (Loại bỏ hoàn toàn trùng lặp giáo viên & phản hồi, hợp nhất danh hiệu và chỉ số cốt lõi) */}
          <div className="border border-border bg-card p-4 sm:p-5 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            {/* Vùng vinh danh danh hiệu tháng */}
            <div className="flex items-center gap-3.5 sm:gap-4">
              <img
                src={record.isLotus ? '/lotus.webp' : '/rose.webp'}
                alt={record.isLotus ? 'Danh hiệu Hoa Sen' : 'Hoa bé ngoan'}
                className="size-11 sm:size-13 object-contain shrink-0 drop-shadow-2xs"
              />

              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[14px] sm:text-[15px] font-semibold text-foreground tracking-tight">
                    {record.isLotus
                      ? `Danh hiệu Hoa Sen · Tháng ${selectedMonth}/${selectedYear}`
                      : `Tổng kết Rèn luyện · Tháng ${selectedMonth}/${selectedYear}`}
                  </span>
                  {record.isLotus ? (
                    <span className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-900/60 inline-flex items-center gap-1">
                      <Sparkles className="size-3 text-emerald-600" />
                      <span>1 Hoa Sen · Xuất sắc</span>
                    </span>
                  ) : !data?.period?.isEnded && !record.id ? (
                    <span className="px-2 py-0.5 text-[11px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200/70 dark:border-blue-800">
                      Đang trong tháng rèn luyện
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 text-[11px] font-medium bg-muted text-muted-foreground border border-border">
                      Đã tổng kết tháng
                    </span>
                  )}
                </div>

                <p className="text-[12.5px] text-muted-foreground mt-1 leading-normal">
                  {record.isLotus
                    ? `Bé đạt xuất sắc trọn vẹn ${record.rosesCount}/${record.maxRoses} tuần hoa hồng và vinh dự nhận danh hiệu Hoa Sen tháng.`
                    : `Bé đã đạt ${record.rosesCount}/${record.maxRoses} tuần hoa hồng. (Tiêu chuẩn: Đạt đủ 4 hoa hồng trong tháng để nhận 1 Hoa Sen).`}
                </p>
              </div>
            </div>

            {/* Vùng chỉ số cốt lõi trong tháng của bé (Chuyên cần, Mục tiêu giáo dục, Sức khỏe) */}
            <div className="grid grid-cols-3 gap-3 sm:gap-6 pt-3.5 lg:pt-0 border-t lg:border-t-0 lg:border-l border-border lg:pl-6 shrink-0">
              {/* 1. Chuyên cần tháng */}
              <div className="flex flex-col">
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Calendar className="size-3 text-muted-foreground/70" />
                  <span>Chuyên cần tháng</span>
                </span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-[15px] font-bold font-mono text-foreground">
                    {monthlySummary.totalAttTotal > 0
                      ? `${monthlySummary.totalAttPresent}/${monthlySummary.totalAttTotal}`
                      : '—'}
                  </span>
                  <span className="text-[11px] text-muted-foreground font-mono">ngày</span>
                </div>
                <span className="text-[10.5px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                  {monthlySummary.totalAttTotal > 0 ? `${monthlySummary.attRate}% đi học` : 'Chưa có số liệu'}
                </span>
              </div>

              {/* 2. Mục tiêu giáo dục */}
              <div className="flex flex-col">
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Brain className="size-3 text-muted-foreground/70" />
                  <span>Mục tiêu GD</span>
                </span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-[15px] font-bold font-mono text-foreground">
                    {monthlySummary.totalGoalsTotal > 0
                      ? `${monthlySummary.totalGoalsAchieved}/${monthlySummary.totalGoalsTotal}`
                      : '—'}
                  </span>
                  <span className="text-[11px] text-muted-foreground font-mono">tiêu chí</span>
                </div>
                <span className="text-[10.5px] text-primary font-medium mt-0.5">
                  {monthlySummary.totalGoalsTotal > 0 ? `${monthlySummary.goalsRate}% đạt chuẩn` : 'Chưa có số liệu'}
                </span>
              </div>

              {/* 3. Thể trạng & Sức khỏe */}
              <div className="flex flex-col">
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Heart className="size-3 text-muted-foreground/70" />
                  <span>Sức khỏe</span>
                </span>
                <span className="text-[13px] font-semibold text-foreground mt-1 truncate max-w-[110px]" title={monthlySummary.latestHealthStatus}>
                  {monthlySummary.latestHealthStatus}
                </span>
                <span className="text-[10.5px] text-muted-foreground mt-0.5">Theo dõi tốt</span>
              </div>
            </div>
          </div>

          {/* 2. CHI TIẾT ĐÁNH GIÁ CÁC TUẦN TRONG THÁNG */}
          <div className="border border-border bg-card p-4 sm:p-5 shadow-2xs flex flex-col gap-3.5">
            <div className="flex items-center justify-between pb-2.5 border-b border-border flex-wrap gap-2">
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                <span className="text-[13px] font-semibold text-foreground">
                  Chi tiết đánh giá từng tuần
                </span>
                <span className="text-[11.5px] text-muted-foreground font-normal hidden sm:inline">
                  · Tiêu chuẩn đạt hoa: Chuyên cần ≥ 80% · Hoàn thành mục tiêu GD ≥ 70% · Sức khỏe bình thường
                </span>
              </div>
              <span className={cn(
                "px-2 py-0.5 border text-[11px] font-mono font-medium shrink-0",
                record.rosesCount >= 4
                  ? "bg-emerald-50 text-emerald-700 border-emerald-300/70 dark:bg-emerald-950/50 dark:text-emerald-300"
                  : "bg-muted/60 border-border text-foreground"
              )}>
                Đạt {record.rosesCount}/{record.maxRoses} tuần
              </span>
            </div>

            {/* Lưới các tuần */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5">
              {monthWeeks.map((wk) => {
                const key = `week${wk}`;
                const isRose = Boolean(record.weeks?.[key]);
                const weekStat = weeklyStats[key];
                const status = weekStat?.status || (isRose ? 'ACHIEVED' : (data?.period?.isEnded || record?.id ? 'NOT_ACHIEVED' : 'NOT_EVALUATED'));
                const wkRange = monthWeekRanges.find((r) => r.week === wk);

                return (
                  <div
                    key={key}
                    className={cn(
                      'p-3.5 border flex flex-col justify-between transition-colors shadow-2xs',
                      isRose
                        ? 'bg-emerald-50/25 border-emerald-300/60 dark:bg-emerald-950/20 dark:border-emerald-800/60'
                        : wkRange?.isCurrentWeek
                        ? 'bg-primary/[0.02] border-primary/40'
                        : 'bg-muted/10 border-border'
                    )}
                  >
                    {/* Header thông tin tuần */}
                    <div className="flex flex-col items-center text-center">
                      <div className="flex items-center gap-1.5 flex-wrap justify-center">
                        <span className="text-[12.5px] font-semibold text-foreground">Tuần {wk}</span>
                        {wkRange?.isCurrentWeek && (
                          <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[9.5px] font-semibold border border-emerald-300/60 dark:border-emerald-800">
                            Tuần này
                          </span>
                        )}
                      </div>
                      {wkRange && (
                        <span className="text-[11px] text-muted-foreground font-mono mt-0.5">
                          {wkRange.shortLabel || (wkRange.startDateStr ? `${wkRange.startDateStr.slice(0, 5)} – ${wkRange.endDateStr.slice(0, 5)}` : '')}
                        </span>
                      )}
                      {(wkRange?.subThemeName || weekStat?.subThemeName) && (
                        <span
                          className="text-[10.5px] text-primary font-medium mt-1 truncate max-w-[155px] text-center"
                          title={`${wkRange?.themeName ? `${wkRange.themeName} - ` : ''}${wkRange?.subThemeName || weekStat?.subThemeName}`}
                        >
                          {wkRange?.subThemeName || weekStat?.subThemeName}
                        </span>
                      )}
                    </div>

                    {/* Biểu tượng Hoa bé ngoan */}
                    <div className="my-2.5 flex flex-col items-center justify-center min-h-[46px]">
                      <div className="size-11 flex items-center justify-center shrink-0">
                        {isRose ? (
                          <img
                            src="/rose.webp"
                            alt="Hoa bé ngoan"
                            className="size-10 object-contain drop-shadow-2xs transition-transform hover:scale-105 duration-200"
                          />
                        ) : (
                          <div className="size-9 rounded-full border border-dashed border-muted-foreground/35 flex items-center justify-center bg-muted/20">
                            <span className="text-[11px] text-muted-foreground font-mono">—</span>
                          </div>
                        )}
                      </div>

                      {/* Trạng thái tuần (chỉ hiển thị khi chưa đạt hoặc chưa đánh giá) */}
                      {!isRose && (
                        <div className="mt-1.5">
                          {status === 'NOT_ACHIEVED' ? (
                            <span className="inline-flex items-center px-2 py-0.5 text-[10.5px] font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200/70 dark:border-amber-900/50">
                              Chưa đạt
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 text-[10.5px] font-medium bg-muted/50 text-muted-foreground border border-border">
                              Chưa đánh giá
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Tóm tắt 3 tiêu chí của tuần */}
                    {weekStat && (
                      <div className="w-full pt-2.5 border-t border-border/60 flex flex-col gap-1 text-[11px]">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Chuyên cần</span>
                          <span className="font-mono font-medium text-foreground">
                            {weekStat.attendanceTotal > 0
                              ? `${weekStat.attendancePresent}/${weekStat.attendanceTotal} ngày`
                              : '—'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Mục tiêu GD</span>
                          <span className="font-mono font-medium text-foreground">
                            {weekStat.goalsTotal > 0
                              ? `${weekStat.goalsAchieved}/${weekStat.goalsTotal}`
                              : '—'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Sức khỏe</span>
                          <span className="font-medium text-foreground truncate max-w-[85px]" title={weekStat.healthStatus}>
                            {weekStat.healthStatus || 'Bình thường'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. NHẬN XÉT CỦA CÔ GIÁO & SỔ LIÊN LẠC GIA ĐÌNH */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Cột trái: Nhận xét tổng kết tháng của cô giáo */}
            <div className="border border-border bg-card p-4 sm:p-5 shadow-2xs flex flex-col justify-between gap-3">
              <div className="flex items-center justify-between pb-2.5 border-b border-border">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 text-primary" />
                  <span className="text-[13px] font-semibold text-foreground">
                    Nhận xét của Cô giáo chủ nhiệm
                  </span>
                </div>
                <span className="text-[11.5px] font-medium px-2 py-0.5 bg-muted/50 border border-border text-foreground">
                  {record.evaluatorName || 'Cô giáo chủ nhiệm'}
                </span>
              </div>

              <div className="p-3.5 bg-muted/20 border border-border/80 text-[12.5px] text-foreground leading-relaxed flex-1 min-h-[95px] flex flex-col justify-between">
                <p className={cn("italic", !record.teacherNotes && "text-muted-foreground not-italic")}>
                  {record.teacherNotes ? `“${record.teacherNotes}”` : (data?.period?.isEnded ? 'Chưa có nhận xét tổng kết cho tháng này.' : 'Đang trong thời gian rèn luyện. Cô giáo sẽ gửi nhận xét tổng kết vào cuối tháng.')}
                </p>
                {record.teacherNotes && (
                  <span className="text-[10.5px] text-muted-foreground mt-2 self-end">
                    Giáo viên chủ nhiệm · Tháng {selectedMonth}/{selectedYear}
                  </span>
                )}
              </div>
            </div>

            {/* Cột phải: Sổ liên lạc điện tử (Ý kiến trao đổi của Phụ huynh) */}
            <div className="border border-border bg-card p-4 sm:p-5 shadow-2xs flex flex-col gap-3">
              <div className="flex items-center justify-between pb-2.5 border-b border-border">
                <div className="flex items-center gap-2">
                  <MessageSquare className="size-4 text-primary" />
                  <span className="text-[13px] font-semibold text-foreground">
                    Ý kiến trao đổi của Phụ huynh
                  </span>
                </div>
                {record.feedbackAt && (
                  <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                    Đã gửi: {record.feedbackAt}
                  </span>
                )}
              </div>

              {record.parentFeedback && !isEditingFeedback ? (
                <div className="flex-1 flex flex-col justify-between gap-3">
                  <div className="p-3.5 bg-blue-50/30 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-900/40 text-[12.5px] text-foreground leading-relaxed flex-1 min-h-[75px]">
                    <p className="whitespace-pre-line">{record.parentFeedback}</p>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-muted-foreground">
                      Cô giáo đã nhận được ý kiến của gia đình
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFeedbackText(record.parentFeedback);
                        setIsEditingFeedback(true);
                      }}
                      className="rounded-none text-[12px] h-8 px-3 border-border hover:bg-muted cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <Edit3 className="size-3.5" />
                      <span>Chỉnh sửa</span>
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSendFeedback} className="flex flex-col gap-2.5 flex-1 justify-between">
                  <textarea
                    rows={3}
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder="Nhập ý kiến chia sẻ tình hình của bé hoặc nhắn nhủ cô giáo..."
                    className="w-full p-2.5 border border-border bg-background text-[12.5px] text-foreground rounded-none focus:outline-hidden focus:border-primary resize-none shadow-2xs flex-1 min-h-[75px]"
                  />
                  <div className="flex items-center justify-between pt-1">
                    {record.parentFeedback && isEditingFeedback ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setFeedbackText(record.parentFeedback);
                          setIsEditingFeedback(false);
                        }}
                        className="rounded-none text-[12px] h-8 px-3 text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        Hủy
                      </Button>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">
                        Ý kiến sẽ được gửi trực tiếp đến giáo viên chủ nhiệm
                      </span>
                    )}
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-none text-[12.5px] h-8.5 px-5 font-medium shadow-xs cursor-pointer inline-flex items-center gap-1.5 ml-auto"
                    >
                      <Send className="size-3.5 shrink-0" />
                      <span>{isSubmitting ? 'Đang gửi...' : 'Gửi cho cô giáo'}</span>
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODE 2: ĐÁNH GIÁ HỌC KỲ (5 LĨNH VỰC BỘ GD&ĐT) */}
      {activeMode === 'semester' && (
        <div className="flex flex-col gap-4 animate-in fade-in duration-150">
          {semesterAssessments.length === 0 ? (
            <div className="border border-border bg-card p-8 text-center text-muted-foreground text-[13px] shadow-xs flex flex-col items-center justify-center gap-2">
              <Info className="size-6 text-muted-foreground/60 mb-0.5" />
              <span className="font-semibold text-foreground text-[14px]">Kết quả học kỳ chưa được công bố</span>
              <p className="max-w-md text-[12.5px] leading-relaxed text-muted-foreground">
                Nhà trường và giáo viên chủ nhiệm đang trong quá trình rà soát và hoàn thiện dữ liệu đánh giá học kỳ của bé. Báo cáo tổng kết sẽ hiển thị ngay khi được công bố chính thức.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {semesterAssessments.map((sa) => (
                <div
                  key={sa.id}
                  className="border border-border bg-card shadow-xs flex flex-col overflow-hidden"
                >
                  <div className="flex items-center justify-between p-3.5 border-b border-border bg-card flex-wrap gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13.5px] font-bold text-foreground">
                        {sa.semesterLabel} · Lớp {sa.className || data?.classInfo?.name}
                      </span>
                      <span className="text-[11px] font-mono px-2 py-0.5 bg-muted border border-border text-foreground">
                        {sa.schoolYear || '2026-2027'}
                      </span>
                      {sa.dateRangeLabel && (
                        <span className="text-[11px] font-mono px-2 py-0.5 bg-muted/60 border border-border text-muted-foreground flex items-center gap-1">
                          <Calendar className="size-3 text-muted-foreground" />
                          {sa.dateRangeLabel}
                        </span>
                      )}
                      {sa.isPublished ? (
                        <span className="text-[11px] font-medium px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                          Đã công bố
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
                          {sa.isStarted === false ? 'Chưa bắt đầu' : 'Chưa công bố'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[11.5px] text-muted-foreground">
                      {sa.healthStatus && (
                        <span>
                          Sức khỏe: <strong className="text-foreground">{sa.healthStatus}</strong>
                        </span>
                      )}
                      <span>
                        Người đánh giá: <strong className="text-foreground">{sa.evaluatorName}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Banner when semester results are unfinalized / draft */}
                  {!sa.isPublished && (
                    <div className="px-3.5 py-2 bg-amber-500/10 border-b border-amber-500/20 text-amber-800 dark:text-amber-300 text-[12px] flex items-center justify-between flex-wrap gap-2">
                      <span className="font-medium">
                        {sa.isStarted === false
                          ? `Học kỳ chưa diễn ra (${sa.dateRangeLabel || ''}) — Dữ liệu chuyên cần & đánh giá sẽ được cập nhật khi học kỳ bắt đầu.`
                          : 'Kết quả học kỳ chưa được công bố — Dữ liệu tạm tính theo tiến độ học tập trên lớp'}
                      </span>
                      <span className="text-[11px] text-amber-700 dark:text-amber-300 font-mono">
                        {sa.isStarted === false ? 'Chưa bắt đầu' : 'Đang hoàn thiện nhận xét'}
                      </span>
                    </div>
                  )}

                  {/* 5 Domains Grid */}
                  {(sa.domains || []).length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-border border-b border-border">
                      {sa.domains.map((dom, dIdx) => (
                        <div
                          key={dIdx}
                          className="p-3.5 flex flex-col justify-between gap-2.5 bg-card"
                        >
                          <div>
                            <span className="text-[10.5px] font-mono text-muted-foreground block uppercase">
                              Lĩnh vực {dIdx + 1}
                            </span>
                            <span className="text-[12.5px] font-bold text-foreground leading-tight block mt-0.5">
                              {dom.name}
                            </span>
                          </div>
                          <div className="flex items-center justify-between border-t border-border pt-1.5">
                            <span className="text-[10.5px] font-semibold px-1.5 py-0.2 border rounded-none bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                              {dom.rating}
                            </span>
                            <span className="text-[11.5px] font-mono font-bold text-foreground">
                              {dom.score}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Semester Teacher Notes */}
                  <div className="p-3.5 bg-muted/15 text-[12.5px] text-foreground leading-relaxed">
                    <span className="font-semibold text-muted-foreground block text-[10.5px] uppercase tracking-wider mb-1">
                      Nhận xét tổng quát học kỳ:
                    </span>
                    {sa.teacherNotes || (
                      <span className="text-muted-foreground italic">
                        {sa.isStarted === false
                          ? 'Học kỳ chưa bắt đầu. Giáo viên sẽ cập nhật nhận xét đánh giá khi kết thúc học kỳ.'
                          : 'Giáo viên chủ nhiệm đang hoàn thiện nhận xét tổng kết cho học kỳ này.'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ParentGoodBehaviorPage;
