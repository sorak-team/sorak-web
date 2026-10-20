import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  MoreHorizontalIcon,
  FullScreenIcon,
  MinimizeScreenIcon,
  RotateLeft01Icon,
} from '@hugeicons/core-free-icons';
import { toast } from 'sonner';

import { cn } from '@/shared/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
import { useAppearanceStore } from '@/shared/stores/appearance.store';

export function PageMoreMenu() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const fontFamily = useAppearanceStore((state) => state.fontFamily);
  const setFontFamily = useAppearanceStore((state) => state.setFontFamily);
  const textSize = useAppearanceStore((state) => state.textSize);
  const setTextSize = useAppearanceStore((state) => state.setTextSize);
  const isFullscreen = useAppearanceStore((state) => state.isFullscreen);
  const toggleFullscreen = useAppearanceStore((state) => state.toggleFullscreen);
  const resetDefaults = useAppearanceStore((state) => state.resetDefaults);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 rounded-none border-0 text-foreground/80 hover:text-foreground hover:bg-muted focus-visible:ring-1 focus-visible:ring-ring"
          title={t('pageMore.moreOptions')}
          data-node-id="4276:7161"
          data-name="Page More"
        >
          <HugeiconsIcon icon={MoreHorizontalIcon} size={16} />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={6}
        className="w-[296px] rounded-none border border-border bg-popover p-2 text-popover-foreground shadow-[0px_4px_12px_0px_rgba(0,0,0,0.12)] flex flex-col gap-2.5 z-50"
        data-node-id="4277:7074"
        data-name="Teacher Page Menu · Open"
      >
        {/* Section 1: Kiểu chữ / Typography */}
        <div className="flex flex-col gap-1.5 w-full">
          <p
            className="text-[12px] font-medium text-muted-foreground select-none px-1"
            data-node-id="4277:7075"
          >
            {t('pageMore.fontStyle')}
          </p>

          <div
            className="grid grid-cols-3 gap-2 h-14 w-full"
            data-node-id="4277:7076"
            data-name="Font Preview Group"
          >
            {/* Card 1: Default (Sans-serif) */}
            <button
              type="button"
              onClick={() => setFontFamily('default')}
              className={cn(
                'flex flex-col items-center justify-center gap-px h-14 rounded-none border transition-colors cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-primary',
                fontFamily === 'default' || fontFamily === 'inter'
                  ? 'bg-muted border-border font-medium'
                  : 'bg-transparent border-transparent hover:bg-muted/50 text-foreground',
              )}
              title="Default (Sans-serif)"
              data-node-id="4290:7151"
            >
              <span
                className={cn(
                  'text-[24px] leading-[30px] font-sans transition-colors',
                  fontFamily === 'default' || fontFamily === 'inter' ? 'text-primary font-medium' : 'text-foreground',
                )}
                data-node-id="4290:7152"
              >
                Ag
              </span>
              <span
                className="text-[11px] leading-[15px] text-muted-foreground select-none"
                data-node-id="4290:7153"
              >
                {t('pageMore.fontDefault')}
              </span>
            </button>

            {/* Card 2: Serif */}
            <button
              type="button"
              onClick={() => setFontFamily('serif')}
              className={cn(
                'flex flex-col items-center justify-center gap-px h-14 rounded-none border transition-colors cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-primary',
                fontFamily === 'serif'
                  ? 'bg-muted border-border font-medium'
                  : 'bg-transparent border-transparent hover:bg-muted/50 text-foreground',
              )}
              title="Serif"
              data-node-id="4290:7154"
            >
              <span
                className={cn(
                  'text-[24px] leading-[30px] font-serif transition-colors',
                  fontFamily === 'serif' ? 'text-primary font-medium' : 'text-foreground',
                )}
                data-node-id="4290:7155"
              >
                Ag
              </span>
              <span
                className="text-[11px] leading-[15px] text-muted-foreground select-none"
                data-node-id="4290:7156"
              >
                {t('pageMore.fontSerif')}
              </span>
            </button>

            {/* Card 3: Mono */}
            <button
              type="button"
              onClick={() => setFontFamily('mono')}
              className={cn(
                'flex flex-col items-center justify-center gap-px h-14 rounded-none border transition-colors cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-primary',
                fontFamily === 'mono'
                  ? 'bg-muted border-border font-medium'
                  : 'bg-transparent border-transparent hover:bg-muted/50 text-foreground',
              )}
              title="Mono"
              data-node-id="4290:7157"
            >
              <span
                className={cn(
                  'text-[24px] leading-[30px] font-mono transition-colors',
                  fontFamily === 'mono' ? 'text-primary font-medium' : 'text-foreground',
                )}
                data-node-id="4290:7158"
              >
                Ag
              </span>
              <span
                className="text-[11px] leading-[15px] text-muted-foreground select-none"
                data-node-id="4290:7159"
              >
                {t('pageMore.fontMono')}
              </span>
            </button>
          </div>
        </div>

        {/* Section 2: Cỡ chữ / Text Size */}
        <div className="flex flex-col gap-1.5 w-full">
          <p className="text-[12px] font-medium text-muted-foreground select-none px-1">
            {t('pageMore.textSize')}
          </p>

          <div className="grid grid-cols-3 gap-2 h-14 w-full">
            {/* Size 1: Nhỏ (Small) */}
            <button
              type="button"
              onClick={() => setTextSize('small')}
              className={cn(
                'flex flex-col items-center justify-center gap-px h-14 rounded-none border transition-colors cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-primary',
                textSize === 'small'
                  ? 'bg-muted border-border font-medium'
                  : 'bg-transparent border-transparent hover:bg-muted/50 text-foreground',
              )}
              title={t('pageMore.sizeSmall')}
            >
              <span
                className={cn(
                  'text-[15px] leading-[26px] transition-colors',
                  textSize === 'small' ? 'text-primary font-medium' : 'text-foreground',
                )}
              >
                A
              </span>
              <span className="text-[11px] leading-[15px] text-muted-foreground select-none">
                {t('pageMore.sizeSmall')}
              </span>
            </button>

            {/* Size 2: Vừa (Medium / Default) */}
            <button
              type="button"
              onClick={() => setTextSize('medium')}
              className={cn(
                'flex flex-col items-center justify-center gap-px h-14 rounded-none border transition-colors cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-primary',
                textSize === 'medium'
                  ? 'bg-muted border-border font-medium'
                  : 'bg-transparent border-transparent hover:bg-muted/50 text-foreground',
              )}
              title={t('pageMore.sizeMedium')}
            >
              <span
                className={cn(
                  'text-[19px] leading-[26px] transition-colors',
                  textSize === 'medium' ? 'text-primary font-medium' : 'text-foreground',
                )}
              >
                A
              </span>
              <span className="text-[11px] leading-[15px] text-muted-foreground select-none">
                {t('pageMore.sizeMedium')}
              </span>
            </button>

            {/* Size 3: Lớn (Large) */}
            <button
              type="button"
              onClick={() => setTextSize('large')}
              className={cn(
                'flex flex-col items-center justify-center gap-px h-14 rounded-none border transition-colors cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-primary',
                textSize === 'large'
                  ? 'bg-muted border-border font-medium'
                  : 'bg-transparent border-transparent hover:bg-muted/50 text-foreground',
              )}
              title={t('pageMore.sizeLarge')}
            >
              <span
                className={cn(
                  'text-[24px] leading-[26px] transition-colors',
                  textSize === 'large' ? 'text-primary font-medium' : 'text-foreground',
                )}
              >
                A
              </span>
              <span className="text-[11px] leading-[15px] text-muted-foreground select-none">
                {t('pageMore.sizeLarge')}
              </span>
            </button>
          </div>
        </div>

        {/* Divider */}
        <div
          className="h-px bg-border w-full my-0.5"
          data-node-id="4277:7129"
        />

        {/* Section 3: Fullscreen / Mở toàn trang */}
        <button
          type="button"
          onClick={() => {
            toggleFullscreen();
          }}
          className="flex items-center gap-2 h-8 px-2 w-full hover:bg-muted text-sm text-popover-foreground transition-colors rounded-none cursor-pointer text-left select-none outline-none focus-visible:bg-muted"
          data-node-id="4290:7169"
          data-name="MenuItem · Mở toàn trang"
        >
          <HugeiconsIcon
            icon={isFullscreen ? MinimizeScreenIcon : FullScreenIcon}
            size={16}
            className="text-foreground shrink-0"
          />
          <span className="flex-1 truncate text-[14px]">
            {isFullscreen
              ? t('pageMore.exitFullScreen')
              : t('pageMore.fullScreen')}
          </span>
        </button>

        {/* Divider */}
        <div className="h-px bg-border w-full my-0.5" />

        {/* Section 4: Đặt lại mặc định / Reset to default */}
        <button
          type="button"
          onClick={() => {
            resetDefaults();
            toast.success(t('pageMore.toastResetSuccess'));
          }}
          className="flex items-center gap-2 h-8 px-2 w-full hover:bg-muted text-sm text-popover-foreground transition-colors rounded-none cursor-pointer text-left select-none outline-none focus-visible:bg-muted"
          title={t('pageMore.resetDefault')}
        >
          <HugeiconsIcon
            icon={RotateLeft01Icon}
            size={16}
            className="text-muted-foreground shrink-0"
          />
          <span className="flex-1 truncate text-[14px]">
            {t('pageMore.resetDefault')}
          </span>
        </button>
      </PopoverContent>
    </Popover>
  );
}
