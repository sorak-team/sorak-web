import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Cancel01Icon,
  CheckmarkCircle01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Calendar01Icon,
  Target01Icon,
  CheckmarkSquare02Icon,
  AlertCircleIcon,
  ReloadIcon,
  PrinterIcon,
  Clock01Icon,
  InformationCircleIcon,
  BookOpen01Icon,
  SendIcon,
} from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { ClassVisual } from '@/features/classes';
import { cn } from '@/shared/lib/utils';
import { toast } from 'sonner';
import { useAuthStore, isBghRole } from '@/features/auth';
import { planningApi } from '../planning.api';

const formatGoalCode = (code) => {
  if (!code) return '';
  const raw = String(code).trim().toUpperCase();
  const digitsMatch = raw.match(/\d+/);
  if (digitsMatch) {
    const num = parseInt(digitsMatch[0], 10);
    if (!isNaN(num)) {
      return `MT ${num < 10 ? '0' + num : num}`;
    }
  }
  return raw;
};

// Preschool Domain Labels & Accent Colors
const DOMAIN_STYLES = {
  PHYSICAL: {
    label: 'Thể chất',
    shortLabel: 'Thể chất',
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
  },
  COGNITIVE: {
    label: 'Nhận thức',
    shortLabel: 'Nhận thức',
    bg: 'bg-indigo-50 dark:bg-indigo-950/40',
    text: 'text-indigo-700 dark:text-indigo-300',
    border: 'border-indigo-200 dark:border-indigo-800',
  },
  LANGUAGE: {
    label: 'Ngôn ngữ',
    shortLabel: 'Ngôn ngữ',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800',
  },
  SOCIO_EMOTIONAL: {
    label: 'Tình cảm - Xã hội',
    shortLabel: 'Tình cảm - XH',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800',
  },
  AESTHETIC: {
    label: 'Thẩm mỹ',
    shortLabel: 'Thẩm mỹ',
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-200 dark:border-rose-800',
  },
};

const GRADE_LABELS = {
  NHA_TRE: 'Khối Nhà trẻ',
  MAM: 'Khối Mầm',
  CHOI: 'Khối Chồi',
  LA: 'Khối Lá',
};

const ROUTINE_SLOT_LABELS = {
  ARRIVAL_PLAY: 'Đón Trẻ, Chơi',
  MORNING_EXERCISE: 'Thể Dục Sáng',
  DIRECTED_STUDY: 'Học',
  CORNER_PLAY: 'Chơi, Hoạt Động Ở Các Góc',
  OUTDOOR_PLAY: 'Chơi Ngoài Trời',
  HYGIENE_MEAL_SLEEP: 'Vệ Sinh - Ăn - Ngủ',
  AFTERNOON_ACTIVITY: 'Chơi, Hoạt Động Theo Ý Thích',
  RETURN_CHILD: 'Trả Trẻ',
};

const ROUTINE_SLOT_TIMES = {
  ARRIVAL_PLAY: '07:15 – 08:00',
  MORNING_EXERCISE: '08:00 – 08:30',
  DIRECTED_STUDY: '08:30 – 09:15',
  CORNER_PLAY: '09:15 – 10:15',
  OUTDOOR_PLAY: '10:15 – 11:00',
  HYGIENE_MEAL_SLEEP: '11:00 – 14:00',
  AFTERNOON_ACTIVITY: '14:00 – 14:45',
  RETURN_CHILD: '15:30 – 16:30',
};

const ROUTINE_SLOTS = [
  {
    key: 'ARRIVAL_PLAY',
    label: 'Đón Trẻ, Chơi',
    lines: ['Đón Trẻ, Chơi'],
    time: '07:15 – 08:00',
    session: 'MORNING',
  },
  {
    key: 'MORNING_EXERCISE',
    label: 'Thể Dục Sáng',
    lines: ['Thể Dục Sáng'],
    time: '08:00 – 08:30',
    session: 'MORNING',
  },
  {
    key: 'DIRECTED_STUDY',
    label: 'Học',
    lines: ['Học'],
    time: '08:30 – 09:15',
    isCore: true,
    session: 'MORNING',
  },
  {
    key: 'CORNER_PLAY',
    label: 'Chơi, Hoạt Động Ở Các Góc',
    lines: ['Chơi, Hoạt', 'Động Ở Các', 'Góc'],
    time: '09:15 – 10:15',
    session: 'MORNING',
  },
  {
    key: 'OUTDOOR_PLAY',
    label: 'Chơi Ngoài Trời',
    lines: ['Chơi Ngoài', 'Trời'],
    time: '10:15 – 11:00',
    session: 'MORNING',
  },
  {
    key: 'AFTERNOON_ACTIVITY',
    label: 'Chơi, Hoạt Động Theo Ý Thích',
    lines: ['Chơi, Hoạt', 'Động Theo Ý', 'Thích'],
    time: '14:00 – 14:45',
    session: 'AFTERNOON',
  },
  {
    key: 'RETURN_CHILD',
    label: 'Trả Trẻ',
    lines: ['Trả Trẻ'],
    time: '15:30 – 16:30',
    session: 'AFTERNOON',
  },
];

const getCleanWeekName = (name, weekNumber) => {
  if (!name) return `Tuần ${weekNumber}`;
  return name.replace(/^Tuần\s*\d+\s*:\s*/i, '').trim();
};

const DAY_LABELS = {
  MONDAY: 'Thứ Hai',
  TUESDAY: 'Thứ Ba',
  WEDNESDAY: 'Thứ Tư',
  THURSDAY: 'Thứ Năm',
  FRIDAY: 'Thứ Sáu',
};

const WEEK_DAYS = [
  { key: 'MONDAY', short: 'T2', full: 'Thứ Hai', offset: 0 },
  { key: 'TUESDAY', short: 'T3', full: 'Thứ Ba', offset: 1 },
  { key: 'WEDNESDAY', short: 'T4', full: 'Thứ Tư', offset: 2 },
  { key: 'THURSDAY', short: 'T5', full: 'Thứ Năm', offset: 3 },
  { key: 'FRIDAY', short: 'T6', full: 'Thứ Sáu', offset: 4 },
];

export function ThemePlanReviewDrawer({
  isOpen,
  onClose,
  classId,
  themeId,
  onPrevClass,
  onNextClass,
  hasPrevClass = false,
  hasNextClass = false,
  classIndexText = '',
  onPlanStatusUpdated,
  isTeacherView = false,
}) {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const isBGH = isBghRole(user?.role) && !isTeacherView;

  const [activeTab, setActiveTab] = useState('timetable'); // 'timetable' | 'goals'
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(0); // 0 -> Week 1, -1 -> All weeks
  const [isLoading, setIsLoading] = useState(true);
  const [previewData, setPreviewData] = useState(null);
  const [rejectReasonInput, setRejectReasonInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [selectedActivityForModal, setSelectedActivityForModal] = useState(null);

  // All routine slots
  const visibleSlots = ROUTINE_SLOTS;

  // Reset selected week when class or theme changes
  useEffect(() => {
    setSelectedWeekIndex(0);
  }, [classId, themeId]);

  // Fetch full appraisal preview data
  const fetchPreview = useCallback(async () => {
    if (!classId || !themeId) return;
    setIsLoading(true);
    try {
      const data = await planningApi.getThemePlanAppraisalPreview(classId, { themeId });
      setPreviewData(data);
      setRejectReasonInput('');
    } catch (err) {
      console.error('Failed to load appraisal preview:', err);
      toast.error('Không thể tải chi tiết kế hoạch của lớp.');
    } finally {
      setIsLoading(false);
    }
  }, [classId, themeId]);

  useEffect(() => {
    if (isOpen) {
      fetchPreview();
    }
  }, [isOpen, fetchPreview]);

  // Goal lookup map: goalCode -> { id, goalCode, description, domainKey, domainLabel }
  const goalsMap = useMemo(() => {
    const map = new Map();
    if (!previewData?.domainsSummary) return map;
    for (const d of previewData.domainsSummary) {
      for (const g of d.goals || []) {
        map.set(g.goalCode, {
          id: g.id,
          goalCode: g.goalCode,
          description: g.description,
          domainKey: d.domainKey,
          domainLabel: d.domainLabel,
        });
      }
    }
    return map;
  }, [previewData?.domainsSummary]);

  // Active week data
  const activeWeek = useMemo(() => {
    if (!previewData?.timetableByWeek || selectedWeekIndex < 0) return null;
    return previewData.timetableByWeek[selectedWeekIndex] || previewData.timetableByWeek[0] || null;
  }, [previewData?.timetableByWeek, selectedWeekIndex]);

  // Activities in active week
  const activeWeekActivities = useMemo(() => {
    if (!activeWeek?.scheduleGrid) return [];
    return Object.values(activeWeek.scheduleGrid).flat();
  }, [activeWeek]);

  // Keyboard shortcut navigation (Left/Right arrow or [ and ])
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
      if (e.key === 'Escape') {
        if (selectedActivityForModal) {
          setSelectedActivityForModal(null);
        } else if (isRejectModalOpen) {
          setIsRejectModalOpen(false);
        } else {
          onClose();
        }
        return;
      }
      if (isBGH) {
        if (e.key === 'ArrowLeft' || e.key === '[') {
          if (hasPrevClass && onPrevClass) onPrevClass();
        } else if (e.key === 'ArrowRight' || e.key === ']') {
          if (hasNextClass && onNextClass) onNextClass();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, hasPrevClass, hasNextClass, onPrevClass, onNextClass, onClose, selectedActivityForModal, isRejectModalOpen]);

  // Execute Approval
  const handleApprove = async () => {
    if (!previewData) return;
    setIsSubmitting(true);
    try {
      const targetClassId = previewData.class.publicId || previewData.class.id;
      const targetThemeId = previewData.theme.publicId || previewData.theme.id;

      await planningApi.approveThemePlan(targetClassId, {
        themeId: targetThemeId,
        themeName: previewData.theme.name,
      });

      toast.success(`Đã phê duyệt kế hoạch lớp ${previewData.class.name} thành công!`);
      if (onPlanStatusUpdated) onPlanStatusUpdated();
      fetchPreview();
    } catch (err) {
      console.error('Approve failed:', err);
      toast.error(err?.response?.data?.message || 'Phê duyệt thất bại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Execute Revision Request
  const handleReject = async () => {
    if (!previewData) return;
    const trimmedReason = rejectReasonInput.trim();
    if (!trimmedReason) {
      toast.warning('Vui lòng nhập lý do cụ thể cần điều chỉnh để giáo viên nắm rõ.');
      return;
    }

    setIsSubmitting(true);
    try {
      const targetClassId = previewData.class.publicId || previewData.class.id;
      const targetThemeId = previewData.theme.publicId || previewData.theme.id;

      await planningApi.requestThemePlanRevision(targetClassId, {
        themeId: targetThemeId,
        themeName: previewData.theme.name,
        reason: trimmedReason,
      });

      toast.success(`Đã gửi yêu cầu chỉnh sửa cho giáo viên lớp ${previewData.class.name}!`);
      setRejectReasonInput('');
      setIsRejectModalOpen(false);
      if (onPlanStatusUpdated) onPlanStatusUpdated();
      fetchPreview();
    } catch (err) {
      console.error('Revision request failed:', err);
      toast.error(err?.response?.data?.message || 'Gửi yêu cầu sửa thất bại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Execute Teacher Submit
  const handleTeacherSubmit = async () => {
    if (!previewData) return;
    setIsSubmitting(true);
    try {
      const targetClassId = previewData.class.publicId || previewData.class.id || classId;
      const targetThemeId = previewData.theme.publicId || previewData.theme.id || themeId;

      await planningApi.submitThemePlan(targetClassId, {
        themeId: targetThemeId,
        themeName: previewData.theme.name,
      });

      toast.success(`Đã nộp kế hoạch chủ đề "${previewData.theme.name}" cho Ban Giám Hiệu phê duyệt thành công!`);
      if (onPlanStatusUpdated) onPlanStatusUpdated();
      fetchPreview();
    } catch (err) {
      console.error('Teacher submit failed:', err);
      toast.error(err?.response?.data?.message || 'Có lỗi xảy ra khi nộp kế hoạch.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format date helper
  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const clean = String(dateStr).split('T')[0];
      const parts = clean.split('-');
      if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
      return new Date(dateStr).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  // Helper: compute display date (dd/mm) for a timetable day column
  const getDayDateLabel = (dayKey, offset) => {
    // 1. Check if any activity in this day has scheduledDate
    const acts = activeWeek?.scheduleGrid?.[dayKey] || [];
    const actWithDate = acts.find((a) => a.scheduledDate);
    if (actWithDate?.scheduledDate) {
      return formatDate(actWithDate.scheduledDate);
    }
    // 2. Derive from activeWeek.startDate + day offset
    if (activeWeek?.startDate) {
      try {
        const clean = String(activeWeek.startDate).split('T')[0];
        const [y, m, d] = clean.split('-').map(Number);
        const dateObj = new Date(y, m - 1, d);
        if (!isNaN(dateObj.getTime())) {
          dateObj.setDate(dateObj.getDate() + offset);
          const dd = String(dateObj.getDate()).padStart(2, '0');
          const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
          return `${dd}/${mm}`;
        }
      } catch {
        // ignore fallback
      }
    }
    return '';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end select-none">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in-0 duration-200"
      />

      {/* Drawer Panel - Full Height, generous width for timetable */}
      <div
        className={cn(
          'relative w-full max-w-[1120px] xl:max-w-[1260px] 2xl:max-w-[1360px] h-full bg-card border-l border-border shadow-2xl flex flex-col',
          'animate-in slide-in-from-right duration-250 ease-out z-10 text-foreground',
        )}
        data-name="Executive Review Drawer"
      >
        {/* 1. TOP HEADER: Refined, coherent typography matching Sorak system */}
        <div className="px-6 py-2.5 border-b border-border bg-muted/15 shrink-0 flex items-center justify-between gap-4">
          {/* Left: Class Identity & Teacher */}
          <div className="flex items-center gap-3 min-w-0">
            <ClassVisual
              grade={previewData?.class?.ageGroup || 'MAM'}
              size={34}
              alt={previewData?.class?.name}
              className="border border-border/80 shrink-0 shadow-2xs"
            />

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[14.5px] font-semibold text-foreground tracking-tight">
                  Lớp {previewData?.class?.name || '...'}
                </span>
                <span className="text-[12px] text-muted-foreground">
                  ({GRADE_LABELS[previewData?.class?.ageGroup] || previewData?.class?.ageGroup || ''})
                </span>
              </div>
              <div className="text-[11.5px] text-muted-foreground flex items-center gap-1.5 truncate">
                <span>
                  {previewData?.class?.teachers?.length > 0
                    ? `GV phụ trách: ${previewData.class.teachers.join(', ')}`
                    : 'Chưa phân công giáo viên'}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Theme Info & Close Button */}
          <div className="flex items-center gap-3.5 shrink-0">
            <div className="text-right hidden sm:block">
              <div className="text-[13.5px] font-semibold text-foreground truncate max-w-[340px]">
                {previewData?.theme?.name || '...'}
              </div>
              <div className="text-[11.5px] text-muted-foreground flex items-center justify-end gap-1.5">
                <span>
                  {formatDate(previewData?.theme?.startDate)} – {formatDate(previewData?.theme?.endDate)}
                </span>
                {previewData?.plan?.submittedAt && (
                  <>
                    <span className="text-muted-foreground/40">•</span>
                    <span>
                      Ngày nộp:{' '}
                      <strong className="font-medium text-foreground">
                        {formatDate(previewData.plan.submittedAt)}
                      </strong>
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Standard Drawer Close Button (Matching all other drawers) */}
            <button
              type="button"
              onClick={onClose}
              className="size-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-none transition-colors cursor-pointer"
              title="Đóng (Esc)"
            >
              <HugeiconsIcon icon={Cancel01Icon} size={16} />
            </button>
          </div>
        </div>

        {/* 2. STREAMLINED TOOLBAR: Week Selector + Domain Stats + Mode Switcher */}
        <div className="px-6 py-2 border-b border-border bg-card shrink-0 flex items-center justify-between gap-3">
          {/* Left: Week Selector Pills & Goals Tab (Cố định 1 hàng, không bị rớt dòng) */}
          <div className="flex items-center gap-1.5 shrink-0 overflow-x-auto">
            {previewData?.timetableByWeek?.map((w, idx) => {
              const isSelected = selectedWeekIndex === idx && activeTab === 'timetable';
              return (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => {
                    setSelectedWeekIndex(idx);
                    setActiveTab('timetable');
                  }}
                  className={cn(
                    'h-7 px-2.5 text-[11.5px] font-medium border flex items-center cursor-pointer transition-all select-none',
                    isSelected
                      ? 'border-primary bg-primary text-primary-foreground font-semibold shadow-xs'
                      : 'border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground'
                  )}
                  title={`Tuần ${w.weekNumber}: ${getCleanWeekName(w.name, w.weekNumber)}`}
                >
                  <span>Tuần {w.weekNumber}</span>
                </button>
              );
            })}

            {/* 5 Domains Goals Tab */}
            <button
              type="button"
              onClick={() => setActiveTab('goals')}
              className={cn(
                'h-7 px-2.5 text-[11.5px] font-medium border flex items-center gap-1.5 cursor-pointer transition-all select-none ml-1',
                activeTab === 'goals'
                  ? 'border-primary bg-primary text-primary-foreground font-semibold shadow-xs'
                  : 'border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground'
              )}
              title="Xem chi tiết ma trận mục tiêu 5 lĩnh vực"
            >
              <HugeiconsIcon icon={Target01Icon} size={12} />
              <span>Mục tiêu</span>
              <span
                className={cn(
                  'px-1.5 py-0.2 text-[10px] font-mono font-semibold border select-none',
                  activeTab === 'goals'
                    ? 'bg-white/20 text-white border-white/30'
                    : 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                )}
              >
                {previewData?.totalGoals || 0}
              </span>
            </button>
          </div>

          {/* Right: Week Subtheme Name & Dates (Gọn gàng trên 1 dòng, không bị xuống dòng hay lặp thông tin) */}
          {activeTab === 'timetable' && activeWeek && (
            <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground min-w-0 truncate justify-end">
              <span className="text-[11.5px] font-medium text-muted-foreground shrink-0">Chủ đề nhánh:</span>
              <span
                className="font-semibold text-foreground text-[12.5px] truncate"
                title={getCleanWeekName(activeWeek.name, activeWeek.weekNumber)}
              >
                {getCleanWeekName(activeWeek.name, activeWeek.weekNumber)}
              </span>
              <span className="text-[11.5px] font-mono text-muted-foreground shrink-0">
                ({formatDate(activeWeek.startDate)} – {formatDate(activeWeek.endDate)})
              </span>
            </div>
          )}
        </div>

        {/* 3. MAIN CONTENT CONTAINER */}
        <div className={cn(
          "flex-1 overflow-y-auto px-6 py-3.5 flex flex-col min-h-0",
          activeTab === 'goals' && "space-y-4 pb-8"
        )}>
          {isBGH && previewData?.plan?.teacherNote && (
            <div className="p-2.5 px-3 bg-slate-50 border border-slate-200 text-slate-800 text-xs flex items-start gap-2.5 shadow-2xs mb-3 shrink-0">
              <HugeiconsIcon icon={InformationCircleIcon} size={15} className="text-slate-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong className="text-slate-800 font-semibold">Ghi chú nộp kế hoạch của giáo viên: </strong>
                <span className="text-slate-700">{previewData.plan.teacherNote}</span>
              </div>
            </div>
          )}

          {previewData?.plan?.rejectionReason && (
            <div className="p-2.5 px-3 bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-2.5 shadow-2xs mb-3 shrink-0">
              <HugeiconsIcon icon={AlertCircleIcon} size={15} className="text-rose-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong className="text-rose-800 font-semibold">Lý do yêu cầu sửa trước đây: </strong>
                <span className="text-rose-700">{previewData.plan.rejectionReason}</span>
              </div>
            </div>
          )}
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground flex-1">
              <HugeiconsIcon icon={ReloadIcon} size={28} className="animate-spin text-primary" />
              <p className="text-[13px]">Đang tải toàn cảnh kế hoạch giáo dục...</p>
            </div>
          ) : activeTab === 'timetable' ? (
            /* TAB 1: WEEK-BY-WEEK TIMETABLE VIEW */
            <div className="flex-1 min-h-0 flex flex-col">
              {(!previewData?.timetableByWeek || previewData.timetableByWeek.length === 0) ? (
                <div className="flex-1 flex items-center justify-center py-12 border border-dashed border-border p-8 text-center text-muted-foreground text-[13px]">
                  Chủ đề này chưa được giáo viên phân chia nhánh và lên lịch hoạt động.
                </div>
              ) : activeWeek ? (
                /* TIMETABLE VIEW: BỐ CỤC, TEXT SIZE, FONT WEIGHT CHUẨN TRANG NHẬT KÝ NGÀY (TEACHER TIMETABLE GRID) */
                <div className="flex-1 min-h-[520px] flex flex-col border border-border bg-card rounded-none overflow-hidden select-none">
                  {/* Header Row: Ngày trong tuần */}
                  <div className="shrink-0 flex items-stretch border-b border-border bg-card text-foreground">
                    {/* Col 0: Header ô khung giờ để trống */}
                    <div className="w-[115px] sm:w-[130px] shrink-0 border-r border-border font-semibold text-center select-none bg-muted/15 py-2 px-2" />
                    {/* 5 Day Columns Header: T2, T3... ngày ở dưới không ngoặc đơn */}
                    {WEEK_DAYS.map(({ key, short, offset }) => {
                      const dateStr = getDayDateLabel(key, offset);
                      return (
                        <div
                          key={key}
                          className="flex-1 min-w-0 border-r last:border-r-0 border-border text-center py-2 px-2 flex flex-col items-center justify-center gap-0.5"
                        >
                          <span className="text-[13px] font-semibold tracking-tight text-foreground">
                            {short}
                          </span>
                          {dateStr && (
                            <span className="text-[11.5px] font-mono leading-tight text-muted-foreground font-normal">
                              {dateStr}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Body: 7 Hàng Khung giờ giãn đều 100% */}
                  <div className="flex-1 min-h-0 flex flex-col divide-y divide-border">
                    {visibleSlots.map((slot) => (
                      <div
                        key={slot.key}
                        className="flex-1 min-h-0 flex items-stretch transition-colors"
                      >
                        {/* Slot Name & Time: Cột khung giờ căn giữa, đa dòng theo lines */}
                        <div className="w-[115px] sm:w-[130px] shrink-0 p-2 border-r border-border font-semibold text-center align-middle bg-muted/10 text-[12.5px] leading-snug flex flex-col items-center justify-center gap-1">
                          <div className="flex flex-col items-center justify-center gap-0.5">
                            {slot.lines.map((line, idx) => (
                              <span
                                key={idx}
                                className="font-semibold text-foreground text-[12.5px] leading-tight whitespace-nowrap text-center"
                              >
                                {line}
                              </span>
                            ))}
                          </div>
                          {slot.time && (
                            <span className="text-[11px] text-muted-foreground font-mono font-normal tracking-tight text-center">
                              {slot.time}
                            </span>
                          )}
                        </div>

                        {/* 5 Day Cells: Bố cục, text size & font weight chuẩn trang nhật ký ngày */}
                        {WEEK_DAYS.map(({ key: dayKey, full, offset }) => {
                          const dateStr = getDayDateLabel(dayKey, offset);
                          const allDayActs = activeWeek.scheduleGrid?.[dayKey] || [];
                          const slotActs = allDayActs.filter((a) => a.routineSlot === slot.key);
                          const showBadges = (isBGH || !isTeacherView);

                          return (
                            <div
                              key={dayKey}
                              className="flex-1 min-w-0 p-1.5 border-r last:border-r-0 border-border flex flex-col justify-stretch"
                            >
                              {slotActs.length === 0 ? (
                                <div className="h-full min-h-[44px] flex items-center justify-center text-muted-foreground/30 text-[13px] select-none">
                                  —
                                </div>
                              ) : slotActs.length === 1 ? (
                                (() => {
                                  const act = slotActs[0];
                                  const domainKey = act.domain ? String(act.domain).toUpperCase() : null;
                                  const domainStyle = domainKey ? DOMAIN_STYLES[domainKey] : null;
                                  const goalBadge = act.goalCode ? formatGoalCode(act.goalCode) : null;
                                  const hasBadges = showBadges && (domainStyle || goalBadge);

                                  return (
                                    <div
                                      key={act.id}
                                      onClick={() =>
                                        setSelectedActivityForModal({
                                          ...act,
                                          slotLabel: slot.label,
                                          slotTime: slot.time,
                                          dayLabel: full,
                                          formattedDate: dateStr,
                                        })
                                      }
                                      className={cn(
                                        'h-full flex flex-col items-center text-center cursor-pointer rounded-none transition-all group border border-border/80 bg-card hover:border-foreground/40 hover:shadow-2xs relative select-text',
                                        hasBadges ? 'p-2 justify-between' : 'p-2.5 justify-center'
                                      )}
                                      title="Nhấp để xem chi tiết hoạt động giáo dục"
                                    >
                                      {/* PA 1: Micro-Badges ở 2 góc đỉnh ô cho hoạt động có Lĩnh vực / Mục tiêu */}
                                      {hasBadges && (
                                        <div className="flex items-center justify-between gap-1 w-full shrink-0 mb-1 select-none">
                                          {domainStyle ? (
                                            <span
                                              className={cn(
                                                'px-1.5 py-0.2 text-[9.5px] font-semibold border truncate max-w-[58%]',
                                                domainStyle.bg,
                                                domainStyle.text,
                                                domainStyle.border
                                              )}
                                              title={`Lĩnh vực: ${domainStyle.label}`}
                                            >
                                              {domainStyle.shortLabel || domainStyle.label}
                                            </span>
                                          ) : (
                                            <span />
                                          )}
                                          {goalBadge ? (
                                            <span
                                              className="px-1.5 py-0.2 text-[9.5px] font-mono font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shrink-0"
                                              title={`Mục tiêu: ${goalBadge}`}
                                            >
                                              {goalBadge}
                                            </span>
                                          ) : null}
                                        </div>
                                      )}

                                      <div className="flex-1 flex flex-col items-center justify-center text-center w-full px-0.5">
                                        <span className="font-normal text-foreground text-[12.5px] line-clamp-3 leading-snug text-center">
                                          {act.title}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })()
                              ) : (
                                <div className="flex flex-col gap-1.5 h-full w-full justify-between">
                                  {slotActs.map((act) => {
                                    const domainKey = act.domain ? String(act.domain).toUpperCase() : null;
                                    const domainStyle = domainKey ? DOMAIN_STYLES[domainKey] : null;
                                    const goalBadge = act.goalCode ? formatGoalCode(act.goalCode) : null;
                                    const hasBadges = showBadges && (domainStyle || goalBadge);

                                    return (
                                      <div
                                        key={act.id}
                                        onClick={() =>
                                          setSelectedActivityForModal({
                                            ...act,
                                            slotLabel: slot.label,
                                            slotTime: slot.time,
                                            dayLabel: full,
                                            formattedDate: dateStr,
                                          })
                                        }
                                        className={cn(
                                          'flex-1 flex flex-col items-center text-center cursor-pointer rounded-none transition-all group border border-border/80 bg-card hover:border-foreground/40 hover:shadow-2xs min-h-[44px] relative select-text',
                                          hasBadges ? 'p-1.5 justify-between' : 'p-1.5 justify-center'
                                        )}
                                        title="Nhấp để xem chi tiết hoạt động giáo dục"
                                      >
                                        {hasBadges && (
                                          <div className="flex items-center justify-between gap-1 w-full shrink-0 mb-1 select-none">
                                            {domainStyle ? (
                                              <span
                                                className={cn(
                                                  'px-1 py-0.2 text-[9px] font-semibold border truncate max-w-[58%]',
                                                  domainStyle.bg,
                                                  domainStyle.text,
                                                  domainStyle.border
                                                )}
                                                title={`Lĩnh vực: ${domainStyle.label}`}
                                              >
                                                {domainStyle.shortLabel || domainStyle.label}
                                              </span>
                                            ) : (
                                              <span />
                                            )}
                                            {goalBadge ? (
                                              <span
                                                className="px-1 py-0.2 text-[9px] font-mono font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shrink-0"
                                                title={`Mục tiêu: ${goalBadge}`}
                                              >
                                                {goalBadge}
                                              </span>
                                            ) : null}
                                          </div>
                                        )}

                                        <div className="flex-1 flex flex-col items-center justify-center text-center w-full px-0.5">
                                          <span className="font-normal text-foreground text-[11.5px] line-clamp-2 leading-tight text-center">
                                            {act.title}
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            /* TAB 2: 5 EDUCATIONAL DOMAINS BREAKDOWN */
            <div className="space-y-4">
              <div className="p-3 bg-muted/20 border border-border text-[12px] text-muted-foreground flex items-center justify-between">
                <span>
                  Tổng số mục tiêu giáo dục được phân bổ cho chủ đề này: <strong>{previewData?.totalGoals || 0} mục tiêu</strong>
                </span>
                <span className="text-[11.5px]">
                  Tiêu chuẩn: Phủ đều 5/5 lĩnh vực phát triển GD Mầm non
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {previewData?.domainsSummary?.map((d) => {
                  const style = DOMAIN_STYLES[d.domainKey] || { bg: 'bg-muted', text: 'text-foreground', border: 'border-border' };

                  return (
                    <div
                      key={d.domainKey}
                      className="border border-border bg-card p-3.5 space-y-2.5 shadow-2xs"
                    >
                      <div className="flex items-center justify-between border-b border-border/60 pb-2">
                        <span className={cn('px-2 py-0.5 text-xs font-semibold border', style.bg, style.text, style.border)}>
                          {d.domainLabel}
                        </span>
                        <span className="text-[11.5px] font-medium text-muted-foreground">
                          {d.count} mục tiêu
                        </span>
                      </div>

                      {d.goals.length === 0 ? (
                        <div className="py-4 text-center text-muted-foreground/50 text-xs italic">
                          Chưa phân bổ mục tiêu cho lĩnh vực này
                        </div>
                      ) : (
                        <ul className="space-y-1.5 text-xs">
                          {d.goals.map((g) => (
                            <li key={g.id} className="p-2 bg-muted/20 border border-border/60 flex items-start gap-2">
                              <span className="px-1.5 py-0.2 bg-primary/10 text-primary font-mono text-[10.5px] font-semibold shrink-0">
                                {formatGoalCode(g.goalCode)}
                              </span>
                              <span className="text-foreground leading-relaxed text-[11.5px]">
                                {g.description}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 4. SLIM ACTION BAR FOOTER: Operational Controls, Navigation & Review Actions */}
        <div className="px-6 py-2.5 border-t border-border bg-card shrink-0 flex items-center justify-between gap-4 shadow-2xs">
          {/* Left: Print & Class Navigation & Plan Status */}
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => window.print()}
              className="h-8 px-3 text-[12px] rounded-none border-border hover:bg-muted text-muted-foreground hover:text-foreground flex items-center gap-1.5 cursor-pointer"
              title="In hoặc xuất PDF phiếu thẩm định kế hoạch"
            >
              <HugeiconsIcon icon={PrinterIcon} size={13.5} />
              <span>In phiếu</span>
            </Button>

            {/* Class Switcher (Chỉ hiển thị cho BGH khi duyệt nhiều lớp, ẩn đối với Giáo viên) */}
            {isBGH && (
              <>
                <div className="h-4 w-px bg-border hidden sm:block" />

                <div className="flex items-center gap-1.5">
                  <span className="text-[11.5px] text-muted-foreground mr-0.5 hidden sm:inline">Chuyển lớp:</span>
                  <button
                    type="button"
                    onClick={onPrevClass}
                    disabled={!hasPrevClass || isLoading}
                    className={cn(
                      'size-6.5 text-xs font-medium border border-border bg-background flex items-center justify-center transition-colors',
                      hasPrevClass && !isLoading
                        ? 'hover:bg-muted text-foreground cursor-pointer'
                        : 'opacity-40 cursor-not-allowed text-muted-foreground'
                    )}
                    title="Lớp trước (Phím tắt: [ hoặc Mũi tên trái)"
                  >
                    <HugeiconsIcon icon={ArrowLeft01Icon} size={13} />
                  </button>

                  <span className="text-[11.5px] font-semibold text-foreground font-mono px-1 min-w-[48px] text-center">
                    {classIndexText}
                  </span>

                  <button
                    type="button"
                    onClick={onNextClass}
                    disabled={!hasNextClass || isLoading}
                    className={cn(
                      'size-6.5 text-xs font-medium border border-border bg-background flex items-center justify-center transition-colors',
                      hasNextClass && !isLoading
                        ? 'hover:bg-muted text-foreground cursor-pointer'
                        : 'opacity-40 cursor-not-allowed text-muted-foreground'
                    )}
                    title="Lớp sau (Phím tắt: ] hoặc Mũi tên phải)"
                  >
                    <HugeiconsIcon icon={ArrowRight01Icon} size={13} />
                  </button>
                </div>
              </>
            )}

            <div className="h-4 w-px bg-border hidden md:block" />

            {/* Plan Status (Clean dot + text indicator, matching table view exactly) */}
            <div className="hidden md:flex items-center gap-1.5 text-[11.5px]">
              <span className="text-muted-foreground">Trạng thái:</span>
              {previewData?.plan?.status === 'USED' ? (
                <span className="inline-flex items-center gap-1.5 text-emerald-700 font-medium">
                  <span className="size-2 rounded-full bg-emerald-500" />
                  Đã phê duyệt
                </span>
              ) : previewData?.plan?.status === 'PENDING_APPROVAL' ? (
                <span className="inline-flex items-center gap-1.5 text-blue-700 font-medium">
                  <span className="size-2 rounded-full bg-blue-500" />
                  Chờ duyệt
                </span>
              ) : previewData?.plan?.status === 'REJECTED' ? (
                <span className="inline-flex items-center gap-1.5 text-rose-700 font-medium">
                  <span className="size-2 rounded-full bg-rose-500" />
                  Yêu cầu sửa
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-muted-foreground font-medium">
                  <span className="size-2 rounded-full bg-slate-400" />
                  Bản nháp
                </span>
              )}
            </div>
          </div>

          {/* Right: Actions based on role */}
          <div className="flex items-center gap-2">
            {isBGH ? (
              <>
                {previewData?.plan?.status !== 'USED' && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setRejectReasonInput('');
                      setIsRejectModalOpen(true);
                    }}
                    disabled={isSubmitting || isLoading}
                    className="h-8 px-3 text-[12px] rounded-none bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100 font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
                    title="Yêu cầu giáo viên sửa đổi hoặc bổ sung kế hoạch"
                  >
                    <HugeiconsIcon icon={Cancel01Icon} size={13} />
                    <span>Yêu cầu sửa</span>
                  </Button>
                )}

                {previewData?.plan?.status === 'USED' ? (
                  <span className="h-8 px-3 text-[12px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1.5 select-none">
                    <HugeiconsIcon icon={CheckmarkSquare02Icon} size={13.5} className="text-emerald-700" />
                    <span>Đã phê duyệt</span>
                  </span>
                ) : (
                  <Button
                    type="button"
                    onClick={handleApprove}
                    disabled={isSubmitting || isLoading}
                    className="h-8 px-3.5 text-[12px] rounded-none bg-[#1447e6] hover:bg-[#1447e6]/90 text-white font-medium flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                  >
                    <HugeiconsIcon icon={CheckmarkSquare02Icon} size={13.5} />
                    <span>{isSubmitting ? 'Đang duyệt...' : 'Phê duyệt kế hoạch'}</span>
                  </Button>
                )}
              </>
            ) : (
              /* Teacher View Actions */
              <>
                {previewData?.plan?.status === 'USED' ? (
                  <span className="h-8 px-3 text-[12px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1.5 select-none">
                    <HugeiconsIcon icon={CheckmarkSquare02Icon} size={13.5} className="text-emerald-700" />
                    <span>Kế hoạch đã phê duyệt</span>
                  </span>
                ) : previewData?.plan?.status === 'PENDING_APPROVAL' ? (
                  <span className="h-8 px-3 text-[12px] font-medium bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1.5 select-none">
                    <HugeiconsIcon icon={Clock01Icon} size={13.5} className="text-blue-700" />
                    <span>Đang chờ duyệt</span>
                  </span>
                ) : (
                  <Button
                    type="button"
                    onClick={handleTeacherSubmit}
                    disabled={isSubmitting || isLoading}
                    className="h-8 px-4 text-[12px] rounded-none bg-primary hover:bg-primary/90 text-primary-foreground font-medium flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                  >
                    <HugeiconsIcon icon={SendIcon} size={13.5} />
                    <span>
                      {isSubmitting
                        ? 'Đang nộp...'
                        : previewData?.plan?.status === 'REJECTED'
                        ? 'Nộp lại cho BGH duyệt'
                        : 'Nộp cho BGH duyệt'}
                    </span>
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {/* REJECT / REVISION REQUEST MODAL (Opens only when BGH clicks 'Yêu cầu sửa') */}
        {isRejectModalOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in-0 duration-150">
            <div className="w-full max-w-md bg-card border border-border shadow-2xl p-5 space-y-4 animate-in zoom-in-95 duration-150 text-foreground">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="font-semibold text-[15px] text-foreground">
                  Yêu cầu giáo viên sửa đổi kế hoạch
                </h3>
                <button
                  type="button"
                  onClick={() => setIsRejectModalOpen(false)}
                  className="size-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-none transition-colors cursor-pointer"
                  title="Đóng"
                >
                  <HugeiconsIcon icon={Cancel01Icon} size={15} />
                </button>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="modal-review-note" className="text-xs font-medium text-foreground">
                  Lý do yêu cầu sửa đổi <span className="text-rose-600">*</span>
                </label>
                <textarea
                  id="modal-review-note"
                  rows={3}
                  value={rejectReasonInput}
                  onChange={(e) => setRejectReasonInput(e.target.value)}
                  placeholder="Nhập nhận xét cụ thể về mục tiêu, hoạt động hoặc khung giờ cần giáo viên sửa đổi..."
                  className="w-full text-xs sm:text-[13px] p-2.5 px-3 border border-border bg-background placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary rounded-none leading-relaxed resize-none"
                  autoFocus
                />
                <p className="text-[11px] text-muted-foreground">
                  Nhận xét này sẽ được gửi trực tiếp đến giáo viên phụ trách lớp {previewData?.class?.name}.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsRejectModalOpen(false)}
                  className="h-8 px-4 text-[13px] rounded-none border-border hover:bg-muted cursor-pointer"
                >
                  Hủy
                </Button>
                <Button
                  type="button"
                  onClick={handleReject}
                  disabled={isSubmitting || !rejectReasonInput.trim()}
                  className="h-8 px-4 text-[13px] rounded-none bg-rose-600 hover:bg-rose-700 text-white font-medium cursor-pointer"
                >
                  {isSubmitting ? 'Đang gửi...' : 'Gửi yêu cầu sửa'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ACTIVITY DETAIL POPUP (Clean, professional, matching Sorak standard) */}
        {selectedActivityForModal && (
          <div
            className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in-0 duration-150"
            onClick={() => setSelectedActivityForModal(null)}
          >
            <div
              className="w-full max-w-lg bg-card border border-border shadow-2xl rounded-none flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150 text-foreground overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="px-6 py-3.5 border-b border-border flex items-center justify-between gap-4">
                <h3 className="text-[15px] font-semibold text-foreground leading-snug break-words">
                  {selectedActivityForModal.title}
                </h3>

                <button
                  type="button"
                  onClick={() => setSelectedActivityForModal(null)}
                  className="size-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-none transition-colors cursor-pointer shrink-0"
                  title="Đóng (Esc)"
                >
                  <HugeiconsIcon icon={Cancel01Icon} size={16} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 text-[12.5px]">
                {/* 1. Thông tin thời gian, khung giờ & phân bổ mục tiêu */}
                <div className="space-y-2 pb-3.5 border-b border-border/60">
                  <div className="flex items-baseline gap-2">
                    <span className="text-muted-foreground min-w-[70px] shrink-0">Thời gian:</span>
                    <span className="font-medium text-foreground">
                      {selectedActivityForModal.dayLabel}
                      {selectedActivityForModal.formattedDate
                        ? ` (${selectedActivityForModal.formattedDate})`
                        : selectedActivityForModal.scheduledDate
                        ? ` (${formatDate(selectedActivityForModal.scheduledDate)})`
                        : ''}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="text-muted-foreground min-w-[70px] shrink-0">Khung giờ:</span>
                    <span className="text-foreground">
                      {selectedActivityForModal.slotLabel}{' '}
                      <span className="text-muted-foreground font-mono">
                        ({selectedActivityForModal.slotTime})
                      </span>
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="text-muted-foreground min-w-[70px] shrink-0">Lĩnh vực:</span>
                    <span className="font-medium text-foreground">
                      {DOMAIN_STYLES[selectedActivityForModal.domain]?.label
                        ? `Phát triển ${DOMAIN_STYLES[selectedActivityForModal.domain].label.toLowerCase()}`
                        : selectedActivityForModal.domain || 'Phát triển chung'}
                    </span>
                  </div>

                  {(selectedActivityForModal.goalCode || selectedActivityForModal.goalTitle) && (
                    <div className="flex items-baseline gap-2">
                      <span className="text-muted-foreground min-w-[70px] shrink-0">Mục tiêu:</span>
                      <div className="leading-relaxed flex items-baseline gap-2 flex-wrap">
                        {selectedActivityForModal.goalCode && (
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-mono text-[11.5px] font-semibold shrink-0 select-none">
                            {formatGoalCode(selectedActivityForModal.goalCode)}
                          </span>
                        )}
                        <span className="text-muted-foreground">
                          {selectedActivityForModal.goalTitle ||
                            goalsMap.get(selectedActivityForModal.goalCode)?.description}
                        </span>
                      </div>
                    </div>
                  )}

                  {selectedActivityForModal.contentTitle && (
                    <div className="flex items-baseline gap-2">
                      <span className="text-muted-foreground min-w-[70px] shrink-0">Nội dung:</span>
                      <span className="text-foreground">{selectedActivityForModal.contentTitle}</span>
                    </div>
                  )}
                </div>

                {/* 2. Chi tiết kế hoạch tổ chức giáo dục */}
                <div className="space-y-4 leading-relaxed">
                  {/* Mục tiêu hoạt động */}
                  <div className="space-y-1">
                    <h4 className="font-semibold text-foreground text-[13px]">
                      1. Mục tiêu hoạt động
                    </h4>
                    <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                      {selectedActivityForModal.objective ||
                        'Trẻ hào hứng tham gia hoạt động, thực hiện đúng các thao tác, rèn luyện kỹ năng và hình thành thói quen tốt phù hợp lứa tuổi.'}
                    </p>
                  </div>

                  {/* Chuẩn bị */}
                  <div className="space-y-1">
                    <h4 className="font-semibold text-foreground text-[13px]">
                      2. Chuẩn bị của giáo viên & trẻ
                    </h4>
                    <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                      {selectedActivityForModal.preparation ||
                        'Không gian phòng học an toàn, thoáng mát; đồ dùng dạy học, học liệu và trang thiết bị phù hợp với chủ đề tuần.'}
                    </p>
                  </div>

                  {/* Tiến trình tổ chức hoạt động */}
                  <div className="space-y-1.5">
                    <h4 className="font-semibold text-foreground text-[13px]">
                      3. Tiến trình tổ chức hoạt động
                    </h4>
                    {selectedActivityForModal.procedure ? (
                      <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                        {selectedActivityForModal.procedure}
                      </p>
                    ) : (
                      <div className="text-muted-foreground leading-relaxed space-y-1">
                        <p>• <strong>Ổn định - Tạo hứng thú:</strong> Cô đón trẻ, trò chuyện hoặc gợi mở về chủ đề bài học.</p>
                        <p>• <strong>Tiến hành hoạt động:</strong> Hướng dẫn mẫu, tổ chức cho trẻ trải nghiệm, quan sát và hỗ trợ từng trẻ.</p>
                        <p>• <strong>Kết thúc:</strong> Nhận xét, động viên, tuyên dương trẻ tích cực và chuyển hoạt động nhẹ nhàng.</p>
                      </div>
                    )}
                  </div>

                  {/* Tiêu chí đánh giá / Ghi chú */}
                  {(selectedActivityForModal.evaluationCriteria || selectedActivityForModal.notes) && (
                    <div className="space-y-1 pt-1">
                      <h4 className="font-semibold text-foreground text-[13px]">
                        4. Tiêu chí đánh giá & Ghi chú
                      </h4>
                      <div className="text-muted-foreground leading-relaxed">
                        {selectedActivityForModal.evaluationCriteria && (
                          <p className="whitespace-pre-line">{selectedActivityForModal.evaluationCriteria}</p>
                        )}
                        {selectedActivityForModal.notes && (
                          <p className="mt-1">
                            <strong className="text-foreground">Lưu ý: </strong>
                            {selectedActivityForModal.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-2.5 border-t border-border bg-muted/10 flex items-center justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedActivityForModal(null)}
                  className="h-8 px-4 text-[12px] rounded-none border-border hover:bg-muted text-foreground cursor-pointer"
                >
                  Đóng
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ThemePlanReviewDrawer;
