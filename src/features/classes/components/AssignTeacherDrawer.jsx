import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Cancel01Icon,
  Search01Icon,
  UserGroupIcon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
} from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/shared/lib/utils';
import { classesApi } from '../classes.api';
import { getTeacherAvatarUrl } from '../../teachers/teachers.store';

export function AssignTeacherDrawer({
  isOpen,
  onClose,
  classId: propClassId,
  className: propClassName,
  currentClass,
  poolTeachers = [],
  currentCount = 0,
  isSchoolYearEnded = false,
  onSuccess,
}) {
  const { t } = useTranslation();

  const targetClassId = propClassId || currentClass?.id;
  const targetClassName = propClassName || currentClass?.name || '';
  const maxCanAdd = Math.max(0, 3 - currentCount);

  const [teachers, setTeachers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTeacherIds, setSelectedTeacherIds] = useState(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch or populate teacher pool
  const fetchTeachers = useCallback(async () => {
    if (!targetClassId || !isOpen) return;
    setIsLoading(true);
    try {
      const res = await classesApi.getClassTeachers(targetClassId);
      if (res?.poolTeachers) {
        setTeachers(res.poolTeachers);
      } else {
        setTeachers(poolTeachers || []);
      }
    } catch (err) {
      console.warn('Failed to fetch teacher pool:', err);
      setTeachers(poolTeachers || []);
    } finally {
      setIsLoading(false);
    }
  }, [targetClassId, isOpen, poolTeachers]);

  // Synchronize on drawer open
  useEffect(() => {
    if (isOpen) {
      if (poolTeachers && poolTeachers.length > 0) {
        setTeachers(poolTeachers);
      } else {
        fetchTeachers();
      }
      setSelectedTeacherIds(new Set());
      setSearchQuery('');
      setCurrentPage(1);
    }
  }, [isOpen, poolTeachers, fetchTeachers]);

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

  // Filter pool (exclude any teacher assigned or not in Teacher role)
  const eligibleTeachers = useMemo(() => {
    return teachers.filter((teacher) => {
      if (teacher.isAssignedHere || teacher.isAssignedElsewhere) return false;
      const pos = (teacher.position || '').trim().toLowerCase();
      if (pos.includes('hiệu trưởng') || (pos && !pos.includes('giáo viên'))) {
        return false;
      }
      return true;
    });
  }, [teachers]);

  // Filtered by search query
  const filteredTeachers = useMemo(() => {
    let list = eligibleTeachers;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((tc) => {
        const matchName = tc.fullName?.toLowerCase().includes(q);
        const matchCode = tc.employeeCode?.toLowerCase().includes(q);
        const matchPhone = tc.phone?.includes(q);
        const matchEmail = tc.email?.toLowerCase().includes(q);
        return matchName || matchCode || matchPhone || matchEmail;
      });
    }
    return list;
  }, [eligibleTeachers, searchQuery]);

  // Reset pagination on search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Pagination (10 teachers per page)
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filteredTeachers.length / pageSize));
  const pagedTeachers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTeachers.slice(start, start + pageSize);
  }, [filteredTeachers, currentPage]);

  const startItem = filteredTeachers.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(filteredTeachers.length, currentPage * pageSize);

  // Selection handlers
  const handleToggleSelect = (teacherId) => {
    if (isSchoolYearEnded) {
      toast.warning('Năm học đã kết thúc. Không thể thay đổi phân công giáo viên.');
      return;
    }
    setSelectedTeacherIds((prev) => {
      const next = new Set(prev);
      if (next.has(teacherId)) {
        next.delete(teacherId);
      } else {
        if (next.size >= maxCanAdd) {
          toast.warning(`Lớp học chỉ có thể phân công thêm tối đa ${maxCanAdd} giáo viên (BR-38: Tối đa 3 giáo viên/lớp).`);
          return prev;
        }
        next.add(teacherId);
      }
      return next;
    });
  };

  const isAllCurrentPageSelected =
    pagedTeachers.length > 0 && pagedTeachers.every((s) => selectedTeacherIds.has(s.teacherId));

  const handleSelectAll = () => {
    if (isSchoolYearEnded) {
      toast.warning('Năm học đã kết thúc. Không thể thay đổi phân công giáo viên.');
      return;
    }
    if (isAllCurrentPageSelected) {
      setSelectedTeacherIds((prev) => {
        const next = new Set(prev);
        pagedTeachers.forEach((s) => next.delete(s.teacherId));
        return next;
      });
    } else {
      setSelectedTeacherIds((prev) => {
        const next = new Set(prev);
        for (const s of pagedTeachers) {
          if (next.size >= maxCanAdd) {
            toast.warning(`Lớp học chỉ có thể phân công thêm tối đa ${maxCanAdd} giáo viên (BR-38: Tối đa 3 giáo viên/lớp).`);
            break;
          }
          next.add(s.teacherId);
        }
        return next;
      });
    }
  };

  // Submit batch assignment
  const handleSubmit = async () => {
    if (isSchoolYearEnded) {
      toast.error('Năm học đã kết thúc. Không thể thay đổi phân công giáo viên.');
      return;
    }
    if (currentCount + selectedTeacherIds.size > 3) {
      toast.error('Mỗi lớp chỉ được phân công tối đa 3 giáo viên (BR-38).');
      return;
    }
    if (selectedTeacherIds.size === 0) {
      toast.error(t('classes.selectTeacherRequired', 'Vui lòng chọn ít nhất một giáo viên để thêm vào lớp.'));
      return;
    }

    try {
      setIsSubmitting(true);
      const ids = Array.from(selectedTeacherIds);
      await classesApi.assignTeacher(targetClassId, {
        teacherIds: ids,
      });

      toast.success(
        t('classes.assignTeacherSuccess', 'Đã thêm {{count}} giáo viên vào lớp {{className}} thành công!', {
          count: ids.length,
          className: targetClassName,
        }),
      );
      setSelectedTeacherIds(new Set());
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || t('classes.errorAssigningTeacher', 'Lỗi khi phân công giáo viên');
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-[1px] animate-in fade-in-0 duration-200"
      onClick={onClose}
      data-name="AssignTeacherDrawer"
    >
      <div
        className="w-full max-w-[760px] sm:w-[760px] h-full bg-card border-l border-border shadow-2xl flex flex-col justify-between text-foreground select-none overflow-hidden animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Drawer Header (Sorak Design System) */}
        <div className="p-5 border-b border-border flex items-start justify-between shrink-0 bg-muted/20">
          <div className="flex flex-col gap-1">
            <h2 className="text-[17px] font-semibold text-foreground tracking-tight">
              {t('classes.assignTeacherTitle', 'Thêm giáo viên vào lớp')}
            </h2>
            <p className="text-[12.5px] text-muted-foreground font-normal">
              {targetClassName
                ? t(
                    'classes.assignTeacherSubtitle',
                    'Chọn giáo viên chưa có lớp để phân công vào lớp {{className}}',
                    { className: targetClassName },
                  )
                : t('classes.assignTeacherSubtitleGeneric', 'Chọn giáo viên chưa có lớp để phân công vào lớp học')}
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
          {maxCanAdd <= 0 && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-[12.5px]">
              Lớp học đã có đủ 3 giáo viên phụ trách (tối đa theo quy định BR-38). Không thể thêm giáo viên mới.
            </div>
          )}
          {isSchoolYearEnded && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-[12.5px]">
              Năm học đã kết thúc. Không thể thay đổi phân công giáo viên.
            </div>
          )}
          {/* Toolbar: Search input + Count stats */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 shrink-0">
            <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
              <div className="relative flex-1 min-w-[200px] sm:max-w-[320px] h-8">
                <HugeiconsIcon
                  icon={Search01Icon}
                  size={15}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                />
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t(
                    'classes.searchTeacherPlaceholder',
                    'Tìm kiếm giáo viên theo tên, mã CB, SĐT...',
                  )}
                  className="h-8 pl-8 pr-2.5 text-[13px] bg-background border-border rounded-none shadow-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
            </div>

            <span className="text-[12.5px] text-muted-foreground font-mono">
              {t('classes.availableTeachersCount', '{{count}} GV khả dụng', { count: filteredTeachers.length })}
            </span>
          </div>

          {/* Unified Clean Single Table */}
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

                  {/* Cột Giáo viên (Hình kèm Tên & Mã cán bộ) */}
                  <th className="px-3 min-w-[220px] font-medium">
                    {t('classes.colTeacher', 'Giáo viên')}
                  </th>

                  {/* Cột Số điện thoại */}
                  <th className="px-3 min-w-[130px] font-medium">
                    {t('teacher.colPhone', 'Số điện thoại')}
                  </th>

                  {/* Cột Email */}
                  <th className="px-3 min-w-[180px] font-medium">
                    {t('teacher.colEmail', 'Email')}
                  </th>

                  {/* Cột Chức vụ */}
                  <th className="px-3 min-w-[120px] font-medium">
                    {t('teacher.colPosition', 'Chức vụ')}
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
                        <div className="h-3.5 w-24 bg-muted/50 rounded-none" />
                      </td>
                      <td className="px-3">
                        <div className="h-3.5 w-32 bg-muted/50 rounded-none" />
                      </td>
                      <td className="px-3">
                        <div className="h-3.5 w-20 bg-muted/50 rounded-none" />
                      </td>
                    </tr>
                  ))
                ) : filteredTeachers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-muted-foreground text-[13px]">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <HugeiconsIcon icon={UserGroupIcon} size={28} className="text-muted-foreground/60" />
                        <p className="text-[13px]">
                          {searchQuery.trim()
                            ? t('classes.noMatchingTeacher', 'Không tìm thấy giáo viên nào phù hợp.')
                            : t('classes.noPoolTeachers', 'Không có giáo viên nào chưa có lớp.')}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  pagedTeachers.map((tc) => {
                    const isSelected = selectedTeacherIds.has(tc.teacherId);

                    return (
                      <tr
                        key={tc.teacherId}
                        onClick={() => handleToggleSelect(tc.teacherId)}
                        className={cn(
                          'h-[60px] hover:bg-muted/40 transition-colors cursor-pointer group',
                          isSelected && 'bg-primary/5',
                        )}
                      >
                        {/* 1. Checkbox */}
                        <td className="px-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(tc.teacherId)}
                            className="size-4 rounded-none accent-[#1447e6] cursor-pointer align-middle"
                          />
                        </td>

                        {/* 2. Cột Giáo viên (Hình kèm Tên & Mã cán bộ) */}
                        <td className="px-3">
                          <div className="flex items-center gap-3">
                            <div className="size-8 shrink-0 rounded-none overflow-hidden border border-border/80 bg-muted/40">
                              <img
                                src={getTeacherAvatarUrl(tc.avatarUrl || tc.avatar, tc.fullName)}
                                alt={tc.fullName}
                                className="size-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.src = getTeacherAvatarUrl(null, tc.fullName);
                                }}
                              />
                            </div>
                            <div className="flex flex-col min-w-0 leading-tight">
                              <span className="text-[14px] font-medium text-foreground truncate">
                                {tc.fullName}
                              </span>
                              <span className="text-[12px] text-muted-foreground truncate font-mono">
                                {tc.employeeCode || '—'}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* 3. Cột Số điện thoại */}
                        <td className="px-3 text-[13.5px] text-foreground font-normal whitespace-nowrap">
                          {tc.phone || '—'}
                        </td>

                        {/* 4. Cột Email */}
                        <td className="px-3 text-[13.5px] text-muted-foreground font-normal whitespace-nowrap truncate max-w-[200px]">
                          {tc.email || '—'}
                        </td>

                        {/* 5. Cột Chức vụ */}
                        <td className="px-3 text-[13.5px] text-muted-foreground font-normal whitespace-nowrap">
                          {tc.position || t('classes.teacherDefaultRole', 'Giáo viên')}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {filteredTeachers.length > 0 && (
            <div className="flex items-center justify-between pt-1 text-[12.5px] text-muted-foreground select-none shrink-0">
              <span>
                {t('classes.teachersPagination', '{{start}}–{{end}} / {{total}} giáo viên', {
                  start: startItem,
                  end: endItem,
                  total: filteredTeachers.length,
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
            {t('classes.selectedTeachersCount', '{{count}} giáo viên đã chọn', {
              count: selectedTeacherIds.size,
            })}
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-8 px-4 rounded-none border border-border text-[13px] font-normal cursor-pointer shadow-none"
            >
              {t('common.cancel', 'Huỷ')}
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={selectedTeacherIds.size === 0 || isSubmitting || maxCanAdd <= 0 || isSchoolYearEnded}
              className="h-8 px-4 rounded-none bg-[#1447e6] hover:bg-[#1447e6]/90 text-white text-[13px] font-medium cursor-pointer shadow-none disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSubmitting
                ? t('common.saving', 'Đang thêm...')
                : t('classes.addTeachersSubmitBtn', 'Thêm {{count}} giáo viên', {
                    count: selectedTeacherIds.size > 0 ? selectedTeacherIds.size : '',
                  })}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AssignTeacherDrawer;
