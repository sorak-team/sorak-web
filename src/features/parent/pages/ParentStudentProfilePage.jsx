import React, { useState, useEffect } from 'react';
import { useSearchParams, useOutletContext } from 'react-router-dom';
import {
  UserSquare2,
  Users,
  Calendar,
  MapPin,
  Phone,
  ShieldCheck,
  FileText,
  CheckCircle2,
  Plus,
  User,
  Clock,
} from 'lucide-react';
import { parentApi } from '../api/parent.api';
import { PickupDelegationDrawer } from '../components/PickupDelegationDrawer';
import { Button } from '@/components/ui/button';
import { cn } from '@/shared/lib/utils';

export function ParentStudentProfilePage() {
  const [searchParams] = useSearchParams();
  const outletCtx = useOutletContext() || {};
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

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
    dateOfBirth: '15/09/2023',
    ethnic: 'Kinh',
    nationality: 'Việt Nam',
    placeOfBirth: 'Kiên Giang',
    permanentResidence: 'Thị trấn Hòn Tre, Huyện Kiên Hải, Tỉnh Kiên Giang',
    currentResidence: 'Thị trấn Hòn Tre, Huyện Kiên Hải, Tỉnh Kiên Giang',
    enrollmentDate: '05/09/2026',
    statusLabel: 'Đang theo học',
  };

  const homeroomClass = profile?.classInfo || {
    name: outletCtx.homeroomClass?.name || 'Mầm 1',
    roomNumber: 'Phòng 201',
    schoolYear: outletCtx.homeroomClass?.schoolYear || '2026–2027',
  };

  const primaryTeacher = profile?.primaryTeacher || {
    fullName: outletCtx.primaryTeacher?.fullName || 'Phạm Hoàng Anh',
    phone: '0908 123 456',
  };

  const guardians = profile?.guardians || [
    {
      fullName: 'Nguyễn Văn Minh',
      relationship: 'Bố',
      phone: '0901 111 001',
      isPrimary: true,
      canPickup: true,
    },
    {
      fullName: 'Lê Thị Thảo',
      relationship: 'Mẹ',
      phone: '0901 111 051',
      isPrimary: true,
      canPickup: true,
    },
  ];

  const pickupAuthorizations = profile?.pickupAuthorizations || [];
  const isHistorical = Boolean(profile?.isHistorical || outletCtx.isHistorical);

  return (
    <div
      className="w-full flex-1 flex flex-col bg-background text-foreground select-none gap-3.5 pb-8 font-sans"
      data-node-id="5294:25663"
      data-name="FE-06C · Phụ huynh · Hồ sơ & Đưa đón"
    >
      {/* 1. Header Action Toolbar (No redundant H1, clean subtitle on left, controls on right) */}
      <div className="flex items-center justify-between gap-3 pb-2 shrink-0 flex-wrap sm:flex-nowrap">
        <span className="text-[12.5px] text-muted-foreground font-normal hidden sm:inline-block">
          Thông tin định danh học vụ, người giám hộ và danh sách ủy quyền đưa đón trẻ
        </span>

        {/* Right Toolbar Controls */}
        <div className="flex items-center gap-2.5 ml-auto shrink-0 flex-wrap sm:flex-nowrap">
          <div className="h-8 px-2.5 text-[12px] font-mono border border-border bg-background text-foreground flex items-center rounded-none shadow-2xs">
            <span className="text-muted-foreground mr-1.5">Mã HS:</span>
            <strong className="font-semibold">{student.studentCode}</strong>
          </div>

          {!isHistorical && (
            <Button
              type="button"
              size="sm"
              onClick={() => setIsDrawerOpen(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-none text-[12px] h-8 px-3 font-medium shadow-2xs cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="size-3.5" />
              <span>Thêm người ủy thác đón</span>
            </Button>
          )}
        </div>
      </div>

      {/* 2. Section: Quản lý Ủy quyền đón học sinh (Pickup Logistics) */}
      <div className="border border-border bg-card shadow-xs flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-3.5 border-b border-border bg-card">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary" />
            <span className="text-[13px] font-bold text-foreground">
              Danh sách ủy quyền đưa đón học sinh
            </span>
            <span className="px-1.5 py-0.2 text-[10.5px] font-mono border border-border bg-muted/60 text-muted-foreground font-semibold">
              {pickupAuthorizations.length}
            </span>
          </div>
          <span className="text-[11.5px] text-muted-foreground hidden sm:inline-block">
            Bảo đảm an toàn tuyệt đối khi bàn giao trẻ tại cửa lớp
          </span>
        </div>

        {pickupAuthorizations.length === 0 ? (
          <div className="p-6 text-center text-[12.5px] text-muted-foreground bg-muted/10">
            Chưa có người được ủy quyền đón bổ sung ngoài bố mẹ. Bấm "Thêm người ủy thác đón" để đăng ký người thân đưa đón bé.
          </div>
        ) : (
          <div className="p-3.5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {pickupAuthorizations.map((auth) => (
              <div
                key={auth.id}
                className="border border-border bg-muted/10 p-3.5 flex flex-col justify-between gap-2.5 rounded-none shadow-2xs hover:border-primary/40 transition-colors"
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2 pb-1.5 border-b border-border">
                    <div>
                      <h4 className="text-[13px] font-bold text-foreground">
                        {auth.pickupPersonName}
                      </h4>
                      <span className="text-[11.5px] font-medium text-primary">
                        {auth.relationship}
                      </span>
                    </div>
                    <span
                      className={cn(
                        'px-2 py-0.5 text-[10.5px] font-semibold border rounded-none',
                        auth.status === 'APPROVED'
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                          : auth.status === 'PENDING'
                            ? 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
                            : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
                      )}
                    >
                      {auth.statusLabel}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1 text-[11.5px] text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Phone className="size-3 text-foreground shrink-0" />
                      <span className="font-mono font-medium text-foreground">{auth.pickupPersonPhone}</span>
                    </div>
                    {auth.pickupCitizenId && (
                      <div className="flex items-center gap-2">
                        <User className="size-3 text-foreground shrink-0" />
                        <span className="font-mono">CCCD: {auth.pickupCitizenId}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Calendar className="size-3 text-foreground shrink-0" />
                      <span>
                        Hiệu lực: {auth.startDate} – {auth.endDate}
                      </span>
                    </div>
                  </div>

                  {auth.note && (
                    <div className="p-2 bg-muted/30 border border-border text-[11px] text-foreground">
                      <span className="font-semibold text-muted-foreground block text-[9.5px] uppercase tracking-wider mb-0.5">
                        Ghi chú:
                      </span>
                      {auth.note}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1.5 border-t border-border text-[10.5px] text-muted-foreground">
                  <span>Duyệt bởi: {auth.approverName || 'Giáo viên chủ nhiệm'}</span>
                  <span className="font-mono">{auth.createdAt}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Section: Thông tin học vụ & Hộ tịch (Unified 2-Column Container) */}
      <div className="border border-border bg-card shadow-xs grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border overflow-hidden">
        {/* Thông tin định danh học vụ */}
        <div className="p-4 flex flex-col gap-3 bg-card">
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <FileText className="size-4 text-primary" />
            <span className="text-[13px] font-bold text-foreground">
              Thông tin định danh học vụ
            </span>
          </div>

          <div className="flex flex-col text-[12.5px] divide-y divide-border">
            <div className="flex items-center justify-between py-2">
              <span className="text-muted-foreground">Mã học sinh</span>
              <span className="font-semibold text-foreground font-mono">
                {student.studentCode}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-muted-foreground">Họ và tên</span>
              <span className="font-semibold text-foreground">
                {student.fullName}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-muted-foreground">Giới tính</span>
              <span className="font-medium text-foreground">
                {student.gender}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-muted-foreground">Ngày sinh</span>
              <span className="font-medium text-foreground font-mono">
                {student.dateOfBirth}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-muted-foreground">Lớp học</span>
              <span className="font-semibold text-foreground">
                {homeroomClass.name} ({homeroomClass.roomNumber})
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-muted-foreground">Giáo viên chủ nhiệm</span>
              <span className="font-semibold text-foreground">
                {primaryTeacher.fullName} ({primaryTeacher.phone})
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-muted-foreground">Trạng thái học vụ</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 border text-[10.5px] font-semibold rounded-none bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                {student.statusLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Hộ tịch & Cư trú */}
        <div className="p-4 flex flex-col gap-3 bg-card">
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <MapPin className="size-4 text-primary" />
            <span className="text-[13px] font-bold text-foreground">
              Hộ tịch & Nơi cư trú
            </span>
          </div>

          <div className="flex flex-col text-[12.5px] divide-y divide-border">
            <div className="flex items-center justify-between py-2">
              <span className="text-muted-foreground">Dân tộc</span>
              <span className="font-medium text-foreground">
                {student.ethnic || 'Kinh'}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-muted-foreground">Quốc tịch</span>
              <span className="font-medium text-foreground">
                {student.nationality || 'Việt Nam'}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-muted-foreground">Nơi sinh</span>
              <span className="font-medium text-foreground">
                {student.placeOfBirth || 'Kiên Giang'}
              </span>
            </div>
            <div className="flex flex-col gap-0.5 py-2">
              <span className="text-muted-foreground">Địa chỉ thường trú</span>
              <span className="font-medium text-foreground">
                {student.permanentResidence}
              </span>
            </div>
            <div className="flex flex-col gap-0.5 py-2">
              <span className="text-muted-foreground">Chỗ ở hiện nay</span>
              <span className="font-medium text-foreground">
                {student.currentResidence}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Section: Người giám hộ & Phụ huynh */}
      <div className="border border-border bg-card shadow-xs flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-3.5 border-b border-border bg-card">
          <div className="flex items-center gap-2">
            <Users className="size-4 text-primary" />
            <span className="text-[13px] font-bold text-foreground">
              Thông tin Phụ huynh & Người giám hộ hợp pháp
            </span>
          </div>
        </div>

        <div className="p-3.5 grid grid-cols-1 md:grid-cols-2 gap-3">
          {guardians.map((g, i) => (
            <div
              key={i}
              className="border border-border bg-muted/10 p-3.5 flex flex-col gap-2 rounded-none shadow-2xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground text-[13px]">
                  {g.fullName}
                </span>
                <span className="text-[10.5px] px-2 py-0.5 border border-border bg-background text-muted-foreground font-mono font-medium rounded-none">
                  {g.relationship}
                </span>
              </div>

              <div className="flex flex-col text-[12px] gap-1 text-muted-foreground">
                <div>
                  SĐT liên hệ: <strong className="text-foreground font-mono">{g.phone}</strong>
                </div>
                {g.citizenId && (
                  <div>
                    Số CCCD: <span className="font-mono">{g.citizenId}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 pt-2 border-t border-border text-[11.5px]">
                {g.isPrimary && (
                  <span className="text-primary font-semibold flex items-center gap-1">
                    ★ Đại diện liên lạc chính
                  </span>
                )}
                {g.canPickup && (
                  <span className="text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="size-3.5" /> Được phép đón bé
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pickup Delegation Drawer */}
      <PickupDelegationDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        studentName={student.fullName}
        onSuccess={() => {
          fetchProfile();
          setIsDrawerOpen(false);
        }}
      />
    </div>
  );
}

export default ParentStudentProfilePage;
