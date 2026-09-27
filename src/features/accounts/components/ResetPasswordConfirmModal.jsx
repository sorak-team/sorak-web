import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAccountStore } from '../accounts.store';

export function ResetPasswordConfirmModal() {
  const { t } = useTranslation();
  const isResetPasswordConfirmOpen = useAccountStore(
    (state) => state.isResetPasswordConfirmOpen,
  );
  const resetPasswordAccount = useAccountStore(
    (state) => state.resetPasswordAccount,
  );
  const closeResetPasswordConfirm = useAccountStore(
    (state) => state.closeResetPasswordConfirm,
  );
  const confirmResetPassword = useAccountStore(
    (state) => state.confirmResetPassword,
  );

  const [confirmText, setConfirmText] = useState('');

  const expectedPhrase = (t('account.confirmPhrase', 'tôi chắc chắn') || 'tôi chắc chắn').toLowerCase();
  const normalizedInput = confirmText.trim().toLowerCase();
  const isMatch =
    normalizedInput === expectedPhrase ||
    normalizedInput === 'tôi chắc chắn' ||
    normalizedInput === 'i am sure';

  const handleConfirm = () => {
    if (isMatch) {
      setConfirmText('');
      confirmResetPassword();
    }
  };

  const handleClose = () => {
    setConfirmText('');
    closeResetPasswordConfirm();
  };

  return (
    <Dialog open={isResetPasswordConfirmOpen} onOpenChange={handleClose}>
      <DialogContent
        className="sm:max-w-[440px] rounded-none border border-border p-6 bg-card text-foreground"
        data-node-id="4225:4964"
        data-name="Dialog"
      >
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-[18px] font-semibold text-foreground">
            {t('account.resetPasswordTitle', 'Đặt lại mật khẩu')}
          </DialogTitle>
          <p className="text-[12px] text-muted-foreground">
            {t(
              'account.resetPasswordSub',
              'Đặt lại mật khẩu cho tài khoản {{name}}',
              { name: resetPasswordAccount?.fullName || '' },
            )}
          </p>
        </DialogHeader>

        <div className="py-3 space-y-2">
          <p className="text-[13px] text-foreground font-normal">
            {t('account.typeToConfirm', 'Để xác nhận, nhập “tôi chắc chắn”')}
          </p>
          <Input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={t('account.confirmPlaceholder', 'tôi chắc chắn')}
            className="h-9 text-[13px] rounded-none border-border"
            autoFocus
          />
          <p className="text-[12px] text-muted-foreground font-normal">
            {t(
              'account.tempPasswordNotice',
              'Sau khi xác nhận, mật khẩu tạm chỉ hiển thị một lần.',
            )}
          </p>
        </div>

        <DialogFooter className="mt-4 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            className="h-8 px-3 text-[13px] rounded-none border-border"
          >
            {t('account.cancel', 'Hủy')}
          </Button>
          <Button
            type="button"
            disabled={!isMatch}
            onClick={handleConfirm}
            className="h-8 px-3 text-[13px] rounded-none bg-[#1447e6] hover:bg-[#1447e6]/90 text-white disabled:opacity-50"
            data-node-id="4225:4972"
          >
            {t('account.resetPasswordBtn', 'Đặt lại mật khẩu')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
