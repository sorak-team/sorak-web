import React from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useTeacherStore } from '../teachers.store';

export function DeleteTeacherDialog({ onSuccess }) {
  const { t } = useTranslation();
  const isDeleteDialogOpen = useTeacherStore(
    (state) => state.isDeleteDialogOpen,
  );
  const deletingTeacherId = useTeacherStore(
    (state) => state.deletingTeacherId,
  );
  const closeDeleteDialog = useTeacherStore(
    (state) => state.closeDeleteDialog,
  );
  const deleteTeacher = useTeacherStore((state) => state.deleteTeacher);
  const teachers = useTeacherStore((state) => state.teachers);

  const teacher = teachers.find((item) => item.id === deletingTeacherId);

  const handleConfirm = () => {
    if (deletingTeacherId) {
      deleteTeacher(deletingTeacherId);
      toast.success(t('teacher.toastDeleted', 'Đã xóa hồ sơ giáo viên'));
      if (onSuccess) onSuccess();
    }
  };

  return (
    <Dialog open={isDeleteDialogOpen} onOpenChange={closeDeleteDialog}>
      <DialogContent className="sm:max-w-[425px] rounded-none border border-border p-6 bg-card text-foreground">
        <DialogHeader>
          <DialogTitle className="text-[18px] font-semibold text-foreground">
            {t('teacher.deleteTitle', 'Xác nhận xóa giáo viên')}
          </DialogTitle>
          <DialogDescription className="text-[13px] text-muted-foreground pt-2">
            {t(
              'teacher.deleteDesc',
              'Bạn có chắc chắn muốn xóa hồ sơ giáo viên {{name}}? Hành động này không thể hoàn tác.',
              { name: teacher?.fullName || '' },
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-6 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={closeDeleteDialog}
            className="h-8 px-3 text-[13px] rounded-none border-border"
          >
            {t('teacher.cancel', 'Hủy')}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            className="h-8 px-3 text-[13px] rounded-none bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            {t('teacher.actionDelete', 'Xóa')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
