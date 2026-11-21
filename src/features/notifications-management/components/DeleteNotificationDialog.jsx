import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useNotificationsManagementStore } from '../notifications-management.store';

export function DeleteNotificationDialog() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const isDeleteDialogOpen = useNotificationsManagementStore((state) => state.isDeleteDialogOpen);
  const deletingBatchId = useNotificationsManagementStore((state) => state.deletingBatchId);
  const closeDeleteDialog = useNotificationsManagementStore((state) => state.closeDeleteDialog);
  const deleteBroadcast = useNotificationsManagementStore((state) => state.deleteBroadcast);
  const isDeleting = useNotificationsManagementStore((state) => state.isDeleting);

  const broadcasts = useNotificationsManagementStore((state) => state.broadcasts);
  const activeBroadcastDetail = useNotificationsManagementStore((state) => state.activeBroadcastDetail);
  const target = broadcasts.find((b) => b.batchId === deletingBatchId) || activeBroadcastDetail;

  if (!isDeleteDialogOpen) return null;

  const handleDelete = async () => {
    try {
      await deleteBroadcast();
      if (location.pathname.startsWith('/notifications/') && location.pathname !== '/notifications') {
        navigate('/notifications');
      }
    } catch (err) {
      // Error handled by store toast
    }
  };

  return (
    <Dialog open={isDeleteDialogOpen} onOpenChange={closeDeleteDialog}>
      <DialogContent className="sm:max-w-[425px] rounded-none border border-border p-6 bg-card text-foreground shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-[18px] font-semibold text-foreground">
            {t('notifications.management.deleteDialogTitle', 'Xác nhận thu hồi bản tin')}
          </DialogTitle>
          <DialogDescription className="text-[13px] text-muted-foreground pt-2">
            {t('notifications.management.deleteDialogDesc', 'Bạn có chắc chắn muốn thu hồi bản tin "{{title}}"? Bản tin sẽ bị ẩn khỏi toàn bộ hộp thư của giáo viên và phụ huynh đã nhận.', { title: target?.title || '' })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-6 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={closeDeleteDialog}
            disabled={isDeleting}
            className="h-8 px-3 text-[13px] rounded-none border-border cursor-pointer"
          >
            {t('common.cancel', 'Hủy')}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
            className="h-8 px-3 text-[13px] rounded-none bg-destructive hover:bg-destructive/90 cursor-pointer"
          >
            {isDeleting ? t('notifications.management.revoking', 'Đang thu hồi...') : t('notifications.management.revokeBtn', 'Thu hồi')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

