import { useState, useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useParams, Outlet } from 'react-router-dom';
import { DashboardShell } from '@/shared/components/layout';
import {
  LoginPage,
  ForgotPasswordPage,
  OtpVerifyPage,
  ProtectedRoute,
  PublicOnlyRoute,
} from '@/features/auth';
import { AcademicYearsPage, AcademicYearOverviewPage } from '@/features/academic-years';
import { TeachersPage, TeacherOverviewPage } from '@/features/teachers';
import { StudentsPage, StudentOverviewPage, StudentReportPage } from '@/features/students';
import { AccountsPage, AccountOverviewPage } from '@/features/accounts';
import {
  ClassroomsPage,
  ClassOverviewPage,
  ClassSettingsPage,
  ClassStudentsPage,
  ClassExportPage,
  useClassesStore,
  classesApi,
} from '@/features/classes';
import { useAcademicYearStore } from '@/features/academic-years';
import { TransfersManagementPage, TransferDetailPage } from '@/features/transfers';
import {
  CurriculumFrameworkPage,
  CurriculumThemeDetailPage,
  CurriculumSingleThemeDetailPage,
  CurriculumGoalDetailPage,
  CurriculumSingleGoalDetailPage,
} from '@/features/curriculum';
import { ClassPlanningPage } from '@/features/planning';
import { DailyRoutinePage } from '@/features/daily';
import { AttendancePage } from '@/features/attendance';
import { HealthPage } from '@/features/health';
import { AssessmentPage } from '@/features/assessment';
import { GoodBehaviorPage } from '@/features/good-behavior';
import {
  ParentPortalShell,
  ParentHomePage,
  ParentSchedulePage,
  ParentRequestsPage,
  ParentStudentProfilePage,
  ParentGoodBehaviorPage,
  ParentHealthPage,
} from '@/features/parent';
import { NotFoundPage } from '@/features/error';
import { useTranslation } from 'react-i18next';
import { useAuthStore, isParentRole } from '@/features/auth';

function RootRedirect() {
  const user = useAuthStore((state) => state.user);
  const isParent = isParentRole(user?.role);
  return <Navigate to={isParent ? '/parent' : '/classes'} replace />;
}

function ClassRouteGuard() {
  const { id } = useParams();
  const classes = useClassesStore((state) => state.classes) || [];
  const isLoading = useClassesStore((state) => state.isLoading);
  const fetchClasses = useClassesStore((state) => state.fetchClasses);
  const upsertClass = useClassesStore((state) => state.upsertClass);
  const selectedYearId = useAcademicYearStore((state) => state.selectedYearId);
  const setSelectedYearId = useAcademicYearStore((state) => state.setSelectedYearId);
  const [apiCheckedId, setApiCheckedId] = useState(null);
  const [classNotFound, setClassNotFound] = useState(false);
  const lastSyncedClassIdRef = useRef(null);

  const currentClassInStore = id
    ? classes.find((c) => String(c.id) === String(id) || String(c.publicId) === String(id))
    : null;

  // 2. Fetch classes if store is empty
  useEffect(() => {
    if (classes.length === 0 && !isLoading) {
      fetchClasses(selectedYearId);
    }
  }, [classes.length, isLoading, fetchClasses, selectedYearId]);

  // 3. Validate existence and sync academic year ONLY on initial navigation to class URL
  useEffect(() => {
    if (!id || /^\d+$/.test(String(id).trim())) return;

    if (currentClassInStore) {
      setClassNotFound(false);
      setApiCheckedId(id);
      if (lastSyncedClassIdRef.current !== id) {
        lastSyncedClassIdRef.current = id;
        if (
          currentClassInStore.schoolYearId &&
          String(currentClassInStore.schoolYearId) !== String(useAcademicYearStore.getState().selectedYearId)
        ) {
          setSelectedYearId(String(currentClassInStore.schoolYearId));
        }
      }
      return;
    }

    let active = true;
    classesApi
      .getById(id)
      .then((res) => {
        if (!active) return;
        if (res && (res.id || res.publicId)) {
          setClassNotFound(false);
          upsertClass(res);
          if (lastSyncedClassIdRef.current !== id) {
            lastSyncedClassIdRef.current = id;
            if (res.schoolYearId) {
              setSelectedYearId(String(res.schoolYearId));
              fetchClasses(String(res.schoolYearId));
            }
          }
        } else {
          setClassNotFound(true);
        }
      })
      .catch((err) => {
        if (!active) return;
        console.error('ClassRouteGuard getById error:', err);
        setClassNotFound(true);
      })
      .finally(() => {
        if (active) {
          setApiCheckedId(id);
        }
      });

    return () => {
      active = false;
    };
  }, [id, currentClassInStore, setSelectedYearId, fetchClasses, upsertClass]);

  // 1. Pure numeric sequence ID (e.g., /classes/10 or /classes/17) -> Strict 404 immediately
  if (id && /^\d+$/.test(String(id).trim())) {
    return <NotFoundPage />;
  }

  if (classNotFound) {
    return <NotFoundPage />;
  }

  // Prevent flashing child pages or premature 404 while checking/fetching class
  if (id && (!currentClassInStore && apiCheckedId !== id)) {
    return (
      <div className="p-12 text-center text-muted-foreground select-none">
        <p className="text-[14px]">Đang tải thông tin lớp học...</p>
      </div>
    );
  }

  return <Outlet />;
}

export function AppRouter() {
  const { t } = useTranslation();

  return (
    <Routes>
      {/* Standalone Authentication Pages (Guest only) */}
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/otp-verify" element={<OtpVerifyPage />} />
        <Route path="/reset-password" element={<OtpVerifyPage />} />
      </Route>

      {/* Protected Routes (Requires Login) */}
      <Route element={<ProtectedRoute />}>
        {/* Root redirect based on active role */}
        <Route
          path="/"
          element={<RootRedirect />}
        />

        {/* Parent Portal Routes - 3 Pillars: Lịch sinh hoạt, Sổ bé ngoan, Hồ sơ & Đưa đón */}
        <Route element={<ParentPortalShell />}>
          <Route path="/parent" element={<ParentSchedulePage />} />
          <Route path="/parent/schedule" element={<Navigate to="/parent" replace />} />
          <Route path="/parent/good-behavior" element={<ParentGoodBehaviorPage />} />
          <Route path="/parent/health" element={<ParentHealthPage />} />
          <Route path="/parent/profile" element={<ParentStudentProfilePage />} />
          <Route path="/parent/requests" element={<Navigate to="/parent/profile" replace />} />
        </Route>

        {/* School Management & Faculty Dashboard Shell */}
        <Route element={<DashboardShell />}>
          {/* Sub-routes under dashboard shell */}
          <Route path="/classes" element={<ClassroomsPage />} />

          {/* Class scoped routes guarded by ClassRouteGuard */}
          <Route path="/classes/:id" element={<ClassRouteGuard />}>
            <Route index element={<DailyRoutinePage />} />
            <Route path="daily" element={<DailyRoutinePage />} />
            <Route path="reports" element={<ClassStudentsPage />} />
            <Route path="students" element={<ClassStudentsPage />} />
            <Route path="students/:studentId" element={<StudentReportPage />} />
            <Route path="reports/:studentId" element={<StudentReportPage />} />
            <Route path="export" element={<ClassExportPage />} />
            <Route path="settings" element={<ClassSettingsPage />} />
            <Route path="planning" element={<ClassPlanningPage />} />
            <Route path="attendance" element={<AttendancePage />} />
            <Route path="health" element={<HealthPage />} />
            <Route path="assessment" element={<AssessmentPage />} />
            <Route path="good-behavior" element={<GoodBehaviorPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
          <Route path="/daily" element={<DailyRoutinePage />} />
          <Route path="/attendance" element={<AttendancePage />} />
          <Route path="/health" element={<HealthPage />} />
          <Route path="/assessment" element={<AssessmentPage />} />
          <Route path="/good-behavior" element={<GoodBehaviorPage />} />
          <Route path="/reports/good-behavior" element={<GoodBehaviorPage />} />
          <Route path="/reports" element={<ClassOverviewPage />} />
          <Route path="/accounts" element={<AccountsPage />} />
          <Route path="/accounts/:id" element={<AccountOverviewPage />} />
          <Route path="/teachers" element={<TeachersPage />} />
          <Route path="/teachers/:id" element={<TeacherOverviewPage />} />
          <Route path="/students" element={<StudentsPage />} />
          <Route path="/students/:id" element={<StudentOverviewPage />} />
          <Route path="/transfers" element={<TransfersManagementPage />} />
          <Route path="/transfers/:id" element={<TransferDetailPage />} />
          <Route path="/school-years" element={<AcademicYearsPage />} />
          <Route path="/school-years/:id" element={<AcademicYearOverviewPage />} />
          <Route path="/curriculum" element={<CurriculumFrameworkPage />} />
          <Route path="/curriculum/themes/:yearId/:ageGroup" element={<CurriculumThemeDetailPage />} />
          <Route path="/curriculum/themes/:yearId/:ageGroup/:themeId" element={<CurriculumSingleThemeDetailPage />} />
          <Route path="/curriculum/goals/:yearId/:ageGroup" element={<CurriculumGoalDetailPage />} />
          <Route path="/curriculum/goals/:yearId/:ageGroup/:goalId" element={<CurriculumSingleGoalDetailPage />} />
          <Route
            path="/support"
            element={
              <div className="text-sm text-muted-foreground p-6">
                {t('supportCenter', 'Trung tâm Hỗ trợ Sorak')}
              </div>
            }
          />
        </Route>
      </Route>

      {/* Error 404 Pages */}
      <Route path="/404" element={<NotFoundPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default AppRouter;
