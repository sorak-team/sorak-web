import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Plus,
  Calendar,
  Phone,
  CreditCard,
  User,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  FileCheck2,
  CalendarX2,
} from 'lucide-react';
import { toast } from 'sonner';
import { parentApi } from '../api/parent.api';
import { PickupDelegationDrawer } from '../components/PickupDelegationDrawer';
import { Button } from '@/components/ui/button';
import { cn } from '@/shared/lib/utils';
import { confirmDialog } from '@/components/ui/confirm-dialog';

export function ParentRequestsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [requests, setRequests] = useState([]);
  const [studentInfo, setStudentInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const typeParam = searchParams.get('type') || 'all';

  useEffect(() => {
    if (typeParam === 'pickup') {
      setActiveTab('pickup');
      setTimeout(() => {
        document.getElementById('pickup-card')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    } else if (typeParam === 'leave') {
      setActiveTab('leave');
      setTimeout(() => {
        document.getElementById('leave-card')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    } else {
      setActiveTab('all');
    }
  }, [typeParam]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await parentApi.getRequests();
      setRequests(res.requests || []);
      setStudentInfo(res.student || null);
    } catch (err) {
      console.error('Failed to load requests:', err);
      // Fallback presentation sample data matching Figma 5294:24639
      setRequests([
        {
          id: 'req-1',
          type: 'PICKUP',
          typeName: 'Ủy thác đón con',
          pickupPersonName: 'Nguyễn Văn Nam',
          pickupPersonPhone: '0912 345 678',
          pickupCitizenId: '079095001234',
          relationship: 'Cậu ruột',
          startDate: '16/10/2026',
          endDate: '16/10/2026',
          status: 'APPROVED',
          statusLabel: 'Đã duyệt',
          note: 'Cậu Nam đón bé bằng xe máy lúc 16h30.',
          approverName: 'Cô Nguyễn Thị Lan',
          createdAt: '15/10/2026',
        },
        {
          id: 'req-2',
          type: 'PICKUP',
          typeName: 'Ủy thác đón con',
          pickupPersonName: 'Trần Thị Thu',
          pickupPersonPhone: '0908 999 888',
          pickupCitizenId: '079098004567',
          relationship: 'Dì ruột',
          startDate: '19/10/2026',
          endDate: '23/10/2026',
          status: 'PENDING',
          statusLabel: 'Chờ duyệt',
          note: 'Dì đón bé trong tuần công tác của mẹ.',
          approverName: null,
          createdAt: '16/10/2026',
        },
        {
          id: 'req-3',
          type: 'LEAVE',
          typeName: 'Xin nghỉ học',
          pickupPersonName: 'Lê Khánh Chi',
          pickupPersonPhone: '0901 111 001',
          pickupCitizenId: '',
          relationship: 'Gia đình',
          startDate: '12/10/2026',
          endDate: '12/10/2026',
          status: 'APPROVED',
          statusLabel: 'Đã duyệt',
          note: 'Bé về quê thăm ông bà ngoại.',
          approverName: 'Cô Nguyễn Thị Lan',
          createdAt: '10/10/2026',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleCancelRequest = async (requestId) => {
    const isConfirmed = await confirmDialog({
      title: 'Xác nhận hủy yêu cầu',
      description: 'Bạn có chắc chắn muốn hủy yêu cầu này? Thao tác này không thể hoàn tác.',
      confirmText: 'Hủy yêu cầu',
      cancelText: 'Đóng',
      variant: 'destructive',
    });
    if (!isConfirmed) return;
    try {
      await parentApi.cancelPickupRequest(requestId);
      toast.success('Đã hủy yêu cầu thành công.');
      fetchRequests();
    } catch (err) {
      toast.error('Hủy yêu cầu thất bại', {
        description: err.response?.data?.message || err.message,
      });
    }
  };

  const filteredRequests = requests.filter((r) => {
    if (activeTab === 'pickup' && r.type !== 'PICKUP') return false;
    if (activeTab === 'leave' && r.type !== 'LEAVE') return false;
    if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = r.pickupPersonName?.toLowerCase().includes(q);
      const matchPhone = r.pickupPersonPhone?.includes(q);
      const matchNote = r.note?.toLowerCase().includes(q);
      return matchName || matchPhone || matchNote;
    }
    return true;
  });

  const student = studentInfo || {
    fullName: 'Lê Khánh Chi',
    code: 'HS003',
    gender: 'Nữ',
    age: '3 tuổi',
    avatarUrl: null,
  };

  return (
    <div
      className="w-full flex flex-col gap-6"
      data-node-id="5294:24639"
      data-name="FE-06B · Phụ huynh · Yêu cầu & Đơn đón thay"
    >
      {/* 2. Quick Actions Row (Figma 5294:24902) */}
      <div
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
        data-node-id="5294:24902"
        data-name="Yêu cầu · Quick Actions"
      >
        {/* Card 1: Xin nghỉ học */}
        <div
          id="leave-card"
          className={cn(
            'border p-5 rounded-none shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors scroll-mt-20',
            typeParam === 'leave'
              ? 'border-[#1447e6] bg-blue-50/40 dark:bg-blue-950/20'
              : 'border-border bg-card'
          )}
        >
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-2">
              <CalendarX2 className="size-4 text-[#1447e6]" />
              <h3 className="text-[15px] font-semibold text-foreground tracking-tight">
                Xin nghỉ học
              </h3>
            </div>
            <p className="text-[12.5px] text-muted-foreground font-normal">
              Thông báo con nghỉ học theo ngày hoặc buổi.
            </p>
            <p className="text-[11.5px] text-muted-foreground/80 font-normal">
              Giáo viên xác nhận và cập nhật tự động vào chuyên cần.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => {
              toast.info('Thông báo xin nghỉ học', {
                description: 'Vui lòng liên hệ trực tiếp giáo viên phụ trách hoặc gửi tin nhắn để cập nhật lý do nghỉ.',
              });
            }}
            className="h-8.5 px-3 rounded-none border border-border text-[13px] font-medium bg-background hover:bg-muted text-foreground cursor-pointer self-start sm:self-auto shrink-0 transition-colors"
          >
            <Plus className="size-3.5 mr-1" />
            <span>Tạo yêu cầu</span>
          </Button>
        </div>

        {/* Card 2: Ủy thác đón con (Figma 5294:24909) */}
        <div
          id="pickup-card"
          className={cn(
            'border p-5 rounded-none shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors scroll-mt-20',
            typeParam === 'pickup'
              ? 'border-[#1447e6] bg-blue-50/40 dark:bg-blue-950/20'
              : 'border-border bg-card'
          )}
        >
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-[#1447e6]" />
              <h3 className="text-[15px] font-semibold text-foreground tracking-tight">
                Ủy thác đón con
              </h3>
            </div>
            <p className="text-[12.5px] text-muted-foreground font-normal">
              Đề nghị người khác được phép đón con thay phụ huynh.
            </p>
            <p className="text-[11.5px] text-muted-foreground/80 font-normal">
              Giáo viên duyệt trước và đối chiếu danh tính khi trả trẻ an toàn.
            </p>
          </div>

          <Button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className="h-8.5 px-3.5 rounded-none bg-[#1447e6] hover:bg-[#123ecc] text-white text-[13px] font-medium cursor-pointer shadow-xs self-start sm:self-auto shrink-0 transition-colors"
          >
            <Plus className="size-3.5 mr-1" />
            <span>Tạo yêu cầu</span>
          </Button>
        </div>
      </div>

      {/* 3. Requests History & Filter Toolbar (Figma 5294:24915) */}
      <div
        id="requests-history-card"
        className="border border-border bg-card p-5 rounded-none shadow-xs flex flex-col gap-4 select-none scroll-mt-20"
      >
        {/* Table Toolbar Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/60">
          <div className="flex flex-col gap-1.5">
            <div>
              <h3 className="text-[15px] font-semibold text-foreground tracking-tight">
                Lịch sử yêu cầu
              </h3>
              <p className="text-[12px] text-muted-foreground font-normal">
                {filteredRequests.length} đơn được ghi nhận trong niên khóa
              </p>
            </div>
            {/* Request Type Pills */}
            <div className="flex items-center gap-1.5 pt-1">
              {[
                { id: 'all', label: 'Tất cả đơn', to: '/parent/requests?type=all' },
                { id: 'pickup', label: 'Ủy thác đón', to: '/parent/requests?type=pickup' },
                { id: 'leave', label: 'Xin nghỉ học', to: '/parent/requests?type=leave' },
              ].map((pill) => (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(pill.id);
                    navigate(pill.to, { replace: true });
                  }}
                  className={cn(
                    'px-2.5 py-0.5 text-[11.5px] font-medium border rounded-none cursor-pointer transition-colors',
                    activeTab === pill.id
                      ? 'bg-foreground text-background border-foreground font-semibold'
                      : 'bg-background text-muted-foreground border-border hover:text-foreground'
                  )}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-8 px-2.5 text-[12.5px] border border-border bg-background rounded-none text-foreground focus:outline-none"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="PENDING">Chờ duyệt</option>
              <option value="APPROVED">Đã duyệt</option>
              <option value="REJECTED">Từ chối</option>
            </select>

            {/* Search Input */}
            <div className="relative w-[200px] sm:w-[240px]">
              <Search className="size-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Tìm theo tên, SĐT..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-8 pl-8 pr-2.5 text-[12.5px] rounded-none border border-border bg-background placeholder:text-muted-foreground/70 focus:outline-none focus:border-[#1447e6]"
              />
            </div>
          </div>
        </div>

        {/* Requests Table (Sorak Consistency Standard) */}
        <div className="border border-border bg-card rounded-none overflow-x-auto shadow-xs">
          <table className="w-full text-left border-collapse text-[13px]">
            <thead>
              <tr className="h-10 border-b border-border bg-muted/30 text-[12.5px] font-medium text-foreground">
                <th className="px-4 py-2 font-medium">Loại yêu cầu</th>
                <th className="px-4 py-2 font-medium">Thời gian</th>
                <th className="px-4 py-2 font-medium">Nội dung / Người đón</th>
                <th className="px-4 py-2 font-medium">Người duyệt</th>
                <th className="px-4 py-2 font-medium">Trạng thái</th>
                <th className="px-4 py-2 min-w-[95px] w-[95px] text-right font-medium whitespace-nowrap">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredRequests.length > 0 ? (
                filteredRequests.map((req) => (
                  <tr
                    key={req.id}
                    className="h-14 hover:bg-muted/30 transition-colors"
                  >
                    {/* Loại yêu cầu */}
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        {req.type === 'PICKUP' ? (
                          <ShieldCheck className="size-4 text-[#1447e6] shrink-0" />
                        ) : (
                          <CalendarX2 className="size-4 text-amber-600 shrink-0" />
                        )}
                        <span className="font-medium text-foreground">
                          {req.typeName || (req.type === 'PICKUP' ? 'Ủy thác đón con' : 'Xin nghỉ học')}
                        </span>
                      </div>
                    </td>

                    {/* Thời gian */}
                    <td className="px-4 py-2.5 font-mono text-[12px] text-muted-foreground">
                      {req.startDate}
                      {req.endDate && req.endDate !== req.startDate && ` → ${req.endDate}`}
                    </td>

                    {/* Nội dung */}
                    <td className="px-4 py-2.5 max-w-[320px]">
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground">
                          {req.pickupPersonName}
                          {req.relationship && ` (${req.relationship})`}
                        </span>
                        <span className="text-[12px] text-muted-foreground truncate">
                          {req.note || (req.pickupPersonPhone && `SĐT: ${req.pickupPersonPhone}`)}
                        </span>
                      </div>
                    </td>

                    {/* Người duyệt */}
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {req.approverName || '—'}
                    </td>

                    {/* Trạng thái */}
                    <td className="px-4 py-2.5">
                      {req.status === 'APPROVED' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 border text-[11.5px] font-medium rounded-none bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-400">
                          <CheckCircle2 className="size-3" />
                          <span>Đã duyệt</span>
                        </span>
                      ) : req.status === 'PENDING' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 border text-[11.5px] font-medium rounded-none bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-400">
                          <Clock className="size-3 animate-pulse" />
                          <span>Chờ duyệt</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 border text-[11.5px] font-medium rounded-none bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-400">
                          <XCircle className="size-3" />
                          <span>Từ chối</span>
                        </span>
                      )}
                    </td>

                    {/* Thao tác */}
                    <td className="px-4 py-2.5 text-right whitespace-nowrap min-w-[95px] w-[95px]">
                      {req.status === 'PENDING' ? (
                        <button
                          type="button"
                          onClick={() => handleCancelRequest(req.id)}
                          className="text-[12px] text-destructive hover:underline cursor-pointer font-medium"
                        >
                          Hủy đơn
                        </button>
                      ) : (
                        <span className="text-[12px] text-muted-foreground">Đã xử lý</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground text-[13px]">
                    Chưa có yêu cầu nào phù hợp với bộ lọc.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pickup Delegation Drawer (Figma 5294:24975) */}
      <PickupDelegationDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSuccess={fetchRequests}
        studentName={student.fullName}
        guardians={studentInfo?.guardians || []}
      />
    </div>
  );
}
