import React, { useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  PencilEdit02Icon,
  Delete02Icon,
  Upload01Icon,
  ArrowReloadHorizontalIcon,
} from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { useTeacherStore, getTeacherAvatarUrl, transformBackendTeacher } from './teachers.store';
import { teachersApi } from './teachers.api';
import { TeacherDrawer } from './components/TeacherDrawer';
import { DeleteTeacherDialog } from './components/DeleteTeacherDialog';
import { uploadApi } from '@/shared/api/upload.api';
import { NotFoundPage } from '@/features/error';
import { cn } from '@/shared/lib/utils';

const toDisplayDate = (val) => {
  if (!val) return '—';
  if (typeof val === 'string' && val.includes('/')) return val;
  const d = new Date(val);
  if (isNaN(d.getTime())) return String(val);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

export function TeacherOverviewPage() {
  const { id } = useParams();

  if (id && /^\d+$/.test(String(id).trim())) {
    return <NotFoundPage />;
  }

  const navigate = useNavigate();
  const { t } = useTranslation();

  const teachers = useTeacherStore((state) => state.teachers);
  const isLoading = useTeacherStore((state) => state.isLoading);
  const fetchTeachers = useTeacherStore((state) => state.fetchTeachers);
  const updateTeacher = useTeacherStore((state) => state.updateTeacher);
  const openEditDrawer = useTeacherStore((state) => state.openEditDrawer);
  const openDeleteDialog = useTeacherStore((state) => state.openDeleteDialog);

  const fileInputRef = useRef(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [detailTeacher, setDetailTeacher] = useState(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  React.useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  React.useEffect(() => {
    if (!id) return;
    let cancelled = false;
    async function loadDetail() {
      setIsDetailLoading(true);
      try {
        const raw = await teachersApi.getById(id);
        if (!cancelled && raw) {
          setDetailTeacher(transformBackendTeacher(raw));
        }
      } catch (err) {
        console.warn('Failed to load teacher detail profile:', err);
      } finally {
        if (!cancelled) setIsDetailLoading(false);
      }
    }
    loadDetail();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const listTeacher = teachers.find((item) => item.id === id || item.employeeCode === id);
  const teacher = React.useMemo(() => {
    if (!detailTeacher) return listTeacher;
    if (!listTeacher) return detailTeacher;
    return {
      ...listTeacher,
      ...detailTeacher,
      assignedClasses:
        detailTeacher.assignedClasses?.length > 0
          ? detailTeacher.assignedClasses
          : listTeacher.assignedClasses || [],
      assignmentHistory: (() => {
        if (detailTeacher.assignmentHistory?.length > 0) return detailTeacher.assignmentHistory;
        if (listTeacher.assignmentHistory?.length > 0) return listTeacher.assignmentHistory;
        const classesToMap = detailTeacher.assignedClasses?.length > 0
          ? detailTeacher.assignedClasses
          : listTeacher.assignedClasses || [];
        return classesToMap.map((ac, idx) => ({
          allocationId: ac.allocationId || `alloc-${idx}`,
          classId: ac.classId,
          className: ac.className,
          schoolYear: ac.schoolYearName || ac.schoolYear || '2026-2027',
          assignedAtFormatted: ac.assignedAt ? toDisplayDate(ac.assignedAt) : '01/08/2026',
          leftAtFormatted: '—',
          isActive: true,
        }));
      })(),
    };
  }, [detailTeacher, listTeacher]);

  if ((isLoading || isDetailLoading) && !teacher) {
    return (
      <div className="flex flex-col gap-6 animate-pulse">
        <div className="h-28 border border-border bg-card p-6 rounded-none flex items-center gap-4">
          <div className="size-16 bg-muted/60 rounded-none shrink-0" />
          <div className="flex flex-col gap-2 flex-1">
            <div className="h-5 w-48 bg-muted/60 rounded-none" />
            <div className="h-3 w-32 bg-muted/40 rounded-none" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-64 border border-border bg-card rounded-none" />
          <div className="lg:col-span-2 h-64 border border-border bg-card rounded-none" />
        </div>
      </div>
    );
  }

  if (!teacher) {
    return <NotFoundPage />;
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center justify-center px-2.5 py-0.5 text-[12px] font-medium bg-secondary text-secondary-foreground rounded-none">
            {t('teacher.statusActive', 'Đang công tác')}
          </span>
        );
      case 'on_leave':
        return (
          <span className="inline-flex items-center justify-center px-2.5 py-0.5 text-[12px] font-medium bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 rounded-none">
            {t('teacher.statusOnLeave', 'Tạm nghỉ')}
          </span>
        );
      case 'resigned':
        return (
          <span className="inline-flex items-center justify-center px-2.5 py-0.5 text-[12px] font-medium bg-muted text-muted-foreground rounded-none">
            {t('teacher.statusResigned', 'Đã nghỉ việc')}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center justify-center px-2.5 py-0.5 text-[12px] font-medium bg-muted text-muted-foreground rounded-none">
            {status}
          </span>
        );
    }
  };

  const handleAvatarFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Kích thước ảnh tối đa là 2MB');
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const res = await uploadApi.uploadAvatar(file);
      if (res && res.url) {
        await updateTeacher(teacher.id, { avatar: res.url });
        toast.success(t('teacher.avatarUploadSuccess', 'Đã cập nhật ảnh đại diện giáo viên'));
      }
    } catch (err) {
      console.error('Avatar upload failed:', err);
      toast.error(err.response?.data?.message || err.message || 'Tải ảnh thất bại');
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleResetAvatar = async (e) => {
    e.stopPropagation();
    try {
      await updateTeacher(teacher.id, { avatar: '' });
      toast.info(t('teacher.avatarResetNotice', 'Đã đặt lại ảnh đại diện mặc định'));
    } catch (err) {
      console.error('Reset avatar failed:', err);
      toast.error('Đặt lại ảnh thất bại');
    }
  };

  return (
    <div
      className="w-full flex-1 flex flex-col gap-6 max-w-[1300px] mx-auto text-foreground select-none"
      data-node-id="4273:5564"
      data-name="FE-03B · Teacher · Overview"
    >
      {/* Staff Hero Card (Consistent with Academic Year Overview) */}
      <div
        className="border border-border bg-card p-5 sm:p-6 rounded-none flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs"
        data-node-id="4273:5599"
        data-name="Staff Hero · Refined"
      >
        <div className="flex items-center gap-4 sm:gap-5 min-w-0">
          <input
            type="file"
            ref={fileInputRef}
            accept="image/jpeg,image/png,image/webp"
            onChange={handleAvatarFileChange}
            className="hidden"
          />
          <div className="relative group size-16 rounded-none overflow-hidden border border-border/80 bg-primary/10 shrink-0">
            <img
              src={getTeacherAvatarUrl(teacher.avatar, teacher.fullName)}
              alt={teacher.fullName}
              className="size-full object-cover"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = getTeacherAvatarUrl(null, teacher.fullName);
              }}
            />
            {isUploadingAvatar ? (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white">
                <HugeiconsIcon icon={ArrowReloadHorizontalIcon} size={18} className="animate-spin" />
              </div>
            ) : (
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title={t('common.uploadAvatar', 'Tải ảnh lên')}
                  className="size-7 bg-white/20 hover:bg-white/35 text-white flex items-center justify-center rounded-none transition-colors cursor-pointer"
                >
                  <HugeiconsIcon icon={Upload01Icon} size={14} />
                </button>
                {teacher.avatar && !teacher.avatar.includes('api.dicebear.com') && (
                  <button
                    type="button"
                    onClick={handleResetAvatar}
                    title={t('common.resetAvatar', 'Đặt lại mặc định')}
                    className="size-7 bg-white/20 hover:bg-white/35 text-white flex items-center justify-center rounded-none transition-colors cursor-pointer"
                  >
                    <HugeiconsIcon icon={ArrowReloadHorizontalIcon} size={14} />
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col min-w-0 gap-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-[22px] font-semibold text-foreground tracking-tight leading-tight">
                {teacher.fullName}
              </h1>
              {getStatusBadge(teacher.status)}
            </div>
            <p className="text-[13px] text-muted-foreground font-normal truncate">
              {teacher.position || teacher.role || t('teacher.colTeacher', 'Cán bộ')} · <span className="font-mono">{teacher.employeeCode || '—'}</span>
              {teacher.email && ` · ${teacher.email}`}
            </p>
          </div>
        </div>

        {/* Action buttons (Edit & Delete) - Only ONE place on the page, like school year */}
        {!teacher.isDeleted && (
          <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => openEditDrawer(teacher.id)}
              className="size-8 rounded-none border border-border bg-background hover:bg-muted text-foreground cursor-pointer"
              title={t('teacher.actionEdit', 'Chỉnh sửa')}
              data-node-id="4273:5574"
              data-name="Edit"
            >
              <HugeiconsIcon icon={PencilEdit02Icon} size={15} />
            </Button>

            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => openDeleteDialog(teacher.id)}
              className="size-8 rounded-none border border-border bg-background hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 text-foreground cursor-pointer transition-colors"
              title={t('teacher.actionDelete', 'Xóa')}
              data-node-id="4277:28877"
              data-name="Delete"
            >
              <HugeiconsIcon icon={Delete02Icon} size={15} />
            </Button>
          </div>
        )}
      </div>

      {/* Account Overview Grid (Figma 4273:5606) */}
      <div
        className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start"
        data-node-id="4273:5606"
        data-name="Account Overview Grid"
      >
        {/* Card 1: Thông tin cá nhân (Figma 4273:5607) */}
        <div
          className="border border-border bg-card rounded-none overflow-hidden shadow-xs"
          data-node-id="4273:5607"
          data-name="Card · Thông tin cá nhân"
        >
          <div className="p-4 border-b border-border bg-muted/20">
            <h2 className="text-[14px] font-semibold text-foreground">
              {t('teacher.personalInfo', 'Thông tin cá nhân')}
            </h2>
            <p className="text-[12px] text-muted-foreground font-normal">
              {t('teacher.personalInfoSub', 'Thông tin cơ bản của giáo viên')}
            </p>
          </div>

          <div className="divide-y divide-border/60">
            {/* Họ tên */}
            <div className="flex items-center justify-between p-4 h-[52px]">
              <span className="text-[14px] text-foreground/80 font-normal">
                {t('teacher.fullName', 'Họ tên')}
              </span>
              <span className="text-[14px] text-foreground font-medium">
                {teacher.fullName}
              </span>
            </div>

            {/* Số CCCD / CMND */}
            <div className="flex items-center justify-between p-4 h-[52px]">
              <span className="text-[14px] text-foreground/80 font-normal">
                {t('teacher.citizenId', 'Số CCCD/CMND')}
              </span>
              <span className="inline-flex items-center justify-center px-2.5 py-0.5 text-[12px] font-mono font-medium bg-muted text-foreground rounded-none">
                {teacher.citizenId || '—'}
              </span>
            </div>

            {/* Email */}
            <div className="flex items-center justify-between p-4 h-[52px]">
              <span className="text-[14px] text-foreground/80 font-normal">
                {t('teacher.email', 'Email')}
              </span>
              <span className="text-[14px] text-foreground font-normal">
                {teacher.email || '—'}
              </span>
            </div>

            {/* SĐT */}
            <div className="flex items-center justify-between p-4 h-[52px]">
              <span className="text-[14px] text-foreground/80 font-normal">
                {t('teacher.phone', 'SĐT')}
              </span>
              <span className="inline-flex items-center justify-center px-2.5 py-0.5 text-[12px] font-mono font-medium bg-muted text-foreground rounded-none">
                {teacher.phone || '—'}
              </span>
            </div>

            {/* Giới tính */}
            <div className="flex items-center justify-between p-4 h-[52px]">
              <span className="text-[14px] text-foreground/80 font-normal">
                {t('teacher.gender', 'Giới tính')}
              </span>
              <span className="text-[14px] text-foreground font-medium">
                {teacher.gender || '—'}
              </span>
            </div>

            {/* Ngày sinh */}
            <div className="flex items-center justify-between p-4 h-[52px]">
              <span className="text-[14px] text-foreground/80 font-normal">
                {t('teacher.dob', 'Ngày sinh')}
              </span>
              <span className="text-[14px] text-foreground font-normal">
                {teacher.dob || '—'}
              </span>
            </div>

            {/* Địa chỉ thường trú */}
            <div className="flex items-center justify-between p-4 min-h-[52px]">
              <span className="text-[14px] text-foreground/80 font-normal shrink-0">
                {t('teacher.address', 'Địa chỉ')}
              </span>
              <span className="text-[14px] text-foreground font-normal text-right max-w-[280px]">
                {teacher.address || '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Thông tin công tác (Figma 4273:5621) */}
        <div
          className="border border-border bg-card rounded-none overflow-hidden shadow-xs"
          data-node-id="4273:5621"
          data-name="Card · Thông tin công tác"
        >
          <div className="p-4 border-b border-border bg-muted/20">
            <h2 className="text-[14px] font-semibold text-foreground">
              {t('teacher.workInfo', 'Thông tin công tác')}
            </h2>
            <p className="text-[12px] text-muted-foreground font-normal">
              {t(
                'teacher.workInfoSub',
                'Trình độ và thời gian làm việc tại Sorak',
              )}
            </p>
          </div>

          <div className="divide-y divide-border/60">
            {/* Mã giáo viên */}
            <div className="flex items-center justify-between p-4 h-[52px]">
              <span className="text-[14px] text-foreground/80 font-normal">
                {t('teacher.employeeCode', 'Mã giáo viên')}
              </span>
              <span className="inline-flex items-center justify-center px-2.5 py-0.5 text-[12px] font-mono font-medium bg-muted text-foreground rounded-none">
                {teacher.employeeCode || '—'}
              </span>
            </div>

            {/* Lớp phụ trách */}
            <div className="flex items-center justify-between p-4 min-h-[52px]">
              <span className="text-[14px] text-foreground/80 font-normal shrink-0">
                {t('teacher.assignedClasses', 'Lớp phụ trách')}
              </span>
              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                {teacher.assignedClasses && teacher.assignedClasses.length > 0 ? (
                  teacher.assignedClasses.map((ac, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center px-2.5 py-0.5 text-[12px] font-medium rounded-none bg-primary/10 text-primary border border-primary/20"
                    >
                      {ac.className}
                    </span>
                  ))
                ) : (
                  <span className="text-[13px] text-muted-foreground italic">
                    {t('teacher.unassigned', 'Chưa phân lớp')}
                  </span>
                )}
              </div>
            </div>

            {/* Công tác */}
            <div className="flex items-center justify-between p-4 h-[52px]">
              <span className="text-[14px] text-foreground/80 font-normal">
                {t('teacher.status', 'Công tác')}
              </span>
              <div>{getStatusBadge(teacher.status)}</div>
            </div>

            {/* Chức vụ */}
            <div className="flex items-center justify-between p-4 h-[52px]">
              <span className="text-[14px] text-foreground/80 font-normal">
                {t('teacher.position', 'Chức vụ')}
              </span>
              <span className="inline-flex items-center justify-center px-2.5 py-0.5 text-[12px] font-medium bg-secondary text-secondary-foreground rounded-none">
                {teacher.role || teacher.position || 'Giáo viên'}
              </span>
            </div>

            {/* Ngày vào làm */}
            <div className="flex items-center justify-between p-4 h-[52px]">
              <span className="text-[14px] text-foreground/80 font-normal">
                {t('teacher.joinDate', 'Ngày vào làm')}
              </span>
              <span className="text-[14px] text-foreground font-normal">
                {teacher.joinDate || '—'}
              </span>
            </div>

            {/* Tài khoản đăng nhập */}
            <div className="flex items-center justify-between p-4 min-h-[52px]">
              <span className="text-[14px] text-foreground/80 font-normal">
                Tài khoản đăng nhập
              </span>
              <span className="text-[13px] font-normal text-right">
                {teacher.account ? (
                  teacher.account.isDeleted ? (
                    <span className="text-amber-600 dark:text-amber-400 font-medium">
                      Đã xóa / Chưa có quyền đăng nhập
                    </span>
                  ) : (
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                      Đang hoạt động ({teacher.account.username})
                    </span>
                  )
                ) : (
                  <span className="text-muted-foreground">Chưa liên kết tài khoản</span>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Lịch sử phân công & giảng dạy */}
        <div className="lg:col-span-12 border border-border bg-card rounded-none overflow-hidden shadow-2xs">
          <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
            <div>
              <h3 className="text-[14px] font-semibold text-foreground">
                Lịch sử phân công & giảng dạy
              </h3>
              <p className="text-[12px] text-muted-foreground font-normal">
                Toàn bộ các lớp học và niên khóa giáo viên đã hoặc đang phụ trách
              </p>
            </div>
            <span className="text-[12px] font-mono text-muted-foreground">
              {teacher.assignmentHistory?.length || 0} bản ghi
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-border bg-muted/10 text-muted-foreground text-[11.5px] font-medium uppercase tracking-tight">
                  <th className="py-2.5 px-4">Lớp học</th>
                  <th className="py-2.5 px-4">Năm học</th>
                  <th className="py-2.5 px-4">Ngày nhận lớp</th>
                  <th className="py-2.5 px-4">Ngày kết thúc</th>
                  <th className="py-2.5 px-4">Trạng thái phân công</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {!teacher.assignmentHistory || teacher.assignmentHistory.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-muted-foreground text-[13px]">
                      Chưa có lịch sử phân công lớp học nào được ghi nhận.
                    </td>
                  </tr>
                ) : (
                  teacher.assignmentHistory.map((item, idx) => (
                    <tr key={idx} className="hover:bg-muted/10 transition-colors">
                      <td className="py-2.5 px-4 font-medium text-foreground">
                        {item.className}
                      </td>
                      <td className="py-2.5 px-4 text-muted-foreground font-mono">
                        {item.schoolYear || '—'}
                      </td>
                      <td className="py-2.5 px-4 font-mono">
                        {item.assignedAtFormatted}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-muted-foreground">
                        {item.leftAtFormatted}
                      </td>
                      <td className="py-2.5 px-4">
                        {item.isActive ? (
                          <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-none bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            Đang phụ trách
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-none bg-muted text-muted-foreground border border-border">
                            {item.leaveReason === 'RESIGNED' ? 'Đã thôi việc' : 'Đã kết thúc'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Global Slide-in Drawer & Delete Modal */}
      <TeacherDrawer />
      <DeleteTeacherDialog onSuccess={() => navigate('/teachers')} />
    </div>
  );
}
