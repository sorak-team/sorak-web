import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  InformationCircleIcon,
  CheckmarkCircle01Icon,
  Search01Icon,
  Cancel01Icon,
  FilterHorizontalIcon,
  CheckmarkSquare02Icon,
  Calendar03Icon,
} from '@hugeicons/core-free-icons';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { cn } from '@/shared/lib/utils';
import { toast } from 'sonner';
import { useAuthStore } from '@/features/auth';
import { planningApi } from '../planning.api';

// Days of week
const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

const DOMAIN_OPTIONS = [
  { key: 'ALL', label: 'Tất cả lĩnh vực' },
  { key: 'PHYSICAL', label: 'Thể chất' },
  { key: 'COGNITIVE', label: 'Nhận thức' },
  { key: 'LANGUAGE', label: 'Ngôn ngữ' },
  { key: 'SOCIO_EMOTIONAL', label: 'Tình cảm - KNXH' },
  { key: 'AESTHETIC', label: 'Thẩm mỹ' },
];

const DOMAIN_SHORT_LABELS = {
  PHYSICAL: 'Thể chất',
  COGNITIVE: 'Nhận thức',
  LANGUAGE: 'Ngôn ngữ',
  SOCIO_EMOTIONAL: 'Tình cảm - KNXH',
  AESTHETIC: 'Thẩm mỹ',
};

const DOMAIN_FULL_LABELS = {
  PHYSICAL: 'Phát triển thể chất',
  COGNITIVE: 'Phát triển nhận thức',
  LANGUAGE: 'Phát triển ngôn ngữ',
  SOCIO_EMOTIONAL: 'Tình cảm - KNXH',
  AESTHETIC: 'Phát triển thẩm mỹ',
};

const STANDARD_GOAL_FALLBACKS = {
  MT01: 'Trẻ thực hiện được các động tác trong bài tập thể dục theo cô.',
  MT02: 'Trẻ làm được một số việc tự phục vụ đơn giản với sự hỗ trợ của người lớn.',
  MT03: 'Trẻ nhận biết và tránh một số vật dụng, nơi nguy hiểm khi được nhắc nhở.',
  MT04: 'Trẻ chọn và phân nhóm đồ vật theo một dấu hiệu nổi bật.',
  MT05: 'Trẻ nhận biết số lượng một và nhiều.',
  MT06: 'Trẻ tham gia hoạt động đơn giản và bước đầu chơi cạnh bạn.',
  MT07: 'Trẻ nhận biết, gọi tên đồ vật, con vật và hành động quen thuộc.',
  MT08: 'Trẻ đọc được bài thơ, đồng dao ngắn với sự giúp đỡ của cô.',
  MT09: 'Trẻ hiểu câu hỏi đơn giản và dùng lời nói để thể hiện nhu cầu.',
  MT10: 'Trẻ thực hiện một số yêu cầu đơn giản và bước đầu biết nhường đồ chơi.',
  MT11: 'Trẻ thích nghe hát, vận động theo nhạc và tham gia tạo hình đơn giản.',
};

export const normalizeGoalCode = (code) => {
  if (!code) return '';
  const raw = String(code).toUpperCase().trim();
  const digitsMatch = raw.match(/\d+/);
  if (digitsMatch) {
    const num = parseInt(digitsMatch[0], 10);
    if (!isNaN(num)) {
      return num < 10 ? `MT0${num}` : `MT${num}`;
    }
  }
  return raw.replace(/[^A-Z0-9]/g, '');
};

export const cleanDisplayGoalTitle = (goal) => {
  if (!goal) return '';
  const title = goal.title || '';
  if (!title.includes('?')) return title;

  // 1. Semantic pattern repair for legacy seeded corrupted strings
  if (title.includes('ph?t tri?n') && title.includes('nh?m c?')) {
    return 'Trẻ thực hiện được các động tác phát triển các nhóm cơ và hệ thần kinh vững chắc.';
  }
  if (title.includes('v?n đ?ng th?') || title.includes('v?n đ?ng tinh')) {
    return 'Trẻ thực hiện được các động tác vận động thô và vận động tinh cơ bản.';
  }
  if (title.includes('nguy hi?m')) {
    return 'Trẻ nhận biết một số tình huống nguy hiểm và lựa chọn cách xử lý phù hợp.';
  }
  if (title.includes('ph?n lo?i')) {
    return 'Trẻ phân loại được một số đối tượng theo đặc điểm chung và gọi tên nhóm.';
  }
  if (title.includes('t?ch') || title.includes('ph?m vi 10')) {
    return 'Trẻ đếm, so sánh và thực hiện tách, gộp nhóm đối tượng trong phạm vi 10.';
  }
  if (title.includes('giao ti?p') || title.includes('l?ch s?')) {
    return 'Trẻ nghe hiểu câu hỏi, diễn đạt rõ ý và sử dụng lời nói lịch sự trong giao tiếp.';
  }
  if (title.includes('ch? c?i')) {
    return 'Trẻ nhận biết và gọi tên một số chữ cái đã học trong từ gần gũi.';
  }
  if (title.includes('chia s?') || title.includes('ch? đ?n l??t')) {
    return 'Trẻ thực hiện được một số quy định chung, biết chờ đến lượt và chia sẻ với bạn.';
  }
  if (title.includes('?m nh?c') || title.includes('t?o h?nh')) {
    return 'Trẻ thể hiện cảm xúc và ý tưởng thông qua âm nhạc, tạo hình.';
  }
  if (title.includes('tham gia') && (title.includes('nhi?m v?') || title.includes('ch? đ?ng'))) {
    return 'Trẻ chủ động tham gia, phối hợp với bạn và cố gắng hoàn thành nhiệm vụ được giao.';
  }
  if (title.includes('bi?u c?m') || title.includes('đ?ng dao')) {
    return 'Trẻ đọc biểu cảm bài thơ, đồng dao phù hợp với độ tuổi.';
  }
  if (title.includes('nh??ng đ? ch?i')) {
    return 'Trẻ thực hiện một số yêu cầu đơn giản và bước đầu biết nhường đồ chơi.';
  }
  if (title.includes('th? d?c theo c?')) {
    return 'Trẻ thực hiện được các động tác trong bài tập thể dục theo cô.';
  }
  if (title.includes('t? ph?c v?')) {
    return 'Trẻ làm được một số việc tự phục vụ đơn giản với sự hỗ trợ của người lớn.';
  }
  if (title.includes('m?t v? nhi?u')) {
    return 'Trẻ nhận biết số lượng một và nhiều.';
  }
  if (title.includes('đ? v?t, con v?t')) {
    return 'Trẻ nhận biết, gọi tên đồ vật, con vật và hành động quen thuộc.';
  }
  if (title.includes('ch?i c?nh b?n')) {
    return 'Trẻ tham gia hoạt động đơn giản và bước đầu chơi cạnh bạn.';
  }
  if (title.includes('th? hi?n nhu c?u')) {
    return 'Trẻ hiểu câu hỏi đơn giản và dùng lời nói để thể hiện nhu cầu.';
  }

  // 2. Fallback to standard ministry goal by goal code
  const norm = normalizeGoalCode(goal.code || goal.goalCode || goal.id);
  return STANDARD_GOAL_FALLBACKS[norm] || title;
};


// Format ISO date (YYYY-MM-DD) to VN format (DD/MM/YYYY)
const formatDateVn = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

// Format date range as dd/mm → dd/mm
const formatDateRangeDdMm = (startDateStr, endDateStr) => {
  if (!startDateStr && !endDateStr) return 'Chưa xếp ngày';
  const formatDdMm = (str) => {
    if (!str) return '';
    const parts = str.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
    return str;
  };
  if (!startDateStr) return `→ ${formatDdMm(endDateStr)}`;
  if (!endDateStr) return `${formatDdMm(startDateStr)} →`;
  return `${formatDdMm(startDateStr)} → ${formatDdMm(endDateStr)}`;
};

// Helper generate calendar days matrix with Monday as day 0
function generateMonthDays(year, month) {
  const firstDay = new Date(year, month, 1);
  const startDayOfWeek = (firstDay.getDay() + 6) % 7; // Monday = 0, Sunday = 6
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const days = [];

  // Previous month trailing days
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    const m = month === 0 ? 11 : month - 1;
    const y = month === 0 ? year - 1 : year;
    const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    days.push({
      day: d,
      month: m,
      year: y,
      dateStr,
      isCurrentMonth: false,
    });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    days.push({
      day: d,
      month,
      year,
      dateStr,
      isCurrentMonth: true,
    });
  }

  // Next month leading days to complete grid row
  const remaining = (7 - (days.length % 7)) % 7;
  for (let d = 1; d <= remaining; d++) {
    const m = month === 11 ? 0 : month + 1;
    const y = month === 11 ? year + 1 : year;
    const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    days.push({
      day: d,
      month: m,
      year: y,
      dateStr,
      isCurrentMonth: false,
    });
  }

  return days;
}

export function TargetAllocationTab({ classId = '1' }) {
  const { t } = useTranslation();
  const currentUser = useAuthStore((state) => state.user);
  const isBgh = useMemo(() => {
    const r = String(currentUser?.role || '').toUpperCase();
    return r === 'PRINCIPAL_BGH' || r === 'PRINCIPAL' || r === 'VICE_PRINCIPAL' || r.includes('BGH') || r.includes('PRINCIPAL');
  }, [currentUser?.role]);
  const [allocationData, setAllocationData] = useState(null);
  const [themes, setThemes] = useState([]);
  const [selectedThemeCode, setSelectedThemeCode] = useState('01');
  const [allGoals, setAllGoals] = useState([]);
  const [selectedDomainFilter, setSelectedDomainFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showContents, setShowContents] = useState(true);
  const [onlySelected, setOnlySelected] = useState(false);
  const [showCalendar, setShowCalendar] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // Calendar year & month state
  const [calendarYear, setCalendarYear] = useState(2026);
  const [calendarMonth, setCalendarMonth] = useState(8); // Month index 8 = September 2026

  // Load target allocation data from PostgreSQL
  useEffect(() => {
    async function loadAllocation() {
      setIsLoading(true);
      try {
        const data = await planningApi.getTargetAllocation(classId);
        setAllocationData(data);
        const fetchedThemes = data.publishedThemes || [];
        setThemes(fetchedThemes);
        if (fetchedThemes.length > 0) {
          const first = fetchedThemes[0];
          setSelectedThemeCode(first.code);
          if (first.startDate) {
            const parts = first.startDate.split('-').map(Number);
            if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1])) {
              setCalendarYear(parts[0]);
              setCalendarMonth(parts[1] - 1);
            }
          }
        }
        setAllGoals(data.bankGoals || []);
      } catch (err) {
        console.warn('Failed to load target allocation:', err);
        toast.error('Không thể tải dữ liệu phân bổ mục tiêu');
      } finally {
        setIsLoading(false);
      }
    }
    loadAllocation();
  }, [classId]);

  // Current active main theme
  const currentTheme = useMemo(() => {
    return themes.find((th) => th.code === selectedThemeCode) || themes[0] || null;
  }, [themes, selectedThemeCode]);

  // When theme changes, update calendar month to theme's start date
  useEffect(() => {
    if (currentTheme?.startDate) {
      const parts = currentTheme.startDate.split('-').map(Number);
      if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        setCalendarYear(parts[0]);
        setCalendarMonth(parts[1] - 1);
      }
    }
  }, [currentTheme?.startDate, currentTheme?.code]);

  // Set of goal IDs, public IDs, and clean codes allocated to the current main theme
  const currentThemeGoalSet = useMemo(() => {
    const set = new Set();
    (currentTheme?.allocatedGoals || []).forEach((g) => {
      if (g.id) set.add(String(g.id));
      if (g.publicId) set.add(String(g.publicId));
      if (g.goalId) set.add(String(g.goalId));
      const cleanCode = (g.code || g.goalCode || '').split('(')[0].trim().toUpperCase();
      if (cleanCode) set.add(cleanCode);
    });
    return set;
  }, [currentTheme]);

  const checkIsGoalSelected = useCallback(
    (goal) => {
      if (!goal) return false;
      if (goal.id && currentThemeGoalSet.has(String(goal.id))) return true;
      if (goal.publicId && currentThemeGoalSet.has(String(goal.publicId))) return true;
      if (goal.goalId && currentThemeGoalSet.has(String(goal.goalId))) return true;
      const cleanCode = (goal.code || goal.goalCode || '').split('(')[0].trim().toUpperCase();
      if (cleanCode && currentThemeGoalSet.has(cleanCode)) return true;
      return false;
    },
    [currentThemeGoalSet]
  );

  // Exact count of allocated goals that match active allGoals
  const actualSelectedCount = useMemo(() => {
    return allGoals.filter((g) => checkIsGoalSelected(g)).length;
  }, [allGoals, checkIsGoalSelected]);

  // Select a theme from Column 1
  const handleSelectTheme = (th) => {
    setSelectedThemeCode(th.code);
  };

  // Lắng nghe phím mũi tên Trái / Phải trên bàn phím để chuyển chủ đề nhanh
  useEffect(() => {
    const handleKeyDown = (e) => {
      const activeEl = document.activeElement;
      const tagName = activeEl?.tagName?.toLowerCase();
      const isEditing =
        tagName === 'input' ||
        tagName === 'textarea' ||
        tagName === 'select' ||
        activeEl?.isContentEditable;

      if (isEditing) return;

      if (e.key === 'ArrowLeft') {
        const curIdx = themes.findIndex((th) => th.code === selectedThemeCode);
        if (curIdx > 0) {
          e.preventDefault();
          setSelectedThemeCode(themes[curIdx - 1].code);
        }
      } else if (e.key === 'ArrowRight') {
        const curIdx = themes.findIndex((th) => th.code === selectedThemeCode);
        if (curIdx >= 0 && curIdx < themes.length - 1) {
          e.preventDefault();
          setSelectedThemeCode(themes[curIdx + 1].code);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedThemeCode, themes]);

  // Toggle selection of a goal for the active theme
  const handleToggleGoalAllocation = async (goalId) => {
    if (isBgh || !currentTheme) return;
    const goalToAdd = allGoals.find((g) => g.id === goalId || String(g.id) === String(goalId));
    const isAlreadyAllocated = checkIsGoalSelected(goalToAdd || { id: goalId });

    let newAllocatedGoals;
    if (isAlreadyAllocated) {
      newAllocatedGoals = (currentTheme.allocatedGoals || []).filter((g) => {
        if (g.id === goalId || String(g.id) === String(goalId)) return false;
        if (goalToAdd) {
          if (g.publicId && goalToAdd.publicId && g.publicId === goalToAdd.publicId) return false;
          if (g.goalId && goalToAdd.goalId && String(g.goalId) === String(goalToAdd.goalId)) return false;
          const c1 = (g.code || g.goalCode || '').split('(')[0].trim().toUpperCase();
          const c2 = (goalToAdd.code || goalToAdd.goalCode || '').split('(')[0].trim().toUpperCase();
          if (c1 && c2 && c1 === c2) return false;
        }
        return true;
      });
    } else {
      if (!goalToAdd) return;
      newAllocatedGoals = [
        ...(currentTheme.allocatedGoals || []),
        {
          id: goalToAdd.id,
          goalId: goalToAdd.goalId || goalToAdd.id,
          publicId: goalToAdd.publicId || goalToAdd.id,
          code: goalToAdd.code,
          goalCode: goalToAdd.goalCode || goalToAdd.code,
          title: goalToAdd.title,
          domain: goalToAdd.domain,
          domainLabel: goalToAdd.domainLabel,
          contents: goalToAdd.contents || [],
        },
      ];
    }

    const updatedDomainCounts = {
      PHYSICAL: 0,
      COGNITIVE: 0,
      LANGUAGE: 0,
      SOCIO_EMOTIONAL: 0,
      AESTHETIC: 0,
    };
    newAllocatedGoals.forEach((g) => {
      if (updatedDomainCounts[g.domain] !== undefined) {
        updatedDomainCounts[g.domain]++;
      }
    });

    // Update themes state immediately
    setThemes((prev) =>
      prev.map((th) =>
        th.code === currentTheme.code
          ? {
            ...th,
            allocatedGoals: newAllocatedGoals,
            count: newAllocatedGoals.length,
            domainCounts: updatedDomainCounts,
          }
          : th,
      ),
    );

    // Update allGoals allocatedThemeCodes
    setAllGoals((prev) =>
      prev.map((g) => {
        if (g.id !== goalId) return g;
        const codes = new Set(g.allocatedThemeCodes || []);
        if (isAlreadyAllocated) {
          codes.delete(currentTheme.code);
        } else {
          codes.add(currentTheme.code);
        }
        return {
          ...g,
          allocatedThemeCodes: Array.from(codes),
        };
      }),
    );

    // Autosave in background
    try {
      await planningApi.saveTargetAllocation(classId, {
        themeId: currentTheme.id,
        themeCode: currentTheme.code,
        goalIds: newAllocatedGoals.map((g) => g.id),
      });
    } catch (err) {
      console.warn('Autosave warning:', err);
    }
  };

  const [isSaving, setIsSaving] = useState(false);

  // Helper: Lưu phân bổ mục tiêu cho chủ đề hiện tại
  const handleSaveAllocation = async () => {
    if (!currentTheme) return;
    setIsSaving(true);
    try {
      const allocatedGoalIds = (currentTheme.allocatedGoals || []).map((g) => g.id);
      await planningApi.saveTargetAllocation(classId, {
        themeId: currentTheme.id,
        themeCode: currentTheme.code,
        goalIds: allocatedGoalIds,
      });
      toast.success(`Đã lưu ${allocatedGoalIds.length} mục tiêu cho Chủ đề "${currentTheme.name}" thành công!`);
    } catch (err) {
      console.error('Save target allocation error:', err);
      toast.error('Có lỗi xảy ra khi lưu phân bổ mục tiêu');
    } finally {
      setIsSaving(false);
    }
  };

  // Ngày cập nhật định dạng DD/MM/YYYY chuẩn UX
  const updatedAt = useMemo(() => {
    return formatDateVn(new Date().toISOString().slice(0, 10));
  }, []);

  // Filtered goals for the unified list in Column 2 (theo lĩnh vực phát triển & tìm kiếm từ khóa & chỉ xem đã chọn)
  const filteredGoals = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allGoals.filter((g) => {
      // 1. Lọc theo trạng thái đã chọn (nếu bật onlySelected)
      if (onlySelected && !checkIsGoalSelected(g)) return false;

      // 2. Lọc theo lĩnh vực
      const matchDomain = selectedDomainFilter === 'ALL' || g.domain === selectedDomainFilter;
      if (!matchDomain) return false;

      // 3. Lọc theo từ khóa tìm kiếm
      if (!q) return true;
      const matchGoal =
        g.code?.toLowerCase().includes(q) ||
        g.title?.toLowerCase().includes(q) ||
        (g.contents && g.contents.some((c) => c.title?.toLowerCase().includes(q)));
      return matchGoal;
    });
  }, [allGoals, selectedDomainFilter, searchQuery, onlySelected, checkIsGoalSelected]);

  // Calendar calculations
  const month2Year = calendarMonth === 11 ? calendarYear + 1 : calendarYear;
  const month2 = calendarMonth === 11 ? 0 : calendarMonth + 1;

  const calendarDaysM1 = useMemo(
    () => generateMonthDays(calendarYear, calendarMonth),
    [calendarYear, calendarMonth],
  );

  const calendarDaysM2 = useMemo(
    () => generateMonthDays(month2Year, month2),
    [month2Year, month2],
  );

  const isPrevDisabled = calendarYear < 2026 || (calendarYear === 2026 && calendarMonth <= 8);
  const isNextDisabled = month2Year > 2027 || (month2Year === 2027 && month2 >= 4);

  const handlePrevMonth = () => {
    if (isPrevDisabled) return;
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear(calendarYear - 1);
    } else {
      setCalendarMonth(calendarMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (isNextDisabled) return;
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear(calendarYear + 1);
    } else {
      setCalendarMonth(calendarMonth + 1);
    }
  };

  // Academic year boundary (2026-09-01 to 2027-05-31)
  const academicYearBounds = {
    start: '2026-09-01',
    end: '2027-05-31',
  };

  // Helper tìm chủ đề chứa ngày bất kỳ
  const getThemeForDate = useCallback(
    (dateStr) => {
      if (!dateStr || !Array.isArray(themes)) return null;
      return (
        themes.find((t) => {
          if (!t.startDate || !t.endDate) return false;
          const s = t.startDate.slice(0, 10);
          const e = t.endDate.slice(0, 10);
          return dateStr >= s && dateStr <= e;
        }) || null
      );
    },
    [themes],
  );

  // Helper tìm chủ đề nhánh đang diễn ra trong ngày
  const getSubThemeForDate = useCallback(
    (dateStr) => {
      if (!dateStr || !currentTheme?.subThemes) return null;
      return (
        currentTheme.subThemes.find(
          (st) =>
            st.startDate &&
            st.endDate &&
            dateStr >= st.startDate &&
            dateStr <= st.endDate,
        ) || null
      );
    },
    [currentTheme?.subThemes],
  );

  if (isLoading) {
    return (
      <div className="w-full h-80 flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <div className="size-6 border-2 border-primary border-t-transparent animate-spin rounded-full" />
        <span className="text-[13px] font-medium">Đang tải phân bổ mục tiêu giáo dục...</span>
      </div>
    );
  }

  return (
    <div
      className="w-full flex-1 h-[calc(100vh-56px)] bg-background text-foreground flex overflow-hidden select-none"
      data-name="Target Allocation Clean View"
    >
      {/* =========================================================================
          COLUMN 1: DANH SÁCH CHỦ ĐỀ
         ========================================================================= */}
      <div className="w-[260px] lg:w-[280px] shrink-0 border-r border-border bg-card flex flex-col h-full overflow-hidden">
        {/* Header Column 1 */}
        <div className="p-4 border-b border-border bg-card space-y-1 shrink-0">
          <h2 className="text-[15px] font-semibold text-foreground tracking-tight">
            Danh sách chủ đề
          </h2>
          <p className="text-[12px] text-muted-foreground leading-snug">
            Các chủ đề giáo dục được phân bổ trong năm học
          </p>
        </div>

        {/* Theme List: Sạch sẽ, không badge rườm rà */}
        <div className="flex-1 overflow-y-auto divide-y divide-border/50">
          {themes.map((th) => {
            const isSelected = selectedThemeCode === th.code;

            return (
              <div
                key={th.code}
                onClick={() => handleSelectTheme(th)}
                className={cn(
                  'flex items-center gap-3 px-3.5 py-2.5 cursor-pointer transition-colors select-none text-left',
                  isSelected
                    ? 'bg-muted/70 font-semibold'
                    : 'hover:bg-muted/40 text-foreground',
                )}
              >
                {/* Topic Index square */}
                <div
                  className={cn(
                    'size-7 rounded-none flex items-center justify-center text-[12px] font-semibold shrink-0 overflow-hidden',
                    isSelected
                      ? 'bg-[#1447e6] text-white'
                      : 'bg-muted text-muted-foreground border border-border/60',
                  )}
                >
                  {th.code}
                </div>

                {/* Topic info: Name + Date Range */}
                <div className="flex flex-col min-w-0 flex-1 leading-tight">
                  <span className="text-[13px] truncate text-foreground font-medium">
                    {th.name}
                  </span>
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-normal mt-0.5">
                    <span>{formatDateRangeDdMm(th.startDate, th.endDate)}</span>
                    {th.subThemes && th.subThemes.length > 0 && (
                      <span className="text-muted-foreground/70">· {th.subThemes.length} nhánh</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* =========================================================================
          COLUMN 2: MỤC TIÊU GIÁO DỤC (DANH SÁCH DUY NHẤT & SELECT TRỰC TIẾP)
         ========================================================================= */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
        {/* HÀNG 1: Header Bar tinh gọn (Chủ đề chính, Các nhánh con, Tiến độ & Nút lưu) */}
        <div className="px-4 py-2.5 border-b border-border bg-card flex items-center justify-between gap-3 shrink-0 select-none">
          {/* Cụm bên trái: Mã CĐ + Tên chủ đề + Thời gian + Các chủ đề nhánh inline */}
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 bg-foreground text-background shrink-0">
              CĐ {currentTheme?.code}
            </span>
            <h1 className="text-[15px] font-bold text-foreground tracking-tight truncate">
              {currentTheme?.name || 'Chủ đề năm học'}
            </h1>
            {currentTheme?.startDate && (
              <span className="text-[11.5px] text-muted-foreground font-normal shrink-0">
                ({formatDateRangeDdMm(currentTheme.startDate, currentTheme.endDate)})
              </span>
            )}

            {/* Dải nhánh con: Gọn gàng, tinh tế, ngăn cách bằng dấu gạch dọc, không trùng lặp */}
            {currentTheme?.subThemes && currentTheme.subThemes.length > 0 && (
              <>
                <span className="text-muted-foreground/40 font-light select-none hidden md:inline">|</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11.5px] text-muted-foreground font-medium">Nhánh:</span>
                  {currentTheme.subThemes.map((st, idx) => (
                    <span
                      key={st.id || idx}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-muted text-[11.5px] text-foreground border border-border/80 font-medium"
                      title={`${st.name} (${formatDateRangeDdMm(st.startDate, st.endDate)})`}
                    >
                      <strong className="text-[#1447e6] font-mono text-[10.5px]">N{idx + 1}</strong>
                      <span className="truncate max-w-[130px] lg:max-w-[160px]">{st.name}</span>
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Cụm bên phải: Tiến độ chọn mục tiêu & Nút lưu thay đổi */}
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-[12px] text-muted-foreground whitespace-nowrap">
              Đã chọn <strong className="text-foreground font-bold text-[13px]">{actualSelectedCount}</strong> / {allGoals.length} mục tiêu
            </span>

            {!isBgh && (
              <Button
                type="button"
                onClick={handleSaveAllocation}
                disabled={isSaving}
                className="h-7 px-3 bg-[#1447e6] hover:bg-[#1447e6]/90 text-white text-[12px] font-medium rounded-none shadow-none cursor-pointer flex items-center gap-1.5 transition-colors"
              >
                <HugeiconsIcon icon={CheckmarkCircle01Icon} size={13} />
                <span>{isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
              </Button>
            )}
          </div>
        </div>

        {/* HÀNG 2: Tab 5 Lĩnh vực bên trái + Bộ lọc & Công cụ bên phải (Gom chung 1 hàng siêu gọn) */}
        <div className="px-4 py-1.5 border-b border-border bg-muted/20 flex items-center justify-between gap-3 shrink-0 select-none">
          {/* Bên trái: Tab 5 Lĩnh vực có đếm số lượng */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {DOMAIN_OPTIONS.map((item) => {
              const isAll = item.key === 'ALL';
              const domainGoals = isAll ? allGoals : allGoals.filter((g) => g.domain === item.key);
              const domainSelectedCount = domainGoals.filter((g) => checkIsGoalSelected(g)).length;
              const isTabActive = selectedDomainFilter === item.key;

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setSelectedDomainFilter(item.key)}
                  className={cn(
                    'h-7 px-2.5 text-[11.5px] font-medium rounded-none transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap border shrink-0',
                    isTabActive
                      ? 'bg-primary text-primary-foreground border-primary font-semibold shadow-2xs'
                      : 'bg-background hover:bg-muted/70 text-muted-foreground hover:text-foreground border-border'
                  )}
                >
                  <span>{item.label}</span>
                  <span
                    className={cn(
                      'text-[10px] font-mono px-1 py-0.2 rounded-none leading-none',
                      isTabActive
                        ? 'bg-primary-foreground/20 text-primary-foreground font-bold'
                        : domainSelectedCount > 0
                        ? 'bg-primary/10 text-primary font-bold'
                        : 'text-muted-foreground/70'
                    )}
                  >
                    {domainSelectedCount}/{domainGoals.length}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Bên phải: Tìm kiếm & Các nút bật tắt công cụ */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Input tìm kiếm gọn gàng */}
            <div className="relative w-36 sm:w-44 lg:w-48">
              <HugeiconsIcon
                icon={Search01Icon}
                size={13}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm mã, nội dung..."
                className="w-full h-7 pl-7 pr-6 bg-background border border-border text-[11.5px] text-foreground placeholder:text-muted-foreground rounded-none outline-none focus:border-primary transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  title="Xóa tìm kiếm"
                >
                  <HugeiconsIcon icon={Cancel01Icon} size={11} />
                </button>
              )}
            </div>

            {/* Nút lọc: Chỉ hiện đã chọn */}
            <button
              type="button"
              onClick={() => setOnlySelected((prev) => !prev)}
              className={cn(
                'h-7 px-2 text-[11.5px] font-medium border rounded-none transition-colors cursor-pointer flex items-center gap-1 whitespace-nowrap select-none',
                onlySelected
                  ? 'bg-[#1447e6] text-white border-[#1447e6] font-semibold'
                  : 'bg-background border-border text-foreground hover:bg-muted/60'
              )}
              title="Chỉ xem các mục tiêu đã chọn trong chủ đề này"
            >
              <HugeiconsIcon icon={CheckmarkSquare02Icon} size={13} />
              <span>Đã chọn ({actualSelectedCount})</span>
            </button>

            {/* Toggle Show/Hide Educational Contents */}
            <button
              type="button"
              onClick={() => setShowContents((prev) => !prev)}
              className={cn(
                'h-7 px-2 text-[11.5px] font-medium border rounded-none transition-colors cursor-pointer flex items-center gap-1 whitespace-nowrap select-none',
                showContents
                  ? 'bg-muted border-border text-foreground font-medium'
                  : 'bg-background border-border text-muted-foreground hover:text-foreground'
              )}
              title={showContents ? 'Thu gọn nội dung giáo dục' : 'Hiện nội dung giáo dục'}
            >
              <span>{showContents ? 'Ẩn nội dung' : 'Hiện nội dung'}</span>
            </button>

            {/* Toggle Show/Hide Calendar Sidebar */}
            <button
              type="button"
              onClick={() => setShowCalendar((prev) => !prev)}
              className={cn(
                'h-7 px-2 text-[11.5px] font-medium border rounded-none transition-colors cursor-pointer flex items-center gap-1 whitespace-nowrap select-none',
                showCalendar
                  ? 'bg-muted border-border text-foreground font-medium'
                  : 'bg-background border-border text-muted-foreground hover:text-foreground'
              )}
              title={showCalendar ? 'Thu gọn cột lịch' : 'Hiện cột lịch 2 tháng'}
            >
              <HugeiconsIcon icon={Calendar03Icon} size={13} />
              <span>{showCalendar ? 'Ẩn lịch' : 'Hiện lịch'}</span>
            </button>
          </div>
        </div>

        {/* Unified Goal List: Hiển thị mục tiêu và tích chọn trực tiếp */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-2">
          {/* Chỉ hiện dòng thông báo khi đang tìm kiếm hoặc lọc đặc biệt */}
          {(searchQuery || onlySelected) && (
            <div className="flex items-center justify-between text-[11.5px] text-muted-foreground pb-0.5 px-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span>
                  Đang lọc <strong className="text-foreground">{filteredGoals.length}</strong> mục tiêu:
                </span>
                {onlySelected && (
                  <span className="text-[#1447e6] font-medium font-mono">[Đã chọn]</span>
                )}
                {searchQuery && (
                  <span>từ khóa &quot;{searchQuery}&quot;</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setOnlySelected(false);
                  setSearchQuery('');
                }}
                className="text-[#1447e6] hover:underline cursor-pointer text-[11px]"
              >
                Xóa bộ lọc
              </button>
            </div>
          )}

          {/* Grid or List of cards */}
          <div className={cn(
            'grid gap-2',
            !showCalendar ? 'grid-cols-1 xl:grid-cols-2' : 'grid-cols-1'
          )}>
            {filteredGoals.map((goal) => {
              const isSelected = checkIsGoalSelected(goal);
              const otherThemes = themes.filter(
                (th) =>
                  th.code !== currentTheme?.code &&
                  (th.allocatedGoals || []).some((g) => g.id === goal.id),
              );

              return (
                <div
                  key={goal.id}
                  onClick={() => !isBgh && handleToggleGoalAllocation(goal.id)}
                  className={cn(
                    'flex items-start gap-3 p-3 border transition-colors select-none text-[12.5px] rounded-none bg-card',
                    isBgh ? 'cursor-default' : 'cursor-pointer',
                    isSelected
                      ? 'border-border bg-blue-50/15 dark:bg-blue-950/20 border-l-2 !border-l-[#1447e6]'
                      : isBgh ? 'border-border/60' : 'border-border/70 hover:border-border hover:bg-muted/30',
                  )}
                >
                  {/* Checkbox to select/deselect directly */}
                  <input
                    type="checkbox"
                    checked={isSelected}
                    disabled={isBgh}
                    onChange={() => !isBgh && handleToggleGoalAllocation(goal.id)}
                    onClick={(e) => e.stopPropagation()}
                    className={cn(
                      "size-4 rounded-none accent-[#1447e6] mt-0.5 shrink-0",
                      isBgh ? "cursor-default opacity-80" : "cursor-pointer"
                    )}
                  />

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-foreground text-[12.5px]">
                        {goal.code}
                      </span>
                      {selectedDomainFilter === 'ALL' && (
                        <span className="text-[12px] text-muted-foreground font-normal">
                          · {DOMAIN_SHORT_LABELS[goal.domain] || goal.domain}
                        </span>
                      )}
                      {otherThemes.length > 0 && (
                        <span className="text-[11px] text-muted-foreground/80 italic">
                          (Đã có ở CĐ {otherThemes.map((t) => t.code).join(', ')})
                        </span>
                      )}
                    </div>

                    <p
                      className={cn(
                        'text-[13px] leading-relaxed',
                        isSelected ? 'text-foreground font-medium' : 'text-foreground/85 font-normal',
                      )}
                    >
                      {cleanDisplayGoalTitle(goal)}
                    </p>

                    {/* Nội dung giáo dục chi tiết (gọn gàng, không lặp lại tiêu đề rườm rà) */}
                    {showContents && goal.contents && goal.contents.length > 0 && (
                      <div className="mt-1.5 pt-1.5 border-t border-border/40">
                        <ul className="space-y-0.5 pl-4 list-disc text-[12px] marker:text-muted-foreground/60 leading-relaxed text-muted-foreground">
                          {goal.contents.map((cnt, cIdx) => (
                            <li
                              key={cnt.id || cIdx}
                              className={cn(
                                'leading-snug transition-colors',
                                isSelected
                                  ? 'text-foreground/90 font-normal'
                                  : 'text-muted-foreground hover:text-foreground',
                              )}
                            >
                              {cnt.title}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {!showContents && goal.contents && goal.contents.length > 0 && (
                      <div className="pt-0.5">
                        <span className="text-[11px] text-muted-foreground/75 italic">
                          · {goal.contents.length} nội dung giáo dục
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {filteredGoals.length === 0 && (
            <div className="h-48 flex flex-col items-center justify-center text-center p-6 space-y-1.5 text-muted-foreground">
              <p className="text-[13px] font-medium text-foreground">
                Không tìm thấy mục tiêu nào phù hợp
              </p>
              <p className="text-[12px]">
                {onlySelected
                  ? 'Chủ đề này chưa có mục tiêu nào được chọn trong lĩnh vực hiện tại.'
                  : searchQuery
                  ? `Không có kết quả nào cho từ khóa "${searchQuery}".`
                  : 'Thử chọn bộ lọc "Tất cả" hoặc lĩnh vực phát triển khác.'}
              </p>
              {(onlySelected || selectedDomainFilter !== 'ALL' || searchQuery) && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDomainFilter('ALL');
                    setOnlySelected(false);
                    setSearchQuery('');
                  }}
                  className="mt-2 text-[12px] text-[#1447e6] hover:underline cursor-pointer"
                >
                  Xem tất cả {allGoals.length} mục tiêu
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          COLUMN 3: LỊCH 2 THÁNG LIÊN TIẾP (CHUẨN 100% TRANG BỘ CHỦ ĐỀ)
         ========================================================================= */}
      {showCalendar && (
      <div className="w-[330px] shrink-0 border-l border-border bg-card overflow-y-auto h-full select-none">
        <div className="p-3.5 space-y-3">
          {/* Month Header Toolbar: Hiển thị 2 tháng liên tiếp */}
          <div className="flex items-center justify-between py-1 border-b border-border/70 pb-2">
            <button
              type="button"
              onClick={handlePrevMonth}
              disabled={isPrevDisabled}
              className={cn(
                'size-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors rounded-none',
                isPrevDisabled
                  ? 'opacity-25 cursor-not-allowed hover:bg-transparent text-muted-foreground/40'
                  : 'cursor-pointer',
              )}
              title={isPrevDisabled ? 'Đã ở tháng đầu tiên của năm học' : 'Lùi 1 tháng'}
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} size={15} />
            </button>

            <span className="text-[13px] font-semibold text-foreground tracking-tight tabular-nums select-none">
              Tháng {calendarMonth + 1}/{calendarYear} – {month2 + 1}/{month2Year}
            </span>

            <button
              type="button"
              onClick={handleNextMonth}
              disabled={isNextDisabled}
              className={cn(
                'size-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors rounded-none',
                isNextDisabled
                  ? 'opacity-25 cursor-not-allowed hover:bg-transparent text-muted-foreground/40'
                  : 'cursor-pointer',
              )}
              title={isNextDisabled ? 'Đã ở tháng cuối cùng của năm học' : 'Tiến 1 tháng'}
            >
              <HugeiconsIcon icon={ArrowRight01Icon} size={15} />
            </button>
          </div>

          {/* 2 Tháng Lịch Liên Tiếp (Stacked 2 Months - Full height tự nhiên, không scrollbar con) */}
          <div className="space-y-4 pt-0.5">
            {[
              { key: 'm1', year: calendarYear, month: calendarMonth, days: calendarDaysM1, isFirst: true },
              { key: 'm2', year: month2Year, month: month2, days: calendarDaysM2, isFirst: false },
            ].map((mObj) => (
              <div key={mObj.key} className={cn('flex flex-col gap-1.5', !mObj.isFirst && 'pt-3.5 border-t border-border/70')}>
                <div className="flex items-center justify-between px-0.5">
                  <span className="text-[13px] font-bold text-foreground tracking-tight">
                    Tháng {mObj.month + 1}/{mObj.year}
                  </span>
                </div>

                {/* Weekday headers: T2, T3, T4, T5, T6, T7, CN */}
                <div className="grid grid-cols-7 text-center text-[11px] font-medium text-muted-foreground/80 py-1">
                  {WEEKDAYS.map((wd) => (
                    <div key={wd}>{wd}</div>
                  ))}
                </div>

                {/* Dates Grid */}
                <div className="grid grid-cols-7 gap-y-1 text-center text-[12px]">
                  {mObj.days.map((d, i) => {
                    if (!d.isCurrentMonth) {
                      return (
                        <div
                          key={i}
                          className="h-8 flex items-center justify-center select-none opacity-20 pointer-events-none text-muted-foreground/30 text-[12px] font-light"
                        >
                          {d.day}
                        </div>
                      );
                    }

                    const col = i % 7;
                    const normStart = (currentTheme?.startDate || '').slice(0, 10);
                    const normEnd = (currentTheme?.endDate || '').slice(0, 10);
                    const isSelectedDate = Boolean(
                      normStart && normEnd && d.dateStr >= normStart && d.dateStr <= normEnd,
                    );

                    const isOutsideAcademicYear = Boolean(
                      academicYearBounds.start &&
                      academicYearBounds.end &&
                      (d.dateStr < academicYearBounds.start || d.dateStr > academicYearBounds.end),
                    );

                    const otherTheme = !isSelectedDate ? getThemeForDate(d.dateStr) : null;
                    const isInOtherTheme = Boolean(otherTheme);

                    const isUnassignedInAcademicYear = Boolean(
                      !isOutsideAcademicYear && !isSelectedDate && !isInOtherTheme,
                    );

                    const prevObj = col > 0 ? mObj.days[i - 1] : null;
                    const nextObj = col < 6 ? mObj.days[i + 1] : null;
                    const prevDate = prevObj?.isCurrentMonth ? prevObj.dateStr : null;
                    const nextDate = nextObj?.isCurrentMonth ? nextObj.dateStr : null;

                    const prevTheme = prevDate ? getThemeForDate(prevDate) : null;
                    const nextTheme = nextDate ? getThemeForDate(nextDate) : null;
                    const prevSameOtherTheme = Boolean(
                      isInOtherTheme && prevTheme && (prevTheme.id === otherTheme?.id || prevTheme.code === otherTheme?.code),
                    );
                    const nextSameOtherTheme = Boolean(
                      isInOtherTheme && nextTheme && (nextTheme.id === otherTheme?.id || nextTheme.code === otherTheme?.code),
                    );

                    const matchedSubTheme = isSelectedDate ? getSubThemeForDate(d.dateStr) : null;
                    const matchedSubIdx = matchedSubTheme
                      ? (currentTheme?.subThemes || []).findIndex((st) => st.id === matchedSubTheme.id)
                      : -1;
                    const isSubThemeStart = Boolean(matchedSubTheme && d.dateStr === matchedSubTheme.startDate);

                    const isAssignedSubTheme = Boolean(isSelectedDate && matchedSubTheme);
                    const isUnassignedInTheme = Boolean(isSelectedDate && !matchedSubTheme);

                    const prevSubTheme = prevDate && normStart && normEnd && prevDate >= normStart && prevDate <= normEnd
                      ? getSubThemeForDate(prevDate)
                      : null;
                    const nextSubTheme = nextDate && normStart && normEnd && nextDate >= normStart && nextDate <= normEnd
                      ? getSubThemeForDate(nextDate)
                      : null;

                    const prevInAssigned = Boolean(col > 0 && isAssignedSubTheme && prevSubTheme);
                    const nextInAssigned = Boolean(col < 6 && isAssignedSubTheme && nextSubTheme);

                    const prevInUnassigned = Boolean(
                      col > 0 && isUnassignedInTheme && prevDate && normStart && normEnd && prevDate >= normStart && prevDate <= normEnd && !prevSubTheme,
                    );
                    const nextInUnassigned = Boolean(
                      col < 6 && isUnassignedInTheme && nextDate && normStart && normEnd && nextDate >= normStart && nextDate <= normEnd && !nextSubTheme,
                    );

                    return (
                      <div
                        key={i}
                        className={cn(
                          'h-8 flex items-center justify-center relative select-none transition-all',
                          isOutsideAcademicYear
                            ? 'opacity-20 pointer-events-none select-none bg-transparent cursor-not-allowed'
                            : isSelectedDate
                              ? 'cursor-pointer group/day'
                              : 'cursor-not-allowed opacity-40 pointer-events-none',
                        )}
                        title={
                          isOutsideAcademicYear
                            ? `Ngày ${formatDateVn(d.dateStr)} · Ngoài khung năm học`
                            : isUnassignedInAcademicYear
                              ? `Ngày ${formatDateVn(d.dateStr)} · Trong năm học (Chưa xếp chủ đề)`
                              : isAssignedSubTheme
                                ? `Ngày ${formatDateVn(d.dateStr)} · Chủ đề: ${currentTheme?.name} · Nhánh: ${matchedSubTheme.name}`
                                : isUnassignedInTheme
                                  ? `Ngày ${formatDateVn(d.dateStr)} · Chủ đề: ${currentTheme?.name} (Chưa xếp nhánh)`
                                  : isInOtherTheme
                                    ? `Ngày ${formatDateVn(d.dateStr)} · Chủ đề: ${otherTheme.name} (Khác chủ đề)`
                                    : `Ngày ${formatDateVn(d.dateStr)}`
                        }
                      >
                        {/* Ngày trong năm học nhưng chưa có chủ đề: Viền nét đứt nhẹ */}
                        {isUnassignedInAcademicYear && (
                          <div className="absolute inset-0.5 border border-dashed border-border/80 bg-muted/15 pointer-events-none" />
                        )}

                        {/* Ngày trong chủ đề ĐÃ CÓ NHÁNH */}
                        {isAssignedSubTheme && (
                          <div
                            className={cn(
                              'absolute inset-y-0.5 bg-[#1447e6]',
                              prevInAssigned ? 'left-0' : 'left-0.5',
                              nextInAssigned ? 'right-0' : 'right-0.5',
                            )}
                          />
                        )}

                        {/* Ngày trong chủ đề CHƯA XẾP NHÁNH (Dải sọc chéo mờ) */}
                        {isUnassignedInTheme && (
                          <div
                            className={cn(
                              'absolute inset-y-0.5 border-y border-[#1447e6]/35 z-10 pointer-events-none',
                              prevInUnassigned ? 'left-0' : 'left-0.5 border-l',
                              nextInUnassigned ? 'right-0' : 'right-0.5 border-r',
                            )}
                            style={{
                              background:
                                'repeating-linear-gradient(45deg, rgba(20, 71, 230, 0.08), rgba(20, 71, 230, 0.08) 5px, rgba(20, 71, 230, 0.20) 5px, rgba(20, 71, 230, 0.20) 10px)',
                            }}
                          />
                        )}

                        {/* Chủ đề khác - Dải màu xám liền mạch */}
                        {isInOtherTheme && (
                          <div
                            className={cn(
                              'absolute inset-y-0.5 bg-slate-200 dark:bg-slate-800 transition-colors',
                              prevSameOtherTheme ? 'left-0' : 'left-0.5',
                              nextSameOtherTheme ? 'right-0' : 'right-0.5',
                            )}
                          />
                        )}

                        {/* Badge mốc bắt đầu của chủ đề nhánh (N1, N2, ...) */}
                        {isSubThemeStart && matchedSubIdx !== -1 && (
                          <span
                            className="absolute top-0.5 left-0.5 z-20 text-[8px] font-mono font-bold leading-none px-0.5 py-0.2 rounded-none shadow-xs bg-slate-900 text-white"
                            title={`Bắt đầu Nhánh ${matchedSubIdx + 1}: ${matchedSubTheme.name}`}
                          >
                            N{matchedSubIdx + 1}
                          </span>
                        )}

                        {/* Số ngày */}
                        <span
                          className={cn(
                            'relative z-20 w-full h-full flex items-center justify-center text-[12px] transition-colors',
                            isAssignedSubTheme && 'text-white font-semibold',
                            isUnassignedInTheme && 'text-[#1447e6] dark:text-blue-400 font-bold',
                            isInOtherTheme && 'text-slate-800 dark:text-slate-100 font-medium',
                            isUnassignedInAcademicYear && 'text-foreground/80 font-normal',
                            isOutsideAcademicYear && 'text-muted-foreground/30 font-light',
                            !isSelectedDate && !isInOtherTheme && !isUnassignedInAcademicYear && !isOutsideAcademicYear && 'text-foreground/75',
                          )}
                        >
                          {d.day}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Thanh chú thích tinh gọn & sạch sẽ chuẩn 100% Trang Bộ Chủ Đề */}
          <div className="pt-2.5 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground select-none">
            <div className="flex items-center gap-3 shrink-0">
              <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap" title="Chủ đề đang xem">
                <span className="size-2.5 bg-[#1447e6] shrink-0" />
                <span className="font-medium text-foreground/85">Chủ đề này</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap" title="Chưa xếp nhánh">
                <span
                  className="size-2.5 border border-[#1447e6]/40 shrink-0"
                  style={{
                    background:
                      'repeating-linear-gradient(45deg, rgba(20, 71, 230, 0.2), rgba(20, 71, 230, 0.2) 2px, rgba(20, 71, 230, 0.4) 2px, rgba(20, 71, 230, 0.4) 4px)',
                  }}
                />
                <span>Chưa xếp nhánh</span>
              </div>
            </div>

            {/* Popover Hướng dẫn quy ước màu sắc chuẩn UX */}
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0 whitespace-nowrap"
                  title="Xem quy ước hiển thị lịch"
                >
                  <HugeiconsIcon icon={InformationCircleIcon} size={12} className="shrink-0" />
                  <span>Quy ước</span>
                </button>
              </PopoverTrigger>
              <PopoverContent
                side="bottom"
                avoidCollisions={false}
                align="end"
                sideOffset={6}
                className="w-72 p-3 bg-card border border-border shadow-md rounded-none text-[11.5px] space-y-2.5 z-50"
              >
                <div className="flex items-center justify-between pb-1 border-b border-border/60">
                  <span className="font-semibold text-foreground text-[12px]">
                    Quy ước hiển thị lịch
                  </span>
                </div>

                <div className="space-y-1.5 text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className="size-3 bg-[#1447e6] shrink-0" />
                    <span className="text-foreground">Chủ đề đang chọn</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="size-3 border border-[#1447e6]/40 shrink-0"
                      style={{
                        background:
                          'repeating-linear-gradient(45deg, rgba(20, 71, 230, 0.2), rgba(20, 71, 230, 0.2) 2px, rgba(20, 71, 230, 0.4) 2px, rgba(20, 71, 230, 0.4) 4px)',
                      }}
                    />
                    <span className="text-foreground">Chưa xếp nhánh</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="size-3 bg-slate-200 dark:bg-slate-700 shrink-0" />
                    <span className="text-muted-foreground">Chủ đề khác</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="size-3 border border-dashed border-border/80 bg-muted/20 shrink-0" />
                    <span className="text-muted-foreground">Chưa có chủ đề</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="size-3 opacity-25 bg-muted/40 shrink-0" />
                    <span className="text-muted-foreground/70">Ngoài năm học</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold px-1 py-0.2 bg-slate-900 text-white shrink-0">
                      N1
                    </span>
                    <span className="text-foreground">Mốc bắt đầu chủ đề nhánh</span>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Thanh thao tác: Cập nhật & Lưu thay đổi (Nằm sát ngay dưới lịch, dính liền không hở khoảng trắng) */}
          <div className="pt-2.5 border-t border-border/70 flex items-center justify-between select-none">
            <div className="text-[12px] text-muted-foreground">
              <span>Cập nhật: {updatedAt}</span>
            </div>

            {isBgh ? (
              <span className="text-[12px] text-muted-foreground italic bg-muted/40 px-2.5 py-1 border border-border/60">
                Chế độ xem dành cho Ban giám hiệu
              </span>
            ) : (
              <Button
                type="button"
                onClick={handleSaveAllocation}
                disabled={isSaving}
                className="h-8 px-3.5 bg-[#1447e6] hover:bg-[#1447e6]/90 text-white text-[12.5px] font-medium rounded-none shadow-none cursor-pointer flex items-center gap-1.5 transition-colors"
              >
                <HugeiconsIcon icon={CheckmarkCircle01Icon} size={14} />
                <span>{isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
              </Button>
            )}
          </div>
        </div>
      </div>
      )}
    </div>
  );
}

export default TargetAllocationTab;
