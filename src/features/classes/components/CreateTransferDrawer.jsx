import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Cancel01Icon,
} from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/shared/lib/utils';
import { classesApi } from '../classes.api';
import { useClassesStore } from '../classes.store';
import { getStudentAvatarUrl } from '../../students/students.store';

export function CreateTransferDrawer({
  isOpen,
  onClose,
  classId,
  className,
  targetClasses = [],
  initialStudentId = '',
  onSuccess,
}) {
  const { t } = useTranslation();
  const globalClasses = useClassesStore((state) => state.classes) || [];
  const [students, setStudents] = useState([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState(initialStudentId || '');
  const [toClassId, setToClassId] = useState('');
  const [transferDate, setTransferDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync initial student id
  useEffect(() => {
    if (initialStudentId) {
      setSelectedStudentId(String(initialStudentId));
    }
  }, [initialStudentId, isOpen]);

  // Target classes fallback to all other classes
  const availableTargetClasses = useMemo(() => {
    if (targetClasses && targetClasses.length > 0) return targetClasses;
    return globalClasses
      .filter((c) => String(c.id) !== String(classId))
      .map((c) => ({
        id: c.id,
        name: c.name,
        gradeLabel: c.gradeLabel || c.grade,
        room: c.room || '',
      }));
  }, [targetClasses, globalClasses, classId]);

  // Load active students in this class
  useEffect(() => {
    if (!isOpen || !classId) return;
    const fetchStudents = async () => {
      try {
        setIsLoadingStudents(true);
        const res = await classesApi.getClassStudents(classId);
        const list = res.items || res.students || (Array.isArray(res) ? res : []);
        setStudents(list);
      } catch (err) {
        console.error('Failed to load students for transfer:', err);
      } finally {
        setIsLoadingStudents(false);
      }
    };
    fetchStudents();
  }, [isOpen, classId]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStudentId) {
      toast.error(t('classes.selectStudentRequired', 'Vui lòng chọn học sinh cần chuyển lớp.'));
      return;
    }
    if (!toClassId) {
      toast.error(t('classes.selectTargetClassRequired', 'Vui lòng chọn lớp tiếp nhận.'));
      return;
    }
    if (!reason.trim()) {
      toast.error(t('classes.enterTransferReasonRequired', 'Vui lòng nhập lý do chuyển lớp.'));
      return;
    }

    try {
      setIsSubmitting(true);
      await classesApi.createTransferRequest(classId, {
        studentId: selectedStudentId,
        toClassId,
        transferDate,
        reason: reason.trim(),
      });

      toast.success(
        t('classes.createTransferSuccess', 'Đã khởi tạo yêu cầu chuyển lớp thành công!'),
      );
      setSelectedStudentId('');
      setToClassId('');
      setReason('');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Lỗi khi tạo yêu cầu chuyển lớp';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedStudent = students.find(
    (s) => String(s.id || s.studentId) === String(selectedStudentId),
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in-0 duration-200"
      />

      {/* Drawer Panel matching ClassDrawer standard */}
      <div
        className={cn(
          'relative w-full max-w-[520px] h-full bg-card border-l border-border shadow-2xl flex flex-col',
          'animate-in slide-in-from-right duration-250 ease-out z-10 text-foreground select-none',
        )}
        data-name="CreateTransferDrawer"
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-border shrink-0">
          <div className="flex flex-col gap-1">
            <h2 className="text-[18px] font-semibold text-foreground tracking-tight">
              {t('classes.createTransferTitle', 'Tạo yêu cầu chuyển lớp')}
            </h2>
            <p className="text-[12px] text-muted-foreground font-normal">
              {t(
                'classes.createTransferSubtitle',
                'Khởi tạo hồ sơ chuyển lớp từ {{name}} sang lớp khác',
                { name: className },
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="size-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-none transition-colors cursor-pointer"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={16} />
          </button>
        </div>

        {/* Form Body with Section Cards */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Card 1: Lộ trình chuyển lớp */}
          <div className="border border-border bg-card rounded-none overflow-hidden">
            <div className="p-4 border-b border-border bg-muted/20">
              <h3 className="text-[14px] font-semibold text-foreground">
                {t('classes.transferRouteTitle', 'Học sinh & Lớp tiếp nhận')}
              </h3>
              <p className="text-[12px] text-muted-foreground font-normal">
                {t('classes.transferRouteDesc', 'Chọn học sinh và lớp mới trong cùng năm học')}
              </p>
            </div>

            <div className="p-4 space-y-4">
              {/* Select Student */}
              <div className="space-y-1.5">
                <Label className="text-[12px] font-medium text-foreground">
                  {t('classes.selectStudentToTransfer', 'Học sinh cần chuyển')} <span className="text-destructive">*</span>
                </Label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  disabled={isLoadingStudents}
                  className="w-full h-9 px-3 bg-background border border-border rounded-none text-[13px] text-foreground focus:outline-none focus:border-primary cursor-pointer"
                >
                  <option value="">
                    {isLoadingStudents
                      ? t('common.loading', 'Đang tải danh sách...')
                      : t('classes.chooseStudentPlaceholder', '-- Chọn học sinh trong lớp --')}
                  </option>
                  {students.map((st) => (
                    <option key={st.id || st.studentId} value={st.id || st.studentId}>
                      {st.studentCode} - {st.fullName} ({st.gender === 'FEMALE' ? 'Nữ' : 'Nam'})
                    </option>
                  ))}
                </select>

                {selectedStudent && (
                  <div className="mt-2 p-2.5 border border-border bg-muted/20 flex items-center gap-3 rounded-none">
                    <img
                      src={getStudentAvatarUrl(
                        selectedStudent.avatarUrl,
                        selectedStudent.studentCode || selectedStudent.fullName,
                      )}
                      alt={selectedStudent.fullName}
                      className="size-8 rounded-none border border-border bg-background object-cover shrink-0"
                      onError={(e) => {
                        e.currentTarget.src = getStudentAvatarUrl(
                          null,
                          selectedStudent.studentCode || selectedStudent.fullName,
                        );
                      }}
                    />
                    <div className="flex flex-col min-w-0 text-[12px]">
                      <span className="font-semibold text-foreground truncate">
                        {selectedStudent.fullName}
                      </span>
                      <span className="text-muted-foreground">
                        Mã HS: {selectedStudent.studentCode} · Ngày sinh: {selectedStudent.dateOfBirth || '—'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Select Destination Class */}
              <div className="space-y-1.5">
                <Label className="text-[12px] font-medium text-foreground">
                  {t('classes.selectDestinationClass', 'Chuyển đến lớp')} <span className="text-destructive">*</span>
                </Label>
                <select
                  value={toClassId}
                  onChange={(e) => setToClassId(e.target.value)}
                  className="w-full h-9 px-3 bg-background border border-border rounded-none text-[13px] text-foreground focus:outline-none focus:border-primary cursor-pointer"
                >
                  <option value="">{t('classes.chooseTargetClassPlaceholder', '-- Chọn lớp tiếp nhận --')}</option>
                  {availableTargetClasses.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} - {cls.gradeLabel} {cls.room ? (cls.room.startsWith('Phòng') ? `(${cls.room})` : `(Phòng ${cls.room})`) : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Transfer Effective Date */}
              <div className="space-y-1.5">
                <Label className="text-[12px] font-medium text-foreground">
                  {t('classes.effectiveDate', 'Ngày có hiệu lực')} <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="date"
                  value={transferDate}
                  onChange={(e) => setTransferDate(e.target.value)}
                  className="h-9 text-[13px] font-mono rounded-none border-border"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Căn cứ & Lý do */}
          <div className="border border-border bg-card rounded-none overflow-hidden">
            <div className="p-4 border-b border-border bg-muted/20">
              <h3 className="text-[14px] font-semibold text-foreground">
                {t('classes.transferReasonLabel', 'Lý do chuyển lớp')} <span className="text-destructive">*</span>
              </h3>
              <p className="text-[12px] text-muted-foreground font-normal">
                {t('classes.transferReasonSub', 'Căn cứ đề xuất để Ban Giám Hiệu xét duyệt')}
              </p>
            </div>

            <div className="p-4">
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t(
                  'classes.transferReasonPlaceholder',
                  'Ví dụ: Chuyển theo nguyện vọng phụ huynh, thay đổi ca học, phù hợp lứa tuổi...',
                )}
                className="w-full p-3 text-[13px] bg-background border border-border rounded-none outline-none focus:border-primary placeholder:text-muted-foreground/60 resize-none text-foreground"
              />
            </div>
          </div>
        </form>

        {/* Sticky Footer matching ClassDrawer standard */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border shrink-0 bg-background">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="h-8 px-4 text-[13px] rounded-none border-border cursor-pointer shadow-none"
          >
            {t('common.cancel', 'Hủy')}
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedStudentId || !toClassId}
            className="h-8 px-4 text-[13px] rounded-none bg-[#1447e6] hover:bg-[#1447e6]/90 text-white cursor-pointer font-medium shadow-none"
          >
            {isSubmitting
              ? t('common.sending', 'Đang gửi...')
              : t('classes.submitTransferBtn', 'Gửi yêu cầu')}
          </Button>
        </div>
      </div>
    </div>
  );
}
