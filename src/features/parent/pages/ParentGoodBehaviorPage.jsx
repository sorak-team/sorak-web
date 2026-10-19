import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useOutletContext } from 'react-router-dom';
import {
  Award,
  Sparkles,
  Send,
  MessageSquare,
  CheckCircle2,
  Calendar,
  Utensils,
  Moon,
  Clock,
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
} from 'lucide-react';
import { toast } from 'sonner';
import { parentApi } from '../api/parent.api';
import { Button } from '@/components/ui/button';
import { cn } from '@/shared/lib/utils';

export function ParentGoodBehaviorPage() {
  const [searchParams] = useSearchParams();
  const outletCtx = useOutletContext() || {};
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeMode, setActiveMode] = useState('monthly'); // 'monthly' | 'semester'
  const [selectedMonth, setSelectedMonth] = useState(10);
  const [selectedYear, setSelectedYear] = useState(2026);
  const [activeWeekTab, setActiveWeekTab] = useState('week1'); // 'week1' | 'week2' | ... | 'summary'
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const tabParam = searchParams.get('tab');
  const classId = searchParams.get('classId') || outletCtx.selectedClassId || null;

  useEffect(() => {
    if (tabParam === 'semester') {
      setActiveMode('semester');
    }
  }, [tabParam]);

  const fetchAssessment = async (month, year) => {
    try {
      setLoading(true);
      const res = await parentApi.getGoodBehavior({
        month,
        year,
        ...(classId ? { classId } : {}),
      });
      setData(res);
      setFeedbackText(res?.record?.parentFeedback || '');
      if (res?.period) {
        setSelectedMonth(res.period.month);
        setSelectedYear(res.period.year);
      }
    } catch (err) {
      console.error('Failed to load good behavior data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssessment(selectedMonth, selectedYear);
  }, [selectedMonth, selectedYear, classId]);

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
        description: 'Giáo viên chủ nhiệm đã nhận được tin nhắn phản hồi của gia đình.',
      });
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
    maxRoses: 5,
    isLotus: false,
    weeks: { week1: false, week2: false, week3: false, week4: false, week5: false },
    teacherNotes: '',
    evaluatorName: 'Giáo viên chủ nhiệm',
    parentFeedback: '',
    feedbackAt: null,
  };

  const monthWeeks = useMemo(() => {
    if (data?.monthWeeks && Array.isArray(data.monthWeeks)) {
      return data.monthWeeks;
    }
    return selectedMonth === 9 ? [1, 2, 3, 4] : [1, 2, 3, 4, 5];
  }, [data, selectedMonth]);

  useEffect(() => {
    if (monthWeeks.length === 4 && activeWeekTab === 'week5') {
      setActiveWeekTab('week1');
    }
  }, [monthWeeks, activeWeekTab]);

  const weeklyStats = data?.weeklyStats || {};
  const currentWeekStats = weeklyStats[activeWeekTab] || null;

  const availableMonths = useMemo(() => {
    if (data?.historyMonths && data.historyMonths.length > 0) {
      return data.historyMonths;
    }
    return [
      { month: 10, year: 2026, label: 'Tháng 10/2026' },
      { month: 9, year: 2026, label: 'Tháng 9/2026' },
    ];
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
      setActiveWeekTab('week1');
    }
  }, [availableMonths, selectedMonth, selectedYear]);

  const handleNextMonth = useCallback(() => {
    const currentIdx = availableMonths.findIndex(
      (m) => m.month === selectedMonth && m.year === selectedYear
    );
    if (currentIdx > 0) {
      const next = availableMonths[currentIdx - 1];
      setSelectedMonth(next.month);
      setSelectedYear(next.year);
      setActiveWeekTab('week1');
    }
  }, [availableMonths, selectedMonth, selectedYear]);

  const handleGoToCurrentMonth = useCallback(() => {
    const latest = availableMonths[0];
    if (latest) {
      setSelectedMonth(latest.month);
      setSelectedYear(latest.year);
      setActiveWeekTab('week1');
    }
  }, [availableMonths]);

  const semesterAssessments = data?.semesterAssessments || [];

  return (
    <div
      className="w-full flex-1 flex flex-col bg-background text-foreground select-none gap-3.5 pb-8 font-sans"
      data-node-id="5294:26028"
      data-name="FE-06D · Phụ huynh · Sổ bé ngoan & Đánh giá"
    >
      {/* 1. Header Action Toolbar (No redundant H1, clean subtitle on left, controls on right) */}
      <div className="flex items-center justify-between gap-3 pb-2 shrink-0 flex-wrap sm:flex-nowrap">
        <span className="text-[12.5px] text-muted-foreground font-normal hidden sm:inline-block">
          Theo dõi rèn luyện nề nếp, chuyên cần, mục tiêu giáo dục và hoa bé ngoan của bé
        </span>

        {/* Action Toolbar on the right */}
        <div className="relative flex items-center gap-2.5 ml-auto shrink-0 flex-wrap sm:flex-nowrap">
          {/* Mode Switcher: Hàng tháng / HK1 */}
          <div className="flex items-center border border-border bg-background rounded-none shadow-2xs">
            <button
              type="button"
              onClick={() => setActiveMode('monthly')}
              className={cn(
                'px-2.5 h-8 text-[12px] font-medium transition-colors cursor-pointer border-r border-border',
                activeMode === 'monthly'
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              Hàng tháng
            </button>
            <button
              type="button"
              onClick={() => setActiveMode('semester')}
              className={cn(
                'px-2.5 h-8 text-[12px] font-medium transition-colors cursor-pointer flex items-center gap-1.5',
                activeMode === 'semester'
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              <BookOpen className="size-3.5" />
              <span>Tổng kết HK1</span>
            </button>
          </div>

          {/* Month Controls (Only in Monthly Mode) */}
          {activeMode === 'monthly' && (
            <>
              {/* Badge / Button Tháng hiện tại */}
              <button
                type="button"
                onClick={!isCurrentMonth ? handleGoToCurrentMonth : undefined}
                disabled={isCurrentMonth}
                className={cn(
                  'inline-flex items-center px-2.5 h-8 text-[12px] font-medium rounded-none border shrink-0 select-none whitespace-nowrap transition-all',
                  isCurrentMonth
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 cursor-default'
                    : 'bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground border-border hover:border-foreground/30 cursor-pointer shadow-2xs active:scale-[0.98]'
                )}
                title={isCurrentMonth ? 'Tháng hiện tại' : 'Về tháng hiện tại'}
              >
                {isCurrentMonth ? 'Tháng hiện tại' : 'Về tháng hiện tại'}
              </button>

              {/* Month Navigator Frame */}
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
                  title="Tháng trước"
                >
                  <ChevronLeft className="size-4" />
                </button>

                <div className="w-[130px] h-8 flex items-center justify-center font-medium select-none text-[12.5px] text-foreground tabular-nums shrink-0">
                  <span>Tháng {selectedMonth}/{selectedYear}</span>
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
                  title="Tháng sau"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* MODE 1: SỔ BÉ NGOAN HÀNG THÁNG */}
      {activeMode === 'monthly' && (
        <div className="flex flex-col gap-3.5">
          {/* 2. Unified Metric Strip (4 metrics with hairline dividers) */}
          <div className="border border-border bg-card shadow-xs grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border overflow-hidden">
            {/* Col 1: Hoa bé ngoan */}
            <div className="p-3.5 flex flex-col justify-between gap-1">
              <span className="text-[11.5px] text-muted-foreground">Hoa bé ngoan đạt được</span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400">
                  {record.rosesCount}
                </span>
                <span className="text-[13px] font-mono text-muted-foreground">
                  / {record.maxRoses} tuần
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground mt-0.5">
                Tỷ lệ đạt {Math.round((record.rosesCount / Math.max(1, record.maxRoses)) * 100)}%
              </span>
            </div>

            {/* Col 2: Danh hiệu rèn luyện */}
            <div className="p-3.5 flex flex-col justify-between gap-1">
              <span className="text-[11.5px] text-muted-foreground">Danh hiệu rèn luyện</span>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[14px] font-bold text-foreground">
                  {record.isLotus ? 'Bé ngoan xuất sắc 🏵️' : 'Bé ngoan chăm chỉ 🌱'}
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground mt-0.5">
                {record.isLotus ? 'Đạt chuẩn danh hiệu Hoa Sen' : 'Đang phấn đấu rèn luyện'}
              </span>
            </div>

            {/* Col 3: Giáo viên chủ nhiệm */}
            <div className="p-3.5 flex flex-col justify-between gap-1">
              <span className="text-[11.5px] text-muted-foreground">Giáo viên chủ nhiệm</span>
              <span className="text-[14px] font-bold text-foreground mt-1 truncate">
                {record.evaluatorName}
              </span>
              <span className="text-[11px] text-muted-foreground mt-0.5">Trường MN Hòn Tre</span>
            </div>

            {/* Col 4: Ý kiến gia đình */}
            <div className="p-3.5 flex flex-col justify-between gap-1">
              <span className="text-[11.5px] text-muted-foreground">Ý kiến gia đình</span>
              <span className="text-[14px] font-bold text-foreground mt-1 truncate">
                {record.parentFeedback ? 'Đã phản hồi cô' : 'Chưa gửi phản hồi'}
              </span>
              <span className="text-[11px] text-muted-foreground mt-0.5">
                {record.feedbackAt ? `Ngày ${record.feedbackAt}` : 'Sổ liên lạc điện tử'}
              </span>
            </div>
          </div>

          {/* 3. Week Sub-Tabs (Clean Segmented Toolbar) */}
          <div className="border border-border bg-card p-1 flex items-center justify-between gap-1 overflow-x-auto shadow-2xs">
            <div className="flex items-center gap-1 min-w-max">
              {monthWeeks.map((wk) => {
                const tabKey = `week${wk}`;
                const isTabActive = activeWeekTab === tabKey;
                const isRose = Boolean(record.weeks?.[tabKey]);

                return (
                  <button
                    key={tabKey}
                    type="button"
                    onClick={() => setActiveWeekTab(tabKey)}
                    className={cn(
                      'px-3.5 h-8 text-[12px] font-medium transition-all rounded-none border flex items-center gap-1.5 cursor-pointer select-none',
                      isTabActive
                        ? 'bg-primary/10 text-primary border-primary/40 font-semibold shadow-2xs'
                        : 'bg-transparent hover:bg-muted text-muted-foreground hover:text-foreground border-transparent'
                    )}
                  >
                    <span>Tuần {wk}</span>
                    <span className="text-[12px] leading-none">{isRose ? '🌹' : '⚪'}</span>
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setActiveWeekTab('summary')}
                className={cn(
                  'px-3.5 h-8 text-[12px] font-medium transition-all rounded-none border flex items-center gap-1.5 cursor-pointer select-none ml-1',
                  activeWeekTab === 'summary'
                    ? 'bg-primary/10 text-primary border-primary/40 font-semibold shadow-2xs'
                    : 'bg-transparent hover:bg-muted text-muted-foreground hover:text-foreground border-transparent'
                )}
              >
                <Sparkles className="size-3.5" />
                <span>Tổng kết tháng & Sổ liên lạc</span>
              </button>
            </div>
          </div>

          {/* 4. WEEK DETAILS VIEW (WHEN ACTIVE TAB IS WEEK 1..5) */}
          {activeWeekTab !== 'summary' && currentWeekStats && (
            <div className="flex flex-col gap-3.5 animate-in fade-in duration-150">
              {/* Rose Status Card */}
              <div className="border border-border bg-card p-3.5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="size-9 shrink-0 flex items-center justify-center text-lg border border-border bg-muted/20">
                    {currentWeekStats.rose ? '🌹' : '🌱'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-bold text-foreground">
                        {currentWeekStats.rose
                          ? `Đạt Hoa bé ngoan · ${currentWeekStats.weekLabel}`
                          : `Chưa đạt hoa bé ngoan · ${currentWeekStats.weekLabel}`}
                      </span>
                      <span
                        className={cn(
                          'text-[10.5px] font-semibold px-2 py-0.5 border rounded-none',
                          currentWeekStats.rose
                            ? 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
                            : 'bg-muted/70 border-border text-muted-foreground'
                        )}
                      >
                        {currentWeekStats.rose ? 'Đạt chuẩn xuất sắc' : 'Đang phấn đấu rèn luyện'}
                      </span>
                    </div>
                    <p className="text-[12px] text-muted-foreground mt-0.5">
                      {currentWeekStats.rose
                        ? 'Bé đã hoàn thành đầy đủ cả 3 tiêu chí: Chuyên cần từ 80%, Mục tiêu bài học từ 70% và Thể trạng sức khỏe tốt.'
                        : 'Bé cần cố gắng nâng cao chuyên cần hoặc hoàn thành thêm các mục tiêu giáo dục theo yêu cầu của cô.'}
                    </p>
                  </div>
                </div>

                <div className="text-[11.5px] font-mono text-muted-foreground self-start sm:self-auto shrink-0">
                  Đánh giá bởi: <span className="font-semibold text-foreground">{record.evaluatorName}</span>
                </div>
              </div>

              {/* 3 Teacher Evaluation Criteria in a Single Unified Strip */}
              <div className="border border-border bg-card shadow-xs grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border overflow-hidden">
                {/* 1. CHUYÊN CẦN */}
                <div className="p-3.5 flex flex-col justify-between gap-3">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between pb-2 border-b border-border">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="size-4 text-[#1447e6]" />
                        <span className="text-[12.5px] font-bold text-foreground">1. Chuyên cần tuần</span>
                      </div>
                      <span
                        className={cn(
                          'text-[10.5px] font-semibold px-2 py-0.5 border rounded-none',
                          currentWeekStats.meetsAttendance
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                            : 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
                        )}
                      >
                        {currentWeekStats.meetsAttendance ? 'Đạt (>= 80%)' : 'Chưa đạt (< 80%)'}
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between mt-1">
                      <span className="text-[12px] text-muted-foreground">Số ngày đi học:</span>
                      <span className="text-[16px] font-bold font-mono text-foreground">
                        {currentWeekStats.attendancePresent} / {currentWeekStats.attendanceTotal} ngày
                      </span>
                    </div>

                    {/* Clean Progress Bar */}
                    <div className="w-full bg-muted h-1.5 border border-border/50 overflow-hidden">
                      <div
                        className={cn(
                          'h-full transition-all duration-300',
                          currentWeekStats.meetsAttendance ? 'bg-emerald-600' : 'bg-amber-500'
                        )}
                        style={{ width: `${currentWeekStats.attendanceRate}%` }}
                      />
                    </div>
                  </div>

                  <p className="text-[11.5px] text-muted-foreground border-t border-border pt-2 leading-relaxed">
                    Tỷ lệ đi học thực tế:{' '}
                    <span className="font-semibold text-foreground font-mono">
                      {currentWeekStats.attendanceRate}%
                    </span>
                    . Yêu cầu tối thiểu là 80% (từ 4/5 ngày trong tuần).
                  </p>
                </div>

                {/* 2. MỤC TIÊU BÀI HỌC */}
                <div className="p-3.5 flex flex-col justify-between gap-3">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between pb-2 border-b border-border">
                      <div className="flex items-center gap-1.5">
                        <BookOpen className="size-4 text-[#1447e6]" />
                        <span className="text-[12.5px] font-bold text-foreground">2. Mục tiêu bài học</span>
                      </div>
                      <span
                        className={cn(
                          'text-[10.5px] font-semibold px-2 py-0.5 border rounded-none',
                          currentWeekStats.meetsGoals
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                            : 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
                        )}
                      >
                        {currentWeekStats.meetsGoals ? 'Đạt (>= 70%)' : 'Chưa đạt (< 70%)'}
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between mt-1">
                      <span className="text-[12px] text-muted-foreground">Mục tiêu hoàn thành:</span>
                      <span className="text-[16px] font-bold font-mono text-foreground">
                        {currentWeekStats.goalsAchieved} / {currentWeekStats.goalsTotal} mục tiêu
                      </span>
                    </div>

                    {/* Clean Progress Bar */}
                    <div className="w-full bg-muted h-1.5 border border-border/50 overflow-hidden">
                      <div
                        className={cn(
                          'h-full transition-all duration-300',
                          currentWeekStats.meetsGoals ? 'bg-emerald-600' : 'bg-amber-500'
                        )}
                        style={{ width: `${currentWeekStats.goalsRate}%` }}
                      />
                    </div>
                  </div>

                  <p className="text-[11.5px] text-muted-foreground border-t border-border pt-2 leading-relaxed">
                    Tỷ lệ hoàn thành mục tiêu:{' '}
                    <span className="font-semibold text-foreground font-mono">
                      {currentWeekStats.goalsRate}%
                    </span>
                    . Yêu cầu tối thiểu là 70% (từ 3/4 mục tiêu kỹ năng).
                  </p>
                </div>

                {/* 3. THỂ TRẠNG SỨC KHỎE */}
                <div className="p-3.5 flex flex-col justify-between gap-3">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between pb-2 border-b border-border">
                      <div className="flex items-center gap-1.5">
                        <Heart className="size-4 text-rose-500" />
                        <span className="text-[12.5px] font-bold text-foreground">3. Thể trạng sức khỏe</span>
                      </div>
                      <span
                        className={cn(
                          'text-[10.5px] font-semibold px-2 py-0.5 border rounded-none',
                          currentWeekStats.meetsHealth
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                            : 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
                        )}
                      >
                        {currentWeekStats.healthStatus}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[12px] text-muted-foreground">Đợt kiểm tra:</span>
                      <span className="text-[13px] font-mono font-medium text-foreground">
                        {currentWeekStats.healthExamDate || 'Theo dõi định kỳ'}
                      </span>
                    </div>

                    <div className="p-2 bg-muted/20 border border-border text-[11px] text-muted-foreground">
                      {currentWeekStats.healthSourceLabel}
                    </div>
                  </div>

                  <p className="text-[11.5px] text-muted-foreground border-t border-border pt-2 leading-relaxed">
                    Yêu cầu: Thể trạng đạt chuẩn WHO (Bình thường hoặc theo dõi nhẹ cân chăm sóc tốt).
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 5. MONTHLY SUMMARY & PARENT FEEDBACK (WHEN ACTIVE TAB IS 'summary') */}
          {activeWeekTab === 'summary' && (
            <div className="flex flex-col gap-3.5 animate-in fade-in duration-150">
              {/* Weekly Roses Grid Overview */}
              <div className="border border-border bg-card p-4 shadow-xs flex flex-col gap-3">
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <div className="flex items-center gap-2">
                    <Award className="size-4 text-rose-500" />
                    <span className="text-[13px] font-bold text-foreground">
                      Bảng tổng hợp Hoa bé ngoan các tuần trong tháng
                    </span>
                  </div>
                  <span className="text-[12px] font-mono text-muted-foreground">
                    Tổng kết: <strong className="text-rose-600">{record.rosesCount} hoa</strong>
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
                  {monthWeeks.map((wk) => {
                    const key = `week${wk}`;
                    const isRose = Boolean(record.weeks?.[key]);
                    return (
                      <div
                        key={key}
                        onClick={() => setActiveWeekTab(key)}
                        className={cn(
                          'p-3 border flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-colors hover:border-primary/60 rounded-none',
                          isRose
                            ? 'bg-rose-50/20 border-rose-200/80 dark:bg-rose-950/20 dark:border-rose-900/60'
                            : 'bg-muted/15 border-border'
                        )}
                      >
                        <span className="text-[12px] font-medium text-foreground">Tuần {wk}</span>
                        <span className="text-2xl my-0.5">{isRose ? '🌹' : '⚪'}</span>
                        <span
                          className={cn(
                            'text-[10px] font-semibold px-1.5 py-0.2 border rounded-none',
                            isRose
                              ? 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
                              : 'bg-muted/70 border-border text-muted-foreground'
                          )}
                        >
                          {isRose ? 'Đạt hoa' : 'Chưa đạt'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Teacher Summary Notes Card */}
              <div className="border border-border bg-card p-4 shadow-xs flex flex-col gap-3">
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-4 text-[#1447e6]" />
                    <span className="text-[13px] font-bold text-foreground">
                      Nhận xét tổng kết tháng của Cô giáo chủ nhiệm
                    </span>
                  </div>
                  <span className="text-[11.5px] text-muted-foreground">
                    Người đánh giá: <strong className="text-foreground">{record.evaluatorName}</strong>
                  </span>
                </div>

                <div className="p-3.5 bg-muted/15 border border-border text-[12.5px] text-foreground leading-relaxed">
                  {record.teacherNotes || 'Chưa có nhận xét tổng kết cho tháng này.'}
                </div>
              </div>

              {/* Parent Feedback (Sổ liên lạc điện tử) */}
              <div className="border border-border bg-card p-4 shadow-xs flex flex-col gap-3">
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="size-4 text-[#1447e6]" />
                    <span className="text-[13px] font-bold text-foreground">
                      Sổ liên lạc điện tử · Ý kiến trao đổi của Phụ huynh
                    </span>
                  </div>
                  {record.feedbackAt && (
                    <span className="text-[11.5px] font-mono text-muted-foreground">
                      Đã gửi ngày: {record.feedbackAt}
                    </span>
                  )}
                </div>

                <form onSubmit={handleSendFeedback} className="flex flex-col gap-2.5">
                  <p className="text-[12px] text-muted-foreground">
                    Gia đình có thể gửi phản hồi, chia sẻ tình hình của bé ở nhà hoặc nhắn nhủ cô giáo chủ nhiệm tại đây:
                  </p>
                  <textarea
                    rows={3}
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder="Nhập ý kiến phản hồi của gia đình về tình hình học tập và sinh hoạt của bé trong tháng..."
                    className="w-full p-3 border border-border bg-background text-[12.5px] text-foreground rounded-none focus:outline-hidden focus:border-primary resize-none shadow-2xs"
                  />
                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      size="sm"
                      disabled={isSubmitting}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-none text-[12px] h-8 px-4 font-semibold shadow-2xs cursor-pointer flex items-center gap-1.5"
                    >
                      <Send className="size-3.5" />
                      <span>{isSubmitting ? 'Đang gửi...' : 'Gửi phản hồi cho cô giáo'}</span>
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODE 2: ĐÁNH GIÁ HỌC KỲ (5 LĨNH VỰC BỘ GD&ĐT) */}
      {activeMode === 'semester' && (
        <div className="flex flex-col gap-3.5 animate-in fade-in duration-150">
          {semesterAssessments.length === 0 ? (
            <div className="border border-border bg-card p-8 text-center text-muted-foreground text-[13px] shadow-xs">
              Chưa có dữ liệu đánh giá học kỳ cho năm học này.
            </div>
          ) : (
            <div className="flex flex-col gap-3.5">
              {semesterAssessments.map((sa) => (
                <div
                  key={sa.id}
                  className="border border-border bg-card shadow-xs flex flex-col overflow-hidden"
                >
                  <div className="flex items-center justify-between p-3.5 border-b border-border bg-card">
                    <div className="flex items-center gap-2">
                      <span className="text-[13.5px] font-bold text-foreground">
                        {sa.semesterLabel} · Lớp {sa.className || data?.classInfo?.name}
                      </span>
                      <span className="text-[11px] font-mono px-2 py-0.5 bg-muted border border-border text-foreground">
                        {sa.schoolYear || '2026-2027'}
                      </span>
                    </div>
                    <span className="text-[11.5px] text-muted-foreground">
                      Người đánh giá: <strong className="text-foreground">{sa.evaluatorName}</strong>
                    </span>
                  </div>

                  {/* 5 Domains Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-border border-b border-border">
                    {(sa.domains || []).map((dom, dIdx) => (
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

                  {/* Semester Teacher Notes */}
                  <div className="p-3.5 bg-muted/15 text-[12.5px] text-foreground leading-relaxed">
                    <span className="font-semibold text-muted-foreground block text-[10.5px] uppercase tracking-wider mb-1">
                      Nhận xét tổng quát học kỳ:
                    </span>
                    {sa.teacherNotes}
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
