import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  MoreHorizontalIcon,
  ViewIcon,
  Settings01Icon,
  Delete02Icon,
  Edit02Icon,
} from '@hugeicons/core-free-icons';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useClassesStore } from '../classes.store';
import { ClassVisual } from './ClassVisual';

export function ClassTable({ classes, isYearCompleted = false }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const attachClass = useClassesStore((state) => state.attachClass);
  const openEditDrawer = useClassesStore((state) => state.openEditDrawer);
  const openDeleteModal = useClassesStore((state) => state.openDeleteModal);

  const handleRowClick = (cls) => {
    attachClass(cls.id);
    navigate(`/classes/${cls.id}`);
  };

  if (!classes || classes.length === 0) {
    return (
      <div className="w-full border border-border bg-card p-12 text-center text-muted-foreground rounded-none">
        <p className="text-[14px]">{t('classes.noClassMatch', 'Không tìm thấy lớp học nào phù hợp.')}</p>
      </div>
    );
  }

  return (
    <div
      className="w-full border border-border bg-card rounded-none overflow-x-auto shadow-xs select-none"
      data-name="Classrooms Table View"
    >
      <table className="w-full text-left border-collapse min-w-[850px]">
        {/* Table Header */}
        <thead>
          <tr className="h-10 border-b border-border bg-muted/30 text-[13px] font-medium text-foreground">
            <th className="px-3 min-w-[220px] font-medium">
              {t('classes.colClass', 'Lớp học')}
            </th>
            <th className="px-3 min-w-[140px] font-medium">
              {t('classes.colGrade', 'Khối')}
            </th>
            <th className="px-3 min-w-[180px] font-medium">
              {t('classes.colTeacher', 'Giáo viên phụ trách')}
            </th>
            <th className="px-3 min-w-[120px] font-medium">
              {t('classes.colRoom', 'Phòng học')}
            </th>
            <th className="px-3 min-w-[140px] font-medium">
              {t('classes.colStudents', 'Sĩ số')}
            </th>
            <th className="px-3 min-w-[95px] w-[95px] text-right font-medium whitespace-nowrap">
              {t('common.actions', 'Thao tác')}
            </th>
          </tr>
        </thead>

        {/* Table Body */}
        <tbody>
          {classes.map((cls) => (
            <tr
              key={cls.id}
              onClick={() => handleRowClick(cls)}
              className="h-14 border-b border-border hover:bg-muted/30 transition-colors text-[13px] cursor-pointer group"
            >
              {/* Lớp học */}
              <td className="px-3">
                <div className="flex items-center gap-3">
                  <ClassVisual
                    color={cls.color}
                    grade={cls.grade || cls.ageGroup}
                    src={cls.avatarUrl}
                    size={36}
                    className="border border-border/80 group-hover:scale-105 transition-transform"
                    alt={cls.name}
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="font-medium text-foreground group-hover:text-primary transition-colors truncate">
                      {cls.name}
                    </span>
                    <span className="text-[12px] text-muted-foreground truncate">
                      {cls.academicYear}
                    </span>
                  </div>
                </div>
              </td>

              {/* Khối */}
              <td className="px-3 text-foreground font-normal">
                <span className="inline-flex items-center px-2 py-0.5 rounded-none text-[12px] font-normal bg-muted border border-border">
                  {cls.gradeLabel}
                </span>
              </td>

              {/* Giáo viên */}
              <td className="px-3 text-foreground font-normal">
                {cls.teacher}
              </td>

              {/* Phòng học */}
              <td className="px-3 text-muted-foreground font-normal">
                {cls.room}
              </td>

              {/* Sĩ số */}
              <td className="px-3 text-foreground font-normal">
                <span className="font-medium">{cls.studentCount}</span>
                <span className="text-muted-foreground"> {t('classes.studentsSuffix', 'học sinh')}</span>
              </td>

              {/* Actions Dropdown */}
              <td
                className="px-3 min-w-[95px] w-[95px] text-right whitespace-nowrap"
                onClick={(e) => e.stopPropagation()}
              >
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
                      onClick={() => {
                        attachClass(cls.id);
                        navigate(`/classes/${cls.id}`);
                      }}
                      className="flex items-center gap-2 h-8 px-2 text-[13px] cursor-pointer rounded-none hover:bg-muted/60"
                    >
                      <HugeiconsIcon icon={ViewIcon} size={15} />
                      <span>{t('classes.actionView', 'Xem chi tiết')}</span>
                    </DropdownMenuItem>

                    {!isYearCompleted && (
                      <DropdownMenuItem
                        onClick={() => {
                          openEditDrawer(cls.id);
                        }}
                        className="flex items-center gap-2 h-8 px-2 text-[13px] cursor-pointer rounded-none hover:bg-muted/60"
                      >
                        <HugeiconsIcon icon={Edit02Icon} size={15} />
                        <span>{t('classes.actionEdit', 'Chỉnh sửa')}</span>
                      </DropdownMenuItem>
                    )}

                    <DropdownMenuItem
                      onClick={() => {
                        attachClass(cls.id);
                        navigate(`/classes/${cls.id}/settings`);
                      }}
                      className="flex items-center gap-2 h-8 px-2 text-[13px] cursor-pointer rounded-none hover:bg-muted/60"
                    >
                      <HugeiconsIcon icon={Settings01Icon} size={15} />
                      <span>{t('classes.actionSettings', 'Quản lý lớp')}</span>
                    </DropdownMenuItem>

                    {!isYearCompleted && (
                      <>
                        <DropdownMenuSeparator className="my-1 border-t border-border" />
                        <DropdownMenuItem
                          onClick={() => openDeleteModal(cls)}
                          className="flex items-center gap-2 h-8 px-2 text-[13px] text-destructive hover:text-destructive hover:bg-destructive/10 focus:text-destructive focus:bg-destructive/10 cursor-pointer rounded-none"
                        >
                          <HugeiconsIcon icon={Delete02Icon} size={15} />
                          <span>{t('classes.actionDelete', 'Xóa lớp')}</span>
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
