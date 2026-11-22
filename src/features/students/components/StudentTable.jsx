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

export function StudentTable({ paginatedStudents, hideClassColumn = false, classId = null }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const isTeacher = user?.role === 'TEACHER_GV' || user?.role === 'TEACHER' || user?.role === 'teacher';

  const visibleColumns = useStudentStore((state) => state.visibleColumns);
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
      if (s === 'COMPLETED') return { status: 'completed', reason: enr.leaveReason || t('student.reasonCompletedYear', 'Hoàn thành năm học') };
      if (s === 'GRADUATED') return { status: 'graduated', reason: enr.leaveReason || t('student.statusGraduated', 'Đã tốt nghiệp') };
      if (s === 'TRANSFERRED_CLASS') return { status: 'transferred_class', reason: enr.leaveReason || t('student.transferClass', 'Chuyển lớp') };
      if (s === 'TRANSFERRED_SCHOOL') return { status: 'transferred', reason: enr.leaveReason || t('student.statusTransferred', 'Chuyển trường') };
      if (s === 'RESERVED') return { status: 'reserved', reason: enr.leaveReason || t('student.statusReserved', 'Bảo lưu') };
      if (s === 'DROPPED_OUT') return { status: 'dropped_out', reason: enr.leaveReason || t('student.statusDroppedOut', 'Thôi học') };
    }
    return { status: student.status || 'studying', reason: null };
  };

  const getStatusBadge = (statusObj) => {
    const status = typeof statusObj === 'object' && statusObj !== null ? statusObj.status : statusObj;
    const reason = typeof statusObj === 'object' && statusObj !== null ? statusObj.reason : null;

    switch (status) {
      case 'studying':
        return (
          <span className="inline-flex items-center justify-center px-2 py-0.5 text-[12px] font-medium bg-secondary text-secondary-foreground rounded-none">
            {t('student.statusStudying', 'Đang học')}
          </span>
        );
      case 'completed':
        return (
          <span
            title={reason || undefined}
            className="inline-flex items-center justify-center px-2 py-0.5 text-[12px] font-medium bg-blue-100 text-blue-900 dark:bg-blue-950/60 dark:text-blue-300 rounded-none cursor-default"
          >
            {t('student.statusCompleted', 'Hoàn thành')}
          </span>
        );
      case 'graduated':
        return (
          <span
            title={reason || undefined}
            className="inline-flex items-center justify-center px-2 py-0.5 text-[12px] font-medium bg-purple-100 text-purple-900 dark:bg-purple-950/60 dark:text-purple-300 rounded-none cursor-default"
          >
            {t('student.statusGraduated', 'Đã tốt nghiệp')}
          </span>
        );
      case 'transferred_class':
        return (
          <span
            title={reason || undefined}
            className="inline-flex items-center justify-center px-2 py-0.5 text-[12px] font-medium bg-cyan-100 text-cyan-900 dark:bg-cyan-950/60 dark:text-cyan-300 rounded-none cursor-default"
          >
            {t('student.statusTransferredClass', 'Đã chuyển lớp')}
          </span>
        );
      case 'transferred':
        return (
          <span
            title={reason || undefined}
            className="inline-flex items-center justify-center px-2 py-0.5 text-[12px] font-medium bg-indigo-100 text-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-300 rounded-none cursor-default"
          >
            {t('student.statusTransferred', 'Chuyển trường')}
          </span>
        );
      case 'reserved':
        return (
          <span
            title={reason || undefined}
            className="inline-flex items-center justify-center px-2 py-0.5 text-[12px] font-medium bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 rounded-none cursor-default"
          >
            {t('student.statusReserved', 'Bảo lưu')}
          </span>
        );
      case 'dropped_out':
        return (
          <span
            title={reason || undefined}
            className="inline-flex items-center justify-center px-2 py-0.5 text-[12px] font-medium bg-muted text-muted-foreground rounded-none cursor-default"
          >
            {t('student.statusDroppedOut', 'Thôi học')}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center justify-center px-2 py-0.5 text-[12px] font-medium bg-muted text-muted-foreground rounded-none">
            {status}
          </span>
        );
    }
  };


  if (!isLoading && (!paginatedStudents || paginatedStudents.length === 0)) {
    return (
      <div className="w-full border border-border bg-card p-12 text-center text-muted-foreground rounded-none">
        <p className="text-[14px]">{t('student.notFound', 'Không tìm thấy học sinh nào phù hợp.')}</p>
      </div>
    );
  }

  return (
    <div
      className="w-full border border-border bg-card rounded-none overflow-x-auto shadow-xs select-none"
      data-name="Student Table · Component-based"
    >
      <table className="w-full text-left border-collapse min-w-[900px]">
        {/* Table Header matching TeacherTable */}
        <thead>
          <tr className="h-10 border-b border-border bg-muted/30 text-[13px] font-medium text-foreground">
            <th className="px-3 min-w-[220px] font-medium">
              {t('student.colStudent', 'Học sinh')}
            </th>
            {visibleColumns.currentClass && !hideClassColumn && (
              <th className="px-3 min-w-[120px] font-medium">
                {t('student.colClass', 'Lớp học')}
              </th>
            )}
            {visibleColumns.status && (
              <th className="px-3 min-w-[110px] font-medium">
                {classId
                  ? t('student.colClassStatus', 'Trạng thái tại lớp')
                  : t('student.colGlobalStatus', 'Trạng thái tại trường')}
              </th>
            )}
            {visibleColumns.gender && (
              <th className="px-3 min-w-[80px] font-medium">
                {t('student.colGender', 'Giới tính')}
              </th>
            )}
            {visibleColumns.age && (
              <th className="px-3 min-w-[140px] font-medium">
                {t('student.colDob', 'Ngày sinh')}
              </th>
            )}
            {visibleColumns.joinDate && (
              <th className="px-3 min-w-[120px] font-medium">
                {classId
                  ? t('student.colClassEnrolledAt', 'Ngày vào lớp')
                  : t('student.colJoinDate', 'Ngày nhập học')}
              </th>
            )}
            {classId && visibleColumns.leftAt && (
              <th className="px-3 min-w-[120px] font-medium">
                {t('student.colClassLeftAt', 'Ngày rời lớp')}
              </th>
            )}
            {visibleColumns.notes && (
              <th className="px-3 min-w-[180px] font-medium">
                {t('student.colPreviousSchool', 'Trường cũ / Chuyển đến')}
              </th>
            )}
            <th className="px-3 min-w-[95px] w-[95px] text-right font-medium whitespace-nowrap">
              {t('common.actions', 'Thao tác')}
            </th>
          </tr>
        </thead>

        {/* Table Body matching TeacherTable */}
        <tbody className="divide-y divide-border/60">
          {isLoading && paginatedStudents.length === 0 ? (
            Array.from({ length: 5 }).map((_, idx) => (
              <tr key={idx} className="h-[72px] animate-pulse">
                <td className="px-3">
                  <div className="flex items-center gap-3">
                    <div className="size-8 bg-muted/60 rounded-none shrink-0" />
                    <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                      <div className="h-3.5 w-28 bg-muted/60 rounded-none" />
                      <div className="h-2.5 w-16 bg-muted/40 rounded-none" />
                    </div>
                  </div>
                </td>
                {visibleColumns.currentClass && !hideClassColumn && (
                  <td className="px-3"><div className="h-3.5 w-20 bg-muted/50 rounded-none" /></td>
                )}
                {visibleColumns.status && (
                  <td className="px-3"><div className="h-5 w-20 bg-muted/50 rounded-none" /></td>
                )}
                {visibleColumns.gender && (
                  <td className="px-3"><div className="h-3.5 w-10 bg-muted/50 rounded-none" /></td>
                )}
                {visibleColumns.age && (
                  <td className="px-3"><div className="h-3.5 w-24 bg-muted/50 rounded-none" /></td>
                )}
                {visibleColumns.joinDate && (
                  <td className="px-3"><div className="h-3.5 w-20 bg-muted/50 rounded-none" /></td>
                )}
                {classId && visibleColumns.leftAt && (
                  <td className="px-3"><div className="h-3.5 w-20 bg-muted/50 rounded-none" /></td>
                )}
                {visibleColumns.notes && (
                  <td className="px-3"><div className="h-3.5 w-28 bg-muted/50 rounded-none" /></td>
                )}
                <td className="px-3 text-right">
                  <div className="size-7 bg-muted/40 rounded-none ml-auto" />
                </td>
              </tr>
            ))
          ) : paginatedStudents.length === 0 ? (
            <tr>
              <td colSpan={classId && visibleColumns.leftAt ? 9 : 8} className="py-12 text-center text-muted-foreground text-[13px]">
                {t('common.noData', 'Không có dữ liệu')}
              </td>
            </tr>
          ) : (
            paginatedStudents.map((student) => {
            const classEnr = resolveStudentEnrollment(student);
            return (
              <tr
                key={student.id}
                className="h-[72px] hover:bg-muted/40 transition-colors group cursor-default"
                data-node-id={`student-row-${student.id}`}
              >
                {/* Student Info (Avatar + Name + Subtitle) */}
                <td className="px-3">
                  <div
                    onClick={() => navigate(classId ? `/classes/${classId}/students/${student.id}` : `/students/${student.id}`)}
                    className="flex items-center gap-3 cursor-pointer group/name"
                  >
                    <div className="size-8 shrink-0 rounded-none overflow-hidden border border-border/80 bg-muted/40">
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
                      <span className="text-[14px] font-medium text-foreground group-hover/name:text-primary transition-colors truncate">
                        {student.fullName}
                      </span>
                      <span className="text-[12px] text-muted-foreground truncate font-mono">
                        {student.studentCode || '—'}
                      </span>
                    </div>
                  </div>
                </td>

                {/* Current Class */}
                {visibleColumns.currentClass && !hideClassColumn && (
                  <td className="px-3 whitespace-nowrap">
                    {student.currentClass ? (
                      <span className="text-[14px] text-foreground font-normal">
                        {student.currentClass.className}
                      </span>
                    ) : (
                      <span className="text-[13px] text-muted-foreground italic">
                        {t('student.notAssigned', 'Chưa phân lớp')}
                      </span>
                    )}
                  </td>
                )}

                {/* Status Badge */}
                {visibleColumns.status && (
                  <td className="px-3 whitespace-nowrap">
                    {getStatusBadge(resolveStudentStatus(student))}
                  </td>
                )}

                {/* Gender */}
                {visibleColumns.gender && (
                  <td className="px-3 text-[14px] text-foreground font-normal whitespace-nowrap">
                    {student.gender || '—'}
                  </td>
                )}

                {/* Date of Birth */}
                {visibleColumns.age && (
                  <td className="px-3 text-[14px] text-foreground font-normal whitespace-nowrap">
                    {student.dob || '—'}
                  </td>
                )}

                {/* Join Date / Date Entered Class */}
                {visibleColumns.joinDate && (
                  <td className="px-3 text-[14px] text-foreground font-normal whitespace-nowrap">
                    {classId
                      ? (classEnr?.enrolledAt ? toDisplayDate(classEnr.enrolledAt) : (student.joinDate || '—'))
                      : (student.joinDate || '—')}
                  </td>
                )}

                {/* Left At / Date Left Class */}
                {classId && visibleColumns.leftAt && (
                  <td className="px-3 text-[14px] text-foreground font-normal whitespace-nowrap">
                    {classEnr?.leftAt ? (
                      <span
                        title={classEnr.leaveReason || undefined}
                        className={classEnr.leaveReason ? 'cursor-help border-b border-dashed border-muted-foreground/60' : ''}
                      >
                        {toDisplayDate(classEnr.leftAt)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                )}

                {/* Notes */}
                {visibleColumns.notes && (
                  <td
                    className="px-3 text-[13px] text-muted-foreground truncate max-w-[180px]"
                    title={student.previousSchool || student.notes}
                  >
                    {student.previousSchool || student.notes || '—'}
                  </td>
                )}

                {/* Actions Dropdown matching TeacherTable */}
                <td className="px-3 min-w-[95px] w-[95px] text-right whitespace-nowrap">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="size-7 inline-flex items-center justify-center rounded-none text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
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
                          title={student.status === 'graduated' ? t('student.graduatedCannotEdit', 'Học sinh đã tốt nghiệp, không thể chỉnh sửa') : undefined}
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
                            className="flex items-center gap-2 h-8 px-2 text-[13px] text-destructive hover:text-destructive hover:bg-destructive/10 focus:text-destructive focus:bg-destructive/10 cursor-pointer rounded-none"
                          >
                            <HugeiconsIcon icon={Delete02Icon} size={15} />
                            <span>{t('common.delete', 'Xóa')}</span>
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            );
          })
        )}
        </tbody>
      </table>
    </div>
  );
}

export default StudentTable;
