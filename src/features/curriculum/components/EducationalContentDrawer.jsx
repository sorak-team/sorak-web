import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Cancel01Icon,
  PlusSignIcon,
  Delete02Icon,
  CheckmarkCircle01Icon,
  BookOpen01Icon,
} from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { cn } from '@/shared/lib/utils';
import { toast } from 'sonner';

export function EducationalContentDrawer({
  isOpen,
  onClose,
  initialData = null,
  goal = {},
  onSave,
}) {
  const { t } = useTranslation();

  const routineSlotOptions = useMemo(
    () => [
      { value: 'DIRECTED_STUDY', label: t('planning.routineSlots.directedStudy', 'Hoạt động học') },
      { value: 'CORNER_PLAY', label: t('planning.routineSlots.cornerPlay', 'Hoạt động góc') },
      { value: 'OUTDOOR_PLAY', label: t('planning.routineSlots.outdoorPlay', 'Chơi ngoài trời') },
      { value: 'AFTERNOON_ACTIVITY', label: t('planning.routineSlots.afternoonActivity', 'Hoạt động chiều') },
      { value: 'MORNING_EXERCISE', label: t('planning.routineSlots.morningExercise', 'Thể dục sáng') },
      { value: 'ARRIVAL_PLAY', label: t('planning.routineSlots.arrivalPlay', 'Đón trẻ / tự chọn') },
    ],
    [t],
  );

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [routineSlots, setRoutineSlots] = useState([]);
  const [activities, setActivities] = useState([]);
  const [newActivityTitle, setNewActivityTitle] = useState('');

  const isEditing = Boolean(initialData?.id);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || '');
      setNotes(initialData.notes || '');
      setRoutineSlots(initialData.routineSlots || []);
      setActivities(initialData.activities || []);
    } else {
      setTitle('');
      setNotes('');
      setRoutineSlots(['DIRECTED_STUDY']);
      setActivities([]);
    }
    setNewActivityTitle('');
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const toggleSlot = (slotValue) => {
    setRoutineSlots((prev) =>
      prev.includes(slotValue)
        ? prev.filter((s) => s !== slotValue)
        : [...prev, slotValue],
    );
  };

  const handleAddActivity = () => {
    const trimmed = newActivityTitle.trim();
    if (!trimmed) return;
    setActivities((prev) => [
      ...prev,
      {
        id: `act-${Date.now()}`,
        title: trimmed,
        routineSlot: routineSlots[0] || 'DIRECTED_STUDY',
      },
    ]);
    setNewActivityTitle('');
  };

  const handleRemoveActivity = (actId) => {
    setActivities((prev) => prev.filter((a) => a.id !== actId));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      toast.error(t('curriculum.pleaseEnterContentTitle', 'Vui lòng nhập tên nội dung giáo dục'));
      return;
    }

    const payload = {
      id: initialData?.id || `ec-${Date.now()}`,
      title: trimmedTitle,
      notes: notes.trim(),
      routineSlots,
      routineSlotsLabels: routineSlots.map(
        (s) => routineSlotOptions.find((opt) => opt.value === s)?.label || s,
      ),
      activities,
    };

    onSave?.(payload);
    onClose?.();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity cursor-pointer"
        onClick={onClose}
      />

      {/* Drawer Body */}
      <div className="relative w-full max-w-[500px] bg-card border-l border-border h-full flex flex-col shadow-2xl z-10 select-none">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between shrink-0 bg-muted/20">
          <div className="min-w-0 pr-3">
            <h3 className="text-[15px] font-semibold text-foreground">
              {isEditing ? t('curriculum.editEducationalContent', 'Chỉnh sửa nội dung giáo dục') : t('curriculum.addEducationalContent', 'Thêm nội dung giáo dục')}
            </h3>
            <p className="text-[12px] text-muted-foreground truncate mt-0.5">
              {t('curriculum.goalPrefix', 'Mục tiêu')} {goal?.code}: {goal?.title}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="size-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors rounded-none cursor-pointer"
            aria-label={t('common.close', 'Đóng')}
          >
            <HugeiconsIcon icon={Cancel01Icon} size={16} />
          </button>
        </div>

        {/* Form Body (Scrollable) */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Linked Goal Info Card */}
          <div className="p-3 bg-muted/30 border border-border/80 text-[12.5px] space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">{t('curriculum.goalLabel', 'Mục tiêu:')} {goal?.code}</span>
              {goal?.indicatorCode && (
                <span className="text-[11px] px-1.5 py-0.2 bg-muted text-muted-foreground border border-border/60">
                  {goal?.indicatorCode}
                </span>
              )}
              {goal?.domainLabel && (
                <span className="text-[11px] px-1.5 py-0.2 bg-primary/10 text-primary border border-primary/20">
                  {goal?.domainLabel}
                </span>
              )}
            </div>
            <p className="text-foreground/90 font-medium leading-normal">{goal?.title}</p>
          </div>

          {/* Tên nội dung giáo dục */}
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-foreground flex items-center justify-between">
              <span>{t('curriculum.contentTitle', 'Tên nội dung giáo dục')} <span className="text-destructive">*</span></span>
              <span className="text-[11.5px] text-muted-foreground font-normal">{t('curriculum.circular51', 'Thông tư 51/BGDĐT')}</span>
            </label>
            <textarea
              rows={3}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('curriculum.contentTitlePlaceholder', 'VD: Dạy hát các bài hát trong chủ đề; Vận động gõ đệm theo nhịp bài hát...')}
              className="w-full p-2.5 bg-background border border-border text-[13px] text-foreground rounded-none outline-none focus:border-primary transition-colors resize-none leading-normal"
              required
            />
          </div>

          {/* Thời điểm tổ chức gợi ý (Routine Slot) */}
          <div className="space-y-2">
            <label className="text-[13px] font-medium text-foreground block">
              {t('curriculum.routineSlotSuggestions', 'Thời điểm tổ chức trong ngày (Gợi ý)')}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {routineSlotOptions.map((slot) => {
                const isSelected = routineSlots.includes(slot.value);
                return (
                  <button
                    key={slot.value}
                    type="button"
                    onClick={() => toggleSlot(slot.value)}
                    className={cn(
                      'px-2.5 py-2 text-left text-[12px] border transition-all flex items-center justify-between rounded-none cursor-pointer',
                      isSelected
                        ? 'bg-[#1447e6]/10 border-[#1447e6] text-[#1447e6] font-medium'
                        : 'bg-background border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground',
                    )}
                  >
                    <span>{slot.label}</span>
                    {isSelected && (
                      <HugeiconsIcon icon={CheckmarkCircle01Icon} size={14} className="shrink-0 text-[#1447e6]" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Ghi chú / Hướng dẫn thực hiện */}
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-foreground">
              {t('curriculum.pedagogicalNotes', 'Ghi chú & Lưu ý sư phạm (nếu có)')}
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('curriculum.pedagogicalNotesPlaceholder', 'VD: Rèn luyện kỹ năng nghe giai điệu, sử dụng phách tre và trống lắc...')}
              className="w-full p-2.5 bg-background border border-border text-[13px] text-foreground rounded-none outline-none focus:border-primary transition-colors resize-none leading-normal"
            />
          </div>

          {/* Danh sách hoạt động cụ thể gợi ý */}
          <div className="space-y-2 pt-2 border-t border-border/70">
            <label className="text-[13px] font-medium text-foreground flex items-center justify-between">
              <span>{t('curriculum.specificActivitiesSuggestions', 'Hoạt động giáo dục cụ thể (Gợi ý)')}</span>
              <span className="text-[11.5px] text-muted-foreground font-normal">{t('curriculum.activitiesCountUnit', '{{count}} hoạt động', { count: activities.length })}</span>
            </label>

            {/* Input thêm nhanh hoạt động */}
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={newActivityTitle}
                onChange={(e) => setNewActivityTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddActivity();
                  }
                }}
                placeholder={t('curriculum.addActivityPlaceholder', 'VD: Hát kết hợp biểu cảm cảm xúc...')}
                className="flex-1 h-8 px-2.5 bg-background border border-border text-[12.5px] rounded-none outline-none focus:border-primary"
              />
              <Button
                type="button"
                onClick={handleAddActivity}
                className="h-8 px-3 rounded-none bg-muted hover:bg-muted/80 text-foreground border border-border text-[12.5px] shadow-none cursor-pointer flex items-center gap-1"
              >
                <HugeiconsIcon icon={PlusSignIcon} size={13} />
                <span>{t('common.add', 'Thêm')}</span>
              </Button>
            </div>

            {/* Danh sách hoạt động đã thêm */}
            {activities.length > 0 && (
              <div className="space-y-1.5 pt-1">
                {activities.map((act, idx) => (
                  <div
                    key={act.id}
                    className="flex items-center justify-between p-2 bg-muted/20 border border-border/70 text-[12.5px]"
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <span className="text-[11px] text-muted-foreground shrink-0 font-mono">
                        {idx + 1}.
                      </span>
                      <span className="text-foreground truncate">{act.title}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveActivity(act.id)}
                      className="size-6 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors shrink-0 cursor-pointer"
                      title={t('curriculum.deleteActivity', 'Xoá hoạt động')}
                    >
                      <HugeiconsIcon icon={Delete02Icon} size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-card flex items-center justify-end gap-2.5 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="h-8 px-4 rounded-none border border-border text-[13px] shadow-none cursor-pointer"
          >
            {t('common.cancel', 'Huỷ')}
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            className="h-8 px-4 rounded-none bg-[#1447e6] hover:bg-[#1447e6]/90 text-white text-[13px] font-medium shadow-none cursor-pointer"
          >
            {isEditing ? t('common.saveChanges', 'Lưu thay đổi') : t('curriculum.addContent', 'Thêm nội dung')}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default EducationalContentDrawer;
