import React, { useMemo } from 'react';
import { cn } from '@/shared/lib/utils';

// Pre-defined tasteful accent positions across the 45x8 grid
const DEFAULT_ACCENT_INDICES = new Set([
  18, 42, 65, 98, 115, 142, 175, 210, 238, 255, 289, 320,
]);

/**
 * Lightweight CSS Grid Pattern background for Hero sections
 * Implements Lyra / Sorak design tokens with 45px cells and smooth radial-gradient fade.
 */
export function HeroGridPattern({ className, accentIndices = DEFAULT_ACCENT_INDICES }) {
  // Memoize cells to avoid re-calculating on re-renders
  const cells = useMemo(() => {
    const list = [];
    const total = 45 * 8; // 360 cells
    for (let i = 0; i < total; i++) {
      const isAccent = accentIndices.has ? accentIndices.has(i) : accentIndices.includes(i);
      list.push(
        <div
          key={i}
          className={cn('grid-cell', isAccent && 'is-accent')}
        />
      );
    }
    return list;
  }, [accentIndices]);

  return (
    <div
      aria-hidden="true"
      className={cn(
        'absolute inset-0 overflow-hidden pointer-events-none select-none z-0',
        className
      )}
    >
      <div className="grid-pattern">{cells}</div>
    </div>
  );
}

export default HeroGridPattern;
