import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import { Folder01Icon } from '@hugeicons/core-free-icons';
import { cn } from '@/shared/lib/utils';

export function ThemeCard({ card, group, tab = 'themes' }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleCardClick = () => {
    if (tab === 'themes') {
      navigate(`/curriculum/themes/${card.yearId}/${card.ageGroup}`);
    } else {
      navigate(`/curriculum/goals/${card.yearId}/${card.ageGroup}`);
    }
  };

  const effectiveStatus = card.status || 'DRAFT';
  const isActive = effectiveStatus === 'ACTIVE' || effectiveStatus === 'PUBLISHED';
  const groupLabel = group?.label || card?.ageGroupLabel || 'Khối học';
  const rawAge =
    group?.ageRange ||
    (card?.ageGroup === 'nhatre'
      ? '12–36 tháng'
      : card?.ageGroup === 'mam'
      ? '3–4 tuổi'
      : card?.ageGroup === 'choi'
      ? '4–5 tuổi'
      : '5–6 tuổi');
  const ageDescription = rawAge.includes('tuổi') ? rawAge : `${rawAge} tuổi`;
  const count = tab === 'themes' ? (card.themeCount ?? 0) : (card.goalCount ?? 0);
  const countUnit = tab === 'themes' ? 'chủ đề' : 'mục tiêu';

  return (
    <div
      onClick={handleCardClick}
      className="group relative border border-border bg-card p-6 rounded-none hover:border-primary/80 transition-all duration-200 cursor-pointer flex flex-col justify-between gap-5 shadow-2xs hover:shadow-xs min-h-[155px]"
      data-name="Curriculum Card"
    >
      {/* Top: Icon + Title + Age */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3.5 min-w-0">
          {/* Neutral Folder Icon Box */}
          <div className="size-10 bg-muted/60 text-muted-foreground flex items-center justify-center rounded-none shrink-0 group-hover:bg-primary/10 group-hover:text-primary transition-colors border border-border/50">
            <HugeiconsIcon icon={Folder01Icon} size={20} />
          </div>

          <div className="flex flex-col min-w-0 pt-0.5">
            <span className="text-[17px] font-semibold text-foreground group-hover:text-primary transition-colors tracking-tight">
              {groupLabel}
            </span>
            <span className="text-[13px] text-muted-foreground font-normal mt-0.5">
              {ageDescription}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom: Count Metric on Left, Status Badge on Right */}
      <div className="flex items-center justify-between gap-3 pt-3.5 border-t border-border/50">
        <div className="flex items-center gap-2">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[16px] font-semibold text-foreground">
              {count}
            </span>
            <span className="text-[13px] text-muted-foreground font-normal">
              {countUnit}
            </span>
          </div>
          <span className="text-[12px] text-muted-foreground font-normal">
            · {card.updatedAt ? (card.updatedAt.startsWith('Cập nhật') ? card.updatedAt : `Cập nhật ${card.updatedAt}`) : 'Cập nhật hôm nay'}
          </span>
        </div>

        <span
          className={cn(
            'px-2.5 py-0.5 text-[11px] font-medium tracking-wide rounded-none',
            isActive
              ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30'
              : 'bg-muted text-muted-foreground border border-border/80'
          )}
        >
          {isActive ? t('curriculum.published', 'Đã công bố') : t('curriculum.draft', 'Bản nháp')}
        </span>
      </div>
    </div>
  );
}
export default ThemeCard;
