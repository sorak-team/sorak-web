import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { HugeiconsIcon } from '@hugeicons/react';
import { Cancel01Icon, Key01Icon } from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { useAccountStore } from '../accounts.store';
import { useAuthStore } from '@/features/auth';
import { cn } from '@/shared/lib/utils';

export function AccountSettingsDrawer() {
  const { t } = useTranslation();
  const currentUser = useAuthStore((state) => state.user);
  const isSettingsDrawerOpen = useAccountStore(
    (state) => state.isSettingsDrawerOpen,
  );
  const selectedAccountId = useAccountStore(
    (state) => state.selectedAccountId,
  );
  const staffAccounts = useAccountStore((state) => state.staffAccounts);
  const parentAccounts = useAccountStore((state) => state.parentAccounts);
  const closeSettingsDrawer = useAccountStore(
    (state) => state.closeSettingsDrawer,
  );
  const updateAccountRole = useAccountStore(
    (state) => state.updateAccountRole,
  );
  const toggleAccountStatus = useAccountStore(
    (state) => state.toggleAccountStatus,
  );
  const openResetPasswordConfirm = useAccountStore(
    (state) => state.openResetPasswordConfirm,
  );
  const openLockConfirm = useAccountStore(
    (state) => state.openLockConfirm,
  );

  const isStaff = staffAccounts.some((item) => item.id === selectedAccountId);
  const account =
    staffAccounts.find((item) => item.id === selectedAccountId) ||
    parentAccounts.find((item) => item.id === selectedAccountId);

  const isSelf = Boolean(
    currentUser &&
    account &&
    (
      String(currentUser.id) === String(account.id) ||
      (currentUser.accountId && String(currentUser.accountId) === String(account.id)) ||
      (currentUser.username && account.username && currentUser.username.toLowerCase() === account.username.toLowerCase()) ||
      (currentUser.identifier && account.username && currentUser.identifier.toLowerCase() === account.username.toLowerCase())
    )
  );

  const [role, setRole] = useState('teacher');

  useEffect(() => {
    if (account) {
      setRole(account.role || 'teacher');
    }
  }, [account]);

  if (!isSettingsDrawerOpen || !account) return null;

  const handleSave = async () => {
    if (isStaff && role !== account.role) {
      if (isSelf) {
        toast.error('Không được tự đổi role cho chính tài khoản của mình');
        return;
      }
      try {
        await updateAccountRole(account.id, role);
        toast.success(
          t('account.toastRoleUpdated', 'Cập nhật vai trò thành công', {
            name: account.fullName,
          }),
        );
        closeSettingsDrawer();
      } catch (err) {
        toast.error(err.message || 'Cập nhật vai trò thất bại');
      }
    } else {
      closeSettingsDrawer();
    }
  };

  const handleToggleStatus = async () => {
    if (isSelf) {
      toast.error('Không thể tự khóa tài khoản của chính mình');
      return;
    }
    if (account.accountStatus === 'active') {
      openLockConfirm(account);
    } else {
      try {
        await toggleAccountStatus(account.id);
        toast.success('Đã mở khóa tài khoản thành công');
      } catch (err) {
        toast.error(err.message || 'Thao tác thất bại');
      }
    }
  };

  const getStatusBadge = (status) => {
    if (status === 'active') {
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

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        onClick={closeSettingsDrawer}
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in-0 duration-200"
      />

      {/* Drawer Panel matching Figma FE-02D (node 4211:26440) */}
      <div
        className={cn(
          'relative w-full max-w-[560px] h-full bg-card border-l border-border shadow-2xl flex flex-col',
          'animate-in slide-in-from-right duration-250 ease-out z-10 text-foreground',
        )}
        data-node-id="4211:26691"
        data-name="Account Settings Sidebar"
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-border shrink-0">
          <div className="flex flex-col gap-1">
            <h2 className="text-[18px] font-semibold text-foreground tracking-tight">
              {t('account.settingsTitle', 'Cài đặt tài khoản')}
            </h2>
            <p className="text-[12px] text-muted-foreground font-normal">
              {t(
                'account.settingsSub',
                'Quản lý quyền truy cập và bảo mật của {{name}}',
                { name: account.fullName },
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={closeSettingsDrawer}
            className="size-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-none transition-colors cursor-pointer"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Card 1: Quyền truy cập (Staff only) */}
          {isStaff && (
            <div
              className="border border-border bg-card rounded-none overflow-hidden"
              data-node-id="4221:5620"
              data-name="Card · Quyền truy cập"
            >
              <div className="p-4 border-b border-border bg-muted/20">
                <h3 className="text-[14px] font-semibold text-foreground">
                  {t('account.accessRoleTitle', 'Quyền truy cập')}
                </h3>
                <p className="text-[12px] text-muted-foreground font-normal">
                  {t(
                    'account.accessRoleSub',
                    'Vai trò của tài khoản trong hệ thống nhà trường',
                  )}
                </p>
              </div>

              <div className="p-4 space-y-2">
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  disabled={isSelf}
                  className="h-9 w-full px-3 text-[13px] bg-background border border-border rounded-none text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="teacher">
                    {t('account.roleTeacher', 'Giáo viên')}
                  </option>
                  <option value="leader">
                    {t('account.roleLeader', 'Ban giám hiệu')}
                  </option>
                </select>
                {isSelf && (
                  <p className="text-[11px] text-destructive font-medium">
                    * Không được tự đổi vai trò cho chính tài khoản của mình.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Card 2: Mật khẩu */}
          <div
            className="border border-border bg-card rounded-none overflow-hidden"
            data-node-id="4221:5640"
            data-name="Card · Mật khẩu"
          >
            <div className="p-4 border-b border-border bg-muted/20">
              <h3 className="text-[14px] font-semibold text-foreground">
                {t('account.passwordTitle', 'Mật khẩu')}
              </h3>
              <p className="text-[12px] text-muted-foreground font-normal">
                {t('account.passwordSub', 'Mật khẩu hiện tại không thể xem lại')}
              </p>
            </div>

            <div className="p-4 flex items-center justify-between gap-4">
              <div className="flex flex-col">
                <span className="font-mono text-[14px] tracking-wider text-foreground">
                  ••••••••••••
                </span>
                <span className="text-[12px] text-muted-foreground">
                  {t(
                    'account.passwordResetNote',
                    'Reset sẽ tạo mật khẩu tạm mới',
                  )}
                </span>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  closeSettingsDrawer();
                  openResetPasswordConfirm(account);
                }}
                className="h-8 px-3 text-[13px] rounded-none border-border hover:bg-muted cursor-pointer flex items-center gap-1.5"
                data-node-id="4221:5657"
              >
                <HugeiconsIcon icon={Key01Icon} size={14} />
                <span>{t('account.resetPasswordBtn', 'Đặt lại mật khẩu')}</span>
              </Button>
            </div>
          </div>

          {/* Card 3: Trạng thái tài khoản */}
          <div
            className="border border-border bg-card rounded-none overflow-hidden"
            data-node-id="4221:5693"
            data-name="Card · Trạng thái tài khoản"
          >
            <div className="p-4 border-b border-border bg-muted/20">
              <h3 className="text-[14px] font-semibold text-foreground">
                {t('account.statusTitle', 'Trạng thái tài khoản')}
              </h3>
              <p className="text-[12px] text-muted-foreground font-normal">
                {t(
                  'account.statusSub',
                  'Kiểm soát quyền đăng nhập của người dùng',
                )}
              </p>
            </div>

            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div>{getStatusBadge(account.accountStatus)}</div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleToggleStatus}
                  disabled={isSelf}
                  className="h-8 px-3 text-[13px] rounded-none border-border hover:bg-muted cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  data-node-id="4221:5717"
                >
                  {account.accountStatus === 'active'
                    ? t('account.lockBtn', 'Khóa tài khoản')
                    : t('account.unlockBtn', 'Mở khóa tài khoản')}
                </Button>
              </div>

              {isSelf && (
                <p className="text-[11px] text-destructive font-medium">
                  * Không thể tự khóa tài khoản của chính mình.
                </p>
              )}

              <p className="text-[12px] text-muted-foreground leading-normal">
                {t(
                  'account.lockNote',
                  'Người dùng sẽ không thể đăng nhập khi tài khoản bị khóa.',
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border shrink-0 bg-background">
          <Button
            type="button"
            variant="outline"
            onClick={closeSettingsDrawer}
            className="h-8 px-4 text-[13px] rounded-none border-border cursor-pointer"
          >
            {t('account.cancel', 'Hủy')}
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            className="h-8 px-5 text-[13px] rounded-none bg-[#1447e6] hover:bg-[#1447e6]/90 text-white cursor-pointer"
            data-node-id="4221:5737"
          >
            {t('account.save', 'Lưu')}
          </Button>
        </div>
      </div>
    </div>
  );
}
