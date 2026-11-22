import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Search01Icon,
  PlusSignIcon,
  Delete02Icon,
  MoreHorizontalIcon,
  ViewIcon,
} from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/shared/lib/utils';
import { classesApi } from '../classes.api';
import { AssignTeacherDrawer } from './AssignTeacherDrawer';
import { getTeacherAvatarUrl } from '../../teachers/teachers.store';
import { useAuthStore } from '@/features/auth';

export function ClassTeacherAllocation({ currentClass, isTeacher: propIsTeacher }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const isTeacher =
    propIsTeacher !== undefined
      ? propIsTeacher
      : user?.role === 'TEACHER_GV' ||
        user?.role === 'TEACHER' ||
        user?.role?.toLowerCase()?.includes('teacher');
  const [data, setData] = useState({
    activeTeachers: [],
    poolTeachers: [],
    summary: { total: 0, hasPrimary: false, primaryTeacherName: '', assistantCount: 0 },
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [teacherToRemove, setTeacherToRemove] = useState(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const isClassFull = (data?.activeTeachers?.length || 0) >= 3;
  const isSchoolYearEnded = Boolean(data?.summary?.isSchoolYearEnded || currentClass?.isCompleted);
  const canAddTeacher = !isClassFull && !isSchoolYearEnded;

  const handleOpenAddDrawer = () => {
    if (isSchoolYearEnded) {
      toast.warning('Năm học đã kết thúc. Không thể thay đổi phân công giáo viên.');
      return;
    }
    if (isClassFull) {
      toast.warning('Lớp học đã có đủ 3 giáo viên (tối đa theo BR-38). Không thể phân công thêm.');
      return;
    }
    setIsDrawerOpen(true);
  };

  const loadData = useCallback(async () => {
    if (!currentClass?.id) return;
    try {
      setIsLoading(true);
      const res = await classesApi.getClassTeachers(currentClass.id);
      setData(res);
    } catch (err) {
      console.error('Error loading teachers:', err);
      toast.error(t('classes.loadTeachersError', 'Không thể tải danh sách giáo viên của lớp.'));
    } finally {
      setIsLoading(false);
    }
  }, [currentClass?.id, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtered assigned teachers
  const filteredTeachers = useMemo(() => {
    const list = data.activeTeachers || [];
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter(
      (tc) =>
        tc.fullName?.toLowerCase().includes(q) ||
        tc.employeeCode?.toLowerCase().includes(q) ||
        tc.phone?.includes(q) ||
        tc.email?.toLowerCase().includes(q),
    );
  }, [data.activeTeachers, searchQuery]);

  // Remove teacher
  const handleConfirmRemove = async () => {
    if (!teacherToRemove) return;
    try {
      setIsRemoving(true);
      await classesApi.removeTeacher(currentClass.id, teacherToRemove.teacherId);
      toast.success(
        t('classes.removedTeacherSuccess', 'Đã gỡ giáo viên khỏi lớp thành công!'),
      );
      setTeacherToRemove(null);
      loadData();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || t('classes.errorRemovingTeacher', 'Lỗi khi gỡ giáo viên');
      toast.error(msg);
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <>
      {/* Page Header matching Cấu hình lớp */}
      <div className="flex flex-col gap-1 pb-3 border-b border-border/60 shrink-0">
        <h1 className="text-[26px] font-semibold text-foreground tracking-tight">
          {t('classes.teacherAllocationTitle', 'Phân công giáo viên')}
        </h1>
        <p className="text-[12px] text-muted-foreground font-normal">
          {t(
            'classes.teacherAllocationSubtitle',
            'Phân công các giáo viên phụ trách chăm sóc và giảng dạy lớp học',
          )}
        </p>
      </div>

      <div className="flex flex-col gap-6 max-w-[1050px]" data-name="ClassTeacherAllocation">
        {/* Card: Bảng toàn bộ giáo viên phụ trách */}
        <div
          className="bg-card border border-border rounded-none shadow-xs overflow-hidden"
          data-name="Card · Danh sách giáo viên"
        >
          <div className="p-5 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-[15px] font-medium text-foreground">
                    {t('classes.assignedTeachersHeading', 'Danh sách giáo viên')}
                  </h2>
                  <span className="text-[12px] font-medium px-2 py-0.5 bg-muted text-foreground border border-border/60">
                    {t('classes.teacherCount', '{{count}} giáo viên', { count: data.activeTeachers?.length || 0 })}
                  </span>
                </div>
                <p className="text-[13px] text-muted-foreground">
                  {t(
                    'classes.assignedTeachersSub',
                    'Danh sách các giáo viên cùng phụ trách giảng dạy và chăm sóc trẻ.',
                  )}
                </p>
              </div>

              {/* Toolbar: Search Bar & Add Teacher CTA */}
              <div className="flex items-center gap-2">
                <div className="relative w-full sm:w-[240px] h-8">
                  <HugeiconsIcon
                    icon={Search01Icon}
                    size={15}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                  />
                  <Input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('classes.searchTeacherInClass', 'Tìm kiếm cán bộ...')}
                    className="h-8 pl-8 pr-2.5 text-[13px] bg-background border-border rounded-none shadow-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>
                {!isTeacher && (
                  <Button
                    type="button"
                    onClick={handleOpenAddDrawer}
                    disabled={!canAddTeacher}
                    title={
                      isSchoolYearEnded
                        ? 'Năm học đã kết thúc'
                        : isClassFull
                        ? 'Lớp học đã có đủ 3 giáo viên (tối đa theo BR-38)'
                        : t('classes.addTeacherBtn', 'Thêm giáo viên')
                    }
                    className={cn(
                      'h-8 px-3 rounded-none text-white text-[13px] font-medium shadow-none flex items-center gap-1.5 shrink-0',
                      canAddTeacher
                        ? 'bg-[#1447e6] hover:bg-[#1447e6]/90 cursor-pointer'
                        : 'bg-[#1447e6]/50 opacity-50 cursor-not-allowed'
                    )}
                  >
                    <HugeiconsIcon icon={PlusSignIcon} size={15} />
                    <span>{t('classes.addTeacherBtn', 'Thêm giáo viên')}</span>
                  </Button>
                )}
              </div>
            </div>

            {/* Table matching TeacherTable exactly */}
            <div className="w-full border border-border bg-card rounded-none overflow-x-auto shadow-xs select-none">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="h-10 border-b border-border bg-muted/30 text-[13px] font-medium text-foreground">
                    <th className="px-3 w-[50px] text-center font-medium">{t('classes.colIndex', 'STT')}</th>
                    <th className="px-3 min-w-[220px] font-medium">
                      {t('teacher.colTeacher', 'Giáo viên')}
                    </th>
                    <th className="px-3 min-w-[130px] font-medium">
                      {t('teacher.colPhone', 'Số điện thoại')}
                    </th>
                    <th className="px-3 min-w-[120px] font-medium">
                      {t('classes.teacherAssignedAtCol', 'Ngày phân công')}
                    </th>
                    {!isTeacher && (
                      <th className="px-3 min-w-[95px] w-[95px] text-right font-medium whitespace-nowrap">
                        {t('common.actions', 'Thao tác')}
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {isLoading ? (
                    Array.from({ length: 3 }).map((_, idx) => (
                      <tr key={idx} className="h-[72px] animate-pulse">
                        <td className="px-3 text-center"><div className="h-3 w-6 bg-muted/40 mx-auto" /></td>
                        <td className="px-3">
                          <div className="flex items-center gap-3">
                            <div className="size-8 bg-muted/60 rounded-none shrink-0" />
                            <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                              <div className="h-3.5 w-28 bg-muted/60" />
                              <div className="h-2.5 w-16 bg-muted/40" />
                            </div>
                          </div>
                        </td>
                        <td className="px-3"><div className="h-3.5 w-20 bg-muted/50" /></td>
                        <td className="px-3"><div className="h-3.5 w-20 bg-muted/50" /></td>
                        {!isTeacher && <td className="px-3 text-right"><div className="size-7 bg-muted/40 ml-auto" /></td>}
                      </tr>
                    ))
                  ) : filteredTeachers.length === 0 ? (
                    <tr>
                      <td colSpan={isTeacher ? 4 : 5} className="py-12 text-center text-muted-foreground text-[13px]">
                        {searchQuery.trim()
                          ? t('teacher.notFound', 'Không tìm thấy giáo viên nào phù hợp.')
                          : t('classes.noTeachersInClass', 'Lớp chưa được phân công giáo viên nào.')}
                      </td>
                    </tr>
                  ) : (
                    filteredTeachers.map((teacher, index) => {
                      const assignedDateStr = teacher.assignedAt
                        ? new Date(teacher.assignedAt).toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'vi-VN')
                        : '—';

                      return (
                        <tr
                          key={teacher.teacherId}
                          className="h-[72px] hover:bg-muted/40 transition-colors group cursor-default"
                        >
                          <td className="px-3 text-center text-muted-foreground font-mono text-[12px] w-[50px]">
                            {index + 1}
                          </td>

                          {/* Teacher Info (Avatar + Name + Subtitle) */}
                          <td className="px-3">
                            <div className="flex items-center gap-3">
                              <div className="size-8 shrink-0 rounded-none overflow-hidden border border-border/80 bg-primary/10">
                                <img
                                  src={getTeacherAvatarUrl(teacher.avatar, teacher.fullName)}
                                  alt={teacher.fullName}
                                  className="size-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.src = getTeacherAvatarUrl(null, teacher.fullName);
                                  }}
                                />
                              </div>
                              <div className="flex flex-col min-w-0 leading-tight">
                                <span className="text-[14px] font-medium text-foreground truncate">
                                  {teacher.fullName}
                                </span>
                                <span className="text-[12px] text-muted-foreground truncate">
                                  {teacher.position || teacher.role || t('classes.teacherDefaultRole', 'Giáo viên')} · <span className="font-mono">{teacher.employeeCode || '—'}</span>
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Phone */}
                          <td className="px-3 text-[14px] text-foreground font-normal whitespace-nowrap">
                            {teacher.phone || '—'}
                          </td>

                          {/* Assigned Date */}
                          <td className="px-3 text-[14px] text-muted-foreground font-normal whitespace-nowrap">
                            {assignedDateStr}
                          </td>

                          {/* Actions Dropdown (Only for BGH) */}
                          {!isTeacher && (
                            <td className="px-3 min-w-[95px] w-[95px] text-right whitespace-nowrap">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button
                                    type="button"
                                    className="size-7 inline-flex items-center justify-center rounded-none text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors cursor-pointer ml-auto"
                                    title={t('common.actions', 'Thao tác')}
                                    data-name="Actions · More"
                                  >
                                    <HugeiconsIcon icon={MoreHorizontalIcon} size={16} />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                  align="end"
                                  className="w-40 p-1 rounded-none border border-border bg-card shadow-xl z-50 text-foreground"
                                >
                                  <DropdownMenuItem
                                    onClick={() => navigate(`/teachers/${teacher.teacherId || teacher.id}`)}
                                    className="flex items-center gap-2 h-8 px-2 text-[13px] cursor-pointer rounded-none hover:bg-muted/60"
                                  >
                                    <HugeiconsIcon icon={ViewIcon} size={15} />
                                    <span>{t('teacher.actionView', 'Xem chi tiết')}</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator className="my-1 border-t border-border" />
                                  <DropdownMenuItem
                                    onClick={() => setTeacherToRemove(teacher)}
                                    className="flex items-center gap-2 h-8 px-2 text-[13px] text-destructive hover:text-destructive hover:bg-destructive/10 focus:text-destructive focus:bg-destructive/10 cursor-pointer rounded-none"
                                  >
                                    <HugeiconsIcon icon={Delete02Icon} size={15} />
                                    <span>{t('classes.removeTeacherBtn', 'Gỡ khỏi lớp')}</span>
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Slide-out Drawer */}
      <AssignTeacherDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        classId={currentClass.id}
        className={currentClass.name}
        poolTeachers={data.poolTeachers || []}
        currentCount={data.activeTeachers?.length || 0}
        isSchoolYearEnded={isSchoolYearEnded}
        onSuccess={loadData}
      />

      {/* Remove Confirmation Dialog matching standard modal */}
      {teacherToRemove && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-[420px] border border-border bg-card p-5 rounded-none shadow-xl flex flex-col gap-4 select-none">
            <div className="flex flex-col gap-1">
              <h3 className="text-[16px] font-semibold text-foreground">
                {t('classes.confirmRemoveTeacherTitle', 'Xác nhận gỡ giáo viên')}
              </h3>
              <p className="text-[13px] text-muted-foreground">
                {t(
                  'classes.confirmRemoveTeacherDesc',
                  'Bạn có chắc chắn muốn gỡ giáo viên {{name}} ({{code}}) khỏi lớp {{className}}?',
                  {
                    name: teacherToRemove.fullName,
                    code: teacherToRemove.employeeCode,
                    className: currentClass.name,
                  },
                )}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                disabled={isRemoving}
                onClick={() => setTeacherToRemove(null)}
                className="h-8 px-4 rounded-none border-border text-[13px] font-normal hover:bg-muted/70 shadow-none cursor-pointer"
              >
                {t('common.cancel', 'Hủy')}
              </Button>
              <Button
                type="button"
                disabled={isRemoving}
                onClick={handleConfirmRemove}
                className="h-8 px-4 rounded-none bg-destructive hover:bg-destructive/90 text-white text-[13px] font-medium shadow-none cursor-pointer"
              >
                {isRemoving
                  ? t('common.deleting', 'Đang gỡ...')
                  : t('classes.confirmRemoveBtn', 'Xác nhận gỡ')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
