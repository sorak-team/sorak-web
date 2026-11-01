import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { HugeiconsIcon } from '@hugeicons/react';
import { Cancel01Icon } from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useClassesStore, sanitizeClassName } from '../classes.store';
import { cn } from '@/shared/lib/utils';

export function ClassDrawer() {
  const { t } = useTranslation();
  const {
    isDrawerOpen,
    drawerMode,
    editingClassId,
    classes,
    closeDrawer,
    addClass,
    updateClass,
  } = useClassesStore();

  const currentClass = classes.find((item) => item.id === editingClassId);

  const [formData, setFormData] = useState({
    name: '',
    grade: 'nhatre',
    room: '',
    teacher: '',
    description: '',
  });

  useEffect(() => {
    if (drawerMode === 'edit' && currentClass) {
      setFormData({
        name: currentClass.name || '',
        grade: currentClass.grade || 'nhatre',
        room: currentClass.room || currentClass.roomNumber || '',
        teacher: currentClass.teacher || '',
        description: currentClass.description || '',
      });
    } else {
      setFormData({
        name: '',
        grade: 'nhatre',
        room: '',
        teacher: '',
        description: '',
      });
    }
  }, [drawerMode, currentClass, isDrawerOpen]);

  if (!isDrawerOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanName = sanitizeClassName(formData.name);
    if (!cleanName) {
      toast.error(t('classes.nameRequired', 'Vui lòng nhập tên lớp học.'));
      return;
    }

    // Check duplicate class name in current year (Bug #10)
    const isDuplicate = classes.some((c) => {
      const matchId =
        drawerMode === 'edit' &&
        editingClassId &&
        (c.id === editingClassId || c.publicId === editingClassId);
      if (matchId) return false;
      return sanitizeClassName(c.name).toLowerCase() === cleanName.toLowerCase();
    });

    if (isDuplicate) {
      toast.error(t('classes.duplicateName', `Tên lớp '${cleanName}' đã tồn tại trong năm học này!`));
      return;
    }

    if (formData.room?.trim()) {
      const isRoomDuplicate = classes.some((c) => {
        const matchId =
          drawerMode === 'edit' &&
          editingClassId &&
          (c.id === editingClassId || c.publicId === editingClassId);
        if (matchId) return false;
        const cRoom = (c.room || c.roomNumber || '').trim();
        return cRoom.toLowerCase() === formData.room.trim().toLowerCase();
      });

      if (isRoomDuplicate) {
        toast.error(`Phòng '${formData.room.trim()}' đã được xếp cho lớp khác trong năm học này!`);
        return;
      }
    }

    try {
      if (drawerMode === 'edit' && editingClassId) {
        await updateClass(editingClassId, {
          name: cleanName,
          grade: formData.grade,
          room: formData.room.trim(),
          description: formData.description.trim(),
        });
        toast.success(t('classes.updateSuccess', 'Đã cập nhật thông tin lớp học thành công!'));
      } else {
        await addClass({
          ...formData,
          name: cleanName,
          room: formData.room.trim(),
          description: formData.description.trim(),
          studentCount: 0,
        });
        toast.success(t('classes.createSuccess', 'Đã tạo lớp học mới thành công!'));
      }
      closeDrawer();
    } catch (err) {
      console.error('Save class failed:', err);
      const msg = err.response?.data?.message || err.message || t('classes.saveFailed', 'Lỗi khi lưu lớp học');
      toast.error(msg);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        onClick={closeDrawer}
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in-0 duration-200"
      />

      {/* Drawer Panel matching Teacher & Account Drawers */}
      <div
        className={cn(
          'relative w-full max-w-[500px] h-full bg-card border-l border-border shadow-2xl flex flex-col',
          'animate-in slide-in-from-right duration-250 ease-out z-10 text-foreground select-none',
        )}
        data-name="Class Drawer"
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-border shrink-0">
          <div className="flex flex-col gap-1">
            <h2 className="text-[18px] font-semibold text-foreground tracking-tight">
              {drawerMode === 'edit'
                ? t('classes.editClassTitle', 'Chỉnh sửa thông tin lớp')
                : t('classes.addClassTitle', 'Thêm lớp học mới')}
            </h2>
            <p className="text-[12px] text-muted-foreground font-normal">
              {drawerMode === 'edit'
                ? t(
                    'classes.editClassDesc',
                    'Cập nhật thông tin phòng học, giáo viên và sức chứa của lớp',
                  )
                : t(
                    'classes.addClassDesc',
                    'Điền thông tin để khởi tạo lớp học mới trong năm học hiện tại',
                  )}
            </p>
          </div>

          <button
            type="button"
            onClick={closeDrawer}
            className="size-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-none transition-colors cursor-pointer"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={16} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Card 1: Thông tin cơ bản */}
          <div className="border border-border bg-card rounded-none overflow-hidden">
            <div className="p-4 border-b border-border bg-muted/20">
              <h3 className="text-[14px] font-semibold text-foreground">
                {t('classes.basicInfo', 'Thông tin cơ bản')}
              </h3>
              <p className="text-[12px] text-muted-foreground font-normal">
                {t('classes.basicInfoDesc', 'Tên lớp và khối giảng dạy theo độ tuổi')}
              </p>
            </div>

            <div className="p-4 space-y-4">
              {/* Tên lớp */}
              <div className="space-y-1.5">
                <Label className="text-[12px] font-medium text-foreground">
                  {t('classes.fieldName', 'Tên lớp')} <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="VD: Nhà trẻ 1, Mầm 1, Chồi 1..."
                  className="h-9 text-[13px] rounded-none border-border"
                />
              </div>

              {/* Khối lớp */}
              <div className="space-y-1.5">
                <Label className="text-[12px] font-medium text-foreground">
                  {t('classes.fieldGrade', 'Khối lớp')}
                </Label>
                <select
                  disabled={drawerMode === 'edit'}
                  value={formData.grade}
                  onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                  className={cn(
                    "w-full h-9 px-3 bg-background border border-border rounded-none text-[13px] text-foreground focus:outline-hidden focus:border-primary",
                    drawerMode === 'edit' ? "opacity-60 cursor-not-allowed bg-muted/40" : "cursor-pointer"
                  )}
                >
                  <option value="nhatre">Khối Nhà trẻ (12–36 tháng)</option>
                  <option value="mam">Khối Mầm (3–4 tuổi)</option>
                  <option value="choi">Khối Chồi (4–5 tuổi)</option>
                  <option value="la">Khối Lá (5–6 tuổi)</option>
                </select>
                {drawerMode === 'edit' && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Không thể thay đổi khối lớp sau khi đã tạo lớp học.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Card 2: Phòng học & Nhân sự */}
          <div className="border border-border bg-card rounded-none overflow-hidden">
            <div className="p-4 border-b border-border bg-muted/20">
              <h3 className="text-[14px] font-semibold text-foreground">
                {t('classes.facilityAndStaff', 'Cơ sở vật chất & Phân công')}
              </h3>
              <p className="text-[12px] text-muted-foreground font-normal">
                {t('classes.facilityDesc', 'Vị trí phòng học và phân công giáo viên')}
              </p>
            </div>

            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Phòng học (Khớp room_number trong DB schema) */}
                <div className="space-y-1.5">
                  <Label className="text-[12px] font-medium text-foreground">
                    {t('classes.fieldRoom', 'Phòng học')}
                  </Label>
                  <Input
                    type="text"
                    value={formData.room}
                    onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                    placeholder="VD: Phòng 101, Phòng 201..."
                    className="h-9 text-[13px] rounded-none border-border"
                  />
                </div>

                {/* Giáo viên phụ trách (Chỉ phân công qua tính năng Phân công giáo viên) */}
                <div className="space-y-1.5">
                  <Label className="text-[12px] font-medium text-foreground">
                    {t('classes.fieldTeacher', 'Giáo viên phụ trách')}
                  </Label>
                  <Input
                    type="text"
                    value={formData.teacher || 'Chưa phân công'}
                    disabled
                    readOnly
                    placeholder="Chưa phân công giáo viên"
                    className="h-9 text-[13px] rounded-none border-border bg-muted/50 cursor-not-allowed text-muted-foreground opacity-90 select-none pointer-events-none"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Giáo viên phụ trách chỉ được thay đổi thông qua chức năng Phân công giáo viên.
                  </p>
                </div>
              </div>

              {/* Mô tả / Ghi chú (Khớp cột description trong DB schema) */}
              <div className="space-y-1.5">
                <Label className="text-[12px] font-medium text-foreground">
                  {t('classes.fieldDescription', 'Mô tả / Ghi chú')}
                </Label>
                <Input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="VD: Lớp học ưu tiên đón sớm, trang bị đàn piano..."
                  className="h-9 text-[13px] rounded-none border-border"
                />
              </div>
            </div>
          </div>
        </form>

        {/* Sticky Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border shrink-0 bg-background">
          <Button
            type="button"
            variant="outline"
            onClick={closeDrawer}
            className="h-8 px-4 text-[13px] rounded-none border-border cursor-pointer"
          >
            {t('classes.cancel', 'Hủy')}
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            className="h-8 px-4 text-[13px] rounded-none bg-[#1447e6] hover:bg-[#1447e6]/90 text-white cursor-pointer font-medium"
          >
            {drawerMode === 'edit'
              ? t('classes.save', 'Lưu thay đổi')
              : t('classes.createClass', 'Tạo lớp học')}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Re-export as AddClassModal for backward compatibility
export const AddClassModal = ClassDrawer;
