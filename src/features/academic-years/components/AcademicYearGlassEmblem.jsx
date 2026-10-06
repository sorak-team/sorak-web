import React from 'react';
import { cn } from '@/shared/lib/utils';
import { getSchoolYearInfo } from '../academic-years.store';

// Color themes matching Figma FE-03 designs and DiceBear Glass palettes
export const THEME_STYLES = {
  blue: {
    bg: 'from-[#38BDF8] via-[#60A5FA] to-[#2563EB]',
    shapeA: '#93C5FD',
    shapeB: '#FFFFFF',
    border: 'border-[#60A5FA]/40',
  },
  teal: {
    bg: 'from-[#0D9488] via-[#14B8A6] to-[#2DD4BF]',
    shapeA: '#5EEAD4',
    shapeB: '#FFFFFF',
    border: 'border-[#14B8A6]/40',
  },
  orange: {
    bg: 'from-[#EA580C] via-[#F97316] to-[#FB923C]',
    shapeA: '#FDBA74',
    shapeB: '#FFFFFF',
    border: 'border-[#F97316]/40',
  },
  pink: {
    bg: 'from-[#FF6B8B] via-[#FF8E53] to-[#FF4B72]',
    shapeA: '#FFA8C5',
    shapeB: '#FFFFFF',
    border: 'border-[#FFA8B8]/40',
  },
  purple: {
    bg: 'from-[#D946EF] via-[#A855F7] to-[#8B5CF6]',
    shapeA: '#F0ABFC',
    shapeB: '#FFFFFF',
    border: 'border-[#E879F9]/40',
  },
  lime: {
    bg: 'from-[#84CC16] via-[#A3E635] to-[#4ADE80]',
    shapeA: '#BEF264',
    shapeB: '#FFFFFF',
    border: 'border-[#A3E635]/40',
  },
  amber: {
    bg: 'from-[#D97706] via-[#F59E0B] to-[#FBBF24]',
    shapeA: '#FDE68A',
    shapeB: '#FFFFFF',
    border: 'border-[#F59E0B]/40',
  },
  rose: {
    bg: 'from-[#BE123C] via-[#E11D48] to-[#FB7185]',
    shapeA: '#FECDD3',
    shapeB: '#FFFFFF',
    border: 'border-[#FB7185]/40',
  },
  indigo: {
    bg: 'from-[#3730A3] via-[#4F46E5] to-[#818CF8]',
    shapeA: '#C7D2FE',
    shapeB: '#FFFFFF',
    border: 'border-[#818CF8]/40',
  },
  emerald: {
    bg: 'from-[#047857] via-[#059669] to-[#34D399]',
    shapeA: '#A7F3D0',
    shapeB: '#FFFFFF',
    border: 'border-[#34D399]/40',
  },
};

export function AcademicYearGlassEmblem({
  theme,
  size = 56, // 32, 56, 72, 80
  className,
  avatarUrl,
  year,
  alt = '',
}) {
  const info = getSchoolYearInfo(year || avatarUrl || theme);
  const effectiveTheme = (theme && THEME_STYLES[theme]) ? theme : (info.theme || 'blue');
  const currentTheme = THEME_STYLES[effectiveTheme] || THEME_STYLES.blue;
  const rawAvatar =
    avatarUrl && (avatarUrl.includes('backgroundColor=') || avatarUrl.includes('/glass/'))
      ? avatarUrl
      : info.avatarUrl;
  const resolvedAvatar = rawAvatar
    ? rawAvatar
        .replace('/blobs/', '/glass/')
        .replace(/[?&]tags=animation/g, '')
        .replace(/\?&/g, '?')
    : '';

  return (
    <div
      style={{ width: size, height: size }}
      className={cn(
        'relative overflow-hidden rounded-none shrink-0 select-none shadow-sm',
        'border border-border/50',
        className,
      )}
    >
      {/* Primary background: DiceBear Glass (Electric preset) artwork if available, otherwise theme gradient */}
      {resolvedAvatar ? (
        <img
          src={resolvedAvatar}
          alt={alt}
          className="absolute inset-0 size-full object-cover"
        />
      ) : (
        <div
          className={cn(
            'absolute inset-0 bg-gradient-to-br transition-all duration-300',
            currentTheme.bg,
          )}
        />
      )}

      {/* Screen blended glass reflection layer 1 */}
      <div
        className="absolute inset-0 opacity-30 mix-blend-screen pointer-events-none"
        style={{
          background: `radial-gradient(circle at 30% 20%, ${currentTheme.shapeA} 0%, transparent 60%)`,
        }}
      />

      {/* Screen blended glass reflection layer 2 */}
      <div
        className="absolute inset-0 opacity-40 mix-blend-screen pointer-events-none"
        style={{
          background: `radial-gradient(circle at 80% 80%, ${currentTheme.shapeB} 0%, transparent 50%)`,
        }}
      />

      {/* Glass diagonal glare */}
      <div
        className="absolute -inset-[50%] opacity-25 mix-blend-overlay rotate-45 pointer-events-none"
        style={{
          background:
            'linear-gradient(to right, transparent, rgba(255,255,255,0.8), transparent)',
        }}
      />

      {/* Inner border subtle glass highlight */}
      <div className="absolute inset-0 border border-white/20 pointer-events-none" />
    </div>
  );
}
