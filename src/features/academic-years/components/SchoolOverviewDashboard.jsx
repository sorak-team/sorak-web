import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Download01Icon,
  ArrowRight01Icon,
  ArrowUpRight01Icon,
  ArrowLeft01Icon,
} from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { downloadBlob } from '@/shared/utils/download';
import { academicYearsApi } from '../academic-years.api';
import { cn } from '@/shared/lib/utils';

const AGE_GROUP_ORDER = {
  NHA_TRE: 1,
  nhatre: 1,
  MAM: 2,
  mam: 2,
  CHOI: 3,
  choi: 3,
  LA: 4,
  la: 4,
};

const getAgeGroupRank = (ageGroup, name = '') => {
  const norm = String(ageGroup || '').toUpperCase().trim();
  if (AGE_GROUP_ORDER[norm]) return AGE_GROUP_ORDER[norm];

  const lowerName = String(name || '').toLowerCase();
  if (lowerName.includes('nhà trẻ') || lowerName.includes('nha tre')) return 1;
  if (lowerName.includes('mầm') || lowerName.includes('mam')) return 2;
  if (lowerName.includes('chồi') || lowerName.includes('choi')) return 3;
  if (lowerName.includes('lá') || lowerName.includes('la')) return 4;
  return 99;
};

export function SchoolOverviewDashboard({ year, yearId }) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [studentCategoryTab, setStudentCategoryTab] = useState('SUPPORT'); // 'SUPPORT' | 'OUTSTANDING'
  const [supportPage, setSupportPage] = useState(1);
  const [outstandingPage, setOutstandingPage] = useState(1);
  const STUDENTS_PER_PAGE = 5;

  const targetYearId = year?.id || yearId;

  const fetchData = async () => {
    if (!targetYearId) return;
    try {
      setIsLoading(true);
      const res = await academicYearsApi.getSchoolOverviewStatistics(targetYearId);
      setData(res);
    } catch (err) {
      console.error('Failed to load school overview statistics:', err);
      toast.error('Không thể tải dữ liệu thống kê tổng quan trường.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [targetYearId]);

  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      const blob = await academicYearsApi.exportSchoolStatisticsExcel(targetYearId);
      const cleanName = (year?.name || '2026-2027').replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `Bao_Cao_Thong_Ke_Toan_Truong_${cleanName}.xlsx`;
      downloadBlob(blob, filename);
      toast.success('Đã xuất báo cáo thống kê toàn trường ra file Excel thành công.');
    } catch (err) {
      console.error('Export error:', err);
      toast.error('Không thể xuất file Excel. Vui lòng thử lại sau.');
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[360px] py-12 gap-3 text-muted-foreground select-none">
        <div className="size-7 border-2 border-primary border-t-transparent animate-spin rounded-full" />
        <span className="text-[13px] font-medium">Đang tải dữ liệu thống kê trường...</span>
      </div>
    );
  }

  const summary = data?.summary || {};
  const matrix = data?.monthlyStudentMatrix || { months: [], classes: [], footer: {} };
  const plans = data?.planStatistics || {};
  const needSupport = data?.childrenNeedingSupport || [];
  const outstanding = data?.childrenOutstanding || [];

  const currentCategoryList = studentCategoryTab === 'SUPPORT' ? needSupport : outstanding;
  const currentPage = studentCategoryTab === 'SUPPORT' ? supportPage : outstandingPage;
  const setCurrentPage = studentCategoryTab === 'SUPPORT' ? setSupportPage : setOutstandingPage;
  const totalPages = Math.ceil(currentCategoryList.length / STUDENTS_PER_PAGE) || 1;
  const paginatedStudents = currentCategoryList.slice(
    (currentPage - 1) * STUDENTS_PER_PAGE,
    currentPage * STUDENTS_PER_PAGE,
  );

  const sortedMatrixClasses = [...(matrix.classes || [])].sort((a, b) => {
    const rankA = getAgeGroupRank(a.ageGroup, a.name);
    const rankB = getAgeGroupRank(b.ageGroup, b.name);
    if (rankA !== rankB) return rankA - rankB;
    return (a.name || '').localeCompare(b.name || '', 'vi', { numeric: true });
  });

  const sortedPlansByClass = [...(plans.byClass || [])].sort((a, b) => {
    const rankA = getAgeGroupRank(a.ageGroup, a.className);
    const rankB = getAgeGroupRank(b.ageGroup, b.className);
    if (rankA !== rankB) return rankA - rankB;
    return (a.className || '').localeCompare(b.className || '', 'vi', { numeric: true });
  });

  return (
    <div className="flex flex-col gap-3.5 text-foreground select-none animate-in fade-in-50 duration-200">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-0.5">
        <div>
          <h2 className="text-[16px] font-semibold text-foreground tracking-tight">
            Thống kê trường & Sĩ số năm học
          </h2>
          <p className="text-[11.5px] text-muted-foreground mt-0.5">
            Số hóa bảng thống kê sĩ số học sinh và theo dõi chất lượng giáo dục toàn trường
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleExportExcel}
          disabled={isExporting}
          className="h-7 px-2.5 rounded-none border-border bg-background hover:bg-muted/60 text-foreground text-[11.5px] font-normal cursor-pointer shadow-none flex items-center gap-1.5 shrink-0"
          title="Xuất tệp Excel"
        >
          <HugeiconsIcon icon={Download01Icon} size={13} className="text-muted-foreground" />
          <span>{isExporting ? 'Đang xuất tệp...' : 'Xuất tệp Excel'}</span>
        </Button>
      </div>

      {/* 2. 4 Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {/* Cơ cấu giới tính */}
        <div className="border border-border bg-card py-2.5 px-3 rounded-none flex flex-col justify-between min-h-[86px] shadow-2xs">
          <span className="text-[11.5px] text-muted-foreground font-medium">Cơ cấu giới tính</span>
          <span className="text-[20px] font-semibold text-foreground tracking-tight leading-none font-mono">
            {summary.femaleRate || 0}% <span className="text-[12px] text-muted-foreground font-normal">nữ</span>
          </span>
          <span className="text-[11px] text-muted-foreground font-mono leading-normal">
            {summary.totalFemaleStudents || 0} nữ / {summary.totalMaleStudents || 0} nam
          </span>
        </div>

        {/* Duyệt kế hoạch giáo dục */}
        <div className="border border-border bg-card py-2.5 px-3 rounded-none flex flex-col justify-between min-h-[86px] shadow-2xs">
          <span className="text-[11.5px] text-muted-foreground font-medium">Tiến độ kế hoạch</span>
          <span className="text-[20px] font-semibold text-foreground tracking-tight leading-none font-mono">
            {summary.planApprovalRate || 0}%{' '}
            <span className="text-[12px] text-muted-foreground font-normal">
              ({summary.approvedPlans || 0}/{summary.totalPlans || 0})
            </span>
          </span>
          <span className="text-[11px] text-muted-foreground leading-normal pb-0.5">
            {plans.pendingPlans > 0 ? `${plans.pendingPlans} kế hoạch chờ duyệt` : 'Đã duyệt toàn bộ'}
          </span>
        </div>

        {/* Trẻ cần hỗ trợ */}
        <div className="border border-border bg-card py-2.5 px-3 rounded-none flex flex-col justify-between min-h-[86px] shadow-2xs">
          <span className="text-[11.5px] text-muted-foreground font-medium">Trẻ cần hỗ trợ</span>
          <span className="text-[20px] font-semibold text-foreground tracking-tight leading-none font-mono">
            {needSupport.length} <span className="text-[12px] text-muted-foreground font-normal">học sinh</span>
          </span>
          <span className="text-[11px] text-muted-foreground leading-normal">
            {needSupport.length > 0 ? 'Cần theo dõi thêm' : 'Đạt chuẩn phát triển'}
          </span>
        </div>

        {/* Trẻ vượt trội */}
        <div className="border border-border bg-card py-2.5 px-3 rounded-none flex flex-col justify-between min-h-[86px] shadow-2xs">
          <span className="text-[11.5px] text-muted-foreground font-medium">Trẻ vượt trội</span>
          <span className="text-[20px] font-semibold text-foreground tracking-tight leading-none font-mono">
            {outstanding.length} <span className="text-[12px] text-muted-foreground font-normal">học sinh</span>
          </span>
          <span className="text-[11px] text-muted-foreground leading-normal">
            {outstanding.length > 0 ? 'Xuất sắc & vượt trội mục tiêu' : 'Đang cập nhật đánh giá'}
          </span>
        </div>
      </div>

      {/* 3. Section: BẢNG THỐNG KÊ SĨ SỐ HỌC SINH 9 THÁNG (Không dùng badge lớp, có line rõ ràng) */}
      <div className="border border-border bg-card p-3 sm:p-3.5 rounded-none shadow-2xs flex flex-col gap-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-1 border-b border-border/60">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-[13.5px] font-semibold text-foreground tracking-tight uppercase">
                Bảng thống kê sĩ số học sinh
              </h3>
              <span className="text-[11px] text-muted-foreground font-mono">
                ({matrix.classes?.length || 0} lớp học)
              </span>
            </div>
            <p className="text-[11.5px] text-muted-foreground mt-0.5">
              Quy chuẩn: <strong className="font-semibold text-foreground font-mono">Nữ / Tổng số trẻ</strong> (Ví dụ: 8/15 tức là 8 trẻ nữ trên tổng 15 trẻ của lớp). Các tháng chưa tới để trống.
            </p>
          </div>
        </div>

        {/* Table Container with full crisp borders, balanced width and comfortable padding */}
        <div className="w-full overflow-x-auto border border-border">
          <table className="w-full text-left border-collapse table-fixed min-w-[680px]">
            <thead>
              <tr className="bg-muted/30 border-b border-border text-muted-foreground text-[11.5px] font-semibold uppercase h-9">
                <th className="py-2 px-3.5 w-[28%] min-w-[190px] border-r border-border text-left whitespace-nowrap">
                  Lớp & Giáo viên
                </th>
                {(matrix.months || []).map((m) => (
                  <th key={m.month} className="py-2 px-1 w-[8%] text-center border-r border-border font-mono whitespace-nowrap text-[11px]">
                    {m.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sortedMatrixClasses?.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-muted-foreground text-[12.5px]">
                    Chưa có dữ liệu lớp học trong năm học này.
                  </td>
                </tr>
              ) : (
                sortedMatrixClasses.map((cls) => {
                  const isAssigned =
                    cls.teacherName &&
                    cls.teacherName !== 'Chưa phân công' &&
                    cls.teacherName !== 'Chưa phân công giáo viên' &&
                    cls.teacherName !== 'Chưa phân công GV';

                  const teacherDisplay = isAssigned
                    ? cls.teacherName
                    : 'Chưa phân công giáo viên';

                  return (
                    <tr key={cls.classId} className="hover:bg-muted/15 transition-colors h-[46px]">
                      <td className="py-2 px-3.5 border-r border-border bg-card">
                        <Link
                          to={`/classes/${cls.classId}`}
                          className="hover:underline transition-colors text-[13px] font-medium text-foreground block leading-snug truncate"
                          title="Xem chi tiết lớp"
                        >
                          {cls.name}
                        </Link>
                        <span
                          className="text-[11px] text-muted-foreground block leading-tight mt-0.5 truncate"
                          title={
                            isAssigned
                              ? `Giáo viên phụ trách: ${cls.teacherName}`
                              : 'Chưa phân công giáo viên'
                          }
                        >
                          {teacherDisplay}
                        </span>
                      </td>

                      {(cls.monthsData || []).map((m, idx) => {
                        const isZero = m.total === 0;
                        const displayLabel = m.isFuture || isZero ? '-' : m.label;

                        return (
                          <td
                            key={idx}
                            className={cn(
                              'py-2 px-1 text-center border-r border-border font-mono text-[12px] whitespace-nowrap',
                              m.isFuture || isZero ? 'text-muted-foreground/30 font-normal' : 'text-foreground font-medium',
                            )}
                          >
                            {displayLabel}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}

              {/* TỔNG SỐ ROW */}
              <tr className="bg-muted/30 border-t-2 border-border text-foreground font-semibold h-9">
                <td className="py-2 px-3.5 border-r border-border uppercase tracking-wider text-[11.5px] text-foreground font-bold whitespace-nowrap">
                  Tổng số
                </td>
                {(matrix.footer?.totalRow || []).map((m, idx) => (
                  <td
                    key={idx}
                    className={cn(
                      'py-2 px-1 text-center border-r border-border font-mono text-[12px] whitespace-nowrap',
                      m.isFuture
                        ? 'text-muted-foreground/30 font-normal'
                        : 'text-foreground font-bold',
                    )}
                  >
                    {m.label}
                  </td>
                ))}
              </tr>

              {/* TĂNG ROW */}
              <tr className="text-foreground h-8">
                <td className="py-1.5 px-3.5 border-r border-border text-[11px] font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                  Tăng
                </td>
                {(matrix.footer?.increaseRow || []).map((m, idx) => (
                  <td
                    key={idx}
                    className={cn(
                      'py-1.5 px-1 text-center border-r border-border font-mono text-[11.5px] whitespace-nowrap',
                      m.isFuture
                        ? 'text-muted-foreground/30 font-normal'
                        : m.count > 0
                          ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                          : 'text-muted-foreground/60',
                    )}
                  >
                    {m.isFuture ? '-' : m.count > 0 ? `+${m.count}` : '0'}
                  </td>
                ))}
              </tr>

              {/* GIẢM ROW */}
              <tr className="text-foreground h-8">
                <td className="py-1.5 px-3.5 border-r border-border text-[11px] font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                  Giảm
                </td>
                {(matrix.footer?.decreaseRow || []).map((m, idx) => (
                  <td
                    key={idx}
                    className={cn(
                      'py-1.5 px-1 text-center border-r border-border font-mono text-[11.5px] whitespace-nowrap',
                      m.isFuture
                        ? 'text-muted-foreground/30 font-normal'
                        : m.count > 0
                          ? 'text-rose-600 dark:text-rose-400 font-semibold'
                          : 'text-muted-foreground/60',
                    )}
                  >
                    {m.isFuture ? '-' : m.count > 0 ? `-${m.count}` : '0'}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Hai Panel thông tin chuyên môn chia 2 cột - Đầy đủ Line & Không dùng badge lộn xộn */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        {/* Panel 1: Tiến độ Kế hoạch Giáo dục các lớp */}
        <div className="border border-border bg-card p-3 sm:p-3.5 rounded-none shadow-2xs flex flex-col gap-2.5">
          <div className="flex items-center justify-between pb-1 border-b border-border/60">
            <div>
              <h3 className="text-[13.5px] font-semibold text-foreground tracking-tight">
                Tiến độ Kế hoạch Giáo dục
              </h3>
              <p className="text-[11.5px] text-muted-foreground mt-0.5">
                Tình trạng nộp và duyệt kế hoạch chủ đề của các lớp
              </p>
            </div>

            <Link
              to="/planning/reviews"
              title="Xem danh sách duyệt kế hoạch"
              aria-label="Xem danh sách duyệt kế hoạch"
              className="h-7 w-7 flex items-center justify-center border border-border/70 bg-muted/20 hover:bg-muted text-muted-foreground hover:text-foreground transition-all rounded-none shrink-0 group"
            >
              <HugeiconsIcon
                icon={ArrowUpRight01Icon}
                size={14}
                className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              />
            </Link>
          </div>

          {/* 4 Summary Counters */}
          <div className="grid grid-cols-4 gap-1.5 text-center">
            <div className="p-1.5 border border-border/70 bg-muted/20 rounded-none">
              <span className="text-[10.5px] text-muted-foreground block">Đã phê duyệt</span>
              <span className="text-[15px] font-semibold font-mono text-foreground">
                {plans.approvedPlans || 0}
              </span>
            </div>
            <div className="p-1.5 border border-border/70 bg-muted/20 rounded-none">
              <span className="text-[10.5px] text-muted-foreground block">Chờ phê duyệt</span>
              <span className="text-[15px] font-semibold font-mono text-foreground">
                {plans.pendingPlans || 0}
              </span>
            </div>
            <div className="p-1.5 border border-border/70 bg-muted/20 rounded-none">
              <span className="text-[10.5px] text-muted-foreground block">Cần chỉnh sửa</span>
              <span className="text-[15px] font-semibold font-mono text-foreground">
                {plans.rejectedPlans || 0}
              </span>
            </div>
            <div className="p-1.5 border border-border/70 bg-muted/20 rounded-none">
              <span className="text-[10.5px] text-muted-foreground block">Bản nháp</span>
              <span className="text-[15px] font-semibold font-mono text-foreground">
                {plans.draftPlans || 0}
              </span>
            </div>
          </div>

          {/* Clean Class Table (Horizontal lines, no vertical borders, no dots, restrained colors) */}
          <div className="w-full overflow-x-auto border border-border bg-card">
            <table className="w-full text-left text-[12px] border-collapse min-w-[340px]">
              <thead>
                <tr className="bg-muted/30 border-b border-border/80 text-muted-foreground text-[11px] font-medium tracking-wide sticky top-0 bg-muted/90 backdrop-blur-xs z-10">
                  <th className="py-1.5 px-2.5 w-[110px]">Lớp</th>
                  <th className="py-1.5 px-2.5 w-[95px] text-center">Tiến độ nộp</th>
                  <th className="py-1.5 px-2.5">Trạng thái phê duyệt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {sortedPlansByClass.map((cls) => {
                  const isApproved = cls.totalPlans > 0 && cls.approved === cls.totalPlans;
                  const isPending = cls.pending > 0;
                  const isRejected = cls.rejected > 0;

                  return (
                    <tr key={cls.classId} className="hover:bg-muted/15 transition-colors">
                      <td className="py-1.5 px-2.5 font-medium text-foreground whitespace-nowrap">
                        {cls.className}
                      </td>

                      <td className="py-1.5 px-2.5 text-center font-mono text-[11.5px] text-muted-foreground whitespace-nowrap">
                        {cls.approved}/{cls.totalPlans} KH
                      </td>

                      <td className="py-1.5 px-2.5 whitespace-nowrap">
                        <span
                          className={cn(
                            'text-[11.5px]',
                            isPending && 'text-foreground font-medium',
                            isRejected && 'text-rose-700 dark:text-rose-400 font-medium',
                            isApproved && 'text-muted-foreground font-normal',
                            !isPending && !isRejected && !isApproved && 'text-muted-foreground/60 font-normal',
                          )}
                        >
                          {cls.statusText}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Panel 2: Theo dõi Đánh giá Học sinh */}
        <div className="border border-border bg-card p-3 sm:p-3.5 rounded-none shadow-2xs flex flex-col gap-2.5">
          <div className="flex items-center justify-between pb-1 border-b border-border/60">
            <div>
              <h3 className="text-[13.5px] font-semibold text-foreground tracking-tight">
                Theo dõi Đánh giá Học sinh
              </h3>
              <p className="text-[11.5px] text-muted-foreground mt-0.5">
                Phân loại theo chuẩn mục tiêu và lĩnh vực phát triển
              </p>
            </div>

            <Link
              to="/assessment"
              title="Xem sổ đánh giá chi tiết"
              aria-label="Xem sổ đánh giá chi tiết"
              className="h-7 w-7 flex items-center justify-center border border-border/70 bg-muted/20 hover:bg-muted text-muted-foreground hover:text-foreground transition-all rounded-none shrink-0 group"
            >
              <HugeiconsIcon
                icon={ArrowUpRight01Icon}
                size={14}
                className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              />
            </Link>
          </div>

          {/* 2 Summary Counters (Clean neutral switcher matching Panel 1) */}
          <div className="grid grid-cols-2 gap-2 text-center">
            <button
              type="button"
              onClick={() => setStudentCategoryTab('SUPPORT')}
              className={cn(
                'p-1.5 border rounded-none text-center cursor-pointer transition-colors flex items-center justify-between px-3',
                studentCategoryTab === 'SUPPORT'
                  ? 'border-border bg-muted/60 text-foreground font-medium shadow-2xs'
                  : 'border-border/60 bg-muted/10 text-muted-foreground hover:bg-muted/30',
              )}
            >
              <span className="text-[11px]">Trẻ cần hỗ trợ</span>
              <span className="text-[15px] font-semibold font-mono text-foreground">
                {needSupport.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStudentCategoryTab('OUTSTANDING')}
              className={cn(
                'p-1.5 border rounded-none text-center cursor-pointer transition-colors flex items-center justify-between px-3',
                studentCategoryTab === 'OUTSTANDING'
                  ? 'border-border bg-muted/60 text-foreground font-medium shadow-2xs'
                  : 'border-border/60 bg-muted/10 text-muted-foreground hover:bg-muted/30',
              )}
            >
              <span className="text-[11px]">Trẻ vượt trội</span>
              <span className="text-[15px] font-semibold font-mono text-foreground">
                {outstanding.length}
              </span>
            </button>
          </div>

          {/* Proper 3-Column Table with Mini Pagination (Consistent height, no jump/layout shift) */}
          <div className="border border-border bg-card flex flex-col justify-between">
            <div className="w-full overflow-x-auto min-h-[280px]">
              {currentCategoryList.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-[12px]">
                  {studentCategoryTab === 'SUPPORT'
                    ? 'Hiện tại không có học sinh thuộc nhóm cần hỗ trợ.'
                    : 'Chưa có học sinh đạt chuẩn vượt trội trong kỳ đánh giá này.'}
                </div>
              ) : (
                <table className="w-full text-left text-[11.5px] border-collapse min-w-[340px]">
                  <thead>
                    <tr className="bg-muted/30 border-b border-border/80 text-[11px] font-medium text-muted-foreground tracking-wide">
                      <th className="py-2 px-2.5 w-[145px] whitespace-nowrap">Học sinh</th>
                      <th className="py-2 px-1.5 w-[65px] text-center whitespace-nowrap">Lớp</th>
                      <th className="py-2 px-2.5">
                        {studentCategoryTab === 'SUPPORT' ? 'Tình trạng đánh giá' : 'Kết quả vượt trội'}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedStudents.map((st) => (
                      <tr key={st.studentId} className="border-b border-border/60 hover:bg-muted/15 transition-colors">
                        <td className="py-2 px-2.5 font-medium text-foreground whitespace-nowrap align-top">
                          <Link
                            to={`/classes/${st.classId || '1'}/students/${st.studentId}`}
                            className="hover:text-foreground hover:underline inline"
                          >
                            {st.fullName}
                          </Link>
                          <span className="text-[11px] text-muted-foreground ml-1.5 font-normal inline">
                            ({st.gender === 'FEMALE' || st.gender === 'Nữ' ? 'Nữ' : 'Nam'})
                          </span>
                        </td>

                        <td className="py-2 px-1.5 text-center text-muted-foreground font-medium whitespace-nowrap align-top">
                          {st.className}
                        </td>

                        <td className="py-2 px-2.5 text-[11.5px] text-foreground align-top">
                          {studentCategoryTab === 'SUPPORT' ? (
                            <>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-[11px] font-semibold text-rose-700 dark:text-rose-400">
                                  {st.notAchievedCount}/{st.totalGoals} MT chưa đạt ({st.notAchievedPct}%)
                                </span>
                              </div>
                              {st.reasons && (
                                <span className="text-muted-foreground block text-[11px] mt-0.5 leading-snug">
                                  {st.reasons.join(' · ')}
                                </span>
                              )}
                            </>
                          ) : (
                            <>
                              <span className="font-medium text-foreground block leading-snug">
                                {st.outstandingType || 'Xuất sắc toàn diện'}
                              </span>
                              <span className="text-muted-foreground block text-[11px] mt-0.5 leading-snug">
                                {st.reasons && st.reasons.length > 0
                                  ? st.reasons.join(' · ')
                                  : 'Đạt 100% mục tiêu đánh giá GDMN'}
                              </span>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}

                    {/* Hàng lưới trống (Empty grid rows) để giữ cấu trúc bảng luôn đủ 5 dòng có line đều đặn */}
                    {Array.from({
                      length: Math.max(0, STUDENTS_PER_PAGE - paginatedStudents.length),
                    }).map((_, idx) => (
                      <tr key={`empty-${idx}`} className="border-b border-border/30 h-[48px]">
                        <td className="py-2 px-2.5">&nbsp;</td>
                        <td className="py-2 px-1.5">&nbsp;</td>
                        <td className="py-2 px-2.5">&nbsp;</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Mini Pagination Footer (Stationary, no jumping) */}
            {currentCategoryList.length > 0 && (
              <div className="flex items-center justify-between px-3 py-2 border-t border-border bg-muted/20 text-[11px] text-muted-foreground select-none">
                <span className="font-mono">
                  {(currentPage - 1) * STUDENTS_PER_PAGE + 1}–{Math.min(currentPage * STUDENTS_PER_PAGE, currentCategoryList.length)} trong {currentCategoryList.length} học sinh
                </span>

                <div className="flex items-center gap-1.5">
                  <span className="font-mono mr-1 text-[11px]">
                    Trang {currentPage}/{totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    className={cn(
                      'h-7 w-7 flex items-center justify-center border border-border rounded-none bg-background transition-colors',
                      currentPage <= 1
                        ? 'opacity-35 cursor-not-allowed text-muted-foreground/40'
                        : 'hover:bg-muted text-foreground cursor-pointer shadow-2xs active:scale-95',
                    )}
                    title="Trang trước"
                    aria-label="Trang trước"
                  >
                    <HugeiconsIcon icon={ArrowLeft01Icon} size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    className={cn(
                      'h-7 w-7 flex items-center justify-center border border-border rounded-none bg-background transition-colors',
                      currentPage >= totalPages
                        ? 'opacity-35 cursor-not-allowed text-muted-foreground/40'
                        : 'hover:bg-muted text-foreground cursor-pointer shadow-2xs active:scale-95',
                    )}
                    title="Trang sau"
                    aria-label="Trang sau"
                  >
                    <HugeiconsIcon icon={ArrowRight01Icon} size={13} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SchoolOverviewDashboard;
