import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  SidebarRightIcon,
  Clock01Icon,
  AlertCircleIcon,
  Menu01Icon,
  FileSpreadsheetIcon,
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
import { downloadBlob } from '@/shared/utils/download';
import { PlanningTabLoading } from './PlanningTabLoading';
import { ExcelActionsDropdown } from '@/components/ExcelActionsDropdown';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
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

export const formatGoalCode = (code) => {
  if (!code) return '';
  const raw = String(code).trim().toUpperCase();
  const digitsMatch = raw.match(/\d+/);
  if (digitsMatch) {
    const num = parseInt(digitsMatch[0], 10);
    if (!isNaN(num)) {
      return `MT ${num < 10 ? '0' + num : num}`;
    }
  }
  return raw;
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

export function TargetAllocationTab({
  classId = '1',
  isReadOnly = false,
  selectedThemeId = null,
  onThemeChange = null,
  planStatus = null,
}) {
  const { t } = useTranslation();
  const [allocationData, setAllocationData] = useState(null);
  const [themes, setThemes] = useState([]);
  const [selectedThemeCode, setSelectedThemeCode] = useState(() => {
    const urlThemeId = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('themeId') : null;
    const effectiveThemeId = selectedThemeId || urlThemeId;
    if (effectiveThemeId) {
      const clean = String(effectiveThemeId).trim();
      if (/^\d{1,2}$/.test(clean)) {
        return clean.padStart(2, '0');
      }
    }
    return '';
  });
  const [allGoals, setAllGoals] = useState([]);
  const [selectedDomainFilters, setSelectedDomainFilters] = useState([]); // Array các key lĩnh vực được chọn cùng lúc
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('CODE_ASC'); // 'CODE_ASC' (Theo số thứ tự MT) | 'NEWEST' (Mục tiêu mới nhất)
  const [showContents, setShowContents] = useState(true);
  const [onlySelected, setOnlySelected] = useState(false);
  const [showCalendar, setShowCalendar] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1280;
    }
    return true;
  });
  const [showMobileThemes, setShowMobileThemes] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState(null);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const saveTimeoutRef = useRef(null);
  const pendingSaveRef = useRef(null);
  const prevPropThemeIdRef = useRef(selectedThemeId);

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
          const urlThemeId = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('themeId') : null;
          const targetThemeId = selectedThemeId || urlThemeId;

          let targetTheme = null;
          if (targetThemeId) {
            targetTheme = fetchedThemes.find(
              (th) =>
                th.id === targetThemeId ||
                th.publicId === targetThemeId ||
                String(th.themeId) === String(targetThemeId) ||
                th.code === targetThemeId ||
                String(th.code).padStart(2, '0') === String(targetThemeId).padStart(2, '0')
            );
          }
          if (!targetTheme && selectedThemeCode) {
            targetTheme = fetchedThemes.find((th) => th.code === selectedThemeCode);
          }
          if (!targetTheme) {
            targetTheme = fetchedThemes[0];
          }

          setSelectedThemeCode(targetTheme.code);
          if (onThemeChange && !urlThemeId && (targetTheme.code || targetTheme.id || targetTheme.publicId)) {
            onThemeChange(targetTheme.code || targetTheme.id || targetTheme.publicId);
          }
          if (targetTheme.startDate) {
            const parts = targetTheme.startDate.split('-').map(Number);
            if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1])) {
              setCalendarYear(parts[0]);
              setCalendarMonth(parts[1] - 1);
            }
          }
        }
        const rawGoals = data.bankGoals || [];
        const enrichedGoals = rawGoals.map((g) => {
          const formattedCode = formatGoalCode(g.code || g.goalCode);
          const baseGoal = {
            ...g,
            code: formattedCode,
            goalCode: formattedCode,
          };
          // Luôn giữ nguyên nội dung giáo dục thực tế từ Ngân hàng mục tiêu do BGH thiết lập
          if (Array.isArray(g.contents) && g.contents.length > 0) {
            return baseGoal;
          }
          return {
            ...baseGoal,
            contents: [
              {
                id: g.id || g.goalId,
                title: baseGoal.title,
                activitiesCount: 0,
              },
            ],
          };
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
    if (!themes || themes.length === 0) return null;
    const urlThemeId = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('themeId') : null;
    const targetThemeId = selectedThemeId || urlThemeId;

    if (selectedThemeCode) {
      const matchByCode = themes.find((th) => th.code === selectedThemeCode);
      if (matchByCode) return matchByCode;
    }
    if (targetThemeId) {
      const matchById = themes.find(
        (th) =>
          th.id === targetThemeId ||
          th.publicId === targetThemeId ||
          String(th.themeId) === String(targetThemeId) ||
          th.code === targetThemeId ||
          String(th.code).padStart(2, '0') === String(targetThemeId).padStart(2, '0')
      );
      if (matchById) return matchById;
    }
    return themes[0] || null;
  }, [themes, selectedThemeCode, selectedThemeId]);

  const currentUser = useAuthStore((state) => state.user);
  const isPrincipal = Boolean(
    currentUser?.role === 'PRINCIPAL_BGH' ||
    currentUser?.role === 'PRINCIPAL' ||
    currentUser?.role === 'VICE_PRINCIPAL' ||
    currentUser?.role?.toLowerCase()?.includes('principal') ||
    currentUser?.role?.toLowerCase()?.includes('bgh')
  );

  // Trạng thái của chủ đề hiện tại
  const currentPlanStatus = currentTheme?.planStatus || (selectedThemeId === planStatus?.themeId ? planStatus?.status : null);
  const isApproved = currentPlanStatus === 'USED';
  const isPendingApproval = currentPlanStatus === 'PENDING_APPROVAL' || currentPlanStatus === 'SUBMITTED' || (Boolean(planStatus?.status === 'PENDING_APPROVAL' || planStatus?.status === 'SUBMITTED') && (!selectedThemeId || selectedThemeId === planStatus?.themeId));
  const isRejected = Boolean(
    currentPlanStatus === 'REJECTED' ||
    (planStatus?.status === 'REJECTED' && (!selectedThemeId || selectedThemeId === planStatus?.themeId))
  );
  const rejectionReason = currentTheme?.rejectionReason || planStatus?.rejectionReason || '';

  // Chỉ khóa nếu chủ đề hiện tại đang chọn ở trạng thái ĐÃ DUYỆT hoặc CHỜ DUYỆT
  const isCurrentThemeReadOnly = Boolean(
    currentTheme?.isReadOnly ||
    isApproved ||
    isPendingApproval
  );
  const effectiveReadOnly = isPrincipal || isCurrentThemeReadOnly;

  // Kiểm tra quyền và trạng thái công bố bộ chủ đề/mục tiêu của BGH
  const isCurriculumPublished = useMemo(() => {
    if (isPrincipal) return true;
    if (allocationData?.isCurriculumPublished === false) return false;
    if (!themes || themes.length === 0) return false;
    return themes.some((t) => t.status === 'PUBLISHED');
  }, [isPrincipal, allocationData, themes]);

  // Thông tin khối lớp và niên khóa phục vụ thông báo chuyên nghiệp
  const classGradeText = useMemo(() => {
    const rawAge = allocationData?.classInfo?.ageGroup;
    const AGE_MAP = {
      NHA_TRE: 'Khối Nhà trẻ',
      MAM: 'Khối Mầm',
      CHOI: 'Khối Chồi',
      LA: 'Khối Lá',
      nhatre: 'Khối Nhà trẻ',
      mam: 'Khối Mầm',
      choi: 'Khối Chồi',
      la: 'Khối Lá',
    };
    return (
      allocationData?.classInfo?.ageGroupLabel ||
      AGE_MAP[rawAge] ||
      (allocationData?.classInfo?.name ? `lớp ${allocationData.classInfo.name}` : 'khối lớp này')
    );
  }, [allocationData?.classInfo]);

  const classYearText = useMemo(() => {
    return allocationData?.classInfo?.yearName || '';
  }, [allocationData?.classInfo]);

  // Sync selected theme code if selectedThemeId prop changes from outside
  useEffect(() => {
    if (selectedThemeId && selectedThemeId !== prevPropThemeIdRef.current && themes.length > 0) {
      prevPropThemeIdRef.current = selectedThemeId;
      const match = themes.find(
        (th) =>
          th.id === selectedThemeId ||
          th.publicId === selectedThemeId ||
          String(th.themeId) === String(selectedThemeId) ||
          th.code === selectedThemeId ||
          String(th.code).padStart(2, '0') === String(selectedThemeId).padStart(2, '0')
      );
      if (match && match.code && match.code !== selectedThemeCode) {
        setSelectedThemeCode(match.code);
      }
    }
  }, [selectedThemeId, themes]);

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
      if (Array.isArray(g.selectedContentIds)) {
        g.selectedContentIds.forEach((cId) => set.add(String(cId)));
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

  // Count of allocated educational contents (NDGD) and total NDGD across allGoals
  const { actualSelectedContentCount, totalContentsCount } = useMemo(() => {
    let selected = 0;
    let total = 0;
    allGoals.forEach((g) => {
      const status = getGoalContentStatus(g);
      selected += status.selectedCount;
      total += status.totalCount;
    });
    return { actualSelectedContentCount: selected, totalContentsCount: total };
  }, [allGoals, getGoalContentStatus]);

  // Toggle chọn nhiều lĩnh vực cùng lúc (Multi-select)
  const handleToggleDomainFilter = useCallback((domainKey) => {
    if (domainKey === 'ALL') {
      setSelectedDomainFilters([]);
      return;
    }

    setSelectedDomainFilters((prev) => {
      if (prev.includes(domainKey)) {
        return prev.filter((k) => k !== domainKey);
      } else {
        return [...prev, domainKey];
      }
    });
  }, []);

  // Lưu ngay lập tức các thay đổi đang chờ lưu (khi chuyển chủ đề hoặc rời trang)
  const flushPendingSave = useCallback(async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    if (pendingSaveRef.current) {
      const payload = pendingSaveRef.current;
      pendingSaveRef.current = null;
      setIsSaving(true);
      try {
        await planningApi.saveTargetAllocation(classId, payload);
        setLastSavedTime(new Date());
        setHasChanges(false);
      } catch (err) {
        console.warn('Flush autosave warning:', err);
      } finally {
        setIsSaving(false);
      }
    }
  }, [classId]);

  // Xếp hàng lưu tự động (Debounced autosave 1000ms chuẩn UX - hiện "Chưa lưu" rồi "Đang lưu...")
  const queueAutosave = useCallback(
    (theme, contentIds, goals) => {
      setHasChanges(true);
      pendingSaveRef.current = {
        themeId: theme.id,
        themeCode: theme.code,
        contentIds: Array.from(contentIds),
        goalIds: goals.map((g) => g.id),
      };

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(async () => {
        if (!pendingSaveRef.current) return;
        const payload = pendingSaveRef.current;
        pendingSaveRef.current = null;
        setIsSaving(true);
        try {
          await planningApi.saveTargetAllocation(classId, payload);
          setLastSavedTime(new Date());
          setHasChanges(false);
        } catch (err) {
          console.warn('Autosave warning:', err);
        } finally {
          setIsSaving(false);
        }
      }, 350);
    },
    [classId]
  );

  // Dọn dẹp timer và lưu nốt nếu rời trang hoặc tải lại (F5)
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (pendingSaveRef.current) {
        planningApi.saveTargetAllocation(classId, pendingSaveRef.current).catch(() => { });
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (pendingSaveRef.current) {
        planningApi.saveTargetAllocation(classId, pendingSaveRef.current).catch(() => { });
      }
    };
  }, [classId]);

  // Select a theme from Column 1
  const handleSelectTheme = (th) => {
    if (th.code !== selectedThemeCode) {
      flushPendingSave();
      prevPropThemeIdRef.current = th.code;
      setSelectedThemeCode(th.code);
      if (onThemeChange) {
        onThemeChange(th.code || th.id || th.publicId);
      }
    }
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
          flushPendingSave();
          const target = themes[curIdx - 1];
          prevPropThemeIdRef.current = target.code;
          setSelectedThemeCode(target.code);
          if (onThemeChange && (target.code || target.id || target.publicId)) {
            onThemeChange(target.code || target.id || target.publicId);
          }
        }
      } else if (e.key === 'ArrowRight') {
        const curIdx = themes.findIndex((th) => th.code === selectedThemeCode);
        if (curIdx >= 0 && curIdx < themes.length - 1) {
          e.preventDefault();
          flushPendingSave();
          const target = themes[curIdx + 1];
          prevPropThemeIdRef.current = target.code;
          setSelectedThemeCode(target.code);
          if (onThemeChange && (target.code || target.id || target.publicId)) {
            onThemeChange(target.code || target.id || target.publicId);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedThemeCode, themes, flushPendingSave]);

  // Toggle selection of a single NDGD (EducationalContent)
  const handleToggleContentAllocation = async (goalId, contentId) => {
    if (effectiveReadOnly) {
      toast.warning(`Chủ đề "${currentTheme?.name}" đang ở chế độ Chỉ đọc. Bạn có thể chọn các chủ đề ở trạng thái "Bản nháp" để phân bổ!`);
      return;
    }
    if (!currentTheme) return;
    const sCId = String(contentId);
    const targetGoal = allGoals.find((g) => g.id === goalId || String(g.id) === String(goalId));
    const targetContent = (targetGoal?.contents || []).find(
      (c) =>
        String(c.id || c.content_id) === sCId ||
        (c.content_id && String(c.content_id) === sCId) ||
        (c.public_id && String(c.public_id) === sCId) ||
        (c.publicId && String(c.publicId) === sCId)
    );

    // Thu thập tất cả các biến thể ID có thể có của NDGD này (UUID public_id, numeric content_id,...)
    const allMatchingIds = new Set([sCId]);
    if (targetContent) {
      if (targetContent.id) allMatchingIds.add(String(targetContent.id));
      if (targetContent.content_id) allMatchingIds.add(String(targetContent.content_id));
      if (targetContent.contentId) allMatchingIds.add(String(targetContent.contentId));
      if (targetContent.public_id) allMatchingIds.add(String(targetContent.public_id));
      if (targetContent.publicId) allMatchingIds.add(String(targetContent.publicId));
    }
    (currentTheme?.allocatedGoals || []).forEach((ag) => {
      (ag.contents || []).forEach((ac) => {
        if (
          String(ac.id) === sCId ||
          String(ac.contentId) === sCId ||
          String(ac.publicId) === sCId ||
          (targetContent?.title && ac.title === targetContent.title)
        ) {
          if (ac.id) allMatchingIds.add(String(ac.id));
          if (ac.contentId) allMatchingIds.add(String(ac.contentId));
          if (ac.content_id) allMatchingIds.add(String(ac.content_id));
          if (ac.publicId) allMatchingIds.add(String(ac.publicId));
          if (ac.public_id) allMatchingIds.add(String(ac.public_id));
        }
      });
    });

    const isCurrentlySelected = Array.from(allMatchingIds).some((id) => currentThemeContentSet.has(id));

    const newAllocatedContentIds = new Set(currentThemeContentSet);
    if (isCurrentlySelected) {
      allMatchingIds.forEach((id) => newAllocatedContentIds.delete(id));
    } else {
      allMatchingIds.forEach((id) => newAllocatedContentIds.add(id));
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

    // Kích hoạt debounce lưu tự động (hiện "Chưa lưu" rồi tự động lưu)
    queueAutosave(currentTheme, newAllocatedContentIds, newAllocatedGoals);
  };

  // Toggle selection of all contents of a goal (Master checkbox)
  const handleToggleGoalAllocation = async (goalId) => {
    if (effectiveReadOnly) {
      toast.warning(`Chủ đề "${currentTheme?.name}" đang ở chế độ Chỉ đọc. Bạn có thể chọn các chủ đề ở trạng thái "Bản nháp" để phân bổ!`);
      return;
    }
    if (!currentTheme) return;
    const targetGoal = allGoals.find((g) => g.id === goalId || String(g.id) === String(goalId));
    if (!targetGoal) return;

    const status = getGoalContentStatus(targetGoal);
    const contents = targetGoal.contents || [];
    const newAllocatedContentIds = new Set(currentThemeContentSet);

    if (status.isSelected || status.isFullySelected || status.isPartiallySelected) {
      // Deselect ALL contents of this goal
      contents.forEach((c) => {
        const cIds = new Set([String(c.id)]);
        if (c.content_id) cIds.add(String(c.content_id));
        if (c.contentId) cIds.add(String(c.contentId));
        if (c.public_id) cIds.add(String(c.public_id));
        if (c.publicId) cIds.add(String(c.publicId));

        (currentTheme?.allocatedGoals || []).forEach((ag) => {
          (ag.contents || []).forEach((ac) => {
            if (String(ac.id) === String(c.id) || (c.title && ac.title === c.title)) {
              if (ac.id) cIds.add(String(ac.id));
              if (ac.contentId) cIds.add(String(ac.contentId));
              if (ac.content_id) cIds.add(String(ac.content_id));
              if (ac.publicId) cIds.add(String(ac.publicId));
              if (ac.public_id) cIds.add(String(ac.public_id));
            }
          });
        });

        cIds.forEach((id) => newAllocatedContentIds.delete(id));
      });
    } else {
      // Select ALL contents of this goal
      contents.forEach((c) => {
        const cid = String(c.id || c.content_id);
        newAllocatedContentIds.add(cid);
        if (c.id) newAllocatedContentIds.add(String(c.id));
        if (c.content_id) newAllocatedContentIds.add(String(c.content_id));
        if (c.contentId) newAllocatedContentIds.add(String(c.contentId));
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

    // Kích hoạt debounce lưu tự động (hiện "Chưa lưu" rồi tự động lưu)
    queueAutosave(currentTheme, newAllocatedContentIds, newAllocatedGoals);
  };

  // Helper: Lưu phân bổ mục tiêu & NDGD cho chủ đề hiện tại
  const handleSaveAllocation = async () => {
    if (effectiveReadOnly) {
      toast.warning(`Chủ đề "${currentTheme?.name}" đang ở chế độ Chỉ đọc. Bạn có thể chọn các chủ đề ở trạng thái "Bản nháp" để phân bổ!`);
      return;
    }
    if (!currentTheme) return;
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    pendingSaveRef.current = null;
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
      setHasChanges(false);
      toast.success(`Đã lưu ${allocatedContentIds.length} NDGD (${allocatedGoalIds.length} mục tiêu) cho Chủ đề "${currentTheme.name}" thành công!`);
    } catch (err) {
      console.error('Save target allocation error:', err);
      toast.error('Có lỗi xảy ra khi lưu phân bổ');
    } finally {
      setIsSaving(false);
    }
  };

  // Xuất kế hoạch phân bổ mục tiêu và hoạt động giáo dục ra file Excel (.xlsx)
  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      const targetThemeId = currentTheme?.id || currentTheme?.publicId || currentTheme?.themeId;
      const blob = await planningApi.exportThemeTeachingPlanExcel(classId, targetThemeId);
      const cleanTheme = (currentTheme?.name || 'Ke_hoach_giao_duc').replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1EA0-\u1EF9]/g, '_');
      const filename = `Ke_hoach_giao_duc_${cleanTheme}.xlsx`;
      downloadBlob(blob, filename);
      toast.success('Đã xuất kế hoạch giáo dục theo chủ đề & hoạt động ra file Excel.');
    } catch (err) {
      console.error('Export Excel error:', err);
      toast.error('Không thể xuất file Excel. Vui lòng thử lại sau.');
    } finally {
      setIsExporting(false);
    }
  };

  // Thời gian cập nhật định dạng HH:mm:ss chuẩn UX đồng bộ hệ thống
  const updatedAt = useMemo(() => {
    const d = lastSavedTime || new Date();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }, [lastSavedTime]);

  // Filtered and sorted goals for the unified list in Column 2 (theo lĩnh vực, tìm kiếm & sắp xếp)
  const filteredGoals = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = allGoals.filter((g) => {
      // 1. Lọc theo trạng thái đã chọn (nếu bật onlySelected)
      if (onlySelected && !checkIsGoalSelected(g)) return false;

      // 2. Lọc theo nhiều lĩnh vực cùng lúc (nếu rỗng = xem tất cả)
      const matchDomain =
        selectedDomainFilters.length === 0 || selectedDomainFilters.includes(g.domain);
      if (!matchDomain) return false;

      // 3. Lọc theo từ khóa tìm kiếm
      if (!q) return true;
      const matchGoal =
        g.code?.toLowerCase().includes(q) ||
        g.title?.toLowerCase().includes(q) ||
        (g.contents && g.contents.some((c) => c.title?.toLowerCase().includes(q)));
      return matchGoal;
    });

    // 4. Sắp xếp mục tiêu
    return [...list].sort((a, b) => {
      if (sortBy === 'NEWEST') {
        const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
        const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
        if (timeB !== timeA) return timeB - timeA;
      }
      // Mặc định hoặc 'CODE_ASC': Sắp xếp theo số thứ tự mục tiêu (MT 01 → MT 02 → MT 03 → ...)
      const numA = parseInt(String(a.code || a.goalCode || '').match(/\d+/)?.[0] || '0', 10);
      const numB = parseInt(String(b.code || b.goalCode || '').match(/\d+/)?.[0] || '0', 10);
      return numA - numB;
    });
  }, [allGoals, selectedDomainFilters, searchQuery, onlySelected, checkIsGoalSelected, sortBy]);

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
    return <PlanningTabLoading message="Đang tải dữ liệu phân bổ mục tiêu..." />;
  }

  // Giáo viên không được xem hoặc sử dụng dữ liệu chưa công bố (Thiết kế clean, icon trung tính không màu)
  if (!isCurriculumPublished) {
    return (
      <div className="w-full h-[calc(100vh-104px)] lg:h-[calc(100vh-120px)] flex flex-col items-center justify-center p-8 text-center bg-background select-none">
        <div className="max-w-md flex flex-col items-center space-y-2">
          <div className="size-12 rounded-full bg-muted/60 border border-border/80 flex items-center justify-center text-muted-foreground mb-2">
            <HugeiconsIcon icon={AlertCircleIcon} size={22} />
          </div>
          <h3 className="text-[16px] font-semibold text-foreground tracking-tight">
            Kế hoạch giáo dục chưa được công bố
          </h3>
          <p className="text-[13px] text-muted-foreground leading-relaxed">
            {allocationData?.message ||
              `Hiện tại Ban Giám Hiệu chưa ban hành bộ chủ đề và mục tiêu giáo dục áp dụng cho ${classGradeText}${classYearText ? ` (${classYearText})` : ''}. Giáo viên vui lòng liên hệ Ban Giám Hiệu để cập nhật kế hoạch chính thức.`}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="w-full h-[calc(100vh-104px)] lg:h-[calc(100vh-120px)] max-h-[calc(100vh-104px)] lg:max-h-[calc(100vh-120px)] min-h-0 flex overflow-hidden bg-background text-foreground select-none"
      data-name="Target Allocation Clean View"
    >
      {/* =========================================================================
          COLUMN 1: DANH SÁCH CHỦ ĐỀ (Đồng bộ chuẩn Bộ chủ đề)
         ========================================================================= */}
      <div className="hidden lg:flex w-[240px] xl:w-[260px] shrink-0 border-r border-border bg-card flex-col h-full min-h-0 overflow-hidden">
        {/* Header Column 1 */}
        <div className="p-4 border-b border-border/80 bg-card shrink-0">
          <h2 className="text-[17px] font-semibold text-foreground tracking-tight">
            Danh sách chủ đề
          </h2>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            Phân bổ mục tiêu theo năm học
          </p>
        </div>

        {/* Theme List */}
        <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-border/40 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {themes.length === 0 && (
            <div className="p-6 text-center text-[12.5px] text-muted-foreground italic select-none">
              Chưa có chủ đề nào
            </div>
          )}
          {themes.map((th) => {
            const isSelected = selectedThemeCode === th.code;

            return (
              <div
                key={th.code}
                onClick={() => handleSelectTheme(th)}
                className={cn(
                  'flex items-center gap-3 px-3.5 py-3 cursor-pointer transition-colors select-none text-left',
                  isSelected
                    ? 'bg-muted/70 font-semibold'
                    : 'hover:bg-muted/40 text-foreground',
                )}
              >
                {/* Topic Index square badge - Đồng bộ chuẩn xanh Sorak #1447e6 */}
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
                  <span
                    className={cn(
                      'text-[13.5px] truncate',
                      isSelected ? 'text-foreground font-semibold' : 'text-foreground/85 font-medium',
                    )}
                  >
                    {th.name}
                  </span>
                  <div className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground font-normal mt-0.5 min-w-0">
                    {th.planStatus === 'USED' && (
                      <span className="inline-flex items-center text-emerald-600 dark:text-emerald-400 shrink-0" title="Đã phê duyệt (Chỉ đọc)">
                        <HugeiconsIcon icon={CheckmarkCircle01Icon} size={12} />
                      </span>
                    )}
                    {(th.planStatus === 'SUBMITTED' || th.planStatus === 'PENDING_APPROVAL') && (
                      <span className="inline-flex items-center text-amber-600 dark:text-amber-400 shrink-0" title="Đang chờ duyệt (Chỉ đọc)">
                        <HugeiconsIcon icon={Clock01Icon} size={12} />
                      </span>
                    )}
                    {th.planStatus === 'REJECTED' && (
                      <span className="inline-flex items-center text-rose-600 dark:text-rose-400 shrink-0" title="Yêu cầu sửa">
                        <HugeiconsIcon icon={Cancel01Icon} size={12} />
                      </span>
                    )}
                    <span className="truncate">{formatDateRangeDdMm(th.startDate, th.endDate)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile/Tablet Topics Drawer */}
      {showMobileThemes && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setShowMobileThemes(false)}
          />
          <div className="relative w-[280px] max-w-[85vw] bg-card border-r border-border h-full flex flex-col shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            <div className="p-3.5 border-b border-border flex items-center justify-between bg-card shrink-0">
              <div>
                <h2 className="text-[15px] font-semibold text-foreground tracking-tight">
                  Danh sách chủ đề
                </h2>
                <p className="text-[11.5px] text-muted-foreground mt-0.5">
                  {themes.length} chủ đề trong năm học
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowMobileThemes(false)}
                className="size-7 flex items-center justify-center hover:bg-muted text-muted-foreground rounded-xs cursor-pointer"
                title="Đóng danh sách chủ đề"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={15} />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-border/40 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {themes.length === 0 ? (
                <div className="p-6 text-center text-[12.5px] text-muted-foreground italic select-none">
                  Chưa có chủ đề nào
                </div>
              ) : (
                themes.map((th) => {
                  const isSelected = selectedThemeCode === th.code;

                  return (
                    <div
                      key={th.code}
                      onClick={() => {
                        handleSelectTheme(th);
                        setShowMobileThemes(false);
                      }}
                      className={cn(
                        'flex items-center gap-3 px-3.5 py-3 cursor-pointer transition-colors select-none text-left',
                        isSelected
                          ? 'bg-muted/70 font-semibold'
                          : 'hover:bg-muted/40 text-foreground',
                      )}
                    >
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

                      <div className="flex flex-col min-w-0 flex-1 leading-tight">
                        <span
                          className={cn(
                            'text-[13.5px] truncate',
                            isSelected ? 'text-foreground font-semibold' : 'text-foreground/85 font-medium',
                          )}
                        >
                          {th.name}
                        </span>
                        <div className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground font-normal mt-0.5 min-w-0">
                          {th.planStatus === 'USED' && (
                            <span className="inline-flex items-center text-emerald-600 dark:text-emerald-400 shrink-0" title="Đã phê duyệt (Chỉ đọc)">
                              <HugeiconsIcon icon={CheckmarkCircle01Icon} size={12} />
                            </span>
                          )}
                          {(th.planStatus === 'SUBMITTED' || th.planStatus === 'PENDING_APPROVAL') && (
                            <span className="inline-flex items-center text-amber-600 dark:text-amber-400 shrink-0" title="Đang chờ duyệt (Chỉ đọc)">
                              <HugeiconsIcon icon={Clock01Icon} size={12} />
                            </span>
                          )}
                          {th.planStatus === 'REJECTED' && (
                            <span className="inline-flex items-center text-rose-600 dark:text-rose-400 shrink-0" title="Yêu cầu sửa">
                              <HugeiconsIcon icon={Cancel01Icon} size={12} />
                            </span>
                          )}
                          <span className="truncate">{formatDateRangeDdMm(th.startDate, th.endDate)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          COLUMN 2: MỤC TIÊU GIÁO DỤC (Thông thoáng, mở rộng theo chuẩn Bộ chủ đề)
         ========================================================================= */}
      <div className="flex-1 min-h-0 flex flex-col h-full overflow-hidden bg-background">
        {!currentTheme || themes.length === 0 ? (
          <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-8 text-center select-none">
            {themes.length > 0 && (
              <div className="lg:hidden mb-6">
                <button
                  type="button"
                  onClick={() => setShowMobileThemes(true)}
                  className="h-8 px-3 flex items-center gap-1.5 border border-border bg-background hover:bg-muted text-foreground text-[12px] font-medium rounded-none transition-colors shrink-0 cursor-pointer"
                  title="Xem danh sách chủ đề"
                >
                  <HugeiconsIcon icon={Menu01Icon} size={15} />
                  <span>Danh sách chủ đề ({themes.length})</span>
                </button>
              </div>
            )}
            <div className="size-16 rounded-full bg-muted/60 border border-border/80 flex items-center justify-center text-muted-foreground mb-4">
              <HugeiconsIcon icon={Calendar03Icon} size={30} />
            </div>
            <h3 className="text-[17px] font-semibold text-foreground tracking-tight">
              Chưa có chủ đề giáo dục nào
            </h3>
            <p className="text-[13px] text-muted-foreground mt-1.5 max-w-md leading-relaxed">
              Lớp học này chưa có chủ đề giáo dục nào được công bố. Vui lòng chờ Ban Giám Hiệu công bố kế hoạch chủ đề trước khi phân bổ mục tiêu.
            </p>
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col h-full overflow-hidden">
            {/* Header Chủ đề & Toolbar được PIN (Cố định ở đỉnh, nén dẹp theo Cách 2) */}
            <div className="px-3 sm:px-5 py-2 sm:py-2.5 border-b border-border/60 bg-card space-y-1.5 shrink-0 z-10 shadow-xs">
              {/* Header Row: Title with status badge & Top right action controls */}
              <div className="flex items-center justify-between gap-2 sm:gap-3">
                {/* Hàng trên: Tiêu đề chủ đề */}
                <div className="min-w-0 flex-1 flex items-center gap-2 overflow-hidden mr-2">
                  {/* Mobile Topics List Toggle Button */}
                  <button
                    type="button"
                    onClick={() => setShowMobileThemes(true)}
                    className="lg:hidden h-8 px-2.5 flex items-center gap-1.5 border border-border bg-background hover:bg-muted text-foreground text-[12px] font-medium rounded-none transition-colors shrink-0 cursor-pointer"
                    title="Xem danh sách chủ đề"
                  >
                    <HugeiconsIcon icon={Menu01Icon} size={15} />
                    <span className="hidden sm:inline">Chủ đề</span>
                    <span>({themes.length})</span>
                  </button>

                  <h1
                    className="text-[17px] sm:text-[19px] md:text-[20px] font-semibold text-foreground tracking-tight truncate"
                    title={currentTheme?.name || 'Phân bổ mục tiêu'}
                  >
                    {currentTheme?.name || 'Phân bổ mục tiêu'}
                  </h1>
                </div>

                {/* Top Right Controls: Tìm kiếm + Nút Toggle Lịch + Nút Xuất Excel */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Ô tìm kiếm mục tiêu */}
                  <div className="relative flex items-center">
                    <HugeiconsIcon
                      icon={Search01Icon}
                      size={14}
                      className="absolute left-2.5 text-muted-foreground pointer-events-none z-10"
                    />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Tìm kiếm mục tiêu..."
                      className="h-8 pl-8 pr-7 w-28 sm:w-36 md:w-44 text-[12px] bg-background border border-border rounded-none focus:outline-none focus:border-[#1447e6] transition-colors placeholder:text-muted-foreground/60"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2 text-muted-foreground hover:text-foreground cursor-pointer"
                        title="Xóa tìm kiếm"
                      >
                        <HugeiconsIcon icon={Cancel01Icon} size={11} />
                      </button>
                    )}
                  </div>

                  {/* Nút 1: Toggle Lịch (Icon only) */}
                  <button
                    type="button"
                    onClick={() => setShowCalendar((prev) => !prev)}
                    className={cn(
                      'size-8 flex items-center justify-center border border-border transition-colors cursor-pointer rounded-none',
                      showCalendar
                        ? 'bg-muted text-foreground'
                        : 'bg-background hover:bg-muted text-muted-foreground hover:text-foreground',
                    )}
                    title={showCalendar ? 'Thu gọn lịch' : 'Mở lịch'}
                  >
                    <HugeiconsIcon icon={SidebarRightIcon} size={18} />
                  </button>

                  {/* Nút 2: Thao tác Excel Kế hoạch phân bổ mục tiêu */}
                  <ExcelActionsDropdown
                    onExport={handleExportExcel}
                    isExporting={isExporting}
                    showImport={false}
                    exportLabel="Xuất tệp Excel"
                  />
                </div>
              </div>

              {/* Hàng 2: Micro-bar siêu mỏng (Badge trạng thái + Đã lưu bên trái, Bộ lọc + Đã chọn bên phải) */}
              <div className="flex items-center justify-between gap-2 sm:gap-3 pt-1.5 border-t border-border/40 select-none text-[11px] sm:text-[11.5px] text-muted-foreground">
                {/* Trạng thái duyệt + Trạng thái lưu tự động */}
                <div className="flex items-center gap-2 shrink-0">
                  {isRejected ? (
                    <button
                      type="button"
                      onClick={() => setIsFeedbackModalOpen(true)}
                      className="inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 select-none border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100/80 dark:hover:bg-rose-900/60 transition-colors cursor-pointer shrink-0"
                      title="Nhấn để xem chi tiết ý kiến phản hồi"
                    >
                      <HugeiconsIcon icon={AlertCircleIcon} size={11} className="shrink-0 text-rose-600 dark:text-rose-400" />
                      <span>Yêu cầu sửa</span>
                    </button>
                  ) : isPendingApproval ? (
                    <span
                      className="inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 select-none border shrink-0 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/50"
                      title="Kế hoạch chủ đề đang chờ phê duyệt"
                    >
                      <HugeiconsIcon
                        icon={Clock01Icon}
                        size={11}
                        className="shrink-0 text-amber-600 dark:text-amber-400"
                      />
                      <span>Chờ duyệt</span>
                    </span>
                  ) : isApproved ? (
                    <span
                      className="inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 select-none border shrink-0 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/50"
                      title="Kế hoạch chủ đề đã được Ban Giám Hiệu phê duyệt"
                    >
                      <HugeiconsIcon
                        icon={CheckmarkCircle01Icon}
                        size={11}
                        className="shrink-0 text-emerald-600 dark:text-emerald-400"
                      />
                      <span>Đã duyệt</span>
                    </span>
                  ) : null}

                  {/* Trạng thái lưu tự động */}
                  <span className="text-[11.5px] text-muted-foreground/70 shrink-0 font-sans tracking-tight select-none">
                    Đã lưu lúc <span className="font-mono text-muted-foreground font-medium">{updatedAt}</span>
                  </span>
                </div>

                {/* Góc phải: Đã chọn bao nhiêu nội dung giáo dục & Nút Bộ lọc */}
                <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
                  {/* Đã chọn bao nhiêu nội dung giáo dục */}
                  <span className="whitespace-nowrap">
                    Đã chọn <strong className="font-mono font-bold text-foreground">{actualSelectedContentCount}</strong> / {totalContentsCount} NDGD
                  </span>

                  {/* Nút Bộ lọc & Sắp xếp mục tiêu (nằm sát bên phải) */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className={cn(
                          'h-6 px-2 flex items-center gap-1 border transition-colors cursor-pointer rounded-none text-[11px] select-none',
                          (selectedDomainFilters.length > 0 || onlySelected || sortBy !== 'CODE_ASC')
                            ? 'border-[#1447e6] text-[#1447e6] bg-[#1447e6]/10 font-semibold'
                            : 'border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground',
                        )}
                        title="Bộ lọc & Sắp xếp mục tiêu"
                      >
                        <HugeiconsIcon icon={FilterHorizontalIcon} size={12} />
                        <span>Bộ lọc</span>
                        {(selectedDomainFilters.length > 0 || onlySelected || sortBy !== 'CODE_ASC') && (
                          <span className="size-1.5 rounded-full bg-[#1447e6]" />
                        )}
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="w-64 p-1.5 rounded-none border border-border bg-card shadow-xl z-50 text-foreground"
                    >
                      {/* Sắp xếp mục tiêu */}
                      <DropdownMenuLabel className="px-2 py-1 text-[11px] font-bold text-muted-foreground uppercase tracking-wider select-none">
                        Sắp xếp
                      </DropdownMenuLabel>
                      <DropdownMenuItem
                        onSelect={(e) => e.preventDefault()}
                        onClick={() => setSortBy('CODE_ASC')}
                        className={cn(
                          'flex items-center justify-between h-7.5 px-2 text-[12px] cursor-pointer rounded-none hover:bg-muted/60 select-none',
                          sortBy === 'CODE_ASC' && 'bg-muted/80 font-semibold text-[#1447e6]',
                        )}
                      >
                        <span>Theo số thứ tự mục tiêu</span>
                        {sortBy === 'CODE_ASC' && (
                          <HugeiconsIcon icon={CheckmarkSquare02Icon} size={13} className="text-[#1447e6] shrink-0" />
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={(e) => e.preventDefault()}
                        onClick={() => setSortBy('NEWEST')}
                        className={cn(
                          'flex items-center justify-between h-7.5 px-2 text-[12px] cursor-pointer rounded-none hover:bg-muted/60 select-none',
                          sortBy === 'NEWEST' && 'bg-muted/80 font-semibold text-[#1447e6]',
                        )}
                      >
                        <span>Mục tiêu mới nhất</span>
                        {sortBy === 'NEWEST' && (
                          <HugeiconsIcon icon={CheckmarkSquare02Icon} size={13} className="text-[#1447e6] shrink-0" />
                        )}
                      </DropdownMenuItem>

                      <DropdownMenuSeparator className="my-1 border-t border-border" />

                      {/* Header: Lĩnh vực phát triển */}
                      <div className="flex items-center justify-between px-2 py-1 text-[11px] font-bold text-muted-foreground uppercase tracking-wider select-none">
                        <span>Lĩnh vực phát triển</span>
                        {selectedDomainFilters.length > 0 && (
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => setSelectedDomainFilters([])}
                            className="text-[11px] text-[#1447e6] hover:underline font-normal normal-case cursor-pointer"
                          >
                            Chọn tất cả
                          </button>
                        )}
                      </div>

                      {/* Option: Tất cả lĩnh vực */}
                      <DropdownMenuItem
                        onSelect={(e) => e.preventDefault()}
                        onClick={() => setSelectedDomainFilters([])}
                        className={cn(
                          'flex items-center justify-between h-7.5 px-2 text-[12px] cursor-pointer rounded-none hover:bg-muted/60 select-none',
                          selectedDomainFilters.length === 0 && 'bg-muted/80 font-semibold text-[#1447e6]',
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              'size-3.5 border rounded-none flex items-center justify-center shrink-0 transition-colors',
                              selectedDomainFilters.length === 0
                                ? 'bg-[#1447e6] border-[#1447e6] text-white'
                                : 'border-border/80 bg-background',
                            )}
                          >
                            {selectedDomainFilters.length === 0 && (
                              <svg className="size-2.5 text-white" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="2.5 7 5.5 10 11.5 4" />
                              </svg>
                            )}
                          </div>
                          <span>Tất cả lĩnh vực</span>
                        </div>
                        <span className="font-mono text-[11px] text-muted-foreground">{allGoals.length}</span>
                      </DropdownMenuItem>

                      {/* Các lựa chọn lĩnh vực cụ thể (chọn nhiều cùng lúc) */}
                      {DOMAIN_OPTIONS.filter((d) => d.key !== 'ALL').map((item) => {
                        const domainGoals = allGoals.filter((g) => g.domain === item.key);
                        const domainSelectedCount = domainGoals.filter((g) => checkIsGoalSelected(g)).length;
                        const isDomainActive = selectedDomainFilters.includes(item.key);

                        return (
                          <DropdownMenuItem
                            key={item.key}
                            onSelect={(e) => e.preventDefault()}
                            onClick={() => handleToggleDomainFilter(item.key)}
                            className={cn(
                              'flex items-center justify-between h-7.5 px-2 text-[12px] cursor-pointer rounded-none hover:bg-muted/60 select-none',
                              isDomainActive && 'bg-muted/80 font-semibold text-[#1447e6]',
                            )}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div
                                className={cn(
                                  'size-3.5 border rounded-none flex items-center justify-center shrink-0 transition-colors',
                                  isDomainActive
                                    ? 'bg-[#1447e6] border-[#1447e6] text-white'
                                    : 'border-border/80 bg-background',
                                )}
                              >
                                {isDomainActive && (
                                  <svg className="size-2.5 text-white" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="2.5 7 5.5 10 11.5 4" />
                                  </svg>
                                )}
                              </div>
                              <span className="truncate">{item.label}</span>
                            </div>
                            <div className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground shrink-0">
                              <span>{`${domainSelectedCount}/${domainGoals.length}`}</span>
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
                        onSelect={(e) => e.preventDefault()}
                        onClick={() => setOnlySelected(false)}
                        className={cn(
                          'flex items-center justify-between h-7.5 px-2 text-[12px] cursor-pointer rounded-none hover:bg-muted/60',
                          !onlySelected && 'bg-muted/80 font-semibold text-[#1447e6]',
                        )}
                      >
                        <span>Tất cả mục tiêu ({allGoals.length})</span>
                        {!onlySelected && (
                          <HugeiconsIcon icon={CheckmarkSquare02Icon} size={13} className="text-[#1447e6] shrink-0" />
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={(e) => e.preventDefault()}
                        onClick={() => setOnlySelected(true)}
                        className={cn(
                          'flex items-center justify-between h-7.5 px-2 text-[12px] cursor-pointer rounded-none hover:bg-muted/60',
                          onlySelected && 'bg-muted/80 font-semibold text-[#1447e6]',
                        )}
                      >
                        <span>Chỉ xem đã chọn ({actualSelectedCount})</span>
                        {onlySelected && (
                          <HugeiconsIcon icon={CheckmarkSquare02Icon} size={13} className="text-[#1447e6] shrink-0" />
                        )}
                      </DropdownMenuItem>

                      {/* Đặt lại bộ lọc */}
                      {(selectedDomainFilters.length > 0 || onlySelected || sortBy !== 'CODE_ASC') && (
                        <>
                          <DropdownMenuSeparator className="my-1 border-t border-border" />
                          <DropdownMenuItem
                            onSelect={(e) => e.preventDefault()}
                            onClick={() => {
                              setSelectedDomainFilters([]);
                              setOnlySelected(false);
                              setSortBy('CODE_ASC');
                            }}
                            className="flex items-center justify-center h-7 px-2 text-[12px] text-[#1447e6] hover:bg-[#1447e6]/10 cursor-pointer rounded-none font-medium text-center"
                          >
                            Đặt lại mặc định
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>

            {/* Vùng danh sách mục tiêu CUỘN ĐỘC LẬP */}
            <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-5 md:p-6 space-y-3.5 sm:space-y-4 [scrollbar-width:thin]">
            {/* Cards Grid: Thiết kế theo đúng chuẩn card của Bộ chủ đề */}
            <div className={cn(
              'grid gap-3.5',
              !showCalendar ? 'grid-cols-1 xl:grid-cols-2' : 'grid-cols-1',
            )}>
              {filteredGoals.map((goal) => {
                const status = getGoalContentStatus(goal);
                const otherThemes = themes.filter(
                  (th) =>
                    th.code !== currentTheme?.code &&
                    (th.allocatedGoals || []).some((g) => g.id === goal.id),
                );

                // Đếm số lượng hoạt động giáo dục của mục tiêu này
                const goalActivitiesCount = (goal.contents || []).reduce(
                  (acc, c) => acc + (c.activitiesCount || (c.activities?.length || 0)),
                  0
                );
                const hasGoalActivities = goalActivitiesCount > 0;

                return (
                  <div
                    key={goal.id}
                    onClick={() => handleToggleGoalAllocation(goal.id)}
                    className={cn(
                      'border bg-card p-4 sm:p-5 rounded-none shadow-2xs space-y-3 transition-colors text-left select-none cursor-pointer',
                      status.isSelected
                        ? 'border-[#1447e6]/40 bg-[#1447e6]/[0.015]'
                        : 'border-border bg-card hover:border-border hover:bg-muted/15',
                    )}
                  >
                    <div className="space-y-2">
                      {/* Tên mục tiêu lên trên cùng với mã MT */}
                      <div className="flex items-start gap-2.5">
                        <span className="px-2 py-0.5 bg-[#1447e6]/10 text-[#1447e6] font-mono font-bold text-[11.5px] border border-[#1447e6]/20 rounded-none shrink-0 mt-0.5">
                          {formatGoalCode(goal.code)}
                        </span>
                        <p
                          className={cn(
                            'text-[13.5px] sm:text-[14px] leading-relaxed flex-1',
                            status.isSelected ? 'text-foreground font-medium' : 'text-foreground/90 font-normal',
                          )}
                        >
                          {cleanDisplayGoalTitle(goal)}
                        </p>
                      </div>

                      {/* Tên lĩnh vực xuống dưới */}
                      <div className="flex items-center gap-2 flex-wrap text-[12px] text-muted-foreground">
                        <span className="font-medium">
                          {DOMAIN_FULL_LABELS[goal.domain] || goal.domainLabel || goal.domain}
                        </span>
                        {otherThemes.length > 0 && (
                          <span className="text-[11.5px] text-muted-foreground/80 italic font-normal">
                            (Đã có ở Chủ đề {otherThemes.map((t) => t.code).join(', ')})
                          </span>
                        )}
                      </div>

                      {/* Danh sách nội dung giáo dục chi tiết để tick chọn lẻ */}
                      {showContents && goal.contents && goal.contents.length > 0 && (
                        <div className="pt-2.5 border-t border-border/60 space-y-2" onClick={(e) => e.stopPropagation()}>
                          <div className="text-[12px] text-muted-foreground font-medium">
                            <span>Nội dung giáo dục ({status.selectedCount}/{status.totalCount}):</span>
                          </div>
                          <div className="space-y-1.5">
                            {goal.contents.map((cnt) => {
                              const cId = String(cnt.id || cnt.content_id);
                              const cNum = cnt.content_id ? String(cnt.content_id) : null;
                              const cPub = (cnt.public_id || cnt.publicId) ? String(cnt.public_id || cnt.publicId) : null;
                              const isCntSelected =
                                currentThemeContentSet.has(cId) ||
                                (cNum && currentThemeContentSet.has(cNum)) ||
                                (cPub && currentThemeContentSet.has(cPub));

                              // Hiển thị đúng số hoạt động giáo dục thực tế thuộc nội dung trong chủ đề này (tester_24+1 Item 8)
                              const currentThemeId = currentTheme?.id;
                              const currentThemeDbId = currentTheme?._theme_id ? String(currentTheme._theme_id) : null;
                              const themeActivitiesCount =
                                (currentThemeId && typeof cnt.themeActivitiesCount?.[String(currentThemeId)] === 'number')
                                  ? cnt.themeActivitiesCount[String(currentThemeId)]
                                  : (currentThemeDbId && typeof cnt.themeActivitiesCount?.[currentThemeDbId] === 'number')
                                    ? cnt.themeActivitiesCount[currentThemeDbId]
                                    : (typeof cnt.activitiesCount === 'number' && !cnt.themeActivitiesCount ? cnt.activitiesCount : 0);

                              return (
                                <div
                                  key={cId}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleContentAllocation(goal.id, cId);
                                  }}
                                  className={cn(
                                    'flex items-center justify-between gap-3 p-2.5 sm:p-3 border rounded-none text-[12.5px] select-none transition-colors cursor-pointer',
                                    isCntSelected
                                      ? 'bg-[#1447e6]/[0.04] border-[#1447e6]/35 text-foreground font-medium'
                                      : 'bg-card border-border/60 text-muted-foreground hover:bg-muted/30 hover:text-foreground',
                                  )}
                                >
                                  <div className="flex items-start gap-2.5 flex-1 min-w-0">
                                    {/* Checkbox tự vẽ theo chuẩn SVG: Đảm bảo phản hồi trạng thái 100% chuẩn xác */}
                                    <div
                                      role="checkbox"
                                      aria-checked={Boolean(isCntSelected)}
                                      className={cn(
                                        'size-4 rounded-none border flex items-center justify-center shrink-0 mt-0.5 transition-colors',
                                        isCntSelected
                                          ? 'bg-[#1447e6] border-[#1447e6] text-white'
                                          : 'border-border/80 bg-background hover:border-[#1447e6]',
                                      )}
                                    >
                                      {isCntSelected && (
                                        <svg
                                          className="size-3 text-white pointer-events-none"
                                          viewBox="0 0 14 14"
                                          fill="none"
                                          stroke="currentColor"
                                          strokeWidth="2.5"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                        >
                                          <polyline points="2.5 7 5.5 10 11.5 4" />
                                        </svg>
                                      )}
                                    </div>
                                    <span className="leading-snug flex-1">{cnt.title}</span>
                                  </div>

                                  {/* Hiển thị đúng số lượng HĐGD nếu có hoạt động giáo dục thực tế */}
                                  {themeActivitiesCount > 0 && (
                                    <span className="text-[11px] font-mono text-muted-foreground/75 px-1 py-0.5 shrink-0">
                                      {themeActivitiesCount} HĐGD
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Khi thu gọn nội dung chi tiết */}
                      {!showContents && goal.contents && goal.contents.length > 0 && (
                        <div className="pt-0.5 text-[11.5px] text-muted-foreground flex items-center gap-2">
                          <span>· {goal.contents.length} nội dung giáo dục</span>
                          {status.selectedCount > 0 && (
                            <span className="ml-1 text-foreground font-medium">
                              (Đã chọn {status.selectedCount}/{status.totalCount})
                            </span>
                          )}
                        </div>
                      )}

                      {/* Mục tiêu chưa có nội dung giáo dục thì hiển thị Chưa có NDGD ở bên dưới */}
                      {(!goal.contents || goal.contents.length === 0) && (
                        <div className="pt-1 text-[12px] text-muted-foreground/60 italic select-none">
                          Chưa có NDGD
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredGoals.length === 0 && (
              <div className="h-48 flex flex-col items-center justify-center text-center p-6 space-y-1.5 text-muted-foreground bg-card border border-dashed border-border rounded-none">
                <p className="text-[14px] font-semibold text-foreground">
                  Không tìm thấy mục tiêu nào phù hợp
                </p>
                <p className="text-[12.5px]">
                  {onlySelected
                    ? 'Chủ đề này chưa có mục tiêu nào được chọn trong lĩnh vực hiện tại.'
                    : searchQuery
                      ? `Không có kết quả nào cho từ khóa "${searchQuery}".`
                      : 'Thử chọn bộ lọc "Tất cả" hoặc lĩnh vực phát triển khác.'}
                </p>
                {(onlySelected || selectedDomainFilters.length > 0 || searchQuery) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDomainFilters([]);
                      setOnlySelected(false);
                      setSearchQuery('');
                    }}
                    className="mt-1 text-[12.5px] text-[#1447e6] hover:underline cursor-pointer font-medium"
                  >
                    Xem tất cả {allGoals.length} mục tiêu
                  </button>
                )}
              </div>
            )}
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          COLUMN 3: LỊCH 2 THÁNG LIÊN TIẾP & CÁC CHỦ ĐỀ NHÁNH (Đồng bộ chuẩn Bộ chủ đề)
         ========================================================================= */}
      {showCalendar && (
        <>
          {/* Mobile/Tablet Backdrop when opened on screen < xl */}
          <div
            onClick={() => setShowCalendar(false)}
            className="fixed inset-0 bg-black/50 z-40 xl:hidden backdrop-blur-xs transition-opacity"
          />
          <div className="fixed inset-y-0 right-0 z-50 w-[340px] max-w-[92vw] shadow-2xl border-l border-border bg-card flex flex-col h-full min-h-0 select-none overflow-hidden xl:static xl:z-auto xl:w-[320px] 2xl:w-[340px] xl:shadow-none animate-in slide-in-from-right duration-200">
            {/* Mobile close bar */}
            <div className="xl:hidden p-3 border-b border-border flex items-center justify-between bg-muted/30 shrink-0">
              <span className="text-[13px] font-semibold text-foreground">Lịch chủ đề & nhánh</span>
              <button
                type="button"
                onClick={() => setShowCalendar(false)}
                className="size-7 flex items-center justify-center hover:bg-muted text-muted-foreground rounded-xs cursor-pointer"
                title="Đóng lịch"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={15} />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-3.5 space-y-3.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
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

            {/* 2 Tháng Lịch Liên Tiếp */}
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
                            className="h-8 flex items-center justify-center select-none opacity-20 pointer-events-none text-muted-foreground/30 text-[12px] font-light rounded-none"
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

                          {/* Ngày trong chủ đề ĐÃ CÓ NHÁNH - Xanh Sorak #1447e6 */}
                          {isAssignedSubTheme && (
                            <div
                              className={cn(
                                'absolute inset-y-0.5 bg-[#1447e6] rounded-none',
                                prevInAssigned ? 'left-0' : 'left-0.5',
                                nextInAssigned ? 'right-0' : 'right-0.5',
                              )}
                            />
                          )}

                          {/* Ngày trong chủ đề CHƯA XẾP NHÁNH (Dải sọc chéo #1447e6 mờ) */}
                          {isUnassignedInTheme && (
                            <div
                              className={cn(
                                'absolute inset-y-0.5 border-y border-[#1447e6]/35 z-10 pointer-events-none rounded-none',
                                prevInUnassigned ? 'left-0' : 'left-0.5 border-l',
                                nextInUnassigned ? 'right-0' : 'right-0.5 border-r',
                              )}
                              style={{
                                background:
                                  'repeating-linear-gradient(45deg, rgba(20, 71, 230, 0.08), rgba(20, 71, 230, 0.08) 5px, rgba(20, 71, 230, 0.20) 5px, rgba(20, 71, 230, 0.20) 10px)',
                              }}
                            />
                          )}

                          {/* Chủ đề khác - Dải màu xám nhạt nhẹ nhàng */}
                          {isInOtherTheme && (
                            <div
                              className={cn(
                                'absolute inset-y-0.5 bg-slate-100/90 dark:bg-slate-800/40 transition-colors rounded-none',
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
                              'relative z-20 w-full h-full flex items-center justify-center text-[12px] transition-colors rounded-none',
                              isAssignedSubTheme && 'text-white font-semibold',
                              isUnassignedInTheme && 'text-[#1447e6] font-bold',
                              isInOtherTheme && 'text-muted-foreground/80 dark:text-muted-foreground font-normal',
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
              CÁC CHỦ ĐỀ NHÁNH: Trình bày tối giản, thanh lịch theo chuẩn Bộ chủ đề
             ========================================================================= */}
            {currentTheme?.subThemes && currentTheme.subThemes.length > 0 && (
              <div className="pt-3 border-t border-border/70 space-y-2">
                <div className="flex items-center justify-between text-[12.5px] font-semibold text-foreground">
                  <span>Chủ đề nhánh</span>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {currentTheme.subThemes.length} nhánh
                  </span>
                </div>
                <div className="border border-border/80 bg-card divide-y divide-border/40 text-[12px]">
                  {currentTheme.subThemes.map((st, idx) => (
                    <div key={st.id || idx} className="p-2.5 space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span className="font-mono font-semibold text-[#1447e6]">
                          Nhánh {idx + 1}
                        </span>
                        <span className="font-mono tabular-nums">
                          {formatDateRangeDdMm(st.startDate, st.endDate)}
                        </span>
                      </div>
                      <p className="text-[12.5px] text-foreground font-medium leading-snug">
                        {st.name}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Thanh chú thích tinh gọn & Popover quy ước */}
            <div className="pt-2.5 border-t border-border/70 flex items-center justify-between text-[11px] text-muted-foreground select-none">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5" title="Chủ đề đang xem">
                  <span className="size-2.5 bg-[#1447e6] shrink-0 rounded-none" />
                  <span className="font-medium text-foreground/85 text-[11px]">Chủ đề này</span>
                </div>
                <div className="flex items-center gap-1.5" title="Chưa xếp nhánh">
                  <span
                    className="size-2.5 border border-[#1447e6]/40 shrink-0 rounded-none"
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
                      <span className="size-3 bg-[#1447e6] shrink-0 rounded-none" />
                      <span className="text-foreground">Chủ đề đang chọn</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className="size-3 border border-[#1447e6]/40 shrink-0 rounded-none"
                        style={{
                          background:
                            'repeating-linear-gradient(45deg, rgba(20, 71, 230, 0.2), rgba(20, 71, 230, 0.2) 2px, rgba(20, 71, 230, 0.4) 2px, rgba(20, 71, 230, 0.4) 4px)',
                        }}
                      />
                      <span className="text-foreground">Chưa xếp nhánh</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="size-3 bg-slate-100 dark:bg-slate-800/60 border border-border/60 shrink-0 rounded-none" />
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
      </>
    )}
      {/* Modal: BGH Feedback / Rejection Details */}
      <Dialog open={isFeedbackModalOpen} onOpenChange={setIsFeedbackModalOpen}>
        <DialogContent className="max-w-md rounded-none">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-foreground">
              Ý kiến phản hồi của Ban Giám Hiệu
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-1">
              Chủ đề: <strong>{currentTheme?.name || 'Kế hoạch giáo dục'}</strong>
              {currentTheme?.startDate && currentTheme?.endDate && (
                <span> ({formatDateRangeDdMm(currentTheme.startDate, currentTheme.endDate)})</span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="bg-rose-50/70 dark:bg-rose-950/25 border border-rose-200/80 dark:border-rose-900/40 p-3.5 text-rose-800 dark:text-rose-200 text-xs leading-relaxed font-medium">
              "{rejectionReason || 'Ban Giám Hiệu yêu cầu rà soát và bổ sung kế hoạch.'}"
            </div>
            <p className="text-muted-foreground text-[11.5px] leading-relaxed">
              Vui lòng kiểm tra lại các nội dung theo góp ý trên và nộp lại cho Ban Giám Hiệu duyệt.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border/60">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFeedbackModalOpen(false)}
              className="text-xs rounded-none h-8 px-4"
            >
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default TargetAllocationTab;
