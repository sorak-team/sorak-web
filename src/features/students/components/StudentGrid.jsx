import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  MoreHorizontalIcon,
  ViewIcon,
  DashboardSquare01Icon,
  PencilEdit02Icon,
  ArrowDataTransferHorizontalIcon,
  Delete02Icon,
} from '@hugeicons/core-free-icons';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useStudentStore, getStudentAvatarUrl, toDisplayDate } from '../students.store';
import { useAuthStore } from '@/features/auth';
import { cn } from '@/shared/lib/utils';

export function StudentGrid({ paginatedStudents, classId = null }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const isTeacher = user?.role === 'TEACHER_GV' || user?.role === 'TEACHER' || user?.role === 'teacher';

  const isLoading = useStudentStore((state) => state.isLoading);
  const openEditDrawer = useStudentStore((state) => state.openEditDrawer);
  const openDeleteDialog = useStudentStore((state) => state.openDeleteDialog);
  const openTransferDialog = useStudentStore((state) => state.openTransferDialog);

  const resolveStudentEnrollment = (student) => {
    if (!classId) return null;
    return (student.enrollmentHistory || []).find((e) => String(e.classId) === String(classId)) || null;
  };

  const resolveStudentStatus = (student) => {
    if (!classId) return { status: student.status, reason: null };
    const enr = resolveStudentEnrollment(student);
    if (enr?.status) {
      const s = String(enr.status).toUpperCase();
      if (s === 'ENROLLED') return { status: 'studying', reason: null };
      if (s === 'COMPLETED') return { status: 'completed', reason: enr.leaveReason || 'Hoàn thành năm học' };
      if (s === 'GRADUATED') return { status: 'graduated', reason: enr.leaveReason || 'Đã tốt nghiệp' };
      if (s === 'TRANSFERRED_CLASS') return { status: 'transferred_class', reason: enr.leaveReason || 'Chuyển lớp' };
      if (s === 'TRANSFERRED_SCHOOL') return { status: 'transferred', reason: enr.leaveReason || 'Chuyển trường' };
      if (s === 'RESERVED') return { status: 'reserved', reason: enr.leaveReason || 'Bảo lưu' };
      if (s === 'DROPPED_OUT') return { status: 'dropped_out', reason: enr.leaveReason || 'Thôi học' };
    }
    return { status: student.status || 'studying', reason: null };
  };

  const getStatusBadge = (statusObj) => {
    const status = typeof statusObj === 'object' && statusObj !== null ? statusObj.status : statusObj;
    const reason = typeof statusObj === 'object' && statusObj !== null ? statusObj.reason : null;

    switch (status) {
      case 'studying':
        return (
          <span className="inline-flex items-center px-2 py-0.5 text-[12px] font-medium bg-secondary text-secondary-foreground rounded-none">
            {t('student.statusStudying', 'Đang học')}
          </span>
        );
      case 'completed':
        return (
          <span
            title={reason || undefined}
            className="inline-flex items-center px-2 py-0.5 text-[12px] font-medium bg-blue-100 text-blue-900 dark:bg-blue-950/60 dark:text-blue-300 rounded-none cursor-default"
          >
            {t('student.statusCompleted', 'Hoàn thành')}
          </span>
        );
      case 'graduated':
        return (
          <span
            title={reason || undefined}
            className="inline-flex items-center px-2 py-0.5 text-[12px] font-medium bg-purple-100 text-purple-900 dark:bg-purple-950/60 dark:text-purple-300 rounded-none cursor-default"
          >
            {t('student.statusGraduated', 'Đã tốt nghiệp')}
          </span>
        );
      case 'transferred_class':
        return (
          <span
            title={reason || undefined}
            className="inline-flex items-center px-2 py-0.5 text-[12px] font-medium bg-cyan-100 text-cyan-900 dark:bg-cyan-950/60 dark:text-cyan-300 rounded-none cursor-default"
          >
            {t('student.statusTransferredClass', 'Đã chuyển lớp')}
          </span>
        );
      case 'transferred':
        return (
          <span
            title={reason || undefined}
            className="inline-flex items-center px-2 py-0.5 text-[12px] font-medium bg-indigo-100 text-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-300 rounded-none cursor-default"
          >
            {t('student.statusTransferred', 'Chuyển trường')}
          </span>
        );
      case 'reserved':
        return (
          <span
            title={reason || undefined}
            className="inline-flex items-center px-2 py-0.5 text-[12px] font-medium bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 rounded-none cursor-default"
          >
            {t('student.statusReserved', 'Bảo lưu')}
          </span>
        );
      case 'dropped_out':
        return (
          <span
            title={reason || undefined}
            className="inline-flex items-center px-2 py-0.5 text-[12px] font-medium bg-muted text-muted-foreground rounded-none cursor-default"
          >
            {t('student.statusDroppedOut', 'Thôi học')}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 text-[12px] font-medium bg-muted text-muted-foreground rounded-none">
            {status}
          </span>
        );
    }
  };

  if (!isLoading && (!paginatedStudents || paginatedStudents.length === 0)) {
    return (
      <div className="w-full border border-border bg-card p-12 text-center text-muted-foreground rounded-none">
        <p className="text-[14px]">Không tìm thấy học sinh nào phù hợp.</p>
      </div>
    );
  }

  return (
    <div
      className="grid grid-cols-1 md:grid-cols-2 gap-4 select-none"
      data-name="Student Grid"
    >
      {isLoading && paginatedStudents.length === 0 ? (
        Array.from({ length: 6 }).map((_, idx) => (
          <div key={idx} className="border border-border bg-card p-5 rounded-none shadow-xs animate-pulse flex flex-col justify-between gap-4 h-[180px]">
            <div className="flex items-center gap-3.5">
              <div className="size-12 rounded-none bg-muted/60 shrink-0" />
              <div className="flex flex-col gap-2 flex-1">
                <div className="h-4 w-32 bg-muted/60 rounded-none" />
                <div className="h-3 w-20 bg-muted/40 rounded-none" />
              </div>
            </div>
            <div className="h-6 w-24 bg-muted/50 rounded-none" />
          </div>
        ))
      ) : paginatedStudents.length === 0 ? (
        <div className="col-span-full py-12 text-center text-muted-foreground text-[13px]">
          {t('common.noData', 'Không có dữ liệu học sinh')}
        </div>
      ) : (
        paginatedStudents.map((student) => {
          const classEnr = resolveStudentEnrollment(student);
          return (
            <div
              key={student.id}
              className="border border-border bg-card p-5 rounded-none shadow-xs hover:border-border/90 transition-all flex flex-col justify-between gap-4 group"
              data-node-id={`student-card-${student.id}`}
            >
              {/* Top Section: Avatar + Name & Subtitle matching TeacherGrid */}
              <div
                onClick={() => navigate(classId ? `/classes/${classId}/students/${student.id}` : `/students/${student.id}`)}
                className="flex items-center gap-3.5 cursor-pointer"
              >
                <div className="size-12 rounded-none overflow-hidden border border-border/80 bg-muted/40 shrink-0">
                  <img
                    src={getStudentAvatarUrl(student.avatar, student.studentCode || student.fullName)}
                    alt={student.fullName}
                    className="size-full object-cover"
                    onError={(e) => {
                      e.target.src = getStudentAvatarUrl(null, student.studentCode || student.fullName);
                    }}
                  />
                </div>
                <div className="flex flex-col min-w-0 leading-tight">
                  <span className="text-[15px] font-medium text-foreground group-hover:text-primary transition-colors truncate">
                    {student.fullName}
                  </span>
                  <span className="text-[12px] text-muted-foreground truncate">
                    {student.studentCode ? `${student.studentCode} · ` : ''}
                    {student.currentClass?.className || 'Chưa phân lớp'}
                  </span>
                </div>
              </div>

              {/* Badges: Status & Gender & DOB */}
              <div className="flex items-center gap-2 flex-wrap">
                {getStatusBadge(resolveStudentStatus(student))}
                <span className="inline-flex items-center px-2 py-0.5 text-[12px] font-medium bg-muted text-foreground border border-border/60 rounded-none">
                  {student.gender}
                </span>
                {student.dob && (
                  <span className="inline-flex items-center px-2 py-0.5 text-[12px] font-normal text-muted-foreground bg-muted/40 border border-border/40 rounded-none">
                    {student.dob}
                  </span>
                )}
              </div>

              <div className="h-px bg-border/60" />

              {/* Bottom Meta & Actions matching TeacherGrid */}
              <div className="flex items-center justify-between gap-2 pt-1 text-[13px]">
                {classId ? (
                  <>
                    <div className="flex flex-col leading-tight min-w-0">
                      <span className="text-[11px] text-muted-foreground">
                        {t('student.colClassEnrolledAt', 'Ngày vào lớp')}
                      </span>
                      <span className="text-[13px] font-medium text-foreground truncate">
                        {classEnr?.enrolledAt ? toDisplayDate(classEnr.enrolledAt) : (student.joinDate || '—')}
                      </span>
                    </div>

                    <div className="flex flex-col leading-tight min-w-0">
                      <span className="text-[11px] text-muted-foreground">
                        {t('student.colClassLeftAt', 'Ngày rời lớp')}
                      </span>
                      <span
                        className="text-[13px] text-foreground font-normal truncate"
                        title={classEnr?.leaveReason || undefined}
                      >
                        {classEnr?.leftAt ? toDisplayDate(classEnr.leftAt) : '—'}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex flex-col leading-tight min-w-0">
                      <span className="text-[11px] text-muted-foreground">
                        {t('student.colClass', 'Lớp học')}
                      </span>
                      <span className="text-[13px] font-medium text-foreground truncate max-w-[200px]">
                        {student.currentClass?.className || 'Chưa phân lớp'}
                      </span>
                    </div>

                    <div className="flex flex-col leading-tight">
                      <span className="text-[11px] text-muted-foreground">
                        {t('student.colJoinDate', 'Ngày nhập học')}
                      </span>
                      <span className="text-[13px] text-foreground font-normal">
                        {student.joinDate || '—'}
                      </span>
                    </div>
                  </>
                )}

            {/* Action Dropdown matching TeacherGrid */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="size-7 inline-flex items-center justify-center rounded-none text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                  title={t('common.actions', 'Thao tác')}
                >
                  <HugeiconsIcon icon={MoreHorizontalIcon} size={16} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-40 p-1 rounded-none border border-border bg-card shadow-xl z-50 text-foreground"
              >
                <DropdownMenuItem
                  onClick={() => navigate(classId ? `/classes/${classId}/students/${student.id}` : `/students/${student.id}`)}
                  className="flex items-center gap-2 h-8 px-2 text-[13px] cursor-pointer rounded-none hover:bg-muted/60"
                >
                  <HugeiconsIcon icon={ViewIcon} size={15} />
                  <span>{t('common.viewDetails', 'Xem chi tiết')}</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    const targetClassId = classId || student.currentClass?.classId || student.classId;
                    if (targetClassId) {
                      navigate(`/classes/${targetClassId}/students/${student.id}?tab=health`);
                    } else {
                      toast.info(t('student.noClassForReport', 'Học sinh chưa được phân lớp nên chưa có dữ liệu báo cáo'));
                    }
                  }}
                  className="flex items-center gap-2 h-8 px-2 text-[13px] cursor-pointer rounded-none hover:bg-muted/60"
                >
                  <HugeiconsIcon icon={DashboardSquare01Icon} size={15} />
                  <span>{t('classes.reports', 'Xem báo cáo')}</span>
                </DropdownMenuItem>
                {!isTeacher && (
                  <DropdownMenuItem
                    disabled={student.status === 'graduated'}
                    onClick={() => {
                      if (student.status === 'graduated') return;
                      openEditDrawer(student.id);
                    }}
                    className={cn(
                      'flex items-center gap-2 h-8 px-2 text-[13px] cursor-pointer rounded-none hover:bg-muted/60',
                      student.status === 'graduated' && 'opacity-40 cursor-not-allowed hover:bg-transparent'
                    )}
                    title={student.status === 'graduated' ? 'Học sinh đã tốt nghiệp, không thể chỉnh sửa' : undefined}
                  >
                    <HugeiconsIcon icon={PencilEdit02Icon} size={15} />
                    <span>{t('common.edit', 'Chỉnh sửa')}</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => openTransferDialog(student)}
                  className="flex items-center gap-2 h-8 px-2 text-[13px] cursor-pointer rounded-none hover:bg-muted/60"
                >
                  <HugeiconsIcon icon={ArrowDataTransferHorizontalIcon} size={15} />
                  <span>{t('student.transferRequestAction', 'Yêu cầu chuyển lớp')}</span>
                </DropdownMenuItem>
                {!isTeacher && (
                  <>
                    <DropdownMenuSeparator className="my-1 border-t border-border" />
                    <DropdownMenuItem
                      onClick={() => openDeleteDialog(student)}
                      className="flex items-center gap-2 h-8 px-2 text-[13px] cursor-pointer rounded-none hover:bg-destructive/10 text-destructive focus:bg-destructive/10 focus:text-destructive"
                    >
                      <HugeiconsIcon icon={Delete02Icon} size={15} />
                      <span>{t('common.delete', 'Xóa')}</span>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
          );
        })
    )}
    </div>
  );
}

export default StudentGrid;
