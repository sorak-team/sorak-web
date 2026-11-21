import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import { Cancel01Icon, Delete02Icon } from '@hugeicons/core-free-icons';
import { toast } from 'sonner';
import { academicYearsApi } from '../academic-years.api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/shared/lib/utils';

export const GRADE_BLOCK_KEYS = [
  { id: 'NHA_TRE', nameKey: 'classes.grades.nhatre', defaultName: 'Khối Nhà trẻ', name: 'Khối Nhà trẻ', age: '18 - 36 tháng', classes: 3 },
  { id: 'MAM', nameKey: 'classes.grades.mam', defaultName: 'Khối Mầm', name: 'Khối Mầm', age: '3 - 4 tuổi', classes: 3 },
  { id: 'CHOI', nameKey: 'classes.grades.choi', defaultName: 'Khối Chồi', name: 'Khối Chồi', age: '4 - 5 tuổi', classes: 3 },
  { id: 'LA', nameKey: 'classes.grades.la', defaultName: 'Khối Lá', name: 'Khối Lá', age: '5 - 6 tuổi', classes: 3 },
];
export const GRADE_BLOCKS = GRADE_BLOCK_KEYS;

function getValidMakeupSaturdays(dateStr) {
  if (!dateStr) return { currentWeekSaturday: '', nextWeekSaturday: '' };
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return { currentWeekSaturday: '', nextWeekSaturday: '' };
  const day = d.getDay(); // 0: CN, 1: T2, ..., 6: T7
  const daysUntilSaturday = day === 0 ? -1 : 6 - day;

  const currentSat = new Date(d);
  currentSat.setDate(d.getDate() + daysUntilSaturday);

  const nextSat = new Date(currentSat);
  nextSat.setDate(currentSat.getDate() + 7);

  const toIso = (dt) => {
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const dayOfMonth = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${dayOfMonth}`;
  };

  return {
    currentWeekSaturday: toIso(currentSat),
    nextWeekSaturday: toIso(nextSat),
  };
}

function formatDateDMY(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

export function HolidayEditDrawer({
  isOpen,
  onClose,
  schoolYearId,
  schoolYearName,
  schoolYearStartDate,
  schoolYearEndDate,
  selectedDate,
  holidayToEdit,
  onSuccess,
}) {
  const { t } = useTranslation();
  const isEditing = Boolean(holidayToEdit && holidayToEdit.id);
  const [isHoliday, setIsHoliday] = useState(true); // true: Ngày nghỉ (isTeachingAllowed=false), false: Sự kiện (isTeachingAllowed=true)
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [scopeType, setScopeType] = useState('ALL'); // 'ALL' | 'GRADE'
  const [selectedGrades, setSelectedGrades] = useState([]);
  const [description, setDescription] = useState('');
  const [blockTeaching, setBlockTeaching] = useState(true);
  const [enableMakeupDay, setEnableMakeupDay] = useState(false);
  const [makeupDate, setMakeupDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const gradeBlocks = useMemo(() => GRADE_BLOCK_KEYS.map((b) => ({
    ...b,
    name: t(b.nameKey, b.defaultName),
  })), [t]);

  const { todayIso, tomorrowIso, isSemesterStarted } = useMemo(() => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const tIso = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const tm = new Date(now);
    tm.setDate(tm.getDate() + 1);
    const tmIso = `${tm.getFullYear()}-${pad(tm.getMonth() + 1)}-${pad(tm.getDate())}`;
    const isStarted = Boolean(schoolYearStartDate && tIso >= schoolYearStartDate);
    return { todayIso: tIso, tomorrowIso: tmIso, isSemesterStarted: isStarted };
  }, [schoolYearStartDate]);

  const minAllowedDate = useMemo(() => {
    return schoolYearStartDate || undefined;
  }, [schoolYearStartDate]);

  useEffect(() => {
    if (holidayToEdit) {
      setName(holidayToEdit.name || '');
      setStartDate(holidayToEdit.startDate || '');
      setEndDate(holidayToEdit.endDate || holidayToEdit.startDate || '');
      const isEvt = holidayToEdit.type === 'EVENT' || (holidayToEdit.description || '').includes('[SỰ KIỆN]');
      setIsHoliday(!isEvt);
      setBlockTeaching(!holidayToEdit.isTeachingAllowed);

      // Parse scope
      const existingDesc = holidayToEdit.description || '';
      if (Array.isArray(holidayToEdit.targetGrades) && holidayToEdit.targetGrades.length > 0) {
        setScopeType('GRADE');
        setSelectedGrades(holidayToEdit.targetGrades);
      } else {
        const matchedGrades = [];
        gradeBlocks.forEach((b) => {
          if (
            (b.name && existingDesc.includes(b.name)) ||
            (b.defaultName && existingDesc.includes(b.defaultName)) ||
            (holidayToEdit.scope && (
              (b.name && holidayToEdit.scope.includes(b.name)) ||
              (b.defaultName && holidayToEdit.scope.includes(b.defaultName))
            ))
          ) {
            matchedGrades.push(b.id);
          }
        });

        if (matchedGrades.length > 0) {
          setScopeType('GRADE');
          setSelectedGrades(matchedGrades);
        } else {
          setScopeType('ALL');
          setSelectedGrades([]);
        }
      }

      // Clean up description if it starts with [Khối ...] or [SỰ KIỆN]
      const cleanedDesc = existingDesc
        .replace(/^\[.*?\]\s*/, '')
        .replace(/\[SỰ KIỆN\]\s*/g, '')
        .replace(/\[EVENT\]\s*/g, '')
        .trim();
      setDescription(cleanedDesc);
      if (holidayToEdit.makeupDate) {
        setEnableMakeupDay(true);
        setMakeupDate(holidayToEdit.makeupDate);
      } else {
        setEnableMakeupDay(false);
        setMakeupDate('');
      }
      setIsDeleteModalOpen(false);
    } else if (selectedDate) {
      const dateStr =
        selectedDate instanceof Date
          ? selectedDate.toISOString().split('T')[0]
          : selectedDate;
      setStartDate(dateStr);
      setEndDate(dateStr);
      setName('');
      setDescription('');
      setIsHoliday(true);
      setBlockTeaching(true);
      setScopeType('ALL');
      setSelectedGrades([]);
      setEnableMakeupDay(false);
      setMakeupDate('');
      setIsDeleteModalOpen(false);
    }
  }, [holidayToEdit, selectedDate, isOpen, isSemesterStarted, tomorrowIso, gradeBlocks]);

  const isSingleDay = Boolean(startDate && endDate && startDate === endDate);
  const canHaveMakeup = isSingleDay;
  const { currentWeekSaturday, nextWeekSaturday } = getValidMakeupSaturdays(startDate);

  useEffect(() => {
    if (enableMakeupDay && canHaveMakeup) {
      if (!makeupDate || (makeupDate !== currentWeekSaturday && makeupDate !== nextWeekSaturday)) {
        setMakeupDate(currentWeekSaturday);
      }
    }
  }, [startDate, enableMakeupDay, canHaveMakeup, currentWeekSaturday, nextWeekSaturday, makeupDate]);

  if (!isOpen) return null;

  // Calculate day difference
  let totalDays = 1;
  if (startDate && endDate) {
    const s = new Date(startDate);
    const e = new Date(endDate);
    const diff = Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1;
    if (diff > 0) totalDays = diff;
  }

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!name.trim()) {
      toast.error(t('holidayEdit.validationRequiredName', 'Vui lòng nhập tên ngày nghỉ hoặc sự kiện.'));
      return;
    }
    if (!startDate || !endDate) {
      toast.error(t('holidayEdit.validationRequiredDates', 'Vui lòng chọn ngày bắt đầu và kết thúc.'));
      return;
    }
    if (new Date(endDate) < new Date(startDate)) {
      toast.error(t('holidayEdit.validationDateOrder', 'Ngày kết thúc không được trước ngày bắt đầu.'));
      return;
    }

    if (isHoliday && isSemesterStarted && !isEditing && startDate < tomorrowIso) {
      toast.error(
        t('holidayEdit.validationMinTomorrow', 'Năm học đã bắt đầu. Ban Giám Hiệu chỉ có thể tạo ngày nghỉ từ ngày mai ({{date}}) trở đi.', {
          date: formatDateDMY(tomorrowIso),
        }),
      );
      return;
    }

    if (schoolYearStartDate && schoolYearEndDate) {
      if (startDate < schoolYearStartDate || endDate > schoolYearEndDate) {
        const fmt = (dStr) => {
          if (!dStr) return '';
          const [y, m, d] = dStr.split('-');
          return `${d}/${m}/${y}`;
        };
        toast.error(
          t('holidayEdit.validationWithinSchoolYear', 'Thời gian phải nằm trong khung thời gian của năm học {{name}} ({{start}} - {{end}}).', {
            name: schoolYearName || '',
            start: fmt(schoolYearStartDate),
            end: fmt(schoolYearEndDate),
          }),
        );
        return;
      }
    }

    let scopeLabel = t('holidayEdit.allSchoolOption', 'Toàn trường');
    const isSpecificScope = selectedGrades.length > 0;
    if (isSpecificScope) {
      scopeLabel = selectedGrades
        .map((id) => gradeBlocks.find((b) => b.id === id)?.name)
        .filter(Boolean)
        .join(', ');
    }

    let finalDesc = description.trim();
    if (isSpecificScope) {
      finalDesc = `[${scopeLabel}] ${finalDesc}`.trim();
    }

    const payload = {
      name: name.trim(),
      startDate,
      endDate,
      type: isHoliday ? 'HOLIDAY' : 'EVENT',
      isTeachingAllowed: (canHaveMakeup && enableMakeupDay) ? false : !blockTeaching,
      targetGrades: isSpecificScope ? selectedGrades : [],
      description: finalDesc || (isHoliday ? `Nghỉ ${scopeLabel.toLowerCase()}` : `Sự kiện ${scopeLabel.toLowerCase()}`),
      scope: scopeLabel,
      makeupDate: canHaveMakeup && enableMakeupDay && makeupDate ? makeupDate : null,
      copyActivities: Boolean(canHaveMakeup && enableMakeupDay),
    };

    try {
      setIsSubmitting(true);
      if (isEditing) {
        await academicYearsApi.updateHoliday(schoolYearId, holidayToEdit.id, payload);
        toast.success(t('holidayEdit.updateSuccess', 'Đã cập nhật lịch năm học thành công!'));
      } else {
        await academicYearsApi.createHoliday(schoolYearId, payload);
        toast.success(t('holidayEdit.createSuccess', 'Đã thêm ngày nghỉ / sự kiện mới thành công!'));
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(isEditing ? t('holidayEdit.updateFailed', 'Cập nhật thất bại') : t('holidayEdit.createFailed', 'Thêm mới thất bại'), {
        description: err.response?.data?.message || err.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!isEditing) return;
    try {
      setIsDeleting(true);
      await academicYearsApi.deleteHoliday(schoolYearId, holidayToEdit.id);
      toast.success(t('holidayEdit.deleteSuccess', 'Đã xóa ngày nghỉ / sự kiện thành công!'));
      setIsDeleteModalOpen(false);
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(t('holidayEdit.deleteFailed', 'Xóa thất bại'), {
        description: err.response?.data?.message || err.message,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex justify-end">
        {/* Backdrop matching ClassDrawer / TeacherDrawer */}
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in-0 duration-200"
        />

        {/* Drawer Panel matching Admin Standards (max-w-[500px]) */}
        <div
          className={cn(
            'relative w-full max-w-[500px] h-full bg-card border-l border-border shadow-2xl flex flex-col',
            'animate-in slide-in-from-right duration-250 ease-out z-10 text-foreground select-none',
          )}
          data-name="Holiday Edit Drawer"
        >
          {/* Header */}
          <div className="flex items-start justify-between px-6 pt-6 pb-5 border-b border-border shrink-0">
            <div className="flex flex-col gap-1.5">
              <h2 className="text-[18px] font-semibold text-foreground tracking-tight">
                {isEditing ? t('holidayEdit.editTitle', 'Chỉnh sửa ngày nghỉ / sự kiện') : t('holidayEdit.addTitle', 'Thêm ngày nghỉ / sự kiện')}
              </h2>
              <p className="text-[12.5px] text-muted-foreground font-normal">
                {isEditing
                  ? t('holidayEdit.editSub', 'Cập nhật thời gian và phạm vi áp dụng')
                  : t('holidayEdit.addSub', 'Khai báo ngày nghỉ hoặc sự kiện mới cho năm học')}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="size-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-none transition-colors cursor-pointer"
            >
              <HugeiconsIcon icon={Cancel01Icon} size={16} />
            </button>
          </div>

          {/* Clean Form Body: Airy spacing, generous padding */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-6">
            {/* Field 1: Phân loại */}
            <div className="flex flex-col gap-2">
              <Label className="text-[13px] font-medium text-foreground">
                {t('holidayEdit.classification', 'Phân loại')} <span className="text-destructive">*</span>
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsHoliday(true);
                    setBlockTeaching(true);
                    if (isSemesterStarted && !isEditing && tomorrowIso) {
                      if (startDate && startDate < tomorrowIso) setStartDate(tomorrowIso);
                      if (endDate && endDate < tomorrowIso) setEndDate(tomorrowIso);
                    }
                  }}
                  className={cn(
                    'h-10 px-4 text-[13.5px] font-medium border rounded-none transition-colors flex items-center justify-center cursor-pointer',
                    isHoliday
                      ? 'border-primary bg-primary/10 text-primary font-semibold'
                      : 'border-border bg-background text-muted-foreground hover:text-foreground',
                  )}
                >
                  {t('holidayEdit.holidayOption', 'Ngày nghỉ')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsHoliday(false);
                    setBlockTeaching(false);
                  }}
                  className={cn(
                    'h-10 px-4 text-[13.5px] font-medium border rounded-none transition-colors flex items-center justify-center cursor-pointer',
                    !isHoliday
                      ? 'border-primary bg-primary/10 text-primary font-semibold'
                      : 'border-border bg-background text-muted-foreground hover:text-foreground',
                  )}
                >
                  {t('holidayEdit.eventOption', 'Sự kiện')}
                </button>
              </div>
            </div>

            {/* Field 2: Tên ngày nghỉ / sự kiện */}
            <div className="flex flex-col gap-2">
              <Label className="text-[13px] font-medium text-foreground">
                {isHoliday ? t('holidayEdit.holidayNameLabel', 'Tên ngày nghỉ') : t('holidayEdit.eventNameLabel', 'Tên sự kiện')}{' '}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={
                  isHoliday
                    ? t('holidayEdit.holidayNamePlaceholder', 'VD: Nghỉ Tết Nguyên Đán, Nghỉ Lễ 30/4...')
                    : t('holidayEdit.eventNamePlaceholder', 'VD: Khai giảng năm học mới, Hội thao...')
                }
                className="h-10 px-3.5 text-[13.5px] rounded-none border-border"
              />
            </div>

            {/* Field 3: Thời gian áp dụng */}
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-3.5">
                <div className="flex flex-col gap-2">
                  <Label className="text-[13px] font-medium text-foreground">
                    {t('holidayEdit.fromDate', 'Từ ngày')} <span className="text-destructive">*</span>
                  </Label>
                  <input
                    type="date"
                    required
                    min={minAllowedDate}
                    max={schoolYearEndDate || undefined}
                    value={startDate}
                    onChange={(e) => {
                      const newStart = e.target.value;
                      setStartDate(newStart);
                      if (endDate && newStart > endDate) {
                        setEndDate(newStart);
                      }
                    }}
                    className="h-10 w-full border border-border px-3.5 text-[13.5px] rounded-none bg-background text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label className="text-[13px] font-medium text-foreground">
                    {t('holidayEdit.toDate', 'Đến ngày')} <span className="text-destructive">*</span>
                  </Label>
                  <input
                    type="date"
                    required
                    min={startDate || minAllowedDate}
                    max={schoolYearEndDate || undefined}
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-10 w-full border border-border px-3.5 text-[13.5px] rounded-none bg-background text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
              {isHoliday && isSemesterStarted && !isEditing && (
                <p className="text-[11.5px] text-amber-600 dark:text-amber-400 font-normal">
                  {t('holidayEdit.minDateNotice', 'Lưu ý: Năm học đang diễn ra, chỉ có thể tạo ngày nghỉ từ ngày mai trở đi (từ {{date}}).', {
                    date: formatDateDMY(minAllowedDate),
                  })}
                </p>
              )}
              {startDate && endDate && (
                <p className="text-[12px] text-muted-foreground pt-0.5">
                  {t('holidayEdit.durationLabel', 'Thời lượng:')} <span className="font-semibold text-foreground">{t('holidayEdit.daysUnit', '{{count}} ngày', { count: totalDays })}</span>
                </p>
              )}
            </div>

            {/* Field 4: Phạm vi áp dụng (List các khối ra bên ngoài luôn) */}
            <div className="flex flex-col gap-2.5">
              <Label className="text-[13px] font-medium text-foreground">
                {t('holidayEdit.applicableScope', 'Phạm vi áp dụng')}
              </Label>

              {/* Direct List: Toàn trường on top + 4 Grade blocks below */}
              <div className="flex flex-col gap-2.5">
                {/* Toàn trường option */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedGrades([]);
                    setScopeType('ALL');
                  }}
                  className={cn(
                    'h-10 px-4 text-[13.5px] font-medium border rounded-none flex items-center justify-between cursor-pointer transition-colors',
                    selectedGrades.length === 0
                      ? 'border-primary bg-primary/10 text-primary font-semibold'
                      : 'border-border bg-background text-muted-foreground hover:text-foreground',
                  )}
                >
                  <span>{t('holidayEdit.allSchoolOption', 'Toàn trường')}</span>
                  {selectedGrades.length === 0 && (
                    <span className="text-[13.5px] font-bold">✓</span>
                  )}
                </button>

                {/* 4 Grade Blocks listed directly */}
                <div className="grid grid-cols-2 gap-2.5">
                  {gradeBlocks.map((grade) => {
                    const isSelected = selectedGrades.includes(grade.id);
                    return (
                      <button
                        key={grade.id}
                        type="button"
                        onClick={() => {
                          let next;
                          if (isSelected) {
                            next = selectedGrades.filter((g) => g !== grade.id);
                          } else {
                            next = [...selectedGrades, grade.id];
                          }
                          setSelectedGrades(next);
                          setScopeType(next.length > 0 ? 'GRADE' : 'ALL');
                        }}
                        className={cn(
                          'h-10 px-3.5 border rounded-none cursor-pointer flex items-center justify-between text-[13px] transition-colors',
                          isSelected
                            ? 'border-primary bg-primary/10 text-primary font-semibold'
                            : 'border-border bg-background text-muted-foreground hover:text-foreground',
                        )}
                      >
                        <span>{grade.name}</span>
                        {isSelected && <span className="text-[13.5px] font-bold">✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              <p className="text-[12px] text-muted-foreground pt-0.5">
                {selectedGrades.length === 0
                  ? t('holidayEdit.allGradesAppliedDesc', 'Áp dụng cho toàn thể các khối trong trường.')
                  : t('holidayEdit.selectedGradesDesc', 'Đã chọn: {{grades}}.', {
                    grades: selectedGrades
                      .map((id) => gradeBlocks.find((b) => b.id === id)?.name)
                      .join(', '),
                  })}
              </p>
            </div>

            {/* Field 5: Ghi chú */}
            <div className="flex flex-col gap-2">
              <Label className="text-[13px] font-medium text-foreground">
                {t('holidayEdit.notesOptional', 'Ghi chú (Tùy chọn)')}
              </Label>
              <Input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('holidayEdit.notesPlaceholder', 'VD: Nghỉ theo quy định chung của nhà trường...')}
                className="h-10 px-3.5 text-[13.5px] rounded-none border-border"
              />
            </div>

            {/* Tùy chọn xếp lịch & Dạy bù */}
            <div className="pt-3 border-t border-border/60 flex flex-col gap-4">
              <label
                className={cn(
                  'flex items-center gap-2.5 text-[13px] select-none',
                  enableMakeupDay
                    ? 'opacity-80 cursor-not-allowed text-muted-foreground'
                    : 'cursor-pointer text-muted-foreground hover:text-foreground',
                )}
              >
                <input
                  type="checkbox"
                  checked={blockTeaching || enableMakeupDay}
                  disabled={enableMakeupDay}
                  onChange={(e) => setBlockTeaching(e.target.checked)}
                  className="rounded-none border-border text-primary size-4 cursor-pointer disabled:cursor-not-allowed"
                />
                <span>{t('holidayEdit.lockTeachingCheckbox', 'Khóa / Chặn xếp lịch dạy vào các ngày này')}</span>
              </label>

              {canHaveMakeup && (
                <div className="flex flex-col gap-3">
                  <label className="flex items-center gap-2.5 cursor-pointer text-[13px] text-foreground font-medium select-none">
                    <input
                      type="checkbox"
                      checked={enableMakeupDay}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setEnableMakeupDay(checked);
                        if (checked) {
                          setBlockTeaching(true);
                          if (!makeupDate) {
                            setMakeupDate(currentWeekSaturday);
                          }
                        }
                      }}
                      className="rounded-none border-border text-primary size-4 cursor-pointer"
                    />
                    <span>{t('holidayEdit.makeupClassCheckbox', 'Bố trí ngày dạy bù')}</span>
                  </label>

                  {enableMakeupDay && (
                    <div className="flex flex-col gap-3 pt-1">
                      <Label className="text-[12.5px] font-medium text-muted-foreground">
                        {t('holidayEdit.selectMakeupSaturday', 'Chọn ngày Thứ Bảy dạy bù:')}
                      </Label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setMakeupDate(currentWeekSaturday)}
                          className={cn(
                            'h-14 px-4 border rounded-none text-left cursor-pointer transition-colors flex flex-col justify-center gap-1',
                            makeupDate === currentWeekSaturday
                              ? 'border-primary bg-primary/10 text-primary font-semibold'
                              : 'border-border bg-background text-muted-foreground hover:text-foreground hover:border-foreground/30'
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[13px]">{t('holidayEdit.saturdayThisWeek', 'Thứ 7 tuần này')}</span>
                            {makeupDate === currentWeekSaturday && (
                              <span className="text-[13px] font-bold text-primary">✓</span>
                            )}
                          </div>
                          <span className="text-[12px] font-mono opacity-80">
                            {formatDateDMY(currentWeekSaturday)}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setMakeupDate(nextWeekSaturday)}
                          className={cn(
                            'h-14 px-4 border rounded-none text-left cursor-pointer transition-colors flex flex-col justify-center gap-1',
                            makeupDate === nextWeekSaturday
                              ? 'border-primary bg-primary/10 text-primary font-semibold'
                              : 'border-border bg-background text-muted-foreground hover:text-foreground hover:border-foreground/30'
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[13px]">{t('holidayEdit.saturdayNextWeek', 'Thứ 7 tuần sau')}</span>
                            {makeupDate === nextWeekSaturday && (
                              <span className="text-[13px] font-bold text-primary">✓</span>
                            )}
                          </div>
                          <span className="text-[12px] font-mono opacity-80">
                            {formatDateDMY(nextWeekSaturday)}
                          </span>
                        </button>
                      </div>

                      <p className="text-[12px] text-muted-foreground pt-1 leading-relaxed">
                        {t('holidayEdit.makeupNotice', 'Lưu ý: Hệ thống sẽ tự động sao chép toàn bộ kế hoạch hoạt động giáo dục của {{type}} {{date}} sang ngày dạy bù này.', {
                          type: isHoliday ? t('holidayEdit.holidayLower', 'ngày nghỉ') : t('holidayEdit.eventLower', 'ngày sự kiện'),
                          date: formatDateDMY(startDate),
                        })}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </form>

          {/* Sticky Footer matching Admin Standard with generous padding */}
          <div className="h-16 px-6 border-t border-border flex items-center justify-between bg-card shrink-0">
            <div>
              {isEditing && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="h-9 px-4 text-[13.5px] rounded-none border-destructive/30 text-destructive hover:bg-destructive/10 cursor-pointer"
                >
                  <HugeiconsIcon icon={Delete02Icon} size={15} className="mr-1.5" />
                  {t('common.delete', 'Xóa')}
                </Button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting || isDeleting}
                className="h-9 px-6 text-[13.5px] rounded-none border-border cursor-pointer"
              >
                {t('common.cancel', 'Hủy')}
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || isDeleting}
                className="h-9 px-5 text-[13.5px] rounded-none bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer font-medium"
              >
                {isSubmitting ? t('common.saving', 'Đang lưu...') : isEditing ? t('holidayEdit.saveChanges', 'Lưu thay đổi') : t('holidayEdit.addScheduleBtn', 'Thêm vào lịch')}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Centered Delete Confirmation Dialog matching DeleteClassModal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent
          className="w-[92vw] max-w-[440px] p-6 rounded-none border border-border bg-card shadow-2xl text-foreground select-none"
          data-name="Dialog · Delete Holiday Confirm"
        >
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-[16px] font-semibold text-destructive">
              {t('holidayEdit.deleteConfirmTitle', 'Xác nhận xóa ngày nghỉ / sự kiện')}
            </DialogTitle>
            <DialogDescription className="text-[13px] text-muted-foreground leading-relaxed">
              {t('holidayEdit.deleteConfirmDesc', 'Bạn có chắc chắn muốn xóa "{{name}}" khỏi lịch năm học? Các slot giảng dạy bị khóa trước đó sẽ được mở lại.', {
                name,
              })}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-6 flex flex-row items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isDeleting}
              onClick={() => setIsDeleteModalOpen(false)}
              className="h-8 px-3.5 rounded-none text-[13px] cursor-pointer"
            >
              {t('common.cancel', 'Hủy')}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeleting}
              onClick={handleDelete}
              className="h-8 px-3.5 rounded-none text-[13px] font-medium cursor-pointer"
            >
              {isDeleting ? t('common.deleting', 'Đang xóa...') : t('holidayEdit.deletePermanent', 'Xóa vĩnh viễn')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default HolidayEditDrawer;
