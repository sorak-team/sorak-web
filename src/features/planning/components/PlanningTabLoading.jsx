import React from 'react';

export function PlanningTabLoading({ message = 'Đang tải dữ liệu kế hoạch giáo dục...' }) {
  return (
    <div className="w-full flex-1 h-[calc(100vh-104px)] lg:h-[calc(100vh-120px)] flex flex-col items-center justify-center p-12 select-none bg-background">
      <div className="size-7 border-2 border-muted-foreground/30 border-t-[#1447e6] rounded-full animate-spin mb-3.5" />
      <span className="text-[13px] font-medium text-muted-foreground tracking-tight">
        {message}
      </span>
    </div>
  );
}

export default PlanningTabLoading;

