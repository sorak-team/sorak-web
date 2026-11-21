import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArrowLeft01Icon,
  Settings01Icon,
  AlertCircleIcon,
  UserLock01Icon,
} from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { useAccountStore, getAccountAvatarUrl } from './accounts.store';
import { getStudentAvatarUrl } from '@/features/students/students.store';
import { useAuthStore } from '@/features/auth';
import { AccountSettingsDrawer } from './components/AccountSettingsDrawer';
import { ResetPasswordConfirmModal } from './components/ResetPasswordConfirmModal';
import { TemporaryPasswordModal } from './components/TemporaryPasswordModal';
import { LockAccountConfirmModal } from './components/LockAccountConfirmModal';
import { NotFoundPage } from '@/features/error';
import { cn } from '@/shared/lib/utils';

export function AccountOverviewPage() {
  const { id } = useParams();

  if (id && /^\d+$/.test(String(id).trim())) {
    return <NotFoundPage />;
  }

  const navigate = useNavigate();
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);

  const staffAccounts = useAccountStore((state) => state.staffAccounts);
  const parentAccounts = useAccountStore((state) => state.parentAccounts);
  const isLoading = useAccountStore((state) => state.isLoading);
  const fetchAccounts = useAccountStore((state) => state.fetchAccounts);
  const openSettingsDrawer = useAccountStore((state) => state.openSettingsDrawer);
  const toggleAccountStatus = useAccountStore((state) => state.toggleAccountStatus);
  const openLockConfirm = useAccountStore((state) => state.openLockConfirm);

  React.useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  // Find account from staff or parent
  const account =
    staffAccounts.find((a) => a.id === id || a.username === id) ||
    parentAccounts.find((a) => a.id === id || a.username === id);
  const isStaff =
    staffAccounts.some((a) => a.id === account?.id) ||
    account?.role === 'teacher' ||
    account?.role === 'leader' ||
    account?.role === 'admin';

  if (isLoading && !account) {
    return (
      <div className="flex flex-col gap-6 animate-pulse">
        <div className="h-28 border border-border bg-card p-6 rounded-none flex items-center gap-4">
          <div className="size-14 bg-muted/60 rounded-none shrink-0" />
          <div className="flex flex-col gap-2 flex-1">
            <div className="h-5 w-48 bg-muted/60 rounded-none" />
            <div className="h-3 w-32 bg-muted/40 rounded-none" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-64 border border-border bg-card rounded-none" />
          <div className="lg:col-span-2 h-64 border border-border bg-card rounded-none" />
        </div>
      </div>
    );
  }

  if (!account) {
    return <NotFoundPage />;
  }

  const getRoleLabel = (role) => {
    switch (role) {
      case 'leader':
        return t('account.roleLeader', 'Ban giám hiệu');
      case 'admin':
        return t('account.roleAdmin', 'Quản trị viên');
      case 'teacher':
        return t('account.roleTeacher', 'Giáo viên');
      case 'parent':
      case 'student':
        return t('account.roleStudent', 'Học sinh');
      default:
        return role || t('account.roleTeacher', 'Giáo viên');
    }
  };

  const getWorkStatusLabel = (status) => {
    switch (status) {
      case 'retired':
        return t('account.workRetired', 'Đã nghỉ việc');
      case 'working':
      default:
        return t('account.workWorking', 'Đang làm việc');
    }
  };

  const getAccountStatusBadge = (status) => {
    if (status === 'active') {
      return (
        <span className="inline-flex items-center justify-center px-2 py-0.5 text-[12px] font-medium bg-secondary text-secondary-foreground rounded-none">
          {t('account.statusActive', 'Hoạt động')}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center justify-center px-2 py-0.5 text-[12px] font-medium bg-destructive/10 text-destructive border border-destructive/20 rounded-none">
        {t('account.statusLocked', 'Đã khóa')}
      </span>
    );
  };

  const isSelf = Boolean(
    user &&
    account &&
    (
      String(user.id) === String(account.id) ||
      (user.accountId && String(user.accountId) === String(account.id)) ||
      (user.username && account.username && user.username.toLowerCase() === account.username.toLowerCase()) ||
      (user.identifier && account.username && user.identifier.toLowerCase() === account.username.toLowerCase())
    )
  );

  const handleDeactivateRetiredAccount = () => {
    if (isSelf) {
      toast.error(t('account.cannotLockSelf', 'Không thể tự khóa tài khoản của chính mình'));
      return;
    }
    openLockConfirm(account);
  };

  // Retired but Active Warning condition (FE-02G)
  const isRetiredButActive = account.workStatus === 'retired' && account.accountStatus === 'active';

  return (
    <div
      className="w-full flex-1 flex flex-col gap-6 max-w-[1300px] mx-auto text-foreground select-none"
      data-node-id="4211:26045"
      data-name="FE-02C · Staff Account · Overview"
    >
      {/* Staff Hero Card (Consistent with Teacher & School Year Overview) */}
      <div
        className="border border-border bg-card p-5 sm:p-6 rounded-none flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs"
        data-node-id="4225:5200"
        data-name="Card · Staff Hero"
      >
        <div className="flex items-center gap-4 sm:gap-5 min-w-0">
          <div className="size-14 rounded-none overflow-hidden border border-border/80 bg-muted/40 shrink-0">
            <img
              src={
                account.avatar ||
                (!isStaff || account.role === 'student' || account.role === 'parent' || account.rawRole === 'PARENT_PH'
                  ? getStudentAvatarUrl(null, account.studentCode || account.username || account.fullName)
                  : getAccountAvatarUrl(null, account.fullName, account.role || account.rawRole))
              }
              alt={account.fullName}
              className="size-full object-cover"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = (!isStaff || account.role === 'student' || account.role === 'parent' || account.rawRole === 'PARENT_PH')
                  ? getStudentAvatarUrl(null, account.studentCode || account.username || account.fullName)
                  : getAccountAvatarUrl(null, account.fullName, account.role || account.rawRole);
              }}
            />
          </div>

          <div className="flex flex-col min-w-0 gap-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-[22px] font-semibold text-foreground tracking-tight leading-tight">
                {account.fullName}
              </h1>
              {getAccountStatusBadge(account.accountStatus)}
            </div>
            <p className="text-[13px] text-muted-foreground font-normal truncate">
              {isStaff ? (
                <>
                  {getRoleLabel(account.role)}
                  {account.username ? ` · ${account.username}` : ''}
                  {account.email ? ` · ${account.email}` : account.phone ? ` · ${account.phone}` : ''}
                </>
              ) : (
                <>
                  <span className="font-mono">{(account.studentCode || account.username || '').toUpperCase()}</span>
                  {account.studentClass ? ` · ${account.studentClass}` : ''}
                </>
              )}
            </p>
          </div>
        </div>

        {/* Action buttons (Settings) - Only ONE place on the page, like school year & teacher */}
        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => openSettingsDrawer(account.id)}
            className="size-8 rounded-none border border-border bg-background hover:bg-muted text-foreground cursor-pointer"
            title={t('account.settingsTitle', 'Cài đặt tài khoản')}
            data-node-id="4225:5176"
            data-name="Settings"
          >
            <HugeiconsIcon icon={Settings01Icon} size={16} />
          </Button>
        </div>
      </div>

      {/* Main Info Cards Grid (2 columns on md+, gap-6) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Card 1: Staff / Profile Info */}
        <div
          className="bg-card border border-border rounded-none overflow-hidden pt-4 flex flex-col shadow-xs"
          data-node-id="4225:5207"
          data-name="Card · Thông tin cán bộ"
        >
          <div className="px-4 pb-3 flex flex-col gap-1">
            <h2 className="text-[15px] font-medium text-card-foreground">
              {isStaff
                ? t('account.staffInfoTitle', 'Thông tin cán bộ')
                : t('account.studentInfoTitle', 'Thông tin học sinh')}
            </h2>
            <p className="text-[13px] text-muted-foreground">
              {isStaff
                ? t('account.staffInfoDesc', 'Hồ sơ nhân sự trong hệ thống Sorak')
                : t('account.studentInfoDesc', 'Hồ sơ học sinh trong hệ thống Sorak')}
            </p>
          </div>

          {/* Row 1: Full name */}
          <div className="border-t border-border/70 flex h-[52px] items-center justify-between px-4 text-[13px]">
            <span className="text-muted-foreground">
              {t('account.colFullName', 'Họ tên')}
            </span>
            <span className="font-medium text-foreground">{account.fullName}</span>
          </div>

          {/* Staff specific rows */}
          {isStaff ? (
            <>
              {/* Row 2: Email (Staff only) */}
              <div className="border-t border-border/70 flex h-[52px] items-center justify-between px-4 text-[13px]">
                <span className="text-muted-foreground">{t('account.colEmail', 'Email')}</span>
                <span className="font-medium text-foreground">{account.email || '—'}</span>
              </div>

              {/* Row 3: Work Status (Staff only) */}
              <div className="border-t border-border/70 flex h-[52px] items-center justify-between px-4 text-[13px]">
                <span className="text-muted-foreground">
                  {t('account.colWorkStatus', 'Trạng thái công tác')}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 text-[12px] font-medium bg-muted text-foreground border border-border/60 rounded-none">
                  {getWorkStatusLabel(account.workStatus)}
                </span>
              </div>
              {/* NOTE: "Đơn vị" removed as requested */}
            </>
          ) : (
            <>
              {/* Row 2: Class for student (No phone, No "Hoc sinh" row) */}
              <div className="border-t border-border/70 flex h-[52px] items-center justify-between px-4 text-[13px]">
                <span className="text-muted-foreground">{t('account.colClass', 'Lớp học')}</span>
                <span className="font-medium text-foreground">{account.studentClass || '—'}</span>
              </div>
            </>
          )}
        </div>

        {/* Card 2: Account Info */}
        <div
          className="bg-card border border-border rounded-none overflow-hidden pt-4 flex flex-col shadow-xs"
          data-node-id="4225:5223"
          data-name="Card · Thông tin tài khoản"
        >
          <div className="px-4 pb-3 flex flex-col gap-1">
            <h2 className="text-[15px] font-medium text-card-foreground">
              {t('account.accountInfoTitle', 'Thông tin tài khoản')}
            </h2>
            <p className="text-[13px] text-muted-foreground">
              {t('account.accountInfoDesc', 'Quyền truy cập và trạng thái tài khoản')}
            </p>
          </div>

          {/* Row 0: Username */}
          <div className="border-t border-border/70 flex h-[52px] items-center justify-between px-4 text-[13px]">
            <span className="text-muted-foreground">{t('account.colUsername', 'Tên đăng nhập')}</span>
            <span className="font-mono font-medium text-foreground">
              {account.username || '—'}
            </span>
          </div>

          {/* Row 1: Role (Staff only - student doesn't need vai tro) */}
          {isStaff && (
            <div className="border-t border-border/70 flex h-[52px] items-center justify-between px-4 text-[13px]">
              <span className="text-muted-foreground">{t('account.colRole', 'Vai trò hệ thống')}</span>
              <span className="font-medium text-foreground">
                {getRoleLabel(account.role)}
              </span>
            </div>
          )}

          {/* Row 2: Status */}
          <div className="border-t border-border/70 flex h-[52px] items-center justify-between px-4 text-[13px]">
            <span className="text-muted-foreground">
              {t('account.colAccountStatus', 'Trạng thái')}
            </span>
            {getAccountStatusBadge(account.accountStatus)}
          </div>

          {/* Row 3: Created At */}
          <div className="border-t border-border/70 flex h-[52px] items-center justify-between px-4 text-[13px]">
            <span className="text-muted-foreground">
              {t('account.colCreatedAt', 'Ngày tạo')}
            </span>
            <span className="font-medium text-foreground">
              {account.createdAt || '12/09/2026 08:30'}
            </span>
          </div>

          {/* Row 4: Activated At */}
          <div className="border-t border-border/70 flex h-[52px] items-center justify-between px-4 text-[13px]">
            <span className="text-muted-foreground">
              {t('account.colActivatedAt', 'Ngày kích hoạt')}
            </span>
            <span className="font-medium text-foreground">
              {account.activatedAt || '-'}
            </span>
          </div>
        </div>
      </div>

      {/* Card 3: Account Activity (Full width) */}
      <div
        className="bg-card border border-border rounded-none overflow-hidden pt-4 flex flex-col shadow-xs"
        data-node-id="4225:5237"
        data-name="Card · Hoạt động tài khoản"
      >
        <div className="px-4 pb-3 flex flex-col gap-1">
          <h2 className="text-[15px] font-medium text-card-foreground">
            {t('account.activityTitle', 'Hoạt động tài khoản')}
          </h2>
          <p className="text-[13px] text-muted-foreground">
            {t('account.activityDesc', 'Dấu mốc truy cập và bảo mật gần đây')}
          </p>
        </div>

        {/* Row 1: Last Login */}
        <div className="border-t border-border/70 flex h-[52px] items-center justify-between px-4 text-[13px]">
          <span className="text-muted-foreground">
            {t('account.colLastLogin', 'Đăng nhập gần nhất')}
          </span>
          <span
            className={cn(
              'font-medium',
              account.lastLogin ? 'text-foreground' : 'italic text-muted-foreground',
            )}
          >
            {account.lastLogin || t('account.neverLoggedIn', 'Chưa từng đăng nhập')}
          </span>
        </div>

        {/* Row 2: Last Password Change */}
        <div className="border-t border-border/70 flex h-[52px] items-center justify-between px-4 text-[13px]">
          <span className="text-muted-foreground">
            {t('account.lastPasswordChange', 'Đổi mật khẩu gần nhất')}
          </span>
          <span
            className={cn(
              'font-normal',
              account.lastPasswordChange ? 'text-foreground' : 'italic text-primary',
            )}
          >
            {account.lastPasswordChange || t('account.none', 'Chưa có')}
          </span>
        </div>

        {/* Row 3: Access Status */}
        <div className="border-t border-border/70 flex h-[52px] items-center justify-between px-4 text-[13px]">
          <span className="text-muted-foreground">
            {t('account.accessStatus', 'Trạng thái truy cập')}
          </span>
          <div className="border border-border bg-background px-2 py-0.5 text-[12px] font-medium text-foreground rounded-none">
            {account.accountStatus === 'locked'
              ? t('account.accessLocked', 'Bị khóa')
              : t('account.accessNormal', 'Bình thường')}
          </div>
        </div>
      </div>

      {/* FE-02G: Retired but Active Warning Banner */}
      {isRetiredButActive && (
        <div
          className="bg-card border border-border p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs rounded-none transition-all"
          data-node-id="4259:5796"
          data-name="Alert Row · Retired but Active"
        >
          <div className="flex items-start sm:items-center gap-2.5">
            <div className="size-4 shrink-0 text-amber-500 mt-0.5 sm:mt-0">
              <HugeiconsIcon icon={AlertCircleIcon} size={16} />
            </div>
            <div className="flex flex-col gap-0.5">
              <h3 className="text-[14px] font-medium text-foreground leading-tight">
                {t(
                  'account.retiredWarningTitle',
                  'Cán bộ đã nghỉ việc nhưng tài khoản vẫn hoạt động',
                )}
              </h3>
              <p className="text-[13px] text-muted-foreground font-light leading-normal">
                {t(
                  'account.retiredWarningDesc',
                  'Nên khóa tài khoản để ngăn đăng nhập.',
                )}
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleDeactivateRetiredAccount}
            className="h-8 px-2.5 rounded-none border-border bg-background hover:bg-muted text-foreground text-[13px] font-medium flex items-center gap-1.5 shrink-0 cursor-pointer self-start sm:self-auto"
            data-node-id="4259:5813"
            data-name="Button · Khóa tài khoản"
          >
            <HugeiconsIcon icon={UserLock01Icon} size={15} />
            <span>{t('account.actionLock', 'Khóa tài khoản')}</span>
          </Button>
        </div>
      )}

      {/* Modals & Slide-out drawer */}
      <AccountSettingsDrawer />
      <ResetPasswordConfirmModal />
      <TemporaryPasswordModal />
      <LockAccountConfirmModal />
    </div>
  );
}
