import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  MoreHorizontalIcon,
  ViewIcon,
  Settings01Icon,
  Key01Icon,
  UserBlock01Icon,
  UserCheck01Icon,
} from '@hugeicons/core-free-icons';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useAccountStore, getAccountAvatarUrl } from '../accounts.store';
import { useAuthStore } from '@/features/auth';
import { cn } from '@/shared/lib/utils';

export function AccountTable({ paginatedAccounts }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  const activeTab = useAccountStore((state) => state.activeTab);
  const isLoading = useAccountStore((state) => state.isLoading);
  const isParentTab = activeTab === 'parents';
  const staffVisibleColumns = useAccountStore((state) => state.staffVisibleColumns);
  const studentVisibleColumns = useAccountStore((state) => state.studentVisibleColumns);
  const visibleColumns = isParentTab ? studentVisibleColumns : staffVisibleColumns;

  const openSettingsDrawer = useAccountStore(
    (state) => state.openSettingsDrawer,
  );
  const openResetPasswordConfirm = useAccountStore(
    (state) => state.openResetPasswordConfirm,
  );
  const toggleAccountStatus = useAccountStore(
    (state) => state.toggleAccountStatus,
  );

  const getRoleLabel = (role) => {
    switch (role) {
      case 'leader':
        return t('account.roleLeader', 'Ban giám hiệu');
      case 'admin':
        return t('account.roleAdmin', 'Quản trị viên');
      case 'teacher':
      default:
        return t('account.roleTeacher', 'Giáo viên');
    }
  };

  const getWorkStatusLabel = (workStatus) => {
    switch (workStatus) {
      case 'retired':
        return t('account.workRetired', 'Đã nghỉ việc');
      case 'working':
      default:
        return t('account.workWorking', 'Đang làm việc');
    }
  };

  const getAccountStatusBadge = (accountStatus) => {
    if (accountStatus === 'active') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 text-[12px] font-medium bg-secondary text-secondary-foreground rounded-none">
          {t('account.statusActive', 'Hoạt động')}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 text-[12px] font-medium bg-destructive/10 text-destructive border border-destructive/20 rounded-none">
        {t('account.statusLocked', 'Đã khóa')}
      </span>
    );
  };

  if (!paginatedAccounts || paginatedAccounts.length === 0) {
    return (
      <div className="w-full border border-border bg-card p-12 text-center text-muted-foreground rounded-none">
        <p className="text-[14px]">Không tìm thấy tài khoản nào phù hợp.</p>
      </div>
    );
  }

  return (
    <div
      className="w-full border border-border bg-card rounded-none overflow-x-auto shadow-xs select-none"
      data-node-id="4218:5357"
      data-name="Staff Account Table · Component-based"
    >
      <table className="w-full text-left border-collapse min-w-[850px]">
        {/* Table Header */}
        <thead>
          <tr className="h-10 border-b border-border bg-muted/30 text-[13px] font-medium text-foreground">
            <th className="px-3 min-w-[260px] font-medium">
              {isParentTab
                ? t('account.colStudent', 'Học sinh')
                : t('account.colPerson', 'Cán bộ')}
            </th>

            {/* Staff specific columns */}
            {!isParentTab && visibleColumns.role && (
              <th className="px-3 min-w-[140px] font-medium">
                {t('account.colRole', 'Vai trò hệ thống')}
              </th>
            )}
            {!isParentTab && visibleColumns.workStatus && (
              <th className="px-3 min-w-[130px] font-medium">
                {t('account.colWorkStatus', 'Công tác')}
              </th>
            )}

            {/* Student specific columns */}
            {isParentTab && visibleColumns.studentClass && (
              <th className="px-3 min-w-[140px] font-medium">
                {t('account.colClass', 'Lớp học')}
              </th>
            )}

            {/* Shared columns */}
            {visibleColumns.accountStatus && (
              <th className="px-3 min-w-[130px] font-medium">
                {t('account.colAccountStatus', 'Tài khoản')}
              </th>
            )}
            {visibleColumns.lastLogin && (
              <th className="px-3 min-w-[180px] font-medium">
                {t('account.colLastLogin', 'Đăng nhập gần nhất')}
              </th>
            )}
            <th className="px-3 min-w-[95px] w-[95px] text-right font-medium whitespace-nowrap">
              {t('account.colActions', 'Thao tác')}
            </th>
          </tr>
        </thead>

        {/* Table Body */}
        <tbody className="divide-y divide-border/60">
          {isLoading && paginatedAccounts.length === 0 ? (
            Array.from({ length: 5 }).map((_, idx) => (
              <tr key={idx} className="h-[80px] animate-pulse">
                <td className="px-3">
                  <div className="flex items-center gap-3">
                    <div className="size-8 bg-muted/60 rounded-none shrink-0" />
                    <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                      <div className="h-3.5 w-28 bg-muted/60 rounded-none" />
                      <div className="h-2.5 w-16 bg-muted/40 rounded-none" />
                    </div>
                  </div>
                </td>
                {!isParentTab && visibleColumns.role && (
                  <td className="px-3"><div className="h-5 w-20 bg-muted/50 rounded-none" /></td>
                )}
                {isParentTab && visibleColumns.studentClass && (
                  <td className="px-3"><div className="h-5 w-16 bg-muted/50 rounded-none" /></td>
                )}
                <td className="px-3"><div className="h-3.5 w-24 bg-muted/50 rounded-none" /></td>
                {!isParentTab && visibleColumns.workStatus && (
                  <td className="px-3"><div className="h-5 w-20 bg-muted/50 rounded-none" /></td>
                )}
                {visibleColumns.accountStatus && (
                  <td className="px-3"><div className="h-5 w-20 bg-muted/50 rounded-none" /></td>
                )}
                {visibleColumns.lastLogin && (
                  <td className="px-3"><div className="h-3.5 w-20 bg-muted/50 rounded-none" /></td>
                )}
                <td className="px-3 text-right">
                  <div className="size-7 bg-muted/40 rounded-none ml-auto" />
                </td>
              </tr>
            ))
          ) : paginatedAccounts.length === 0 ? (
            <tr>
              <td colSpan={7} className="py-12 text-center text-muted-foreground text-[13px]">
                {t('common.noData', 'Không có dữ liệu tài khoản')}
              </td>
            </tr>
          ) : (
            paginatedAccounts.map((account) => (
            <tr
              key={account.id}
              className="h-[80px] hover:bg-muted/40 transition-colors group cursor-default"
              data-node-id={`account-row-${account.id}`}
            >
              {/* Person Info */}
              <td className="px-3">
                <div
                  onClick={() => navigate(`/accounts/${account.id}`)}
                  className="flex items-center gap-3 cursor-pointer group/name"
                >
                    <div className="size-8 shrink-0 rounded-none overflow-hidden border border-border/80 bg-primary/10">
                      <img
                        src={
                          account.avatar ||
                          getAccountAvatarUrl(null, account.fullName, account.role || account.rawRole)
                        }
                        alt={account.fullName}
                        className="size-full object-cover"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = getAccountAvatarUrl(null, account.fullName, account.role || account.rawRole);
                        }}
                      />
                    </div>
                    <div className="flex flex-col min-w-0 leading-tight">
                      <span className="text-[14px] font-medium text-foreground group-hover/name:text-primary transition-colors truncate">
                        {account.fullName}
                      </span>
                      {isParentTab ? (
                        <span className="text-[12px] text-muted-foreground truncate font-mono">
                          {(account.studentCode || account.username || '—').toUpperCase()}
                        </span>
                      ) : (
                        <span className="text-[12px] text-muted-foreground truncate">
                          {account.teacherProfile?.position || getRoleLabel(account.role)} · <span className="font-mono">{account.teacherCode || account.teacherProfile?.employeeCode || account.username || '—'}</span>
                        </span>
                      )}
                    </div>
                </div>
              </td>

              {/* Staff: Role */}
              {!isParentTab && visibleColumns.role && (
                <td className="px-3 text-[14px] text-foreground font-normal whitespace-nowrap">
                  {getRoleLabel(account.role)}
                </td>
              )}

              {/* Staff: Work Status */}
              {!isParentTab && visibleColumns.workStatus && (
                <td className="px-3 text-[14px] text-foreground font-normal whitespace-nowrap">
                  {getWorkStatusLabel(account.workStatus)}
                </td>
              )}

              {/* Student: Class */}
              {isParentTab && visibleColumns.studentClass && (
                <td className="px-3 text-[14px] text-foreground font-normal whitespace-nowrap">
                  {account.studentClass || '—'}
                </td>
              )}

              {/* Account Status Badge */}
              {visibleColumns.accountStatus && (
                <td className="px-3 whitespace-nowrap">
                  {getAccountStatusBadge(account.accountStatus)}
                </td>
              )}

              {/* Last Login */}
              {visibleColumns.lastLogin && (
                <td className="px-3 text-[14px] whitespace-nowrap">
                  {account.lastLogin ? (
                    <span className="text-foreground font-normal">
                      {account.lastLogin}
                    </span>
                  ) : (
                    <span className="text-muted-foreground italic text-[13px]">
                      {t('account.neverLoggedIn', 'Chưa từng đăng nhập')}
                    </span>
                  )}
                </td>
              )}

              {/* Row Actions Menu */}
              <td className="px-3 min-w-[95px] w-[95px] text-right whitespace-nowrap">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="size-7 inline-flex items-center justify-center rounded-none text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                      title={t('account.colActions', 'Thao tác')}
                      data-name="Actions · More"
                    >
                      <HugeiconsIcon icon={MoreHorizontalIcon} size={16} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-44 p-1 rounded-none border border-border bg-card shadow-xl z-50 text-foreground"
                  >
                    <DropdownMenuItem
                      onClick={() => navigate(`/accounts/${account.id}`)}
                      className="flex items-center gap-2 h-8 px-2 text-[13px] cursor-pointer rounded-none hover:bg-muted/60"
                    >
                      <HugeiconsIcon icon={ViewIcon} size={15} />
                      <span>{t('account.actionView', 'Xem chi tiết')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => openSettingsDrawer(account.id)}
                      className="flex items-center gap-2 h-8 px-2 text-[13px] cursor-pointer rounded-none hover:bg-muted/60"
                    >
                      <HugeiconsIcon icon={Settings01Icon} size={15} />
                      <span>{t('account.actionSettings', 'Cài đặt')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => openResetPasswordConfirm(account)}
                      className="flex items-center gap-2 h-8 px-2 text-[13px] cursor-pointer rounded-none hover:bg-muted/60"
                    >
                      <HugeiconsIcon icon={Key01Icon} size={15} />
                      <span>{t('account.actionResetPassword', 'Đặt lại mật khẩu')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="my-1 border-t border-border" />
                    <DropdownMenuItem
                      onClick={() => toggleAccountStatus(account.id)}
                      className="flex items-center gap-2 h-8 px-2 text-[13px] cursor-pointer rounded-none hover:bg-muted/60"
                    >
                      <HugeiconsIcon
                        icon={account.accountStatus === 'active' ? UserBlock01Icon : UserCheck01Icon}
                        size={15}
                      />
                      <span>
                        {account.accountStatus === 'active'
                          ? t('account.actionLock', 'Khóa tài khoản')
                          : t('account.actionUnlock', 'Mở khóa tài khoản')}
                      </span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </td>
            </tr>
          ))
        )}
        </tbody>
      </table>
    </div>
  );
}
