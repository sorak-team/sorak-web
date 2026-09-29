import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { HugeiconsIcon } from '@hugeicons/react';
import { InformationCircleIcon, ArrowReloadHorizontalIcon } from '@hugeicons/core-free-icons';
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
import { Label } from '@/components/ui/label';
import { useStudentStore } from '../students.store';
import { useClassesStore } from '../../classes/classes.store';

export function TransferStudentDialog({ onSuccess }) {
  const { t } = useTranslation();
  const isTransferDialogOpen = useStudentStore((state) => state.isTransferDialogOpen);
  const studentToTransfer = useStudentStore((state) => state.studentToTransfer);
  const closeTransferDialog = useStudentStore((state) => state.closeTransferDialog);
  const transferStudent = useStudentStore((state) => state.transferStudent);

  const classes = useClassesStore((state) => state.classes);
  const fetchClasses = useClassesStore((state) => state.fetchClasses);

  const [targetClassId, setTargetClassId] = useState('');
  const [reason, setReason] = useState('');
  const [transferDate, setTransferDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isTransferDialogOpen) {
      fetchClasses();
      setTargetClassId('');
      setReason('');
      setTransferDate(new Date().toISOString().split('T')[0]);
    }
  }, [isTransferDialogOpen, fetchClasses]);

  if (!studentToTransfer) return null;

  const currentClassId = studentToTransfer.currentClass?.classId || '';
  const currentClassName = studentToTransfer.currentClass?.className || null;
  const hasCurrentClass = Boolean(currentClassId || currentClassName);

  // Filter out the class the student is currently enrolled in
  const availableClasses = (classes || []).filter(
    (c) =>
      String(c.id) !== String(currentClassId) &&
      String(c.name).toLowerCase() !== String(currentClassName || '').toLowerCase()
  );

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!hasCurrentClass) {
      toast.error('Học sinh chưa được xếp lớp. Vui lòng phân lớp trước khi tạo yêu cầu chuyển lớp.');
      return;
    }

    if (!targetClassId) {
      toast.error('Vui lòng chọn lớp học chuyển đến');
      return;
    }

    const selectedClass = classes.find((c) => String(c.id) === String(targetClassId));
    const targetName = selectedClass ? selectedClass.name : targetClassId;

    try {
      setIsSubmitting(true);
      await transferStudent(
        studentToTransfer.id,
        currentClassId,
        targetClassId,
        targetName,
        reason.trim(),
        transferDate
      );

      toast.success(
        `Đã tạo yêu cầu chuyển lớp cho học sinh ${studentToTransfer.fullName} (Chờ Ban Giám Hiệu duyệt)`
      );

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error('Submit transfer request error:', err);
      toast.error(err.response?.data?.message || err.message || 'Tạo yêu cầu chuyển lớp thất bại');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isTransferDialogOpen} onOpenChange={closeTransferDialog}>
      <DialogContent className="sm:max-w-[480px] rounded-none border border-border p-6 bg-card text-foreground shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-[18px] font-semibold text-foreground">
            {t('student.createTransferRequest', 'Tạo yêu cầu chuyển lớp')}
          </DialogTitle>
          <DialogDescription className="text-[13px] text-muted-foreground pt-1.5">
            Đề xuất chuyển lớp cho học sinh{' '}
            <strong className="text-foreground font-semibold">
              {studentToTransfer.fullName} ({studentToTransfer.studentCode})
            </strong>
          </DialogDescription>
        </DialogHeader>

        {/* Informational Notice */}
        <div className="p-3 border border-blue-500/20 bg-blue-500/10 text-blue-900 dark:text-blue-200 rounded-none text-[12px] flex items-start gap-2.5 my-1">
          <HugeiconsIcon
            icon={InformationCircleIcon}
            size={18}
            className="shrink-0 mt-0.5 text-blue-600 dark:text-blue-400"
          />
          <div className="leading-relaxed">
            <span className="font-semibold">Quy trình duyệt:</span> Hành động này sẽ{' '}
            <strong>tạo yêu cầu chuyển lớp (chờ duyệt)</strong> gửi đến Ban Giám Hiệu. Học sinh{' '}
            <strong>vẫn học tại lớp hiện tại</strong> cho đến khi yêu cầu được Ban Giám Hiệu phê duyệt.
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 my-2 text-[13px]">
          {/* Current Class */}
          <div className="space-y-1.5">
            <Label className="text-[12px] font-medium text-foreground">
              Lớp học hiện tại
            </Label>
            <div
              className={`h-9 px-3 border border-border rounded-none flex items-center font-medium text-[13px] ${
                hasCurrentClass
                  ? 'bg-muted/30 text-foreground'
                  : 'bg-destructive/10 text-destructive border-destructive/30'
              }`}
            >
              {currentClassName || 'Chưa phân lớp (Không thể tạo yêu cầu chuyển lớp)'}
            </div>
            {!hasCurrentClass && (
              <p className="text-[11px] text-destructive">
                * Học sinh cần được phân lớp trước khi có thể đề xuất chuyển sang lớp khác.
              </p>
            )}
          </div>

          {/* Target Class */}
          <div className="space-y-1.5">
            <Label htmlFor="targetClass" className="text-[12px] font-medium text-foreground">
              Lớp học đề xuất chuyển đến <span className="text-destructive">*</span>
            </Label>
            <select
              id="targetClass"
              value={targetClassId}
              onChange={(e) => setTargetClassId(e.target.value)}
              disabled={!hasCurrentClass || isSubmitting}
              className="w-full h-9 px-3 bg-background border border-border rounded-none text-[13px] text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              required
            >
              <option value="">-- Chọn lớp học chuyển đến --</option>
              {availableClasses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.gradeLabel || 'Khối Mầm'} • {c.studentCount || 0} học sinh)
                </option>
              ))}
            </select>
          </div>

          {/* Transfer Date */}
          <div className="space-y-1.5">
            <Label htmlFor="transferDate" className="text-[12px] font-medium text-foreground">
              Ngày dự kiến chuyển
            </Label>
            <Input
              id="transferDate"
              type="date"
              value={transferDate}
              onChange={(e) => setTransferDate(e.target.value)}
              disabled={!hasCurrentClass || isSubmitting}
              className="h-9 rounded-none text-[13px] border-border"
            />
          </div>

          {/* Reason */}
          <div className="space-y-1.5">
            <Label htmlFor="reason" className="text-[12px] font-medium text-foreground">
              Lý do chuyển lớp
            </Label>
            <Input
              id="reason"
              placeholder="VD: Điều chỉnh độ tuổi, phụ huynh yêu cầu chuyển buổi..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={!hasCurrentClass || isSubmitting}
              className="h-9 rounded-none text-[13px] border-border"
            />
          </div>

          <DialogFooter className="mt-6 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={closeTransferDialog}
              disabled={isSubmitting}
              className="h-8 px-3 text-[13px] rounded-none border-border cursor-pointer"
            >
              {t('common.cancel', 'Hủy')}
            </Button>
            <Button
              type="submit"
              disabled={!hasCurrentClass || isSubmitting}
              className="h-8 px-4 text-[13px] rounded-none bg-[#1447e6] hover:bg-[#1447e6]/90 text-white cursor-pointer font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {isSubmitting && (
                <HugeiconsIcon icon={ArrowReloadHorizontalIcon} size={14} className="animate-spin" />
              )}
              {isSubmitting
                ? 'Đang gửi yêu cầu...'
                : t('student.submitTransferRequest', 'Gửi yêu cầu chuyển lớp')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default TransferStudentDialog;
