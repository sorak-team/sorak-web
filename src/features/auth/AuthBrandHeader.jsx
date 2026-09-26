import React from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Unified Brand Header matching the Email OTP and Official School Identity:
 * [Logo Icon] SORAK | Trường Mầm Non Hòn Tre
 */
export function AuthBrandHeader({ className = 'mb-5' }) {
  const { t } = useTranslation();

  return (
    <div
      className={`flex items-center justify-center gap-2 select-none ${className}`}
      data-name="Unified Brand Header"
    >
      <img
        src="/logo.svg"
        alt="Sorak Logo"
        className="h-6 w-auto block shrink-0"
      />
      <div className="flex items-center gap-1.5 sm:gap-2 leading-none">
        <span className="font-bold text-[16px] sm:text-[17px] tracking-tight text-foreground">
          {t('brand.name', 'Sorak')}
        </span>
        <span className="text-muted-foreground/40 font-light text-[14px] sm:text-[15px] select-none">
          |
        </span>
        <span className="font-semibold text-[13px] sm:text-[14px] tracking-tight text-foreground/90 whitespace-nowrap">
          {t('brand.subtitle', 'Trường Mầm Non Hòn Tre')}
        </span>
      </div>
    </div>
  );
}

export default AuthBrandHeader;
