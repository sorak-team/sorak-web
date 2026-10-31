import React, { useState, useEffect } from 'react';
import { useSearchParams, useOutletContext } from 'react-router-dom';
import { Plus } from 'lucide-react';
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
