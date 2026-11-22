import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { HugeiconsIcon } from '@hugeicons/react';
import { Cancel01Icon } from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTeacherStore, getTeacherAvatarUrl, generateTeacherCode } from '../teachers.store';
import { useAuthStore } from '@/features/auth';
import { cn } from '@/shared/lib/utils';

export function TeacherDrawer() {
  const { t } = useTranslation();
  const currentUser = useAuthStore((state) => state.user);
  const {
    isDrawerOpen,
    drawerMode,
    editingTeacherId,
    teachers,
    closeDrawer,
    createTeacher,
    updateTeacher,
  } = useTeacherStore();

  const currentTeacher = teachers.find((item) => item.id === editingTeacherId);

  const isSelf = Boolean(
    drawerMode === 'edit' &&
      currentTeacher &&
      currentUser &&
      ((currentUser.teacherId && String(currentTeacher.id) === String(currentUser.teacherId)) ||
        (currentUser.teacher?.id && String(currentTeacher.id) === String(currentUser.teacher.id)) ||
        (currentUser.employeeCode && currentTeacher.employeeCode?.toLowerCase() === currentUser.employeeCode?.toLowerCase()) ||
        (currentUser.email && currentTeacher.email?.toLowerCase() === currentUser.email?.toLowerCase()) ||
        (currentUser.id && currentTeacher.accountId && String(currentTeacher.accountId) === String(currentUser.id)))
  );

  // Form State matching DB Schema (model Teacher)
  const [employeeCode, setEmployeeCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [citizenId, setCitizenId] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('Nam');
  const [dob, setDob] = useState('');
  const [role, setRole] = useState('Giáo viên');
  const [status, setStatus] = useState('active');
  const [joinDate, setJoinDate] = useState('');
  const [address, setAddress] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const isValidCalendarDate = (dateStr) => {
    if (!dateStr || typeof dateStr !== 'string') return false;
    let d, m, y;
    if (dateStr.includes('/')) {
      const parts = dateStr.trim().split('/');
      if (parts.length !== 3) return false;
      d = parseInt(parts[0], 10);
      m = parseInt(parts[1], 10);
      y = parseInt(parts[2], 10);
    } else if (dateStr.includes('-')) {
      const parts = dateStr.trim().split('-');
      if (parts.length !== 3) return false;
      y = parseInt(parts[0], 10);
      m = parseInt(parts[1], 10);
      d = parseInt(parts[2], 10);
    } else {
      return false;
    }
    if (isNaN(d) || isNaN(m) || isNaN(y)) return false;
    if (m < 1 || m > 12 || y < 1900 || y > 2100) return false;
    const daysInMonth = new Date(y, m, 0).getDate();
    return d >= 1 && d <= daysInMonth;
  };

  // Sync state when drawer opens or teacher changes
  useEffect(() => {
    setFieldErrors({});
    if (drawerMode === 'edit' && currentTeacher) {
      setEmployeeCode(currentTeacher.employeeCode || '');
      setFullName(currentTeacher.fullName || '');
      setCitizenId(currentTeacher.citizenId || '');
      setEmail(currentTeacher.email || '');
      setPhone(currentTeacher.phone || '');
      setGender(currentTeacher.gender || 'Nam');
      setDob(currentTeacher.dob || '');
      setRole(currentTeacher.role || currentTeacher.position || 'Giáo viên');
      setStatus(currentTeacher.status || 'active');
      setJoinDate(currentTeacher.joinDate || '');
      setAddress(currentTeacher.address || '');
    } else {
      const initialJoin = '01/09/2026';
      const code = generateTeacherCode(teachers, initialJoin);
      setEmployeeCode(code);
      setFullName('');
      setCitizenId('');
      setEmail('');
      setPhone('');
      setGender('Nam');
      setDob('01/01/1998');
      setRole('Giáo viên');
      setStatus('active');
      setJoinDate(initialJoin);
      setAddress('');
    }
  }, [drawerMode, currentTeacher, isDrawerOpen, teachers]);

  // Recalculate employeeCode in create mode if joinDate changes
  useEffect(() => {
    if (drawerMode === 'create' && isDrawerOpen) {
      const code = generateTeacherCode(teachers, joinDate);
      setEmployeeCode(code);
    }
  }, [drawerMode, isDrawerOpen, joinDate, teachers]);

  if (!isDrawerOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!fullName.trim()) {
      errors.fullName = t('teacher.validationFullName', 'Vui lòng nhập họ và tên.');
    }

    const trimmedCccd = citizenId.trim();
    if (!trimmedCccd) {
      errors.citizenId = t('teacher.validationCitizenId', 'Vui lòng nhập số CCCD/CMND.');
    } else if (!/^([0-9]{9}|[0-9]{12})$/.test(trimmedCccd)) {
      errors.citizenId = t('teacher.validationCitizenIdFormat', 'Số CCCD/CMND không đúng định dạng. Vui lòng kiểm tra lại.');
    } else {
      const dupCccd = teachers.find(
        (t) =>
          (drawerMode !== 'edit' || (t.id !== editingTeacherId && t.publicId !== editingTeacherId)) &&
          t.citizenId &&
          t.citizenId.trim() === trimmedCccd,
      );
      if (dupCccd) {
        errors.citizenId = t('teacher.validationCitizenIdDuplicate', "Số CCCD/CMND '{{id}}' đã được đăng ký bởi cán bộ khác ({{name}}).", { id: trimmedCccd, name: dupCccd.fullName });
      }
    }

    if (!email.trim()) {
      errors.email = t('teacher.validationEmail', 'Vui lòng nhập email.');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = t('teacher.validationEmailFormat', 'Email không đúng định dạng.');
    } else {
      const dupEmail = teachers.find(
        (t) =>
          (drawerMode !== 'edit' || (t.id !== editingTeacherId && t.publicId !== editingTeacherId)) &&
          t.email &&
          t.email.trim().toLowerCase() === email.trim().toLowerCase(),
      );
      if (dupEmail) {
        errors.email = t('teacher.validationEmailDuplicate', "Email '{{email}}' đã được đăng ký bởi cán bộ khác ({{name}}).", { email: email.trim(), name: dupEmail.fullName });
      }
    }

    if (phone.trim()) {
      if (!/^[0-9]{9,15}$/.test(phone.trim())) {
        errors.phone = t('teacher.validationPhoneFormat', 'Số điện thoại không đúng định dạng (từ 9 đến 15 chữ số).');
      } else {
        const dupPhone = teachers.find(
          (t) =>
            (drawerMode !== 'edit' || (t.id !== editingTeacherId && t.publicId !== editingTeacherId)) &&
            t.phone &&
            t.phone.trim() === phone.trim(),
        );
        if (dupPhone) {
          errors.phone = t('teacher.validationPhoneDuplicate', "Số điện thoại '{{phone}}' đã được đăng ký bởi cán bộ khác ({{name}}).", { phone: phone.trim(), name: dupPhone.fullName });
        }
      }
    }

    if (!joinDate.trim()) {
      errors.joinDate = t('teacher.validationJoinDate', 'Vui lòng chọn ngày vào làm.');
    } else if (!isValidCalendarDate(joinDate)) {
      errors.joinDate = t('teacher.validationJoinDateInvalid', 'Ngày vào làm không tồn tại. Vui lòng nhập ngày hợp lệ.');
    } else {
      let yr;
      if (joinDate.includes('/')) {
        const parts = joinDate.split('/');
        if (parts.length === 3) yr = parseInt(parts[2], 10);
      } else {
        yr = new Date(joinDate).getFullYear();
      }
      if (yr && !isNaN(yr) && yr < 2000) {
        errors.joinDate = t('teacher.validationJoinDateMinYear', 'Năm bắt đầu công tác tối thiểu phải từ năm 2000');
      }
    }

    if (dob.trim() && !isValidCalendarDate(dob)) {
      errors.dob = t('teacher.validationDobInvalid', 'Ngày sinh không tồn tại. Vui lòng nhập ngày hợp lệ.');
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      const firstError = Object.values(errors)[0];
      toast.error(firstError);
      return;
    }

    const payload = {
      employeeCode: drawerMode === 'edit' ? (employeeCode.trim() || undefined) : undefined,
      fullName: fullName.trim(),
      citizenId: citizenId.trim() || undefined,
      email: email.trim(),
      phone: phone.trim(),
      avatar: currentTeacher?.avatar || getTeacherAvatarUrl(null, fullName.trim()),
      gender,
      dob: dob.trim(),
      role: role.trim() || 'Chủ nhiệm',
      status,
      joinDate: joinDate.trim(),
      address: address.trim(),
      updatedAt: drawerMode === 'edit' ? (currentTeacher?.updatedAt || currentTeacher?.updated_at || undefined) : undefined,
    };

    try {
      if (drawerMode === 'edit' && editingTeacherId) {
        await updateTeacher(editingTeacherId, payload);
        toast.success(t('teacher.toastUpdated', 'Đã cập nhật hồ sơ giáo viên thành công'));
      } else {
        await createTeacher(payload);
        toast.success(t('teacher.toastCreated', 'Đã thêm giáo viên mới thành công'));
      }
    } catch (err) {
      console.error('Teacher save failed:', err);
      const msg = err.response?.data?.message || err.message || t('teacher.actionFailed', 'Thao tác không thành công');
      if (err.response?.status === 409) {
        toast.error(msg || t('teacher.concurrentEditError', 'Dữ liệu đã được phiên khác cập nhật. Thay đổi của bạn chưa được lưu. Vui lòng tải lại dữ liệu mới nhất và thực hiện lại.'), {
          duration: 6000,
        });
        useTeacherStore.getState().fetchTeachers();
      } else {
        toast.error(msg);
      }

      const serverErrors = {};
      if (Array.isArray(err.response?.data?.details)) {
        err.response.data.details.forEach((d) => {
          if (d.path) serverErrors[d.path] = d.message;
        });
      }
      const lower = msg.toLowerCase();
      if (lower.includes('cccd') || lower.includes('citizen_id') || lower.includes('citizenid')) {
        serverErrors.citizenId = msg;
      }
      if (lower.includes('email')) {
        serverErrors.email = msg;
      }
      if (lower.includes('điện thoại') || lower.includes('phone') || lower.includes('sđt')) {
        serverErrors.phone = msg;
      }
      if (lower.includes('họ và tên') || lower.includes('fullname')) {
        serverErrors.fullName = msg;
      }
      if (Object.keys(serverErrors).length > 0) {
        setFieldErrors((prev) => ({ ...prev, ...serverErrors }));
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        onClick={closeDrawer}
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in-0 duration-200"
      />

      {/* Drawer Panel matching Figma FE-03C (node 4273:5646) */}
      <div
        className={cn(
          'relative w-full max-w-[560px] h-full bg-card border-l border-border shadow-2xl flex flex-col',
          'animate-in slide-in-from-right duration-250 ease-out z-10 text-foreground',
        )}
        data-node-id="4273:5713"
        data-name="Teacher Edit Drawer"
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-border shrink-0">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <h2 className="text-[18px] font-semibold text-foreground tracking-tight">
                {drawerMode === 'edit'
                  ? t('teacher.editTeacher', 'Chỉnh sửa cán bộ')
                  : t('teacher.addTeacher', 'Thêm cán bộ')}
              </h2>
              {drawerMode === 'edit' && (currentTeacher?.employeeCode || employeeCode) && (
                <span className="font-mono text-[11px] font-medium bg-muted text-muted-foreground border border-border px-2 py-0.5 rounded-none">
                  {currentTeacher?.employeeCode || employeeCode}
                </span>
              )}
            </div>
            <p className="text-[12px] text-muted-foreground font-normal">
              {drawerMode === 'edit'
                ? t(
                    'teacher.editSubtitle',
                    'Cập nhật hồ sơ và thông tin công tác của {{name}}',
                    { name: currentTeacher?.fullName || '' },
                  )
                : t(
                    'teacher.createSubtitle',
                    'Tạo hồ sơ và thông tin công tác giáo viên mới',
                  )}
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

        {/* Form Body */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-6 space-y-6"
        >
          {/* Card 1: Thông tin cá nhân */}
          <div
            className="border border-border bg-card rounded-none overflow-hidden"
            data-node-id="4279:28850"
          >
            <div className="p-4 border-b border-border bg-muted/20">
              <h3 className="text-[14px] font-semibold text-foreground">
                {t('teacher.personalInfo', 'Thông tin cá nhân')}
              </h3>
              <p className="text-[12px] text-muted-foreground font-normal">
                {t(
                  'teacher.personalInfoEditSub',
                  'Cập nhật thông tin liên hệ và nhận diện',
                )}
              </p>
            </div>

            <div className="p-4 space-y-4">
              {/* Row 1: Họ tên & Số CCCD */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[12px] font-medium text-foreground">
                    {t('teacher.fullName', 'Họ tên')} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="text"
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      if (fieldErrors.fullName) setFieldErrors((prev) => ({ ...prev, fullName: '' }));
                    }}
                    placeholder="Nguyễn Đình Vinh"
                    className={cn(
                      "h-9 text-[13px] rounded-none border-border",
                      fieldErrors.fullName && "border-destructive focus-visible:ring-destructive"
                    )}
                  />
                  {fieldErrors.fullName && (
                    <p className="text-[11.5px] text-destructive mt-1">{fieldErrors.fullName}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[12px] font-medium text-foreground">
                    {t('teacher.citizenId', 'Số CCCD/CMND')} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="text"
                    value={citizenId}
                    onChange={(e) => {
                      setCitizenId(e.target.value);
                      if (fieldErrors.citizenId) setFieldErrors((prev) => ({ ...prev, citizenId: '' }));
                    }}
                    placeholder="VD: 079201001234"
                    maxLength={12}
                    className={cn(
                      "h-9 text-[13px] rounded-none border-border font-mono",
                      fieldErrors.citizenId && "border-destructive focus-visible:ring-destructive"
                    )}
                  />
                  {fieldErrors.citizenId && (
                    <p className="text-[11.5px] text-destructive mt-1">{fieldErrors.citizenId}</p>
                  )}
                </div>
              </div>

              {/* Row 2: Email & SĐT */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[12px] font-medium text-foreground">
                    {t('teacher.email', 'Email')} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: '' }));
                    }}
                    placeholder="vinhnd@sorak.vn"
                    className={cn(
                      "h-9 text-[13px] rounded-none border-border",
                      fieldErrors.email && "border-destructive focus-visible:ring-destructive"
                    )}
                  />
                  {fieldErrors.email && (
                    <p className="text-[11.5px] text-destructive mt-1">{fieldErrors.email}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[12px] font-medium text-foreground">
                    {t('teacher.phone', 'SĐT')}
                  </Label>
                  <Input
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      if (fieldErrors.phone) setFieldErrors((prev) => ({ ...prev, phone: '' }));
                    }}
                    placeholder="0788876568"
                    className={cn(
                      "h-9 text-[13px] rounded-none border-border font-mono",
                      fieldErrors.phone && "border-destructive focus-visible:ring-destructive"
                    )}
                  />
                  {fieldErrors.phone && (
                    <p className="text-[11.5px] text-destructive mt-1">{fieldErrors.phone}</p>
                  )}
                </div>
              </div>

              {/* Row 3: Giới tính & Ngày sinh */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[12px] font-medium text-foreground">
                    {t('teacher.gender', 'Giới tính')}
                  </Label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="h-9 w-full px-3 text-[13px] bg-background border border-border rounded-none text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
                  >
                    <option value="Nam">{t('teacher.genderMale', 'Nam')}</option>
                    <option value="Nữ">{t('teacher.genderFemale', 'Nữ')}</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[12px] font-medium text-foreground">
                    {t('teacher.dob', 'Ngày sinh')}
                  </Label>
                  <Input
                    type="text"
                    value={dob}
                    onChange={(e) => {
                      setDob(e.target.value);
                      if (fieldErrors.dob) setFieldErrors((prev) => ({ ...prev, dob: '' }));
                    }}
                    placeholder="DD/MM/YYYY"
                    className={cn(
                      "h-9 text-[13px] rounded-none border-border",
                      fieldErrors.dob && "border-destructive focus-visible:ring-destructive"
                    )}
                  />
                  {fieldErrors.dob && (
                    <p className="text-[11.5px] text-destructive mt-1">{fieldErrors.dob}</p>
                  )}
                </div>
              </div>

              {/* Row 4: Địa chỉ */}
              <div className="space-y-1.5">
                <Label className="text-[12px] font-medium text-foreground">
                  {t('teacher.address', 'Địa chỉ')}
                </Label>
                <Input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Số 123 Đường ABC, Quận XYZ"
                  className="h-9 text-[13px] rounded-none border-border"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Thông tin công tác */}
          <div
            className="border border-border bg-card rounded-none overflow-hidden"
            data-node-id="4279:28948"
          >
            <div className="p-4 border-b border-border bg-muted/20">
              <h3 className="text-[14px] font-semibold text-foreground">
                {t('teacher.workInfo', 'Thông tin công tác')}
              </h3>
              <p className="text-[12px] text-muted-foreground font-normal">
                {t(
                  'teacher.workInfoEditSub',
                  'Cập nhật vị trí, trạng thái và chuyên môn',
                )}
              </p>
            </div>

            <div className="p-4 space-y-4">
              {/* Row 1: Vị trí/Chức vụ & Trạng thái công tác */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[12px] font-medium text-foreground">
                    {t('teacher.position', 'Vị trí / Chức vụ')}
                  </Label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    disabled={isSelf}
                    className="h-9 w-full px-3 text-[13px] bg-background border border-border rounded-none text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <option value="Giáo viên">{t('teacher.roleTeacher', 'Giáo viên')}</option>
                    <option value="Phó hiệu trưởng">{t('teacher.roleVicePrincipal', 'Phó hiệu trưởng')}</option>
                    <option value="Hiệu trưởng">{t('teacher.rolePrincipal', 'Hiệu trưởng')}</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[12px] font-medium text-foreground">
                    {t('teacher.status', 'Công tác')}
                  </Label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    disabled={isSelf}
                    className="h-9 w-full px-3 text-[13px] bg-background border border-border rounded-none text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <option value="active">
                      {t('teacher.statusActive', 'Đang công tác')}
                    </option>
                    <option value="on_leave">
                      {t('teacher.statusOnLeave', 'Tạm nghỉ')}
                    </option>
                    <option value="resigned">
                      {t('teacher.statusResigned', 'Đã nghỉ việc')}
                    </option>
                  </select>
                </div>
                {isSelf && (
                  <p className="text-[11.5px] text-muted-foreground italic col-span-1 sm:col-span-2">
                    * Bạn không thể tự thay đổi chức vụ hoặc trạng thái công tác của chính mình
                  </p>
                )}
              </div>

              {/* Row 2: Ngày vào làm */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-2">
                  <Label className="text-[12px] font-medium text-foreground">
                    {t('teacher.joinDate', 'Ngày vào làm')} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="text"
                    value={joinDate}
                    onChange={(e) => {
                      setJoinDate(e.target.value);
                      if (fieldErrors.joinDate) setFieldErrors((prev) => ({ ...prev, joinDate: '' }));
                    }}
                    placeholder="DD/MM/YYYY"
                    className={cn(
                      "h-9 text-[13px] rounded-none border-border",
                      fieldErrors.joinDate && "border-destructive focus-visible:ring-destructive"
                    )}
                  />
                  {fieldErrors.joinDate && (
                    <p className="text-[11.5px] text-destructive mt-1">{fieldErrors.joinDate}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border shrink-0 bg-background">
          <Button
            type="button"
            variant="outline"
            onClick={closeDrawer}
            className="h-8 px-4 text-[13px] rounded-none border-border cursor-pointer"
          >
            {t('teacher.cancel', 'Hủy')}
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            className="h-8 px-4 text-[13px] rounded-none bg-[#1447e6] hover:bg-[#1447e6]/90 text-white cursor-pointer"
          >
            {t('teacher.save', 'Lưu')}
          </Button>
        </div>
      </div>
    </div>
  );
}
