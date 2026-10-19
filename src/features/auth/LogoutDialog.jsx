import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAuthStore } from './auth.store';
import { authApi } from './auth.api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

import { useClassesStore } from '@/features/classes';

export function LogoutDialog({ open, onOpenChange }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch (err) {
      console.warn('Backend logout error (continuing local logout):', err);
    } finally {
      logout();
      try {
        localStorage.removeItem('sorak_attached_class_id');
        useClassesStore.getState().detachClass();
      } catch {}
      document.documentElement.classList.remove('dark');
      onOpenChange(false);
      toast.success(t('logout.toastSuccess'), {
        description: t('logout.toastDesc'),
      });
      navigate('/login');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideCloseButton
        className="w-[380px] max-w-[380px] p-4 gap-4 bg-card border-border rounded-none shadow-xl select-none"
        data-node-id="4030:1166"
        data-name="Logout Dialog · Lyra"
      >
        <DialogHeader className="text-center items-center space-y-1.5" data-node-id="4030:1167">
          <DialogTitle
            className="text-[14px] font-medium text-foreground text-center"
            data-node-id="4030:1168"
          >
            {t('logout.title')}
          </DialogTitle>
          <DialogDescription
            className="text-[12px] text-muted-foreground leading-[19.5px] text-center whitespace-nowrap"
            data-node-id="4030:1169"
          >
            {t('logout.description')}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex flex-row gap-2.5 justify-center w-full pt-1" data-node-id="4030:1170">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1 h-8 text-[14px] font-medium border-border hover:bg-muted/50 text-foreground shadow-none rounded-none"
            data-node-id="4030:1171"
          >
            {t('logout.cancel')}
          </Button>
          <Button
            type="button"
            onClick={handleLogout}
            className="flex-1 h-8 text-[14px] font-medium bg-[#1447e6] hover:bg-[#1447e6]/90 text-white shadow-none rounded-none"
            data-node-id="4030:1177"
          >
            {t('logout.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
