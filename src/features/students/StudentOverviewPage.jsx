import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  PencilEdit02Icon,
  Delete02Icon,
  Upload01Icon,
  ArrowReloadHorizontalIcon,
  DashboardSquare01Icon,
} from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { useStudentStore, getStudentAvatarUrl, transformBackendStudent } from './students.store';
import { studentsApi } from './students.api';
import { StudentDrawer } from './components/StudentDrawer';
import { DeleteStudentDialog } from './components/DeleteStudentDialog';
import { uploadApi } from '@/shared/api/upload.api';
import { NotFoundPage } from '@/features/error';
import { cn } from '@/shared/lib/utils';

function formatDateDisplay(val) {
  if (!val) return '—';
  if (typeof val === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(val.trim())) {
    return val.trim();
  }
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatRoomNumber(room) {
  if (!room) return '—';
  const str = String(room).trim();
  if (/^phòng/i.test(str)) return str;
  return `Phòng ${str}`;
}

function getAgeGroupLabel(ageGroup) {
  switch ((ageGroup || '').toUpperCase()) {
    case 'NHA_TRE':
      return 'Khối Nhà trẻ';
    case 'MAM':
      return 'Khối Mầm';
    case 'CHOI':
      return 'Khối Chồi';
    case 'LA':
      return 'Khối Lá';
    default:
      return ageGroup || '';
  }
}

function formatEnrollmentStatus(status) {
  if (!status) return '';
  switch (String(status).toUpperCase()) {
    case 'ENROLLED':
    case 'STUDYING':
      return 'Đang học';
    case 'COMPLETED':
      return 'Hoàn thành';
    case 'TRANSFERRED_CLASS':
      return 'Chuyển lớp';
    case 'TRANSFERRED_SCHOOL':
    case 'TRANSFERRED':
      return 'Chuyển trường';
    case 'RESERVED':
      return 'Bảo lưu';
    case 'DROPPED_OUT':
      return 'Thôi học';
    case 'GRADUATED':
      return 'Tốt nghiệp';
    default:
      return status;
  }
}


export function StudentOverviewPage() {
  const { id } = useParams();

  if (id && /^\d+$/.test(String(id).trim())) {
    return <NotFoundPage />;
  }

  const { t } = useTranslation();

  const students = useStudentStore((state) => state.students);
  const isLoading = useStudentStore((state) => state.isLoading);
  const fetchStudents = useStudentStore((state) => state.fetchStudents);
  const updateStudent = useStudentStore((state) => state.updateStudent);
  const openEditDrawer = useStudentStore((state) => state.openEditDrawer);
  const openDeleteDialog = useStudentStore((state) => state.openDeleteDialog);

  const fileInputRef = useRef(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [detailStudent, setDetailStudent] = useState(null);

  const reloadDetail = useCallback(async () => {
    if (!id) return;
    try {
      const res = await studentsApi.getById(id);
      if (res) {
        setDetailStudent(transformBackendStudent(res));
      }
    } catch (err) {
      console.warn('Could not fetch student detail from API:', err);
    }
  }, [id]);

  useEffect(() => {
    fetchStudents();
    reloadDetail();
  }, [fetchStudents, reloadDetail]);

  const rawStudent = students.find((item) => item.id === id || item.studentCode === id);
  const student = detailStudent || rawStudent;

  const enrollments = useMemo(() => {
    if (!student) return [];
    const list = [...(student.enrollmentHistory || [])];

    if (list.length === 0 && student.currentClass) {
      list.push({
        enrollmentId: 'current',
        classId: student.currentClass.classId || student.classId,
        className: student.currentClass.className,
        roomNumber: student.currentClass.roomNumber,
        ageGroup: student.currentClass.ageGroup,
        schoolYearName: student.currentClass.schoolYearName,
        enrolledAt: student.enrollmentDate || student.joinDate,
        leftAt: null,
        status: 'ENROLLED',
        leaveReason: null,
      });
    }

    return list.sort((a, b) => {
      const isEnrolledA = ['ENROLLED', 'STUDYING'].includes(String(a.status).toUpperCase());
      const isEnrolledB = ['ENROLLED', 'STUDYING'].includes(String(b.status).toUpperCase());
      if (isEnrolledA && !isEnrolledB) return -1;
      if (!isEnrolledA && isEnrolledB) return 1;
      const dateA = new Date(a.enrolledAt || 0).getTime();
      const dateB = new Date(b.enrolledAt || 0).getTime();
      return dateB - dateA;
    });
  }, [student]);

  if (isLoading && !student) {
    return (
      <div className="flex flex-col gap-6 animate-pulse max-w-[1300px] mx-auto w-full">
        <div className="h-28 border border-border bg-card p-6 rounded-none flex items-center gap-4">
          <div className="size-16 bg-muted/60 rounded-none shrink-0" />
          <div className="flex flex-col gap-2 flex-1">
            <div className="h-5 w-48 bg-muted/60 rounded-none" />
            <div className="h-3 w-32 bg-muted/40 rounded-none" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 border border-border bg-card rounded-none" />
          <div className="h-80 border border-border bg-card rounded-none" />
        </div>
      </div>
    );
  }

  if (!student) {
    return <NotFoundPage />;
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'studying':
        return (
          <span className="inline-flex items-center justify-center px-2.5 py-0.5 text-[12px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 rounded-none border border-blue-200/60 dark:border-blue-900/40">
            {t('student.statusStudying', 'Đang học')}
          </span>
        );
      case 'reserved':
        return (
          <span className="inline-flex items-center justify-center px-2.5 py-0.5 text-[12px] font-medium bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 rounded-none">
            {t('student.statusReserved', 'Bảo lưu')}
          </span>
        );
      case 'transferred':
        return (
          <span className="inline-flex items-center justify-center px-2.5 py-0.5 text-[12px] font-medium bg-blue-100 text-blue-900 dark:bg-blue-950/60 dark:text-blue-300 rounded-none">
            {t('student.statusTransferred', 'Chuyển trường')}
          </span>
        );
      case 'dropped_out':
        return (
          <span className="inline-flex items-center justify-center px-2.5 py-0.5 text-[12px] font-medium bg-muted text-muted-foreground rounded-none">
            {t('student.statusDroppedOut', 'Thôi học')}
          </span>
        );
      case 'graduated':
        return (
          <span className="inline-flex items-center justify-center px-2.5 py-0.5 text-[12px] font-medium bg-purple-100 text-purple-900 dark:bg-purple-950/60 dark:text-purple-300 rounded-none">
            {t('student.statusGraduated', 'Đã tốt nghiệp')}
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center justify-center px-2.5 py-0.5 text-[12px] font-medium bg-blue-100 text-blue-900 dark:bg-blue-950/60 dark:text-blue-300 rounded-none">
            {t('student.statusCompleted', 'Hoàn thành')}
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
        await updateStudent(student.id, { avatar: res.url });
        toast.success(t('student.avatarUploadSuccess', 'Đã cập nhật ảnh đại diện học sinh'));
        reloadDetail();
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
      await updateStudent(student.id, { avatar: '' });
      toast.info(t('student.avatarResetNotice', 'Đã đặt lại linh vật mặc định (DiceBear Critters)'));
      reloadDetail();
    } catch (err) {
      console.error('Reset avatar failed:', err);
      toast.error('Đặt lại ảnh thất bại');
    }
  };

  return (
    <div
      className="w-full flex-1 flex flex-col gap-6 max-w-[1300px] mx-auto text-foreground select-none pb-12"
      data-name="FE · Student · Overview"
    >
      {/* Student Hero Card (Strictly mirrors Teacher & Academic Year Hero Card) */}
      <div
        className="border border-border bg-card p-5 sm:p-6 rounded-none flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs"
        data-name="Student Hero · Refined"
      >
        <div className="flex items-center gap-4 sm:gap-5 min-w-0">
          <input
            type="file"
            ref={fileInputRef}
            accept="image/jpeg,image/png,image/webp"
            onChange={handleAvatarFileChange}
            className="hidden"
          />
          <div className="relative group size-16 rounded-none overflow-hidden border border-border/80 bg-muted/40 shrink-0">
            <img
              src={getStudentAvatarUrl(student.avatar, student.studentCode || student.fullName)}
              alt={student.fullName}
              className="size-full object-cover"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = getStudentAvatarUrl(null, student.studentCode || student.fullName);
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
                {student.avatar && !student.avatar.includes('api.dicebear.com') && (
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
                {student.fullName}
              </h1>
              {getStatusBadge(student.status)}
            </div>
            <p className="text-[13px] text-muted-foreground font-normal truncate">
              {student.studentCode ? `${t('student.studentCodePrefix', 'Mã HS')}: ${student.studentCode}` : ''}
              {student.currentClass ? ` · ${student.currentClass.className}` : ` · ${t('student.notAssigned', 'Chưa phân lớp')}`}
              {student.primaryParent && ` · ${t('student.parentLabel', 'Phụ huynh')}: ${student.primaryParent.fullName} (${student.primaryParent.phone})`}
            </p>
          </div>
        </div>

        {/* Action Buttons: Edit and Delete only */}
        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => openEditDrawer(student.id)}
            className="size-8 rounded-none border border-border bg-background hover:bg-muted text-foreground cursor-pointer"
            title={t('common.edit', 'Chỉnh sửa')}
          >
            <HugeiconsIcon icon={PencilEdit02Icon} size={15} />
          </Button>

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => openDeleteDialog(student)}
            className="size-8 rounded-none border border-border bg-background hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 text-foreground cursor-pointer transition-colors"
            title={t('common.delete', 'Xóa')}
          >
            <HugeiconsIcon icon={Delete02Icon} size={15} />
          </Button>
        </div>
      </div>

      {/* Student Overview Grid (Matching User's Reference Layout) */}
      <div
        className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start"
        data-name="Student Overview Grid"
      >
        {/* Left Column: Card 1 (Thông tin cá nhân) + Card 2 (Sức khỏe & Ghi chú) */}
        <div className="space-y-6">
          {/* Card 1: Thông tin cá nhân */}
          <div className="border border-border bg-card rounded-none overflow-hidden shadow-xs">
            <div className="p-4 border-b border-border bg-muted/20">
              <h2 className="text-[14px] font-semibold text-foreground">
                Thông tin cá nhân
              </h2>
              <p className="text-[12px] text-muted-foreground font-normal">
                Lý lịch cơ bản của học sinh
              </p>
            </div>

            <div className="divide-y divide-border/60">
              <div className="flex items-center justify-between p-4 h-[50px]">
                <span className="text-[14px] text-muted-foreground font-normal">Mã học sinh</span>
                <span className="text-[14px] font-semibold text-foreground font-mono">
                  {student.studentCode || '—'}
                </span>
              </div>

              <div className="flex items-center justify-between p-4 h-[50px]">
                <span className="text-[14px] text-muted-foreground font-normal">Họ và tên</span>
                <span className="text-[14px] font-semibold text-foreground">
                  {student.fullName}
                </span>
              </div>

              <div className="flex items-center justify-between p-4 h-[50px]">
                <span className="text-[14px] text-muted-foreground font-normal">Ngày sinh</span>
                <span className="text-[14px] font-medium text-foreground">
                  {formatDateDisplay(student.dateOfBirth || student.dob)}
                </span>
              </div>

              <div className="flex items-center justify-between p-4 h-[50px]">
                <span className="text-[14px] text-muted-foreground font-normal">Giới tính</span>
                <span className="text-[14px] font-medium text-foreground">
                  {student.gender || '—'}
                </span>
              </div>

              <div className="flex items-center justify-between p-4 h-[50px]">
                <span className="text-[14px] text-muted-foreground font-normal">Dân tộc</span>
                <span className="text-[14px] font-medium text-foreground">
                  {student.ethnic || 'Kinh'}
                </span>
              </div>

              <div className="flex items-center justify-between p-4 h-[50px]">
                <span className="text-[14px] text-muted-foreground font-normal">Quốc tịch</span>
                <span className="text-[14px] font-medium text-foreground">
                  {student.nationality || 'Việt Nam'}
                </span>
              </div>

              <div className="flex items-center justify-between p-4 min-h-[50px]">
                <span className="text-[14px] text-muted-foreground font-normal shrink-0 pr-4">Nơi sinh</span>
                <span className="text-[14px] font-medium text-foreground text-right">
                  {student.placeOfBirth || '—'}
                </span>
              </div>

              <div className="flex items-center justify-between p-4 min-h-[50px]">
                <span className="text-[14px] text-muted-foreground font-normal shrink-0 pr-4">Thường trú</span>
                <span className="text-[14px] font-medium text-foreground text-right">
                  {student.permanentResidence || '—'}
                </span>
              </div>

              <div className="flex items-center justify-between p-4 min-h-[50px]">
                <span className="text-[14px] text-muted-foreground font-normal shrink-0 pr-4">Tạm trú</span>
                <span className="text-[14px] font-medium text-foreground text-right">
                  {student.currentResidence || '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Sức khỏe & Ghi chú */}
          <div className="border border-border bg-card rounded-none overflow-hidden shadow-xs">
            <div className="p-4 border-b border-border bg-muted/20">
              <h2 className="text-[14px] font-semibold text-foreground">
                Sức khỏe & Ghi chú
              </h2>
              <p className="text-[12px] text-muted-foreground font-normal">
                Lưu ý dị ứng, bệnh lý và ghi chú của giáo viên
              </p>
            </div>

            <div className="divide-y divide-border/60">
              <div className="p-4">
                <span className="text-[12px] text-muted-foreground block font-medium">
                  Dị ứng thức ăn / thuốc
                </span>
                <p className="text-[14px] text-foreground font-semibold mt-1">
                  {student.allergyNotes || 'Không ghi nhận dị ứng.'}
                </p>
              </div>

              <div className="p-4">
                <span className="text-[12px] text-muted-foreground block font-medium">
                  Tiền sử bệnh lý
                </span>
                <p className="text-[14px] text-foreground font-semibold mt-1">
                  {student.medicalNotes || 'Không ghi nhận bệnh lý đặc biệt.'}
                </p>
              </div>

              <div className="p-4">
                <span className="text-[12px] text-muted-foreground block font-medium">
                  Trường mầm non trước đây
                </span>
                <p className="text-[14px] text-foreground font-semibold mt-1">
                  {student.previousSchool || 'Chưa có thông tin trường cũ.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Card 3 (Phụ huynh & Người giám hộ) + Card 4 (Lớp học) */}
        <div className="space-y-6">
          {/* Card 3: Phụ huynh & Người giám hộ */}
          <div className="border border-border bg-card rounded-none overflow-hidden shadow-xs">
            <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
              <div>
                <h2 className="text-[14px] font-semibold text-foreground">
                  Phụ huynh & Người giám hộ
                </h2>
                <p className="text-[12px] text-muted-foreground font-normal">
                  Thông tin liên lạc khẩn cấp và bảo mật bàn giao trẻ
                </p>
              </div>
              <span className="text-[12px] font-normal text-muted-foreground">
                {student.parents?.length || 0} người
              </span>
            </div>

            <div className="divide-y divide-border/60">
              {student.parents && student.parents.length > 0 ? (
                student.parents.map((p, idx) => (
                  <div key={p.id || idx} className="p-4 flex items-center justify-between gap-4">
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-[14px] text-foreground">
                        <strong className="font-semibold">
                          {p.relationship ? `${p.relationship}: ` : ''}{p.fullName}
                        </strong>
                      </span>
                      <span className="text-[13px] text-muted-foreground">
                        SĐT: <span className="font-semibold text-foreground">{p.phone || '—'}</span>
                      </span>
                    </div>
                    <span className="text-[12px] text-muted-foreground shrink-0">
                      {p.canPickup !== false ? 'Được đón bé' : 'Không đón bé'}
                    </span>
                  </div>
                ))
              ) : (
                <div className="p-4 text-[13px] text-muted-foreground italic">
                  Chưa có thông tin phụ huynh
                </div>
              )}
            </div>
          </div>

          {/* Card 4: Lớp học */}
          <div className="border border-border bg-card rounded-none overflow-hidden shadow-xs">
            <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
              <div>
                <h2 className="text-[14px] font-semibold text-foreground">
                  Lớp học
                </h2>
                <p className="text-[12px] text-muted-foreground font-normal">
                  Phân lớp theo niên khóa
                </p>
              </div>
              <span className="text-[12px] font-normal text-muted-foreground">
                {enrollments.length} lớp
              </span>
            </div>

            <div className="divide-y divide-border/60">
              {/* Ngày nhập học */}
              <div className="flex items-center justify-between p-4 h-[50px]">
                <span className="text-[14px] text-muted-foreground font-normal">Ngày nhập học</span>
                <span className="text-[14px] font-medium text-foreground">
                  {formatDateDisplay(student.enrollmentDate || student.joinDate)}
                </span>
              </div>

              {/* Danh sách phân lớp trực tiếp từ bảng student_enrollments */}
              {enrollments.length > 0 ? (
                enrollments.map((enr, idx) => {
                  const statusText = formatEnrollmentStatus(enr.status);
                  const isStudying = ['ENROLLED', 'STUDYING'].includes(String(enr.status).toUpperCase());

                  return (
                    <div key={enr.enrollmentId || idx} className="p-4 flex items-center justify-between gap-4">
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <strong className="font-semibold text-foreground text-[14px]">
                            {enr.className || 'Chưa phân lớp'}
                          </strong>
                          {statusText && (
                            <span
                              className={cn(
                                'text-[12px] font-medium',
                                isStudying
                                  ? 'text-blue-600 dark:text-blue-400'
                                  : 'text-muted-foreground'
                              )}
                            >
                              ({statusText})
                            </span>
                          )}
                          {enr.schoolYearName && (
                            <span className="text-[13px] text-muted-foreground">
                              · {enr.schoolYearName}
                            </span>
                          )}
                          {enr.ageGroup && (
                            <span className="text-[13px] text-muted-foreground">
                              · {getAgeGroupLabel(enr.ageGroup)}
                            </span>
                          )}
                        </div>
                        <span className="text-[13px] text-muted-foreground">
                          {enr.roomNumber ? `${formatRoomNumber(enr.roomNumber)} · ` : ''}
                          {enr.leftAt
                            ? `${formatDateDisplay(enr.enrolledAt)} – ${formatDateDisplay(enr.leftAt)}`
                            : `Ngày vào lớp: ${formatDateDisplay(enr.enrolledAt)}`}
                          {enr.leaveReason ? ` · ${enr.leaveReason}` : ''}
                        </span>
                      </div>

                      {enr.classId && (
                        <Link
                          to={`/classes/${enr.classId}/students/${student.id}`}
                          className="inline-flex items-center gap-1.5 h-7 px-2.5 text-[12px] font-medium border border-border bg-background hover:bg-muted text-foreground transition-colors rounded-none shrink-0"
                          title={`Xem báo cáo học sinh tại lớp ${enr.className || ''}`}
                        >
                          <HugeiconsIcon icon={DashboardSquare01Icon} size={13} className="text-muted-foreground" />
                          <span>Xem báo cáo</span>
                        </Link>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="p-4 text-[13px] text-muted-foreground italic">
                  Chưa có thông tin phân lớp
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Slide-out Drawer Panel */}
      <StudentDrawer />

      {/* Delete Confirmation Modal */}
      <DeleteStudentDialog />
    </div>
  );
}

export default StudentOverviewPage;
