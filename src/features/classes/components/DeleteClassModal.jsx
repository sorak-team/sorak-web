import React from 'react';
import { useNavigate } from 'react-router-dom';
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
import { useClassesStore } from '../classes.store';

export function DeleteClassModal() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const isDeleteModalOpen = useClassesStore((state) => state.isDeleteModalOpen);
  const classToDelete = useClassesStore((state) => state.classToDelete);
  const closeDeleteModal = useClassesStore((state) => state.closeDeleteModal);
  const deleteClass = useClassesStore((state) => state.deleteClass);

  if (!classToDelete) return null;

  const handleDelete = async () => {
    try {
      await deleteClass(classToDelete.id);
      toast.success(
        t('classes.deleteSuccess', `Đã xóa lớp ${classToDelete.name} thành công.`),
      );
      navigate('/classes');
    } catch (err) {
      console.error('Delete class failed:', err);
      const msg = err.response?.data?.message || err.message || 'Xóa lớp học không thành công';
      toast.error(msg);
    }
  };

  return (
    <Dialog open={isDeleteModalOpen} onOpenChange={(open) => !open && closeDeleteModal()}>
      <DialogContent
        className="w-[92vw] max-w-[440px] p-6 rounded-none border border-border bg-card shadow-2xl text-foreground select-none"
        data-name="Dialog · Delete Class Confirm"
      >
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-[16px] font-semibold text-destructive">
            {t('classes.deleteConfirmTitle', 'Xác nhận xóa lớp học')}
          </DialogTitle>
          <DialogDescription className="text-[13px] text-muted-foreground leading-relaxed">
            {t(
              'classes.deleteConfirmDesc',
              'Bạn có chắc chắn muốn xóa lớp {{name}}? Hành động này không thể hoàn tác và chỉ có thể thực hiện khi lớp học chưa có dữ liệu liên quan.',
              { name: classToDelete.name },
            )}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-6 flex flex-row items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={closeDeleteModal}
            className="h-8 px-3.5 rounded-none text-[13px]"
          >
            {t('classes.cancel', 'Hủy')}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            className="h-8 px-3.5 rounded-none text-[13px] font-medium"
          >
            {t('classes.confirmDelete', 'Xóa lớp')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
