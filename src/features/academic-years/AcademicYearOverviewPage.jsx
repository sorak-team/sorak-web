import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  PencilEdit02Icon,
  ArrowRight01Icon,
  ArrowUpRight01Icon,
  Menu01Icon,
} from '@hugeicons/core-free-icons';
import {
  useAcademicYearStore,
  getDayAfterDisplayDate,
  isAcademicYearInUse,
} from './academic-years.store';
import { AcademicYearGlassEmblem } from './components/AcademicYearGlassEmblem';
import { QuickColorPopover } from './components/QuickColorPopover';
import { AcademicYearDrawer } from './components/AcademicYearDrawer';
import { AcademicYearTransitionView } from './components/AcademicYearTransitionView';
import { AcademicCalendarView } from './components/AcademicCalendarView';
import { SchoolOverviewDashboard } from './components/SchoolOverviewDashboard';
import { academicYearsApi } from './academic-years.api';
import { Button } from '@/components/ui/button';
import { NotFoundPage } from '@/features/error';
import { cn } from '@/shared/lib/utils';

export function AcademicYearOverviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  const validTabs = ['OVERVIEW', 'STATISTICS', 'CALENDAR', 'TRANSITION'];
  const rawTab = searchParams.get('tab');
  const activeTab = validTabs.includes(rawTab) ? rawTab : 'OVERVIEW';
  const setActiveTab = (tab) => {
    setSearchParams(tab === 'OVERVIEW' ? {} : { tab });
  };

  const {
    academicYears,
    isLoading,
    fetchAcademicYears,
    openEditDrawer,
    selectedYearId,
    setSelectedYearId,
  } = useAcademicYearStore();

  useEffect(() => {
    if (academicYears.length === 0) {
      fetchAcademicYears();
    }
  }, [fetchAcademicYears, academicYears.length]);

  const [calendarCounters, setCalendarCounters] = useState({
    totalEvents: 0,
    holidaysCount: 0,
    generalActivitiesCount: 0,
    scheduledHolidays: 0,
    pendingConfirmCount: 0,
    syncedCalendarCount: 0,
  });
  const [upcomingHolidays, setUpcomingHolidays] = useState([]);
  const [yearDetail, setYearDetail] = useState(null);

  // Find target year with exact id match prioritized
  const year =
    academicYears.find((y) => String(y.id) === String(id)) ||
    academicYears.find((y) => y.range === id || y.name === id) ||
    academicYears.find((y) => id && id.length >= 4 && y.name?.includes(id)) ||
    (id === '2026-2027' && academicYears.find((y) => String(y.id) === '1' || y.name?.includes('2026'))) ||
    (academicYears.length > 0 && !id ? academicYears[0] : null);

  // Transition is only allowed for the active academic year; completed/old years are disabled
  const isTransitionDisabled = year?.status === 'COMPLETED' || (!year?.active && year?.status !== 'ACTIVE');

  useEffect(() => {
    if (year?.id && String(selectedYearId) !== String(year.id)) {
      setSelectedYearId(String(year.id));
    }
  }, [year?.id, selectedYearId, setSelectedYearId]);

  useEffect(() => {
    if (isTransitionDisabled && activeTab === 'TRANSITION') {
      setActiveTab('OVERVIEW');
    }
  }, [isTransitionDisabled, activeTab]);

  useEffect(() => {
    const targetId = year?.id || id;
    if (targetId) {
      academicYearsApi
        .getById(targetId)
        .then((res) => {
          if (res) setYearDetail(res);
        })
        .catch(console.error);

      academicYearsApi
        .listHolidays(targetId)
        .then((res) => {
          if (res?.counters) setCalendarCounters(res.counters);
          if (res?.items) setUpcomingHolidays(res.items);
        })
        .catch(console.error);
    }
  }, [year?.id, id]);

  if (!year) {
    if (isLoading) {
      return (
        <div className="w-full flex-1 flex flex-col gap-5 max-w-[1400px] mx-auto text-foreground select-none animate-pulse">
          {/* Topbar Skeleton */}
          <div className="border border-border bg-card p-5 sm:p-6 rounded-none flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-4 min-w-0">
              <div className="size-14 bg-muted/60 rounded-none shrink-0" />
              <div className="flex flex-col gap-2">
                <div className="h-6 w-48 bg-muted/60 rounded-none" />
                <div className="h-4 w-64 bg-muted/40 rounded-none" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-8.5 w-32 bg-muted/50 rounded-none" />
              <div className="h-8.5 w-36 bg-muted/50 rounded-none" />
            </div>
          </div>
          {/* Content Skeleton */}
          <div className="border border-border bg-card p-6 rounded-none h-[400px]" />
        </div>
      );
    }

    return <NotFoundPage />;
  }

  // Operational staffing & student assignment metrics (merged with real yearDetail)
  const currentYear = { ...year, ...(yearDetail || {}) };

  const totalClassesCount = currentYear.totalClasses !== undefined && currentYear.totalClasses !== null
    ? Number(currentYear.totalClasses)
    : (currentYear.classes?.length || 0);

  const classesWithTeacher = currentYear.classesWithTeacher !== undefined && currentYear.classesWithTeacher !== null
    ? Number(currentYear.classesWithTeacher)
    : 0;

  const classesWithoutTeacher = currentYear.classesWithoutTeacher !== undefined && currentYear.classesWithoutTeacher !== null
    ? Number(currentYear.classesWithoutTeacher)
    : Math.max(0, totalClassesCount - classesWithTeacher);

  const totalStudentsCount = currentYear.totalStudents !== undefined && currentYear.totalStudents !== null
    ? Number(currentYear.totalStudents)
    : 0;

  const studentsAssigned = currentYear.studentsAssigned !== undefined && currentYear.studentsAssigned !== null
    ? Number(currentYear.studentsAssigned)
    : totalStudentsCount;

  const studentsUnassigned = currentYear.studentsUnassigned !== undefined && currentYear.studentsUnassigned !== null
    ? Number(currentYear.studentsUnassigned)
    : Math.max(0, totalStudentsCount - studentsAssigned);

  const totalTeachersCount = currentYear.totalTeachers !== undefined && currentYear.totalTeachers !== null
    ? Number(currentYear.totalTeachers)
    : (currentYear.teachers !== undefined ? Number(currentYear.teachers) : 0);

  const teachersAssigned = currentYear.teachersAssigned !== undefined && currentYear.teachersAssigned !== null
    ? Number(currentYear.teachersAssigned)
    : 0;

  const teachersUnassigned = currentYear.teachersUnassigned !== undefined && currentYear.teachersUnassigned !== null
    ? Number(currentYear.teachersUnassigned)
    : Math.max(0, totalTeachersCount - teachersAssigned);

  const studentsPct = totalStudentsCount > 0 ? Math.round((studentsAssigned / totalStudentsCount) * 100) : 0;
  const teachersPct = totalTeachersCount > 0 ? Math.round((teachersAssigned / totalTeachersCount) * 100) : 0;
  const classesPct = totalClassesCount > 0 ? Math.round((classesWithTeacher / totalClassesCount) * 100) : 0;

  return (
    <div
      className="w-full flex-1 flex flex-col gap-4 max-w-[1400px] mx-auto text-foreground select-none"
      data-node-id="5229:23350"
      data-name="FE-02A · BGH · Năm học · Overview"
    >
      {/* Year Workspace Topbar (Figma 5229:23390) */}
      <div
        className="border border-border bg-card p-4 sm:p-5 rounded-none flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs"
        data-node-id="5229:23390"
        data-name="Year Workspace Topbar"
      >
        <div className="flex items-center gap-4 min-w-0" data-node-id="5229:23391">
          <AcademicYearGlassEmblem
            theme={year.colorTheme}
            size={52}
            avatarUrl={year.avatarUrl}
            year={year}
            alt={year.name}
          />

          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-[20px] sm:text-[22px] font-semibold text-foreground tracking-tight leading-tight">
                {year.name?.replace(/^Năm học/i, t('schoolYear.title', 'Năm học'))}
              </h1>
              <span
                className={cn(
                  'text-[12px] font-medium leading-none px-2.5 py-1 rounded-none border',
                  year.active
                    ? 'text-[#1447e6] dark:text-[#3B82F6] bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800'
                    : 'text-muted-foreground bg-muted border-border',
                )}
              >
                {year.active ? 'Đang hoạt động' : 'Đã kết thúc'}
              </span>
            </div>

            <p className="text-[12.5px] text-muted-foreground font-normal truncate">
              {currentYear.startDate} – {currentYear.endDate} · {totalClassesCount}{' '}
              {t('schoolYear.classesSuffix')} · {totalStudentsCount} học sinh
            </p>
          </div>
        </div>

        {/* Topbar Actions (Figma 5229:23394) */}
        <div className="flex items-center gap-1.5 self-start sm:self-center shrink-0">
          <Link
            to="/school-years?view=all"
            title="Danh sách tất cả các năm học"
            className="h-8 px-2.5 rounded-none border border-border bg-background hover:bg-muted text-foreground text-[12px] font-normal cursor-pointer flex items-center gap-1.5 transition-colors"
          >
            <HugeiconsIcon icon={Menu01Icon} size={14} className="text-muted-foreground" />
            <span className="hidden sm:inline">Tất cả năm học</span>
          </Link>

          <QuickColorPopover year={year} triggerClassName="size-8" />

          <button
            type="button"
            onClick={() => openEditDrawer(year.id)}
            title="Chỉnh sửa năm học"
            aria-label="Chỉnh sửa năm học"
            className="size-8 rounded-none border border-border bg-background hover:bg-muted text-foreground cursor-pointer flex items-center justify-center transition-colors"
            data-node-id="5229:24088"
          >
            <HugeiconsIcon icon={PencilEdit02Icon} size={15} />
          </button>
        </div>
      </div>

      {/* Multi-Pane Workspace (Figma 5229:23398) */}
      <div className="border border-border bg-card rounded-none flex flex-col lg:flex-row min-h-[720px] shadow-xs overflow-hidden">
        {/* Left Navigator Pane (Figma 5229:23399) */}
        <div
          className="w-full lg:w-[230px] shrink-0 border-b lg:border-b-0 lg:border-r border-border p-3.5 flex flex-col justify-between bg-muted/10 select-none"
          data-node-id="5229:23399"
          data-name="Year Navigator Pane"
        >
          <div className="flex flex-col gap-3">
            {/* Heading */}
            <div className="px-2 pt-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80 font-mono">
                KHÔNG GIAN NĂM HỌC
              </span>
            </div>

            {/* Subtab Navigation Items */}
            <nav className="grid grid-cols-3 lg:flex lg:flex-col gap-1 sm:gap-1.5">
              <button
                type="button"
                onClick={() => setActiveTab('OVERVIEW')}
                className={cn(
                  'w-full h-8.5 sm:h-9 px-2 sm:px-3 flex items-center justify-center lg:justify-start text-[12px] sm:text-[13px] font-medium text-center lg:text-left transition-colors cursor-pointer rounded-none',
                  activeTab === 'OVERVIEW'
                    ? 'bg-blue-50 text-[#1447e6] font-semibold dark:bg-blue-950/40 dark:text-blue-400'
                    : 'text-foreground hover:bg-muted/60',
                )}
                data-node-id="5229:23402"
              >
                <span className="truncate">Tổng quan</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('STATISTICS')}
                className={cn(
                  'w-full h-8.5 sm:h-9 px-2 sm:px-3 flex items-center justify-center lg:justify-start text-[12px] sm:text-[13px] font-medium text-center lg:text-left transition-colors cursor-pointer rounded-none',
                  activeTab === 'STATISTICS'
                    ? 'bg-blue-50 text-[#1447e6] font-semibold dark:bg-blue-950/40 dark:text-blue-400'
                    : 'text-foreground hover:bg-muted/60',
                )}
                data-node-id="5229:23404"
              >
                <span className="truncate">Thống kê trường</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('CALENDAR')}
                className={cn(
                  'w-full h-8.5 sm:h-9 px-2 sm:px-3 flex items-center justify-center lg:justify-start text-[12px] sm:text-[13px] font-medium text-center lg:text-left transition-colors cursor-pointer rounded-none',
                  activeTab === 'CALENDAR'
                    ? 'bg-blue-50 text-[#1447e6] font-semibold dark:bg-blue-950/40 dark:text-blue-400'
                    : 'text-foreground hover:bg-muted/60',
                )}
                data-node-id="5229:23406"
              >
                <span className="truncate">Lịch năm học</span>
              </button>

              <button
                type="button"
                disabled={isTransitionDisabled}
                onClick={() => !isTransitionDisabled && setActiveTab('TRANSITION')}
                title={isTransitionDisabled ? 'Năm học cũ / đã kết thúc không hỗ trợ chuyển giao' : ''}
                className={cn(
                  'w-full h-8.5 sm:h-9 px-2 sm:px-3 flex items-center justify-center lg:justify-start text-[12px] sm:text-[13px] font-medium text-center lg:text-left transition-colors rounded-none',
                  isTransitionDisabled
                    ? 'opacity-40 text-muted-foreground cursor-not-allowed select-none'
                    : activeTab === 'TRANSITION'
                      ? 'bg-blue-50 text-[#1447e6] font-semibold dark:bg-blue-950/40 dark:text-blue-400 cursor-pointer'
                      : 'text-foreground hover:bg-muted/60 cursor-pointer',
                )}
              >
                <span className="truncate">Chuyển giao năm học</span>
              </button>
            </nav>

            {activeTab === 'CALENDAR' && (
              <>
                <div className="h-px bg-border my-1" />
                <div className="flex flex-col gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80 px-1 lg:px-2 font-mono">
                    THỐNG KÊ LỊCH NĂM HỌC
                  </span>
                  <div className="grid grid-cols-3 lg:flex lg:flex-col gap-1.5 lg:gap-1">
                    <div className="flex flex-col lg:flex-row items-center lg:justify-between p-2 lg:px-3 lg:py-1.5 bg-background lg:bg-transparent border border-border lg:border-0 text-[12px] sm:text-[13px] text-muted-foreground text-center lg:text-left">
                      <span className="text-[11px] lg:text-[13px]">Tổng số mục</span>
                      <span className="font-mono text-foreground font-semibold mt-0.5 lg:mt-0">
                        {String(calendarCounters.totalEvents).padStart(2, '0')}
                      </span>
                    </div>
                    <div className="flex flex-col lg:flex-row items-center lg:justify-between p-2 lg:px-3 lg:py-1.5 bg-background lg:bg-transparent border border-border lg:border-0 text-[12px] sm:text-[13px] text-muted-foreground text-center lg:text-left">
                      <span className="text-[11px] lg:text-[13px]">Ngày nghỉ</span>
                      <span className="font-mono text-foreground font-semibold mt-0.5 lg:mt-0">
                        {String(calendarCounters.holidaysCount).padStart(2, '0')}
                      </span>
                    </div>
                    <div className="flex flex-col lg:flex-row items-center lg:justify-between p-2 lg:px-3 lg:py-1.5 bg-background lg:bg-transparent border border-border lg:border-0 text-[12px] sm:text-[13px] text-muted-foreground text-center lg:text-left">
                      <span className="text-[11px] lg:text-[13px]">Sự kiện</span>
                      <span className="font-mono text-foreground font-semibold mt-0.5 lg:mt-0">
                        {String(calendarCounters.generalActivitiesCount).padStart(2, '0')}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right Main Pane */}
        <div className="flex-1 min-w-0 p-4 sm:p-5 bg-card flex flex-col gap-5 overflow-y-auto">
          {/* Subtab 1: Tổng quan hoạt động năm học (Thiết lập & Khởi tạo gốc) */}
          {activeTab === 'OVERVIEW' && (
            <div className="flex flex-col gap-5">
              {/* Overview Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1">
                <div>
                  <h2 className="text-[17px] font-semibold text-foreground tracking-tight">
                    Tổng quan & Chỉ số hoạt động
                  </h2>
                  <p className="text-[12px] text-muted-foreground mt-0.5">
                    Tổng hợp quy mô đào tạo, nhân sự và kế hoạch hoạt động năm học
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab('STATISTICS')}
                  className="h-8 px-3 rounded-none border-border bg-background hover:bg-muted/60 text-foreground text-[12px] font-normal cursor-pointer shadow-none flex items-center gap-1.5 shrink-0 self-start sm:self-center"
                  title="Xem thống kê trường"
                >
                  <span>Xem thống kê trường</span>
                  <HugeiconsIcon icon={ArrowRight01Icon} size={14} className="text-muted-foreground" />
                </Button>
              </div>

              {/* 4 Stats Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Lớp học */}
                <div className="border border-border bg-card p-3.5 rounded-none flex flex-col justify-between h-[88px] shadow-2xs">
                  <span className="text-[12px] text-muted-foreground font-medium">Quy mô lớp</span>
                  <span className="text-[22px] font-semibold text-foreground tracking-tight leading-none font-mono">
                    {totalClassesCount}
                  </span>
                  <span className="text-[11.5px] text-muted-foreground">4 khối đào tạo</span>
                </div>

                {/* Học sinh */}
                <div className="border border-border bg-card p-3.5 rounded-none flex flex-col justify-between h-[88px] shadow-2xs">
                  <span className="text-[12px] text-muted-foreground font-medium">Tổng học sinh</span>
                  <span className="text-[22px] font-semibold text-foreground tracking-tight leading-none font-mono">
                    {totalStudentsCount}
                  </span>
                  <span className="text-[11.5px] text-muted-foreground">Đã nhập học</span>
                </div>

                {/* Giáo viên */}
                <div className="border border-border bg-card p-3.5 rounded-none flex flex-col justify-between h-[88px] shadow-2xs">
                  <span className="text-[12px] text-muted-foreground font-medium">Đội ngũ giáo viên</span>
                  <span className="text-[22px] font-semibold text-foreground tracking-tight leading-none font-mono">
                    {totalTeachersCount}
                  </span>
                  <span className="text-[11.5px] text-muted-foreground">Đang công tác</span>
                </div>

                {/* Lớp đã có GV */}
                <div className="border border-border bg-card p-3.5 rounded-none flex flex-col justify-between h-[88px] shadow-2xs">
                  <span className="text-[12px] text-muted-foreground font-medium">Lớp đã có GV</span>
                  <span className="text-[22px] font-semibold text-foreground tracking-tight leading-none font-mono">
                    {classesWithTeacher}{' '}
                    <span className="text-[13px] text-muted-foreground font-normal">/ {totalClassesCount}</span>
                  </span>
                  <span className="text-[11.5px] text-muted-foreground">
                    {classesWithoutTeacher > 0 ? `${classesWithoutTeacher} lớp cần phân công` : 'Đã đủ giáo viên'}
                  </span>
                </div>
              </div>

              {/* 2 Summary Panels */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Panel 1: Tiến độ phân lớp & Nhân sự */}
                <div className="border border-border bg-card p-4 sm:p-5 rounded-none flex flex-col justify-between gap-4 shadow-2xs">
                  <div className="flex items-center justify-between pb-1 border-b border-border/60">
                    <div>
                      <h3 className="text-[14.5px] font-semibold text-foreground tracking-tight">
                        Tiến độ phân lớp & Nhân sự
                      </h3>
                      <p className="text-[12px] text-muted-foreground mt-0.5">
                        Tình trạng xếp lớp học sinh và phân công giảng dạy
                      </p>
                    </div>
                    <Link
                      to="/classes"
                      title="Quản lý lớp"
                      aria-label="Quản lý lớp"
                      className="h-7 w-7 flex items-center justify-center border border-border/70 bg-muted/20 hover:bg-muted text-muted-foreground hover:text-foreground transition-all rounded-none shrink-0 group"
                    >
                      <HugeiconsIcon
                        icon={ArrowUpRight01Icon}
                        size={14}
                        className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                      />
                    </Link>
                  </div>

                  {/* Clean Horizontal Rows */}
                  <div className="flex flex-col divide-y divide-border/60">
                    {/* Row 1: Học sinh */}
                    <div className="py-2.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
                      <div className="flex items-center justify-between sm:justify-start gap-2 min-w-[90px]">
                        <span className="text-[13px] font-medium text-foreground">Học sinh</span>
                        <span className="text-[11.5px] text-muted-foreground font-mono">
                          {studentsAssigned}/{totalStudentsCount} em
                        </span>
                      </div>

                      <div className="flex-1 w-full sm:max-w-[220px] flex items-center gap-2.5">
                        <div className="h-1.5 w-full bg-muted/70 overflow-hidden rounded-none">
                          <div
                            className="h-full bg-foreground/80 dark:bg-foreground/70"
                            style={{ width: `${studentsPct}%` }}
                          />
                        </div>
                        <span className="text-[11.5px] font-mono font-medium text-foreground w-8 text-right">
                          {studentsPct}%
                        </span>
                      </div>

                      <div className="text-left sm:text-right shrink-0">
                        <span className="text-[12px] text-muted-foreground">
                          {studentsUnassigned > 0 ? `${studentsUnassigned} chưa xếp lớp` : 'Đã phân lớp 100%'}
                        </span>
                      </div>
                    </div>

                    {/* Row 2: Giáo viên */}
                    <div className="py-2.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
                      <div className="flex items-center justify-between sm:justify-start gap-2 min-w-[90px]">
                        <span className="text-[13px] font-medium text-foreground">Giáo viên</span>
                        <span className="text-[11.5px] text-muted-foreground font-mono">
                          {teachersAssigned}/{totalTeachersCount} GV
                        </span>
                      </div>

                      <div className="flex-1 w-full sm:max-w-[220px] flex items-center gap-2.5">
                        <div className="h-1.5 w-full bg-muted/70 overflow-hidden rounded-none">
                          <div
                            className="h-full bg-foreground/80 dark:bg-foreground/70"
                            style={{ width: `${teachersPct}%` }}
                          />
                        </div>
                        <span className="text-[11.5px] font-mono font-medium text-foreground w-8 text-right">
                          {teachersPct}%
                        </span>
                      </div>

                      <div className="text-left sm:text-right shrink-0">
                        <span className="text-[12px] text-muted-foreground">
                          {totalTeachersCount === 0
                            ? 'Chưa có dữ liệu giáo viên'
                            : teachersUnassigned > 0
                            ? `${teachersUnassigned} GV chưa nhận lớp`
                            : 'Đã nhận lớp 100%'}
                        </span>
                      </div>
                    </div>

                    {/* Row 3: Lớp học */}
                    <div className="py-2.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
                      <div className="flex items-center justify-between sm:justify-start gap-2 min-w-[90px]">
                        <span className="text-[13px] font-medium text-foreground">Lớp học</span>
                        <span className="text-[11.5px] text-muted-foreground font-mono">
                          {classesWithTeacher}/{totalClassesCount} lớp
                        </span>
                      </div>

                      <div className="flex-1 w-full sm:max-w-[220px] flex items-center gap-2.5">
                        <div className="h-1.5 w-full bg-muted/70 overflow-hidden rounded-none">
                          <div
                            className="h-full bg-foreground/80 dark:bg-foreground/70"
                            style={{ width: `${classesPct}%` }}
                          />
                        </div>
                        <span className="text-[11.5px] font-mono font-medium text-foreground w-8 text-right">
                          {classesPct}%
                        </span>
                      </div>

                      <div className="text-left sm:text-right shrink-0">
                        <span className="text-[12px] text-muted-foreground">
                          {classesWithoutTeacher > 0 ? `${classesWithoutTeacher} lớp chưa có GV` : 'Đủ giáo viên'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Panel 2: Lịch & Sự kiện sắp tới */}
                <div className="border border-border bg-card p-4 sm:p-5 rounded-none flex flex-col justify-between gap-4 shadow-2xs">
                  <div className="flex items-center justify-between pb-1 border-b border-border/60">
                    <div>
                      <h3 className="text-[14.5px] font-semibold text-foreground tracking-tight">
                        Lịch & Sự kiện sắp tới
                      </h3>
                      <p className="text-[12px] text-muted-foreground mt-0.5">
                        Các mốc thời gian kế tiếp trong năm học
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('CALENDAR')}
                      title="Xem lịch năm học"
                      aria-label="Xem lịch năm học"
                      className="h-7 w-7 flex items-center justify-center border border-border/70 bg-muted/20 hover:bg-muted text-muted-foreground hover:text-foreground transition-all rounded-none shrink-0 group cursor-pointer"
                    >
                      <HugeiconsIcon
                        icon={ArrowUpRight01Icon}
                        size={14}
                        className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                      />
                    </button>
                  </div>

                  {/* Upcoming items from real school_holidays */}
                  <div className="flex flex-col divide-y divide-border/60">
                    {(() => {
                      const todayStr = new Date().toISOString().slice(0, 10);
                      const futureItems = upcomingHolidays.filter((h) => h.endDate >= todayStr);
                      const listToRender = futureItems.length > 0 ? futureItems.slice(0, 3) : upcomingHolidays.slice(0, 3);

                      if (listToRender.length === 0) {
                        return (
                          <div className="py-6 text-center text-[12.5px] text-muted-foreground">
                            Chưa có lịch nghỉ hoặc sự kiện nào.
                          </div>
                        );
                      }

                      return listToRender.map((item) => {
                        const isHoliday = !item.isTeachingAllowed;
                        const dayNumber = item.startDate.slice(8, 10);
                        const monthNumber = parseInt(item.startDate.slice(5, 7), 10);

                        return (
                          <div key={item.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 shrink-0 bg-muted/30 border border-border/80 flex flex-col items-center justify-center rounded-none select-none">
                                <span className="text-[13.5px] font-semibold font-mono text-foreground leading-none">
                                  {dayNumber}
                                </span>
                                <span className="text-[9.5px] font-medium text-muted-foreground leading-none mt-1">
                                  Th{monthNumber}
                                </span>
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="text-[13px] font-medium text-foreground truncate">
                                  {item.name}
                                </span>
                                <span className="text-[11.5px] text-muted-foreground truncate">
                                  {item.description || (isHoliday ? 'Nghỉ toàn trường' : 'Sự kiện toàn trường')}
                                </span>
                              </div>
                            </div>
                            <span className="shrink-0 text-[11.5px] text-muted-foreground font-normal">
                              {isHoliday ? 'Nghỉ học' : 'Sự kiện'}
                            </span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>

              {/* Row 2: Khung thời gian & Cơ cấu các khối đào tạo */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Khung thời gian */}
                <div className="border border-border bg-card p-4 sm:p-5 rounded-none shadow-2xs flex flex-col justify-between gap-3">
                  <div className="pb-1 border-b border-border/60">
                    <h3 className="text-[14px] font-semibold text-foreground tracking-tight">
                      Khung thời gian đào tạo
                    </h3>
                    <p className="text-[11.5px] text-muted-foreground mt-0.5">
                      Thời gian thực hiện chương trình 2 học kỳ chính thức
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-0.5">
                    <div className="border border-border/70 bg-muted/20 p-2.5 rounded-none flex flex-col gap-1">
                      <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider font-mono">
                        Học kỳ 1
                      </span>
                      <span className="font-mono text-[12.5px] font-semibold text-foreground">
                        {year.startDate} – {year.semester1EndDate || '15/01/2027'}
                      </span>
                      <span className="text-[11px] text-muted-foreground">19 tuần học</span>
                    </div>

                    <div className="border border-border/70 bg-muted/20 p-2.5 rounded-none flex flex-col gap-1">
                      <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider font-mono">
                        Học kỳ 2
                      </span>
                      <span className="font-mono text-[12.5px] font-semibold text-foreground">
                        {getDayAfterDisplayDate(year.semester1EndDate) || '16/01/2027'} – {year.endDate}
                      </span>
                      <span className="text-[11px] text-muted-foreground">16 tuần học</span>
                    </div>
                  </div>
                </div>

                {/* Các khối đào tạo */}
                <div className="border border-border bg-card p-4 sm:p-5 rounded-none shadow-2xs flex flex-col justify-between gap-3">
                  <div className="flex items-center justify-between pb-1 border-b border-border/60">
                    <div>
                      <h3 className="text-[14px] font-semibold text-foreground tracking-tight">
                        Cơ cấu các khối đào tạo
                      </h3>
                      <p className="text-[11.5px] text-muted-foreground mt-0.5">
                        Quy mô lớp học phân bổ theo 4 lứa tuổi mầm non
                      </p>
                    </div>
                    <span className="text-[11px] font-mono text-muted-foreground">
                      {totalClassesCount} lớp tổng
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-0.5">
                    {[
                      { name: 'Nhà trẻ', count: `${currentYear.ageGroupsBreakdown?.NHA_TRE ?? (currentYear.classes?.filter(c => c.ageGroup === 'NHA_TRE' || (c.name || '').toLowerCase().includes('nhà trẻ') || (c.name || '').toLowerCase().includes('nha tre')).length || 0)} lớp`, age: '18–36 th' },
                      { name: 'Mầm', count: `${currentYear.ageGroupsBreakdown?.MAM ?? (currentYear.classes?.filter(c => c.ageGroup === 'MAM' || (c.name || '').toLowerCase().includes('mầm') || (c.name || '').toLowerCase().includes('mam')).length || 0)} lớp`, age: '3–4 tuổi' },
                      { name: 'Chồi', count: `${currentYear.ageGroupsBreakdown?.CHOI ?? (currentYear.classes?.filter(c => c.ageGroup === 'CHOI' || (c.name || '').toLowerCase().includes('chồi') || (c.name || '').toLowerCase().includes('choi')).length || 0)} lớp`, age: '4–5 tuổi' },
                      { name: 'Lá', count: `${currentYear.ageGroupsBreakdown?.LA ?? (currentYear.classes?.filter(c => c.ageGroup === 'LA' || (c.name || '').toLowerCase().includes('lá') || (c.name || '').toLowerCase().includes('la')).length || 0)} lớp`, age: '5–6 tuổi' },
                    ].map((g) => (
                      <div
                        key={g.name}
                        className="border border-border/70 bg-muted/20 p-2 rounded-none flex flex-col gap-0.5 text-center sm:text-left"
                      >
                        <span className="text-[11.5px] font-medium text-foreground">{g.name}</span>
                        <span className="text-[13.5px] font-semibold font-mono text-foreground leading-tight">
                          {g.count}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{g.age}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Subtab 2: Thống kê trường & Sĩ số 9 tháng (Module School-wide Statistics theo BA) */}
          {activeTab === 'STATISTICS' && (
            <SchoolOverviewDashboard year={year} yearId={id} />
          )}

          {/* Subtab 2: Lịch năm học (Figma 5232:24798) */}
          {activeTab === 'CALENDAR' && (
            <AcademicCalendarView
              schoolYearId={year.id}
              schoolYearName={year.name}
              startDate={year.startDate}
              endDate={year.endDate}
              onCountersUpdate={setCalendarCounters}
              isReadOnly={isTransitionDisabled}
            />
          )}

          {/* Subtab 3: Chuyển giao năm học (Dedicated Tab View - No Popup) */}
          {activeTab === 'TRANSITION' && (
            <AcademicYearTransitionView
              currentYear={year}
              onSuccess={fetchAcademicYears}
            />
          )}
        </div>
      </div>

      {/* Edit School Year Drawer (FE-03C) */}
      <AcademicYearDrawer />
    </div>
  );
}

