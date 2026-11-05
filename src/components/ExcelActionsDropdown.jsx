import React from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  FileSpreadsheetIcon,
  Download01Icon,
  Upload01Icon,
} from '@hugeicons/core-free-icons';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

export function ExcelActionsDropdown({
  onExport,
  onImport,
  isExporting = false,
  showImport = true,
  exportLabel = 'Xuất tệp Excel',
  importLabel = 'Nhập tệp Excel',
  extraItems = null,
  trigger = null,
  align = 'end',
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {trigger || (
          <button
            type="button"
            title="Thao tác Excel"
            className="size-8 flex items-center justify-center bg-background border border-border text-foreground hover:bg-muted/50 rounded-none transition-colors cursor-pointer select-none"
            data-name="Excel Actions Dropdown"
          >
            <HugeiconsIcon icon={FileSpreadsheetIcon} size={15} className="text-muted-foreground" />
          </button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        sideOffset={4}
        className="min-w-[150px] p-1 rounded-none border border-border bg-card shadow-xl z-50 text-foreground"
      >
        {onExport && (
          <DropdownMenuItem
            onClick={onExport}
            disabled={isExporting}
            className="flex items-center gap-2 h-8 px-2 text-[13px] cursor-pointer rounded-none hover:bg-muted/60 whitespace-nowrap text-foreground"
          >
            <HugeiconsIcon icon={Download01Icon} size={15} className="text-muted-foreground shrink-0" />
            <span>{isExporting ? 'Đang xuất tệp...' : exportLabel}</span>
          </DropdownMenuItem>
        )}

        {extraItems}

        {showImport && onImport && (
          <DropdownMenuItem
            onClick={onImport}
            className="flex items-center gap-2 h-8 px-2 text-[13px] cursor-pointer rounded-none hover:bg-muted/60 whitespace-nowrap text-foreground"
          >
            <HugeiconsIcon icon={Upload01Icon} size={15} className="text-muted-foreground shrink-0" />
            <span>{importLabel}</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default ExcelActionsDropdown;
