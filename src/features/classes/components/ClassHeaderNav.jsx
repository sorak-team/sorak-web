import React from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArrowLeft01Icon,
  DashboardSquare01Icon,
  Calendar03Icon,
  TaskDone01Icon,
  MedicalFileIcon,
  CheckListIcon,
  Certificate01Icon,
  Settings01Icon,
  PieChartIcon,
  StudentIcon,
  Target02Icon,
  Download01Icon,
} from '@hugeicons/core-free-icons';
import { ClassVisual } from './ClassVisual';
import { cn } from '@/shared/lib/utils';
import { useAuthStore } from '@/features/auth';

export function ClassHeaderNav({ currentClass, activeTab = 'overview' }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const user = useAuthStore((state) => state.user);
  const isTeacher =
    user?.role === 'TEACHER_GV' ||
    user?.role === 'TEACHER' ||
    user?.role?.toLowerCase()?.includes('teacher');

  if (!currentClass) return null;

  const classId = currentClass.id || currentClass.publicId;

  // Determine current active tab from pathname if not explicitly passed
  const getActiveTab = () => {
    if (activeTab && activeTab !== 'auto') return activeTab;
    const path = location.pathname;
    if (path.includes('/students') || path.includes('/reports')) return 'reports';
    if (path.includes('/daily') || path.endsWith('/attendance') || path.endsWith('/health')) return 'daily';
    if (path.endsWith('/settings')) return 'settings';
    if (path.endsWith('/planning')) return 'planning';
    if (path.endsWith('/assessment')) return 'assessment';
    if (path.endsWith('/export')) return 'export';
    if (path.endsWith('/good-behavior')) return 'goodBehavior';
    return 'reports';
  };

  const currentTab = getActiveTab();

  const tabs = isTeacher
    ? [
        {
          key: 'reports',
          label: t('classes.reports', 'Báo cáo'),
          path: `/classes/${classId}/students`,
          icon: DashboardSquare01Icon,
        },
        {
          key: 'daily',
          label: t('nav.dailyRoutine', 'Nhật ký ngày'),
          path: `/classes/${classId}`,
          icon: Calendar03Icon,
        },
        {
          key: 'assessment',
          label: t('classes.tabAssessment', 'Đánh giá giai đoạn'),
          path: `/classes/${classId}/assessment`,
          icon: CheckListIcon,
        },
        {
          key: 'planning',
          label: t('planning.title', 'Kế hoạch giáo dục'),
          path: `/classes/${classId}/planning?tab=allocation`,
          icon: Target02Icon,
        },
        {
          key: 'export',
          label: t('classes.settingsExport', 'Xuất danh sách'),
          path: `/classes/${classId}/export`,
          icon: Download01Icon,
        },
      ]
    : [
        {
          key: 'reports',
          label: t('classes.reports', 'Báo cáo'),
          path: `/classes/${classId}/students`,
          icon: DashboardSquare01Icon,
        },
        {
          key: 'daily',
          label: t('nav.dailyRoutine', 'Nhật ký ngày'),
          path: `/classes/${classId}`,
          icon: Calendar03Icon,
        },
        {
          key: 'assessment',
          label: t('classes.tabAssessment', 'Đánh giá giai đoạn'),
          path: `/classes/${classId}/assessment`,
          icon: CheckListIcon,
        },
        {
          key: 'settings',
          label: t('classes.tabSettings', 'Quản lý lớp'),
          path: `/classes/${classId}/settings`,
          icon: Settings01Icon,
        },
        {
          key: 'export',
          label: t('classes.settingsExport', 'Xuất danh sách'),
          path: `/classes/${classId}/export`,
          icon: Download01Icon,
        },
      ];

  return (
    <div className="flex flex-col gap-4 select-none shrink-0" data-name="ClassHeaderNav">
      {/* 1. Class Hero Card (Consistent with Academic Year, Teacher & Account Overview) */}
      <div
        className="border border-border bg-card p-5 sm:p-6 rounded-none flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs"
        data-name="Class Hero · Refined"
      >
        <div className="flex items-center gap-4 sm:gap-5 min-w-0">
          <ClassVisual
            color={currentClass.color}
            grade={currentClass.grade || currentClass.ageGroup}
            src={currentClass.avatarUrl}
            size={56}
            className="border border-border/80 shadow-xs rounded-none shrink-0"
            alt={currentClass.name}
          />
          <div className="flex flex-col min-w-0 gap-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-[22px] font-semibold text-foreground tracking-tight leading-tight">
                {currentClass.name}
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded-none text-[12px] font-normal bg-muted border border-border">
                {currentClass.gradeLabel}
              </span>
            </div>
            <p className="text-[13px] text-muted-foreground font-normal truncate">
              {t('classes.headerNavSubtitle', 'Quản lý thông tin, kế hoạch giảng dạy và hoạt động của lớp học')}
            </p>
          </div>
        </div>

        {/* Back button (Only for Ban Giám Hiệu, Giáo viên không có nút back về danh sách lớp) */}
        {!isTeacher && (
          <Link
            to="/classes"
            className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-muted-foreground hover:text-foreground border border-border bg-background px-3 py-1.5 rounded-none transition-colors self-start sm:self-center shadow-none cursor-pointer"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={14} />
            <span>{t('classes.backToList', 'Danh sách lớp')}</span>
          </Link>
        )}
      </div>

      {/* 2. Sub-Navigation Tabs Bar */}
      <div className="flex items-center gap-1 border-b border-border overflow-x-auto scrollbar-none pb-0">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => navigate(tab.path)}
              className={cn(
                'flex items-center gap-2 px-3.5 py-2.5 text-[13px] font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap -mb-px',
                isActive
                  ? 'border-primary text-foreground font-semibold'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
              )}
            >
              <HugeiconsIcon icon={tab.icon} size={15} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
