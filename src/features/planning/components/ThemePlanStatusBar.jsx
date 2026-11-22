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
  const { t, i18n } = useTranslation();
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
      toast.error(t('planning.selectThemeToSubmit', 'Vui lòng chọn chủ đề để nộp kế hoạch.'));
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
        t(
          'planning.submitPlanSuccess',
          'Đã nộp kế hoạch chủ đề "{{name}}" cho Ban Giám Hiệu phê duyệt thành công!',
          { name: statusData?.themeName || t('planning.themeEduc', 'Chủ đề giáo dục') },
        ),
      );
      setIsSubmitModalOpen(false);
      setSubmitNote('');
      loadStatus();
    } catch (err) {
      console.error('Submit plan error:', err);
      toast.error(err.response?.data?.message || t('planning.submitPlanError', 'Có lỗi xảy ra khi nộp kế hoạch.'));
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
      return d.toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
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

  const displayThemeName = statusData?.themeName || currentThemeObj?.name || t('planning.themeEduc', 'Chủ đề giáo dục');
  const displayThemeCode = currentThemeObj?.code ? t('planning.themePrefix', 'Chủ đề {{index}}', { index: currentThemeObj.code }) + ': ' : '';
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
            <span className="text-muted-foreground text-[11.5px]">{t('planning.themeLabelColon', 'Chủ đề:')}</span>
            {themes.length > 1 && onThemeChange ? (
              <select
                value={selectedThemeId || statusData?.themeId || ''}
                onChange={(e) => onThemeChange(e.target.value)}
                className="h-7 text-xs font-semibold bg-background border border-border px-2 py-0.5 rounded-none text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary/40"
              >
                {themes.map((th) => (
                  <option key={th.id || th.publicId} value={th.id || th.publicId}>
                    {th.code ? t('planning.themePrefix', 'Chủ đề {{index}}', { index: th.code }) + ': ' : ''}
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
              {t('planning.statusDraftComposing', 'Bản nháp (Đang soạn)')}
            </span>
          )}

          {status === 'PENDING_APPROVAL' && (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded-none dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/60">
              <span className="size-1.5 rounded-full bg-blue-600 animate-pulse" />
              {t('common.pending', 'Chờ duyệt')}
            </span>
          )}

          {status === 'USED' && (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-none dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60">
              <HugeiconsIcon icon={CheckmarkCircle01Icon} size={13} className="text-emerald-600" />
              {t('common.approved', 'Đã duyệt')}
            </span>
          )}

          {status === 'REJECTED' && (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200 rounded-none dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/60">
              <HugeiconsIcon icon={AlertCircleIcon} size={13} className="text-rose-600" />
              {t('planning.statusNeedsRevisionShort', 'Yêu cầu sửa')}
            </span>
          )}

          {/* Deadline indicator if applicable */}
          {statusData?.deadline && (
            <span className="text-[11px] text-muted-foreground hidden lg:inline-flex items-center gap-1">
              <HugeiconsIcon icon={Calendar03Icon} size={12} className="text-muted-foreground/70" />
              {t('planning.deadlineLabel', 'Hạn nộp: {{date}}', { date: formatDateVi(statusData.deadline) })}
            </span>
          )}
        </div>

        {/* Middle / Center: Completeness & Quality Gate Indicator */}
        {stats && (
          <div className="flex items-center gap-2 text-[11.5px] text-muted-foreground border-t md:border-t-0 pt-1 md:pt-0">
            <span className="font-medium text-foreground/80">{t('planning.themeProgress', 'Tiến độ chủ đề:')}</span>
            <div className="flex items-center gap-1.5 font-medium">
              <span className="text-foreground">{stats.totalGoals}</span> {t('planning.goalsShort', 'MT')}
              <span className="text-border">•</span>
              <span className="text-foreground">{stats.totalActivities}</span> {t('planning.actsShort', 'HĐGD')}
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
              {t('planning.weeksTimetable', 'tuần TKB')}
            </div>

            {stats.isReadyToSubmit ? (
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50/80 px-1.5 py-0.5 border border-emerald-200/70 rounded-none ml-1">
                <HugeiconsIcon icon={CheckmarkCircle01Icon} size={12} className="text-emerald-600" />
                {t('planning.readyToSubmit', 'Đủ điều kiện nộp')}
              </span>
            ) : (
              <span
                title={stats.missingItems?.join('\n')}
                className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50/80 px-1.5 py-0.5 border border-amber-200/70 rounded-none ml-1 cursor-help"
              >
                <HugeiconsIcon icon={AlertCircleIcon} size={12} className="text-amber-600" />
                {t('planning.incomplete', 'Chưa hoàn thiện')}
              </span>
            )}
          </div>
        )}

        {/* Right: Submission Status or Action Button */}
        <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
          {status === 'PENDING_APPROVAL' && (
            <div className="text-[11.5px] text-muted-foreground italic flex items-center gap-1.5">
              <HugeiconsIcon icon={Clock01Icon} size={13} className="text-blue-600" />
              <span>{t('planning.submittedOnPending', 'Đã nộp ngày {{date}}. Đang chờ duyệt.', { date: formatDateVi(statusData?.submittedAt) })}</span>
            </div>
          )}

          {status === 'USED' && (
            <div className="text-[11.5px] text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1">
              <HugeiconsIcon icon={CheckmarkCircle01Icon} size={13} />
              <span>{t('planning.planApprovedLocked', 'Kế hoạch đã duyệt và đang khóa để thực hiện giảng dạy.')}</span>
            </div>
          )}

          {/* Teacher Submission Button */}
          {!isBGH && (status === 'DRAFT' || status === 'REJECTED') && (
            <Button
              onClick={() => setIsSubmitModalOpen(true)}
              disabled={isLoading || isActionLoading}
              title={t('planning.submitThemePlanTooltip', 'Nộp toàn bộ kế hoạch Chủ đề: {{name}} cho Ban Giám Hiệu', { name: displayThemeName })}
              className={cn(
                'h-8 px-3 text-[12px] font-medium rounded-none flex items-center gap-1.5 shadow-none transition-colors cursor-pointer',
                status === 'REJECTED'
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'bg-primary hover:bg-primary/90 text-primary-foreground'
              )}
            >
              <HugeiconsIcon icon={SendIcon} size={14} />
              <span>
                {status === 'REJECTED' ? t('planning.resubmitToBghBtn', 'Nộp lại cho BGH duyệt') : t('planning.submitThemePlanBtn', 'Nộp kế hoạch chủ đề')}
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
              {t('planning.bghRequestedRevision', 'Ban Giám Hiệu yêu cầu chỉnh sửa kế hoạch chủ đề này:')}
            </strong>
            <p className="text-rose-700 dark:text-rose-300 leading-relaxed bg-white/70 dark:bg-black/20 p-2 rounded-none border border-rose-200 dark:border-rose-900/30 font-medium">
              "{statusData.rejectionReason}"
            </p>
            <span className="text-[11px] text-rose-600/90 dark:text-rose-400/90 mt-1 block">
              💡 {t('planning.teacherReviseHint', 'Giáo viên vui lòng kiểm tra và hoàn thiện lại 3 Tab (Phân bố mục tiêu, Xác định hoạt động, Kế hoạch tuần) rồi bấm "Nộp lại cho BGH duyệt".')}
            </span>
          </div>
        </div>
      )}

      {/* 3. Modal: Teacher Pre-submission Checklist & Submit Plan */}
      <Dialog open={isSubmitModalOpen} onOpenChange={setIsSubmitModalOpen}>
        <DialogContent className="w-[calc(100vw-32px)] max-w-[480px] p-5 sm:p-6 rounded-none border border-border bg-card shadow-2xl text-foreground select-none overflow-hidden box-border">
          <DialogHeader className="space-y-1 pb-3 border-b border-border text-left">
            <DialogTitle className="text-[16px] font-semibold text-foreground tracking-tight">
              {t('planning.submitPlanModalTitle', 'Nộp kế hoạch giáo dục cho BGH')}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              {t('planning.submitPlanModalDesc', 'Kế hoạch lớp {{className}} • Chủ đề "{{themeName}}"', {
                className: currentClass?.name || t('classes.classDefault', 'Lớp'),
                themeName: displayThemeName,
              })}
              {displayDateRange && <span> ({displayDateRange})</span>}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-1 text-xs">
            {/* Checklist Box - Thiết kế clean, chuyên nghiệp, phẳng, ít màu sắc, đồng bộ drawer */}
            <div className="border border-border bg-muted/15 rounded-none overflow-hidden">
              <div className="px-3.5 py-2.5 bg-muted/40 border-b border-border flex items-center justify-between">
                <span className="font-medium text-foreground text-xs">{t('planning.submitCondition', 'Điều kiện nộp')}</span>
                {stats?.isReadyToSubmit ? (
                  <span className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-muted-foreground">
                    <span className="size-1.5 bg-emerald-600 dark:bg-emerald-400"></span>
                    <span>{t('planning.eligible', 'Đủ điều kiện')}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-muted-foreground">
                    <span className="size-1.5 bg-muted-foreground/60"></span>
                    <span>{t('planning.slotsNotFilled', 'Chưa điền kín slot')}</span>
                  </span>
                )}
              </div>

              <div className="divide-y divide-border/40 px-3.5 text-xs">
                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-muted-foreground">{t('planning.educationalObjectives', 'Mục tiêu giáo dục')}</span>
                  <span className="font-medium">
                    {stats?.totalGoals > 0 ? (
                      <span className="text-foreground">{t('planning.goalsCount', '{{count}} mục tiêu', { count: stats.totalGoals })}</span>
                    ) : (
                      <span className="text-muted-foreground font-normal">{t('planning.notSelectedYet', 'Chưa chọn')}</span>
                    )}
                  </span>
                </div>

                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-muted-foreground">{t('planning.timetableActivities', 'Hoạt động thời khóa biểu')}</span>
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
                              {t('planning.missingSlotsCount', '(thiếu {{count}})', { count: total - scheduled })}
                            </span>
                          )}
                        </span>
                      );
                    })()}
                  </span>
                </div>

                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-muted-foreground">{t('planning.weeklyProgress', 'Tiến độ các tuần')}</span>
                  <span className="font-medium text-foreground">
                    {stats && stats.scheduledWeeks >= stats.totalWeeks && stats.totalWeeks > 0 ? (
                      t('planning.weeksCount', '{{current}}/{{total}} tuần', { current: stats.scheduledWeeks, total: stats.totalWeeks })
                    ) : (
                      <span>
                        {stats ? t('planning.weeksCount', '{{current}}/{{total}} tuần', { current: stats.scheduledWeeks, total: stats.totalWeeks }) : t('planning.notScheduledYet', 'Chưa xếp')}
                      </span>
                    )}
                  </span>
                </div>
              </div>

              {/* Lời nhắc nếu chưa kín - Clean, phẳng, ít màu sắc đồng bộ drawer */}
              {stats && !stats.isReadyToSubmit && (
                <div className="px-3.5 py-2.5 border-t border-border bg-muted/30 text-[11.5px] text-muted-foreground flex items-center gap-2">
                  <HugeiconsIcon icon={InformationCircleIcon} size={14} className="text-muted-foreground shrink-0" />
                  <span className="leading-relaxed">
                    {t('planning.fullSlotsNotice', 'Thời khóa biểu cần được điền kín 100% các slot hoạt động trước khi gửi BGH.')}
                  </span>
                </div>
              )}
            </div>

            {/* Note Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground flex items-center justify-between">
                <span>{t('planning.submitNoteLabel', 'Ghi chú gửi kèm Ban Giám Hiệu')}</span>
                <span className="text-[11px] text-muted-foreground font-normal">{t('planning.optional', 'Tùy chọn')}</span>
              </label>
              <textarea
                value={submitNote}
                onChange={(e) => setSubmitNote(e.target.value)}
                placeholder={t('planning.submitNotePlaceholder', 'Ví dụ: Đã hoàn thiện bổ sung hoạt động theo góp ý của BGH...')}
                rows={3}
                className="w-full text-xs bg-background border border-border rounded-none p-2.5 focus:outline-none focus:border-foreground text-foreground resize-none placeholder:text-muted-foreground/50 transition-colors shadow-none"
              />
              <p className="text-[11px] text-muted-foreground">
                {t('planning.submitNoticeText', 'Sau khi nộp, kế hoạch chủ đề sẽ chuyển sang chế độ Chờ duyệt.')}
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2 pt-3 border-t border-border flex items-center justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsSubmitModalOpen(false)}
              disabled={isActionLoading}
              className="h-8 px-4 text-xs font-medium rounded-none border border-border hover:bg-muted text-foreground cursor-pointer shadow-none"
            >
              {t('common.cancel', 'Hủy')}
            </Button>
            {stats && !stats.isReadyToSubmit ? (
              <Button
                type="button"
                size="sm"
                disabled
                title={t('planning.fullSlotsNotice', 'Thời khóa biểu cần được điền kín 100% các slot hoạt động trước khi gửi BGH.')}
                className="h-8 px-4 text-xs font-medium rounded-none bg-muted text-muted-foreground/60 border border-border cursor-not-allowed shadow-none"
              >
                {t('planning.notEligibleToSubmitBtn', 'Chưa đủ điều kiện nộp')}
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={handleSubmitPlan}
                disabled={isActionLoading}
                className="h-8 px-4 text-xs font-medium rounded-none bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer shadow-none transition-colors"
              >
                {isActionLoading ? t('planning.submittingBtn', 'Đang gửi...') : t('planning.confirmSubmitPlanBtn', 'Xác nhận nộp kế hoạch')}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ThemePlanStatusBar;
