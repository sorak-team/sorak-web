import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { HugeiconsIcon } from '@hugeicons/react';
import { Alert02Icon, ArrowReloadHorizontalIcon } from '@hugeicons/core-free-icons';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAccountStore } from '../accounts.store';

export function LockAccountConfirmModal() {
  const { t } = useTranslation();
  const isLockConfirmOpen = useAccountStore((state) => state.isLockConfirmOpen);
  const accountToLock = useAccountStore((state) => state.accountToLock);
  const closeLockConfirm = useAccountStore((state) => state.closeLockConfirm);
  const toggleAccountStatus = useAccountStore((state) => state.toggleAccountStatus);

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!accountToLock) return null;

  const handleConfirm = async () => {
    try {
      setIsSubmitting(true);
      await toggleAccountStatus(accountToLock.id);
      toast.success(
        t('account.lockSuccess', 'Đã khóa tài khoản {{name}} thành công', {
          name: accountToLock.fullName,
        }),
      );
      closeLockConfirm();
    } catch (err) {
      toast.error(err.message || t('account.lockFailed', 'Khóa tài khoản thất bại'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const accountIdentifier = accountToLock.username || accountToLock.code || accountToLock.teacherCode || accountToLock.studentCode || '';

  return (
    <Dialog open={isLockConfirmOpen} onOpenChange={closeLockConfirm}>
      <DialogContent
        className="sm:max-w-[440px] rounded-none border border-border p-6 bg-card text-foreground shadow-2xl"
        data-name="Lock Account Confirmation Dialog"
      >
        <DialogHeader className="space-y-1.5">
          <div className="flex items-center gap-2.5 text-destructive">
            <div className="size-8 rounded-none bg-destructive/10 border border-destructive/20 flex items-center justify-center shrink-0">
              <HugeiconsIcon icon={Alert02Icon} size={18} />
            </div>
            <DialogTitle className="text-[17px] font-semibold text-foreground">
              {t('account.lockConfirmTitle', 'Xác nhận khóa tài khoản')}
            </DialogTitle>
          </div>
          <DialogDescription className="text-[13px] text-muted-foreground pt-1 leading-relaxed">
            {t('account.lockConfirmDesc', 'Bạn có chắc chắn muốn khóa tài khoản của {{name}}{{id}} không?', {
              name: accountToLock.fullName,
              id: accountIdentifier ? ` (${accountIdentifier})` : '',
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="my-2 p-3 border border-destructive/20 bg-destructive/5 text-destructive text-[12px] rounded-none leading-relaxed">
          <strong>{t('account.lockNoticePrefix', 'Lưu ý:')}</strong> {t('account.lockNoticeBody', 'Người dùng sẽ ngay lập tức bị vô hiệu hóa quyền truy cập và không thể đăng nhập vào hệ thống trường học cho đến khi được Ban Giám Hiệu mở khóa lại.')}
        </div>

        <DialogFooter className="mt-4 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={closeLockConfirm}
            disabled={isSubmitting}
            className="h-8 px-3 text-[13px] rounded-none border-border cursor-pointer"
          >
            {t('common.cancel', 'Hủy')}
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="h-8 px-4 text-[13px] rounded-none bg-destructive hover:bg-destructive/90 text-destructive-foreground cursor-pointer font-medium flex items-center gap-1.5"
          >
            {isSubmitting && (
              <HugeiconsIcon icon={ArrowReloadHorizontalIcon} size={14} className="animate-spin" />
            )}
            {isSubmitting
              ? t('account.locking', 'Đang khóa...')
              : t('account.actionLock', 'Khóa tài khoản')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default LockAccountConfirmModal;
