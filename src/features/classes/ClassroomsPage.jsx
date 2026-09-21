import React, { useMemo, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Search01Icon,
  PlusSignIcon,
  FolderOpenIcon,
  ArrowUp01Icon,
  ArrowDown01Icon,
  Menu01Icon,
  DashboardSquare02Icon,
  Calendar03Icon,
} from '@hugeicons/core-free-icons';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/features/auth';
import { useAcademicYearStore } from '@/features/academic-years';
import { useClassesStore, findTeacherClassForYear } from './classes.store';
import { ClassVisual } from './components/ClassVisual';
import { ClassTable } from './components/ClassTable';
import { ClassDrawer } from './components/ClassDrawer';
import { DeleteClassModal } from './components/DeleteClassModal';
import { cn } from '@/shared/lib/utils';

export function ClassroomsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const user = useAuthStore((state) => state.user);
  const academicYears = useAcademicYearStore((state) => state.academicYears);
  const selectedYearId = useAcademicYearStore((state) => state.selectedYearId);
  const setSelectedYearId = useAcademicYearStore((state) => state.setSelectedYearId);
  const classes = useClassesStore((state) => state.classes);
  const isLoading = useClassesStore((state) => state.isLoading);
  const isTeacher =
    user?.role === 'TEACHER_GV' ||
    user?.role === 'TEACHER' ||
    user?.role?.toLowerCase()?.includes('teacher');

  const searchQuery = useClassesStore((state) => state.searchQuery);
  const setSearchQuery = useClassesStore((state) => state.setSearchQuery);
  const viewMode = useClassesStore((state) => state.viewMode);
  const setViewMode = useClassesStore((state) => state.setViewMode);
  const collapsedGrades = useClassesStore((state) => state.collapsedGrades);
  const toggleGradeCollapse = useClassesStore(
    (state) => state.toggleGradeCollapse,
  );
  const attachClass = useClassesStore((state) => state.attachClass);
  const openAddModal = useClassesStore((state) => state.openAddModal);
  const fetchClasses = useClassesStore((state) => state.fetchClasses);

  useEffect(() => {
    if (selectedYearId) {
      fetchClasses(selectedYearId);
    } else {
      fetchClasses();
    }
  }, [selectedYearId, fetchClasses]);

  const hasYearClasses =
    !selectedYearId ||
    classes.length === 0 ||
    classes.some((c) => String(c.schoolYearId) === String(selectedYearId));

  if (isTeacher) {
    if (isLoading || (!hasYearClasses && classes.length > 0)) {
      return (
        <div className="p-12 text-center text-muted-foreground select-none">
          <p className="text-[14px]">{t('common.loading', 'Đang tải thông tin lớp học...')}</p>
        </div>
      );
    }

    const myClass = findTeacherClassForYear(user, classes, selectedYearId);
    if (myClass) {
      return <Navigate to={`/classes/${myClass.id || myClass.publicId}`} replace />;
    }

    const currentYearObj =
      academicYears.find(
        (y) =>
          String(y.id) === String(selectedYearId) ||
          (selectedYearId === '2026-2027' && (String(y.id) === '1' || y.name?.includes('2026'))),
      ) ||
      academicYears.find((y) => y.active) ||
      {};

    const activeYearObj =
      academicYears.find((y) => y.active || y.status === 'ACTIVE') ||
      academicYears[0];

    const isCurrentActive =
      currentYearObj?.id &&
      activeYearObj?.id &&
      String(currentYearObj.id) === String(activeYearObj.id);

    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center p-6 sm:p-12 text-foreground select-none">
        <div className="flex flex-col items-center text-center max-w-[420px]">
          {/* Minimal Neutral Icon */}
          <div className="w-11 h-11 border border-border bg-muted/40 flex items-center justify-center mb-4 text-muted-foreground">
            <HugeiconsIcon icon={Calendar03Icon} size={20} />
          </div>

          {/* Clean Heading */}
          <h2 className="text-[16px] font-medium text-foreground tracking-tight mb-1.5">
            {t('classes.teacherNoClassTitle', 'Chưa có phân công lớp học')}
          </h2>

          {/* Simple Description */}
          <p className="text-[13px] text-muted-foreground leading-relaxed mb-5">
            Không có lớp phụ trách trong{' '}
            <span className="text-foreground font-medium">
              {currentYearObj?.name || 'năm học này'}
            </span>
            .
          </p>

          {/* Subtle Action Button */}
          {!isCurrentActive && activeYearObj && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSelectedYearId(String(activeYearObj.id));
                fetchClasses(String(activeYearObj.id));
              }}
              className="h-8 px-3.5 text-[12.5px] font-normal border-border rounded-none cursor-pointer flex items-center gap-1.5 hover:bg-muted/60 text-foreground shadow-none"
            >
              <HugeiconsIcon icon={Calendar03Icon} size={14} className="text-muted-foreground" />
              <span>
                {t('classes.backToCurrentYear', 'Về năm học hiện tại')}
                {activeYearObj.name ? ` (${activeYearObj.name.replace(/^[^\d]*/, '')})` : ''}
              </span>
            </Button>
          )}
        </div>
      </div>
    );
  }


  // Group definitions in fixed pedagogical order
  const gradeGroups = useMemo(
    () => [
      { key: 'nhatre', label: t('curriculum.gradeNhaTre', 'Khối Nhà trẻ') },
      { key: 'mam', label: t('curriculum.gradeMam', 'Khối Mầm') },
      { key: 'choi', label: t('curriculum.gradeChoi', 'Khối Chồi') },
      { key: 'la', label: t('curriculum.gradeLa', 'Khối Lá') },
    ],
    [t],
  );

  // Filtered classes by search
  const filteredClasses = useMemo(() => {
    if (!searchQuery.trim()) return classes;
    const query = searchQuery.toLowerCase();
    return classes.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.teacher.toLowerCase().includes(query) ||
        c.room.toLowerCase().includes(query) ||
        c.gradeLabel.toLowerCase().includes(query),
    );
  }, [classes, searchQuery]);

  const handleCardClick = (cls) => {
    attachClass(cls.id);
    navigate(`/classes/${cls.id}`);
  };

  return (
    <div
      className="w-full flex-1 flex flex-col gap-6 max-w-[1300px] mx-auto text-foreground select-none pb-12"
      data-node-id="4606:7733"
      data-name="Class & Teacher"
    >
      {/* Page Header (Consistent with TeachersPage & AccountsPage) */}
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        data-node-id="4607:7587"
        data-name="Page Header · Classrooms"
      >
        <div className="flex flex-col gap-1">
          <h1 className="text-[26px] font-semibold text-foreground tracking-tight">
            {t('classes.title', 'Lớp học')}
          </h1>
          <p className="text-[12px] text-muted-foreground font-normal">
            {t(
              'classes.subtitle',
              'Quản lý danh sách lớp học và phân công giáo viên',
            )}
          </p>
        </div>

        {/* Toolbar: Search, View Mode Switcher & Add Class button */}
        <div
          className="flex items-center gap-2 flex-wrap sm:flex-nowrap"
          data-node-id="4607:7591"
          data-name="Classrooms Toolbar"
        >
          {/* Search Input */}
          <div className="relative w-[260px] h-8">
            <HugeiconsIcon
              icon={Search01Icon}
              size={15}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('classes.searchPlaceholder', 'Tìm kiếm lớp học...')}
              className="h-8 pl-8 pr-2.5 text-[13px] bg-background border-border rounded-none shadow-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          {/* View Mode Switcher (Matching TeachersPage & AccountsPage) */}
          <div className="flex items-center border border-border bg-card rounded-none overflow-hidden h-8">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              title={t('common.gridView', 'Dạng lưới (Khối lớp)')}
              className={cn(
                'size-8 flex items-center justify-center transition-colors cursor-pointer border-r border-border',
                viewMode === 'grid'
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
              )}
              data-name="Grid View"
            >
              <HugeiconsIcon icon={DashboardSquare02Icon} size={15} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              title={t('common.listView', 'Dạng bảng')}
              className={cn(
                'size-8 flex items-center justify-center transition-colors cursor-pointer',
                viewMode === 'table'
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
              )}
              data-name="Table View"
            >
              <HugeiconsIcon icon={Menu01Icon} size={15} />
            </button>
          </div>

          {/* Add Class Button */}
          <Button
            type="button"
            onClick={openAddModal}
            className="h-8 px-3 text-[13px] font-medium bg-[#1447e6] hover:bg-[#1447e6]/90 text-white rounded-none shadow-none cursor-pointer flex items-center gap-1.5"
            data-node-id="4607:7602"
            data-name="Button · Thêm lớp học"
          >
            <HugeiconsIcon icon={PlusSignIcon} size={15} />
            <span>{t('classes.addClass', 'Thêm lớp học')}</span>
          </Button>
        </div>
      </div>

      {/* Section List Header: "Danh sách lớp học" & count */}
      <div
        className="flex items-center justify-between pt-1"
        data-node-id="4607:7608"
        data-name="Classrooms List Header"
      >
        <h2 className="text-[16px] font-semibold text-foreground">
          {t('classes.listHeader', 'Danh sách lớp học')}
        </h2>
        <span className="text-[13px] text-muted-foreground font-normal">
          {filteredClasses.length} {t('classes.classesSuffix', 'lớp')}
        </span>
      </div>

      {/* Content View: Table View or Grid View */}
      {viewMode === 'table' ? (
        <ClassTable classes={filteredClasses} />
      ) : (
        /* Grade Groups Container (Figma FE-05 Grid View) */
      <div className="flex flex-col gap-6">
        {gradeGroups.map((group) => {
          const groupClasses = filteredClasses.filter(
            (c) => c.grade === group.key,
          );
          const isCollapsed = !!collapsedGrades[group.key];

          // If searching and this group has 0 matches, hide it
          if (searchQuery.trim() && groupClasses.length === 0) {
            return null;
          }

          return (
            <div
              key={group.key}
              className="flex flex-col gap-3"
              data-node-id={`group-${group.key}`}
              data-name={`Group · ${group.label}`}
            >
              {/* Collapsible Header */}
              <button
                type="button"
                onClick={() => toggleGradeCollapse(group.key)}
                className="flex items-center justify-between py-1 px-1 -mx-1 hover:bg-muted/40 transition-colors text-left cursor-pointer rounded-none group/hdr"
                data-name={`Collapsible Header · ${group.label}`}
              >
                <div className="flex items-center gap-2">
                  <HugeiconsIcon
                    icon={FolderOpenIcon}
                    size={16}
                    className="text-muted-foreground group-hover/hdr:text-foreground transition-colors"
                  />
                  <span className="text-[14px] font-medium text-foreground">
                    {group.label}
                  </span>
                  <span className="text-[13px] text-muted-foreground font-normal">
                    · {groupClasses.length} {t('classes.classesSuffix', 'lớp')}
                  </span>
                </div>

                <div className="text-muted-foreground group-hover/hdr:text-foreground transition-colors pr-1">
                  <HugeiconsIcon
                    icon={isCollapsed ? ArrowDown01Icon : ArrowUp01Icon}
                    size={15}
                  />
                </div>
              </button>

              {/* Class Cards Grid */}
              {!isCollapsed && (
                <div
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5"
                  data-name={`Class Grid · ${group.label}`}
                >
                  {groupClasses.map((cls) => (
                    <div
                      key={cls.id}
                      onClick={() => handleCardClick(cls)}
                      className="border border-border bg-card hover:border-primary/50 transition-all cursor-pointer rounded-none overflow-hidden group shadow-2xs flex flex-col justify-between"
                      data-node-id={`card-${cls.id}`}
                      data-name={`Card · ${cls.name}`}
                    >
                      {/* Card Header: Name + Teacher */}
                      <div className="h-[46px] px-4 border-b border-border/60 flex flex-col justify-center">
                        <span className="text-[14px] font-medium text-foreground group-hover:text-primary transition-colors truncate">
                          {cls.name}
                        </span>
                        <span className="text-[12px] text-muted-foreground truncate">
                          {cls.teacher === 'Chưa phân công' || !cls.teacher
                            ? t('classes.unassigned', 'Chưa phân công')
                            : cls.teacher}
                        </span>
                      </div>

                      {/* Card Content: Planet Visual + Meta */}
                      <div className="h-[76px] px-4 flex items-center gap-3.5">
                        <ClassVisual
                          color={cls.color}
                          grade={cls.grade || cls.ageGroup}
                          src={cls.avatarUrl}
                          size={48}
                          className="border border-border/80 group-hover:scale-105 transition-transform"
                          alt={cls.name}
                        />
                        <div className="flex flex-col min-w-0 leading-tight">
                          <span className="text-[13px] text-foreground font-normal">
                            {cls.studentCount} {t('classes.studentsSuffix', 'học sinh')}
                          </span>
                          <span className="text-[12px] text-muted-foreground mt-0.5">
                            {cls.room ? cls.room.replace(/^Phòng /i, t('classes.roomPrefix', 'Room') + ' ') : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {filteredClasses.length === 0 && (
          <div className="p-12 text-center text-muted-foreground border border-border bg-card rounded-none">
            <p className="text-[14px]">
              {t('classes.noClassMatch', 'Không tìm thấy lớp học nào phù hợp với từ khóa.')}
            </p>
          </div>
        )}
      </div>
      )}

      {/* Drawers & Modals */}
      <ClassDrawer />
      <DeleteClassModal />
    </div>
  );
}
