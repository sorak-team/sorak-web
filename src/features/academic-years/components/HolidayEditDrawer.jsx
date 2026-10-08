import React, { useState, useEffect } from 'react';
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

const GRADE_BLOCKS = [
  { id: 'NHA_TRE', name: 'Khối Nhà trẻ', age: '18 - 36 tháng', classes: 3 },
  { id: 'MAM', name: 'Khối Mầm', age: '3 - 4 tuổi', classes: 3 },
  { id: 'CHOI', name: 'Khối Chồi', age: '4 - 5 tuổi', classes: 3 },
  { id: 'LA', name: 'Khối Lá', age: '5 - 6 tuổi', classes: 3 },
];

export function HolidayEditDrawer({
  isOpen,
  onClose,
  schoolYearId,
  selectedDate,
  holidayToEdit,
  onSuccess,
}) {
  const isEditing = Boolean(holidayToEdit && holidayToEdit.id);
  const [isHoliday, setIsHoliday] = useState(true); // true: Ngày nghỉ (isTeachingAllowed=false), false: Sự kiện (isTeachingAllowed=true)
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [scopeType, setScopeType] = useState('ALL'); // 'ALL' | 'GRADE'
  const [selectedGrades, setSelectedGrades] = useState([]);
  const [description, setDescription] = useState('');
  const [blockTeaching, setBlockTeaching] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  useEffect(() => {
    if (holidayToEdit) {
      setName(holidayToEdit.name || '');
      setStartDate(holidayToEdit.startDate || '');
      setEndDate(holidayToEdit.endDate || holidayToEdit.startDate || '');
      setIsHoliday(!holidayToEdit.isTeachingAllowed);
      setBlockTeaching(!holidayToEdit.isTeachingAllowed);
      
      // Parse scope
      const existingDesc = holidayToEdit.description || '';
      if (Array.isArray(holidayToEdit.targetGrades) && holidayToEdit.targetGrades.length > 0) {
        setScopeType('GRADE');
        setSelectedGrades(holidayToEdit.targetGrades);
      } else {
        const matchedGrades = [];
        GRADE_BLOCKS.forEach((b) => {
          if (
            existingDesc.includes(b.name) ||
            (holidayToEdit.scope && holidayToEdit.scope.includes(b.name))
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

      // Clean up description if it starts with [Khối ...]
      const cleanedDesc = existingDesc.replace(/^\[.*?\]\s*/, '');
      setDescription(cleanedDesc);
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
      setIsDeleteModalOpen(false);
    }
  }, [holidayToEdit, selectedDate, isOpen]);

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
      toast.error('Vui lòng nhập tên ngày nghỉ hoặc sự kiện.');
      return;
    }
    if (!startDate || !endDate) {
      toast.error('Vui lòng chọn ngày bắt đầu và kết thúc.');
      return;
    }
    if (new Date(endDate) < new Date(startDate)) {
      toast.error('Ngày kết thúc không được trước ngày bắt đầu.');
      return;
    }

    let scopeLabel = 'Toàn trường';
    const isSpecificScope = selectedGrades.length > 0;
    if (isSpecificScope) {
      scopeLabel = selectedGrades
        .map((id) => GRADE_BLOCKS.find((b) => b.id === id)?.name)
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
      isTeachingAllowed: !blockTeaching,
      targetGrades: isSpecificScope ? selectedGrades : [],
      description: finalDesc || (isHoliday ? `Nghỉ ${scopeLabel.toLowerCase()}` : `Sự kiện ${scopeLabel.toLowerCase()}`),
      scope: scopeLabel,
    };

    try {
      setIsSubmitting(true);
      if (isEditing) {
        await academicYearsApi.updateHoliday(schoolYearId, holidayToEdit.id, payload);
        toast.success('Đã cập nhật lịch năm học thành công!');
      } else {
        await academicYearsApi.createHoliday(schoolYearId, payload);
        toast.success('Đã thêm ngày nghỉ / sự kiện mới thành công!');
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(isEditing ? 'Cập nhật thất bại' : 'Thêm mới thất bại', {
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
      toast.success('Đã xóa ngày nghỉ / sự kiện thành công!');
      setIsDeleteModalOpen(false);
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error('Xóa thất bại', {
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
                {isEditing ? 'Chỉnh sửa ngày nghỉ / sự kiện' : 'Thêm ngày nghỉ / sự kiện'}
              </h2>
              <p className="text-[12.5px] text-muted-foreground font-normal">
                {isEditing
                  ? 'Cập nhật thời gian và phạm vi áp dụng'
                  : 'Khai báo ngày nghỉ hoặc sự kiện mới cho năm học'}
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
                Phân loại <span className="text-destructive">*</span>
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsHoliday(true);
                    setBlockTeaching(true);
                  }}
                  className={cn(
                    'h-10 px-4 text-[13.5px] font-medium border rounded-none transition-colors flex items-center justify-center cursor-pointer',
                    isHoliday
                      ? 'border-primary bg-primary/10 text-primary font-semibold'
                      : 'border-border bg-background text-muted-foreground hover:text-foreground',
                  )}
                >
                  Ngày nghỉ
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
                  Sự kiện
                </button>
              </div>
            </div>

            {/* Field 2: Tên ngày nghỉ / sự kiện */}
            <div className="flex flex-col gap-2">
              <Label className="text-[13px] font-medium text-foreground">
                {isHoliday ? 'Tên ngày nghỉ' : 'Tên sự kiện'}{' '}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={
                  isHoliday
                    ? 'VD: Nghỉ Tết Nguyên Đán, Nghỉ Lễ 30/4...'
                    : 'VD: Khai giảng năm học mới, Hội thao...'
                }
                className="h-10 px-3.5 text-[13.5px] rounded-none border-border"
              />
            </div>

            {/* Field 3: Thời gian áp dụng */}
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-3.5">
                <div className="flex flex-col gap-2">
                  <Label className="text-[13px] font-medium text-foreground">
                    Từ ngày <span className="text-destructive">*</span>
                  </Label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-10 w-full border border-border px-3.5 text-[13.5px] rounded-none bg-background text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label className="text-[13px] font-medium text-foreground">
                    Đến ngày <span className="text-destructive">*</span>
                  </Label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-10 w-full border border-border px-3.5 text-[13.5px] rounded-none bg-background text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
              {startDate && endDate && (
                <p className="text-[12px] text-muted-foreground pt-0.5">
                  Thời lượng: <span className="font-semibold text-foreground">{totalDays} ngày</span>
                </p>
              )}
            </div>

            {/* Field 4: Phạm vi áp dụng (List các khối ra bên ngoài luôn) */}
            <div className="flex flex-col gap-2.5">
              <Label className="text-[13px] font-medium text-foreground">
                Phạm vi áp dụng
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
                  <span>Toàn trường</span>
                  {selectedGrades.length === 0 && (
                    <span className="text-[13.5px] font-bold">✓</span>
                  )}
                </button>

                {/* 4 Grade Blocks listed directly */}
                <div className="grid grid-cols-2 gap-2.5">
                  {GRADE_BLOCKS.map((grade) => {
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
                  ? 'Áp dụng cho toàn thể các khối trong trường.'
                  : `Đã chọn: ${selectedGrades
                      .map((id) => GRADE_BLOCKS.find((b) => b.id === id)?.name)
                      .join(', ')}.`}
              </p>
            </div>

            {/* Field 5: Ghi chú */}
            <div className="flex flex-col gap-2">
              <Label className="text-[13px] font-medium text-foreground">
                Ghi chú (Tùy chọn)
              </Label>
              <Input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="VD: Nghỉ theo quy định chung của nhà trường..."
                className="h-10 px-3.5 text-[13.5px] rounded-none border-border"
              />
            </div>

            {/* Field 6: Tùy chọn khóa xếp lịch */}
            <div className="pt-1">
              <label className="flex items-center gap-2.5 cursor-pointer text-[13px] text-muted-foreground hover:text-foreground select-none">
                <input
                  type="checkbox"
                  checked={blockTeaching}
                  onChange={(e) => setBlockTeaching(e.target.checked)}
                  className="rounded-none border-border text-primary size-4 cursor-pointer"
                />
                <span>Khóa / Chặn xếp lịch dạy vào các ngày này</span>
              </label>
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
                  Xóa
                </Button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting || isDeleting}
                className="h-9 px-4.5 text-[13.5px] rounded-none border-border cursor-pointer"
              >
                Hủy
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || isDeleting}
                className="h-9 px-5 text-[13.5px] rounded-none bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer font-medium"
              >
                {isSubmitting ? 'Đang lưu...' : isEditing ? 'Lưu thay đổi' : 'Thêm vào lịch'}
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
              Xác nhận xóa ngày nghỉ / sự kiện
            </DialogTitle>
            <DialogDescription className="text-[13px] text-muted-foreground leading-relaxed">
              Bạn có chắc chắn muốn xóa{' '}
              <strong className="text-foreground font-semibold">"{name}"</strong> khỏi lịch năm
              học? Các slot giảng dạy bị khóa trước đó sẽ được mở lại.
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
              Hủy
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeleting}
              onClick={handleDelete}
              className="h-8 px-3.5 rounded-none text-[13px] font-medium cursor-pointer"
            >
              {isDeleting ? 'Đang xóa...' : 'Xóa vĩnh viễn'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default HolidayEditDrawer;
