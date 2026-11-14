import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Search01Icon,
  UnfoldMoreIcon,
  Calendar03Icon,
  ArrowRight01Icon,
} from '@hugeicons/core-free-icons';
import { toast } from 'sonner';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
import { useAcademicYearStore, AcademicYearGlassEmblem } from '@/features/academic-years';
import { useClassesStore, findTeacherClassForYear } from '@/features/classes';
import { useAuthStore } from '@/features/auth';
import { cn } from '@/shared/utils';

export function AcademicYearSwitcher({ sidebarCollapsed }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const user = useAuthStore((state) => state.user);
  const isTeacher =
    user?.role === 'TEACHER_GV' ||
    user?.role === 'TEACHER' ||
    user?.role?.toLowerCase()?.includes('teacher');

  const academicYears = useAcademicYearStore((state) => state.academicYears);
  const selectedYearId = useAcademicYearStore((state) => state.selectedYearId);
  const setSelectedYearId = useAcademicYearStore((state) => state.setSelectedYearId);
  const fetchClasses = useClassesStore((state) => state.fetchClasses);

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

  const getYearName = (y) => {
    if (!y || (!y.id && !y.name)) return t('common.loading', 'Đang tải...');
    const raw = y.name || y.range || '';
    const prefix = t('schoolYear.title', 'School Year');
    if (/^(Năm học|Niên khóa|School Year)\s*/i.test(raw)) {
      return raw.replace(/^(Năm học|Niên khóa|School Year)\s*/i, `${prefix} `);
    }
    if (/^\d{4}/.test(raw)) {
      return `${prefix} ${raw}`;
    }
    return raw;
  };
  const getYearStatus = (y) => {
    if (!y || !y.id) return '';
    return y.active ? t('schoolYear.active') : t('schoolYear.ended');
  };

  const filteredYears = useMemo(() => {
    if (!searchQuery.trim()) return academicYears;
    return academicYears.filter((y) => {
      const name = getYearName(y);
      return name.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [academicYears, searchQuery, t]);

  const handleSelectYear = async (year) => {
    const targetYearId = String(year.id);
    setPopoverOpen(false);
    toast.info(t('schoolYear.toastSelected', 'Đã chuyển năm học'), {
      description: t('schoolYear.toastSelectedDesc', {
        name: getYearName(year),
      }),
    });

    if (!isTeacher) {
      setSelectedYearId(targetYearId);
      navigate('/classes');
      fetchClasses(targetYearId);
      return;
    }

    const yearClasses = await fetchClasses(targetYearId);
    setSelectedYearId(targetYearId);
    const myClass = findTeacherClassForYear(user, yearClasses, targetYearId);
    if (myClass) {
      navigate(`/classes/${myClass.id || myClass.publicId}`);
    } else {
      navigate('/classes');
    }
  };

  const handleGoToManagement = () => {
    setPopoverOpen(false);
    navigate('/school-years?view=all');
  };

  return (
    <div>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              'flex items-center gap-2 p-2 hover:bg-muted/50 transition-all text-left w-full cursor-pointer rounded-none',
              sidebarCollapsed ? 'justify-center p-1' : '',
            )}
            title={getYearName(selectedYear)}
            data-node-id="4072:1782"
          >
            {/* Glass Emblem 32x32 */}
            <AcademicYearGlassEmblem
              theme={selectedYear.colorTheme}
              size={32}
              avatarUrl={selectedYear.avatarUrl}
              year={selectedYear}
              alt={getYearName(selectedYear)}
            />

            {!sidebarCollapsed && (
              <div className="flex flex-1 flex-col min-w-0 pr-1">
                <span className="text-[14px] font-medium text-foreground truncate">
                  {getYearName(selectedYear)}
                </span>
                <span className="text-[12px] text-muted-foreground truncate">
                  {getYearStatus(selectedYear)}
                </span>
              </div>
            )}

            {!sidebarCollapsed && (
              <HugeiconsIcon
                icon={UnfoldMoreIcon}
                size={16}
                className="text-muted-foreground shrink-0"
              />
            )}
          </button>
        </PopoverTrigger>

        <PopoverContent
          side="right"
          align="start"
          sideOffset={6}
          alignOffset={-4}
          className="w-[380px] p-2 bg-card border border-border shadow-xl rounded-none z-50 text-foreground"
          data-node-id="4130:2042"
        >
          {/* Search Bar matching Figma frame 4130:2042 */}
          <div className="relative mb-2">
            <HugeiconsIcon
              icon={Search01Icon}
              size={16}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              placeholder={t('schoolYear.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-8 pr-10 text-[13px] bg-background rounded-none border border-border placeholder:text-muted-foreground/70 focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground bg-muted border border-border/70 px-1.5 py-0.5 rounded-none">
              Esc
            </span>
          </div>

          {/* List of Academic Years with Glass Art */}
          <div className="space-y-1 max-h-56 overflow-y-auto">
            {filteredYears.map((year) => (
              <button
                key={year.id}
                type="button"
                onClick={() => handleSelectYear(year)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-2 py-1.5 rounded-none text-left text-[14px] transition-colors cursor-pointer',
                  String(selectedYear.id) === String(year.id)
                    ? 'bg-[#f5f5f5] dark:bg-muted text-foreground font-medium'
                    : 'hover:bg-muted/50 text-foreground/80',
                )}
              >
                <AcademicYearGlassEmblem
                  theme={year.colorTheme}
                  size={32}
                  avatarUrl={year.avatarUrl}
                  year={year}
                  alt={getYearName(year)}
                />
                <span className="flex-1 truncate">{getYearName(year)}</span>
              </button>
            ))}
          </div>

          {!isTeacher && (
            <div className="pt-2 mt-2 border-t border-border">
              <button
                type="button"
                onClick={handleGoToManagement}
                className="w-full flex items-center justify-between px-2 py-1.5 text-[14px] text-foreground font-normal hover:bg-muted/50 rounded-none transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <HugeiconsIcon
                    icon={Calendar03Icon}
                    size={16}
                    className="text-muted-foreground group-hover:text-foreground transition-colors"
                  />
                  <span>{t('schoolYear.manageYears')}</span>
                </div>
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  size={14}
                  className="text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all"
                />
              </button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
