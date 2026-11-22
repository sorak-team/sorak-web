import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyRound, User, Info, Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { authApi } from '@/features/auth/auth.api';
import { parentApi } from '../api/parent.api';
import { useAuthStore } from '@/features/auth/auth.store';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function LinkChildModal({ isOpen, onClose }) {
  const { t } = useTranslation();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const addLinkedAccount = useAuthStore((state) => state.addLinkedAccount);

  const handleClose = () => {
    if (isSubmitting) return;
    setIdentifier('');
    setPassword('');
    setShowPassword(false);
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      toast.error(t('parent.linkModal.fillRequired', 'Vui lòng nhập đầy đủ mã học sinh và mật khẩu.'));
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await parentApi.linkChild({
        identifier: identifier.trim(),
        password: password.trim(),
      });

      const payload = res?.data || res;
      if (payload?.user) {
        if (payload.user.role !== 'PARENT_PH') {
          toast.error(t('parent.linkModal.notParentAccount', 'Tài khoản này không phải tài khoản phụ huynh học sinh.'));
          return;
        }

        addLinkedAccount(payload.user, payload.accessToken);
        toast.success(`${t('parent.linkModal.linkSuccess', 'Đã liên kết hồ sơ của bé')} ${payload.user.student?.fullName || payload.user.name || identifier.trim()}!`, {
          description: t('parent.linkModal.autoSwitched', 'Hệ thống đã tự động chuyển sang tài khoản mới liên kết.'),
        });
        setIdentifier('');
        setPassword('');
        setShowPassword(false);
        onClose();
        window.location.reload();
      } else {
        toast.error(t('parent.linkModal.linkFailed', 'Liên kết không thành công. Vui lòng kiểm tra lại thông tin.'));
      }
    } catch (err) {
      toast.error(t('parent.linkModal.linkFailed', 'Liên kết tài khoản thất bại'), {
        description: err.response?.data?.message || err.message || t('parent.linkModal.invalidCredentials', 'Mã học sinh hoặc mật khẩu không chính xác.'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-[420px] p-5 rounded-none border border-border bg-card text-card-foreground shadow-2xl">
        {/* Header - Clean, không icon thừa kế bên tiêu đề, bỏ bo góc */}
        <DialogHeader className="space-y-1 text-left pb-1">
          <DialogTitle className="text-[16px] font-semibold text-foreground tracking-tight">
            {t('parent.linkModal.title', 'Thêm tài khoản con khác')}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            {t('parent.linkModal.subtitle', 'Quản lý nhiều bé trên cùng một tài khoản đăng nhập.')}
          </DialogDescription>
        </DialogHeader>

        {/* Notice - Bỏ bo góc (rounded-none), thông tin tinh gọn */}
        <div className="rounded-none bg-muted/40 border border-border p-3 text-xs text-muted-foreground leading-relaxed flex items-start gap-2.5">
          <Info className="size-4 text-muted-foreground/80 shrink-0 mt-0.5" />
          <span>
            {t('parent.linkModal.notice', 'Nhập mã học sinh và mật khẩu được nhà trường cấp cho bé thứ hai để liên kết quản lý chung.')}
          </span>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-foreground">
              {t('parent.linkModal.studentCodeLabel', 'Mã học sinh của bé')} <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <User className="size-4 text-muted-foreground/70 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={t('parent.linkModal.studentCodePlaceholder', 'Ví dụ: CB24002')}
                className="h-9 pl-9 pr-3 text-[13px] rounded-none border-border/80 bg-background focus-visible:ring-1 focus-visible:ring-[#1447e6] focus-visible:border-[#1447e6] font-mono"
                disabled={isSubmitting}
                autoFocus
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-foreground">
              {t('parent.linkModal.passwordLabel', 'Mật khẩu tài khoản')} <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <KeyRound className="size-4 text-muted-foreground/70 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('parent.linkModal.passwordPlaceholder', 'Nhập mật khẩu')}
                className="h-9 pl-9 pr-9 text-[13px] rounded-none border-border/80 bg-background focus-visible:ring-1 focus-visible:ring-[#1447e6] focus-visible:border-[#1447e6]"
                disabled={isSubmitting}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/70 hover:text-foreground transition-colors p-1 cursor-pointer"
                aria-label={showPassword ? t('auth.hidePassword', 'Ẩn mật khẩu') : t('auth.showPassword', 'Hiện mật khẩu')}
              >
                {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              </button>
            </div>
          </div>

          {/* DialogFooter - Padding chuẩn, không bo góc (rounded-none), text thoáng đãng */}
          <DialogFooter className="pt-3 border-t border-border flex flex-row items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              className="h-9 px-5 rounded-none border border-border bg-background hover:bg-muted text-foreground text-[13px] font-medium shadow-none cursor-pointer"
            >
              {t('common.cancel', 'Hủy')}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-9 px-6 rounded-none bg-[#1447e6] hover:bg-[#103ec2] text-white text-[13px] font-medium shadow-none inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>{t('parent.linkModal.linking', 'Đang liên kết...')}</span>
                </>
              ) : (
                t('parent.linkModal.submitBtn', 'Xác nhận liên kết')
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
