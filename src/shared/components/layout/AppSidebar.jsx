import React, { useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArrowLeft01Icon,
  Settings01Icon,
  TeacherIcon,
  StudentIcon,
  Download01Icon,
  Calendar03Icon,
  Target02Icon,
  Certificate01Icon,
  TaskDone01Icon,
  MedicalFileIcon,
  CheckListIcon,
  SchoolIcon,
  PieChartIcon,
  Folder02Icon,
  ArrowDataTransferHorizontalIcon,
  Book02Icon,
  DashboardSquare01Icon,
} from '@hugeicons/core-free-icons';
import { AcademicYearSwitcher } from './AcademicYearSwitcher';
import { UserProfileMenu } from './UserProfileMenu';
import { useAuthStore } from '@/features/auth';
import {
  useClassesStore,
  ClassVisual,
  findTeacherClassesForYear,
  findTeacherClassForYear,
} from '@/features/classes';
import { useAcademicYearStore } from '@/features/academic-years';
import { cn } from '@/shared/utils';

export function AppSidebar({
  sidebarCollapsed,
  navGroups,
  onOpenSettings,
  onOpenNotifications,
  onOpenLogout,
  themeMode,
  onThemeChange,
}) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  const user = useAuthStore((state) => state.user);
  const isTeacher =
    user?.role === 'TEACHER_GV' ||
    user?.role === 'TEACHER' ||
    user?.role?.toLowerCase()?.includes('teacher');

  const classes = useClassesStore((state) => state.classes) || [];
  const attachedClassId = useClassesStore((state) => state.attachedClassId);
  const activeSettingsTab = useClassesStore((state) => state.activeSettingsTab);
  const setActiveSettingsTab = useClassesStore(
    (state) => state.setActiveSettingsTab,
  );

  const isClassSettings = location.pathname.includes('/settings');
  const isClassPlanning = location.pathname.includes('/planning');

  const isClassAssessment = location.pathname.includes('/assessment');
  const isCurriculumThemes =
    location.pathname.startsWith('/curriculum/themes') ||
    (location.pathname === '/curriculum' && new URLSearchParams(location.search).get('tab') !== 'goals');
  const isCurriculumGoals =
    location.pathname.startsWith('/curriculum/goals') ||
    (location.pathname === '/curriculum' && new URLSearchParams(location.search).get('tab') === 'goals');

  const selectedYearId = useAcademicYearStore((state) => state.selectedYearId);

  const teacherClass = useMemo(() => {
    if (!isTeacher) return null;
    return findTeacherClassForYear(user, classes, selectedYearId);
  }, [isTeacher, classes, user, selectedYearId]);

  const classIdFromQuery = new URLSearchParams(location.search).get('classId');
  const classIdMatch = location.pathname.match(/\/classes\/([^/]+)/);
  const specificClassId =
    (classIdMatch && classIdMatch[1] !== 'new' ? classIdMatch[1] : null) || classIdFromQuery;
  const isSpecificClass = Boolean(specificClassId);
  const matchedClass = isSpecificClass
    ? classes.find((c) => c.id === specificClassId || c.publicId === specificClassId)
    : null;
  const currentClass =
    matchedClass ||
    (isTeacher ? teacherClass : null) ||
    (isSpecificClass
      ? {
          id: specificClassId,
          name: t('classes.class', 'Lớp học'),
        }
      : null);

  const classRoomDisplay = useMemo(() => {
    if (!currentClass) return '';
    const rawRoom = currentClass.room || currentClass.roomNumber || currentClass.room_number || '';
    if (!rawRoom) return '';
    return rawRoom.toLowerCase().startsWith('phòng')
      ? rawRoom
      : `Phòng ${rawRoom}`;
  }, [currentClass]);

  const classSubtitle = useMemo(() => {
    if (!currentClass) return '';
    const parts = [];
    if (classRoomDisplay) {
      parts.push(classRoomDisplay);
    }
    const count =
      currentClass.studentCount !== undefined
        ? currentClass.studentCount
        : currentClass.studentsCount !== undefined
        ? currentClass.studentsCount
        : currentClass.students?.length ?? 0;
    parts.push(`${count} ${t('classes.studentsUnit', 'học sinh')}`);
    return parts.join(' · ');
  }, [currentClass, classRoomDisplay, t]);

  const currentTab = new URLSearchParams(location.search).get('tab') || 'general';

  const handleSubNavClick = (subKey) => {
    setActiveSettingsTab(subKey);
    const targetId = currentClass?.id || specificClassId;
    if (targetId) {
      navigate(`/classes/${targetId}/settings?tab=${subKey}`);
    }
  };

  const handleAssessmentSubNavClick = (subKey) => {
    const targetId = currentClass?.id || specificClassId;
    if (targetId) {
      navigate(`/classes/${targetId}/assessment?tab=${subKey}`);
    }
  };

  const settingsSubNav = [
    { key: 'general', label: t('classes.settingsGeneral', 'Cấu hình lớp'), icon: Settings01Icon },
    { key: 'teachers', label: t('classes.settingsTeachers', 'Phân công giáo viên'), icon: TeacherIcon },
    { key: 'students', label: t('classes.settingsStudents', 'Phân lớp học sinh'), icon: StudentIcon },
    { key: 'export', label: t('classes.settingsExport', 'Xuất danh sách'), icon: Download01Icon },
  ];

  const planningSubNav = [
    { key: 'allocation', label: t('planning.tabAllocation', 'Phân bổ mục tiêu'), icon: Target02Icon },
    { key: 'activities', label: t('planning.tabActivities', 'Xác định hoạt động'), icon: TaskDone01Icon },
    { key: 'timetable', label: t('planning.tabTimetable', 'Kế hoạch tuần'), icon: Calendar03Icon },
  ];

  const assessmentSubNav = [
    { key: 'monthly', label: t('assessment.tabMonthly', 'Sổ bé ngoan'), icon: Certificate01Icon },
    { key: 'semester', label: t('assessment.tabSemester', 'Đánh giá học kỳ'), icon: Target02Icon },
  ];


  return (
    <aside
      className={cn(
        'h-full bg-[#fafafa] dark:bg-card border-r border-border flex flex-col justify-between transition-[width] duration-200 z-30 shrink-0',
        sidebarCollapsed ? 'w-16' : 'w-[255px]',
      )}
    >
      {/* Top Section: Brand Header & School Year Selector & Section 1 */}
      <div className="flex flex-col shrink-0 p-2 gap-2.5 pb-2">
        {/* Brand Logo Header */}
        <Link
          to="/"
          title={sidebarCollapsed ? `${t('brand.name')} – ${t('brand.subtitle')}` : undefined}
          className={cn(
            'flex items-center gap-2.5 p-2 hover:bg-muted/40 transition-colors w-full rounded-none group',
            sidebarCollapsed ? 'justify-center p-0' : '',
          )}
        >
          <div className="flex items-center justify-center size-8 shrink-0">
            <img
              src="/logo.svg"
              alt="Sorak Logo"
              className="w-[23px] h-[26px] block"
            />
          </div>
          {!sidebarCollapsed && (
            <div className="flex flex-col min-w-0 leading-tight">
              <span className="font-bold text-[14.5px] text-foreground tracking-tight leading-snug">
                {t('brand.name')}
              </span>
              <span
                className="text-[11.5px] text-muted-foreground font-medium truncate leading-none mt-0.5"
                title={t('brand.subtitle')}
              >
                {t('brand.subtitle')}
              </span>
            </div>
          )}
        </Link>

        {/* Academic Year Switcher */}
        <AcademicYearSwitcher sidebarCollapsed={sidebarCollapsed} />

        {/* Separator only shown when on top-level school-year view (no back button) */}
        {!currentClass && <div className="h-px bg-border mx-2" />}

        {/* Section 1: In School Year (Figma 4617:7800 FE-05A) OR Settings (Figma 4617:9292 FE-05B) OR Planning */}
        {isClassSettings && currentClass ? (
          <div className="px-2 pb-1 space-y-1" data-name="Class Settings Navigation">
            {/* Back link to class */}
            <Link
              to={`/classes/${currentClass.id}`}
              className={cn(
                'flex items-center gap-2 px-2 h-8 rounded-none text-[13px] font-normal text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors',
                sidebarCollapsed ? 'justify-center px-0' : '',
              )}
              title={sidebarCollapsed ? t('classes.classProfile', 'Quản lý lớp') : undefined}
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} size={15} className="shrink-0" />
              {!sidebarCollapsed && <span>{t('classes.classProfile', 'Quản lý lớp')}</span>}
            </Link>

            <div className="h-px bg-border/60 mx-1 my-1" />

            {/* Sub-navigation items */}
            {settingsSubNav.map((sub) => {
              const isSubActive = currentTab === sub.key;
              return (
                <button
                  key={sub.key}
                  type="button"
                  onClick={() => handleSubNavClick(sub.key)}
                  title={sidebarCollapsed ? sub.label : undefined}
                  className={cn(
                    'w-full flex items-center gap-2 px-2 h-8 rounded-none text-[14px] font-normal transition-colors text-left cursor-pointer',
                    sidebarCollapsed ? 'justify-center px-0' : '',
                    isSubActive
                      ? 'bg-[#f5f5f5] dark:bg-muted text-foreground font-medium'
                      : 'text-foreground/80 hover:text-foreground hover:bg-muted/50',
                  )}
                >
                  <HugeiconsIcon icon={sub.icon} size={16} className="shrink-0" />
                  {!sidebarCollapsed && <span className="truncate">{sub.label}</span>}
                </button>
              );
            })}
          </div>
        ) : isClassPlanning && currentClass ? (
          <div className="px-2 pb-1 space-y-1" data-name="Class Planning Navigation">
            {/* Back link to class */}
            <Link
              to={`/classes/${currentClass.id}`}
              className={cn(
                'flex items-center gap-2 px-2 h-8 rounded-none text-[13px] font-normal text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors',
                sidebarCollapsed ? 'justify-center px-0' : '',
              )}
              title={sidebarCollapsed ? t('planning.backToClass', 'Quay lại') : undefined}
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} size={15} className="shrink-0" />
              {!sidebarCollapsed && <span>{t('planning.title', 'Kế hoạch giáo dục')}</span>}
            </Link>

            <div className="h-px bg-border/60 mx-1 my-1" />

            {/* Sub-navigation items */}
            {planningSubNav.map((sub) => {
              const activeTabKey = (currentTab === 'general' || !currentTab) ? 'allocation' : currentTab;
              const isSubActive = activeTabKey === sub.key;
              return (
                <button
                  key={sub.key}
                  type="button"
                  onClick={() => {
                    navigate(`/classes/${currentClass.id}/planning?tab=${sub.key}`);
                  }}
                  title={sidebarCollapsed ? sub.label : undefined}
                  className={cn(
                    'w-full flex items-center gap-2 px-2 h-8 rounded-none text-[14px] font-normal transition-colors text-left cursor-pointer',
                    sidebarCollapsed ? 'justify-center px-0' : '',
                    isSubActive
                      ? 'bg-[#f5f5f5] dark:bg-muted text-foreground font-medium'
                      : 'text-foreground/80 hover:text-foreground hover:bg-muted/50',
                  )}
                >
                  <HugeiconsIcon icon={sub.icon} size={16} className="shrink-0" />
                  {!sidebarCollapsed && <span className="truncate">{sub.label}</span>}
                </button>
              );
            })}
          </div>

        ) : isClassAssessment && currentClass ? (
          <div className="px-2 pb-1 space-y-1" data-name="Class Assessment Navigation">
            {/* Back link to class */}
            <Link
              to={`/classes/${currentClass.id}`}
              className={cn(
                'flex items-center gap-2 px-2 h-8 rounded-none text-[13px] font-normal text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors',
                sidebarCollapsed ? 'justify-center px-0' : '',
              )}
              title={sidebarCollapsed ? t('nav.assessment', 'Đánh giá giai đoạn') : undefined}
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} size={15} className="shrink-0" />
              {!sidebarCollapsed && <span>{t('nav.assessment', 'Đánh giá giai đoạn')}</span>}
            </Link>

            <div className="h-px bg-border/60 mx-1 my-1" />

            {/* Sub-navigation items */}
            {assessmentSubNav.map((sub) => {
              const activeTabKey = new URLSearchParams(location.search).get('tab') || 'monthly';
              const isSubActive = activeTabKey === sub.key;
              return (
                <button
                  key={sub.key}
                  type="button"
                  onClick={() => handleAssessmentSubNavClick(sub.key)}
                  title={sidebarCollapsed ? sub.label : undefined}
                  className={cn(
                    'w-full flex items-center gap-2 px-2 h-8 rounded-none text-[14px] font-normal transition-colors text-left cursor-pointer',
                    sidebarCollapsed ? 'justify-center px-0' : '',
                    isSubActive
                      ? 'bg-[#f5f5f5] dark:bg-muted text-foreground font-medium'
                      : 'text-foreground/80 hover:text-foreground hover:bg-muted/50',
                  )}
                >
                  <HugeiconsIcon icon={sub.icon} size={16} className="shrink-0" />
                  {!sidebarCollapsed && <span className="truncate">{sub.label}</span>}
                </button>
              );
            })}
          </div>
        ) : (
          /* In School Year Navigation */
          <div className="px-2 pb-1 space-y-1" data-name="InSchoolYear Navigation Figma FE-05A">
            {/* If NOT viewing a specific class -> Show "Trong năm học" title, "Lớp học", "Chuyển lớp", "Chủ đề", "Ngân hàng mục tiêu" (CHỈ BGH) */}
            {!currentClass ? (
              !isTeacher ? (
                <>
                  {!sidebarCollapsed && (
                    <p className="px-2 h-8 flex items-center text-[12px] font-medium text-foreground/70">
                      {t('nav.inSchoolYear', 'Trong năm học')}
                    </p>
                  )}

                  <Link
                    to="/classes"
                    title={sidebarCollapsed ? t('nav.classes', 'Lớp học') : undefined}
                    className={cn(
                      'flex items-center gap-2 px-2 h-8 rounded-none text-[14px] font-normal transition-colors',
                      sidebarCollapsed ? 'justify-center px-0' : '',
                      location.pathname === '/classes'
                        ? 'bg-[#f5f5f5] dark:bg-muted text-foreground font-medium'
                        : 'text-foreground/80 hover:text-foreground hover:bg-muted/50',
                    )}
                  >
                    <HugeiconsIcon icon={SchoolIcon} size={16} className="shrink-0" />
                    {!sidebarCollapsed && <span>{t('nav.classes', 'Lớp học')}</span>}
                  </Link>

                  <Link
                    to="/transfers"
                    title={sidebarCollapsed ? t('nav.transfers', 'Chuyển lớp') : undefined}
                    className={cn(
                      'flex items-center gap-2 px-2 h-8 rounded-none text-[14px] font-normal transition-colors',
                      sidebarCollapsed ? 'justify-center px-0' : '',
                      location.pathname.startsWith('/transfers')
                        ? 'bg-[#f5f5f5] dark:bg-muted text-foreground font-medium'
                        : 'text-foreground/80 hover:text-foreground hover:bg-muted/50',
                    )}
                  >
                    <HugeiconsIcon
                      icon={ArrowDataTransferHorizontalIcon}
                      size={16}
                      className="shrink-0"
                    />
                    {!sidebarCollapsed && <span>{t('nav.transfers', 'Chuyển lớp')}</span>}
                  </Link>

                  {/* 3. Bộ chủ đề */}
                  <Link
                    to="/curriculum?tab=themes"
                    title={sidebarCollapsed ? t('curriculum.tabThemes', 'Bộ chủ đề') : undefined}
                    className={cn(
                      'flex items-center gap-2 px-2 h-8 rounded-none text-[14px] font-normal transition-colors',
                      sidebarCollapsed ? 'justify-center px-0' : '',
                      isCurriculumThemes
                        ? 'bg-[#f5f5f5] dark:bg-muted text-foreground font-medium'
                        : 'text-foreground/80 hover:text-foreground hover:bg-muted/50',
                    )}
                  >
                    <HugeiconsIcon icon={Book02Icon} size={16} className="shrink-0" />
                    {!sidebarCollapsed && <span>{t('curriculum.tabThemes', 'Bộ chủ đề')}</span>}
                  </Link>

                  {/* 4. Ngân hàng mục tiêu */}
                  <Link
                    to="/curriculum?tab=goals"
                    title={sidebarCollapsed ? t('curriculum.tabGoals', 'Ngân hàng mục tiêu') : undefined}
                    className={cn(
                      'flex items-center gap-2 px-2 h-8 rounded-none text-[14px] font-normal transition-colors',
                      sidebarCollapsed ? 'justify-center px-0' : '',
                      isCurriculumGoals
                        ? 'bg-[#f5f5f5] dark:bg-muted text-foreground font-medium'
                        : 'text-foreground/80 hover:text-foreground hover:bg-muted/50',
                    )}
                  >
                    <HugeiconsIcon icon={Target02Icon} size={16} className="shrink-0" />
                    {!sidebarCollapsed && <span>{t('curriculum.tabGoals', 'Ngân hàng mục tiêu')}</span>}
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to="/classes"
                    title={sidebarCollapsed ? t('classes.myClass', 'Lớp học của tôi') : undefined}
                    className={cn(
                      'flex items-center gap-2 px-2 h-8 rounded-none text-[14px] font-normal transition-colors',
                      sidebarCollapsed ? 'justify-center px-0' : '',
                      location.pathname === '/classes'
                        ? 'bg-[#f5f5f5] dark:bg-muted text-foreground font-medium'
                        : 'text-foreground/80 hover:text-foreground hover:bg-muted/50',
                    )}
                  >
                    <HugeiconsIcon icon={SchoolIcon} size={16} className="shrink-0" />
                    {!sidebarCollapsed && <span>{t('classes.myClass', 'Lớp học của tôi')}</span>}
                  </Link>
                </>
              )
            ) : (
              /* When in a specific class -> Reveal class header, reports, daily, students, assessment, planning, settings */
              <>
                {/* Class Header / Navigation */}
                {isTeacher ? (
                  <div
                    className={cn(
                      'flex items-center gap-2 px-2 h-9 rounded-none select-none',
                      sidebarCollapsed ? 'justify-center px-0' : '',
                    )}
                    title={currentClass.name}
                  >
                    <ClassVisual
                      color={currentClass.color}
                      grade={currentClass.grade || currentClass.ageGroup}
                      src={currentClass.avatarUrl}
                      size={25}
                      className="rounded-none shrink-0"
                    />
                    {!sidebarCollapsed && (
                      <div className="flex flex-col min-w-0 leading-tight">
                        <span className="truncate text-[14px] font-semibold text-foreground tracking-tight">
                          {currentClass.name}
                        </span>
                        <span
                          className="text-[11px] text-muted-foreground truncate"
                          title={classSubtitle || currentClass.academicYear || 'Lớp của tôi'}
                        >
                          {classSubtitle || currentClass.academicYear || 'Lớp của tôi'}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Back link to classes with current class name (Principal / Admin) */
                  <Link
                    to="/classes"
                    className={cn(
                      'flex items-center gap-2 px-2 h-9 rounded-none text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors',
                      sidebarCollapsed ? 'justify-center px-0' : '',
                    )}
                    title={sidebarCollapsed ? `${t('nav.classes', 'Lớp học')}: ${currentClass.name}` : undefined}
                  >
                    <HugeiconsIcon icon={ArrowLeft01Icon} size={16} className="shrink-0 text-muted-foreground/80 hover:text-foreground" />
                    {!sidebarCollapsed && (
                      <div className="flex items-center gap-1 min-w-0">
                        <ClassVisual
                          color={currentClass.color}
                          grade={currentClass.grade || currentClass.ageGroup}
                          src={currentClass.avatarUrl}
                          size={25}
                          className="rounded-none shrink-0"
                        />
                        <span className="truncate text-[14px] text-foreground tracking-tight">
                          {currentClass.name}
                        </span>
                      </div>
                    )}
                  </Link>
                )}

                <div className="h-px bg-border/60 mx-1 my-1" />

                {/* 1. Báo cáo (Xem hồ sơ, báo cáo phát triển, chuyên cần, chuyển lớp của học sinh) */}
                <Link
                  to={`/classes/${currentClass.id}/students`}
                  title={sidebarCollapsed ? t('classes.reports', 'Báo cáo') : undefined}
                  className={cn(
                    'flex items-center gap-2 px-2 h-8 rounded-none text-[14px] font-normal transition-colors',
                    sidebarCollapsed ? 'justify-center px-0' : '',
                    location.pathname.includes('/students') || location.pathname.includes('/reports')
                      ? 'bg-[#f5f5f5] dark:bg-muted text-foreground font-medium'
                      : 'text-foreground/80 hover:text-foreground hover:bg-muted/50',
                  )}
                >
                  <HugeiconsIcon icon={DashboardSquare01Icon} size={16} className="shrink-0" />
                  {!sidebarCollapsed && <span>{t('classes.reports', 'Báo cáo')}</span>}
                </Link>

                {/* 3. Nhật ký ngày */}
                <Link
                  to={`/classes/${currentClass.id}`}
                  title={sidebarCollapsed ? t('nav.dailyRoutine', 'Nhật ký ngày') : undefined}
                  className={cn(
                    'flex items-center gap-2 px-2 h-8 rounded-none text-[14px] font-normal transition-colors',
                    sidebarCollapsed ? 'justify-center px-0' : '',
                    location.pathname === `/classes/${currentClass.id}` ||
                      location.pathname.startsWith(`/classes/${currentClass.id}/daily`)
                      ? 'bg-[#f5f5f5] dark:bg-muted text-foreground font-medium'
                      : 'text-foreground/80 hover:text-foreground hover:bg-muted/50',
                  )}
                >
                  <HugeiconsIcon icon={Calendar03Icon} size={16} className="shrink-0" />
                  {!sidebarCollapsed && <span>{t('nav.dailyRoutine', 'Nhật ký ngày')}</span>}
                </Link>

                {/* 4. Đánh giá giai đoạn (Sổ bé ngoan & Đánh giá học kỳ) */}
                <Link
                  to={`/classes/${currentClass.id}/assessment`}
                  title={sidebarCollapsed ? t('nav.assessment', 'Đánh giá giai đoạn') : undefined}
                  className={cn(
                    'flex items-center gap-2 px-2 h-8 rounded-none text-[14px] font-normal transition-colors',
                    sidebarCollapsed ? 'justify-center px-0' : '',
                    location.pathname.includes('/assessment')
                      ? 'bg-[#f5f5f5] dark:bg-muted text-foreground font-medium'
                      : 'text-foreground/80 hover:text-foreground hover:bg-muted/50',
                  )}
                >
                  <HugeiconsIcon icon={CheckListIcon} size={16} className="shrink-0" />
                  {!sidebarCollapsed && <span>{t('nav.assessment', 'Đánh giá giai đoạn')}</span>}
                </Link>

                {/* 5. Kế hoạch giáo dục */}
                <Link
                  to={`/classes/${currentClass.id}/planning?tab=allocation`}
                  title={sidebarCollapsed ? t('planning.title', 'Kế hoạch giáo dục') : undefined}
                  className={cn(
                    'flex items-center gap-2 px-2 h-8 rounded-none text-[14px] font-normal transition-colors',
                    sidebarCollapsed ? 'justify-center px-0' : '',
                    location.pathname.includes('/planning')
                      ? 'bg-[#f5f5f5] dark:bg-muted text-foreground font-medium'
                      : 'text-foreground/80 hover:text-foreground hover:bg-muted/50',
                  )}
                >
                  <HugeiconsIcon icon={Target02Icon} size={16} className="shrink-0" />
                  {!sidebarCollapsed && <span>{t('planning.title', 'Kế hoạch giáo dục')}</span>}
                </Link>

                {/* 6. Xuất danh sách (Dành cho Giáo viên) */}
                {isTeacher && (
                  <Link
                    to={`/classes/${currentClass.id}/export`}
                    title={sidebarCollapsed ? t('classes.settingsExport', 'Xuất danh sách') : undefined}
                    className={cn(
                      'flex items-center gap-2 px-2 h-8 rounded-none text-[14px] font-normal transition-colors',
                      sidebarCollapsed ? 'justify-center px-0' : '',
                      location.pathname.includes('/export')
                        ? 'bg-[#f5f5f5] dark:bg-muted text-foreground font-medium'
                        : 'text-foreground/80 hover:text-foreground hover:bg-muted/50',
                    )}
                  >
                    <HugeiconsIcon icon={Download01Icon} size={16} className="shrink-0" />
                    {!sidebarCollapsed && <span>{t('classes.settingsExport', 'Xuất danh sách')}</span>}
                  </Link>
                )}

                {/* 7. Cấu hình & Quản lý lớp (Chỉ dành cho BGH, ẩn đối với Giáo viên) */}
                {!isTeacher && (
                  <Link
                    to={`/classes/${currentClass.id}/settings`}
                    title={sidebarCollapsed ? t('classes.classProfile', 'Quản lý lớp') : undefined}
                    className={cn(
                      'flex items-center gap-2 px-2 h-8 rounded-none text-[14px] font-normal transition-colors',
                      sidebarCollapsed ? 'justify-center px-0' : '',
                      location.pathname.includes('/settings')
                        ? 'bg-[#f5f5f5] dark:bg-muted text-foreground font-medium'
                        : 'text-foreground/80 hover:text-foreground hover:bg-muted/50',
                    )}
                  >
                    <HugeiconsIcon icon={Settings01Icon} size={16} className="shrink-0" />
                    {!sidebarCollapsed && <span>{t('classes.classProfile', 'Quản lý lớp')}</span>}
                  </Link>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Middle Flexible Space: Sorak Mascot sitting right on the Quản trị separator (dành cho Ban Giám Hiệu / Principal) */}
      <div className="flex-1 flex flex-col justify-end min-h-12 relative overflow-visible z-10">
        {!isTeacher && !sidebarCollapsed && (
          <div className="px-0 pb-0 flex relative">
            <img
              src="/mascot.webp"
              alt="Sorak Mascot"
              className="w-[215px] h-auto object-contain pointer-events-none select-none drop-shadow-sm -mb-[26px] -ml-4 relative z-10 block dark:hidden"
              data-name="Sorak Mascot Light"
            />
            <img
              src="/mascot-dark.webp"
              alt="Sorak Mascot"
              className="w-[215px] h-auto object-contain pointer-events-none select-none drop-shadow-sm -mb-[26px] -ml-4 relative z-10 hidden dark:block"
              data-name="Sorak Mascot Dark"
            />
          </div>
        )}
      </div>

      {/* Bottom Section: Quản trị, Hỗ trợ, and User Profile */}
      <div className="flex flex-col shrink-0 relative z-0">
        {/* Section 2: Quản trị (Chỉ dành cho Ban Giám Hiệu, Giáo viên không thấy) */}
        {!isTeacher && (
          <>
            <div className="h-px bg-border mx-2 relative z-0" />
            <div className="px-2 pt-1 pb-1 space-y-1">
              {!sidebarCollapsed && navGroups[1] && (
                <p className="px-2 h-8 flex items-center text-[12px] font-medium text-foreground/70">
                  {navGroups[1].title}
                </p>
              )}
              {navGroups[1]?.items.map((item) => {
                const isClassContext = Boolean(specificClassId);
                const isActive = item.path === '/students'
                  ? (location.pathname.startsWith('/students') && !isClassContext)
                  : location.pathname.startsWith(item.path);

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    title={sidebarCollapsed ? item.title : undefined}
                    className={cn(
                      'flex items-center gap-2 px-2 h-8 rounded-none text-[14px] font-normal transition-colors',
                      sidebarCollapsed ? 'justify-center px-0' : '',
                      isActive
                        ? 'bg-[#f5f5f5] dark:bg-muted text-foreground'
                        : 'text-foreground/80 hover:text-foreground hover:bg-muted/50',
                    )}
                  >
                    <HugeiconsIcon icon={item.icon} size={16} className="shrink-0" />
                    {!sidebarCollapsed && <span>{item.title}</span>}
                  </Link>
                );
              })}
            </div>
          </>
        )}

        <div className="h-px bg-border mx-2" />

        {/* User Profile Menu */}
        <UserProfileMenu
          sidebarCollapsed={sidebarCollapsed}
          teacherClass={teacherClass}
          onOpenSettings={onOpenSettings}
          onOpenNotifications={onOpenNotifications}
          onOpenLogout={onOpenLogout}
          themeMode={themeMode}
          onThemeChange={onThemeChange}
        />
      </div>
    </aside>
  );
}
