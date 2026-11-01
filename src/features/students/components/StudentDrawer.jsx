import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { HugeiconsIcon } from '@hugeicons/react';
import { Cancel01Icon, Add01Icon } from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  useStudentStore,
  getStudentAvatarUrl,
  generateStudentCode,
  transformBackendStudent,
  toDisplayDate,
} from '../students.store';
import { studentsApi } from '../students.api';
import { useClassesStore, findTeacherClassForYear } from '@/features/classes/classes.store';
import { useAuthStore } from '@/features/auth';
import { useAcademicYearStore } from '@/features/academic-years';
import { cn } from '@/shared/lib/utils';

export function StudentDrawer({
  currentClassId: propClassId,
  classEnrollment: propClassEnrollment,
  contextualStatus: propContextualStatus,
  onSuccess,
}) {
  const { t } = useTranslation();
  const {
    isDrawerOpen,
    drawerMode,
    editingStudentId,
    students,
    closeDrawer,
    createStudent,
    updateStudent,
  } = useStudentStore();

  const user = useAuthStore((state) => state.user);
  const selectedYearId = useAcademicYearStore((state) => state.selectedYearId);
  const isTeacher =
    user?.role === 'TEACHER_GV' ||
    user?.role === 'TEACHER' ||
    user?.role?.toLowerCase()?.includes('teacher');

  const classes = useClassesStore((state) => state.classes);
  const hasLoadedClasses = useClassesStore((state) => state.hasLoaded);
  const lastFetchedYearId = useClassesStore((state) => state.lastFetchedYearId);
  const fetchClasses = useClassesStore((state) => state.fetchClasses);
  const teacherClass = isTeacher ? findTeacherClassForYear(user, classes, selectedYearId) : null;

  useEffect(() => {
    const isLoadedForYear = hasLoadedClasses && String(lastFetchedYearId) === String(selectedYearId);
    if (isDrawerOpen && !isLoadedForYear) {
      fetchClasses(selectedYearId);
    }
  }, [isDrawerOpen, hasLoadedClasses, lastFetchedYearId, selectedYearId, fetchClasses]);

  const { classId: routeClassId, id: routeId } = useParams();
  const location = useLocation();
  const isUnderClassesRoute = location.pathname.startsWith('/classes/');
  const activeClassId = propClassId || routeClassId || (isUnderClassesRoute ? routeId : null);
  const isInClassContext = Boolean(activeClassId);

  const [detailStudent, setDetailStudent] = useState(null);

  const currentStudent = students.find(
    (item) =>
      String(item.id) === String(editingStudentId) ||
      item.studentCode === editingStudentId ||
      item.publicId === editingStudentId,
  );

  // Active form tab: 'basic' | 'parents' | 'health'
  const [activeTab, setActiveTab] = useState('basic');

  // Student Basic Info
  const [studentCode, setStudentCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('Nam');
  const [classId, setClassId] = useState('');
  const [status, setStatus] = useState('studying');
  const [joinDate, setJoinDate] = useState('');
  const [ethnic, setEthnic] = useState('Kinh');
  const [nationality, setNationality] = useState('Việt Nam');
  const [placeOfBirth, setPlaceOfBirth] = useState('');
  const [permanentResidence, setPermanentResidence] = useState('');
  const [currentResidence, setCurrentResidence] = useState('');

  // Parents / Guardians array state (initially empty; students can be created without parents)
  const [parents, setParents] = useState([]);

  // Health & Education History
  const [allergyNotes, setAllergyNotes] = useState('');
  const [medicalNotes, setMedicalNotes] = useState('');
  const [previousSchool, setPreviousSchool] = useState('');

  const activeClassEnrollment = useMemo(() => {
    if (!activeClassId) return null;
    if (propClassEnrollment) return propClassEnrollment;
    const history = detailStudent?.enrollmentHistory || currentStudent?.enrollmentHistory || [];
    const found = history.find((e) => String(e.classId) === String(activeClassId));
    if (found) return found;
    if (
      currentStudent?.currentClass &&
      String(currentStudent.currentClass.classId) === String(activeClassId)
    ) {
      return {
        classId: activeClassId,
        className: currentStudent.currentClass.className,
        enrolledAt: currentStudent.currentClass.enrolledAt || currentStudent.enrollmentDate || currentStudent.joinDate,
        leftAt: null,
        status: 'ENROLLED',
      };
    }
    return null;
  }, [activeClassId, propClassEnrollment, detailStudent, currentStudent]);

  const enrollmentStatusLabel = useMemo(() => {
    if (!isInClassContext) return '';

    const rawStatus = activeClassEnrollment?.status || propContextualStatus?.status;
    if (rawStatus) {
      const key = String(rawStatus).toUpperCase();
      switch (key) {
        case 'ENROLLED':
        case 'STUDYING':
          return t('student.statusStudying', 'Đang học');
        case 'TRANSFERRED_CLASS':
          return t('student.statusTransferredClass', 'Đã chuyển lớp');
        case 'TRANSFERRED':
        case 'TRANSFERRED_SCHOOL':
          return t('student.statusTransferred', 'Chuyển trường');
        case 'COMPLETED':
          return t('student.statusCompleted', 'Hoàn thành');
        case 'GRADUATED':
          return t('student.statusGraduated', 'Đã tốt nghiệp');
        case 'RESERVED':
          return t('student.statusReserved', 'Bảo lưu');
        case 'DROPPED_OUT':
          return t('student.statusDroppedOut', 'Thôi học');
        default:
          break;
      }
    }

    if (activeClassEnrollment?.leftAt) {
      return t('student.statusCompleted', 'Hoàn thành');
    }

    return t('student.statusStudying', 'Đang học');
  }, [isInClassContext, activeClassEnrollment, propContextualStatus, t]);

  const classEnrolledAtStr = useMemo(() => {
    if (!isInClassContext) return '';
    const dateVal = activeClassEnrollment?.enrolledAt || (activeClassEnrollment ? currentStudent?.joinDate : null);
    return dateVal ? toDisplayDate(dateVal) : (joinDate || '—');
  }, [isInClassContext, activeClassEnrollment, currentStudent?.joinDate, joinDate]);

  const classLeftAtStr = useMemo(() => {
    if (!isInClassContext || !activeClassEnrollment?.leftAt) return '';
    return toDisplayDate(activeClassEnrollment.leftAt);
  }, [isInClassContext, activeClassEnrollment?.leftAt]);

  const isStudentGraduated = useMemo(() => {
    if (drawerMode !== 'edit') return false;
    const st = detailStudent?.status || currentStudent?.status;
    return (st || '').toLowerCase() === 'graduated';
  }, [drawerMode, detailStudent?.status, currentStudent?.status]);

  // Sync state when drawer opens or student changes
  useEffect(() => {
    let isMounted = true;

    if (drawerMode === 'edit') {
      if (currentStudent) {
        setStudentCode(currentStudent.studentCode || '');
        setFullName(currentStudent.fullName || '');
        setDob(currentStudent.dob || '');
        setGender(currentStudent.gender || 'Nam');
        setClassId(activeClassId || currentStudent.currentClass?.classId || '');
        setStatus(currentStudent.status || 'studying');
        setJoinDate(currentStudent.joinDate || '');
        setEthnic(currentStudent.ethnic || 'Kinh');
        setNationality(currentStudent.nationality || 'Việt Nam');
        setPlaceOfBirth(currentStudent.placeOfBirth || '');
        setPermanentResidence(currentStudent.permanentResidence || '');
        setCurrentResidence(currentStudent.currentResidence || '');

        if (Array.isArray(currentStudent.parents) && currentStudent.parents.length > 0) {
          setParents(
            currentStudent.parents.map((p, idx) => ({
              id: p.id || `p_${idx}`,
              fullName: p.fullName || '',
              relationship: p.relationship || '',
              phone: p.phone || '',
              citizenId: p.citizenId || p.citizen_id || '',
            })),
          );
        } else {
          setParents([]);
        }

        setAllergyNotes(currentStudent.allergyNotes || '');
        setMedicalNotes(currentStudent.medicalNotes || '');
        setPreviousSchool(currentStudent.previousSchool || currentStudent.notes || '');
      }

      // Always fetch fresh full detail to guarantee parents array is 100% loaded
      if (editingStudentId) {
        studentsApi
          .getById(editingStudentId)
          .then((fullData) => {
            if (!isMounted || !fullData) return;
            const transformed = transformBackendStudent(fullData);
            if (!transformed) return;

            setDetailStudent(transformed);
            setStudentCode((prev) => prev || transformed.studentCode || '');
            setFullName((prev) => prev || transformed.fullName || '');
            setDob((prev) => prev || transformed.dob || '');
            setGender((prev) => prev || transformed.gender || 'Nam');
            setClassId(activeClassId || transformed.currentClass?.classId || '');
            setStatus((prev) => prev || transformed.status || 'studying');
            setJoinDate((prev) => prev || transformed.joinDate || '');
            setEthnic((prev) => prev || transformed.ethnic || 'Kinh');
            setNationality((prev) => prev || transformed.nationality || 'Việt Nam');
            setPlaceOfBirth((prev) => prev || transformed.placeOfBirth || '');
            setPermanentResidence((prev) => prev || transformed.permanentResidence || '');
            setCurrentResidence((prev) => prev || transformed.currentResidence || '');
            setAllergyNotes((prev) => prev || transformed.allergyNotes || '');
            setMedicalNotes((prev) => prev || transformed.medicalNotes || '');
            setPreviousSchool((prev) => prev || transformed.previousSchool || '');

            if (Array.isArray(transformed.parents) && transformed.parents.length > 0) {
              setParents(
                transformed.parents.map((p, idx) => ({
                  id: p.id || `p_${idx}`,
                  fullName: p.fullName || '',
                  relationship: p.relationship || '',
                  phone: p.phone || '',
                  citizenId: p.citizenId || p.citizen_id || '',
                })),
              );
            }
          })
          .catch((err) => {
            console.warn('Could not fetch full student details in drawer:', err);
          });
      }
    } else {
      setDetailStudent(null);
      setFullName('');
      setDob('15/05/2023');
      setGender('Nam');
      setClassId(isTeacher && teacherClass?.id ? teacherClass.id : '');
      setStatus('studying');
      setJoinDate('01/09/2026');
      setEthnic('Kinh');
      setNationality('Việt Nam');
      setPlaceOfBirth('Hà Nội');
      setPermanentResidence('');
      setCurrentResidence('');
      setParents([
        {
          id: `p_init_${Date.now()}`,
          fullName: '',
          relationship: 'Bố',
          phone: '',
        },
      ]);

      setAllergyNotes('');
      setMedicalNotes('');
      setPreviousSchool('');
    }
    setActiveTab('basic');

    return () => {
      isMounted = false;
    };
  }, [drawerMode, currentStudent, editingStudentId, isDrawerOpen, isTeacher, teacherClass, activeClassId]);

  // Helper to derive suitable grade from date of birth
  const getDobInfo = (dobStr) => {
    if (!dobStr) return null;
    let birthYear;
    if (typeof dobStr === 'string' && dobStr.includes('/')) {
      const parts = dobStr.split('/');
      if (parts.length === 3) birthYear = parseInt(parts[2], 10);
    } else {
      const d = new Date(dobStr);
      if (!isNaN(d.getTime())) birthYear = d.getFullYear();
    }
    if (!birthYear || isNaN(birthYear)) return null;
    if (birthYear >= 2023) return { gradeLabel: 'Khối Nhà trẻ (12–36 tháng)' };
    if (birthYear === 2022) return { gradeLabel: 'Khối Mầm (3–4 tuổi)' };
    if (birthYear === 2021) return { gradeLabel: 'Khối Chồi (4–5 tuổi)' };
    return { gradeLabel: 'Khối Lá (5–6 tuổi)' };
  };

  const dobInfo = getDobInfo(dob);

  // Auto-generate student code on create mode based on admission year (joinDate)
  useEffect(() => {
    if (drawerMode === 'create' && isDrawerOpen) {
      const targetClass = classes?.find((c) => String(c.id || c.class_id) === String(classId));
      const startYear = targetClass?.schoolYear?.startDate
        ? new Date(targetClass.schoolYear.startDate).getFullYear()
        : 2026;
      const code = generateStudentCode({
        joinDate,
        schoolYearStartYear: startYear,
        existingStudents: students,
      });
      setStudentCode(code);
    }
  }, [drawerMode, isDrawerOpen, joinDate, classId, classes, students]);

  // Dynamic Parent Handlers
  const handleAddParent = () => {
    setParents((prev) => [
      ...prev,
      {
        id: `p_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        fullName: '',
        relationship: '',
        phone: '',
        citizenId: '',
      },
    ]);
  };

  const handleRemoveParent = (indexToRemove) => {
    setParents((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleUpdateParent = (index, field, value) => {
    setParents((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item)),
    );
  };

  if (!isDrawerOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isTeacher && drawerMode === 'edit') {
      toast.error('Giáo viên không có quyền chỉnh sửa hồ sơ học sinh hoặc thông tin phụ huynh.');
      return;
    }
    if (isStudentGraduated) {
      toast.error('Học sinh đã tốt nghiệp, không thể chỉnh sửa thông tin hồ sơ.');
      return;
    }
    if (!fullName.trim()) {
      toast.error('Vui lòng nhập họ và tên học sinh');
      setActiveTab('basic');
      return;
    }

    if (dob && dob.trim()) {
      let yr;
      if (dob.includes('/')) {
        const parts = dob.split('/');
        if (parts.length === 3) yr = parseInt(parts[2], 10);
      } else {
        yr = new Date(dob).getFullYear();
      }
      if (yr && !isNaN(yr) && yr < 2000) {
        toast.error('Năm sinh học sinh phải từ năm 2000 trở đi');
        setActiveTab('basic');
        return;
      }
    }

    if (joinDate && joinDate.trim()) {
      let yr;
      if (joinDate.includes('/')) {
        const parts = joinDate.split('/');
        if (parts.length === 3) yr = parseInt(parts[2], 10);
      } else {
        yr = new Date(joinDate).getFullYear();
      }
      if (yr && !isNaN(yr) && yr < 2000) {
        toast.error('Ngày nhập học tối thiểu phải từ năm 2000');
        setActiveTab('basic');
        return;
      }
    }

    const validParents = parents
      .map((p) => ({
        fullName: p.fullName?.trim() || '',
        relationship: p.relationship?.trim() || 'Người giám hộ',
        phone: p.phone?.trim() || '',
        citizenId: p.citizenId?.trim() || '',
      }))
      .filter((p) => p.fullName || p.phone || p.citizenId);

    // Validate parent info only if user actually added a parent
    if (validParents.length > 0) {
      for (const p of validParents) {
        if (!p.fullName) {
          toast.error(t('student.parentNameRequired', 'Vui lòng nhập họ và tên phụ huynh'));
          setActiveTab('parents');
          return;
        }
        if (!p.phone || !/^[0-9]{9,15}$/.test(p.phone)) {
          toast.error(t('student.parentPhoneInvalid', 'Số điện thoại phụ huynh phải từ 9 đến 15 chữ số'));
          setActiveTab('parents');
          return;
        }
        if (p.citizenId && !/^[0-9]{9,12}$/.test(p.citizenId)) {
          toast.error('Số CCCD của phụ huynh phải có từ 9 đến 12 chữ số');
          setActiveTab('parents');
          return;
        }
      }

      // Check duplicate CCCDs
      const cccds = validParents.map((p) => p.citizenId).filter(Boolean);
      const duplicateCccd = cccds.find((cid, idx) => cccds.indexOf(cid) !== idx);
      if (duplicateCccd) {
        toast.error(`Số CCCD '${duplicateCccd}' bị trùng giữa các phụ huynh`);
        setActiveTab('parents');
        return;
      }
    }

    const selectedClass = (classes || []).find((c) => String(c.id) === String(classId));

    const payload = {
      studentCode: studentCode.trim() || `HS${String(Date.now()).slice(-4)}`,
      fullName: fullName.trim(),
      dob: dob.trim(),
      gender,
      classId: classId || null,
      currentClass: selectedClass
        ? {
          classId: selectedClass.id,
          className: selectedClass.name,
          roomNumber: selectedClass.room,
          ageGroup: selectedClass.grade.toUpperCase(),
          schoolYearName: selectedClass.academicYear,
        }
        : null,
      status,
      joinDate: joinDate.trim(),
      ethnic: ethnic.trim(),
      nationality: nationality.trim(),
      placeOfBirth: placeOfBirth.trim(),
      permanentResidence: permanentResidence.trim(),
      currentResidence: currentResidence.trim(),
      allergyNotes: allergyNotes.trim(),
      medicalNotes: medicalNotes.trim(),
      previousSchool: previousSchool.trim(),
      notes: previousSchool.trim(),
      parents: validParents,
      primaryParent: validParents[0] || null,
      avatar: currentStudent?.avatar || getStudentAvatarUrl(null, studentCode.trim() || fullName.trim()),
    };

    try {
      if (drawerMode === 'edit' && editingStudentId) {
        const editPayload = {
          ...payload,
          status: isInClassContext ? undefined : payload.status,
          classId: isInClassContext ? (currentStudent?.currentClass?.classId || classId || null) : (classId || null),
        };
        await updateStudent(editingStudentId, editPayload);
        if (onSuccess) {
          await onSuccess();
        }
        toast.success('Đã cập nhật hồ sơ học sinh thành công');
      } else {
        await createStudent(payload);
        if (onSuccess) {
          await onSuccess();
        }
        toast.success('Đã thêm hồ sơ học sinh mới thành công');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Lưu hồ sơ học sinh thất bại');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        onClick={closeDrawer}
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in-0 duration-200"
      />

      {/* Drawer Panel matching TeacherDrawer */}
      <div
        className={cn(
          'relative w-full max-w-[560px] h-full bg-card border-l border-border shadow-2xl flex flex-col',
          'animate-in slide-in-from-right duration-250 ease-out z-10 text-foreground',
        )}
        data-name="Student Drawer"
      >
        {/* Header matching TeacherDrawer */}
        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-border shrink-0">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <h2 className="text-[18px] font-semibold text-foreground tracking-tight">
                {drawerMode === 'edit'
                  ? t('student.editProfile', 'Chỉnh sửa hồ sơ học sinh')
                  : t('student.newProfile', 'Tiếp nhận học sinh mới')}
              </h2>
              {(currentStudent?.studentCode || studentCode) && (
                <span className="font-mono text-[11px] font-medium bg-muted text-muted-foreground border border-border px-2 py-0.5 rounded-none">
                  {currentStudent?.studentCode || studentCode}
                </span>
              )}
            </div>
            <p className="text-[12px] text-muted-foreground font-normal">
              {drawerMode === 'edit'
                ? `Cập nhật thông tin bé ${currentStudent?.fullName || ''}`
                : 'Tạo hồ sơ học sinh, người giám hộ và ghi chú chăm sóc'}
            </p>
          </div>

          <button
            type="button"
            onClick={closeDrawer}
            className="size-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-none transition-colors cursor-pointer"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={16} />
          </button>
        </div>

        {isStudentGraduated && (
          <div className="mx-6 my-2.5 px-3.5 py-2 bg-purple-500/10 border border-purple-500/30 text-purple-800 dark:text-purple-300 text-[12px] flex items-center gap-2">
            <span>Học sinh đã tốt nghiệp ra trường. Không thể chỉnh sửa thông tin hồ sơ hoặc trạng thái.</span>
          </div>
        )}

        {/* Section Tabs */}
        <div className="flex border-b border-border bg-muted/20 px-6 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('basic')}
            className={cn(
              'py-2.5 px-3 text-[13px] font-medium border-b-2 -mb-px transition-colors cursor-pointer',
              activeTab === 'basic'
                ? 'border-primary text-primary font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            1. Thông tin học sinh
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('parents')}
            className={cn(
              'py-2.5 px-3 text-[13px] font-medium border-b-2 -mb-px transition-colors cursor-pointer',
              activeTab === 'parents'
                ? 'border-primary text-primary font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            2. Phụ huynh & Giám hộ
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('health')}
            className={cn(
              'py-2.5 px-3 text-[13px] font-medium border-b-2 -mb-px transition-colors cursor-pointer',
              activeTab === 'health'
                ? 'border-primary text-primary font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            3. Sức khỏe & Ghi chú
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: BASIC INFO */}
          {activeTab === 'basic' && (
            <>
              {/* Card 1: Thông tin định danh */}
              <div className="border border-border bg-card rounded-none overflow-hidden">
                <div className="p-4 border-b border-border bg-muted/20">
                  <h3 className="text-[14px] font-semibold text-foreground">
                    Thông tin nhận diện
                  </h3>
                  <p className="text-[12px] text-muted-foreground font-normal">
                    Họ tên, ngày sinh, giới tính và xuất thân
                  </p>
                </div>

                <div className="p-4 space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-[12px] font-medium text-foreground">
                      Họ và tên học sinh <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Nguyễn Gia Bảo"
                      className="h-9 text-[13px] rounded-none border-border"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[12px] font-medium text-foreground">
                        Ngày sinh (DD/MM/YYYY) <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        value={dob}
                        onChange={(e) => setDob(e.target.value)}
                        placeholder="15/05/2023"
                        className="h-9 text-[13px] rounded-none border-border"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-[12px] font-medium text-foreground">
                        Giới tính
                      </Label>
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        className="w-full h-9 px-3 bg-background border border-border rounded-none text-[13px] text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer"
                      >
                        <option value="Nam">Nam (Bé trai)</option>
                        <option value="Nữ">Nữ (Bé gái)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[12px] font-medium text-foreground">
                        Dân tộc
                      </Label>
                      <Input
                        value={ethnic}
                        onChange={(e) => setEthnic(e.target.value)}
                        placeholder="Kinh"
                        className="h-9 text-[13px] rounded-none border-border"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-[12px] font-medium text-foreground">
                        Quốc tịch
                      </Label>
                      <Input
                        value={nationality}
                        onChange={(e) => setNationality(e.target.value)}
                        placeholder="Việt Nam"
                        className="h-9 text-[13px] rounded-none border-border"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Phân lớp & Học vụ */}
              <div className="border border-border bg-card rounded-none overflow-hidden">
                <div className="p-4 border-b border-border bg-muted/20">
                  <h3 className="text-[14px] font-semibold text-foreground">
                    Phân lớp & Trạng thái học tập
                  </h3>
                  <p className="text-[12px] text-muted-foreground font-normal">
                    Lớp đang theo học và trạng thái học vụ
                  </p>
                </div>

                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[12px] font-medium text-foreground">
                        Lớp học
                      </Label>
                      <select
                        value={classId}
                        onChange={(e) => setClassId(e.target.value)}
                        disabled={isTeacher || isInClassContext}
                        className={cn(
                          'w-full h-9 px-3 bg-background border border-border rounded-none text-[13px] text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer',
                          (isTeacher || isInClassContext) && 'bg-muted cursor-not-allowed opacity-90'
                        )}
                      >
                        <option value="">-- Chưa phân lớp --</option>
                        {(classes || []).map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} {c.room ? `(${c.room})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-[12px] font-medium text-foreground">
                        Trạng thái học vụ
                      </Label>
                      {isInClassContext ? (
                        <Input
                          value={enrollmentStatusLabel}
                          disabled
                          readOnly
                          className="h-9 text-[13px] rounded-none border-border bg-muted cursor-not-allowed opacity-90 text-foreground font-medium"
                        />
                      ) : (
                        <select
                          value={status}
                          onChange={(e) => setStatus(e.target.value)}
                          className="w-full h-9 px-3 bg-background border border-border rounded-none text-[13px] text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer"
                        >
                          <option value="studying">Đang học</option>
                          <option value="reserved">Bảo lưu</option>
                          <option value="transferred">Chuyển trường</option>
                          <option value="dropped_out">Thôi học</option>
                          <option value="graduated">Đã tốt nghiệp</option>
                        </select>
                      )}
                    </div>
                  </div>

                  {isInClassContext ? (
                    classLeftAtStr ? (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label className="text-[12px] font-medium text-foreground">
                              Ngày vào lớp
                            </Label>
                            <Input
                              value={classEnrolledAtStr || '—'}
                              disabled
                              readOnly
                              className="h-9 text-[13px] rounded-none border-border bg-muted cursor-not-allowed opacity-90 text-foreground"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <Label className="text-[12px] font-medium text-foreground">
                              Ngày rời lớp
                            </Label>
                            <Input
                              value={classLeftAtStr}
                              disabled
                              readOnly
                              className="h-9 text-[13px] rounded-none border-border bg-muted cursor-not-allowed opacity-90 text-foreground"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label className="text-[12px] font-medium text-foreground">
                              Ngày nhập học
                            </Label>
                            <Input
                              value={joinDate || '—'}
                              disabled
                              readOnly
                              className="h-9 text-[13px] rounded-none border-border bg-muted cursor-not-allowed opacity-90 text-foreground"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <Label className="text-[12px] font-medium text-foreground">
                              Nơi sinh
                            </Label>
                            <Input
                              value={placeOfBirth}
                              onChange={(e) => setPlaceOfBirth(e.target.value)}
                              placeholder="Hà Nội"
                              className="h-9 text-[13px] rounded-none border-border"
                            />
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label className="text-[12px] font-medium text-foreground">
                              Ngày vào lớp
                            </Label>
                            <Input
                              value={classEnrolledAtStr || '—'}
                              disabled
                              readOnly
                              className="h-9 text-[13px] rounded-none border-border bg-muted cursor-not-allowed opacity-90 text-foreground"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <Label className="text-[12px] font-medium text-foreground">
                              Ngày nhập học
                            </Label>
                            <Input
                              value={joinDate || '—'}
                              disabled
                              readOnly
                              className="h-9 text-[13px] rounded-none border-border bg-muted cursor-not-allowed opacity-90 text-foreground"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-[12px] font-medium text-foreground">
                            Nơi sinh
                          </Label>
                          <Input
                            value={placeOfBirth}
                            onChange={(e) => setPlaceOfBirth(e.target.value)}
                            placeholder="Hà Nội"
                            className="h-9 text-[13px] rounded-none border-border"
                          />
                        </div>
                      </>
                    )
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-[12px] font-medium text-foreground">
                          Ngày nhập học
                        </Label>
                        <Input
                          value={joinDate}
                          disabled={drawerMode === 'edit'}
                          readOnly={drawerMode === 'edit'}
                          onChange={(e) => setJoinDate(e.target.value)}
                          placeholder="01/09/2026"
                          className={cn(
                            'h-9 text-[13px] rounded-none border-border',
                            drawerMode === 'edit' && 'bg-muted cursor-not-allowed opacity-90 text-foreground'
                          )}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-[12px] font-medium text-foreground">
                          Nơi sinh
                        </Label>
                        <Input
                          value={placeOfBirth}
                          onChange={(e) => setPlaceOfBirth(e.target.value)}
                          placeholder="Hà Nội"
                          className="h-9 text-[13px] rounded-none border-border"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label className="text-[12px] font-medium text-foreground">
                      Địa chỉ thường trú
                    </Label>
                    <Input
                      value={permanentResidence}
                      onChange={(e) => setPermanentResidence(e.target.value)}
                      placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/TP"
                      className="h-9 text-[13px] rounded-none border-border"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[12px] font-medium text-foreground">
                      Nơi ở hiện tại
                    </Label>
                    <Input
                      value={currentResidence}
                      onChange={(e) => setCurrentResidence(e.target.value)}
                      placeholder="Khu đô thị, số nhà, phường/xã..."
                      className="h-9 text-[13px] rounded-none border-border"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* TAB 2: PARENTS & GUARDIANS */}
          {activeTab === 'parents' && (
            <div className="space-y-4">
              {parents.length === 0 ? (
                <div className="border border-border bg-card rounded-none p-8 text-center flex flex-col items-center justify-center gap-3">
                  <p className="text-[13px] text-muted-foreground">
                    {t('student.noParentsAdded', 'Chưa có thông tin phụ huynh nào được thêm.')}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddParent}
                    className="h-8 px-3 text-[12px] rounded-none border border-border hover:bg-muted text-foreground flex items-center gap-1.5 cursor-pointer font-medium"
                  >
                    <HugeiconsIcon icon={Add01Icon} size={15} />
                    <span>{t('student.addParentBtn', 'Thêm phụ huynh')}</span>
                  </Button>
                </div>
              ) : (
                <>
                  {parents.map((p, idx) => (
                    <div
                      key={p.id || idx}
                      className="border border-border bg-card rounded-none overflow-hidden"
                    >
                      <div className="p-3 px-4 border-b border-border bg-muted/20 flex items-center justify-between">
                        <h3 className="text-[13px] font-semibold text-foreground">
                          {t('student.parentItemTitle', 'Phụ huynh #{{index}}', { index: idx + 1 })}
                        </h3>

                        <button
                          type="button"
                          onClick={() => handleRemoveParent(idx)}
                          className="size-7 flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-muted/80 rounded-none transition-colors cursor-pointer"
                          title={t('student.removeParentBtn', 'Xóa phụ huynh này')}
                          aria-label={t('student.removeParentBtn', 'Xóa phụ huynh này')}
                        >
                          <HugeiconsIcon icon={Cancel01Icon} size={15} />
                        </button>
                      </div>

                      <div className="p-4 space-y-3.5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          <div className="space-y-1.5">
                            <Label className="text-[12px] font-medium text-foreground">
                              {t('student.parentFullName', 'Họ và tên')} <span className="text-destructive">*</span>
                            </Label>
                            <Input
                              value={p.fullName}
                              onChange={(e) => handleUpdateParent(idx, 'fullName', e.target.value)}
                              placeholder="Ví dụ: Nguyễn Văn A"
                              className="h-9 text-[13px] rounded-none border-border"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <Label className="text-[12px] font-medium text-foreground">
                              {t('student.relationship', 'Mối quan hệ')} <span className="text-destructive">*</span>
                            </Label>
                            <Input
                              value={p.relationship}
                              onChange={(e) => handleUpdateParent(idx, 'relationship', e.target.value)}
                              placeholder="VD: Bố, Mẹ, Ông, Bà..."
                              className="h-9 text-[13px] rounded-none border-border"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          <div className="space-y-1.5">
                            <Label className="text-[12px] font-medium text-foreground">
                              {t('student.parentPhone', 'Số điện thoại')} <span className="text-destructive">*</span>
                            </Label>
                            <Input
                              value={p.phone}
                              onChange={(e) => handleUpdateParent(idx, 'phone', e.target.value)}
                              placeholder="Ví dụ: 0901234567"
                              className="h-9 text-[13px] rounded-none border-border font-mono"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <Label className="text-[12px] font-medium text-foreground">
                              Số CCCD / Định danh
                            </Label>
                            <Input
                              value={p.citizenId || ''}
                              onChange={(e) => handleUpdateParent(idx, 'citizenId', e.target.value)}
                              placeholder="Ví dụ: 079185001111 (12 số)"
                              maxLength={12}
                              className="h-9 text-[13px] rounded-none border-border font-mono"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddParent}
                    className="w-full h-9 text-[13px] rounded-none border border-dashed border-border hover:bg-muted text-foreground flex items-center justify-center gap-1.5 cursor-pointer font-medium"
                  >
                    <HugeiconsIcon icon={Add01Icon} size={15} />
                    <span>{t('student.addParentBtn', '+ Thêm phụ huynh')}</span>
                  </Button>
                </>
              )}
            </div>
          )}

          {/* TAB 3: HEALTH & NOTES */}
          {activeTab === 'health' && (
            <>
              {/* Card 1: Thông tin sức khỏe */}
              <div className="border border-border bg-card rounded-none overflow-hidden">
                <div className="p-4 border-b border-border bg-muted/20">
                  <h3 className="text-[14px] font-semibold text-foreground">
                    Theo dõi sức khỏe & Thể trạng
                  </h3>
                  <p className="text-[12px] text-muted-foreground font-normal">
                    Dị ứng thức ăn và tiền sử bệnh lý cần lưu ý
                  </p>
                </div>

                <div className="p-4 space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-[12px] font-medium text-foreground">
                      Dị ứng thực phẩm / Thuốc
                    </Label>
                    <textarea
                      rows={2}
                      value={allergyNotes}
                      onChange={(e) => setAllergyNotes(e.target.value)}
                      placeholder="VD: Dị ứng hải sản, dị ứng kháng sinh Penicillin..."
                      className="w-full p-2.5 bg-background border border-border rounded-none text-[13px] text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[12px] font-medium text-foreground">
                      Tiền sử bệnh lý / Lưu ý chăm sóc
                    </Label>
                    <textarea
                      rows={2}
                      value={medicalNotes}
                      onChange={(e) => setMedicalNotes(e.target.value)}
                      placeholder="VD: Tiền sử co giật khi sốt cao, hen suyễn..."
                      className="w-full p-2.5 bg-background border border-border rounded-none text-[13px] text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>

              {/* Card 2: Trường mầm non trước đây */}
              <div className="border border-border bg-card rounded-none overflow-hidden">
                <div className="p-4 border-b border-border bg-muted/20">
                  <h3 className="text-[14px] font-semibold text-foreground">
                    Hồ sơ chuyển trường
                  </h3>
                  <p className="text-[12px] text-muted-foreground font-normal">
                    Trường mầm non bé từng theo học trước đây
                  </p>
                </div>

                <div className="p-4 space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-[12px] font-medium text-foreground">
                      Trường mầm non trước đây
                    </Label>
                    <input
                      type="text"
                      value={previousSchool}
                      onChange={(e) => setPreviousSchool(e.target.value)}
                      placeholder="Nếu không có, để trống"
                      className="w-full h-9 px-3 bg-background border border-border rounded-none text-[13px] text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </form>

        {/* Footer matching TeacherDrawer */}
        <div className="flex items-center justify-between gap-2 px-6 py-4 border-t border-border shrink-0 bg-background">
          <div className="flex gap-1.5">
            {activeTab !== 'basic' && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setActiveTab(activeTab === 'health' ? 'parents' : 'basic')}
                className="h-8 px-3 text-[13px] rounded-none border-border cursor-pointer"
              >
                Quay lại
              </Button>
            )}
            {activeTab !== 'health' && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setActiveTab(activeTab === 'basic' ? 'parents' : 'health')}
                className="h-8 px-3 text-[13px] rounded-none border-border cursor-pointer"
              >
                Tiếp theo
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={closeDrawer}
              className="h-8 px-4 text-[13px] rounded-none border-border cursor-pointer"
            >
              {t('common.cancel', 'Hủy')}
            </Button>
            {!(isTeacher && drawerMode === 'edit') && (
              <Button
                type="button"
                disabled={isStudentGraduated}
                onClick={handleSubmit}
                className={cn(
                  'h-8 px-4 text-[13px] rounded-none bg-[#1447e6] hover:bg-[#1447e6]/90 text-white cursor-pointer',
                  isStudentGraduated && 'opacity-40 cursor-not-allowed hover:bg-[#1447e6]'
                )}
                title={isStudentGraduated ? 'Học sinh đã tốt nghiệp, không thể chỉnh sửa' : undefined}
              >
                {drawerMode === 'edit'
                  ? t('common.saveChanges', 'Lưu thay đổi')
                  : t('student.createSubmit', 'Thêm học sinh')}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default StudentDrawer;
