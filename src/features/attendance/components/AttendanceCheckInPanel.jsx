import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { HugeiconsIcon } from '@hugeicons/react';
import { Search01Icon, Cancel01Icon, MoreHorizontalIcon } from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { confirmDialog } from '@/components/ui/confirm-dialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/shared/lib/utils';
import { attendanceApi } from '../attendance.api';

export function AttendanceCheckInPanel({
  classId,
  date,
  slot,
  initialStudents = [],
  isRecorded = false,
  readOnly = false,
  onClose,
  onSaveSuccess,
  onCleanSuccess,
  onTabChange,
  onStudentsChange,
  className,
  hideHeader = false,
}) {
  const { t, i18n } = useTranslation();
  const isVi = (i18n.language || 'vi').startsWith('vi');

  // Labels & titles according to language: Có · CP (Có phép) · KP (Không phép)
  const labelPresent = isVi ? 'Có' : 'P';
  const labelExcused = isVi ? 'CP' : 'EA';
  const labelUnexcused = isVi ? 'KP' : 'UA';

  const titlePresent = isVi ? 'Có mặt' : 'Present';
  const titleExcused = isVi ? 'Có phép' : 'Excused Absence';
  const titleUnexcused = isVi ? 'Không phép' : 'Unexcused Absence';

  const legendText = isVi
    ? 'Có — Có mặt · CP — Có phép · KP — Không phép'
    : 'P = Present · EA = Excused · UA = Unexcused';

  const [students, setStudents] = useState([]);
  const [initialSnapshot, setInitialSnapshot] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [hasRecordedLocally, setHasRecordedLocally] = useState(false);

  const isCurrentlyRecorded = isRecorded || hasRecordedLocally;

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase().trim();
    return students.filter(
      (s) =>
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.code && s.code.toLowerCase().includes(q))
    );
  }, [students, searchQuery]);

  const resolveSlotDate = (s, explicitDate) => {
    if (s?.fullDate) return s.fullDate;
    if (s?.date && s.date.includes('-')) return s.date;
    if (s?.date && s.date.includes('/')) {
      const parts = s.date.split('/');
      if (parts.length >= 2) {
        const year = parts[2] || '2026';
        return `${year}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
    if (explicitDate && explicitDate.includes('-')) return explicitDate;
    return explicitDate || new Date().toISOString().slice(0, 10);
  };

  const effectiveDate = useMemo(() => resolveSlotDate(slot, date), [slot, date]);

  useEffect(() => {
    setHasRecordedLocally(false);
  }, [effectiveDate, slot?.id, isRecorded]);

  // Load real recorded attendance for the exact date of this slot
  useEffect(() => {
    let isCancelled = false;
    async function loadSlotAttendance() {
      if (!classId || !effectiveDate) return;
      try {
        const res = await attendanceApi.getTimetableOverview(classId, { date: effectiveDate });
        if (!isCancelled && res?.students && res.students.length > 0) {
          const mapped = res.students.map((s) => {
            let st = s.status || s.rawStatus || 'PRESENT';
            if (st === 'ABSENT' || st === 'ABSENT_EXCUSED' || st === 'EXCUSED_ABSENCE') {
              st = 'EXCUSED_ABSENCE';
            } else if (st === 'ABSENT_UNEXCUSED' || st === 'UNEXCUSED_ABSENCE') {
              st = 'UNEXCUSED_ABSENCE';
            } else {
              st = 'PRESENT';
            }
            const isAbsent = st === 'EXCUSED_ABSENCE' || st === 'UNEXCUSED_ABSENCE';
            const attNote = s.attendanceNote !== undefined ? s.attendanceNote : (s.note || s.notes || s.reason || '');
            return {
              ...s,
              status: st,
              rawStatus: st,
              isAbsent,
              note: attNote,
              attendanceNote: attNote,
              healthNote: s.healthNote !== undefined ? s.healthNote : '',
            };
          });
          setStudents(mapped);
          setInitialSnapshot(JSON.stringify(mapped.map((s) => ({ id: s.id, status: s.status, note: s.attendanceNote || s.note || '' }))));
          if (res.isRecorded !== undefined) {
            setHasRecordedLocally(Boolean(res.isRecorded));
          }
          if (onStudentsChange) {
            onStudentsChange(mapped);
          }
        }
      } catch (err) {
        console.warn('Could not reload slot attendance:', err);
      }
    }
    loadSlotAttendance();
    return () => {
      isCancelled = true;
    };
  }, [classId, effectiveDate]);

  useEffect(() => {
    if (initialStudents && initialStudents.length > 0) {
      const mapped = initialStudents.map((s) => {
        let st = s.status || s.rawStatus || 'PRESENT';
        if (st === 'ABSENT' || st === 'ABSENT_EXCUSED' || st === 'EXCUSED_ABSENCE') {
          st = 'EXCUSED_ABSENCE';
        } else if (st === 'ABSENT_UNEXCUSED' || st === 'UNEXCUSED_ABSENCE') {
          st = 'UNEXCUSED_ABSENCE';
        } else {
          st = 'PRESENT';
        }
        const isAbsent = st === 'EXCUSED_ABSENCE' || st === 'UNEXCUSED_ABSENCE';
        const attNote = s.attendanceNote !== undefined ? s.attendanceNote : (s.note || s.notes || s.reason || '');
        return {
          ...s,
          status: st,
          rawStatus: st,
          isAbsent,
          note: attNote,
          attendanceNote: attNote,
          healthNote: s.healthNote !== undefined ? s.healthNote : '',
        };
      });
      setStudents(mapped);
      setInitialSnapshot(JSON.stringify(mapped.map((s) => ({ id: s.id, status: s.status, note: s.attendanceNote || s.note || '' }))));
    }
  }, [initialStudents]);

  // Future date check (Cho phép điểm danh ngày tương lai)
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const isFutureDate = false;
  const effectiveReadOnly = readOnly;

  // Kiểm tra xem giáo viên có thay đổi dữ liệu điểm danh so với ban đầu hay không
  const isDirty = useMemo(() => {
    if (!initialSnapshot || students.length === 0) return false;
    const current = JSON.stringify(students.map((s) => ({ id: s.id, status: s.status, note: s.note || '' })));
    return current !== initialSnapshot;
  }, [students, initialSnapshot]);

  // Điều kiện kích hoạt nút Lưu điểm danh (Mở nút lưu theo yêu cầu tester #24):
  const canSave = useMemo(() => {
    if (effectiveReadOnly || isSaving || isCleaning || students.length === 0) return false;
    return true;
  }, [effectiveReadOnly, isSaving, isCleaning, students.length]);

  const handleToggleStatus = (id, newStatus) => {
    if (effectiveReadOnly) return;
    setStudents((prev) => {
      const isAbsent = newStatus === 'EXCUSED_ABSENCE' || newStatus === 'UNEXCUSED_ABSENCE' || newStatus === 'ABSENT';
      const updated = prev.map((s) => (s.id === id ? { ...s, status: newStatus, rawStatus: newStatus, isAbsent } : s));
      if (onStudentsChange) onStudentsChange(updated);
      return updated;
    });
  };

  const handleNoteChange = (id, newNote) => {
    if (effectiveReadOnly) return;
    setStudents((prev) => {
      const updated = prev.map((s) => (s.id === id ? { ...s, note: newNote, attendanceNote: newNote } : s));
      if (onStudentsChange) onStudentsChange(updated);
      return updated;
    });
  };

  const presentCount = students.filter((s) => s.status === 'PRESENT').length;
  const excusedCount = students.filter((s) => s.status === 'EXCUSED_ABSENCE').length;
  const unexcusedCount = students.filter((s) => s.status === 'UNEXCUSED_ABSENCE').length;

  const handleSave = async () => {
    if (effectiveReadOnly || !canSave) return;
    setIsSaving(true);
    try {
      const targetClassId = classId || '5';
      const targetDate = effectiveDate;
      await attendanceApi.updateAttendance(targetClassId, {
        slotId: slot?.id,
        date: targetDate,
        records: students.map((s) => ({
          studentId: s.id,
          status: s.status,
          note: s.note || '',
          notes: s.note || '',
        })),
      });
      toast.success(t('attendance.saveSuccess', 'Lưu điểm danh thành công!'));
      setHasRecordedLocally(true);
      const updatedStudents = students.map((s) => ({
        ...s,
        status: s.status,
        rawStatus: s.status,
      }));
      setStudents(updatedStudents);
      setInitialSnapshot(JSON.stringify(updatedStudents.map((s) => ({ id: s.id, status: s.status, note: s.note || '' }))));
      if (onSaveSuccess) onSaveSuccess(updatedStudents);
    } catch {
      toast.error(t('attendance.saveError', 'Không thể lưu điểm danh. Vui lòng thử lại.'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleClean = async () => {
    if (readOnly) return;
    if (!isCurrentlyRecorded) {
      toast.warning(isVi ? 'Ngày này chưa có dữ liệu điểm danh để xóa.' : 'No attendance records to clean.');
      return;
    }
    const isConfirmed = await confirmDialog({
      title: isVi ? 'Xác nhận xóa điểm danh' : 'Clean attendance records',
      description: isVi
        ? 'Bạn có chắc chắn muốn xóa toàn bộ điểm danh của ngày này không? Thao tác này không thể hoàn tác.'
        : 'Are you sure you want to clean all attendance records for this day? This cannot be undone.',
      confirmText: isVi ? 'Xóa' : 'Clean',
      cancelText: isVi ? 'Hủy' : 'Cancel',
      variant: 'destructive',
    });
    if (!isConfirmed) {
      return;
    }
    setIsCleaning(true);
    try {
      const targetClassId = classId || '5';
      const targetDate = date || (slot?.date ? `2026-10-${slot.date.slice(0, 2)}` : '2026-10-13');
      await attendanceApi.clearAttendance(targetClassId, { date: targetDate });
      try {
        await attendanceApi.clearAllDismissals(targetClassId, { date: targetDate });
      } catch (e) {
        console.warn('Silent fallback for dismissal clear:', e);
      }

      const resetStudents = students.map((s) => ({
        ...s,
        status: 'PRESENT',
        note: '',
      }));
      setStudents(resetStudents);
      setInitialSnapshot(JSON.stringify(resetStudents.map((s) => ({ id: s.id, status: s.status, note: '' }))));
      setHasRecordedLocally(false);
      toast.success(isVi ? 'Đã xóa tất cả điểm danh của ngày này' : 'Attendance cleaned successfully');
      if (onCleanSuccess) {
        onCleanSuccess(resetStudents);
      } else if (onSaveSuccess) {
        onSaveSuccess(resetStudents, false);
      }
      if (onClose) onClose();
    } catch {
      toast.error(isVi ? 'Không thể xóa điểm danh' : 'Failed to clean attendance');
    } finally {
      setIsCleaning(false);
    }
  };

  const slotTitle = slot?.title || slot?.shortTitle || 'Nhận biết tập nói';
  const slotTime = `${slot?.startTime || '08:30'} – ${slot?.endTime || '09:15'}`;

  return (
    <div
      className={cn(
        hideHeader
          ? 'flex-1 flex flex-col justify-between min-h-0'
          : 'w-[520px] sm:w-[560px] border-l border-border bg-card flex flex-col justify-between shrink-0 select-none z-10',
        className
      )}
      data-node-id="4914:12004"
      data-name="AttendanceCheckInPanel"
    >
      {/* 1. Panel Header (only when not embedded in Drawer) */}
      {!hideHeader && (
        <div className="p-4 border-b border-border bg-card flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h2 className="text-[17px] font-semibold text-foreground tracking-tight">
                {t('attendance.checkInTitle', 'Điểm danh học sinh')}
              </h2>
              {(() => {
                const now = new Date();
                const padTwo = (n) => String(n).padStart(2, '0');
                const todayIso = `${now.getFullYear()}-${padTwo(now.getMonth() + 1)}-${padTwo(now.getDate())}`;
                const isDateToday = Boolean(date && date === todayIso);
                return (
                  <>
                    {isDateToday && (
                      <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-semibold bg-blue-500/10 text-[#1447e6] dark:text-blue-400 border border-blue-500/20">
                        {t('daily.badgeToday', 'Hôm nay')}
                      </span>
                    )}
                    {date && (
                      <span className="inline-flex items-center px-1.5 py-0.5 text-[11px] font-medium bg-muted/80 text-foreground border border-border/80">
                        {date}
                      </span>
                    )}
                  </>
                );
              })()}
            </div>
            <p className="text-[12.5px] text-muted-foreground mt-0.5">
              {slotTitle} · {slotTime}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {!readOnly && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="size-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-none transition-colors cursor-pointer shrink-0"
                    title="Tùy chọn khác"
                  >
                    <HugeiconsIcon icon={MoreHorizontalIcon} size={16} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 rounded-none shadow-md">
                  <DropdownMenuItem
                    disabled={!isCurrentlyRecorded || isCleaning}
                    onClick={handleClean}
                    className="cursor-pointer text-[12.5px] py-2 px-3 text-foreground rounded-none disabled:opacity-35 disabled:cursor-not-allowed"
                  >
                    <span>{isVi ? 'Xoá toàn bộ điểm danh' : 'Delete attendance'}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="size-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-none transition-colors cursor-pointer shrink-0"
                title={t('common.close', 'Đóng (Esc)')}
              >
                <HugeiconsIcon icon={Cancel01Icon} size={16} />
              </button>
            )}
          </div>
        </div>
      )}


      {/* 2. Students List Table */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {/* Chú thích viết tắt & Tìm kiếm mini ở phía trên */}
        <div className="flex items-center justify-between gap-3 text-[12px] text-muted-foreground select-none pb-2.5 mb-2.5 border-b border-border/60">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="font-medium text-foreground">{isVi ? 'Chú thích:' : 'Note:'}</span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-flex items-center justify-center h-5 px-1.5 font-bold text-[11px] bg-blue-100 dark:bg-blue-950/60 text-[#1447e6] border border-blue-200 dark:border-blue-800/50">
                {labelPresent}
              </span>
              <span className="text-foreground/80">{titlePresent}</span>
            </span>
            <span className="text-border">·</span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-flex items-center justify-center h-5 px-1.5 font-bold text-[11px] bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50">
                {labelExcused}
              </span>
              <span className="text-foreground/80">{titleExcused}</span>
            </span>
            <span className="text-border">·</span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-flex items-center justify-center h-5 px-1.5 font-bold text-[11px] bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50">
                {labelUnexcused}
              </span>
              <span className="text-foreground/80">{titleUnexcused}</span>
            </span>
          </div>

          {/* Ô tìm kiếm học sinh mini chuẩn Sorak */}
          <div className="relative w-[180px] sm:w-[200px] h-8 shrink-0">
            <HugeiconsIcon
              icon={Search01Icon}
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isVi ? 'Tìm học sinh...' : 'Search student...'}
              className="h-8 pl-8 pr-7 text-[12px] bg-background border-border rounded-none shadow-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                title={isVi ? 'Xóa tìm kiếm' : 'Clear search'}
              >
                <HugeiconsIcon icon={Cancel01Icon} size={12} />
              </button>
            )}
          </div>
        </div>

        <table className="w-full text-[12.5px] border-collapse">
          <thead>
            <tr className="border-b border-border/60 text-muted-foreground text-[11.5px] whitespace-nowrap">
              <th className="text-left font-medium pb-2 whitespace-nowrap w-[170px] min-w-[160px]">{t('attendance.studentCol', 'Học sinh')}</th>
              <th className="w-[140px] min-w-[140px] text-center font-medium pb-2 whitespace-nowrap">{t('attendance.statusCol', 'Trạng thái')}</th>
              <th className="text-left font-medium pb-2 pl-3 whitespace-nowrap min-w-[140px]">{t('attendance.notes', 'Ghi chú')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {filteredStudents.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-8 text-center text-[12.5px] text-muted-foreground">
                  {searchQuery.trim()
                    ? (isVi ? 'Không tìm thấy học sinh phù hợp' : 'No matching student found')
                    : (isVi ? 'Lớp này chưa có học sinh nào' : 'No students enrolled in this class')}
                </td>
              </tr>
            ) : (
              filteredStudents.map((st) => {
                const isP = st.status === 'PRESENT';
                const isExcused = st.status === 'EXCUSED_ABSENCE';
                const isUnexcused = st.status === 'UNEXCUSED_ABSENCE';

                return (
                  <tr key={st.id} className="h-12 hover:bg-muted/30 transition-colors">
                    {/* Student profile */}
                    <td className="py-1.5 pr-2 w-[170px] min-w-[160px]">
                      <div className="flex items-center gap-2">
                        <img
                          src={`https://api.dicebear.com/10.x/critters/svg?seed=${encodeURIComponent(st.code)}&backgroundColor=ff2e63,00c2a8,ffb300,3d5afe,8e24aa,00e676`}
                          alt={st.name}
                          className="size-7 rounded-none border border-border/80 object-cover shrink-0"
                        />
                        <div className="flex flex-col min-w-0">
                          <span className="font-medium text-foreground text-[12px] truncate max-w-[140px]">
                            {st.name}
                          </span>
                          <span className="text-[10.5px] text-muted-foreground font-mono">
                            {st.code}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* 3-segment Toggle: [ Có ] [ CP ] [ KP ] - Rộng rãi, không bị co ép */}
                    <td className="w-[140px] min-w-[140px] text-center py-1.5 px-2 whitespace-nowrap">
                      {st.isTransferred ? (
                        <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium bg-muted text-muted-foreground border border-border">
                          Đã chuyển lớp
                        </span>
                      ) : (
                        <div className="inline-flex items-center border border-border bg-background rounded-none p-0.5 shadow-2xs shrink-0">
                          {/* Có mặt / Present */}
                          <button
                            type="button"
                            disabled={effectiveReadOnly || st.isTransferred}
                            onClick={() => handleToggleStatus(st.id, 'PRESENT')}
                            title={titlePresent}
                            className={cn(
                              'w-9 h-7 shrink-0 text-[11.5px] font-medium transition-colors rounded-none whitespace-nowrap flex items-center justify-center',
                              effectiveReadOnly || st.isTransferred ? 'cursor-default' : 'cursor-pointer',
                              isP
                                ? 'bg-[#1447e6] text-white shadow-2xs font-semibold'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                            )}
                          >
                            {labelPresent}
                          </button>

                          {/* Có phép / Excused */}
                          <button
                            type="button"
                            disabled={effectiveReadOnly || st.isTransferred}
                            onClick={() => handleToggleStatus(st.id, 'EXCUSED_ABSENCE')}
                            title={titleExcused}
                            className={cn(
                              'w-9 h-7 shrink-0 text-[11.5px] font-medium transition-colors rounded-none border-x border-border/60 whitespace-nowrap flex items-center justify-center',
                              effectiveReadOnly || st.isTransferred ? 'cursor-default' : 'cursor-pointer',
                              isExcused
                                ? 'bg-amber-500 text-white shadow-2xs font-semibold'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                            )}
                          >
                            {labelExcused}
                          </button>

                          {/* Không phép / Unexcused */}
                          <button
                            type="button"
                            disabled={effectiveReadOnly || st.isTransferred}
                            onClick={() => handleToggleStatus(st.id, 'UNEXCUSED_ABSENCE')}
                            title={titleUnexcused}
                            className={cn(
                              'w-9 h-7 shrink-0 text-[11.5px] font-medium transition-colors rounded-none whitespace-nowrap flex items-center justify-center',
                              effectiveReadOnly || st.isTransferred ? 'cursor-default' : 'cursor-pointer',
                              isUnexcused
                                ? 'bg-rose-600 text-white shadow-2xs font-semibold'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                            )}
                          >
                            {labelUnexcused}
                          </button>
                        </div>
                      )}
                    </td>

                    {/* Ghi chú: đồng bộ chuẩn design của Sức khoẻ và Đánh giá */}
                    <td className="py-1 pl-3 min-w-[140px]">
                      <input
                        type="text"
                        disabled={effectiveReadOnly || st.isTransferred}
                        value={st.isTransferred ? 'Đã chuyển sang lớp khác (chỉ xem)' : (st.note || '')}
                        onChange={(e) => handleNoteChange(st.id, e.target.value)}
                        placeholder={
                          isExcused || isUnexcused
                            ? (isVi ? 'Lý do vắng...' : 'Absence reason...')
                            : (isVi ? 'Ghi chú điểm danh...' : 'Attendance note...')
                        }
                        className={cn(
                          "w-full h-7 px-2.5 text-[11.5px] border border-border bg-background text-foreground rounded-none focus:outline-hidden focus:border-[#1447e6]",
                          (effectiveReadOnly || st.isTransferred) && "opacity-70 cursor-default bg-muted/30 italic text-muted-foreground"
                        )}
                      />
                    </td>
                  </tr>
                );
              }))}
          </tbody>
        </table>
      </div>

      {/* 3. Sticky Bottom Action Bar */}
      <div className="p-4 border-t border-border bg-card flex items-center justify-between gap-2.5 shrink-0">
        <div className="flex items-center gap-3">
          {isCurrentlyRecorded ? (
            <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-emerald-600 dark:text-emerald-400 select-none">
              <span className="size-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span>{isVi ? 'Đã điểm danh' : 'Recorded'}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground select-none">
              <span className="size-1.5 rounded-full bg-muted-foreground/60 shrink-0" />
              <span>{isVi ? 'Chưa điểm danh' : 'Not recorded'}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {effectiveReadOnly ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="rounded-none h-9 text-[13px] px-4 cursor-pointer"
              >
                {t('common.close', 'Đóng')}
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="rounded-none h-9 text-[13px] px-4 cursor-pointer"
              >
                {t('common.cancel', 'Huỷ')}
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={!canSave}
                className={cn(
                  'rounded-none h-9 text-[13px] px-5 font-medium transition-colors shadow-none',
                  canSave
                    ? 'bg-[#1447e6] hover:bg-[#123ec4] text-white cursor-pointer'
                    : 'bg-muted/80 text-muted-foreground border border-border/80 cursor-not-allowed opacity-60'
                )}
                title={
                  isCurrentlyRecorded && !isDirty
                    ? (isVi ? 'Chưa có thay đổi nào để lưu' : 'No changes to save')
                    : undefined
                }
              >
                {isSaving ? t('common.saving', 'Đang lưu...') : t('attendance.saveAttendance', 'Lưu điểm danh')}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default AttendanceCheckInPanel;