import React, { useState } from 'react';
import { X, UserPlus, KeyRound, User, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { authApi } from '@/features/auth/auth.api';
import { useAuthStore } from '@/features/auth/auth.store';
import { Button } from '@/components/ui/button';

export function LinkChildModal({ isOpen, onClose }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const addLinkedAccount = useAuthStore((state) => state.addLinkedAccount);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      toast.error('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await authApi.login({
        identifier: identifier.trim(),
        password: password.trim(),
        role: 'PARENT_PH',
        rememberMe: true,
      });

      const payload = res.data?.data || res.data || res;
      if (payload?.user) {
        if (payload.user.role !== 'PARENT_PH') {
          toast.error('Tài khoản này không phải tài khoản phụ huynh học sinh.');
          return;
        }

        addLinkedAccount(payload.user, payload.accessToken);
        toast.success(`Đã liên kết hồ sơ của bé ${payload.user.student?.fullName || payload.user.name || identifier}!`, {
          description: 'Hệ thống đã tự động chuyển sang tài khoản mới liên kết.',
        });
        setIdentifier('');
        setPassword('');
        onClose();
        window.location.reload();
      } else {
        toast.error('Đăng nhập không thành công. Vui lòng kiểm tra lại thông tin.');
      }
    } catch (err) {
      toast.error('Liên kết tài khoản thất bại', {
        description: err.response?.data?.message || err.message || 'Mã học sinh hoặc mật khẩu không chính xác.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog (Lyra Standard rounded-none) */}
      <div className="relative w-full max-w-md bg-card text-card-foreground rounded-none border border-border shadow-2xl z-10 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border bg-card">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-none bg-blue-50/80 border border-blue-200 text-[#1447e6] dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-400 flex items-center justify-center">
              <UserPlus className="size-5" />
            </div>
            <div>
              <h2 className="text-[16px] font-semibold text-foreground tracking-tight">
                Thêm tài khoản con khác
              </h2>
              <p className="text-[12px] text-muted-foreground font-normal">
                Quản lý nhiều bé trên cùng một tài khoản đăng nhập
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onClose}
            className="size-8 rounded-none border border-border"
          >
            <X className="size-4" />
          </Button>
        </div>

        {/* Notice */}
        <div className="mx-4 sm:mx-6 mt-4 p-3 rounded-none bg-muted/40 border border-border text-[12px] text-muted-foreground flex items-start gap-2">
          <AlertCircle className="size-4 text-[#1447e6] shrink-0 mt-0.5" />
          <span>
            Nhập mã học sinh và mật khẩu được nhà trường cấp cho bé thứ hai để liên kết quản lý chung.
          </span>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-foreground">
              Mã học sinh của bé <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <User className="size-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Ví dụ: HS26002"
                className="w-full h-8.5 pl-9 pr-3 text-[13px] rounded-none border border-border bg-background focus:outline-none focus:border-[#1447e6] font-mono"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-foreground">
              Mật khẩu tài khoản <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <KeyRound className="size-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-8.5 pl-9 pr-3 text-[13px] rounded-none border border-border bg-background focus:outline-none focus:border-[#1447e6]"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-8.5 px-4 rounded-none border border-border text-[13px] font-medium bg-background hover:bg-muted text-foreground cursor-pointer"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-8.5 px-4.5 rounded-none bg-[#1447e6] hover:bg-[#123ecc] text-white text-[13px] font-medium cursor-pointer shadow-xs"
            >
              {isSubmitting ? 'Đang liên kết...' : 'Xác nhận liên kết'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
