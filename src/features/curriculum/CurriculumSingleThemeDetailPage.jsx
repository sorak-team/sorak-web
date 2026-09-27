import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  PlusSignIcon,
  Delete02Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  CheckmarkCircle01Icon,
  Cancel01Icon,
  SidebarRightIcon,
  InformationCircleIcon,
} from '@hugeicons/core-free-icons';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/shared/lib/utils';
import { toast } from 'sonner';
import { curriculumApi } from './curriculum.api';
import { useCurriculumStore } from './curriculum.store';

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

export function CurriculumSingleThemeDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { yearId = '2025-2026', ageGroup = 'nhatre', themeId = '02' } = useParams();

  const [isLoading, setIsLoading] = useState(true);
  const [themes, setThemes] = useState([]);
  const [themeSetInfo, setThemeSetInfo] = useState(null);
  const [currentThemeIndex, setCurrentThemeIndex] = useState(0);

  // Form state for current theme
  const [subThemes, setSubThemes] = useState([]);
  const [originalSubThemes, setOriginalSubThemes] = useState([]);
  const [themeName, setThemeName] = useState('');
  const [themeCode, setThemeCode] = useState('02');
  const [startDate, setStartDate] = useState('2025-09-22');
  const [endDate, setEndDate] = useState('2025-10-12');
  const [status, setStatus] = useState('DRAFT');
  const [updatedAt, setUpdatedAt] = useState('13/10/2026');

  // Interactive calendar scheduling state
  const [activeSubThemeIndex, setActiveSubThemeIndex] = useState(null);

  // Calendar month state
  const [calendarYear, setCalendarYear] = useState(2025);
  const [calendarMonth, setCalendarMonth] = useState(8); // September (0-indexed: 8)
  const [showRightSidebar, setShowRightSidebar] = useState(true);

  const setActiveThemeName = useCurriculumStore((s) => s.setActiveThemeName);
  const setStoreThemes = useCurriculumStore((s) => s.setThemes);

  useEffect(() => {
    if (themeName) {
      setActiveThemeName(themeName);
    }
  }, [themeName, setActiveThemeName]);

  useEffect(() => {
    return () => {
      setActiveThemeName('');
    };
  }, [setActiveThemeName]);

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
        let themeList = data.themes || [];
        if (data.info?.updatedAt) {
          setUpdatedAt(data.info.updatedAt);
        }
        const localStatus = localStorage.getItem(`sorak_curriculum_${yearId}_${ageGroup}_status`);
        if (localStatus) {
          themeList = themeList.map((t) => ({ ...t, status: localStatus }));
        }
        setThemes(themeList);
        setStoreThemes(themeList);

        if (themeList.length > 0) {
          // Find target theme by ID or by Code or by index
          let foundIdx = themeList.findIndex(
            (th) => th.id === themeId || th.code === themeId,
          );
          if (foundIdx === -1) {
            const numeric = parseInt(themeId, 10);
            if (!isNaN(numeric) && numeric >= 1 && numeric <= themeList.length) {
              foundIdx = numeric - 1;
            } else {
              foundIdx = 1; // Default to index 1 (Gia đình)
            }
          }

          setCurrentThemeIndex(foundIdx);
          const current = themeList[foundIdx];
          if (current) {
            setThemeName(current.name || '');
            const rawC = String(current.code || '');
            const matchC = rawC.match(/(\d+)$/);
            setThemeCode(matchC ? matchC[1].padStart(2, '0') : String(foundIdx + 1).padStart(2, '0'));
            setStartDate(current.startDate || '2025-09-22');
            setEndDate(current.endDate || '2025-10-12');
            setStatus(current.status || localStatus || 'DRAFT');
            const normalized = normalizeSubThemes(current.subThemes);
            setSubThemes(normalized);
            setOriginalSubThemes(normalized);
            if (normalized.length > 0) {
              setActiveSubThemeIndex(0);
            }

            // Auto navigate calendar to start date month
            if (current.startDate) {
              const parts = current.startDate.split('-').map(Number);
              if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                setCalendarYear(parts[0]);
                setCalendarMonth(parts[1] - 1);
              }
            }
          }
        }
      } catch (err) {
        console.warn('Failed to load theme details:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchDetail();
  }, [yearId, ageGroup, themeId]);

  const activeTopic = themes[currentThemeIndex] || {
    id: themeId,
    code: themeCode,
    name: themeName,
    startDate,
    endDate,
    status,
  };

  const isAllPublished = useMemo(
    () => themes.length > 0 && themes.every((t) => t.status === 'PUBLISHED'),
    [themes],
  );

  const [isEditingThemeName, setIsEditingThemeName] = useState(false);
  const [editedThemeName, setEditedThemeName] = useState('');

  const handleSaveThemeName = () => {
    const trimmed = (editedThemeName || '').trim();
    if (!trimmed) {
      toast.error('Tên chủ đề không được để trống.');
      return;
    }
    setThemeName(trimmed);
    setActiveThemeName(trimmed);
    // Cập nhật danh sách themes cục bộ
    setThemes((prev) =>
      prev.map((t, idx) => (idx === currentThemeIndex ? { ...t, name: trimmed } : t)),
    );
    // Đồng bộ API nếu có
    try {
      curriculumApi
        .updateThemeSetDetail({
          year: yearId.replace('-', '–'),
          ageGroup,
          theme: {
            id: activeTopic.id,
            code: themeCode,
            name: trimmed,
            startDate,
            endDate,
            subThemes,
          },
        })
        .catch((e) => console.warn('API sync warning:', e));
    } catch (err) {
      console.warn('Error updating theme name:', err);
    }
    setIsEditingThemeName(false);
    toast.success(`Đã đổi tên chủ đề thành "${trimmed}"`);
  };

  const handleDeleteTheme = async () => {
    if (isAllPublished) {
      toast.error('Không thể xóa chủ đề khi bộ chủ đề đã công bố.');
      return;
    }
    if (themes.length <= 1) {
      toast.error('Phải giữ lại ít nhất một chủ đề trong năm học.');
      return;
    }

    const curTopic = themes[currentThemeIndex];
    const topicToDeleteName = curTopic?.name || `Chủ đề ${curTopic?.code || ''}`;

    const updated = themes.filter((_, idx) => idx !== currentThemeIndex);
    const reindexed = updated.map((t, idx) => ({
      ...t,
      code: String(idx + 1).padStart(2, '0'),
    }));

    try {
      await curriculumApi.updateThemeSetDetail({
        year: yearId.replace('-', '–'),
        ageGroup,
        themes: reindexed,
      });
      toast.success(`Đã xóa "${topicToDeleteName}"`);
      navigate(`/curriculum/themes/${yearId}/${ageGroup}`);
    } catch (err) {
      console.warn('Failed to delete theme:', err);
      toast.error('Không thể xóa chủ đề. Vui lòng thử lại.');
    }
  };

  // Chuyển chủ đề lớn nhanh (theo index trong mảng themes)
  const navigateToThemeIndex = useCallback(
    (idx) => {
      if (idx < 0 || idx >= themes.length) return;
      const targetTheme = themes[idx];
      const targetId = targetTheme.id || targetTheme.code || idx + 1;
      navigate(`/curriculum/themes/${yearId}/${ageGroup}/${targetId}`);
    },
    [themes, yearId, ageGroup, navigate],
  );

  const handlePrevTheme = useCallback(() => {
    if (currentThemeIndex > 0) {
      navigateToThemeIndex(currentThemeIndex - 1);
    }
  }, [currentThemeIndex, navigateToThemeIndex]);

  const handleNextTheme = useCallback(() => {
    if (currentThemeIndex < themes.length - 1) {
      navigateToThemeIndex(currentThemeIndex + 1);
    }
  }, [currentThemeIndex, themes.length, navigateToThemeIndex]);

  // Phím tắt bàn phím ← / → để chuyển chủ đề nhanh khi không focus gõ text
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
        if (currentThemeIndex > 0) {
          e.preventDefault();
          navigateToThemeIndex(currentThemeIndex - 1);
        }
      } else if (e.key === 'ArrowRight') {
        if (currentThemeIndex < themes.length - 1) {
          e.preventDefault();
          navigateToThemeIndex(currentThemeIndex + 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentThemeIndex, themes.length, navigateToThemeIndex]);

  // Giới hạn ngày hợp lệ cho nhánh đang được chọn (activeBranch)
  const activeBranchBounds = useMemo(() => {
    if (activeSubThemeIndex === null || !subThemes[activeSubThemeIndex]) {
      return {
        minAllowedStart: startDate || '',
        maxAllowedStart: endDate || '',
        minAllowedEnd: startDate || '',
        maxAllowedEnd: endDate || '',
      };
    }

    const prevBranch = activeSubThemeIndex > 0 ? subThemes[activeSubThemeIndex - 1] : null;
    const nextBranch =
      activeSubThemeIndex < subThemes.length - 1 ? subThemes[activeSubThemeIndex + 1] : null;
    const curBranch = subThemes[activeSubThemeIndex];

    // Ngày bắt đầu tối thiểu:
    // Nhánh đầu tiên (index 0) bắt đầu từ startDate của chủ đề chính.
    // Nhánh sau phải bắt đầu nối tiếp ngay sau ngày kết thúc nhánh trước (prevBranch.endDate + 1 ngày).
    let minAllowedStart = startDate || '';
    if (activeSubThemeIndex > 0 && prevBranch?.endDate) {
      minAllowedStart = addDaysToDate(prevBranch.endDate, 1);
      if (startDate && minAllowedStart < startDate) minAllowedStart = startDate;
    }

    // Ngày kết thúc tối đa:
    // Không vượt quá endDate của chủ đề chính.
    // Nếu có nhánh tiếp theo và nhánh đó đã có ngày bắt đầu, thì không được chạm vào nhánh tiếp theo (<= nextBranch.startDate - 1 ngày).
    let maxAllowedEnd = endDate || '';
    if (nextBranch?.startDate) {
      const dayBeforeNext = addDaysToDate(nextBranch.startDate, -1);
      if (!maxAllowedEnd || dayBeforeNext < maxAllowedEnd) {
        maxAllowedEnd = dayBeforeNext;
      }
    }

    // Ngày bắt đầu tối đa: Không được vượt quá endDate của chính nhánh đó (nếu đã có), hoặc maxAllowedEnd
    let maxAllowedStart = curBranch.endDate || maxAllowedEnd;
    if (maxAllowedEnd && maxAllowedStart > maxAllowedEnd) maxAllowedStart = maxAllowedEnd;

    // Ngày kết thúc tối thiểu: Không được trước startDate của chính nhánh đó (hoặc minAllowedStart)
    let minAllowedEnd = curBranch.startDate || minAllowedStart;
    if (minAllowedStart && minAllowedEnd < minAllowedStart) minAllowedEnd = minAllowedStart;

    return { minAllowedStart, maxAllowedStart, minAllowedEnd, maxAllowedEnd };
  }, [activeSubThemeIndex, subThemes, startDate, endDate]);

  const { minAllowedStart, maxAllowedStart, minAllowedEnd, maxAllowedEnd } = activeBranchBounds;

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

  // Kiểm tra chủ đề đã phân bổ đủ nhánh (phủ kín thời gian đến endDate)
  const isThemeFull = useMemo(() => {
    if (!endDate || !Array.isArray(subThemes) || subThemes.length === 0) return false;
    const lastBranch = subThemes[subThemes.length - 1];
    if (lastBranch?.endDate && lastBranch.endDate >= endDate) {
      return true;
    }
    if (lastBranch?.endDate) {
      const nextStart = addDaysToDate(lastBranch.endDate, 1);
      if (nextStart > endDate) return true;
    }
    return false;
  }, [subThemes, endDate]);

  // Handlers for branch topics (Chủ đề nhánh)
  const handleAddSubTheme = () => {
    if (isAllPublished) {
      toast.warning('Bộ chủ đề đã công bố. Vui lòng gỡ công bố ở trang tổng quan để thêm nhánh.');
      return;
    }
    if (isThemeFull) {
      toast.warning(`Chủ đề đã phân bổ đủ thời gian (đến hết ngày ${formatDateVn(endDate)}). Không thể thêm nhánh mới.`);
      return;
    }

    let nextStart = startDate || '';
    if (subThemes.length > 0) {
      const lastBranch = subThemes[subThemes.length - 1];
      if (lastBranch.endDate) {
        nextStart = addDaysToDate(lastBranch.endDate, 1);
      }
    }

    if (endDate && nextStart > endDate) {
      toast.warning(`Ngày tiếp theo (${formatDateVn(nextStart)}) vượt quá ngày kết thúc chủ đề (${formatDateVn(endDate)}).`);
      return;
    }

    // Tự động phân bổ đúng 1 tuần (7 ngày)
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
    setActiveSubThemeIndex(newIdx);
    toast.success(`Đã thêm nhánh ${newIdx + 1} (${formatDateVn(nextStart)} – ${formatDateVn(nextEnd)}).`);
  };

  const handleUpdateSubTheme = (index, field, value) => {
    if (isAllPublished) return;
    setSubThemes((prev) => {
      const updated = [...prev];
      const cur = { ...updated[index], [field]: value };
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
    if (isAllPublished) {
      toast.warning('Bộ chủ đề đã công bố. Không thể xóa nhánh.');
      return;
    }
    if (activeSubThemeIndex === index) {
      setActiveSubThemeIndex(null);
      setRangeSelectionStart(null);
      setHoveredCalendarDate(null);
    } else if (activeSubThemeIndex !== null && activeSubThemeIndex > index) {
      setActiveSubThemeIndex(activeSubThemeIndex - 1);
    }
    setSubThemes((prev) => prev.filter((_, i) => i !== index));
    toast.info('Đã xóa chủ đề nhánh');
  };


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

  // Helper tìm chủ đề khác chứa ngày bất kỳ
  const getThemeForDate = useCallback(
    (dateStr) => {
      if (!dateStr) return null;
      return (
        themes.find(
          (t) =>
            t.startDate &&
            t.endDate &&
            dateStr >= t.startDate &&
            dateStr <= t.endDate,
        ) || null
      );
    },
    [themes],
  );

  // Check changes
  const hasChanges = useMemo(() => {
    if (subThemes.length !== originalSubThemes.length) return true;
    return subThemes.some((s, idx) => {
      const orig = originalSubThemes[idx] || {};
      return (
        (s.name || '').trim() !== (orig.name || '').trim() ||
        (s.startDate || '') !== (orig.startDate || '') ||
        (s.endDate || '') !== (orig.endDate || '')
      );
    });
  }, [subThemes, originalSubThemes]);

  // Kiểm tra chủ đề còn ngày nào chưa được xếp nhánh hay không
  const hasUnassignedDaysInTheme = useMemo(() => {
    if (!startDate || !endDate) return true;
    if (!Array.isArray(subThemes) || subThemes.length === 0) return true;
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
    const lastBranch = subThemes[subThemes.length - 1];
    if (!lastBranch?.endDate || lastBranch.endDate !== endDate) return true;
    return false;
  }, [startDate, endDate, subThemes]);

  const canSave = !isAllPublished && hasChanges && !hasUnassignedDaysInTheme;

  // Save changes
  const handleSaveSubThemes = async () => {
    if (!canSave) return;
    if (hasUnassignedDaysInTheme) {
      toast.error(
        `Vui lòng phân bổ đầy đủ tất cả các ngày trong chủ đề (từ ${formatDateVn(startDate)} đến ${formatDateVn(endDate)}) cho các nhánh trước khi lưu.`,
      );
      return;
    }

    // Case 1: Phải có ít nhất 1 chủ đề nhánh
    if (!subThemes || subThemes.length === 0) {
      toast.error('Vui lòng thêm ít nhất một chủ đề nhánh trước khi lưu.');
      return;
    }

    // Case 2: Tất cả chủ đề nhánh phải có tên
    for (let i = 0; i < subThemes.length; i++) {
      const cur = subThemes[i];
      if (!cur.name || !cur.name.trim()) {
        toast.error(`Chủ đề nhánh số ${i + 1} chưa có tên. Vui lòng nhập tên cho tất cả các nhánh.`);
        return;
      }
    }

    // Case 3: Tất cả chủ đề nhánh phải có ngày bắt đầu và ngày kết thúc hợp lệ
    for (let i = 0; i < subThemes.length; i++) {
      const cur = subThemes[i];
      if (!cur.startDate || !cur.endDate) {
        toast.error(`Chủ đề nhánh số ${i + 1} ("${cur.name}") chưa có đầy đủ ngày bắt đầu và ngày kết thúc.`);
        return;
      }
      if (cur.startDate > cur.endDate) {
        toast.error(
          `Chủ đề nhánh số ${i + 1} ("${cur.name}"): Ngày bắt đầu (${formatDateVn(cur.startDate)}) không được sau ngày kết thúc (${formatDateVn(cur.endDate)}).`,
        );
        return;
      }
    }

    // Case 4: Nhánh đầu tiên phải khớp với mốc bắt đầu của chủ đề chính
    if (startDate && subThemes[0].startDate !== startDate) {
      toast.error(
        `Chủ đề nhánh đầu tiên ("${subThemes[0].name}") phải bắt đầu từ ${formatDateVn(startDate)} (khớp với ngày bắt đầu chủ đề chính). Hiện tại đang là ${formatDateVn(subThemes[0].startDate)}.`,
      );
      return;
    }

    // Case 5: Nhánh cuối cùng phải kết thúc đúng ngày kết thúc của chủ đề chính
    const lastBranch = subThemes[subThemes.length - 1];
    if (endDate && lastBranch.endDate !== endDate) {
      toast.error(
        `Chưa phân bổ hết thời gian chủ đề: Nhánh cuối ("${lastBranch.name}") kết thúc ngày ${formatDateVn(lastBranch.endDate)}, trong khi chủ đề diễn ra đến hết ${formatDateVn(endDate)}. Vui lòng điều chỉnh ngày để phủ kín khung thời gian.`,
      );
      return;
    }

    // Case 6: Kiểm tra không trùng lặp và diễn ra liên tục (không hổng ngày) giữa các nhánh
    for (let i = 1; i < subThemes.length; i++) {
      const prev = subThemes[i - 1];
      const cur = subThemes[i];

      if (cur.startDate <= prev.endDate) {
        toast.error(
          `Trùng lặp ngày: Nhánh số ${i + 1} ("${cur.name}", bắt đầu ${formatDateVn(cur.startDate)}) bị trùng hoặc đi trước ngày kết thúc của nhánh số ${i} ("${prev.name}", kết thúc ${formatDateVn(prev.endDate)}).`,
        );
        return;
      }

      const expectedNext = addDaysToDate(prev.endDate, 1);
      if (cur.startDate > expectedNext) {
        toast.error(
          `Khoảng trống thời gian: Giữa nhánh "${prev.name}" và nhánh "${cur.name}" bị ngắt quãng từ ${formatDateVn(expectedNext)} đến ${formatDateVn(addDaysToDate(cur.startDate, -1))}. Các chủ đề nhánh phải diễn ra liên tục.`,
        );
        return;
      }
    }

    const sortedSubThemes = subThemes
      .filter((s) => s.name?.trim().length > 0)
      .slice()
      .sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));

    const updatedThemes = [...themes];
    if (updatedThemes[currentThemeIndex]) {
      updatedThemes[currentThemeIndex] = {
        ...updatedThemes[currentThemeIndex],
        subThemes: sortedSubThemes,
      };
      setThemes(updatedThemes);
      setSubThemes(sortedSubThemes);
      setOriginalSubThemes(sortedSubThemes);
      setUpdatedAt(new Date().toLocaleDateString('vi-VN'));

      try {
        await curriculumApi.updateThemeSetDetail({
          year: yearId.replace('-', '–'),
          ageGroup,
          themes: updatedThemes,
        });
      } catch (err) {
        console.warn('Failed to save themes on server:', err);
      }

      toast.success(`Đã lưu phân bổ thời gian ${sortedSubThemes.length} nhánh cho "${themeName}"`);
    }
  };

  // Total days in current theme
  const totalThemeDays = useMemo(() => {
    if (!startDate || !endDate) return 0;
    const diff = Math.abs(new Date(endDate) - new Date(startDate));
    return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
  }, [startDate, endDate]);

  const activeBranch =
    activeSubThemeIndex !== null && subThemes[activeSubThemeIndex]
      ? subThemes[activeSubThemeIndex]
      : null;

  // Active Branch Quick Switchers & Handlers in Right Column
  const handlePrevActiveBranch = () => {
    if (activeSubThemeIndex === null) {
      if (subThemes.length > 0) setActiveSubThemeIndex(0);
      return;
    }
    if (activeSubThemeIndex > 0) {
      const nextIdx = activeSubThemeIndex - 1;
      setActiveSubThemeIndex(nextIdx);
      if (subThemes[nextIdx]?.startDate) {
        const parts = subThemes[nextIdx].startDate.split('-').map(Number);
        if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          setCalendarYear(parts[0]);
          setCalendarMonth(parts[1] - 1);
        }
      }
    }
  };

  const handleNextActiveBranch = () => {
    if (activeSubThemeIndex === null) {
      if (subThemes.length > 0) setActiveSubThemeIndex(0);
      return;
    }
    if (activeSubThemeIndex < subThemes.length - 1) {
      const nextIdx = activeSubThemeIndex + 1;
      setActiveSubThemeIndex(nextIdx);
      if (subThemes[nextIdx]?.startDate) {
        const parts = subThemes[nextIdx].startDate.split('-').map(Number);
        if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          setCalendarYear(parts[0]);
          setCalendarMonth(parts[1] - 1);
        }
      }
    }
  };

  const handleActiveStartDateChange = (val) => {
    if (activeSubThemeIndex === null || isAllPublished) return;
    if (!val) {
      handleUpdateSubTheme(activeSubThemeIndex, 'startDate', '');
      return;
    }

    // 1. Khoá các ngày không phải trong ngày chủ đề chính
    if (startDate && val < startDate) {
      toast.warning(
        `Ngày bắt đầu không được trước ngày bắt đầu chủ đề chính (${formatDateVn(startDate)}).`,
      );
      return;
    }
    if (endDate && val > endDate) {
      toast.warning(
        `Ngày bắt đầu không được sau ngày kết thúc chủ đề chính (${formatDateVn(endDate)}).`,
      );
      return;
    }

    // 2. Khoá các ngày không hợp lệ với nhánh trước và nhánh sau
    if (minAllowedStart && val < minAllowedStart) {
      toast.warning(
        `Ngày bắt đầu phải từ ${formatDateVn(minAllowedStart)} (sau ngày kết thúc nhánh trước).`,
      );
      return;
    }
    if (maxAllowedStart && val > maxAllowedStart) {
      toast.warning(`Ngày bắt đầu không được vượt quá ${formatDateVn(maxAllowedStart)}.`);
      return;
    }

    handleUpdateSubTheme(activeSubThemeIndex, 'startDate', val);
    const curEnd = subThemes[activeSubThemeIndex]?.endDate;
    if (!curEnd || curEnd < val) {
      let end = addDaysToDate(val, 6);
      if (maxAllowedEnd && end > maxAllowedEnd) end = maxAllowedEnd;
      handleUpdateSubTheme(activeSubThemeIndex, 'endDate', end);
    }
  };

  const handleActiveEndDateChange = (val) => {
    if (activeSubThemeIndex === null || isAllPublished) return;
    if (!val) {
      handleUpdateSubTheme(activeSubThemeIndex, 'endDate', '');
      return;
    }

    // 1. Khoá các ngày không phải trong ngày chủ đề chính
    if (startDate && val < startDate) {
      toast.warning(
        `Ngày kết thúc không được trước ngày bắt đầu chủ đề chính (${formatDateVn(startDate)}).`,
      );
      return;
    }
    if (endDate && val > endDate) {
      toast.warning(
        `Ngày kết thúc không được sau ngày kết thúc chủ đề chính (${formatDateVn(endDate)}).`,
      );
      return;
    }

    // 2. Khoá các ngày không hợp lệ với ngày bắt đầu của nhánh và nhánh sau
    const curStart = subThemes[activeSubThemeIndex]?.startDate;
    if (curStart && val < curStart) {
      toast.warning(
        `Ngày kết thúc không được trước ngày bắt đầu (${formatDateVn(curStart)}).`,
      );
      return;
    }
    if (maxAllowedEnd && val > maxAllowedEnd) {
      toast.warning(`Ngày kết thúc không được vượt quá ${formatDateVn(maxAllowedEnd)}.`);
      return;
    }

    handleUpdateSubTheme(activeSubThemeIndex, 'endDate', val);
  };

  // Khung thời gian năm học (để phân biệt ngày trong năm học vs ngoài năm học)
  const academicYearBounds = useMemo(() => {
    // 1. Ưu tiên ngày bắt đầu/kết thúc năm học từ API themeSetInfo
    if (themeSetInfo?.startDate && themeSetInfo?.endDate) {
      return {
        start: themeSetInfo.startDate,
        end: themeSetInfo.endDate,
      };
    }

    // 2. Nếu có danh sách chủ đề, lấy ngày bắt đầu chủ đề đầu tiên và kết thúc chủ đề cuối cùng
    const validStarts = (themes || []).map((t) => t.startDate).filter(Boolean).sort();
    const validEnds = (themes || []).map((t) => t.endDate).filter(Boolean).sort();

    if (validStarts.length > 0 && validEnds.length > 0) {
      return {
        start: validStarts[0],
        end: validEnds[validEnds.length - 1],
      };
    }

    // 3. Fallback theo chuỗi năm học (mặc định khai giảng 05/09 đến 31/05)
    const parts = (yearId || '').split(/[-–]/).map(Number);
    const startYear = parts[0] || 2026;
    const endYear = parts[1] || startYear + 1;
    return {
      start: `${startYear}-09-05`,
      end: `${endYear}-05-31`,
    };
  }, [yearId, themes, themeSetInfo]);

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
  };

  // Click on date in calendar
  const handleDateClick = (dateStr) => {
    // 1. Khoá tất cả ngày không thuộc chủ đề chính
    if (!startDate || !endDate || dateStr < startDate || dateStr > endDate) {
      toast.warning(
        `Ngày ${formatDateVn(dateStr)} không thuộc khung thời gian của chủ đề này (${formatDateRangeDdMm(startDate, endDate)}).`,
      );
      return;
    }

    // 2. Nếu ngày này thuộc một nhánh khác -> chuyển sang xem/chỉnh sửa nhánh đó
    const matchedSub = getSubThemeForDate(dateStr);
    if (matchedSub) {
      const idx = subThemes.findIndex((s) => s.id === matchedSub.id);
      if (idx !== -1 && idx !== activeSubThemeIndex) {
        setActiveSubThemeIndex(idx);
        return;
      }
    }

    // 3. Nếu đang chọn một nhánh và bấm vào ngày hợp lệ trong khoảng được phép của nhánh đó
    if (activeSubThemeIndex !== null && !isAllPublished) {
      const cur = subThemes[activeSubThemeIndex];
      if (!cur) return;

      // Khoá các ngày không hợp lệ với nhánh này
      if (minAllowedStart && dateStr < minAllowedStart) {
        toast.warning(
          `Không thể chọn ngày ${formatDateVn(dateStr)} vì nhánh phải bắt đầu từ ${formatDateVn(minAllowedStart)} (sau nhánh trước).`,
        );
        return;
      }
      if (maxAllowedEnd && dateStr > maxAllowedEnd) {
        toast.warning(
          `Không thể chọn ngày ${formatDateVn(dateStr)} vì vượt quá mốc cho phép (${formatDateVn(maxAllowedEnd)}).`,
        );
        return;
      }

      // Nếu ngày bấm trước startDate của nhánh, hoặc nhánh chưa có startDate -> đặt startDate
      if (!cur.startDate || dateStr < cur.startDate) {
        handleActiveStartDateChange(dateStr);
        toast.info(`Đã đặt ngày bắt đầu: ${formatDateVn(dateStr)}`);
      } else {
        // Ngày bấm >= cur.startDate -> đặt endDate
        handleActiveEndDateChange(dateStr);
        toast.info(`Đã đặt ngày kết thúc: ${formatDateVn(dateStr)}`);
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

  return (
    <div className="w-full h-[calc(100vh-48px)] bg-background text-foreground flex overflow-hidden select-none">
      {/* Left Column (Main list): Sub-themes Management */}
      <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
        {/* Scrollable Main Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Clean Header: Title + Rename & Toggle Sidebar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-border">
            <div className="space-y-1 min-w-0">
              {isEditingThemeName ? (
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  <span className="text-[17px] font-semibold text-muted-foreground whitespace-nowrap">
                    Chủ đề {themeCode}:
                  </span>
                  <input
                    type="text"
                    value={editedThemeName}
                    onChange={(e) => setEditedThemeName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveThemeName();
                      if (e.key === 'Escape') setIsEditingThemeName(false);
                    }}
                    autoFocus
                    placeholder="Nhập tên chủ đề..."
                    className="h-8 px-2.5 text-[14px] font-medium bg-background border border-[#1447e6] text-foreground rounded-none outline-none min-w-[220px]"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSaveThemeName}
                    className="h-8 px-3 bg-[#1447e6] hover:bg-[#1447e6]/90 text-white rounded-none cursor-pointer shadow-none flex items-center gap-1 text-[12.5px]"
                  >
                    <HugeiconsIcon icon={CheckmarkCircle01Icon} size={14} />
                    <span>Lưu</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditingThemeName(false)}
                    className="h-8 px-2.5 border-border text-muted-foreground hover:text-foreground rounded-none cursor-pointer shadow-none text-[12.5px]"
                  >
                    <HugeiconsIcon icon={Cancel01Icon} size={14} />
                    <span>Hủy</span>
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
                  <h1
                    onClick={() => {
                      if (isAllPublished) return;
                      setEditedThemeName(themeName);
                      setIsEditingThemeName(true);
                    }}
                    className={cn(
                      'text-[24px] font-semibold text-foreground tracking-tight whitespace-nowrap transition-colors',
                      !isAllPublished && 'cursor-pointer hover:text-[#1447e6]',
                    )}
                    title={!isAllPublished ? 'Bấm để đổi tên chủ đề' : undefined}
                  >
                    Chủ đề {themeCode}: {themeName}
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
              )}
              <p className="text-[13px] text-muted-foreground font-normal mt-0.5">
                Thiết lập phân bổ chi tiết và thời gian thực hiện cho các chủ đề nhánh
              </p>
              {startDate && endDate && (
                <p className="text-[12.5px] text-muted-foreground font-normal mt-0.5 tabular-nums">
                  {formatDateVn(startDate)} – {formatDateVn(endDate)}
                </p>
              )}
            </div>

            {/* Header Right Actions: Nút Đóng/Mở lịch */}
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setShowRightSidebar(!showRightSidebar)}
                className={cn(
                  'size-8 flex items-center justify-center border border-border transition-colors cursor-pointer rounded-none',
                  showRightSidebar
                    ? 'bg-muted text-foreground'
                    : 'bg-background text-muted-foreground hover:text-foreground hover:bg-muted/50',
                )}
                title={showRightSidebar ? 'Thu gọn lịch' : 'Mở lịch & phân bổ'}
              >
                <HugeiconsIcon icon={SidebarRightIcon} size={16} />
              </button>
            </div>
          </div>

        {/* Card: Danh sách chủ đề nhánh */}
        <div className="border border-border bg-card p-5 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between pb-2 border-b border-border/60">
            <div className="flex flex-col gap-0.5">
              <h2 className="text-[14.5px] font-semibold text-foreground">
                Danh sách chủ đề nhánh
              </h2>
              <p className="text-[12px] text-muted-foreground">
                Thiết lập phân bổ các chủ đề nhánh theo tiến độ tuần học.
              </p>
            </div>

            <Button
              type="button"
              onClick={handleAddSubTheme}
              disabled={isAllPublished || isThemeFull}
              className={cn(
                'h-8 px-3.5 text-[12.5px] font-medium rounded-none flex items-center gap-1.5 shadow-none transition-colors shrink-0',
                isAllPublished || isThemeFull
                  ? 'bg-muted text-muted-foreground border border-border cursor-not-allowed opacity-60'
                  : 'bg-[#1447e6] hover:bg-[#1447e6]/90 text-white cursor-pointer',
              )}
              title={
                isAllPublished
                  ? 'Bộ chủ đề đã công bố'
                  : isThemeFull
                  ? `Chủ đề đã phân bổ đủ thời gian (đến hết ${formatDateVn(endDate)})`
                  : 'Thêm chủ đề nhánh mới'
              }
            >
              <HugeiconsIcon icon={PlusSignIcon} size={14} />
              <span>{isThemeFull ? 'Đã đủ chủ đề nhánh' : 'Thêm chủ đề nhánh'}</span>
            </Button>
          </div>

          {/* Sub-themes List */}
          <div className="space-y-3">
            {subThemes.length === 0 ? (
              <div className="py-12 text-center border border-dashed border-border text-[13px] text-muted-foreground bg-card space-y-2">
                <p className="italic">Chưa có chủ đề nhánh nào trong chủ đề này.</p>
                <Button
                  type="button"
                  onClick={handleAddSubTheme}
                  disabled={isAllPublished || isThemeFull}
                  variant="outline"
                  className="h-8 px-4 text-[12.5px] font-medium rounded-none gap-1.5 border-border"
                >
                  <HugeiconsIcon icon={PlusSignIcon} size={14} />
                  <span>Bấm vào đây để thêm nhánh đầu tiên</span>
                </Button>
              </div>
            ) : (
              subThemes.map((branch, bIdx) => {
                const isActive = activeSubThemeIndex === bIdx;
                const hasDates = branch.startDate && branch.endDate;
                let durationDays = 0;
                if (hasDates) {
                  const diffTime = Math.abs(new Date(branch.endDate) - new Date(branch.startDate));
                  durationDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                }

                return (
                  <div
                    key={branch.id || bIdx}
                    onClick={() => {
                      setActiveSubThemeIndex(bIdx);
                      if (branch.startDate) {
                        const parts = branch.startDate.split('-').map(Number);
                        if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                          setCalendarYear(parts[0]);
                          setCalendarMonth(parts[1] - 1);
                        }
                      }
                    }}
                    className={cn(
                      'p-3.5 bg-card border rounded-none transition-all cursor-pointer group shadow-2xs',
                      isActive
                        ? 'border-[#1447e6] ring-1 ring-[#1447e6] bg-[#1447e6]/[0.02]'
                        : 'border-border hover:border-border/90 hover:bg-muted/10',
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      {/* Left: Tên nhánh */}
                      <div className="flex items-center flex-1 min-w-0">
                        <input
                          type="text"
                          value={branch.name || ''}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => handleUpdateSubTheme(bIdx, 'name', e.target.value)}
                          disabled={isAllPublished}
                          placeholder="Nhập tên chủ đề nhánh..."
                          className="flex-1 h-9 px-3 bg-background border border-border text-[13.5px] font-medium text-foreground outline-none focus:border-primary transition-colors"
                        />
                      </div>

                      {/* Right: Khoảng ngày dd/mm → dd/mm + Nút xóa */}
                      <div className="flex items-center gap-2.5 shrink-0">
                        {hasDates ? (
                          <span
                            className={cn(
                              'text-[12.5px] tabular-nums transition-colors',
                              isActive
                                ? 'text-[#1447e6] font-semibold'
                                : 'text-muted-foreground font-normal',
                            )}
                          >
                            {formatDateRangeDdMm(branch.startDate, branch.endDate)}
                          </span>
                        ) : (
                          <span className="text-[12px] text-muted-foreground/60 italic">
                            Chưa xếp ngày
                          </span>
                        )}

                        {/* Nút xóa nhánh */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSubTheme(bIdx);
                          }}
                          disabled={isAllPublished}
                          className="size-8 flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer border border-transparent hover:border-destructive/20 ml-1"
                          title="Xóa nhánh này"
                        >
                          <HugeiconsIcon icon={Delete02Icon} size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

        {/* Bottom Action Bar: Cập nhật, Chuyển chủ đề & Lưu phân bổ nhánh */}
        <div className="p-3 px-6 bg-card border-t border-border flex items-center justify-between shrink-0 select-none">
          <div className="flex items-center gap-3 text-[12px] text-muted-foreground">
            <span>Cập nhật: {updatedAt}</span>
            <span className="text-border">|</span>
            {/* Bộ chuyển chủ đề lớn nhanh (hỗ trợ phím ← / →) */}
            {themes.length > 0 && (
              <div className="flex items-center border border-border bg-card text-[12px] h-7 shadow-2xs">
                <button
                  type="button"
                  onClick={handlePrevTheme}
                  disabled={currentThemeIndex <= 0}
                  className="size-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  title="Chủ đề trước (Phím ←)"
                >
                  <HugeiconsIcon icon={ArrowLeft01Icon} size={13} />
                </button>
                <span className="px-2 text-[11.5px] font-medium text-foreground border-x border-border whitespace-nowrap tabular-nums select-none">
                  Chủ đề {currentThemeIndex + 1}/{themes.length}
                </span>
                <button
                  type="button"
                  onClick={handleNextTheme}
                  disabled={currentThemeIndex >= themes.length - 1}
                  className="size-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  title="Chủ đề sau (Phím →)"
                >
                  <HugeiconsIcon icon={ArrowRight01Icon} size={13} />
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              type="button"
              onClick={handleSaveSubThemes}
              disabled={!canSave}
              className={cn(
                'h-8 px-4 text-[12.5px] font-medium rounded-none shadow-none flex items-center gap-1.5 transition-colors cursor-pointer',
                canSave
                  ? 'bg-[#1447e6] hover:bg-[#1447e6]/90 text-white'
                  : 'bg-muted text-muted-foreground border border-border cursor-not-allowed opacity-60',
              )}
              title={
                isAllPublished
                  ? 'Bộ chủ đề đã công bố'
                  : hasUnassignedDaysInTheme
                    ? `Chỉ có thể lưu khi đã phân bổ hết tất cả các ngày trong chủ đề (từ ${formatDateVn(startDate)} đến ${formatDateVn(endDate)})`
                    : !hasChanges
                      ? 'Chưa có thay đổi để lưu'
                      : 'Lưu toàn bộ phân bổ nhánh'
              }
            >
              <HugeiconsIcon icon={CheckmarkCircle01Icon} size={14} />
              <span>Lưu phân bổ nhánh</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Right Column (380px): Clean 2-Month Calendar & Interactive Scheduling Guide */}
      {showRightSidebar && (
        <div className="w-[380px] shrink-0 bg-card border-l border-border flex flex-col h-full overflow-y-auto shadow-xs">
          {/* Lịch tương tác 2 tháng & Legend - Clean Header */}
          <div className="p-4 pb-36 bg-card shrink-0 space-y-3.5">
            {/* Toolbar chuyển tháng: giới hạn trong năm học */}
            <div className="flex items-center justify-between py-1 border-b border-border/70 pb-2.5">
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

            {/* Khối hiển thị 2 tháng liên tiếp - Full height tự nhiên, phẳng, không scrollbar con */}
            <div className="space-y-4 pt-1">
              {[
                { title: `Tháng ${calendarMonth + 1}/${calendarYear}`, days: calendarDaysM1, isFirst: true },
                { title: `Tháng ${month2 + 1}/${month2Year}`, days: calendarDaysM2, isFirst: false },
              ].map((mObj) => (
                <div key={mObj.title} className={cn('flex flex-col gap-1.5', !mObj.isFirst && 'pt-3.5 border-t border-border/70')}>
                  <div className="flex items-center justify-between px-0.5">
                    <span className="text-[13px] font-bold text-foreground tracking-tight">
                      {mObj.title}
                    </span>
                  </div>

                  {/* Weekday headers: T2..CN */}
                  <div className="grid grid-cols-7 text-center text-[11px] font-medium text-muted-foreground/80 py-1">
                    {WEEKDAYS.map((wd) => (
                      <div key={wd}>{wd}</div>
                    ))}
                  </div>

                  {/* Days grid */}
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
                      const isDateInTheme = Boolean(
                        startDate && endDate && d.dateStr >= startDate && d.dateStr <= endDate,
                      );

                      const otherTheme = !isDateInTheme ? getThemeForDate(d.dateStr) : null;
                      const isInOtherTheme = Boolean(otherTheme);

                      // Phân biệt: trong năm học vs ngoài năm học
                      const isInAcademicYear = Boolean(
                        d.dateStr >= academicYearBounds.start && d.dateStr <= academicYearBounds.end,
                      );
                      const isOutsideAcademicYear = !isInAcademicYear;
                      const isUnassignedInAcademicYear = Boolean(
                        isInAcademicYear && !isDateInTheme && !isInOtherTheme,
                      );

                      // Connectivity trong cùng hàng tuần (chỉ tính các ô cùng thuộc tháng hiện tại)
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

                      // Sub-theme matching
                      const matchedSubTheme = isDateInTheme ? getSubThemeForDate(d.dateStr) : null;
                      const matchedSubIdx = matchedSubTheme
                        ? subThemes.findIndex((st) => st.id === matchedSubTheme.id)
                        : -1;
                      const isSubThemeStart = Boolean(matchedSubTheme && d.dateStr === matchedSubTheme.startDate);

                      // Phân loại: đã có nhánh vs chưa xếp nhánh
                      const isAssignedSubTheme = Boolean(isDateInTheme && matchedSubTheme);
                      const isUnassignedInTheme = Boolean(isDateInTheme && !matchedSubTheme);

                      const prevSubTheme = prevDate && startDate && endDate && prevDate >= startDate && prevDate <= endDate
                        ? getSubThemeForDate(prevDate)
                        : null;
                      const nextSubTheme = nextDate && startDate && endDate && nextDate >= startDate && nextDate <= endDate
                        ? getSubThemeForDate(nextDate)
                        : null;

                      const prevInAssigned = Boolean(col > 0 && isAssignedSubTheme && prevSubTheme);
                      const nextInAssigned = Boolean(col < 6 && isAssignedSubTheme && nextSubTheme);

                      const prevInUnassigned = Boolean(
                        col > 0 && isUnassignedInTheme && prevDate && startDate && endDate && prevDate >= startDate && prevDate <= endDate && !prevSubTheme,
                      );
                      const nextInUnassigned = Boolean(
                        col < 6 && isUnassignedInTheme && nextDate && startDate && endDate && nextDate >= startDate && nextDate <= endDate && !nextSubTheme,
                      );

                      // Active branch check
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

                      // Kiểm tra ngày có bị khoá hay không:
                      // 1. Ngày không thuộc chủ đề chính -> Khoá hoàn toàn
                      // 2. Ngày thuộc chủ đề chính nhưng không hợp lệ cho nhánh đang chọn (trước nhánh trước hoặc sau nhánh sau)
                      const isInvalidForActiveBranch = Boolean(
                        activeSubThemeIndex !== null &&
                        isDateInTheme &&
                        !matchedSubTheme &&
                        ((minAllowedStart && d.dateStr < minAllowedStart) ||
                         (maxAllowedEnd && d.dateStr > maxAllowedEnd))
                      );

                      return (
                        <div
                          key={i}
                          onClick={() => handleDateClick(d.dateStr)}
                          className={cn(
                            'h-10 flex items-center justify-center relative select-none transition-all',
                            isOutsideAcademicYear
                              ? 'opacity-20 cursor-not-allowed pointer-events-none'
                              : !isDateInTheme
                              ? 'cursor-not-allowed opacity-40'
                              : isInvalidForActiveBranch
                              ? 'cursor-not-allowed opacity-35'
                              : 'cursor-pointer group/day',
                          )}
                          title={
                            isOutsideAcademicYear
                              ? `Ngày ${formatDateVn(d.dateStr)} · Ngoài khung năm học`
                              : isUnassignedInAcademicYear
                              ? `Ngày ${formatDateVn(d.dateStr)} · Trong năm học (Chưa xếp chủ đề)`
                              : !isDateInTheme
                              ? (isInOtherTheme ? `Ngày ${formatDateVn(d.dateStr)} · Chủ đề: ${otherTheme.name} (Khoá)` : `Ngày ${formatDateVn(d.dateStr)} · Chưa có chủ đề (Khoá)`)
                              : isInvalidForActiveBranch
                              ? `Ngày ${formatDateVn(d.dateStr)} · Không hợp lệ cho nhánh đang chọn (Khoá)`
                              : isAssignedSubTheme
                              ? `Ngày ${formatDateVn(d.dateStr)} · Chủ đề: ${themeName} · Nhánh: ${matchedSubTheme.name}`
                              : isUnassignedInTheme
                              ? `Ngày ${formatDateVn(d.dateStr)} · Chủ đề: ${themeName} (Chưa xếp nhánh)`
                              : `Ngày ${formatDateVn(d.dateStr)}`
                          }
                        >
                          {/* Ngày trong năm học nhưng chưa có chủ đề: Viền nét đứt nhẹ */}
                          {isUnassignedInAcademicYear && d.isCurrentMonth && (
                            <div className="absolute inset-0.5 border border-dashed border-border/80 bg-muted/15 pointer-events-none" />
                          )}

                          {/* Loại 1A: Ngày trong chủ đề ĐÃ CÓ NHÁNH - Dải màu xanh #1447e6 liền mạch */}
                          {isAssignedSubTheme && (
                            <div
                              className={cn(
                                'absolute inset-y-0.5 bg-[#1447e6]',
                                prevInAssigned ? 'left-0' : 'left-0.5',
                                nextInAssigned ? 'right-0' : 'right-0.5',
                              )}
                            />
                          )}

                          {/* Loại 1B: Dải sọc mờ cho ngày chưa xếp nhánh */}
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

                          {/* Dải màu chủ đề khác */}
                          {isInOtherTheme && (
                            <div
                              className={cn(
                                'absolute inset-y-0.5 bg-slate-200 dark:bg-slate-800 transition-colors group-hover/day:bg-slate-300 dark:group-hover/day:bg-slate-700',
                                prevSameOtherTheme ? 'left-0' : 'left-0.5',
                                nextSameOtherTheme ? 'right-0' : 'right-0.5',
                              )}
                            />
                          )}

                          {/* Highlight nhánh đang chọn */}
                          {isDateInActiveBranch && (
                            <div
                              className={cn(
                                'absolute inset-y-0.5 bg-white/18 border-y border-white/85 z-15 pointer-events-none',
                                prevInActiveBranch ? 'left-0' : 'left-0.5 border-l',
                                nextInActiveBranch ? 'right-0' : 'right-0.5 border-r',
                              )}
                            />
                          )}

                          {/* Badge N1, N2, N3 */}
                          {isSubThemeStart && matchedSubIdx !== -1 && (
                            <span
                              className={cn(
                                'absolute top-0.5 left-0.5 z-20 text-[8px] font-mono font-bold leading-none px-0.5 py-0.2 rounded-none shadow-xs',
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
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                      {academicYearBounds.start.slice(0, 4)}–{academicYearBounds.end.slice(0, 4)}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className="size-3 bg-[#1447e6] shrink-0" />
                      <span className="text-foreground">Đã phân bổ nhánh</span>
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

            {/* Hướng dẫn tương tác - Clean, chuyên nghiệp, không icon, không màu mè */}
            <div className="pt-2 text-[11px] text-muted-foreground/80 leading-relaxed border-t border-border/50 select-none">
              Bấm lần 1 để chọn ngày bắt đầu, bấm lần 2 để chọn ngày kết thúc cho nhánh trên lịch.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CurriculumSingleThemeDetailPage;
