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
  const fetchGlobalClasses = useClassesStore((state) => state.fetchClasses);
  const hasLoadedClasses = useClassesStore((state) => state.hasLoaded);
  const isClassesLoading = useClassesStore((state) => state.isLoading);
  const [students, setStudents] = useState([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState(initialStudentId || '');
  const [toClassId, setToClassId] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('ALL');
  const [transferDate, setTransferDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Automatically fetch classes if store is empty (e.g. for Teacher routes)
  useEffect(() => {
    if (isOpen && !hasLoadedClasses && !isClassesLoading) {
      fetchGlobalClasses();
    }
  }, [isOpen, hasLoadedClasses, isClassesLoading, fetchGlobalClasses]);

  const currentClassObj = globalClasses.find(
    (c) => String(c.id) === String(classId) || String(c.publicId) === String(classId),
  );
  const currentGrade = currentClassObj?.grade || 'nhatre';

  // Pre-filter by the student's current class grade on open
  useEffect(() => {
    if (isOpen && currentGrade) {
      setSelectedGrade(currentGrade);
    }
  }, [isOpen, currentGrade]);

  const GRADE_OPTIONS = [
    { value: 'ALL', label: t('classes.gradeFilterAll', 'Tất cả các khối') },
    { value: 'nhatre', label: t('classes.gradeNhaTre', 'Khối Nhà trẻ') },
    { value: 'mam', label: t('classes.gradeMam', 'Khối Mầm (3–4 tuổi)') },
    { value: 'choi', label: t('classes.gradeChoi', 'Khối Chồi (4–5 tuổi)') },
    { value: 'la', label: t('classes.gradeLa', 'Khối Lá (5–6 tuổi)') },
  ];

  // Sync initial student id
  useEffect(() => {
    if (initialStudentId) {
      setSelectedStudentId(String(initialStudentId));
    }
  }, [initialStudentId, isOpen]);

  // Target classes fallback to all other classes
  const availableTargetClasses = useMemo(() => {
    const list = targetClasses && targetClasses.length > 0
      ? targetClasses
      : globalClasses
          .filter((c) => String(c.id) !== String(classId) && String(c.publicId) !== String(classId))
          .map((c) => ({
            id: c.publicId || c.id,
            name: c.name,
            grade: c.grade || (c.ageGroup ? c.ageGroup.toLowerCase().replace('_', '') : ''),
            gradeLabel: c.gradeLabel || c.grade,
            room: c.room || c.roomNumber || '',
          }));

    if (selectedGrade === 'ALL') return list;
    return list.filter((c) => {
      return (
        c.grade === selectedGrade ||
        (c.gradeLabel && c.gradeLabel.toLowerCase().includes(selectedGrade.toLowerCase()))
      );
    });
  }, [targetClasses, globalClasses, classId, selectedGrade]);

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
    const todayStr = new Date().toISOString().split('T')[0];
    if (transferDate < todayStr) {
      toast.error(t('classes.transferDateFutureError', 'Ngày dự kiến chuyển phải từ hôm nay trở đi (nằm ở hiện tại hoặc tương lai)'));
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
          'relative w-full max-w-[540px] h-full bg-card border-l border-border shadow-2xl flex flex-col',
          'animate-in slide-in-from-right duration-250 ease-out z-10 text-foreground select-none',
        )}
        data-name="CreateTransferDrawer"
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-border shrink-0 bg-card">
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

        {/* Clean Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* Section 1: Thông tin học sinh & Lớp tiếp nhận */}
          <div className="space-y-4">
            <div className="space-y-0.5">
              <h3 className="text-[13.5px] font-semibold text-foreground tracking-tight">
                {t('classes.transferRouteTitle', 'Học sinh & Lớp tiếp nhận')}
              </h3>
              <p className="text-[12px] text-muted-foreground font-normal">
                {t('classes.transferRouteDesc', 'Chọn học sinh và lớp mới trong cùng năm học')}
              </p>
            </div>

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
                    {st.studentCode} - {st.fullName} ({st.gender === 'FEMALE' ? t('common.female', 'Nữ') : t('common.male', 'Nam')})
                  </option>
                ))}
              </select>

              {selectedStudent && (
                <div className="mt-2 p-3 border border-border bg-muted/20 flex items-center gap-3 rounded-none">
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
                      {t('classes.studentCodeAndDob', 'Mã HS: {{code}} · Ngày sinh: {{dob}}', {
                        code: selectedStudent.studentCode,
                        dob: selectedStudent.dateOfBirth || '—',
                      })}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Filter by Grade */}
            <div className="space-y-1.5">
              <Label className="text-[12px] font-medium text-foreground">
                {t('classes.filterByGrade', 'Lọc theo khối lớp')}
              </Label>
              <select
                value={selectedGrade}
                onChange={(e) => {
                  setSelectedGrade(e.target.value);
                  setToClassId('');
                }}
                className="w-full h-9 px-3 bg-background border border-border rounded-none text-[13px] text-foreground focus:outline-none focus:border-primary cursor-pointer"
              >
                {GRADE_OPTIONS.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
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
                <option value="">
                  {availableTargetClasses.length === 0
                    ? t('classes.noTargetClassInGrade', '-- Không có lớp trong khối này --')
                    : t('classes.chooseTargetClassPlaceholder', '-- Chọn lớp tiếp nhận --')}
                </option>
                {availableTargetClasses.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} - {cls.gradeLabel} {cls.room ? (cls.room.startsWith('Phòng') || cls.room.startsWith('Room') ? `(${cls.room})` : `(${t('classes.roomPrefix', 'Phòng')} ${cls.room})`) : ''} · {cls.studentCount || 0}/{cls.capacity || 40} {t('classes.studentsUnit', 'học sinh')}
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
                min={new Date().toISOString().split('T')[0]}
                value={transferDate}
                onChange={(e) => setTransferDate(e.target.value)}
                className="h-9 text-[13px] font-mono rounded-none border-border"
              />
            </div>
          </div>

          {/* Clean Divider */}
          <div className="border-t border-border" />

          {/* Section 2: Căn cứ & Lý do */}
          <div className="space-y-4">
            <div className="space-y-0.5">
              <h3 className="text-[13.5px] font-semibold text-foreground tracking-tight">
                {t('classes.transferReasonLabel', 'Lý do chuyển lớp')} <span className="text-destructive">*</span>
              </h3>
              <p className="text-[12px] text-muted-foreground font-normal">
                {t('classes.transferReasonSub', 'Căn cứ đề xuất để Ban Giám Hiệu xét duyệt')}
              </p>
            </div>

            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t(
                'classes.transferReasonPlaceholder',
                'Ví dụ: Chuyển theo nguyện vọng phụ huynh, thay đổi ca học, phù hợp lứa tuổi...',
              )}
              className="w-full p-2.5 text-[13px] bg-background border border-border rounded-none outline-none focus:border-primary placeholder:text-muted-foreground/60 resize-none text-foreground"
            />
          </div>
        </form>

        {/* Sticky Footer matching ClassDrawer standard */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border shrink-0 bg-card">
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
