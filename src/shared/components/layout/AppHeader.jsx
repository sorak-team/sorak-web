import React, { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  SidebarLeftIcon,
  ArrowRight01Icon,
} from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { useAcademicYearStore } from '@/features/academic-years';
import { useTeacherStore } from '@/features/teachers';
import { useStudentStore } from '@/features/students';
import { useAccountStore } from '@/features/accounts';
import { useCurriculumStore, ThemeCommandMenu } from '@/features/curriculum';
import { ClassCommandMenu, useClassesStore, findTeacherClassForYear } from '@/features/classes';
import { useAuthStore } from '@/features/auth';
import { PageMoreMenu } from './PageMoreMenu';

const DEFAULT_THEME_NAMES = {
  'th-1': 'Bản thân',
  '01': 'Bản thân',
  '1': 'Bản thân',
  'th-2': 'Gia đình',
  '02': 'Gia đình',
  '2': 'Gia đình',
  'th-3': 'Trường mầm non',
  '03': 'Trường mầm non',
  '3': 'Trường mầm non',
  'th-4': 'Nghề nghiệp',
  '04': 'Nghề nghiệp',
  '4': 'Nghề nghiệp',
  'th-5': 'Thế giới thực vật',
  '05': 'Thế giới thực vật',
  '5': 'Thế giới thực vật',
  'th-6': 'Thế giới động vật',
  '06': 'Thế giới động vật',
  '6': 'Thế giới động vật',
  'th-7': 'Giao thông',
  '07': 'Giao thông',
  '7': 'Giao thông',
  'th-8': 'Nước & hiện tượng tự nhiên',
  '08': 'Nước & hiện tượng tự nhiên',
  '8': 'Nước & hiện tượng tự nhiên',
  'th-9': 'Quê hương đất nước',
  '09': 'Quê hương đất nước',
  '9': 'Quê hương đất nước',
};

const formatGoalCode = (code) => {
  if (!code) return '';
  const raw = String(code).trim().toUpperCase();
  const digitsMatch = raw.match(/\d+/);
  if (digitsMatch) {
    const num = parseInt(digitsMatch[0], 10);
    if (!isNaN(num)) {
      return `MT ${num < 10 ? '0' + num : num}`;
    }
  }
  return raw;
};

const PLANNING_GOALS_LOOKUP = {
  'g1-1': 'MT 01',
  'g1-2': 'MT 02',
  'g1-3': 'MT 03',
  'g1-4': 'MT 04',
  'g1-5': 'MT 05',
  'g1-6': 'MT 06',
  'g1-7': 'MT 07',
  'g2-1': 'MT 08',
  'g2-2': 'MT 09',
  'g2-3': 'MT 10',
  'g2-4': 'MT 11',
  'g3-1': 'MT 12',
  'g3-2': 'MT 13',
  'g4-1': 'MT 14',
  'g4-2': 'MT 15',
  'g5-1': 'MT 16',
  'g5-2': 'MT 17',
  'g-nhatre-1': 'MT 01',
  'g-nhatre-2': 'MT 02',
  'g-nhatre-3': 'MT 03',
};

export function AppHeader({ sidebarCollapsed, onToggleSidebar, currentTitle }) {
  const { t } = useTranslation();
  const location = useLocation();

  const academicYears = useAcademicYearStore((state) => state.academicYears);
  const selectedYearId = useAcademicYearStore((state) => state.selectedYearId);

  const teachers = useTeacherStore((state) => state.teachers);
  const students = useStudentStore((state) => state.students);

  const staffAccounts = useAccountStore((state) => state.staffAccounts);
  const parentAccounts = useAccountStore((state) => state.parentAccounts);

  const selectedYear = useMemo(
    () =>
      academicYears.find(
        (y) =>
          String(y.id) === String(selectedYearId) ||
          (String(selectedYearId) === '2026-2027' && (String(y.id) === '1' || y.name?.includes('2026'))),
      ) ||
      academicYears.find((y) => y.active) ||
      academicYears[0] ||
      {},
    [academicYears, selectedYearId],
  );

  const user = useAuthStore((state) => state.user);
  const isTeacher =
    user?.role === 'TEACHER_GV' ||
    user?.role === 'TEACHER' ||
    user?.role?.toLowerCase()?.includes('teacher');

  const getYearName = (y) => {
    if (!y) return '';
    const raw = y.name || (y.range ? `${t('schoolYear.title')} ${y.range}` : '');
    return raw.replace(/^Năm học/i, t('schoolYear.title', 'Năm học'));
  };

  const renderYearBreadcrumb = () => {
    if (isTeacher) {
      return (
        <span className="text-muted-foreground font-normal">
          {getYearName(selectedYear)}
        </span>
      );
    }
    return (
      <Link
        to="/school-years"
        className="text-muted-foreground hover:text-foreground font-normal transition-colors"
      >
        {getYearName(selectedYear)}
      </Link>
    );
  };

  const renderClassesBreadcrumb = () => {
    if (isTeacher) return null;
    return (
      <>
        <Link
          to="/classes"
          className="text-muted-foreground hover:text-foreground font-normal transition-colors"
        >
          {t('nav.classes', 'Lớp học')}
        </Link>
        <HugeiconsIcon
          icon={ArrowRight01Icon}
          size={14}
          className="text-muted-foreground/70"
        />
      </>
    );
  };

  const isTeacherDetail = location.pathname.startsWith('/teachers/');
  const currentTeacherId = isTeacherDetail ? location.pathname.replace('/teachers/', '') : null;
  const currentTeacher = isTeacherDetail ? teachers.find((item) => item.id === currentTeacherId) : null;

  const isStudents = location.pathname === '/students';
  const classStudentDetailMatch = location.pathname.match(/\/classes\/([^/]+)\/(?:students|reports)\/([^/]+)/);
  const isStudentDetail = location.pathname.startsWith('/students/') || Boolean(classStudentDetailMatch);
  const currentStudentId = classStudentDetailMatch
    ? classStudentDetailMatch[2]
    : (location.pathname.startsWith('/students/') ? location.pathname.replace('/students/', '') : null);
  const currentStudent = isStudentDetail
    ? students.find((item) => item.id === currentStudentId || item.studentCode === currentStudentId)
    : null;

  const isAccounts = location.pathname === '/accounts';
  const isAccountDetail = location.pathname.startsWith('/accounts/');
  const currentAccountId = isAccountDetail ? location.pathname.replace('/accounts/', '') : null;
  const currentAccount = isAccountDetail
    ? staffAccounts.find((item) => item.id === currentAccountId) ||
    parentAccounts.find((item) => item.id === currentAccountId)
    : null;

  const classIdMatch = location.pathname.match(/\/classes\/([^/]+)/);
  const currentClassId = classIdMatch ? classIdMatch[1] : null;

  const classes = useClassesStore((state) => state.classes) || [];
  const currentClass = classes.find(
    (c) => c.id === currentClassId || c.publicId === currentClassId,
  );

  const teacherClass = useMemo(() => {
    if (!isTeacher) return null;
    return findTeacherClassForYear(user, classes, selectedYearId);
  }, [isTeacher, classes, user, selectedYearId]);

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const currentTab = searchParams.get('tab');
  const goalIdParam = searchParams.get('goalId');
  const goalCodeParam = searchParams.get('goalCode');
  const goalTitleParam = searchParams.get('goalTitle');

  const planningGoalDisplayName = useMemo(() => {
    if (!goalIdParam) return '';
    const raw = goalCodeParam || PLANNING_GOALS_LOOKUP[goalIdParam] || 'MT 01';
    return formatGoalCode(raw);
  }, [goalIdParam, goalCodeParam]);

  const isCurriculumThemes = location.pathname.includes('/curriculum/themes/');
  const isCurriculumGoals = location.pathname.includes('/curriculum/goals/');

  const activeCurriculumThemeName = useCurriculumStore((state) => state.activeThemeName);
  const activeCurriculumGoal = useCurriculumStore((state) => state.activeGoal);

  const getCurriculumGradeLabel = (target) => {
    if (!target) return '';
    const str = String(target).toLowerCase();
    if (/(^|\/)nhatre(\/|$)/.test(str)) return t('curriculum.gradeNhaTre', 'Nhà Trẻ');
    if (/(^|\/)mam(\/|$)/.test(str)) return t('curriculum.gradeMam', 'Mầm');
    if (/(^|\/)choi(\/|$)/.test(str)) return t('curriculum.gradeChoi', 'Chồi');
    if (/(^|\/)la(\/|$)/.test(str)) return t('curriculum.gradeLa', 'Lá');
    return t('common.details', 'Chi tiết');
  };

  const getCurriculumYearLabel = (path) => {
    const m = path.match(/\/curriculum\/(?:themes|goals)\/([^/]+)/);
    if (m && m[1]) {
      const yearStr = m[1].replace('-', '–');
      const found = academicYears.find(
        (y) => y.id === m[1] || y.code === m[1] || y.name?.includes(yearStr),
      );
      return found?.name || `${t('schoolYear.title', 'Năm học')} ${yearStr}`;
    }
    return getYearName(selectedYear);
  };

  return (
    <header
      className="h-14 border-b border-border bg-background flex items-center px-4 gap-2.5 z-20 shrink-0 text-foreground"
      data-node-id="4053:1126"
    >
      {/* Sidebar toggle button (size 32x32) */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onToggleSidebar}
        className="size-8 rounded-none text-foreground/80 hover:text-foreground hover:bg-muted"
        title={sidebarCollapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
        data-node-id="4053:1127"
      >
        <HugeiconsIcon icon={SidebarLeftIcon} size={16} />
      </Button>

      {/* Header Separator */}
      <div className="h-4 w-px bg-border mx-1" />

      {/* Breadcrumb matching Figma */}
      <div
        className="flex items-center gap-1.5 text-sm"
        data-node-id="4053:1130"
      >
        {location.pathname === '/classes' ? (
          <>
            {renderYearBreadcrumb()}
            <HugeiconsIcon
              icon={ArrowRight01Icon}
              size={14}
              className="text-muted-foreground/70"
            />
            <span className="text-foreground font-normal">
              {isTeacher ? t('classes.myClass', 'Lớp của tôi') : t('nav.classes', 'Lớp học')}
            </span>
          </>
        ) : location.pathname.startsWith('/classes/') ? (
          <>
            {renderYearBreadcrumb()}
            <HugeiconsIcon
              icon={ArrowRight01Icon}
              size={14}
              className="text-muted-foreground/70"
            />
            {renderClassesBreadcrumb()}
            {isTeacher ? (
              <Link
                to={`/classes/${teacherClass?.id || teacherClass?.publicId || currentClass?.id || currentClassId}`}
                className="text-muted-foreground hover:text-foreground font-normal transition-colors"
              >
                {teacherClass?.name || currentClass?.name || t('classes.class', 'Lớp học')}
              </Link>
            ) : (
              <ClassCommandMenu />
            )}

            {/* Sub-route: Assessment */}
            {location.pathname.includes('/assessment') && (
              <>
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  size={14}
                  className="text-muted-foreground/70"
                />
                <span className="text-foreground font-normal">
                  {currentTab === 'semester'
                    ? t('assessment.tabSemester', 'Đánh giá học kỳ')
                    : currentTab === 'daily'
                      ? t('assessment.tabDaily', 'Đánh giá ngày')
                      : t('assessment.tabMonthly', 'Sổ bé ngoan')}
                </span>
              </>
            )}

            {/* Sub-route: Good Behavior (Hoa bé ngoan) */}
            {location.pathname.includes('/good-behavior') && (
              <>
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  size={14}
                  className="text-muted-foreground/70"
                />
                <Link
                  to={`/classes/${currentClassId}/assessment`}
                  className="text-muted-foreground hover:text-foreground font-normal transition-colors"
                >
                  {t('nav.assessment', 'Đánh giá giai đoạn')}
                </Link>
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  size={14}
                  className="text-muted-foreground/70"
                />
                <span className="text-foreground font-normal">
                  {t('nav.goodBehavior', 'Hoa bé ngoan')}
                </span>
              </>
            )}

            {/* Sub-route: Planning */}
            {location.pathname.includes('/planning') && (
              <>
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  size={14}
                  className="text-muted-foreground/70"
                />
                {goalIdParam ? (
                  <>
                    <Link
                      to={`/classes/${currentClassId}/planning?tab=activities`}
                      className="text-muted-foreground hover:text-foreground font-normal transition-colors"
                    >
                      {t('planning.tabActivities', 'Xác định hoạt động')}
                    </Link>
                    <HugeiconsIcon
                      icon={ArrowRight01Icon}
                      size={14}
                      className="text-muted-foreground/70"
                    />
                    <span
                      className="text-foreground font-normal truncate max-w-[240px] sm:max-w-[360px]"
                      title={planningGoalDisplayName}
                    >
                      {planningGoalDisplayName}
                    </span>
                  </>
                ) : (
                  <span className="text-foreground font-normal">
                    {currentTab === 'submission'
                      ? t('planning.tabSubmission', 'Tổng hợp & Nộp duyệt')
                      : currentTab === 'timetable'
                        ? t('planning.tabTimetable', 'Kế hoạch tuần')
                        : currentTab === 'activities'
                          ? t('planning.tabActivities', 'Xác định hoạt động')
                          : t('planning.tabAllocation', 'Phân bổ mục tiêu')}
                  </span>
                )}
              </>
            )}

            {/* Sub-route: Class Settings (Quản lý lớp) */}
            {location.pathname.includes('/settings') && (
              <>
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  size={14}
                  className="text-muted-foreground/70"
                />
                <Link
                  to={`/classes/${currentClassId}/settings`}
                  className="text-muted-foreground hover:text-foreground font-normal transition-colors"
                >
                  {t('classes.classProfile', 'Quản lý lớp')}
                </Link>
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  size={14}
                  className="text-muted-foreground/70"
                />
                <span className="text-foreground font-normal">
                  {currentTab === 'teachers'
                    ? t('classes.settingsTeachers', 'Phân công giáo viên')
                    : currentTab === 'students'
                      ? t('classes.settingsStudents', 'Phân lớp học sinh')
                      : currentTab === 'export'
                        ? t('classes.settingsExport', 'Xuất danh sách')
                        : t('classes.settingsGeneral', 'Cấu hình lớp')}
                </span>
              </>
            )}

            {/* Sub-route: Export (Xuất danh sách) under class */}
            {location.pathname.includes('/export') && (
              <>
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  size={14}
                  className="text-muted-foreground/70"
                />
                <span className="text-foreground font-normal">
                  {t('classes.settingsExport', 'Xuất danh sách')}
                </span>
              </>
            )}

            {/* Sub-route: Reports (Báo cáo) */}
            {(location.pathname.includes('/students') || location.pathname.includes('/reports')) && !location.pathname.includes('/settings') && (
              <>
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  size={14}
                  className="text-muted-foreground/70"
                />
                {classStudentDetailMatch ? (
                  <>
                    <Link
                      to={`/classes/${currentClassId}/students`}
                      className="text-muted-foreground hover:text-foreground font-normal transition-colors"
                    >
                      {t('classes.reports', 'Báo cáo')}
                    </Link>
                    <HugeiconsIcon
                      icon={ArrowRight01Icon}
                      size={14}
                      className="text-muted-foreground/70"
                    />
                    <span className="text-foreground font-normal">
                      {currentStudent?.fullName || currentTitle}
                    </span>
                  </>
                ) : (
                  <span className="text-foreground font-normal">
                    {t('classes.reports', 'Báo cáo')}
                  </span>
                )}
              </>
            )}

            {/* Sub-route: Attendance under class */}
            {location.pathname.includes('/attendance') && (
              <>
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  size={14}
                  className="text-muted-foreground/70"
                />
                <Link
                  to={`/classes/${currentClassId}`}
                  className="text-muted-foreground hover:text-foreground font-normal transition-colors"
                >
                  {t('nav.dailyRoutine', 'Nhật ký ngày')}
                </Link>
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  size={14}
                  className="text-muted-foreground/70"
                />
                <span className="text-foreground font-normal">
                  {t('nav.attendance', 'Điểm danh')}
                </span>
              </>
            )}

            {/* Sub-route: Health under class */}
            {location.pathname.includes('/health') && (
              <>
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  size={14}
                  className="text-muted-foreground/70"
                />
                <Link
                  to={`/classes/${currentClassId}`}
                  className="text-muted-foreground hover:text-foreground font-normal transition-colors"
                >
                  {t('nav.dailyRoutine', 'Nhật ký ngày')}
                </Link>
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  size={14}
                  className="text-muted-foreground/70"
                />
                <span className="text-foreground font-normal">
                  {t('nav.health', 'Sức khỏe')}
                </span>
              </>
            )}

            {/* Sub-route: Daily Routine root (/classes/:id or /classes/:id/daily) */}
            {(location.pathname === `/classes/${currentClassId}` ||
              location.pathname === `/classes/${currentClassId}/` ||
              location.pathname.endsWith('/daily')) && (
                <>
                  <HugeiconsIcon
                    icon={ArrowRight01Icon}
                    size={14}
                    className="text-muted-foreground/70"
                  />
                  <span className="text-foreground font-normal">
                    {t('nav.dailyRoutine', 'Nhật ký ngày')}
                  </span>
                </>
              )}
          </>
        ) : isAccounts ? (
          <span className="text-foreground font-normal">
            {t('nav.accounts', 'Tài khoản')}
          </span>
        ) : isAccountDetail ? (
          <>
            <Link
              to="/accounts"
              className="text-muted-foreground hover:text-foreground font-normal transition-colors"
            >
              {t('nav.accounts', 'Tài khoản')}
            </Link>
            <HugeiconsIcon
              icon={ArrowRight01Icon}
              size={14}
              className="text-muted-foreground/70"
            />
            <span className="text-foreground font-normal">
              {currentAccount?.fullName || currentTitle}
            </span>
          </>
        ) : location.pathname === '/teachers' ? (
          <span className="text-foreground font-normal">
            {t('nav.teachers')}
          </span>
        ) : isTeacherDetail ? (
          <>
            <Link
              to="/teachers"
              className="text-muted-foreground hover:text-foreground font-normal transition-colors"
            >
              {t('nav.teachers')}
            </Link>
            <HugeiconsIcon
              icon={ArrowRight01Icon}
              size={14}
              className="text-muted-foreground/70"
            />
            <span className="text-foreground font-normal">
              {currentTeacher?.fullName || currentTitle}
            </span>
          </>
        ) : location.pathname === '/notifications' ? (
          <span className="text-foreground font-normal">
            {t('nav.notifications', 'Bản tin')}
          </span>
        ) : location.pathname.startsWith('/notifications/') ? (
          <>
            <Link
              to="/notifications"
              className="text-muted-foreground hover:text-foreground font-normal transition-colors"
            >
              {t('nav.notifications', 'Bản tin')}
            </Link>
            <HugeiconsIcon
              icon={ArrowRight01Icon}
              size={14}
              className="text-muted-foreground/70"
            />
            <span className="text-foreground font-normal">
              Chi tiết bản tin
            </span>
          </>
        ) : isStudents ? (
          <span className="text-foreground font-normal">
            {t('nav.students', 'Học sinh')}
          </span>
        ) : isStudentDetail ? (
          (() => {
            const searchParams = new URLSearchParams(location.search);
            const classIdFromQuery = searchParams.get('classId');
            const isViewingInClassContext = isTeacher || Boolean(classIdFromQuery);

            const studentClassId = classIdFromQuery || (isTeacher ? (teacherClass?.id || currentStudent?.currentClass?.classId) : null);
            const targetClassObj = studentClassId
              ? classes.find((c) => String(c.id) === String(studentClassId) || String(c.publicId) === String(studentClassId))
              : null;
            const studentClassName = targetClassObj?.name || (isTeacher ? teacherClass?.name : currentStudent?.currentClass?.className);
            const yearName = targetClassObj?.schoolYear?.name || currentStudent?.currentClass?.schoolYearName || getYearName(selectedYear) || 'Năm học 2026–2027';

            if (isViewingInClassContext && studentClassId) {
              return (
                <>
                  {isTeacher ? (
                    <span className="text-muted-foreground font-normal">
                      {yearName}
                    </span>
                  ) : (
                    <Link
                      to="/school-years"
                      className="text-muted-foreground hover:text-foreground font-normal transition-colors"
                    >
                      {yearName}
                    </Link>
                  )}
                  <HugeiconsIcon
                    icon={ArrowRight01Icon}
                    size={14}
                    className="text-muted-foreground/70"
                  />
                  <Link
                    to={`/classes/${studentClassId}/students`}
                    className="text-muted-foreground hover:text-foreground font-normal transition-colors"
                  >
                    {studentClassName || t('nav.classes', 'Lớp')}
                  </Link>
                  <HugeiconsIcon
                    icon={ArrowRight01Icon}
                    size={14}
                    className="text-muted-foreground/70"
                  />
                  <Link
                    to={`/classes/${studentClassId}/students`}
                    className="text-muted-foreground hover:text-foreground font-normal transition-colors"
                  >
                    {t('classes.reports', 'Báo cáo')}
                  </Link>
                  <HugeiconsIcon
                    icon={ArrowRight01Icon}
                    size={14}
                    className="text-muted-foreground/70"
                  />
                  <span className="text-foreground font-normal">
                    {currentStudent?.fullName || currentTitle}
                  </span>
                </>
              );
            }

            return (
              <>
                <Link
                  to="/students"
                  className="text-muted-foreground hover:text-foreground font-normal transition-colors"
                >
                  {t('nav.students', 'Học sinh')}
                </Link>
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  size={14}
                  className="text-muted-foreground/70"
                />
                <span className="text-foreground font-normal">
                  {currentStudent?.fullName || currentTitle}
                </span>
              </>
            );
          })()
        ) : location.pathname === '/school-years' ? (
          <span className="text-foreground font-normal">
            {t('nav.schoolYears')}
          </span>
        ) : location.pathname.startsWith('/school-years/') ? (
          <>
            <Link
              to="/school-years?view=all"
              className="text-muted-foreground hover:text-foreground font-normal transition-colors"
            >
              {t('nav.schoolYears')}
            </Link>
            <HugeiconsIcon
              icon={ArrowRight01Icon}
              size={14}
              className="text-muted-foreground/70"
            />
            <span className="text-foreground font-normal">
              {academicYears.find(
                (y) => y.id === location.pathname.replace('/school-years/', ''),
              )?.name || currentTitle}
            </span>
          </>
        ) : location.pathname === '/curriculum' ? (
          <>
            <Link
              to="/school-years"
              className="text-muted-foreground hover:text-foreground font-normal transition-colors"
            >
              {getYearName(selectedYear)}
            </Link>
            <HugeiconsIcon
              icon={ArrowRight01Icon}
              size={14}
              className="text-muted-foreground/70"
            />
            <span className="text-foreground font-normal">
              {currentTab === 'goals'
                ? t('curriculum.tabGoals', 'Ngân hàng mục tiêu')
                : t('curriculum.tabThemes', 'Bộ chủ đề')}
            </span>
          </>
        ) : location.pathname.match(/^\/curriculum\/themes\/[^/]+\/[^/]+\/[^/]+$/) ? (
          (() => {
            const match = location.pathname.match(/^\/curriculum\/themes\/([^/]+)\/([^/]+)\/([^/]+)$/);
            const parentThemePath = `/curriculum/themes/${match[1]}/${match[2]}`;
            const themeTitle =
              activeCurriculumThemeName ||
              DEFAULT_THEME_NAMES[match[3]] ||
              t('curriculum.singleTheme', 'Chủ đề');
            return (
              <>
                <Link
                  to="/school-years"
                  className="text-muted-foreground hover:text-foreground font-normal transition-colors"
                >
                  {getCurriculumYearLabel(location.pathname)}
                </Link>
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  size={14}
                  className="text-muted-foreground/70"
                />
                <Link
                  to="/curriculum?tab=themes"
                  className="text-muted-foreground hover:text-foreground font-normal transition-colors"
                >
                  {t('curriculum.tabThemes', 'Bộ chủ đề')}
                </Link>
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  size={14}
                  className="text-muted-foreground/70"
                />
                <Link
                  to={parentThemePath}
                  className="text-muted-foreground hover:text-foreground font-normal transition-colors"
                >
                  {getCurriculumGradeLabel(match[2])}
                </Link>
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  size={14}
                  className="text-muted-foreground/70"
                />
                <ThemeCommandMenu
                  yearId={match[1]}
                  ageGroup={match[2]}
                  currentThemeId={match[3]}
                  currentThemeName={themeTitle}
                />
              </>
            );
          })()
        ) : location.pathname.startsWith('/curriculum/') ? (
          <>
            <Link
              to="/school-years"
              className="text-muted-foreground hover:text-foreground font-normal transition-colors"
            >
              {getCurriculumYearLabel(location.pathname)}
            </Link>
            <HugeiconsIcon
              icon={ArrowRight01Icon}
              size={14}
              className="text-muted-foreground/70"
            />
            {location.pathname.includes('/themes') ? (
              <>
                <Link
                  to="/curriculum?tab=themes"
                  className="text-muted-foreground hover:text-foreground font-normal transition-colors"
                >
                  {t('curriculum.tabThemes', 'Bộ chủ đề')}
                </Link>
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  size={14}
                  className="text-muted-foreground/70"
                />
                <span className="text-foreground font-normal">
                  {getCurriculumGradeLabel(location.pathname)}
                </span>
              </>
            ) : location.pathname.match(/^\/curriculum\/goals\/[^/]+\/[^/]+\/[^/]+$/) ? (
              (() => {
                const match = location.pathname.match(/^\/curriculum\/goals\/([^/]+)\/([^/]+)\/([^/]+)$/);
                const parentGoalPath = `/curriculum/goals/${match[1]}/${match[2]}`;
                return (
                  <>
                    <Link
                      to="/curriculum?tab=goals"
                      className="text-muted-foreground hover:text-foreground font-normal transition-colors"
                    >
                      {t('curriculum.tabGoals', 'Ngân hàng mục tiêu')}
                    </Link>
                    <HugeiconsIcon
                      icon={ArrowRight01Icon}
                      size={14}
                      className="text-muted-foreground/70"
                    />
                    <Link
                      to={parentGoalPath}
                      className="text-muted-foreground hover:text-foreground font-normal transition-colors"
                    >
                      {getCurriculumGradeLabel(match[2])}
                    </Link>
                    <HugeiconsIcon
                      icon={ArrowRight01Icon}
                      size={14}
                      className="text-muted-foreground/70"
                    />
                    <span className="text-foreground font-normal">
                      {activeCurriculumGoal?.code || 'Chi tiết mục tiêu'}
                    </span>
                  </>
                );
              })()
            ) : (
              <>
                <Link
                  to="/curriculum?tab=goals"
                  className="text-muted-foreground hover:text-foreground font-normal transition-colors"
                >
                  {t('curriculum.tabGoals', 'Ngân hàng mục tiêu')}
                </Link>
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  size={14}
                  className="text-muted-foreground/70"
                />
                <span className="text-foreground font-normal">
                  {getCurriculumGradeLabel(location.pathname)}
                </span>
              </>
            )}
          </>
        ) : location.pathname === '/transfers' ? (
          <>
            <Link
              to="/school-years"
              className="text-muted-foreground hover:text-foreground font-normal transition-colors"
            >
              {getYearName(selectedYear)}
            </Link>
            <HugeiconsIcon
              icon={ArrowRight01Icon}
              size={14}
              className="text-muted-foreground/70"
            />
            <span className="text-foreground font-normal">
              {t('nav.transfers', 'Chuyển lớp')}
            </span>
          </>
        ) : location.pathname === '/planning/reviews' || location.pathname === '/curriculum/reviews' ? (
          <>
            <Link
              to="/school-years"
              className="text-muted-foreground hover:text-foreground font-normal transition-colors"
            >
              {getYearName(selectedYear)}
            </Link>
            <HugeiconsIcon
              icon={ArrowRight01Icon}
              size={14}
              className="text-muted-foreground/70"
            />
            <span className="text-foreground font-normal">
              {t('nav.planReviews', 'Duyệt kế hoạch')}
            </span>
          </>
        ) : location.pathname.startsWith('/transfers/') ? (
          <>
            <Link
              to="/school-years"
              className="text-muted-foreground hover:text-foreground font-normal transition-colors"
            >
              {getYearName(selectedYear)}
            </Link>
            <HugeiconsIcon
              icon={ArrowRight01Icon}
              size={14}
              className="text-muted-foreground/70"
            />
            <Link
              to="/transfers"
              className="text-muted-foreground hover:text-foreground font-normal transition-colors"
            >
              {t('nav.transfers', 'Chuyển lớp')}
            </Link>
            <HugeiconsIcon
              icon={ArrowRight01Icon}
              size={14}
              className="text-muted-foreground/70"
            />
            <span className="text-foreground font-normal">
              Chi tiết yêu cầu
            </span>
          </>
        ) : location.pathname === '/daily' ? (
          <>
            <Link
              to="/school-years"
              className="text-muted-foreground hover:text-foreground font-normal transition-colors"
            >
              {getYearName(selectedYear)}
            </Link>
            <HugeiconsIcon
              icon={ArrowRight01Icon}
              size={14}
              className="text-muted-foreground/70"
            />
            <Link
              to="/classes"
              className="text-muted-foreground hover:text-foreground font-normal transition-colors"
            >
              {t('nav.classes', 'Lớp học')}
            </Link>
            <HugeiconsIcon
              icon={ArrowRight01Icon}
              size={14}
              className="text-muted-foreground/70"
            />
            <span className="text-foreground font-normal">
              {t('nav.dailyRoutine', 'Nhật ký ngày')}
            </span>
          </>
        ) : location.pathname === '/attendance' ? (
          <>
            <Link
              to="/school-years"
              className="text-muted-foreground hover:text-foreground font-normal transition-colors"
            >
              {getYearName(selectedYear)}
            </Link>
            <HugeiconsIcon
              icon={ArrowRight01Icon}
              size={14}
              className="text-muted-foreground/70"
            />
            <Link
              to="/classes"
              className="text-muted-foreground hover:text-foreground font-normal transition-colors"
            >
              {t('nav.classes', 'Lớp học')}
            </Link>
            <HugeiconsIcon
              icon={ArrowRight01Icon}
              size={14}
              className="text-muted-foreground/70"
            />
            <Link
              to="/daily"
              className="text-muted-foreground hover:text-foreground font-normal transition-colors"
            >
              {t('nav.dailyRoutine', 'Nhật ký ngày')}
            </Link>
            <HugeiconsIcon
              icon={ArrowRight01Icon}
              size={14}
              className="text-muted-foreground/70"
            />
            <span className="text-foreground font-normal">
              {t('nav.attendance', 'Điểm danh')}
            </span>
          </>
        ) : location.pathname === '/health' ? (
          <>
            <Link
              to="/school-years"
              className="text-muted-foreground hover:text-foreground font-normal transition-colors"
            >
              {getYearName(selectedYear)}
            </Link>
            <HugeiconsIcon
              icon={ArrowRight01Icon}
              size={14}
              className="text-muted-foreground/70"
            />
            <Link
              to="/classes"
              className="text-muted-foreground hover:text-foreground font-normal transition-colors"
            >
              {t('nav.classes', 'Lớp học')}
            </Link>
            <HugeiconsIcon
              icon={ArrowRight01Icon}
              size={14}
              className="text-muted-foreground/70"
            />
            <Link
              to="/daily"
              className="text-muted-foreground hover:text-foreground font-normal transition-colors"
            >
              {t('nav.dailyRoutine', 'Nhật ký ngày')}
            </Link>
            <HugeiconsIcon
              icon={ArrowRight01Icon}
              size={14}
              className="text-muted-foreground/70"
            />
            <span className="text-foreground font-normal">
              {t('nav.health', 'Sức khỏe')}
            </span>
          </>
        ) : location.pathname === '/assessment' ? (
          <>
            <Link
              to="/school-years"
              className="text-muted-foreground hover:text-foreground font-normal transition-colors"
            >
              {getYearName(selectedYear)}
            </Link>
            <HugeiconsIcon
              icon={ArrowRight01Icon}
              size={14}
              className="text-muted-foreground/70"
            />
            <Link
              to="/classes"
              className="text-muted-foreground hover:text-foreground font-normal transition-colors"
            >
              {t('nav.classes', 'Lớp học')}
            </Link>
            <HugeiconsIcon
              icon={ArrowRight01Icon}
              size={14}
              className="text-muted-foreground/70"
            />
            <span className="text-foreground font-normal">
              {currentTab === 'semester'
                ? t('assessment.tabSemester', 'Đánh giá học kỳ')
                : currentTab === 'daily'
                  ? t('assessment.tabDaily', 'Đánh giá ngày')
                  : t('assessment.tabMonthly', 'Sổ bé ngoan')}
            </span>
          </>
        ) : location.pathname === '/reports' ? (
          <>
            <Link
              to="/school-years"
              className="text-muted-foreground hover:text-foreground font-normal transition-colors"
            >
              {getYearName(selectedYear)}
            </Link>
            <HugeiconsIcon
              icon={ArrowRight01Icon}
              size={14}
              className="text-muted-foreground/70"
            />
            <Link
              to="/classes"
              className="text-muted-foreground hover:text-foreground font-normal transition-colors"
            >
              {t('nav.classes', 'Lớp học')}
            </Link>
            <HugeiconsIcon
              icon={ArrowRight01Icon}
              size={14}
              className="text-muted-foreground/70"
            />
            <span className="text-foreground font-normal">
              {t('nav.reports', 'Báo cáo')}
            </span>
          </>
        ) : location.pathname === '/good-behavior' || location.pathname === '/reports/good-behavior' ? (
          <>
            <Link
              to="/school-years"
              className="text-muted-foreground hover:text-foreground font-normal transition-colors"
            >
              {getYearName(selectedYear)}
            </Link>
            <HugeiconsIcon
              icon={ArrowRight01Icon}
              size={14}
              className="text-muted-foreground/70"
            />
            <Link
              to="/classes"
              className="text-muted-foreground hover:text-foreground font-normal transition-colors"
            >
              {t('nav.classes', 'Lớp học')}
            </Link>
            <HugeiconsIcon
              icon={ArrowRight01Icon}
              size={14}
              className="text-muted-foreground/70"
            />
            <Link
              to="/assessment"
              className="text-muted-foreground hover:text-foreground font-normal transition-colors"
            >
              {t('nav.assessment', 'Đánh giá giai đoạn')}
            </Link>
            <HugeiconsIcon
              icon={ArrowRight01Icon}
              size={14}
              className="text-muted-foreground/70"
            />
            <span className="text-foreground font-normal">
              {t('nav.goodBehavior', 'Hoa bé ngoan')}
            </span>
          </>
        ) : (
          <>
            <span className="text-muted-foreground font-normal">
              {getYearName(selectedYear)}
            </span>
            <HugeiconsIcon
              icon={ArrowRight01Icon}
              size={14}
              className="text-muted-foreground/70"
            />
            <span className="text-foreground font-normal">{currentTitle}</span>
          </>
        )}
      </div>

      {/* Right Controls: Header Actions matching Figma */}
      <div className="ml-auto flex items-center self-stretch relative">
        {isTeacher && (
          <div
            className="relative shrink-0 flex items-end self-end pointer-events-none select-none"
            style={{
              marginRight: '125px', // Chỉnh xích sang trái (khoảng cách tới nút 3 chấm). Tăng số px nếu muốn sang trái nhiều hơn.
              transform: 'translateY(3px)', // Chỉnh mascot đi xuống. Tăng số này (vd: 4px, 5px, 6px) để hạ sát đường viền dưới.
            }}
          >
            <img
              src="/appbar-mascot.png?v=2"
              alt="Sorak Mascots"
              style={{
                height: '45px', // Chỉnh kích thước to/nhỏ của mascot.
                width: 'auto',
              }}
              className="object-contain object-bottom pointer-events-none"
            />
          </div>
        )}
        <PageMoreMenu />
      </div>
    </header>
  );
}
