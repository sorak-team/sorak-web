import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Search01Icon,
  Menu01Icon,
  DashboardSquare02Icon,
  RefreshIcon,
} from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNotificationsManagementStore } from './notifications-management.store';
import { AutomatedNotificationTable } from './components/AutomatedNotificationTable';
import { AutomatedNotificationGrid } from './components/AutomatedNotificationGrid';
import { AutomatedNotificationColumnsDropdown } from './components/AutomatedNotificationColumnsDropdown';
import { AutomatedNotificationFilterDropdown } from './components/AutomatedNotificationFilterDropdown';
import { AutomatedNotificationScenariosTable } from './components/AutomatedNotificationScenariosTable';
import { TablePagination } from '@/shared/components/TablePagination';
import { usePaginationStore } from '@/shared/stores/pagination.store';
import { cn } from '@/shared/lib/utils';
import { toast } from 'sonner';

export function AutomatedNotificationsPage() {
  const { t } = useTranslation();
  const pageSize = usePaginationStore((state) => state.pageSize);

  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState('list');

  const {
    automatedNotifications,
    isAutomatedLoading,
    automatedCategoryFilter,
    automatedRoleFilter,
    automatedStatusFilter,
    fetchAutomatedNotifications,
  } = useNotificationsManagementStore();

  useEffect(() => {
    fetchAutomatedNotifications();
  }, [fetchAutomatedNotifications]);

  // Client-side filtering
  const filteredAutomated = useMemo(() => {
    let list = [...automatedNotifications];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (n) =>
          (n.title && n.title.toLowerCase().includes(q)) ||
          (n.body && n.body.toLowerCase().includes(q)) ||
          (n.recipient?.name && n.recipient.name.toLowerCase().includes(q)) ||
          (n.recipient?.username && n.recipient.username.toLowerCase().includes(q)) ||
          String(n.notificationId || '').toLowerCase().includes(q)
      );
    }

    if (automatedCategoryFilter !== 'all') {
      list = list.filter((n) => {
        const cat = n.metadata?.category || n.category || '';
        return cat.toUpperCase() === automatedCategoryFilter.toUpperCase();
      });
    }

    if (automatedRoleFilter !== 'all') {
      list = list.filter((n) => {
        const role = n.recipient?.role || '';
        const roleCode = n.recipient?.roleCode || '';
        if (automatedRoleFilter === 'PRINCIPAL_BGH') {
          return role.includes('Ban giám hiệu') || roleCode === 'PRINCIPAL_BGH' || roleCode === 'ADMIN_BGH';
        }
        if (automatedRoleFilter === 'TEACHER_GV') {
          return role.includes('Giáo viên') || roleCode === 'TEACHER_GV';
        }
        if (automatedRoleFilter === 'PARENT_PH') {
          return role.includes('Phụ huynh') || roleCode === 'PARENT_PH';
        }
        return true;
      });
    }

    if (automatedStatusFilter !== 'all') {
      if (automatedStatusFilter === 'read') {
        list = list.filter((n) => n.isRead === true);
      } else if (automatedStatusFilter === 'unread') {
        list = list.filter((n) => !n.isRead);
      }
    }

    return list;
  }, [
    automatedNotifications,
    searchQuery,
    automatedCategoryFilter,
    automatedRoleFilter,
    automatedStatusFilter,
  ]);

  // Pagination calculation
  const paginatedAutomated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAutomated.slice(start, start + pageSize);
  }, [filteredAutomated, currentPage, pageSize]);

  return (
    <div
      className="w-full flex-1 flex flex-col gap-5 max-w-[1300px] mx-auto text-foreground select-none"
      data-name="FE · Automated Notifications (Tester View)"
    >
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Title and Subtitle */}
        <div className="flex flex-col gap-1">
          <h1 className="text-[26px] font-semibold text-foreground tracking-tight">
            Thông báo tự động
          </h1>
          <p className="text-[12px] text-muted-foreground font-normal">
            Theo dõi các thông báo tự động phát sinh từ hệ thống
          </p>
        </div>

        {/* View Actions Toolbar */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Search Input */}
          <div className="relative w-[280px] h-8">
            <HugeiconsIcon
              icon={Search01Icon}
              size={15}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Tìm thông báo, người nhận, mã..."
              className="h-8 pl-8 pr-2.5 text-[13px] bg-background border-border rounded-none shadow-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          {/* Columns Dropdown (Visible in List View) */}
          {viewMode === 'list' && <AutomatedNotificationColumnsDropdown />}

          {/* Filter Dropdown */}
          <AutomatedNotificationFilterDropdown />

          {/* View Mode Switcher */}
          <div className="flex items-center border border-border bg-card rounded-none overflow-hidden h-8">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              title="Dạng bảng"
              className={cn(
                'size-8 flex items-center justify-center transition-colors cursor-pointer border-r border-border',
                viewMode === 'list'
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
              )}
              data-name="List View"
            >
              <HugeiconsIcon icon={Menu01Icon} size={15} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              title="Dạng lưới"
              className={cn(
                'size-8 flex items-center justify-center transition-colors cursor-pointer',
                viewMode === 'grid'
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
              )}
              data-name="Grid View"
            >
              <HugeiconsIcon icon={DashboardSquare02Icon} size={15} />
            </button>
          </div>

          {/* Refresh Button */}
          <Button
            type="button"
            variant="outline"
            onClick={async () => {
              await fetchAutomatedNotifications();
              toast.success('Đã làm mới danh sách thông báo tự động');
            }}
            disabled={isAutomatedLoading}
            className="h-8 px-2.5 text-[13px] rounded-none cursor-pointer flex items-center gap-1.5"
            title="Tải lại danh sách"
          >
            <HugeiconsIcon
              icon={RefreshIcon}
              size={14}
              className={cn(isAutomatedLoading && 'animate-spin')}
            />
            <span>Làm mới</span>
          </Button>
        </div>
      </div>

      {/* List Heading */}
      <div className="flex items-center justify-between pt-1">
        <h2 className="text-[16px] font-semibold text-foreground">
          Danh sách thông báo tự động
        </h2>
        <span className="text-[12px] text-muted-foreground font-normal">
          {filteredAutomated.length} thông báo
        </span>
      </div>

      {/* Content: Main Table or Grid View */}
      {viewMode === 'list' ? (
        <AutomatedNotificationTable paginatedNotifications={paginatedAutomated} />
      ) : (
        <AutomatedNotificationGrid paginatedNotifications={paginatedAutomated} />
      )}

      {/* Pagination Footer */}
      <TablePagination
        currentPage={currentPage}
        totalItems={filteredAutomated.length}
        onPageChange={setCurrentPage}
        itemLabel="thông báo"
      />

      {/* Reference table: 22 Notification Scenarios */}
      <AutomatedNotificationScenariosTable />
    </div>
  );
}

export default AutomatedNotificationsPage;

