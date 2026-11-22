import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Phone,
  Info,
  Clock,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  User,
  School,
  Menu,
  X,
  UserPlus,
  LogOut,
  ChevronDown,
  Check,
  GraduationCap,
  History,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { HeroGridPattern } from '@/shared/components/HeroGridPattern';
import { getStudentAvatarUrl } from '@/features/students/students.store';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ParentNotificationPopover } from './ParentNotificationPopover';
import { ClassVisual } from '@/features/classes/components/ClassVisual';
import { LanguageSwitcher } from '@/shared/components/LanguageSwitcher';

export function ParentChildHero({
  student,
  homeroomClass,
  primaryTeacher,
  teachers = [],
  status = 'Đang theo học',
  schoolYear = '2026–2027',
  tabs = [],
  activeTab,
  onTabChange,
  isMobileMenuOpen,
  onToggleMobileMenu,
  onOpenLinkChildModal,
  onOpenActivitySheet,
  linkedAccounts = [],
  onSwitchAccount,
  onLogout,
  enrollments = [],
  selectedClassId,
  isHistorical = false,
  onSwitchClass,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [isTeacherModalOpen, setIsTeacherModalOpen] = React.useState(false);
  const studentName = student?.fullName || student?.name || t('common.student', 'Học sinh');
  const studentCode = student?.code || student?.studentCode || 'HS26001';
  const age = student?.age || '';
  const className = homeroomClass?.name || '';
  const cleanSchoolYear = (schoolYear || '').replace(/^Năm học\s*/i, '');

  // Dữ liệu thật từ database:
  // Toàn bộ giáo viên trong lớp đều là Giáo viên phụ trách (co-teachers).
  const staffList = React.useMemo(() => {
    if (Array.isArray(teachers) && teachers.length > 0) {
      return teachers.map((tItem, idx) => ({
        id: tItem.id || `teacher-${idx}`,
        name: tItem.fullName || tItem.name,
        roleBadge: t('parent.hero.inChargeTeacher', 'Giáo viên phụ trách'),
        phone: tItem.phone || null,
      }));
    }

    if (primaryTeacher?.fullName) {
      return [
        {
          id: primaryTeacher.id || 'primary-teacher',
          name: primaryTeacher.fullName,
          roleBadge: t('parent.hero.inChargeTeacher', 'Giáo viên phụ trách'),
          phone: primaryTeacher.phone || null,
        },
      ];
    }

    return [];
  }, [primaryTeacher, teachers, t]);

  const teacherName =
    staffList.length > 0
      ? staffList.map((s) => s.name).join(', ')
      : t('parent.hero.unassigned', 'Chưa phân công');

  const avatarUrl = getStudentAvatarUrl(
    student?.avatarUrl || student?.avatar,
    studentCode || studentName
  );

  return (
    <div
      className="w-full flex flex-col select-none"
      data-node-id="5288:24557"
      data-name="Parent Child · Profile Hero"
    >
      {/* 1. Personal Hero Banner (Figma 5288:24558) with Integrated Glass Utility Bar (Option A) */}
      <div className="w-full h-[155px] sm:h-[185px] border-b border-border bg-[#e2f1fe] dark:bg-blue-950/20 relative overflow-hidden flex flex-col justify-between select-none">
        {/* Lightweight CSS Grid Pattern */}
        <HeroGridPattern className="opacity-60" />

        {/* Center/Base Layer: Natural watercolor clouds and grid background */}
        <img
          src="/parent-hero-banner.png"
          alt=""
          className="absolute inset-0 size-full object-cover object-center pointer-events-none z-0"
        />

        {/* Left Layer: Sun & Grass (Anchored Left) */}
        <div className="absolute left-0 top-0 bottom-0 w-[48%] max-w-[420px] overflow-hidden pointer-events-none z-[1]">
          <img
            src="/parent-hero-banner.png"
            alt=""
            className="h-full w-auto max-w-none object-left object-contain"
            style={{
              maskImage: 'linear-gradient(to right, black 65%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to right, black 65%, transparent 100%)',
            }}
          />
        </div>

        {/* Right Layer: Mascot & Garden (Anchored Right - never clipped on any screen) */}
        <div className="absolute right-0 top-0 bottom-0 w-[58%] max-w-[620px] overflow-hidden pointer-events-none z-[1]">
          <img
            src="/parent-hero-banner.png"
            alt="Sorak Hero Mascot"
            className="h-full w-auto max-w-none absolute right-0 top-0 object-right object-contain"
            style={{
              maskImage: 'linear-gradient(to left, black 72%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to left, black 72%, transparent 100%)',
            }}
          />
        </div>

        {/* Top Integrated Floating Utility Bar (Option A: replaces standalone appbar) */}
        <div className="relative z-10 w-full bg-gradient-to-b from-white/85 via-white/45 to-transparent dark:from-black/75 dark:via-black/35 dark:to-transparent pointer-events-auto">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-3 w-full">
            {/* Left: Brand Logo & Mobile Trigger */}
            <div className="flex items-center gap-2">
              {onToggleMobileMenu && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={onToggleMobileMenu}
                  className="lg:hidden size-8 rounded-none border border-border bg-white/90 dark:bg-card/90 backdrop-blur-xs cursor-pointer shadow-2xs"
                  aria-label={t('parent.hero.openMenu', 'Mở menu')}
                >
                  {isMobileMenuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
                </Button>
              )}

              {/* Clean Brand Logo without box background */}
              <div
                onClick={() => navigate('/parent')}
                className="flex items-center gap-2 cursor-pointer py-1 select-none"
              >
                <img src="/logo.svg" alt="Sorak" className="w-[20px] h-[23px] block drop-shadow-2xs" />
                <div className="flex items-center gap-1.5 leading-none">
                  <span className="font-bold text-[14.5px] text-foreground tracking-tight">Sorak</span>
                  <span className="hidden sm:inline text-[12.5px] text-muted-foreground font-medium">
                    · {t('parent.schoolName', 'Trường Mầm non Hòn Tre')}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Actions & Child Switcher */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <LanguageSwitcher className="bg-white/60 dark:bg-card/60 border-white/60 dark:border-border/50 h-8 shadow-2xs rounded-none" />

              {onOpenActivitySheet && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={onOpenActivitySheet}
                  title={t('parent.hero.activityLogToday', 'Nhật ký hoạt động hôm nay')}
                  className="size-8 rounded-none border border-white/60 dark:border-border/50 bg-white/60 dark:bg-card/60 backdrop-blur-xs text-foreground cursor-pointer shadow-2xs hover:bg-white/60 hover:text-foreground"
                >
                  <Clock className="size-3.5" />
                </Button>
              )}

              <div className="rounded-none border border-white/60 dark:border-border/50 bg-white/60 dark:bg-card/60 backdrop-blur-xs shadow-2xs">
                <ParentNotificationPopover />
              </div>

              {/* Child Switcher Dropdown (Clean static trigger without hover animation) */}
              {onSwitchAccount && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="h-8 pl-1.5 pr-2.5 flex items-center gap-2 rounded-none border border-white/60 dark:border-border/50 bg-white/60 dark:bg-card/60 backdrop-blur-xs text-left cursor-pointer shadow-2xs"
                    >
                      <div className="size-5 rounded-none border border-border/80 bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                        <img src={avatarUrl} alt={studentName} className="size-full object-cover" />
                      </div>
                      <span className="hidden sm:inline text-[12px] font-medium text-foreground truncate max-w-[120px]">
                        {studentName}
                      </span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-[280px] p-2 rounded-none border border-border bg-white dark:bg-card shadow-2xl z-50 text-card-foreground"
                  >
                    {/* Header: Title & Context */}
                    <div className="px-2 py-1.5 flex items-center justify-between border-b border-border/60 pb-2 mb-1">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider font-mono">
                        {t('parent.hero.childrenProfiles', 'Hồ sơ các con')}
                      </span>
                      <span className="text-[10.5px] px-1.5 py-0.5 bg-muted text-muted-foreground font-medium">
                        {t('parent.hero.accountsCount', { count: linkedAccounts?.length || 1, defaultValue: `${linkedAccounts?.length || 1} tài khoản` })}
                      </span>
                    </div>

                    {/* Student Account List */}
                    <div className="flex flex-col gap-1 py-1">
                      {linkedAccounts?.length > 0 ? (
                        linkedAccounts.map((acc) => {
                          const isCurrent =
                            (student?.id && (acc.user?.id === student.id || acc.user?.student?.id === student.id)) ||
                            (studentCode && (acc.user?.student?.studentCode === studentCode || acc.user?.student?.code === studentCode || acc.user?.identifier === studentCode || acc.user?.username === studentCode));
                          const cName = acc.user?.student?.fullName || acc.user?.name || acc.user?.fullName || acc.user?.identifier;
                          const cCode = acc.user?.student?.studentCode || acc.user?.student?.code || acc.user?.identifier || '';
                          const cClass = acc.user?.student?.className || className || '';
                          const cAvatar = getStudentAvatarUrl(
                            acc.user?.student?.avatarUrl || acc.user?.avatarUrl,
                            cCode || cName
                          );

                          return (
                            <DropdownMenuItem
                              key={acc.user?.student?.studentCode || acc.user?.id || acc.user?.identifier}
                              onSelect={() => onSwitchAccount(acc.user)}
                              onClick={() => onSwitchAccount(acc.user)}
                              className={cn(
                                'flex items-center gap-2.5 p-2 cursor-pointer rounded-none transition-colors border',
                                isCurrent
                                  ? 'bg-blue-50/80 border-blue-200/80 text-foreground dark:bg-blue-950/40 dark:border-blue-900'
                                  : 'border-transparent hover:bg-muted/60 text-foreground',
                              )}
                            >
                              <div className="size-8 rounded-none border border-border/80 bg-muted overflow-hidden shrink-0">
                                <img src={cAvatar} alt={cName} className="size-full object-cover" />
                              </div>
                              <div className="flex flex-col min-w-0 flex-1">
                                <span className={cn('text-[12.5px] truncate leading-tight', isCurrent ? 'font-semibold text-[#1447e6] dark:text-blue-400' : 'font-medium')}>
                                  {cName}
                                </span>
                                <span className="text-[11px] text-muted-foreground font-mono truncate">
                                  {cCode} {cClass ? `· ${cClass}` : ''}
                                </span>
                              </div>
                              {isCurrent && (
                                <span className="size-2 rounded-full bg-[#1447e6] shrink-0" title={t('common.selected', 'Đang chọn')} />
                              )}
                            </DropdownMenuItem>
                          );
                        })
                      ) : (
                        <div className="flex items-center gap-2.5 p-2 rounded-none bg-blue-50/80 border border-blue-200/80 dark:bg-blue-950/40 dark:border-blue-900">
                          <div className="size-8 rounded-none border border-border/80 bg-muted overflow-hidden shrink-0">
                            <img src={avatarUrl} alt={studentName} className="size-full object-cover" />
                          </div>
                          <div className="flex flex-col min-w-0 flex-1">
                            <span className="text-[12.5px] font-semibold text-[#1447e6] dark:text-blue-400 truncate leading-tight">
                              {studentName}
                            </span>
                            <span className="text-[11px] text-muted-foreground font-mono truncate">
                              {studentCode} · {className}
                            </span>
                          </div>
                          <span className="size-2 rounded-full bg-[#1447e6] shrink-0" title={t('common.selected', 'Đang chọn')} />
                        </div>
                      )}
                    </div>

                    {/* Actions: Link other child (Clean without icon box) */}
                    {onOpenLinkChildModal && (
                      <>
                        <DropdownMenuSeparator className="my-1 border-t border-border/60" />
                        <DropdownMenuItem
                          onClick={onOpenLinkChildModal}
                          className="flex items-center px-3 py-2 text-[12.5px] cursor-pointer rounded-none hover:bg-muted/60 text-[#1447e6] dark:text-blue-400 font-medium transition-colors"
                        >
                          <span>{t('parent.hero.linkChildAccount', '+ Liên kết tài khoản con')}</span>
                        </DropdownMenuItem>
                      </>
                    )}

                    {/* Logout */}
                    {onLogout && (
                      <>
                        <DropdownMenuSeparator className="my-1 border-t border-border/60" />
                        <DropdownMenuItem
                          onClick={onLogout}
                          className="flex items-center px-3 py-2 text-[12.5px] cursor-pointer rounded-none text-muted-foreground hover:text-destructive hover:bg-destructive/10 font-medium transition-colors"
                        >
                          <LogOut className="size-3.5 mr-2" />
                          <span>{t('parent.hero.logout', 'Đăng xuất')}</span>
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Child Profile Strip (Figma 5288:24559) */}
      <div className="w-full border-b border-border bg-card shadow-xs">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5 flex flex-col md:flex-row md:items-center justify-between gap-5 w-full">
          {/* Left: Avatar + Identification */}
          <div className="flex items-center gap-4 sm:gap-5 min-w-0">
            {/* Avatar (overlapping banner) */}
            <div className="size-20 sm:size-24 rounded-none border-2 border-background bg-card overflow-hidden shrink-0 flex items-center justify-center font-bold text-2xl shadow-sm -mt-12 sm:-mt-14 relative z-10">
              <img
                src={avatarUrl}
                alt={studentName}
                className="size-full object-cover rounded-none"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = getStudentAvatarUrl(null, studentCode || studentName);
                }}
              />
            </div>

            {/* Child Name & Details */}
            <div className="flex flex-col gap-1 min-w-0">
              <h1 className="text-[20px] sm:text-[22px] font-semibold text-foreground tracking-tight leading-tight truncate">
                {studentName}
              </h1>
              <p className="text-[12.5px] text-muted-foreground font-normal truncate">
                <span className="font-mono font-medium text-foreground">{studentCode}</span> · {className} · {age}
              </p>
            </div>
          </div>

          {/* Right: Info Strip with 1px Borders */}
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-3 md:pt-0 border-t md:border-t-0 border-border/60">
            {/* Homeroom Teacher */}
            <div className="flex flex-col gap-1">
              <span className="text-[11px] text-muted-foreground font-normal">
                {t('parent.hero.inChargeTeacher', 'Giáo viên')}
              </span>
              <div className="h-8 flex items-center">
                <button
                  type="button"
                  onClick={() => setIsTeacherModalOpen(true)}
                  className="group inline-flex items-center gap-2 h-7.5 px-2.5 border border-border bg-background hover:bg-muted/70 transition-colors cursor-pointer rounded-none text-left select-none shadow-2xs"
                  title={t('parent.hero.viewTeacherInfo', 'Xem thông tin giáo viên lớp')}
                >
                  <span className="text-[12.5px] font-semibold text-foreground group-hover:text-primary transition-colors">
                    {teacherName}
                  </span>
                  <span className="text-border">|</span>
                  <Info className="size-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                </button>
              </div>
            </div>

            {/* 1px Vertical Separator */}
            <div className="hidden md:block w-px h-9 bg-border self-center" />

            {/* School Status */}
            <div className="flex flex-col gap-1">
              <span className="text-[11px] text-muted-foreground font-normal">
                {t('common.status', 'Tình trạng')}
              </span>
              <div className="h-8 flex items-center">
                <div
                  className={cn(
                    'inline-flex items-center px-2.5 h-7.5 border text-[12px] font-medium rounded-none select-none',
                    isHistorical
                      ? 'bg-amber-50/80 border-amber-200 text-amber-800 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300'
                      : 'bg-blue-50/80 border-blue-200 text-[#1447e6] dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-400',
                  )}
                >
                  <span>{status}</span>
                </div>
              </div>
            </div>

            {/* 1px Vertical Separator */}
            <div className="hidden md:block w-px h-9 bg-border self-center" />

            {/* School Year & Class Switcher */}
            <div className="flex flex-col gap-1">
              <span className="text-[11px] text-muted-foreground font-normal">
                {t('parent.hero.classAndYear', 'Lớp & Năm học')}
              </span>
              {enrollments && enrollments.length > 1 ? (
                <div className="h-8 flex items-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 px-3 h-8 border border-border bg-background hover:bg-muted/50 text-[13px] font-medium text-foreground cursor-pointer transition-colors shadow-2xs select-none"
                      >
                        <ClassVisual
                          grade={className}
                          size={22}
                          className="border border-border/80 shadow-2xs shrink-0"
                          alt={className}
                        />
                        <span className="font-semibold text-foreground tracking-tight">{className}</span>
                        <span className="text-[12px] text-muted-foreground font-normal font-mono">
                          ({String(schoolYear || '').replace(/^(Năm\s*học\s*)+/gi, '').trim() || '2026–2027'})
                        </span>
                        <ChevronDown className="size-3.5 text-muted-foreground ml-0.5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="w-[350px] p-2 rounded-none bg-popover border border-border shadow-xl select-none"
                    >
                      <div className="px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground tracking-wider uppercase flex items-center justify-between border-b border-border/60 mb-1">
                        <span>{t('parent.hero.classHistory', 'Lịch sử lớp học của bé')}</span>
                        <span className="text-[10px] text-muted-foreground font-normal">
                          {t('parent.hero.classesCount', { count: enrollments.length, defaultValue: `${enrollments.length} lớp học` })}
                        </span>
                      </div>

                      <div className="flex flex-col gap-1">
                        {enrollments.map((en) => {
                          const isSelected =
                            selectedClassId === en.classId || (!selectedClassId && en.isCurrent);
                          const cleanYear = String(en.schoolYear || '')
                            .replace(/^(Năm\s*học\s*)+/gi, '')
                            .trim();
                          const displayYear = cleanYear
                            ? `${t('schoolYear.title', 'Năm học')} ${cleanYear}`
                            : `${t('schoolYear.title', 'Năm học')} 2026–2027`;

                          return (
                            <DropdownMenuItem
                              key={en.classId}
                              onClick={() => onSwitchClass && onSwitchClass(en.classId)}
                              className={cn(
                                'flex items-center gap-3 p-2.5 rounded-none cursor-pointer transition-all border select-none',
                                isSelected
                                  ? 'bg-muted/80 text-foreground border-border/80 font-medium shadow-2xs'
                                  : 'border-transparent hover:bg-muted/40 text-foreground',
                              )}
                            >
                              <ClassVisual
                                grade={en.className || en.ageGroup}
                                size={38}
                                className="border border-border/80 shadow-2xs shrink-0"
                                alt={en.className}
                              />
                              <div className="flex flex-col min-w-0 flex-1 gap-0.5">
                                <span className="font-semibold text-[13.5px] text-foreground tracking-tight truncate">
                                  {en.className}
                                </span>
                                <span className="text-[11.5px] text-muted-foreground font-mono">
                                  {displayYear}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {en.isCurrent ? (
                                  <span className="text-[10.5px] font-medium px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
                                    {t('common.current', 'Hiện tại')}
                                  </span>
                                ) : (
                                  <span className="text-[10.5px] font-normal px-2 py-0.5 bg-muted text-muted-foreground border border-border whitespace-nowrap">
                                    {t('parent.hero.pastClass', 'Lớp cũ')}
                                  </span>
                                )}
                                <div className="w-4 flex items-center justify-center shrink-0">
                                  {isSelected && (
                                    <Check className="size-4 text-primary shrink-0" />
                                  )}
                                </div>
                              </div>
                            </DropdownMenuItem>
                          );
                        })}
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ) : (
                <div className="h-8 flex items-center">
                  <div className="inline-flex items-center gap-2 px-3 h-8 border border-border bg-background text-[13px] font-semibold text-foreground select-none">
                    <ClassVisual
                      grade={className}
                      size={22}
                      className="border border-border/80 shadow-2xs shrink-0"
                      alt={className}
                    />
                    <span>{className}</span>
                    <span className="text-[12px] text-muted-foreground font-normal font-mono">
                      ({String(schoolYear || '').replace(/^(Năm\s*học\s*)+/gi, '').trim() || '2026–2027'})
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Underline Navigation Tabs (Figma 5288:24771) */}
      {tabs.length > 0 && (
        <div
          className="w-full border-b border-border bg-card select-none shadow-2xs overflow-hidden"
          data-node-id="5288:24771"
          data-name="Parent Profile Navigation · Sorak Underline Tabs"
        >
          <div
            className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-1 overflow-x-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            onMouseDown={(e) => {
              // Prevent browser middle-click autoscroll icon from appearing
              if (e.button === 1) e.preventDefault();
            }}
          >
            {tabs.map((tab) => {
              let isActive = false;
              if (tab.exact) {
                isActive = location.pathname === tab.to;
              } else if (tab.to) {
                isActive = location.pathname === tab.to || location.pathname.startsWith(tab.to);
              } else {
                isActive = activeTab === tab.id;
              }

              const handleClick = () => {
                if (tab.to) {
                  const targetUrl = selectedClassId
                    ? `${tab.to}?classId=${selectedClassId}`
                    : tab.to;
                  navigate(targetUrl);
                }
                if (onTabChange) {
                  onTabChange(tab.id);
                }
              };

              return (
                <button
                  key={tab.id || tab.to}
                  type="button"
                  onClick={handleClick}
                  className={cn(
                    'px-4 py-2.5 text-[13.5px] sm:text-[14px] font-medium transition-colors cursor-pointer border-b-2 whitespace-nowrap rounded-none flex items-center gap-1.5 -mb-[1px]',
                    isActive
                      ? 'border-foreground text-foreground font-semibold'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border/60',
                  )}
                >
                  {tab.icon && <tab.icon className="size-3.5" />}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal: Thông tin Giáo viên lớp - Hiển thị gọn gàng: Tên, SĐT, Phân biệt Chủ nhiệm & Bảo mẫu */}
      {isTeacherModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setIsTeacherModalOpen(false)}
        >
          <div
            className="border border-border bg-card max-w-md w-full flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150 overflow-hidden cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div className="px-5 py-4 border-b border-border bg-card flex items-start justify-between gap-3 shrink-0">
              <div className="flex flex-col gap-0.5 min-w-0">
                <h3 className="text-[16px] font-bold text-foreground leading-snug">
                  {t('parent.hero.teachersModalTitle', 'Giáo viên lớp')}
                </h3>
                <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground font-normal">
                  <span className="font-medium text-foreground">{t('classes.class', 'Lớp')} {className}</span>
                  {cleanSchoolYear && (
                    <>
                      <span>•</span>
                      <span>{t('schoolYear.title', 'Năm học')} {cleanSchoolYear}</span>
                    </>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTeacherModalOpen(false)}
                className="size-7.5 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer transition-colors shrink-0"
                title={t('common.close', 'Đóng')}
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Body Modal: Danh sách giáo viên phụ trách */}
            <div className="p-4 sm:p-5 flex flex-col gap-2.5 overflow-y-auto max-h-[70vh]">
              {staffList.length > 0 ? (
                staffList.map((staff) => {
                  return (
                    <div
                      key={staff.id}
                      className="p-3 border border-border bg-muted/15 flex items-center justify-between gap-3"
                    >
                      <div className="flex flex-col gap-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-foreground text-[14px]">
                            {staff.name}
                          </span>
                        </div>

                        {staff.phone ? (
                          <a
                            href={`tel:${staff.phone}`}
                            className="inline-flex items-center gap-1.5 text-[12.5px] font-mono text-muted-foreground hover:text-primary transition-colors w-fit"
                          >
                            <Phone className="size-3.5 text-muted-foreground/70" />
                            <span>{staff.phone}</span>
                          </a>
                        ) : (
                          <span className="text-[12px] text-muted-foreground">{t('parent.hero.noPhone', 'Chưa có số điện thoại')}</span>
                        )}
                      </div>

                      {staff.phone && (
                        <a
                          href={`tel:${staff.phone}`}
                          className="size-8 flex items-center justify-center border border-border bg-background hover:bg-muted text-muted-foreground hover:text-primary transition-colors shrink-0"
                          title={`${t('common.call', 'Gọi cho')} ${staff.name}`}
                        >
                          <Phone className="size-3.5" />
                        </a>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="py-6 text-center text-muted-foreground text-[13px]">
                  {t('parent.hero.noTeachersAssigned', 'Lớp học hiện chưa có thông tin phân công giáo viên trong hệ thống.')}
                </div>
              )}
            </div>

            {/* Footer Modal */}
            <div className="px-5 py-3 border-t border-border bg-muted/10 flex justify-start shrink-0">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setIsTeacherModalOpen(false)}
                className="rounded-none text-[12.5px] h-8 px-4 cursor-pointer hover:bg-muted"
              >
                {t('common.close', 'Đóng')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
