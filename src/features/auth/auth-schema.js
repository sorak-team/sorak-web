import { z } from 'zod';

export const passwordComplexityRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>_\-+=~`[\]\\;/]).{8,}$/;
export const passwordComplexityMessage = 'Mật khẩu phải tối thiểu 8 ký tự, bao gồm ít nhất 1 chữ hoa, 1 chữ số và 1 ký tự đặc biệt';

export const loginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập tên đăng nhập')
    .min(3, 'Tên đăng nhập phải có ít nhất 3 ký tự'),
  password: z
    .string()
    .min(1, 'Vui lòng nhập mật khẩu')
    .min(8, passwordComplexityMessage)
    .regex(passwordComplexityRegex, passwordComplexityMessage),
  role: z.enum(['PARENT_PH', 'TEACHER_GV', 'PRINCIPAL_BGH', 'ADMIN_BGH']).default('PARENT_PH'),
});

export const forgotPasswordSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập tên đăng nhập hoặc mã tài khoản')
    .min(2, 'Thông tin tài khoản phải có ít nhất 2 ký tự'),
});

export const otpVerifySchema = z.object({
  otp: z
    .string()
    .length(6, 'Mã OTP phải bao gồm 6 chữ số')
    .regex(/^\d{6}$/, 'Mã OTP chỉ được chứa chữ số'),
});

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(1, 'Vui lòng nhập mật khẩu mới')
      .min(8, 'Mật khẩu phải tối thiểu 8 ký tự')
      .regex(passwordComplexityRegex, passwordComplexityMessage),
    confirmPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu mới'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp với mật khẩu mới',
    path: ['confirmPassword'],
  });

