import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation, Navigate } from 'react-router-dom';
import {
  Home,
  FileCheck2,
  UserSquare2,
  Award,
  Search,
  Menu,
  X,
  ChevronDown,
  UserPlus,
  LogOut,
  Check,
  Clock,
  ShieldCheck,
  Heart,
  Calendar,
} from 'lucide-react';
import { useAuthStore } from '@/features/auth/auth.store';
import { RequirePasswordChangeModal, LogoutDialog } from '@/features/auth';
import { getStudentAvatarUrl } from '@/features/students/students.store';
import { parentApi } from '../api/parent.api';
import { ParentChildHero } from './ParentChildHero';
import { ParentActivitySheet } from './ParentActivitySheet';
import { LinkChildModal } from './LinkChildModal';
import { Button } from '@/components/ui/button';
import { cn } from '@/shared/lib/utils';

export function ParentPortalShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);

  // Authentication & Role Guard: Reject unauthenticated or non-parent access
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (user.role !== 'PARENT_PH') {
    return <Navigate to="/classes" replace />;
  }

  const linkedAccounts = useAuthStore((state) => state.linkedAccounts) || [];
  const switchAccount = useAuthStore((state) => state.switchAccount);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isActivitySheetOpen, setIsActivitySheetOpen] = useState(false);
  const [isLinkChildModalOpen, setIsLinkChildModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [homeData, setHomeData] = useState(null);
  const [selectedClassId, setSelectedClassId] = useState(() => {
    return new URLSearchParams(window.location.search).get('classId') || null;
  });

  const fetchHomeData = async (classId) => {
    try {
      const res = await parentApi.getHome(classId ? { classId } : {});
      setHomeData(res);
      if (res?.selectedClassId && !classId) {
        setSelectedClassId(res.selectedClassId);
      }
    } catch (err) {
      console.error('Failed to load parent home data in shell:', err);
    }
  };

  useEffect(() => {
    fetchHomeData(selectedClassId);
  }, [selectedClassId]);

  const handleSwitchClass = (newClassId) => {
    setSelectedClassId(newClassId);
    const params = new URLSearchParams(window.location.search);
    if (newClassId) {
      params.set('classId', newClassId);
    } else {
      params.delete('classId');
    }
    const newPath = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
    navigate(newPath, { replace: true });
  };

  // Active child info from user object & API
  const activeStudent = user?.student || {
    fullName: user?.fullName || user?.name || 'Nguyễn Minh An',
    studentCode: user?.identifier || 'HS26001',
    className: 'Mầm 1',
    avatarUrl: user?.avatarUrl || null,
  };

  const heroStudent = homeData?.student || {
    fullName: activeStudent.fullName || 'Nguyễn Minh An',
    code: activeStudent.studentCode || 'HS26001',
    studentCode: activeStudent.studentCode || 'HS26001',
    age: '3 tuổi',
    avatarUrl: activeStudent.avatarUrl,
  };

  const homeroomClass = homeData?.homeroomClass || {
    name: activeStudent.className || 'Mầm 1',
    roomNumber: 'Phòng 101',
    schoolYear: '2026–2027',
  };

  const primaryTeacher = homeData?.primaryTeacher || null;

  // 4 Tabs:
  // 1. Thời khoá biểu (Bảng thời khóa biểu tuần ưu tiên + Tích hợp điểm danh sáng, đánh giá tiết học & đón trẻ chiều)
  // 2. Sổ bé ngoan (Phiếu bé ngoan tuần, tổng kết tháng & sổ liên lạc, đánh giá học kỳ 5 lĩnh vực)
  // 3. Sức khoẻ (Chỉ số thể chất, dinh dưỡng, BMI chuẩn WHO & lịch sử khám sức khỏe)
  // 4. Hồ sơ học sinh (Hồ sơ học vụ + Quản lý ủy thác đón học sinh)
  const portalTabs = [
    { id: 'schedule', label: 'Thời khoá biểu', to: '/parent', exact: true },
    { id: 'behavior', label: 'Sổ bé ngoan', to: '/parent/good-behavior' },
    { id: 'health', label: 'Sức khoẻ', to: '/parent/health' },
    { id: 'profile', label: 'Hồ sơ học sinh', to: '/parent/profile' },
  ];

  const navLinks = [
    {
      to: '/parent',
      label: 'Thời khoá biểu',
      icon: Calendar,
      exact: true,
    },
    {
      to: '/parent/good-behavior',
      label: 'Sổ bé ngoan',
      icon: Award,
    },
    {
      to: '/parent/health',
      label: 'Sức khoẻ',
      icon: Heart,
    },
    {
      to: '/parent/profile',
      label: 'Hồ sơ học sinh',
      icon: UserSquare2,
    },
  ];

  const handleSwitchChild = (targetUser) => {
    const switched = switchAccount(targetUser.id || targetUser.identifier);
    if (switched) {
      window.location.reload();
    }
  };

  const handleOpenLogout = () => {
    setIsLogoutModalOpen(true);
  };

  const avatarUrl = getStudentAvatarUrl(
    activeStudent.avatarUrl || activeStudent.avatar,
    activeStudent.studentCode || activeStudent.fullName
  );

  const getEnrollmentStatusLabel = () => {
    if (!homeData?.isHistorical) return 'Đang theo học';
    const rawStatus = homeroomClass?.status;
    if (rawStatus === 'GRADUATED') return 'Đã tốt nghiệp';
    if (rawStatus === 'COMPLETED') return 'Đã hoàn thành năm học';
    if (rawStatus === 'TRANSFERRED_CLASS') return 'Đã chuyển lớp';
    if (rawStatus === 'TRANSFERRED_SCHOOL') return 'Đã chuyển trường';
    if (rawStatus === 'RESERVED') return 'Bảo lưu';
    return 'Đã hoàn thành năm học';
  };

  return (
    <div
      className="min-h-screen bg-background text-foreground flex flex-col select-none font-sans"
      data-node-id="5288:24533"
      data-name="FE-06A · Phụ huynh · Portal Shell (Option A: Integrated Hero Header)"
    >

      {/* 2. Mobile Navigation Drawer (Visible on small screens when hamburger is clicked) */}
      {isMobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-[270px] bg-card border-r border-border p-4 flex flex-col justify-between shadow-2xl lg:hidden">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <img src="/logo.svg" alt="Sorak" className="size-6" />
                  <span className="font-bold text-[14px]">Cổng Phụ Huynh</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="size-7 rounded-none"
                >
                  <X className="size-4" />
                </Button>
              </div>

              {/* Active Child in Mobile Drawer */}
              <div className="flex items-center gap-2.5 p-2.5 bg-muted/40 border border-border">
                <img
                  src={avatarUrl}
                  alt={activeStudent.fullName}
                  className="size-9 object-cover border border-border"
                />
                <div className="flex flex-col min-w-0">
                  <span className="text-[13px] font-semibold text-foreground truncate">
                    {activeStudent.fullName}
                  </span>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {activeStudent.studentCode} · {activeStudent.className}
                  </span>
                </div>
              </div>

              {/* Mobile Nav Links */}
              <nav className="flex flex-col gap-1">
                {navLinks.map((item) => {
                  const isActive = item.exact
                    ? location.pathname === item.to
                    : location.pathname.startsWith(item.to);
                  const Icon = item.icon;

                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={cn(
                        'h-10 px-3 flex items-center gap-3 text-[13.5px] font-medium transition-colors rounded-none',
                        isActive
                          ? 'bg-blue-50 text-[#1447e6] font-semibold dark:bg-blue-950/40 dark:text-blue-400'
                          : 'text-foreground hover:bg-muted/60',
                      )}
                    >
                      <Icon className="size-4 shrink-0" />
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}
              </nav>
            </div>

            <div className="flex flex-col gap-2 pt-4 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsLinkChildModalOpen(true);
                }}
                className="w-full h-9 rounded-none text-[12.5px] flex items-center justify-center gap-2 text-[#1447e6]"
              >
                <UserPlus className="size-4" />
                <span>+ Thêm tài khoản con khác</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  handleOpenLogout();
                }}
                className="w-full h-9 rounded-none text-[12.5px] flex items-center justify-center gap-2 text-destructive hover:bg-destructive/10"
              >
                <LogOut className="size-4" />
                <span>Đăng xuất</span>
              </Button>
            </div>
          </aside>
        </>
      )}

      {/* 3. Main Layout: Full-bleed Hero at top + Centered Padded Content below */}
      <main className="flex-1 w-full flex flex-col">
        {/* Full-bleed Child Hero Banner with Integrated Utility Bar & Underline Tabs */}
        <ParentChildHero
          student={heroStudent}
          homeroomClass={homeroomClass}
          primaryTeacher={primaryTeacher}
          teachers={homeData?.teachers || []}
          status={getEnrollmentStatusLabel()}
          schoolYear={homeroomClass?.schoolYear || '2026–2027'}
          tabs={portalTabs}
          isMobileMenuOpen={isMobileMenuOpen}
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          onOpenLinkChildModal={() => setIsLinkChildModalOpen(true)}
          onOpenActivitySheet={() => setIsActivitySheetOpen(true)}
          linkedAccounts={
            linkedAccounts && linkedAccounts.length > 0
              ? linkedAccounts.map((acc) => ({
                  user: {
                    id: acc.user?.id || acc.user?.studentId,
                    identifier: acc.user?.identifier || acc.user?.studentCode || acc.user?.username,
                    name: acc.user?.name || acc.user?.fullName,
                    fullName: acc.user?.fullName || acc.user?.name,
                    student: acc.user?.student || {
                      id: acc.user?.studentId || acc.user?.id,
                      fullName: acc.user?.fullName || acc.user?.name,
                      studentCode: acc.user?.studentCode,
                      className: acc.user?.className,
                      avatarUrl: acc.user?.avatarUrl,
                    },
                    avatarUrl: acc.user?.avatarUrl,
                  },
                }))
              : [
                  {
                    user: {
                      id: heroStudent?.id || user?.id,
                      identifier: heroStudent?.studentCode || user?.studentCode || user?.username,
                      name: heroStudent?.fullName || user?.fullName || user?.name,
                      fullName: heroStudent?.fullName || user?.fullName || user?.name,
                      student: {
                        id: heroStudent?.id || user?.id,
                        fullName: heroStudent?.fullName || user?.fullName || user?.name,
                        studentCode: heroStudent?.studentCode || user?.studentCode,
                        className: homeroomClass?.name || '',
                        avatarUrl: heroStudent?.avatarUrl || user?.avatarUrl,
                      },
                      avatarUrl: heroStudent?.avatarUrl || user?.avatarUrl,
                    },
                  },
                ]
          }
          onSwitchAccount={handleSwitchChild}
          onLogout={handleOpenLogout}
          // Class Switcher props
          enrollments={homeData?.enrollments || []}
          selectedClassId={selectedClassId || homeroomClass?.id}
          isHistorical={Boolean(homeData?.isHistorical)}
          onSwitchClass={handleSwitchClass}
        />

        {/* Centered Page Content with standard padding & max-width 1440px */}
        <div className="w-full max-w-[1440px] mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6 flex-1">
          <Outlet
            context={{
              student: heroStudent,
              homeroomClass,
              primaryTeacher,
              homeData,
              selectedClassId,
              isHistorical: Boolean(homeData?.isHistorical),
              onSwitchClass: handleSwitchClass,
              enrollments: homeData?.enrollments || [],
            }}
          />
        </div>
      </main>

      {/* 4. Link Child Modal */}
      <LinkChildModal
        isOpen={isLinkChildModalOpen}
        onClose={() => setIsLinkChildModalOpen(false)}
      />

      {/* 5. Activity Sheet Drawer */}
      <ParentActivitySheet
        isOpen={isActivitySheetOpen}
        onClose={() => setIsActivitySheetOpen(false)}
        studentName={heroStudent?.fullName || activeStudent.fullName}
        timeline={homeData?.routineSlots || []}
      />

      {/* 6. Gợi ý đổi mật khẩu mặc định lần đầu trên thiết bị */}
      <RequirePasswordChangeModal />

      {/* 7. Hộp thoại xác nhận đăng xuất đồng nhất với BGH/Giáo viên */}
      <LogoutDialog
        open={isLogoutModalOpen}
        onOpenChange={setIsLogoutModalOpen}
      />
    </div>
  );
}
