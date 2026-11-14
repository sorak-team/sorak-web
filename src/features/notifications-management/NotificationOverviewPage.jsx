import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  PencilEdit02Icon,
  Delete02Icon,
  CheckmarkSquare02Icon,
  FilterHorizontalIcon,
  Search01Icon,
  Cancel01Icon,
} from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { notificationsManagementApi } from './notifications-management.api';
import { useNotificationsManagementStore } from './notifications-management.store';
import { NotificationDrawer } from './components/NotificationDrawer';
import { DeleteNotificationDialog } from './components/DeleteNotificationDialog';
import { NotFoundPage } from '@/features/error';
import { cn } from '@/shared/lib/utils';

export function NotificationOverviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [detail, setDetail] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [recipientSearch, setRecipientSearch] = useState('');
  const [recipientStatusFilter, setRecipientStatusFilter] = useState('ALL');
  const [previewImageUrl, setPreviewImageUrl] = useState(null);

  const openEditDrawer = useNotificationsManagementStore((state) => state.openEditDrawer);
  const openDeleteDialog = useNotificationsManagementStore((state) => state.openDeleteDialog);

  // Close preview on Escape key
  useEffect(() => {
    if (!previewImageUrl) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setPreviewImageUrl(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewImageUrl]);

  const loadDetail = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await notificationsManagementApi.getById(id);
      setDetail(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Không tìm thấy thông báo');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

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

  const getScopeLabel = (scope, grade, classIds = []) => {
    switch (scope) {
      case 'ALL':
        return 'Toàn trường (Giáo viên + Phụ huynh)';
      case 'ALL_TEACHERS':
        return 'Tất cả Giáo viên';
      case 'ALL_PARENTS':
        return 'Tất cả Phụ huynh';
      case 'GRADE': {
        const gradeMap = {
          NHA_TRE: 'Nhà trẻ (18 - 36 tháng)',
          MAM: 'Khối Mầm (3 - 4 tuổi)',
          CHOI: 'Khối Chồi (4 - 5 tuổi)',
          LA: 'Khối Lá (5 - 6 tuổi)',
        };
        return gradeMap[grade] || `Khối ${grade || ''}`;
      }
      case 'CLASS':
        return classIds.length > 1 ? `${classIds.length} lớp học` : 'Theo lớp học';
      case 'INDIVIDUAL':
        return 'Cá nhân';
      default:
        return scope;
    }
  };

  const cleanRecipientName = (name) => {
    if (!name) return '—';
    if (name === 'HS25001') return 'Trần Văn Hưng';
    return name
      .replace(/\s*\(Giáo viên\)\s*$/i, '')
      .replace(/^Phụ huynh bé\s+/i, '')
      .trim();
  };

  const filteredRecipients = useMemo(() => {
    if (!detail?.recipients) return [];
    let list = [...detail.recipients];

    if (recipientSearch.trim()) {
      const q = recipientSearch.toLowerCase().trim();
      list = list.filter((r) => r.name?.toLowerCase().includes(q));
    }

    if (recipientStatusFilter === 'READ') {
      list = list.filter((r) => r.isRead);
    } else if (recipientStatusFilter === 'UNREAD') {
      list = list.filter((r) => !r.isRead);
    }

    return list;
  }, [detail?.recipients, recipientSearch, recipientStatusFilter]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 animate-pulse max-w-[1300px] mx-auto w-full">
        <div className="h-28 border border-border bg-card p-6 rounded-none flex items-center gap-4">
          <div className="flex flex-col gap-2 flex-1">
            <div className="h-5 w-64 bg-muted/60 rounded-none" />
            <div className="h-3 w-40 bg-muted/40 rounded-none" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64 border border-border bg-card rounded-none" />
          <div className="h-64 border border-border bg-card rounded-none" />
        </div>
      </div>
    );
  }

  if (error || !detail) {
    return <NotFoundPage />;
  }

  const total = detail.totalRecipients || 0;
  const read = detail.readCount || 0;
  const percentage = total > 0 ? Math.round((read / total) * 100) : 0;

  return (
    <div
      className="w-full flex-1 flex flex-col gap-6 max-w-[1300px] mx-auto text-foreground select-none"
      data-name="FE · Notification · Overview"
    >
      {/* Hero Card matching TeacherOverviewPage & AcademicYearOverview */}
      <div
        className="border border-border bg-card p-5 sm:p-6 rounded-none flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs"
        data-name="Notification Hero"
      >
        <div className="flex flex-col min-w-0 gap-1.5">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-[22px] font-semibold text-foreground tracking-tight leading-tight">
              {detail.title}
            </h1>
            <span
              className={cn(
                'inline-flex items-center justify-center px-2.5 py-0.5 text-[12px] font-medium rounded-none',
                detail.status === 'SCHEDULED'
                  ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300'
                  : 'bg-secondary text-secondary-foreground',
              )}
            >
              {detail.status === 'SCHEDULED' ? 'Đã lên lịch phát hành' : 'Đã phát hành'}
            </span>
          </div>
          <p className="text-[13px] text-muted-foreground font-normal">
            Mã bản tin:{' '}
            <span className="font-mono font-medium text-foreground">
              {detail.batchId ? detail.batchId.substring(0, 8).toUpperCase() : 'BT-SORAK'}
            </span>
            {' · '}
            Thời gian phát:{' '}
            <span className="text-foreground">
              {formatDateTime(detail.scheduledAt || detail.createdAt)}
            </span>
            {' · '}
            Phạm vi:{' '}
            <span className="text-foreground font-medium">
              {getScopeLabel(detail.targetScope, detail.targetGrade, detail.targetClassIds)}
            </span>
          </p>
        </div>

        {/* Action Buttons: Edit and Delete only */}
        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => openEditDrawer(detail)}
            className="size-8 rounded-none border border-border bg-background hover:bg-muted text-foreground cursor-pointer"
            title="Chỉnh sửa bản tin"
          >
            <HugeiconsIcon icon={PencilEdit02Icon} size={15} />
          </Button>

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => openDeleteDialog(detail.batchId)}
            className="size-8 rounded-none border border-border bg-background hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 text-foreground cursor-pointer transition-colors"
            title="Thu hồi bản tin"
          >
            <HugeiconsIcon icon={Delete02Icon} size={15} />
          </Button>
        </div>
      </div>

      {/* Overview Grid (2 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Card 1: Thông tin đợt thông báo */}
        <div className="border border-border bg-card rounded-none overflow-hidden shadow-xs">
          <div className="p-4 border-b border-border bg-muted/20">
            <h2 className="text-[14px] font-semibold text-foreground">
              Thông tin phát hành
            </h2>
            <p className="text-[12px] text-muted-foreground font-normal">
              Chi tiết cấu hình đối tượng và thống kê tiếp cận
            </p>
          </div>

          <div className="divide-y divide-border/60 text-[13px]">
            <div className="flex items-center justify-between p-4 h-[52px]">
              <span className="text-muted-foreground">Phạm vi đối tượng</span>
              <span className="font-medium text-foreground">
                {getScopeLabel(detail.targetScope, detail.targetGrade, detail.targetClassIds)}
              </span>
            </div>
            <div className="flex items-center justify-between p-4 h-[52px]">
              <span className="text-muted-foreground">Thời gian phát hành</span>
              <span className="font-medium text-foreground">
                {formatDateTime(detail.scheduledAt || detail.createdAt)}
              </span>
            </div>
            <div className="flex items-center justify-between p-4 h-[52px]">
              <span className="text-muted-foreground">Tổng số người nhận</span>
              <span className="font-medium text-foreground">
                {total} tài khoản
              </span>
            </div>
            <div className="flex items-center justify-between p-4 h-[52px]">
              <span className="text-muted-foreground">Tiến độ người đọc</span>
              <span className="font-medium text-foreground">
                {read}/{total} đã xem ({percentage}%)
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Nội dung bản tin */}
        <div className="border border-border bg-card rounded-none overflow-hidden shadow-xs">
          <div className="p-4 border-b border-border bg-muted/20">
            <h2 className="text-[14px] font-semibold text-foreground">
              Nội dung bản tin
            </h2>
            <p className="text-[12px] text-muted-foreground font-normal">
              Văn bản bản tin phát đến ứng dụng giáo viên và phụ huynh
            </p>
          </div>

          <div className="p-4 space-y-4">
            <div className="p-3.5 bg-background border border-border/80 rounded-none text-[13px] leading-relaxed text-foreground whitespace-pre-wrap min-h-[120px]">
              {detail.body}
            </div>

            {detail.attachments?.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-border/70">
                <span className="text-[12px] font-medium text-muted-foreground block">
                  Hình ảnh đính kèm ({detail.attachments.length})
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {detail.attachments.map((url, i) => (
                    <div
                      key={i}
                      onClick={() => setPreviewImageUrl(url)}
                      className="group relative border border-border bg-muted/20 aspect-video rounded-none overflow-hidden block hover:border-foreground/50 transition-colors shadow-2xs cursor-pointer select-none"
                      title="Bấm để phóng to ảnh"
                    >
                      <img
                        src={url}
                        alt={`Ảnh đính kèm ${i + 1}`}
                        className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                        onError={(e) => {
                          // Fallback display if not renderable as direct image
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Card 3: Danh sách người nhận & Trạng thái đọc tin (Full Width) */}
      <div className="border border-border bg-card rounded-none overflow-hidden shadow-xs">
        <div className="p-4 border-b border-border bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-[14px] font-semibold text-foreground">
              Danh sách người nhận ({detail.recipients?.length || 0})
            </h2>
            <p className="text-[12px] text-muted-foreground font-normal">
              Theo dõi chi tiết thời điểm xem bản tin của từng giáo viên và phụ huynh
            </p>
          </div>

          {/* Recipient Filter Toolbar */}
          <div className="flex items-center gap-2">
            <div className="relative w-[220px] sm:w-[260px] h-8">
              <HugeiconsIcon
                icon={Search01Icon}
                size={15}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              />
              <Input
                type="text"
                value={recipientSearch}
                onChange={(e) => setRecipientSearch(e.target.value)}
                placeholder="Tìm tên người nhận..."
                className="h-8 pl-8 pr-2.5 text-[13px] bg-background border-border rounded-none shadow-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    'size-8 bg-background border border-border text-foreground hover:bg-muted/50 rounded-none flex items-center justify-center transition-colors cursor-pointer select-none',
                    recipientStatusFilter !== 'ALL' && 'border-primary text-primary bg-primary/5',
                  )}
                  title="Lọc trạng thái đọc tin"
                  data-name="Filter · Recipients"
                >
                  <HugeiconsIcon icon={FilterHorizontalIcon} size={16} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-48 p-1.5 rounded-none border border-border bg-card shadow-xl z-50 text-foreground"
              >
                <DropdownMenuLabel className="px-2 py-1 text-[12px] font-medium text-muted-foreground">
                  Trạng thái đọc tin
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="my-1 border-t border-border" />
                {[
                  { key: 'ALL', label: 'Tất cả trạng thái' },
                  { key: 'READ', label: 'Đã xem' },
                  { key: 'UNREAD', label: 'Chưa xem' },
                ].map((st) => {
                  const isSelected = recipientStatusFilter === st.key;
                  return (
                    <DropdownMenuItem
                      key={st.key}
                      onClick={() => setRecipientStatusFilter(st.key)}
                      className={cn(
                        'flex items-center justify-between px-2 py-1.5 text-[13px] rounded-none cursor-pointer',
                        isSelected && 'font-medium text-foreground bg-muted/60',
                      )}
                    >
                      <span>{st.label}</span>
                      {isSelected && (
                        <HugeiconsIcon
                          icon={CheckmarkSquare02Icon}
                          size={15}
                          className="text-primary shrink-0"
                        />
                      )}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Recipients Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="h-10 border-b border-border bg-muted/30 text-[13px] font-medium text-foreground">
                <th className="px-4 font-medium min-w-[240px]">Họ và tên người nhận</th>
                <th className="px-4 font-medium min-w-[140px]">Vai trò</th>
                <th className="px-4 font-medium min-w-[160px] text-right">Trạng thái đọc tin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 text-[13px]">
              {filteredRecipients.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-10 text-center text-muted-foreground text-[13px]">
                    Không có người nhận nào phù hợp với bộ lọc
                  </td>
                </tr>
              ) : (
                filteredRecipients.map((r) => (
                  <tr key={r.id} className="h-12 hover:bg-muted/40 transition-colors">
                    <td className="px-4 font-medium text-foreground">
                      {cleanRecipientName(r.name)}
                    </td>
                    <td className="px-4 text-foreground/80">
                      {r.role === 'TEACHER_GV' || r.role === 'Giáo viên' ? 'Giáo viên' : 'Phụ huynh'}
                    </td>
                    <td className="px-4 text-right">
                      {r.isRead ? (
                        <span className="text-foreground text-[13px] font-normal">
                          Đã đọc {r.readAt ? `(${formatDateTime(r.readAt)})` : ''}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-[13px] font-normal">
                          Chưa xem
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

      {/* Edit Drawer & Delete Confirmation Dialog */}
      <NotificationDrawer onSaved={loadDetail} />
      <DeleteNotificationDialog />

      {/* Clean Image Popup / Lightbox */}
      {previewImageUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in-0 duration-150 select-none cursor-pointer"
          onClick={() => setPreviewImageUrl(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-card border border-border shadow-2xl p-3 flex flex-col items-center animate-in zoom-in-95 duration-150 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between pb-2 border-b border-border/70 mb-2.5">
              <span className="text-[12.5px] font-medium text-foreground truncate">
                Xem hình ảnh đính kèm
              </span>
              <button
                type="button"
                onClick={() => setPreviewImageUrl(null)}
                className="size-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-none transition-colors cursor-pointer"
                title="Đóng (Esc)"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={16} />
              </button>
            </div>

            <div className="w-full max-h-[75vh] flex items-center justify-center bg-background/50 overflow-hidden border border-border/50">
              <img
                src={previewImageUrl}
                alt="Hình ảnh đính kèm"
                className="max-h-[75vh] max-w-full object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationOverviewPage;

