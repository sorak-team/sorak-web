import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Cancel01Icon,
  Search01Icon,
  SchoolIcon,
  StudentIcon,
  UserAdd01Icon,
  CheckmarkBadge01Icon,
} from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAccountStore, getAccountAvatarUrl } from '../accounts.store';
import { useTeacherStore } from '@/features/teachers/teachers.store';
import { useStudentStore } from '@/features/students/students.store';
import { useClassesStore } from '@/features/classes/classes.store';
import { cn } from '@/shared/lib/utils';

export function AddAccountDrawer() {
  const { t } = useTranslation();
  const isAddModalOpen = useAccountStore((state) => state.isAddModalOpen);
  const closeAddModal = useAccountStore((state) => state.closeAddModal);
  const createBulkAccounts = useAccountStore((state) => state.createBulkAccounts);
  const activeTab = useAccountStore((state) => state.activeTab);
  const staffAccounts = useAccountStore((state) => state.staffAccounts);
  const parentAccounts = useAccountStore((state) => state.parentAccounts);

  // External stores
  const teachers = useTeacherStore((state) => state.teachers);
  const fetchTeachers = useTeacherStore((state) => state.fetchTeachers);
  const students = useStudentStore((state) => state.students);
  const fetchStudents = useStudentStore((state) => state.fetchStudents);
  const classes = useClassesStore((state) => state.classes);
  const fetchClasses = useClassesStore((state) => state.fetchClasses);

  // Local state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('ALL');
  const [selectedTeacherIds, setSelectedTeacherIds] = useState([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [defaultRole, setDefaultRole] = useState('teacher'); // 'teacher' | 'leader'
  const [teacherRoles, setTeacherRoles] = useState({}); // { [teacherId]: 'teacher' | 'leader' }
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isAddModalOpen) {
      fetchTeachers();
      fetchStudents();
      fetchClasses();
      setSelectedTeacherIds([]);
      setSelectedStudentIds([]);
      setSearchQuery('');
      setSelectedClassId('ALL');
      setTeacherRoles({});
    }
  }, [isAddModalOpen, fetchTeachers, fetchStudents, fetchClasses]);

  // Check if a teacher profile already has an account
  const isTeacherHasAccount = (teacher) => {
    if (teacher.account && (teacher.account.id || teacher.account.account_id)) return true;
    if (teacher.accountId || teacher.account_id) return true;
    return (staffAccounts || []).some(
      (acc) =>
        acc.username?.toLowerCase() === teacher.employeeCode?.toLowerCase() ||
        acc.employeeCode?.toLowerCase() === teacher.employeeCode?.toLowerCase() ||
        (acc.teacherProfile &&
          (String(acc.teacherProfile.id) === String(teacher.id) ||
            acc.teacherProfile.employeeCode?.toLowerCase() === teacher.employeeCode?.toLowerCase())),
    );
  };

  // Check if a student profile already has an account
  const isStudentHasAccount = (student) => {
    if (student.account && (student.account.id || student.account.account_id)) return true;
    if (student.accountId || student.account_id) return true;
    return (parentAccounts || []).some(
      (acc) =>
        acc.username?.toLowerCase() === student.studentCode?.toLowerCase() ||
        acc.studentCode?.toLowerCase() === student.studentCode?.toLowerCase() ||
        (acc.studentProfile &&
          (String(acc.studentProfile.id) === String(student.id) ||
            acc.studentProfile.studentCode?.toLowerCase() === student.studentCode?.toLowerCase())),
    );
  };

  // ONLY profiles WITHOUT an account
  const unassignedTeachers = useMemo(() => {
    return (teachers || []).filter((t) => !isTeacherHasAccount(t));
  }, [teachers, staffAccounts]);

  const unassignedStudents = useMemo(() => {
    return (students || []).filter((s) => !isStudentHasAccount(s));
  }, [students, parentAccounts]);

  // Filtered teachers (by search query)
  const filteredTeachers = useMemo(() => {
    let list = unassignedTeachers;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (t) =>
          t.fullName?.toLowerCase().includes(q) ||
          t.employeeCode?.toLowerCase().includes(q) ||
          t.email?.toLowerCase().includes(q),
      );
    }
    return list;
  }, [unassignedTeachers, searchQuery]);

  // Filtered students (by class filter and search query)
  const filteredStudents = useMemo(() => {
    let list = unassignedStudents;
    if (selectedClassId !== 'ALL') {
      list = list.filter((s) => {
        const cId = s.currentClass?.classId || s.classId;
        const cName = s.currentClass?.className || s.className || s.studentClass;
        return cId === selectedClassId || cName === selectedClassId;
      });
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (s) =>
          s.fullName?.toLowerCase().includes(q) ||
          s.studentCode?.toLowerCase().includes(q),
      );
    }
    return list;
  }, [unassignedStudents, selectedClassId, searchQuery]);

  // Toggle selection for teacher
  const toggleTeacher = (teacherId) => {
    setSelectedTeacherIds((prev) =>
      prev.includes(teacherId)
        ? prev.filter((id) => id !== teacherId)
        : [...prev, teacherId],
    );
  };

  // Toggle selection for student
  const toggleStudent = (studentId) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId],
    );
  };

  // Select all visible teachers
  const handleSelectAllTeachers = () => {
    if (isAllSelected) {
      setSelectedTeacherIds([]);
    } else {
      setSelectedTeacherIds(filteredTeachers.map((t) => t.id));
    }
  };

  // Select all visible students in current filtered class
  const handleSelectAllStudents = () => {
    if (isAllSelected) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(filteredStudents.map((s) => s.id));
    }
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (activeTab === 'staff') {
        if (selectedTeacherIds.length === 0) {
          toast.error(t('account.selectTeacherPrompt', 'Vui lòng chọn ít nhất 01 hồ sơ giáo viên'));
          setIsSubmitting(false);
          return;
        }

        const accountsToCreate = selectedTeacherIds.map((tId) => {
          const teacher = teachers.find((t) => t.id === tId);
          const role = teacherRoles[tId] || defaultRole;
          return {
            teacherId: teacher.id,
            employeeCode: teacher.employeeCode,
            username: teacher.employeeCode,
            fullName: teacher.fullName,
            email: teacher.email || '',
            phone: teacher.phone || '',
            role,
            workStatus: teacher.status === 'on_leave' ? 'on_leave' : 'working',
            accountStatus: 'active',
            avatar: teacher.avatar || null,
          };
        });

        await createBulkAccounts(accountsToCreate);
        toast.success(
          t('account.toastBulkStaffCreated', 'Đã cấp thành công {{count}} tài khoản giáo viên/cán bộ', {
            count: accountsToCreate.length,
          }),
        );
      } else {
        if (selectedStudentIds.length === 0) {
          toast.error(t('account.selectStudentPrompt', 'Vui lòng chọn ít nhất 01 hồ sơ học sinh'));
          setIsSubmitting(false);
          return;
        }

        const accountsToCreate = selectedStudentIds.map((sId) => {
          const student = students.find((s) => s.id === sId);
          const className =
            student.currentClass?.className ||
            student.studentClass ||
            student.className ||
            '';
          const ageGroup =
            student.currentClass?.ageGroup ||
            student.ageGroup ||
            null;
          return {
            studentId: student.id,
            studentCode: student.studentCode,
            username: student.studentCode,
            fullName: student.fullName,
            studentClass: className,
            ageGroup,
            role: 'student',
            accountStatus: 'active',
            avatar: student.avatar || null,
          };
        });

        await createBulkAccounts(accountsToCreate);
        toast.success(
          t('account.toastBulkStudentCreated', 'Đã cấp thành công {{count}} tài khoản học sinh', {
            count: accountsToCreate.length,
          }),
        );
      }
    } catch (err) {
      console.error(err);
      toast.error(t('account.createError', 'Có lỗi xảy ra khi tạo tài khoản'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAddModalOpen) return null;

  const isStaff = activeTab === 'staff';
  const selectedCount = isStaff ? selectedTeacherIds.length : selectedStudentIds.length;
  const currentList = isStaff ? filteredTeachers : filteredStudents;
  const isAllSelected = currentList.length > 0 && selectedCount === currentList.length;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        onClick={closeAddModal}
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in-0 duration-200"
      />

      {/* Drawer Panel matching Sorak Design Consistency System */}
      <div
        className={cn(
          'relative w-full max-w-[560px] h-full bg-card border-l border-border shadow-2xl flex flex-col',
          'animate-in slide-in-from-right duration-250 ease-out z-10 text-foreground',
        )}
        data-name="Add Account Drawer"
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-border shrink-0 bg-background">
          <div className="flex flex-col gap-1">
            <h2 className="text-[18px] font-semibold text-foreground tracking-tight">
              {isStaff
                ? t('account.addStaffAccount', 'Thêm tài khoản nhà trường')
                : t('account.addStudentAccount', 'Thêm tài khoản học sinh')}
            </h2>
            <p className="text-[12px] text-muted-foreground font-normal">
              {isStaff
                ? t(
                  'account.addStaffSub',
                  'Chọn hồ sơ giáo viên/cán bộ và thiết lập vai trò để tạo tài khoản đăng nhập.',
                )
                : t(
                  'account.addStudentSub',
                  'Chọn học sinh hoặc lọc theo lớp để cấp tài khoản đăng nhập hàng loạt.',
                )}
            </p>
          </div>

          <button
            type="button"
            onClick={closeAddModal}
            className="size-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-none transition-colors cursor-pointer"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={16} />
          </button>
        </div>

        {/* Toolbar & Filters */}
        <div className="px-6 py-3.5 border-b border-border/80 bg-muted/20 flex flex-col gap-3 shrink-0">
          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            {/* Search input */}
            <div className="relative flex-1 min-w-[200px] h-8">
              <HugeiconsIcon
                icon={Search01Icon}
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  isStaff
                    ? t('account.searchTeacherPlaceholder', 'Tìm theo tên, mã giáo viên...')
                    : t('account.searchStudentPlaceholder', 'Tìm theo tên, mã học sinh...')
                }
                className="h-8 pl-8 pr-2.5 text-[13px] bg-background border-border rounded-none shadow-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            {/* If Student Tab: Class Filter dropdown */}
            {!isStaff && (
              <div className="w-[180px] shrink-0">
                <select
                  value={selectedClassId}
                  onChange={(e) => {
                    setSelectedClassId(e.target.value);
                    setSelectedStudentIds([]);
                  }}
                  className="h-8 w-full px-2.5 text-[13px] bg-background border border-border rounded-none text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
                >
                  <option value="ALL">{t('account.allClasses', 'Tất cả các lớp')}</option>
                  {(classes || []).map((c) => (
                    <option key={c.id || c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

          </div>

          {/* Select All Action Button (Clean & Basic) */}
          <div className="flex items-center pt-0.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={isStaff ? handleSelectAllTeachers : handleSelectAllStudents}
              disabled={currentList.length === 0}
              className="h-8 px-3 text-[12px] rounded-none border border-border bg-background hover:bg-muted text-foreground font-medium cursor-pointer"
            >
              {isAllSelected ? t('common.deselectAll', 'Bỏ chọn tất cả') : t('common.selectAll', 'Chọn tất cả')}
            </Button>
          </div>
        </div>

        {/* Scrollable Selection List (ONLY PROFILES WITHOUT ACCOUNT) */}
        <div className="flex-1 overflow-y-auto divide-y divide-border/60">
          {/* TEACHER LIST */}
          {isStaff && (
            <>
              {filteredTeachers.length === 0 ? (
                <div className="p-8 text-center flex flex-col items-center justify-center gap-2 text-muted-foreground border border-dashed border-border m-6 bg-muted/10">
                  <HugeiconsIcon icon={CheckmarkBadge01Icon} size={28} className="text-muted-foreground/60" />
                  <p className="text-[13px] font-medium text-foreground">
                    {unassignedTeachers.length === 0
                      ? t('account.allTeachersHaveAccount', 'Tất cả hồ sơ giáo viên đều đã được cấp tài khoản.')
                      : t('account.noTeachersFound', 'Không tìm thấy hồ sơ giáo viên nào phù hợp.')}
                  </p>
                  <p className="text-[12px] text-muted-foreground">
                    {unassignedTeachers.length === 0
                      ? t('account.noProfilesPending', 'Không có hồ sơ nào cần cấp tài khoản mới.')
                      : t('account.searchAgainPrompt', 'Thử tìm kiếm với từ khóa khác.')}
                  </p>
                </div>
              ) : (
                filteredTeachers.map((teacher) => {
                  const isChecked = selectedTeacherIds.includes(teacher.id);
                  const role = teacherRoles[teacher.id] || defaultRole;

                  return (
                    <div
                      key={teacher.id}
                      onClick={() => toggleTeacher(teacher.id)}
                      className={cn(
                        'flex items-center justify-between p-3.5 px-6 transition-colors cursor-pointer',
                        isChecked
                          ? 'bg-primary/5 hover:bg-primary/10'
                          : 'hover:bg-muted/40',
                      )}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleTeacher(teacher.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="size-4 rounded-none border-border accent-primary cursor-pointer"
                        />
                        <div className="size-10 rounded-none overflow-hidden border border-border/80 bg-primary/10 shrink-0">
                          <img
                            src={getAccountAvatarUrl(teacher.avatar, teacher.fullName)}
                            alt={teacher.fullName}
                            className="size-full object-cover"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = getAccountAvatarUrl(null, teacher.fullName);
                            }}
                          />
                        </div>
                        <div className="flex flex-col min-w-0 leading-tight">
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-medium text-foreground truncate">
                              {teacher.fullName}
                            </span>
                            <span className="text-[11px] font-mono text-muted-foreground bg-muted px-1.5 py-0.2 border border-border/60 rounded-none">
                              {teacher.employeeCode}
                            </span>
                          </div>
                          <span className="text-[12px] text-muted-foreground truncate mt-0.5">
                            {teacher.position || teacher.role || 'Giáo viên'}
                            {teacher.email ? ` · ${teacher.email}` : ''}
                          </span>
                        </div>
                      </div>

                      {/* Right role selector when checked */}
                      <div
                        className="flex items-center gap-2 shrink-0 ml-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {isChecked ? (
                          <select
                            value={role}
                            onChange={(e) =>
                              setTeacherRoles((prev) => ({
                                ...prev,
                                [teacher.id]: e.target.value,
                              }))
                            }
                            className="h-7 px-2 text-[12px] bg-background border border-border rounded-none text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
                          >
                            <option value="teacher">{t('account.roleTeacher', 'Giáo viên')}</option>
                            <option value="leader">{t('account.roleLeader', 'Ban giám hiệu')}</option>
                          </select>
                        ) : (
                          <span className="text-[12px] text-muted-foreground font-normal">
                            {role === 'leader' ? t('account.roleLeader', 'Ban giám hiệu') : t('account.roleTeacher', 'Giáo viên')}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </>
          )}

          {/* STUDENT LIST */}
          {!isStaff && (
            <>
              {filteredStudents.length === 0 ? (
                <div className="p-8 text-center flex flex-col items-center justify-center gap-2 text-muted-foreground border border-dashed border-border m-6 bg-muted/10">
                  <HugeiconsIcon icon={CheckmarkBadge01Icon} size={28} className="text-muted-foreground/60" />
                  <p className="text-[13px] font-medium text-foreground">
                    {unassignedStudents.length === 0
                      ? t('account.allStudentsHaveAccount', 'Tất cả học sinh trong danh sách đã có tài khoản.')
                      : t('account.noStudentsFound', 'Không tìm thấy hồ sơ học sinh nào phù hợp.')}
                  </p>
                  <p className="text-[12px] text-muted-foreground">
                    {unassignedStudents.length === 0
                      ? t('account.noProfilesPending', 'Không có hồ sơ nào cần cấp tài khoản mới.')
                      : t('account.searchAgainPrompt', 'Thử chọn lớp khác hoặc tìm kiếm với từ khóa khác.')}
                  </p>
                </div>
              ) : (
                filteredStudents.map((student) => {
                  const isChecked = selectedStudentIds.includes(student.id);
                  const className =
                    student.currentClass?.className ||
                    student.studentClass ||
                    student.className ||
                    '—';
                  const parentInfo = student.primaryParent?.fullName || student.parents?.[0]?.fullName;

                  return (
                    <div
                      key={student.id}
                      onClick={() => toggleStudent(student.id)}
                      className={cn(
                        'flex items-center justify-between p-3.5 px-6 transition-colors cursor-pointer',
                        isChecked
                          ? 'bg-primary/5 hover:bg-primary/10'
                          : 'hover:bg-muted/40',
                      )}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleStudent(student.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="size-4 rounded-none border-border accent-primary cursor-pointer"
                        />
                        <div className="size-10 rounded-none overflow-hidden border border-border/80 bg-primary/10 shrink-0">
                          <img
                            src={getAccountAvatarUrl(student.avatar, student.studentCode || student.fullName, 'student')}
                            alt={student.fullName}
                            className="size-full object-cover"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = getAccountAvatarUrl(null, student.studentCode || student.fullName, 'student');
                            }}
                          />
                        </div>
                        <div className="flex flex-col min-w-0 leading-tight">
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-medium text-foreground truncate">
                              {student.fullName}
                            </span>
                            <span className="text-[11px] font-mono text-muted-foreground bg-muted px-1.5 py-0.2 border border-border/60 rounded-none">
                              {student.studentCode}
                            </span>
                          </div>
                          <span className="text-[12px] text-muted-foreground truncate mt-0.5">
                            {t('account.colClass', 'Lớp')}: {className}
                            {parentInfo ? ` · PH: ${parentInfo}` : ''}
                          </span>
                        </div>
                      </div>

                      {/* Right class pill */}
                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium bg-secondary text-secondary-foreground border border-border/60 rounded-none">
                          {className}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border shrink-0 bg-background">
          <div className="text-[12px] text-muted-foreground">
            {selectedCount > 0 ? (
              <span>
                {t('account.willCreateAccounts', 'Sẽ cấp {{count}} tài khoản (mật khẩu mặc định: 123456)', {
                  count: selectedCount,
                })}
              </span>
            ) : (
              <span>{t('account.pleaseSelectPrompt', 'Chưa có hồ sơ nào được chọn')}</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={closeAddModal}
              disabled={isSubmitting}
              className="h-8 px-4 text-[13px] rounded-none border-border cursor-pointer"
            >
              {t('account.cancel', 'Hủy')}
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={selectedCount === 0 || isSubmitting}
              className="h-8 px-4 text-[13px] rounded-none bg-[#1447e6] hover:bg-[#1447e6]/90 text-white cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              <HugeiconsIcon icon={UserAdd01Icon} size={15} />
              <span>
                {isSubmitting
                  ? t('account.creating', 'Đang tạo...')
                  : t('account.createWithCount', 'Tạo tài khoản ({{count}})', {
                    count: selectedCount,
                  })}
              </span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Export alias for consistency
export const AddAccountModal = AddAccountDrawer;
