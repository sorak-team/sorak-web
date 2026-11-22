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
import { useAuthStore, isTeacherRole } from '@/features/auth';

export function TransferStudentDialog({ onSuccess }) {
  const { t } = useTranslation();
  const currentUser = useAuthStore((state) => state.user);
  const isTeacher = isTeacherRole(currentUser?.role);

  const isTransferDialogOpen = useStudentStore((state) => state.isTransferDialogOpen);
  const studentToTransfer = useStudentStore((state) => state.studentToTransfer);
  const closeTransferDialog = useStudentStore((state) => state.closeTransferDialog);
  const transferStudent = useStudentStore((state) => state.transferStudent);

  const classes = useClassesStore((state) => state.classes);
  const fetchClasses = useClassesStore((state) => state.fetchClasses);

  const [targetClassId, setTargetClassId] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('ALL');
  const [reason, setReason] = useState('');
  const [transferDate, setTransferDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const GRADE_OPTIONS = [
    { value: 'ALL', label: t('classes.allGrades', 'Tất cả các khối') },
    { value: 'nhatre', label: t('classes.nurseryGrade', 'Khối Nhà trẻ') },
    { value: 'mam', label: t('classes.juniorGradeWithAge', 'Khối Mầm (3–4 tuổi)') },
    { value: 'choi', label: t('classes.middleGradeWithAge', 'Khối Chồi (4–5 tuổi)') },
    { value: 'la', label: t('classes.seniorGradeWithAge', 'Khối Lá (5–6 tuổi)') },
  ];

  useEffect(() => {
    if (isTransferDialogOpen) {
      fetchClasses();
      setTargetClassId('');
      setReason('');
      setTransferDate(new Date().toISOString().split('T')[0]);

      // If student is currently in a grade, default to that grade or ALL
      const currentClass = (classes || []).find(
        (c) =>
          (studentToTransfer?.currentClass?.classId && String(c.id) === String(studentToTransfer.currentClass.classId)) ||
          (studentToTransfer?.currentClass?.className && String(c.name).toLowerCase() === String(studentToTransfer.currentClass.className).toLowerCase())
      );
      if (currentClass?.grade) {
        setSelectedGrade(currentClass.grade);
      } else {
        setSelectedGrade('ALL');
      }
    }
  }, [isTransferDialogOpen]);

  if (!studentToTransfer) return null;

  const currentClassId = studentToTransfer.currentClass?.classId || '';
  const currentClassName = studentToTransfer.currentClass?.className || null;
  const hasCurrentClass = Boolean(currentClassId || currentClassName);

  const currentClassObj = (classes || []).find(
    (c) =>
      String(c.id) === String(currentClassId) ||
      (currentClassName && String(c.name).toLowerCase() === String(currentClassName).toLowerCase())
  );
  const currentGrade = currentClassObj?.grade || 'nhatre';

  // Filter out the class the student is currently enrolled in
  const availableClasses = (classes || []).filter((c) => {
    if (String(c.id) === String(currentClassId)) return false;
    if (currentClassName && String(c.name).toLowerCase() === String(currentClassName).toLowerCase()) return false;
    if (isTeacher && currentGrade) {
      return c.grade === currentGrade;
    }
    return true;
  });

  // Filter by selected grade
  const filteredClasses = availableClasses.filter((c) => {
    if (isTeacher) return true; // already locked to currentGrade
    if (selectedGrade === 'ALL') return true;
    return (
      c.grade === selectedGrade ||
      c.ageGroup === selectedGrade ||
      (c.gradeLabel && c.gradeLabel.toLowerCase().includes(selectedGrade.toLowerCase()))
    );
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!hasCurrentClass) {
      toast.error(t('student.transferNoCurrentClassToast', 'Học sinh chưa được xếp lớp. Vui lòng phân lớp trước khi tạo yêu cầu chuyển lớp.'));
      return;
    }

    if (!targetClassId) {
      toast.error(t('student.transferSelectTargetClassToast', 'Vui lòng chọn lớp học chuyển đến'));
      return;
    }

    if (!reason.trim()) {
      toast.error(t('student.transferInputReasonToast', 'Vui lòng nhập lý do chuyển lớp'));
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    if (transferDate < todayStr) {
      toast.error(t('student.transferDateFutureToast', 'Ngày dự kiến chuyển phải từ hôm nay trở đi (nằm ở hiện tại hoặc tương lai)'));
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
        t('student.transferSuccessToast', 'Đã tạo yêu cầu chuyển lớp cho học sinh {{name}} (Chờ Ban Giám Hiệu duyệt)', {
          name: studentToTransfer.fullName,
        })
      );

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error('Submit transfer request error:', err);
      toast.error(err.response?.data?.message || err.message || t('student.transferFailedToast', 'Tạo yêu cầu chuyển lớp thất bại'));
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
            {t('student.transferDescription', 'Đề xuất chuyển lớp cho học sinh')}{' '}
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
            <span className="font-semibold">{t('student.transferNoticeTitle', 'Quy trình duyệt:')}</span>{' '}
            {t('student.transferNoticeBody', 'Hành động này sẽ tạo yêu cầu chuyển lớp (chờ duyệt) gửi đến Ban Giám Hiệu. Học sinh vẫn học tại lớp hiện tại cho đến khi yêu cầu được Ban Giám Hiệu phê duyệt.')}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 my-2 text-[13px]">
          {/* Current Class */}
          <div className="space-y-1.5">
            <Label className="text-[12px] font-medium text-foreground">
              {t('student.currentClassLabel', 'Lớp học hiện tại')}
            </Label>
            <div
              className={`h-9 px-3 border border-border rounded-none flex items-center font-medium text-[13px] ${
                hasCurrentClass
                  ? 'bg-muted/30 text-foreground'
                  : 'bg-destructive/10 text-destructive border-destructive/30'
              }`}
            >
              {currentClassName || t('student.unassignedCannotTransfer', 'Chưa phân lớp (Không thể tạo yêu cầu chuyển lớp)')}
            </div>
            {!hasCurrentClass && (
              <p className="text-[11px] text-destructive">
                {t('student.unassignedNotice', '* Học sinh cần được phân lớp trước khi có thể đề xuất chuyển sang lớp khác.')}
              </p>
            )}
          </div>

          {/* Filter by Grade */}
          <div className="space-y-1.5">
            <Label htmlFor="targetGrade" className="text-[12px] font-medium text-foreground">
              {isTeacher ? t('student.teacherGradeLabel', 'Khối lớp học sinh') : t('student.filterGradeLabel', 'Lọc theo khối lớp')}
            </Label>
            {isTeacher ? (
              <div>
                <div className="w-full h-9 px-3 bg-muted/40 border border-border/70 rounded-none text-[13px] text-muted-foreground flex items-center select-none cursor-not-allowed">
                  {currentClassObj?.gradeLabel || (GRADE_OPTIONS.find((g) => g.value === currentGrade)?.label) || t('student.teacherGradeLabel', 'Khối lớp học sinh')}
                </div>
                <p className="text-[11.5px] text-muted-foreground italic mt-1">
                  {t('student.teacherGradeRuleNotice', '* Theo quy định, giáo viên chỉ đề xuất chuyển lớp cho học sinh trong cùng khối học.')}
                </p>
              </div>
            ) : (
              <select
                id="targetGrade"
                value={selectedGrade}
                onChange={(e) => {
                  setSelectedGrade(e.target.value);
                  setTargetClassId('');
                }}
                disabled={!hasCurrentClass || isSubmitting}
                className="w-full h-9 px-3 bg-background border border-border rounded-none text-[13px] text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {GRADE_OPTIONS.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Target Class */}
          <div className="space-y-1.5">
            <Label htmlFor="targetClass" className="text-[12px] font-medium text-foreground">
              {t('student.targetClassLabel', 'Lớp học đề xuất chuyển đến')} <span className="text-destructive">*</span>
            </Label>
            <select
              id="targetClass"
              value={targetClassId}
              onChange={(e) => setTargetClassId(e.target.value)}
              disabled={!hasCurrentClass || isSubmitting}
              className="w-full h-9 px-3 bg-background border border-border rounded-none text-[13px] text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              required
            >
              <option value="">
                {filteredClasses.length === 0
                  ? t('student.noOtherClassesInGrade', '-- Không có lớp khác trong khối này --')
                  : t('student.selectTargetClassPlaceholder', '-- Chọn lớp học chuyển đến --')}
              </option>
              {filteredClasses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.gradeLabel || t('classes.juniorGrade', 'Khối Mầm')} • {c.studentCount || 0}/{c.capacity || 40} {t('common.students', 'học sinh')})
                </option>
              ))}
            </select>
          </div>

          {/* Transfer Date */}
          <div className="space-y-1.5">
            <Label htmlFor="transferDate" className="text-[12px] font-medium text-foreground">
              {t('student.expectedTransferDate', 'Ngày dự kiến chuyển')} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="transferDate"
              type="date"
              min={new Date().toISOString().split('T')[0]}
              value={transferDate}
              onChange={(e) => setTransferDate(e.target.value)}
              disabled={!hasCurrentClass || isSubmitting}
              className="h-9 rounded-none text-[13px] border-border"
              required
            />
          </div>

          {/* Reason */}
          <div className="space-y-1.5">
            <Label htmlFor="reason" className="text-[12px] font-medium text-foreground">
              {t('student.transferReason', 'Lý do chuyển lớp')} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="reason"
              placeholder={t('student.transferReasonPlaceholder', 'VD: Điều chỉnh độ tuổi, phụ huynh yêu cầu chuyển buổi...')}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={!hasCurrentClass || isSubmitting}
              className="h-9 rounded-none text-[13px] border-border"
              required
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
                ? t('student.submittingTransferRequest', 'Đang gửi yêu cầu...')
                : t('student.submitTransferRequest', 'Gửi yêu cầu chuyển lớp')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default TransferStudentDialog;
