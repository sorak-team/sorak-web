import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Calendar03Icon,
  PlusSignIcon,
  Delete02Icon,
  SentIcon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  SidebarRightIcon,
  CheckmarkCircle01Icon,
  Cancel01Icon,
  Settings02Icon,
  InformationCircleIcon,
} from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { cn } from '@/shared/lib/utils';
import { toast } from 'sonner';
import { curriculumApi } from './curriculum.api';

// Days of the week in VN matching WeekPickerCalendar
const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

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

// Helper add days to ISO date string (YYYY-MM-DD)
const addDaysToDate = (dateStr, days) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) return '';
  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  date.setDate(date.getDate() + days);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// Normalize subThemes array ensuring object shape { id, name, startDate, endDate }
const normalizeSubThemes = (rawList) => {
  if (!Array.isArray(rawList)) return [];
  return rawList.map((item, idx) => {
    if (typeof item === 'object' && item !== null) {
      return {
        id: item.id || `st-${idx}-${Date.now()}`,
        name: item.name || '',
        startDate: item.startDate || '',
        endDate: item.endDate || '',
      };
    }
    return {
      id: `st-${idx}-${Date.now()}`,
      name: typeof item === 'string' ? item : '',
      startDate: '',
      endDate: '',
    };
  });
};

// Generate calendar days matrix with Monday as day 0
function generateMonthDays(year, month) {
  const firstDay = new Date(year, month, 1);
  const startDayOfWeek = (firstDay.getDay() + 6) % 7; // Monday = 0, Sunday = 6
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const days = [];
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

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
      isToday: false,
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
      isToday: false,
    });
  }

  // Next month leading days to complete current week row only
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
      isToday: false,
    });
  }

  return days;
}

export function CurriculumThemeDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { yearId = '2025-2026', ageGroup = 'nhatre' } = useParams();

  const [isLoading, setIsLoading] = useState(true);
  const [themeSetInfo, setThemeSetInfo] = useState(null);
  const [themes, setThemes] = useState([]);
  const [selectedTopicIndex, setSelectedTopicIndex] = useState(1); // 0-indexed: index 1 is 'Gia đình'
  const [showRightSidebar, setShowRightSidebar] = useState(true);
  const [isActionsOpen, setIsActionsOpen] = useState(false);

  // Form state for current selected topic
  const [topicName, setTopicName] = useState('');
  const [startDate, setStartDate] = useState('2025-09-22');
  const [endDate, setEndDate] = useState('2025-10-12');
  const [subThemes, setSubThemes] = useState([]);
  const [note, setNote] = useState('');
  const [status, setStatus] = useState('DRAFT');
  const [updatedAt, setUpdatedAt] = useState('11/10/2026');
  const topicNameInputRef = React.useRef(null);

  // Interactive calendar scheduling state for sub-themes (Two-Click Range Selection)
  const [activeSubThemeIndex, setActiveSubThemeIndex] = useState(null); // index of sub-theme currently being scheduled on calendar
  const [rangeSelectionStart, setRangeSelectionStart] = useState(null); // start date selected on calendar
  const [hoveredCalendarDate, setHoveredCalendarDate] = useState(null); // date hovered for visual range preview

  // Calendar state
  const now = useMemo(() => new Date(), []);
  const [calendarYear, setCalendarYear] = useState(2025);
  const [calendarMonth, setCalendarMonth] = useState(8); // September (0-indexed: 8)

  // Auto-sync calendar view to the start date of selected topic
  useEffect(() => {
    if (startDate) {
      const parts = startDate.split('-').map(Number);
      if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        setCalendarYear(parts[0]);
        setCalendarMonth(parts[1] - 1);
      }
    }
  }, [startDate, selectedTopicIndex]);

  // Load theme set details
  useEffect(() => {
    async function fetchDetail() {
      setIsLoading(true);
      try {
        const data = await curriculumApi.getThemeSetDetail({
          year: yearId.replace('-', '–'),
          ageGroup,
        });
        setThemeSetInfo(data.info);
        if (data.info?.updatedAt) {
          setUpdatedAt(data.info.updatedAt);
        }
        let themeList = data.themes || [];
        const localStatus = localStorage.getItem(`sorak_curriculum_${yearId}_${ageGroup}_status`);
        if (localStatus) {
          themeList = themeList.map((t) => ({ ...t, status: localStatus }));
        }
        setThemes(themeList);
        if (themeList.length > 0) {
          const idx = themeList.length > 1 ? 1 : 0;
          setSelectedTopicIndex(idx);
          loadTopicIntoForm(themeList[idx]);
        }
      } catch (err) {
        console.warn('Failed to load theme set details:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchDetail();
  }, [yearId, ageGroup]);

  const loadTopicIntoForm = (topic) => {
    if (!topic) return;
    setTopicName(topic.name || '');
    setStartDate(topic.startDate || '2025-09-01');
    setEndDate(topic.endDate || '2025-09-21');
    setSubThemes(normalizeSubThemes(topic.subThemes));
    setNote(topic.note || '');
    setStatus(topic.status || 'DRAFT');
    setActiveSubThemeIndex(null);
    setRangeSelectionStart(null);
    setHoveredCalendarDate(null);
  };

  const handleSelectTopic = (index) => {
    setSelectedTopicIndex(index);
    loadTopicIntoForm(themes[index]);
  };

  // Phím tắt bàn phím ← / → để chuyển chủ đề lớn nhanh khi không focus gõ text
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
        if (selectedTopicIndex > 0) {
          e.preventDefault();
          handleSelectTopic(selectedTopicIndex - 1);
        }
      } else if (e.key === 'ArrowRight') {
        if (selectedTopicIndex < themes.length - 1) {
          e.preventDefault();
          handleSelectTopic(selectedTopicIndex + 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedTopicIndex, themes]);

  const selectedTopic = themes[selectedTopicIndex];

  // Helper tính khoảng ngày hợp lệ cho một nhánh cụ thể
  const getMinMaxForSubTheme = useCallback(
    (index, subThemesList = subThemes, themeStart = startDate, themeEnd = endDate) => {
      const prevBranch = index > 0 ? subThemesList[index - 1] : null;
      const nextBranch = index < subThemesList.length - 1 ? subThemesList[index + 1] : null;

      let minDate = prevBranch?.endDate
        ? addDaysToDate(prevBranch.endDate, 1)
        : themeStart || '';
      if (themeStart && minDate < themeStart) minDate = themeStart;

      let maxDate = nextBranch?.startDate
        ? addDaysToDate(nextBranch.startDate, -1)
        : themeEnd || '';
      if (themeEnd && maxDate > themeEnd) maxDate = themeEnd;

      return { minDate, maxDate };
    },
    [subThemes, startDate, endDate],
  );

  // Handlers for branch topics (Chủ đề nhánh)
  const handleAddSubTheme = () => {
    if (isAllPublished) return;
    let nextStart = startDate || '';
    if (subThemes.length > 0) {
      const lastBranch = subThemes[subThemes.length - 1];
      if (lastBranch.endDate) {
        nextStart = addDaysToDate(lastBranch.endDate, 1);
      }
    }
    let nextEnd = nextStart ? addDaysToDate(nextStart, 6) : '';
    if (endDate && nextEnd > endDate) {
      nextEnd = endDate;
    }
    const newBranch = {
      id: `st-${Date.now()}`,
      name: '',
      startDate: nextStart,
      endDate: nextEnd,
    };
    const newIdx = subThemes.length;
    setSubThemes((prev) => [...prev, newBranch]);
    setShowRightSidebar(true);
    setActiveSubThemeIndex(newIdx);
    setRangeSelectionStart(null);
    setHoveredCalendarDate(null);
    toast.info(`Đã thêm nhánh mới. Bạn có thể chọn ngày trực tiếp trên lịch hoặc bấm "+1 Tuần".`);
  };

  const handleUpdateSubTheme = (index, field, value) => {
    if (isAllPublished) return;
    setSubThemes((prev) => {
      const updated = [...prev];
      const cur = { ...updated[index], [field]: value };
      // Khi người dùng chọn ngày bắt đầu, nếu chưa có ngày kết thúc hoặc ngày kết thúc < ngày bắt đầu, gợi ý ngày kết thúc (+6 ngày)
      if (field === 'startDate' && value) {
        if (!cur.endDate || cur.endDate < value) {
          let suggestedEnd = addDaysToDate(value, 6);
          if (endDate && suggestedEnd > endDate) suggestedEnd = endDate;
          cur.endDate = suggestedEnd;
        }
      }
      updated[index] = cur;
      return updated;
    });
  };

  const handleDeleteSubTheme = (index) => {
    if (isAllPublished) return;
    if (activeSubThemeIndex === index) {
      setActiveSubThemeIndex(null);
      setRangeSelectionStart(null);
      setHoveredCalendarDate(null);
    } else if (activeSubThemeIndex !== null && activeSubThemeIndex > index) {
      setActiveSubThemeIndex(activeSubThemeIndex - 1);
    }
    setSubThemes((prev) => prev.filter((_, i) => i !== index));
  };

  // Kích hoạt / Tắt chế độ chọn ngày trên lịch cho một nhánh
  const handleToggleSelectSubThemeOnCalendar = (bIdx) => {
    if (isAllPublished) {
      toast.warning('Bộ chủ đề đã công bố. Vui lòng bấm "Gỡ công bố" để chỉnh sửa thời gian.');
      return;
    }
    if (activeSubThemeIndex === bIdx) {
      setActiveSubThemeIndex(null);
      setRangeSelectionStart(null);
      setHoveredCalendarDate(null);
    } else {
      setShowRightSidebar(true);
      setActiveSubThemeIndex(bIdx);
      setRangeSelectionStart(null);
      setHoveredCalendarDate(null);

      // Tự động chuyển trang lịch sang tháng của nhánh
      const branch = subThemes[bIdx];
      const targetDate = branch?.startDate || branch?.endDate || startDate;
      if (targetDate) {
        const parts = targetDate.split('-').map(Number);
        if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          setCalendarYear(parts[0]);
          setCalendarMonth(parts[1] - 1);
        }
      }
    }
  };

  // Gán nhanh 1 tuần (+6 ngày từ ngày bắt đầu / ngày hợp lệ)
  const handleQuickAssignWeek = (bIdx) => {
    if (isAllPublished) {
      toast.warning('Bộ chủ đề đã công bố. Vui lòng bấm "Gỡ công bố" để chỉnh sửa thời gian.');
      return;
    }
    const branch = subThemes[bIdx];
    if (!branch) return;

    const { minDate, maxDate } = getMinMaxForSubTheme(bIdx, subThemes, startDate, endDate);
    const start = branch.startDate || minDate;
    if (!start) {
      toast.warning('Chưa có mốc ngày bắt đầu hợp lệ.');
      return;
    }

    let end = addDaysToDate(start, 6);
    if (maxDate && end > maxDate) {
      end = maxDate;
    }

    setSubThemes((prev) => {
      const updated = [...prev];
      updated[bIdx] = {
        ...updated[bIdx],
        startDate: start,
        endDate: end,
      };
      return updated;
    });

    setRangeSelectionStart(null);
    setHoveredCalendarDate(null);
    toast.success(`Đã gán 1 tuần (${formatDateVn(start)} – ${formatDateVn(end)}) cho nhánh ${bIdx + 1}`);

    // Nếu đang chọn nhánh này trên lịch, chuyển sang nhánh tiếp theo nếu có
    if (activeSubThemeIndex === bIdx) {
      if (bIdx + 1 < subThemes.length) {
        setActiveSubThemeIndex(bIdx + 1);
      } else {
        setActiveSubThemeIndex(null);
      }
    }
  };

  // Xử lý 2 lần click trên lịch (Click 1: ngày bắt đầu -> Click 2: ngày kết thúc)
  const handleCalendarDateSelectForSubTheme = (dateStr) => {
    if (activeSubThemeIndex === null || isAllPublished) return;
    const curBranch = subThemes[activeSubThemeIndex];
    if (!curBranch) return;

    const { minDate, maxDate } = getMinMaxForSubTheme(activeSubThemeIndex, subThemes, startDate, endDate);

    if (minDate && dateStr < minDate) {
      toast.warning(`Ngày chọn (${formatDateVn(dateStr)}) phải từ ${formatDateVn(minDate)} trở đi (nối tiếp nhánh trước).`);
      return;
    }
    if (maxDate && dateStr > maxDate) {
      toast.warning(`Ngày chọn (${formatDateVn(dateStr)}) không được vượt quá ngày kết thúc chủ đề (${formatDateVn(maxDate)}).`);
      return;
    }

    // Lần click 1: Chọn ngày bắt đầu
    if (!rangeSelectionStart) {
      setRangeSelectionStart(dateStr);
      setHoveredCalendarDate(dateStr);
      handleUpdateSubTheme(activeSubThemeIndex, 'startDate', dateStr);
      let suggestedEnd = addDaysToDate(dateStr, 6);
      if (maxDate && suggestedEnd > maxDate) suggestedEnd = maxDate;
      handleUpdateSubTheme(activeSubThemeIndex, 'endDate', suggestedEnd);
      toast.info(`Bước 1: Đã chọn ngày bắt đầu ${formatDateVn(dateStr)}. Hãy bấm ngày kết thúc trên lịch.`);
      return;
    }

    // Lần click 2: Chọn ngày kết thúc
    if (dateStr < rangeSelectionStart) {
      // Người dùng bấm ngày sớm hơn -> Đổi lại ngày bắt đầu
      setRangeSelectionStart(dateStr);
      setHoveredCalendarDate(dateStr);
      handleUpdateSubTheme(activeSubThemeIndex, 'startDate', dateStr);
      toast.info(`Đã đổi ngày bắt đầu thành ${formatDateVn(dateStr)}. Tiếp tục bấm ngày kết thúc.`);
      return;
    }

    // Hoàn tất khoảng thời gian
    const finalStart = rangeSelectionStart;
    const finalEnd = dateStr;
    setSubThemes((prev) => {
      const next = [...prev];
      next[activeSubThemeIndex] = {
        ...next[activeSubThemeIndex],
        startDate: finalStart,
        endDate: finalEnd,
      };
      return next;
    });

    setRangeSelectionStart(null);
    setHoveredCalendarDate(null);
    toast.success(`Đã xếp ngày cho nhánh ${activeSubThemeIndex + 1}: ${formatDateVn(finalStart)} – ${formatDateVn(finalEnd)}`);

    // Tự động chuyển sang nhánh tiếp theo nếu có và chưa có ngày
    if (activeSubThemeIndex + 1 < subThemes.length) {
      const nextBranch = subThemes[activeSubThemeIndex + 1];
      if (!nextBranch.startDate || !nextBranch.endDate) {
        setActiveSubThemeIndex(activeSubThemeIndex + 1);
        toast.info(`Chuyển sang chọn ngày cho nhánh ${activeSubThemeIndex + 2}`);
        return;
      }
    }
    setActiveSubThemeIndex(null);
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
      if (!dateStr || !Array.isArray(subThemes)) return null;
      return (
        subThemes.find(
          (st) =>
            st.startDate &&
            st.endDate &&
            dateStr >= st.startDate &&
            dateStr <= st.endDate,
        ) || null
      );
    },
    [subThemes],
  );

  // Publish / Unpublish entire theme set (Unified: công bố thì full, nháp thì hết)
  const isAllPublished = useMemo(
    () => themes.length > 0 && themes.every((t) => t.status === 'PUBLISHED'),
    [themes],
  );

  // Kiểm tra có thay đổi so với dữ liệu gốc của chủ đề đang chọn hay không
  const hasChanges = useMemo(() => {
    if (!selectedTopic) return false;
    const origName = selectedTopic.name || '';
    const origStart = selectedTopic.startDate || '';
    const origEnd = selectedTopic.endDate || '';
    const origNote = selectedTopic.note || '';
    const origSubThemes = normalizeSubThemes(selectedTopic.subThemes);

    const isSubChanged =
      subThemes.length !== origSubThemes.length ||
      subThemes.some((s, idx) => {
        const orig = origSubThemes[idx] || {};
        return (
          (s.name || '').trim() !== (orig.name || '').trim() ||
          (s.startDate || '') !== (orig.startDate || '') ||
          (s.endDate || '') !== (orig.endDate || '')
        );
      });

    return (
      topicName.trim() !== origName.trim() ||
      startDate !== origStart ||
      endDate !== origEnd ||
      (note || '').trim() !== origNote.trim() ||
      isSubChanged
    );
  }, [selectedTopic, topicName, startDate, endDate, note, subThemes]);

  // Khung thời gian năm học (để phân biệt ngày trong năm học vs ngoài năm học)
  const academicYearBounds = useMemo(() => {
    // 1. Ưu tiên ngày bắt đầu/kết thúc năm học từ API themeSetInfo (nếu hợp lệ YYYY-MM-DD với năm >= 2000)
    if (
      themeSetInfo?.startDate &&
      themeSetInfo?.endDate &&
      /^\d{4}-\d{2}-\d{2}$/.test(themeSetInfo.startDate) &&
      /^\d{4}-\d{2}-\d{2}$/.test(themeSetInfo.endDate)
    ) {
      return {
        start: themeSetInfo.startDate,
        end: themeSetInfo.endDate,
      };
    }

    // 2. Fallback theo chuỗi năm học (phân tích năm 4 chữ số, mặc định 05/09 đến 31/05)
    const yearMatch = (yearId || '').match(/\d{4}/g);
    let startYear = 2026;
    let endYear = 2027;
    if (yearMatch && yearMatch.length >= 2) {
      startYear = parseInt(yearMatch[0], 10);
      endYear = parseInt(yearMatch[1], 10);
    } else if (yearMatch && yearMatch.length === 1) {
      startYear = parseInt(yearMatch[0], 10);
      endYear = startYear + 1;
    }

    return {
      start: `${startYear}-09-01`,
      end: `${endYear}-05-31`,
    };
  }, [yearId, themeSetInfo]);

  // Kiểm tra đã phủ kín toàn bộ năm học (chủ đề cuối cùng đã chạm hoặc vượt ngày kết thúc năm học)
  const isAcademicYearFull = useMemo(() => {
    if (!themes || themes.length === 0) return false;
    // Tối đa 15 chủ đề lớn trong một năm học
    if (themes.length >= 15) return true;

    const lastTheme = themes[themes.length - 1];
    const yearEnd = academicYearBounds.end || '2027-05-31';
    if (!lastTheme?.endDate) return false;

    // Chỉ coi là phủ kín khi chủ đề cuối cùng chạm hoặc vượt ngày kết thúc năm học thực sự (cuối tháng 5)
    if (lastTheme.endDate >= yearEnd) return true;

    const nextStart = addDaysToDate(lastTheme.endDate, 1);
    if (nextStart > yearEnd) return true;

    return false;
  }, [themes, academicYearBounds]);

  // Giới hạn các ngày hữu dụng cho chủ đề đang chọn (themeDateBounds)
  const themeDateBounds = useMemo(() => {
    const academicYearStart = academicYearBounds.start || '2026-09-01';
    const academicYearEnd = academicYearBounds.end || '2027-05-31';

    const prevTopic = selectedTopicIndex > 0 ? themes[selectedTopicIndex - 1] : null;
    const nextTopic =
      selectedTopicIndex < themes.length - 1 ? themes[selectedTopicIndex + 1] : null;

    // 1. minAllowedStart:
    // - Sau chủ đề liền trước (prevTopic.endDate + 1 ngày).
    // - Nếu là chủ đề đầu tiên: bắt buộc từ ngày đầu năm học (academicYearStart).
    let minAllowedStart = academicYearStart;
    if (prevTopic?.endDate) {
      minAllowedStart = addDaysToDate(prevTopic.endDate, 1);
      if (minAllowedStart < academicYearStart) minAllowedStart = academicYearStart;
    }

    // 2. maxAllowedEnd:
    // - Trước chủ đề liền sau (nextTopic.startDate - 1 ngày).
    // - Nếu là chủ đề cuối cùng: đến ngày kết thúc năm học (academicYearEnd).
    let maxAllowedEnd = academicYearEnd;
    if (nextTopic?.startDate) {
      maxAllowedEnd = addDaysToDate(nextTopic.startDate, -1);
      if (maxAllowedEnd > academicYearEnd) maxAllowedEnd = academicYearEnd;
    }

    // 3. Ràng buộc với các chủ đề nhánh con đã có:
    // - Nhánh đầu tiên: chủ đề chính không thể bắt đầu sau nhánh đầu tiên.
    // - Nhánh cuối cùng: chủ đề chính không thể kết thúc trước nhánh cuối cùng.
    const firstSubStart = subThemes[0]?.startDate;
    const lastSubEnd = subThemes[subThemes.length - 1]?.endDate;

    let maxAllowedStart = endDate || maxAllowedEnd;
    if (maxAllowedEnd && maxAllowedStart > maxAllowedEnd) {
      maxAllowedStart = maxAllowedEnd;
    }
    if (firstSubStart && maxAllowedStart > firstSubStart) {
      maxAllowedStart = firstSubStart;
    }

    let minAllowedEnd = startDate || minAllowedStart;
    if (minAllowedStart && minAllowedEnd < minAllowedStart) {
      minAllowedEnd = minAllowedStart;
    }
    if (lastSubEnd && minAllowedEnd < lastSubEnd) {
      minAllowedEnd = lastSubEnd;
    }

    // Đảm bảo không bao giờ minAllowedEnd > maxAllowedEnd do lỗi dữ liệu
    if (minAllowedEnd && maxAllowedEnd && minAllowedEnd > maxAllowedEnd) {
      maxAllowedEnd = academicYearEnd;
    }

    return {
      academicYearStart,
      academicYearEnd,
      minAllowedStart,
      maxAllowedStart,
      minAllowedEnd,
      maxAllowedEnd,
      prevTopicName: prevTopic?.name,
      prevTopicEndDate: prevTopic?.endDate,
      nextTopicName: nextTopic?.name,
      nextTopicStartDate: nextTopic?.startDate,
    };
  }, [academicYearBounds, selectedTopicIndex, themes, subThemes, startDate, endDate]);

  const handleStartDateChange = (val) => {
    if (isAllPublished) return;
    if (Array.isArray(subThemes) && subThemes.length > 0) {
      toast.warning(
        `Chủ đề đã có ${subThemes.length} chủ đề nhánh. Khung thời gian chủ đề được cố định theo các nhánh con (từ ${formatDateVn(startDate)} đến ${formatDateVn(endDate)}). Vui lòng xóa các nhánh nếu muốn thiết lập lại thời gian chủ đề lớn.`,
      );
      return;
    }
    if (!val) {
      setStartDate('');
      return;
    }

    // 1. Ngoại lệ: Nằm ngoài năm học
    if (themeDateBounds.academicYearStart && val < themeDateBounds.academicYearStart) {
      toast.error(
        `Ngày bắt đầu (${formatDateVn(val)}) không được nằm ngoài năm học (năm học bắt đầu từ ngày ${formatDateVn(themeDateBounds.academicYearStart)}).`,
      );
      return;
    }
    if (themeDateBounds.academicYearEnd && val > themeDateBounds.academicYearEnd) {
      toast.error(
        `Ngày bắt đầu (${formatDateVn(val)}) không được sau ngày kết thúc năm học (${formatDateVn(themeDateBounds.academicYearEnd)}).`,
      );
      return;
    }

    // 2. Ngoại lệ: Nằm trong hoặc trước chủ đề liền trước
    if (themeDateBounds.prevTopicEndDate && val <= themeDateBounds.prevTopicEndDate) {
      toast.error(
        `Ngày bắt đầu không được nằm trong hoặc trước chủ đề trước ("${themeDateBounds.prevTopicName}" kết thúc ngày ${formatDateVn(themeDateBounds.prevTopicEndDate)}). Ngày sớm nhất cho phép là ${formatDateVn(themeDateBounds.minAllowedStart)}.`,
      );
      return;
    }

    // 3. Ngoại lệ: Đè lên hoặc sau chủ đề tiếp theo
    if (themeDateBounds.nextTopicStartDate && val >= themeDateBounds.nextTopicStartDate) {
      toast.error(
        `Ngày bắt đầu không được đè lên hoặc sau chủ đề tiếp theo ("${themeDateBounds.nextTopicName}" bắt đầu ngày ${formatDateVn(themeDateBounds.nextTopicStartDate)}).`,
      );
      return;
    }

    // 4. Ngoại lệ: Sau ngày kết thúc hiện tại của chủ đề
    if (endDate && val > endDate) {
      toast.error(
        `Ngày bắt đầu (${formatDateVn(val)}) không được sau ngày kết thúc (${formatDateVn(endDate)}).`,
      );
      return;
    }

    setStartDate(val);
  };

  const handleEndDateChange = (val) => {
    if (isAllPublished) return;
    if (Array.isArray(subThemes) && subThemes.length > 0) {
      toast.warning(
        `Chủ đề đã có ${subThemes.length} chủ đề nhánh. Khung thời gian chủ đề được cố định theo các nhánh con (từ ${formatDateVn(startDate)} đến ${formatDateVn(endDate)}). Vui lòng xóa các nhánh nếu muốn thiết lập lại thời gian chủ đề lớn.`,
      );
      return;
    }
    if (!val) {
      setEndDate('');
      return;
    }

    // 1. Ngoại lệ: Nằm ngoài năm học
    if (themeDateBounds.academicYearEnd && val > themeDateBounds.academicYearEnd) {
      toast.error(
        `Ngày kết thúc (${formatDateVn(val)}) không được nằm ngoài năm học (năm học kết thúc ngày ${formatDateVn(themeDateBounds.academicYearEnd)}).`,
      );
      return;
    }
    if (themeDateBounds.academicYearStart && val < themeDateBounds.academicYearStart) {
      toast.error(
        `Ngày kết thúc (${formatDateVn(val)}) không được trước ngày bắt đầu năm học (${formatDateVn(themeDateBounds.academicYearStart)}).`,
      );
      return;
    }

    // 2. Ngoại lệ: Trước ngày bắt đầu của chính chủ đề
    if (startDate && val < startDate) {
      toast.error(
        `Ngày kết thúc (${formatDateVn(val)}) không được trước ngày bắt đầu (${formatDateVn(startDate)}).`,
      );
      return;
    }

    // 3. Ngoại lệ: Đè lên hoặc sau chủ đề tiếp theo
    if (themeDateBounds.nextTopicStartDate && val >= themeDateBounds.nextTopicStartDate) {
      toast.error(
        `Ngày kết thúc không được đè lên hoặc sau chủ đề tiếp theo ("${themeDateBounds.nextTopicName}" bắt đầu ngày ${formatDateVn(themeDateBounds.nextTopicStartDate)}). Ngày muộn nhất cho phép là ${formatDateVn(themeDateBounds.maxAllowedEnd)}.`,
      );
      return;
    }

    // 4. Ngoại lệ: Nằm trong hoặc trước chủ đề liền trước
    if (themeDateBounds.prevTopicEndDate && val <= themeDateBounds.prevTopicEndDate) {
      toast.error(
        `Ngày kết thúc không được nằm trong hoặc trước chủ đề trước ("${themeDateBounds.prevTopicName}" kết thúc ngày ${formatDateVn(themeDateBounds.prevTopicEndDate)}).`,
      );
      return;
    }

    setEndDate(val);
  };

  // Kiểm tra chủ đề còn ngày nào chưa được xếp nhánh hay không (chỉ áp dụng khi đã có chủ đề nhánh)
  const hasUnassignedDaysInTheme = useMemo(() => {
    if (!startDate || !endDate) return false;
    if (!Array.isArray(subThemes) || subThemes.length === 0) return false;
    for (let i = 0; i < subThemes.length; i++) {
      const cur = subThemes[i];
      if (!cur.name?.trim() || !cur.startDate || !cur.endDate) return true;
      if (i === 0 && cur.startDate !== startDate) return true;
      if (i > 0) {
        const prev = subThemes[i - 1];
        const expectedStart = addDaysToDate(prev.endDate, 1);
        if (cur.startDate !== expectedStart) return true;
      }
    }
    const last = subThemes[subThemes.length - 1];
    if (!last?.endDate || last.endDate !== endDate) return true;
    return false;
  }, [startDate, endDate, subThemes]);

  // Nút lưu thay đổi chỉ bấm được khi còn là bản nháp, có thay đổi, và không còn ngày nào chưa được xếp
  const canSave = !isAllPublished && hasChanges && (subThemes.length === 0 || !hasUnassignedDaysInTheme);

  // Save changes to current topic
  const handleSaveTopic = async () => {
    if (!canSave) return;
    if (subThemes.length > 0 && hasUnassignedDaysInTheme) {
      toast.error(
        `Vui lòng phân bổ đầy đủ tất cả các ngày trong chủ đề (từ ${formatDateVn(startDate)} đến ${formatDateVn(endDate)}) cho các nhánh trước khi lưu.`,
      );
      return;
    }
    if (!topicName.trim()) {
      toast.error('Tên chủ đề không được để trống.');
      return;
    }
    if (startDate && endDate && startDate > endDate) {
      toast.error('Ngày bắt đầu không được sau ngày kết thúc.');
      return;
    }

    if (themeDateBounds.minAllowedStart && startDate < themeDateBounds.minAllowedStart) {
      toast.error(
        `Ngày bắt đầu (${formatDateVn(startDate)}) không được trước ${formatDateVn(themeDateBounds.minAllowedStart)}${themeDateBounds.prevTopicName ? ` (sau chủ đề "${themeDateBounds.prevTopicName}")` : ''
        }.`,
      );
      return;
    }

    if (themeDateBounds.maxAllowedEnd && endDate > themeDateBounds.maxAllowedEnd) {
      toast.error(
        `Ngày kết thúc (${formatDateVn(endDate)}) không được sau ${formatDateVn(themeDateBounds.maxAllowedEnd)}${themeDateBounds.nextTopicName ? ` (trước chủ đề "${themeDateBounds.nextTopicName}")` : ''
        }.`,
      );
      return;
    }

    // Validate các chủ đề nhánh
    for (let i = 0; i < subThemes.length; i++) {
      const cur = subThemes[i];
      if (!cur.name?.trim()) {
        toast.error(`Chủ đề nhánh số ${i + 1} chưa có tên.`);
        return;
      }
      if (!cur.startDate || !cur.endDate) {
        toast.error(`Chủ đề nhánh "${cur.name}" cần có đầy đủ ngày bắt đầu và ngày kết thúc.`);
        return;
      }
      if (cur.startDate > cur.endDate) {
        toast.error(`Chủ đề nhánh "${cur.name}": Ngày bắt đầu không được sau ngày kết thúc.`);
        return;
      }
      if (startDate && cur.startDate < startDate) {
        toast.error(
          `Chủ đề nhánh "${cur.name}": Ngày bắt đầu (${formatDateVn(cur.startDate)}) không được trước ngày bắt đầu chủ đề chính (${formatDateVn(startDate)}).`,
        );
        return;
      }
      if (endDate && cur.endDate > endDate) {
        toast.error(
          `Chủ đề nhánh "${cur.name}": Ngày kết thúc (${formatDateVn(cur.endDate)}) không được sau ngày kết thúc chủ đề chính (${formatDateVn(endDate)}).`,
        );
        return;
      }
      if (i > 0) {
        const prev = subThemes[i - 1];
        if (prev.endDate && cur.startDate <= prev.endDate) {
          toast.error(
            `Chủ đề nhánh số ${i + 1} ("${cur.name}") bị trùng hoặc đi trước ngày kết thúc của nhánh số ${i} ("${prev.name}"). Các nhánh phải theo thứ tự nối tiếp nhau.`,
          );
          return;
        }
      }
    }

    const updatedThemes = [...themes];
    if (updatedThemes[selectedTopicIndex]) {
      // Sắp xếp tự nhiên theo ngày bắt đầu
      const sortedSubThemes = subThemes
        .filter((s) => s.name?.trim().length > 0)
        .slice()
        .sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));

      updatedThemes[selectedTopicIndex] = {
        ...updatedThemes[selectedTopicIndex],
        name: topicName.trim(),
        startDate,
        endDate,
        subThemes: sortedSubThemes,
        note,
      };
      setThemes(updatedThemes);
      setSubThemes(sortedSubThemes);
      setUpdatedAt(new Date().toLocaleDateString('vi-VN'));

      try {
        const res = await curriculumApi.updateThemeSetDetail({
          year: yearId.replace('-', '–'),
          ageGroup,
          themes: updatedThemes,
        });
        if (res?.themes && Array.isArray(res.themes)) {
          setThemes(res.themes);
          const curName = topicName.trim();
          const targetTheme = res.themes.find((t) => t.name === curName) || res.themes[selectedTopicIndex] || res.themes[0];
          const newIdx = res.themes.indexOf(targetTheme);
          if (newIdx !== -1) {
            setSelectedTopicIndex(newIdx);
            loadTopicIntoForm(targetTheme);
          }
        }
      } catch (err) {
        console.warn('Failed to save themes on server:', err);
      }

      toast.success(`Đã lưu thay đổi cho chủ đề "${topicName.trim()}"`);
    }
  };

  const handleTogglePublish = async () => {
    if (!isAllPublished) {
      // Kiểm tra tất cả chủ đề có ngày chưa xếp không
      const invalidTheme = themes.find((th) => {
        if (!th.startDate || !th.endDate) return true;
        const normSubs = normalizeSubThemes(th.subThemes);
        if (normSubs.length === 0) return true;
        for (let i = 0; i < normSubs.length; i++) {
          const cur = normSubs[i];
          if (!cur.startDate || !cur.endDate) return true;
          if (i === 0 && cur.startDate !== th.startDate) return true;
          if (i > 0) {
            const prev = normSubs[i - 1];
            if (cur.startDate !== addDaysToDate(prev.endDate, 1)) return true;
          }
        }
        const last = normSubs[normSubs.length - 1];
        return !last?.endDate || last.endDate !== th.endDate;
      });

      if (invalidTheme) {
        toast.error(
          `Không thể công bố: Chủ đề "${invalidTheme.name || invalidTheme.code}" vẫn còn ngày chưa được xếp nhánh.`,
        );
        return;
      }
    }

    const nextStatus = isAllPublished ? 'DRAFT' : 'PUBLISHED';
    setStatus(nextStatus);
    const updatedThemes = themes.map((t) => ({ ...t, status: nextStatus }));
    setThemes(updatedThemes);
    setUpdatedAt(new Date().toLocaleDateString('vi-VN'));

    try {
      await curriculumApi.updateThemeSetStatus({
        year: yearId.replace('-', '–'),
        ageGroup,
        status: nextStatus,
      });
      localStorage.setItem(`sorak_curriculum_${yearId}_${ageGroup}_status`, nextStatus);
    } catch (err) {
      console.warn('Failed to update theme set status on server:', err);
    }

    toast.success(
      nextStatus === 'PUBLISHED'
        ? 'Đã công bố toàn bộ chủ đề trong năm học cho khối này!'
        : 'Đã chuyển toàn bộ chủ đề về bản nháp (Được phép chỉnh sửa và lưu)',
    );
  };

  const handleDeleteCurrentTopic = async () => {
    if (isAllPublished) {
      toast.error('Không thể xóa chủ đề khi bộ chủ đề đã công bố.');
      return;
    }
    if (themes.length <= 1) {
      toast.error('Phải giữ lại ít nhất một chủ đề trong năm học.');
      return;
    }

    const curTopic = themes[selectedTopicIndex];
    const topicToDeleteName = curTopic?.name || `Chủ đề ${curTopic?.code || ''}`;

    const updated = themes.filter((_, idx) => idx !== selectedTopicIndex);
    const reindexed = updated.map((t, idx) => ({
      ...t,
      code: String(idx + 1).padStart(2, '0'),
    }));

    setThemes(reindexed);
    const nextIdx = Math.max(0, selectedTopicIndex - 1);
    setSelectedTopicIndex(nextIdx);
    if (reindexed[nextIdx]) {
      loadTopicIntoForm(reindexed[nextIdx]);
    }

    try {
      await curriculumApi.updateThemeSetDetail({
        year: yearId.replace('-', '–'),
        ageGroup,
        themes: reindexed,
      });
      toast.success(`Đã xóa "${topicToDeleteName}"`);
    } catch (err) {
      console.warn('Failed to sync deleted topic to server:', err);
      toast.error('Không thể xóa chủ đề. Vui lòng thử lại.');
    }
  };

  // Add new topic
  const handleAddNewTopic = () => {
    if (isAllPublished) {
      toast.warning('Bộ chủ đề đã công bố. Vui lòng gỡ công bố để thêm chủ đề mới.');
      return;
    }
    if (isAcademicYearFull) {
      toast.warning(
        `Các chủ đề đã phân bổ đủ cho toàn bộ năm học (đến ngày ${formatDateVn(academicYearBounds.end)}). Không thể thêm chủ đề mới.`,
      );
      return;
    }
    const nextCode = String(themes.length + 1).padStart(2, '0');
    const lastTheme = themes[themes.length - 1];
    const defaultStart = lastTheme?.endDate
      ? addDaysToDate(lastTheme.endDate, 1)
      : (academicYearBounds.start || '2026-09-05');

    if (academicYearBounds.end && defaultStart > academicYearBounds.end) {
      toast.warning(
        `Ngày bắt đầu (${formatDateVn(defaultStart)}) vượt quá ngày kết thúc năm học (${formatDateVn(academicYearBounds.end)}).`,
      );
      return;
    }

    // Chọn khoảng 2 tuần (14 ngày, từ defaultStart + 13 ngày)
    let defaultEnd = addDaysToDate(defaultStart, 13);
    if (academicYearBounds.end && defaultEnd > academicYearBounds.end) {
      defaultEnd = academicYearBounds.end;
    }

    const newTopic = {
      id: `th-${Date.now()}`,
      code: nextCode,
      name: `Chủ đề mới ${nextCode}`,
      startDate: defaultStart,
      endDate: defaultEnd,
      status: 'DRAFT',
      subThemes: [],
      note: '',
    };
    const updated = [...themes, newTopic];
    setThemes(updated);
    setSelectedTopicIndex(updated.length - 1);
    loadTopicIntoForm(newTopic);
    toast.success(`Đã thêm chủ đề mới ${nextCode} (${formatDateVn(defaultStart)} – ${formatDateVn(defaultEnd)})`);
  };

  // Auto select theme matching a target month
  const autoSelectTopicForMonth = (year, month) => {
    const monthStart = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const daysInM = new Date(year, month + 1, 0).getDate();
    const monthEnd = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInM).padStart(2, '0')}`;

    // If current selected topic is active in this month, retain it
    const cur = themes[selectedTopicIndex];
    if (cur?.startDate && cur?.endDate && !(cur.endDate < monthStart || cur.startDate > monthEnd)) {
      return;
    }

    // Find first topic overlapping this month
    const matchedIdx = themes.findIndex((t) => {
      if (!t.startDate || !t.endDate) return false;
      return !(t.endDate < monthStart || t.startDate > monthEnd);
    });

    if (matchedIdx !== -1) {
      setSelectedTopicIndex(matchedIdx);
      loadTopicIntoForm(themes[matchedIdx]);
    }
  };

  // Calendar Days computation cho cả 2 tháng liên tiếp
  const month2Year = calendarMonth === 11 ? calendarYear + 1 : calendarYear;
  const month2 = calendarMonth === 11 ? 0 : calendarMonth + 1;

  // Giới hạn điều hướng tháng trong năm học
  const { minYear, minMonth, maxYear, maxMonth } = useMemo(() => {
    const startParts = (academicYearBounds.start || '2026-09-05').split('-').map(Number);
    const endParts = (academicYearBounds.end || '2027-05-31').split('-').map(Number);
    return {
      minYear: startParts[0] || 2026,
      minMonth: (startParts[1] || 9) - 1,
      maxYear: endParts[0] || 2027,
      maxMonth: (endParts[1] || 5) - 1,
    };
  }, [academicYearBounds]);

  const isPrevDisabled = calendarYear < minYear || (calendarYear === minYear && calendarMonth <= minMonth);
  const isNextDisabled = month2Year > maxYear || (month2Year === maxYear && month2 >= maxMonth);

  // Calendar Navigation
  const handlePrevMonth = () => {
    if (isPrevDisabled) return;
    let newYear = calendarYear;
    let newMonth = calendarMonth;
    if (calendarMonth === 0) {
      newMonth = 11;
      newYear = calendarYear - 1;
    } else {
      newMonth = calendarMonth - 1;
    }
    setCalendarYear(newYear);
    setCalendarMonth(newMonth);
    autoSelectTopicForMonth(newYear, newMonth);
  };

  const handleNextMonth = () => {
    if (isNextDisabled) return;
    let newYear = calendarYear;
    let newMonth = calendarMonth;
    if (calendarMonth === 11) {
      newMonth = 0;
      newYear = calendarYear + 1;
    } else {
      newMonth = calendarMonth + 1;
    }
    setCalendarYear(newYear);
    setCalendarMonth(newMonth);
    autoSelectTopicForMonth(newYear, newMonth);
  };

  // Click on date in calendar to auto select corresponding theme OR toggle sub-theme
  const handleDateClick = (dateStr) => {
    const matchedIdx = themes.findIndex(
      (t) => t.startDate && t.endDate && dateStr >= t.startDate && dateStr <= t.endDate,
    );
    if (matchedIdx !== -1) {
      if (matchedIdx !== selectedTopicIndex) {
        setSelectedTopicIndex(matchedIdx);
        loadTopicIntoForm(themes[matchedIdx]);
      } else {
        // Trong chủ đề hiện tại: Nếu bấm vào ngày thuộc một chủ đề nhánh, chọn / bỏ chọn nhánh đó
        const subIdx = subThemes.findIndex(
          (st) => st.startDate && st.endDate && dateStr >= st.startDate && dateStr <= st.endDate,
        );
        if (subIdx !== -1) {
          setActiveSubThemeIndex((prev) => (prev === subIdx ? null : subIdx));
        }
      }
    }
  };

  const calendarDaysM1 = useMemo(
    () => generateMonthDays(calendarYear, calendarMonth),
    [calendarYear, calendarMonth],
  );

  const calendarDaysM2 = useMemo(
    () => generateMonthDays(month2Year, month2),
    [month2Year, month2],
  );

  const activeTopic = themes[selectedTopicIndex] || { code: '01', name: '' };
  const activeBranch = activeSubThemeIndex !== null ? subThemes[activeSubThemeIndex] : null;

  const publishedCount = useMemo(
    () => themes.filter((t) => t.status === 'PUBLISHED').length,
    [themes],
  );
  const draftCount = useMemo(
    () => themes.filter((t) => t.status === 'DRAFT').length,
    [themes],
  );

  return (
    <div
      className="w-full flex-1 flex flex-col bg-background text-foreground select-none"
      data-node-id="4772:9956"
      data-name="Curriculum Theme Detail Page"
    >
      {/* Main Workspace (3 columns layout: Topics Navigator + Topic Editor + Topic Settings Sidebar) */}
      <div className="flex flex-1 overflow-hidden h-[calc(100vh-56px)]">
        {/* Left Column: Topics Navigator (Figma 4772:10358) */}
        <div className="w-[260px] shrink-0 border-r border-border bg-card flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-border/80">
            <h2 className="text-[17px] font-semibold text-foreground tracking-tight">
              {t('curriculum.topicList')}
            </h2>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              Các chủ đề giáo dục được phân bổ trong năm học
            </p>
          </div>

          {/* Button: Thêm chủ đề */}
          <div className="p-3 border-b border-border/60">
            <Button
              type="button"
              variant="outline"
              disabled={isAllPublished || isAcademicYearFull}
              onClick={handleAddNewTopic}
              className={cn(
                'w-full h-8 border border-border text-[13px] font-medium rounded-none flex items-center justify-center gap-1.5 shadow-none transition-colors',
                (isAllPublished || isAcademicYearFull)
                  ? 'opacity-50 cursor-not-allowed bg-muted/40 text-muted-foreground'
                  : 'hover:bg-muted cursor-pointer',
              )}
              title={
                isAllPublished
                  ? 'Vui lòng gỡ công bố để thêm chủ đề mới'
                  : isAcademicYearFull
                  ? `Đã phân bổ kín toàn bộ năm học (đến ngày ${formatDateVn(academicYearBounds.end)}). Không thể thêm chủ đề mới.`
                  : t('curriculum.createTheme')
              }
            >
              <HugeiconsIcon icon={PlusSignIcon} size={14} />
              <span>{isAcademicYearFull ? 'Đã đủ chủ đề năm học' : t('curriculum.createTheme')}</span>
            </Button>
          </div>

          {/* Topic List */}
          <div className="flex-1 overflow-y-auto divide-y divide-border/40">
            {themes.map((topic, idx) => {
              const isSelected = selectedTopicIndex === idx;
              const isPub = topic.status === 'PUBLISHED';

              return (
                <div
                  key={topic.id || idx}
                  onClick={() => handleSelectTopic(idx)}
                  className={cn(
                    'flex items-center gap-3 px-3.5 py-3 cursor-pointer transition-colors select-none text-left',
                    isSelected
                      ? 'bg-muted/70 font-semibold'
                      : 'hover:bg-muted/40 text-foreground',
                  )}
                >
                  {/* Topic Index square badge */}
                  <div
                    className={cn(
                      'size-7 rounded-none flex items-center justify-center text-[12px] font-semibold shrink-0 overflow-hidden',
                      isSelected
                        ? 'bg-[#1447e6] text-white'
                        : 'bg-muted text-muted-foreground border border-border/60',
                    )}
                  >
                    {(() => {
                      const c = String(topic.code || '');
                      const match = c.match(/(\d+)$/);
                      return match ? match[1].padStart(2, '0') : String(idx + 1).padStart(2, '0');
                    })()}
                  </div>

                  {/* Topic info: Name + Date Range */}
                  <div className="flex flex-col min-w-0 flex-1 leading-tight">
                    <span className="text-[13.5px] truncate text-foreground">
                      {topic.name}
                    </span>
                    <span className="text-[11.5px] text-muted-foreground font-normal mt-0.5">
                      {formatDateVn(isSelected ? (startDate || topic.startDate) : topic.startDate)?.slice(0, 5)} – {formatDateVn(isSelected ? (endDate || topic.endDate) : topic.endDate)?.slice(0, 5)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Middle Column: Topic Editor (Figma 4772:10428) */}
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
          {/* Scrollable content area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Header: Title, Subtitle + Integrated Controls */}
            <div className="flex items-center justify-between pb-4 border-b border-border/60">
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-[24px] font-semibold text-foreground tracking-tight truncate">
                    {topicName || t('curriculum.tabThemes')}
                  </h1>
                  <span
                    className={cn(
                      'px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase rounded-none shrink-0',
                      isAllPublished
                        ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30'
                        : 'bg-muted text-muted-foreground border border-border',
                    )}
                  >
                    {isAllPublished ? t('curriculum.published', 'Đã công bố') : t('curriculum.draft', 'Bản nháp')}
                  </span>
                </div>
                <p className="text-[13px] text-muted-foreground font-normal mt-0.5">
                  Thiết lập khung thời gian thực hiện và cấu trúc chủ đề nhánh
                </p>
              </div>

              {/* Top Right Controls: Toggle Lịch & Nút Xóa chủ đề */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowRightSidebar(!showRightSidebar)}
                  className={cn(
                    'size-8 flex items-center justify-center border border-border transition-colors cursor-pointer rounded-none',
                    showRightSidebar
                      ? 'bg-muted text-foreground'
                      : 'bg-background text-muted-foreground hover:text-foreground hover:bg-muted/50',
                  )}
                  title={showRightSidebar ? 'Thu gọn lịch' : 'Mở lịch & tiến độ'}
                >
                  <HugeiconsIcon icon={SidebarRightIcon} size={15} />
                </button>

                <button
                  type="button"
                  onClick={handleDeleteCurrentTopic}
                  disabled={isAllPublished}
                  className="size-8 flex items-center justify-center border border-border bg-background hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer rounded-none disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Xóa chủ đề này"
                >
                  <HugeiconsIcon icon={Delete02Icon} size={16} />
                </button>
              </div>
            </div>

            {/* Card 1: Thông tin chủ đề (Figma 4772:10432) */}
            <div className="border border-border bg-card p-5 rounded-none space-y-4 shadow-2xs">
              <div className="flex flex-col gap-0.5">
                <h2 className="text-[14.5px] font-semibold text-foreground">
                  {t('curriculum.topicInfo')}
                </h2>
              </div>

              <div className="space-y-4 pt-1">
                {/* Field: Tên chủ đề */}
                <div className="space-y-1.5">
                  <label className="text-[12.5px] font-medium text-foreground">
                    {t('curriculum.topicName')}
                  </label>
                  <input
                    ref={topicNameInputRef}
                    type="text"
                    value={topicName}
                    onChange={(e) => setTopicName(e.target.value)}
                    disabled={isAllPublished}
                    placeholder={t('curriculum.topicName')}
                    className={cn(
                      'w-full h-8 px-3 bg-background border border-border text-[13px] text-foreground rounded-none outline-none focus:border-primary transition-colors',
                      isAllPublished && 'bg-muted/40 text-muted-foreground cursor-not-allowed',
                    )}
                  />
                </div>

                {/* Timing Fields: Ngày bắt đầu, Ngày kết thúc */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[12.5px] font-medium text-foreground">
                      {t('curriculum.startDate')}
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      min={themeDateBounds.minAllowedStart || undefined}
                      max={themeDateBounds.maxAllowedStart || undefined}
                      onChange={(e) => handleStartDateChange(e.target.value)}
                      disabled={isAllPublished || (Array.isArray(subThemes) && subThemes.length > 0)}
                      className={cn(
                        'w-full h-8 px-3 bg-background border border-border text-[13px] font-mono text-foreground rounded-none outline-none focus:border-primary transition-colors',
                        (isAllPublished || (Array.isArray(subThemes) && subThemes.length > 0)) &&
                          'bg-muted/40 text-muted-foreground cursor-not-allowed',
                      )}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[12.5px] font-medium text-foreground">
                      {t('curriculum.endDate')}
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      min={themeDateBounds.minAllowedEnd || undefined}
                      max={themeDateBounds.maxAllowedEnd || undefined}
                      onChange={(e) => handleEndDateChange(e.target.value)}
                      disabled={isAllPublished || (Array.isArray(subThemes) && subThemes.length > 0)}
                      className={cn(
                        'w-full h-8 px-3 bg-background border border-border text-[13px] font-mono text-foreground rounded-none outline-none focus:border-primary transition-colors',
                        (isAllPublished || (Array.isArray(subThemes) && subThemes.length > 0)) &&
                          'bg-muted/40 text-muted-foreground cursor-not-allowed',
                      )}
                    />
                  </div>
                </div>

                {Array.isArray(subThemes) && subThemes.length > 0 && (
                  <p className="text-[12px] text-muted-foreground pt-0.5 select-none">
                    Thời gian chủ đề được khóa tự động theo {subThemes.length} chủ đề nhánh.
                  </p>
                )}
              </div>
            </div>

            {/* Card 2: Nhánh chủ đề (Clean theo thiết kế Figma) */}
            <div className="border border-border bg-card p-5 rounded-none space-y-4 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b border-border/60">
                <div className="flex flex-col gap-0.5">
                  <h2 className="text-[14.5px] font-semibold text-foreground">
                    {t('curriculum.subThemes', 'Nhánh chủ đề')}
                  </h2>
                  <p className="text-[12px] text-muted-foreground">
                    Một chủ đề có thể có nhiều chủ đề nhánh.
                  </p>
                </div>

                {/* Nút cài đặt chủ đề nhánh (icon bánh răng) & Nút Thêm nhánh */}
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddSubTheme}
                    disabled={isAllPublished}
                    className="h-8 px-2.5 text-[12.5px] font-medium border-border hover:bg-muted text-foreground rounded-none cursor-pointer shadow-none flex items-center gap-1.5"
                    title="Thêm chủ đề nhánh mới"
                  >
                    <HugeiconsIcon icon={PlusSignIcon} size={14} />
                    <span>Thêm chủ đề nhánh</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      navigate(
                        `/curriculum/themes/${yearId}/${ageGroup}/${activeTopic.id || activeTopic.code || selectedTopicIndex + 1}`,
                        {
                          state: {
                            theme: {
                              ...activeTopic,
                              id: activeTopic.id || activeTopic.code || String(selectedTopicIndex + 1),
                              code: activeTopic.code || String(selectedTopicIndex + 1).padStart(2, '0'),
                              name: topicName || activeTopic.name,
                              startDate: startDate || activeTopic.startDate,
                              endDate: endDate || activeTopic.endDate,
                              subThemes: subThemes || activeTopic.subThemes || [],
                              note,
                              status,
                            },
                            themes: themes.map((t, idx) =>
                              idx === selectedTopicIndex
                                ? {
                                    ...t,
                                    id: t.id || t.code || String(idx + 1),
                                    code: t.code || String(idx + 1).padStart(2, '0'),
                                    name: topicName || t.name,
                                    startDate: startDate || t.startDate,
                                    endDate: endDate || t.endDate,
                                    subThemes: subThemes || t.subThemes || [],
                                    note,
                                    status,
                                  }
                                : t,
                            ),
                            selectedTopicIndex,
                          },
                        },
                      )
                    }
                    title="Cài đặt chi tiết chủ đề nhánh"
                    className="size-8 border-border hover:bg-muted text-foreground rounded-none cursor-pointer shadow-none shrink-0"
                  >
                    <HugeiconsIcon icon={Settings02Icon} size={15} />
                  </Button>
                </div>
              </div>

              {/* Danh sách các nhánh hiển thị clean, phẳng theo Figma */}
              <div className="space-y-2 pt-1">
                {subThemes.length === 0 ? (
                  <div className="py-7 px-4 text-center border border-dashed border-border/80 text-[12.5px] text-muted-foreground bg-muted/10 space-y-3">
                    <p className="italic">Chủ đề này chưa có chủ đề nhánh nào.</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddSubTheme}
                      disabled={isAllPublished}
                      className="h-8 px-3 text-[12.5px] font-medium border-border hover:bg-muted text-foreground rounded-none cursor-pointer shadow-none inline-flex items-center gap-1.5"
                    >
                      <HugeiconsIcon icon={PlusSignIcon} size={14} />
                      <span>Thêm chủ đề nhánh đầu tiên</span>
                    </Button>
                  </div>
                ) : (
                  <div className="divide-y divide-border/60 border border-border bg-background">
                    {subThemes.map((branch, bIdx) => {
                      const hasDates = branch.startDate && branch.endDate;
                      let durationDays = 0;
                      if (hasDates) {
                        const diffTime = Math.abs(new Date(branch.endDate) - new Date(branch.startDate));
                        durationDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                      }
                      const isSelected = activeSubThemeIndex === bIdx;

                      return (
                        <div
                          key={branch.id || bIdx}
                          onClick={() => {
                            if (isSelected) {
                              setActiveSubThemeIndex(null);
                            } else {
                              setActiveSubThemeIndex(bIdx);
                              // Tự động chuyển lịch sang tháng của nhánh nếu có
                              if (branch.startDate) {
                                const parts = branch.startDate.split('-').map(Number);
                                if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                                  setCalendarYear(parts[0]);
                                  setCalendarMonth(parts[1] - 1);
                                }
                              }
                            }
                          }}
                          className={cn(
                            'px-4 py-2.5 flex items-center justify-between gap-3 cursor-pointer transition-all select-none',
                            isSelected
                              ? 'bg-[#1447e6]/8 text-[#1447e6]'
                              : 'hover:bg-muted/40 text-foreground',
                          )}
                          title={isSelected ? 'Bấm để bỏ chọn nhánh này' : 'Bấm để xem nhánh này trên lịch'}
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span
                              className={cn(
                                'text-[13px] truncate transition-colors',
                                isSelected ? 'font-bold text-[#1447e6]' : 'font-medium text-foreground',
                              )}
                              title={branch.name || 'Chủ đề nhánh'}
                            >
                              {branch.name || 'Chủ đề nhánh'}
                            </span>
                          </div>

                          <div className="flex items-center shrink-0">
                            {hasDates ? (
                              <span
                                className={cn(
                                  'text-[12.5px] tabular-nums transition-colors',
                                  isSelected
                                    ? 'text-[#1447e6] font-semibold'
                                    : 'text-muted-foreground font-normal',
                                )}
                              >
                                {formatDateRangeDdMm(branch.startDate, branch.endDate)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground/60 italic text-[12px]">
                                Chưa xếp ngày
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {subThemes.length > 0 && (
                      <div className="p-2 border-t border-border/40 bg-muted/20 flex justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleAddSubTheme}
                          disabled={isAllPublished}
                          className="h-7 px-2.5 text-[12px] font-medium text-foreground hover:bg-muted rounded-none cursor-pointer flex items-center gap-1"
                        >
                          <HugeiconsIcon icon={PlusSignIcon} size={13} />
                          <span>Thêm nhánh tiếp theo</span>
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Card 3: Ghi chú chủ đề (Figma 4772:10575) */}
            <div className="border border-border bg-card p-5 rounded-none space-y-3 shadow-2xs">
              <div className="flex flex-col gap-0.5">
                <h2 className="text-[14.5px] font-semibold text-foreground">
                  {t('curriculum.note')}
                </h2>
                <p className="text-[12px] text-muted-foreground">
                  {t('curriculum.noteDesc')}
                </p>
              </div>

              <textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                disabled={isAllPublished}
                placeholder={t('curriculum.note')}
                className={cn(
                  'w-full p-3 bg-background border border-border text-[13px] text-foreground rounded-none outline-none focus:border-primary transition-colors resize-none placeholder:text-muted-foreground',
                  isAllPublished && 'bg-muted/40 text-muted-foreground cursor-not-allowed',
                )}
              />
            </div>

          </div>

          {/* Bottom Action Bar: Chỉ hiển thị ở cột giữa nếu đã thu gọn sidebar lịch */}
          {!showRightSidebar && (
            <div className="p-3 px-6 bg-card border-t border-border flex items-center justify-between shrink-0 select-none">
              <div className="text-[12px] text-muted-foreground">
                <span>Cập nhật: {updatedAt}</span>
              </div>

              <div className="flex items-center gap-2.5">
                {isAllPublished ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleTogglePublish}
                    className="h-8 px-3 border border-border bg-card hover:bg-muted text-foreground text-[12.5px] font-normal rounded-none shadow-none cursor-pointer flex items-center gap-1.5 transition-colors"
                  >
                    <HugeiconsIcon icon={Cancel01Icon} size={13} className="text-muted-foreground" />
                    <span>Gỡ công bố</span>
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleTogglePublish}
                    className="h-8 px-3 border border-border bg-card hover:bg-muted text-foreground text-[12.5px] font-normal rounded-none shadow-none cursor-pointer flex items-center gap-1.5 transition-colors"
                  >
                    <HugeiconsIcon icon={SentIcon} size={13} className="text-muted-foreground" />
                    <span>Công bố bộ chủ đề</span>
                  </Button>
                )}

                <Button
                  type="button"
                  onClick={handleSaveTopic}
                  disabled={!canSave}
                  className={cn(
                    'h-8 px-4 text-[12.5px] font-medium rounded-none shadow-none flex items-center gap-1.5 transition-colors',
                    canSave
                      ? 'bg-[#1447e6] hover:bg-[#1447e6]/90 text-white cursor-pointer'
                      : 'bg-muted text-muted-foreground border border-border cursor-not-allowed opacity-60',
                  )}
                  title={
                    isAllPublished
                      ? 'Không thể lưu khi bộ chủ đề đã công bố'
                      : hasUnassignedDaysInTheme
                        ? `Chỉ có thể lưu khi đã phân bổ hết tất cả các ngày trong chủ đề (từ ${formatDateVn(startDate)} đến ${formatDateVn(endDate)})`
                        : !hasChanges
                          ? 'Chưa có thay đổi để lưu'
                          : 'Lưu thay đổi'
                  }
                >
                  <HugeiconsIcon icon={CheckmarkCircle01Icon} size={14} />
                  <span>{t('common.saveChanges', 'Lưu thay đổi')}</span>
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Topic Settings & Calendar Sidebar */}
        {showRightSidebar && (
          <div className="w-[330px] shrink-0 border-l border-border bg-card overflow-y-auto h-full">
            {/* Section: Lịch chủ đề 2 tháng liên tiếp */}
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
                      : 'cursor-pointer'
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
                      : 'cursor-pointer'
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
                        // Nếu là ngày ngoài tháng (trailing/leading days của tháng khác), chỉ hiện số mờ không tô màu
                        // để tránh trùng lặp ngày giữa 2 tháng!
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

                        const col = i % 7; // 0 = T2, ..., 6 = CN
                        const normStart = (startDate || '').slice(0, 10);
                        const normEnd = (endDate || '').slice(0, 10);
                        const isSelectedDate = Boolean(
                          normStart && normEnd && d.dateStr >= normStart && d.dateStr <= normEnd,
                        );

                        // Phân biệt: Ngày ngoài năm học vs Ngày trong năm học nhưng chưa có chủ đề
                        const isOutsideAcademicYear = Boolean(
                          academicYearBounds.start &&
                          academicYearBounds.end &&
                          (d.dateStr < academicYearBounds.start || d.dateStr > academicYearBounds.end),
                        );

                        // If not in selected theme, check other themes
                        const otherTheme = !isSelectedDate ? getThemeForDate(d.dateStr) : null;
                        const isInOtherTheme = Boolean(otherTheme);

                        // Ngày trong năm học nhưng chưa thuộc chủ đề nào
                        const isUnassignedInAcademicYear = Boolean(
                          !isOutsideAcademicYear && !isSelectedDate && !isInOtherTheme,
                        );

                        // Consecutive connectivity in the same week row
                        const prevObj = col > 0 ? mObj.days[i - 1] : null;
                        const nextObj = col < 6 ? mObj.days[i + 1] : null;
                        const prevDate = prevObj?.isCurrentMonth ? prevObj.dateStr : null;
                        const nextDate = nextObj?.isCurrentMonth ? nextObj.dateStr : null;

                        // Other theme connectivity
                        const prevTheme = prevDate ? getThemeForDate(prevDate) : null;
                        const nextTheme = nextDate ? getThemeForDate(nextDate) : null;
                        const prevSameOtherTheme = Boolean(
                          isInOtherTheme && prevTheme && (prevTheme.id === otherTheme?.id || prevTheme.code === otherTheme?.code),
                        );
                        const nextSameOtherTheme = Boolean(
                          isInOtherTheme && nextTheme && (nextTheme.id === otherTheme?.id || nextTheme.code === otherTheme?.code),
                        );

                        // Sub-theme matching
                        const matchedSubTheme = isSelectedDate ? getSubThemeForDate(d.dateStr) : null;
                        const matchedSubIdx = matchedSubTheme
                          ? subThemes.findIndex((st) => st.id === matchedSubTheme.id)
                          : -1;
                        const isSubThemeStart = Boolean(matchedSubTheme && d.dateStr === matchedSubTheme.startDate);

                        // Phân loại: Ngày đã có nhánh vs Chưa xếp nhánh
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

                        // Kiểm tra ngày có thuộc nhánh đang chọn hay không
                        const isDateInActiveBranch = Boolean(
                          activeBranch?.startDate &&
                          activeBranch?.endDate &&
                          d.dateStr >= activeBranch.startDate &&
                          d.dateStr <= activeBranch.endDate,
                        );

                        const prevInActiveBranch = Boolean(
                          isDateInActiveBranch &&
                          col > 0 &&
                          prevDate &&
                          activeBranch?.startDate &&
                          activeBranch?.endDate &&
                          prevDate >= activeBranch.startDate &&
                          prevDate <= activeBranch.endDate,
                        );
                        const nextInActiveBranch = Boolean(
                          isDateInActiveBranch &&
                          col < 6 &&
                          nextDate &&
                          activeBranch?.startDate &&
                          activeBranch?.endDate &&
                          nextDate >= activeBranch.startDate &&
                          nextDate <= activeBranch.endDate,
                        );

                        return (
                          <div
                            key={i}
                            onClick={() => {
                              if (isOutsideAcademicYear || !isSelectedDate) return;
                              handleDateClick(d.dateStr);
                            }}
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
                                    ? `Ngày ${formatDateVn(d.dateStr)} · Chủ đề: ${topicName} · Nhánh: ${matchedSubTheme.name}`
                                    : isUnassignedInTheme
                                      ? `Ngày ${formatDateVn(d.dateStr)} · Chủ đề: ${topicName} (Chưa xếp nhánh)`
                                      : isInOtherTheme
                                        ? `Ngày ${formatDateVn(d.dateStr)} · Chủ đề: ${otherTheme.name} (Khoá)`
                                        : `Ngày ${formatDateVn(d.dateStr)} · Ngoài thời gian chủ đề này (Khoá)`
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
                                  'absolute inset-y-0.5 bg-slate-200 dark:bg-slate-800 transition-colors group-hover/day:bg-slate-300 dark:group-hover/day:bg-slate-700',
                                  prevSameOtherTheme ? 'left-0' : 'left-0.5',
                                  nextSameOtherTheme ? 'right-0' : 'right-0.5',
                                )}
                              />
                            )}

                            {/* Nhánh đang chọn: Nâng sáng nhẹ + Viền trắng mỏng liền mạch */}
                            {isDateInActiveBranch && (
                              <div
                                className={cn(
                                  'absolute inset-y-0.5 bg-white/18 border-y border-white/85 z-15 pointer-events-none',
                                  prevInActiveBranch ? 'left-0' : 'left-0.5 border-l',
                                  nextInActiveBranch ? 'right-0' : 'right-0.5 border-r',
                                )}
                              />
                            )}

                            {/* Badge mốc bắt đầu của chủ đề nhánh (N1, N2, ...) */}
                            {isSubThemeStart && matchedSubIdx !== -1 && (
                              <span
                                className={cn(
                                  'absolute top-0.5 left-0.5 z-20 text-[8px] font-mono font-bold leading-none px-0.5 py-0.2 rounded-none shadow-xs transition-colors',
                                  activeSubThemeIndex === matchedSubIdx
                                    ? 'bg-white text-[#1447e6] ring-1 ring-[#1447e6]/40 font-extrabold shadow-sm'
                                    : 'bg-slate-900 text-white',
                                )}
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

              {/* Thanh chú thích tinh gọn & sạch sẽ */}
              <div className="pt-2.5 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 shrink-0" title="Chủ đề đang xem">
                    <span className="size-2.5 bg-[#1447e6] shrink-0" />
                    <span className="font-medium text-foreground/85">Chủ đề này</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0" title="Chưa xếp nhánh">
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
                      className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
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

              {/* Thanh thao tác: Cập nhật, Công bố & Lưu thay đổi (Nằm sát ngay dưới lịch, dính liền không hở khoảng trắng) */}
              <div className="pt-2.5 border-t border-border/70 space-y-2 select-none">
                <div className="flex items-center justify-between text-[12px] text-muted-foreground">
                  <span>Cập nhật: {updatedAt}</span>
                </div>

                <div className="flex items-center gap-2">
                  {isAllPublished ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleTogglePublish}
                      className="flex-1 h-8 px-2 border border-border bg-card hover:bg-muted text-foreground text-[12px] font-normal rounded-none shadow-none cursor-pointer flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <HugeiconsIcon icon={Cancel01Icon} size={13} className="text-muted-foreground" />
                      <span>Gỡ công bố</span>
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleTogglePublish}
                      className="flex-1 h-8 px-2 border border-border bg-card hover:bg-muted text-foreground text-[12px] font-normal rounded-none shadow-none cursor-pointer flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <HugeiconsIcon icon={SentIcon} size={13} className="text-muted-foreground" />
                      <span>Công bố bộ chủ đề</span>
                    </Button>
                  )}

                  <Button
                    type="button"
                    onClick={handleSaveTopic}
                    disabled={!canSave}
                    className={cn(
                      'flex-1 h-8 px-2.5 text-[12px] font-medium rounded-none shadow-none flex items-center justify-center gap-1.5 transition-colors',
                      canSave
                        ? 'bg-[#1447e6] hover:bg-[#1447e6]/90 text-white cursor-pointer'
                        : 'bg-muted text-muted-foreground border border-border cursor-not-allowed opacity-60',
                    )}
                    title={
                      isAllPublished
                        ? 'Không thể lưu khi bộ chủ đề đã công bố'
                        : hasUnassignedDaysInTheme
                          ? `Chỉ có thể lưu khi đã phân bổ hết tất cả các ngày trong chủ đề (từ ${formatDateVn(startDate)} đến ${formatDateVn(endDate)})`
                          : !hasChanges
                            ? 'Chưa có thay đổi để lưu'
                            : 'Lưu thay đổi'
                    }
                  >
                    <HugeiconsIcon icon={CheckmarkCircle01Icon} size={14} />
                    <span>{t('common.saveChanges', 'Lưu thay đổi')}</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CurriculumThemeDetailPage;
