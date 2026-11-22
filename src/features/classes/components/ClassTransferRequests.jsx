import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Search01Icon,
  PlusSignIcon,
  Tick01Icon,
  Cancel01Icon,
  ArrowRight01Icon,
  MoreHorizontalIcon,
} from '@hugeicons/core-free-icons';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/shared/lib/utils';
import { classesApi } from '../classes.api';
import { CreateTransferDrawer } from './CreateTransferDrawer';
import { getStudentAvatarUrl } from '../../students/students.store';

export function ClassTransferRequests({ currentClass }) {
  const { t, i18n } = useTranslation();
  const [data, setData] = useState({
    items: [],
    targetClasses: [],
    summary: { total: 0, pending: 0, approved: 0, rejected: 0 },
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [directionFilter, setDirectionFilter] = useState('ALL'); // ALL | OUT | IN
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL | PENDING | APPROVED | REJECTED
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Rejection modal state
  const [transferToReject, setTransferToReject] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const loadData = useCallback(async () => {
    if (!currentClass?.id) return;
    try {
      setIsLoading(true);
      const res = await classesApi.getClassTransfers(currentClass.id, {
        direction: directionFilter,
        status: statusFilter,
        search: searchQuery,
      });
      setData(res);
    } catch (err) {
      console.error('Error loading transfer requests:', err);
      toast.error(t('classes.loadTransfersError', 'Không thể tải danh sách yêu cầu chuyển lớp.'));
    } finally {
      setIsLoading(false);
    }
  }, [currentClass?.id, directionFilter, statusFilter, searchQuery, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleApprove = async (transfer) => {
    try {
      setIsUpdatingStatus(true);
      await classesApi.updateTransferStatus(currentClass.id, transfer.id, {
        status: 'APPROVED',
      });
      toast.success(
        t('classes.approveTransferSuccess', 'Đã phê duyệt yêu cầu chuyển lớp thành công!'),
      );
      loadData();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || t('classes.approveTransferError', 'Lỗi khi phê duyệt');
      toast.error(msg);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!transferToReject) return;
    try {
      setIsUpdatingStatus(true);
      await classesApi.updateTransferStatus(currentClass.id, transferToReject.id, {
        status: 'REJECTED',
        rejectedReason: rejectReason.trim(),
      });
      toast.success(
        t('classes.rejectTransferSuccess', 'Đã từ chối yêu cầu chuyển lớp.'),
      );
      setTransferToReject(null);
      setRejectReason('');
      loadData();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || t('classes.rejectTransferError', 'Lỗi khi từ chối');
      toast.error(msg);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const summary = data.summary || { total: 0, pending: 0, approved: 0, rejected: 0 };
  const items = data.items || [];

  return (
    <>
      {/* Page Header matching Cấu hình lớp */}
      <div className="flex flex-col gap-1">
        <h1 className="text-[26px] font-semibold text-foreground tracking-tight">
          {t('classes.transfersTitle', 'Chuyển lớp')}
        </h1>
        <p className="text-[12px] text-muted-foreground font-normal">
          {t(
            'classes.transfersSubtitle',
            'Theo dõi và xử lý các yêu cầu điều chuyển học sinh chuyển đến hoặc chuyển đi khỏi lớp',
          )}
        </p>
      </div>

      <div className="flex flex-col gap-6 max-w-[1050px]" data-name="ClassTransferRequests">
        {/* Main Card: Yêu cầu chuyển lớp */}
        <div
          className="bg-card border border-border rounded-none shadow-xs overflow-hidden"
          data-name="Card · Yêu cầu chuyển lớp"
        >
          <div className="p-5 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-col gap-1">
                <h2 className="text-[15px] font-medium text-foreground">
                  {t('classes.transfersCardHeading', 'Danh sách yêu cầu chuyển lớp')}
                </h2>
                <p className="text-[13px] text-muted-foreground">
                  {t(
                    'classes.transfersCardDesc',
                    'Theo dõi tình trạng hồ sơ chuyển lớp và thực hiện xét duyệt.',
                  )}
                </p>
              </div>

              <Button
                type="button"
                onClick={() => setIsDrawerOpen(true)}
                className="h-8 px-3 rounded-none bg-[#1447e6] hover:bg-[#1447e6]/90 text-white text-[13px] font-medium cursor-pointer shadow-none flex items-center gap-1.5 shrink-0"
              >
                <HugeiconsIcon icon={PlusSignIcon} size={15} />
                <span>{t('classes.newTransferBtn', 'Tạo yêu cầu')}</span>
              </Button>
            </div>

            {/* Filter Sub-toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-border">
              {/* Status filter tabs */}
              <div className="flex items-center gap-1 pt-2 sm:pt-0">
                {[
                  { key: 'ALL', label: t('classes.filterAllTransfers', 'Tất cả ({{count}})', { count: summary.total }) },
                  { key: 'PENDING', label: t('classes.filterPendingTransfers', 'Chờ duyệt ({{count}})', { count: summary.pending }) },
                  { key: 'APPROVED', label: t('classes.filterApprovedTransfers', 'Đã duyệt ({{count}})', { count: summary.approved }) },
                  { key: 'REJECTED', label: t('classes.filterRejectedTransfers', 'Từ chối ({{count}})', { count: summary.rejected }) },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setStatusFilter(tab.key)}
                    className={cn(
                      'h-8 px-3 text-[12.5px] rounded-none border transition-colors cursor-pointer',
                      statusFilter === tab.key
                        ? 'border-primary bg-primary text-primary-foreground font-medium'
                        : 'border-border bg-card text-muted-foreground hover:bg-muted/50',
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Standard search input */}
              <div className="relative w-full sm:w-[260px] h-8">
                <HugeiconsIcon
                  icon={Search01Icon}
                  size={15}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                />
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('classes.searchTransfersPlaceholder', 'Tìm kiếm học sinh...')}
                  className="h-8 pl-8 pr-2.5 text-[13px] bg-background border-border rounded-none shadow-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
            </div>

            {/* Transfers Table matching TeacherTable */}
            <div className="w-full border border-border bg-card rounded-none overflow-x-auto shadow-xs select-none">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="h-10 border-b border-border bg-muted/30 text-[13px] font-medium text-foreground">
                    <th className="px-3 w-[50px] text-center font-medium">{t('classes.colIndex', 'STT')}</th>
                    <th className="px-3 min-w-[220px] font-medium">
                      {t('student.colStudent', 'Học sinh')}
                    </th>
                    <th className="px-3 min-w-[200px] font-medium">
                      {t('classes.transferRouteCol', 'Lộ trình chuyển')}
                    </th>
                    <th className="px-3 min-w-[130px] font-medium">
                      {t('classes.transferDateCol', 'Ngày hiệu lực')}
                    </th>
                    <th className="px-3 min-w-[120px] font-medium">
                      {t('student.colStatus', 'Trạng thái')}
                    </th>
                    <th className="px-3 min-w-[95px] w-[95px] text-right font-medium whitespace-nowrap">
                      {t('common.actions', 'Thao tác')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {isLoading ? (
                    Array.from({ length: 3 }).map((_, idx) => (
                      <tr key={idx} className="h-[72px] animate-pulse">
                        <td className="px-3 text-center"><div className="h-3 w-6 bg-muted/40 mx-auto" /></td>
                        <td className="px-3">
                          <div className="flex items-center gap-3">
                            <div className="size-8 bg-muted/60 rounded-none shrink-0" />
                            <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                              <div className="h-3.5 w-28 bg-muted/60" />
                              <div className="h-2.5 w-16 bg-muted/40" />
                            </div>
                          </div>
                        </td>
                        <td className="px-3"><div className="h-3.5 w-32 bg-muted/50" /></td>
                        <td className="px-3"><div className="h-3.5 w-24 bg-muted/50" /></td>
                        <td className="px-3"><div className="h-5 w-20 bg-muted/50" /></td>
                        <td className="px-3 text-right"><div className="size-7 bg-muted/40 ml-auto" /></td>
                      </tr>
                    ))
                  ) : items.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-muted-foreground text-[13px]">
                        {searchQuery.trim()
                          ? t('classes.noMatchingStudent', 'Không tìm thấy học sinh nào phù hợp.')
                          : t('classes.noTransfersFound', 'Không có yêu cầu chuyển lớp nào.')}
                      </td>
                    </tr>
                  ) : (
                    items.map((transfer, index) => {
                      const isOutbound = transfer.direction === 'OUT';
                      const dateStr = transfer.transferDate
                        ? new Date(transfer.transferDate).toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'vi-VN')
                        : '—';

                      return (
                        <tr
                          key={transfer.id}
                          className="h-[72px] hover:bg-muted/40 transition-colors group cursor-default"
                        >
                          <td className="px-3 text-center text-muted-foreground font-mono text-[12px] w-[50px]">
                            {index + 1}
                          </td>

                          {/* Student Info matching TeacherTable / StudentTable */}
                          <td className="px-3">
                            <div className="flex items-center gap-3">
                              <div className="size-8 shrink-0 rounded-none overflow-hidden border border-border/80 bg-muted/40">
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
                              <div className="flex flex-col min-w-0 leading-tight">
                                <span className="text-[14px] font-medium text-foreground truncate">
                                  {transfer.studentName}
                                </span>
                                <span className="text-[12px] text-muted-foreground truncate font-mono">
                                  {transfer.studentCode || '—'}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Route */}
                          <td className="px-3">
                            <div className="flex items-center gap-2 text-[14px]">
                              <span className={cn('truncate', isOutbound ? 'text-foreground font-medium' : 'text-muted-foreground')}>
                                {transfer.fromClassName}
                              </span>
                              <HugeiconsIcon icon={ArrowRight01Icon} size={14} className="text-muted-foreground shrink-0" />
                              <span className={cn('truncate', !isOutbound ? 'text-primary font-medium' : 'text-foreground')}>
                                {transfer.toClassName}
                              </span>
                            </div>
                          </td>

                          {/* Date */}
                          <td className="px-3 text-[14px] text-foreground font-normal whitespace-nowrap">
                            {dateStr}
                          </td>

                          {/* Status Badge */}
                          <td className="px-3 whitespace-nowrap">
                            {transfer.status === 'PENDING' && (
                              <span className="inline-flex items-center justify-center px-2 py-0.5 text-[12px] font-medium bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 rounded-none">
                                {t('transfers.statusPending', 'Chờ duyệt')}
                              </span>
                            )}
                            {transfer.status === 'APPROVED' && (
                              <span className="inline-flex items-center justify-center px-2 py-0.5 text-[12px] font-medium bg-secondary text-secondary-foreground rounded-none">
                                {t('transfers.statusApproved', 'Đã duyệt')}
                              </span>
                            )}
                            {transfer.status === 'REJECTED' && (
                              <span className="inline-flex items-center justify-center px-2 py-0.5 text-[12px] font-medium bg-muted text-muted-foreground rounded-none">
                                {t('transfers.statusRejected', 'Đã từ chối')}
                              </span>
                            )}
                          </td>

                          {/* Actions Dropdown matching TeacherTable */}
                          <td className="px-3 min-w-[95px] w-[95px] text-right whitespace-nowrap">
                            {transfer.status === 'PENDING' ? (
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
                                    onClick={() => handleApprove(transfer)}
                                    className="flex items-center gap-2 h-8 px-2 text-[13px] text-emerald-600 dark:text-emerald-400 cursor-pointer rounded-none hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                                  >
                                    <HugeiconsIcon icon={Tick01Icon} size={15} />
                                    <span>{t('classes.approveAction', 'Duyệt yêu cầu')}</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator className="my-1 border-t border-border" />
                                  <DropdownMenuItem
                                    onClick={() => setTransferToReject(transfer)}
                                    className="flex items-center gap-2 h-8 px-2 text-[13px] text-destructive hover:text-destructive hover:bg-destructive/10 focus:text-destructive focus:bg-destructive/10 cursor-pointer rounded-none"
                                  >
                                    <HugeiconsIcon icon={Cancel01Icon} size={15} />
                                    <span>{t('classes.rejectAction', 'Từ chối')}</span>
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            ) : (
                              <span className="text-[12px] text-muted-foreground font-normal pr-2">
                                {transfer.status === 'APPROVED' ? t('common.completed', 'Hoàn tất') : t('common.closed', 'Đã đóng')}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="border-t border-border px-5 py-3 bg-muted/20 flex items-center justify-between">
            <span className="text-[12px] text-muted-foreground">
              {t(
                'classes.transferHelperNote',
                'Khi phê duyệt thành công, học sinh sẽ được tự động chuyển sang sĩ số lớp mới.',
              )}
            </span>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDrawerOpen(true)}
              className="h-8 px-3 rounded-none border-border text-[13px] font-normal hover:bg-muted/70 shadow-none cursor-pointer flex items-center gap-1.5"
            >
              <HugeiconsIcon icon={PlusSignIcon} size={14} />
              <span>{t('classes.createTransferSmallBtn', 'Thêm yêu cầu')}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Slide-out Drawer */}
      <CreateTransferDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        classId={currentClass.id}
        className={currentClass.name}
        targetClasses={data.targetClasses || []}
        onSuccess={loadData}
      />

      {/* Rejection Modal matching standard confirmation dialog */}
      {transferToReject && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-[420px] border border-border bg-card p-5 rounded-none shadow-xl flex flex-col gap-4 select-none">
            <div className="flex flex-col gap-1">
              <h3 className="text-[16px] font-semibold text-foreground">
                {t('classes.confirmRejectTitle', 'Từ chối yêu cầu chuyển lớp')}
              </h3>
              <p className="text-[13px] text-muted-foreground">
                {t(
                  'classes.confirmRejectDesc',
                  'Học sinh {{name}} ({{code}}) sẽ được giữ nguyên tại lớp hiện tại.',
                  {
                    name: transferToReject.studentName,
                    code: transferToReject.studentCode,
                  },
                )}
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[12.5px] font-medium text-foreground">
                {t('classes.rejectReasonPrompt', 'Lý do từ chối (tùy chọn)')}
              </label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder={t('classes.rejectReasonPlaceholder', 'Ví dụ: Lớp tiếp nhận đã đủ sĩ số quy định...')}
                className="w-full p-2.5 text-[13px] bg-background border border-border rounded-none shadow-none focus:outline-none focus:border-primary placeholder:text-muted-foreground/60 resize-none text-foreground"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                disabled={isUpdatingStatus}
                onClick={() => {
                  setTransferToReject(null);
                  setRejectReason('');
                }}
                className="h-8 px-4 rounded-none border-border text-[13px] font-normal hover:bg-muted/70 shadow-none cursor-pointer"
              >
                {t('common.cancel', 'Hủy')}
              </Button>
              <Button
                type="button"
                disabled={isUpdatingStatus}
                onClick={handleConfirmReject}
                className="h-8 px-4 rounded-none bg-rose-600 hover:bg-rose-700 text-white text-[13px] font-medium shadow-none cursor-pointer"
              >
                {isUpdatingStatus
                  ? t('common.processing', 'Đang xử lý...')
                  : t('classes.confirmRejectBtn', 'Từ chối yêu cầu')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
