import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useOutletContext } from 'react-router-dom';
import {
  Calendar,
  Clock,
  Heart,
  Award,
  Phone,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  User,
  Users,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { parentApi } from '../api/parent.api';
import { cn } from '@/shared/lib/utils';

export function ParentHomePage() {
  const [searchParams] = useSearchParams();
  const outletCtx = useOutletContext() || {};
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const tabParam = searchParams.get('tab');
  const classId = searchParams.get('classId') || outletCtx.selectedClassId || null;

  useEffect(() => {
    let isMounted = true;
    parentApi
      .getHome(classId ? { classId } : {})
      .then((res) => {
        if (isMounted) {
          setData(res);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load parent home data:', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [classId]);

  useEffect(() => {
    if (tabParam === 'schedule') {
      setTimeout(() => {
        document.getElementById('schedule-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } else if (tabParam === 'health') {
      setTimeout(() => {
        document.getElementById('health-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } else if (tabParam === 'attendance') {
      setTimeout(() => {
        document.getElementById('attendance-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [tabParam]);

  // Dynamic / fallback presentation data
  const student = data?.student || {
    fullName: outletCtx.student?.fullName || 'Nguyễn Minh An',
    code: outletCtx.student?.studentCode || 'HS26001',
    gender: 'Nam',
    age: '3 tuổi',
    dob: '15/09/2023',
    avatarUrl: null,
  };

  const homeroomClass = data?.homeroomClass || outletCtx.homeroomClass || {
    name: 'Mầm 1',
    roomNumber: 'Phòng 201',
  };

  const primaryTeacher = data?.primaryTeacher || outletCtx.primaryTeacher || {
    fullName: 'Phạm Hoàng Anh',
    phone: '0908 123 456',
  };

  const guardians = data?.guardians || [
    { fullName: 'Lê Thị Ngọc', relationship: 'Mẹ', phone: '0901 111 001', canPickup: true },
    { fullName: 'Nguyễn Thanh Bình', relationship: 'Bố', phone: '0901 111 002', canPickup: true },
  ];

  const timetable = [
    {
      day: 'Thứ 2',
      date: '05/10',
      activities: [
        { time: '07:30', name: 'Đón trẻ & trò chuyện' },
        { time: '08:30', name: 'Phương tiện giao thông' },
        { time: '09:30', name: 'Hoạt động ngoài trời' },
        { time: '14:00', name: 'Hoạt động chiều' },
      ],
    },
    {
      day: 'Thứ 3',
      date: '06/10',
      activities: [
        { time: '07:30', name: 'Đón trẻ' },
        { time: '08:30', name: 'Làm quen với toán' },
        { time: '09:30', name: 'Hoạt động góc' },
        { time: '14:00', name: 'Trả trẻ' },
      ],
    },
    {
      day: 'Thứ 4',
      date: '07/10',
      activities: [
        { time: '07:30', name: 'Đón trẻ' },
        { time: '08:30', name: 'Âm nhạc' },
        { time: '09:30', name: 'Đo sức khỏe' },
        { time: '14:00', name: 'Vận động' },
      ],
    },
    {
      day: 'Thứ 5',
      date: '08/10',
      activities: [
        { time: '07:30', name: 'Đón trẻ' },
        { time: '08:30', name: 'Khám phá khoa học' },
        { time: '09:30', name: 'Kể chuyện' },
        { time: '14:00', name: 'Hoạt động chiều' },
      ],
    },
    {
      day: 'Thứ 6',
      date: '09/10',
      activities: [
        { time: '07:30', name: 'Đón trẻ' },
        { time: '08:30', name: 'Kể chuyện' },
        { time: '09:30', name: 'Đánh giá' },
        { time: '14:00', name: 'Sinh hoạt cuối tuần' },
      ],
    },
  ];

  return (
    <div
      className="w-full flex flex-col gap-6"
      data-node-id="5288:24533"
      data-name="FE-06A · Phụ huynh · Trang chủ"
    >
      {/* 2. Main Content Grid (Figma 5288:24577) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: About My Child (Figma 5288:24578, width ~340px) */}
        <div
          className="lg:col-span-4 border border-border bg-card p-5 rounded-none shadow-xs flex flex-col gap-5 select-none"
          data-node-id="5288:24578"
          data-name="About My Child · Sorak"
        >
          {/* Heading */}
          <div className="flex items-center justify-between">
            <h2 className="text-[16px] font-semibold text-foreground tracking-tight">
              Tổng quan của con
            </h2>
            <span className="text-[11px] text-muted-foreground font-mono">
              Hôm nay
            </span>
          </div>

          {/* Today Status Card (Figma 5288:24581) */}
          <div className="border border-border bg-muted/20 p-3.5 rounded-none flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 text-emerald-600 font-semibold text-[13px]">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Đã đến lớp</span>
            </div>
            <p className="text-[12px] text-muted-foreground font-normal">
              07:32 · {primaryTeacher.fullName} xác nhận điểm danh
            </p>
          </div>

          {/* Profile Details List */}
          <div className="flex flex-col text-[13px] border-t border-border/80 pt-2">
            <div className="flex items-center justify-between py-2 border-b border-border/40">
              <span className="text-muted-foreground">Ngày sinh</span>
              <span className="font-medium text-foreground font-mono">
                {student.dob || '14/03/2023'}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border/40">
              <span className="text-muted-foreground">Giáo viên</span>
              <span className="font-medium text-foreground">
                {primaryTeacher.fullName}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-muted-foreground">Phụ huynh</span>
              <span className="font-medium text-foreground">
                {guardians[0]?.fullName || 'Lê Thị Ngọc'}
              </span>
            </div>
          </div>

          {/* Attendance Summary Card (Figma 5288:24611) */}
          <div className="border border-border bg-card p-3.5 rounded-none flex flex-col gap-2">
            <span className="text-[12px] text-muted-foreground font-medium">
              Chuyên cần tháng này
            </span>
            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline gap-2">
                <span className="text-[22px] font-semibold text-foreground font-mono">
                  19 / 20
                </span>
                <span className="text-[12px] text-[#1447e6] font-medium font-mono">
                  95% ngày học
                </span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[11px] text-emerald-600 font-medium">
                  Đi học đều đặn
                </span>
                <span className="text-[10px] text-muted-foreground font-normal">
                  20 ngày gần đây
                </span>
              </div>
            </div>
          </div>

            {/* Authorized People (Figma 5288:24621) */}
            <div className="flex flex-col gap-1.5 border-t border-border/80 pt-4">
              <span className="text-[12px] font-semibold text-foreground tracking-tight">
                Người được phép đón
              </span>
              <p className="text-[12.5px] text-muted-foreground font-normal leading-relaxed">
                {guardians.map((g) => `${g.fullName} (${g.relationship})`).join(' · ')}
              </p>
            </div>

            {/* Good Child Last Week (Figma 5288:24624) */}
            <Link
              to="/parent/good-behavior"
              className="border border-border bg-[#eff6ff] dark:bg-blue-950/30 p-3 rounded-none flex items-center justify-between gap-2.5 hover:border-blue-300 transition-colors cursor-pointer group"
            >
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-[11px] font-medium text-[#1447e6] dark:text-blue-400 group-hover:underline">
                  Phiếu bé ngoan · Tuần 40
                </span>
                <span className="text-[13px] font-semibold text-foreground truncate">
                  4 / 5 ★ · Con thể hiện tốt
                </span>
              </div>
              <img
                src="/mascot-star.png"
                alt="Mascot Star"
                className="size-10 object-contain shrink-0 pointer-events-none drop-shadow-xs"
              />
            </Link>
          </div>

        {/* Right Column: Main Updates & Timetable (Figma 5288:24627) */}
        <div className="lg:col-span-8 flex flex-col gap-6 min-w-0">
          {/* Card 1: Activity Timeline (Figma 5288:24628) */}
          <div
            id="attendance-section"
            className="border border-border bg-card p-5 rounded-none shadow-xs flex flex-col gap-4 select-none scroll-mt-20"
            data-node-id="5288:24628"
          >
            <div className="flex items-center justify-between pb-1 border-b border-border/60">
              <div>
                <h3 className="text-[15px] font-semibold text-foreground tracking-tight">
                  Hoạt động gần đây của con
                </h3>
                <p className="text-[12px] text-muted-foreground font-normal">
                  Các cập nhật từ lớp {homeroomClass.name}
                </p>
              </div>
              <span className="text-[12px] text-muted-foreground font-mono">
                08/10/2026
              </span>
            </div>

            {/* Timeline List */}
            <div className="flex flex-col gap-0 relative pt-2">
              {[
                {
                  time: '07:32',
                  title: 'Điểm danh buổi sáng',
                  desc: `${student.fullName} đã đến lớp · ${primaryTeacher.fullName} xác nhận an toàn`,
                },
                {
                  time: '08:30',
                  title: 'Khám phá khoa học',
                  desc: 'Con tham gia tìm hiểu các phương tiện giao thông cùng nhóm bạn',
                },
                {
                  time: '11:00',
                  title: 'Ăn trưa và nghỉ ngơi',
                  desc: 'Giáo viên ghi nhận giờ sinh hoạt, bé ăn hết suất cơm dẻo và ngủ ngoan',
                },
                {
                  time: '14:00',
                  title: 'Hoạt động chiều',
                  desc: 'Vận động thể chất và tham gia trò chơi phát triển kỹ năng giao tiếp',
                },
              ].map((ev, idx, arr) => (
                <div key={idx} className="flex items-start gap-4 pb-5 relative group">
                  {/* Connected Dot Rail */}
                  <div className="flex flex-col items-center shrink-0 w-4 pt-1">
                    <span className="size-2.5 rounded-full bg-[#1447e6] ring-4 ring-blue-50 dark:ring-blue-950" />
                    {idx < arr.length - 1 && (
                      <span className="w-px h-12 bg-border group-hover:bg-blue-300 transition-colors mt-1" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 min-w-0">
                    <div>
                      <h4 className="text-[13px] font-semibold text-foreground">
                        {ev.title}
                      </h4>
                      <p className="text-[12.5px] text-muted-foreground font-normal mt-0.5">
                        {ev.desc}
                      </p>
                    </div>
                    <span className="text-[12px] font-mono text-muted-foreground shrink-0">
                      {ev.time}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card 2: Weekly Timetable & Health (Figma 5288:24666) */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            {/* Weekly Timetable (8 cols on desktop) */}
            <div
              id="schedule-section"
              className="xl:col-span-8 border border-border bg-card p-5 rounded-none shadow-xs flex flex-col gap-4 select-none scroll-mt-20"
              data-node-id="5288:24667"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-border/60">
                <div>
                  <h3 className="text-[15px] font-semibold text-foreground tracking-tight">
                    Thời khoá biểu của con
                  </h3>
                  <p className="text-[12px] text-muted-foreground font-normal">
                    Tuần 40 · 05/10 – 09/10/2026
                  </p>
                </div>
                <span className="text-[11px] px-2 py-0.5 border border-border bg-muted/40 text-muted-foreground font-medium self-start sm:self-auto">
                  Theo kế hoạch giáo dục
                </span>
              </div>

              {/* Week Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-5 border border-border bg-muted/10 divide-x divide-y sm:divide-y-0 divide-border text-[12px]">
                {timetable.map((t) => (
                  <div key={t.day} className="flex flex-col bg-card">
                    {/* Day Header */}
                    <div className="p-2.5 bg-muted/30 border-b border-border font-semibold flex flex-col">
                      <span className="text-foreground">{t.day}</span>
                      <span className="text-[10px] text-muted-foreground font-mono font-normal">
                        {t.date}
                      </span>
                    </div>

                    {/* Day Activities */}
                    <div className="flex flex-col divide-y divide-border/40">
                      {t.activities.map((act, i) => (
                        <div key={i} className="p-2 flex flex-col gap-0.5">
                          <span className="text-[10px] text-[#1447e6] font-mono font-semibold">
                            {act.time}
                          </span>
                          <span className="text-[11px] text-foreground font-normal leading-tight">
                            {act.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Health Snapshot (4 cols on desktop) */}
            <div
              id="health-section"
              className="xl:col-span-4 border border-border bg-card p-5 rounded-none shadow-xs flex flex-col justify-between h-full select-none scroll-mt-20"
              data-node-id="5288:24755"
            >
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <h3 className="text-[14px] font-semibold text-foreground tracking-tight">
                  Theo dõi sức khỏe
                </h3>
                <span className="text-[11px] text-muted-foreground font-mono">
                  07/10/2026
                </span>
              </div>

              <div className="flex flex-col divide-y divide-border/60 py-2">
                <div className="flex items-center justify-between py-3">
                  <span className="text-[12.5px] text-muted-foreground">Chiều cao</span>
                  <span className="text-[16px] font-semibold text-foreground font-mono">
                    98,2 cm
                  </span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <span className="text-[12.5px] text-muted-foreground">Cân nặng</span>
                  <span className="text-[16px] font-semibold text-foreground font-mono">
                    14,6 kg
                  </span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <span className="text-[12.5px] text-muted-foreground">BMI (tham khảo)</span>
                  <span className="text-[16px] font-semibold text-emerald-600 font-mono">
                    15,1
                  </span>
                </div>
              </div>

              <div className="p-2.5 bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 text-[11px] text-muted-foreground">
                Đạt tiêu chuẩn phát triển thể chất của WHO cho lứa tuổi 3 tuổi.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
