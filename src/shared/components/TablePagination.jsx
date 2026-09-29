import React from 'react';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
} from '@hugeicons/core-free-icons';
import { cn } from '@/shared/lib/utils';
import { usePaginationStore } from '@/shared/stores/pagination.store';

export function TablePagination({
  currentPage = 1,
  totalItems = 0,
  onPageChange,
  itemLabel,
  className = '',
}) {
  const { t } = useTranslation();
  const pageSize = usePaginationStore((state) => state.pageSize);

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(totalItems, currentPage * pageSize);

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 pb-6 text-[13px] select-none',
        className,
      )}
      data-name="Table Pagination · Unified"
    >
      {/* Left: Item Range Info */}
      <div className="flex items-center text-muted-foreground w-full sm:w-auto justify-between sm:justify-start">
        <span className="text-[12.5px] text-muted-foreground font-normal">
          {totalItems > 0 ? (
            <>
              {startItem}–{endItem} / {totalItems} {itemLabel || t('common.items', 'mục')}
            </>
          ) : (
            <>0 {itemLabel || t('common.items', 'mục')}</>
          )}
        </span>
      </div>

      {/* Right: Pagination Controls */}
      <div className="flex items-center border border-border bg-card rounded-none overflow-hidden shrink-0">
        {/* Previous Page */}
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => onPageChange && onPageChange(Math.max(1, currentPage - 1))}
          className={cn(
            'h-8 px-3 text-[13px] font-medium flex items-center gap-1 transition-colors border-r border-border',
            currentPage <= 1
              ? 'text-muted-foreground/40 cursor-not-allowed bg-muted/20'
              : 'text-foreground hover:bg-muted/60 cursor-pointer',
          )}
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={14} />
          <span>{t('common.prevPage', 'Trước')}</span>
        </button>

        {/* Page Numbers */}
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
          <button
            key={page}
            type="button"
            onClick={() => onPageChange && onPageChange(page)}
            className={cn(
              'size-8 text-[13px] font-medium flex items-center justify-center transition-colors border-r last:border-r-0 border-border cursor-pointer',
              currentPage === page
                ? 'bg-muted font-semibold text-foreground'
                : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground',
            )}
          >
            {page}
          </button>
        ))}

        {/* Next Page */}
        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange && onPageChange(Math.min(totalPages, currentPage + 1))}
          className={cn(
            'h-8 px-3 text-[13px] font-medium flex items-center gap-1 transition-colors',
            currentPage >= totalPages
              ? 'text-muted-foreground/40 cursor-not-allowed bg-muted/20'
              : 'text-foreground hover:bg-muted/60 cursor-pointer',
          )}
        >
          <span>{t('common.nextPage', 'Sau')}</span>
          <HugeiconsIcon icon={ArrowRight01Icon} size={14} />
        </button>
      </div>
    </div>
  );
}
