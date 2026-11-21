import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useSearchParams, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArrowLeft01Icon,
  Settings01Icon,
  TeacherIcon,
  StudentIcon,
  Download01Icon,
} from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/features/auth';
import { useClassesStore, sanitizeClassName } from './classes.store';
import { ClassVisual } from './components/ClassVisual';
import { ClassHeaderNav } from './components/ClassHeaderNav';
import { AddClassModal } from './components/AddClassModal';
import { DeleteClassModal } from './components/DeleteClassModal';
import { ClassStudentAllocation } from './components/ClassStudentAllocation';
import { ClassTeacherAllocation } from './components/ClassTeacherAllocation';
import { ClassTransferRequests } from './components/ClassTransferRequests';
import { ClassExportRoster } from './components/ClassExportRoster';
import { NotFoundPage } from '@/features/error';
import { cn } from '@/shared/lib/utils';

export function ClassSettingsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const user = useAuthStore((state) => state.user);
  const isTeacher =
    user?.role === 'TEACHER_GV' ||
    user?.role === 'TEACHER' ||
    user?.role?.toLowerCase()?.includes('teacher');

  const classes = useClassesStore((state) => state.classes) || [];
  const attachedClassId = useClassesStore((state) => state.attachedClassId);
  const attachClass = useClassesStore((state) => state.attachClass);
  const updateClass = useClassesStore((state) => state.updateClass);
  const openDeleteModal = useClassesStore((state) => state.openDeleteModal);
  const setActiveSettingsTab = useClassesStore(
    (state) => state.setActiveSettingsTab,
  );
  const fetchClasses = useClassesStore((state) => state.fetchClasses);
  const fetchClassById = useClassesStore((state) => state.fetchClassById);
  const isLoading = useClassesStore((state) => state.isLoading);

  const currentClass = classes.find((c) => c.id === id || c.publicId === id);

  const [classNameInput, setClassNameInput] = useState('');
  const [gradeInput, setGradeInput] = useState('nhatre');
  const [roomInput, setRoomInput] = useState('');

  const [searchParams] = useSearchParams();
  const activeSettingsTab = searchParams.get('tab') || 'general';

  // Synchronize store one-way with URL parameter to avoid circular updates
  useEffect(() => {
    setActiveSettingsTab(activeSettingsTab);
  }, [activeSettingsTab, setActiveSettingsTab]);

  useEffect(() => {
    if (id && !currentClass) {
      fetchClassById(id);
    }
  }, [id, currentClass, fetchClassById]);

  useEffect(() => {
    if (id && attachedClassId !== id) {
      attachClass(id);
    }
  }, [id, attachedClassId, attachClass]);

  useEffect(() => {
    if (currentClass) {
      setClassNameInput(currentClass.name);
      setGradeInput(currentClass.grade);
      setRoomInput(currentClass.room);
    }
  }, [currentClass]);

  if (isTeacher) {
    return <Navigate to={id ? `/classes/${id}` : '/'} replace />;
  }

  if (!currentClass) {
    if (isLoading) {
      return (
        <div className="p-12 text-center text-muted-foreground select-none">
          <p className="text-[14px]">{t('common.loading', 'Đang tải thông tin lớp học...')}</p>
        </div>
      );
    }
    return <NotFoundPage />;
  }

  const handleSaveClass = async (e) => {
    e.preventDefault();
    const cleanName = sanitizeClassName(classNameInput);
    if (!cleanName) {
      toast.error(t('classes.nameRequired', 'Vui lòng nhập tên lớp học.'));
      return;
    }

    const isNameDuplicate = classes.some((c) => {
      if (c.id === currentClass.id || c.publicId === currentClass.id) return false;
      return sanitizeClassName(c.name).toLowerCase() === cleanName.toLowerCase();
    });
    if (isNameDuplicate) {
      toast.error(t('classes.duplicateName', `Tên lớp '${cleanName}' đã tồn tại trong năm học này!`));
      return;
    }

    if (roomInput.trim()) {
      const isRoomDuplicate = classes.some((c) => {
        if (c.id === currentClass.id || c.publicId === currentClass.id) return false;
        const cRoom = (c.room || c.roomNumber || '').trim();
        return cRoom.toLowerCase() === roomInput.trim().toLowerCase();
      });
      if (isRoomDuplicate) {
        toast.error(t('classes.roomDuplicate', "Phòng '{{room}}' đã được xếp cho lớp khác trong năm học này!", { room: roomInput.trim() }));
        return;
      }
    }
    const gradeLabels = {
      nhatre: 'Khối Nhà trẻ',
      mam: 'Khối Mầm',
      choi: 'Khối Chồi',
      la: 'Khối Lá',
    };
    try {
      await updateClass(currentClass.id, {
        name: cleanName,
        grade: gradeInput,
        gradeLabel: gradeLabels[gradeInput] || currentClass.gradeLabel,
        room: roomInput.trim(),
        updatedAt: currentClass.updatedAt || currentClass.updated_at,
      });
      toast.success(t('classes.savedSuccess', 'Đã lưu thông tin lớp học thành công!'));
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Lưu thất bại';
      toast.error(msg);
    }
  };

  const settingsSubNav = [
    { key: 'general', label: t('classes.settingsGeneral', 'Cấu hình lớp'), icon: Settings01Icon },
    { key: 'teachers', label: t('classes.settingsTeachers', 'Phân công giáo viên'), icon: TeacherIcon },
    { key: 'students', label: t('classes.settingsStudents', 'Phân lớp học sinh'), icon: StudentIcon },
    { key: 'export', label: t('classes.settingsExport', 'Xuất danh sách'), icon: Download01Icon },
  ];

  return (
    <div
      className="w-full flex-1 flex flex-col gap-6 max-w-[1300px] mx-auto text-foreground select-none pb-12"
      data-node-id="4617:9292"
      data-name="FE-05B · Class Settings · General"
    >

      {/* Tab Content: General (FE-05B) */}
      {activeSettingsTab === 'general' ? (
        <>
          {/* Page Header */}
          <div className="flex flex-col gap-1 pb-3 border-b border-border/60 shrink-0">
            <h1 className="text-[26px] font-semibold text-foreground tracking-tight">
              {t('classes.classConfigTitle', 'Cấu hình lớp')}
            </h1>
            <p className="text-[12px] text-muted-foreground font-normal">
              {t(
                'classes.classConfigSubtitle',
                'Thiết lập thông tin chung, quy mô học sinh và các cài đặt vận hành lớp học',
              )}
            </p>
          </div>

          <div className="flex flex-col gap-6 max-w-[1050px]">
            {/* View-Only Banner for Teachers */}
            {isTeacher && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/25 text-amber-900 dark:text-amber-300 text-[13px] flex items-center justify-between rounded-none shadow-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{t('classes.viewOnlyMode', 'Chế độ xem:')}</span>
                  <span>{t('classes.teacherViewOnlyDesc', 'Tài khoản Giáo viên chỉ có quyền xem thông tin cấu hình lớp. Mọi chỉnh sửa do Ban Giám Hiệu thực hiện.')}</span>
                </div>
                <span className="text-[11px] uppercase tracking-wider font-semibold bg-amber-500/20 px-2 py-0.5 border border-amber-500/30 shrink-0">
                  {t('classes.viewOnlyBadge', 'Chỉ xem')}
                </span>
              </div>
            )}

            {/* Card: Thông tin cơ bản của lớp (Tên lớp & Thông tin lớp) */}
            <form
              onSubmit={isTeacher ? (e) => e.preventDefault() : handleSaveClass}
              className="bg-card border border-border rounded-none shadow-xs overflow-hidden"
              data-name="Card · Thông tin lớp"
            >
              <div className="p-5 flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <h2 className="text-[15px] font-medium text-foreground">
                    {t('classes.infoCardTitle', 'Thông tin lớp')}
                  </h2>
                  <p className="text-[13px] text-muted-foreground">
                    {t(
                      'classes.infoCardCombinedDesc',
                      'Cập nhật tên hiển thị, khối học và phòng học của lớp trong năm học.',
                    )}
                  </p>
                </div>

                {/* Form Fields */}
                <div className="space-y-4 pt-1">
                  {/* Tên lớp */}
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-medium text-foreground">
                      {t('classes.fieldName', 'Tên lớp')} <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      disabled={isTeacher}
                      value={classNameInput}
                      onChange={(e) => setClassNameInput(e.target.value)}
                      placeholder="VD: Nhà trẻ 1, Mầm 1, Chồi 1..."
                      className={cn(
                        'w-full h-9 px-3 bg-background border border-border rounded-none text-[13px] text-foreground outline-none focus:outline-none focus:border-primary transition-colors',
                        isTeacher && 'bg-muted/40 text-muted-foreground cursor-not-allowed border-border/70',
                      )}
                    />
                  </div>

                  {/* Grid: Khối & Phòng học */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[13px] font-medium text-foreground">
                        {t('classes.fieldGrade', 'Khối')}
                      </label>
                      <select
                        disabled={true}
                        value={gradeInput}
                        onChange={(e) => setGradeInput(e.target.value)}
                        className="w-full h-9 px-3 bg-muted/40 border border-border/70 rounded-none text-[13px] text-muted-foreground outline-none cursor-not-allowed select-none"
                      >
                        <option value="nhatre">{t('classes.nursery', 'Khối Nhà trẻ (12–36 tháng)')}</option>
                        <option value="mam">{t('classes.kindergarten3', 'Khối Mầm (3–4 tuổi)')}</option>
                        <option value="choi">{t('classes.kindergarten4', 'Khối Chồi (4–5 tuổi)')}</option>
                        <option value="la">{t('classes.kindergarten5', 'Khối Lá (5–6 tuổi)')}</option>
                      </select>
                      <p className="text-[11.5px] text-muted-foreground italic">
                        {t('classes.gradeFixedNote', '* Khối lớp được cố định khi tạo lớp, không thể thay đổi')}
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[13px] font-medium text-foreground">
                        {t('classes.fieldRoom', 'Phòng học')}
                      </label>
                      <input
                        type="text"
                        disabled={isTeacher}
                        value={roomInput}
                        onChange={(e) => setRoomInput(e.target.value)}
                        placeholder="VD: Phòng 101, Phòng 201..."
                        className={cn(
                          'w-full h-9 px-3 bg-background border border-border rounded-none text-[13px] text-foreground outline-none focus:outline-none focus:border-primary',
                          isTeacher && 'bg-muted/40 text-muted-foreground cursor-not-allowed border-border/70',
                        )}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-border px-5 py-3 bg-muted/20 flex items-center justify-between">
                <span className="text-[12px] text-muted-foreground">
                  {isTeacher
                    ? t('classes.teacherViewOnlyNotice', 'Tài khoản giáo viên chỉ có quyền xem cấu hình lớp học.')
                    : t('classes.infoHelper', 'Các thay đổi chỉ áp dụng cho lớp đang chọn.')}
                </span>
                {!isTeacher && (
                  <Button
                    type="submit"
                    className="h-8 px-4 rounded-none bg-[#1447e6] hover:bg-[#1447e6]/90 text-white text-[13px] font-medium cursor-pointer"
                  >
                    {t('classes.save', 'Lưu')}
                  </Button>
                )}
              </div>
            </form>

            {/* Card: Xóa lớp (Danger Zone) - ẨN HOÀN TOÀN ĐỐI VỚI GIÁO VIÊN */}
            {!isTeacher && (
              <div
                className="border border-red-200 dark:border-red-900/50 bg-card rounded-none shadow-xs overflow-hidden"
                data-name="Danger Zone · Xóa lớp"
              >
                <div className="p-5 flex flex-col gap-4">
                  <div className="flex flex-col gap-1">
                    <h2 className="text-[15px] font-semibold text-foreground">
                      {t('classes.deleteCardTitle', 'Xóa lớp')}
                    </h2>
                    <p className="text-[13px] text-muted-foreground font-normal">
                      {t(
                        'classes.deleteCardDesc',
                        'Xóa lớp khỏi năm học và gỡ toàn bộ phân công hiện tại.',
                      )}
                    </p>
                  </div>

                  {/* Class Summary Snippet without container box */}
                  <div className="flex items-center gap-3 pt-0.5">
                    <ClassVisual
                      color={currentClass.color}
                      grade={currentClass.grade || currentClass.ageGroup}
                      src={currentClass.avatarUrl}
                      size={38}
                      className="rounded-none shrink-0"
                    />
                    <div className="flex flex-col min-w-0 leading-tight">
                      <span className="text-[13.5px] font-medium text-foreground truncate">
                        {currentClass.name}
                      </span>
                      <span className="text-[12px] text-muted-foreground truncate">
                        {currentClass.gradeLabel}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-red-100 dark:border-red-900/30 px-5 py-3 bg-[#fef2f2]/60 dark:bg-red-950/20 flex items-center justify-between">
                  <span className="text-[12px] text-muted-foreground font-normal">
                    {t(
                      'classes.deleteWarningNote',
                      'Thao tác này cần xác nhận và không thể hoàn tác.',
                    )}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => openDeleteModal(currentClass)}
                    className="h-8 px-4 rounded-none border border-red-400 hover:border-red-500 bg-white hover:bg-red-50/80 text-red-600 hover:text-red-700 dark:bg-transparent dark:hover:bg-red-950/30 text-[13px] font-normal cursor-pointer transition-colors shadow-none"
                  >
                    {t('classes.confirmDelete', 'Xóa lớp')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </>
      ) : activeSettingsTab === 'teachers' ? (
        /* Tab Content: Teacher Allocation */
        <ClassTeacherAllocation currentClass={currentClass} isTeacher={isTeacher} />
      ) : activeSettingsTab === 'students' ? (
        /* Tab Content: Student Allocation (FE-05B · Node 4992:17660) */
        <ClassStudentAllocation currentClass={currentClass} isTeacher={isTeacher} />
      ) : activeSettingsTab === 'transfers' ? (
        <Navigate to="/transfers" replace />
      ) : activeSettingsTab === 'export' ? (
        /* Tab Content: Class Export Roster */
        <ClassExportRoster currentClass={currentClass} />
      ) : null}

      {/* Modals */}
      <AddClassModal />
      <DeleteClassModal />
    </div>
  );
}
