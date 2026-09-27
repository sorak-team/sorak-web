import React from 'react';
import { cn } from '@/shared/lib/utils';

export function ThemeDonutChart({ item }) {
  // SVG circular stroke calculation
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * 0.25; // 75% filled arc

  return (
    <div className="flex items-center gap-3.5 p-3.5 bg-card border border-border/80 rounded-none shadow-2xs hover:border-primary/40 transition-colors">
      {/* Donut ring container */}
      <div className="relative size-14 shrink-0 flex items-center justify-center">
        <svg className="size-full -rotate-90 transform" viewBox="0 0 60 60">
          <circle
            cx="30"
            cy="30"
            r={radius}
            className="stroke-muted dark:stroke-muted/40"
            strokeWidth="5.5"
            fill="transparent"
          />
          <circle
            cx="30"
            cy="30"
            r={radius}
            className="stroke-[#2563eb] dark:stroke-[#3b82f6] transition-all duration-500 ease-out"
            strokeWidth="5.5"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
          />
        </svg>
        <span className="absolute text-[15px] font-bold text-foreground tracking-tight">
          {item.total}
        </span>
      </div>

      {/* Breakdown details */}
      <div className="flex flex-col min-w-0 flex-1 leading-tight gap-1">
        <span className="text-[13px] font-semibold text-foreground truncate">
          {item.label}
        </span>
        <div className="flex flex-col gap-0.5">
          {item.breakdown?.slice(0, 3).map((line, idx) => (
            <div key={idx} className="flex items-center gap-1.5 text-[11px] text-muted-foreground truncate">
              <span className={cn('size-1.5 rounded-full shrink-0', idx === 0 ? 'bg-[#2563eb]' : idx === 1 ? 'bg-sky-400' : 'bg-slate-300 dark:bg-slate-600')} />
              <span className="truncate">{line}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
