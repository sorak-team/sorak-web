import React, { useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Cancel01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
} from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { cn } from '@/shared/lib/utils';

// Helper to format feedback timestamp nicely
const formatFeedbackDate = (rawDate) => {
  if (!rawDate) return '';
  if (typeof rawDate !== 'string') return String(rawDate);
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

export function ParentFeedbackModal({
  isOpen,
  feedbackStudents = [],
  currentIndex = 0,
  onIndexChange,
  onClose,
  className = 'Nhà trẻ 1',
}) {
  const { t } = useTranslation();
  const currentStudent = feedbackStudents[currentIndex];

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      onIndexChange(currentIndex - 1);
    }
  }, [currentIndex, onIndexChange]);

  const handleNext = useCallback(() => {
    if (currentIndex < feedbackStudents.length - 1) {
      onIndexChange(currentIndex + 1);
    }
  }, [currentIndex, feedbackStudents.length, onIndexChange]);

  // Keyboard navigation: Left/Right Arrow & Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      // Don't intercept if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handlePrev, handleNext, onClose]);

  if (!isOpen || !currentStudent) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-[1.5px] p-4 animate-in fade-in-0 duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[540px] bg-card border border-border shadow-2xl rounded-none text-foreground select-none overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-border bg-card">
          <div className="flex flex-col gap-0.5">
            <h3 className="text-[16px] font-semibold text-foreground tracking-tight">
              {t('assessment.parentFeedbackTitle', 'Ý kiến phản hồi từ phụ huynh')}
            </h3>
            <span className="text-[11.5px] text-muted-foreground font-mono">
              {t('assessment.feedbackCountInMonth', '{{current}} / {{total}} phản hồi trong tháng', {
                current: currentIndex + 1,
                total: feedbackStudents.length,
              })}
            </span>
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

        {/* Body */}
        <div className="p-5 flex flex-col gap-4">
          {/* Student Info Card */}
          <div className="flex items-center justify-between p-3 border border-border bg-muted/20">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="size-10 rounded-none border border-border overflow-hidden bg-background shrink-0">
                <img
                  src={`https://api.dicebear.com/10.x/critters/svg?seed=${encodeURIComponent(currentStudent.code)}&backgroundColor=ff2e63,00c2a8,ffb300,3d5afe,8e24aa,00e676`}
                  alt={currentStudent.name}
                  className="size-full object-cover"
                />
              </div>
              <div className="flex flex-col min-w-0 leading-tight">
                <span className="text-[14px] font-semibold text-foreground truncate">
                  {currentStudent.name}
                </span>
                <span className="text-[12px] text-muted-foreground font-mono mt-0.5">
                  {currentStudent.code} · {t('assessment.classPrefix', 'Lớp {{className}}', { className })}
                </span>
              </div>
            </div>

            {/* Achievements Pill */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-background border border-border text-[12px] font-medium shrink-0">
              <img src="/rose.webp" alt="Hoa hồng" className="size-3.5 object-contain" />
              <span>{currentStudent.rosesCount}/5 {t('assessment.flowersUnit', 'hoa')}</span>
            </div>
          </div>

          {/* Feedback Content Box */}
          <div className="p-4 border border-border/80 bg-background flex flex-col gap-3 shadow-2xs">
            <p className="text-[14px] text-foreground leading-relaxed italic select-text">
              "{currentStudent.parentFeedback}"
            </p>

            <div className="pt-2.5 border-t border-border/60 text-[12px] text-muted-foreground font-normal flex flex-wrap items-center justify-between gap-2">
              <div>
                {t('assessment.sender', 'Người gửi:')} <span className="text-foreground font-medium">{currentStudent.feedbackBy || t('assessment.defaultSender', 'Phụ huynh bé')}</span>
              </div>
              {currentStudent.feedbackAt && (
                <span className="font-mono text-[11.5px]">
                  {formatFeedbackDate(currentStudent.feedbackAt)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Footer with Prev / Next & Close */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border bg-muted/15">
          <Button
            type="button"
            variant="outline"
            disabled={currentIndex <= 0}
            onClick={handlePrev}
            className="h-8 px-3 text-[12.5px] rounded-none border-border bg-card hover:bg-muted text-foreground flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            title="Xem phản hồi trước"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={14} />
            <span>{t('assessment.prevFeedback', 'Trước')}</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            disabled={currentIndex >= feedbackStudents.length - 1}
            onClick={handleNext}
            className="h-8 px-3 text-[12.5px] rounded-none border-border bg-card hover:bg-muted text-foreground flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            title="Xem phản hồi sau"
          >
            <span>{t('assessment.nextFeedback', 'Sau')}</span>
            <HugeiconsIcon icon={ArrowRight01Icon} size={14} />
          </Button>

          <Button
            type="button"
            onClick={onClose}
            className="h-8 px-4 text-[12.5px] rounded-none bg-foreground text-background hover:bg-foreground/90 cursor-pointer ml-1"
          >
            {t('common.close', 'Đóng')}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ParentFeedbackModal;
