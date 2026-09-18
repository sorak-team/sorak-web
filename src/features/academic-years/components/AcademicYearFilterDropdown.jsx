import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import { FilterHorizontalIcon } from '@hugeicons/core-free-icons';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
import { useAcademicYearStore } from '../academic-years.store';
import { cn } from '@/shared/lib/utils';

export function AcademicYearFilterDropdown() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const {
    filterStatus,
    setFilterStatus,
    sortBy,
    setSortBy,
    hideEnded,
    setHideEnded,
    onlyActive,
    setOnlyActive,
  } = useAcademicYearStore();

  const handleFilterStatusToggle = (status) => {
    if (filterStatus === status) {
      setFilterStatus('all');
    } else {
      setFilterStatus(status);
      if (status === 'active') {
        setOnlyActive(false);
      }
    }
  };

  const handleOnlyActiveToggle = () => {
    const next = !onlyActive;
    setOnlyActive(next);
    if (next) {
      setFilterStatus('active');
    }
  };

  const sortOptions = [
    { key: 'newest', label: t('schoolYear.sortNewest') },
    { key: 'oldest', label: t('schoolYear.sortOldest') },
    { key: 'name', label: t('schoolYear.sortName') },
    { key: 'startDate', label: t('schoolYear.sortStartDate') },
    { key: 'endDate', label: t('schoolYear.sortEndDate') },
    { key: 'classCount', label: t('schoolYear.sortClassCount') },
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title={t('schoolYear.filter')}
          className={cn(
            'size-8 rounded-none border border-border bg-background flex items-center justify-center',
            'hover:bg-muted/60 transition-colors cursor-pointer text-foreground shrink-0',
            (filterStatus !== 'all' || hideEnded || onlyActive || sortBy !== 'newest') &&
              'border-[#1447e6] text-[#1447e6]',
          )}
          data-node-id="4173:3219"
        >
          <HugeiconsIcon icon={FilterHorizontalIcon} size={16} />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={6}
        className="w-[260px] p-1.5 rounded-none border border-border bg-card shadow-xl z-50 text-foreground"
        data-node-id="4162:24649"
      >
        {/* Section 1: Lọc theo */}
        <div className="px-2 py-1 text-[12px] font-normal text-muted-foreground">
          {t('schoolYear.filterBy')}
        </div>

        <button
          type="button"
          onClick={() => handleFilterStatusToggle('active')}
          className={cn(
            'w-full flex items-center justify-between px-2 py-1.5 text-[14px] rounded-none hover:bg-muted/50 cursor-pointer transition-colors text-left',
            filterStatus === 'active' && 'bg-accent/60 font-medium',
          )}
        >
          <span>{t('schoolYear.active')}</span>
          {filterStatus === 'active' && (
            <svg
              className="size-4 text-foreground shrink-0"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M3.5 8.5L6.5 11.5L12.5 5.5" />
            </svg>
          )}
        </button>

        <button
          type="button"
          onClick={() => handleFilterStatusToggle('ended')}
          className={cn(
            'w-full flex items-center justify-between px-2 py-1.5 text-[14px] rounded-none hover:bg-muted/50 cursor-pointer transition-colors text-left',
            filterStatus === 'ended' && 'bg-accent/60 font-medium',
          )}
        >
          <span>{t('schoolYear.ended')}</span>
          {filterStatus === 'ended' && (
            <svg
              className="size-4 text-foreground shrink-0"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M3.5 8.5L6.5 11.5L12.5 5.5" />
            </svg>
          )}
        </button>

        <div className="h-px bg-border my-1.5" />

        {/* Section 2: Sắp xếp */}
        <div className="px-2 py-1 text-[12px] font-normal text-muted-foreground">
          {t('schoolYear.sortBy')}
        </div>

        {sortOptions.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => setSortBy(opt.key)}
            className={cn(
              'w-full flex items-center justify-between px-2 py-1.5 text-[14px] rounded-none hover:bg-muted/50 cursor-pointer transition-colors text-left',
              sortBy === opt.key && 'bg-accent/60 font-medium',
            )}
          >
            <span>{opt.label}</span>
            {sortBy === opt.key && (
              <svg
                className="size-4 text-foreground shrink-0"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M3.5 8.5L6.5 11.5L12.5 5.5" />
              </svg>
            )}
          </button>
        ))}

        <div className="h-px bg-border my-1.5" />

        {/* Section 3: Tùy chọn */}
        <div className="px-2 py-1 text-[12px] font-normal text-muted-foreground">
          {t('schoolYear.options')}
        </div>

        <button
          type="button"
          onClick={() => setHideEnded(!hideEnded)}
          className={cn(
            'w-full flex items-center justify-between px-2 py-1.5 text-[14px] rounded-none hover:bg-muted/50 cursor-pointer transition-colors text-left',
            hideEnded && 'bg-accent/60 font-medium',
          )}
        >
          <span>{t('schoolYear.hideEnded')}</span>
          {hideEnded && (
            <svg
              className="size-4 text-foreground shrink-0"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M3.5 8.5L6.5 11.5L12.5 5.5" />
            </svg>
          )}
        </button>

        <button
          type="button"
          onClick={handleOnlyActiveToggle}
          className={cn(
            'w-full flex items-center justify-between px-2 py-1.5 text-[14px] rounded-none hover:bg-muted/50 cursor-pointer transition-colors text-left',
            onlyActive && 'bg-accent/60 font-medium',
          )}
        >
          <span>{t('schoolYear.onlyActive')}</span>
          {onlyActive && (
            <svg
              className="size-4 text-foreground shrink-0"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M3.5 8.5L6.5 11.5L12.5 5.5" />
            </svg>
          )}
        </button>
      </PopoverContent>
    </Popover>
  );
}
