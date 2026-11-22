import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Search01Icon,
  FilterHorizontalIcon,
  Menu01Icon,
  DashboardSquare02Icon,
  MoreHorizontalIcon,
  ReloadIcon,
  ViewIcon,
  SendIcon,
  Target02Icon,
  TaskDone01Icon,
  Calendar03Icon,
  AlertCircleIcon,
  CheckmarkCircle01Icon,
  CheckmarkSquare02Icon,
  Book02Icon,
  InformationCircleIcon,
} from '@hugeicons/core-free-icons';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { PlanningTabLoading } from './PlanningTabLoading';
import { Button } from '@/components/ui/button';
import { cn } from '@/shared/lib/utils';
import { toast } from 'sonner';
import { useAuthStore, isBghRole } from '@/features/auth';
import { planningApi } from '../planning.api';
import { ThemePlanReviewDrawer } from './ThemePlanReviewDrawer';

export function PlanSubmissionTab({ classId, currentClass, isReadOnly = false }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const isBGH = isBghRole(user?.role);

  const [isLoading, setIsLoading] = useState(true);
  const [summaryData, setSummaryData] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'grid'
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal: Teacher Submit
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [submittingTheme, setSubmittingTheme] = useState(null);
  const [submitNote, setSubmitNote] = useState('');
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Modal: BGH Rejection Note
  const [rejectionModalTheme, setRejectionModalTheme] = useState(null);

  // Drawer: Preview Plan
  const [isPreviewDrawerOpen, setIsPreviewDrawerOpen] = useState(false);
  const [previewThemeId, setPreviewThemeId] = useState(null);

  // Load summary data
  const loadSummary = useCallback(async () => {
    if (!classId) return;
    setIsLoading(true);
    try {
      const data = await planningApi.getClassThemePlansSummary(classId);
      setSummaryData(data);
    } catch (err) {
      console.error('Failed to load plan summary:', err);
      toast.error(t('planning.loadSummaryError', 'Không thể tải dữ liệu tổng hợp kế hoạch.'));
    } finally {
      setIsLoading(false);
    }
  }, [classId, t]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const themes = useMemo(() => summaryData?.themes || [], [summaryData]);

  // Filtered themes
  const filteredThemes = useMemo(() => {
    let list = [...themes];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (th) =>
          th.name.toLowerCase().includes(q) ||
          (th.code && th.code.includes(q)) ||
          (th.dateRange && th.dateRange.includes(q))
      );
    }

    if (statusFilter !== 'ALL') {
      list = list.filter((th) => th.status === statusFilter);
    }

    return list;
  }, [themes, searchQuery, statusFilter]);

  // Open submit modal
  const handleOpenSubmitModal = (themeToSubmit) => {
    setSubmittingTheme(themeToSubmit);
    setSubmitNote('');
    setIsSubmitModalOpen(true);
  };

  // Submit plan
  const handleSubmitPlan = async () => {
    if (!classId || !submittingTheme) return;
    setIsActionLoading(true);
    try {
      await planningApi.submitThemePlan(classId, {
        themeId: submittingTheme.themeId || submittingTheme.id,
        themeName: submittingTheme.name,
        note: submitNote.trim() || undefined,
      });
      toast.success(
        t('planning.submitPlanSuccess', {
          name: submittingTheme.name,
          defaultValue: `Đã nộp kế hoạch chủ đề "${submittingTheme.name}" cho Ban Giám Hiệu phê duyệt thành công!`,
        })
      );
      setIsSubmitModalOpen(false);
      setSubmitNote('');
      loadSummary();
    } catch (err) {
      console.error('Submit plan error:', err);
      toast.error(err.response?.data?.message || t('planning.submitPlanError', 'Có lỗi xảy ra khi nộp kế hoạch.'));
    } finally {
      setIsActionLoading(false);
    }
  };

  // Open Preview Drawer
  const handleOpenPreview = (thId) => {
    setPreviewThemeId(thId);
    setIsPreviewDrawerOpen(true);
  };

  // Format date helper
  const formatDateVi = (dStr) => {
    if (!dStr) return '—';
    try {
      const d = new Date(dStr);
      return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return dStr;
    }
  };

  // Status Badge strictly matching StudentsPage getStatusBadge
  const renderStatusBadge = (status, th) => {
    switch (status) {
      case 'DRAFT':
        return (
          <span className="inline-flex items-center justify-center px-2 py-0.5 text-[12px] font-medium bg-muted text-muted-foreground border border-border/60 rounded-none whitespace-nowrap">
            {t('planning.statusDraft', 'Bản nháp')}
          </span>
        );
      case 'PENDING_APPROVAL':
        return (
          <span className="inline-flex items-center justify-center px-2 py-0.5 text-[12px] font-medium bg-blue-50 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-900/40 rounded-none whitespace-nowrap">
            {t('planning.statusPending', 'Chờ duyệt')}
          </span>
        );
      case 'USED':
        return (
          <span className="inline-flex items-center justify-center px-2 py-0.5 text-[12px] font-medium bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/40 rounded-none whitespace-nowrap">
            {t('planning.statusApproved', 'Đã phê duyệt')}
          </span>
        );
      case 'REJECTED':
        return (
          <span
            onClick={(e) => {
              e.stopPropagation();
              setRejectionModalTheme(th);
            }}
            title={th?.rejectionReason || t('planning.rejectionReasonTooltip', 'Ban Giám Hiệu yêu cầu sửa lại')}
            className="inline-flex items-center justify-center px-2 py-0.5 text-[12px] font-medium bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-900/40 rounded-none whitespace-nowrap cursor-pointer hover:bg-rose-100 transition-colors"
          >
            {t('planning.statusRevisionRequested', 'Yêu cầu sửa')}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center justify-center px-2 py-0.5 text-[12px] font-medium bg-muted text-muted-foreground border border-border/60 rounded-none whitespace-nowrap">
            {t('planning.statusNotStarted', 'Chưa soạn')}
          </span>
        );
    }
  };

  // Status Filter options
  const filterStatuses = [
    { key: 'ALL', label: t('planning.allStatuses', 'Tất cả trạng thái') },
    { key: 'DRAFT', label: t('planning.statusDraft', 'Bản nháp') },
    { key: 'PENDING_APPROVAL', label: t('planning.statusPending', 'Chờ duyệt') },
    { key: 'USED', label: t('planning.statusApproved', 'Đã phê duyệt') },
    { key: 'REJECTED', label: t('planning.statusRevisionRequested', 'Yêu cầu sửa') },
  ];

  if (isLoading && !summaryData) {
    return <PlanningTabLoading message={t('planning.loadingData', 'Đang tải tổng hợp kế hoạch giáo dục...')} />;
  }

  return (
    <div
      className="w-full flex-1 flex flex-col gap-3.5 pb-8 text-foreground select-none"
      data-name="FE · Plan Submission · List"
    >
      {/* 1. Page Header (Đồng bộ tuyệt đối với Kế hoạch tuần & Xác định hoạt động) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60 shrink-0">
        {/* Title and Subtitle */}
        <div className="flex flex-col gap-1">
          <h1 className="text-[26px] font-semibold text-foreground tracking-tight">
            {t('planning.submissionTitle', 'Duyệt kế hoạch')}
          </h1>
          <p className="text-[12px] text-muted-foreground font-normal">
            {t(
              'planning.submissionSubtitle',
              'Quản lý hồ sơ kế hoạch giáo dục, thời khóa biểu và tiến độ phê duyệt'
            )}
          </p>
        </div>

        {/* View Actions Toolbar (Strictly matching StudentsPage) */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Search Input */}
          <div className="relative w-[260px] h-8">
            <HugeiconsIcon
              icon={Search01Icon}
              size={15}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('planning.searchThemePlaceholder', 'Tìm kiếm chủ đề...')}
              className="h-8 pl-8 pr-2.5 text-[13px] bg-background border-border rounded-none shadow-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          {/* Filter Dropdown (Strictly matching StudentFilterDropdown) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  'size-8 bg-background border border-border text-foreground hover:bg-muted/50 rounded-none flex items-center justify-center transition-colors cursor-pointer select-none',
                  statusFilter !== 'ALL' && 'border-primary text-primary bg-primary/5'
                )}
                title={t('planning.filterStatus', 'Lọc trạng thái')}
              >
                <HugeiconsIcon icon={FilterHorizontalIcon} size={16} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-52 p-1.5 rounded-none border border-border bg-card shadow-xl z-50 text-foreground"
            >
              <DropdownMenuLabel className="px-2 py-1 text-[12px] font-medium text-muted-foreground">
                {t('planning.planStatusLabel', 'Trạng thái kế hoạch')}
              </DropdownMenuLabel>
              {filterStatuses.map((item) => (
                <DropdownMenuItem
                  key={item.key}
                  onClick={() => setStatusFilter(item.key)}
                  className="flex items-center justify-between h-8 px-2 text-[13px] cursor-pointer rounded-none hover:bg-muted/60"
                >
                  <span>{item.label}</span>
                  {statusFilter === item.key && (
                    <HugeiconsIcon
                      icon={CheckmarkSquare02Icon}
                      size={14}
                      className="text-primary shrink-0"
                    />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* View Mode Switcher (Matching StudentsPage & AccountsPage) */}
          <div className="flex items-center border border-border bg-card rounded-none overflow-hidden h-8">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              title={t('planning.viewList', 'Dạng bảng')}
              className={cn(
                'size-8 flex items-center justify-center transition-colors cursor-pointer border-r border-border',
                viewMode === 'list'
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
              )}
            >
              <HugeiconsIcon icon={Menu01Icon} size={15} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              title={t('planning.viewGrid', 'Dạng lưới')}
              className={cn(
                'size-8 flex items-center justify-center transition-colors cursor-pointer',
                viewMode === 'grid'
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
              )}
            >
              <HugeiconsIcon icon={DashboardSquare02Icon} size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Sub-header: Title & Counter (Strictly matching StudentsPage) */}
      <div className="flex items-center justify-between">
        <h2 className="text-[14px] font-medium text-foreground">
          {t('planning.themePlanList', 'Danh sách kế hoạch chủ đề')}
        </h2>
        <span className="text-[13px] text-muted-foreground font-normal">
          {t('planning.themesCount', { count: filteredThemes.length, defaultValue: `${filteredThemes.length} chủ đề` })}
        </span>
      </div>

      {/* 3. Main Content: Table (List) or Cards (Grid) */}
      {viewMode === 'list' ? (
        /* TABLE VIEW (Strictly matching StudentTable structure, paddings & classes) */
        <div
          className="w-full border border-border bg-card rounded-none overflow-x-auto shadow-xs select-none"
          data-name="Plan Submission Table"
        >
          <table className="w-full text-left border-collapse min-w-[900px]">
            {/* Table Header matching StudentTable: h-10 border-b bg-muted/30 text-[13px] text-foreground */}
            <thead>
              <tr className="h-10 border-b border-border bg-muted/30 text-[13px] font-medium text-foreground">
                <th className="px-3 min-w-[240px] font-medium">{t('planning.theme', 'Chủ đề')}</th>
                <th className="px-3 min-w-[140px] font-medium">{t('planning.appliedTime', 'Thời gian áp dụng')}</th>
                <th className="px-3 min-w-[120px] font-medium">{t('planning.status', 'Trạng thái')}</th>
                <th className="px-3 min-w-[110px] font-medium">{t('planning.bghDeadline', 'Hạn nộp BGH')}</th>
                <th className="px-3 min-w-[90px] font-medium">{t('planning.goals', 'Mục tiêu')}</th>
                <th className="px-3 min-w-[90px] font-medium">{t('planning.activities', 'Hoạt động')}</th>
                <th className="px-3 min-w-[90px] font-medium">{t('planning.weeklyTimetable', 'TKB tuần')}</th>
                <th className="px-3 min-w-[95px] w-[95px] text-right font-medium whitespace-nowrap">
                  {t('common.actions', 'Thao tác')}
                </th>
              </tr>
            </thead>

            {/* Table Body matching StudentTable: h-[72px] hover:bg-muted/40 divide-y */}
            <tbody className="divide-y divide-border/60">
              {isLoading && themes.length === 0 ? (
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
                    <td className="px-3"><div className="h-3.5 w-24 bg-muted/50 rounded-none" /></td>
                    <td className="px-3"><div className="h-5 w-20 bg-muted/50 rounded-none" /></td>
                    <td className="px-3"><div className="h-3.5 w-20 bg-muted/50 rounded-none" /></td>
                    <td className="px-3"><div className="h-3.5 w-10 bg-muted/50 rounded-none" /></td>
                    <td className="px-3"><div className="h-3.5 w-10 bg-muted/50 rounded-none" /></td>
                    <td className="px-3"><div className="h-3.5 w-12 bg-muted/50 rounded-none" /></td>
                    <td className="px-3 text-right"><div className="size-7 bg-muted/40 rounded-none ml-auto" /></td>
                  </tr>
                ))
              ) : filteredThemes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground text-[13px]">
                    {searchQuery || statusFilter !== 'ALL'
                      ? t('planning.noMatchingThemePlans', 'Không tìm thấy kế hoạch chủ đề nào phù hợp')
                      : t('planning.noThemePlansInYear', 'Chưa có kế hoạch chủ đề nào trong năm học này')}
                  </td>
                </tr>
              ) : (
                filteredThemes.map((th, idx) => {
                  const canSubmit = !isReadOnly && !isBGH && (th.status === 'DRAFT' || th.status === 'REJECTED');

                  return (
                    <tr
                      key={th.id || th.themeId}
                      className="h-[72px] hover:bg-muted/40 transition-colors group cursor-default"
                      data-node-id={`theme-plan-row-${th.code || idx}`}
                    >
                      {/* Theme Info (Avatar + Name + Subtitle) matching Student Info */}
                      <td className="px-3">
                        <div
                          onClick={() => handleOpenPreview(th.themeId || th.id)}
                          className="flex items-center gap-3 cursor-pointer group/name"
                        >
                          {/* Topic Index square badge - Chỉ màu xanh cho chủ đề hiện tại */}
                          <div
                            className={cn(
                              'size-8 shrink-0 rounded-none border flex items-center justify-center font-semibold font-mono text-[12px] select-none',
                              th.isCurrent
                                ? 'bg-[#1447e6] text-white border-[#1447e6]'
                                : 'bg-muted/70 text-muted-foreground border-border/70'
                            )}
                          >
                            {th.code || String(idx + 1).padStart(2, '0')}
                          </div>

                          <div className="flex flex-col min-w-0 leading-tight">
                            <span className="text-[14px] font-medium text-foreground group-hover/name:text-primary transition-colors truncate">
                              {th.name}
                            </span>
                            <span className="text-[12px] text-muted-foreground truncate">
                              {t('planning.themeIndex', {
                                code: th.code || String(idx + 1).padStart(2, '0'),
                                defaultValue: `Chủ đề ${th.code || String(idx + 1).padStart(2, '0')}`,
                              })}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Date Range matching Class column */}
                      <td className="px-3 whitespace-nowrap text-[14px] text-foreground font-normal">
                        {th.dateRange || '—'}
                      </td>

                      {/* Status Badge matching Student Status column */}
                      <td className="px-3 whitespace-nowrap">
                        {renderStatusBadge(th.status, th)}
                      </td>

                      {/* Deadline matching Join Date */}
                      <td className="px-3 whitespace-nowrap text-[14px]">
                        {(() => {
                          const isOverdue =
                            th.deadline &&
                            (th.status === 'DRAFT' || th.status === 'REJECTED') &&
                            new Date() > new Date(`${th.deadline}T23:59:59`);
                          return (
                            <span
                              className={cn(
                                isOverdue ? 'text-red-600 font-medium' : 'text-foreground font-normal'
                              )}
                            >
                              {th.deadline ? formatDateVi(th.deadline) : '—'}
                            </span>
                          );
                        })()}
                      </td>

                      {/* Goals Count matching Gender column */}
                      <td className="px-3 whitespace-nowrap text-[14px] text-foreground font-normal">
                        {th.stats?.totalGoals || 0}
                      </td>

                      {/* Activities / Slots Count: Slot đã xếp / Tổng slot (text bình thường) */}
                      <td className="px-3 whitespace-nowrap text-[14px] text-foreground font-normal">
                        {(() => {
                          const scheduled = th.stats?.totalScheduledSlots ?? 0;
                          const total = th.stats?.totalExpectedSlots || (th.stats?.totalWeeks || 0) * 35;
                          if (total === 0) return '—';
                          return `${scheduled}/${total}`;
                        })()}
                      </td>

                      {/* Scheduled Weeks matching Notes column */}
                      <td className="px-3 whitespace-nowrap text-[14px] text-foreground font-normal">
                        {th.stats?.scheduledWeeks || 0}/{th.stats?.totalWeeks || 0}
                      </td>

                      {/* Actions: Strictly single 3-dots button matching StudentTable */}
                      <td className="px-3 min-w-[95px] w-[95px] text-right whitespace-nowrap">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="size-7 inline-flex items-center justify-center rounded-none text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                              title={t('common.actions', 'Thao tác')}
                            >
                              <HugeiconsIcon icon={MoreHorizontalIcon} size={16} />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="w-48 p-1 rounded-none border border-border bg-card shadow-xl z-50 text-foreground"
                          >
                            <DropdownMenuItem
                              onClick={() => handleOpenPreview(th.themeId || th.id)}
                              className="flex items-center gap-2 h-8 px-2 text-[13px] cursor-pointer rounded-none hover:bg-muted/60"
                            >
                              <HugeiconsIcon icon={ViewIcon} size={15} />
                              <span>{t('common.viewDetails', 'Xem chi tiết')}</span>
                            </DropdownMenuItem>

                            {canSubmit && (
                              <DropdownMenuItem
                                onClick={() => handleOpenSubmitModal(th)}
                                className="flex items-center gap-2 h-8 px-2 text-[13px] font-medium text-primary cursor-pointer rounded-none hover:bg-muted/60"
                              >
                                <HugeiconsIcon icon={SendIcon} size={15} />
                                <span>{th.status === 'REJECTED' ? t('planning.resubmitToBGH', 'Nộp lại cho BGH') : t('planning.submitToBGH', 'Nộp cho BGH duyệt')}</span>
                              </DropdownMenuItem>
                            )}

                            {th.status === 'REJECTED' && th.rejectionReason && (
                              <DropdownMenuItem
                                onClick={() => setRejectionModalTheme(th)}
                                className="flex items-center gap-2 h-8 px-2 text-[13px] text-rose-600 cursor-pointer rounded-none hover:bg-muted/60"
                              >
                                <HugeiconsIcon icon={AlertCircleIcon} size={15} />
                                <span>{t('planning.bghFeedback', 'Ý kiến của BGH')}</span>
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuSeparator className="my-1 bg-border/60" />

                            <DropdownMenuItem
                              onClick={() => navigate(`/classes/${classId}/planning?tab=allocation&themeId=${th.id || th.themeId}`)}
                              className="flex items-center gap-2 h-8 px-2 text-[13px] cursor-pointer rounded-none hover:bg-muted/60"
                            >
                              <HugeiconsIcon icon={Target02Icon} size={15} />
                              <span>{t('planning.tabTargetAllocation', 'Phân bổ mục tiêu')}</span>
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => navigate(`/classes/${classId}/planning?tab=activities&themeId=${th.id || th.themeId}`)}
                              className="flex items-center gap-2 h-8 px-2 text-[13px] cursor-pointer rounded-none hover:bg-muted/60"
                            >
                              <HugeiconsIcon icon={TaskDone01Icon} size={15} />
                              <span>{t('planning.tabEducationalActivities', 'Xác định hoạt động')}</span>
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => navigate(`/classes/${classId}/planning?tab=timetable&themeId=${th.id || th.themeId}`)}
                              className="flex items-center gap-2 h-8 px-2 text-[13px] cursor-pointer rounded-none hover:bg-muted/60"
                            >
                              <HugeiconsIcon icon={Calendar03Icon} size={15} />
                              <span>{t('planning.tabWeeklyTimetable', 'Kế hoạch tuần')}</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* GRID / CARD VIEW (Strictly matching StudentGrid structure, paddings & classes) */
        <div
          className="grid grid-cols-1 md:grid-cols-2 gap-4 select-none"
          data-name="Plan Submission Grid"
        >
          {isLoading && themes.length === 0 ? (
            Array.from({ length: 4 }).map((_, idx) => (
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
          ) : filteredThemes.length === 0 ? (
            <div className="col-span-full py-12 text-center text-muted-foreground text-[13px]">
              {t('planning.noMatchingThemePlans', 'Không tìm thấy kế hoạch chủ đề nào phù hợp')}
            </div>
          ) : (
            filteredThemes.map((th, idx) => {
              const canSubmit = !isReadOnly && !isBGH && (th.status === 'DRAFT' || th.status === 'REJECTED');

              return (
                <div
                  key={th.id || th.themeId}
                  className="border border-border bg-card p-5 rounded-none shadow-xs hover:border-border/90 transition-all flex flex-col justify-between gap-4 group"
                  data-node-id={`theme-card-${th.code || idx}`}
                >
                  {/* Top Section: Avatar + Name & Subtitle matching StudentGrid */}
                  <div
                    onClick={() => handleOpenPreview(th.themeId || th.id)}
                    className="flex items-center gap-3.5 cursor-pointer"
                  >
                    {/* Topic Index square badge - Chỉ màu xanh cho chủ đề hiện tại */}
                    <div
                      className={cn(
                        'size-10 rounded-none border flex items-center justify-center font-semibold font-mono text-[14px] shrink-0 select-none',
                        th.isCurrent
                          ? 'bg-[#1447e6] text-white border-[#1447e6]'
                          : 'bg-muted/70 text-muted-foreground border-border/70'
                      )}
                    >
                      {th.code || String(idx + 1).padStart(2, '0')}
                    </div>

                    <div className="flex flex-col min-w-0 leading-tight">
                      <span className="text-[15px] font-medium text-foreground group-hover:text-primary transition-colors truncate">
                        {th.name}
                      </span>
                      <span className="text-[12px] text-muted-foreground truncate">
                        {t('planning.themeIndex', {
                          code: th.code || String(idx + 1).padStart(2, '0'),
                          defaultValue: `Chủ đề ${th.code || String(idx + 1).padStart(2, '0')}`,
                        })} · {th.dateRange || '—'}
                      </span>
                    </div>
                  </div>

                  {/* Badges: Status & Deadline */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {renderStatusBadge(th.status, th)}

                    {th.deadline && (() => {
                      const isOverdue =
                        (th.status === 'DRAFT' || th.status === 'REJECTED') &&
                        new Date() > new Date(`${th.deadline}T23:59:59`);
                      return (
                        <span
                          className={cn(
                            'inline-flex items-center px-2 py-0.5 text-[12px] font-normal rounded-none',
                            isOverdue
                              ? 'text-red-600 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 font-medium'
                              : 'text-muted-foreground bg-muted/40 border border-border/40'
                          )}
                        >
                          {t('planning.deadlinePrefix', {
                            date: formatDateVi(th.deadline),
                            defaultValue: `Hạn nộp: ${formatDateVi(th.deadline)}`,
                          })}
                        </span>
                      );
                    })()}
                  </div>

                  <div className="h-px bg-border/60" />

                  {/* Bottom Meta & Actions matching StudentGrid */}
                  <div className="flex items-center justify-between gap-2 pt-1 text-[13px]">
                    <div className="flex items-center gap-5 text-xs text-muted-foreground">
                      <div className="flex flex-col leading-tight min-w-0">
                        <span className="text-[11px] text-muted-foreground">{t('planning.goals', 'Mục tiêu')}</span>
                        <span className="text-[13px] font-medium text-foreground">
                          {th.stats?.totalGoals || 0}
                        </span>
                      </div>

                      <div className="flex flex-col leading-tight min-w-0">
                        <span className="text-[11px] text-muted-foreground">{t('planning.activities', 'Hoạt động')}</span>
                        <span className="text-[13px] font-medium text-foreground">
                          {(() => {
                            const scheduled = th.stats?.totalScheduledSlots ?? 0;
                            const total = th.stats?.totalExpectedSlots || (th.stats?.totalWeeks || 0) * 35;
                            if (total === 0) return '—';
                            return `${scheduled}/${total}`;
                          })()}
                        </span>
                      </div>

                      <div className="flex flex-col leading-tight min-w-0">
                        <span className="text-[11px] text-muted-foreground">{t('planning.weeklyTimetable', 'TKB tuần')}</span>
                        <span className="text-[13px] font-medium text-foreground">
                          {th.stats?.scheduledWeeks || 0}/{th.stats?.totalWeeks || 0}
                        </span>
                      </div>
                    </div>

                    {/* Action Dropdown matching StudentGrid */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="size-7 inline-flex items-center justify-center rounded-none text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                          title={t('common.actions', 'Thao tác')}
                        >
                          <HugeiconsIcon icon={MoreHorizontalIcon} size={16} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="w-48 p-1 rounded-none border border-border bg-card shadow-xl z-50 text-foreground"
                      >
                        <DropdownMenuItem
                          onClick={() => handleOpenPreview(th.themeId || th.id)}
                          className="flex items-center gap-2 h-8 px-2 text-[13px] cursor-pointer rounded-none hover:bg-muted/60"
                        >
                          <HugeiconsIcon icon={ViewIcon} size={15} />
                          <span>{t('common.viewDetails', 'Xem chi tiết')}</span>
                        </DropdownMenuItem>

                        {canSubmit && (
                          <DropdownMenuItem
                            onClick={() => handleOpenSubmitModal(th)}
                            className="flex items-center gap-2 h-8 px-2 text-[13px] font-medium text-primary cursor-pointer rounded-none hover:bg-muted/60"
                          >
                            <HugeiconsIcon icon={SendIcon} size={15} />
                            <span>{th.status === 'REJECTED' ? t('planning.resubmitToBGH', 'Nộp lại cho BGH') : t('planning.submitToBGH', 'Nộp cho BGH duyệt')}</span>
                          </DropdownMenuItem>
                        )}

                        {th.status === 'REJECTED' && th.rejectionReason && (
                          <DropdownMenuItem
                            onClick={() => setRejectionModalTheme(th)}
                            className="flex items-center gap-2 h-8 px-2 text-[13px] text-rose-600 cursor-pointer rounded-none hover:bg-muted/60"
                          >
                            <HugeiconsIcon icon={AlertCircleIcon} size={15} />
                            <span>{t('planning.bghFeedback', 'Ý kiến của BGH')}</span>
                          </DropdownMenuItem>
                        )}

                        <DropdownMenuSeparator className="my-1 bg-border/60" />

                        <DropdownMenuItem
                          onClick={() => navigate(`/classes/${classId}/planning?tab=allocation&themeId=${th.id || th.themeId}`)}
                          className="flex items-center gap-2 h-8 px-2 text-[13px] cursor-pointer rounded-none hover:bg-muted/60"
                        >
                          <HugeiconsIcon icon={Target02Icon} size={15} />
                          <span>{t('planning.tabTargetAllocation', 'Phân bổ mục tiêu')}</span>
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onClick={() => navigate(`/classes/${classId}/planning?tab=activities&themeId=${th.id || th.themeId}`)}
                          className="flex items-center gap-2 h-8 px-2 text-[13px] cursor-pointer rounded-none hover:bg-muted/60"
                        >
                          <HugeiconsIcon icon={TaskDone01Icon} size={15} />
                          <span>{t('planning.tabEducationalActivities', 'Xác định hoạt động')}</span>
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onClick={() => navigate(`/classes/${classId}/planning?tab=timetable&themeId=${th.id || th.themeId}`)}
                          className="flex items-center gap-2 h-8 px-2 text-[13px] cursor-pointer rounded-none hover:bg-muted/60"
                        >
                          <HugeiconsIcon icon={Calendar03Icon} size={15} />
                          <span>{t('planning.tabWeeklyTimetable', 'Kế hoạch tuần')}</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 4. Modal: Pre-submission Checklist & Submit Plan */}
      <Dialog open={isSubmitModalOpen} onOpenChange={setIsSubmitModalOpen}>
        <DialogContent className="w-[calc(100vw-32px)] max-w-[480px] p-5 sm:p-6 rounded-none border border-border bg-card shadow-2xl text-foreground select-none overflow-hidden box-border">
          <DialogHeader className="space-y-1 pb-3 border-b border-border text-left">
            <DialogTitle className="text-[16px] font-semibold text-foreground tracking-tight">
              {t('planning.submitModalTitle', 'Nộp kế hoạch giáo dục cho BGH')}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              {t('planning.submitModalClass', 'Lớp')} <strong className="font-semibold text-foreground">{currentClass?.name || t('planning.submitModalClass', 'Lớp')}</strong> • {t('planning.theme', 'Chủ đề')} <strong className="font-semibold text-foreground">"{submittingTheme?.name}"</strong>
              {submittingTheme?.dateRange && <span> ({submittingTheme.dateRange})</span>}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-1 text-xs">
            {/* Checklist Box - Thiết kế clean, chuyên nghiệp, phẳng, ít màu sắc, đồng bộ drawer */}
            {(() => {
              const hasGoals = (submittingTheme?.stats?.totalGoals ?? 0) > 0;
              const hasScheduledSlots = (submittingTheme?.stats?.totalScheduledSlots ?? 0) > 0;
              const invalidDays = submittingTheme?.stats?.invalidDays || [];
              const hasSunday = Boolean(submittingTheme?.stats?.hasSunday);
              const isMinDaysMet = submittingTheme?.stats?.isMinActivitiesPerDayMet ?? (invalidDays.length === 0 && !hasSunday && hasScheduledSlots);
              const isReady = hasGoals && hasScheduledSlots && isMinDaysMet;

              return (
                <div className="border border-border bg-muted/15 rounded-none overflow-hidden">
                  <div className="px-3.5 py-2.5 bg-muted/40 border-b border-border flex items-center justify-between">
                    <span className="font-medium text-foreground text-xs">{t('planning.submitConditions', 'Điều kiện nộp')}</span>
                    {isReady ? (
                      <span className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-muted-foreground">
                        <span className="size-1.5 bg-emerald-600 dark:bg-emerald-400"></span>
                        <span>{t('planning.conditionEligible', 'Đủ điều kiện')}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-muted-foreground">
                        <span className="size-1.5 bg-muted-foreground/60"></span>
                        <span>{t('planning.conditionIneligible', 'Chưa đủ điều kiện')}</span>
                      </span>
                    )}
                  </div>

                  <div className="divide-y divide-border/40 px-3.5 text-xs">
                    <div className="py-2.5 flex items-center justify-between">
                      <span className="text-muted-foreground">{t('planning.educationalGoals', 'Mục tiêu giáo dục')}</span>
                      <span className="font-medium">
                        {hasGoals ? (
                          <span className="text-foreground">
                            {t('planning.goalsCount', { count: submittingTheme?.stats?.totalGoals, defaultValue: `${submittingTheme?.stats?.totalGoals} mục tiêu` })}
                          </span>
                        ) : (
                          <span className="text-muted-foreground font-normal">{t('planning.notSelected', 'Chưa chọn')}</span>
                        )}
                      </span>
                    </div>

                    <div className="py-2.5 flex items-center justify-between">
                      <span className="text-muted-foreground">{t('planning.dailyQuota', 'Định mức theo ngày (3–7 HĐ)')}</span>
                      <span className="font-medium">
                        {isMinDaysMet ? (
                          <span className="text-foreground">{t('planning.standardMet', 'Đạt chuẩn')}</span>
                        ) : hasSunday ? (
                          <span className="text-muted-foreground font-normal">{t('planning.hasSundaySchedule', 'Có lịch Chủ nhật')}</span>
                        ) : invalidDays.length > 0 ? (
                          <span className="text-muted-foreground font-normal">
                            {t('planning.invalidDaysCount', { count: invalidDays.length, defaultValue: `${invalidDays.length} ngày < 3 HĐ` })}
                          </span>
                        ) : (
                          <span className="text-muted-foreground font-normal">{t('planning.notScheduledYet', 'Chưa xếp')}</span>
                        )}
                      </span>
                    </div>

                    <div className="py-2.5 flex items-center justify-between">
                      <span className="text-muted-foreground">{t('planning.timetableActivities', 'Hoạt động thời khóa biểu')}</span>
                      <span className="font-medium text-foreground">
                        {(() => {
                          const scheduled = submittingTheme?.stats?.totalScheduledSlots ?? 0;
                          const total =
                            submittingTheme?.stats?.totalExpectedSlots ||
                            (submittingTheme?.stats?.totalWeeks || 0) * 35;
                          return t('planning.slotsFraction', { scheduled, total, defaultValue: `${scheduled}/${total} slot` });
                        })()}
                      </span>
                    </div>

                    <div className="py-2.5 flex items-center justify-between">
                      <span className="text-muted-foreground">{t('planning.weeklyProgress', 'Tiến độ các tuần')}</span>
                      <span className="font-medium text-foreground">
                        {submittingTheme?.stats?.totalWeeks > 0
                          ? t('planning.weeksFraction', {
                              scheduled: submittingTheme.stats.scheduledWeeks || 0,
                              total: submittingTheme.stats.totalWeeks,
                              defaultValue: `${submittingTheme.stats.scheduledWeeks || 0}/${submittingTheme.stats.totalWeeks} tuần`,
                            })
                          : t('planning.notScheduledYet', 'Chưa xếp')}
                      </span>
                    </div>
                  </div>

                  {/* Lời nhắc nếu chưa đạt điều kiện - Clean, phẳng, ít màu sắc đồng bộ drawer */}
                  {!isReady && (
                    <div className="px-3.5 py-2.5 border-t border-border bg-muted/30 text-[11.5px] text-muted-foreground flex items-center gap-2">
                      <HugeiconsIcon icon={InformationCircleIcon} size={14} className="text-muted-foreground shrink-0" />
                      <span className="leading-relaxed">
                        {!hasGoals
                          ? t('planning.needGoalNotice', 'Cần phân bổ ít nhất 1 mục tiêu giáo dục cho chủ đề.')
                          : !hasScheduledSlots
                          ? t('planning.needSlotNotice', 'Cần xếp ít nhất 1 hoạt động trong thời khóa biểu tuần.')
                          : hasSunday
                          ? t('planning.noSundayNotice', 'Không được xếp lịch hoạt động vào ngày Chủ nhật.')
                          : invalidDays.length > 0
                          ? t('planning.minActivitiesNotice', {
                              days: invalidDays.slice(0, 2).join(', ') + (invalidDays.length > 2 ? '...' : ''),
                              defaultValue: `Mỗi ngày dạy học cần tối thiểu 3 hoạt động giáo dục. Chưa đạt: ${invalidDays.slice(0, 2).join(', ')}${invalidDays.length > 2 ? '...' : ''}`,
                            })
                          : t('planning.planNotReadyNotice', 'Kế hoạch chưa đáp ứng đủ điều kiện nộp.')}
                      </span>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Warning if deadline is passed */}
            {submittingTheme?.deadline &&
              new Date() > new Date(`${submittingTheme.deadline}T23:59:59`) && (
                <div className="px-3.5 py-2.5 border border-border rounded-none bg-muted/30 text-xs text-muted-foreground flex items-center gap-2">
                  <HugeiconsIcon icon={AlertCircleIcon} size={14} className="shrink-0 text-muted-foreground" />
                  <span className="leading-relaxed">
                    {submittingTheme.allowLateSubmit === false
                      ? t('planning.overdueLockedNotice', {
                          date: formatDateVi(submittingTheme.deadline),
                          defaultValue: `Đã quá hạn nộp (${formatDateVi(submittingTheme.deadline)}). Kế hoạch đã bị khóa nộp.`,
                        })
                      : t('planning.overdueLateNotice', {
                          date: formatDateVi(submittingTheme.deadline),
                          defaultValue: `Nộp muộn so với hạn quy định (${formatDateVi(submittingTheme.deadline)}).`,
                        })}
                  </span>
                </div>
              )}

            {/* Note Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground flex items-center justify-between">
                <span>{t('planning.noteToBGH', 'Ghi chú gửi kèm Ban Giám Hiệu')}</span>
                <span className="text-[11px] text-muted-foreground font-normal">{t('common.optional', 'Tùy chọn')}</span>
              </label>
              <textarea
                value={submitNote}
                onChange={(e) => setSubmitNote(e.target.value)}
                placeholder={t('planning.notePlaceholder', 'Ví dụ: Đã hoàn thiện bổ sung hoạt động theo góp ý của BGH...')}
                rows={3}
                className="w-full text-xs bg-background border border-border rounded-none p-2.5 focus:outline-none focus:border-foreground text-foreground resize-none placeholder:text-muted-foreground/50 transition-colors shadow-none"
              />
              <p className="text-[11px] text-muted-foreground">
                {t('planning.submitNoteNotice', 'Sau khi nộp, kế hoạch chủ đề này sẽ chuyển sang trạng thái chờ duyệt.')}
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2 pt-3 border-t border-border flex items-center justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsSubmitModalOpen(false)}
              disabled={isActionLoading}
              className="h-8 px-4 text-xs font-medium rounded-none border border-border hover:bg-muted text-foreground cursor-pointer shadow-none"
            >
              {t('common.cancel', 'Hủy')}
            </Button>
            {(() => {
              const hasGoals = (submittingTheme?.stats?.totalGoals ?? 0) > 0;
              const hasScheduledSlots = (submittingTheme?.stats?.totalScheduledSlots ?? 0) > 0;
              const invalidDays = submittingTheme?.stats?.invalidDays || [];
              const hasSunday = Boolean(submittingTheme?.stats?.hasSunday);
              const isMinDaysMet = submittingTheme?.stats?.isMinActivitiesPerDayMet ?? (invalidDays.length === 0 && !hasSunday && hasScheduledSlots);
              const isReady = hasGoals && hasScheduledSlots && isMinDaysMet;

              if (!isReady) {
                return (
                  <Button
                    type="button"
                    size="sm"
                    disabled
                    title={
                      !hasGoals
                        ? t('planning.needGoalNotice', 'Cần phân bổ ít nhất 1 mục tiêu giáo dục')
                        : !hasScheduledSlots
                        ? t('planning.needSlotNotice', 'Cần xếp hoạt động vào thời khóa biểu')
                        : hasSunday
                        ? t('planning.noSundayNotice', 'Không được xếp lịch vào Chủ nhật')
                        : t('planning.minActivitiesNotice', {
                            days: invalidDays.join(', '),
                            defaultValue: `Mỗi ngày học cần tối thiểu 3 hoạt động: ${invalidDays.join(', ')}`,
                          })
                    }
                    className="h-8 px-4 text-xs font-medium rounded-none bg-muted text-muted-foreground/60 border border-border cursor-not-allowed shadow-none"
                  >
                    {t('planning.notEligibleToSubmit', 'Chưa đủ điều kiện nộp')}
                  </Button>
                );
              }

              return (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSubmitPlan}
                  disabled={
                    isActionLoading ||
                    Boolean(
                      submittingTheme?.deadline &&
                      new Date() > new Date(`${submittingTheme.deadline}T23:59:59`) &&
                      submittingTheme?.allowLateSubmit === false
                    )
                  }
                  className="h-8 px-4 text-xs font-medium rounded-none bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer shadow-none transition-colors"
                >
                  {isActionLoading ? t('common.loading', 'Đang gửi...') : t('planning.confirmSubmitPlan', 'Xác nhận nộp kế hoạch')}
                </Button>
              );
            })()}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 5. Modal: BGH Rejection Reason Details */}
      <Dialog
        open={Boolean(rejectionModalTheme)}
        onOpenChange={(open) => !open && setRejectionModalTheme(null)}
      >
        <DialogContent className="w-[calc(100vw-32px)] max-w-md p-5 sm:p-6 rounded-none border border-border bg-card shadow-2xl text-foreground select-none overflow-hidden box-border">
          <DialogHeader className="space-y-1 pb-3 border-b border-border text-left">
            <DialogTitle className="text-[16px] font-semibold text-foreground tracking-tight">
              {t('planning.bghFeedbackTitle', 'Ý kiến phản hồi của Ban Giám Hiệu')}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              {t('planning.theme', 'Chủ đề')} <strong className="font-semibold text-foreground">"{rejectionModalTheme?.name}"</strong>
              {rejectionModalTheme?.dateRange && <span> ({rejectionModalTheme.dateRange})</span>}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-1 text-xs">
            <div className="bg-muted/30 border border-border rounded-none p-3.5 text-foreground leading-relaxed font-normal">
              "{rejectionModalTheme?.rejectionReason || t('planning.defaultRejectionReason', 'Ban Giám Hiệu yêu cầu rà soát và bổ sung kế hoạch.')}"
            </div>
            <p className="text-muted-foreground text-[11.5px]">
              {t('planning.rejectionReviewNotice', 'Vui lòng kiểm tra lại 3 tab Phân bố mục tiêu, Xác định hoạt động, và Kế hoạch tuần, sau đó bấm "Nộp lại".')}
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-2 pt-3 border-t border-border flex items-center justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRejectionModalTheme(null)}
              className="h-8 px-4 text-xs font-medium rounded-none border border-border hover:bg-muted text-foreground cursor-pointer shadow-none"
            >
              {t('common.close', 'Đóng')}
            </Button>
            {!isBGH && (
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  const targetTh = rejectionModalTheme;
                  setRejectionModalTheme(null);
                  handleOpenSubmitModal(targetTh);
                }}
                className="h-8 px-4 text-xs font-medium rounded-none bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer shadow-none transition-colors"
              >
                {t('planning.resubmitPlan', 'Nộp lại kế hoạch')}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 6. Preview Drawer (Reusing ThemePlanReviewDrawer for teacher preview) */}
      {previewThemeId && (
        <ThemePlanReviewDrawer
          isOpen={isPreviewDrawerOpen}
          onClose={() => setIsPreviewDrawerOpen(false)}
          classId={classId}
          themeId={previewThemeId}
          onPlanStatusUpdated={loadSummary}
          isTeacherView={!isBGH}
        />
      )}
    </div>
  );
}

export default PlanSubmissionTab;
