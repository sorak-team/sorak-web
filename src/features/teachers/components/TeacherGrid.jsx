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
import { cn } from '@/shared/lib/utils';

export function TeacherGrid({ paginatedTeachers }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const isLoading = useTeacherStore((state) => state.isLoading);
  const openEditDrawer = useTeacherStore((state) => state.openEditDrawer);
  const openDeleteDialog = useTeacherStore((state) => state.openDeleteDialog);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center px-2 py-0.5 text-[12px] font-medium bg-secondary text-secondary-foreground rounded-none">
            {t('teacher.statusActive', 'Đang công tác')}
          </span>
        );
      case 'on_leave':
        return (
          <span className="inline-flex items-center px-2 py-0.5 text-[12px] font-medium bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 rounded-none">
            {t('teacher.statusOnLeave', 'Tạm nghỉ')}
          </span>
        );
      case 'resigned':
        return (
          <span className="inline-flex items-center px-2 py-0.5 text-[12px] font-medium bg-muted text-muted-foreground rounded-none">
            {t('teacher.statusResigned', 'Đã nghỉ việc')}
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

  if (!paginatedTeachers || paginatedTeachers.length === 0) {
    return (
      <div className="w-full border border-border bg-card p-12 text-center text-muted-foreground rounded-none">
        <p className="text-[14px]">Không tìm thấy giáo viên nào phù hợp.</p>
      </div>
    );
  }

  return (
    <div
      className="grid grid-cols-1 md:grid-cols-2 gap-4 select-none"
      data-node-id="teacher-grid"
      data-name="Teacher Grid"
    >
      {isLoading && paginatedTeachers.length === 0 ? (
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
      ) : paginatedTeachers.length === 0 ? (
        <div className="col-span-full py-12 text-center text-muted-foreground text-[13px]">
          {t('common.noData', 'Không có dữ liệu giáo viên')}
        </div>
      ) : (
        paginatedTeachers.map((teacher) => (
        <div
          key={teacher.id}
          className="border border-border bg-card p-5 rounded-none shadow-xs hover:border-border/90 transition-all flex flex-col justify-between gap-4 group"
          data-node-id={`teacher-card-${teacher.id}`}
        >
          {/* Top Section: Avatar + Name & Email */}
          <div
            onClick={() => navigate(`/teachers/${teacher.id}`)}
            className="flex items-center gap-3.5 cursor-pointer"
          >
            <div className="size-12 rounded-none overflow-hidden border border-border/80 bg-primary/10 shrink-0">
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
              <span className="text-[15px] font-medium text-foreground group-hover:text-primary transition-colors truncate">
                {teacher.fullName}
              </span>
              <span className="text-[12px] text-muted-foreground truncate">
                {teacher.position || teacher.role || t('teacher.roleTeacher', 'Giáo viên')} · <span className="font-mono">{teacher.employeeCode || '—'}</span>
              </span>
            </div>
          </div>

          {/* Badges: Status, Gender, Phone */}
          <div className="flex items-center gap-2 flex-wrap">
            {getStatusBadge(teacher.status)}
            <span className="inline-flex items-center px-2 py-0.5 text-[12px] font-medium bg-muted text-foreground border border-border/60 rounded-none">
              {teacher.gender}
            </span>
            {teacher.phone && (
              <span className="text-[12px] text-muted-foreground font-mono">
                {teacher.phone}
              </span>
            )}
          </div>

          <div className="h-px bg-border/60" />

          {/* Bottom Meta & Actions */}
          <div className="flex items-center justify-between gap-2 pt-1 text-[13px]">
            <div className="flex flex-col leading-tight min-w-0">
              <span className="text-[11px] text-muted-foreground">
                {t('teacher.colPosition', 'Chức vụ')}
              </span>
              <span className="text-[13px] font-medium text-foreground truncate max-w-[220px]">
                {teacher.role || teacher.position || '-'}
              </span>
            </div>

            <div className="flex flex-col leading-tight">
              <span className="text-[11px] text-muted-foreground">
                {t('teacher.colJoinDate', 'Ngày vào')}
              </span>
              <span className="text-[13px] text-foreground font-normal">
                {teacher.joinDate || '-'}
              </span>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="size-7 inline-flex items-center justify-center rounded-none text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                  title={t('teacher.actions', 'Thao tác')}
                >
                  <HugeiconsIcon icon={MoreHorizontalIcon} size={16} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-40 p-1 rounded-none border border-border bg-card shadow-xl z-50 text-foreground"
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
                <DropdownMenuSeparator className="my-1 border-t border-border" />
                <DropdownMenuItem
                  onClick={() => openDeleteDialog(teacher.id)}
                  className="flex items-center gap-2 h-8 px-2 text-[13px] cursor-pointer rounded-none hover:bg-destructive/10 text-destructive focus:bg-destructive/10 focus:text-destructive"
                >
                  <HugeiconsIcon icon={Delete02Icon} size={15} />
                  <span>{t('teacher.actionDelete', 'Xóa')}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      ))
    )}
    </div>
  );
}
