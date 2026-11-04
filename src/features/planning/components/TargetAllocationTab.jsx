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
  { key: 'ALL', label: 'Tất cả' },
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

// Dữ liệu mẫu nhiều Nội dung giáo dục (NDGD) cho từng mục tiêu để test phân bổ lẻ và gộp
export const SAMPLE_MULTI_CONTENTS = {
  MT01: [
    { title: 'Động tác hô hấp: Hít vào thở sâu, tập gà gáy, thổi bóng bay' },
    { title: 'Động tác tay - vai: Đưa 2 tay sang ngang, lên cao, gập trước ngực theo nhịp' },
    { title: 'Động tác lưng - bụng: Nghiêng người sang 2 bên, cúi gập người về phía trước' },
    { title: 'Động tác chân: Nhún chân, khuỵu gối, giậm chân tại chỗ theo nhịp đếm' },
  ],
  MT02: [
    { title: 'Đi thăng bằng trên ghế thể dục (cao 30cm, rộng 25cm), đầu đội túi cát' },
    { title: 'Đi thăng bằng theo đường kẻ thẳng 3m trên sàn không bước lệch' },
  ],
  MT03: [
    { title: 'Đi kiễng gót liên tục 3m - 5m giữ thăng bằng' },
    { title: 'Đứng kiễng gót bằng 2 chân liên tục trong 5 giây' },
    { title: 'Đi kiễng gót đổi hướng theo hiệu lệnh của cô giáo' },
  ],
  MT04: [
    { title: 'Chạy nâng cao đùi tại chỗ nhịp nhàng theo nhịp gõ xắc xô' },
    { title: 'Chạy nhanh 15m theo hướng thẳng tới đích không chệch làn' },
  ],
  MT05: [
    { title: 'Bật tại chỗ liên tục 4 - 5 lần tiếp đất êm bằng mũi bàn chân' },
    { title: 'Bật nhảy tiến qua vạch kẻ thẳng bằng 2 chân liên tục' },
    { title: 'Bật chụm tách chân vào các vòng tròn kế tiếp nhau trên sân' },
  ],
  MT06: [
    { title: 'Bật xa 20 - 25cm bằng hai chân và tiếp đất nhẹ nhàng' },
    { title: 'Phối hợp nhún chân và vung tay tạo đà bật xa về phía trước' },
  ],
  MT07: [
    { title: 'Tung và bắt bóng bằng 2 tay với cô giáo ở khoảng cách 1.5m' },
    { title: 'Bắt bóng bằng 2 tay tiếp xúc bóng êm, không ôm bóng vào ngực' },
  ],
  MT23: [
    { title: 'Trò chuyện về tên trường, tên lớp học và các phòng chức năng trong trường' },
    { title: 'Làm quen, ghi nhớ và gọi đúng tên cô giáo chủ nhiệm, cô bảo mẫu và các bạn trong lớp' },
    { title: 'Khám phá các góc hoạt động và quy định chung của lớp mầm non' },
  ],
  MT24: [
    { title: 'Nhận biết tên gọi và công dụng chính của các đồ chơi quen thuộc trong lớp' },
    { title: 'Gọi tên và sử dụng đúng cách đồ dùng học tập: Bút màu, đất nặn, giấy vẽ' },
    { title: 'Thực hành cất dọn và phân loại đồ chơi gọn gàng đúng nơi quy định sau khi chơi' },
  ],
  MT25: [
    { title: 'Định hướng không gian lớp học: Góc xây dựng, góc phân vai, góc học tập' },
    { title: 'Nhận biết vị trí và quy ước hoạt động tại góc nghệ thuật và góc sách truyện' },
  ],
  MT26: [
    { title: 'Khám phá cơ thể người: Mắt để nhìn, tai để nghe, mũi để ngửi, miệng để nói' },
    { title: 'Nhận biết chức năng của bàn tay, bàn chân trong vận động và sinh hoạt hàng ngày' },
    { title: 'Thực hành các thói quen giữ gìn vệ sinh thân thể sạch sẽ' },
  ],
  MT27: [
    { title: 'Sử dụng xúc giác để phân biệt đồ vật có bề mặt nhẵn bóng - sần sùi' },
    { title: 'Khám phá và nhận biết đặc điểm vật lý: Nóng / lạnh, cứng / mềm' },
  ],
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

// Format date range as dd/mm – dd/mm
const formatDateRangeDdMm = (startDateStr, endDateStr) => {
  if (!startDateStr && !endDateStr) return 'Chưa xếp ngày';
  const formatDdMm = (str) => {
    if (!str) return '';
    const parts = str.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
    return str;
  };
  if (!startDateStr) return `– ${formatDdMm(endDateStr)}`;
  if (!endDateStr) return `${formatDdMm(startDateStr)} –`;
  return `${formatDdMm(startDateStr)} – ${formatDdMm(endDateStr)}`;
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
        const rawGoals = data.bankGoals || [];
        const enrichedGoals = rawGoals.map((g) => {
          // Luôn giữ nguyên nội dung giáo dục thực tế từ Ngân hàng mục tiêu do BGH thiết lập
          if (Array.isArray(g.contents) && g.contents.length > 0) {
            return g;
          }
          // Chỉ fallback khi mục tiêu hoàn toàn chưa có nội dung nào trong hệ thống
          const normCode = normalizeGoalCode(g.code || g.goalCode);
          const sampleList = SAMPLE_MULTI_CONTENTS[normCode];
          if (sampleList && sampleList.length > 0) {
            const enrichedContents = sampleList.map((sample, idx) => ({
              id: `mock-${normCode.toLowerCase()}-${idx + 1}`,
              title: sample.title,
            }));
            return {
              ...g,
              contents: enrichedContents,
            };
          }
          return g;
        });
        setAllGoals(enrichedGoals);
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

  // Set of allocated content IDs (NDGD) for the current theme
  const currentThemeContentSet = useMemo(() => {
    const set = new Set();
    (currentTheme?.allocatedContentIds || []).forEach((cId) => set.add(String(cId)));
    (currentTheme?.allocatedGoals || []).forEach((g) => {
      if (Array.isArray(g.selectedContentIds) && g.selectedContentIds.length > 0) {
        g.selectedContentIds.forEach((cId) => set.add(String(cId)));
      } else if (Array.isArray(g.contents)) {
        g.contents.forEach((c) => set.add(String(c.id || c.content_id)));
      }
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

  // Status breakdown of contents within a goal for current theme
  const getGoalContentStatus = useCallback(
    (goal) => {
      if (!goal) return { isSelected: false, isFullySelected: false, isPartiallySelected: false, selectedCount: 0, totalCount: 0 };
      const contents = goal.contents || [];
      const totalCount = contents.length;

      if (totalCount === 0) {
        const isLegacySelected = checkIsGoalSelected(goal);
        return {
          isSelected: isLegacySelected,
          isFullySelected: isLegacySelected,
          isPartiallySelected: false,
          selectedCount: isLegacySelected ? 1 : 0,
          totalCount: 1,
        };
      }

      const selectedCount = contents.filter((c) => {
        const cId = String(c.id || c.content_id);
        const cNum = c.content_id ? String(c.content_id) : null;
        const cPub = (c.public_id || c.publicId) ? String(c.public_id || c.publicId) : null;
        return (
          currentThemeContentSet.has(cId) ||
          (cNum && currentThemeContentSet.has(cNum)) ||
          (cPub && currentThemeContentSet.has(cPub))
        );
      }).length;

      const isFullySelected = selectedCount === totalCount && totalCount > 0;
      const isPartiallySelected = selectedCount > 0 && selectedCount < totalCount;
      const isSelected = selectedCount > 0;

      return {
        isSelected,
        isFullySelected,
        isPartiallySelected,
        selectedCount,
        totalCount,
      };
    },
    [checkIsGoalSelected, currentThemeContentSet]
  );

  // Exact count of allocated goals that match active allGoals
  const actualSelectedCount = useMemo(() => {
    return allGoals.filter((g) => getGoalContentStatus(g).isSelected).length;
  }, [allGoals, getGoalContentStatus]);

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

  // Toggle selection of a single NDGD (EducationalContent)
  const handleToggleContentAllocation = async (goalId, contentId) => {
    if (isBgh || !currentTheme) return;
    const sCId = String(contentId);
    const targetGoal = allGoals.find((g) => g.id === goalId || String(g.id) === String(goalId));
    const targetContent = (targetGoal?.contents || []).find(
      (c) =>
        String(c.id || c.content_id) === sCId ||
        (c.content_id && String(c.content_id) === sCId) ||
        (c.public_id && String(c.public_id) === sCId) ||
        (c.publicId && String(c.publicId) === sCId)
    );

    const isCurrentlySelected =
      currentThemeContentSet.has(sCId) ||
      (targetContent?.id && currentThemeContentSet.has(String(targetContent.id))) ||
      (targetContent?.content_id && currentThemeContentSet.has(String(targetContent.content_id))) ||
      (targetContent?.public_id && currentThemeContentSet.has(String(targetContent.public_id))) ||
      (targetContent?.publicId && currentThemeContentSet.has(String(targetContent.publicId)));

    const newAllocatedContentIds = new Set(currentThemeContentSet);
    if (isCurrentlySelected) {
      newAllocatedContentIds.delete(sCId);
      if (targetContent?.id) newAllocatedContentIds.delete(String(targetContent.id));
      if (targetContent?.content_id) newAllocatedContentIds.delete(String(targetContent.content_id));
      if (targetContent?.public_id) newAllocatedContentIds.delete(String(targetContent.public_id));
      if (targetContent?.publicId) newAllocatedContentIds.delete(String(targetContent.publicId));
    } else {
      newAllocatedContentIds.add(sCId);
      if (targetContent?.id) newAllocatedContentIds.add(String(targetContent.id));
      if (targetContent?.content_id) newAllocatedContentIds.add(String(targetContent.content_id));
      if (targetContent?.public_id) newAllocatedContentIds.add(String(targetContent.public_id));
      if (targetContent?.publicId) newAllocatedContentIds.add(String(targetContent.publicId));
    }

    const checkContentInSet = (c) => {
      const cid = String(c.id || c.content_id);
      const cnum = c.content_id ? String(c.content_id) : null;
      const cpub = (c.public_id || c.publicId) ? String(c.public_id || c.publicId) : null;
      return (
        newAllocatedContentIds.has(cid) ||
        (cnum && newAllocatedContentIds.has(cnum)) ||
        (cpub && newAllocatedContentIds.has(cpub))
      );
    };

    // Recompute allocatedGoals for currentTheme
    const newAllocatedGoals = [];
    allGoals.forEach((g) => {
      const contents = g.contents || [];
      const selectedForThisGoal = contents
        .filter((c) => checkContentInSet(c))
        .map((c) => String(c.id || c.content_id));

      if (selectedForThisGoal.length > 0) {
        newAllocatedGoals.push({
          id: g.id,
          goalId: g.goalId || g.id,
          publicId: g.publicId || g.id,
          code: g.code,
          goalCode: g.goalCode || g.code,
          title: g.title,
          domain: g.domain,
          domainLabel: g.domainLabel,
          contents: g.contents || [],
          selectedContentIds: selectedForThisGoal,
          selectedContentsCount: selectedForThisGoal.length,
          totalContentsCount: contents.length,
          isFullySelected: selectedForThisGoal.length === contents.length,
          isPartiallySelected: selectedForThisGoal.length > 0 && selectedForThisGoal.length < contents.length,
        });
      }
    });

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

    setThemes((prev) =>
      prev.map((th) =>
        th.code === currentTheme.code
          ? {
              ...th,
              allocatedGoals: newAllocatedGoals,
              allocatedContentIds: Array.from(newAllocatedContentIds),
              count: newAllocatedGoals.length,
              domainCounts: updatedDomainCounts,
            }
          : th
      )
    );

    setAllGoals((prev) =>
      prev.map((g) => {
        const hasSelected = (g.contents || []).some((c) => checkContentInSet(c));
        const codes = new Set(g.allocatedThemeCodes || []);
        if (hasSelected) {
          codes.add(currentTheme.code);
        } else {
          codes.delete(currentTheme.code);
        }
        return { ...g, allocatedThemeCodes: Array.from(codes) };
      })
    );

    try {
      await planningApi.saveTargetAllocation(classId, {
        themeId: currentTheme.id,
        themeCode: currentTheme.code,
        contentIds: Array.from(newAllocatedContentIds),
        goalIds: newAllocatedGoals.map((g) => g.id),
      });
      setLastSavedTime(new Date());
    } catch (err) {
      console.warn('Autosave warning:', err);
    }
  };

  // Toggle selection of all contents of a goal (Master checkbox)
  const handleToggleGoalAllocation = async (goalId) => {
    if (isBgh || !currentTheme) return;
    const targetGoal = allGoals.find((g) => g.id === goalId || String(g.id) === String(goalId));
    if (!targetGoal) return;

    const status = getGoalContentStatus(targetGoal);
    const contents = targetGoal.contents || [];
    const newAllocatedContentIds = new Set(currentThemeContentSet);

    if (status.isFullySelected || status.isPartiallySelected) {
      // Deselect ALL contents of this goal
      contents.forEach((c) => {
        if (c.id) newAllocatedContentIds.delete(String(c.id));
        if (c.content_id) newAllocatedContentIds.delete(String(c.content_id));
        if (c.public_id) newAllocatedContentIds.delete(String(c.public_id));
        if (c.publicId) newAllocatedContentIds.delete(String(c.publicId));
      });
    } else {
      // Select ALL contents of this goal
      contents.forEach((c) => {
        if (c.id) newAllocatedContentIds.add(String(c.id));
        if (c.content_id) newAllocatedContentIds.add(String(c.content_id));
        if (c.public_id) newAllocatedContentIds.add(String(c.public_id));
        if (c.publicId) newAllocatedContentIds.add(String(c.publicId));
      });
    }

    const checkContentInSet = (c) => {
      const cid = String(c.id || c.content_id);
      const cnum = c.content_id ? String(c.content_id) : null;
      const cpub = (c.public_id || c.publicId) ? String(c.public_id || c.publicId) : null;
      return (
        newAllocatedContentIds.has(cid) ||
        (cnum && newAllocatedContentIds.has(cnum)) ||
        (cpub && newAllocatedContentIds.has(cpub))
      );
    };

    const newAllocatedGoals = [];
    allGoals.forEach((g) => {
      const gContents = g.contents || [];
      const selectedForThisGoal = gContents
        .filter((c) => checkContentInSet(c))
        .map((c) => String(c.id || c.content_id));

      if (selectedForThisGoal.length > 0) {
        newAllocatedGoals.push({
          id: g.id,
          goalId: g.goalId || g.id,
          publicId: g.publicId || g.id,
          code: g.code,
          goalCode: g.goalCode || g.code,
          title: g.title,
          domain: g.domain,
          domainLabel: g.domainLabel,
          contents: g.contents || [],
          selectedContentIds: selectedForThisGoal,
          selectedContentsCount: selectedForThisGoal.length,
          totalContentsCount: gContents.length,
          isFullySelected: selectedForThisGoal.length === gContents.length,
          isPartiallySelected: selectedForThisGoal.length > 0 && selectedForThisGoal.length < gContents.length,
        });
      }
    });

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

    setThemes((prev) =>
      prev.map((th) =>
        th.code === currentTheme.code
          ? {
              ...th,
              allocatedGoals: newAllocatedGoals,
              allocatedContentIds: Array.from(newAllocatedContentIds),
              count: newAllocatedGoals.length,
              domainCounts: updatedDomainCounts,
            }
          : th
      )
    );

    setAllGoals((prev) =>
      prev.map((g) => {
        const hasSelected = (g.contents || []).some((c) =>
          newAllocatedContentIds.has(String(c.id || c.content_id))
        );
        const codes = new Set(g.allocatedThemeCodes || []);
        if (hasSelected) {
          codes.add(currentTheme.code);
        } else {
          codes.delete(currentTheme.code);
        }
        return { ...g, allocatedThemeCodes: Array.from(codes) };
      })
    );

    try {
      await planningApi.saveTargetAllocation(classId, {
        themeId: currentTheme.id,
        themeCode: currentTheme.code,
        contentIds: Array.from(newAllocatedContentIds),
        goalIds: newAllocatedGoals.map((g) => g.id),
      });
      setLastSavedTime(new Date());
    } catch (err) {
      console.warn('Autosave warning:', err);
    }
  };

  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState(null);

  // Helper: Lưu phân bổ mục tiêu & NDGD cho chủ đề hiện tại
  const handleSaveAllocation = async () => {
    if (!currentTheme) return;
    setIsSaving(true);
    try {
      const allocatedContentIds = Array.from(currentThemeContentSet);
      const allocatedGoalIds = (currentTheme.allocatedGoals || []).map((g) => g.id);
      await planningApi.saveTargetAllocation(classId, {
        themeId: currentTheme.id,
        themeCode: currentTheme.code,
        contentIds: allocatedContentIds,
        goalIds: allocatedGoalIds,
      });
      setLastSavedTime(new Date());
      toast.success(`Đã lưu ${allocatedContentIds.length} NDGD (${allocatedGoalIds.length} mục tiêu) cho Chủ đề "${currentTheme.name}" thành công!`);
    } catch (err) {
      console.error('Save target allocation error:', err);
      toast.error('Có lỗi xảy ra khi lưu phân bổ');
    } finally {
      setIsSaving(false);
    }
  };

  // Thời gian cập nhật định dạng HH:mm - DD/MM/YYYY chuẩn UX
  const updatedAt = useMemo(() => {
    const d = lastSavedTime || new Date();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${hours}:${minutes} - ${day}/${month}/${year}`;
  }, [lastSavedTime]);

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
      className="w-full flex-1 h-full bg-background text-foreground flex overflow-hidden select-none"
      data-name="Target Allocation Clean View"
    >
      {/* =========================================================================
          COLUMN 1: DANH SÁCH CHỦ ĐỀ
         ========================================================================= */}
      <div className="w-[260px] lg:w-[280px] shrink-0 border-r border-border bg-card flex flex-col h-full overflow-hidden">
        {/* Header Column 1 */}
        <div className="p-3.5 border-b border-border bg-card shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground tracking-tight">
              Danh sách chủ đề
            </h2>
            <span className="text-[11px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 border border-border">
              {themes.length} chủ đề
            </span>
          </div>
          <p className="text-[11.5px] text-muted-foreground mt-0.5 leading-snug">
            Phân bổ mục tiêu theo năm học
          </p>
        </div>

        {/* Theme List */}
        <div className="flex-1 overflow-y-auto divide-y divide-border/50">
          {themes.map((th) => {
            const isSelected = selectedThemeCode === th.code;
            const allocatedCount = th.allocatedGoals?.length || th.count || 0;

            return (
              <div
                key={th.code}
                onClick={() => handleSelectTheme(th)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors text-left select-none',
                  isSelected
                    ? 'bg-muted/80 font-semibold'
                    : 'hover:bg-muted/40 text-foreground',
                )}
              >
                {/* Topic Index square */}
                <div
                  className={cn(
                    'size-6 flex items-center justify-center text-xs font-mono font-bold shrink-0',
                    isSelected
                      ? 'bg-foreground text-background'
                      : 'bg-muted text-muted-foreground border border-border',
                  )}
                >
                  {th.code}
                </div>

                {/* Topic info: Name + Date Range */}
                <div className="flex flex-col min-w-0 flex-1 leading-tight">
                  <span
                    className={cn(
                      'text-xs lg:text-[13px] truncate',
                      isSelected ? 'text-foreground font-semibold' : 'text-foreground/85 font-medium',
                    )}
                  >
                    {th.name}
                  </span>
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-normal mt-0.5">
                    <span>{formatDateRangeDdMm(th.startDate, th.endDate)}</span>
                    {th.subThemes && th.subThemes.length > 0 && (
                      <span className="text-muted-foreground/70">· {th.subThemes.length} nhánh</span>
                    )}
                  </div>
                </div>

                {/* Target count badge */}
                {allocatedCount > 0 && (
                  <span
                    className={cn(
                      'text-[10px] font-mono px-1 py-0.2 border shrink-0',
                      isSelected
                        ? 'bg-foreground/10 text-foreground border-foreground/25 font-semibold'
                        : 'bg-muted text-muted-foreground border-border',
                    )}
                    title={`Chủ đề này đã có ${allocatedCount} mục tiêu`}
                  >
                    {allocatedCount} MT
                  </span>
                )}
              </div>
            );
          })}

          {/* Thời gian cập nhật đặt ngay sau chủ đề cuối cùng */}
          <div className="py-2.5 px-3.5 bg-muted/15 border-t border-border flex items-center justify-between text-xs text-muted-foreground select-none">
            <span className="text-[11.5px]">Thời gian cập nhật:</span>
            <span className="text-[11.5px] font-mono font-medium text-foreground/85">{updatedAt}</span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          COLUMN 2: MỤC TIÊU GIÁO DỤC (DANH SÁCH DUY NHẤT & SELECT TRỰC TIẾP)
         ========================================================================= */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
        {/* HÀNG 1: Header Bar tinh gọn - Đã chuyển nhánh con xuống dưới lịch */}
        <div className="h-11 px-4 border-b border-border bg-card flex items-center justify-between gap-3 shrink-0 select-none">
          {/* Cụm bên trái: Tên chủ đề dạng chữ trực tiếp, không dùng badge */}
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-sm font-bold text-foreground tracking-tight truncate">
              Chủ đề {currentTheme?.code}: {currentTheme?.name || 'Chủ đề năm học'}
            </h1>
            {currentTheme?.startDate && (
              <span className="text-xs text-muted-foreground shrink-0 hidden sm:inline">
                ({formatDateRangeDdMm(currentTheme.startDate, currentTheme.endDate)})
              </span>
            )}
          </div>

          {/* Cụm bên phải: Tiến độ chọn mục tiêu & Nút lưu thay đổi duy nhất */}
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              Đã chọn <strong className="font-mono font-bold text-foreground">{actualSelectedCount}</strong> / {allGoals.length} mục tiêu
            </span>

            {!isBgh && (
              <Button
                type="button"
                onClick={handleSaveAllocation}
                disabled={isSaving}
                className="h-7 px-3 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium rounded-none cursor-pointer flex items-center gap-1.5"
              >
                <HugeiconsIcon icon={CheckmarkCircle01Icon} size={13} />
                <span>{isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
              </Button>
            )}
          </div>
        </div>

        {/* HÀNG 2: Toolbar tìm kiếm & biểu tượng Bộ lọc (Không list ngang) */}
        <div className="h-10 px-4 border-b border-border bg-muted/20 flex items-center justify-between gap-3 shrink-0 select-none">
          {/* Bên trái: Input tìm kiếm + Biểu tượng Filter giống các trang khác + Chip bộ lọc */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {/* Input tìm kiếm */}
            <div className="relative w-44 sm:w-56 lg:w-64 shrink-0">
              <HugeiconsIcon
                icon={Search01Icon}
                size={13}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm mã MT, tên nội dung..."
                className="w-full h-7 pl-7 pr-6 bg-card border border-border text-xs text-foreground placeholder:text-muted-foreground rounded-none outline-none focus:border-primary transition-colors"
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

            {/* Biểu tượng Filter chuẩn các trang khác */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    'h-7 px-2.5 bg-card border border-border text-foreground hover:bg-muted/60 rounded-none flex items-center gap-1.5 transition-colors cursor-pointer select-none text-xs shrink-0',
                    (selectedDomainFilter !== 'ALL' || onlySelected) &&
                      'border-primary text-primary bg-primary/5 font-semibold',
                  )}
                  title="Bộ lọc mục tiêu giáo dục"
                  data-name="Filter · Goals"
                >
                  <HugeiconsIcon icon={FilterHorizontalIcon} size={14} />
                  <span>Bộ lọc</span>
                  {(selectedDomainFilter !== 'ALL' || onlySelected) && (
                    <span className="size-1.5 bg-primary rounded-none" />
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-56 p-1.5 rounded-none border border-border bg-card shadow-xl z-50 text-foreground"
              >
                {/* Lĩnh vực phát triển */}
                <DropdownMenuLabel className="px-2 py-1 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Lĩnh vực phát triển
                </DropdownMenuLabel>
                {DOMAIN_OPTIONS.map((item) => {
                  const isAll = item.key === 'ALL';
                  const domainGoals = isAll ? allGoals : allGoals.filter((g) => g.domain === item.key);
                  const domainSelectedCount = domainGoals.filter((g) => checkIsGoalSelected(g)).length;
                  const isDomainActive = selectedDomainFilter === item.key;

                  return (
                    <DropdownMenuItem
                      key={item.key}
                      onClick={() => setSelectedDomainFilter(item.key)}
                      className={cn(
                        'flex items-center justify-between h-7.5 px-2 text-xs cursor-pointer rounded-none hover:bg-muted/60',
                        isDomainActive && 'bg-muted/80 font-semibold text-primary',
                      )}
                    >
                      <span>{item.label}</span>
                      <div className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
                        <span>{isAll ? domainGoals.length : `${domainSelectedCount}/${domainGoals.length}`}</span>
                        {isDomainActive && (
                          <HugeiconsIcon icon={CheckmarkSquare02Icon} size={13} className="text-primary shrink-0" />
                        )}
                      </div>
                    </DropdownMenuItem>
                  );
                })}

                <DropdownMenuSeparator className="my-1 border-t border-border" />

                {/* Trạng thái phân bổ */}
                <DropdownMenuLabel className="px-2 py-1 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Trạng thái phân bổ
                </DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => setOnlySelected(false)}
                  className={cn(
                    'flex items-center justify-between h-7.5 px-2 text-xs cursor-pointer rounded-none hover:bg-muted/60',
                    !onlySelected && 'bg-muted/80 font-semibold text-primary',
                  )}
                >
                  <span>Tất cả mục tiêu ({allGoals.length})</span>
                  {!onlySelected && (
                    <HugeiconsIcon icon={CheckmarkSquare02Icon} size={13} className="text-primary shrink-0" />
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setOnlySelected(true)}
                  className={cn(
                    'flex items-center justify-between h-7.5 px-2 text-xs cursor-pointer rounded-none hover:bg-muted/60',
                    onlySelected && 'bg-muted/80 font-semibold text-primary',
                  )}
                >
                  <span>Chỉ xem đã chọn ({actualSelectedCount})</span>
                  {onlySelected && (
                    <HugeiconsIcon icon={CheckmarkSquare02Icon} size={13} className="text-primary shrink-0" />
                  )}
                </DropdownMenuItem>

                {/* Đặt lại bộ lọc */}
                {(selectedDomainFilter !== 'ALL' || onlySelected) && (
                  <>
                    <DropdownMenuSeparator className="my-1 border-t border-border" />
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedDomainFilter('ALL');
                        setOnlySelected(false);
                      }}
                      className="flex items-center justify-center h-7 px-2 text-xs text-primary hover:bg-primary/10 cursor-pointer rounded-none font-medium text-center"
                    >
                      Đặt lại bộ lọc
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Active Filter Chips */}
            {selectedDomainFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-muted text-foreground border border-border text-[11px] font-medium shrink-0">
                <span>Lĩnh vực: {DOMAIN_SHORT_LABELS[selectedDomainFilter]}</span>
                <button
                  type="button"
                  onClick={() => setSelectedDomainFilter('ALL')}
                  className="hover:bg-muted-foreground/20 size-3.5 flex items-center justify-center cursor-pointer font-bold leading-none"
                  title="Bỏ lọc lĩnh vực"
                >
                  ×
                </button>
              </span>
            )}

            {onlySelected && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-muted text-foreground border border-border text-[11px] font-medium shrink-0">
                <span>Đã chọn ({actualSelectedCount})</span>
                <button
                  type="button"
                  onClick={() => setOnlySelected(false)}
                  className="hover:bg-muted-foreground/20 size-3.5 flex items-center justify-center cursor-pointer font-bold leading-none"
                  title="Xem tất cả"
                >
                  ×
                </button>
              </span>
            )}
          </div>

          {/* Bên phải: Toggle ND chi tiết & Toggle Lịch */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Toggle Show/Hide Educational Contents */}
            <button
              type="button"
              onClick={() => setShowContents((prev) => !prev)}
              className={cn(
                'h-7 px-2.5 text-xs font-medium border rounded-none transition-colors cursor-pointer flex items-center gap-1 whitespace-nowrap select-none',
                showContents
                  ? 'bg-muted border-border text-foreground font-medium'
                  : 'bg-card border-border text-muted-foreground hover:text-foreground',
              )}
              title={showContents ? 'Thu gọn nội dung giáo dục' : 'Hiện nội dung giáo dục'}
            >
              <span>{showContents ? 'Ẩn ND chi tiết' : 'Hiện ND chi tiết'}</span>
            </button>

            {/* Toggle Show/Hide Calendar Sidebar */}
            <button
              type="button"
              onClick={() => setShowCalendar((prev) => !prev)}
              className={cn(
                'h-7 px-2.5 text-xs font-medium border rounded-none transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap select-none',
                showCalendar
                  ? 'bg-muted border-border text-foreground font-medium'
                  : 'bg-card border-border text-muted-foreground hover:text-foreground',
              )}
              title={showCalendar ? 'Thu gọn cột lịch' : 'Hiện cột lịch năm học'}
            >
              <HugeiconsIcon icon={Calendar03Icon} size={13} />
              <span>{showCalendar ? 'Ẩn lịch' : 'Hiện lịch'}</span>
            </button>
          </div>
        </div>

        {/* Goal Cards List */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-2">
          {/* Thông báo đang lọc */}
          {(searchQuery || onlySelected || selectedDomainFilter !== 'ALL') && (
            <div className="flex items-center justify-between text-xs text-muted-foreground pb-0.5 px-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span>
                  Đang lọc <strong className="text-foreground">{filteredGoals.length}</strong> mục tiêu:
                </span>
                {selectedDomainFilter !== 'ALL' && (
                  <span className="text-primary font-medium font-mono">[{DOMAIN_SHORT_LABELS[selectedDomainFilter]}]</span>
                )}
                {onlySelected && (
                  <span className="text-primary font-medium font-mono">[Đã chọn]</span>
                )}
                {searchQuery && (
                  <span>từ khóa &quot;{searchQuery}&quot;</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedDomainFilter('ALL');
                  setOnlySelected(false);
                  setSearchQuery('');
                }}
                className="text-primary hover:underline cursor-pointer text-xs"
              >
                Xóa bộ lọc
              </button>
            </div>
          )}

          {/* Cards Grid */}
          <div className={cn(
            'grid gap-2',
            !showCalendar ? 'grid-cols-1 xl:grid-cols-2' : 'grid-cols-1',
          )}>
            {filteredGoals.map((goal) => {
              const status = getGoalContentStatus(goal);
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
                    'p-3 border transition-colors select-none text-left rounded-none',
                    isBgh ? 'cursor-default' : 'cursor-pointer',
                    status.isSelected
                      ? 'border-border bg-muted/25'
                      : 'border-border/70 bg-card hover:border-border hover:bg-muted/15',
                  )}
                >
                  <div className="flex items-start gap-2.5">
                    {/* Master Checkbox to select/deselect entire goal */}
                    <input
                      type="checkbox"
                      checked={status.isFullySelected}
                      ref={(el) => {
                        if (el) el.indeterminate = status.isPartiallySelected;
                      }}
                      disabled={isBgh}
                      onChange={() => !isBgh && handleToggleGoalAllocation(goal.id)}
                      onClick={(e) => e.stopPropagation()}
                      className={cn(
                        "size-4 rounded-none accent-primary mt-0.5 shrink-0",
                        isBgh ? "cursor-default opacity-80" : "cursor-pointer",
                      )}
                      title={
                        status.isFullySelected
                          ? 'Bỏ chọn toàn bộ NDGD của mục tiêu này'
                          : status.isPartiallySelected
                          ? 'Đang chọn một số NDGD. Bấm để bỏ chọn hết.'
                          : 'Chọn tất cả NDGD của mục tiêu này'
                      }
                    />

                    <div className="flex-1 min-w-0 space-y-1">
                      {/* Top row: Code + Domain + Other themes warning + Status text */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono font-bold text-xs text-foreground">
                            {goal.code}
                          </span>
                          {selectedDomainFilter === 'ALL' && (
                            <span className="text-xs text-muted-foreground font-normal">
                              · {DOMAIN_SHORT_LABELS[goal.domain] || goal.domain}
                            </span>
                          )}
                          {otherThemes.length > 0 && (
                            <span className="text-[11px] text-muted-foreground italic font-normal">
                              (Đã có ở CĐ {otherThemes.map((t) => t.code).join(', ')})
                            </span>
                          )}
                        </div>

                        {/* Status text: Gọn nhẹ, không dùng màu sắc lòe loẹt */}
                        {status.isFullySelected && (
                          <span className="text-[11px] text-muted-foreground font-mono shrink-0">
                            ✓ Đã chọn {status.totalCount > 1 ? `đủ ${status.totalCount}/${status.totalCount} ND` : 'cả MT'}
                          </span>
                        )}
                        {status.isPartiallySelected && (
                          <span className="text-[11px] text-muted-foreground font-mono shrink-0">
                            ◐ Chọn lẻ {status.selectedCount}/{status.totalCount} ND
                          </span>
                        )}
                      </div>

                      {/* Goal Title */}
                      <p
                        className={cn(
                          'text-[13px] leading-relaxed',
                          status.isSelected ? 'text-foreground font-medium' : 'text-foreground/90 font-normal',
                        )}
                      >
                        {cleanDisplayGoalTitle(goal)}
                      </p>

                      {/* Danh sách nội dung giáo dục chi tiết để tick chọn lẻ */}
                      {showContents && goal.contents && goal.contents.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-border/50 space-y-1.5" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium">
                            <span>Nội dung giáo dục ({status.selectedCount}/{status.totalCount}):</span>
                            {goal.contents.length > 1 && (
                              <span className="text-[10px] text-muted-foreground/75 italic">Tick chọn lẻ cho chủ đề này</span>
                            )}
                          </div>
                          <div className="space-y-1">
                            {goal.contents.map((cnt) => {
                              const cId = String(cnt.id || cnt.content_id);
                              const cNum = cnt.content_id ? String(cnt.content_id) : null;
                              const cPub = (cnt.public_id || cnt.publicId) ? String(cnt.public_id || cnt.publicId) : null;
                              const isCntSelected =
                                currentThemeContentSet.has(cId) ||
                                (cNum && currentThemeContentSet.has(cNum)) ||
                                (cPub && currentThemeContentSet.has(cPub));
                              return (
                                <label
                                  key={cId}
                                  onClick={(e) => e.stopPropagation()}
                                  className={cn(
                                    'flex items-start gap-2.5 p-1.5 border rounded-none text-xs select-none transition-colors cursor-pointer',
                                    isCntSelected
                                      ? 'bg-muted/40 border-border text-foreground font-medium'
                                      : 'bg-card border-border/50 text-muted-foreground hover:bg-muted/20 hover:text-foreground',
                                    isBgh && 'cursor-default',
                                  )}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isCntSelected}
                                    disabled={isBgh}
                                    onChange={() => !isBgh && handleToggleContentAllocation(goal.id, cId)}
                                    className="size-3.5 rounded-none accent-primary mt-0.5 shrink-0 cursor-pointer"
                                  />
                                  <span className="flex-1 leading-snug">{cnt.title}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {!showContents && goal.contents && goal.contents.length > 0 && (
                        <div className="pt-0.5 text-[11px] text-muted-foreground">
                          · {goal.contents.length} nội dung giáo dục
                          {status.selectedCount > 0 && (
                            <span className="ml-1 text-foreground font-medium">
                              (Đã chọn {status.selectedCount}/{status.totalCount})
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredGoals.length === 0 && (
            <div className="h-48 flex flex-col items-center justify-center text-center p-6 space-y-1.5 text-muted-foreground bg-card border border-dashed border-border rounded-none">
              <p className="text-sm font-semibold text-foreground">
                Không tìm thấy mục tiêu nào phù hợp
              </p>
              <p className="text-xs">
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
                  className="mt-1 text-xs text-primary hover:underline cursor-pointer font-medium"
                >
                  Xem tất cả {allGoals.length} mục tiêu
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          COLUMN 3: LỊCH 2 THÁNG LIÊN TIẾP & CÁC CHỦ ĐỀ NHÁNH ĐẶT NGAY DƯỚI LỊCH
         ========================================================================= */}
      {showCalendar && (
      <div className="w-[320px] lg:w-[330px] shrink-0 border-l border-border bg-card flex flex-col h-full select-none">
        <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5">
          {/* Month Header Toolbar */}
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

            <span className="text-xs font-bold text-foreground tracking-tight tabular-nums select-none">
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

          {/* 2 Tháng Lịch Liên Tiếp */}
          <div className="space-y-4 pt-0.5">
            {[
              { key: 'm1', year: calendarYear, month: calendarMonth, days: calendarDaysM1, isFirst: true },
              { key: 'm2', year: month2Year, month: month2, days: calendarDaysM2, isFirst: false },
            ].map((mObj) => (
              <div key={mObj.key} className={cn('flex flex-col gap-1.5', !mObj.isFirst && 'pt-3.5 border-t border-border/70')}>
                <div className="flex items-center justify-between px-0.5">
                  <span className="text-xs font-bold text-foreground tracking-tight">
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
                <div className="grid grid-cols-7 gap-y-1 text-center text-xs">
                  {mObj.days.map((d, i) => {
                    if (!d.isCurrentMonth) {
                      return (
                        <div
                          key={i}
                          className="h-8 flex items-center justify-center select-none opacity-20 pointer-events-none text-muted-foreground/30 text-xs font-light rounded-none"
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
                          'h-8 flex items-center justify-center relative select-none transition-all rounded-none',
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
                          <div className="absolute inset-0.5 border border-dashed border-border/80 bg-muted/15 pointer-events-none rounded-none" />
                        )}

                        {/* Ngày trong chủ đề ĐÃ CÓ NHÁNH */}
                        {isAssignedSubTheme && (
                          <div
                            className={cn(
                              'absolute inset-y-0.5 bg-primary rounded-none',
                              prevInAssigned ? 'left-0' : 'left-0.5',
                              nextInAssigned ? 'right-0' : 'right-0.5',
                            )}
                          />
                        )}

                        {/* Ngày trong chủ đề CHƯA XẾP NHÁNH (Dải sọc chéo mờ) */}
                        {isUnassignedInTheme && (
                          <div
                            className={cn(
                              'absolute inset-y-0.5 border-y border-primary/35 z-10 pointer-events-none rounded-none',
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
                              'absolute inset-y-0.5 bg-slate-200 dark:bg-slate-800 transition-colors rounded-none',
                              prevSameOtherTheme ? 'left-0' : 'left-0.5',
                              nextSameOtherTheme ? 'right-0' : 'right-0.5',
                            )}
                          />
                        )}

                        {/* Badge mốc bắt đầu của chủ đề nhánh (N1, N2, ...) */}
                        {isSubThemeStart && matchedSubIdx !== -1 && (
                          <span
                            className="absolute top-0.5 left-0.5 z-20 text-[8px] font-mono font-bold leading-none px-1 py-0.2 shadow-xs bg-slate-900 text-white rounded-none"
                            title={`Bắt đầu Nhánh ${matchedSubIdx + 1}: ${matchedSubTheme.name}`}
                          >
                            N{matchedSubIdx + 1}
                          </span>
                        )}

                        {/* Số ngày */}
                        <span
                          className={cn(
                            'relative z-20 w-full h-full flex items-center justify-center text-xs transition-colors rounded-none',
                            isAssignedSubTheme && 'text-primary-foreground font-semibold',
                            isUnassignedInTheme && 'text-primary font-bold',
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

          {/* =========================================================================
              CÁC CHỦ ĐỀ NHÁNH: Trình bày tối giản, thanh lịch, ít màu sắc
             ========================================================================= */}
          {currentTheme?.subThemes && currentTheme.subThemes.length > 0 && (
            <div className="pt-3 border-t border-border space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                <span>Chủ đề nhánh</span>
                <span className="text-[11px] text-muted-foreground font-mono">
                  {currentTheme.subThemes.length} nhánh
                </span>
              </div>
              <div className="divide-y divide-border/50 text-xs">
                {currentTheme.subThemes.map((st, idx) => (
                  <div key={st.id || idx} className="py-2 space-y-0.5">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="font-mono font-medium text-foreground/80">
                        Nhánh {idx + 1}
                      </span>
                      <span className="font-mono tabular-nums">
                        {formatDateRangeDdMm(st.startDate, st.endDate)}
                      </span>
                    </div>
                    <p className="text-xs text-foreground font-medium leading-snug">
                      {st.name}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Thanh chú thích tinh gọn */}
          <div className="pt-2.5 border-t border-border flex items-center justify-between text-xs text-muted-foreground select-none">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-1.5" title="Chủ đề đang xem">
                <span className="size-2.5 bg-primary shrink-0 rounded-none" />
                <span className="font-medium text-foreground/85 text-[11px]">Chủ đề này</span>
              </div>
              <div className="flex items-center gap-1.5" title="Chưa xếp nhánh">
                <span
                  className="size-2.5 border border-primary/40 shrink-0 rounded-none"
                  style={{
                    background:
                      'repeating-linear-gradient(45deg, rgba(20, 71, 230, 0.2), rgba(20, 71, 230, 0.2) 2px, rgba(20, 71, 230, 0.4) 2px, rgba(20, 71, 230, 0.4) 4px)',
                  }}
                />
                <span className="text-[11px]">Chưa xếp nhánh</span>
              </div>
            </div>

            {/* Popover Hướng dẫn quy ước */}
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0 whitespace-nowrap rounded-none"
                  title="Xem quy ước hiển thị lịch"
                >
                  <HugeiconsIcon icon={InformationCircleIcon} size={13} className="shrink-0" />
                  <span>Quy ước</span>
                </button>
              </PopoverTrigger>
              <PopoverContent
                side="bottom"
                avoidCollisions={false}
                align="end"
                sideOffset={6}
                className="w-72 p-3 bg-card border border-border shadow-md rounded-none text-xs space-y-2.5 z-50"
              >
                <div className="flex items-center justify-between pb-1 border-b border-border/60">
                  <span className="font-semibold text-foreground text-xs">
                    Quy ước hiển thị lịch
                  </span>
                </div>

                <div className="space-y-1.5 text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className="size-3 bg-primary shrink-0 rounded-none" />
                    <span className="text-foreground">Chủ đề đang chọn</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="size-3 border border-primary/40 shrink-0 rounded-none"
                      style={{
                        background:
                          'repeating-linear-gradient(45deg, rgba(20, 71, 230, 0.2), rgba(20, 71, 230, 0.2) 2px, rgba(20, 71, 230, 0.4) 2px, rgba(20, 71, 230, 0.4) 4px)',
                      }}
                    />
                    <span className="text-foreground">Chưa xếp nhánh</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="size-3 bg-slate-200 dark:bg-slate-700 shrink-0 rounded-none" />
                    <span className="text-muted-foreground">Chủ đề khác</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="size-3 border border-dashed border-border/80 bg-muted/20 shrink-0 rounded-none" />
                    <span className="text-muted-foreground">Chưa có chủ đề</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="size-3 opacity-25 bg-muted/40 shrink-0 rounded-none" />
                    <span className="text-muted-foreground/70">Ngoài năm học</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold px-1 py-0.2 bg-slate-900 text-white shrink-0 rounded-none">
                      N1
                    </span>
                    <span className="text-foreground">Mốc bắt đầu chủ đề nhánh</span>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}

export default TargetAllocationTab;
