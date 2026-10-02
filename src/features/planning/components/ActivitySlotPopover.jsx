import React, { useState, useEffect } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Cancel01Icon,
  RefreshIcon,
  PlusSignIcon,
  ArrowUp01Icon,
  ArrowDown01Icon,
  PencilEdit02Icon,
  MoreHorizontalIcon,
  Delete02Icon,
} from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/shared/lib/utils';

const ROUTINE_SLOT_NAMES = {
  ARRIVAL_PLAY: 'Đón trẻ, chơi',
  MORNING_EXERCISE: 'Thể dục sáng',
  DIRECTED_STUDY: 'Học',
  CORNER_PLAY: 'Chơi, hoạt động ở các góc',
  OUTDOOR_PLAY: 'Chơi ngoài trời',
  AFTERNOON_ACTIVITY: 'Chơi, hoạt động theo ý thích (Chiều)',
  RETURN_CHILD: 'Trả trẻ',
};

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

const getDomainText = (slot) => {
  const d =
    slot.domainLabel ||
    slot.criteria?.domainLabel ||
    slot.domain ||
    slot.criteria?.domain ||
    slot.goal?.domain ||
    '';
  if (!d) return '';
  const str = typeof d === 'string' ? d.trim() : '';
  return DOMAIN_NAMES[str.toUpperCase()] || DOMAIN_NAMES[str] || str;
};

const getIndicatorText = (slot) => {
  const val =
    slot.indicatorCode ||
    slot.indicator ||
    slot.criteria?.indicatorCode ||
    slot.criteria?.indicator ||
    (typeof slot.goal === 'object' ? (slot.goal?.indicatorCode || slot.goal?.indicator) : '');
  if (val && typeof val === 'string' && val.trim()) {
    return val.trim();
  }
  return 'Không áp dụng (Khối Nhà trẻ)';
};

export function ActivitySlotPopover({
  slot,
  day,
  allSlotsInCell = [],
  isOpen,
  onClose,
  onClearSlot,
  onChangeActivity,
  onAddActivity,
  onEditActivity,
  onReorderActivities,
  onSelectSlot,
}) {
  const [localSlots, setLocalSlots] = useState([]);
  const [activeSlotId, setActiveSlotId] = useState(slot?.id);

  useEffect(() => {
    if (allSlotsInCell && allSlotsInCell.length > 0) {
      setLocalSlots(allSlotsInCell);
    } else if (slot) {
      setLocalSlots([slot]);
    } else {
      setLocalSlots([]);
    }
  }, [allSlotsInCell, slot]);

  useEffect(() => {
    if (slot?.id) {
      setActiveSlotId(slot.id);
    }
  }, [slot?.id]);

  const displaySlots = localSlots.length > 0 ? localSlots : (slot ? [slot] : []);
  const routineKey = slot?.routineSlot || slot?.routine_slot;
  const routineName = ROUTINE_SLOT_NAMES[routineKey] || 'Hoạt động giáo dục';

  // Lắng nghe phím Delete / Backspace để xoá hoạt động giáo dục đang chọn
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target.isContentEditable
      ) {
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        const target =
          displaySlots.find((s) => s.id === activeSlotId) ||
          displaySlots[0] ||
          slot;
        if (target && onClearSlot) {
          e.preventDefault();
          e.stopImmediatePropagation();
          onClearSlot(target);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeSlotId, displaySlots, slot, onClearSlot]);

  if (!isOpen || !slot) return null;

  // Lấy riêng ngày (bỏ chữ Thứ)
  const rawDate = day?.date || slot.date || slot.dayLabel || '';
  const dateOnly = rawDate ? rawDate.split(/[·,]/).pop().trim() : '';

  // Hoán đổi thứ tự của hoạt động
  const handleMove = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= displaySlots.length) return;
    const updated = [...displaySlots];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setLocalSlots(updated);
    if (onReorderActivities) {
      onReorderActivities(updated);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-[1px] animate-in fade-in-0 duration-200"
      onClick={onClose}
      data-name="WeeklySlotDetailDrawer"
    >
      <div
        className="w-full max-w-[580px] h-full bg-card border-l border-border shadow-2xl flex flex-col justify-between text-foreground select-none overflow-hidden animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Drawer Header: Tiêu đề + 2 Badge (Loại hoạt động & Ngày) đồng bộ chuẩn giao diện Sorak */}
        <div className="flex items-start justify-between p-6 border-b border-border bg-card shrink-0">
          <div className="flex flex-col gap-1 min-w-0 pr-4">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-[18px] font-semibold text-foreground tracking-tight truncate">
                Chi tiết slot tuần
              </h2>
              {/* Badge 1: Loại hoạt động giáo dục (Xanh nhẹ) */}
              <span className="inline-flex items-center h-6 px-2.5 text-[11.5px] font-medium bg-blue-500/10 text-[#1447e6] dark:text-blue-400 border border-blue-500/20 rounded-none shrink-0 select-none whitespace-nowrap">
                {routineName}
              </span>
              {/* Badge 2: Ngày (Muted neutral) */}
              {dateOnly && (
                <span className="inline-flex items-center h-6 px-2 text-[11.5px] font-medium bg-muted/80 text-foreground border border-border/80 shrink-0 select-none">
                  {dateOnly}
                </span>
              )}
            </div>

            <p className="text-[12px] text-muted-foreground font-normal mt-0.5">
              Xem chi tiết các hoạt động giáo dục, nội dung mục tiêu và tiến trình bài dạy trong khung giờ sinh hoạt của tuần.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="size-8.5 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors rounded-none cursor-pointer shrink-0"
            title="Đóng drawer"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={18} />
          </button>
        </div>

        {/* 2. Drawer Scrollable Body: Bắt đầu ngay với các thẻ bài dạy thoáng đãng */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-background">
          {/* Danh sách các hoạt động giáo dục trong slot */}
          <div className="space-y-5">
            {displaySlots.map((itemSlot, index) => {
              const activityNumber = index + 1;
              const isSelected = activeSlotId === itemSlot.id;
              const domainText = getDomainText(itemSlot);
              const indicatorText = getIndicatorText(itemSlot);

              return (
                <div
                  key={itemSlot.id || index}
                  onClick={() => {
                    setActiveSlotId(itemSlot.id);
                    if (onSelectSlot) onSelectSlot(itemSlot);
                  }}
                  className={cn(
                    "p-5 border bg-card shadow-2xs rounded-none flex flex-col gap-3.5 transition-all cursor-pointer",
                    isSelected
                      ? "border-foreground/70 ring-1 ring-foreground/20"
                      : "border-border hover:border-foreground/30"
                  )}
                >
                  {/* Hàng Header: Tiêu đề + Cụm điều hướng thứ tự & Menu 3 chấm gom gọn trên 1 hàng */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col gap-1 flex-1 min-w-0 pr-1">
                      <span className="text-[11.5px] font-mono font-semibold text-muted-foreground tracking-wider uppercase">
                        Hoạt động {activityNumber}
                      </span>
                      <h4 className="text-[16px] font-semibold text-foreground leading-snug break-words">
                        {itemSlot.title}
                      </h4>
                    </div>

                    {/* Cụm thao tác trên cùng 1 hàng: Nút lên/xuống (nếu >1) + Menu 3 chấm (...) */}
                    <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                      {displaySlots.length > 1 && (
                        <>
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMove(index, -1);
                            }}
                            className="size-8 border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-25 disabled:hover:bg-background disabled:cursor-not-allowed flex items-center justify-center transition-colors rounded-none cursor-pointer"
                            title="Di chuyển lên trên"
                          >
                            <HugeiconsIcon icon={ArrowUp01Icon} size={15} />
                          </button>
                          <button
                            type="button"
                            disabled={index === displaySlots.length - 1}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMove(index, 1);
                            }}
                            className="size-8 border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-25 disabled:hover:bg-background disabled:cursor-not-allowed flex items-center justify-center transition-colors rounded-none cursor-pointer"
                            title="Di chuyển xuống dưới"
                          >
                            <HugeiconsIcon icon={ArrowDown01Icon} size={15} />
                          </button>
                        </>
                      )}

                      {/* Menu 3 chấm gom gọn các thao tác: Sửa giáo án, Đổi hoạt động, Gỡ khỏi slot */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            className="size-8 border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors rounded-none cursor-pointer"
                            title="Tùy chọn thao tác"
                          >
                            <HugeiconsIcon icon={MoreHorizontalIcon} size={16} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 rounded-none shadow-md">
                          {onEditActivity && (
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditActivity(itemSlot);
                              }}
                              className="cursor-pointer gap-2.5 text-[12.5px] py-2 rounded-none"
                            >
                              <HugeiconsIcon icon={PencilEdit02Icon} size={15} className="text-muted-foreground" />
                              <span>Chỉnh sửa giáo án</span>
                            </DropdownMenuItem>
                          )}
                          {onChangeActivity && (
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                onChangeActivity(itemSlot, day);
                              }}
                              className="cursor-pointer gap-2.5 text-[12.5px] py-2 rounded-none"
                            >
                              <HugeiconsIcon icon={RefreshIcon} size={15} className="text-muted-foreground" />
                              <span>Đổi hoạt động khác</span>
                            </DropdownMenuItem>
                          )}
                          {onClearSlot && (
                            <>
                              <DropdownMenuSeparator className="my-1" />
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onClearSlot(itemSlot);
                                }}
                                className="cursor-pointer gap-2.5 text-[12.5px] py-2 text-destructive focus:text-destructive focus:bg-destructive/10 rounded-none"
                              >
                                <HugeiconsIcon icon={Delete02Icon} size={15} />
                                <span>Gỡ khỏi slot</span>
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Thông tin Lĩnh vực, Mục tiêu GD, Chỉ số BGD, Nội dung GD: Thoáng đãng */}
                  <div className="space-y-1.5 text-[13px] border-t border-border/50 pt-3">
                    <div className="flex items-baseline gap-2">
                      <span className="text-muted-foreground min-w-[85px] shrink-0">Lĩnh vực:</span>
                      <span className="text-foreground font-medium">
                        {domainText || '—'}
                      </span>
                    </div>

                    {(itemSlot.goalCode || itemSlot.goalTitle) && (
                      <div className="flex items-baseline gap-2">
                        <span className="text-muted-foreground min-w-[85px] shrink-0">Mục tiêu:</span>
                        <span className="text-foreground font-medium">
                          {itemSlot.goalCode}
                          {itemSlot.goalTitle ? ` – ${itemSlot.goalTitle}` : ''}
                        </span>
                      </div>
                    )}

                    <div className="flex items-baseline gap-2">
                      <span className="text-muted-foreground min-w-[85px] shrink-0">Chỉ số BGD:</span>
                      <span
                        className={cn(
                          indicatorText && !indicatorText.includes('Không áp dụng')
                            ? "text-foreground font-medium"
                            : "text-muted-foreground font-normal"
                        )}
                      >
                        {indicatorText}
                      </span>
                    </div>

                    {(itemSlot.contentTitle || itemSlot.content) && (
                      <div className="flex items-baseline gap-2">
                        <span className="text-muted-foreground min-w-[85px] shrink-0">Nội dung:</span>
                        <span className="text-foreground">{itemSlot.contentTitle || itemSlot.content}</span>
                      </div>
                    )}
                  </div>

                  {/* Chi tiết giáo án bài dạy: Rộng rãi, dễ đọc */}
                  <div className="space-y-4 text-[13px] border-t border-border/50 pt-3 leading-relaxed">
                    {/* 1. Mục tiêu hoạt động */}
                    {itemSlot.objective && (
                      <div className="space-y-1">
                        <div className="font-semibold text-foreground text-[13px]">
                          1. Mục tiêu hoạt động
                        </div>
                        <p className="text-muted-foreground leading-relaxed">
                          {itemSlot.objective}
                        </p>
                      </div>
                    )}

                    {/* 2. Chuẩn bị */}
                    {itemSlot.preparation && (
                      <div className="space-y-1">
                        <div className="font-semibold text-foreground text-[13px]">
                          2. Chuẩn bị
                        </div>
                        <p className="text-muted-foreground leading-relaxed">
                          {itemSlot.preparation}
                        </p>
                      </div>
                    )}

                    {/* 3. Tiến trình bài dạy */}
                    {itemSlot.procedure && (
                      <div className="space-y-1">
                        <div className="font-semibold text-foreground text-[13px]">
                          3. Tiến trình bài dạy
                        </div>
                        <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                          {itemSlot.procedure}
                        </p>
                      </div>
                    )}

                    {/* 4. Đánh giá / Tiêu chí đạt */}
                    {(itemSlot.evaluation || itemSlot.evaluationCriteria) && (
                      <div className="space-y-1">
                        <div className="font-semibold text-foreground text-[13px]">
                          4. Đánh giá / Tiêu chí đạt
                        </div>
                        <p className="text-muted-foreground leading-relaxed">
                          {itemSlot.evaluation || itemSlot.evaluationCriteria}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Nút Thêm hoạt động vào slot này */}
          {onAddActivity && (
            <button
              type="button"
              onClick={() => onAddActivity(slot, day)}
              className="w-full h-10 border border-dashed border-border hover:border-primary/60 hover:bg-primary/5 text-primary text-[13px] font-medium rounded-none flex items-center justify-center gap-2 transition-colors cursor-pointer select-none"
            >
              <HugeiconsIcon icon={PlusSignIcon} size={15} />
              <span>Thêm hoạt động vào slot này</span>
            </button>
          )}
        </div>

        {/* 3. Drawer Footer */}
        <div className="p-4 border-t border-border bg-card flex items-center justify-between shrink-0">
          <span className="text-[12.5px] text-muted-foreground">
            Tổng cộng <strong className="text-foreground">{displaySlots.length}</strong> hoạt động trong slot
          </span>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="h-9 px-6 text-[13px] font-medium rounded-none border border-border bg-background hover:bg-muted text-foreground cursor-pointer shadow-none transition-colors"
          >
            Đóng
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ActivitySlotPopover;
