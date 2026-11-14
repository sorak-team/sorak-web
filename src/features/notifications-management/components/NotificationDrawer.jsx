import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Cancel01Icon,
  CheckmarkCircle02Icon,
  Delete02Icon,
  PlusSignIcon,
  Upload01Icon,
  Image01Icon,
  ViewIcon,
} from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNotificationsManagementStore } from '../notifications-management.store';
import { useClassesStore } from '@/features/classes/classes.store';
import { useAcademicYearStore } from '@/features/academic-years';
import { uploadApi } from '@/shared/api/upload.api';
import { cn } from '@/shared/lib/utils';

export function NotificationDrawer({ onSaved }) {
  const { t } = useTranslation();
  const {
    isDrawerOpen,
    drawerMode,
    activeBatchId,
    activeBroadcastDetail,
    isDetailLoading,
    closeDrawer,
    createBroadcast,
    updateBroadcast,
    openDeleteDialog,
  } = useNotificationsManagementStore();

  const selectedYearId = useAcademicYearStore((state) => state.selectedYearId);
  const classes = useClassesStore((state) => state.classes) || [];
  const fetchClasses = useClassesStore((state) => state.fetchClasses);

  useEffect(() => {
    if (isDrawerOpen && classes.length === 0 && selectedYearId) {
      fetchClasses(selectedYearId);
    }
  }, [isDrawerOpen, classes.length, selectedYearId, fetchClasses]);

  // Form State
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [targetScope, setTargetScope] = useState('ALL');
  const [targetGrade, setTargetGrade] = useState('MAM');
  const [selectedClassIds, setSelectedClassIds] = useState([]);
  const [dispatchTiming, setDispatchTiming] = useState('NOW'); // 'NOW' | 'SCHEDULED'
  const [scheduledAt, setScheduledAt] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState(null);
  const fileInputRef = useRef(null);

  // Close preview on Escape key
  useEffect(() => {
    if (!previewImageUrl) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setPreviewImageUrl(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewImageUrl]);

  // Populate form when drawer opens
  useEffect(() => {
    if (!isDrawerOpen) return;
    if (drawerMode === 'create') {
      setTitle('');
      setBody('');
      setTargetScope('ALL');
      setTargetGrade('MAM');
      setSelectedClassIds([]);
      setDispatchTiming('NOW');
      setScheduledAt('');
      setAttachments([]);
    } else if (drawerMode === 'edit' && activeBroadcastDetail) {
      setTitle(activeBroadcastDetail.title || '');
      setBody(activeBroadcastDetail.body || '');
      setTargetScope(activeBroadcastDetail.targetScope || 'ALL');
      setTargetGrade(activeBroadcastDetail.targetGrade || 'MAM');
      setSelectedClassIds(activeBroadcastDetail.targetClassIds || []);
      setAttachments(activeBroadcastDetail.attachments || []);
      if (activeBroadcastDetail.scheduledAt) {
        setDispatchTiming('SCHEDULED');
        try {
          const d = new Date(activeBroadcastDetail.scheduledAt);
          const pad = (n) => String(n).padStart(2, '0');
          const localStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
          setScheduledAt(localStr);
        } catch {
          setScheduledAt('');
        }
      } else {
        setDispatchTiming('NOW');
        setScheduledAt('');
      }
    }
  }, [isDrawerOpen, drawerMode, activeBroadcastDetail]);

  if (!isDrawerOpen) return null;

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
    const invalidFiles = files.filter((f) => !validMimes.includes(f.type));
    if (invalidFiles.length > 0) {
      toast.error('Định dạng tệp không được hỗ trợ. Vui lòng chọn ảnh JPG, PNG, WebP hoặc GIF.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const oversizedFiles = files.filter((f) => f.size > 10 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      toast.error('Kích thước ảnh tối đa cho phép là 10MB.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploadingImages(true);
    const toastId = toast.loading(`Đang tải ${files.length} ảnh lên MinIO S3...`);
    try {
      const uploadPromises = files.map((file) => uploadApi.uploadBulletinImage(file));
      const results = await Promise.all(uploadPromises);
      const newUrls = results.map((r) => r?.url || r?.relativeUrl).filter(Boolean);

      setAttachments((prev) => [...prev, ...newUrls]);
      toast.success(`Đã tải lên ${newUrls.length} ảnh lên MinIO S3 thành công!`, { id: toastId });
    } catch (err) {
      console.error('Failed to upload images to MinIO S3:', err);
      toast.error(err?.response?.data?.message || 'Tải ảnh lên MinIO S3 thất bại. Vui lòng thử lại.', { id: toastId });
    } finally {
      setIsUploadingImages(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveAttachment = (index) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleToggleClass = (classId) => {
    const sId = String(classId);
    if (selectedClassIds.includes(sId)) {
      setSelectedClassIds(selectedClassIds.filter((id) => id !== sId));
    } else {
      setSelectedClassIds([...selectedClassIds, sId]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error('Vui lòng nhập tiêu đề bản tin');
      return;
    }
    if (!body.trim()) {
      toast.error('Vui lòng nhập nội dung bản tin');
      return;
    }

    if (targetScope === 'CLASS' && selectedClassIds.length === 0) {
      toast.error('Vui lòng chọn ít nhất một lớp học');
      return;
    }

    const isScheduled = dispatchTiming === 'SCHEDULED';
    if (isScheduled && !scheduledAt) {
      toast.error('Vui lòng chọn thời gian lên lịch phát hành');
      return;
    }
    if (isScheduled && new Date(scheduledAt) <= new Date()) {
      toast.error('Thời gian lên lịch phải ở tương lai');
      return;
    }

    setIsSubmitting(true);
    try {
      if (drawerMode === 'create') {
        await createBroadcast({
          title: title.trim(),
          body: body.trim(),
          targetScope,
          targetGrade: targetScope === 'GRADE' ? targetGrade : undefined,
          targetClassIds: targetScope === 'CLASS' ? selectedClassIds : undefined,
          scheduledAt: isScheduled ? new Date(scheduledAt).toISOString() : null,
          attachments,
        });
      } else if (drawerMode === 'edit') {
        await updateBroadcast(activeBatchId, {
          title: title.trim(),
          body: body.trim(),
          scheduledAt: isScheduled ? new Date(scheduledAt).toISOString() : null,
          attachments,
        });
        if (onSaved) onSaved();
      }
    } catch (err) {
      // Error handled by store
    } finally {
      setIsSubmitting(false);
    }
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

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        onClick={closeDrawer}
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in-0 duration-200"
      />

      {/* Drawer Panel matching TeacherDrawer & StudentDrawer */}
      <div
        className={cn(
          'relative w-full max-w-[560px] h-full bg-card border-l border-border shadow-2xl flex flex-col',
          'animate-in slide-in-from-right duration-250 ease-out z-10 text-foreground',
        )}
        data-name="Notification Drawer"
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-border shrink-0">
          <div className="flex flex-col gap-1">
            <h2 className="text-[18px] font-semibold text-foreground tracking-tight">
              {drawerMode === 'create'
                ? 'Tạo bản tin mới'
                : drawerMode === 'edit'
                ? 'Chỉnh sửa bản tin'
                : 'Chi tiết bản tin'}
            </h2>
            <p className="text-[12px] text-muted-foreground font-normal">
              {drawerMode === 'create'
                ? 'Soạn và phát hành bản tin đến giáo viên và phụ huynh'
                : drawerMode === 'edit'
                ? 'Cập nhật tiêu đề, nội dung và thời gian phát hành của bản tin'
                : 'Xem nội dung bản tin và danh sách người nhận'}
            </p>
          </div>

          <button
            type="button"
            onClick={closeDrawer}
            className="size-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-none transition-colors cursor-pointer"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={16} />
          </button>
        </div>

        {/* Form Body */}
        {drawerMode === 'create' || drawerMode === 'edit' ? (
          <form
            id="notification-form"
            onSubmit={handleSubmit}
            className="flex-1 overflow-y-auto p-6 space-y-6"
          >
            {/* Card 1: Nội dung bản tin */}
            <div className="border border-border bg-card rounded-none overflow-hidden">
              <div className="p-4 border-b border-border bg-muted/20">
                <h3 className="text-[14px] font-semibold text-foreground">
                  Nội dung bản tin
                </h3>
                <p className="text-[12px] text-muted-foreground font-normal">
                  Tiêu đề và nội dung chi tiết của bản tin
                </p>
              </div>

              <div className="p-4 space-y-4">
                {/* Tiêu đề */}
                <div className="space-y-1.5">
                  <Label className="text-[12px] font-medium text-foreground">
                    Tiêu đề bản tin <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="VD: Lịch hoạt động ngoại khóa tham quan nông trại..."
                    maxLength={150}
                    required
                    className="h-9 text-[13px] rounded-none border-border"
                  />
                  <span className="text-[11px] text-muted-foreground block text-right">
                    {title.length}/150 ký tự
                  </span>
                </div>

                {/* Nội dung */}
                <div className="space-y-1.5">
                  <Label className="text-[12px] font-medium text-foreground">
                    Nội dung chi tiết <span className="text-destructive">*</span>
                  </Label>
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Nhập nội dung bản tin tại đây..."
                    rows={5}
                    required
                    className="w-full p-2.5 text-[13px] rounded-none bg-background border border-border focus:outline-none focus:ring-1 focus:ring-ring text-foreground resize-y leading-relaxed"
                  />
                </div>

                {/* Đính kèm hình ảnh - Tải lên MinIO S3 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-[12px] font-medium text-foreground">
                      Hình ảnh đính kèm (Tải lên MinIO S3)
                    </Label>
                    <span className="text-[11px] text-muted-foreground">
                      {attachments.length} ảnh
                    </span>
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    multiple
                    className="hidden"
                    onChange={handleImageUpload}
                  />

                  {/* Dropzone / Upload button */}
                  <div
                    onClick={() => !isUploadingImages && fileInputRef.current?.click()}
                    className={cn(
                      'border border-dashed border-border p-4 text-center cursor-pointer transition-colors hover:border-primary/50 hover:bg-muted/20 flex flex-col items-center justify-center gap-1.5 select-none rounded-none',
                      isUploadingImages && 'opacity-60 pointer-events-none',
                    )}
                    data-name="Upload · MinIO Dropzone"
                  >
                    <div className="size-9 bg-muted/40 border border-border flex items-center justify-center text-muted-foreground">
                      <HugeiconsIcon icon={Upload01Icon} size={18} />
                    </div>
                    <div className="text-[12.5px] font-medium text-foreground">
                      {isUploadingImages ? 'Đang tải ảnh lên MinIO S3...' : 'Bấm để tải ảnh lên từ thiết bị'}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Hỗ trợ JPG, PNG, WebP, GIF (tối đa 10MB/ảnh, có thể chọn nhiều ảnh cùng lúc)
                    </p>
                  </div>

                  {/* Preview danh sách ảnh đã tải lên */}
                  {attachments.length > 0 && (
                    <div className="grid grid-cols-3 gap-2.5 pt-1">
                      {attachments.map((url, idx) => (
                        <div
                          key={idx}
                          onClick={() => setPreviewImageUrl(url)}
                          className="group relative border border-border bg-muted/20 aspect-video rounded-none overflow-hidden flex items-center justify-center shadow-2xs cursor-pointer select-none"
                          title="Bấm để phóng to xem ảnh"
                        >
                          <img
                            src={url}
                            alt={`Hình ảnh đính kèm ${idx + 1}`}
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                            onError={(e) => {
                              // If image fails to render as img tag, show fallback
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                          {/* Corner delete button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveAttachment(idx);
                            }}
                            className="absolute top-1 right-1 size-6 bg-destructive/90 text-destructive-foreground hover:bg-destructive opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer rounded-none shadow-xs transition-opacity"
                            title="Xóa ảnh này"
                          >
                            <HugeiconsIcon icon={Delete02Icon} size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Card 2: Đối tượng nhận thông báo */}
            <div className="border border-border bg-card rounded-none overflow-hidden">
              <div className="p-4 border-b border-border bg-muted/20">
                <h3 className="text-[14px] font-semibold text-foreground">
                  Phạm vi người nhận
                </h3>
                <p className="text-[12px] text-muted-foreground font-normal">
                  Chỉ định đối tượng giáo viên và phụ huynh nhận bản tin
                </p>
              </div>

              <div className="p-4 space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-[12px] font-medium text-foreground">
                    Nhóm đối tượng <span className="text-destructive">*</span>
                  </Label>
                  <select
                    value={targetScope}
                    onChange={(e) => setTargetScope(e.target.value)}
                    className="h-9 w-full px-3 text-[13px] bg-background border border-border rounded-none text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
                  >
                    <option value="ALL">Toàn trường (Tất cả Giáo viên & Phụ huynh)</option>
                    <option value="ALL_TEACHERS">Tất cả Giáo viên</option>
                    <option value="ALL_PARENTS">Tất cả Phụ huynh</option>
                    <option value="GRADE">Theo Khối tuổi</option>
                    <option value="CLASS">Theo Lớp học cụ thể</option>
                  </select>
                </div>

                {/* Chọn Khối */}
                {targetScope === 'GRADE' && (
                  <div className="space-y-1.5 pt-1">
                    <Label className="text-[12px] font-medium text-foreground">
                      Chọn Khối tuổi
                    </Label>
                    <select
                      value={targetGrade}
                      onChange={(e) => setTargetGrade(e.target.value)}
                      className="h-9 w-full px-3 text-[13px] bg-background border border-border rounded-none text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
                    >
                      <option value="NHA_TRE">Nhà trẻ (18 - 36 tháng)</option>
                      <option value="MAM">Khối Mầm (3 - 4 tuổi)</option>
                      <option value="CHOI">Khối Chồi (4 - 5 tuổi)</option>
                      <option value="LA">Khối Lá (5 - 6 tuổi)</option>
                    </select>
                  </div>
                )}

                {/* Chọn Lớp */}
                {targetScope === 'CLASS' && (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-[12px] font-medium text-foreground">
                        Chọn các lớp học
                      </Label>
                      <span className="text-[11px] text-muted-foreground">
                        Đã chọn {selectedClassIds.length} lớp
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-2 border border-border bg-background">
                      {classes.map((cls) => {
                        const isSelected = selectedClassIds.includes(String(cls.id || cls.classId));
                        return (
                          <button
                            key={cls.id || cls.classId}
                            type="button"
                            onClick={() => handleToggleClass(cls.id || cls.classId)}
                            className={cn(
                              'h-8 px-2 text-[12px] rounded-none border flex items-center justify-between transition-colors cursor-pointer text-left',
                              isSelected
                                ? 'border-primary bg-primary/10 text-primary font-medium'
                                : 'border-border bg-card hover:bg-muted/50 text-foreground',
                            )}
                          >
                            <span className="truncate">{cls.name}</span>
                            {isSelected && <span className="text-primary font-bold">✓</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Card 3: Lập lịch phát hành */}
            <div className="border border-border bg-card rounded-none overflow-hidden">
              <div className="p-4 border-b border-border bg-muted/20">
                <h3 className="text-[14px] font-semibold text-foreground">
                  Thời gian phát hành
                </h3>
                <p className="text-[12px] text-muted-foreground font-normal">
                  Chọn phát ngay hoặc đặt lịch phát hành trong tương lai
                </p>
              </div>

              <div className="p-4 space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-[12px] font-medium text-foreground">
                    Hình thức phát hành
                  </Label>
                  <select
                    value={dispatchTiming}
                    onChange={(e) => setDispatchTiming(e.target.value)}
                    className="h-9 w-full px-3 text-[13px] bg-background border border-border rounded-none text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
                  >
                    <option value="NOW">Gửi ngay bây giờ</option>
                    <option value="SCHEDULED">Lên lịch phát hành trong tương lai</option>
                  </select>
                </div>

                {dispatchTiming === 'SCHEDULED' && (
                  <div className="space-y-1.5 pt-1">
                    <Label className="text-[12px] font-medium text-foreground">
                      Ngày và giờ phát hành <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      required
                      className="h-9 text-[13px] rounded-none border-border"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Hệ thống sẽ tự động gửi thông báo đến người nhận khi đến đúng thời điểm này.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </form>
        ) : (
          /* VIEW / DETAIL MODE */
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {isDetailLoading || !activeBroadcastDetail ? (
              <div className="py-16 text-center text-muted-foreground text-[13px] animate-pulse">
                Đang tải dữ liệu chi tiết...
              </div>
            ) : (
              <>
                {/* Card 1: Tổng quan */}
                <div className="border border-border bg-card rounded-none overflow-hidden">
                  <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
                    <div>
                      <h3 className="text-[14px] font-semibold text-foreground">
                        Thông tin đợt thông báo
                      </h3>
                      <p className="text-[12px] text-muted-foreground font-normal">
                        Trạng thái phát hành và tiến độ người đọc
                      </p>
                    </div>
                    <span
                      className={cn(
                        'px-2 py-0.5 text-[11px] font-medium rounded-none',
                        activeBroadcastDetail.status === 'SCHEDULED'
                          ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300'
                          : 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300',
                      )}
                    >
                      {activeBroadcastDetail.status === 'SCHEDULED'
                        ? 'Đã lên lịch'
                        : 'Đã phát hành'}
                    </span>
                  </div>

                  <div className="p-4 space-y-3 text-[13px]">
                    <div>
                      <span className="text-muted-foreground">Tiêu đề: </span>
                      <span className="font-semibold text-foreground">
                        {activeBroadcastDetail.title}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[12px]">
                      <div>
                        <span className="text-muted-foreground">Thời gian phát: </span>
                        <span className="font-medium text-foreground">
                          {formatDateTime(
                            activeBroadcastDetail.scheduledAt || activeBroadcastDetail.createdAt,
                          )}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Phạm vi gửi: </span>
                        <span className="font-medium text-foreground">
                          {activeBroadcastDetail.targetScope}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Tổng người nhận: </span>
                        <span className="font-medium text-foreground">
                          {activeBroadcastDetail.totalRecipients} tài khoản
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Đã đọc: </span>
                        <span className="font-medium text-primary">
                          {activeBroadcastDetail.readCount} /{' '}
                          {activeBroadcastDetail.totalRecipients} (
                          {activeBroadcastDetail.totalRecipients > 0
                            ? Math.round(
                                (activeBroadcastDetail.readCount /
                                  activeBroadcastDetail.totalRecipients) *
                                  100,
                              )
                            : 0}
                          %)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 2: Nội dung chi tiết */}
                <div className="border border-border bg-card rounded-none overflow-hidden">
                  <div className="p-4 border-b border-border bg-muted/20">
                    <h3 className="text-[14px] font-semibold text-foreground">
                      Nội dung thông điệp
                    </h3>
                  </div>
                  <div className="p-4 text-[13px] leading-relaxed text-foreground whitespace-pre-wrap">
                    {activeBroadcastDetail.body}
                  </div>
                  {activeBroadcastDetail.attachments?.length > 0 && (
                    <div className="p-4 pt-0 space-y-1.5">
                      <Label className="text-[12px] font-medium text-muted-foreground">
                        Tệp đính kèm ({activeBroadcastDetail.attachments.length})
                      </Label>
                      {activeBroadcastDetail.attachments.map((url, i) => (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="block p-2 bg-muted/40 border border-border text-[12px] text-primary hover:underline rounded-none truncate"
                        >
                          {url}
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                {/* Card 3: Danh sách người nhận */}
                <div className="border border-border bg-card rounded-none overflow-hidden">
                  <div className="p-4 border-b border-border bg-muted/20">
                    <h3 className="text-[14px] font-semibold text-foreground">
                      Danh sách người nhận ({activeBroadcastDetail.recipients?.length || 0})
                    </h3>
                  </div>
                  <div className="max-h-56 overflow-y-auto">
                    <table className="w-full text-left text-[12px]">
                      <thead className="bg-muted/40 border-b border-border sticky top-0 text-muted-foreground font-medium">
                        <tr>
                          <th className="px-3 py-2">Tên người nhận</th>
                          <th className="px-3 py-2">Vai trò</th>
                          <th className="px-3 py-2 text-right">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {activeBroadcastDetail.recipients?.map((r) => (
                          <tr key={r.id} className="hover:bg-muted/30">
                            <td className="px-3 py-2 font-medium text-foreground">
                              {r.name}
                            </td>
                            <td className="px-3 py-2 text-muted-foreground">
                              {r.role === 'TEACHER_GV' ? 'Giáo viên' : 'Phụ huynh'}
                            </td>
                            <td className="px-3 py-2 text-right">
                              {r.isRead ? (
                                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium text-[11px]">
                                  <HugeiconsIcon icon={CheckmarkCircle02Icon} size={12} />
                                  Đã đọc
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-[11px]">
                                  Chưa xem
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Footer matching TeacherDrawer & StudentDrawer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border shrink-0 bg-background">
          {drawerMode === 'create' || drawerMode === 'edit' ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={closeDrawer}
                disabled={isSubmitting}
                className="h-8 px-4 text-[13px] rounded-none border-border cursor-pointer"
              >
                Hủy
              </Button>
              <Button
                type="submit"
                form="notification-form"
                disabled={isSubmitting}
                className="h-8 px-4 text-[13px] rounded-none bg-[#1447e6] hover:bg-[#1447e6]/90 text-white cursor-pointer"
              >
                {isSubmitting
                  ? 'Đang lưu...'
                  : drawerMode === 'edit'
                  ? 'Lưu thay đổi'
                  : dispatchTiming === 'SCHEDULED'
                  ? 'Lên lịch'
                  : 'Phát hành'}
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="destructive"
                onClick={() => openDeleteDialog(activeBroadcastDetail.batchId)}
                className="h-8 px-3 text-[12px] rounded-none cursor-pointer mr-auto"
              >
                Thu hồi bản tin
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={closeDrawer}
                className="h-8 px-4 text-[13px] rounded-none border-border cursor-pointer"
              >
                Đóng
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Clean Image Popup / Lightbox */}
      {previewImageUrl && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in-0 duration-150 select-none cursor-pointer"
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
