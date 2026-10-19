import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Search01Icon,
  UnfoldMoreIcon,
  Cancel01Icon,
  Tick02Icon,
  Settings01Icon,
} from '@hugeicons/core-free-icons';
import { useClassesStore, sortClassesByGrade, findTeacherClassesForYear } from '../classes.store';
import { useAuthStore } from '@/features/auth';
import { useAcademicYearStore } from '@/features/academic-years';
import { ClassVisual } from './ClassVisual';
import { cn } from '@/shared/lib/utils';

export function ClassCommandMenu() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const menuRef = useRef(null);

  const user = useAuthStore((state) => state.user);
  const selectedYearId = useAcademicYearStore((state) => state.selectedYearId);
  const isTeacher =
    user?.role === 'TEACHER_GV' ||
    user?.role === 'TEACHER' ||
    user?.role?.toLowerCase()?.includes('teacher');

  const classes = useClassesStore((state) => state.classes) || [];
  const attachedClassId = useClassesStore((state) => state.attachedClassId);
  const isCommandMenuOpen = useClassesStore((state) => state.isCommandMenuOpen);
  const setCommandMenuOpen = useClassesStore(
    (state) => state.setCommandMenuOpen,
  );
  const attachClass = useClassesStore((state) => state.attachClass);
  const detachClass = useClassesStore((state) => state.detachClass);

  const [search, setSearch] = useState('');

  const location = useLocation();
  const classIdMatch = location.pathname.match(/\/classes\/([^/]+)/);
  const routeClassId = classIdMatch ? classIdMatch[1] : null;
  const activeClassId = routeClassId || attachedClassId;

  // Teachers are strictly restricted to their own classes
  const teacherClasses = isTeacher ? findTeacherClassesForYear(user, classes, selectedYearId) : classes;
  const poolClasses = isTeacher && teacherClasses.length > 0 ? teacherClasses : classes;

  const currentClass =
    poolClasses.find((c) => c.id === activeClassId || c.publicId === activeClassId) ||
    poolClasses.find((c) => c.id === attachedClassId || c.publicId === attachedClassId) ||
    poolClasses[0];

  useEffect(() => {
    if (routeClassId && attachedClassId !== routeClassId) {
      attachClass(routeClassId);
    }
  }, [routeClassId, attachedClassId, attachClass]);

  // Sort classes in fixed pedagogical progression: Nhà trẻ -> Mầm -> Chồi -> Lá
  const filteredClasses = sortClassesByGrade(
    poolClasses.filter(
      (c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.gradeLabel.toLowerCase().includes(search.toLowerCase()),
    ),
  );

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setCommandMenuOpen(false);
      }
    }
    if (isCommandMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCommandMenuOpen, setCommandMenuOpen]);

  // Handle escape key
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setCommandMenuOpen(false);
      }
    }
    if (isCommandMenuOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCommandMenuOpen, setCommandMenuOpen]);

  const handleSelectClass = (cls) => {
    attachClass(cls.id);
    if (location.pathname.includes('/settings')) {
      navigate(`/classes/${cls.id}/settings${location.search}`);
    } else if (location.pathname.includes('/assessment')) {
      navigate(`/classes/${cls.id}/assessment${location.search}`);
    } else if (location.pathname.includes('/planning')) {
      navigate(`/classes/${cls.id}/planning${location.search}`);
    } else if (location.pathname.includes('/reports')) {
      navigate(`/classes/${cls.id}/reports`);
    } else if (location.pathname.includes('/attendance')) {
      navigate(`/classes/${cls.id}/attendance`);
    } else if (location.pathname.includes('/health')) {
      navigate(`/classes/${cls.id}/health`);
    } else if (location.pathname.includes('/good-behavior')) {
      navigate(`/classes/${cls.id}/good-behavior`);
    } else {
      navigate(`/classes/${cls.id}`);
    }
    setCommandMenuOpen(false);
  };

  const handleDetach = (e) => {
    e.stopPropagation();
    detachClass();
    navigate('/classes');
  };

  if (isTeacher) {
    return (
      <div className="inline-flex items-center border border-border bg-muted/60 h-7 px-2.5 rounded-none text-[13px] font-medium text-foreground select-none">
        <span>{currentClass?.name || t('classes.class', 'Lớp học')}</span>
      </div>
    );
  }

  return (
    <div className="relative inline-flex items-center" ref={menuRef}>
      {/* Breadcrumb Trigger Button */}
      <div className="group inline-flex items-center border border-border bg-background hover:bg-muted/70 transition-colors h-7 px-2 gap-1 rounded-none text-[13px] font-normal text-foreground">
        <button
          type="button"
          onClick={() => setCommandMenuOpen(!isCommandMenuOpen)}
          className="inline-flex items-center gap-1 cursor-pointer outline-none focus:outline-none"
          title={t('classes.switchClass', 'Chuyển lớp học')}
          data-node-id="4631:8165"
          data-name="Class Switcher Trigger"
        >
          <span className="font-medium">{currentClass?.name || 'Chọn lớp'}</span>
          {(!isTeacher || teacherClasses.length > 1) && (
            <HugeiconsIcon
              icon={UnfoldMoreIcon}
              size={14}
              className="text-muted-foreground"
            />
          )}
        </button>

        {/* Detach [x] separator and button - shown on hover only for BGH */}
        {!isTeacher && (
          <div className="hidden group-hover:flex items-center ml-0.5">
            <div className="h-3 w-px bg-border mr-1" />
            <button
              type="button"
              onClick={handleDetach}
              className="size-4 rounded-none flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
              title={t('classes.detachClass', 'Gỡ gắn lớp & về danh sách')}
              data-node-id="4631:8175"
              data-name="Detach Class Button"
            >
              <HugeiconsIcon icon={Cancel01Icon} size={12} />
            </button>
          </div>
        )}
      </div>

      {/* FE-05C: Command Menu Dropdown */}
      {isCommandMenuOpen && (
        <div
          className="absolute top-full left-0 mt-1.5 w-[320px] sm:w-[380px] bg-card border border-border shadow-xl z-50 rounded-none overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100"
          data-node-id="4631:8307"
          data-name="FE-05C · Class Command Menu · Open"
        >
          {/* Search Bar with Esc shortcut badge */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-background">
            <HugeiconsIcon
              icon={Search01Icon}
              size={15}
              className="text-muted-foreground shrink-0"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('classes.searchClassPlaceholder', 'Tìm lớp học...')}
              autoFocus
              className="flex-1 bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground outline-none border-0 focus:outline-none focus:border-0 focus:ring-0 shadow-none"
            />
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground bg-muted border border-border rounded-none">
              Esc
            </kbd>
          </div>

          {/* Classes List */}
          <div className="max-h-[280px] overflow-y-auto p-1 divide-y divide-border/30">
            {filteredClasses.length === 0 ? (
              <div className="p-4 text-center text-[13px] text-muted-foreground">
                {t('classes.noClassFound', 'Không tìm thấy lớp học phù hợp.')}
              </div>
            ) : (
              filteredClasses.map((cls) => {
                const isSelected = cls.id === currentClass?.id;
                return (
                  <button
                    key={cls.id}
                    type="button"
                    onClick={() => handleSelectClass(cls)}
                    className={cn(
                      'w-full flex items-center gap-3 px-2.5 py-2 text-left rounded-none transition-colors cursor-pointer text-[13px]',
                      isSelected
                        ? 'bg-muted text-foreground font-medium'
                        : 'hover:bg-muted/60 text-foreground',
                    )}
                  >
                    <ClassVisual
                      color={cls.color}
                      grade={cls.grade || cls.ageGroup}
                      src={cls.avatarUrl}
                      size={28}
                      className="border border-border/60"
                    />
                    <div className="flex flex-col min-w-0 flex-1 leading-tight">
                      <span className="truncate">{cls.name}</span>
                      <span className="text-[11px] text-muted-foreground truncate">
                        {cls.gradeLabel}{cls.room ? ` · ${cls.room}` : ''} · {cls.studentCount ?? 0} {t('classes.studentsUnit', 'học sinh')}
                      </span>
                    </div>
                    {isSelected && (
                      <HugeiconsIcon
                        icon={Tick02Icon}
                        size={15}
                        className="text-primary shrink-0"
                      />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer Actions: Cài đặt lớp */}
          {currentClass && (
            <div className="border-t border-border p-1 bg-muted/20 flex flex-col gap-0.5">
              <button
                type="button"
                onClick={() => {
                  setCommandMenuOpen(false);
                  navigate(`/classes/${currentClass.id}/settings`);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[13px] font-normal text-foreground hover:bg-muted transition-colors cursor-pointer rounded-none"
              >
                <HugeiconsIcon icon={Settings01Icon} size={15} className="text-muted-foreground" />
                <span>{t('classes.classProfile', 'Quản lý lớp')}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
