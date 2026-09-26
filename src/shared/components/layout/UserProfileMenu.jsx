import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Settings01Icon,
  Notification03Icon,
  PaintBoardIcon,
  LanguageCircleIcon,
  Logout01Icon,
  Sun02Icon,
  Moon02Icon,
  ComputerIcon,
  CheckmarkSquare02Icon,
  HelpCircleIcon,
} from '@hugeicons/core-free-icons';
import { useAuthStore } from '@/features/auth';
import { useNotificationStore } from '@/features/notifications';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/shared/utils';

export function UserProfileMenu({
  sidebarCollapsed,
  teacherClass = null,
  onOpenSettings,
  onOpenNotifications,
  onOpenLogout,
  themeMode,
  onThemeChange,
}) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const unreadCount = useNotificationStore((state) => state.unreadCount);

  const getRoleLabel = () => {
    if (!user) return t('profile.role', 'Ban giám hiệu');
    const role = (user.role || '').toUpperCase();
    const isTeacher =
      role === 'TEACHER_GV' ||
      role === 'TEACHER' ||
      role.includes('TEACHER');

    if (isTeacher) {
      return t('profile.roleTeacher', 'Giáo viên');
    }

    return t('profile.role', 'Ban giám hiệu');
  };

  const rawName = (user?.fullName || user?.name || user?.username || '').trim();
  const cleanName = rawName.replace(/^(GV\.|BGH\.|Tr\.|Tchr\.|Admin\.|Board\.|Prin\.)\s*/i, '').trim() || user?.fullName || t('profile.role');
  const roleLabel = getRoleLabel();

  const employeeCode =
    user?.employeeCode ||
    user?.teacher?.employeeCode ||
    user?.staff?.employeeCode ||
    (/^CB\d+$/i.test(user?.username) ? user.username : null) ||
    null;
  const userEmail = user?.email || user?.identifier || null;
  const avatarSrc =
    (user?.avatarUrl && !user.avatarUrl.includes('api.dicebear.com')) ||
    (user?.avatar && !user.avatar.includes('api.dicebear.com')) ||
    `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(
      cleanName || 'User',
    )}`;

  const handleLanguageChange = (lang) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('sorak-lang', lang);
  };

  return (
    <div
      className={cn(
        'p-2 flex items-center gap-1.5',
        sidebarCollapsed ? 'flex-col-reverse justify-center' : 'justify-between',
      )}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              'flex items-center gap-2 p-1.5 rounded-none hover:bg-muted/50 transition-colors text-left cursor-pointer',
              sidebarCollapsed ? 'justify-center p-1 w-full' : 'flex-1 min-w-0',
            )}
            title={`${cleanName} (${roleLabel})`}
            data-node-id="4053:1160"
          >
            {/* User Avatar matching Figma */}
            <div className="size-8 rounded-none overflow-hidden shrink-0 border border-border/70 bg-primary/10 flex items-center justify-center">
              <img
                src={avatarSrc}
                alt="Avatar"
                className="size-full object-cover"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(
                    cleanName || 'User',
                  )}`;
                }}
              />
            </div>

            {!sidebarCollapsed && (
              <div className="flex flex-1 flex-col min-w-0 pr-1">
                <span className="text-[13px] font-medium text-foreground truncate">
                  {cleanName}
                </span>
                <span className="text-[11px] text-muted-foreground truncate">
                  {roleLabel}
                </span>
              </div>
            )}
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          side="right"
          align="end"
          sideOffset={6}
          alignOffset={sidebarCollapsed ? 0 : 28}
          className="w-[280px] p-1.5 rounded-none border border-border bg-card shadow-xl z-50 text-foreground"
          data-node-id="4061:1568"
        >
          {/* User Profile Header */}
          <div className="p-2.5 border-b border-border/70 mb-1 select-none flex items-start gap-3">
            <div className="size-9 rounded-none overflow-hidden shrink-0 border border-border/70 bg-primary/10 flex items-center justify-center mt-0.5">
              <img
                src={avatarSrc}
                alt="Avatar"
                className="size-full object-cover"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(
                    cleanName || 'User',
                  )}`;
                }}
              />
            </div>

            <div className="flex flex-col min-w-0 flex-1 gap-0.5">
              <div className="text-[13.5px] font-semibold text-foreground truncate leading-tight">
                {cleanName}
              </div>
              {userEmail && (
                <div
                  className="text-[12px] text-muted-foreground truncate leading-tight"
                  title={userEmail}
                >
                  {userEmail}
                </div>
              )}
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/80 font-normal leading-tight pt-0.5">
                <span className="shrink-0">{roleLabel}</span>
                {employeeCode && (
                  <>
                    <span className="text-muted-foreground/40 shrink-0 select-none">•</span>
                    <span className="font-mono text-[10.5px] text-muted-foreground shrink-0">
                      Mã CB: {employeeCode}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* 1. Hỗ trợ (Support) */}
          <DropdownMenuItem
            onClick={() => navigate('/support')}
            className="flex items-center gap-2 h-8 px-2 text-[14px] cursor-pointer rounded-none"
            data-node-id="profile-support-item"
          >
            <HugeiconsIcon icon={HelpCircleIcon} size={16} className="shrink-0" />
            <span>{t('nav.support', 'Hỗ trợ')}</span>
          </DropdownMenuItem>

          {/* 2. Giao diện (Theme) */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger
              className="flex items-center gap-2 h-8 px-2 text-[14px] cursor-pointer rounded-none"
              data-node-id="4073:1776"
            >
              <HugeiconsIcon icon={PaintBoardIcon} size={16} className="shrink-0" />
              <span className="flex-1">{t('profile.theme')}</span>
              <span className="text-[12px] text-muted-foreground mr-1">
                {themeMode === 'light'
                  ? t('profile.themeLight')
                  : themeMode === 'dark'
                    ? t('profile.themeDark')
                    : t('profile.themeSystem')}
              </span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent
              className="w-44 p-1 rounded-none border border-border bg-card shadow-xl"
              data-node-id="4061:1708"
            >
              <DropdownMenuItem
                onClick={() => onThemeChange('light')}
                className="flex items-center gap-2 h-8 px-2 text-[14px] cursor-pointer rounded-none"
              >
                <HugeiconsIcon icon={Sun02Icon} size={16} className="shrink-0" />
                <span className="flex-1">{t('profile.themeLight')}</span>
                {themeMode === 'light' && (
                  <HugeiconsIcon icon={CheckmarkSquare02Icon} size={14} />
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onThemeChange('dark')}
                className="flex items-center gap-2 h-8 px-2 text-[14px] cursor-pointer rounded-none"
              >
                <HugeiconsIcon icon={Moon02Icon} size={16} className="shrink-0" />
                <span className="flex-1">{t('profile.themeDark')}</span>
                {themeMode === 'dark' && (
                  <HugeiconsIcon icon={CheckmarkSquare02Icon} size={14} />
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onThemeChange('system')}
                className="flex items-center gap-2 h-8 px-2 text-[14px] cursor-pointer rounded-none"
              >
                <HugeiconsIcon icon={ComputerIcon} size={16} className="shrink-0" />
                <span className="flex-1">{t('profile.themeSystem')}</span>
                {themeMode === 'system' && (
                  <HugeiconsIcon icon={CheckmarkSquare02Icon} size={14} />
                )}
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          {/* 3. Ngôn ngữ (Language) */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger
              className="flex items-center gap-2 h-8 px-2 text-[14px] cursor-pointer rounded-none"
              data-node-id="4073:1798"
            >
              <HugeiconsIcon icon={LanguageCircleIcon} size={16} className="shrink-0" />
              <span className="flex-1">{t('profile.language')}</span>
              <span className="text-[12px] text-muted-foreground mr-1">
                {i18n.language.startsWith('en')
                  ? t('profile.langEn')
                  : t('profile.langVi')}
              </span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent
              className="w-40 p-1 rounded-none border border-border bg-card shadow-xl"
              data-node-id="4061:1742"
            >
              <DropdownMenuItem
                onClick={() => handleLanguageChange('vi')}
                className="flex items-center justify-between h-8 px-2 text-[14px] cursor-pointer rounded-none"
              >
                <span>{t('profile.langVi')}</span>
                {!i18n.language.startsWith('en') && (
                  <HugeiconsIcon icon={CheckmarkSquare02Icon} size={14} />
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleLanguageChange('en')}
                className="flex items-center justify-between h-8 px-2 text-[14px] cursor-pointer rounded-none"
              >
                <span>{t('profile.langEn')}</span>
                {i18n.language.startsWith('en') && (
                  <HugeiconsIcon icon={CheckmarkSquare02Icon} size={14} />
                )}
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          {/* 4. Cài đặt (Settings) */}
          <DropdownMenuItem
            onClick={onOpenSettings}
            className="flex items-center gap-2 h-8 px-2 text-[14px] cursor-pointer rounded-none"
            data-node-id="4073:1750"
          >
            <HugeiconsIcon icon={Settings01Icon} size={16} className="shrink-0" />
            <span>{t('profile.settings')}</span>
          </DropdownMenuItem>



          <DropdownMenuSeparator className="my-1 border-t border-border" />

          {/* Logout Item */}
          <DropdownMenuItem
            onClick={onOpenLogout}
            className="flex items-center gap-2 h-8 px-2 text-[14px] text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-500/10 dark:hover:bg-red-500/15 focus:text-red-600 dark:focus:text-red-400 focus:bg-red-500/10 dark:focus:bg-red-500/15 cursor-pointer rounded-none transition-colors"
            data-node-id="4073:1809"
          >
            <HugeiconsIcon icon={Logout01Icon} size={16} className="shrink-0 text-red-600 dark:text-red-400" />
            <span>{t('profile.logout')}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Notification Icon Button */}
      <button
        type="button"
        onClick={onOpenNotifications}
        title={t('profile.notifications')}
        aria-label={t('profile.notifications')}
        className="relative size-8 shrink-0 flex items-center justify-center rounded-none border border-border/70 hover:bg-muted/50 text-foreground transition-colors cursor-pointer"
        data-node-id="sidebar-notification-btn"
      >
        <HugeiconsIcon icon={Notification03Icon} size={16} />
        {unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-4 h-4 px-1 flex items-center justify-center text-[10px] font-bold text-white bg-red-500 rounded-full ring-2 ring-background pointer-events-none select-none"
            data-testid="notification-badge"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
    </div>
  );
}
