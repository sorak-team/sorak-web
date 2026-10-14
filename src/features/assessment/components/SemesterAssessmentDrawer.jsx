import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Cancel01Icon,
  CheckmarkCircle02Icon,
} from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { cn } from '@/shared/lib/utils';

export function SemesterAssessmentDrawer({
  student,
  classId = '1',
  semester = 'SEMESTER_1',
  classInfo,
  className = 'Nhà trẻ 1',
  onClose,
  onSave,
}) {
  const { t } = useTranslation();

  const [notes, setNotes] = useState(student?.teacherNotes || '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (student) {
      setNotes(student.teacherNotes || '');
    }
  }, [student]);

  if (!student) return null;

  const isDirty = (student.teacherNotes || '') !== notes;
  const isEvaluated = Boolean(notes.trim());

  const handleSave = async () => {
    if (!isDirty) return;
    setIsSaving(true);
    try {
      await onSave({
        ...student,
        teacherNotes: notes,
        isEvaluated: Boolean(notes.trim()),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const semesterLabel = semester === 'SEMESTER_2' ? t('assessment.semester2', 'Học kỳ 2') : t('assessment.semester1', 'Học kỳ 1');

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

  // 5 developmental domains data
  const domains = student.domains || {
    physical: 95,
    cognitive: 90,
    language: 95,
    socioEmotional: 95,
    aesthetic: 95,
  };

  const domainList = [
    {
      key: 'physical',
      title: t('domains.physicalTitle', '1. Phát triển Thể chất'),
      desc: t('domains.physicalDesc', 'Vận động thô, vận động tinh, nề nếp ăn ngủ và vệ sinh tự phục vụ'),
      value: student.domainBreakdown?.physical?.rate ?? (domains.physical ?? 0),
      achieved: student.domainBreakdown?.physical?.achieved ?? Math.round(((domains.physical ?? 0) / 100) * 25),
      total: student.domainBreakdown?.physical?.total ?? 25,
    },
    {
      key: 'cognitive',
      title: t('domains.cognitiveTitle', '2. Phát triển Nhận thức'),
      desc: t('domains.cognitiveDesc', 'Khám phá khoa học, làm quen toán học và nhận biết thế giới xung quanh'),
      value: student.domainBreakdown?.cognitive?.rate ?? (domains.cognitive ?? 0),
      achieved: student.domainBreakdown?.cognitive?.achieved ?? Math.round(((domains.cognitive ?? 0) / 100) * 20),
      total: student.domainBreakdown?.cognitive?.total ?? 20,
    },
    {
      key: 'language',
      title: t('domains.languageTitle', '3. Phát triển Ngôn ngữ'),
      desc: t('domains.languageDesc', 'Nghe hiểu chỉ dẫn, phát âm rõ ràng, diễn đạt câu ngắn tự tin'),
      value: student.domainBreakdown?.language?.rate ?? (domains.language ?? 0),
      achieved: student.domainBreakdown?.language?.achieved ?? Math.round(((domains.language ?? 0) / 100) * 18),
      total: student.domainBreakdown?.language?.total ?? 18,
    },
    {
      key: 'socioEmotional',
      title: t('domains.socialEmotionalTitle', '4. Tình cảm & Kỹ năng xã hội'),
      desc: t('domains.socialEmotionalDesc', 'Lễ phép với cô giáo, hòa đồng cùng bạn, biết chia sẻ và hợp tác'),
      value: student.domainBreakdown?.socioEmotional?.rate ?? (domains.socioEmotional ?? 0),
      achieved: student.domainBreakdown?.socioEmotional?.achieved ?? Math.round(((domains.socioEmotional ?? 0) / 100) * 20),
      total: student.domainBreakdown?.socioEmotional?.total ?? 20,
    },
    {
      key: 'aesthetic',
      title: t('domains.aestheticTitle', '5. Phát triển Thẩm mỹ'),
      desc: t('domains.aestheticDesc', 'Cảm thụ cái đẹp, tích cực tham gia ca hát, vận động theo nhạc và tạo hình'),
      value: student.domainBreakdown?.aesthetic?.rate ?? (domains.aesthetic ?? 0),
      achieved: student.domainBreakdown?.aesthetic?.achieved ?? Math.round(((domains.aesthetic ?? 0) / 100) * 16),
      total: student.domainBreakdown?.aesthetic?.total ?? 16,
    },
  ];

  const attendanceRate = student.attendance?.rate ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in-0 duration-200"
      />

      {/* Large Drawer Panel matching Sorak standards */}
      <div
        className={cn(
          'relative w-full max-w-[720px] h-full bg-card border-l border-border shadow-2xl flex flex-col',
          'animate-in slide-in-from-right duration-250 ease-out z-10 text-foreground'
        )}
        data-name="SemesterAssessmentDrawer · Large"
      >
        {/* 1. Header with title + description and borderless close button */}
        <div className="px-6 py-4 border-b border-border bg-card shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-0.5">
              <h2 className="text-[17px] font-semibold text-foreground tracking-tight">
                {semester === 'SEMESTER_2' ? t('assessment.semesterDrawerTitle2', 'Đánh giá học kỳ 2') : t('assessment.semesterDrawerTitle1', 'Đánh giá học kỳ 1')}
              </h2>
              <p className="text-[12px] text-muted-foreground font-normal">
                {t('assessment.semesterDrawerDesc', 'Xem tổng hợp kết quả rèn luyện và ghi nhận nhận xét đánh giá cuối kỳ của học sinh')}
              </p>
            </div>

            {/* Standard Borderless size-7 close button */}
            <button
              type="button"
              onClick={onClose}
              className="size-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer rounded-none shrink-0"
              title={t('common.close', 'Đóng')}
            >
              <HugeiconsIcon icon={Cancel01Icon} size={16} />
            </button>
          </div>

          {/* Student Profile Hero Card */}
          <div className="mt-3 p-3 border border-border bg-muted/20 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="size-10 rounded-none border border-border/80 overflow-hidden bg-background shrink-0">
                <img
                  src={`https://api.dicebear.com/10.x/critters/svg?seed=${encodeURIComponent(student.code)}&backgroundColor=ff2e63,00c2a8,ffb300,3d5afe,8e24aa,00e676`}
                  alt={student.name}
                  className="size-full object-cover"
                />
              </div>
              <div className="flex flex-col min-w-0 leading-tight">
                <span className="font-semibold text-foreground text-[14.5px] truncate">
                  {student.name}
                </span>
                <span className="text-[12px] text-muted-foreground font-mono mt-0.5">
                  {student.code} · {student.gender === 'MALE' ? t('students.male', 'Nam') : t('students.female', 'Nữ')} · {t('assessment.classPrefix', 'Lớp {{className}}', { className })}
                </span>
              </div>
            </div>

            {/* Status Badge */}
            <div className="shrink-0">
              {isEvaluated ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11.5px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200">
                  <HugeiconsIcon icon={CheckmarkCircle02Icon} size={13} />
                  <span>{t('assessment.evaluatedBadge', 'Đã có nhận xét')}</span>
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-1 text-[11.5px] font-medium bg-muted text-muted-foreground border border-border">
                  {t('assessment.notEvaluatedBadge', 'Chưa nhận xét')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 2. Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">
          {/* Key Semester Overview Cards: Attendance + Health (2 cards) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* 1. Đi học đủ của kỳ (Green when >= 90%) */}
            <div className="p-3.5 border border-border bg-card flex flex-col justify-between gap-1.5 shadow-2xs">
              <span className="text-[12px] font-medium text-muted-foreground">
                {t('assessment.attendanceFull', 'Đi học đủ')}
              </span>
              <div className="flex items-baseline justify-between gap-2">
                <span
                  className={cn(
                    'text-[22px] font-bold font-mono tracking-tight',
                    attendanceRate >= 90
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-foreground'
                  )}
                >
                  {attendanceRate}%
                </span>
                <span className="text-[11.5px] text-muted-foreground font-mono">
                  {student.attendance?.presentDays ?? 0}/{student.attendance?.totalDays ?? 0} {t('assessment.daysUnit', 'ngày')}
                </span>
              </div>
              <div className="w-full h-1 bg-muted rounded-none overflow-hidden mt-0.5">
                <div
                  className={cn(
                    'h-full',
                    attendanceRate >= 90
                      ? 'bg-emerald-600 dark:bg-emerald-500'
                      : 'bg-amber-500'
                  )}
                  style={{ width: `${attendanceRate}%` }}
                />
              </div>
            </div>

            {/* 2. Tình trạng sức khỏe */}
            <div className="p-3.5 border border-border bg-card flex flex-col justify-between gap-1.5 shadow-2xs">
              <span className="text-[12px] font-medium text-muted-foreground">
                {t('health.title', 'Sức khỏe')}
              </span>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'inline-flex items-center px-2 py-0.5 text-[12px] font-medium rounded-none border',
                    student.health?.status === 'Bình thường'
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200'
                      : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200'
                  )}
                >
                  {getHealthStatusLabel(student.health?.status)}
                </span>
              </div>
              <span className="font-mono text-[11px] text-muted-foreground truncate">
                {t('assessment.examDate', 'Ngày khám:')} {student.health?.examDate || (semester === 'SEMESTER_2' ? '15/04/2027' : '15/10/2026')}
              </span>
            </div>
          </div>

          {/* Section: 5 Lĩnh vực phát triển (Clean list without redundant badges) */}
          <div className="border border-border bg-card shadow-2xs">
            <div className="px-4 py-2.5 border-b border-border bg-muted/20 flex items-center justify-between">
              <span className="text-[13px] font-semibold text-foreground tracking-tight">
                {t('assessment.goalsBy5Domains', 'Mục tiêu đạt được theo 5 lĩnh vực phát triển')}
              </span>
              {student.totalGoals && (
                <span className="text-[11.5px] font-mono text-muted-foreground">
                  {t('assessment.totalGoalsAchieved', 'Tổng đạt:')} <strong className="text-foreground font-semibold">{student.totalGoals.achieved}/{student.totalGoals.total}</strong> mục tiêu ({student.totalGoals.rate}%)
                </span>
              )}
            </div>

            <div className="divide-y divide-border/60">
              {domainList.map((item) => (
                <div
                  key={item.key}
                  className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/10 transition-colors"
                >
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-[13px] font-medium text-foreground">
                      {item.title}
                    </span>
                    <span className="text-[11.5px] text-muted-foreground truncate">
                      {item.desc}
                    </span>
                  </div>

                  <div className="w-64 shrink-0 flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-muted rounded-none overflow-hidden">
                      <div
                        className={cn(
                          'h-full',
                          item.value >= 90
                            ? 'bg-emerald-600 dark:bg-emerald-500'
                            : 'bg-primary'
                        )}
                        style={{ width: `${item.value}%` }}
                      />
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 text-right">
                      <span className="text-[12px] font-mono text-muted-foreground whitespace-nowrap">
                        {item.achieved}/{item.total} MT
                      </span>
                      <span
                        className={cn(
                          'w-11 text-right font-mono text-[13px] font-semibold',
                          item.value >= 90
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-foreground'
                        )}
                      >
                        {item.value}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section: Nhận xét của giáo viên cuối kỳ */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-[13px] font-semibold text-foreground tracking-tight">
                {t('assessment.semesterCommentTitle', { semester: semesterLabel, defaultValue: `Nhận xét của giáo viên cuối ${semesterLabel}` })}
              </label>
              <span className="text-[11.5px] text-muted-foreground">
                {t('assessment.electronicRecord', 'Ghi nhận vào học bạ điện tử')}
              </span>
            </div>

            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('assessment.semesterCommentPlaceholder', 'Nhập nhận xét chi tiết về các mặt phát triển của bé cuối học kỳ...')}
              rows={4}
              className="w-full p-3 text-[13px] border border-border bg-background text-foreground rounded-none focus:outline-none focus:border-[#1447e6] leading-relaxed resize-none transition-colors placeholder:text-muted-foreground/40 shadow-2xs"
            />
          </div>
        </div>

        {/* 3. Footer: Hủy & Lưu (no icon) */}
        <div className="px-6 py-4 border-t border-border bg-card shrink-0 flex items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="h-8.5 px-4 text-[13px] border-border bg-card hover:bg-muted text-foreground rounded-none shadow-none cursor-pointer"
          >
            {t('common.cancel', 'Hủy')}
          </Button>

          <Button
            type="button"
            onClick={handleSave}
            disabled={!isDirty || isSaving}
            className={cn(
              'h-8.5 px-5 text-[13px] font-medium rounded-none shadow-none flex items-center justify-center transition-colors',
              isDirty
                ? 'bg-[#1447e6] hover:bg-[#1447e6]/90 text-white cursor-pointer'
                : 'bg-muted text-muted-foreground border border-border cursor-not-allowed opacity-60'
            )}
          >
            <span>{isSaving ? t('common.saving', 'Đang lưu...') : t('common.save', 'Lưu')}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

export default SemesterAssessmentDrawer;
