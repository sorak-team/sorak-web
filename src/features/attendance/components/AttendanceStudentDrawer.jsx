import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Cancel01Icon,
  CheckmarkCircle01Icon,
  UserCheck01Icon,
  AlertCircleIcon,
} from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { cn } from '@/shared/lib/utils';
import { toast } from 'sonner';

export function AttendanceStudentDrawer({
  isOpen,
  onClose,
  slot,
  initialStudents = [],
  onSave,
}) {
  const { t } = useTranslation();
  const [students, setStudents] = useState([]);

  useEffect(() => {
    if (initialStudents && initialStudents.length > 0) {
      setStudents(JSON.parse(JSON.stringify(initialStudents)));
    }
  }, [initialStudents, isOpen]);

  if (!isOpen) return null;

  // Set all students to present
  const handleMarkAllPresent = () => {
    setStudents((prev) =>
      prev.map((s) => ({
        ...s,
        status: 'PRESENT',
        reason: '',
      })),
    );
    toast.success(t('attendance.markedAllPresent', 'Đã đánh dấu tất cả học sinh có mặt'));
  };

  const handleStatusChange = (studentId, nextStatus) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, status: nextStatus } : s)),
    );
  };

  const handleReasonChange = (studentId, reason) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, reason } : s)),
    );
  };

  const presentCount = students.filter((s) => s.status === 'PRESENT').length;
  const absentCount = students.length - presentCount;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSave) onSave(students);
    toast.success(
      t('attendance.savedAttendanceCount', 'Đã lưu điểm danh: {{present}}/{{total}} có mặt', {
        present: presentCount,
        total: students.length,
      })
    );
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-[1px] animate-in fade-in-0 duration-200"
      onClick={onClose}
      data-name="Attendance Student Drawer"
    >
      <div
        className="w-full max-w-[560px] h-full bg-card border-l border-border shadow-2xl flex flex-col justify-between text-foreground select-none overflow-hidden animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border bg-card">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-[17px] font-semibold text-foreground tracking-tight">
              {t('attendance.studentAttendanceDrawerTitle', 'Điểm danh học sinh')}
            </h2>
            <p className="text-[12px] text-muted-foreground">
              {slot?.title || 'Đón trẻ & thể dục sáng'} · {slot?.dayLabel || 'Thứ 2, 05/10/2026'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="size-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-none transition-colors"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={16} />
          </button>
        </div>

        {/* Quick Toolbar & Summary Metrics */}
        <div className="px-5 py-3 border-b border-border bg-muted/20 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-[12.5px]">
            <span className="font-medium text-foreground">
              {t('attendance.classSize', 'Sĩ số')}: <strong>{students.length}</strong>
            </span>
            <span className="text-border">·</span>
            <span className="font-medium text-emerald-600 dark:text-emerald-400">
              {t('attendance.present', 'Có mặt')}: <strong>{presentCount}</strong>
            </span>
            <span className="text-border">·</span>
            <span className="font-medium text-amber-600 dark:text-amber-400">
              {t('attendance.absent', 'Vắng')}: <strong>{absentCount}</strong>
            </span>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleMarkAllPresent}
            className="h-7 px-2.5 border border-border text-[12px] rounded-none hover:bg-muted shadow-none flex items-center gap-1 cursor-pointer"
          >
            <HugeiconsIcon icon={UserCheck01Icon} size={13} />
            <span>{t('attendance.allPresent', 'Tất cả có mặt')}</span>
          </Button>
        </div>

        {/* Students Table / List */}
        <div className="flex-1 overflow-y-auto divide-y divide-border/60">
          {students.map((st, idx) => {
            const isPresent = st.status === 'PRESENT';
            const isExcused = st.status === 'EXCUSED_ABSENCE' || st.status === 'ABSENT_EXCUSED';
            const isUnexcused = st.status === 'UNEXCUSED_ABSENCE' || st.status === 'ABSENT_UNEXCUSED';

            return (
              <div
                key={st.id || idx}
                className="p-3.5 flex flex-col gap-2 hover:bg-muted/10 transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  {/* Student Info */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-[12px] text-muted-foreground font-mono w-5">
                      {idx + 1}
                    </span>
                    <img
                      src={`https://api.dicebear.com/7.x/bottts/svg?seed=${st.code}`}
                      alt={st.name}
                      className="size-7 rounded-none bg-muted border border-border/80 shrink-0"
                    />
                    <div className="flex flex-col min-w-0 leading-tight">
                      <span className="text-[13.5px] font-medium text-foreground truncate">
                        {st.name}
                      </span>
                      <span className="text-[11.5px] text-muted-foreground">
                        {st.code} · {st.gender}
                      </span>
                    </div>
                  </div>

                  {/* Status Toggle Buttons */}
                  <div className="flex items-center border border-border text-[12px] rounded-none overflow-hidden shrink-0">
                    <button
                      type="button"
                      onClick={() => handleStatusChange(st.id, 'PRESENT')}
                      className={cn(
                        'px-2.5 py-1 font-medium transition-colors cursor-pointer',
                        isPresent
                          ? 'bg-[#1447e6] text-white font-semibold'
                          : 'bg-background text-muted-foreground hover:bg-muted',
                      )}
                    >
                      {t('attendance.present', 'Có mặt')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStatusChange(st.id, 'EXCUSED_ABSENCE')}
                      className={cn(
                        'px-2.5 py-1 font-medium border-l border-border transition-colors cursor-pointer',
                        isExcused
                          ? 'bg-amber-500 text-white font-semibold'
                          : 'bg-background text-muted-foreground hover:bg-muted',
                      )}
                    >
                      {t('attendance.excused', 'Có phép')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStatusChange(st.id, 'UNEXCUSED_ABSENCE')}
                      className={cn(
                        'px-2.5 py-1 font-medium border-l border-border transition-colors cursor-pointer',
                        isUnexcused
                          ? 'bg-destructive text-destructive-foreground font-semibold'
                          : 'bg-background text-muted-foreground hover:bg-muted',
                      )}
                    >
                      {t('attendance.unexcused', 'Không phép')}
                    </button>
                  </div>
                </div>

                {/* Reason & Pickup metadata */}
                {!isPresent && (
                  <div className="pl-14 flex items-center gap-2">
                    <input
                      type="text"
                      value={st.reason || ''}
                      onChange={(e) => handleReasonChange(st.id, e.target.value)}
                      placeholder={t(
                        'attendance.absenceReasonPlaceholder',
                        'Nhập lý do vắng (sốt nhẹ, việc gia đình...)'
                      )}
                      className="w-full h-7 px-2.5 bg-background border border-border text-[12px] text-foreground rounded-none outline-none focus:border-primary"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-border bg-card flex items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="h-8 px-4 border border-border text-[13px] rounded-none hover:bg-muted shadow-none"
          >
            {t('common.cancel', 'Huỷ')}
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            className="h-8 px-5 bg-[#1447e6] hover:bg-[#1447e6]/90 text-white text-[13px] font-medium rounded-none shadow-none cursor-pointer flex items-center gap-1.5"
          >
            <HugeiconsIcon icon={CheckmarkCircle01Icon} size={14} />
            <span>{t('attendance.saveAttendance', 'Lưu điểm danh')}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
