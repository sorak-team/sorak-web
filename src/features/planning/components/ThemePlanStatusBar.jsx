import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  CheckmarkCircle01Icon,
  Cancel01Icon,
  AlertCircleIcon,
  Clock01Icon,
  Calendar03Icon,
  SendIcon,
  InformationCircleIcon,
  CheckmarkSquare02Icon,
} from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/shared/lib/utils';
import { toast } from 'sonner';
import { useAuthStore, isBghRole } from '@/features/auth';
import { planningApi } from '../planning.api';

export function ThemePlanStatusBar({
  classId,
  currentClass,
  selectedThemeId,
  themes = [],
  onThemeChange,
  onStatusLoaded,
}) {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const isBGH = isBghRole(user?.role);

  const [statusData, setStatusData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Modal: Teacher Submit
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [submitNote, setSubmitNote] = useState('');
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Fetch plan status
  const loadStatus = useCallback(async () => {
    if (!classId) return;
    setIsLoading(true);
    try {
      const data = await planningApi.getThemePlanStatus(classId, selectedThemeId);
      setStatusData(data);
      if (onStatusLoaded) onStatusLoaded(data);
    } catch (err) {
      console.error('Failed to load theme plan status:', err);
    } finally {
      setIsLoading(false);
    }
  }, [classId, selectedThemeId, onStatusLoaded]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  // Handle Teacher Submit Plan
  const handleSubmitPlan = async () => {
    if (!classId) return;
    const targetThemeId = selectedThemeId || statusData?.themeId;
    if (!targetThemeId) {
      toast.error('Vui lòng chọn chủ đề để nộp kế hoạch.');
      return;
    }
    setIsActionLoading(true);
    try {
      await planningApi.submitThemePlan(classId, {
        themeId: targetThemeId,
        themeName: statusData?.themeName,
        note: submitNote.trim() || undefined,
      });
      toast.success(
        `Đã nộp kế hoạch chủ đề "${statusData?.themeName || 'Chủ đề'}" cho Ban Giám Hiệu phê duyệt thành công!`
      );
      setIsSubmitModalOpen(false);
      setSubmitNote('');
      loadStatus();
    } catch (err) {
      console.error('Submit plan error:', err);
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra khi nộp kế hoạch.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const status = statusData?.status || 'DRAFT';
  const stats = statusData?.stats || null;

  // Format date helper
  const formatDateVi = (dStr) => {
    if (!dStr) return '';
    try {
      const d = new Date(dStr);
      return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return dStr;
    }
  };

  // Resolve current active theme label & date range
  const currentThemeObj = themes.find(
    (th) =>
      th.id === selectedThemeId ||
      th.publicId === selectedThemeId ||
      String(th.themeId) === String(selectedThemeId) ||
      th.code === selectedThemeId
  );

  const displayThemeName = statusData?.themeName || currentThemeObj?.name || 'Chủ đề giáo dục';
  const displayThemeCode = currentThemeObj?.code ? `Chủ đề ${currentThemeObj.code}: ` : '';
  const displayDateRange =
    statusData?.formattedDateRange ||
    currentThemeObj?.dateRange ||
    (statusData?.startDate && statusData?.endDate
      ? `${formatDateVi(statusData.startDate).slice(0, 5)} – ${formatDateVi(statusData.endDate)}`
      : '');

  return (
    <div className="w-full bg-slate-50/80 dark:bg-slate-900/40 border-b border-border/80 select-none">
      {/* 1. Main Status Bar */}
      <div className="px-6 py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        {/* Left: Theme Identifier & Status Badge */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Theme Selector / Display */}
          <div className="flex items-center gap-1.5 font-medium text-foreground">
            <span className="text-muted-foreground text-[11.5px]">Chủ đề:</span>
            {themes.length > 1 && onThemeChange ? (
              <select
                value={selectedThemeId || statusData?.themeId || ''}
                onChange={(e) => onThemeChange(e.target.value)}
                className="h-7 text-xs font-semibold bg-background border border-border px-2 py-0.5 rounded-none text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary/40"
              >
                {themes.map((th) => (
                  <option key={th.id || th.publicId} value={th.id || th.publicId}>
                    {th.code ? `Chủ đề ${th.code}: ` : ''}
                    {th.name} {th.dateRange ? `(${th.dateRange})` : ''}
                  </option>
                ))}
              </select>
            ) : (
              <span className="font-semibold text-foreground text-xs">
                {displayThemeCode}
                {displayThemeName} {displayDateRange && `(${displayDateRange})`}
              </span>
            )}
          </div>

          <span className="text-border/80">|</span>

          {/* Status Badge (Square flat rounded-none style, matching Sorak Design System) */}
          {status === 'DRAFT' && (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium bg-background text-muted-foreground border border-border/80 rounded-none shadow-2xs">
              <span className="size-1.5 rounded-full bg-amber-500" />
              Bản nháp (Đang soạn)
            </span>
          )}

          {status === 'PENDING_APPROVAL' && (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded-none dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/60">
              <span className="size-1.5 rounded-full bg-blue-600 animate-pulse" />
              Chờ duyệt
            </span>
          )}

          {status === 'USED' && (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-none dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60">
              <HugeiconsIcon icon={CheckmarkCircle01Icon} size={13} className="text-emerald-600" />
              Đã duyệt
            </span>
          )}

          {status === 'REJECTED' && (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200 rounded-none dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/60">
              <HugeiconsIcon icon={AlertCircleIcon} size={13} className="text-rose-600" />
              Yêu cầu sửa
            </span>
          )}

          {/* Deadline indicator if applicable */}
          {statusData?.deadline && (
            <span className="text-[11px] text-muted-foreground hidden lg:inline-flex items-center gap-1">
              <HugeiconsIcon icon={Calendar03Icon} size={12} className="text-muted-foreground/70" />
              Hạn nộp: {formatDateVi(statusData.deadline)}
            </span>
          )}
        </div>

        {/* Middle / Center: Completeness & Quality Gate Indicator */}
        {stats && (
          <div className="flex items-center gap-2 text-[11.5px] text-muted-foreground border-t md:border-t-0 pt-1 md:pt-0">
            <span className="font-medium text-foreground/80">Tiến độ chủ đề:</span>
            <div className="flex items-center gap-1.5 font-medium">
              <span className="text-foreground">{stats.totalGoals}</span> MT
              <span className="text-border">•</span>
              <span className="text-foreground">{stats.totalActivities}</span> HĐGD
              <span className="text-border">•</span>
              <span
                className={cn(
                  stats.totalWeeks > 0 && stats.scheduledWeeks < stats.totalWeeks
                    ? 'text-amber-600 font-semibold'
                    : 'text-foreground'
                )}
              >
                {stats.scheduledWeeks}/{stats.totalWeeks}
              </span>{' '}
              tuần TKB
            </div>

            {stats.isReadyToSubmit ? (
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50/80 px-1.5 py-0.5 border border-emerald-200/70 rounded-none ml-1">
                <HugeiconsIcon icon={CheckmarkCircle01Icon} size={12} className="text-emerald-600" />
                Đủ điều kiện nộp
              </span>
            ) : (
              <span
                title={stats.missingItems?.join('\n')}
                className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50/80 px-1.5 py-0.5 border border-amber-200/70 rounded-none ml-1 cursor-help"
              >
                <HugeiconsIcon icon={AlertCircleIcon} size={12} className="text-amber-600" />
                Chưa hoàn thiện
              </span>
            )}
          </div>
        )}

        {/* Right: Submission Status or Action Button */}
        <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
          {status === 'PENDING_APPROVAL' && (
            <div className="text-[11.5px] text-muted-foreground italic flex items-center gap-1.5">
              <HugeiconsIcon icon={Clock01Icon} size={13} className="text-blue-600" />
              <span>Đã nộp ngày {formatDateVi(statusData?.submittedAt)}. Đang chờ duyệt.</span>
            </div>
          )}

          {status === 'USED' && (
            <div className="text-[11.5px] text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1">
              <HugeiconsIcon icon={CheckmarkCircle01Icon} size={13} />
              <span>Kế hoạch đã duyệt và đang khóa để thực hiện giảng dạy.</span>
            </div>
          )}

          {/* Teacher Submission Button */}
          {!isBGH && (status === 'DRAFT' || status === 'REJECTED') && (
            <Button
              onClick={() => setIsSubmitModalOpen(true)}
              disabled={isLoading || isActionLoading}
              title={`Nộp toàn bộ kế hoạch Chủ đề: ${displayThemeName} cho Ban Giám Hiệu`}
              className={cn(
                'h-8 px-3 text-[12px] font-medium rounded-none flex items-center gap-1.5 shadow-none transition-colors cursor-pointer',
                status === 'REJECTED'
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'bg-primary hover:bg-primary/90 text-primary-foreground'
              )}
            >
              <HugeiconsIcon icon={SendIcon} size={14} />
              <span>
                {status === 'REJECTED' ? 'Nộp lại cho BGH duyệt' : 'Nộp kế hoạch chủ đề'}
              </span>
            </Button>
          )}
        </div>
      </div>

      {/* 2. Rejection Banner (If REJECTED by BGH) */}
      {status === 'REJECTED' && statusData?.rejectionReason && (
        <div className="bg-rose-50/90 dark:bg-rose-950/20 border-t border-rose-200/90 dark:border-rose-900/40 px-6 py-2.5 flex items-start gap-2.5 text-xs text-rose-800 dark:text-rose-300">
          <HugeiconsIcon icon={AlertCircleIcon} size={15} className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <strong className="font-semibold block mb-0.5">
              Ban Giám Hiệu yêu cầu chỉnh sửa kế hoạch chủ đề này:
            </strong>
            <p className="text-rose-700 dark:text-rose-300 leading-relaxed bg-white/70 dark:bg-black/20 p-2 rounded-none border border-rose-200 dark:border-rose-900/30 font-medium">
              "{statusData.rejectionReason}"
            </p>
            <span className="text-[11px] text-rose-600/90 dark:text-rose-400/90 mt-1 block">
              💡 Giáo viên vui lòng kiểm tra và hoàn thiện lại 3 Tab (Phân bố mục tiêu, Xác định hoạt động, Kế hoạch tuần) rồi bấm <strong>"Nộp lại cho BGH duyệt"</strong>.
            </span>
          </div>
        </div>
      )}

      {/* 3. Modal: Teacher Pre-submission Checklist & Submit Plan */}
      <Dialog open={isSubmitModalOpen} onOpenChange={setIsSubmitModalOpen}>
        <DialogContent className="max-w-[460px] p-5 rounded-xl border border-border/80 shadow-lg">
          <DialogHeader className="space-y-1 pb-1">
            <DialogTitle className="text-[15px] font-semibold text-foreground tracking-tight">
              Nộp kế hoạch giáo dục cho BGH
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Kế hoạch lớp <strong className="font-semibold text-foreground">{currentClass?.name || 'Lớp'}</strong> • Chủ đề <strong className="font-semibold text-foreground">"{displayThemeName}"</strong>
              {displayDateRange && <span> ({displayDateRange})</span>}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-1 text-xs">
            {/* Checklist Box - Thiết kế clean, chuyên nghiệp, ít màu sắc, thông tin gọn gàng */}
            <div className="border border-border/70 rounded-lg bg-muted/20 overflow-hidden">
              <div className="px-3.5 py-2.5 bg-muted/40 border-b border-border/60 flex items-center justify-between">
                <span className="font-medium text-foreground text-xs">Điều kiện nộp</span>
                {stats?.isReadyToSubmit ? (
                  <span className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-muted-foreground">
                    <span className="size-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400"></span>
                    <span>Đủ điều kiện</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-amber-600 dark:text-amber-400">
                    <span className="size-1.5 rounded-full bg-amber-500"></span>
                    <span>Chưa điền kín slot</span>
                  </span>
                )}
              </div>

              <div className="divide-y divide-border/40 px-3.5 text-xs">
                <div className="py-2 flex items-center justify-between">
                  <span className="text-muted-foreground">Mục tiêu giáo dục</span>
                  <span className="font-medium">
                    {stats?.totalGoals > 0 ? (
                      <span className="text-foreground">{stats.totalGoals} mục tiêu</span>
                    ) : (
                      <span className="text-destructive font-medium">Chưa chọn</span>
                    )}
                  </span>
                </div>

                <div className="py-2 flex items-center justify-between">
                  <span className="text-muted-foreground">Hoạt động thời khóa biểu</span>
                  <span className="font-medium text-foreground">
                    {(() => {
                      const scheduled = stats?.totalScheduledSlots ?? 0;
                      const total =
                        stats?.totalExpectedSlots ||
                        (stats?.totalWeeks || 0) * 35;
                      const isFull = total > 0 && scheduled >= total;
                      if (isFull) {
                        return `${scheduled}/${total} slot`;
                      }
                      return (
                        <span>
                          {scheduled}/${total} slot{' '}
                          {total > scheduled && (
                            <span className="text-muted-foreground font-normal text-[11px]">
                              (thiếu {total - scheduled})
                            </span>
                          )}
                        </span>
                      );
                    })()}
                  </span>
                </div>

                <div className="py-2 flex items-center justify-between">
                  <span className="text-muted-foreground">Tiến độ các tuần</span>
                  <span className="font-medium text-foreground">
                    {stats && stats.scheduledWeeks >= stats.totalWeeks && stats.totalWeeks > 0 ? (
                      `${stats.scheduledWeeks}/${stats.totalWeeks} tuần`
                    ) : (
                      <span>
                        {stats ? `${stats.scheduledWeeks}/${stats.totalWeeks} tuần` : 'Chưa xếp'}
                      </span>
                    )}
                  </span>
                </div>
              </div>

              {/* Lời nhắc nếu chưa kín */}
              {stats && !stats.isReadyToSubmit && (
                <div className="px-3.5 py-2 border-t border-border/50 bg-amber-500/5 text-[11.5px] text-amber-700 dark:text-amber-400">
                  Thời khóa biểu cần được điền kín 100% các slot hoạt động trước khi gửi BGH.
                </div>
              )}
            </div>

            {/* Note Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground flex items-center justify-between">
                <span>Ghi chú gửi kèm Ban Giám Hiệu</span>
                <span className="text-[11px] text-muted-foreground font-normal">Tùy chọn</span>
              </label>
              <textarea
                value={submitNote}
                onChange={(e) => setSubmitNote(e.target.value)}
                placeholder="Ví dụ: Đã hoàn thiện bổ sung hoạt động theo góp ý của BGH..."
                rows={3}
                className="w-full text-xs bg-background border border-border rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/60 text-foreground resize-none placeholder:text-muted-foreground/60 transition-colors"
              />
              <p className="text-[11px] text-muted-foreground">
                Sau khi nộp, kế hoạch chủ đề sẽ chuyển sang chế độ Chờ duyệt.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2 pt-2.5 border-t border-border/60">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSubmitModalOpen(false)}
              disabled={isActionLoading}
              className="text-xs rounded-md h-8 px-4"
            >
              Hủy bỏ
            </Button>
            {stats && !stats.isReadyToSubmit ? (
              <Button
                size="sm"
                disabled
                title="Cần điền kín 100% các slot thời khóa biểu để có thể nộp kế hoạch"
                className="bg-muted text-muted-foreground/60 border border-border/70 text-xs font-medium rounded-md h-8 px-4 cursor-not-allowed shadow-none"
              >
                Chưa đủ điều kiện nộp
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleSubmitPlan}
                disabled={isActionLoading}
                className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium rounded-md h-8 px-4 transition-colors cursor-pointer"
              >
                {isActionLoading ? 'Đang gửi...' : 'Xác nhận nộp kế hoạch'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ThemePlanStatusBar;
