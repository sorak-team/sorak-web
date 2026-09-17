import React, { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Search01Icon,
  PlusSignIcon,
  UserIcon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  ArrowRight01Icon,
  Alert02Icon,
} from '@hugeicons/core-free-icons';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export function AcademicYearClassesView({ schoolYearId, schoolYearName, classes = [] }) {
  const navigate = useNavigate();
  const [selectedClass, setSelectedClass] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState('ALL');

  // Sample presentation classes mapped to the 3 kanban states
  const sampleClasses = [
    {
      id: 'c-1',
      name: 'Nhà trẻ A3',
      grade: 'Khối Nhà trẻ',
      gradeKey: 'NHA_TRE',
      studentsCount: 0,
      maxCapacity: 24,
      teacher: null,
      status: 'UNASSIGNED', // Chưa phân lớp
    },
    {
      id: 'c-2',
      name: 'Mầm A3',
      grade: 'Khối Mầm',
      gradeKey: 'MAM',
      studentsCount: 0,
      maxCapacity: 28,
      teacher: null,
      status: 'UNASSIGNED',
    },
    {
      id: 'c-3',
      name: 'Chồi B1',
      grade: 'Khối Chồi',
      gradeKey: 'CHOI',
      studentsCount: 12,
      maxCapacity: 28,
      teacher: 'Cô Nguyễn Thị Mai',
      status: 'IN_PROGRESS', // Đang phân lớp
      students: [
        { code: 'HS006', name: 'Nguyễn Gia Hân' },
        { code: 'HS007', name: 'Trần Minh Khang' },
        { code: 'HS008', name: 'Lê Bảo Khôi' },
        { code: 'HS003', name: 'Lê Khánh Chi' },
      ],
    },
    {
      id: 'c-4',
      name: 'Lá A2',
      grade: 'Khối Lá',
      gradeKey: 'LA',
      studentsCount: 24,
      maxCapacity: 24,
      teacher: null,
      status: 'IN_PROGRESS',
    },
    {
      id: 'c-5',
      name: 'Nhà trẻ A1',
      grade: 'Khối Nhà trẻ',
      gradeKey: 'NHA_TRE',
      studentsCount: 18,
      maxCapacity: 24,
      teacher: 'Cô Nguyễn Thị Lan',
      status: 'COMPLETED', // Đã phân lớp
    },
    {
      id: 'c-6',
      name: 'Mầm A1',
      grade: 'Khối Mầm',
      gradeKey: 'MAM',
      studentsCount: 25,
      maxCapacity: 28,
      teacher: 'Cô Trần Ngọc Anh',
      status: 'COMPLETED',
    },
    {
      id: 'c-7',
      name: 'Chồi A1',
      grade: 'Khối Chồi',
      gradeKey: 'CHOI',
      studentsCount: 26,
      maxCapacity: 26,
      teacher: 'Cô Lê Thảo Vy',
      status: 'COMPLETED',
    },
  ];

  const classList = classes.length > 0 ? classes : sampleClasses;

  const filteredClasses = classList.filter((c) => {
    const matchesSearch = c.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGrade = gradeFilter === 'ALL' || c.gradeKey === gradeFilter;
    return matchesSearch && matchesGrade;
  });

  const unassigned = filteredClasses.filter((c) => c.status === 'UNASSIGNED');
  const inProgress = filteredClasses.filter((c) => c.status === 'IN_PROGRESS');
  const completed = filteredClasses.filter((c) => c.status === 'COMPLETED');

  return (
    <div className="flex flex-col gap-4" data-node-id="5232:23312">
      {/* Top Filter & Action Bar (Figma 5232:23401) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-[18px] font-semibold text-foreground tracking-tight">Phân bổ lớp học</h2>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            Theo tiến độ phân công & học sinh
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Search */}
          <div className="relative w-[200px]">
            <HugeiconsIcon
              icon={Search01Icon}
              size={14}
              className="text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2"
            />
            <input
              type="text"
              placeholder="Tìm lớp..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-8 pr-2.5 text-[13px] rounded-none border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-[#1447e6]"
            />
          </div>

          {/* Grade filter */}
          <select
            value={gradeFilter}
            onChange={(e) => setGradeFilter(e.target.value)}
            className="h-8 px-2.5 text-[13px] rounded-none border border-border bg-background text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-[#1447e6]"
          >
            <option value="ALL">Tất cả khối</option>
            <option value="NHA_TRE">Khối Nhà trẻ</option>
            <option value="MAM">Khối Mầm</option>
            <option value="CHOI">Khối Chồi</option>
            <option value="LA">Khối Lá</option>
          </select>

          <button
            type="button"
            onClick={() => navigate('/classes')}
            className="h-8 px-3 inline-flex items-center gap-1.5 text-[13px] font-medium rounded-none bg-[#1447e6] hover:bg-[#123ecc] text-white cursor-pointer transition-colors shadow-xs"
          >
            <HugeiconsIcon icon={PlusSignIcon} size={14} />
            <span>Thêm lớp</span>
          </button>
        </div>
      </div>

      {/* 3 Kanban Columns Grid (Figma 5232:23407) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Column 1: Chưa phân lớp */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between pb-2 border-b border-border text-[13px] font-semibold text-foreground">
            <span>Chưa phân lớp</span>
            <span className="px-2 py-0.5 rounded-none bg-muted border border-border text-muted-foreground font-mono text-[12px]">
              {unassigned.length}
            </span>
          </div>

          <div className="flex flex-col gap-3">
            {unassigned.map((cls) => (
              <div
                key={cls.id}
                onClick={() => setSelectedClass(cls)}
                className="p-3.5 rounded-none border border-border bg-card shadow-xs hover:border-[#1447e6]/50 transition-colors cursor-pointer flex flex-col gap-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-[14px] font-semibold text-foreground tracking-tight">{cls.name}</h3>
                    <span className="text-[11px] text-muted-foreground">{cls.grade}</span>
                  </div>
                  <div className="size-8 rounded-none border border-border/80 bg-primary/10 text-[#1447e6] flex items-center justify-center font-bold text-[13px] shrink-0">
                    {cls.name?.[0]}
                  </div>
                </div>

                <div className="text-[12px] text-muted-foreground space-y-0.5">
                  <div>{cls.studentsCount}/{cls.maxCapacity} học sinh</div>
                  <div className="text-destructive font-medium">{cls.teacher || 'Chưa có giáo viên'}</div>
                </div>

                <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] text-[#1447e6] font-medium">
                  <span>Chưa phân lớp</span>
                  <span className="flex items-center gap-0.5 hover:underline">
                    Xem →
                  </span>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={() => navigate('/classes')}
              className="w-full h-8 flex items-center justify-center rounded-none border border-dashed border-border text-[12px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors cursor-pointer"
            >
              + Thêm lớp
            </button>
          </div>
        </div>

        {/* Column 2: Đang phân lớp */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between pb-2 border-b border-border text-[13px] font-semibold text-foreground">
            <span>Đang phân lớp</span>
            <span className="px-2 py-0.5 rounded-none bg-amber-500/10 text-amber-600 border border-amber-500/20 font-mono text-[12px]">
              {inProgress.length}
            </span>
          </div>

          <div className="flex flex-col gap-3">
            {inProgress.map((cls) => (
              <div
                key={cls.id}
                onClick={() => setSelectedClass(cls)}
                className="p-3.5 rounded-none border border-amber-500/30 bg-card shadow-xs hover:border-[#1447e6]/50 transition-colors cursor-pointer flex flex-col gap-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-[14px] font-semibold text-foreground tracking-tight">{cls.name}</h3>
                    <span className="text-[11px] text-muted-foreground">{cls.grade}</span>
                  </div>
                  <div className="size-8 rounded-none border border-amber-500/30 bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold text-[13px] shrink-0">
                    {cls.name?.[0]}
                  </div>
                </div>

                <div className="text-[12px] text-muted-foreground space-y-0.5">
                  <div>{cls.studentsCount}/{cls.maxCapacity} học sinh</div>
                  <div className="text-foreground font-medium">{cls.teacher || 'Chưa có giáo viên'}</div>
                </div>

                <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] text-amber-600 font-medium">
                  <span>Đang phân lớp</span>
                  <span className="flex items-center gap-0.5 hover:underline">
                    Xem →
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Column 3: Đã phân lớp */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between pb-2 border-b border-border text-[13px] font-semibold text-foreground">
            <span>Đã phân lớp</span>
            <span className="px-2 py-0.5 rounded-none bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-mono text-[12px]">
              {completed.length}
            </span>
          </div>

          <div className="flex flex-col gap-3">
            {completed.map((cls) => (
              <div
                key={cls.id}
                onClick={() => setSelectedClass(cls)}
                className="p-3.5 rounded-none border border-border bg-card shadow-xs hover:border-[#1447e6]/50 transition-colors cursor-pointer flex flex-col gap-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-[14px] font-semibold text-foreground tracking-tight">{cls.name}</h3>
                    <span className="text-[11px] text-muted-foreground">{cls.grade}</span>
                  </div>
                  <div className="size-8 rounded-none border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-[13px] shrink-0">
                    {cls.name?.[0]}
                  </div>
                </div>

                <div className="text-[12px] text-muted-foreground space-y-0.5">
                  <div>{cls.studentsCount}/{cls.maxCapacity} học sinh</div>
                  <div className="text-foreground font-medium">{cls.teacher}</div>
                </div>

                <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] text-emerald-600 font-medium">
                  <span>Đã phân lớp</span>
                  <span className="flex items-center gap-0.5 hover:underline">
                    Xem →
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Class Detail Slide Panel (Figma 5232:24029) */}
      {selectedClass && (
        <div className="fixed inset-0 z-50 flex justify-end" data-node-id="5232:24029">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setSelectedClass(null)}
          />

          <div className="relative w-full max-w-[420px] bg-card text-card-foreground shadow-2xl flex flex-col h-full border-l border-border z-10 rounded-none animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-border bg-card flex items-center justify-between">
              <div>
                <h2 className="text-[16px] font-semibold text-foreground tracking-tight">Chi tiết lớp</h2>
                <div className="text-[12px] text-muted-foreground mt-0.5">
                  {selectedClass.name} · {selectedClass.grade} · {schoolYearName}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedClass(null)}
                className="size-8 inline-flex items-center justify-center rounded-none border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={15} />
              </button>
            </div>

            {/* Panel Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-[13px]">
              {/* Status Badge */}
              <div>
                <span
                  className={`inline-block px-2.5 py-0.5 rounded-none font-medium text-[12px] border ${
                    selectedClass.status === 'COMPLETED'
                      ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                      : selectedClass.status === 'IN_PROGRESS'
                        ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                        : 'bg-muted border-border text-muted-foreground'
                  }`}
                >
                  {selectedClass.status === 'COMPLETED'
                    ? 'Đã phân lớp'
                    : selectedClass.status === 'IN_PROGRESS'
                      ? 'Đang phân lớp'
                      : 'Chưa phân lớp'}
                </span>
              </div>

              {/* Teacher In-charge */}
              <div>
                <label className="block font-medium text-foreground mb-1.5 text-[13px]">
                  Giáo viên phụ trách
                </label>
                <select
                  defaultValue={selectedClass.teacher || 'NONE'}
                  className="w-full h-9 px-3 text-[13px] rounded-none border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-[#1447e6]"
                >
                  <option value="NONE">Chưa có giáo viên</option>
                  <option value="Cô Nguyễn Thị Mai">Cô Nguyễn Thị Mai</option>
                  <option value="Cô Nguyễn Thị Lan">Cô Nguyễn Thị Lan</option>
                  <option value="Cô Trần Ngọc Anh">Cô Trần Ngọc Anh</option>
                  <option value="Cô Lê Thảo Vy">Cô Lê Thảo Vy</option>
                </select>
              </div>

              {/* Student Roster snippet (Figma 5232:24758) */}
              <div className="pt-2 border-t border-border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground text-[13px]">
                    Danh sách học sinh
                  </span>
                  <span className="font-mono text-muted-foreground text-[12px]">
                    {selectedClass.studentsCount} / {selectedClass.maxCapacity}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="h-1 w-full bg-muted overflow-hidden rounded-none">
                  <div
                    className="h-full bg-[#1447e6]"
                    style={{
                      width: `${Math.min(100, (selectedClass.studentsCount / selectedClass.maxCapacity) * 100)}%`,
                    }}
                  />
                </div>

                <div className="rounded-none border border-border divide-y divide-border bg-card mt-2">
                  {(selectedClass.students || [
                    { code: 'HS006', name: 'Nguyễn Gia Hân' },
                    { code: 'HS007', name: 'Trần Minh Khang' },
                    { code: 'HS008', name: 'Lê Bảo Khôi' },
                    { code: 'HS003', name: 'Lê Khánh Chi' },
                  ]).map((st, sIdx) => (
                    <div key={sIdx} className="p-2.5 flex items-center justify-between text-[13px]">
                      <div className="flex items-center gap-2.5">
                        <div className="size-7 rounded-none bg-muted border border-border/80 flex items-center justify-center font-semibold text-[11px] text-[#1447e6]">
                          {st.name[0]}
                        </div>
                        <span className="font-medium text-foreground">{st.name}</span>
                      </div>
                      <span className="font-mono text-muted-foreground text-[11px]">{st.code}</span>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => navigate('/classes')}
                  className="text-[#1447e6] hover:underline font-medium text-[12px] block pt-1 cursor-pointer"
                >
                  Xem tất cả học sinh →
                </button>
              </div>

              {/* Completion conditions checklist (Figma 5232:24791) */}
              <div className="p-3.5 rounded-none bg-muted/40 border border-border space-y-2">
                <span className="font-semibold text-foreground block text-[13px]">Điều kiện hoàn thành</span>
                <div className="space-y-1.5 text-[12px]">
                  <div className="flex items-center gap-2 text-emerald-600 font-medium">
                    <HugeiconsIcon icon={CheckmarkCircle02Icon} size={14} />
                    <span>Đã phân công giáo viên chủ nhiệm</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <HugeiconsIcon icon={Alert02Icon} size={14} className="text-amber-500" />
                    <span>Chưa hoàn tất danh sách học sinh</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border bg-card flex items-center justify-between gap-2.5">
              <button
                type="button"
                onClick={() => navigate('/classes')}
                className="h-8.5 px-3.5 text-[13px] font-medium rounded-none border border-border bg-background hover:bg-muted text-foreground cursor-pointer transition-colors"
              >
                Quản lý học sinh
              </button>
              <button
                type="button"
                onClick={() => {
                  toast.success('Đã lưu phân công lớp học!');
                  setSelectedClass(null);
                }}
                className="h-8.5 px-4 text-[13px] font-medium rounded-none bg-[#1447e6] hover:bg-[#123ecc] text-white cursor-pointer transition-colors shadow-xs"
              >
                Lưu phân công
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AcademicYearClassesView;
