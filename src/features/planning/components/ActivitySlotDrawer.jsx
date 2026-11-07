import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Cancel01Icon,
  Delete02Icon,
  SparklesIcon,
  UserIcon,
  Clock01Icon,
  CheckmarkCircle01Icon,
  Calendar03Icon,
  ArrowDown01Icon,
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
import { toast } from 'sonner';
import { cn } from '@/shared/lib/utils';
import { planningApi } from '../planning.api';

const EMPTY_ARRAY = [];

const ROUTINE_SLOT_OPTIONS = [
  { value: 'DIRECTED_STUDY', key: 'slotDirectedStudy', label: 'Học (Hoạt động học có chủ đích)' },
  { value: 'CORNER_PLAY', key: 'slotCornerPlay', label: 'Chơi, hoạt động ở các góc' },
  { value: 'OUTDOOR_PLAY', key: 'slotOutdoorPlay', label: 'Chơi ngoài trời' },
  { value: 'MORNING_EXERCISE', key: 'slotMorningExercise', label: 'Thể dục sáng' },
  { value: 'ARRIVAL_PLAY', key: 'slotArrivalPlay', label: 'Đón trẻ, chơi' },
  { value: 'AFTERNOON_ACTIVITY', key: 'slotAfternoonActivity', label: 'Chơi, hoạt động theo ý thích (Chiều)' },
  { value: 'RETURN_CHILD', key: 'slotReturnChild', label: 'Trả trẻ' },
];

const DAY_LABELS_VI = {
  MONDAY: 'Thứ 2',
  TUESDAY: 'Thứ 3',
  WEDNESDAY: 'Thứ 4',
  THURSDAY: 'Thứ 5',
  FRIDAY: 'Thứ 6',
  SATURDAY: 'Thứ 7',
  SUNDAY: 'Chủ nhật',
  T2: 'Thứ 2',
  T3: 'Thứ 3',
  T4: 'Thứ 4',
  T5: 'Thứ 5',
  T6: 'Thứ 6',
  T7: 'Thứ 7',
  CN: 'Chủ nhật',
};

function formatDayVi(dayStr) {
  if (!dayStr) return '';
  return DAY_LABELS_VI[String(dayStr).toUpperCase()] || dayStr;
}

function formatDateVi(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
}

function getSlotRoutineLabel(slotKey) {
  const match = ROUTINE_SLOT_OPTIONS.find((opt) => opt.value === slotKey);
  return match ? match.label : (slotKey || '');
}

export function ActivitySlotDrawer({
  isOpen,
  onClose,
  initialSlot: initialSlotProp,
  slot,
  allocatedThemes = EMPTY_ARRAY,
  allThemes = EMPTY_ARRAY,
  contentAllocatedThemes = EMPTY_ARRAY,
  onSave,
  onDelete,
  readOnly = false,
  lockRoutineSlot = false,
}) {
  const initialSlot = initialSlotProp || slot;
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [routineSlot, setRoutineSlot] = useState('DIRECTED_STUDY');
  const [selectedThemeId, setSelectedThemeId] = useState('');
  const [objective, setObjective] = useState('');
  const [preparation, setPreparation] = useState('');
  const [procedure, setProcedure] = useState('');
  const [evaluationCriteria, setEvaluationCriteria] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [isScheduleExpanded, setIsScheduleExpanded] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const prevOpenedRef = useRef(false);
  const prevSlotKeyRef = useRef(null);

  useEffect(() => {
    setIsScheduleExpanded(false);
  }, [isOpen, initialSlotProp, slot]);

  // Combine allocatedThemes and allThemes without duplicates
  const availableThemesList = React.useMemo(() => {
    const list = [...allThemes, ...allocatedThemes];
    const map = new Map();
    list.forEach((th) => {
      const idStr = String(th.id || th.themeId || th._theme_id || '');
      if (idStr && !map.has(idStr)) {
        map.set(idStr, th);
      }
    });
    return Array.from(map.values());
  }, [allThemes, allocatedThemes]);

  const activeContentThemes = React.useMemo(() => {
    return initialSlot?.contentAllocatedThemes || contentAllocatedThemes || EMPTY_ARRAY;
  }, [initialSlot?.contentAllocatedThemes, contentAllocatedThemes]);

  const themeDisplayLabel = React.useMemo(() => {
    const curThemeId = selectedThemeId || initialSlot?.themeId || initialSlot?.theme_id;
    const matched = availableThemesList.find(
      (th) => String(th.id || th.themeId || th._theme_id) === String(curThemeId)
    ) || (activeContentThemes.length > 0 ? activeContentThemes[0] : null);

    const themeName = matched?.name || matched?.themeName || initialSlot?.themeName;
    const code = matched?.code || initialSlot?.themeCode;

    if (themeName) {
      const clean = themeName.replace(/^Chủ đề\s*\d+\s*[:–—\-]?\s*/i, '').trim();
      const num = code ? parseInt(code, 10) : null;
      if (num) {
        return `Chủ đề ${num}: ${clean}`;
      }
      return clean;
    }
    return 'Chủ đề theo kế hoạch năm';
  }, [initialSlot?.themeName, initialSlot?.themeCode, initialSlot?.themeId, initialSlot?.theme_id, selectedThemeId, availableThemesList, activeContentThemes]);

  const getThemeInfo = React.useCallback(
    (slot) => {
      const rawThemeName = slot?.themeName || initialSlot?.themeName || '';
      const cleanName = rawThemeName.replace(/^Chủ đề\s*\d+\s*[:–—\-]?\s*/i, '').trim();
      const curThemeId = slot?.themeId || slot?.theme_id || initialSlot?.themeId || initialSlot?.theme_id;

      let matched = availableThemesList.find(
        (th) => String(th.id || th.themeId || th._theme_id) === String(curThemeId)
      );

      if (!matched && cleanName) {
        matched = availableThemesList.find((th) => {
          const thClean = (th.name || th.themeName || '')
            .replace(/^Chủ đề\s*\d+\s*[:–—\-]?\s*/i, '')
            .trim()
            .toLowerCase();
          return thClean === cleanName.toLowerCase();
        });
      }

      const matchExplicit = rawThemeName.match(/^Chủ đề\s*(\d+)/i);
      const num = matchExplicit ? parseInt(matchExplicit[1], 10) : (matched?.code ? parseInt(matched.code, 10) : null);

      return {
        themeNum: num,
        badgeLabel: num ? `Chủ đề ${num}` : (cleanName || rawThemeName),
        cleanThemeName: cleanName || rawThemeName,
      };
    },
    [availableThemesList, initialSlot?.themeName, initialSlot?.themeId, initialSlot?.theme_id]
  );

  const cleanSubTheme = React.useCallback((subName, cleanTheme) => {
    if (!subName) return '';
    let res = subName.trim();
    if (cleanTheme) {
      const escaped = cleanTheme.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      res = res.replace(new RegExp(`\\s*[-–—:]\\s*${escaped}$`, 'i'), '').trim();
    }
    return res;
  }, []);

  useEffect(() => {
    if (!isOpen) {
      prevOpenedRef.current = false;
      return;
    }

    const slotKey = initialSlot
      ? (initialSlot.id || initialSlot.contentId || initialSlot._content_id || `${initialSlot.title}-${initialSlot.routineSlot}`)
      : 'new';
    const justOpened = !prevOpenedRef.current && isOpen;
    const slotChanged = prevSlotKeyRef.current !== slotKey;

    if (justOpened || slotChanged) {
      prevOpenedRef.current = true;
      prevSlotKeyRef.current = slotKey;

      if (initialSlot) {
        const rawSlot = initialSlot.routineSlot || initialSlot.routine_slot || 'DIRECTED_STUDY';
        const normalizedSlot = ROUTINE_SLOT_OPTIONS.some((opt) => opt.value === rawSlot)
          ? rawSlot
          : 'DIRECTED_STUDY';
        setTitle(initialSlot.title || '');
        setRoutineSlot(normalizedSlot);
        const curThemeId = initialSlot.themeId || initialSlot.theme_id || '';
        const fallbackThemeId =
          activeContentThemes.length > 0
            ? (activeContentThemes[0].id || activeContentThemes[0].themeId)
            : allocatedThemes.length === 1
              ? (allocatedThemes[0].id || allocatedThemes[0].themeId)
              : availableThemesList.length === 1
                ? (availableThemesList[0].id || availableThemesList[0].themeId)
                : '';
        setSelectedThemeId(curThemeId || fallbackThemeId);
        setObjective(initialSlot.objective || initialSlot.purpose || '');
        setPreparation(initialSlot.preparation || '');
        setProcedure(initialSlot.procedure || initialSlot.steps || '');
        setEvaluationCriteria(
          initialSlot.evaluationCriteria || initialSlot.evaluation_criteria || initialSlot.evaluation || initialSlot.assessmentCriteria || '',
        );
      } else {
        setTitle('');
        setRoutineSlot('DIRECTED_STUDY');
        const fallbackThemeId =
          activeContentThemes.length > 0
            ? (activeContentThemes[0].id || activeContentThemes[0].themeId)
            : allocatedThemes.length === 1
              ? (allocatedThemes[0].id || allocatedThemes[0].themeId)
              : '';
        setSelectedThemeId(fallbackThemeId);
        setObjective('');
        setPreparation('');
        setProcedure('');
        setEvaluationCriteria('');
      }
    }
  }, [isOpen, initialSlotProp, slot]);

  // Kiểm tra có thay đổi dữ liệu so với ban đầu hay không
  const isEditing = Boolean(initialSlot && (initialSlot.id || initialSlot.title));
  const initialThemeId = initialSlot?.themeId || initialSlot?.theme_id || '';

  const scheduledSlotsList = React.useMemo(() => {
    if (Array.isArray(initialSlot?.scheduledSlots) && initialSlot.scheduledSlots.length > 0) {
      return initialSlot.scheduledSlots;
    }
    if (initialSlot?.scheduledDate || initialSlot?.date || initialSlot?.day || initialSlot?.dayOfWeek) {
      return [{
        slotId: initialSlot.slotId || initialSlot.id || 'single',
        date: initialSlot.scheduledDate || initialSlot.date || '',
        day: initialSlot.day || initialSlot.dayOfWeek || '',
        dayOfWeek: initialSlot.dayOfWeek || initialSlot.day || '',
        routineSlot: initialSlot.routineSlot || initialSlot.routine_slot || '',
        themeName: initialSlot.themeName || '',
        subThemeName: initialSlot.subThemeName || '',
      }];
    }
    return [];
  }, [initialSlot]);

  const isActivityScheduled = Boolean(
    initialSlot?.isScheduled ||
    scheduledSlotsList.length > 0
  );

  const initialRoutineSlotRaw = initialSlot?.routineSlot || initialSlot?.routine_slot || 'DIRECTED_STUDY';
  const normalizedInitialRoutineSlot = ROUTINE_SLOT_OPTIONS.some((opt) => opt.value === initialRoutineSlotRaw)
    ? initialRoutineSlotRaw
    : 'DIRECTED_STUDY';

  const isDirty = isEditing
    ? (
      title.trim() !== (initialSlot.title || '').trim() ||
      (!lockRoutineSlot && !isActivityScheduled && routineSlot !== normalizedInitialRoutineSlot) ||
      (allocatedThemes.length > 0 && String(selectedThemeId) !== String(initialThemeId)) ||
      objective.trim() !== (initialSlot.objective || '').trim() ||
      preparation.trim() !== (initialSlot.preparation || '').trim() ||
      procedure.trim() !== (initialSlot.procedure || '').trim() ||
      evaluationCriteria.trim() !== (initialSlot.evaluationCriteria || initialSlot.evaluation_criteria || initialSlot.evaluation || '').trim()
    )
    : Boolean(title.trim());

  const canSave = Boolean(title.trim()) && isDirty && (allocatedThemes.length === 0 || Boolean(selectedThemeId));

  if (!isOpen) return null;

  // AI Generation trigger
  const handleGenerateAi = async () => {
    if (!title.trim()) {
      toast.error('Vui lòng nhập tên hoạt động trước khi tạo bằng AI');
      return;
    }
    setIsGeneratingAi(true);
    try {
      const generated = await planningApi.generateActivityAi({
        title: title.trim(),
        contentTitle: initialSlot?.contentTitle || initialSlot?.content || '',
      });
      setObjective(generated.objective || '');
      setPreparation(generated.preparation || '');
      setProcedure(generated.procedure || '');
      setEvaluationCriteria(generated.evaluation || generated.evaluation_criteria || '');
      toast.success('Đã tạo nhanh nội dung hoạt động bằng Sorak AI!');
    } catch {
      // Fallback template
      setObjective(
        `Trẻ nhận biết, ghi nhớ và thực hiện tốt các yêu cầu của hoạt động "${title.trim()}". Rèn luyện sự tự tin, chú ý và kỹ năng tương tác nhóm.`,
      );
      setPreparation(
        `Đồ dùng học liệu, tranh ảnh minh họa, bài hát và mô hình trực quan về "${title.trim()}". Không gian lớp học sạch sẽ, an toàn.`,
      );
      setProcedure(
        `1. Ổn định và gây hứng thú: Cho trẻ hát bài hát hoặc đố vui liên quan đến bài học.\n2. Nội dung trọng tâm: Hướng dẫn trẻ quan sát, thảo luận và thực hành hoạt động.\n3. Trò chơi củng cố: Tổ chức trò chơi rèn luyện phản xạ.\n4. Kết thúc và nhận xét: Tuyên dương trẻ chăm ngoan và chuyển hoạt động.`,
      );
      setEvaluationCriteria(
        `Đa số trẻ tham gia hào hứng, hiểu nội dung và đạt các yêu cầu cơ bản đề ra.`,
      );
      toast.success('Đã gợi ý nhanh nội dung hoạt động!');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Vui lòng nhập tên hoạt động');
      return;
    }

    if (availableThemesList.length > 0 && !selectedThemeId) {
      toast.error('Vui lòng chọn chủ đề giáo dục cho hoạt động');
      return;
    }

    const matchedTheme = availableThemesList.find((th) => String(th.id || th.themeId || th._theme_id) === String(selectedThemeId));

    const payload = {
      ...(initialSlot || {}),
      title: title.trim(),
      routineSlot,
      routine_slot: routineSlot,
      themeId: selectedThemeId || initialSlot?.themeId || null,
      theme_id: selectedThemeId || initialSlot?.theme_id || null,
      themeName: matchedTheme?.name || matchedTheme?.themeName || initialSlot?.themeName || null,
      objective: objective.trim(),
      preparation: preparation.trim(),
      procedure: procedure.trim(),
      evaluation_criteria: evaluationCriteria.trim(),
      evaluation: evaluationCriteria.trim(), // fallback field
    };

    if (onSave) onSave(payload);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-[1px] animate-in fade-in-0 duration-200"
      onClick={onClose}
      data-node-id="4966:16107"
      data-name="Activity Slot Drawer"
    >
      <div
        className="w-full max-w-[500px] h-full bg-card border-l border-border shadow-2xl flex flex-col justify-between text-foreground select-none overflow-hidden animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border bg-card">
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-[16px] font-semibold text-foreground tracking-tight">
                {readOnly
                  ? t('planning.activityDetail', 'Chi tiết hoạt động giáo dục')
                  : isEditing
                    ? t('planning.activityEdit', 'Chỉnh sửa hoạt động giáo dục')
                    : t('planning.activityCreate', 'Tạo hoạt động mới')}
              </h2>
            </div>

            {/* Thông tin người soạn & cập nhật ngay tại Header (Gọn gàng, không trùng lặp) */}
            <div className="flex items-center gap-2 text-[12px] text-muted-foreground flex-wrap">
              {initialSlot?.creatorName && (
                <span className="flex items-center gap-1">
                  <HugeiconsIcon icon={UserIcon} size={12} className="text-muted-foreground/80 shrink-0" />
                  <span>Người soạn: <strong className="text-foreground font-medium">{initialSlot.creatorName}</strong></span>
                </span>
              )}
              {initialSlot?.creatorName && initialSlot?.updaterName && (
                <span className="text-muted-foreground/40">·</span>
              )}
              {initialSlot?.updaterName && (
                <span>Cập nhật bởi: <strong className="text-foreground font-medium">{initialSlot.updaterName}</strong></span>
              )}
              {!initialSlot?.creatorName && !initialSlot?.updaterName && (
                <span>{readOnly ? 'Kế hoạch hoạt động giáo dục' : 'Thiết lập hoạt động giáo dục theo mục tiêu'}</span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="size-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-none transition-colors cursor-pointer shrink-0"
            title={t('common.close', 'Đóng')}
          >
            <HugeiconsIcon icon={Cancel01Icon} size={16} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form id="slot-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Thông tin xếp Thời khóa biểu (Giao diện phẳng, tinh gọn, không màu xanh lá) */}
          {isActivityScheduled && (
            scheduledSlotsList.length > 1 ? (
              <div className="border border-border/80 bg-muted/20 transition-all rounded-none">
                <button
                  type="button"
                  onClick={() => setIsScheduleExpanded((prev) => !prev)}
                  className="w-full px-3 py-2 flex items-center justify-between gap-2 text-left cursor-pointer hover:bg-muted/40 transition-colors select-none"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <HugeiconsIcon icon={Calendar03Icon} size={14} className="text-muted-foreground shrink-0" />
                    <span className="text-[12.5px] font-medium text-foreground truncate">
                      Đã xếp lịch trong <strong className="font-semibold text-foreground">{scheduledSlotsList.length} buổi</strong>
                      <span className="text-muted-foreground text-[11.5px] font-normal"> (Kế hoạch tuần)</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[11.5px] font-medium text-muted-foreground hover:text-foreground shrink-0">
                    <span>{isScheduleExpanded ? 'Thu gọn' : 'Xem chi tiết'}</span>
                    <HugeiconsIcon
                      icon={ArrowDown01Icon}
                      size={14}
                      className={cn("transition-transform duration-200", isScheduleExpanded && "rotate-180")}
                    />
                  </div>
                </button>

                {isScheduleExpanded && (
                  <div className="border-t border-border/60 max-h-[190px] overflow-y-auto divide-y divide-border/40">
                    {scheduledSlotsList.map((slot, sIdx) => {
                      const dayText = formatDayVi(slot.day || slot.dayOfWeek);
                      const dateText = formatDateVi(slot.date);
                      const { themeNum, badgeLabel, cleanThemeName } = getThemeInfo(slot);
                      const subLabel = cleanSubTheme(slot.subThemeName, cleanThemeName);

                      return (
                        <div
                          key={slot.slotId || sIdx}
                          className="flex items-center justify-between gap-3 py-1.5 px-3 text-[12px] hover:bg-muted/30 transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-semibold text-foreground shrink-0">
                              {dayText} · {dateText}
                            </span>
                            {subLabel && (
                              <>
                                <span className="text-muted-foreground/40 shrink-0">·</span>
                                <span className="text-muted-foreground truncate" title={subLabel}>
                                  {subLabel}
                                </span>
                              </>
                            )}
                          </div>
                          <span
                            className="text-[11px] font-medium text-foreground/80 bg-background px-2 py-0.5 border border-border shrink-0 select-none"
                            title={cleanThemeName}
                          >
                            {badgeLabel}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : scheduledSlotsList.length === 1 ? (
              <div className="border border-border/80 bg-muted/20 px-3 py-2 text-[12px] flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <HugeiconsIcon icon={Calendar03Icon} size={14} className="text-muted-foreground shrink-0" />
                  <span className="font-semibold text-foreground shrink-0">Đã xếp lịch:</span>
                  <span className="text-muted-foreground truncate">
                    {formatDayVi(scheduledSlotsList[0].day || scheduledSlotsList[0].dayOfWeek)}
                    {scheduledSlotsList[0].date ? ` · ${formatDateVi(scheduledSlotsList[0].date)}` : ''}
                    {scheduledSlotsList[0].subThemeName ? ` · ${cleanSubTheme(scheduledSlotsList[0].subThemeName, getThemeInfo(scheduledSlotsList[0]).cleanThemeName)}` : ''}
                  </span>
                </div>
                <span className="text-[11px] font-medium text-foreground/80 bg-background px-2 py-0.5 border border-border shrink-0 select-none">
                  {getThemeInfo(scheduledSlotsList[0]).badgeLabel}
                </span>
              </div>
            ) : (
              <div className="border border-border/80 bg-muted/20 px-3 py-2 text-[12px] text-muted-foreground italic flex items-center gap-2">
                <HugeiconsIcon icon={Calendar03Icon} size={14} className="shrink-0 text-muted-foreground" />
                <span>Hoạt động đang được sử dụng trong Kế hoạch tuần của lớp.</span>
              </div>
            )
          )}

          {/* 1. Tên hoạt động (title) */}
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-foreground">
              {t('planning.activityTitleLabel', 'Tên hoạt động')} {!readOnly && <span className="text-destructive">*</span>}
            </label>
            <input
              type="text"
              required={!readOnly}
              readOnly={readOnly}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ví dụ: Khám phá các phương tiện giao thông đường bộ"
              className={cn(
                "w-full h-9 px-3 bg-background border border-border text-[13px] text-foreground rounded-none outline-none focus:border-primary transition-colors",
                readOnly && "cursor-default focus:border-border"
              )}
            />
          </div>

          {/* 2. Chế độ sinh hoạt (Hàng riêng biệt) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[12px] font-medium text-foreground">
                {t('planning.routineSlotLabel', 'Chế độ sinh hoạt')} {!readOnly && !lockRoutineSlot && !isActivityScheduled && <span className="text-destructive">*</span>}
              </label>
              {(lockRoutineSlot || isActivityScheduled) && (
                <span className="text-[11px] text-muted-foreground italic">
                  Cố định khi đã gán TKB
                </span>
              )}
            </div>
            <select
              value={routineSlot}
              disabled={readOnly || lockRoutineSlot || isActivityScheduled}
              onChange={(e) => setRoutineSlot(e.target.value)}
              className={cn(
                "w-full h-9 px-3 bg-background border border-border text-[13px] text-foreground rounded-none outline-none focus:border-primary cursor-pointer",
                (readOnly || lockRoutineSlot || isActivityScheduled) && "cursor-not-allowed opacity-90 focus:border-border"
              )}
            >
              {ROUTINE_SLOT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {t(`planning.${opt.key}`, opt.label)}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Chủ đề giáo dục (Hàng riêng biệt, không bị lệch, đồng bộ màu sắc 100%) */}
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-foreground">
              {t('planning.themeLabel', 'Chủ đề giáo dục')}
            </label>
            <div className="w-full h-9 px-3 bg-background border border-border text-[13px] text-foreground flex items-center rounded-none select-none cursor-default">
              {themeDisplayLabel}
            </div>
          </div>

          {/* 4. Mục đích yêu cầu */}
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-foreground">
              {t('planning.objectiveLabel', 'Mục đích yêu cầu')}
            </label>
            <textarea
              rows={3}
              readOnly={readOnly}
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              placeholder="Mục đích yêu cầu đối với trẻ (kiến thức, kỹ năng, thái độ)..."
              className={cn(
                "w-full p-2.5 bg-background border border-border text-[13px] text-foreground rounded-none outline-none focus:border-primary resize-none placeholder:text-muted-foreground/60",
                readOnly && "cursor-default focus:border-border"
              )}
            />
          </div>

          {/* 5. Chuẩn bị */}
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-foreground">
              {t('planning.preparationLabel', 'Chuẩn bị')}
            </label>
            <textarea
              rows={3}
              readOnly={readOnly}
              value={preparation}
              onChange={(e) => setPreparation(e.target.value)}
              placeholder="Học liệu, đồ dùng trực quan, tranh ảnh, không gian lớp học..."
              className={cn(
                "w-full p-2.5 bg-background border border-border text-[13px] text-foreground rounded-none outline-none focus:border-primary resize-none placeholder:text-muted-foreground/60",
                readOnly && "cursor-default focus:border-border"
              )}
            />
          </div>

          {/* 6. Cách tiến hành */}
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-foreground">
              {t('planning.procedureLabel', 'Cách tiến hành')}
            </label>
            <textarea
              rows={4}
              readOnly={readOnly}
              value={procedure}
              onChange={(e) => setProcedure(e.target.value)}
              placeholder="1. Ổn định và gây hứng thú&#10;2. Nội dung trọng tâm&#10;3. Trò chơi củng cố&#10;4. Kết thúc và nhận xét"
              className={cn(
                "w-full p-2.5 bg-background border border-border text-[13px] text-foreground rounded-none outline-none focus:border-primary resize-none placeholder:text-muted-foreground/60 font-sans",
                readOnly && "cursor-default focus:border-border"
              )}
            />
          </div>

          {/* 7. Tiêu chí đánh giá */}
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-foreground">
              {t('planning.evaluationLabel', 'Tiêu chí đánh giá')}
            </label>
            <textarea
              rows={3}
              readOnly={readOnly}
              value={evaluationCriteria}
              onChange={(e) => setEvaluationCriteria(e.target.value)}
              placeholder="Tiêu chí đánh giá mức độ tiếp thu và sự tham gia của trẻ..."
              className={cn(
                "w-full p-2.5 bg-background border border-border text-[13px] text-foreground rounded-none outline-none focus:border-primary resize-none placeholder:text-muted-foreground/60",
                readOnly && "cursor-default focus:border-border"
              )}
            />
          </div>
        </form>

        {/* Footer đồng bộ với CreateTransferDrawer */}
        <div className="p-4 border-t border-border bg-card flex items-center justify-between gap-2.5">
          {readOnly ? (
            <div className="ml-auto">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="h-8 px-5 border border-border text-[13px] rounded-none hover:bg-muted shadow-none cursor-pointer"
              >
                {t('common.close', 'Đóng')}
              </Button>
            </div>
          ) : (
            <>
              {isEditing && Boolean(onDelete) && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={isActivityScheduled || lockRoutineSlot || isDeleting}
                  onClick={() => {
                    if (isActivityScheduled || lockRoutineSlot) return;
                    setIsDeleteDialogOpen(true);
                  }}
                  title={
                    isActivityScheduled || lockRoutineSlot
                      ? `Không thể xóa: Hoạt động đã được xếp lịch trong Kế hoạch tuần (${scheduledSlotsList.length || 1} buổi). Vui lòng gỡ hoạt động khỏi Kế hoạch tuần trước khi xóa.`
                      : 'Xóa hoạt động này'
                  }
                  className={cn(
                    "h-8 px-3.5 border rounded-none shadow-none text-[12.5px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer",
                    isActivityScheduled || lockRoutineSlot
                      ? "bg-muted/40 text-muted-foreground/40 border-border/60 cursor-not-allowed opacity-70"
                      : "border-border text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  )}
                >
                  <HugeiconsIcon icon={Delete02Icon} size={14} className="text-muted-foreground" />
                  <span>{t('common.delete', 'Xóa hoạt động')}</span>
                </Button>
              )}
              <div className="flex items-center gap-2.5 ml-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="h-8 px-4 border border-border text-[13px] rounded-none hover:bg-muted shadow-none cursor-pointer"
                >
                  {t('common.cancel', 'Huỷ')}
                </Button>
                <Button
                  type="submit"
                  form="slot-form"
                  disabled={!canSave}
                  className="h-8 px-6 bg-[#1447e6] hover:bg-[#1447e6]/90 text-white text-[13px] font-medium rounded-none shadow-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#1447e6] transition-opacity"
                >
                  {t('common.saveChanges', 'Lưu')}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Dialog Xác nhận Xóa hoạt động - z-[1000] trên mọi drawer & backdrop */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent
          overlayClassName="z-[999] bg-black/60 backdrop-blur-xs"
          className="z-[1000] w-[92vw] max-w-[440px] sm:max-w-[440px] p-6 rounded-none border border-border bg-card shadow-2xl text-foreground select-none space-y-4"
        >
          <DialogHeader className="space-y-1.5 pb-0 text-left">
            <DialogTitle className="text-[16px] font-semibold text-foreground tracking-tight">
              Xác nhận xóa hoạt động giáo dục
            </DialogTitle>
            <DialogDescription className="text-[13px] text-muted-foreground leading-relaxed pt-1">
              Hoạt động sẽ bị xóa khỏi danh sách của chủ đề. Thao tác này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>

          <div className="p-3 bg-muted/20 border border-border/70 rounded-none space-y-1">
            <div className="font-semibold text-foreground text-[13px] leading-snug">
              {title || initialSlot?.title}
            </div>
            {initialSlot?.contentTitle && (
              <div className="text-muted-foreground text-[12px] truncate pt-0.5">
                Nội dung: {initialSlot.contentTitle}
              </div>
            )}
          </div>

          <DialogFooter className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/60 sm:space-x-0">
            <Button
              type="button"
              variant="outline"
              disabled={isDeleting}
              onClick={() => setIsDeleteDialogOpen(false)}
              className="h-8 px-3.5 text-[12.5px] rounded-none border border-border cursor-pointer shadow-none"
            >
              Hủy
            </Button>
            <Button
              type="button"
              disabled={isDeleting}
              onClick={async () => {
                if (initialSlot?.id) {
                  try {
                    setIsDeleting(true);
                    await onDelete(initialSlot.id);
                    setIsDeleteDialogOpen(false);
                    onClose();
                  } catch (err) {
                    console.error('Failed to delete activity:', err);
                  } finally {
                    setIsDeleting(false);
                  }
                }
              }}
              className="h-8 px-4 text-[12.5px] font-medium rounded-none bg-destructive hover:bg-destructive/90 text-white cursor-pointer shadow-none"
            >
              {isDeleting ? 'Đang xóa...' : 'Xóa hoạt động'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ActivitySlotDrawer;
