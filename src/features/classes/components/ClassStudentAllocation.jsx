import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Search01Icon,
  UserGroupIcon,
  PlusSignIcon,
  MoreVerticalIcon,
  ViewIcon,
  ArrowDataTransferHorizontalIcon,
  Delete02Icon,
} from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { confirmDialog } from '@/components/ui/confirm-dialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { classesApi } from '../classes.api';
import { useClassesStore } from '../classes.store';
import { getStudentAvatarUrl } from '../../students/students.store';
import { StudentIntakeDrawer } from './StudentIntakeDrawer';
import { CreateTransferDrawer } from './CreateTransferDrawer';
import { cn } from '@/shared/lib/utils';
import { useAuthStore } from '@/features/auth';

export function ClassStudentAllocation({ currentClass, isTeacher: propIsTeacher }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const fetchGlobalClasses = useClassesStore((state) => state.fetchClasses);
  const user = useAuthStore((state) => state.user);
  const isTeacher =
    propIsTeacher !== undefined
      ? propIsTeacher
      : user?.role === 'TEACHER_GV' ||
        user?.role === 'TEACHER' ||
        user?.role?.toLowerCase()?.includes('teacher');

  const [classRoster, setClassRoster] = useState([]);
  const [isLoadingRoster, setIsLoadingRoster] = useState(false);
  const [rosterSearch, setRosterSearch] = useState('');

  // Modals & Drawers state
  const [transferStudent, setTransferStudent] = useState(null);
  const [isIntakeDrawerOpen, setIsIntakeDrawerOpen] = useState(false);

  // Fetch Class Roster
  const fetchClassRoster = useCallback(async () => {
    if (!currentClass?.id) return;
    setIsLoadingRoster(true);
    try {
      const data = await classesApi.getClassStudents(currentClass.id, {
        search: rosterSearch.trim() || undefined,
      });
      if (data) {
        setClassRoster(data.students || []);
      }
    } catch (err) {
      console.error('Failed to fetch class roster:', err);
      toast.error(t('classes.loadRosterError', 'Không thể tải danh sách học sinh trong lớp.'));
    } finally {
      setIsLoadingRoster(false);
    }
  }, [currentClass?.id, rosterSearch, t]);

  useEffect(() => {
    fetchClassRoster();
  }, [fetchClassRoster]);

  // Filtered in-class roster
  const filteredRoster = useMemo(() => {
    if (!rosterSearch.trim()) return classRoster;
    const q = rosterSearch.toLowerCase().trim();
    return classRoster.filter(
      (s) =>
        s.fullName?.toLowerCase().includes(q) ||
        s.studentCode?.toLowerCase().includes(q),
    );
  }, [classRoster, rosterSearch]);

  const handleRemoveStudentFromClass = async (student) => {
    const isConfirmed = await confirmDialog({
      title: t('classes.confirmRemoveStudentTitle', 'Xác nhận gỡ học sinh khỏi lớp'),
      description: t(
        'classes.confirmRemoveStudent',
        'Bạn có chắc chắn muốn gỡ học sinh {{name}} khỏi lớp {{className}}? Thao tác này sẽ chuyển học sinh về trạng thái chưa phân lớp.',
        { name: student.fullName, className: currentClass?.name },
      ),
      confirmText: t('common.remove', 'Gỡ khỏi lớp'),
      cancelText: t('common.cancel', 'Hủy'),
      variant: 'destructive',
    });
    if (!isConfirmed) {
      return;
    }
    try {
      await classesApi.unassignStudent(currentClass.id, student.id);
      toast.success(
        t('classes.removeStudentSuccess', 'Đã gỡ học sinh {{name}} khỏi lớp thành công.', {
          name: student.fullName,
        }),
      );
      fetchClassRoster();
      fetchGlobalClasses();
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          t('classes.removeStudentError', 'Không thể gỡ học sinh khỏi lớp.'),
      );
    }
  };

  return (
    <>
      {/* 1. Page Header matching "Cấu hình lớp" & "Phân công giáo viên" */}
      <div className="flex flex-col gap-1 pb-3 border-b border-border/60 shrink-0">
        <h1 className="text-[26px] font-semibold text-foreground tracking-tight">
          {t('classes.studentAllocationTitle', 'Phân lớp học sinh')}
        </h1>
        <p className="text-[12px] text-muted-foreground font-normal">
          {t(
            'classes.studentAllocationSubtitleFull',
            'Quản lý danh sách học sinh chính thức, tiếp nhận học sinh mới và điều phối sĩ số lớp',
          )}
        </p>
      </div>

      <div className="flex flex-col gap-6 max-w-[1050px]" data-name="ClassStudentAllocation">
        {/* ================= CARD: DANH SÁCH HỌC SINH CỦA LỚP ================= */}
        <div
          className="bg-card border border-border rounded-none shadow-xs overflow-hidden"
          data-name="Card · Danh sách học sinh của lớp"
        >
          <div className="p-5 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-[15px] font-medium text-foreground">
                    {t('classes.rosterCardHeading', 'Danh sách học sinh')}
                  </h2>
                  <span className="text-[12px] font-medium px-2 py-0.5 bg-muted text-foreground border border-border/60">
                    {t('classes.classSizeCount', 'Sĩ số: {{count}} học sinh', { count: classRoster.length })}
                  </span>
                </div>
                <p className="text-[13px] text-muted-foreground">
                  {t(
                    'classes.rosterCardDesc',
                    'Danh sách học sinh chính thức và theo dõi sĩ số thực tế của lớp học',
                  )}
                </p>
              </div>

              {/* Roster Actions: Search Bar + Tiếp nhận học sinh button */}
              <div className="flex items-center gap-2.5">
                <div className="relative w-full sm:w-[240px] h-8">
                  <HugeiconsIcon
                    icon={Search01Icon}
                    size={15}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                  />
                  <Input
                    type="text"
                    value={rosterSearch}
                    onChange={(e) => setRosterSearch(e.target.value)}
                    placeholder={t('classes.searchRosterPlaceholder', 'Tìm kiếm học sinh...')}
                    className="h-8 pl-8 pr-2.5 text-[13px] bg-background border-border rounded-none shadow-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>

                <Button
                  type="button"
                  onClick={() => setIsIntakeDrawerOpen(true)}
                  className="h-8 px-3.5 bg-[#1447e6] hover:bg-[#1447e6]/90 text-white text-[13px] font-medium rounded-none shadow-none cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  <HugeiconsIcon icon={PlusSignIcon} size={15} />
                  <span>{t('classes.intakeActionShort', 'Tiếp nhận học sinh')}</span>
                </Button>
              </div>
            </div>

            {/* Roster Table (5 Cột chuẩn: STT, Học sinh, Ngày sinh, Giới tính, Thao tác) */}
            <div className="w-full border border-border bg-card rounded-none overflow-x-auto shadow-xs select-none">
              <table className="w-full text-left border-collapse min-w-[650px]">
                <thead>
                  <tr className="h-10 border-b border-border bg-muted/30 text-[13px] font-medium text-foreground">
                    <th className="px-3 w-[50px] text-center font-medium">{t('classes.colIndex', 'STT')}</th>
                    <th className="px-3 min-w-[220px] font-medium">{t('student.colStudent', 'Học sinh')}</th>
                    <th className="px-3 min-w-[130px] font-medium">{t('teacher.colDob', 'Ngày sinh')}</th>
                    <th className="px-3 min-w-[90px] font-medium">{t('student.colGender', 'Giới tính')}</th>
                    {!isTeacher && (
                      <th className="px-3 min-w-[95px] w-[95px] text-right font-medium whitespace-nowrap">
                        {t('common.actions', 'Thao tác')}
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {isLoadingRoster ? (
                    Array.from({ length: 4 }).map((_, idx) => (
                      <tr key={idx} className="h-[64px] animate-pulse">
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
                        <td className="px-3"><div className="h-3.5 w-12 bg-muted/50" /></td>
                        {!isTeacher && <td className="px-3 text-right"><div className="size-7 bg-muted/40 ml-auto" /></td>}
                      </tr>
                    ))
                  ) : filteredRoster.length === 0 ? (
                    <tr>
                      <td colSpan={isTeacher ? 4 : 5} className="py-12 text-center text-muted-foreground text-[13px]">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <HugeiconsIcon
                            icon={UserGroupIcon}
                            size={28}
                            className="text-muted-foreground/60"
                          />
                          <p className="text-[13px]">
                            {rosterSearch.trim()
                              ? t('classes.noMatchingStudent', 'Không tìm thấy học sinh nào phù hợp.')
                              : t(
                                  'classes.emptyRosterPrompt',
                                  'Lớp học chưa có học sinh nào. Bấm "+ Tiếp nhận học sinh" để phân bổ học sinh vào lớp.',
                                )}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredRoster.map((student, idx) => (
                      <tr
                        key={student.id}
                        className="h-[64px] hover:bg-muted/40 transition-colors group cursor-default"
                      >
                        {/* STT */}
                        <td className="px-3 text-center text-muted-foreground font-mono text-[12px] w-[50px]">
                          {idx + 1}
                        </td>

                        {/* Student Profile */}
                        <td className="px-3">
                          <div className="flex items-center gap-3">
                            <div className="size-8 shrink-0 rounded-none overflow-hidden border border-border/80 bg-muted/40">
                              <img
                                src={getStudentAvatarUrl(student.avatar, student.studentCode || student.fullName)}
                                alt={student.fullName}
                                className="size-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.src = getStudentAvatarUrl(null, student.studentCode || student.fullName);
                                }}
                              />
                            </div>
                            <div className="flex flex-col min-w-0 leading-tight">
                              <span className="text-[14px] font-medium text-foreground truncate">
                                {student.fullName}
                              </span>
                              <span className="text-[12px] text-muted-foreground truncate font-mono">
                                {student.studentCode || '—'}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Date of birth (Không / tuổi) */}
                        <td className="px-3 text-[14px] text-foreground font-normal whitespace-nowrap">
                          {student.dateOfBirth
                            ? new Date(student.dateOfBirth).toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'vi-VN')
                            : '—'}
                        </td>

                        {/* Gender */}
                        <td className="px-3 text-[14px] text-foreground font-normal whitespace-nowrap">
                          {student.gender === 'FEMALE' ? t('common.female', 'Nữ') : t('common.male', 'Nam')}
                        </td>

                        {/* Thao tác (Cho cả BGH và Giáo viên) */}
                        <td className="px-3 text-right whitespace-nowrap">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="size-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer rounded-none ml-auto"
                                title={t('common.actions', 'Thao tác')}
                              >
                                <HugeiconsIcon icon={MoreVerticalIcon} size={15} />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="w-48 p-1 rounded-none border border-border bg-card shadow-xl z-50 text-[13px]"
                            >
                              <DropdownMenuItem
                                onClick={() => setTransferStudent(student)}
                                className="flex items-center gap-2 h-8 px-2 text-[13px] cursor-pointer rounded-none"
                              >
                                <HugeiconsIcon
                                  icon={ArrowDataTransferHorizontalIcon}
                                  size={14}
                                  className="text-muted-foreground"
                                />
                                <span>{t('classes.transferRequest', 'Yêu cầu chuyển lớp')}</span>
                              </DropdownMenuItem>

                              {!isTeacher && (
                                <DropdownMenuItem
                                  onClick={() => handleRemoveStudentFromClass(student)}
                                  className="flex items-center gap-2 h-8 px-2 text-[13px] text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer rounded-none"
                                >
                                  <HugeiconsIcon
                                    icon={Delete02Icon}
                                    size={14}
                                    className="text-destructive"
                                  />
                                  <span>{t('classes.removeFromClass', 'Gỡ khỏi lớp')}</span>
                                </DropdownMenuItem>
                              )}

                              <DropdownMenuItem
                                onClick={() => navigate(currentClass?.id ? `/classes/${currentClass.id}/students/${student.id}` : `/students/${student.id}`)}
                                className="flex items-center gap-2 h-8 px-2 text-[13px] cursor-pointer rounded-none"
                              >
                                <HugeiconsIcon
                                  icon={ViewIcon}
                                  size={14}
                                  className="text-muted-foreground"
                                />
                                <span>{t('common.viewDetails', 'Xem hồ sơ học sinh')}</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Note & Summary */}
            <div className="flex items-center justify-between text-[12px] text-muted-foreground pt-1">
              <span>
                {t('classes.studentAllocationRowHint', 'Bấm vào nút ... ở từng dòng để yêu cầu chuyển lớp hoặc xem hồ sơ chi tiết.')}
              </span>
              <span>
                {t('classes.totalStudentsCount', 'Tổng: {{count}} học sinh', { count: filteredRoster.length })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Slide-in Student Intake Drawer */}
      <StudentIntakeDrawer
        isOpen={isIntakeDrawerOpen}
        onClose={() => setIsIntakeDrawerOpen(false)}
        currentClass={currentClass}
        onSuccess={() => {
          fetchClassRoster();
          fetchGlobalClasses();
        }}
      />

      {/* Slide-in Create Transfer Request Drawer (for Teachers) */}
      <CreateTransferDrawer
        isOpen={!!transferStudent}
        onClose={() => setTransferStudent(null)}
        classId={currentClass.id}
        className={currentClass.name}
        initialStudentId={transferStudent?.id}
        onSuccess={() => {
          fetchClassRoster();
          fetchGlobalClasses();
        }}
      />
    </>
  );
}

export default ClassStudentAllocation;
