import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { HugeiconsIcon } from '@hugeicons/react';
import { Cancel01Icon } from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTeacherStore, getTeacherAvatarUrl, generateTeacherCode } from '../teachers.store';
import { cn } from '@/shared/lib/utils';

export function TeacherDrawer() {
  const { t } = useTranslation();
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

  // Sync state when drawer opens or teacher changes
  useEffect(() => {
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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error('Vui lòng nhập họ tên giáo viên');
      return;
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
        toast.error('Năm bắt đầu công tác tối thiểu phải từ năm 2000');
        return;
      }
    }

    const payload = {
      employeeCode: employeeCode.trim() || `GV${String(Date.now()).slice(-4)}`,
      fullName: fullName.trim(),
      citizenId: citizenId.trim() || `079${String(Date.now()).slice(-9)}`,
      email: email.trim(),
      phone: phone.trim(),
      avatar: currentTeacher?.avatar || getTeacherAvatarUrl(null, fullName.trim()),
      gender,
      dob: dob.trim(),
      role: role.trim() || 'Chủ nhiệm',
      status,
      joinDate: joinDate.trim(),
      address: address.trim(),
    };

    if (drawerMode === 'edit' && editingTeacherId) {
      updateTeacher(editingTeacherId, payload);
      toast.success('Đã cập nhật hồ sơ giáo viên thành công');
    } else {
      createTeacher(payload);
      toast.success('Đã thêm giáo viên mới thành công');
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
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Nguyễn Đình Vinh"
                    required
                    className="h-9 text-[13px] rounded-none border-border"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[12px] font-medium text-foreground">
                    {t('teacher.citizenId', 'Số CCCD/CMND')}
                  </Label>
                  <Input
                    type="text"
                    value={citizenId}
                    onChange={(e) => setCitizenId(e.target.value)}
                    placeholder="VD: 079201001234"
                    className="h-9 text-[13px] rounded-none border-border"
                  />
                </div>
              </div>

              {/* Row 2: Email & SĐT */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[12px] font-medium text-foreground">
                    {t('teacher.email', 'Email')}
                  </Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="vinhnd@sorak.vn"
                    className="h-9 text-[13px] rounded-none border-border"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[12px] font-medium text-foreground">
                    {t('teacher.phone', 'SĐT')}
                  </Label>
                  <Input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0788876568"
                    className="h-9 text-[13px] rounded-none border-border"
                  />
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
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[12px] font-medium text-foreground">
                    {t('teacher.dob', 'Ngày sinh')}
                  </Label>
                  <Input
                    type="text"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    placeholder="DD/MM/YYYY"
                    className="h-9 text-[13px] rounded-none border-border"
                  />
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
                    className="h-9 w-full px-3 text-[13px] bg-background border border-border rounded-none text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
                  >
                    <option value="Giáo viên">Giáo viên</option>
                    <option value="Phó hiệu trưởng">Phó hiệu trưởng</option>
                    <option value="Hiệu trưởng">Hiệu trưởng</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[12px] font-medium text-foreground">
                    {t('teacher.status', 'Công tác')}
                  </Label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="h-9 w-full px-3 text-[13px] bg-background border border-border rounded-none text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
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
              </div>

              {/* Row 2: Ngày vào làm & Trình độ */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-2">
                  <Label className="text-[12px] font-medium text-foreground">
                    {t('teacher.joinDate', 'Ngày vào làm')}
                  </Label>
                  <Input
                    type="text"
                    value={joinDate}
                    onChange={(e) => setJoinDate(e.target.value)}
                    placeholder="DD/MM/YYYY"
                    className="h-9 text-[13px] rounded-none border-border"
                  />
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
