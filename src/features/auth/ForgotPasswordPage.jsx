import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2, PhoneCall } from 'lucide-react';
import { toast } from 'sonner';

import { forgotPasswordSchema } from './auth-schema';
import { authApi } from './auth.api';
import { AuthBrandHeader } from './AuthBrandHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LanguageSwitcher } from '@/shared/components/LanguageSwitcher';
import { cn, maskEmail, getOtpCooldown, setOtpCooldown } from '@/shared/lib/utils';

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlIdentifier = searchParams.get('identifier') || '';
  const urlRole = searchParams.get('role') || '';

  const isParent = urlRole === 'PARENT_PH';

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contactTeacherData, setContactTeacherData] = useState(null);

  // Outside dashboard: enforce white mode
  useEffect(() => {
    document.documentElement.classList.remove('dark');
  }, []);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      identifier: urlIdentifier,
    },
  });

  const onSubmit = async (data) => {
    const trimmedId = (data.identifier || '').trim();

    // Check if cooldown is active for this identifier to prevent duplicate submissions on previous/back
    const existingCooldown = getOtpCooldown(`forgot_${trimmedId}`);
    if (existingCooldown > 0) {
      toast.info(
        t('auth.cooldownWait', 'Vui lòng đợi {{seconds}} giây trước khi gửi lại yêu cầu mã OTP mới.', {
          seconds: existingCooldown,
        }),
        {
          description: t(
            'auth.cooldownWaitDesc',
            'Mã xác thực vừa được gửi. Bạn có thể tiếp tục nhập mã trên trang xác thực.',
          ),
        },
      );
      const cachedEmail = localStorage.getItem(`forgot_email_${trimmedId}`) || (trimmedId.includes('@') ? trimmedId : '');
      const navEmail = cachedEmail || trimmedId;
      navigate(`/otp-verify?email=${encodeURIComponent(navEmail)}`, {
        state: { email: navEmail },
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await authApi.forgotPassword({
        identifier: data.identifier,
      });
      const payload = response.data || response;

      // Case 1: Account requires support (Parent -> Contact Homeroom Teacher; Teacher/Staff without email -> Contact Admin)
      if (payload.contactTeacher || payload.contactAdmin || payload.hasEmail === false) {
        setContactTeacherData({
          username: payload.username || data.identifier,
          role: payload.role || (isParent ? 'PARENT_PH' : 'TEACHER_GV'),
          studentName: payload.studentName || null,
          className: payload.className || null,
          teacherName: payload.teacherName || null,
          teacherPhone: payload.teacherPhone || null,
          message: payload.message,
          phone: payload.phone || null,
          isAdminSupport: Boolean(
            payload.contactAdmin || (!isParent && payload.role !== 'PARENT_PH'),
          ),
        });
        return;
      }

      // Case 2: Staff/Teacher account has email -> OTP dispatched
      const targetEmail =
        payload.email ||
        (data.identifier.includes('@') ? data.identifier : '');
      const maskedEmail = payload.emailMasked || payload.maskedEmail || maskEmail(targetEmail);

      // Persist 60-second cooldown in localStorage for both identifier and targetEmail
      setOtpCooldown(`forgot_${trimmedId}`, 60);
      if (targetEmail) {
        setOtpCooldown(`forgot_${targetEmail.toLowerCase().trim()}`, 60);
        localStorage.setItem(`forgot_email_${trimmedId}`, targetEmail);
      }

      toast.success(t('auth.otpSentSuccess', 'Đã gửi mã xác thực!'), {
        description:
          payload.message ||
          (maskedEmail
            ? t('auth.otpSentToEmail', 'Mã OTP gồm 6 chữ số đã được gửi tới {{email}}.', { email: maskedEmail })
            : t('auth.otpSentToLinkedEmail', 'Mã OTP gồm 6 chữ số đã được gửi tới email liên kết của bạn.')),
      });

      navigate(
        `/otp-verify?email=${encodeURIComponent(targetEmail || '')}`,
        {
          state: {
            email: targetEmail,
            emailMasked: maskedEmail,
          },
        },
      );
    } catch (error) {
      const errorMsg =
        error.response?.data?.message ||
        error.message ||
        t('auth.cannotSendVerification', 'Không thể gửi yêu cầu xác thực. Vui lòng thử lại.');

      // Fallback: If user is a teacher or identifier without @ is entered, show Contact Admin screen
      if (!isParent && !data.identifier.includes('@')) {
        setContactTeacherData({
          username: data.identifier,
          role: 'TEACHER_GV',
          isAdminSupport: true,
          message: t(
            'auth.accountTeacherNoEmail',
            'Tài khoản giáo viên chưa được liên kết email. Vui lòng liên hệ ban giám hiệu hoặc quản trị viên nhà trường để được hỗ trợ.',
          ),
        });
        return;
      }

      toast.error(t('auth.accountNotFound', 'Không tìm thấy tài khoản'), {
        description: errorMsg,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Pre-fill identifier if coming from login with an identifier already entered
  useEffect(() => {
    if (urlIdentifier) {
      setValue('identifier', urlIdentifier);
    }
  }, [urlIdentifier, setValue]);

  const isTeacherSupport =
    contactTeacherData &&
    (contactTeacherData.isAdminSupport ||
      contactTeacherData.role !== 'PARENT_PH' ||
      !isParent);

  return (
    <div
      className="relative min-h-screen w-full flex items-center justify-center p-4 bg-slate-100 overflow-hidden"
      data-node-id="4019:846"
      data-name="Forgot Password · Default"
    >
      {/* Background Illustration from Figma */}
      <img
        src="/forgot-password-bg.webp"
        alt="Sorak Playground Background"
        className="absolute inset-0 size-full object-cover pointer-events-none select-none"
      />

      {/* Subtle backdrop overlay */}
      <div className="absolute inset-0 bg-black/10 pointer-events-none" />

      {/* Main Container */}
      <div className="relative z-10 flex flex-col items-center w-full max-w-[382px] my-auto">
        {/* Card */}
        <div
          className="w-full bg-card/95 backdrop-blur-sm border border-border/80 rounded-none shadow-xl p-6 sm:p-7 flex flex-col transition-all"
          data-node-id="4019:855"
        >
          {/* Unified Brand Header matching Gmail OTP format */}
          <AuthBrandHeader className="mb-5" />

          {contactTeacherData ? (
            /* ========================================================
               SCREEN: CONTACT SUPPORT (Admin for Teacher / Homeroom Teacher for Parent)
               ======================================================== */
            isTeacherSupport ? (
              /* --- SUB-SCREEN A: CONTACT ADMIN (TEACHER / STAFF WITHOUT EMAIL) --- */
              <div className="flex flex-col text-center">
                {/* Card Header */}
                <div className="mb-5">
                  <h1 className="text-xl font-semibold tracking-tight text-card-foreground">
                    {t('auth.contactAdminTitle', 'Liên hệ quản trị viên nhà trường')}
                  </h1>
                  <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                    {contactTeacherData.teacherName ? (
                      <>
                        {t('auth.teacherLabel', 'Giáo viên')}{' '}
                        <span className="font-semibold text-foreground">
                          {contactTeacherData.teacherName}
                        </span>{' '}
                        ({contactTeacherData.username})
                      </>
                    ) : (
                      <>
                        {t('auth.accountLabel', 'Tài khoản')}{' '}
                        <span className="font-semibold text-foreground">
                          {contactTeacherData.username}
                        </span>
                      </>
                    )}
                  </p>
                </div>

                {/* Information Body */}
                <div className="text-left text-xs text-muted-foreground leading-relaxed space-y-3 mb-6">
                  <p>
                    {t(
                      'auth.contactAdminDesc',
                      'Tài khoản giáo viên chưa được liên kết địa chỉ email để nhận mã khôi phục mật khẩu. Thầy/Cô vui lòng liên hệ Ban giám hiệu hoặc Quản trị viên hệ thống để được hỗ trợ cấp lại mật khẩu hoặc cập nhật email.',
                    )}
                  </p>

                  <div className="p-3 bg-muted/40 border border-border/70 text-[11px] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">
                        {t('auth.supportDepartment', 'Bộ phận tiếp nhận')}:
                      </span>
                      <span className="font-semibold text-foreground">
                        {t('auth.adminOffice', 'Ban giám hiệu & Quản trị Sorak')}
                      </span>
                    </div>
                    {contactTeacherData.phone && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">
                          {t('auth.savedPhone', 'SĐT tài khoản')}:
                        </span>
                        <span className="font-semibold text-foreground font-mono">
                          {contactTeacherData.phone}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-1 border-t border-border/50">
                      <span className="text-muted-foreground">
                        {t('auth.hotline', 'Hotline hỗ trợ')}:
                      </span>
                      <a
                        href="tel:02473001866"
                        className="font-semibold text-[#1447e6] hover:underline"
                      >
                        024 7300 1866
                      </a>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">
                        {t('auth.supportEmail', 'Email hỗ trợ')}:
                      </span>
                      <a
                        href="mailto:support@sorak.edu.vn"
                        className="font-semibold text-foreground hover:underline"
                      >
                        support@sorak.edu.vn
                      </a>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground/80">
                      <span>{t('auth.supportHours', 'Thời gian hỗ trợ')}:</span>
                      <span>{t('auth.supportHoursValue', '07:30 – 17:30 (Thứ 2 – Thứ 6)')}</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2">
                  <Button
                    asChild
                    className="w-full h-9 bg-[#1447e6] hover:bg-[#103ec2] text-white text-xs font-medium shadow-sm transition-all active:scale-[0.99] rounded-none cursor-pointer"
                  >
                    <Link to="/login">{t('auth.backToLogin', 'Quay lại đăng nhập')}</Link>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setContactTeacherData(null)}
                    className="w-full h-9 text-xs font-medium rounded-none border-border/80 cursor-pointer"
                  >
                    {t('auth.tryOtherAccount', 'Thử thông tin khác')}
                  </Button>
                </div>
              </div>
            ) : (
              /* --- SUB-SCREEN B: CONTACT HOMEROOM TEACHER (PARENT & STUDENT) --- */
              <div className="flex flex-col text-center">
                {/* Card Header */}
                <div className="mb-5">
                  <h1 className="text-xl font-semibold tracking-tight text-card-foreground">
                    {t('auth.contactTeacherTitle', 'Liên hệ giáo viên chủ nhiệm')}
                  </h1>
                  <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                    {contactTeacherData.studentName ? (
                      <>
                        {t('auth.studentLabel', 'Học sinh')}{' '}
                        <span className="font-semibold text-foreground">
                          {contactTeacherData.studentName}
                        </span>{' '}
                        ({contactTeacherData.username})
                      </>
                    ) : (
                      <>
                        {t('auth.accountLabel', 'Tài khoản')}{' '}
                        <span className="font-semibold text-foreground">
                          {contactTeacherData.username}
                        </span>
                      </>
                    )}
                  </p>
                </div>

                {/* Information Body */}
                <div className="text-left text-xs text-muted-foreground leading-relaxed space-y-3 mb-6">
                  <p>
                    {t(
                      'auth.contactTeacherDesc',
                      'Tài khoản phụ huynh và học sinh không sử dụng email để khôi phục mật khẩu. Quý phụ huynh vui lòng liên hệ trực tiếp với giáo viên chủ nhiệm lớp để được cấp lại mật khẩu mới.',
                    )}
                  </p>

                  <div className="p-3 bg-muted/40 border border-border/70 text-[11px] space-y-2">
                    {contactTeacherData.className && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">{t('auth.classLabel', 'Lớp học')}:</span>
                        <span className="font-semibold text-foreground">
                          {contactTeacherData.className}
                        </span>
                      </div>
                    )}
                    {contactTeacherData.teacherName && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">{t('auth.teacherLabel', 'Giáo viên phụ trách')}:</span>
                        <span className="font-semibold text-foreground">
                          {contactTeacherData.teacherName}
                        </span>
                      </div>
                    )}
                    {contactTeacherData.teacherPhone && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">{t('auth.teacherPhoneLabel', 'SĐT giáo viên')}:</span>
                        <a
                          href={`tel:${contactTeacherData.teacherPhone}`}
                          className="font-semibold text-[#1447e6] hover:underline"
                        >
                          {contactTeacherData.teacherPhone}
                        </a>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-1 border-t border-border/50">
                      <span className="text-muted-foreground">{t('auth.hotline', 'Hotline nhà trường')}:</span>
                      <a
                        href="tel:02473001866"
                        className="font-semibold text-foreground hover:underline"
                      >
                        024 7300 1866
                      </a>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground/80">
                      <span>{t('auth.supportHours', 'Thời gian hỗ trợ')}:</span>
                      <span>{t('auth.supportHoursValue', '07:30 – 17:30 (Thứ 2 – Thứ 6)')}</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2">
                  <Button
                    asChild
                    className="w-full h-9 bg-[#1447e6] hover:bg-[#103ec2] text-white text-xs font-medium shadow-sm transition-all active:scale-[0.99] rounded-none cursor-pointer"
                  >
                    <Link to="/login">{t('auth.backToLogin', 'Quay lại đăng nhập')}</Link>
                  </Button>

                  {contactTeacherData.username !== 'Học sinh' && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setContactTeacherData(null)}
                      className="w-full h-9 text-xs font-medium rounded-none border-border/80 cursor-pointer"
                    >
                      {t('auth.tryOtherStudent', 'Nhập mã học sinh khác')}
                    </Button>
                  )}
                </div>
              </div>
            )
          ) : (
            /* ========================================================
               SCREEN: FORGOT PASSWORD FORM
               ======================================================== */
            <>
              {/* Card Header */}
              <div className="text-center mb-6" data-node-id="4019:856">
                <h1 className="text-xl font-semibold tracking-tight text-card-foreground">
                  {isParent
                    ? t('auth.forgotPasswordParentTitle', 'Quên mật khẩu phụ huynh')
                    : t('auth.forgotPasswordTitle', 'Quên mật khẩu?')}
                </h1>
                <p className="text-xs text-muted-foreground mt-1">
                  {isParent
                    ? t(
                        'auth.forgotPasswordSubtitleParent',
                        'Nhập mã học sinh để xem thông tin giáo viên chủ nhiệm hỗ trợ cấp lại mật khẩu.',
                      )
                    : t(
                        'auth.forgotPasswordSubtitleSchool',
                        'Nhập tên đăng nhập hoặc mã cán bộ để khôi phục mật khẩu.',
                      )}
                </p>
              </div>

              {/* Form */}
              <form
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-4"
                noValidate
              >
                <div className="space-y-1.5" data-node-id="4019:868">
                  <Label htmlFor="identifier" className="text-xs font-medium">
                    {isParent
                      ? t('auth.identifierLabelParent', 'Mã học sinh')
                      : t('auth.identifierLabelSchool', 'Tên đăng nhập / Mã cán bộ')}
                  </Label>
                  <Input
                    id="identifier"
                    type="text"
                    placeholder={
                      isParent
                        ? t('auth.identifierPlaceholderParent', 'Ví dụ: HS26001, HS25001...')
                        : t('auth.identifierPlaceholderSchool', 'Ví dụ: CB20001, CB24001...')
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

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-9 mt-1 bg-[#1447e6] hover:bg-[#103ec2] text-white text-xs font-medium shadow-sm transition-all active:scale-[0.99] rounded-none cursor-pointer"
                  data-node-id="4019:876"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin mr-1.5" />
                      {t('auth.checkingAccount', 'Đang kiểm tra tài khoản...')}
                    </>
                  ) : isParent ? (
                    t('auth.lookupTeacherBtn', 'Tra cứu giáo viên hỗ trợ')
                  ) : (
                    t('auth.continueBtn', 'Tiếp tục')
                  )}
                </Button>
              </form>

              {/* Direct Support Shortcut for Parents */}
              {isParent && (
                <div className="mt-4 pt-3 border-t border-border/40 text-center">
                  <button
                    type="button"
                    onClick={() =>
                      setContactTeacherData({
                        username: 'Học sinh',
                        role: 'PARENT_PH',
                        message: t(
                          'auth.parentNoEmailNotice',
                          'Quý phụ huynh vui lòng liên hệ giáo viên chủ nhiệm hoặc hotline nhà trường để được hỗ trợ.',
                        ),
                      })
                    }
                    className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    <PhoneCall className="size-3 text-[#1447e6]" />
                    <span>{t('auth.noStudentCodeHelp', 'Không nhớ mã học sinh? Xem liên hệ nhà trường')}</span>
                  </button>
                </div>
              )}

              {/* Direct Support Shortcut for Teachers / Staff without email */}
              {!isParent && (
                <div className="mt-4 pt-3 border-t border-border/40 text-center">
                  <button
                    type="button"
                    onClick={() =>
                      setContactTeacherData({
                        username: watch('identifier')?.trim() || 'Giáo viên',
                        role: 'TEACHER_GV',
                        isAdminSupport: true,
                        message: t(
                          'auth.teacherNoEmailNotice',
                          'Thầy/Cô vui lòng liên hệ Ban giám hiệu hoặc Quản trị viên hệ thống để được hỗ trợ cấp lại mật khẩu hoặc cập nhật email.',
                        ),
                      })
                    }
                    className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    <PhoneCall className="size-3 text-[#1447e6]" />
                    <span>{t('auth.noTeacherEmailHelp', 'Chưa có email? Liên hệ ban giám hiệu hỗ trợ')}</span>
                  </button>
                </div>
              )}

              {/* Footer Back Link */}
              <div
                className={cn(
                  'mt-4 pt-3 border-t border-border/50 text-center',
                  !isParent && 'mt-5 pt-4',
                )}
                data-node-id="4019:877"
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
            </>
          )}
        </div>
      </div>

      {/* Floating Language Switcher button in bottom-right corner as in Figma */}
      <LanguageSwitcher className="fixed bottom-6 right-6 z-20" />
    </div>
  );
}
