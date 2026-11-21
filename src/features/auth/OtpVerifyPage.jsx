import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useSearchParams, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { RotateCw, Loader2, Eye, EyeOff, Lock, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

import { otpVerifySchema, resetPasswordSchema } from './auth-schema';
import { authApi } from './auth.api';
import { AuthBrandHeader } from './AuthBrandHeader';
import { InputOTP } from '@/components/ui/input-otp';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LanguageSwitcher } from '@/shared/components/LanguageSwitcher';
import { cn, maskEmail, useOtpCooldown, clearOtpCooldown } from '@/shared/lib/utils';

export default function OtpVerifyPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const email = location.state?.email || searchParams.get('email') || '';
  const [canonicalEmail, setCanonicalEmail] = useState(email);

  useEffect(() => {
    if (email) setCanonicalEmail(email);
  }, [email]);

  const maskedDisplayEmail =
    location.state?.emailMasked ||
    (email.includes('@') ? maskEmail(email) : `tài khoản ${email}`);

  // Persistent 60s cooldown based on wall-clock timestamp across F5 / page reloads
  const cooldownKey = email ? `forgot_${email.toLowerCase().trim()}` : null;
  const { cooldown, startCooldown } = useOtpCooldown(cooldownKey);

  // Step state: 'otp' | 'new_password'
  const [currentStep, setCurrentStep] = useState('otp');
  const [resetToken, setResetToken] = useState('');

  // Password visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Loading states
  const [isSubmittingOtp, setIsSubmittingOtp] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isOtpError, setIsOtpError] = useState(false);

  // Form for Step 1: OTP
  const {
    control: otpControl,
    handleSubmit: handleOtpSubmit,
    setValue: setOtpValue,
    formState: { errors: otpErrors },
  } = useForm({
    resolver: zodResolver(otpVerifySchema),
    defaultValues: {
      otp: '',
    },
  });

  // Form for Step 2: New Password
  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors },
  } = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  // Outside dashboard: enforce white mode
  useEffect(() => {
    document.documentElement.classList.remove('dark');
  }, []);

  const handleResend = async () => {
    if (cooldown > 0 || isResending) return;
    try {
      setIsResending(true);
      const res = await authApi.forgotPassword({ email });
      startCooldown(60);
      toast.info(t('auth.resendOtpSuccess', 'Đã gửi lại mã OTP!'), {
        description:
          res.data?.message ||
          res.message ||
          t('auth.twoFactorSent', 'Mã xác thực mới đã được gửi tới email của bạn.'),
      });
    } catch (err) {
      const errorMsg =
        err.response?.data?.message ||
        err.message ||
        t('auth.resendOtpFailed', 'Không thể gửi lại mã OTP. Vui lòng thử lại.');
      toast.error(t('auth.resendOtpFailed', 'Gửi lại mã OTP thất bại'), {
        description: errorMsg,
      });
    } finally {
      setIsResending(false);
    }
  };

  // Step 1: Verify OTP and receive resetToken
  const onOtpSubmit = async (data) => {
    setIsSubmittingOtp(true);
    try {
      const targetEmail = canonicalEmail || email;
      const res = await authApi.verifyOtp({ email: targetEmail, otp: data.otp });
      const token = res.data?.resetToken || res.resetToken;
      const returnedEmail = res.data?.email || res.email;
      if (returnedEmail) {
        setCanonicalEmail(returnedEmail);
      }

      if (!token) {
        toast.error(t('auth.otpInvalidOrExpired', 'Không tìm thấy mã phiên đặt lại mật khẩu. Vui lòng yêu cầu lại mã OTP.'));
        return;
      }

      setResetToken(token);
      if (cooldownKey) clearOtpCooldown(cooldownKey);
      setCurrentStep('new_password');
      toast.success(t('auth.otpSuccess', 'Xác thực OTP thành công!'), {
        description: t('auth.otpSuccessDesc', 'Vui lòng nhập mật khẩu mới cho tài khoản của bạn.'),
      });
    } catch (err) {
      const errorMsg =
        err.response?.data?.message ||
        err.message ||
        t('auth.otpInvalidOrExpired', 'Mã OTP không hợp lệ hoặc đã hết hạn.');
      toast.error(t('auth.otpFailed', 'Xác thực thất bại'), {
        description: errorMsg,
      });
      setOtpValue('otp', '');
      setIsOtpError(true);
      setTimeout(() => setIsOtpError(false), 800);
    } finally {
      setIsSubmittingOtp(false);
    }
  };

  // Step 2: Set new password using resetToken
  const onNewPasswordSubmit = async (data) => {
    setIsResettingPassword(true);
    try {
      const res = await authApi.resetPassword({
        email: canonicalEmail || email,
        resetToken,
        password: data.password,
      });

      toast.success(t('auth.resetPasswordSuccess', 'Đặt lại mật khẩu thành công!'), {
        description:
          res.data?.message ||
          res.message ||
          t(
            'auth.resetPasswordSuccessDesc',
            'Mật khẩu của bạn đã được cập nhật thành công. Vui lòng đăng nhập bằng mật khẩu mới.',
          ),
      });

      navigate('/login');
    } catch (err) {
      const errorMsg =
        err.response?.data?.message ||
        err.message ||
        t('auth.resetPasswordFailed', 'Không thể đặt lại mật khẩu. Phiên xác thực có thể đã hết hạn.');
      toast.error(t('auth.resetPasswordFailed', 'Đặt lại mật khẩu thất bại'), {
        description: errorMsg,
      });
    } finally {
      setIsResettingPassword(false);
    }
  };

  return (
    <div
      className="relative min-h-screen w-full flex items-center justify-center p-4 bg-slate-100 overflow-hidden"
      data-node-id="4036:22826"
      data-name="Forgot Password · Default"
    >
      {/* Background Illustration from Figma */}
      <img
        src="/forgot-password-bg.webp"
        alt="Sorak Background"
        className="absolute inset-0 size-full object-cover pointer-events-none select-none"
      />

      {/* Subtle backdrop overlay */}
      <div className="absolute inset-0 bg-black/10 pointer-events-none" />

      {/* Main Container */}
      <div className="relative z-10 flex flex-col items-center w-full max-w-[382px] my-auto">
        {/* Card */}
        <div
          className="w-full bg-card/95 backdrop-blur-sm border border-border/80 rounded-none shadow-xl p-6 sm:p-7 flex flex-col"
          data-node-id="4036:22871"
        >
          {/* Unified Brand Header matching Gmail OTP format */}
          <AuthBrandHeader className="mb-5" />

          {currentStep === 'otp' ? (
            /* ==========================================================
               STEP 1: OTP VERIFICATION
               ========================================================== */
            <>
              {/* Card Header */}
              <div className="text-center mb-6" data-node-id="4036:22872">
                <h1 className="text-xl font-semibold tracking-tight text-card-foreground">
                  {t('auth.otpVerifyTitle', 'Xác thực mã OTP')}
                </h1>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {t('auth.otpVerifySubtitle', 'Nhập mã gồm 6 chữ số đã được gửi tới địa chỉ email: {{email}}', {
                    email: maskedDisplayEmail || t('auth.linkedEmailFallback', 'liên kết với tài khoản'),
                  })}
                </p>
              </div>

              {/* Form */}
              <form
                onSubmit={handleOtpSubmit(onOtpSubmit)}
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
                      onClick={handleResend}
                      className="text-[11px] font-medium text-[#1447e6] hover:underline disabled:opacity-50 disabled:no-underline disabled:text-muted-foreground transition-colors cursor-pointer"
                      data-node-id="4036:22876"
                    >
                      {isResending ? (
                        <span className="inline-flex items-center gap-1">
                          <RotateCw className="size-3 animate-spin" /> {t('auth.resending', 'Đang gửi...')}
                        </span>
                      ) : cooldown > 0 ? (
                        t('auth.resendIn', 'Gửi lại sau ({{seconds}}s)', { seconds: cooldown })
                      ) : (
                        t('auth.resendCode', 'Gửi lại mã')
                      )}
                    </button>
                  </div>

                  {/* Segmented 6-digit OTP component */}
                  <div className="flex justify-center py-2" data-node-id="4036:22877">
                    <Controller
                      name="otp"
                      control={otpControl}
                      render={({ field }) => (
                        <InputOTP
                          value={field.value}
                          onChange={(val) => {
                            if (isOtpError) setIsOtpError(false);
                            field.onChange(val);
                          }}
                          isError={isOtpError}
                          disabled={isSubmittingOtp}
                        />
                      )}
                    />
                  </div>

                  {otpErrors.otp && (
                    <p className="text-[11px] font-medium text-destructive text-center leading-tight">
                      {otpErrors.otp.message}
                    </p>
                  )}
                </div>

                {/* Verify Submit Button */}
                <Button
                  type="submit"
                  disabled={isSubmittingOtp}
                  className="w-full h-9 mt-2 bg-[#1447e6] hover:bg-[#103ec2] text-white text-xs font-medium shadow-sm transition-all active:scale-[0.99] rounded-none cursor-pointer"
                  data-node-id="I4036:22888;1925:1523"
                >
                  {isSubmittingOtp ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin mr-1.5" />
                      {t('auth.verifying', 'Đang xác thực...')}
                    </>
                  ) : (
                    t('auth.continueResetPassword', 'Tiếp tục đặt lại mật khẩu')
                  )}
                </Button>
              </form>
            </>
          ) : (
            /* ==========================================================
               STEP 2: SET NEW PASSWORD
               ========================================================== */
            <>
              {/* Card Header */}
              <div className="text-center mb-6">
                <h1 className="text-xl font-semibold tracking-tight text-card-foreground">
                  {t('auth.resetPasswordTitle', 'Tạo mật khẩu mới')}
                </h1>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {t('auth.resetPasswordSubtitle', 'Nhập mật khẩu mới an toàn cho tài khoản của bạn')}
                </p>
              </div>

              {/* Form */}
              <form
                onSubmit={handlePasswordSubmit(onNewPasswordSubmit)}
                className="space-y-4"
                noValidate
              >
                {/* New Password Field */}
                <div className="space-y-1.5">
                  <Label htmlFor="new-password" className="text-xs font-medium text-foreground">
                    {t('auth.newPassword', 'Mật khẩu mới')} <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder={t('auth.newPasswordPlaceholder', 'Tối thiểu 6 ký tự')}
                      autoComplete="new-password"
                      disabled={isResettingPassword}
                      className={cn(
                        'h-9 text-xs pr-9 bg-background rounded-none',
                        passwordErrors.password &&
                        'border-destructive focus-visible:ring-destructive',
                      )}
                      {...registerPassword('password')}
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? t('auth.hidePassword', 'Ẩn mật khẩu') : t('auth.showPassword', 'Hiện mật khẩu')}
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-none transition-colors cursor-pointer"
                    >
                      {showPassword ? (
                        <EyeOff className="size-3.5" />
                      ) : (
                        <Eye className="size-3.5" />
                      )}
                    </button>
                  </div>
                  {passwordErrors.password && (
                    <p className="text-[11px] font-medium text-destructive leading-tight">
                      {passwordErrors.password.message}
                    </p>
                  )}
                </div>

                {/* Confirm Password Field */}
                <div className="space-y-1.5">
                  <Label htmlFor="confirm-password" className="text-xs font-medium text-foreground">
                    {t('auth.confirmNewPassword', 'Xác nhận mật khẩu mới')} <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder={t('auth.confirmNewPasswordPlaceholder', 'Nhập lại mật khẩu mới')}
                      autoComplete="new-password"
                      disabled={isResettingPassword}
                      className={cn(
                        'h-9 text-xs pr-9 bg-background rounded-none',
                        passwordErrors.confirmPassword &&
                        'border-destructive focus-visible:ring-destructive',
                      )}
                      {...registerPassword('confirmPassword')}
                    />
                    <button
                      type="button"
                      aria-label={showConfirmPassword ? t('auth.hidePassword', 'Ẩn mật khẩu') : t('auth.showPassword', 'Hiện mật khẩu')}
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-none transition-colors cursor-pointer"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="size-3.5" />
                      ) : (
                        <Eye className="size-3.5" />
                      )}
                    </button>
                  </div>
                  {passwordErrors.confirmPassword && (
                    <p className="text-[11px] font-medium text-destructive leading-tight">
                      {passwordErrors.confirmPassword.message}
                    </p>
                  )}
                </div>

                {/* Submit New Password Button */}
                <Button
                  type="submit"
                  disabled={isResettingPassword}
                  className="w-full h-9 mt-2 bg-[#1447e6] hover:bg-[#103ec2] text-white text-xs font-medium shadow-sm transition-all active:scale-[0.99] rounded-none cursor-pointer"
                >
                  {isResettingPassword ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin mr-1.5" />
                      {t('auth.savingPassword', 'Đang cập nhật mật khẩu...')}
                    </>
                  ) : (
                    t('auth.savePasswordBtn', 'Lưu mật khẩu mới & Đăng nhập')
                  )}
                </Button>
              </form>
            </>
          )}

          {/* Footer Back Link */}
          <div
            className="mt-5 pt-4 border-t border-border/50 text-center"
            data-node-id="4036:22888"
          >
            <p className="text-xs text-muted-foreground">
              {t('auth.rememberPassword', 'Nhớ mật khẩu?')}{' '}
              <Link
                to="/login"
                className="text-foreground font-medium hover:underline hover:text-primary transition-colors"
              >
                {t('auth.loginButton', 'Đăng nhập')}
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Floating Language Switcher button in bottom-right corner as in Figma */}
      <LanguageSwitcher className="fixed bottom-6 right-6 z-20" />
    </div>
  );
}
