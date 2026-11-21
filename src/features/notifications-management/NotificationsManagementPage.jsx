import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Search01Icon,
  Add01Icon,
  Menu01Icon,
  DashboardSquare02Icon,
  RefreshIcon,
} from '@hugeicons/core-free-icons';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNotificationsManagementStore } from './notifications-management.store';
import { NotificationTable } from './components/NotificationTable';
import { NotificationGrid } from './components/NotificationGrid';
import { NotificationColumnsDropdown } from './components/NotificationColumnsDropdown';
import { NotificationFilterDropdown } from './components/NotificationFilterDropdown';
import { NotificationDrawer } from './components/NotificationDrawer';
import { DeleteNotificationDialog } from './components/DeleteNotificationDialog';
import { TablePagination } from '@/shared/components/TablePagination';
import { usePaginationStore } from '@/shared/stores/pagination.store';
import { cn } from '@/shared/lib/utils';

export function NotificationsManagementPage() {
  const { t } = useTranslation();
  const pageSize = usePaginationStore((state) => state.pageSize);

  const {
    broadcasts,
    isLoading,
    viewMode,
    setViewMode,
    searchQuery,
    setSearchQuery,
    scopeFilter,
    statusFilter,
    currentPage,
    setCurrentPage,
    openCreateDrawer,
    fetchBroadcasts,
  } = useNotificationsManagementStore();

  useEffect(() => {
    fetchBroadcasts();
  }, [fetchBroadcasts]);

  // Client-side filtering matching the search & filter controls
  const filteredBroadcasts = useMemo(() => {
    let list = [...broadcasts];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.body.toLowerCase().includes(q) ||
          (b.targetGrade && b.targetGrade.toLowerCase().includes(q)),
      );
    }

    if (scopeFilter !== 'all') {
      list = list.filter((b) => b.targetScope === scopeFilter);
    }

    if (statusFilter !== 'all') {
      list = list.filter((b) => b.status === statusFilter);
    }

    return list;
  }, [broadcasts, searchQuery, scopeFilter, statusFilter]);

  // Pagination calculation
  const paginatedBroadcasts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredBroadcasts.slice(start, start + pageSize);
  }, [filteredBroadcasts, currentPage, pageSize]);

  return (
    <div
      className="w-full flex-1 flex flex-col gap-5 max-w-[1300px] mx-auto text-foreground select-none"
      data-name="FE · Notifications · List"
    >
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Title and Subtitle */}
        <div className="flex flex-col gap-1">
          <h1 className="text-[26px] font-semibold text-foreground tracking-tight">
            Bản tin
          </h1>
          <p className="text-[12px] text-muted-foreground font-normal">
            Quản lý và phát hành bản tin toàn trường, theo khối, lớp tới giáo viên và phụ huynh
          </p>
        </div>

        {/* View Actions Toolbar */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Search Input */}
          <div className="relative w-[260px] h-8">
            <HugeiconsIcon
              icon={Search01Icon}
              size={15}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('notifications.management.searchPlaceholder', 'Tìm kiếm bản tin...')}
              className="h-8 pl-8 pr-2.5 text-[13px] bg-background border-border rounded-none shadow-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          {/* Columns Dropdown (Visible in List View) */}
          {viewMode === 'list' && <NotificationColumnsDropdown />}

          {/* Filter Dropdown */}
          <NotificationFilterDropdown />

          {/* View Mode Switcher */}
          <div className="flex items-center border border-border bg-card rounded-none overflow-hidden h-8">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              title={t('common.tableView', 'Dạng bảng')}
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
              title={t('common.gridView', 'Dạng lưới')}
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
              await fetchBroadcasts();
              toast.success(t('notifications.management.refreshSuccess', 'Đã làm mới danh sách bản tin'));
            }}
            disabled={isLoading}
            className="h-8 px-2.5 text-[13px] rounded-none cursor-pointer flex items-center gap-1.5"
            title={t('notifications.management.reloadTitle', 'Tải lại danh sách bản tin')}
          >
            <HugeiconsIcon
              icon={RefreshIcon}
              size={14}
              className={cn(isLoading && 'animate-spin')}
            />
            <span>{t('notifications.management.refresh', 'Làm mới')}</span>
          </Button>

          {/* Add Notification Button */}
          <Button
            type="button"
            onClick={openCreateDrawer}
            className="h-8 px-3 text-[13px] font-medium bg-[#1447e6] hover:bg-[#1447e6]/90 text-white rounded-none shadow-none cursor-pointer flex items-center gap-1.5"
            data-name="Button · Tạo bản tin"
          >
            <HugeiconsIcon icon={Add01Icon} size={15} />
            <span>{t('notifications.management.createBtn', 'Tạo bản tin')}</span>
          </Button>
        </div>
      </div>

      {/* List Heading */}
      <div className="flex items-center justify-between pt-1">
        <h2 className="text-[16px] font-semibold text-foreground">
          {t('notifications.management.title', 'Danh sách bản tin')}
        </h2>
        <span className="text-[12px] text-muted-foreground font-normal">
          {t('notifications.management.countLabel', { count: filteredBroadcasts.length, defaultValue: `${filteredBroadcasts.length} bản tin` })}
        </span>
      </div>

      {/* Content: Main Table or Grid View */}
      {viewMode === 'list' ? (
        <NotificationTable paginatedBroadcasts={paginatedBroadcasts} />
      ) : (
        <NotificationGrid paginatedBroadcasts={paginatedBroadcasts} />
      )}

      {/* Pagination Footer */}
      <TablePagination
        currentPage={currentPage}
        totalItems={filteredBroadcasts.length}
        onPageChange={setCurrentPage}
        itemLabel={t('notifications.management.itemLabel', 'bản tin')}
      />

      {/* Global Slide-in Drawer & Action Modals */}
      <NotificationDrawer />
      <DeleteNotificationDialog />
    </div>
  );
}

export default NotificationsManagementPage;
