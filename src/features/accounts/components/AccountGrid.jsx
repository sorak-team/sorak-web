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
import { toast } from 'sonner';
import { useAccountStore, getAccountAvatarUrl } from '../accounts.store';
import { useAuthStore } from '@/features/auth';
import { cn } from '@/shared/lib/utils';

export function AccountGrid({ paginatedAccounts }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  const activeTab = useAccountStore((state) => state.activeTab);
  const isLoading = useAccountStore((state) => state.isLoading);
  const isParentTab = activeTab === 'parents';
  const openSettingsDrawer = useAccountStore(
    (state) => state.openSettingsDrawer,
  );
  const openResetPasswordConfirm = useAccountStore(
    (state) => state.openResetPasswordConfirm,
  );
  const toggleAccountStatus = useAccountStore(
    (state) => state.toggleAccountStatus,
  );
  const openLockConfirm = useAccountStore(
    (state) => state.openLockConfirm,
  );

  const isAccountSelf = (acc) => Boolean(
    user &&
    acc &&
    (
      String(user.id) === String(acc.id) ||
      (user.accountId && String(user.accountId) === String(acc.id)) ||
      (user.username && acc.username && user.username.toLowerCase() === acc.username.toLowerCase()) ||
      (user.identifier && acc.username && user.identifier.toLowerCase() === acc.username.toLowerCase())
    )
  );

  const getRoleBadge = (role) => {
    switch (role) {
      case 'leader':
        return (
          <span className="inline-flex items-center px-2 py-0.5 text-[12px] font-medium bg-secondary text-secondary-foreground rounded-none">
            {t('account.roleLeader', 'Ban giám hiệu')}
          </span>
        );
      case 'admin':
        return (
          <span className="inline-flex items-center px-2 py-0.5 text-[12px] font-medium bg-primary/10 text-primary rounded-none">
            {t('account.roleAdmin', 'Quản trị viên')}
          </span>
        );
      case 'teacher':
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 text-[12px] font-medium bg-muted text-foreground rounded-none">
            {t('account.roleTeacher', 'Giáo viên')}
          </span>
        );
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

  if (isLoading && (!paginatedAccounts || paginatedAccounts.length === 0)) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 select-none">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div key={idx} className="border border-border bg-card p-5 rounded-none shadow-xs animate-pulse flex flex-col justify-between gap-4 h-[180px]">
            <div className="flex items-center gap-3.5">
              <div className="size-12 rounded-none bg-muted/60 shrink-0" />
              <div className="flex flex-col gap-2 flex-1">
                <div className="h-4 w-32 bg-muted/60 rounded-none" />
                <div className="h-3 w-20 bg-muted/40 rounded-none" />
              </div>
            </div>
            <div className="h-6 w-24 bg-muted/50 rounded-none" />
          </div>
        ))}
      </div>
    );
  }

  if (!paginatedAccounts || paginatedAccounts.length === 0) {
    return (
      <div className="w-full border border-border bg-card p-12 text-center text-muted-foreground rounded-none">
        <p className="text-[14px]">Không tìm thấy tài khoản nào phù hợp.</p>
      </div>
    );
  }

  return (
    <div
      className="grid grid-cols-1 md:grid-cols-2 gap-4 select-none"
      data-node-id="4211:25930"
      data-name="Staff Account Grid"
    >
      {paginatedAccounts.map((account) => (
        <div
          key={account.id}
          className="border border-border bg-card p-5 rounded-none shadow-xs hover:border-border/90 transition-all flex flex-col justify-between gap-4 group"
          data-node-id={`account-card-${account.id}`}
        >
          {/* Top Section: Avatar + Name */}
          <div
            onClick={() => navigate(`/accounts/${account.id}`)}
            className="flex items-center gap-3.5 cursor-pointer"
          >
            <div className="size-12 rounded-none overflow-hidden border border-border/80 bg-primary/10 shrink-0">
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
              <span className="text-[15px] font-medium text-foreground group-hover:text-primary transition-colors truncate">
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

          {/* Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            {!isParentTab && getRoleBadge(account.role)}
            {getAccountStatusBadge(account.accountStatus)}
          </div>

          <div className="h-px bg-border/60" />

          {/* Meta bottom */}
          <div className="flex items-center justify-between gap-2 pt-1 text-[13px]">
            <div className="flex flex-col leading-tight">
              <span className="text-[11px] text-muted-foreground">
                {isParentTab
                  ? t('account.colClass', 'Lớp học')
                  : t('account.colWorkStatus', 'Công tác')}
              </span>
              <span className="text-[13px] font-medium text-foreground truncate max-w-[170px]">
                {isParentTab
                  ? (account.studentClass || '—')
                  : account.workStatus === 'retired'
                    ? t('account.workRetired', 'Đã nghỉ việc')
                    : t('account.workWorking', 'Đang làm việc')}
              </span>
            </div>

            <div className="flex flex-col leading-tight">
              <span className="text-[11px] text-muted-foreground">
                {t('account.colLastLogin', 'Đăng nhập gần nhất')}
              </span>
              <span className="text-[13px] text-foreground font-normal">
                {account.lastLogin || (
                  <span className="text-muted-foreground italic text-[12px]">
                    {t('account.neverLoggedIn', 'Chưa từng đăng nhập')}
                  </span>
                )}
              </span>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="size-7 inline-flex items-center justify-center rounded-none text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                  title={t('account.colActions', 'Thao tác')}
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
                  disabled={isAccountSelf(account)}
                  onClick={() => {
                    if (isAccountSelf(account)) {
                      toast.error('Bạn không thể đặt lại mật khẩu cho chính mình tại chức năng quản lý tài khoản. Vui lòng sử dụng chức năng Đổi mật khẩu.');
                      return;
                    }
                    openResetPasswordConfirm(account);
                  }}
                  className={cn(
                    "flex items-center gap-2 h-8 px-2 text-[13px] rounded-none",
                    isAccountSelf(account) ? "opacity-50 cursor-not-allowed text-muted-foreground" : "cursor-pointer hover:bg-muted/60"
                  )}
                >
                  <HugeiconsIcon icon={Key01Icon} size={15} />
                  <span>{t('account.actionResetPassword', 'Đặt lại mật khẩu')}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="my-1 border-t border-border" />
                <DropdownMenuItem
                  onClick={() => {
                    if (isAccountSelf(account)) {
                      toast.error('Không thể tự khóa tài khoản của chính mình');
                      return;
                    }
                    if (account.accountStatus === 'active') {
                      openLockConfirm(account);
                    } else {
                      toggleAccountStatus(account.id)
                        .then(() => toast.success('Đã mở khóa tài khoản thành công'))
                        .catch((err) => toast.error(err.message || 'Mở khóa tài khoản thất bại'));
                    }
                  }}
                  disabled={isAccountSelf(account)}
                  className="flex items-center gap-2 h-8 px-2 text-[13px] cursor-pointer rounded-none hover:bg-muted/60 disabled:opacity-40 disabled:cursor-not-allowed"
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
          </div>
        </div>
      ))}
    </div>
  );
}
