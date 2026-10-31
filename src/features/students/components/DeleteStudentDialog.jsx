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
import { useStudentStore } from '../students.store';

export function DeleteStudentDialog({ onSuccess }) {
  const { t } = useTranslation();
  const isDeleteDialogOpen = useStudentStore((state) => state.isDeleteDialogOpen);
  const studentToDelete = useStudentStore((state) => state.studentToDelete);
  const closeDeleteDialog = useStudentStore((state) => state.closeDeleteDialog);
  const deleteStudent = useStudentStore((state) => state.deleteStudent);

  if (!studentToDelete) return null;

  const handleConfirm = async () => {
    try {
      await deleteStudent(studentToDelete.id);
      toast.success(t('student.toastDeleted', 'Đã xóa hồ sơ học sinh'));
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Delete student failed:', err);
      const msg = err.response?.data?.message || err.message || 'Xóa học sinh không thành công';
      toast.error(msg);
    }
  };

  return (
    <Dialog open={isDeleteDialogOpen} onOpenChange={closeDeleteDialog}>
      <DialogContent className="sm:max-w-[425px] rounded-none border border-border p-6 bg-card text-foreground shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-[18px] font-semibold text-foreground">
            {t('student.deleteTitle', 'Xác nhận xóa học sinh')}
          </DialogTitle>
          <DialogDescription className="text-[13px] text-muted-foreground pt-2">
            {t(
              'student.deleteDesc',
              'Bạn có chắc chắn muốn xóa hồ sơ học sinh {{name}}? Hành động này không thể hoàn tác và chỉ có thể thực hiện khi học sinh chưa có dữ liệu học tập liên quan.',
              { name: studentToDelete.fullName || '' },
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-6 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={closeDeleteDialog}
            className="h-8 px-3 text-[13px] rounded-none border-border cursor-pointer"
          >
            {t('common.cancel', 'Hủy')}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            className="h-8 px-3 text-[13px] rounded-none bg-destructive hover:bg-destructive/90 text-destructive-foreground cursor-pointer"
          >
            {t('common.delete', 'Xóa')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default DeleteStudentDialog;
