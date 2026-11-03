import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Smile, Meh, Star, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { HugeiconsIcon } from '@hugeicons/react';
import { Search01Icon, Cancel01Icon, MoreHorizontalIcon } from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/shared/lib/utils';
import { useAuthStore } from '@/features/auth';
import { assessmentApi } from '../assessment.api';

function formatIsoDate(rawDate) {
  if (!rawDate) return null;
  if (typeof rawDate === 'string') {
    const trimmed = rawDate.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    if (/^\d{1,2}\/\d{1,2}$/.test(trimmed)) {
      const [d, m] = trimmed.split('/');
      return `2026-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
      const [d, m, y] = trimmed.split('/');
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
  }
  return null;
}

export function WeeklyAssessmentPanel({
  classId,
  slot,
  activityDetails,
  initialStudents = [],
  readOnly = false,
  isAttendanceRecorded: isAttendanceRecordedProp,
  tab = 'content',
  isEvaluated = false,
  onTabChange,
  onClose,
  onSaveSuccess,
  onCleanSuccess,
  className,
  hideHeader = false,
  prevSlot = null,
  nextSlot = null,
  onPrevSlot,
  onNextSlot,
}) {
  const { t, i18n } = useTranslation();
  const isVi = (i18n.language || 'vi').startsWith('vi');
  const user = useAuthStore((s) => s.user);
  const isPrincipal = Boolean(
    user?.role === 'PRINCIPAL_BGH' ||
    user?.role === 'PRINCIPAL' ||
    user?.role === 'VICE_PRINCIPAL' ||
    user?.role?.toLowerCase()?.includes('principal') ||
    user?.role?.toLowerCase()?.includes('bgh')
  );
  const effectiveReadOnly = Boolean(readOnly || isPrincipal);

  const isAttendanceRecorded = isAttendanceRecordedProp ?? slot?.isAttendanceRecorded ?? true;
  const targetClassId = classId || slot?.classId || slot?.class_id || '5';
  const [students, setStudents] = useState([]);
  const [initialSnapshot, setInitialSnapshot] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);

  const isAssessed = Boolean(isEvaluated || slot?.status === 'COMPLETED' || slot?.isEvaluated);

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase().trim();
    return students.filter(
      (s) =>
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.code && s.code.toLowerCase().includes(q))
    );
  }, [students, searchQuery]);

  // Load saved assessments specifically for this slot, activity, and date
  useEffect(() => {
    let isMounted = true;
    const fetchSlotAssessments = async () => {
      const targetDate = formatIsoDate(slot?.fullDate || slot?.date);
      const activityId = slot?.activityId || slot?.activity_id;
      const slotId = slot?.id;

      let savedRecordsMap = new Map();
      if (targetClassId && (activityId || slotId) && targetDate) {
        try {
          const res = await assessmentApi.getSlotAssessmentRecords(targetClassId, {
            slotId,
            activityId,
            date: targetDate,
          });
          const recs = res?.records || [];
          recs.forEach((r) => {
            if (r.studentId) savedRecordsMap.set(String(r.studentId), r);
            if (r.studentCode) savedRecordsMap.set(String(r.studentCode), r);
          });
        } catch (err) {
          console.warn('Failed to fetch slot assessment records:', err);
        }
      }

      if (!isMounted) return;

      if (initialStudents && initialStudents.length > 0) {
        const mapped = initialStudents.map((s) => {
          const saved = savedRecordsMap.get(String(s.id)) ||
                        savedRecordsMap.get(String(s.publicId)) ||
                        savedRecordsMap.get(String(s.code));
          const attendanceStatus = s.attendanceStatus || s.rawStatus || s.status;
          return {
            ...s,
            attendanceStatus,
            status: saved?.status || 'ACHIEVED',
            note: saved?.note || '',
          };
        });
        setStudents(mapped);
        setInitialSnapshot(
          JSON.stringify(
            mapped.map((s) => ({
              id: s.id,
              status: s.status,
              note: s.note || '',
            }))
          )
        );
      }
    };

    fetchSlotAssessments();
    return () => {
      isMounted = false;
    };
  }, [initialStudents, slot?.id, slot?.fullDate, slot?.date, slot?.activityId, slot?.activity_id, targetClassId]);

  // Kiểm tra xem giáo viên có thay đổi đánh giá học sinh so với ban đầu hay không
  const isDirty = useMemo(() => {
    if (!initialSnapshot || students.length === 0) return false;
    const current = JSON.stringify(
      students.map((s) => ({
        id: s.id,
        status: s.status,
        note: s.note || '',
      }))
    );
    return current !== initialSnapshot;
  }, [students, initialSnapshot]);

  const handleToggleStatus = (id, newStatus) => {
    if (effectiveReadOnly) return;
    setStudents((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: newStatus } : s))
    );
  };

  const handleSetAllStatus = (newStatus) => {
    if (effectiveReadOnly) return;
    setStudents((prev) =>
      prev.map((s) => ({ ...s, status: newStatus }))
    );
  };

  const handleNoteChange = (id, note) => {
    if (effectiveReadOnly) return;
    setStudents((prev) =>
      prev.map((s) => (s.id === id ? { ...s, note } : s))
    );
  };

  const presentStudents = useMemo(() => {
    return students.filter(
      (s) => s.attendanceStatus !== 'EXCUSED_ABSENCE' && s.attendanceStatus !== 'UNEXCUSED_ABSENCE'
    );
  }, [students]);

  const achievedCount = presentStudents.filter((s) => s.status === 'ACHIEVED').length;
  const notAchievedCount = presentStudents.filter((s) => s.status === 'NOT_ACHIEVED').length;
  const outstandingCount = presentStudents.filter((s) => s.status === 'OUTSTANDING').length;

  const canSave = !effectiveReadOnly && isAttendanceRecorded && (!isAssessed || isDirty);

  const handleSave = async () => {
    if (!canSave) return;
    setIsSaving(true);
    try {
      const rawDate = slot?.fullDate || slot?.date;
      let targetDate = rawDate;
      if (typeof rawDate === 'string') {
        const trimmed = rawDate.trim();
        if (/^\d{1,2}\/\d{1,2}$/.test(trimmed)) {
          const [d, m] = trimmed.split('/');
          targetDate = `2026-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
          const [d, m, y] = trimmed.split('/');
          targetDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        }
      }

      await assessmentApi.saveAssessmentRecords(targetClassId, {
        slotId: slot?.id,
        activityId: slot?.activityId || slot?.activity_id,
        date: targetDate,
        records: students
          .filter((s) => s.attendanceStatus !== 'EXCUSED_ABSENCE' && s.attendanceStatus !== 'UNEXCUSED_ABSENCE')
          .map((s) => ({
            studentId: s.id,
            status: s.status,
            note: s.note,
          })),
      });
      toast.success(t('assessment.saveSuccess', 'Lưu kết quả đánh giá thành công!'));
      setInitialSnapshot(
        JSON.stringify(
          students.map((s) => ({
            id: s.id,
            status: s.status,
            note: s.note || '',
          }))
        )
      );
      if (onSaveSuccess) onSaveSuccess(students);
    } catch {
      toast.error(t('assessment.saveError', 'Không thể lưu kết quả đánh giá.'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleClean = async () => {
    if (!isAssessed) {
      toast.warning(isVi ? 'Tiết này chưa có kết quả đánh giá để xóa.' : 'No assessment records to clean.');
      return;
    }
    if (!window.confirm(isVi ? 'Bạn có chắc chắn muốn xóa toàn bộ đánh giá của tiết này không? Thao tác này không thể hoàn tác.' : 'Are you sure you want to clean all assessment records for this slot? This cannot be undone.')) {
      return;
    }
    setIsCleaning(true);
    try {
      const rawDate = slot?.fullDate || slot?.date;
      let targetDate = rawDate;
      if (typeof rawDate === 'string') {
        const trimmed = rawDate.trim();
        if (/^\d{1,2}\/\d{1,2}$/.test(trimmed)) {
          const [d, m] = trimmed.split('/');
          targetDate = `2026-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
          const [d, m, y] = trimmed.split('/');
          targetDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        }
      }

      await assessmentApi.clearAssessmentRecords(targetClassId, {
        slotId: slot?.id,
        activityId: slot?.activityId || slot?.activity_id,
        date: targetDate,
      });

      const resetStudents = students.map((s) => ({
        ...s,
        status: 'ACHIEVED',
        note: '',
      }));
      setStudents(resetStudents);
      setInitialSnapshot(
        JSON.stringify(
          resetStudents.map((s) => ({
            id: s.id,
            status: s.status,
            note: '',
          }))
        )
      );
      toast.success(isVi ? 'Đã xóa tất cả đánh giá của tiết này' : 'Assessment cleaned successfully');
      if (onCleanSuccess) {
        onCleanSuccess(resetStudents);
      } else if (onSaveSuccess) {
        onSaveSuccess(resetStudents);
      }
    } catch {
      toast.error(isVi ? 'Không thể xóa đánh giá' : 'Failed to clean assessment');
    } finally {
      setIsCleaning(false);
    }
  };

  const slotTitle = slot?.title || activityDetails?.title || '';
  const slotTime = slot?.startTime && slot?.endTime ? `${slot.startTime} – ${slot.endTime}` : '';

  const now = new Date();
  const padTwo = (n) => String(n).padStart(2, '0');
  const todayIso = `${now.getFullYear()}-${padTwo(now.getMonth() + 1)}-${padTwo(now.getDate())}`;

  const isSlotToday = Boolean(
    slot?.isToday ||
    (slot?.fullDate && slot.fullDate === todayIso) ||
    (slot?.date && slot.date === `${padTwo(now.getDate())}/${padTwo(now.getMonth() + 1)}`)
  );

  const slotDateText = useMemo(() => {
    if (slot?.dayName && slot?.date) {
      return `${slot.dayName}, ${slot.date}`;
    }
    if (slot?.fullDate) {
      return slot.fullDate;
    }
    if (slot?.date) {
      return slot.date;
    }
    return '';
  }, [slot?.dayName, slot?.date, slot?.fullDate]);

  // Phân loại "Loại hoạt động" và nội dung tiêu chí sư phạm phù hợp cho từng hoạt động
  const { activityType, criteria } = useMemo(() => {
    const title = (slot?.title || activityDetails?.title || '').trim();
    const routineKey = slot?.routineSlot || slot?.routine_slot || slot?.slotKey;

    let typeName = slot?.activityType || slot?.activity_type || activityDetails?.activityType;
    if (!typeName) {
      if (title.startsWith('Tạo hình') || title.includes('Tô màu') || title.includes('Nặn') || title.includes('Vẽ')) {
        typeName = 'Hoạt động học · Tạo hình';
      } else if (title.startsWith('Thơ') || title.startsWith('Kể chuyện') || title.includes('Đồng dao')) {
        typeName = 'Hoạt động học · Văn học';
      } else if (title.startsWith('Âm nhạc') || title.includes('Hát') || title.includes('Vận động theo nhạc')) {
        typeName = 'Hoạt động học · Âm nhạc';
      } else if (title.startsWith('Vận động') || title.includes('Thể dục')) {
        typeName = routineKey === 'MORNING_EXERCISE' ? 'Thể dục sáng' : 'Hoạt động học · Thể chất';
      } else if (title.includes('Góc') || routineKey === 'CORNER_PLAY') {
        typeName = 'Chơi, hoạt động ở các góc';
      } else if (title.includes('Ngoài trời') || routineKey === 'OUTDOOR_PLAY') {
        typeName = 'Chơi ngoài trời';
      } else if (title.includes('Đón trẻ') || routineKey === 'ARRIVAL_PLAY') {
        typeName = 'Đón trẻ, chơi tự chọn';
      } else if (title.includes('Hoạt động chiều') || routineKey === 'AFTERNOON_ACTIVITY') {
        typeName = 'Hoạt động chiều (Chơi theo ý thích)';
      } else if (title.includes('Trả trẻ') || routineKey === 'RETURN_CHILD') {
        typeName = 'Vệ sinh, trả trẻ';
      } else if (routineKey === 'DIRECTED_STUDY') {
        typeName = 'Hoạt động học có chủ đích';
      } else {
        typeName = 'Hoạt động giáo dục';
      }
    }

    const rawCriteria =
      activityDetails?.criteria ||
      activityDetails ||
      slot?.criteria ||
      slot ||
      {};

    const DOMAIN_NAMES = {
      PHYSICAL: 'Phát triển thể chất',
      COGNITIVE: 'Phát triển nhận thức',
      LANGUAGE: 'Phát triển ngôn ngữ',
      SOCIO_EMOTIONAL: 'Phát triển tình cảm và kỹ năng xã hội',
      AESTHETIC: 'Phát triển thẩm mỹ',
      Physical: 'Phát triển thể chất',
      Cognitive: 'Phát triển nhận thức',
      Language: 'Phát triển ngôn ngữ',
      'Socio-emotional': 'Phát triển tình cảm và kỹ năng xã hội',
      'Socio Emotional': 'Phát triển tình cảm và kỹ năng xã hội',
      Aesthetic: 'Phát triển thẩm mỹ',
      'Thể chất': 'Phát triển thể chất',
      'Nhận thức': 'Phát triển nhận thức',
      'Ngôn ngữ': 'Phát triển ngôn ngữ',
      'Tình cảm - Kỹ năng xã hội': 'Phát triển tình cảm và kỹ năng xã hội',
      'Thẩm mỹ': 'Phát triển thẩm mỹ',
    };

    const rawDomain =
      rawCriteria.domainLabel ||
      rawCriteria.domain ||
      slot?.domainLabel ||
      slot?.domain ||
      activityDetails?.domainLabel ||
      activityDetails?.domain ||
      slot?.goal?.domain ||
      '';
    const domainKey = (rawDomain && typeof rawDomain === 'string') ? rawDomain.trim() : '';
    const domainUpper = domainKey.toUpperCase();
    const domainText =
      DOMAIN_NAMES[domainUpper] ||
      DOMAIN_NAMES[domainKey] ||
      domainKey ||
      (isVi ? 'Phát triển toàn diện' : '—');

    const baseCriteria = {
      domain: domainText,
      goal:
        rawCriteria.goal ||
        (slot?.goalCode ? `${slot.goalCode} - ${slot.goalTitle || ''}` : '') ||
        (activityDetails?.goalCode ? `${activityDetails.goalCode} - ${activityDetails.goalTitle || ''}` : '') ||
        activityDetails?.goal ||
        slot?.goal ||
        '',
      indicator:
        rawCriteria.indicator ||
        rawCriteria.indicatorCode ||
        rawCriteria.indicator_code ||
        slot?.indicator ||
        slot?.indicatorCode ||
        slot?.indicator_code ||
        activityDetails?.indicator ||
        activityDetails?.indicatorCode ||
        activityDetails?.indicator_code ||
        (typeof slot?.goal === 'object' ? (slot.goal?.indicatorCode || slot.goal?.indicator) : '') ||
        '',
      content:
        rawCriteria.content ||
        slot?.contentTitle ||
        slot?.content ||
        activityDetails?.contentTitle ||
        activityDetails?.content ||
        '',
      objective:
        rawCriteria.objective ||
        rawCriteria.planObjective ||
        slot?.objective ||
        slot?.planObjective ||
        activityDetails?.objective ||
        activityDetails?.planObjective ||
        '',
      preparation:
        rawCriteria.preparation ||
        slot?.preparation ||
        activityDetails?.preparation ||
        '',
      procedure:
        rawCriteria.procedure ||
        slot?.procedure ||
        activityDetails?.procedure ||
        '',
      expectedAssessment:
        rawCriteria.expectedAssessment ||
        rawCriteria.evaluation_criteria ||
        rawCriteria.evaluationCriteria ||
        rawCriteria.evaluation ||
        slot?.evaluation_criteria ||
        slot?.evaluationCriteria ||
        slot?.evaluation ||
        slot?.expectedAssessment ||
        activityDetails?.evaluation_criteria ||
        activityDetails?.evaluationCriteria ||
        activityDetails?.expectedAssessment ||
        '',
    };

    let indicatorValue = baseCriteria.indicator || null;
    if (indicatorValue && typeof indicatorValue === 'string') {
      indicatorValue = indicatorValue.trim();
    }

    const mergedCriteria = {
      ...baseCriteria,
      indicator: indicatorValue,
    };

    return { activityType: typeName, criteria: mergedCriteria };
  }, [slot, activityDetails]);

  return (
    <div
      className={cn(
        hideHeader
          ? 'flex-1 flex flex-col justify-between min-h-0'
          : 'w-[480px] border-l border-border bg-card flex flex-col justify-between shrink-0 select-none z-10',
        className
      )}
      data-node-id="4979:16720"
      data-name="WeeklyAssessmentPanel"
    >
      {/* 1. Header (when not embedded in Drawer) */}
      {!hideHeader && (
        <div className="p-4 border-b border-border bg-card flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h2 className="text-[17px] font-semibold text-foreground tracking-tight truncate">
                {slotTitle}
              </h2>
              {isSlotToday && (
                <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-semibold bg-blue-500/10 text-[#1447e6] dark:text-blue-400 border border-blue-500/20">
                  {t('daily.badgeToday', 'Hôm nay')}
                </span>
              )}
              {slotDateText && (
                <span className="inline-flex items-center px-1.5 py-0.5 text-[11px] font-medium bg-muted/80 text-foreground border border-border/80">
                  {slotDateText}
                </span>
              )}
            </div>
            <p className="text-[12.5px] text-muted-foreground mt-0.5">
              {slotTime}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {!effectiveReadOnly && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="size-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-none transition-colors cursor-pointer shrink-0"
                    title="Tùy chọn khác"
                  >
                    <HugeiconsIcon icon={MoreHorizontalIcon} size={16} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 rounded-none shadow-md">
                  <DropdownMenuItem
                    disabled={!isAssessed || isCleaning}
                    onClick={handleClean}
                    className="cursor-pointer text-[12.5px] py-2 px-3 text-foreground rounded-none disabled:opacity-35 disabled:cursor-not-allowed"
                  >
                    <span>{isVi ? 'Xoá đánh giá tiết này' : 'Delete assessment'}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="size-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-none transition-colors cursor-pointer shrink-0"
                title={t('common.close', 'Đóng (Esc)')}
              >
                <HugeiconsIcon icon={Cancel01Icon} size={16} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* 2. Scrollable Body: Content tab vs Assessment tab */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {tab === 'content' && (
          <div className="flex flex-col gap-5 divide-y divide-border/60">
            {/* Section A: Tiêu chí từ kế hoạch giáo dục */}
            <div className="flex flex-col gap-2.5">
              <span className="text-[11.5px] font-semibold text-muted-foreground uppercase tracking-wider">
                {t('assessment.curriculumCriteria', 'Tiêu chí từ kế hoạch giáo dục')}
              </span>

              <div className="grid grid-cols-1 gap-2 text-[13px] bg-muted/20 border border-border/80 p-3.5 rounded-none">
                {(slotDateText || isSlotToday || slotTime) && (
                  <div>
                    <span className="text-muted-foreground font-normal">{t('assessment.executionTime', 'Thời gian thực hiện:')}{' '}</span>
                    <span className="text-foreground font-medium">
                      {isSlotToday && (
                        <span className="text-[#1447e6] dark:text-blue-400 font-semibold">
                          {t('daily.badgeToday', 'Hôm nay')}{slotDateText ? ', ' : ''}
                        </span>
                      )}
                      {slotDateText || ''}
                      {slotTime ? ` (${slotTime})` : ''}
                    </span>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground font-normal">{t('assessment.activityType', 'Loại hoạt động:')}{' '}</span>
                  <span className="text-foreground font-semibold text-[#1447e6] dark:text-blue-400">
                    {activityType}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground font-normal">{t('assessment.domain', 'Lĩnh vực:')}{' '}</span>
                  <span className="text-foreground font-medium">{criteria.domain || (isVi ? 'Giáo dục phát triển toàn diện' : '—')}</span>
                </div>
                <div>
                  <span className="text-muted-foreground font-normal">{t('assessment.goal', 'Mục tiêu:')}{' '}</span>
                  <span className="text-foreground font-medium">{criteria.goal || (isVi ? 'Rèn luyện kỹ năng và thói quen tích cực' : '—')}</span>
                </div>
                <div>
                  <span className="text-muted-foreground font-normal">{t('assessment.moetIndicator', 'Chỉ số Bộ Giáo dục:')}{' '}</span>
                  <span className="text-foreground font-medium">
                    {criteria.indicator ? criteria.indicator : (isVi ? 'Không áp dụng (Khối Nhà trẻ)' : '—')}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground font-normal">{t('assessment.content', 'Nội dung:')}{' '}</span>
                  <span className="text-foreground font-medium">{criteria.content || slotTitle || (isVi ? 'Nội dung theo chủ đề tuần' : '—')}</span>
                </div>
                {(slot?.themeName || slot?.theme?.name) && (
                  <div>
                    <span className="text-muted-foreground font-normal">{t('assessment.theme', 'Chủ đề:')}{' '}</span>
                    <span className="text-foreground font-medium">{slot.themeName || slot.theme?.name}</span>
                  </div>
                )}
                {(slot?.subThemeName || slot?.subTheme?.name) && (
                  <div>
                    <span className="text-muted-foreground font-normal">{t('assessment.subTheme', 'Chủ đề nhánh:')}{' '}</span>
                    <span className="text-foreground font-semibold text-primary">{slot.subThemeName || slot.subTheme?.name}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Section B: Nội dung hoạt động giáo dục */}
            <div className="pt-4 flex flex-col gap-3">
              <span className="text-[11.5px] font-semibold text-muted-foreground uppercase tracking-wider">
                {t('assessment.educationalActivityContent', 'Nội dung hoạt động giáo dục')}
              </span>

              <div className="flex flex-col gap-3 text-[13px]">
                <div className="border border-border/70 p-3.5 bg-card rounded-none">
                  <div className="text-[11.5px] text-muted-foreground font-medium uppercase tracking-wide mb-1">
                    {t('assessment.objectivesAndRequirements', 'Mục đích yêu cầu')}
                  </div>
                  <div className="text-foreground leading-relaxed font-normal">
                    {criteria.objective || '—'}
                  </div>
                </div>
                <div className="border border-border/70 p-3.5 bg-card rounded-none">
                  <div className="text-[11.5px] text-muted-foreground font-medium uppercase tracking-wide mb-1">
                    {t('assessment.teachingPreparation', 'Chuẩn bị học cụ & giáo cụ')}
                  </div>
                  <div className="text-foreground leading-relaxed font-normal">
                    {criteria.preparation || '—'}
                  </div>
                </div>
                <div className="border border-border/70 p-3.5 bg-card rounded-none">
                  <div className="text-[11.5px] text-muted-foreground font-medium uppercase tracking-wide mb-1">
                    {t('assessment.activityOrganization', 'Tổ chức hoạt động')}
                  </div>
                  <div className="text-foreground leading-relaxed font-normal whitespace-pre-line">
                    {criteria.procedure || '—'}
                  </div>
                </div>
                <div className="border border-border/70 p-3.5 bg-card rounded-none">
                  <div className="text-[11.5px] text-muted-foreground font-medium uppercase tracking-wide mb-1">
                    {t('assessment.expectedAssessment', 'Đánh giá dự kiến')}
                  </div>
                  <div className="text-foreground leading-relaxed font-normal">
                    {criteria.expectedAssessment || '—'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'assessment' && (
          <div className="flex flex-col">
            {!isAttendanceRecorded && (
              <div className="mb-3.5 p-3 bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-[12.5px] flex items-center gap-2 select-none">
                <AlertCircle className="size-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>{t('assessment.attendanceRequiredWarning', 'Vui lòng hoàn tất điểm danh trước khi đánh giá trẻ.')}</span>
              </div>
            )}
            {/* Chú thích biểu tượng đánh giá & Tìm kiếm mini ở phía trên */}
            <div className="flex items-center justify-between gap-3 text-[12px] text-muted-foreground select-none pb-2.5 mb-2.5 border-b border-border/60">
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                <span className="font-medium text-foreground">{t('assessment.noteLegend', 'Chú thích:')}</span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-flex items-center justify-center size-5 bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50">
                    <Meh className="size-3.5" />
                  </span>
                  <span className="text-foreground/80">{t('assessment.notAchieved', 'Chưa đạt')}</span>
                </span>
                <span className="text-border">·</span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-flex items-center justify-center size-5 bg-blue-100 dark:bg-blue-950/60 text-[#1447e6] border border-blue-200 dark:border-blue-800/50">
                    <Smile className="size-3.5" />
                  </span>
                  <span className="text-foreground/80">{t('assessment.achieved', 'Đạt')}</span>
                </span>
                <span className="text-border">·</span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-flex items-center justify-center size-5 bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800/50">
                    <Star className="size-3.5 fill-current" />
                  </span>
                  <span className="text-foreground/80">{t('assessment.outstanding', 'Vượt trội')}</span>
                </span>
              </div>

              {/* Ô tìm kiếm học sinh mini chuẩn Sorak */}
              <div className="relative w-[180px] sm:w-[200px] h-8 shrink-0">
                <HugeiconsIcon
                  icon={Search01Icon}
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                />
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('assessment.searchStudentMini', 'Tìm học sinh...')}
                  className="h-8 pl-8 pr-7 text-[12px] bg-background border-border rounded-none shadow-none focus-visible:ring-1 focus-visible:ring-ring"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                    title={t('common.clearSearch', 'Xóa tìm kiếm')}
                  >
                    <HugeiconsIcon icon={Cancel01Icon} size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* Table */}
            <table className="w-full text-[12.5px] border-collapse">
              <thead>
                <tr className="border-b border-border/60 text-muted-foreground text-[11.5px] whitespace-nowrap">
                  <th className="text-left font-medium pb-2 whitespace-nowrap min-w-[140px]">{t('attendance.studentCol', 'Học sinh')}</th>
                  <th className="w-[110px] text-center font-medium pb-2 whitespace-nowrap">{t('assessment.evaluation', 'Đánh giá')}</th>
                  <th className="text-left font-medium pb-2 pl-3 whitespace-nowrap">{t('assessment.notesCol', 'Ghi chú')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-[12px] text-muted-foreground">
                      {t('assessment.noStudentFound', 'Không tìm thấy học sinh phù hợp')}
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((st) => {
                    const rawAttendance = st.attendanceStatus || st.rawStatus;
                    const isExcusedAbsence = rawAttendance === 'EXCUSED_ABSENCE';
                    const isUnexcusedAbsence = rawAttendance === 'UNEXCUSED_ABSENCE';
                    const isAbsent = isExcusedAbsence || isUnexcusedAbsence;
                    const isAchieved = st.status === 'ACHIEVED';
                    const isNotAchieved = st.status === 'NOT_ACHIEVED';
                    const isOutstanding = st.status === 'OUTSTANDING';
                    const isRowDisabled = effectiveReadOnly || !isAttendanceRecorded || isAbsent;

                    return (
                      <tr key={st.id} className={cn('h-12 transition-colors', isAbsent ? 'bg-muted/15 opacity-70' : 'hover:bg-muted/30')}>
                        {/* Student Info */}
                        <td className="py-1.5 pr-2">
                          <div className="flex items-center gap-2">
                            <img
                              src={`https://api.dicebear.com/10.x/critters/svg?seed=${encodeURIComponent(st.code)}&backgroundColor=ff2e63,00c2a8,ffb300,3d5afe,8e24aa,00e676`}
                              alt={st.name}
                              className="size-7 rounded-none border border-border/80 object-cover shrink-0"
                            />
                            <div className="flex flex-col min-w-0">
                              <span className="font-medium text-foreground text-[12px] truncate max-w-[150px]">
                                {st.name}
                              </span>
                              <span className="text-[10.5px] text-muted-foreground font-mono">
                                {st.code}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* 3-way Icon Segment Toggle or Absence Badge */}
                        <td className="py-1 px-1 text-center">
                          {isAbsent ? (
                            <span className={cn(
                              'inline-flex items-center px-2 py-0.5 text-[11px] font-semibold border rounded-none whitespace-nowrap select-none',
                              isExcusedAbsence
                                ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30'
                                : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30'
                            )}>
                              {isExcusedAbsence ? t('attendance.excusedBadge', 'Nghỉ có phép') : t('attendance.unexcusedBadge', 'Nghỉ không phép')}
                            </span>
                          ) : (
                            <div className="inline-flex items-center border border-border bg-background rounded-none p-0.5 shadow-2xs">
                              {/* 1. Chưa đạt */}
                              <button
                                type="button"
                                disabled={isRowDisabled}
                                onClick={() => handleToggleStatus(st.id, 'NOT_ACHIEVED')}
                                className={cn(
                                  'size-7 flex items-center justify-center transition-colors rounded-none',
                                  isRowDisabled ? 'cursor-default opacity-85' : 'cursor-pointer',
                                  isNotAchieved
                                    ? 'bg-rose-600 text-white shadow-2xs'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                                )}
                                title={t('assessment.notAchieved', 'Chưa đạt')}
                              >
                                <Meh className="size-4" />
                              </button>

                              {/* 2. Đạt (Mặc định) */}
                              <button
                                type="button"
                                disabled={isRowDisabled}
                                onClick={() => handleToggleStatus(st.id, 'ACHIEVED')}
                                className={cn(
                                  'size-7 flex items-center justify-center transition-colors rounded-none border-x border-border/60',
                                  isRowDisabled ? 'cursor-default opacity-85' : 'cursor-pointer',
                                  isAchieved
                                    ? 'bg-[#1447e6] text-white shadow-2xs'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                                )}
                                title={t('assessment.achieved', 'Đạt')}
                              >
                                <Smile className="size-4" />
                              </button>

                              {/* 3. Vượt trội */}
                              <button
                                type="button"
                                disabled={isRowDisabled}
                                onClick={() => handleToggleStatus(st.id, 'OUTSTANDING')}
                                className={cn(
                                  'size-7 flex items-center justify-center transition-colors rounded-none',
                                  isRowDisabled ? 'cursor-default opacity-85' : 'cursor-pointer',
                                  isOutstanding
                                    ? 'bg-purple-600 text-white shadow-2xs'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                                )}
                                title={t('assessment.outstanding', 'Vượt trội')}
                              >
                                <Star className={cn('size-4', isOutstanding && 'fill-current')} />
                              </button>
                            </div>
                          )}
                        </td>

                        {/* Ghi chú */}
                        <td className="py-1 pl-3">
                          <input
                            type="text"
                            disabled={isRowDisabled}
                            readOnly={isRowDisabled}
                            value={st.note || ''}
                            onChange={(e) => handleNoteChange(st.id, e.target.value)}
                            placeholder={isAbsent ? (isVi ? 'Trẻ vắng mặt' : 'Student absent') : (effectiveReadOnly ? '' : t('assessment.notePlaceholder', 'Ghi chú đánh giá...'))}
                            className={cn(
                              "w-full h-7 px-2.5 text-[11.5px] border border-border bg-background text-foreground rounded-none focus:outline-hidden focus:border-[#1447e6]",
                              isRowDisabled && "bg-muted/40 cursor-default opacity-90 border-transparent"
                            )}
                          />
                        </td>
                      </tr>
                    );
                  }))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 3. Sticky Footer Actions */}
      <div className="p-4 border-t border-border bg-card flex items-center justify-between gap-2.5 shrink-0">
        <div>
          {tab === 'content' ? (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="rounded-none h-9 text-[13px] px-4 cursor-pointer"
              >
                {t('common.close', 'Đóng')}
              </Button>
              {onPrevSlot && prevSlot && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onPrevSlot}
                  className="rounded-none h-9 text-[13px] px-3 cursor-pointer text-muted-foreground hover:text-foreground"
                  title={`${t('assessment.prevSlot', 'Tiết trước')}: ${prevSlot.title || prevSlot.shortTitle}`}
                >
                  {t('assessment.prevSlot', '← Tiết trước')}
                </Button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onTabChange && onTabChange('content')}
                className="rounded-none h-9 text-[13px] px-4 cursor-pointer"
              >
                {t('assessment.viewContent', '← Xem nội dung')}
              </Button>
              {isAssessed ? (
                <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-emerald-600 dark:text-emerald-400 select-none">
                  <span className="size-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span>{t('assessment.evaluated', 'Đã đánh giá')}</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground select-none">
                  <span className="size-1.5 rounded-full bg-muted-foreground/60 shrink-0" />
                  <span>{t('assessment.notEvaluated', 'Chưa đánh giá')}</span>
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {tab === 'content' ? (
            <>
              {onNextSlot && nextSlot && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onNextSlot}
                  className="rounded-none h-9 text-[13px] px-3 cursor-pointer text-muted-foreground hover:text-foreground"
                  title={`${t('assessment.nextSlot', 'Tiết sau')}: ${nextSlot.title || nextSlot.shortTitle}`}
                >
                  {t('assessment.nextSlot', 'Tiết sau →')}
                </Button>
              )}
              <Button
                type="button"
                onClick={() => onTabChange && onTabChange('assessment')}
                className="rounded-none h-9 text-[13px] px-5 bg-[#1447e6] hover:bg-[#123ec4] text-white font-medium cursor-pointer"
              >
                {effectiveReadOnly
                  ? (isVi ? 'Xem kết quả đánh giá →' : 'View assessment →')
                  : t('assessment.switchToAssessment', 'Chuyển sang chấm điểm →')}
              </Button>
            </>
          ) : effectiveReadOnly ? (
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="rounded-none h-9 text-[13px] px-5 cursor-pointer bg-card hover:bg-muted text-foreground"
            >
              {t('common.close', 'Đóng')}
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="rounded-none h-9 text-[13px] px-4 cursor-pointer"
              >
                {t('common.cancel', 'Huỷ')}
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={!canSave || isSaving || isCleaning}
                className={cn(
                  'rounded-none h-9 text-[13px] px-5 font-medium transition-colors shadow-none',
                  canSave && !isSaving && !isCleaning
                    ? 'bg-[#1447e6] hover:bg-[#123ec4] text-white cursor-pointer'
                    : 'bg-muted/80 text-muted-foreground border border-border/80 cursor-not-allowed opacity-60'
                )}
                title={!isAttendanceRecorded ? t('assessment.attendanceRequiredWarning', 'Vui lòng hoàn tất điểm danh trước khi đánh giá trẻ.') : (!canSave ? t('assessment.noChangesToSave', 'Chưa có thay đổi nào để lưu') : undefined)}
              >
                {isSaving ? t('common.saving', 'Đang lưu...') : t('assessment.saveAssessment', 'Lưu đánh giá')}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default WeeklyAssessmentPanel;
