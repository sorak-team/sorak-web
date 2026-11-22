import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  MoreHorizontalIcon,
  ViewIcon,
  PencilEdit02Icon,
  Delete02Icon,
} from '@hugeicons/core-free-icons';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useTeacherStore, getTeacherAvatarUrl } from '../teachers.store';
import { useAuthStore } from '@/features/auth';
import { cn } from '@/shared/lib/utils';

export function TeacherTable({ paginatedTeachers }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const currentUser = useAuthStore((state) => state.user);

  const isTeacherSelf = (teacher) => {
    if (!currentUser || !teacher) return false;
    if (teacher.id && currentUser.teacherId && String(teacher.id) === String(currentUser.teacherId)) return true;
    if (teacher.id && currentUser.teacher?.id && String(teacher.id) === String(currentUser.teacher.id)) return true;
    if (teacher.employeeCode && currentUser.employeeCode && teacher.employeeCode.toLowerCase() === currentUser.employeeCode.toLowerCase()) return true;
    if (teacher.email && currentUser.email && teacher.email.toLowerCase() === currentUser.email.toLowerCase()) return true;
    if (teacher.accountId && currentUser.id && String(teacher.accountId) === String(currentUser.id)) return true;
    return false;
  };

  const visibleColumns = useTeacherStore((state) => state.visibleColumns);
  const isLoading = useTeacherStore((state) => state.isLoading);
  const openEditDrawer = useTeacherStore((state) => state.openEditDrawer);
  const openDeleteDialog = useTeacherStore((state) => state.openDeleteDialog);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center justify-center px-2 py-0.5 text-[12px] font-medium bg-secondary text-secondary-foreground rounded-none">
            {t('teacher.statusActive', 'Đang công tác')}
          </span>
        );
      case 'on_leave':
        return (
          <span className="inline-flex items-center justify-center px-2 py-0.5 text-[12px] font-medium bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 rounded-none">
            {t('teacher.statusOnLeave', 'Tạm nghỉ')}
          </span>
        );
      case 'resigned':
        return (
          <span className="inline-flex items-center justify-center px-2 py-0.5 text-[12px] font-medium bg-muted text-muted-foreground rounded-none">
            {t('teacher.statusResigned', 'Đã nghỉ việc')}
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

  if (!paginatedTeachers || paginatedTeachers.length === 0) {
    return (
      <div className="w-full border border-border bg-card p-12 text-center text-muted-foreground rounded-none">
        <p className="text-[14px]">{t('teacher.noTeacherFound', 'Không tìm thấy giáo viên nào phù hợp.')}</p>
      </div>
    );
  }

  return (
    <div
      className="w-full border border-border bg-card rounded-none overflow-x-auto shadow-xs select-none"
      data-node-id="4275:7009"
      data-name="Teacher Table · Component-based"
    >
      <table className="w-full text-left border-collapse min-w-[900px]">
        {/* Table Header */}
        <thead>
          <tr className="h-10 border-b border-border bg-muted/30 text-[13px] font-medium text-foreground">
            <th className="px-3 min-w-[200px] font-medium">
              {t('teacher.colTeacher', 'Giáo viên')}
            </th>
            {visibleColumns.status && (
              <th className="px-3 min-w-[120px] font-medium">
                {t('teacher.colStatus', 'Công tác')}
              </th>
            )}
            {visibleColumns.email && (
              <th className="px-3 min-w-[160px] font-medium">
                {t('teacher.colEmail', 'Email')}
              </th>
            )}
            {visibleColumns.phone && (
              <th className="px-3 min-w-[110px] font-medium">
                {t('teacher.colPhone', 'SĐT')}
              </th>
            )}
            {visibleColumns.gender && (
              <th className="px-3 min-w-[80px] font-medium">
                {t('teacher.colGender', 'Giới tính')}
              </th>
            )}
            {visibleColumns.dob && (
              <th className="px-3 min-w-[100px] font-medium">
                {t('teacher.colDob', 'Ngày sinh')}
              </th>
            )}
            {visibleColumns.position && (
              <th className="px-3 min-w-[160px] font-medium">
                {t('teacher.colPosition', 'Chức vụ')}
              </th>
            )}
            {visibleColumns.joinDate && (
              <th className="px-3 min-w-[110px] font-medium">
                {t('teacher.colJoinDate', 'Ngày vào làm')}
              </th>
            )}
            <th className="px-3 min-w-[95px] w-[95px] text-right font-medium whitespace-nowrap">
              {t('teacher.colActions', 'Thao tác')}
            </th>
          </tr>
        </thead>

        {/* Table Body */}
        <tbody className="divide-y divide-border/60">
          {isLoading && paginatedTeachers.length === 0 ? (
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
                {visibleColumns.role && (
                  <td className="px-3"><div className="h-3.5 w-20 bg-muted/50 rounded-none" /></td>
                )}
                {visibleColumns.status && (
                  <td className="px-3"><div className="h-5 w-20 bg-muted/50 rounded-none" /></td>
                )}
                {visibleColumns.gender && (
                  <td className="px-3"><div className="h-3.5 w-10 bg-muted/50 rounded-none" /></td>
                )}
                {visibleColumns.phone && (
                  <td className="px-3"><div className="h-3.5 w-24 bg-muted/50 rounded-none" /></td>
                )}
                {visibleColumns.email && (
                  <td className="px-3"><div className="h-3.5 w-28 bg-muted/50 rounded-none" /></td>
                )}
                {visibleColumns.citizenId && (
                  <td className="px-3"><div className="h-3.5 w-24 bg-muted/50 rounded-none" /></td>
                )}
                {visibleColumns.joinDate && (
                  <td className="px-3"><div className="h-3.5 w-20 bg-muted/50 rounded-none" /></td>
                )}
                <td className="px-3 text-right">
                  <div className="size-7 bg-muted/40 rounded-none ml-auto" />
                </td>
              </tr>
            ))
          ) : paginatedTeachers.length === 0 ? (
            <tr>
              <td colSpan={9} className="py-12 text-center text-muted-foreground text-[13px]">
                {t('common.noData', 'Không có dữ liệu giáo viên')}
              </td>
            </tr>
          ) : (
            paginatedTeachers.map((teacher) => (
            <tr
              key={teacher.id}
              className="h-[72px] hover:bg-muted/40 transition-colors group cursor-default"
              data-node-id={`teacher-row-${teacher.id}`}
            >
              {/* Teacher Info (Avatar + Name + Role) */}
              <td className="px-3">
                <div
                  onClick={() => navigate(`/teachers/${teacher.id}`)}
                  className="flex items-center gap-3 cursor-pointer group/name"
                >
                  <div className="size-8 shrink-0 rounded-none overflow-hidden border border-border/80 bg-primary/10">
                    <img
                      src={getTeacherAvatarUrl(teacher.avatar, teacher.fullName)}
                      alt={teacher.fullName}
                      className="size-full object-cover"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = getTeacherAvatarUrl(null, teacher.fullName);
                      }}
                    />
                  </div>
                  <div className="flex flex-col min-w-0 leading-tight">
                    <span className="text-[14px] font-medium text-foreground group-hover/name:text-primary transition-colors truncate">
                      {teacher.fullName}
                    </span>
                    <span className="text-[12px] text-muted-foreground truncate">
                      {teacher.position || teacher.role || t('teacher.roleTeacher', 'Giáo viên')} · <span className="font-mono">{teacher.employeeCode || '—'}</span>
                      {teacher.account?.isDeleted && (
                        <span className="ml-1.5 text-[11px] text-amber-600 dark:text-amber-400 font-medium">{t('teacher.noLoginPermission', '(Chưa có quyền đăng nhập)')}</span>
                      )}
                    </span>
                  </div>
                </div>
              </td>

              {/* Status */}
              {visibleColumns.status && (
                <td className="px-3 whitespace-nowrap">
                  {getStatusBadge(teacher.status)}
                </td>
              )}

              {/* Email */}
              {visibleColumns.email && (
                <td className="px-3 text-[14px] text-foreground font-normal truncate max-w-[180px]">
                  {teacher.email || '—'}
                </td>
              )}

              {/* Phone */}
              {visibleColumns.phone && (
                <td className="px-3 text-[14px] text-foreground font-normal whitespace-nowrap">
                  {teacher.phone || '—'}
                </td>
              )}

              {/* Gender */}
              {visibleColumns.gender && (
                <td className="px-3 text-[14px] text-foreground font-normal whitespace-nowrap">
                  {teacher.gender || '—'}
                </td>
              )}

              {/* DOB */}
              {visibleColumns.dob && (
                <td className="px-3 text-[14px] text-foreground font-normal whitespace-nowrap">
                  {teacher.dob || '—'}
                </td>
              )}

              {/* Position */}
              {visibleColumns.position && (
                <td className="px-3 text-[14px] text-foreground font-normal truncate max-w-[200px]">
                  {teacher.role || teacher.position || '—'}
                </td>
              )}

              {/* Join Date */}
              {visibleColumns.joinDate && (
                <td className="px-3 text-[14px] text-foreground font-normal whitespace-nowrap">
                  {teacher.joinDate || '—'}
                </td>
              )}

              {/* Actions Dropdown */}
              <td className="px-3 min-w-[95px] w-[95px] text-right whitespace-nowrap">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="size-7 inline-flex items-center justify-center rounded-none text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                      title={t('teacher.colActions', 'Thao tác')}
                      data-name="Actions · More"
                    >
                      <HugeiconsIcon icon={MoreHorizontalIcon} size={16} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-40 p-1 rounded-none border border-border bg-card shadow-xl z-50 text-foreground"
                    data-name="FE-03A2 · Teachers · Row Action Open"
                  >
                    <DropdownMenuItem
                      onClick={() => navigate(`/teachers/${teacher.id}`)}
                      className="flex items-center gap-2 h-8 px-2 text-[13px] cursor-pointer rounded-none hover:bg-muted/60"
                    >
                      <HugeiconsIcon icon={ViewIcon} size={15} />
                      <span>{t('teacher.actionView', 'Xem chi tiết')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => openEditDrawer(teacher.id)}
                      className="flex items-center gap-2 h-8 px-2 text-[13px] cursor-pointer rounded-none hover:bg-muted/60"
                    >
                      <HugeiconsIcon icon={PencilEdit02Icon} size={15} />
                      <span>{t('teacher.actionEdit', 'Chỉnh sửa')}</span>
                    </DropdownMenuItem>
                    {!isTeacherSelf(teacher) && !teacher.isDeleted && (
                      <>
                        <DropdownMenuSeparator className="my-1 border-t border-border" />
                        <DropdownMenuItem
                          onClick={() => openDeleteDialog(teacher.id)}
                          className="flex items-center gap-2 h-8 px-2 text-[13px] text-destructive hover:text-destructive hover:bg-destructive/10 focus:text-destructive focus:bg-destructive/10 cursor-pointer rounded-none"
                        >
                          <HugeiconsIcon icon={Delete02Icon} size={15} />
                          <span>{t('teacher.actionDelete', 'Xóa')}</span>
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </td>
            </tr>
          ))
        )}
        </tbody>
      </table>
    </div>
  );
}
