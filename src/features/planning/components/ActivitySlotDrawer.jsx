import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Cancel01Icon,
  Delete02Icon,
  SparklesIcon,
  UserIcon,
} from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/shared/lib/utils';
import { planningApi } from '../planning.api';

const ROUTINE_SLOT_OPTIONS = [
  { value: 'DIRECTED_STUDY', key: 'slotDirectedStudy', label: 'Học (Hoạt động học có chủ đích)' },
  { value: 'CORNER_PLAY', key: 'slotCornerPlay', label: 'Chơi, hoạt động ở các góc' },
  { value: 'OUTDOOR_PLAY', key: 'slotOutdoorPlay', label: 'Chơi ngoài trời' },
  { value: 'MORNING_EXERCISE', key: 'slotMorningExercise', label: 'Thể dục sáng' },
  { value: 'ARRIVAL_PLAY', key: 'slotArrivalPlay', label: 'Đón trẻ, chơi' },
  { value: 'AFTERNOON_ACTIVITY', key: 'slotAfternoonActivity', label: 'Chơi, hoạt động theo ý thích (Chiều)' },
  { value: 'RETURN_CHILD', key: 'slotReturnChild', label: 'Trả trẻ' },
];

export function ActivitySlotDrawer({ isOpen, onClose, initialSlot, allocatedThemes = [], onSave, onDelete, readOnly = false, lockRoutineSlot = false }) {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [routineSlot, setRoutineSlot] = useState('DIRECTED_STUDY');
  const [selectedThemeId, setSelectedThemeId] = useState('');
  const [objective, setObjective] = useState('');
  const [preparation, setPreparation] = useState('');
  const [procedure, setProcedure] = useState('');
  const [evaluationCriteria, setEvaluationCriteria] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  useEffect(() => {
    if (initialSlot) {
      setTitle(initialSlot.title || '');
      setRoutineSlot(initialSlot.routineSlot || initialSlot.routine_slot || 'DIRECTED_STUDY');
      const curThemeId = initialSlot.themeId || initialSlot.theme_id || '';
      setSelectedThemeId(curThemeId || (allocatedThemes.length === 1 ? (allocatedThemes[0].id || allocatedThemes[0].themeId) : ''));
      setObjective(initialSlot.objective || '');
      setPreparation(initialSlot.preparation || '');
      setProcedure(initialSlot.procedure || '');
      setEvaluationCriteria(
        initialSlot.evaluation_criteria || initialSlot.evaluation || '',
      );
    } else {
      setTitle('');
      setRoutineSlot('DIRECTED_STUDY');
      setSelectedThemeId(allocatedThemes.length === 1 ? (allocatedThemes[0].id || allocatedThemes[0].themeId) : '');
      setObjective('');
      setPreparation('');
      setProcedure('');
      setEvaluationCriteria('');
    }
  }, [initialSlot, isOpen, allocatedThemes]);

  // Kiểm tra có thay đổi dữ liệu so với ban đầu hay không
  const isEditing = Boolean(initialSlot && (initialSlot.id || initialSlot.title));
  const initialThemeId = initialSlot?.themeId || initialSlot?.theme_id || '';
  const isDirty = isEditing
    ? (
        title.trim() !== (initialSlot.title || '').trim() ||
        (!lockRoutineSlot && routineSlot !== (initialSlot.routineSlot || initialSlot.routine_slot || 'DIRECTED_STUDY')) ||
        (allocatedThemes.length > 0 && String(selectedThemeId) !== String(initialThemeId)) ||
        objective.trim() !== (initialSlot.objective || '').trim() ||
        preparation.trim() !== (initialSlot.preparation || '').trim() ||
        procedure.trim() !== (initialSlot.procedure || '').trim() ||
        evaluationCriteria.trim() !== (initialSlot.evaluation_criteria || initialSlot.evaluation || '').trim()
      )
    : Boolean(title.trim());

  const canSave = Boolean(title.trim()) && isDirty;

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
        contentTitle: initialSlot?.content || '',
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

    if (allocatedThemes.length > 0 && !selectedThemeId) {
      toast.error('Vui lòng chọn chủ đề giáo dục cho hoạt động');
      return;
    }

    const matchedTheme = allocatedThemes.find((th) => String(th.id || th.themeId) === String(selectedThemeId));

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
          <div className="flex flex-col gap-0.5">
            <h2 className="text-[17px] font-semibold text-foreground tracking-tight">
              {readOnly
                ? t('planning.activityDetail', 'Chi tiết hoạt động giáo dục')
                : isEditing
                  ? t('planning.activityEdit', 'Chỉnh sửa hoạt động giáo dục')
                  : t('planning.activityCreate', 'Tạo hoạt động mới')}
            </h2>
            <p className="text-[12px] text-muted-foreground">
              {readOnly
                ? t('planning.activityThemePlan', 'Kế hoạch hoạt động giáo dục của chủ đề')
                : t('planning.activitySetupPlan', 'Thiết lập kế hoạch hoạt động giáo dục theo nội dung mục tiêu')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="size-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-none transition-colors cursor-pointer"
            title={t('common.close', 'Đóng')}
          >
            <HugeiconsIcon icon={Cancel01Icon} size={16} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form id="slot-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Author & Updater Audit Metadata Banner */}
          {(initialSlot?.creatorName || initialSlot?.updaterName) && (
            <div className="p-2.5 bg-muted/40 border border-border text-[12px] flex items-center justify-between flex-wrap gap-2">
              {initialSlot.creatorName && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <HugeiconsIcon icon={UserIcon} size={13} className="text-muted-foreground/80 shrink-0" />
                  <span>
                    Giáo viên soạn: <strong className="text-foreground font-medium">{initialSlot.creatorName}</strong>
                  </span>
                </div>
              )}
              {initialSlot.updaterName && (
                <div className="text-[11.5px] text-muted-foreground">
                  Cập nhật bởi: <strong className="text-foreground font-medium">{initialSlot.updaterName}</strong>
                </div>
              )}
            </div>
          )}
          {/* Info Banner when readOnly, AI Banner when editing */}
          {readOnly ? (
            <div className="p-3 bg-muted/40 border border-border/80 text-[12px] text-muted-foreground leading-relaxed">
              <strong className="text-foreground font-medium">Lưu ý: </strong>
              Hoạt động này được áp dụng vào lịch tuần của lớp. Để bổ sung hoặc sửa bài giảng gốc, vui lòng thao tác tại tab <em>Xác định hoạt động</em>.
            </div>
          ) : (
            <div className="flex items-center justify-between p-2.5 bg-primary/5 border border-primary/20">
              <span className="text-[12px] text-foreground font-medium flex items-center gap-1.5">
                <HugeiconsIcon icon={SparklesIcon} size={14} className="text-[#1447e6]" />
                <span>{t('planning.aiSuggestion', 'Gợi ý tự động kế hoạch hoạt động')}</span>
              </span>
              <Button
                type="button"
                variant="outline"
                onClick={handleGenerateAi}
                disabled={isGeneratingAi}
                className="h-7 px-2.5 border border-[#1447e6]/40 text-[#1447e6] hover:bg-[#1447e6]/10 text-[12px] font-medium rounded-none flex items-center gap-1 shadow-none cursor-pointer"
              >
                <span>{isGeneratingAi ? t('common.loading', 'Đang tạo...') : t('planning.aiGenerate', 'Tạo bằng AI')}</span>
              </Button>
            </div>
          )}

          {/* 1. Tên hoạt động (title) */}
          <div className="space-y-1.5">
            <label className="text-[12.5px] font-medium text-foreground">
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
                "w-full h-8 px-3 bg-background border border-border text-[13px] text-foreground rounded-none outline-none focus:border-primary transition-colors",
                readOnly && "bg-muted/30 cursor-default focus:border-border"
              )}
            />
          </div>

          {/* 2. Chế độ sinh hoạt */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[12.5px] font-medium text-foreground">
                {t('planning.routineSlotLabel', 'Chế độ sinh hoạt')} {!readOnly && !lockRoutineSlot && <span className="text-destructive">*</span>}
              </label>
              {lockRoutineSlot && (
                <span className="text-[11px] text-muted-foreground italic">
                  {t('planning.slotFixedInWeek', 'Cố định theo slot tuần')}
                </span>
              )}
            </div>
            <select
              value={routineSlot}
              disabled={readOnly || lockRoutineSlot}
              onChange={(e) => setRoutineSlot(e.target.value)}
              className={cn(
                "w-full h-8 px-2.5 bg-background border border-border text-[13px] text-foreground rounded-none outline-none focus:border-primary cursor-pointer",
                (readOnly || lockRoutineSlot) && "bg-muted/40 text-muted-foreground cursor-not-allowed opacity-90 focus:border-border"
              )}
            >
              {ROUTINE_SLOT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {t(`planning.${opt.key}`, opt.label)}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Chủ đề giáo dục (Bắt buộc theo Comment 1) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[12.5px] font-medium text-foreground">
                {t('planning.themeLabel', 'Chủ đề giáo dục')} {!readOnly && <span className="text-destructive">*</span>}
              </label>
              {allocatedThemes.length > 0 && (
                <span className="text-[11px] text-muted-foreground italic">
                  {allocatedThemes.length} chủ đề phân bổ cho mục tiêu
                </span>
              )}
            </div>
            <select
              value={selectedThemeId}
              disabled={readOnly}
              onChange={(e) => setSelectedThemeId(e.target.value)}
              className={cn(
                "w-full h-8 px-2.5 bg-background border border-border text-[13px] text-foreground rounded-none outline-none focus:border-primary cursor-pointer",
                readOnly && "bg-muted/40 text-muted-foreground cursor-not-allowed opacity-90 focus:border-border",
                !selectedThemeId && "text-muted-foreground"
              )}
            >
              <option value="">-- Chọn chủ đề giáo dục --</option>
              {allocatedThemes.map((th) => (
                <option key={th.id || th.themeId} value={th.id || th.themeId} className="text-foreground">
                  {th.name || th.themeName}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Mục đích yêu cầu */}
          <div className="space-y-1.5">
            <label className="text-[12.5px] font-medium text-foreground">
              {t('planning.objectiveLabel', 'Mục đích yêu cầu')}
            </label>
            <textarea
              rows={3}
              readOnly={readOnly}
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              placeholder="Mục đích yêu cầu đối với trẻ (kiến thức, kỹ năng, thái độ)..."
              className={cn(
                "w-full p-2.5 bg-background border border-border text-[12.5px] text-foreground rounded-none outline-none focus:border-primary resize-none",
                readOnly && "bg-muted/30 cursor-default focus:border-border"
              )}
            />
          </div>

          {/* 4. Chuẩn bị */}
          <div className="space-y-1.5">
            <label className="text-[12.5px] font-medium text-foreground">
              {t('planning.preparationLabel', 'Chuẩn bị')}
            </label>
            <textarea
              rows={3}
              readOnly={readOnly}
              value={preparation}
              onChange={(e) => setPreparation(e.target.value)}
              placeholder="Học liệu, đồ dùng trực quan, tranh ảnh, không gian lớp học..."
              className={cn(
                "w-full p-2.5 bg-background border border-border text-[12.5px] text-foreground rounded-none outline-none focus:border-primary resize-none",
                readOnly && "bg-muted/30 cursor-default focus:border-border"
              )}
            />
          </div>

          {/* 5. Cách tiến hành */}
          <div className="space-y-1.5">
            <label className="text-[12.5px] font-medium text-foreground">
              {t('planning.procedureLabel', 'Cách tiến hành')}
            </label>
            <textarea
              rows={4}
              readOnly={readOnly}
              value={procedure}
              onChange={(e) => setProcedure(e.target.value)}
              placeholder="1. Ổn định và gây hứng thú&#10;2. Nội dung trọng tâm&#10;3. Trò chơi củng cố&#10;4. Kết thúc và nhận xét"
              className={cn(
                "w-full p-2.5 bg-background border border-border text-[12.5px] text-foreground rounded-none outline-none focus:border-primary resize-none font-sans",
                readOnly && "bg-muted/30 cursor-default focus:border-border"
              )}
            />
          </div>

          {/* 6. Tiêu chí đánh giá */}
          <div className="space-y-1.5">
            <label className="text-[12.5px] font-medium text-foreground">
              {t('planning.evaluationLabel', 'Tiêu chí đánh giá')}
            </label>
            <textarea
              rows={3}
              readOnly={readOnly}
              value={evaluationCriteria}
              onChange={(e) => setEvaluationCriteria(e.target.value)}
              placeholder="Tiêu chí đánh giá mức độ tiếp thu và sự tham gia của trẻ..."
              className={cn(
                "w-full p-2.5 bg-background border border-border text-[12.5px] text-foreground rounded-none outline-none focus:border-primary resize-none",
                readOnly && "bg-muted/30 cursor-default focus:border-border"
              )}
            />
          </div>
        </form>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/20 flex items-center justify-between gap-2.5">
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
              {isEditing && onDelete && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    if (initialSlot?.id) {
                      await onDelete(initialSlot.id);
                      onClose();
                    }
                  }}
                  className="h-8 px-3.5 bg-destructive/5 hover:bg-destructive/15 text-destructive border border-destructive/30 rounded-none shadow-none cursor-pointer text-[12.5px] font-medium flex items-center gap-1.5"
                >
                  <HugeiconsIcon icon={Delete02Icon} size={14} />
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
    </div>
  );
}

export default ActivitySlotDrawer;
