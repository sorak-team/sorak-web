import React from 'react';
import { cn } from '@/shared/lib/utils';
import { useIsDarkMode } from '@/shared/hooks';

export const GRADE_PLANET_KEYS = {
  nhatre: 'nhatre',
  mam: 'mam',
  choi: 'choi',
  la: 'la',
  NHA_TRE: 'nhatre',
  MAM: 'mam',
  CHOI: 'choi',
  LA: 'la',
};

export const GRADE_PLANET_SEEDS = GRADE_PLANET_KEYS;

export function getGradePlanetKey(gradeOrAgeGroup, color) {
  const key = String(gradeOrAgeGroup || '').trim().toLowerCase();
  if (key.includes('nha') || key.includes('tre') || key.includes('nt')) return 'nhatre';
  if (key.includes('mam') || key.includes('m-') || key.includes('mầm')) return 'mam';
  if (key.includes('choi') || key.includes('c-') || key.includes('chồi')) return 'choi';
  if (key.includes('la') || key.includes('l-') || key.includes('lá')) return 'la';

  if (color) {
    const colorMap = {
      emerald: 'la',
      green: 'la',
      teal: 'choi',
      blue: 'mam',
      cyan: 'mam',
      coral: 'choi',
      rose: 'choi',
      amber: 'nhatre',
      yellow: 'nhatre',
    };
    if (colorMap[color]) return colorMap[color];
  }

  return 'nhatre';
}

/**
 * Returns the optimized SVG URL for the grade visual.
 * - In Dark Mode: Deep space black #0a0b0f, luminous white stars, bright moons, glowing rings.
 * - In Light Mode: Clean white #ffffff background with the same Electric planet color,
 *   with rings, stars, and moons rendered in sharp, elegant slate tones (#64748b, #94a3b8)
 *   so no auxiliary details are washed out or sunken into the light background.
 */
export function getClassPlanetUrl(gradeOrAgeGroup, color, isDark = false) {
  const key = getGradePlanetKey(gradeOrAgeGroup, color);
  const theme = isDark ? 'dark' : 'light';
  return `/planets/${key}-${theme}.svg`;
}

export function ClassVisual({
  grade,
  ageGroup,
  color,
  size = 48,
  className = '',
  alt = 'Class visual',
  src,
}) {
  const isDark = useIsDarkMode();

  // If a custom non-planet image is passed (e.g. user uploaded avatar), use it directly.
  // Otherwise resolve to the local optimized planet visual for the active theme mode.
  const planetUrl =
    src && !src.includes('dicebear.com/10.x/planets') && !src.includes('/planets/')
      ? src
      : getClassPlanetUrl(grade || ageGroup, color, isDark);

  return (
    <div
      className={cn(
        'relative shrink-0 overflow-hidden rounded-none flex items-center justify-center select-none',
        'bg-[#eff1f7] border border-border/80 dark:bg-[#0a0b0f] dark:border-border/60 transition-colors duration-200',
        className,
      )}
      style={{
        width: size,
        height: size,
      }}
      title={alt}
    >
      <img
        src={planetUrl}
        alt={alt}
        width={size}
        height={size}
        loading="lazy"
        className="w-full h-full object-cover pointer-events-none select-none transition-transform duration-200"
      />
    </div>
  );
}
