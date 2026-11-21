import { z } from 'zod';
import i18n from '@/shared/lib/i18n';

export const passwordComplexityRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>_\-+=~`[\]\\;/]).{8,}$/;
export const passwordComplexityMessage = 'Mật khẩu phải tối thiểu 8 ký tự, bao gồm ít nhất 1 chữ hoa, 1 chữ số và 1 ký tự đặc biệt';

export const getLoginSchema = () => z.object({
  identifier: z
    .string()
    .trim()
    .min(1, i18n.t('auth.identifierRequired', 'Vui lòng nhập tên đăng nhập'))
    .min(3, i18n.t('auth.identifierMin3', 'Tên đăng nhập phải có ít nhất 3 ký tự')),
  password: z
    .string()
    .min(1, i18n.t('auth.passwordRequired', 'Vui lòng nhập mật khẩu'))
    .min(8, i18n.t('auth.passwordComplexity', passwordComplexityMessage))
    .regex(passwordComplexityRegex, i18n.t('auth.passwordComplexity', passwordComplexityMessage)),
  role: z.enum(['PARENT_PH', 'TEACHER_GV', 'PRINCIPAL_BGH', 'ADMIN_BGH']).default('PARENT_PH'),
});

export const getForgotPasswordSchema = () => z.object({
  identifier: z
    .string()
    .trim()
    .min(1, i18n.t('auth.forgotIdentifierRequired', 'Vui lòng nhập tên đăng nhập hoặc mã tài khoản'))
    .min(2, i18n.t('auth.forgotIdentifierMin2', 'Thông tin tài khoản phải có ít nhất 2 ký tự')),
});

export const getOtpVerifySchema = () => z.object({
  otp: z
    .string()
    .length(6, i18n.t('auth.otpLength', 'Mã OTP phải bao gồm 6 chữ số'))
    .regex(/^\d{6}$/, i18n.t('auth.otpDigitsOnly', 'Mã OTP chỉ được chứa chữ số')),
});

export const getResetPasswordSchema = () => z
  .object({
    password: z
      .string()
      .min(1, i18n.t('auth.newPasswordRequired', 'Vui lòng nhập mật khẩu mới'))
      .min(8, i18n.t('auth.newPasswordMin8', 'Mật khẩu phải tối thiểu 8 ký tự'))
      .regex(passwordComplexityRegex, i18n.t('auth.passwordComplexity', passwordComplexityMessage)),
    confirmPassword: z.string().min(1, i18n.t('auth.confirmPasswordRequired', 'Vui lòng xác nhận mật khẩu mới')),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: i18n.t('auth.confirmPasswordMismatch', 'Mật khẩu xác nhận không khớp với mật khẩu mới'),
    path: ['confirmPassword'],
  });

export const loginSchema = getLoginSchema();
export const forgotPasswordSchema = getForgotPasswordSchema();
export const otpVerifySchema = getOtpVerifySchema();
export const resetPasswordSchema = getResetPasswordSchema();


