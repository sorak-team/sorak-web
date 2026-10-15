import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/shared/lib/utils';
import { goodBehaviorApi } from '../good-behavior.api';

export function GoodBehaviorDetailDrawer({
  student,
  classId = '1',
  week = 'Tuần 40 · 05/10–09/10/2026',
  className = 'Nhà trẻ 1',
  onClose,
  onSaveSuccess,
}) {
  const { t } = useTranslation();

  const starLevels = [
    { stars: 1, label: t('goodBehavior.stars1') },
    { stars: 2, label: t('goodBehavior.stars2') },
    { stars: 3, label: t('goodBehavior.stars3') },
    { stars: 4, label: t('goodBehavior.stars4') },
    { stars: 5, label: t('goodBehavior.stars5') },
  ];

  const [selectedStars, setSelectedStars] = useState(student?.starRating || 4);
  const [status, setStatus] = useState(student?.status || 'Hoàn thành');
  const [comment, setComment] = useState(
    student?.comment ||
      'Con tham gia tích cực, biết chờ lượt và phối hợp tốt với các bạn trong hoạt động tuần này.'
  );
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (student) {
      setSelectedStars(student.starRating || 4);
      setStatus(student.status || 'Hoàn thành');
      setComment(
        student.comment ||
          'Con tham gia tích cực, biết chờ lượt và phối hợp tốt với các bạn trong hoạt động tuần này.'
      );
    }
  }, [student]);

  if (!student) return null;

  const currentLevel =
    starLevels.find((l) => l.stars === selectedStars) || starLevels[3];

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await goodBehaviorApi.saveRecords(classId, {
        studentId: student.id,
        starRating: selectedStars,
        status,
        comment,
      });
      toast.success(t('goodBehavior.saveSuccess', { name: student.name }));
      if (onSaveSuccess) {
        onSaveSuccess({
          ...student,
          starRating: selectedStars,
          status,
          comment,
        });
      }
      if (onClose) onClose();
    } catch {
      toast.error(t('goodBehavior.saveError'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="w-[480px] border-l border-border bg-card flex flex-col justify-between shrink-0 select-none z-20 h-full"
      data-node-id="4999:18937"
      data-name="GoodBehaviorDetailDrawer"
    >
      {/* 1. Header */}
      <div className="p-4 border-b border-border bg-card">
        <h2 className="text-[17px] font-semibold text-foreground tracking-tight">
          {t('goodBehavior.drawerTitle')}
        </h2>
        <p className="text-[12.5px] text-muted-foreground mt-0.5">
          {week} · {className}
        </p>

        {/* Student preview card */}
        <div className="mt-4 p-3 border border-border bg-muted/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={`https://api.dicebear.com/10.x/critters/svg?seed=${encodeURIComponent(student.code)}&backgroundColor=ff2e63,00c2a8,ffb300,3d5afe,8e24aa,00e676`}
              alt={student.name}
              className="size-10 rounded-none border border-border/80 object-cover shrink-0"
            />
            <div className="flex flex-col">
              <span className="font-semibold text-foreground text-[14px]">
                {student.name}
              </span>
              <span className="text-[12px] text-muted-foreground font-mono">
                {student.code}
              </span>
            </div>
          </div>

          <span
            className={cn(
              'px-2.5 py-1 text-[11.5px] font-medium rounded-none border',
              status === 'Hoàn thành'
                ? 'bg-muted/60 text-foreground border-border'
                : 'bg-muted/30 text-muted-foreground border-border'
            )}
          >
            {status === 'Hoàn thành'
              ? t('goodBehavior.statusCompleted')
              : status === 'Đang đánh giá'
              ? t('goodBehavior.statusEvaluating')
              : t('goodBehavior.statusNotEvaluated')}
          </span>
        </div>
      </div>

      {/* 2. Form Body */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5">
        {/* Rating Level Section */}
        <div className="flex flex-col gap-2">
          <label className="text-[13px] font-medium text-foreground">
            {t('goodBehavior.ratingLevel')}
          </label>

          <div className="flex flex-col gap-2">
            {starLevels.map((lvl) => {
              const isSelected = selectedStars === lvl.stars;

              return (
                <div
                  key={lvl.stars}
                  onClick={() => setSelectedStars(lvl.stars)}
                  className={cn(
                    'flex items-center gap-3 p-2 border cursor-pointer rounded-none transition-colors group',
                    isSelected
                      ? 'border-[#1447e6] bg-blue-50/20 dark:bg-blue-950/20'
                      : 'border-border bg-card hover:bg-muted/40'
                  )}
                >
                  <button
                    type="button"
                    className={cn(
                      'px-2.5 py-1 text-[12px] font-semibold border rounded-none shrink-0 transition-colors',
                      isSelected
                        ? 'bg-[#1447e6] text-white border-[#1447e6]'
                        : 'bg-background text-foreground border-border group-hover:border-foreground/30'
                    )}
                  >
                    {lvl.stars} ★
                  </button>
                  <span className="text-[13px] text-foreground font-normal">
                    {lvl.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Trạng thái Dropdown */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-foreground">
            {t('student.colStatus')}
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full h-9 px-3 text-[13px] border border-border bg-background text-foreground rounded-none focus:outline-hidden focus:border-[#1447e6] cursor-pointer"
          >
            <option value="Hoàn thành">{t('goodBehavior.statusCompleted')}</option>
            <option value="Đang đánh giá">{t('goodBehavior.statusEvaluating')}</option>
            <option value="Chưa đánh giá">{t('goodBehavior.statusNotEvaluated')}</option>
          </select>
        </div>

        {/* Nhận xét Textarea */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-foreground">
            {t('goodBehavior.comment')}
          </label>
          <textarea
            rows={4}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t('goodBehavior.comment')}
            className="w-full p-3 text-[13px] border border-border bg-background text-foreground rounded-none focus:outline-hidden focus:border-[#1447e6] resize-none"
          />
        </div>

        {/* Guidance Alert Box */}
        <div className="p-3 border border-border/80 bg-muted/20 flex flex-col gap-1 text-[12px]">
          <span className="font-medium text-foreground">
            {currentLevel.stars} ★ · {currentLevel.label}
          </span>
          <span className="text-muted-foreground">
            {t('goodBehavior.criteriaList')}
          </span>
        </div>
      </div>

      {/* 3. Footer Action Buttons */}
      <div className="p-4 border-t border-border bg-card flex items-center justify-end gap-2.5">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="rounded-none h-9 text-[13px] px-4 cursor-pointer"
        >
          {t('common.cancel')}
        </Button>
        <Button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="rounded-none h-9 text-[13px] px-5 bg-[#1447e6] hover:bg-[#123ec4] text-white font-medium cursor-pointer"
        >
          {isSaving ? '...' : t('common.saveChanges')}
        </Button>
      </div>
    </div>
  );
}

export default GoodBehaviorDetailDrawer;
