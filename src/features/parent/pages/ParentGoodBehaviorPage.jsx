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
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [selectedYear, setSelectedYear] = useState(null);
  const [feedbackText, setFeedbackText] = useState('');
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
    // Default to the latest month evaluated by the teacher (month/year = null triggers backend auto-select)
    fetchAssessment(null, null);
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
    evaluatorName: 'Giáo viên',
    parentFeedback: '',
    feedbackAt: null,
  };

  const monthWeeks = useMemo(() => {
    if (data?.monthWeeks && Array.isArray(data.monthWeeks)) {
      return data.monthWeeks;
    }
    return selectedMonth === 9 ? [1, 2, 3, 4] : [1, 2, 3, 4, 5];
  }, [data, selectedMonth]);

  const weeklyStats = data?.weeklyStats || {};

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
      fetchAssessment(prev.month, prev.year);
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
      fetchAssessment(next.month, next.year);
    }
  }, [availableMonths, selectedMonth, selectedYear]);

  const handleGoToCurrentMonth = useCallback(() => {
    const latest = availableMonths[0];
    if (latest) {
      setSelectedMonth(latest.month);
      setSelectedYear(latest.year);
      fetchAssessment(latest.month, latest.year);
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
                  <span>{selectedMonth ? `Tháng ${selectedMonth}/${selectedYear}` : 'Đang tải...'}</span>
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
          )}
        </div>
      </div>

      {/* MODE 1: SỔ BÉ NGOAN HÀNG THÁNG */}
      {activeMode === 'monthly' && (
        <div className="flex flex-col gap-3.5">
          {/* 1. Clean Summary Strip (3 metrics, concise, no redundant text) */}
          <div className="border border-border bg-card shadow-2xs grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border">
            {/* Metric 1: Kết quả tháng */}
            <div className="p-3.5 flex items-center gap-3">
              <img
                src={record.isLotus ? '/lotus.webp' : '/rose.webp'}
                alt="Hoa bé ngoan"
                className="w-10 h-10 object-contain drop-shadow-2xs shrink-0"
                style={{ width: 40, height: 40 }}
              />
              <div className="flex flex-col min-w-0">
                <span className="text-[11.5px] text-muted-foreground">Hoa bé ngoan tháng</span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400">
                    {record.rosesCount}/{record.maxRoses}
                  </span>
                  <span className="text-[12px] text-muted-foreground">tuần đạt hoa</span>
                </div>
              </div>
            </div>

            {/* Metric 2: Giáo viên */}
            <div className="p-3.5 flex flex-col justify-center">
              <span className="text-[11.5px] text-muted-foreground">Giáo viên</span>
              <span className="text-[13.5px] font-semibold text-foreground mt-0.5 truncate">
                {record.evaluatorName || 'Cô giáo chủ nhiệm'}
              </span>
              <span className="text-[11px] text-muted-foreground mt-0.5">Trường MN Hòn Tre</span>
            </div>

            {/* Metric 3: Trạng thái sổ liên lạc */}
            <div className="p-3.5 flex flex-col justify-center">
              <span className="text-[11.5px] text-muted-foreground">Sổ liên lạc gia đình</span>
              <span className="text-[13.5px] font-semibold text-foreground mt-0.5 truncate">
                {record.parentFeedback ? 'Đã gửi phản hồi' : 'Chưa có ý kiến phản hồi'}
              </span>
              <span className="text-[11px] text-muted-foreground mt-0.5">
                {record.feedbackAt ? `Ngày gửi: ${record.feedbackAt}` : 'Trao đổi cùng cô giáo'}
              </span>
            </div>
          </div>

          {/* Banner vinh danh Danh hiệu Hoa Sen nếu đạt từ 4 hoa trở lên */}
          {record.isLotus && (
            <div className="p-3 bg-rose-50/40 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/60 flex items-center gap-3">
              <img
                src="/lotus.webp"
                alt="Danh hiệu Hoa Sen"
                className="w-9 h-9 object-contain shrink-0 drop-shadow-2xs"
                style={{ width: 36, height: 36 }}
              />
              <div className="text-[12.5px] text-foreground leading-snug">
                <strong className="text-rose-600 dark:text-rose-400 font-semibold">Danh hiệu Hoa Sen: </strong>
                Bé đạt xuất sắc {record.rosesCount}/{record.maxRoses} tuần hoa bé ngoan trong tháng!
              </div>
            </div>
          )}

          {/* 2. Chi tiết đánh giá các tuần trong tháng */}
          <div className="border border-border bg-card p-4 shadow-2xs flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <span className="text-[13px] font-semibold text-foreground">
                Chi tiết đánh giá từng tuần
              </span>
              <span className="text-[11.5px] text-muted-foreground font-mono">
                Tháng {selectedMonth}/{selectedYear}
              </span>
            </div>

            {/* Lưới các tuần: Clean, không trùng lặp nhãn hoa hồng */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {monthWeeks.map((wk) => {
                const key = `week${wk}`;
                const isRose = Boolean(record.weeks?.[key]);
                const weekStat = weeklyStats[key];

                return (
                  <div
                    key={key}
                    className={cn(
                      'p-3 border flex flex-col items-center gap-2 rounded-none transition-colors shadow-2xs',
                      isRose
                        ? 'bg-rose-50/20 border-rose-200/80 dark:bg-rose-950/15 dark:border-rose-900/50'
                        : 'bg-muted/10 border-border'
                    )}
                  >
                    <span className="text-[12px] font-semibold text-foreground">Tuần {wk}</span>

                    <div className="w-12 h-12 my-1 flex items-center justify-center shrink-0">
                      {isRose ? (
                        <img
                          src="/rose.webp"
                          alt="Đạt hoa"
                          className="w-11 h-11 object-contain drop-shadow-2xs transition-transform hover:scale-105 duration-200"
                          style={{ width: 44, height: 44 }}
                        />
                      ) : (
                        <div
                          className="w-10 h-10 rounded-full border border-dashed border-muted-foreground/35 flex items-center justify-center bg-muted/20"
                          style={{ width: 40, height: 40 }}
                        >
                          <span className="text-[11px] text-muted-foreground font-mono">—</span>
                        </div>
                      )}
                    </div>

                    <span
                      className={cn(
                        'text-[11px] font-medium',
                        isRose
                          ? 'text-rose-600 dark:text-rose-400 font-semibold'
                          : 'text-muted-foreground'
                      )}
                    >
                      {isRose ? 'Đạt hoa' : 'Chưa đạt'}
                    </span>

                    {/* Tóm tắt 3 tiêu chí của tuần */}
                    {weekStat && (
                      <div className="w-full pt-2 border-t border-border/60 flex flex-col gap-1 text-[11px] text-muted-foreground">
                        <div className="flex items-center justify-between">
                          <span>Chuyên cần</span>
                          <span className="font-mono font-medium text-foreground">
                            {weekStat.attendancePresent}/{weekStat.attendanceTotal} ngày
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Mục tiêu GD</span>
                          <span className="font-mono font-medium text-foreground">
                            {weekStat.goalsAchieved}/{weekStat.goalsTotal}
                          </span>
                        </div>
                        <div className="flex items-center justify-between truncate">
                          <span>Sức khỏe</span>
                          <span className="font-medium text-foreground truncate">
                            {weekStat.healthStatus}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. Nhận xét của Cô giáo & Ý kiến Phụ huynh */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
            {/* Cột trái: Nhận xét tổng kết tháng của cô giáo */}
            <div className="border border-border bg-card p-4 shadow-2xs flex flex-col justify-between gap-3">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 text-primary" />
                  <span className="text-[13px] font-semibold text-foreground">
                    Nhận xét của Cô giáo chủ nhiệm
                  </span>
                </div>
                <span className="text-[11.5px] text-muted-foreground">
                  {record.evaluatorName}
                </span>
              </div>

              <div className="p-3 bg-muted/15 border border-border text-[12.5px] text-foreground leading-relaxed flex-1 min-h-[90px]">
                {record.teacherNotes || 'Chưa có nhận xét tổng kết cho tháng này.'}
              </div>
            </div>

            {/* Cột phải: Sổ liên lạc điện tử (Ý kiến của Phụ huynh) */}
            <div className="border border-border bg-card p-4 shadow-2xs flex flex-col gap-3">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <div className="flex items-center gap-2">
                  <MessageSquare className="size-4 text-primary" />
                  <span className="text-[13px] font-semibold text-foreground">
                    Ý kiến trao đổi của Phụ huynh
                  </span>
                </div>
                {record.feedbackAt && (
                  <span className="text-[11px] font-mono text-muted-foreground">
                    Gửi ngày {record.feedbackAt}
                  </span>
                )}
              </div>

              <form onSubmit={handleSendFeedback} className="flex flex-col gap-2.5 flex-1 justify-between">
                <textarea
                  rows={3}
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Nhập ý kiến chia sẻ tình hình của bé hoặc nhắn nhủ cô giáo..."
                  className="w-full p-2.5 border border-border bg-background text-[12.5px] text-foreground rounded-none focus:outline-hidden focus:border-primary resize-none shadow-2xs flex-1 min-h-[70px]"
                />
                <div className="flex justify-end pt-1.5">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-none text-[13px] h-9 px-7 py-2 font-medium shadow-xs cursor-pointer inline-flex items-center gap-2"
                  >
                    <Send className="size-4 shrink-0" />
                    <span>{isSubmitting ? 'Đang gửi...' : 'Gửi cho cô giáo'}</span>
                  </Button>
                </div>
              </form>
            </div>
          </div>
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
