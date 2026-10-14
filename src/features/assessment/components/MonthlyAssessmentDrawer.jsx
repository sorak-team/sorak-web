import React from 'react';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import { Cancel01Icon } from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { cn } from '@/shared/lib/utils';

// Helper to format feedback timestamp nicely
const formatFeedbackDate = (rawDate) => {
  if (!rawDate) return '';
  if (typeof rawDate !== 'string') return String(rawDate);
  // Match standard ISO string format like 2026-10-09T18:30:00Z
  const isoMatch = rawDate.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (isoMatch) {
    const [, yr, mo, da, hr, mi] = isoMatch;
    return `${hr}:${mi}, ${da}/${mo}/${yr}`;
  }
  try {
    const d = new Date(rawDate);
    if (isNaN(d.getTime())) return rawDate;
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${hours}:${minutes}, ${day}/${month}/${year}`;
  } catch {
    return rawDate;
  }
};

export function MonthlyAssessmentDrawer({
  student,
  classId = '1',
  month = 9,
  year = 2026,
  className = 'Nhà trẻ 1',
  onClose,
}) {
  const { t } = useTranslation();

  if (!student) return null;

  const w1 = Boolean(student.week1Rose);
  const w2 = Boolean(student.week2Rose);
  const w3 = Boolean(student.week3Rose);
  const w4 = Boolean(student.week4Rose);
  const w5 = Boolean(student.week5Rose);

  const currentRosesCount =
    (w1 ? 1 : 0) + (w2 ? 1 : 0) + (w3 ? 1 : 0) + (w4 ? 1 : 0) + (w5 ? 1 : 0);
  const isLotus = currentRosesCount >= 4;

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

  const weekList = [
    {
      key: 1,
      label: t('assessment.weekX', { week: 1, defaultValue: 'Tuần 1' }),
      val: w1,
      stats: student.weeklyStats?.week1,
    },
    {
      key: 2,
      label: t('assessment.weekX', { week: 2, defaultValue: 'Tuần 2' }),
      val: w2,
      stats: student.weeklyStats?.week2,
    },
    {
      key: 3,
      label: t('assessment.weekX', { week: 3, defaultValue: 'Tuần 3' }),
      val: w3,
      stats: student.weeklyStats?.week3,
    },
    {
      key: 4,
      label: t('assessment.weekX', { week: 4, defaultValue: 'Tuần 4' }),
      val: w4,
      stats: student.weeklyStats?.week4,
    },
    {
      key: 5,
      label: t('assessment.weekX', { week: 5, defaultValue: 'Tuần 5' }),
      val: w5,
      stats: student.weeklyStats?.week5,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in-0 duration-200"
      />

      {/* Large Drawer Panel */}
      <div
        className={cn(
          'relative w-full max-w-[760px] h-full bg-card border-l border-border shadow-2xl flex flex-col',
          'animate-in slide-in-from-right duration-250 ease-out z-10 text-foreground'
        )}
        data-name="MonthlyAssessmentDrawer · View Only"
      >
        {/* 1. Header */}
        <div className="px-6 pt-5 pb-4 border-b border-border bg-card shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <h2 className="text-[18px] font-semibold text-foreground tracking-tight">
                  {t('assessment.eGoodChildBook', 'Sổ Bé Ngoan điện tử')}
                </h2>
                <span className="font-mono text-[11px] font-medium bg-muted text-muted-foreground border border-border px-2 py-0.5 rounded-none">
                  {t('calendar.month', 'Tháng')} {month}/{year}
                </span>
              </div>
              <p className="text-[12px] text-muted-foreground font-normal">
                {t('assessment.monthlyAssessmentClassDesc', { className, defaultValue: `Đánh giá rèn luyện hàng tuần và tổng kết bé ngoan lớp ${className}` })}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="size-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-none transition-colors cursor-pointer"
              title={t('common.close', 'Đóng')}
            >
              <HugeiconsIcon icon={Cancel01Icon} size={16} />
            </button>
          </div>

          {/* Student Profile Hero Card (No gender displayed) */}
          <div className="mt-4 p-3.5 border border-border bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="size-12 rounded-none border border-border/80 overflow-hidden bg-background shrink-0">
                <img
                  src={`https://api.dicebear.com/10.x/critters/svg?seed=${encodeURIComponent(student.code)}&backgroundColor=ff2e63,00c2a8,ffb300,3d5afe,8e24aa,00e676`}
                  alt={student.name}
                  className="size-full object-cover"
                />
              </div>
              <div className="flex flex-col min-w-0 leading-tight">
                <span className="font-semibold text-foreground text-[15px] truncate">
                  {student.name}
                </span>
                <span className="text-[12px] text-muted-foreground font-mono mt-0.5">
                  {student.code} · {t('assessment.classPrefix', { className, defaultValue: `Lớp ${className}` })}
                </span>
              </div>
            </div>

            {/* Achievements Summary Badges (Bông Sen without CNBH) */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[12px] font-semibold bg-background border border-border">
                <img src="/rose.webp" alt="Hoa hồng" className="size-4 object-contain" />
                <span>{currentRosesCount}/5 {t('assessment.rosesUnit', 'hoa')}</span>
              </div>

              {isLotus ? (
                <div
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[12px] font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-900"
                  title={t('assessment.achievedLotusTitle', 'Đạt danh hiệu Bông Sen')}
                >
                  <img src="/lotus.webp" alt="Bông Sen" className="size-4 object-contain" />
                  <span>{t('assessment.lotus', 'Bông Sen')}</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[12px] font-medium bg-muted text-muted-foreground border border-border">
                  <span>{t('assessment.inTraining', 'Đang rèn luyện')}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 2. Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-6">
          {/* Section A: Đánh giá rèn luyện 5 tuần trong tháng (View Only) */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="text-[13.5px] font-semibold text-foreground tracking-tight">
                {t('assessment.weeklyReviewDetail', 'Chi tiết đánh giá 5 tuần trong tháng')}
              </label>
            </div>

            <div className="border border-border bg-card overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="h-9 border-b border-border bg-muted/30 text-[12px] font-medium text-foreground">
                    <th className="px-3">{t('assessment.week', 'Tuần')}</th>
                    <th className="px-3 text-center">{t('assessment.attendance', 'Chuyên cần')}</th>
                    <th className="px-3 text-center">{t('assessment.goals', 'Mục tiêu')}</th>
                    <th className="px-3 text-center">{t('assessment.latestHealth', 'Sức khỏe gần nhất')}</th>
                    <th className="px-3 text-center">{t('assessment.roseFlower', 'Hoa hồng')}</th>
                    <th className="px-3">{t('assessment.teacherNotes', 'Ghi chú của giáo viên')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 text-[12.5px]">
                  {weekList.map((wk) => {
                    const stats = wk.stats || {};
                    return (
                      <tr key={wk.key} className="h-12 hover:bg-muted/20 transition-colors">
                        {/* Tuần (chỉ hiển thị Tuần mấy, không có ngày) */}
                        <td className="px-3 font-medium whitespace-nowrap">
                          <span className="text-[13px] text-foreground font-medium">{wk.label}</span>
                        </td>

                        {/* Chuyên cần */}
                        <td className="px-3 text-center whitespace-nowrap">
                          <div className="flex flex-col items-center">
                            <span className={cn('font-semibold', stats.attendanceRate >= 80 ? 'text-foreground' : 'text-amber-600')}>
                              {stats.attendanceRate ?? 100}%
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              {stats.attendancePresent ?? 5}/{stats.attendanceTotal ?? 5} {t('assessment.sessionsUnit', 'buổi')}
                            </span>
                          </div>
                        </td>

                        {/* Mục tiêu */}
                        <td className="px-3 text-center whitespace-nowrap">
                          <div className="flex flex-col items-center">
                            <span className="font-semibold text-foreground">
                              {stats.goalsRate ?? 100}%
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              {stats.goalsAchieved ?? 4}/{stats.goalsTotal ?? 4} {t('assessment.achievedUnit', 'đạt')}
                            </span>
                          </div>
                        </td>

                        {/* Sức khỏe gần nhất */}
                        <td className="px-3 text-center whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                            {getHealthStatusLabel(stats.healthStatus)}
                          </span>
                        </td>

                        {/* Hoa hồng (Chỉ xem) */}
                        <td className="px-3 text-center">
                          {wk.val ? (
                            <div className="size-8 mx-auto flex items-center justify-center bg-rose-50 border border-rose-200 dark:bg-rose-950/60 dark:border-rose-900 rounded-none">
                              <img src="/rose.webp" alt="Hoa hồng" className="size-5 object-contain" />
                            </div>
                          ) : (
                            <div className="size-8 mx-auto flex items-center justify-center text-muted-foreground/40 font-mono text-[13px]">
                              —
                            </div>
                          )}
                        </td>

                        {/* Ghi chú tuần (Chỉ xem) */}
                        <td className="px-3 min-w-[160px]">
                          {stats.note ? (
                            <span className="text-[12.5px] text-foreground font-normal">{stats.note}</span>
                          ) : (
                            <span className="text-[12px] text-muted-foreground/40 italic">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section B: Ý kiến phản hồi của phụ huynh (Không có badge "Đã phản hồi", ngày giờ dễ đọc) */}
          <div className="p-4 border border-border bg-muted/15 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-semibold text-foreground">
                {t('assessment.parentFeedbackTitle', 'Ý kiến phản hồi từ phụ huynh')}
              </span>
            </div>

            {student.parentFeedback ? (
              <div className="mt-1 p-3 bg-card border border-border/80 text-[13px] text-foreground leading-relaxed italic">
                "{student.parentFeedback}"
                <div className="mt-1.5 text-[11.5px] text-muted-foreground not-italic font-normal">
                  {t('assessment.feedbackByPrefix', '— Gửi bởi:')} <span className="text-foreground font-medium">{student.feedbackBy || t('assessment.studentParentDefault', 'Phụ huynh bé')}</span>
                  {student.feedbackAt && (
                    <span> ({formatFeedbackDate(student.feedbackAt)})</span>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-[12px] text-muted-foreground italic">
                {t('assessment.noFeedbackYet', 'Phụ huynh chưa để lại lời nhắn cho sổ bé ngoan tháng này.')}
              </p>
            )}
          </div>
        </div>

        {/* 3. Footer (Chỉ có nút Đóng) */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-border shrink-0 bg-background">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="h-8 px-5 text-[13px] rounded-none border-border cursor-pointer bg-card hover:bg-muted text-foreground"
          >
            {t('common.close', 'Đóng')}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default MonthlyAssessmentDrawer;
