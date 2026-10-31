import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  Loader2,
  RotateCw,
} from 'lucide-react';
import { toast } from 'sonner';

import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '@/shared/components/LanguageSwitcher';
import { loginSchema } from './auth-schema';
import { useAuthStore, isBghRole, isParentRole } from './auth.store';
import { useAcademicYearStore } from '@/features/academic-years';
import { useClassesStore } from '@/features/classes';
import { authApi } from './auth.api';
import { AuthBrandHeader } from './AuthBrandHeader';
import { InputOTP } from '@/components/ui/input-otp';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn, useOtpCooldown, clearOtpCooldown } from '@/shared/lib/utils';

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [activeRole, setActiveRole] = useState(() => {
    try {
      const saved = localStorage.getItem('sorak-login-role');
      if (saved === 'TEACHER_GV' || saved === 'PARENT_PH') {
        return saved;
      }
    } catch (e) {}
    return 'PARENT_PH';
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Two-Factor Authentication (2FA) State - restored from sessionStorage on F5
  const [twoFactorState, setTwoFactorState] = useState(() => {
    try {
      const saved = sessionStorage.getItem('sorak_2fa_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [twoFactorOtp, setTwoFactorOtp] = useState('');
  const [isVerifying2FA, setIsVerifying2FA] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [is2FAError, setIs2FAError] = useState(false);

  // Persistent 60s cooldown for 2FA based on wall-clock time across F5
  const twoFactorCooldownKey = twoFactorState
    ? `2fa_${twoFactorState.emailMasked || twoFactorState.identifier || 'login'}`
    : null;
  const { cooldown, startCooldown } = useOtpCooldown(twoFactorCooldownKey);

  // Cloudflare Turnstile Invisible Token (Auto-generated in background)
  const isTurnstileDisabled = import.meta.env.VITE_DISABLE_TURNSTILE === 'true';
  const [captchaToken, setCaptchaToken] = useState(isTurnstileDisabled ? 'test-token-playwright' : '');
  const turnstileWidgetId = useRef(null);

  // Outside dashboard: enforce white mode & setup invisible Turnstile
  useEffect(() => {
    document.documentElement.classList.remove('dark');

    if (isTurnstileDisabled) {
      setCaptchaToken('test-token-playwright');
      return;
    }

    let checkInterval;
    let fallbackTimer;

    const setupTurnstile = () => {
      if (window.turnstile && !turnstileWidgetId.current) {
        try {
          turnstileWidgetId.current = window.turnstile.render('#turnstile-invisible-container', {
            sitekey: import.meta.env.VITE_TURNSTILE_SITE_KEY || '0x4AAAAAAFJSrvza3ZMzppmy',
            callback: (token) => {
              setCaptchaToken(token);
            },
            'expired-callback': () => {
              setCaptchaToken('');
              if (window.turnstile && turnstileWidgetId.current) {
                window.turnstile.reset(turnstileWidgetId.current);
              }
            },
            'error-callback': () => {
              console.warn('Cloudflare Turnstile encountered a challenge error');
            },
          });
        } catch (err) {
          console.warn('Turnstile render failed:', err);
        }
      }
    };

    if (window.turnstile) {
      setupTurnstile();
    } else {
      checkInterval = setInterval(() => {
        if (window.turnstile) {
          clearInterval(checkInterval);
          setupTurnstile();
        }
      }, 100);

      // Stop checking after 10s if script blocked
      fallbackTimer = setTimeout(() => {
        clearInterval(checkInterval);
      }, 10000);
    }

    return () => {
      if (checkInterval) clearInterval(checkInterval);
      if (fallbackTimer) clearTimeout(fallbackTimer);
      if (window.turnstile && turnstileWidgetId.current) {
        try {
          window.turnstile.remove(turnstileWidgetId.current);
        } catch {}
        turnstileWidgetId.current = null;
      }
    };
  }, [isTurnstileDisabled]);

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    watch,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: '',
      password: '',
      role: activeRole,
    },
  });

  const handleRoleChange = (role) => {
    setActiveRole(role);
    setValue('role', role, { shouldValidate: true });
    try {
      localStorage.setItem('sorak-login-role', role);
    } catch (e) {}
  };

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      localStorage.setItem('sorak-login-role', activeRole);
    } catch (e) {}

    // Ensure valid Turnstile token is available
    let token = isTurnstileDisabled ? 'test-token-playwright' : captchaToken;
    if (!isTurnstileDisabled && !token && window.turnstile && turnstileWidgetId.current) {
      token = window.turnstile.getResponse(turnstileWidgetId.current);
    }

    // If user clicked immediately before background Turnstile challenge resolved, wait up to 2.5s
    if (!isTurnstileDisabled && !token && window.turnstile && turnstileWidgetId.current) {
      const start = Date.now();
      while (!token && Date.now() - start < 2500) {
        await new Promise((r) => setTimeout(r, 100));
        token = window.turnstile.getResponse(turnstileWidgetId.current) || captchaToken;
      }
    }

    try {
      const response = await authApi.login({
        identifier: data.identifier,
        password: data.password,
        role: activeRole,
        captchaToken: token || '',
      });

      // Check if user account has 2FA enabled
      const payload = response.data || response;
      if (payload.requires2FA) {
        const formValues = getValues();
        const pendingSession = {
          tempToken: payload.tempToken,
          emailMasked: payload.emailMasked,
          identifier: formValues.identifier,
        };
        try {
          sessionStorage.setItem('sorak_2fa_session', JSON.stringify(pendingSession));
        } catch {}
        setTwoFactorState(pendingSession);
        setTwoFactorOtp('');
        startCooldown(60);
        toast.info(t('auth.twoFactorRequired', 'Yêu cầu xác thực 2 bước (2FA)'), {
          description: payload.message || t('auth.twoFactorSent', 'Mã xác thực OTP gồm 6 chữ số đã được gửi tới email của bạn.'),
        });
        return;
      }

      const { user, accessToken } = payload;
      setAuth(user, accessToken);

      toast.success(t('auth.loginSuccess', 'Đăng nhập thành công!'), {
        description: t('auth.welcomeBack', 'Chào mừng {{name}} quay trở lại hệ thống Sorak.', {
          name: user.name || user.identifier,
        }),
      });

      const isParent = isParentRole(user.role);

      // Đồng bộ năm học đang hoạt động và xóa lớp đã ghim từ phiên cũ khi đăng nhập
      if (!isParent) {
        try {
          await useAcademicYearStore.getState().fetchAcademicYears({ forceActive: true });
        } catch (e) {
          console.warn('Error selecting active academic year on login:', e);
        }
        try {
          localStorage.removeItem('sorak_attached_class_id');
          useClassesStore.getState().detachClass();
        } catch {}
      }

      let destination = '/classes';
      if (isParent) {
        destination = location.state?.from?.pathname?.startsWith('/parent')
          ? location.state.from.pathname
          : '/parent';
      } else {
        const fromPath = location.state?.from?.pathname;
        if (
          fromPath &&
          !fromPath.startsWith('/parent') &&
          fromPath !== '/' &&
          fromPath !== '/login' &&
          !fromPath.startsWith('/classes/')
        ) {
          destination = fromPath;
        } else {
          destination = '/classes';
        }
      }
      navigate(destination, { replace: true });
    } catch (error) {
      // If login failed, reset Turnstile so the next attempt receives a fresh single-use token
      if (window.turnstile && turnstileWidgetId.current) {
        setCaptchaToken('');
        try {
          window.turnstile.reset(turnstileWidgetId.current);
        } catch {}
      }

      const errorMsg =
        error.response?.data?.message ||
        error.message ||
        t('auth.invalidCredentials', 'Tài khoản hoặc mật khẩu không chính xác.');

      toast.error(t('auth.loginFailed', 'Đăng nhập thất bại'), {
        description: errorMsg,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

    const handleResend2FA = async () => {
      if (cooldown > 0 || isResending) return;
      try {
        setIsResending(true);
        const formValues = getValues();
        const identifier = twoFactorState?.identifier || formValues.identifier;
        const password = formValues.password;
        const token = captchaToken || `turnstile-${Math.random().toString(36).substring(2)}`;
        const response = await authApi.login({
          identifier,
          password,
          role: activeRole,
          captchaToken: token,
        });
        const data = response.data || response;
        if (data.requires2FA) {
          const updatedSession = {
            tempToken: data.tempToken,
            emailMasked: data.emailMasked,
            identifier,
          };
          try {
            sessionStorage.setItem('sorak_2fa_session', JSON.stringify(updatedSession));
          } catch {}
          setTwoFactorState(updatedSession);
        }
        startCooldown(60);
        toast.info(t('auth.resendOtpSuccess', 'Đã gửi lại mã OTP!'), {
          description: data.message || t('auth.twoFactorSent', 'Mã xác thực mới đã được gửi tới email của bạn.'),
        });
      } catch (err) {
        const errorMsg =
          err.response?.data?.message ||
          err.message ||
          t('auth.resendOtpFailed', 'Gửi lại mã OTP thất bại');
        toast.error(t('auth.resendOtpFailed', 'Gửi lại mã OTP thất bại'), {
          description: errorMsg,
        });
      } finally {
        setIsResending(false);
      }
    };

    const handleVerify2FA = async (e) => {
      if (e?.preventDefault) e.preventDefault();
      const cleanOtp = twoFactorOtp.trim();
      if (!cleanOtp || cleanOtp.length !== 6) {
        toast.error(t('auth.otpFailed', 'Mã OTP không hợp lệ'), {
          description: t('auth.otpInvalidOrExpired', 'Vui lòng nhập chính xác mã OTP gồm 6 chữ số.'),
        });
        return;
      }

      setIsVerifying2FA(true);
      try {
        const response = await authApi.verify2FA({
          tempToken: twoFactorState.tempToken,
          otp: cleanOtp,
        });

        const { user, accessToken } = response.data || response;
        try {
          sessionStorage.removeItem('sorak_2fa_session');
        } catch {}
        if (twoFactorCooldownKey) clearOtpCooldown(twoFactorCooldownKey);
        setAuth(user, accessToken);

        toast.success(t('auth.loginSuccess', 'Đăng nhập thành công!'), {
          description: t('auth.welcomeBack', 'Chào mừng {{name}} quay trở lại hệ thống Sorak.', {
            name: user.name || user.identifier,
          }),
        });

        const isParent = isParentRole(user.role);

        // Đồng bộ năm học đang hoạt động và xóa lớp đã ghim từ phiên cũ khi đăng nhập 2FA
        if (!isParent) {
          try {
            await useAcademicYearStore.getState().fetchAcademicYears({ forceActive: true });
          } catch (e) {
            console.warn('Error selecting active academic year on 2FA login:', e);
          }
          try {
            localStorage.removeItem('sorak_attached_class_id');
            useClassesStore.getState().detachClass();
          } catch {}
        }

        let destination = '/classes';
        if (isParent) {
          destination = location.state?.from?.pathname?.startsWith('/parent')
            ? location.state.from.pathname
            : '/parent';
        } else {
          const fromPath = location.state?.from?.pathname;
          if (
            fromPath &&
            !fromPath.startsWith('/parent') &&
            fromPath !== '/' &&
            fromPath !== '/login' &&
            !fromPath.startsWith('/classes/')
          ) {
            destination = fromPath;
          } else {
            destination = '/classes';
          }
        }
        navigate(destination, { replace: true });
      } catch (error) {
        const errorMsg =
          error.response?.data?.message ||
          error.message ||
          t('auth.otpInvalidOrExpired', 'Mã OTP không chính xác hoặc đã hết hạn.');

        toast.error(t('auth.otpFailed', 'Xác thực thất bại'), {
          description: errorMsg,
        });

        // Reset from start on incorrect OTP
        setTwoFactorOtp('');
        setIs2FAError(true);
        setTimeout(() => setIs2FAError(false), 800);
      } finally {
        setIsVerifying2FA(false);
      }
    };

    return (
      <div
        className="relative min-h-screen w-full flex items-center justify-center p-4 bg-slate-100 overflow-hidden"
        data-node-id="4017:794"
        data-name={twoFactorState ? "2FA Verification" : "Login · Phụ huynh (Default)"}
      >
        {/* Background Illustration from Figma */}
        <img
          src={twoFactorState ? "/otp-verify-bg.webp" : "/login-bg.webp"}
          alt="Sorak Background"
          className="absolute inset-0 size-full object-cover pointer-events-none select-none"
        />

      {/* Subtle backdrop overlay for high readability */}
      <div className="absolute inset-0 bg-black/10 pointer-events-none" />

      {/* Main Container */}
      <div className="relative z-10 flex flex-col items-center w-full max-w-[382px] my-auto">
        {/* Login Card */}
        <div
          className="w-full bg-card/95 backdrop-blur-sm border border-border/80 rounded-none shadow-xl p-6 sm:p-7 flex flex-col"
          data-node-id="4017:803"
        >
          {/* Unified Brand Header matching Gmail OTP format */}
          <AuthBrandHeader className="mb-5" />

          {twoFactorState ? (
            /* 2FA Verification Card State (Consistent with OtpVerifyPage) */
            <>
              {/* Card Header */}
              <div className="text-center mb-6" data-node-id="4036:22872">
                <h1 className="text-xl font-semibold tracking-tight text-card-foreground">
                  {t('auth.twoFactorTitle', 'Xác thực đăng nhập')}
                </h1>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {t('auth.twoFactorSubtitle', 'Nhập mã xác thực chúng tôi đã gửi tới địa chỉ email: {{email}}', {
                    email: twoFactorState.emailMasked,
                  })}
                </p>
              </div>

              {/* Form */}
              <form
                onSubmit={handleVerify2FA}
                className="space-y-4"
                noValidate
              >
                <div className="space-y-2" data-node-id="4036:22874">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">
                      {t('auth.verificationCode', 'Mã xác thực')}
                    </Label>
                    <button
                      type="button"
                      disabled={cooldown > 0 || isResending}
                      onClick={handleResend2FA}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors py-0.5 px-1.5 rounded-none border border-border/60 bg-muted/30 cursor-pointer"
                      data-node-id="4036:22876"
                    >
                      <RotateCw
                        className={`size-3 ${isResending ? 'animate-spin' : ''}`}
                      />
                      {cooldown > 0
                        ? t('auth.resendIn', 'Gửi lại sau ({{seconds}}s)', { seconds: cooldown })
                        : t('auth.resendCode', 'Gửi lại mã')}
                    </button>
                  </div>

                  {/* Segmented 6-digit OTP component */}
                  <div className="flex justify-center py-2" data-node-id="4036:22877">
                    <InputOTP
                      value={twoFactorOtp}
                      onChange={(val) => {
                        if (is2FAError) setIs2FAError(false);
                        setTwoFactorOtp(val);
                      }}
                      isError={is2FAError}
                      disabled={isVerifying2FA}
                    />
                  </div>

                  {/* Access help link */}
                  <div className="pt-1 text-center" data-node-id="4036:22887">
                    <a
                      href="#no-access"
                      onClick={(e) => {
                        e.preventDefault();
                        toast.info(t('auth.accountSupport', 'Hỗ trợ tài khoản'), {
                          description: t(
                            'auth.contactAdminForEmail',
                            'Vui lòng liên hệ ban giám hiệu hoặc giáo viên phụ trách để cập nhật lại email.',
                          ),
                        });
                      }}
                      className="text-[12px] text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
                    >
                      {t('auth.lostEmailAccess', 'Tôi không còn quyền truy cập email này.')}
                    </a>
                  </div>
                </div>

                {/* Verify Submit Button */}
                <Button
                  type="submit"
                  disabled={isVerifying2FA || twoFactorOtp.length !== 6}
                  className="w-full h-9 mt-3 bg-[#1447e6] hover:bg-[#103ec2] text-white text-xs font-medium shadow-sm transition-all active:scale-[0.99] rounded-none cursor-pointer"
                  data-node-id="I4036:22888;1925:1523"
                >
                  {isVerifying2FA ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin mr-1.5" />
                      {t('auth.verifying', 'Đang xác thực...')}
                    </>
                  ) : (
                    t('auth.verifyAndLogin', 'Xác nhận & Đăng nhập')
                  )}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    try {
                      sessionStorage.removeItem('sorak_2fa_session');
                    } catch {}
                    setTwoFactorState(null);
                    setTwoFactorOtp('');
                  }}
                  className="w-full h-8 text-xs text-muted-foreground hover:text-foreground rounded-none cursor-pointer mt-1"
                >
                  {t('auth.backToLogin', 'Quay lại đăng nhập')}
                </Button>
              </form>

              {/* Support Footer */}
              <div
                className="mt-5 pt-4 border-t border-border/50 text-center space-y-1.5"
                data-node-id="4036:22888"
              >
                <p className="text-[12px] text-muted-foreground">
                  {t('auth.troubleLoggingIn', 'Gặp sự cố khi đăng nhập?')}{' '}
                  <a
                    href="#support"
                    onClick={(e) => {
                      e.preventDefault();
                      toast.info(t('auth.schoolHotline', 'Hotline trường'), {
                        description: 'Hotline: 1900 6868 (8:00 - 17:30 từ Thứ 2 đến Thứ 6)',
                      });
                    }}
                    className="text-foreground font-medium underline underline-offset-2 hover:text-primary transition-colors"
                  >
                    {t('auth.contactSupport', 'Liên hệ hỗ trợ')}
                  </a>
                </p>
              </div>
            </>
          ) : (
            <>
              {/* Card Header */}
              <div className="text-center mb-5" data-node-id="4017:804">
                <h1 className="text-xl font-semibold tracking-tight text-card-foreground">
                  {t('auth.loginTitle', 'Đăng nhập')}
                </h1>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('auth.loginSubtitle', 'Chọn loại tài khoản để tiếp tục')}
                </p>
              </div>

              {/* Segmented Role Switcher */}
              <div
                className="bg-muted p-1 rounded-none flex items-center h-9 mb-5"
                data-node-id="4104:2407"
                role="tablist"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeRole === 'PARENT_PH'}
                  onClick={() => handleRoleChange('PARENT_PH')}
                  className={cn(
                    'flex-1 h-7 text-xs font-medium rounded-none transition-all duration-150 flex items-center justify-center',
                    activeRole === 'PARENT_PH'
                      ? 'bg-background text-foreground shadow-sm font-semibold'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {t('auth.parentTab', 'Phụ huynh')}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeRole === 'TEACHER_GV'}
                  onClick={() => handleRoleChange('TEACHER_GV')}
                  className={cn(
                    'flex-1 h-7 text-xs font-medium rounded-none transition-all duration-150 flex items-center justify-center',
                    activeRole === 'TEACHER_GV'
                      ? 'bg-background text-foreground shadow-sm font-semibold'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {t('auth.schoolTab', 'Nhà trường')}
                </button>
              </div>

              {/* Login Form */}
              <form
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-4"
                noValidate
              >
            {/* Identifier Field */}
            <div className="space-y-1.5" data-node-id="4017:816">
              <Label htmlFor="identifier" className="text-xs font-medium">
                {activeRole === 'PARENT_PH'
                  ? t('auth.identifierLabelParent', 'Tên đăng nhập')
                  : t('auth.identifierLabelSchool', 'Tên đăng nhập')}
              </Label>
              <Input
                id="identifier"
                type="text"
                placeholder={
                  activeRole === 'PARENT_PH'
                    ? t('auth.identifierPlaceholderParent', 'Ví dụ: HS26001')
                    : t('auth.identifierPlaceholderSchool', 'Ví dụ: CB20001, CB24001')
                }
                autoComplete="username"
                disabled={isSubmitting}
                className={cn(
                  'h-9 text-xs placeholder:text-muted-foreground/70 bg-background',
                  errors.identifier &&
                    'border-destructive focus-visible:ring-destructive',
                )}
                {...register('identifier')}
              />
              {errors.identifier && (
                <p className="text-[11px] font-medium text-destructive leading-tight">
                  {errors.identifier.message}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-1.5" data-node-id="4017:819">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-medium">
                  {t('auth.password', 'Mật khẩu')}
                </Label>
                <Link
                  to={
                    watch('identifier')?.trim()
                      ? `/forgot-password?identifier=${encodeURIComponent(watch('identifier').trim())}&role=${activeRole}`
                      : `/forgot-password?role=${activeRole}`
                  }
                  className="text-[11px] text-muted-foreground hover:text-foreground hover:underline transition-colors"
                >
                  {t('auth.forgotPassword', 'Quên mật khẩu?')}
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  disabled={isSubmitting}
                  className={cn(
                    'h-9 text-xs pr-9 bg-background',
                    errors.password &&
                      'border-destructive focus-visible:ring-destructive',
                  )}
                  {...register('password')}
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-none transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="size-3.5" />
                  ) : (
                    <Eye className="size-3.5" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-[11px] font-medium text-destructive leading-tight">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Cloudflare Turnstile Invisible Container */}
            <div id="turnstile-invisible-container" aria-hidden="true" className="w-0 h-0 opacity-0 overflow-hidden pointer-events-none" />

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-9 mt-1 bg-[#1447e6] hover:bg-[#103ec2] disabled:opacity-50 text-white text-xs font-medium shadow-sm transition-all active:scale-[0.99] rounded-none"
              data-node-id="4017:824"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin mr-1.5" />
                  {t('auth.loggingIn', 'Đang đăng nhập...')}
                </>
              ) : (
                t('auth.loginButton', 'Đăng nhập')
              )}
            </Button>
          </form>

          {/* Footers & Disclaimers */}
          <div className="mt-5 pt-4 border-t border-border/50 text-center space-y-2.5">
            <p
              className="text-xs text-foreground/80 font-normal"
              data-node-id="4017:826"
            >
              {t('auth.schoolProvided', 'Tài khoản được nhà trường cung cấp')}
            </p>
            <p
              className="text-[11px] text-muted-foreground leading-relaxed px-2"
              data-node-id="4100:4259"
            >
              {t('auth.agreementPrefix', 'Bằng cách tiếp tục, bạn đồng ý với ')}
              <a
                href="#terms"
                onClick={(e) => {
                  e.preventDefault();
                  toast.info(t('auth.terms', 'Điều khoản'), {
                    description: 'Tài liệu điều khoản sử dụng của hệ thống Sorak.',
                  });
                }}
                className="text-foreground/90 font-medium underline underline-offset-2 hover:text-primary transition-colors"
              >
                {t('auth.terms', 'Điều khoản')}
              </a>
              {t('auth.agreementMid', ' sử dụng và ')}
              <a
                href="#privacy"
                onClick={(e) => {
                  e.preventDefault();
                  toast.info(t('auth.privacy', 'Chính sách'), {
                    description: 'Quy định bảo mật và quyền riêng tư thông tin học sinh.',
                  });
                }}
                className="text-foreground/90 font-medium underline underline-offset-2 hover:text-primary transition-colors"
              >
                {t('auth.privacy', 'Chính sách')}
              </a>
              {t('auth.agreementSuffix', ' quyền riêng tư.')}
            </p>
          </div>
            </>
          )}
        </div>
      </div>

      {/* Floating Language Switcher button in bottom-right corner as in Figma */}
      <LanguageSwitcher className="fixed bottom-6 right-6 z-20" />
    </div>
  );
}
