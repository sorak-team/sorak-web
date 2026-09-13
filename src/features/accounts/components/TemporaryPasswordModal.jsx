import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { HugeiconsIcon } from '@hugeicons/react';
import { Copy01Icon, CheckmarkSquare02Icon } from '@hugeicons/core-free-icons';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAccountStore } from '../accounts.store';

export function TemporaryPasswordModal() {
  const { t } = useTranslation();
  const isTemporaryPasswordModalOpen = useAccountStore(
    (state) => state.isTemporaryPasswordModalOpen,
  );
  const temporaryPassword = useAccountStore(
    (state) => state.temporaryPassword,
  );
  const closeTemporaryPasswordModal = useAccountStore(
    (state) => state.closeTemporaryPasswordModal,
  );

  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (temporaryPassword) {
      navigator.clipboard.writeText(temporaryPassword);
      setCopied(true);
      toast.success(t('account.copiedToast', 'Đã sao chép mật khẩu tạm thời vào clipboard'));
      setTimeout(() => setCopied(false), 3000);
    }
  };

  return (
    <Dialog
      open={isTemporaryPasswordModalOpen}
      onOpenChange={closeTemporaryPasswordModal}
    >
      <DialogContent
        className="sm:max-w-[440px] rounded-none border border-border p-6 bg-card text-foreground"
        data-node-id="4225:5065"
        data-name="Dialog"
      >
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-[18px] font-semibold text-foreground">
            {t('account.tempPasswordTitle', 'Mật khẩu tạm thời')}
          </DialogTitle>
          <p className="text-[12px] text-muted-foreground">
            {t(
              'account.tempPasswordSub',
              'Mật khẩu tạm đã được tạo thành công cho tài khoản',
            )}
          </p>
        </DialogHeader>

        <div className="py-3 space-y-3" data-node-id="4225:5067">
          <p className="text-[13px] text-foreground font-medium">
            {t('account.tempPasswordLabel', 'Mật khẩu tạm thời')}
          </p>

          {/* Secret Token Box */}
          <div
            className="flex items-center justify-between p-3 border border-border bg-muted/30 rounded-none"
            data-node-id="4225:5069"
            data-name="Secret Token"
          >
            <span className="font-mono text-[16px] font-semibold tracking-wide text-foreground select-all">
              {temporaryPassword}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="h-8 px-2.5 text-[12px] rounded-none border-border bg-background hover:bg-muted cursor-pointer flex items-center gap-1.5"
            >
              {copied ? (
                <>
                  <HugeiconsIcon
                    icon={CheckmarkSquare02Icon}
                    size={14}
                    className="text-primary"
                  />
                  <span>{t('account.copied', 'Đã sao chép')}</span>
                </>
              ) : (
                <>
                  <HugeiconsIcon icon={Copy01Icon} size={14} />
                  <span>{t('account.copy', 'Sao chép')}</span>
                </>
              )}
            </Button>
          </div>

          <p className="text-[12px] text-muted-foreground font-normal leading-relaxed">
            {t(
              'account.copyWarning',
              'Hãy sao chép và gửi cho người dùng. Đóng cửa sổ này sẽ không thể xem lại.',
            )}
          </p>
        </div>

        <DialogFooter className="mt-4 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={closeTemporaryPasswordModal}
            className="h-8 px-4 text-[13px] rounded-none border-border"
          >
            {t('account.close', 'Đóng')}
          </Button>
          <Button
            type="button"
            onClick={handleCopy}
            className="h-8 px-3 text-[13px] rounded-none bg-[#1447e6] hover:bg-[#1447e6]/90 text-white"
          >
            {copied
              ? t('account.copied', 'Đã sao chép')
              : t('account.copyPassword', 'Sao chép mật khẩu')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
