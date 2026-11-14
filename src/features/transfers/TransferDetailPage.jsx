import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Tick01Icon,
  Cancel01Icon,
  ArrowRight01Icon,
} from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/features/auth';
import { classesApi } from '../classes/classes.api';
import { getStudentAvatarUrl } from '../students/students.store';
import { NotFoundPage } from '@/features/error';
import { cn } from '@/shared/lib/utils';

const AGE_GROUP_LABELS = {
  NHA_TRE: 'Nhà trẻ',
  MAM: 'Khối Mầm',
  CHOI: 'Khối Chồi',
  LA: 'Khối Lá',
};

const GENDER_LABELS = {
  MALE: 'Nam',
  FEMALE: 'Nữ',
};

export function TransferDetailPage() {
  const { id } = useParams();

  if (id && /^\d+$/.test(String(id).trim())) {
    return <NotFoundPage />;
  }

  const navigate = useNavigate();
  const { t } = useTranslation();

  const getAgeGroupLabel = (group) => {
    switch (group) {
      case 'NHA_TRE':
        return t('curriculum.gradeNhaTre', 'Khối Nhà trẻ');
      case 'MAM':
        return t('curriculum.gradeMam', 'Khối Mầm');
      case 'CHOI':
        return t('curriculum.gradeChoi', 'Khối Chồi');
      case 'LA':
        return t('curriculum.gradeLa', 'Khối Lá');
      default:
        return group || '—';
    }
  };

  const getGenderLabel = (g) => {
    if (g === 'FEMALE') return t('transfers.genderFemale', 'Nữ');
    if (g === 'MALE') return t('transfers.genderMale', 'Nam');
    return g || '—';
  };

  const user = useAuthStore((state) => state.user);
  const isTeacher = user?.role === 'TEACHER_GV';

  const [transfer, setTransfer] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Reject modal state (BGH)
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // Cancel dialog state (Teacher)
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);

  const loadTransfer = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await classesApi.getTransferById(id);
      if (res) {
        setTransfer(res);
      }
    } catch (err) {
      console.error('Error loading transfer details:', err);
      const msg = err.response?.data?.message || 'Không tìm thấy thông tin yêu cầu chuyển lớp.';
      toast.error(msg);
      if (err.response?.status === 403) {
        navigate('/transfers', { replace: true });
      }
    } finally {
      setIsLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    loadTransfer();
  }, [loadTransfer]);

  // Handle Approve (BGH)
  const handleApprove = async () => {
    if (!transfer) return;
    try {
      setIsUpdatingStatus(true);
      await classesApi.updateGlobalTransferStatus(transfer.id, {
        status: 'APPROVED',
      });
      toast.success(`Đã phê duyệt yêu cầu chuyển lớp của học sinh ${transfer.studentName}!`);
      loadTransfer();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Lỗi khi phê duyệt';
      toast.error(msg);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Handle Reject Confirm (BGH)
  const handleConfirmReject = async () => {
    if (!transfer || !rejectReason.trim()) return;
    try {
      setIsUpdatingStatus(true);
      await classesApi.rejectTransfer(transfer.id, {
        rejectedReason: rejectReason.trim(),
      });
      toast.success(`Đã từ chối yêu cầu chuyển lớp của học sinh ${transfer.studentName}.`);
      setIsRejectModalOpen(false);
      setRejectReason('');
      loadTransfer();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Lỗi khi từ chối';
      toast.error(msg);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Handle Cancel Confirm (Teacher)
  const handleConfirmCancel = async () => {
    if (!transfer) return;
    try {
      setIsUpdatingStatus(true);
      await classesApi.cancelTransfer(transfer.id);
      toast.success(`Đã hủy yêu cầu chuyển lớp của học sinh ${transfer.studentName}.`);
      setIsCancelDialogOpen(false);
      loadTransfer();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Lỗi khi hủy yêu cầu';
      toast.error(msg);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  if (isLoading && !transfer) {
    return (
      <div className="w-full flex-1 flex flex-col gap-6 max-w-[1300px] mx-auto animate-pulse select-none">
        <div className="h-28 border border-border bg-card p-6 rounded-none flex items-center gap-4">
          <div className="size-16 bg-muted/60 rounded-none shrink-0" />
          <div className="flex flex-col gap-2 flex-1">
            <div className="h-5 w-48 bg-muted/60 rounded-none" />
            <div className="h-3 w-64 bg-muted/40 rounded-none" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-72 border border-border bg-card rounded-none" />
          <div className="h-72 border border-border bg-card rounded-none" />
        </div>
      </div>
    );
  }

  if (!transfer) {
    return <NotFoundPage />;
  }

  const transferDateFormatted = transfer.transferDate
    ? new Date(transfer.transferDate).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : '—';

  const createdDateFormatted = transfer.createdAt
    ? new Date(transfer.createdAt).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

  const approvedDateFormatted = transfer.approvedAt
    ? new Date(transfer.approvedAt).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  const cancelledDateFormatted = transfer.cancelledAt
    ? new Date(transfer.cancelledAt).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <div
      className="w-full flex-1 flex flex-col gap-6 max-w-[1300px] mx-auto text-foreground pb-12 select-none"
      data-name="Transfer Detail · Overview"
    >
      {/* Transfer Hero Card (Consistent with Teacher & Student Overview) */}
      <div
        className="border border-border bg-card p-5 sm:p-6 rounded-none flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs"
        data-name="Transfer Hero Card"
      >
        {/* Left: Avatar + Title + Status + Route Subtitle */}
        <div className="flex items-center gap-4 sm:gap-5 min-w-0">
          <div className="size-16 rounded-none overflow-hidden border border-border/80 bg-muted/40 shrink-0">
            <img
              src={getStudentAvatarUrl(
                transfer.studentAvatar,
                transfer.studentCode || transfer.studentName,
              )}
              alt={transfer.studentName}
              className="size-full object-cover"
              onError={(e) => {
                e.currentTarget.src = getStudentAvatarUrl(
                  null,
                  transfer.studentCode || transfer.studentName,
                );
              }}
            />
          </div>
          <div className="flex flex-col min-w-0 gap-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-[22px] font-semibold text-foreground tracking-tight leading-tight">
                {transfer.studentName}
              </h1>
              {transfer.status === 'PENDING' && (
                <span className="inline-flex items-center justify-center px-2.5 py-0.5 text-[12px] font-medium bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 rounded-none">
                  {t('transfers.statusPending', 'Chờ duyệt')}
                </span>
              )}
              {transfer.status === 'APPROVED' && (
                <span className="inline-flex items-center justify-center px-2.5 py-0.5 text-[12px] font-medium bg-secondary text-secondary-foreground rounded-none">
                  {t('transfers.statusApproved', 'Đã duyệt')}
                </span>
              )}
              {transfer.status === 'REJECTED' && (
                <span className="inline-flex items-center justify-center px-2.5 py-0.5 text-[12px] font-medium bg-muted text-muted-foreground rounded-none">
                  {t('transfers.statusRejected', 'Đã từ chối')}
                </span>
              )}
              {transfer.status === 'CANCELLED' && (
                <span className="inline-flex items-center justify-center px-2.5 py-0.5 text-[12px] font-medium bg-muted text-muted-foreground rounded-none">
                  {t('transfers.statusCancelled', 'Đã hủy')}
                </span>
              )}
            </div>
            <p className="text-[13px] text-muted-foreground font-normal truncate">
              <span className="font-mono text-muted-foreground">
                {transfer.studentCode ? `Mã HS: ${transfer.studentCode}` : ''}
              </span>
              {` · ${transfer.fromClassName} → ${transfer.toClassName}`}
              {` · ${t('transfers.effectiveDate', 'Hiệu lực từ')} ${transferDateFormatted}`}
            </p>
          </div>
        </div>

        {/* Right: Actions for PENDING status */}
        {transfer.status === 'PENDING' ? (
          !isTeacher ? (
            <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
              <Button
                type="button"
                variant="outline"
                disabled={isUpdatingStatus}
                onClick={() => setIsRejectModalOpen(true)}
                className="h-8 px-3 text-[13px] border border-border bg-background hover:bg-muted text-foreground rounded-none shadow-none cursor-pointer font-normal"
              >
                {t('transfers.rejectAction', 'Từ chối')}
              </Button>
              <Button
                type="button"
                disabled={isUpdatingStatus}
                onClick={handleApprove}
                className="h-8 px-4 text-[13px] bg-[#1447e6] hover:bg-[#1447e6]/90 text-white rounded-none shadow-none cursor-pointer font-medium"
              >
                {isUpdatingStatus ? t('common.processing', 'Đang xử lý...') : t('transfers.approveAction', 'Phê duyệt chuyển lớp')}
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3 self-start sm:self-center shrink-0">
              <Button
                type="button"
                variant="outline"
                disabled={isUpdatingStatus}
                onClick={() => setIsCancelDialogOpen(true)}
                className="h-8 px-3 text-[13px] border border-destructive/30 bg-background hover:bg-destructive/10 text-destructive rounded-none shadow-none cursor-pointer font-normal"
              >
                {t('transfers.cancelAction', 'Hủy yêu cầu')}
              </Button>
              <span className="text-[13px] text-amber-600 font-medium">
                {t('transfers.statusPending', 'Chờ duyệt')}
              </span>
            </div>
          )
        ) : transfer.status === 'APPROVED' ? (
          <div className="text-[13px] text-muted-foreground font-normal self-start sm:self-center shrink-0">
            {t('transfers.statusApproved', 'Đã duyệt')}
          </div>
        ) : transfer.status === 'CANCELLED' ? (
          <div className="text-[13px] text-muted-foreground font-normal self-start sm:self-center shrink-0">
            {t('transfers.statusCancelled', 'Đã hủy')}
          </div>
        ) : (
          <div className="text-[13px] text-muted-foreground font-normal self-start sm:self-center shrink-0">
            {t('transfers.statusRejected', 'Đã từ chối')}
          </div>
        )}
      </div>

      {/* Grid Content matching Teacher/Student Overview (2 clean cards) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Card 1: Lộ trình chuyển lớp */}
        <div
          className="border border-border bg-card rounded-none overflow-hidden shadow-xs"
          data-name="Card · Lộ trình chuyển lớp"
        >
          <div className="p-4 border-b border-border bg-muted/20">
            <h2 className="text-[14px] font-semibold text-foreground">
              Lộ trình chuyển lớp
            </h2>
            <p className="text-[12px] text-muted-foreground font-normal">
              Thông tin điều chuyển giữa các lớp học trong niên khóa
            </p>
          </div>

          <div className="divide-y divide-border/60">
            {/* Lớp hiện tại */}
            <div className="flex items-center justify-between p-4 h-[52px]">
              <span className="text-[14px] text-foreground/80 font-normal">
                Lớp học hiện tại
              </span>
              <span className="text-[14px] text-foreground font-medium">
                {transfer.fromClassName}
                {transfer.fromClassRoom ? ` (${transfer.fromClassRoom})` : ''}
              </span>
            </div>

            {/* Khối tuổi lớp hiện tại */}
            {transfer.fromClassAgeGroup && (
              <div className="flex items-center justify-between p-4 h-[52px]">
                <span className="text-[14px] text-foreground/80 font-normal">
                  Khối tuổi lớp cũ
                </span>
                <span className="text-[14px] text-foreground font-normal">
                  {getAgeGroupLabel(transfer.fromClassAgeGroup)}
                </span>
              </div>
            )}

            {/* Lớp chuyển đến */}
            <div className="flex items-center justify-between p-4 h-[52px]">
              <span className="text-[14px] text-foreground/80 font-normal">
                Lớp chuyển đến
              </span>
              <span className="text-[14px] text-foreground font-semibold">
                {transfer.toClassName}
                {transfer.toClassRoom ? ` (${transfer.toClassRoom})` : ''}
              </span>
            </div>

            {/* Khối tuổi lớp chuyển đến */}
            {transfer.toClassAgeGroup && (
              <div className="flex items-center justify-between p-4 h-[52px]">
                <span className="text-[14px] text-foreground/80 font-normal">
                  Khối tuổi lớp mới
                </span>
                <span className="text-[14px] text-foreground font-normal">
                  {getAgeGroupLabel(transfer.toClassAgeGroup)}
                </span>
              </div>
            )}

            {/* Niên khóa */}
            <div className="flex items-center justify-between p-4 h-[52px]">
              <span className="text-[14px] text-foreground/80 font-normal">
                Niên khóa
              </span>
              <span className="text-[14px] text-foreground font-normal">
                {transfer.fromClassSchoolYear || transfer.toClassSchoolYear || 'Năm học hiện tại'}
              </span>
            </div>

            {/* Ngày hiệu lực */}
            <div className="flex items-center justify-between p-4 h-[52px]">
              <span className="text-[14px] text-foreground/80 font-normal">
                Ngày hiệu lực chuyển lớp
              </span>
              <span className="inline-flex items-center justify-center px-2.5 py-0.5 text-[12px] font-mono font-medium bg-muted text-foreground rounded-none">
                {transferDateFormatted}
              </span>
            </div>

            {/* Người tạo yêu cầu */}
            <div className="flex items-center justify-between p-4 h-[52px]">
              <span className="text-[14px] text-foreground/80 font-normal">
                Người tạo yêu cầu
              </span>
              <span className="text-[14px] text-foreground font-medium">
                {transfer.createdByName || 'Giáo viên'}
              </span>
            </div>

            {/* Thời gian gửi yêu cầu */}
            <div className="flex items-center justify-between p-4 h-[52px]">
              <span className="text-[14px] text-foreground/80 font-normal">
                Thời gian gửi yêu cầu
              </span>
              <span className="text-[13px] text-muted-foreground font-normal">
                {createdDateFormatted}
              </span>
            </div>

            {/* Người phê duyệt (nếu có) */}
            {transfer.approvedByName && (
              <div className="flex items-center justify-between p-4 h-[52px]">
                <span className="text-[14px] text-foreground/80 font-normal">
                  Người xử lý
                </span>
                <span className="text-[14px] text-foreground font-medium">
                  {transfer.approvedByName}
                </span>
              </div>
            )}

            {/* Thời gian phê duyệt (nếu có) */}
            {approvedDateFormatted && (
              <div className="flex items-center justify-between p-4 h-[52px]">
                <span className="text-[14px] text-foreground/80 font-normal">
                  Thời gian xử lý
                </span>
                <span className="text-[13px] text-muted-foreground font-normal">
                  {approvedDateFormatted}
                </span>
              </div>
            )}

            {/* Thời gian hủy (nếu có) */}
            {cancelledDateFormatted && (
              <div className="flex items-center justify-between p-4 h-[52px]">
                <span className="text-[14px] text-foreground/80 font-normal">
                  Thời gian hủy
                </span>
                <span className="text-[13px] text-muted-foreground font-normal">
                  {cancelledDateFormatted}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Hồ sơ học sinh & Liên hệ */}
        <div
          className="border border-border bg-card rounded-none overflow-hidden shadow-xs"
          data-name="Card · Hồ sơ học sinh"
        >
          <div className="p-4 border-b border-border bg-muted/20">
            <h2 className="text-[14px] font-semibold text-foreground">
              Hồ sơ học sinh & Liên hệ
            </h2>
            <p className="text-[12px] text-muted-foreground font-normal">
              Thông tin nhân khẩu học và phụ huynh học sinh
            </p>
          </div>

          <div className="divide-y divide-border/60">
            {/* Họ và tên */}
            <div className="flex items-center justify-between p-4 h-[52px]">
              <span className="text-[14px] text-foreground/80 font-normal">
                Họ tên học sinh
              </span>
              <span className="text-[14px] text-foreground font-medium">
                {transfer.studentName}
              </span>
            </div>

            {/* Mã học sinh */}
            <div className="flex items-center justify-between p-4 h-[52px]">
              <span className="text-[14px] text-foreground/80 font-normal">
                Mã học sinh
              </span>
              <span className="inline-flex items-center justify-center px-2.5 py-0.5 text-[12px] font-mono font-medium bg-muted text-foreground rounded-none">
                {transfer.studentCode || '—'}
              </span>
            </div>

            {/* Ngày sinh */}
            <div className="flex items-center justify-between p-4 h-[52px]">
              <span className="text-[14px] text-foreground/80 font-normal">
                Ngày sinh
              </span>
              <span className="text-[14px] text-foreground font-normal">
                {transfer.studentDob
                  ? new Date(transfer.studentDob).toLocaleDateString('vi-VN')
                  : '—'}
              </span>
            </div>

            {/* Giới tính */}
            <div className="flex items-center justify-between p-4 h-[52px]">
              <span className="text-[14px] text-foreground/80 font-normal">
                Giới tính
              </span>
              <span className="text-[14px] text-foreground font-normal">
                {getGenderLabel(transfer.studentGender)}
              </span>
            </div>

            {/* Phụ huynh */}
            <div className="flex items-center justify-between p-4 h-[52px]">
              <span className="text-[14px] text-foreground/80 font-normal">
                Phụ huynh liên hệ
              </span>
              <span className="text-[14px] text-foreground font-medium">
                {transfer.parentName || '—'}
              </span>
            </div>

            {/* SĐT phụ huynh */}
            <div className="flex items-center justify-between p-4 h-[52px]">
              <span className="text-[14px] text-foreground/80 font-normal">
                Số điện thoại
              </span>
              <span className="inline-flex items-center justify-center px-2.5 py-0.5 text-[12px] font-mono font-medium bg-muted text-foreground rounded-none">
                {transfer.parentPhone || '—'}
              </span>
            </div>

            {/* Mối quan hệ */}
            <div className="flex items-center justify-between p-4 h-[52px]">
              <span className="text-[14px] text-foreground/80 font-normal">
                Mối quan hệ
              </span>
              <span className="text-[14px] text-foreground font-normal">
                {transfer.parentRelationship || 'Phụ huynh'}
              </span>
            </div>

            {/* Link xem chi tiết học sinh */}
            {transfer.studentId && (
              <div className="p-4 h-[52px] flex items-center justify-between bg-muted/10">
                <span className="text-[13px] text-muted-foreground font-normal">
                  Hồ sơ học tập đầy đủ
                </span>
                <Link
                  to={`/students/${transfer.studentId}`}
                  className="inline-flex items-center gap-1 text-[13px] font-medium text-[#1447e6] hover:underline"
                >
                  <span>Xem hồ sơ học sinh</span>
                  <HugeiconsIcon icon={ArrowRight01Icon} size={14} />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Card 3: Nội dung & Lý do đề xuất (Full width clean container) */}
      <div
        className="border border-border bg-card rounded-none overflow-hidden shadow-xs"
        data-name="Card · Nội dung & Lý do đề xuất"
      >
        <div className="p-4 border-b border-border bg-muted/20">
          <h2 className="text-[14px] font-semibold text-foreground">
            Nội dung đề xuất & Kết quả thẩm định
          </h2>
          <p className="text-[12px] text-muted-foreground font-normal">
            Nguyện vọng chuyển lớp và ý kiến thẩm định từ Ban Giám Hiệu
          </p>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <span className="text-[12px] font-medium text-muted-foreground block mb-1.5 uppercase tracking-wider">
              Lý do xin chuyển lớp:
            </span>
            <div className="p-3.5 border border-border bg-muted/15 text-[13.5px] text-foreground leading-relaxed">
              {transfer.reason || 'Không có lý do cụ thể'}
            </div>
          </div>

          {/* Phản hồi nếu bị từ chối */}
          {transfer.status === 'REJECTED' && transfer.rejectedReason && (
            <div>
              <span className="text-[12px] font-medium text-destructive block mb-1.5 uppercase tracking-wider">
                Lý do từ chối từ Ban Giám Hiệu:
              </span>
              <div className="p-3.5 border border-destructive/30 bg-destructive/5 text-[13.5px] text-destructive leading-relaxed">
                {transfer.rejectedReason}
              </div>
            </div>
          )}

          {/* Xác nhận nếu đã duyệt */}
          {transfer.status === 'APPROVED' && (
            <div className="p-3.5 border border-border bg-muted/20 flex items-center justify-between text-[13px]">
              <span className="text-foreground">
                Học sinh đã được chuyển chính thức sang lớp <strong>{transfer.toClassName}</strong>.
              </span>
              <span className="text-muted-foreground font-mono text-[12px]">
                {approvedDateFormatted ? `Ngày duyệt: ${approvedDateFormatted}` : ''}
              </span>
            </div>
          )}

          {/* Thông báo nếu đã hủy */}
          {transfer.status === 'CANCELLED' && (
            <div className="p-3.5 border border-border bg-muted/20 flex items-center justify-between text-[13px]">
              <span className="text-muted-foreground">
                Yêu cầu chuyển lớp này đã được giáo viên hủy bỏ.
              </span>
              <span className="text-muted-foreground font-mono text-[12px]">
                {cancelledDateFormatted ? `Ngày hủy: ${cancelledDateFormatted}` : ''}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Reject Modal (BGH) */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-[440px] border border-border bg-card p-5 rounded-none shadow-xl flex flex-col gap-4 select-none">
            <div className="flex flex-col gap-1">
              <h3 className="text-[16px] font-semibold text-foreground">
                Từ chối yêu cầu chuyển lớp
              </h3>
              <p className="text-[13px] text-muted-foreground">
                Xác nhận từ chối yêu cầu chuyển lớp của học sinh{' '}
                <strong>{transfer.studentName}</strong> (Mã HS: {transfer.studentCode})
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-foreground">
                Lý do từ chối <span className="text-destructive">*</span>
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Nhập lý do từ chối (VD: Lớp tiếp nhận đã đủ sĩ số, không đúng độ tuổi...)"
                rows={3}
                className="w-full p-2.5 text-[13px] bg-background border border-border rounded-none outline-none focus:border-primary resize-none text-foreground"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                disabled={isUpdatingStatus}
                onClick={() => {
                  setIsRejectModalOpen(false);
                  setRejectReason('');
                }}
                className="h-8 px-4 rounded-none border-border text-[13px] font-normal shadow-none cursor-pointer"
              >
                Hủy
              </Button>
              <Button
                type="button"
                disabled={isUpdatingStatus || !rejectReason.trim()}
                onClick={handleConfirmReject}
                className="h-8 px-4 rounded-none bg-destructive hover:bg-destructive/90 text-white text-[13px] font-medium shadow-none cursor-pointer disabled:opacity-40"
              >
                {isUpdatingStatus ? 'Đang lưu...' : 'Xác nhận từ chối'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Modal (Teacher) */}
      {isCancelDialogOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-[440px] border border-border bg-card p-5 rounded-none shadow-xl flex flex-col gap-4 select-none">
            <div className="flex flex-col gap-1">
              <h3 className="text-[16px] font-semibold text-foreground">
                Hủy yêu cầu chuyển lớp
              </h3>
              <p className="text-[13px] text-muted-foreground">
                Bạn có chắc chắn muốn hủy yêu cầu chuyển lớp của học sinh{' '}
                <strong>{transfer.studentName}</strong> (Mã HS: {transfer.studentCode}) không? Sau khi hủy, yêu cầu sẽ không được gửi tới Ban Giám Hiệu.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                disabled={isUpdatingStatus}
                onClick={() => setIsCancelDialogOpen(false)}
                className="h-8 px-4 rounded-none border-border text-[13px] font-normal shadow-none cursor-pointer"
              >
                Đóng
              </Button>
              <Button
                type="button"
                disabled={isUpdatingStatus}
                onClick={handleConfirmCancel}
                className="h-8 px-4 rounded-none bg-destructive hover:bg-destructive/90 text-white text-[13px] font-medium shadow-none cursor-pointer disabled:opacity-40"
              >
                {isUpdatingStatus ? 'Đang hủy...' : 'Xác nhận hủy'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TransferDetailPage;
