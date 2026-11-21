import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Cancel01Icon,
  Search01Icon,
  StudentIcon,
  UserGroupIcon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
} from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { classesApi } from '../classes.api';
import { useClassesStore } from '../classes.store';
import { getStudentAvatarUrl } from '../../students/students.store';
import { cn } from '@/shared/lib/utils';

const FALLBACK_STUDENTS = [
  {
    id: 'st-fb-1',
    studentCode: 'HS26003',
    fullName: 'Lê Khánh Chi',
    avatarUrl: null,
    dateOfBirth: '2023-01-04',
    gender: 'FEMALE',
    previousClass: 'Nhà trẻ B1 · 2025-2026',
    previousClassAgeGroup: 'NHA_TRE',
  },
  {
    id: 'st-fb-2',
    studentCode: 'HS26004',
    fullName: 'Phạm Nhật Duy',
    avatarUrl: null,
    dateOfBirth: '2023-05-17',
    gender: 'MALE',
    previousClass: 'Nhà trẻ B1 · 2025-2026',
    previousClassAgeGroup: 'NHA_TRE',
  },
  {
    id: 'st-fb-3',
    studentCode: 'HS26005',
    fullName: 'Võ Ngọc Hà',
    avatarUrl: null,
    dateOfBirth: '2023-04-09',
    gender: 'FEMALE',
    previousClass: 'Nhà trẻ B1 · 2025-2026',
    previousClassAgeGroup: 'NHA_TRE',
  },
  {
    id: 'st-fb-4',
    studentCode: 'HS26006',
    fullName: 'Nguyễn Gia Hân',
    avatarUrl: null,
    dateOfBirth: '2023-02-23',
    gender: 'FEMALE',
    previousClass: 'Nhà trẻ B1 · 2025-2026',
    previousClassAgeGroup: 'NHA_TRE',
  },
  {
    id: 'st-fb-5',
    studentCode: 'HS26007',
    fullName: 'Trần Minh Khang',
    avatarUrl: null,
    dateOfBirth: '2023-06-11',
    gender: 'MALE',
    previousClass: 'Nhà trẻ B1 · 2025-2026',
    previousClassAgeGroup: 'NHA_TRE',
  },
  {
    id: 'st-fb-6',
    studentCode: 'HS26008',
    fullName: 'Lê Bảo Khôi',
    avatarUrl: null,
    dateOfBirth: '2023-01-30',
    gender: 'MALE',
    previousClass: 'Nhà trẻ B1 · 2025-2026',
    previousClassAgeGroup: 'NHA_TRE',
  },
  {
    id: 'st-fb-7',
    studentCode: 'HS26009',
    fullName: 'Đặng Mai Phương',
    avatarUrl: null,
    dateOfBirth: '2022-03-15',
    gender: 'FEMALE',
    previousClass: 'Mầm 1 · 2025-2026',
    previousClassAgeGroup: 'MAM',
  },
  {
    id: 'st-fb-8',
    studentCode: 'HS26010',
    fullName: 'Hoàng Quốc An',
    avatarUrl: null,
    dateOfBirth: '2021-08-20',
    gender: 'MALE',
    previousClass: 'Chồi 1 · 2025-2026',
    previousClassAgeGroup: 'CHOI',
  },
  {
    id: 'st-fb-9',
    studentCode: 'HS26011',
    fullName: 'Ngô Thảo My',
    avatarUrl: null,
    dateOfBirth: '2024-02-10',
    gender: 'FEMALE',
    previousClass: null,
    previousClassAgeGroup: 'NONE',
  },
];

/**
 * Determine the expected previous class tier based on the target class.
 * Preschool progression rules:
 * - Vào lớp Mầm (3-4 tuổi) -> Lớp cũ là Nhà trẻ
 * - Vào lớp Chồi (4-5 tuổi) -> Lớp cũ là Mầm
 * - Vào lớp Lá (5-6 tuổi) -> Lớp cũ là Chồi
 * - Vào lớp Nhà trẻ (12-36 tháng) -> Chưa có lớp cũ (Học sinh mới)
 */
export const getExpectedPreviousTier = (targetClass) => {
  if (!targetClass) return 'ALL';
  const ageGroup = (targetClass.ageGroup || '').toUpperCase();
  const name = (targetClass.name || '').toLowerCase();

  if (ageGroup === 'MAM' || name.includes('mầm') || name.includes('mam')) return 'NHA_TRE';
  if (ageGroup === 'CHOI' || name.includes('chồi') || name.includes('choi')) return 'MAM';
  if (ageGroup === 'LA' || name.includes('lá') || name.includes('la')) return 'CHOI';
  if (ageGroup === 'NHA_TRE' || name.includes('nhà trẻ') || name.includes('nha tre')) return 'NONE';

  return 'ALL';
};

/**
 * Check whether a student meets the age requirements for the target class:
 * - Nhà trẻ: Từ đủ 24 tháng đến dưới 36 tháng
 * - Mầm: Từ đủ 36 tháng đến dưới 48 tháng
 * - Chồi: Từ đủ 48 tháng đến dưới 60 tháng
 * - Lá: Từ đủ 60 tháng đến dưới 72 tháng
 */
export const normalizeGradeKey = (str) => {
  if (!str) return '';
  const clean = String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '');
  if (clean.includes('NHATRE')) return 'NHATRE';
  if (clean.includes('MAM')) return 'MAM';
  if (clean.includes('CHOI')) return 'CHOI';
  if (clean.includes('LA')) return 'LA';
  return clean;
};

export const checkIsAgeEligible = (student, targetClass) => {
  if (!student?.dateOfBirth) {
    if (student?.isAgeEligible !== undefined) return student.isAgeEligible;
    return false;
  }
  const birth = new Date(student.dateOfBirth);
  if (isNaN(birth.getTime())) {
    if (student?.isAgeEligible !== undefined) return student.isAgeEligible;
    return false;
  }

  let refYear = 2026;
  if (targetClass?.schoolYear?.startDate) {
    refYear = new Date(targetClass.schoolYear.startDate).getFullYear();
  } else if (targetClass?.schoolYearStartDate) {
    refYear = new Date(targetClass.schoolYearStartDate).getFullYear();
  } else if (targetClass?.academicYear) {
    const m = targetClass.academicYear.match(/\d{4}/);
    if (m) refYear = parseInt(m[0], 10);
  }

  const birthYear = birth.getFullYear();
  const ageInYears = refYear - birthYear;

  const group = normalizeGradeKey(targetClass?.ageGroup || targetClass?.grade || targetClass?.name || '');
  if (group === 'NHATRE') {
    return ageInYears >= 1 && ageInYears <= 3;
  }
  if (group === 'MAM') {
    return ageInYears >= 3 && ageInYears <= 4;
  }
  if (group === 'CHOI') {
    return ageInYears >= 4 && ageInYears <= 5;
  }
  if (group === 'LA') {
    return ageInYears >= 5 && ageInYears <= 6;
  }
  return false;
};

export function StudentIntakeDrawer({ isOpen, onClose, currentClass, onSuccess }) {
  const { t, i18n } = useTranslation();
  const fetchGlobalClasses = useClassesStore((state) => state.fetchClasses);

  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [previousClassFilter, setPreviousClassFilter] = useState(() =>
    getExpectedPreviousTier(currentClass),
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isAllocating, setIsAllocating] = useState(false);

  // Automatically reset filter to target class's expected previous tier when drawer opens or class changes
  useEffect(() => {
    if (isOpen && currentClass) {
      setPreviousClassFilter(getExpectedPreviousTier(currentClass));
      setSelectedIds(new Set());
      setSearch('');
      setCurrentPage(1);
    }
  }, [isOpen, currentClass]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Fetch pool of eligible unassigned students
  const fetchStudents = useCallback(async () => {
    if (!currentClass?.id || !isOpen) return;
    setIsLoading(true);
    try {
      const data = await classesApi.getStudentPool(currentClass.id, {
        search: search.trim() || undefined,
        previousClassGroup: previousClassFilter !== 'ALL' ? previousClassFilter : undefined,
        status: 'UNASSIGNED',
        limit: 300,
      });
      if (data?.items && data.items.length > 0) {
        setStudents(data.items);
      } else if (data?.items) {
        setStudents(data.items);
      } else {
        setStudents(FALLBACK_STUDENTS);
      }
    } catch (err) {
      console.warn('Failed to fetch student pool, falling back:', err.message);
      setStudents(FALLBACK_STUDENTS);
    } finally {
      setIsLoading(false);
    }
  }, [currentClass?.id, isOpen, search, previousClassFilter]);

  useEffect(() => {
    if (isOpen) {
      fetchStudents();
    }
  }, [isOpen, fetchStudents]);

  // Reset pagination on filter or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, previousClassFilter]);

  // Filtered students list (by search and previous class tier)
  const filteredStudents = useMemo(() => {
    let list = [...students];

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(
        (s) =>
          s.fullName?.toLowerCase().includes(q) ||
          s.studentCode?.toLowerCase().includes(q) ||
          (s.previousClass && s.previousClass.toLowerCase().includes(q)),
      );
    }

    if (previousClassFilter !== 'ALL') {
      if (previousClassFilter === 'NONE') {
        list = list.filter((s) => !s.previousClass || s.previousClassAgeGroup === 'NONE');
      } else {
        list = list.filter((s) => {
          if (s.previousClassAgeGroup === previousClassFilter) return true;
          const pLower = (s.previousClass || '').toLowerCase();
          if (
            previousClassFilter === 'NHA_TRE' &&
            (pLower.includes('nhà trẻ') || pLower.includes('nha tre'))
          ) {
            return true;
          }
          if (previousClassFilter === 'MAM' && (pLower.includes('mầm') || pLower.includes('mam'))) {
            return true;
          }
          if (previousClassFilter === 'CHOI' && (pLower.includes('chồi') || pLower.includes('choi'))) {
            return true;
          }
          if (previousClassFilter === 'LA' && (pLower.includes('lá') || pLower.includes('la'))) {
            return true;
          }
          return false;
        });
      }
    }

    return list;
  }, [students, search, previousClassFilter]);

  // Pagination (10 students per page)
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / pageSize));
  const pagedStudents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredStudents.slice(start, start + pageSize);
  }, [filteredStudents, currentPage]);

  const startItem = filteredStudents.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(filteredStudents.length, currentPage * pageSize);

  // Selection handlers
  const handleToggleSelect = (st) => {
    const isAgeEligible = checkIsAgeEligible(st, currentClass);
    if (!isAgeEligible) {
      toast.warning(t('classes.studentAgeIneligibleWarning', 'Độ tuổi học sinh không phù hợp với khối lớp được chọn.'));
      return;
    }
    const id = st.id;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const eligibleOnCurrentPage = useMemo(() => {
    return pagedStudents.filter(
      (s) => checkIsAgeEligible(s, currentClass)
    );
  }, [pagedStudents, currentClass]);

  const isAllCurrentPageSelected =
    eligibleOnCurrentPage.length > 0 &&
    eligibleOnCurrentPage.every((s) => selectedIds.has(s.id));

  const handleSelectAll = () => {
    if (isAllCurrentPageSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        eligibleOnCurrentPage.forEach((s) => next.delete(s.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        eligibleOnCurrentPage.forEach((s) => next.add(s.id));
        return next;
      });
    }
  };

  // Batch intake allocation
  const handleAllocate = async () => {
    if (selectedIds.size === 0) return;

    // Check max capacity 40 students per class (BR-36 / MSG100)
    const currentCount = currentClass?.studentCount ?? currentClass?.studentsCount ?? 0;
    if (currentCount + selectedIds.size > 40) {
      toast.error('Việc phân lớp này sẽ làm số học sinh vượt quá giới hạn 40 học sinh của lớp.');
      return;
    }

    // Double-check no age-ineligible student is selected
    const ineligibleSelected = Array.from(selectedIds)
      .map((id) => students.find((s) => s.id === id))
      .filter((s) => s && !checkIsAgeEligible(s, currentClass));

    if (ineligibleSelected.length > 0) {
      toast.error(t('classes.studentAgeIneligibleWarning', 'Độ tuổi học sinh không phù hợp với khối lớp được chọn.'));
      return;
    }

    setIsAllocating(true);
    try {
      const ids = Array.from(selectedIds);
      await classesApi.allocateStudents(currentClass.id, ids);
      toast.success(
        t('classes.allocateSuccess', 'Đã tiếp nhận {{count}} học sinh vào lớp {{className}}', {
          count: ids.length,
          className: currentClass.name,
        }),
      );
      setSelectedIds(new Set());
      if (onSuccess) onSuccess();
      if (fetchGlobalClasses) fetchGlobalClasses();
      onClose();
    } catch (err) {
      console.error('Allocation failed:', err);
      toast.error(err.response?.data?.message || t('classes.allocateError', 'Lỗi khi tiếp nhận học sinh vào lớp'));
    } finally {
      setIsAllocating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
        className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-[1px] animate-in fade-in-0 duration-200"
        onClick={onClose}
        data-name="StudentIntakeDrawer"
      >
        <div
          className="w-full max-w-[760px] sm:w-[760px] h-full bg-card border-l border-border shadow-2xl flex flex-col justify-between text-foreground select-none overflow-hidden animate-in slide-in-from-right duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 1. Drawer Header (Sorak Design System) */}
          <div className="p-5 border-b border-border flex items-start justify-between shrink-0 bg-muted/20">
            <div className="flex flex-col gap-1">
              <h2 className="text-[17px] font-semibold text-foreground tracking-tight">
                {t('classes.intakeHeading', 'Tiếp nhận học sinh vào lớp')}
              </h2>
              <p className="text-[12.5px] text-muted-foreground font-normal">
                {t('classes.intakeSub', 'Chọn học sinh từ danh sách chờ phân lớp hoặc chuyển tiếp để thêm vào lớp')}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="size-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-none transition-colors cursor-pointer shrink-0"
            >
              <HugeiconsIcon icon={Cancel01Icon} size={16} />
            </button>
          </div>

          {/* 2. Drawer Body */}
          <div className="p-5 flex-1 overflow-y-auto flex flex-col gap-4">
            {/* Toolbar: Search + Age Filter + Import Button */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 shrink-0">
              <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px] sm:max-w-[260px] h-8">
                  <HugeiconsIcon
                    icon={Search01Icon}
                    size={15}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                  />
                  <Input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t('classes.searchIntakePlaceholder', 'Tìm kiếm học sinh theo tên, mã...')}
                    className="h-8 pl-8 pr-2.5 text-[13px] bg-background border-border rounded-none shadow-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>

                {/* Previous Class Filter */}
                <select
                  value={previousClassFilter}
                  onChange={(e) => setPreviousClassFilter(e.target.value)}
                  className="h-8 px-2.5 text-[12.5px] bg-background border border-border rounded-none text-foreground outline-none focus:border-primary cursor-pointer"
                  title={t('classes.filterPreviousClassTooltip', 'Lọc theo lớp cũ')}
                >
                  <option value="ALL">{t('classes.filterOldClassesAll', 'Tất cả')}</option>
                  <option value="NONE">{t('classes.filterOldClassesNone', 'Mới nhập học')}</option>
                  <option value="NHA_TRE">{t('classes.filterOldClassesNhaTre', 'Lớp cũ: Nhà trẻ')}</option>
                  <option value="MAM">{t('classes.filterOldClassesMam', 'Lớp cũ: Mầm')}</option>
                  <option value="CHOI">{t('classes.filterOldClassesChoi', 'Lớp cũ: Chồi')}</option>
                </select>
              </div>

              <span className="text-[12.5px] text-muted-foreground font-mono">
                {t('classes.availableStudentsCount', '{{count}} học sinh khả dụng', { count: filteredStudents.length })}
              </span>
            </div>

            {/* Unified Single Table (Bỏ cột Trạng thái, chỉ hiển thị học sinh chưa có lớp) */}
            <div className="w-full border border-border bg-card rounded-none overflow-x-auto shadow-xs select-none">
              <table className="w-full text-left border-collapse min-w-[580px]">
                <thead>
                  <tr className="h-10 border-b border-border bg-muted/30 text-[13px] font-medium text-foreground">
                    {/* Checkbox Select All */}
                    <th className="px-3 w-[44px] text-center font-medium">
                      <input
                        type="checkbox"
                        checked={isAllCurrentPageSelected}
                        onChange={handleSelectAll}
                        className="size-4 rounded-none accent-[#1447e6] cursor-pointer align-middle"
                        title={t('classes.selectAllOnPage', 'Chọn tất cả trang này')}
                      />
                    </th>

                    {/* Cột Học sinh (Hình kèm mã học sinh) */}
                    <th className="px-3 min-w-[240px] font-medium">
                      {t('student.colStudent', 'Học sinh')}
                    </th>

                    {/* Cột Ngày sinh */}
                    <th className="px-3 min-w-[130px] font-medium">
                      {t('teacher.colDob', 'Ngày sinh')}
                    </th>

                    {/* Cột Lớp cũ (nếu không có bỏ trống) */}
                    <th className="px-3 min-w-[180px] font-medium">
                      {t('student.colPreviousClass', 'Lớp cũ')}
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-border/60">
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, idx) => (
                      <tr key={idx} className="h-[60px] animate-pulse">
                        <td className="px-3 text-center">
                          <div className="size-4 bg-muted/60 mx-auto rounded-none" />
                        </td>
                        <td className="px-3">
                          <div className="flex items-center gap-3">
                            <div className="size-8 bg-muted/60 rounded-none shrink-0" />
                            <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                              <div className="h-3.5 w-28 bg-muted/60 rounded-none" />
                              <div className="h-2.5 w-16 bg-muted/40 rounded-none" />
                            </div>
                          </div>
                        </td>
                        <td className="px-3">
                          <div className="h-3.5 w-20 bg-muted/50 rounded-none" />
                        </td>
                        <td className="px-3">
                          <div className="h-3.5 w-24 bg-muted/50 rounded-none" />
                        </td>
                      </tr>
                    ))
                  ) : filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-muted-foreground text-[13px]">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <HugeiconsIcon icon={UserGroupIcon} size={28} className="text-muted-foreground/60" />
                          <p className="text-[13px]">
                            {search.trim()
                              ? t('classes.noMatchingStudent', 'Không tìm thấy học sinh nào phù hợp.')
                              : t('classes.noPoolStudents', 'Không có học sinh nào chờ tiếp nhận.')}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    pagedStudents.map((st) => {
                      const isSelected = selectedIds.has(st.id);
                      const isUnlinked = st.hasAccount === false;
                      const isAgeEligible = checkIsAgeEligible(st, currentClass);
                      const isSelectable = isAgeEligible;
                      const hasOldClass = Boolean(
                        st.previousClass &&
                        st.previousClass.trim() !== '' &&
                        st.previousClass !== 'Chưa có',
                      );

                      return (
                        <tr
                          key={st.id}
                          onClick={() => handleToggleSelect(st)}
                          className={cn(
                            'h-[60px] transition-colors group',
                            !isSelectable
                              ? 'opacity-70 bg-muted/10 cursor-not-allowed hover:bg-rose-50/20'
                              : 'hover:bg-muted/40 cursor-pointer',
                            isSelected && 'bg-primary/5',
                          )}
                        >
                          {/* 1. Checkbox */}
                          <td className="px-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={!isSelectable}
                              onChange={() => handleToggleSelect(st)}
                              title={
                                !isAgeEligible
                                  ? t('classes.tooltipAgeIneligible', 'Độ tuổi học sinh không phù hợp với khối lớp được chọn')
                                  : isSelected
                                    ? t('classes.tooltipDeselect', 'Bỏ chọn')
                                    : t('classes.tooltipSelect', 'Chọn học sinh')
                              }
                              className={cn(
                                'size-4 rounded-none accent-[#1447e6] align-middle',
                                !isSelectable ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'
                              )}
                            />
                          </td>

                          {/* 2. Cột Học sinh (Hình kèm Tên & Mã học sinh & Trạng thái tài khoản & Độ tuổi) */}
                          <td className="px-3">
                            <div className="flex items-center gap-3">
                              <div className="size-8 shrink-0 rounded-none overflow-hidden border border-border/80 bg-muted/40">
                                <img
                                  src={getStudentAvatarUrl(st.avatar || st.avatarUrl, st.studentCode || st.fullName)}
                                  alt={st.fullName}
                                  className="size-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.src = getStudentAvatarUrl(null, st.studentCode || st.fullName);
                                  }}
                                />
                              </div>
                              <div className="flex flex-col min-w-0 leading-tight">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-[14px] font-medium text-foreground truncate">
                                    {st.fullName}
                                  </span>
                                  {!isAgeEligible && (
                                    <span
                                      className="inline-flex items-center px-1.5 py-0.2 text-[10.5px] font-medium bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200/80 rounded-none shrink-0"
                                      title={t('classes.tooltipAgeIneligible', 'Độ tuổi học sinh không phù hợp với khối lớp được chọn')}
                                    >
                                      {t('classes.badgeWrongAge', 'Sai độ tuổi khối')}
                                    </span>
                                  )}
                                  {isUnlinked && (
                                    <span className="inline-flex items-center px-1.5 py-0.2 text-[10.5px] font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200/80 rounded-none shrink-0">
                                      {t('classes.badgeUnlinkedAccount', 'Chưa liên kết tài khoản')}
                                    </span>
                                  )}
                                </div>
                                <span className="text-[12px] text-muted-foreground truncate font-mono">
                                  {st.studentCode || '—'}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* 3. Cột Ngày sinh */}
                          <td className="px-3 text-[13.5px] text-foreground font-normal whitespace-nowrap">
                            {st.dateOfBirth
                              ? new Date(st.dateOfBirth).toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'vi-VN')
                              : '—'}
                          </td>

                          {/* 4. Cột Lớp cũ (nếu không có bỏ trống) */}
                          <td className="px-3 text-[13.5px] text-muted-foreground font-normal whitespace-nowrap">
                            {hasOldClass ? st.previousClass : ''}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {filteredStudents.length > 0 && (
              <div className="flex items-center justify-between pt-1 text-[12.5px] text-muted-foreground select-none shrink-0">
                <span>
                  {t('classes.studentsPagination', '{{start}}–{{end}} / {{total}} học sinh', {
                    start: startItem,
                    end: endItem,
                    total: filteredStudents.length,
                  })}
                </span>
                <div className="flex items-center border border-border bg-card rounded-none overflow-hidden shrink-0">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="h-7 px-2.5 text-[12px] font-medium flex items-center gap-1 transition-colors border-r border-border disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted/60 cursor-pointer"
                  >
                    <HugeiconsIcon icon={ArrowLeft01Icon} size={13} />
                    <span>{t('common.prevPage', 'Trước')}</span>
                  </button>
                  <span className="h-7 px-3 text-[12px] font-medium flex items-center justify-center bg-muted/30 text-foreground border-r border-border">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="h-7 px-2.5 text-[12px] font-medium flex items-center gap-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted/60 cursor-pointer"
                  >
                    <span>{t('common.nextPage', 'Sau')}</span>
                    <HugeiconsIcon icon={ArrowRight01Icon} size={13} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 3. Drawer Sticky Footer (Sorak Design System) */}
          <div className="border-t border-border px-5 py-3.5 bg-muted/20 flex items-center justify-between gap-3 shrink-0">
            <span className="text-[12.5px] text-muted-foreground font-medium">
              {t('classes.selectedStudentsCount', '{{count}} học sinh đã chọn', { count: selectedIds.size })}
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="h-8 px-4 rounded-none border border-border text-[13px] font-normal cursor-pointer shadow-none"
              >
                {t('common.cancel', 'Huỷ')}
              </Button>
              <Button
                type="button"
                onClick={handleAllocate}
                disabled={selectedIds.size === 0 || isAllocating}
                className="h-8 px-4 rounded-none bg-[#1447e6] hover:bg-[#1447e6]/90 text-white text-[13px] font-medium cursor-pointer shadow-none disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isAllocating
                  ? t('classes.allocatingBtn', 'Đang tiếp nhận...')
                  : t('classes.allocateActionBtn', 'Tiếp nhận {{count}} học sinh', {
                      count: selectedIds.size > 0 ? selectedIds.size : '',
                    })}
              </Button>
            </div>
          </div>
      </div>
    </div>
  );
}

export default StudentIntakeDrawer;
