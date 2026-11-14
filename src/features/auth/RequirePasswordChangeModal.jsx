import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  Eye,
  EyeOff,
  AlertCircle,
} from 'lucide-react';
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
import { useAuthStore } from './auth.store';
import { authApi } from './auth.api';

/**
 * RequirePasswordChangeModal (Gợi ý đổi mật khẩu mặc định):
 * - Hiển thị gợi ý trong lần đăng nhập đầu tiên trên mỗi thiết bị nếu tài khoản vẫn dùng mật khẩu mặc định.
 * - Hai lựa chọn: "Đổi mật khẩu" và "Để sau".
 * - Gợi ý không bắt buộc, không chặn các chức năng khác (non-blocking).
 * - Lưu trạng thái đã thông báo trên thiết bị vào localStorage.
 */
export function RequirePasswordChangeModal() {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);

  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState('prompt'); // 'prompt' | 'change'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (!user) {
      setIsOpen(false);
      return;
    }

    const userId = user.id || user.publicId || user.account_id;
    if (!userId) return;

    // Gợi ý đổi mật khẩu chỉ hiển thị trong trường hợp đăng nhập tài khoản lần đầu theo quy định
    const isFirstLogin = Boolean(user.isFirstLogin || user.is_first_login);
    if (!isFirstLogin) {
      setIsOpen(false);
      return;
    }

    // Check if account is still using default password
    const isDefault = Boolean(
      user.isDefaultPassword ||
      user.is_default_password ||
      (!user.passwordChangedAt && !user.password_changed_at)
    );

    if (!isDefault) {
      setIsOpen(false);
      return;
    }

    // Check if user has already been prompted / dismissed on this device
    const dismissedKey = `sorak_default_pwd_dismissed_${userId}`;
    const isDismissedOnDevice = localStorage.getItem(dismissedKey) === 'true';

    if (!isDismissedOnDevice) {
      setIsOpen(true);
      setMode('prompt');
      setErrorMsg('');
    } else {
      setIsOpen(false);
    }
  }, [user]);

  const handleDismiss = () => {
    const userId = user?.id || user?.publicId || user?.account_id;
    if (userId) {
      localStorage.setItem(`sorak_default_pwd_dismissed_${userId}`, 'true');
    }
    setIsOpen(false);
  };

  const handleOpenChange = (open) => {
    if (!open) {
      handleDismiss();
    } else {
      setIsOpen(true);
    }
  };

  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!currentPassword) {
      setErrorMsg('Vui lòng nhập mật khẩu hiện tại.');
      return;
    }

    if (!newPassword || newPassword.length < 8) {
      setErrorMsg('Mật khẩu mới phải có tối thiểu 8 ký tự.');
      return;
    }

    if (newPassword === currentPassword) {
      setErrorMsg('Mật khẩu mới không được trùng với mật khẩu hiện tại.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Xác nhận mật khẩu mới không khớp.');
      return;
    }

    try {
      setIsSubmitting(true);
      await authApi.changePassword({
        currentPassword,
        newPassword,
      });

      const userId = user?.id || user?.publicId || user?.account_id;
      if (userId) {
        localStorage.setItem(`sorak_default_pwd_dismissed_${userId}`, 'true');
      }

      if (user && setUser) {
        setUser({
          ...user,
          isDefaultPassword: false,
          is_default_password: false,
          passwordChangedAt: new Date().toISOString(),
        });
      }

      sessionStorage.setItem(
        'sorak_auth_notice',
        'Đổi mật khẩu thành công. Vui lòng đăng nhập lại bằng mật khẩu mới vừa đặt.',
      );
      useAuthStore.getState().logout();
      window.location.href = '/login?reason=password_changed';
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        'Đổi mật khẩu thất bại. Vui lòng kiểm tra lại mật khẩu hiện tại.';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[420px] p-6 bg-card border border-border shadow-2xl rounded-none select-none">
        {mode === 'prompt' ? (
          <div className="flex flex-col gap-5">
            <DialogHeader className="space-y-2 text-left">
              <DialogTitle className="text-[16px] font-semibold text-foreground tracking-tight">
                Gợi ý đổi mật khẩu
              </DialogTitle>
              <DialogDescription className="text-[13px] text-muted-foreground leading-relaxed">
                Bạn đang sử dụng mật khẩu mặc định do nhà trường cấp. Hãy đổi mật khẩu mới để tăng cường bảo mật cho tài khoản.
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="flex flex-row items-center justify-end gap-2.5 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleDismiss}
                className="h-9 px-4 text-[13px] border-border text-muted-foreground hover:text-foreground rounded-none cursor-pointer"
              >
                Để sau
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setMode('change');
                  setErrorMsg('');
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                className="h-9 px-4 text-[13px] bg-primary text-primary-foreground hover:bg-primary/90 font-medium rounded-none shadow-none cursor-pointer"
              >
                Đổi mật khẩu
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleChangePasswordSubmit} className="flex flex-col gap-4">
            <DialogHeader className="space-y-1 text-left pb-0.5">
              <DialogTitle className="text-[17px] font-semibold text-foreground tracking-tight">
                Cập nhật mật khẩu mới
              </DialogTitle>
              <DialogDescription className="text-[12.5px] text-muted-foreground leading-normal">
                Nhập mật khẩu mặc định hiện tại và tạo mật khẩu mới an toàn cho tài khoản.
              </DialogDescription>
            </DialogHeader>

            {errorMsg && (
              <div className="p-2.5 bg-destructive/10 border border-destructive/20 text-destructive text-[12px] flex items-center gap-2 rounded-none">
                <AlertCircle className="size-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="space-y-3 pt-0.5">
              {/* Mật khẩu hiện tại */}
              <div className="space-y-1.5">
                <label className="text-[12.5px] font-medium text-foreground block">
                  Mật khẩu hiện tại (mặc định)
                </label>
                <div className="relative">
                  <Input
                    type={showCurrent ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Nhập mật khẩu hiện tại"
                    className="h-9 text-[13px] pr-9 bg-background border-border rounded-none"
                    autoFocus
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showCurrent ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              {/* Mật khẩu mới */}
              <div className="space-y-1.5">
                <label className="text-[12.5px] font-medium text-foreground block">
                  Mật khẩu mới
                </label>
                <div className="relative">
                  <Input
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Tối thiểu 8 ký tự"
                    className="h-9 text-[13px] pr-9 bg-background border-border rounded-none"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showNew ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              {/* Xác nhận mật khẩu mới */}
              <div className="space-y-1.5">
                <label className="text-[12.5px] font-medium text-foreground block">
                  Xác nhận mật khẩu mới
                </label>
                <div className="relative">
                  <Input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu mới"
                    className="h-9 text-[13px] pr-9 bg-background border-border rounded-none"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
            </div>

            <DialogFooter className="flex flex-row items-center justify-end gap-2.5 pt-2">
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => setMode('prompt')}
                className="h-9 px-4 text-[13px] border-border text-muted-foreground hover:text-foreground rounded-none cursor-pointer"
              >
                Quay lại
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-9 px-4 text-[13px] bg-primary text-primary-foreground hover:bg-primary/90 font-medium rounded-none shadow-none cursor-pointer"
              >
                {isSubmitting ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default RequirePasswordChangeModal;
