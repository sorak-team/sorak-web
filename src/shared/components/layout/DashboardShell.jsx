import React, { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate, Outlet, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  DashboardSquare01Icon,
  SchoolIcon,
  TaskDone01Icon,
  MedicalFileIcon,
  PieChartIcon,
  UserGroupIcon,
  TeacherIcon,
  StudentIcon,
  Calendar03Icon,
  HelpCircleIcon,
  Book02Icon,
  CheckListIcon,
  Certificate01Icon,
  ArrowDataTransferHorizontalIcon,
  Target02Icon,
} from '@hugeicons/core-free-icons';

import { cn } from '@/shared/lib/utils';
import { LogoutDialog, RequirePasswordChangeModal, useAuthStore } from '@/features/auth';
import { SettingsDialog } from '@/features/settings';
import { NotificationsPanel } from '@/features/notifications';
import { useAppearanceStore } from '@/shared/stores/appearance.store';
import { useAcademicYearStore } from '@/features/academic-years';
import { useClassesStore, findTeacherClassForYear } from '@/features/classes';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';

export function DashboardShell() {
  const { t } = useTranslation();
  const location = useLocation();

  const fontFamily = useAppearanceStore((state) => state.fontFamily);
  const fontClass =
    fontFamily === 'vietnam'
      ? 'font-vietnam'
      : fontFamily === 'jakarta'
        ? 'font-jakarta'
        : 'font-sans';

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [notificationsPanelOpen, setNotificationsPanelOpen] = useState(false);
  const [themeMode, setThemeMode] = useState(() => {
    return localStorage.getItem('sorak-theme') || 'light';
  });

  // Apply theme with transition freeze to eliminate screen flash
  const handleThemeChange = (theme) => {
    const style = document.createElement('style');
    style.appendChild(
      document.createTextNode(
        '*, *::before, *::after { -webkit-transition: none !important; -moz-transition: none !important; -o-transition: none !important; -ms-transition: none !important; transition: none !important; }'
      )
    );
    document.head.appendChild(style);

    setThemeMode(theme);
    localStorage.setItem('sorak-theme', theme);

    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (theme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }

    setTimeout(() => {
      document.head.removeChild(style);
    }, 50);
  };

  // Sync theme on mount
  useEffect(() => {
    const saved = localStorage.getItem('sorak-theme') || 'light';
    if (saved === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (saved === 'light') {
      document.documentElement.classList.remove('dark');
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    return () => {
      // Revert to white mode when leaving the dashboard shell
      document.documentElement.classList.remove('dark');
    };
  }, []);

  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);


  const isTeacher =
    user?.role === 'TEACHER_GV' ||
    user?.role === 'TEACHER' ||
    user?.role?.toLowerCase()?.includes('teacher');

  const selectedYearId = useAcademicYearStore((state) => state.selectedYearId);
  const classes = useClassesStore((state) => state.classes) || [];
  const fetchClasses = useClassesStore((state) => state.fetchClasses);

  // Fetch academic years on dashboard initialization to synchronize globally across all routes
  useEffect(() => {
    useAcademicYearStore.getState().fetchAcademicYears();
  }, []);

  // Synchronize classes whenever academic year changes
  useEffect(() => {
    if (selectedYearId) {
      fetchClasses(selectedYearId);
    }
  }, [selectedYearId, fetchClasses]);

  // Check if the current route is restricted to Ban Giám Hiệu
  const isRestrictedBghRoute =
    location.pathname === '/' ||
    location.pathname === '/classes' ||
    location.pathname.startsWith('/transfers') ||
    location.pathname.startsWith('/curriculum') ||
    location.pathname.startsWith('/accounts') ||
    location.pathname.startsWith('/teachers') ||
    location.pathname.startsWith('/school-years') ||
    location.pathname === '/students';

  // For Teachers: Automatically direct to their class in the selected academic year, prevent BGH routes
  useEffect(() => {
    if (!isTeacher || classes.length === 0) return;

    const hasNewYearClasses = classes.some((c) => String(c.schoolYearId) === String(selectedYearId));

    if (isRestrictedBghRoute) {
      if (hasNewYearClasses) {
        const teacherClass = findTeacherClassForYear(user, classes, selectedYearId);
        if (teacherClass) {
          navigate(`/classes/${teacherClass.id}`, { replace: true });
          return;
        }
      }
    }

    // For Teachers: Ensure teacher is ONLY in their assigned class for the selected academic year
    if (selectedYearId && location.pathname.startsWith('/classes/')) {
      const match = location.pathname.match(/\/classes\/([^/]+)(\/.*)?/);
      if (match) {
        const currentClassId = match[1];
        const subPath = match[2] || '';
        const teacherClassInYear = findTeacherClassForYear(user, classes, selectedYearId);
        const isAssigned =
          teacherClassInYear &&
          (String(teacherClassInYear.id) === String(currentClassId) ||
           String(teacherClassInYear.publicId) === String(currentClassId));

        if (!isAssigned && classes.length > 0) {
          if (teacherClassInYear) {
            navigate(`/classes/${teacherClassInYear.id || teacherClassInYear.publicId}${subPath}`, { replace: true });
          } else {
            navigate('/classes', { replace: true });
          }
        }
      }
    }
  }, [isTeacher, classes, selectedYearId, location.pathname, navigate, user, isRestrictedBghRoute]);

  const navGroups = useMemo(
    () => [
      {
        title: t('nav.inSchoolYear'),
        items: [
          { title: t('nav.classes'), path: '/classes', icon: SchoolIcon },
          { title: t('nav.transfers', 'Chuyển lớp'), path: '/transfers', icon: ArrowDataTransferHorizontalIcon },
          { title: t('curriculum.tabThemes', 'Bộ chủ đề'), path: '/curriculum?tab=themes', icon: Book02Icon },
          { title: t('curriculum.tabGoals', 'Ngân hàng mục tiêu'), path: '/curriculum?tab=goals', icon: Target02Icon },
        ],
      },
      {
        title: t('nav.management'),
        items: [
          { title: t('nav.accounts'), path: '/accounts', icon: UserGroupIcon },
          { title: t('nav.teachers'), path: '/teachers', icon: TeacherIcon },
          { title: t('nav.students'), path: '/students', icon: StudentIcon },
          { title: t('nav.schoolYears'), path: '/school-years', icon: Calendar03Icon },
        ],
      },
    ],
    [t],
  );

  const currentTitle = useMemo(() => {
    if (location.pathname.includes('/students')) {
      return t('nav.students', 'Học sinh');
    }
    if (
      location.pathname.startsWith('/curriculum/goals') ||
      (location.pathname === '/curriculum' &&
        new URLSearchParams(location.search).get('tab') === 'goals')
    ) {
      return t('curriculum.tabGoals', 'Ngân hàng mục tiêu');
    }
    if (
      location.pathname.startsWith('/curriculum/themes') ||
      location.pathname === '/curriculum'
    ) {
      return t('curriculum.tabThemes', 'Bộ chủ đề');
    }

    for (const group of navGroups) {
      const match = group.items.find((item) =>
        item.path === '/'
          ? location.pathname === '/'
          : location.pathname.startsWith(item.path.split('?')[0]),
      );
      if (match) return match.title;
    }
    if (location.pathname === '/support') return t('nav.support');
    return t('nav.overview');
  }, [location.pathname, location.search, navGroups, t]);

  // Role Guard: Parents are strictly segregated to /parent portal (after all hooks run)
  if (user?.role === 'PARENT_PH') {
    return <Navigate to="/parent" replace />;
  }

  // Synchronous render-phase guard: Block flash of BGH screens and direct teacher to daily routine (after all hooks run)
  if (isTeacher && isRestrictedBghRoute && classes.length > 0) {
    const teacherClass = findTeacherClassForYear(user, classes, selectedYearId);
    if (teacherClass) {
      return <Navigate to={`/classes/${teacherClass.id}`} replace />;
    }
  }

  return (
    <div
      className={cn(
        'flex h-screen w-full bg-background overflow-hidden select-none',
        fontClass,
      )}
      data-node-id="4053:1125"
      data-name="Sorak Dashboard · Default"
    >
      {/* Sidebar - Modular component */}
      <AppSidebar
        sidebarCollapsed={sidebarCollapsed}
        navGroups={navGroups}
        onOpenSettings={() => setSettingsModalOpen(true)}
        onOpenNotifications={() => setNotificationsPanelOpen(true)}
        onOpenLogout={() => setLogoutModalOpen(true)}
        themeMode={themeMode}
        onThemeChange={handleThemeChange}
      />

      {/* Main Layout Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
        {/* Top Header */}
        <AppHeader
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          currentTitle={currentTitle}
        />

        {/* Content Area - Full-bleed for planning multi-column workspaces, standardized 32px padding for other pages */}
        <main
          className={cn(
            'flex-1 bg-background flex flex-col',
            location.pathname.includes('/planning')
              ? 'p-0 overflow-hidden'
              : 'overflow-y-auto p-6 lg:p-8'
          )}
        >
          <Outlet />
        </main>
      </div>

      {/* Global Modals */}
      <LogoutDialog
        open={logoutModalOpen}
        onOpenChange={setLogoutModalOpen}
      />

      <SettingsDialog
        open={settingsModalOpen}
        onOpenChange={setSettingsModalOpen}
        themeMode={themeMode}
        onThemeChange={handleThemeChange}
      />

      <NotificationsPanel
        open={notificationsPanelOpen}
        onOpenChange={setNotificationsPanelOpen}
        onOpenSettings={() => setSettingsModalOpen(true)}
        sidebarCollapsed={sidebarCollapsed}
      />

      {/* Gợi ý đổi mật khẩu mặc định lần đầu đăng nhập trên thiết bị */}
      <RequirePasswordChangeModal />
    </div>
  );
}
export default DashboardShell;
