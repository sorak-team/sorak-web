import React, { useState } from 'react';
import { toast } from 'sonner';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
import {
  useAcademicYearStore,
  GLASS_THEME_PRESETS,
} from '../academic-years.store';
import { cn } from '@/shared/lib/utils';

export function QuickColorPopover({ year, triggerClassName }) {
  const [open, setOpen] = useState(false);
  const { setAcademicYearGlassColor } = useAcademicYearStore();

  if (!year) return null;

  const currentTheme = year.colorTheme || 'blue';
  const currentPreset =
    GLASS_THEME_PRESETS.find((p) => p.id === currentTheme) ||
    GLASS_THEME_PRESETS[0];

  const handleSelectPreset = (preset, e) => {
    e?.stopPropagation();
    setAcademicYearGlassColor(year.id, preset.id);
    toast.success(`Đã đổi màu sang ${preset.label}`);
    setOpen(false);
  };

  const isSmall = triggerClassName?.includes('size-7');

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          title={`Đổi màu nhận diện (${currentPreset.label})`}
          className={cn(
            'size-8 rounded-none border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer shrink-0',
            triggerClassName,
          )}
          data-name="Quick Color Trigger"
        >
          <span
            className={cn(
              'rounded-none border border-black/20 shrink-0 transition-transform hover:scale-105 shadow-2xs',
              isSmall ? 'size-4' : 'size-5',
            )}
            style={{ backgroundColor: currentPreset?.colorHex || '#2563EB' }}
          />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        side="bottom"
        onClick={(e) => e.stopPropagation()}
        className="w-auto p-2 bg-card border border-border rounded-none shadow-lg z-50"
      >
        <div className="flex items-center gap-1.5">
          {GLASS_THEME_PRESETS.map((preset) => {
            const isSelected = currentTheme === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={(e) => handleSelectPreset(preset, e)}
                title={preset.label}
                className={cn(
                  'size-6 flex items-center justify-center border rounded-none transition-all cursor-pointer',
                  isSelected
                    ? 'ring-2 ring-primary border-white scale-105'
                    : 'border-black/15 hover:scale-110 hover:border-black/40',
                )}
                style={{ backgroundColor: preset.colorHex }}
              >
                {isSelected && (
                  <span className="text-[10px] text-white font-bold leading-none select-none">
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
