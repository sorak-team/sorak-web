import React, { useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Search01Icon,
  Add01Icon,
  Menu01Icon,
  DashboardSquare02Icon,
  SchoolIcon,
  StudentIcon,
} from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAccountStore, getAccountClassTier } from './accounts.store';
import { AccountTable } from './components/AccountTable';
import { AccountGrid } from './components/AccountGrid';
import { AccountColumnsDropdown } from './components/AccountColumnsDropdown';
import { AccountFilterDropdown } from './components/AccountFilterDropdown';
import { AccountSettingsDrawer } from './components/AccountSettingsDrawer';
import { AddAccountModal } from './components/AddAccountModal';
import { ResetPasswordConfirmModal } from './components/ResetPasswordConfirmModal';
import { TemporaryPasswordModal } from './components/TemporaryPasswordModal';
import { LockAccountConfirmModal } from './components/LockAccountConfirmModal';
import { TablePagination } from '@/shared/components/TablePagination';
import { usePaginationStore } from '@/shared/stores/pagination.store';
import { cn } from '@/shared/lib/utils';

export function AccountsPage() {
  const { t } = useTranslation();
  const pageSize = usePaginationStore((state) => state.pageSize);

  const {
    staffAccounts,
    parentAccounts,
    activeTab,
    setActiveTab,
    viewMode,
    setViewMode,
    searchQuery,
    setSearchQuery,
    statusFilter,
    roleFilter,
    currentPage,
    setCurrentPage,
    openAddModal,
    fetchAccounts,
  } = useAccountStore();

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  // Active dataset
  const currentList = activeTab === 'staff' ? staffAccounts : parentAccounts;


  // Filtered dataset
  const filteredAccounts = useMemo(() => {
    let list = [...currentList];

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((acc) => {
        const matchName = acc.fullName?.toLowerCase().includes(q);
        const matchUsername = acc.username?.toLowerCase().includes(q);
        const matchEmail = acc.email?.toLowerCase().includes(q);
        const matchPhone = acc.phone?.includes(q);
        const matchStudent = acc.studentName?.toLowerCase().includes(q);
        return matchName || matchUsername || matchEmail || matchPhone || matchStudent;
      });
    }

    // Status filter
    if (statusFilter !== 'all') {
      list = list.filter((acc) => acc.accountStatus === statusFilter);
    }

    // Role filter (Tài khoản nhà trường: Ban giám hiệu vs Giáo viên)
    if (activeTab === 'staff' && roleFilter !== 'all') {
      list = list.filter((acc) => {
        if (roleFilter === 'leader') {
          return (
            acc.role === 'leader' ||
            acc.role === 'PRINCIPAL_BGH' ||
            acc.role === 'ADMIN_BGH' ||
            acc.rawRole === 'PRINCIPAL_BGH' ||
            acc.rawRole === 'ADMIN_BGH' ||
            (acc.teacherProfile?.position && acc.teacherProfile.position.toLowerCase().includes('hiệu'))
          );
        }
        if (roleFilter === 'teacher') {
          return (
            acc.role === 'teacher' ||
            acc.role === 'TEACHER_GV' ||
            acc.rawRole === 'TEACHER_GV' ||
            (!acc.rawRole?.includes('BGH') && acc.role !== 'leader')
          );
        }
        return acc.role === roleFilter;
      });
    }

    // Sort accounts
    if (activeTab === 'staff') {
      // Sort staff/teacher accounts by teacher code (teacherCode, employeeCode, or username)
      list.sort((a, b) => {
        const codeA = String(a.teacherCode || a.employeeCode || a.username || '').trim();
        const codeB = String(b.teacherCode || b.employeeCode || b.username || '').trim();
        return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' });
      });
    } else {
      // Sort student accounts by grade (class age tier: Nhà trẻ -> Mầm -> Chồi -> Lá) and student code
      list.sort((a, b) => {
        const tierA = getAccountClassTier(a);
        const tierB = getAccountClassTier(b);
        if (tierA !== tierB) {
          return tierA - tierB;
        }
        const codeA = String(a.studentCode || a.username || '').trim();
        const codeB = String(b.studentCode || b.username || '').trim();
        return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' });
      });
    }

    return list;
  }, [currentList, activeTab, searchQuery, statusFilter, roleFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredAccounts.length / pageSize) || 1;
  const paginatedAccounts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAccounts.slice(start, start + pageSize);
  }, [filteredAccounts, currentPage, pageSize]);

  return (
    <div
      className="w-full flex-1 flex flex-col gap-5 max-w-[1300px] mx-auto text-foreground select-none"
      data-node-id="4211:24870"
      data-name="FE-02A · Accounts · Staff List"
    >
      {/* Page Header (Figma 4212:4132) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Title and Subtitle */}
        <div className="flex flex-col gap-1">
          <h1 className="text-[26px] font-semibold text-foreground tracking-tight">
            {t('account.title', 'Tài khoản')}
          </h1>
          <p className="text-[12px] text-muted-foreground font-normal">
            {t(
              'account.subtitle',
              'Quản lý tài khoản nhà trường và phụ huynh',
            )}
          </p>
        </div>

        {/* View Actions Toolbar (Figma 4212:4136) */}
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
              placeholder={t('account.searchPlaceholder', 'Tìm kiếm...')}
              className="h-8 pl-8 pr-2.5 text-[13px] bg-background border-border rounded-none shadow-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          {/* Columns Dropdown (Visible in List View) */}
          {viewMode === 'list' && <AccountColumnsDropdown />}

          {/* Filter Dropdown */}
          <AccountFilterDropdown />

          {/* View Mode Switcher (Figma 4212:4141 & 4212:4147) */}
          <div className="flex items-center border border-border bg-card rounded-none overflow-hidden h-8">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              title={t('account.listView', 'Dạng bảng')}
              className={cn(
                'size-8 flex items-center justify-center transition-colors cursor-pointer border-r border-border',
                viewMode === 'list'
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
              )}
              data-node-id="4212:4141"
              data-name="List View"
            >
              <HugeiconsIcon icon={Menu01Icon} size={15} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              title={t('account.gridView', 'Dạng lưới')}
              className={cn(
                'size-8 flex items-center justify-center transition-colors cursor-pointer',
                viewMode === 'grid'
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
              )}
              data-node-id="4212:4147"
              data-name="Grid View"
            >
              <HugeiconsIcon icon={DashboardSquare02Icon} size={15} />
            </button>
          </div>

          {/* Add Account Button */}
          <Button
            type="button"
            onClick={openAddModal}
            className="h-8 px-3 text-[13px] font-medium bg-[#1447e6] hover:bg-[#1447e6]/90 text-white rounded-none shadow-none cursor-pointer flex items-center gap-1.5"
            data-node-id="4212:4165"
            data-name="Button · Thêm tài khoản"
          >
            <HugeiconsIcon icon={Add01Icon} size={15} />
            <span>{t('account.addAccount', 'Thêm tài khoản')}</span>
          </Button>
        </div>
      </div>

      {/* Account Type Tabs (Figma 4211:25359) */}
      <div
        className="flex items-center gap-6 border-b border-border text-[14px]"
        data-node-id="4211:25359"
        data-name="Account Type Tabs"
      >
        <button
          type="button"
          onClick={() => setActiveTab('staff')}
          className={cn(
            'relative pb-2.5 font-medium transition-colors cursor-pointer flex items-center gap-2',
            activeTab === 'staff'
              ? 'text-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
          data-node-id="4211:25360"
          data-name="Tab · Nhà trường"
        >
          <HugeiconsIcon icon={SchoolIcon} size={16} />
          <span>{t('account.tabStaff', 'Nhà trường')}</span>
          {activeTab === 'staff' && (
            <div className="absolute bottom-0 inset-x-0 h-[2px] bg-foreground" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('parents')}
          className={cn(
            'relative pb-2.5 font-medium transition-colors cursor-pointer flex items-center gap-2',
            activeTab === 'parents'
              ? 'text-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
          data-node-id="4211:25370"
          data-name="Tab · Phụ huynh"
        >
          <HugeiconsIcon icon={StudentIcon} size={16} />
          <span>{t('account.tabParents', 'Phụ huynh')}</span>
          <span className="text-[11px] font-normal text-muted-foreground bg-muted px-1.5 py-0.5 rounded-none">
            {t('account.parentAccountNote', 'Sử dụng TK HS')}
          </span>
          {activeTab === 'parents' && (
            <div className="absolute bottom-0 inset-x-0 h-[2px] bg-foreground" />
          )}
        </button>
      </div>

      {/* List Heading (Figma 4211:25378) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pt-1">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-[16px] font-semibold text-foreground">
            {activeTab === 'staff'
              ? t('account.staffHeading', 'Tài khoản nhà trường')
              : t('account.parentsHeading', 'Tài khoản phụ huynh')}
          </h2>
          <p className="text-[12px] text-muted-foreground font-normal">
            {activeTab === 'staff'
              ? t(
                  'account.staffDesc',
                  'Tài khoản cán bộ quản lý và giáo viên nhà trường',
                )
              : t(
                  'account.parentsDesc',
                  'Phụ huynh sử dụng tài khoản học sinh để đăng nhập',
                )}
          </p>
        </div>
        <span className="text-[12px] text-muted-foreground font-normal self-start sm:self-center">
          {t('account.accountCount', '{{count}} tài khoản', {
            count: filteredAccounts.length,
          })}
        </span>
      </div>

      {/* Main Content Area: Table View or Grid View */}
      {viewMode === 'list' ? (
        <AccountTable paginatedAccounts={paginatedAccounts} />
      ) : (
        <AccountGrid paginatedAccounts={paginatedAccounts} />
      )}

      {/* Pagination Footer */}
      <TablePagination
        currentPage={currentPage}
        totalItems={filteredAccounts.length}
        onPageChange={setCurrentPage}
        itemLabel={t('account.accountUnit', 'tài khoản')}
      />

      {/* Global Modals & Drawers */}
      <AccountSettingsDrawer />
      <AddAccountModal />
      <ResetPasswordConfirmModal />
      <TemporaryPasswordModal />
      <LockAccountConfirmModal />
    </div>
  );
}
