import React, { useState, useEffect } from 'react';
import { useSearchParams, useOutletContext } from 'react-router-dom';
import { Plus, KeyRound, ShieldCheck, Eye, EyeOff, Loader2 } from 'lucide-react';
import { parentApi } from '../api/parent.api';
import { authApi } from '@/features/auth/auth.api';
import { useAuthStore } from '@/features/auth/auth.store';
import { toast } from 'sonner';
import { PickupDelegationDrawer } from '../components/PickupDelegationDrawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/shared/lib/utils';

export function ParentStudentProfilePage() {
  const [searchParams] = useSearchParams();
  const outletCtx = useOutletContext() || {};
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword.trim()) {
      toast.error('Vui lòng nhập mật khẩu hiện tại.');
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      toast.error('Mật khẩu mới phải có tối thiểu 8 ký tự.');
      return;
    }
    if (newPassword === currentPassword) {
      toast.error('Mật khẩu mới không được trùng với mật khẩu hiện tại.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp.');
      return;
    }

    try {
      setIsSubmittingPassword(true);
      const res = await authApi.changePassword({
        currentPassword,
        newPassword,
      });
      const msg = res?.message || 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại bằng mật khẩu mới.';
      sessionStorage.setItem('sorak_auth_notice', msg);
      toast.success(msg);
      setIsPasswordModalOpen(false);
      useAuthStore.getState().logout();
      window.location.href = '/login?reason=password_changed';
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
        err.message ||
        'Không thể đổi mật khẩu. Vui lòng kiểm tra lại mật khẩu hiện tại.'
      );
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  const classId = searchParams.get('classId') || outletCtx.selectedClassId || null;

  const fetchProfile = () => {
    setLoading(true);
    parentApi
      .getProfile(classId ? { classId } : {})
      .then((res) => {
        setProfile(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load student profile:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchProfile();
  }, [classId]);

  const student = profile?.student || {
    fullName: outletCtx.student?.fullName || 'Nguyễn Minh An',
    studentCode: outletCtx.student?.studentCode || 'HS26001',
    gender: 'Nam',
    dateOfBirth: '12/02/2023',
    ethnic: 'Kinh',
    nationality: 'Việt Nam',
    placeOfBirth: 'Kiên Giang',
    permanentResidence: 'Thị trấn Hòn Tre, Huyện Kiên Hải, Tỉnh Kiên Giang',
    currentResidence: 'Thị trấn Hòn Tre, Huyện Kiên Hải, Tỉnh Kiên Giang',
  };

  const guardians = profile?.guardians || [
    {
      fullName: 'Nguyễn Văn Minh',
      relationship: 'Bố',
      phone: '0901 111 001',
    },
    {
      fullName: 'Lê Thị Thảo',
      relationship: 'Mẹ',
      phone: '0901 111 051',
    },
    {
      fullName: 'Nguyễn Văn Thành',
      relationship: 'Ông nội',
      phone: '0901 111 091',
    },
  ];

  const pickupAuthorizations = profile?.pickupAuthorizations || [];
  const isHistorical = Boolean(profile?.isHistorical || outletCtx.isHistorical);

  return (
    <div
      className="w-full flex-1 flex flex-col bg-background text-foreground select-none gap-4 pb-8 font-sans"
      data-node-id="5294:25663"
      data-name="FE-06C · Phụ huynh · Hồ sơ & Đưa đón"
    >
      {/* 1. HÀNG ĐẦU: THÔNG TIN HỌC SINH & HỘ TỊCH (Clean, danh sách phẳng, không lồng card) */}
      <div className="border border-border bg-card shadow-xs overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-card flex items-center justify-between">
          <h3 className="text-[13.5px] font-semibold text-foreground">
            Thông tin nhân khẩu & Hộ tịch học sinh
          </h3>
          <span className="text-[11.5px] text-muted-foreground font-mono">
            Mã định danh: <strong className="text-foreground">{student.studentCode}</strong>
          </span>
        </div>

        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-3 text-[13px]">
          <div className="flex items-center justify-between py-1.5 border-b border-border/50">
            <span className="text-muted-foreground">Ngày sinh:</span>
            <span className="font-medium text-foreground font-mono">{student.dateOfBirth}</span>
          </div>
          <div className="flex items-center justify-between py-1.5 border-b border-border/50">
            <span className="text-muted-foreground">Giới tính:</span>
            <span className="font-medium text-foreground">{student.gender}</span>
          </div>
          <div className="flex items-center justify-between py-1.5 border-b border-border/50">
            <span className="text-muted-foreground">Dân tộc:</span>
            <span className="font-medium text-foreground">{student.ethnic || 'Kinh'}</span>
          </div>
          <div className="flex items-center justify-between py-1.5 border-b border-border/50">
            <span className="text-muted-foreground">Quốc tịch:</span>
            <span className="font-medium text-foreground">{student.nationality || 'Việt Nam'}</span>
          </div>
          <div className="flex items-center justify-between py-1.5 border-b border-border/50">
            <span className="text-muted-foreground">Nơi sinh:</span>
            <span className="font-medium text-foreground">{student.placeOfBirth || 'Kiên Giang'}</span>
          </div>
          <div className="flex items-center justify-between py-1.5 border-b border-border/50">
            <span className="text-muted-foreground">Trạng thái:</span>
            <span className="font-medium text-emerald-600 dark:text-emerald-400">Đang học</span>
          </div>
          <div className="flex items-center justify-between py-1.5 border-b border-border/50 col-span-full">
            <span className="text-muted-foreground shrink-0 mr-4">Địa chỉ cư trú:</span>
            <span className="font-medium text-foreground text-right">{student.permanentResidence}</span>
          </div>
        </div>
      </div>

      {/* 2. TIẾP THEO: PHỤ HUYNH & NGƯỜI GIÁM HỘ (Dạng bảng phẳng, clean) */}
      <div className="border border-border bg-card shadow-xs overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-card">
          <h3 className="text-[13.5px] font-semibold text-foreground">
            Phụ huynh & Người giám hộ hợp pháp
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-border bg-muted/15 text-muted-foreground text-[11px] font-semibold uppercase tracking-wider">
                <th className="py-2.5 px-4">Họ và tên</th>
                <th className="py-2.5 px-4">Quan hệ</th>
                <th className="py-2.5 px-4">Số điện thoại</th>
                <th className="py-2.5 px-4 text-right">Số CCCD / Định danh</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {guardians.map((g, idx) => (
                <tr key={idx} className="hover:bg-muted/10 transition-colors">
                  <td className="py-2.5 px-4 font-semibold text-foreground whitespace-nowrap">
                    {g.fullName}
                  </td>
                  <td className="py-2.5 px-4 text-muted-foreground whitespace-nowrap">
                    {g.relationship}
                  </td>
                  <td className="py-2.5 px-4 font-mono font-medium text-foreground whitespace-nowrap">
                    {g.phone}
                  </td>
                  <td className="py-2.5 px-4 font-mono text-muted-foreground text-right whitespace-nowrap">
                    {g.citizenId || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. NẰM CUỐI: DANH SÁCH ỦY QUYỀN ĐƯA ĐÓN (Dạng bảng phẳng, clean, không lồng card) */}
      <div className="border border-border bg-card shadow-xs overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-card flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <h3 className="text-[13.5px] font-semibold text-foreground">
              Danh sách ủy quyền đưa đón trẻ
            </h3>
            <span className="px-1.5 py-0.2 text-[10.5px] font-mono border border-border bg-muted/60 text-muted-foreground font-semibold">
              {pickupAuthorizations.length}
            </span>
          </div>

          {!isHistorical && (
            <Button
              type="button"
              onClick={() => setIsDrawerOpen(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-none text-[12.5px] h-8 px-3.5 font-medium shadow-2xs cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="size-3.5" />
              <span>Thêm người ủy quyền đón</span>
            </Button>
          )}
        </div>

        {pickupAuthorizations.length === 0 ? (
          <div className="p-6 text-center text-[12.5px] text-muted-foreground bg-muted/5">
            Chưa có người được ủy quyền đón bổ sung ngoài bố mẹ. Bấm "Thêm người ủy quyền đón" để đăng ký người thân đưa đón bé.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-border bg-muted/15 text-muted-foreground text-[11px] font-semibold uppercase tracking-wider">
                  <th className="py-2.5 px-4">Người được ủy quyền</th>
                  <th className="py-2.5 px-4">Quan hệ</th>
                  <th className="py-2.5 px-4">Số điện thoại</th>
                  <th className="py-2.5 px-4">Thời hạn hiệu lực</th>
                  <th className="py-2.5 px-4">Ghi chú</th>
                  <th className="py-2.5 px-4">Trạng thái</th>
                  <th className="py-2.5 px-4 text-right">Người duyệt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pickupAuthorizations.map((auth) => (
                  <tr key={auth.id} className="hover:bg-muted/10 transition-colors">
                    <td className="py-2.5 px-4 font-semibold text-foreground whitespace-nowrap">
                      {auth.pickupPersonName}
                    </td>
                    <td className="py-2.5 px-4 text-muted-foreground whitespace-nowrap">
                      {auth.relationship}
                    </td>
                    <td className="py-2.5 px-4 font-mono font-medium text-foreground whitespace-nowrap">
                      {auth.pickupPersonPhone}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-[12px] text-foreground whitespace-nowrap">
                      {auth.startDate} – {auth.endDate}
                    </td>
                    <td className="py-2.5 px-4 text-[12px] text-muted-foreground max-w-[220px] truncate" title={auth.note}>
                      {auth.note || '—'}
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <span
                        className={cn(
                          'px-2 py-0.5 text-[10.5px] font-semibold border rounded-none inline-block',
                          auth.status === 'APPROVED'
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                            : auth.status === 'PENDING'
                              ? 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
                              : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
                        )}
                      >
                        {auth.statusLabel || (auth.status === 'APPROVED' ? 'Đã duyệt' : 'Chờ duyệt')}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right text-[12px] text-muted-foreground whitespace-nowrap">
                      <span>{auth.approverName || 'Giáo viên phụ trách'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. TÀI KHOẢN & BẢO MẬT (Thêm chỗ đổi mật khẩu cho phụ huynh) */}
      <div className="border border-border bg-card shadow-xs overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-card flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary" />
            <h3 className="text-[13.5px] font-semibold text-foreground">
              Tài khoản & Bảo mật
            </h3>
          </div>
          <Button
            type="button"
            onClick={() => {
              setCurrentPassword('');
              setNewPassword('');
              setConfirmPassword('');
              setIsPasswordModalOpen(true);
            }}
            className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-none text-[12.5px] h-8 px-3.5 font-medium shadow-2xs cursor-pointer flex items-center gap-1.5"
          >
            <KeyRound className="size-3.5" />
            <span>Đổi mật khẩu</span>
          </Button>
        </div>

        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-3 text-[13px]">
          <div className="flex items-center justify-between py-1.5 border-b border-border/50">
            <span className="text-muted-foreground">Mã học sinh đăng nhập:</span>
            <span className="font-medium text-foreground font-mono">{student.studentCode}</span>
          </div>
          <div className="flex items-center justify-between py-1.5 border-b border-border/50">
            <span className="text-muted-foreground">Mật khẩu hiện tại:</span>
            <span className="font-medium text-foreground font-mono">••••••••</span>
          </div>
          <div className="flex items-center justify-between py-1.5 border-b border-border/50">
            <span className="text-muted-foreground">Trạng thái bảo mật:</span>
            <span className="font-medium text-emerald-600 dark:text-emerald-400">Đang hoạt động</span>
          </div>
        </div>
      </div>

      {/* Modal Đổi mật khẩu cho phụ huynh */}
      <Dialog open={isPasswordModalOpen} onOpenChange={setIsPasswordModalOpen}>
        <DialogContent className="max-w-[420px] p-5 rounded-none border border-border bg-card text-card-foreground shadow-2xl">
          <DialogHeader className="space-y-1 text-left pb-1">
            <DialogTitle className="text-[16px] font-semibold text-foreground tracking-tight">
              Đổi mật khẩu tài khoản
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Cập nhật mật khẩu mới cho tài khoản học sinh {student.fullName} ({student.studentCode}).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleChangePassword} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">
                Mật khẩu hiện tại <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  type={showCurrentPassword ? 'text' : 'password'}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Nhập mật khẩu đang sử dụng"
                  className="h-9 pr-9 text-[13px] rounded-none border-border/80 bg-background"
                  disabled={isSubmittingPassword}
                  autoFocus
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowCurrentPassword((prev) => !prev)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/70 hover:text-foreground transition-colors p-1 cursor-pointer"
                  aria-label={showCurrentPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showCurrentPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">
                Mật khẩu mới (tối thiểu 8 ký tự) <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nhập mật khẩu mới"
                  className="h-9 pr-9 text-[13px] rounded-none border-border/80 bg-background"
                  disabled={isSubmittingPassword}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowNewPassword((prev) => !prev)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/70 hover:text-foreground transition-colors p-1 cursor-pointer"
                  aria-label={showNewPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showNewPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">
                Xác nhận mật khẩu mới <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới"
                  className="h-9 pr-9 text-[13px] rounded-none border-border/80 bg-background"
                  disabled={isSubmittingPassword}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/70 hover:text-foreground transition-colors p-1 cursor-pointer"
                  aria-label={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showConfirmPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </button>
              </div>
            </div>

            <DialogFooter className="pt-3 border-t border-border flex flex-row items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPasswordModalOpen(false)}
                disabled={isSubmittingPassword}
                className="h-9 px-5 rounded-none border border-border bg-background hover:bg-muted text-foreground text-[13px] font-medium shadow-none cursor-pointer"
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingPassword}
                className="h-9 px-6 rounded-none bg-primary hover:bg-primary/90 text-primary-foreground text-[13px] font-medium shadow-none inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
              >
                {isSubmittingPassword ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Đang cập nhật...</span>
                  </>
                ) : (
                  'Lưu mật khẩu mới'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Pickup Delegation Drawer */}
      <PickupDelegationDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        studentName={student.fullName}
        guardians={guardians}
        onSuccess={() => {
          fetchProfile();
          setIsDrawerOpen(false);
        }}
      />
    </div>
  );
}

export default ParentStudentProfilePage;
