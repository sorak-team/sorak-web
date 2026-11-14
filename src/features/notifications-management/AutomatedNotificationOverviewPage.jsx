import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  NotificationCircleIcon,
  UserIcon,
  Calendar03Icon,
  CheckmarkCircle02Icon,
  Time02Icon,
  ArrowLeft02Icon,
} from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { notificationsManagementApi } from './notifications-management.api';
import { useNotificationsManagementStore } from './notifications-management.store';
import { NotFoundPage } from '@/features/error';
import { cn } from '@/shared/lib/utils';

export function AutomatedNotificationOverviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [detail, setDetail] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const setActiveTab = useNotificationsManagementStore((state) => state.setActiveTab);

  const loadDetail = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await notificationsManagementApi.getAutomatedById(id);
      setDetail(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Không tìm thấy thông báo tự động');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const handleBack = () => {
    navigate('/notifications/automated');
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="w-full flex-1 flex flex-col gap-6 max-w-[1300px] mx-auto animate-pulse select-none">
        <div className="h-4 w-48 bg-muted/60 rounded-none" />
        <div className="h-6 w-36 bg-muted/40 rounded-none" />
        <div className="h-10 w-96 bg-muted/60 rounded-none" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64 border border-border bg-card rounded-none" />
          <div className="h-64 border border-border bg-card rounded-none" />
        </div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center py-16 text-center select-none">
        <div className="size-12 rounded-none bg-muted flex items-center justify-center text-muted-foreground mb-4">
          <HugeiconsIcon icon={NotificationCircleIcon} size={24} />
        </div>
        <h2 className="text-[18px] font-semibold text-foreground mb-1">
          {error || 'Thông báo không tồn tại'}
        </h2>
        <p className="text-[13px] text-muted-foreground mb-6">
          Thông báo tự động này có thể đã bị gỡ hoặc đường dẫn không hợp lệ.
        </p>
        <Button
          type="button"
          onClick={handleBack}
          className="h-8 px-4 text-[13px] rounded-none cursor-pointer"
        >
          Quay lại danh sách
        </Button>
      </div>
    );
  }

  return (
    <div
      className="w-full flex-1 flex flex-col gap-6 max-w-[1300px] mx-auto text-foreground select-none pb-12"
      data-name="Automated Notification Overview Page"
    >
      {/* Hero Card matching NotificationOverviewPage */}
      <div
        className="border border-border bg-card p-5 sm:p-6 rounded-none flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs"
        data-name="Automated Notification Hero"
      >
        <div className="flex flex-col min-w-0 gap-1.5">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-[22px] font-semibold text-foreground tracking-tight leading-tight">
              {detail.title}
            </h1>
            <span className="inline-flex items-center justify-center px-2.5 py-0.5 text-[12px] font-medium bg-secondary text-secondary-foreground rounded-none">
              {detail.categoryLabel || 'Hệ thống'}
            </span>
          </div>

          <p className="text-[13px] text-muted-foreground font-normal">
            Mã thông báo:{' '}
            <span className="font-mono font-medium text-foreground">
              #{detail.notificationId || detail.id?.slice(0, 8)}
            </span>
            {' · '}
            Thời gian gửi:{' '}
            <span className="text-foreground font-medium">
              {formatDateTime(detail.createdAt)}
            </span>
            {' · '}
            Trạng thái:{' '}
            <span className={cn('font-medium', detail.isRead ? 'text-emerald-700 dark:text-emerald-400' : 'text-muted-foreground')}>
              {detail.isRead ? `Đã đọc (${formatDateTime(detail.readAt)})` : 'Chưa đọc'}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            className="h-8 px-3 text-[13px] rounded-none cursor-pointer flex items-center gap-1.5"
          >
            <HugeiconsIcon icon={ArrowLeft02Icon} size={15} />
            <span>Quay lại danh sách</span>
          </Button>
        </div>
      </div>

      {/* Overview Grid (2 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Card 1: Thông tin người nhận */}
        <div className="border border-border bg-card rounded-none overflow-hidden shadow-xs">
          <div className="p-4 border-b border-border bg-muted/20">
            <h2 className="text-[14px] font-semibold text-foreground">
              Thông tin người nhận
            </h2>
            <p className="text-[12px] text-muted-foreground font-normal">
              Chi tiết tài khoản nhận thông báo tự động từ hệ thống
            </p>
          </div>

          <div className="divide-y divide-border/60 text-[13px]">
            <div className="flex items-center justify-between p-4 h-[52px]">
              <span className="text-muted-foreground">Họ và tên</span>
              <span className="font-medium text-foreground">
                {detail.recipient?.name || '—'}
              </span>
            </div>
            <div className="flex items-center justify-between p-4 h-[52px]">
              <span className="text-muted-foreground">Vai trò người nhận</span>
              <span className="font-medium text-foreground">
                {detail.recipient?.role || 'Khác'}
              </span>
            </div>
            <div className="flex items-center justify-between p-4 h-[52px]">
              <span className="text-muted-foreground">Tài khoản đăng nhập</span>
              <span className="font-mono text-foreground font-medium">
                {detail.recipient?.username || '—'}
              </span>
            </div>
            <div className="flex items-center justify-between p-4 h-[52px]">
              <span className="text-muted-foreground">Kênh tiếp nhận</span>
              <span className="font-medium text-foreground">
                Ứng dụng Sorak (Thông báo tự động)
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Nội dung thông điệp */}
        <div className="border border-border bg-card rounded-none overflow-hidden shadow-xs">
          <div className="p-4 border-b border-border bg-muted/20">
            <h2 className="text-[14px] font-semibold text-foreground">
              Nội dung thông điệp
            </h2>
            <p className="text-[12px] text-muted-foreground font-normal">
              Văn bản thông báo phát đến ứng dụng giáo viên và phụ huynh
            </p>
          </div>

          <div className="p-4 space-y-4">
            <div className="p-4 bg-background border border-border/80 rounded-none text-[13px] leading-relaxed text-foreground whitespace-pre-wrap min-h-[140px]">
              {detail.body}
            </div>
          </div>
        </div>
      </div>

      {/* Card 3: Dữ liệu nghiệp vụ chi tiết của sự kiện */}
      {detail.data && Object.keys(detail.data).length > 0 && (
        <div className="border border-border bg-card rounded-none overflow-hidden shadow-xs">
          <div className="p-4 border-b border-border bg-muted/20">
            <h2 className="text-[14px] font-semibold text-foreground">
              Dữ liệu sự kiện nghiệp vụ
            </h2>
            <p className="text-[12px] text-muted-foreground font-normal">
              Chi tiết các tham số hệ thống ghi nhận khi sự kiện phát sinh
            </p>
          </div>

          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-[13px]">
              {detail.data.student_name && (
                <div className="p-3 border border-border bg-background rounded-none">
                  <span className="text-muted-foreground text-[12px] block">Học sinh liên quan:</span>
                  <span className="font-medium text-foreground">{detail.data.student_name}</span>
                </div>
              )}
              {detail.data.class_name && (
                <div className="p-3 border border-border bg-background rounded-none">
                  <span className="text-muted-foreground text-[12px] block">Lớp học:</span>
                  <span className="font-medium text-foreground">{detail.data.class_name}</span>
                </div>
              )}
              {detail.data.source_class && (
                <div className="p-3 border border-border bg-background rounded-none">
                  <span className="text-muted-foreground text-[12px] block">Lớp chuyển đi:</span>
                  <span className="font-medium text-foreground">{detail.data.source_class}</span>
                </div>
              )}
              {detail.data.destination_class && (
                <div className="p-3 border border-border bg-background rounded-none">
                  <span className="text-muted-foreground text-[12px] block">Lớp chuyển đến:</span>
                  <span className="font-medium text-foreground">{detail.data.destination_class}</span>
                </div>
              )}
              {detail.data.authorized_person && (
                <div className="p-3 border border-border bg-background rounded-none">
                  <span className="text-muted-foreground text-[12px] block">Người đón hộ:</span>
                  <span className="font-medium text-foreground">{detail.data.authorized_person}</span>
                </div>
              )}
              {detail.data.theme_name && (
                <div className="p-3 border border-border bg-background rounded-none">
                  <span className="text-muted-foreground text-[12px] block">Chủ đề giáo dục:</span>
                  <span className="font-medium text-foreground">{detail.data.theme_name}</span>
                </div>
              )}
              {detail.data.month && (
                <div className="p-3 border border-border bg-background rounded-none">
                  <span className="text-muted-foreground text-[12px] block">Tháng đánh giá:</span>
                  <span className="font-medium text-foreground">{detail.data.month}</span>
                </div>
              )}
              {detail.data.time && (
                <div className="p-3 border border-border bg-background rounded-none">
                  <span className="text-muted-foreground text-[12px] block">Thời điểm ghi nhận:</span>
                  <span className="font-medium text-foreground">{detail.data.time}</span>
                </div>
              )}
              {detail.data.holiday_name && (
                <div className="p-3 border border-border bg-background rounded-none">
                  <span className="text-muted-foreground text-[12px] block">Tên ngày nghỉ / Sự kiện:</span>
                  <span className="font-medium text-foreground">{detail.data.holiday_name}</span>
                </div>
              )}
              {detail.data.reason && (
                <div className="p-3 border border-border bg-background rounded-none md:col-span-2">
                  <span className="text-muted-foreground text-[12px] block">Lý do / Nội dung chi tiết:</span>
                  <span className="font-medium text-foreground">{detail.data.reason}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AutomatedNotificationOverviewPage;

