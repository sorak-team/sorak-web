import React from 'react';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Copy01Icon,
  Edit01Icon,
  PlusSignIcon,
  FileExportIcon,
} from '@hugeicons/core-free-icons';

export function RecentActivityList({ activities = [] }) {
  const { t } = useTranslation();
  const getIcon = (type) => {
    switch (type) {
      case 'CLONE':
        return Copy01Icon;
      case 'RENAME':
      case 'UPDATE':
        return Edit01Icon;
      case 'CREATE':
        return PlusSignIcon;
      case 'ARCHIVE':
      case 'PUBLISH':
      default:
        return FileExportIcon;
    }
  };

  return (
    <div className="border border-border bg-card p-4 rounded-none flex flex-col gap-3 shadow-2xs">
      <div className="flex flex-col gap-0.5">
        <h3 className="text-[13.5px] font-semibold text-foreground">
          {t('curriculum.recentActivity', 'Hoạt động gần đây')}
        </h3>
        <span className="text-[11.5px] text-muted-foreground font-normal">
          {t('curriculum.latestChanges', 'Thay đổi mới nhất')}
        </span>
      </div>

      <div className="divide-y divide-border/60">
        {activities.map((act) => {
          const Icon = getIcon(act.type);
          return (
            <div key={act.id} className="py-2.5 flex items-start gap-2.5 first:pt-1 last:pb-1">
              <div className="size-6 rounded-none bg-muted flex items-center justify-center text-muted-foreground shrink-0 mt-0.5">
                <HugeiconsIcon icon={Icon} size={13} />
              </div>
              <div className="flex flex-col min-w-0 leading-tight">
                <span className="text-[12.5px] font-medium text-foreground truncate">
                  {act.text}
                </span>
                <span className="text-[11px] text-muted-foreground mt-0.5">
                  {act.time}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
