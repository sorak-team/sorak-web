import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Cancel01Icon,
  ProfileIcon,
  SecurityLockIcon,
  Notification03Icon,
  PaintBoardIcon,
  LanguageCircleIcon,
  Sun02Icon,
  Moon02Icon,
  ComputerIcon,
  SmartPhone01Icon,
  ArrowReloadHorizontalIcon,
  Tick02Icon,
  Upload01Icon,
  Key01Icon,
  Mail01Icon,
  Logout01Icon,
} from '@hugeicons/core-free-icons';
import { toast } from 'sonner';

import { useAuthStore, passwordComplexityRegex, passwordComplexityMessage } from '@/features/auth';
import { authApi } from '@/features/auth/auth.api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/shared/lib/utils';

function parseClientUserAgent() {
  if (typeof navigator === 'undefined') {
    return {
      browser: 'Trình duyệt Web',
      os: 'Thiết bị',
      deviceType: 'desktop',
      display: 'Trình duyệt Web',
    };
  }
  const ua = navigator.userAgent || '';
  let browser = 'Trình duyệt Web';
  let os = 'Thiết bị';
  let deviceType = 'desktop';

  if (/windows nt 10\.0/i.test(ua)) os = 'Windows 10/11';
  else if (/windows nt 6\.3/i.test(ua)) os = 'Windows 8.1';
  else if (/windows nt 6\.1/i.test(ua)) os = 'Windows 7';
  else if (/windows/i.test(ua)) os = 'Windows';
  else if (/macintosh|mac os x/i.test(ua)) os = 'macOS';
  else if (/iphone/i.test(ua)) {
    os = 'iOS (iPhone)';
    deviceType = 'mobile';
  } else if (/ipad/i.test(ua)) {
    os = 'iPadOS';
    deviceType = 'tablet';
  } else if (/android/i.test(ua)) {
    os = 'Android';
    deviceType = 'mobile';
  } else if (/linux/i.test(ua)) {
    os = 'Linux';
  }

  if (/edg\//i.test(ua)) browser = 'Microsoft Edge';
  else if (/opr\/|opera\//i.test(ua)) browser = 'Opera';
  else if (/chrome|crios/i.test(ua)) browser = 'Google Chrome';
  else if (/firefox|fxios/i.test(ua)) browser = 'Mozilla Firefox';
  else if (/safari/i.test(ua)) browser = 'Apple Safari';

  return {
    browser,
    os,
    deviceType,
    display: `${browser} · ${os}`,
  };
}

function formatRelativeTime(dateString, t) {
  if (!dateString) return t('settings.activeNow', 'Hoạt động vừa xong');
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return t('settings.activeNow', 'Hoạt động vừa xong');

  const diffMs = Date.now() - d.getTime();
  const diffSec = Math.max(0, Math.floor(diffMs / 1000));
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 2) {
    return t('settings.activeNow', 'Hoạt động vừa xong');
  }
  if (diffMin < 60) {
    return t('settings.activeMinutesAgo', 'Hoạt động {{count}} phút trước', { count: diffMin });
  }
  if (diffHour < 24) {
    return t('settings.activeHoursAgo', 'Hoạt động {{count}} giờ trước', { count: diffHour });
  }
  if (diffDay < 7) {
    return t('settings.activeDaysAgo', 'Hoạt động {{count}} ngày trước', { count: diffDay });
  }
  return t('settings.activeAtDate', 'Hoạt động lúc {{time}}, {{date}}', {
    time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    date: d.toLocaleDateString('vi-VN'),
  });
}

export function SettingsDialog({
  open,
  onOpenChange,
  themeMode = 'light',
  onThemeChange,
}) {
  const { t, i18n } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  // Permission: Only School Board (Principal / Admin) can update personal information
  const isPrincipal =
    user?.role === 'PRINCIPAL_BGH' ||
    user?.role === 'ADMIN_BGH' ||
    user?.role === 'principal' ||
    user?.role === 'admin' ||
    user?.role === 'leader';
  const canEditProfile = Boolean(isPrincipal);

  const [activeTab, setActiveTab] = useState('profile');
  const fileInputRef = useRef(null);

  // Profile Form state initialized from current user
  const [formData, setFormData] = useState({
    fullName: '',
    employeeCode: '',
    position: '',
    phone: '',
    email: '',
    address: '',
  });

  const [initialEmail, setInitialEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  // Sync user state on open or user change
  useEffect(() => {
    if (open) {
      const defaultFullName =
        user?.fullName || user?.name || user?.username || 'Trần Thị Mai';
      const isTeacherRole =
        user?.role === 'TEACHER_GV' || user?.role === 'teacher';

      const employeeCode =
        user?.employeeCode ||
        user?.teacher?.employeeCode ||
        user?.teacher?.employee_code ||
        (isTeacherRole ? 'GV001' : 'CB001');

      const position =
        user?.position ||
        user?.teacher?.position ||
        (isTeacherRole ? 'Giáo viên' : 'Tổ trưởng chuyên môn');

      const currentEmail = user?.email || user?.teacher?.email || 'maith@sorak.vn';
      const phone = user?.phone || user?.teacher?.phone || '0908 123 456';
      const address =
        user?.address ||
        user?.teacher?.address ||
        '12 Nguyễn Trãi, Phường 2, TP. Rạch Giá, Kiên Giang';

      setFormData({
        fullName: defaultFullName,
        employeeCode,
        position,
        phone,
        email: currentEmail,
        address,
      });

      setInitialEmail(currentEmail);

      const initialAvatar =
        (user?.avatarUrl && !user.avatarUrl.includes('api.dicebear.com')) ||
        (user?.avatar && !user.avatar.includes('api.dicebear.com')) ||
        `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(
          defaultFullName || 'User',
        )}`;
      setAvatarUrl(initialAvatar);
    }
  }, [open, user]);

  // Handle Save Profile
  const handleSaveProfile = (e) => {
    e.preventDefault();
    if (!canEditProfile) {
      toast.info(
        t(
          'settings.teacherReadOnlyNotice',
          'Tài khoản giáo viên ở chế độ chỉ xem thông tin cá nhân. Vui lòng liên hệ Ban giám hiệu khi cần điều chỉnh.',
        ),
      );
      return;
    }

    if (!formData.fullName.trim()) {
      toast.error('Vui lòng nhập họ và tên.');
      return;
    }

    const trimmedEmail = formData.email.trim();
    if (trimmedEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        toast.error(t('settings.toastEmailInvalid', 'Vui lòng nhập định dạng email hợp lệ.'));
        return;
      }
    }

    updateUser({
      fullName: formData.fullName.trim(),
      name: formData.fullName.trim(),
      employeeCode: formData.employeeCode.trim(),
      position: formData.position.trim(),
      email: trimmedEmail,
      identifier: trimmedEmail || user?.identifier,
      phone: formData.phone.trim(),
      address: formData.address.trim(),
      avatarUrl,
      avatar: avatarUrl,
      teacher: {
        ...(user?.teacher || {}),
        employeeCode: formData.employeeCode.trim(),
        employee_code: formData.employeeCode.trim(),
        position: formData.position.trim(),
        email: trimmedEmail,
        phone: formData.phone.trim(),
        address: formData.address.trim(),
      },
    });

    setInitialEmail(trimmedEmail);

    toast.success(
      t('settings.toastSaveSuccess', 'Đã lưu thay đổi hồ sơ thành công!'),
    );
  };

  // Handle Avatar upload from local machine
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Kích thước ảnh tối đa là 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result;
      if (typeof dataUrl === 'string') {
        setAvatarUrl(dataUrl);
        updateUser({ avatarUrl: dataUrl, avatar: dataUrl });
        toast.success('Đã tải ảnh đại diện lên thành công!');
      }
    };
    reader.readAsDataURL(file);
  };

  // Password state
  const [passwordData, setPasswordData] = useState({
    current: '',
    next: '',
    confirm: '',
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!passwordData.current) {
      toast.error('Vui lòng nhập mật khẩu hiện tại.');
      return;
    }
    if (!passwordComplexityRegex.test(passwordData.next)) {
      toast.error(passwordComplexityMessage);
      return;
    }
    if (passwordData.next !== passwordData.confirm) {
      toast.error('Mật khẩu xác nhận không khớp.');
      return;
    }
    if (passwordData.next === passwordData.current) {
      toast.error('Mật khẩu mới không được trùng với mật khẩu hiện tại.');
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await authApi.changePassword({
        currentPassword: passwordData.current,
        newPassword: passwordData.next,
      });
      toast.success(
        res?.message || t('settings.toastPasswordSuccess', 'Đã đổi mật khẩu thành công!'),
      );
      setPasswordData({ current: '', next: '', confirm: '' });
    } catch (err) {
      const errorMessage =
        err?.response?.data?.message ||
        err?.response?.data?.error?.message ||
        'Không thể đổi mật khẩu. Vui lòng kiểm tra lại mật khẩu hiện tại.';
      toast.error(errorMessage);
    } finally {
      setIsChangingPassword(false);
    }
  };

  // 2FA State
  const [is2FAEnabled, setIs2FAEnabled] = useState(
    Boolean(user?.is_2fa_enabled),
  );
  const [is2FAStep, setIs2FAStep] = useState(null);
  const [twoFactorOtpInput, setTwoFactorOtpInput] = useState('');
  const [disablePasswordInput, setDisablePasswordInput] = useState('');
  const [is2FALoading, setIs2FALoading] = useState(false);

  useEffect(() => {
    setIs2FAEnabled(Boolean(user?.is_2fa_enabled));
  }, [user?.is_2fa_enabled]);

  const handleStartEnable2FA = async () => {
    setIs2FALoading(true);
    try {
      const res = await authApi.requestEnable2FA();
      toast.info('Mã xác thực 2FA đã được tạo', {
        description: res.message || 'Vui lòng kiểm tra email của bạn.',
      });
      setIs2FAStep('enabling');
    } catch (err) {
      toast.error('Không thể gửi mã 2FA', {
        description: err.response?.data?.message || err.message,
      });
    } finally {
      setIs2FALoading(false);
    }
  };

  const handleConfirmEnable2FA = async () => {
    if (twoFactorOtpInput.length !== 6) return;
    setIs2FALoading(true);
    try {
      const res = await authApi.confirmEnable2FA({ otp: twoFactorOtpInput });
      toast.success('Bật xác thực 2 bước thành công!', {
        description: res.message,
      });
      setIs2FAEnabled(true);
      updateUser({ is_2fa_enabled: true });
      setIs2FAStep(null);
      setTwoFactorOtpInput('');
    } catch (err) {
      toast.error('Kích hoạt thất bại', {
        description: err.response?.data?.message || err.message,
      });
      setTwoFactorOtpInput('');
    } finally {
      setIs2FALoading(false);
    }
  };

  const handleConfirmDisable2FA = async () => {
    if (!disablePasswordInput) return;
    setIs2FALoading(true);
    try {
      const res = await authApi.disable2FA({ password: disablePasswordInput });
      toast.success('Đã tắt xác thực 2 bước', {
        description: res.message,
      });
      setIs2FAEnabled(false);
      updateUser({ is_2fa_enabled: false });
      setIs2FAStep(null);
      setDisablePasswordInput('');
    } catch (err) {
      toast.error('Tắt 2FA thất bại', {
        description: err.response?.data?.message || err.message,
      });
    } finally {
      setIs2FALoading(false);
    }
  };

  // Active Sessions State
  const [sessions, setSessions] = useState([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [isRevokingAll, setIsRevokingAll] = useState(false);

  const fetchSessions = async () => {
    try {
      setIsLoadingSessions(true);
      const res = await authApi.getSessions();
      if (res?.data?.sessions) {
        setSessions(res.data.sessions);
      }
    } catch (err) {
      console.error('Failed to load active sessions:', err);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  useEffect(() => {
    if (open && activeTab === 'security') {
      fetchSessions();
    }
  }, [open, activeTab]);

  const handleRevokeAllSessions = async () => {
    if (
      !window.confirm(
        t(
          'settings.logoutAllConfirm',
          'Bạn có chắc chắn muốn đăng xuất khỏi tất cả thiết bị? Bạn sẽ cần đăng nhập lại trên thiết bị này.',
        ),
      )
    ) {
      return;
    }
    try {
      setIsRevokingAll(true);
      await authApi.revokeAllSessions();
      toast.success(
        t('settings.allSessionsRevoked', 'Đã đăng xuất khỏi tất cả thiết bị'),
      );
      logout();
      onOpenChange(false);
      navigate('/login');
    } catch (err) {
      toast.error(
        t(
          'settings.allSessionsRevokeFailed',
          'Không thể đăng xuất tất cả thiết bị',
        ),
        {
          description: err.response?.data?.message || err.message,
        },
      );
    } finally {
      setIsRevokingAll(false);
    }
  };

  // Notification Preferences State (saved in localStorage)
  const [notificationPrefs, setNotificationPrefs] = useState(() => {
    try {
      const saved = localStorage.getItem('sorak_notification_settings');
      if (saved) return JSON.parse(saved);
    } catch { }
    return {
      emailAcademic: true,
      emailTransfers: true,
      emailSecurity: true,
      browserPush: true,
      notificationSound: false,
    };
  });

  const toggleNotificationPref = (key) => {
    setNotificationPrefs((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem(
          'sorak_notification_settings',
          JSON.stringify(next),
        );
      } catch { }
      toast.success('Đã cập nhật cài đặt thông báo!');
      return next;
    });
  };

  // Theme Change Handler
  const handleThemeSelect = (mode) => {
    if (onThemeChange) {
      onThemeChange(mode);
    } else {
      localStorage.setItem('sorak-theme', mode);
      const isDark =
        mode === 'dark' ||
        (mode === 'system' &&
          window.matchMedia('(prefers-color-scheme: dark)').matches);
      document.documentElement.classList.toggle('dark', isDark);
    }
    toast.success(
      `Đã chuyển sang giao diện ${mode === 'light' ? 'Sáng' : mode === 'dark' ? 'Tối' : 'Hệ thống'
      }`,
    );
  };

  // Language Change Handler
  const handleLanguageSelect = (lang) => {
    i18n.changeLanguage(lang);
    try {
      localStorage.setItem('i18nextLng', lang);
      localStorage.setItem('sorak-lang', lang);
    } catch { }
    toast.success(
      lang === 'vi'
        ? 'Đã chuyển ngôn ngữ sang Tiếng Việt'
        : 'Language switched to English',
    );
  };

  const navItems = [
    { id: 'profile', label: t('settings.navProfile', 'Hồ sơ cá nhân'), icon: ProfileIcon },
    { id: 'security', label: t('settings.navSecurity', 'Mật khẩu & Bảo mật'), icon: SecurityLockIcon },
    { id: 'notifications', label: t('settings.navNotifications', 'Cài đặt thông báo'), icon: Notification03Icon },
    { id: 'appearance', label: t('settings.navAppearance', 'Giao diện & Hiển thị'), icon: PaintBoardIcon },
    { id: 'language', label: t('settings.navLanguage', 'Ngôn ngữ & Khu vực'), icon: LanguageCircleIcon },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideCloseButton
        className="w-[1080px] max-w-[95vw] h-[720px] max-h-[90vh] p-0 gap-0 bg-background border border-border rounded-none shadow-2xl overflow-hidden flex flex-col z-50 select-none"
        data-node-id="4097:24170"
        data-name="Settings · Dialog"
      >
        {/* Modal Header */}
        <DialogHeader
          className="h-[52px] px-5 flex flex-row items-center justify-between border-b border-border shrink-0 space-y-0"
          data-node-id="4097:24171"
        >
          <DialogTitle className="text-[18px] font-semibold text-foreground tracking-tight">
            {t('settings.title', 'Cài đặt')}
          </DialogTitle>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="size-8 rounded-none text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
            data-node-id="4097:24173"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={18} />
          </Button>
        </DialogHeader>

        {/* Modal Body: 2 Columns */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Navigation Sidebar (240px) */}
          <aside
            className="w-[240px] bg-[#fafafa] dark:bg-card border-r border-border p-2 space-y-4 shrink-0 flex flex-col"
            data-node-id="4097:24176"
          >
            {/* Section 1: Cá nhân */}
            <div className="space-y-1">
              <p className="px-2 h-6 flex items-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t('settings.personal', 'Cá nhân')}
              </p>
              {navItems.slice(0, 3).map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-2.5 h-8 rounded-none text-[13px] transition-colors cursor-pointer text-left',
                      isActive
                        ? 'bg-[#eceef2] dark:bg-muted text-foreground font-medium border-l-2 border-primary'
                        : 'text-foreground/80 hover:bg-muted/50 hover:text-foreground font-normal border-l-2 border-transparent',
                    )}
                  >
                    <HugeiconsIcon icon={item.icon} size={16} className="shrink-0 text-muted-foreground" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="h-px bg-border mx-2" />

            {/* Section 2: Tuỳ chọn hệ thống */}
            <div className="space-y-1">
              <p className="px-2 h-6 flex items-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t('settings.systemPreferences', 'Tùy chọn')}
              </p>
              {navItems.slice(3).map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-2.5 h-8 rounded-none text-[13px] transition-colors cursor-pointer text-left',
                      isActive
                        ? 'bg-[#eceef2] dark:bg-muted text-foreground font-medium border-l-2 border-primary'
                        : 'text-foreground/80 hover:bg-muted/50 hover:text-foreground font-normal border-l-2 border-transparent',
                    )}
                  >
                    <HugeiconsIcon icon={item.icon} size={16} className="shrink-0 text-muted-foreground" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Right Main Content Area (840px) */}
          <main
            className="flex-1 overflow-y-auto p-7 space-y-6 bg-background"
            data-node-id="4097:24330"
          >
            {/* ============================================================== */}
            {/* TAB 1: HỒ SƠ CÁ NHÂN (PROFILE) */}
            {/* ============================================================== */}
            {activeTab === 'profile' && (
              <div className="space-y-6 animate-in fade-in-50 duration-150">
                {/* Header Description */}
                <div className="space-y-0.5">
                  <h3 className="text-[17px] font-semibold text-foreground tracking-tight">
                    {t('settings.profileTitle', 'Hồ sơ cá nhân')}
                  </h3>
                  <p className="text-[13px] text-muted-foreground">
                    {t(
                      'settings.profileSubtitle',
                      'Cập nhật ảnh đại diện và thông tin tài khoản của bạn',
                    )}
                  </p>
                </div>

                {/* Card 1: Ảnh đại diện */}
                <div className="bg-card border border-border p-5 flex items-center justify-between rounded-none shadow-xs">
                  <div className="space-y-1">
                    <p className="text-[14px] font-semibold text-foreground">
                      {t('settings.avatarTitle', 'Ảnh đại diện')}
                    </p>
                    <p className="text-[12px] text-muted-foreground max-w-sm">
                      {t(
                        'settings.avatarDesc',
                        'Dùng ảnh đại diện để nhận diện tài khoản trong hệ thống Sorak',
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="size-16 overflow-hidden border border-border shrink-0 rounded-none bg-muted/40">
                      <img
                        src={avatarUrl}
                        alt="Avatar Preview"
                        className="size-full object-cover"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(
                            formData.fullName || 'User',
                          )}`;
                        }}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*"
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        className="h-8 px-3 text-[13px] font-normal border-border rounded-none shadow-none text-foreground hover:bg-muted cursor-pointer flex items-center gap-1.5"
                      >
                        <HugeiconsIcon icon={Upload01Icon} size={14} />
                        <span>{t('settings.uploadPhoto', 'Tải ảnh lên')}</span>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          const initial = `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(
                            formData.fullName || 'User',
                          )}`;
                          setAvatarUrl(initial);
                          updateUser({ avatarUrl: initial, avatar: initial });
                          toast.info(t('settings.toastAvatarReset', 'Đã đặt lại ảnh đại diện theo tên'));
                        }}
                        className="h-8 px-3 text-[13px] font-normal rounded-none text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        {t('settings.resetDefaultPhoto', 'Đặt lại mặc định')}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Card 2: Thông tin cá nhân (6 fields) */}
                <form
                  onSubmit={handleSaveProfile}
                  className="bg-card border border-border p-5 space-y-5 rounded-none shadow-xs"
                >
                  <div className="space-y-0.5">
                    <p className="text-[14px] font-semibold text-foreground">
                      {t('settings.personalInfoTitle', 'Thông tin cá nhân')}
                    </p>
                    <p className="text-[12px] text-muted-foreground">
                      {t(
                        'settings.personalInfoDesc',
                        'Thông tin hiển thị trong hệ thống và danh sách quản trị',
                      )}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                    {/* Row 1: Họ và tên & Mã giáo viên */}
                    <div className="space-y-1.5">
                      <label className="text-[12px] font-medium text-foreground">
                        {t('settings.fullName', 'Họ và tên')} {canEditProfile && <span className="text-destructive">*</span>}
                      </label>
                      <Input
                        disabled={!canEditProfile}
                        value={formData.fullName}
                        onChange={(e) =>
                          setFormData({ ...formData, fullName: e.target.value })
                        }
                        placeholder={t('settings.fullNamePlaceholder', 'Nhập họ và tên')}
                        className={cn(
                          'h-9 text-[13px] border-border rounded-none',
                          !canEditProfile
                            ? 'bg-muted/30 text-muted-foreground cursor-not-allowed'
                            : 'bg-background',
                        )}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[12px] font-medium text-foreground">
                        {t('settings.employeeCode', 'Mã giáo viên')}
                      </label>
                      <Input
                        disabled={!canEditProfile}
                        value={formData.employeeCode}
                        onChange={(e) =>
                          setFormData({ ...formData, employeeCode: e.target.value })
                        }
                        placeholder="CB001"
                        className={cn(
                          'h-9 text-[13px] border-border rounded-none font-mono',
                          !canEditProfile
                            ? 'bg-muted/30 text-muted-foreground cursor-not-allowed'
                            : 'bg-background',
                        )}
                      />
                    </div>

                    {/* Row 2: Số điện thoại & Chức vụ */}
                    <div className="space-y-1.5">
                      <label className="text-[12px] font-medium text-foreground">
                        {t('settings.phone', 'Số điện thoại')}
                      </label>
                      <Input
                        disabled={!canEditProfile}
                        value={formData.phone}
                        onChange={(e) =>
                          setFormData({ ...formData, phone: e.target.value })
                        }
                        placeholder={t('settings.phonePlaceholder', '0901 234 567')}
                        className={cn(
                          'h-9 text-[13px] border-border rounded-none font-mono',
                          !canEditProfile
                            ? 'bg-muted/30 text-muted-foreground cursor-not-allowed'
                            : 'bg-background',
                        )}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[12px] font-medium text-foreground">
                        {t('settings.positionLabel', 'Chức vụ')}
                      </label>
                      <Input
                        disabled={!canEditProfile}
                        value={formData.position}
                        onChange={(e) =>
                          setFormData({ ...formData, position: e.target.value })
                        }
                        placeholder="Hiệu trưởng"
                        className={cn(
                          'h-9 text-[13px] border-border rounded-none font-medium',
                          !canEditProfile
                            ? 'bg-muted/30 text-muted-foreground cursor-not-allowed'
                            : 'bg-background',
                        )}
                      />
                    </div>

                    {/* Row 3: Email & Địa chỉ */}
                    <div className="space-y-1.5">
                      <label className="text-[12px] font-medium text-foreground">
                        {t('settings.email', 'Email')}
                      </label>
                      <Input
                        type="email"
                        disabled={!canEditProfile}
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        placeholder="example@sorak.vn"
                        className={cn(
                          'h-9 text-[13px] border-border rounded-none',
                          !canEditProfile
                            ? 'bg-muted/30 text-muted-foreground cursor-not-allowed'
                            : 'bg-background',
                        )}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[12px] font-medium text-foreground">
                        {t('settings.addressLabel', 'Địa chỉ')}
                      </label>
                      <Input
                        disabled={!canEditProfile}
                        value={formData.address}
                        onChange={(e) =>
                          setFormData({ ...formData, address: e.target.value })
                        }
                        placeholder={t('settings.addressPlaceholder', 'Địa chỉ công tác...')}
                        className={cn(
                          'h-9 text-[13px] border-border rounded-none',
                          !canEditProfile
                            ? 'bg-muted/30 text-muted-foreground cursor-not-allowed'
                            : 'bg-background',
                        )}
                      />
                    </div>
                  </div>

                  {/* Save Changes button or Teacher Read-only notice */}
                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    {canEditProfile ? (
                      <>
                        <span className="text-[11px] text-muted-foreground">
                          {t('settings.principalEditNote', 'Tài khoản Ban giám hiệu có quyền chỉnh sửa các thông tin cá nhân.')}
                        </span>
                        <Button
                          type="submit"
                          className="h-8 px-4 text-[13px] font-medium bg-[#1447e6] hover:bg-[#1447e6]/90 text-white rounded-none shadow-none cursor-pointer"
                        >
                          {t('settings.saveChanges', 'Lưu thay đổi')}
                        </Button>
                      </>
                    ) : (
                      <p className="text-[12px] text-muted-foreground italic">
                        {t(
                          'settings.teacherReadOnlyNotice',
                          'Tài khoản giáo viên ở chế độ chỉ xem thông tin cá nhân. Vui lòng liên hệ Ban giám hiệu khi cần điều chỉnh.',
                        )}
                      </p>
                    )}
                  </div>
                </form>
              </div>
            )}

            {/* ============================================================== */}
            {/* TAB 2: MẬT KHẨU & BẢO MẬT (SECURITY) */}
            {/* ============================================================== */}
            {activeTab === 'security' && (
              <div className="space-y-6 animate-in fade-in-50 duration-150">
                <div className="space-y-0.5">
                  <h3 className="text-[17px] font-semibold text-foreground tracking-tight">
                    {t('settings.navSecurity', 'Mật khẩu & Bảo mật')}
                  </h3>
                  <p className="text-[13px] text-muted-foreground">
                    {t(
                      'settings.securitySubtitle',
                      'Quản lý mật khẩu đăng nhập và các lớp bảo vệ an toàn cho tài khoản',
                    )}
                  </p>
                </div>

                {/* Card 1: Đổi mật khẩu */}
                <form
                  onSubmit={handleChangePassword}
                  className="bg-card border border-border p-5 space-y-4 rounded-none shadow-xs"
                >
                  <div className="space-y-0.5">
                    <p className="text-[14px] font-semibold text-foreground">
                      {t('settings.changePasswordTitle', 'Đổi mật khẩu')}
                    </p>
                    <p className="text-[12px] text-muted-foreground">
                      {t(
                        'settings.changePasswordDesc',
                        'Cập nhật mật khẩu định kỳ để nâng cao tính an toàn',
                      )}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                    {/* Mật khẩu hiện tại */}
                    <div className="space-y-1.5">
                      <label className="text-[12px] font-medium text-foreground">
                        {t('settings.currentPassword', 'Mật khẩu hiện tại')}
                      </label>
                      <Input
                        type="password"
                        value={passwordData.current}
                        placeholder="••••••••"
                        onChange={(e) =>
                          setPasswordData({
                            ...passwordData,
                            current: e.target.value,
                          })
                        }
                        className="h-9 text-[13px] bg-background border-border rounded-none"
                      />
                    </div>

                    {/* Mật khẩu mới */}
                    <div className="space-y-1.5">
                      <label className="text-[12px] font-medium text-foreground">
                        {t('settings.newPassword', 'Mật khẩu mới')}
                      </label>
                      <Input
                        type="password"
                        value={passwordData.next}
                        placeholder={t('settings.newPasswordPlaceholder', 'Tối thiểu 8 ký tự (chữ hoa, số, ký tự đặc biệt)')}
                        onChange={(e) =>
                          setPasswordData({
                            ...passwordData,
                            next: e.target.value,
                          })
                        }
                        className="h-9 text-[13px] bg-background border-border rounded-none"
                      />
                    </div>

                    {/* Xác nhận mật khẩu */}
                    <div className="space-y-1.5">
                      <label className="text-[12px] font-medium text-foreground">
                        {t('settings.confirmPassword', 'Xác nhận mật khẩu')}
                      </label>
                      <Input
                        type="password"
                        value={passwordData.confirm}
                        placeholder={t('settings.confirmPasswordPlaceholder', 'Nhập lại mật khẩu mới')}
                        onChange={(e) =>
                          setPasswordData({
                            ...passwordData,
                            confirm: e.target.value,
                          })
                        }
                        className="h-9 text-[13px] bg-background border-border rounded-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2 border-t border-border">
                    <Button
                      type="submit"
                      disabled={isChangingPassword}
                      variant="outline"
                      className="h-8 px-4 text-[13px] font-medium border-border text-foreground rounded-none shadow-none cursor-pointer hover:bg-muted disabled:opacity-50"
                    >
                      <HugeiconsIcon icon={Key01Icon} size={14} className="mr-1.5" />
                      {isChangingPassword
                        ? 'Đang cập nhật...'
                        : t('settings.changePasswordBtn', 'Cập nhật mật khẩu')}
                    </Button>
                  </div>
                </form>

                {/* Card 2: Xác thực 2 bước (2FA) */}
                <div className="bg-card border border-border p-5 space-y-3 rounded-none shadow-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-[14px] font-semibold text-foreground">
                        {t('settings.twoFactorTitle', 'Xác thực 2 bước (2FA) qua Email')}
                      </p>
                      <span
                        className={cn(
                          'px-2 py-0.5 text-[11px] font-medium',
                          is2FAEnabled
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                            : 'bg-muted text-muted-foreground border border-border',
                        )}
                      >
                        {is2FAEnabled
                          ? t('settings.twoFactorEnabled', 'Đang bật')
                          : t('settings.twoFactorDisabled', 'Chưa bật')}
                      </span>
                    </div>
                    <p className="text-[12px] text-muted-foreground leading-relaxed">
                      {t(
                        'settings.twoFactorDesc',
                        'Khi bật, hệ thống sẽ yêu cầu nhập mã OTP gồm 6 chữ số gửi tới email mỗi khi bạn đăng nhập từ phiên làm việc mới.',
                      )}
                    </p>
                  </div>

                  {!is2FAStep && (
                    <div className="pt-2 flex justify-start">
                      {is2FAEnabled ? (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIs2FAStep('disabling')}
                          className="h-8 px-3 text-[12px] font-medium text-destructive border-destructive/30 hover:bg-destructive/10 rounded-none cursor-pointer"
                        >
                          {t('settings.twoFactorDisableBtn', 'Tắt 2FA')}
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          onClick={handleStartEnable2FA}
                          disabled={is2FALoading}
                          className="h-8 px-3 text-[12px] font-medium bg-[#1447e6] hover:bg-[#1447e6]/90 text-white rounded-none cursor-pointer"
                        >
                          {is2FALoading
                            ? t('settings.twoFactorSending', 'Đang gửi mã...')
                            : t('settings.twoFactorEnableBtn', 'Bật 2FA ngay')}
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Step 1: Confirm enabling via OTP */}
                  {is2FAStep === 'enabling' && (
                    <div className="pt-3 border-t border-border space-y-3">
                      <div className="space-y-1">
                        <label className="text-[12px] font-normal text-foreground">
                          {t(
                            'settings.twoFactorOtpPrompt',
                            'Nhập mã xác thực OTP 6 chữ số gửi tới email của bạn:',
                          )}
                        </label>
                        <Input
                          type="text"
                          maxLength={6}
                          autoFocus
                          placeholder={t('settings.twoFactorOtpPlaceholder', 'Nhập mã 6 chữ số')}
                          value={twoFactorOtpInput}
                          onChange={(e) =>
                            setTwoFactorOtpInput(e.target.value.replace(/\D/g, ''))
                          }
                          className="h-9 max-w-[240px] text-[13px] font-mono tracking-widest bg-background border-border rounded-none"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          disabled={is2FALoading || twoFactorOtpInput.length !== 6}
                          onClick={handleConfirmEnable2FA}
                          className="h-8 px-3 text-[12px] font-medium bg-[#1447e6] hover:bg-[#1447e6]/90 text-white rounded-none cursor-pointer"
                        >
                          {is2FALoading
                            ? t('settings.twoFactorConfirming', 'Đang xác nhận...')
                            : t('settings.twoFactorConfirmEnableBtn', 'Xác nhận kích hoạt')}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => {
                            setIs2FAStep(null);
                            setTwoFactorOtpInput('');
                          }}
                          className="h-8 px-3 text-[12px] text-muted-foreground hover:text-foreground rounded-none cursor-pointer"
                        >
                          {t('settings.cancel', 'Hủy')}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Step 2: Confirm disabling via Password */}
                  {is2FAStep === 'disabling' && (
                    <div className="pt-3 border-t border-border space-y-3">
                      <div className="space-y-1">
                        <label className="text-[12px] font-normal text-foreground">
                          {t(
                            'settings.twoFactorDisablePrompt',
                            'Nhập mật khẩu tài khoản hiện tại để xác nhận tắt 2FA:',
                          )}
                        </label>
                        <Input
                          type="password"
                          autoFocus
                          placeholder="••••••••"
                          value={disablePasswordInput}
                          onChange={(e) => setDisablePasswordInput(e.target.value)}
                          className="h-9 max-w-[240px] text-[13px] bg-background border-border rounded-none"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          disabled={is2FALoading || !disablePasswordInput}
                          onClick={handleConfirmDisable2FA}
                          className="h-8 px-3 text-[12px] font-medium bg-destructive hover:bg-destructive/90 text-white rounded-none cursor-pointer"
                        >
                          {is2FALoading
                            ? t('settings.twoFactorProcessing', 'Đang xử lý...')
                            : t('settings.twoFactorConfirmDisableBtn', 'Xác nhận tắt')}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => {
                            setIs2FAStep(null);
                            setDisablePasswordInput('');
                          }}
                          className="h-8 px-3 text-[12px] text-muted-foreground hover:text-foreground rounded-none cursor-pointer"
                        >
                          {t('settings.cancel', 'Hủy')}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Card 3: Phiên đăng nhập hoạt động */}
                <div className="bg-card border border-border p-5 space-y-4 rounded-none shadow-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[14px] font-semibold text-foreground">
                        {t('settings.currentSessionTitle', 'Phiên đăng nhập hiện tại')}
                      </p>
                      <p className="text-[12px] text-muted-foreground mt-0.5">
                        {t(
                          'settings.currentSessionDesc',
                          'Thông tin thiết bị, mạng truy cập và lần hoạt động gần nhất từ hệ thống',
                        )}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={fetchSessions}
                      disabled={isLoadingSessions}
                      className="h-7 px-2 text-[11px] font-medium text-muted-foreground hover:text-foreground rounded-none gap-1.5 cursor-pointer"
                      title={t('settings.refreshSessions', 'Làm mới danh sách phiên')}
                    >
                      <HugeiconsIcon
                        icon={ArrowReloadHorizontalIcon}
                        size={13}
                        className={cn(isLoadingSessions && 'animate-spin')}
                      />
                      <span>{t('settings.refresh', 'Làm mới')}</span>
                    </Button>
                  </div>

                  {/* Current Session Item */}
                  {(() => {
                    const currentSession = sessions.find((s) => s.isCurrent);
                    const clientUa = parseClientUserAgent();
                    const isMobile =
                      currentSession?.userAgent
                        ? /mobile|android|iphone|ipad/i.test(currentSession.userAgent)
                        : clientUa.deviceType === 'mobile' || clientUa.deviceType === 'tablet';

                    const displayDevice = currentSession?.userAgent
                      ? currentSession.userAgent.length > 50
                        ? currentSession.userAgent.slice(0, 50) + '...'
                        : currentSession.userAgent
                      : clientUa.display;

                    const displayIp = currentSession?.ipAddress
                      ? `IP: ${currentSession.ipAddress}`
                      : 'Cơ sở Sorak Cao Lãnh';

                    const currentActiveTimestamp =
                      currentSession?.lastActiveAt || currentSession?.lastActive || currentSession?.createdAt;
                    const displayTime = currentSession?.isCurrent
                      ? t('settings.activeNow', 'Hoạt động vừa xong')
                      : formatRelativeTime(currentActiveTimestamp, t);

                    return (
                      <div className="flex items-center justify-between p-3.5 border border-border bg-muted/20">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2 border border-border bg-background shrink-0">
                            <HugeiconsIcon
                              icon={isMobile ? SmartPhone01Icon : ComputerIcon}
                              size={18}
                              className="text-primary"
                            />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[13px] font-medium text-foreground truncate">
                                {displayDevice}
                              </span>
                            </div>
                            <span className="text-[11px] text-muted-foreground truncate">
                              {displayIp} · {displayTime}
                            </span>
                          </div>
                        </div>
                        <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shrink-0 ml-3">
                          {t('settings.thisDevice', 'Thiết bị này')}
                        </span>
                      </div>
                    );
                  })()}

                  {/* Other Active Sessions (if any) */}
                  {(() => {
                    const otherSessions = sessions.filter((s) => !s.isCurrent);
                    if (otherSessions.length === 0) return null;

                    return (
                      <div className="space-y-2 pt-2 border-t border-border/60">
                        <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider">
                          {t('settings.otherActiveSessions', 'Các phiên đăng nhập khác')} ({otherSessions.length})
                        </p>
                        <div className="space-y-2">
                          {otherSessions.map((session) => {
                            const isMobile = /mobile|android|iphone|ipad/i.test(session.userAgent || '');
                            const displayDevice = session.userAgent
                              ? session.userAgent.length > 50
                                ? session.userAgent.slice(0, 50) + '...'
                                : session.userAgent
                              : 'Thiết bị khác';
                            const displayIp = session.ipAddress ? `IP: ${session.ipAddress}` : 'Sorak Network';
                            const otherActiveTimestamp =
                              session.lastActiveAt || session.lastActive || session.createdAt;
                            const displayTime = formatRelativeTime(otherActiveTimestamp, t);

                            return (
                              <div
                                key={session.id}
                                className="flex items-center justify-between p-3 border border-border bg-background hover:bg-muted/10 transition-colors"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="p-2 border border-border bg-muted/30 shrink-0">
                                    <HugeiconsIcon
                                      icon={isMobile ? SmartPhone01Icon : ComputerIcon}
                                      size={18}
                                      className="text-muted-foreground"
                                    />
                                  </div>
                                  <div className="flex flex-col min-w-0">
                                    <span className="text-[13px] font-medium text-foreground truncate">
                                      {displayDevice}
                                    </span>
                                    <span className="text-[11px] text-muted-foreground truncate">
                                      {displayIp} · {displayTime}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Danger Zone: Log out of all devices */}
                  <div className="pt-3 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/15 p-3.5">
                    <div className="space-y-0.5 min-w-0">
                      <p className="text-[13px] font-medium text-foreground flex items-center gap-1.5">
                        <HugeiconsIcon icon={Logout01Icon} size={14} className="text-destructive shrink-0" />
                        <span>{t('settings.logoutAllTitle', 'Đăng xuất khỏi tất cả thiết bị')}</span>
                      </p>
                      <p className="text-[11px] text-muted-foreground leading-normal">
                        {t(
                          'settings.logoutAllDesc',
                          'Đăng xuất tài khoản khỏi tất cả thiết bị (bao gồm thiết bị này)',
                        )}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isRevokingAll}
                      onClick={handleRevokeAllSessions}
                      className="h-8 px-3 text-[12px] font-medium text-destructive border-destructive/40 hover:bg-destructive hover:text-white rounded-none cursor-pointer shrink-0 transition-colors"
                    >
                      {isRevokingAll
                        ? t('settings.revoking', 'Đang xử lý...')
                        : t('settings.logoutAllBtn', 'Đăng xuất tất cả thiết bị')}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* TAB 3: CÀI ĐẶT THÔNG BÁO (NOTIFICATIONS) */}
            {/* ============================================================== */}
            {activeTab === 'notifications' && (
              <div className="space-y-6 animate-in fade-in-50 duration-150">
                <div className="space-y-0.5">
                  <h3 className="text-[17px] font-semibold text-foreground tracking-tight">
                    {t('settings.navNotifications', 'Cài đặt thông báo')}
                  </h3>
                  <p className="text-[13px] text-muted-foreground">
                    {t(
                      'settings.notificationsSubtitle',
                      'Tùy chỉnh các thông báo bạn muốn nhận qua Email và trên hệ thống',
                    )}
                  </p>
                </div>

                {/* Email Notifications */}
                <div className="bg-card border border-border p-5 space-y-4 rounded-none shadow-xs">
                  <div className="flex items-center gap-2 pb-2 border-b border-border">
                    <HugeiconsIcon icon={Mail01Icon} size={16} className="text-primary" />
                    <p className="text-[14px] font-semibold text-foreground">
                      {t('settings.emailNotifTitle', 'Thông báo qua Email')}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <label className="flex items-start justify-between gap-4 cursor-pointer">
                      <div className="flex flex-col">
                        <span className="text-[13px] font-medium text-foreground">
                          {t('settings.notifAcademic', 'Hoạt động lớp học & Điểm danh')}
                        </span>
                        <span className="text-[12px] text-muted-foreground">
                          {t(
                            'settings.notifAcademicDesc',
                            'Nhận email khi có lớp chưa hoàn tất điểm danh hoặc cập nhật sổ liên lạc',
                          )}
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={notificationPrefs.emailAcademic}
                        onChange={() => toggleNotificationPref('emailAcademic')}
                        className="mt-1 size-4 rounded-none text-primary cursor-pointer accent-[#1447e6]"
                      />
                    </label>

                    <div className="h-px bg-border/60" />

                    <label className="flex items-start justify-between gap-4 cursor-pointer">
                      <div className="flex flex-col">
                        <span className="text-[13px] font-medium text-foreground">
                          {t('settings.notifTransfers', 'Đơn xin nghỉ & Yêu cầu chuyển lớp')}
                        </span>
                        <span className="text-[12px] text-muted-foreground">
                          {t(
                            'settings.notifTransfersDesc',
                            'Nhận email thông báo ngay khi phụ huynh nộp đơn mới cần phê duyệt',
                          )}
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={notificationPrefs.emailTransfers}
                        onChange={() => toggleNotificationPref('emailTransfers')}
                        className="mt-1 size-4 rounded-none text-primary cursor-pointer accent-[#1447e6]"
                      />
                    </label>

                    <div className="h-px bg-border/60" />

                    <label className="flex items-start justify-between gap-4 cursor-pointer">
                      <div className="flex flex-col">
                        <span className="text-[13px] font-medium text-foreground">
                          {t('settings.notifSecurity', 'Cảnh báo bảo mật tài khoản')}
                        </span>
                        <span className="text-[12px] text-muted-foreground">
                          {t(
                            'settings.notifSecurityDesc',
                            'Nhận email khi có đăng nhập từ thiết bị lạ hoặc thay đổi mật khẩu',
                          )}
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={notificationPrefs.emailSecurity}
                        onChange={() => toggleNotificationPref('emailSecurity')}
                        className="mt-1 size-4 rounded-none text-primary cursor-pointer accent-[#1447e6]"
                      />
                    </label>
                  </div>
                </div>

                {/* System & Sound Notifications */}
                <div className="bg-card border border-border p-5 space-y-4 rounded-none shadow-xs">
                  <div className="flex items-center gap-2 pb-2 border-b border-border">
                    <HugeiconsIcon icon={Notification03Icon} size={16} className="text-primary" />
                    <p className="text-[14px] font-semibold text-foreground">
                      {t('settings.systemNotifTitle', 'Thông báo trên hệ thống')}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <label className="flex items-start justify-between gap-4 cursor-pointer">
                      <div className="flex flex-col">
                        <span className="text-[13px] font-medium text-foreground">
                          {t('settings.notifBrowserPush', 'Thông báo đẩy trên trình duyệt')}
                        </span>
                        <span className="text-[12px] text-muted-foreground">
                          {t(
                            'settings.notifBrowserPushDesc',
                            'Hiển thị pop-up thông báo nhanh ở góc màn hình máy tính',
                          )}
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={notificationPrefs.browserPush}
                        onChange={() => toggleNotificationPref('browserPush')}
                        className="mt-1 size-4 rounded-none text-primary cursor-pointer accent-[#1447e6]"
                      />
                    </label>

                    <div className="h-px bg-border/60" />

                    <label className="flex items-start justify-between gap-4 cursor-pointer">
                      <div className="flex flex-col">
                        <span className="text-[13px] font-medium text-foreground">
                          {t('settings.notifSound', 'Âm thanh thông báo')}
                        </span>
                        <span className="text-[12px] text-muted-foreground">
                          {t(
                            'settings.notifSoundDesc',
                            'Phát âm thanh nhẹ khi có thông báo mới gửi đến',
                          )}
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={notificationPrefs.notificationSound}
                        onChange={() => toggleNotificationPref('notificationSound')}
                        className="mt-1 size-4 rounded-none text-primary cursor-pointer accent-[#1447e6]"
                      />
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* TAB 4: GIAO DIỆN & HIỂN THỊ (APPEARANCE) */}
            {/* ============================================================== */}
            {activeTab === 'appearance' && (
              <div className="space-y-6 animate-in fade-in-50 duration-150">
                <div className="space-y-0.5">
                  <h3 className="text-[17px] font-semibold text-foreground tracking-tight">
                    {t('settings.navAppearance', 'Giao diện & Hiển thị')}
                  </h3>
                  <p className="text-[13px] text-muted-foreground">
                    {t(
                      'settings.appearanceSubtitle',
                      'Tùy chỉnh chế độ hiển thị sáng, tối và kiểu dáng hệ thống',
                    )}
                  </p>
                </div>

                {/* Theme Selector */}
                <div className="bg-card border border-border p-5 space-y-4 rounded-none shadow-xs">
                  <div className="space-y-0.5">
                    <p className="text-[14px] font-semibold text-foreground">
                      {t('settings.themeModeTitle', 'Chế độ màu giao diện')}
                    </p>
                    <p className="text-[12px] text-muted-foreground">
                      {t(
                        'settings.themeModeDesc',
                        'Chọn chủ đề màu phù hợp với điều kiện ánh sáng làm việc của bạn',
                      )}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                    {/* Option 1: Light */}
                    <div
                      onClick={() => handleThemeSelect('light')}
                      className={cn(
                        'border p-4 rounded-none cursor-pointer transition-all flex flex-col justify-between gap-3',
                        themeMode === 'light'
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'border-border bg-card hover:border-border/90 hover:bg-muted/30',
                      )}
                    >
                      <div className="h-24 bg-[#f8f9fa] border border-border/80 p-2 rounded-none flex flex-col gap-1.5 shadow-2xs">
                        <div className="h-2 w-12 bg-primary/70" />
                        <div className="flex gap-1.5 flex-1">
                          <div className="w-6 bg-slate-200 h-full" />
                          <div className="flex-1 bg-white border border-slate-200 p-1 flex flex-col gap-1">
                            <div className="h-1.5 w-16 bg-slate-300" />
                            <div className="h-1.5 w-full bg-slate-100" />
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <HugeiconsIcon icon={Sun02Icon} size={15} className="text-amber-500" />
                          <span className="text-[13px] font-medium text-foreground">
                            {t('settings.themeLight', 'Giao diện Sáng')}
                          </span>
                        </div>
                        {themeMode === 'light' && (
                          <HugeiconsIcon icon={Tick02Icon} size={16} className="text-primary" />
                        )}
                      </div>
                    </div>

                    {/* Option 2: Dark */}
                    <div
                      onClick={() => handleThemeSelect('dark')}
                      className={cn(
                        'border p-4 rounded-none cursor-pointer transition-all flex flex-col justify-between gap-3',
                        themeMode === 'dark'
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'border-border bg-card hover:border-border/90 hover:bg-muted/30',
                      )}
                    >
                      <div className="h-24 bg-[#0f172a] border border-slate-800 p-2 rounded-none flex flex-col gap-1.5 shadow-2xs">
                        <div className="h-2 w-12 bg-primary/70" />
                        <div className="flex gap-1.5 flex-1">
                          <div className="w-6 bg-slate-800 h-full" />
                          <div className="flex-1 bg-[#1e293b] border border-slate-700 p-1 flex flex-col gap-1">
                            <div className="h-1.5 w-16 bg-slate-600" />
                            <div className="h-1.5 w-full bg-slate-700/50" />
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <HugeiconsIcon icon={Moon02Icon} size={15} className="text-indigo-400" />
                          <span className="text-[13px] font-medium text-foreground">
                            {t('settings.themeDark', 'Giao diện Tối')}
                          </span>
                        </div>
                        {themeMode === 'dark' && (
                          <HugeiconsIcon icon={Tick02Icon} size={16} className="text-primary" />
                        )}
                      </div>
                    </div>

                    {/* Option 3: System */}
                    <div
                      onClick={() => handleThemeSelect('system')}
                      className={cn(
                        'border p-4 rounded-none cursor-pointer transition-all flex flex-col justify-between gap-3',
                        themeMode === 'system'
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'border-border bg-card hover:border-border/90 hover:bg-muted/30',
                      )}
                    >
                      <div className="h-24 border border-border p-2 rounded-none flex flex-col gap-1.5 shadow-2xs bg-gradient-to-r from-slate-100 to-slate-900">
                        <div className="h-2 w-12 bg-primary/70" />
                        <div className="flex-1 flex items-center justify-center">
                          <span className="text-[11px] font-medium px-2 py-0.5 bg-background/80 text-foreground">
                            {t('settings.themeAuto', 'Tự động')}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <HugeiconsIcon icon={ComputerIcon} size={15} className="text-muted-foreground" />
                          <span className="text-[13px] font-medium text-foreground">
                            {t('settings.themeSystem', 'Theo hệ thống')}
                          </span>
                        </div>
                        {themeMode === 'system' && (
                          <HugeiconsIcon icon={Tick02Icon} size={16} className="text-primary" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* ============================================================== */}
            {/* TAB 5: NGÔN NGỮ & KHU VỰC (LANGUAGE) */}
            {/* ============================================================== */}
            {activeTab === 'language' && (
              <div className="space-y-6 animate-in fade-in-50 duration-150">
                <div className="space-y-0.5">
                  <h3 className="text-[17px] font-semibold text-foreground tracking-tight">
                    {t('settings.navLanguage', 'Ngôn ngữ & Khu vực')}
                  </h3>
                  <p className="text-[13px] text-muted-foreground">
                    {t(
                      'settings.languageSubtitle',
                      'Chọn ngôn ngữ hiển thị và định dạng ngày giờ cho hệ thống',
                    )}
                  </p>
                </div>

                {/* Language Cards */}
                <div className="bg-card border border-border p-5 space-y-4 rounded-none shadow-xs">
                  <div className="space-y-0.5">
                    <p className="text-[14px] font-semibold text-foreground">
                      {t('settings.displayLanguageTitle', 'Ngôn ngữ hiển thị')}
                    </p>
                    <p className="text-[12px] text-muted-foreground">
                      {t(
                        'settings.displayLanguageDesc',
                        'Thay đổi ngôn ngữ toàn bộ giao diện làm việc',
                      )}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                    {/* Tiếng Việt */}
                    <div
                      onClick={() => handleLanguageSelect('vi')}
                      className={cn(
                        'border p-4 rounded-none cursor-pointer transition-all flex items-center justify-between',
                        !i18n.language.startsWith('en')
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'border-border bg-card hover:bg-muted/30',
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span className="size-8 rounded-none bg-red-600 text-yellow-300 font-bold text-[12px] flex items-center justify-center shrink-0">
                          ★
                        </span>
                        <div className="flex flex-col">
                          <span className="text-[14px] font-medium text-foreground">
                            {t('profile.langVi', 'Tiếng Việt')}
                          </span>
                          <span className="text-[12px] text-muted-foreground">
                            {t('settings.defaultLanguage', 'Ngôn ngữ mặc định')}
                          </span>
                        </div>
                      </div>
                      {!i18n.language.startsWith('en') && (
                        <HugeiconsIcon icon={Tick02Icon} size={18} className="text-primary" />
                      )}
                    </div>

                    {/* English */}
                    <div
                      onClick={() => handleLanguageSelect('en')}
                      className={cn(
                        'border p-4 rounded-none cursor-pointer transition-all flex items-center justify-between',
                        i18n.language.startsWith('en')
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'border-border bg-card hover:bg-muted/30',
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span className="size-8 rounded-none bg-blue-700 text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                          EN
                        </span>
                        <div className="flex flex-col">
                          <span className="text-[14px] font-medium text-foreground">
                            {t('profile.langEn', 'English')}
                          </span>
                          <span className="text-[12px] text-muted-foreground">
                            {t('settings.langEnSub', 'International (US)')}
                          </span>
                        </div>
                      </div>
                      {i18n.language.startsWith('en') && (
                        <HugeiconsIcon icon={Tick02Icon} size={18} className="text-primary" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Region & Time Format */}
                <div className="bg-card border border-border p-5 space-y-4 rounded-none shadow-xs">
                  <div className="space-y-0.5">
                    <p className="text-[14px] font-semibold text-foreground">
                      {t('settings.regionTitle', 'Khu vực & Định dạng thời gian')}
                    </p>
                    <p className="text-[12px] text-muted-foreground">
                      {t(
                        'settings.regionDesc',
                        'Chuẩn hiển thị ngày giờ trong hồ sơ học sinh và báo cáo',
                      )}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[12px] font-medium text-foreground">
                        {t('settings.dateFormatLabel', 'Định dạng ngày tháng')}
                      </label>
                      <div className="h-9 px-3 flex items-center bg-muted/20 border border-border text-[13px] text-foreground font-mono">
                        {t('settings.dateFormatExample', 'DD/MM/YYYY (Ví dụ: 15/10/2026)')}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[12px] font-medium text-foreground">
                        {t('settings.timezoneLabel', 'Múi giờ hệ thống')}
                      </label>
                      <div className="h-9 px-3 flex items-center bg-muted/20 border border-border text-[13px] text-foreground font-medium">
                        {t(
                          'settings.timezoneValue',
                          '(GMT+07:00) Giờ Đông Dương (Hà Nội, TP.HCM)',
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </DialogContent>
    </Dialog>
  );
}
