import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  PlusSignIcon,
  Delete02Icon,
  PencilEdit02Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Search01Icon,
  Cancel01Icon,
} from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { cn } from '@/shared/lib/utils';
import { toast } from 'sonner';
import { curriculumApi } from './curriculum.api';
import { GoalItemDrawer } from './components/GoalItemDrawer';
import { useCurriculumStore } from './curriculum.store';

const AGE_GROUP_LABELS = {
  nhatre: 'Khối Nhà trẻ (12–36 tháng)',
  mam: 'Khối Mầm (3–4 tuổi)',
  choi: 'Khối Chồi (4–5 tuổi)',
  la: 'Khối Lá (5–6 tuổi)',
};

const DOMAIN_LABELS = {
  PHYSICAL: 'Phát triển thể chất',
  COGNITIVE: 'Phát triển nhận thức',
  LANGUAGE: 'Phát triển ngôn ngữ',
  SOCIO_EMOTIONAL: 'Phát triển tình cảm - KNXH',
  AESTHETIC: 'Phát triển thẩm mỹ',
  'Thể chất': 'Phát triển thể chất',
  'Nhận thức': 'Phát triển nhận thức',
  'Ngôn ngữ': 'Phát triển ngôn ngữ',
  'Tình cảm - KNXH': 'Phát triển tình cảm - KNXH',
  'Thẩm mỹ': 'Phát triển thẩm mỹ',
  'Phát triển thể chất': 'Phát triển thể chất',
  'Phát triển nhận thức': 'Phát triển nhận thức',
  'Phát triển ngôn ngữ': 'Phát triển ngôn ngữ',
  'Phát triển tình cảm - KNXH': 'Phát triển tình cảm - KNXH',
  'Phát triển thẩm mỹ': 'Phát triển thẩm mỹ',
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

// Format timestamp/Date to HH:mm:ss chuẩn UX đồng bộ hệ thống
const formatDateTime = (val) => {
  const formatTime = (d) => {
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  if (!val) {
    return formatTime(new Date());
  }

  if (val instanceof Date && !isNaN(val.getTime())) {
    return formatTime(val);
  }

  const d = new Date(val);
  if (!isNaN(d.getTime())) {
    return formatTime(d);
  }

  return formatTime(new Date());
};

const normalizeGoalCode = (code) => {
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

const cleanDisplayGoalTitle = (g) => {
  if (!g) return '';
  const title = g.title || '';
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

  const norm = normalizeGoalCode(g.code || g.goal_code || g.goalCode || g.id);
  return STANDARD_GOAL_FALLBACKS[norm] || title;
};

// Chuẩn hóa tiếng Việt không dấu để tìm kiếm không phân biệt chữ hoa, chữ thường và dấu tiếng Việt
const removeVietnameseTones = (str) => {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
};

export function CurriculumSingleGoalDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { yearId = '2026-2027', ageGroup = 'nhatre', goalId = 'g1-1' } = useParams();

  const setActiveGoal = useCurriculumStore((s) => s.setActiveGoal);

  const [isLoading, setIsLoading] = useState(true);
  const [goal, setGoal] = useState(null);
  const [allGoals, setAllGoals] = useState([]);
  const [contents, setContents] = useState([]);
  const [originalContents, setOriginalContents] = useState([]);
  const [lastSavedTime, setLastSavedTime] = useState(null);
  const [bankStatus, setBankStatus] = useState(() => {
    return localStorage.getItem(`sorak_goal_bank_${yearId}_${ageGroup}_status`) || 'DRAFT';
  });

  // Tìm kiếm và phân trang nội dung giáo dục
  const [contentSearchQuery, setContentSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10); // 10, 20, 50 nội dung / trang

  const isBankPublished = bankStatus === 'PUBLISHED';

  // Modals / Drawers
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [contentToDelete, setContentToDelete] = useState(null);

  // Fetch single goal detail and its contents
  const fetchGoalData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await curriculumApi.getSingleGoalDetail({
        year: yearId.replace('-', '–'),
        ageGroup,
        goalId,
      });

      const fetchedGoal = data.goal
        ? {
            ...data.goal,
            code: formatGoalCode(data.goal.code),
            title: cleanDisplayGoalTitle(data.goal),
            domainLabel: DOMAIN_LABELS[data.goal.domain] || data.goal.domainLabel || 'Phát triển thể chất',
          }
        : null;
      setGoal(fetchedGoal);
      setAllGoals((data.allGoals || []).map((g) => ({ ...g, code: formatGoalCode(g.code) })));
      if (fetchedGoal) {
        setActiveGoal(fetchedGoal);
      }

      const contentList = (data.contents || []).map((c, idx) => ({
        ...c,
        id: c.id || c.public_id || (c.content_id ? c.content_id.toString() : `ec-loaded-${idx}`),
      }));
      setContents(contentList);
      setOriginalContents(JSON.parse(JSON.stringify(contentList)));

      const localStatus = localStorage.getItem(`sorak_goal_bank_${yearId}_${ageGroup}_status`);
      if (localStatus) {
        setBankStatus(localStatus);
      } else {
        curriculumApi
          .getGoalBankDetail({ year: yearId.replace('-', '–'), ageGroup })
          .then((gb) => {
            if (gb?.info?.status) setBankStatus(gb.info.status);
          })
          .catch(() => {});
      }
    } catch (err) {
      console.error('Failed to load goal detail:', err);
      toast.error('Không thể tải thông tin mục tiêu');
    } finally {
      setIsLoading(false);
    }
  }, [yearId, ageGroup, goalId, setActiveGoal]);

  useEffect(() => {
    fetchGoalData();
    return () => {
      setActiveGoal(null);
    };
  }, [fetchGoalData, setActiveGoal]);

  // Next / Previous navigation calculation
  const currentIndex = useMemo(() => {
    if (!goal || allGoals.length === 0) return -1;
    return allGoals.findIndex((g) => g.id === goal.id || g.code === goal.code);
  }, [goal, allGoals]);

  const prevGoal = currentIndex > 0 ? allGoals[currentIndex - 1] : null;
  const nextGoal =
    currentIndex >= 0 && currentIndex < allGoals.length - 1
      ? allGoals[currentIndex + 1]
      : null;

  const handlePrevGoal = useCallback(() => {
    if (prevGoal) {
      navigate(`/curriculum/goals/${yearId}/${ageGroup}/${prevGoal.id}`);
    }
  }, [prevGoal, navigate, yearId, ageGroup]);

  const handleNextGoal = useCallback(() => {
    if (nextGoal) {
      navigate(`/curriculum/goals/${yearId}/${ageGroup}/${nextGoal.id}`);
    }
  }, [nextGoal, navigate, yearId, ageGroup]);

  // Keyboard navigation: ArrowLeft (<-) for previous goal, ArrowRight (->) for next goal
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Do nothing if typing in an input, textarea, or contentEditable element
      const target = e.target;
      const tagName = target?.tagName?.toUpperCase();
      if (tagName === 'INPUT' || tagName === 'TEXTAREA' || target?.isContentEditable) {
        return;
      }

      // Do nothing if modal or drawer is open
      if (isEditDrawerOpen || isDeleteDialogOpen || contentToDelete) {
        return;
      }

      if (e.key === 'ArrowLeft') {
        if (prevGoal) {
          e.preventDefault();
          handlePrevGoal();
        }
      } else if (e.key === 'ArrowRight') {
        if (nextGoal) {
          e.preventDefault();
          handleNextGoal();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handlePrevGoal, handleNextGoal, prevGoal, nextGoal, isEditDrawerOpen, isDeleteDialogOpen, contentToDelete]);

  // Check unsaved changes
  const hasChanges = useMemo(() => {
    return JSON.stringify(contents) !== JSON.stringify(originalContents);
  }, [contents, originalContents]);

  // Thời gian cập nhật định dạng HH:mm - DD/MM/YYYY chuẩn UX
  const updatedAt = useMemo(() => {
    const rawVal = lastSavedTime || goal?.updatedAt || goal?.updated_at;
    return formatDateTime(rawVal);
  }, [lastSavedTime, goal]);

  // Tự động lưu nội dung giáo dục khi có thay đổi (Debounced auto-save)
  useEffect(() => {
    if (!goal || isBankPublished || isLoading || !hasChanges) return;

    const validContents = contents.filter((c) => c.title && c.title.trim() !== '');

    // Kiểm tra trùng lặp ngay trên client
    const normalized = validContents.map((c) => c.title.trim().replace(/\s+/g, ' ').toLowerCase());
    const hasLocalDup = normalized.some((t, idx) => normalized.indexOf(t) !== idx);
    if (hasLocalDup) {
      toast.error('Nội dung giáo dục này đã tồn tại trong khung giáo dục. Vui lòng nhập nội dung khác.', {
        id: 'dup-content-error',
      });
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await curriculumApi.updateGoalContents({
          year: yearId.replace('-', '–'),
          ageGroup,
          goalId: goal.id,
          contents: validContents,
        });

        const updatedContents = res?.contents || validContents;
        setOriginalContents(JSON.parse(JSON.stringify(contents)));
        setLastSavedTime(new Date());
      } catch (err) {
        console.warn('Auto-save contents warning:', err);
        const errMsg = err?.response?.data?.message || err?.message;
        if (errMsg) {
          toast.error(errMsg, { id: 'auto-save-content-error' });
        }
      }
    }, 700);

    return () => clearTimeout(timer);
  }, [contents, hasChanges, goal, isBankPublished, isLoading, yearId, ageGroup]);

  // Filter educational contents based on search query (không phân biệt chữ hoa, chữ thường và dấu tiếng Việt)
  const filteredContents = useMemo(() => {
    const q = removeVietnameseTones(contentSearchQuery);
    const enriched = contents.map((item, idx) => ({
      ...item,
      originalIndex: idx + 1,
      formattedIndex: String(idx + 1).padStart(2, '0'),
    }));

    if (!q) return enriched;

    return enriched.filter((item) => {
      const matchIndex =
        String(item.originalIndex) === q ||
        item.formattedIndex === q ||
        `#${item.originalIndex}` === q;
      const matchTitle = removeVietnameseTones(item.title).includes(q);
      return matchIndex || matchTitle;
    });
  }, [contents, contentSearchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredContents.length / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const displayedContents = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredContents.slice(start, start + pageSize);
  }, [filteredContents, safeCurrentPage, pageSize]);

  const startIndex = filteredContents.length === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endIndex = Math.min(safeCurrentPage * pageSize, filteredContents.length);

  const handleSearchChange = (val) => {
    setContentSearchQuery(val);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  // Add new educational content
  const handleAddContent = () => {
    if (isBankPublished) {
      toast.warning('Ngân hàng mục tiêu đã công bố. Vui lòng gỡ công bố để thêm nội dung giáo dục.');
      return;
    }
    const newItem = {
      id: `ec-${Date.now()}`,
      title: '',
    };
    if (contentSearchQuery) {
      setContentSearchQuery('');
    }
    setContents((prev) => {
      const next = [...prev, newItem];
      const nextTotalPages = Math.max(1, Math.ceil(next.length / pageSize));
      setCurrentPage(nextTotalPages);
      return next;
    });
  };

  // Update content title inline
  const handleUpdateContentTitle = (contentId, newTitle) => {
    if (isBankPublished) {
      toast.warning('Ngân hàng mục tiêu đã công bố. Vui lòng gỡ công bố để chỉnh sửa.');
      return;
    }
    setContents((prev) => {
      return prev.map((item) => (item.id === contentId ? { ...item, title: newTitle } : item));
    });
  };

  // Request delete content (Opens confirmation dialog)
  const handleRequestDeleteContent = (item) => {
    if (isBankPublished) {
      toast.warning('Ngân hàng mục tiêu đã công bố. Vui lòng gỡ công bố để xóa nội dung giáo dục.');
      return;
    }
    setContentToDelete(item);
  };

  // Confirm delete content
  const handleConfirmDeleteContent = () => {
    if (!contentToDelete) return;
    setContents((prev) => prev.filter((item) => item.id !== contentToDelete.id));
    setContentToDelete(null);
    toast.success('Đã xóa nội dung giáo dục thành công.');
  };

  // Save educational contents
  const handleSaveGoalContents = async () => {
    if (!goal) return;
    if (isBankPublished) {
      toast.warning('Ngân hàng mục tiêu đã công bố. Vui lòng gỡ công bố ở trang tổng quan để lưu thay đổi.');
      return;
    }

    // Filter out completely empty items
    const validContents = contents.filter((c) => c.title && c.title.trim() !== '');

    // Check duplicate content titles locally
    const normalized = validContents.map((c) => c.title.trim().replace(/\s+/g, ' ').toLowerCase());
    const hasLocalDup = normalized.some((t, idx) => normalized.indexOf(t) !== idx);
    if (hasLocalDup) {
      toast.error('Nội dung giáo dục này đã tồn tại trong khung giáo dục. Vui lòng nhập nội dung khác.', {
        id: 'dup-content-error',
      });
      return;
    }

    try {
      const res = await curriculumApi.updateGoalContents({
        year: yearId.replace('-', '–'),
        ageGroup,
        goalId: goal.id,
        contents: validContents,
      });

      const updatedContents = res?.contents || validContents;
      setContents(updatedContents);
      setOriginalContents(JSON.parse(JSON.stringify(updatedContents)));

      toast.success('Đã lưu nội dung giáo dục thành công!');
    } catch (err) {
      console.error('Failed to save contents:', err);
      const errMsg = err?.response?.data?.message || err?.message || 'Lỗi khi lưu nội dung giáo dục';
      toast.error(errMsg);
    }
  };

  // Edit Goal Info (Title, Domain, Indicator)
  const handleSaveGoalInfo = async (goalData) => {
    if (!goal) return;
    if (isBankPublished) {
      toast.warning('Ngân hàng mục tiêu đã công bố. Vui lòng gỡ công bố để chỉnh sửa.');
      return;
    }
    try {
      await curriculumApi.updateGoal({
        year: yearId.replace('-', '–'),
        ageGroup,
        goalId: goal.id,
        data: goalData,
      });

      const updatedGoal = {
        ...goal,
        title: goalData.title,
        indicatorCode: goalData.indicatorCode,
        domain: goalData.domain,
        domainLabel: DOMAIN_LABELS[goalData.domain] || goal.domainLabel,
      };

      setGoal(updatedGoal);
      setActiveGoal(updatedGoal);
      setLastSavedTime(new Date());
      setIsEditDrawerOpen(false);
      toast.success('Đã cập nhật thông tin mục tiêu thành công!');
    } catch (err) {
      console.error('Failed to update goal info:', err);
      toast.error('Lỗi khi cập nhật mục tiêu');
    }
  };

  // Delete Goal
  const handleConfirmDeleteGoal = async () => {
    if (!goal) return;
    if (isBankPublished) {
      toast.error('Không thể xóa mục tiêu khi ngân hàng mục tiêu đã công bố.');
      return;
    }
    try {
      await curriculumApi.deleteGoal({
        year: yearId.replace('-', '–'),
        ageGroup,
        goalId: goal.id,
      });

      toast.success(`Đã xóa mục tiêu ${goal.code} thành công!`);
      setIsDeleteDialogOpen(false);
      navigate(`/curriculum/goals/${yearId}/${ageGroup}`);
    } catch (err) {
      console.error('Failed to delete goal:', err);
      toast.error('Lỗi khi xóa mục tiêu');
    }
  };

  const getAgeGroupLabel = (group) => {
    switch (group) {
      case 'nhatre':
        return t('curriculum.gradeNhaTre', 'Khối Nhà trẻ (12–36 tháng)');
      case 'mam':
        return t('curriculum.gradeMam', 'Khối Mầm (3–4 tuổi)');
      case 'choi':
        return t('curriculum.gradeChoi', 'Khối Chồi (4–5 tuổi)');
      case 'la':
        return t('curriculum.gradeLa', 'Khối Lá (5–6 tuổi)');
      default:
        return group;
    }
  };
  const ageGroupLabel = getAgeGroupLabel(ageGroup);

  return (
    <div className="w-full h-[calc(100vh-56px)] bg-background text-foreground flex overflow-hidden select-none">
      {/* Main Container */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 h-full bg-background">
        {/* Clean Header: Title + Right Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-border">
          <div className="space-y-1 min-w-0">
            <h1 className="text-[24px] font-semibold text-foreground tracking-tight truncate flex items-baseline gap-2">
              <span className="font-mono text-foreground shrink-0 font-bold">
                {goal ? goal.code : 'MT'}
              </span>
              <span className="text-muted-foreground font-normal shrink-0">:</span>
              <span className="truncate">{goal ? goal.title : t('curriculum.tabGoals', 'Mục tiêu giáo dục')}</span>
            </h1>
            <p className="text-[13px] text-muted-foreground font-normal mt-0.5">
              Thiết lập chi tiết mục tiêu và danh sách nội dung giáo dục cụ thể
            </p>
          </div>

          {/* Header Right Actions: Nút Next/Previous, Nút Chỉnh sửa mục tiêu & Nút Thùng rác */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Bộ chuyển mục tiêu Trước / Tiếp */}
            <div className="flex items-center border border-border bg-background">
              <button
                type="button"
                disabled={!prevGoal}
                onClick={handlePrevGoal}
                className={cn(
                  'h-8 px-2.5 flex items-center gap-1 text-[12.5px] font-medium text-foreground hover:bg-muted border-r border-border transition-colors cursor-pointer select-none',
                  !prevGoal &&
                    'opacity-35 cursor-not-allowed hover:bg-transparent text-muted-foreground',
                )}
                title={
                  prevGoal
                    ? `Mục tiêu trước (phím ←): ${prevGoal.code} - ${prevGoal.title}`
                    : 'Đã ở mục tiêu đầu tiên'
                }
              >
                <HugeiconsIcon icon={ArrowLeft01Icon} size={14} />
                <span className="hidden sm:inline">{t('common.prev', 'Trước')}</span>
              </button>

              <span className="px-2.5 text-[11.5px] font-mono text-muted-foreground select-none">
                {currentIndex >= 0 ? `${currentIndex + 1}/${allGoals.length}` : ''}
              </span>

              <button
                type="button"
                disabled={!nextGoal}
                onClick={handleNextGoal}
                className={cn(
                  'h-8 px-2.5 flex items-center gap-1 text-[12.5px] font-medium text-foreground hover:bg-muted border-l border-border transition-colors cursor-pointer select-none',
                  !nextGoal &&
                    'opacity-35 cursor-not-allowed hover:bg-transparent text-muted-foreground',
                )}
                title={
                  nextGoal
                    ? `Mục tiêu tiếp theo (phím →): ${nextGoal.code} - ${nextGoal.title}`
                    : 'Đã ở mục tiêu cuối cùng'
                }
              >
                <span className="hidden sm:inline">{t('common.next', 'Tiếp')}</span>
                <HugeiconsIcon icon={ArrowRight01Icon} size={14} />
              </button>
            </div>

            {/* Nút Chỉnh sửa mục tiêu (Icon only) */}
            <button
              type="button"
              disabled={isBankPublished}
              onClick={() => {
                if (isBankPublished) {
                  toast.warning('Ngân hàng mục tiêu đã công bố. Vui lòng gỡ công bố để chỉnh sửa.');
                  return;
                }
                setIsEditDrawerOpen(true);
              }}
              className={cn(
                'size-8 flex items-center justify-center border border-border bg-background transition-colors rounded-none',
                isBankPublished
                  ? 'opacity-35 cursor-not-allowed text-muted-foreground'
                  : 'hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer',
              )}
              title={isBankPublished ? 'Vui lòng gỡ công bố tại ngân hàng mục tiêu để chỉnh sửa' : 'Chỉnh sửa thông tin mục tiêu'}
            >
              <HugeiconsIcon icon={PencilEdit02Icon} size={15} />
            </button>

            {/* Nút Thùng rác */}
            <button
              type="button"
              disabled={isBankPublished}
              onClick={() => {
                if (isBankPublished) {
                  toast.error('Không thể xóa mục tiêu khi ngân hàng mục tiêu đã công bố.');
                  return;
                }
                setIsDeleteDialogOpen(true);
              }}
              className={cn(
                'size-8 flex items-center justify-center border border-border bg-background transition-colors rounded-none',
                isBankPublished
                  ? 'opacity-35 cursor-not-allowed text-muted-foreground'
                  : 'hover:bg-destructive/10 text-muted-foreground hover:text-destructive cursor-pointer',
              )}
              title={isBankPublished ? 'Vui lòng gỡ công bố tại ngân hàng mục tiêu để xóa' : 'Xóa mục tiêu này'}
            >
              <HugeiconsIcon icon={Delete02Icon} size={15} />
            </button>
          </div>
        </div>

        {/* Card 1: Thông tin mục tiêu (Chỉ giữ Lĩnh vực & Chỉ số đánh giá) */}
        <div className="border border-border bg-card p-5 space-y-4 shadow-2xs">
          <div className="pb-2 border-b border-border/60">
            <h2 className="text-[14.5px] font-semibold text-foreground">
              {t('planning.goalInfoTitle', 'Thông tin mục tiêu')}
            </h2>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              {t('planning.goalInfoSubtitle', 'Chi tiết lĩnh vực phát triển và chỉ số Bộ Giáo dục của mục tiêu.')}
            </p>
          </div>

          {/* Lĩnh vực phát triển & Chỉ số Bộ Giáo dục (Chỉ số ẩn đối với khối Mầm) */}
          <div className={cn(
            'grid gap-4',
            ageGroup?.toLowerCase() === 'mam' ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'
          )}>
            {/* Lĩnh vực phát triển */}
            <div className="p-3 bg-muted/20 border border-border/70 flex flex-col gap-1">
              <span className="text-[11.5px] font-medium text-muted-foreground uppercase tracking-wider">
                {t('planning.devDomainLabel', 'Lĩnh vực phát triển')}
              </span>
              <span className="text-[13.5px] font-semibold text-foreground truncate">
                {DOMAIN_LABELS[goal?.domain] || goal?.domainLabel || t('domains.physical', 'Phát triển thể chất')}
              </span>
            </div>

            {/* Chỉ số Bộ Giáo dục */}
            {ageGroup?.toLowerCase() !== 'mam' && (
              <div className="p-3 bg-muted/20 border border-border/70 flex flex-col gap-1">
                <span className="text-[11.5px] font-medium text-muted-foreground uppercase tracking-wider">
                  {t('planning.moetIndicatorLabel', 'Chỉ số Bộ Giáo dục')}
                </span>
                <div className="flex items-center gap-1.5">
                  {goal?.indicatorCode ? (
                    <span className="px-2 py-0.5 text-[12px] font-mono font-semibold bg-muted text-foreground border border-border">
                      {goal.indicatorCode}
                    </span>
                  ) : (
                    <span className="text-[13px] text-muted-foreground italic">
                      {t('planning.noIndicator', 'Không có chỉ số')}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Danh sách nội dung giáo dục */}
        <div className="border border-border bg-card p-5 space-y-4 shadow-2xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-border/60">
            <div className="flex flex-col gap-0.5">
              <h2 className="text-[14.5px] font-semibold text-foreground flex items-center gap-2">
                <span>{t('planning.educationalContentListTitle', 'Danh sách nội dung giáo dục')}</span>
                <span className="text-[11.5px] font-mono font-medium px-2 py-0.5 bg-muted text-muted-foreground border border-border">
                  {contents.length}
                </span>
              </h2>
              <p className="text-[12px] text-muted-foreground">
                {t('planning.educationalContentListSubtitle', 'Thiết lập các nội dung giáo dục cụ thể theo chuẩn Thông tư 51/BGDĐT.')}
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
              {/* Ô tìm kiếm nội dung giáo dục */}
              <div className="relative flex items-center">
                <HugeiconsIcon
                  icon={Search01Icon}
                  size={14}
                  className="absolute left-2.5 text-muted-foreground pointer-events-none"
                />
                <input
                  type="text"
                  value={contentSearchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Tìm kiếm mã STT, nội dung..."
                  className="h-8 pl-8 pr-7 w-48 sm:w-60 text-[12.5px] bg-background border border-border rounded-none focus:outline-none focus:border-[#1447e6] transition-colors placeholder:text-muted-foreground/60"
                />
                {contentSearchQuery && (
                  <button
                    type="button"
                    onClick={() => handleSearchChange('')}
                    className="absolute right-2 text-muted-foreground hover:text-foreground cursor-pointer"
                    title="Xóa tìm kiếm"
                  >
                    <HugeiconsIcon icon={Cancel01Icon} size={12} />
                  </button>
                )}
              </div>

              {/* Nút Thêm nội dung giáo dục */}
              <Button
                type="button"
                onClick={handleAddContent}
                disabled={isBankPublished}
                className={cn(
                  'h-8 px-3.5 text-[12.5px] font-medium rounded-none flex items-center gap-1.5 shadow-none shrink-0 transition-colors',
                  isBankPublished
                    ? 'bg-[#1447e6]/50 opacity-50 cursor-not-allowed text-white'
                    : 'bg-[#1447e6] hover:bg-[#1447e6]/90 text-white cursor-pointer',
                )}
                title={isBankPublished ? 'Vui lòng gỡ công bố tại ngân hàng mục tiêu để thêm nội dung' : t('curriculum.addEducationalContent', 'Thêm nội dung giáo dục')}
              >
                <HugeiconsIcon icon={PlusSignIcon} size={14} />
                <span>{t('curriculum.addEducationalContent', 'Thêm nội dung giáo dục')}</span>
              </Button>
            </div>
          </div>

          {/* Sub-items List */}
          <div className="space-y-3">
            {isLoading ? (
              <div className="py-12 text-center text-[13px] text-muted-foreground">
                Đang tải nội dung giáo dục...
              </div>
            ) : contents.length === 0 ? (
              <div className="py-8 text-center text-[13px] text-muted-foreground">
                Chưa có nội dung giáo dục
              </div>
            ) : filteredContents.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <p className="text-[13px] text-muted-foreground">
                  Không tìm thấy nội dung giáo dục nào khớp với từ khóa "{contentSearchQuery}".
                </p>
                <button
                  type="button"
                  onClick={() => handleSearchChange('')}
                  className="text-[12.5px] text-[#1447e6] hover:underline cursor-pointer font-medium"
                >
                  Xóa bộ lọc tìm kiếm
                </button>
              </div>
            ) : (
              displayedContents.map((item) => {
                return (
                  <div
                    key={item.id}
                    className="p-3.5 bg-card border border-border rounded-none transition-all group shadow-2xs hover:border-border/90 hover:bg-muted/10"
                  >
                    <div className="flex items-center justify-between gap-3">
                      {/* Left: STT trung tính + Input tên nội dung giáo dục */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="size-7 flex items-center justify-center text-[12px] font-mono font-medium text-muted-foreground bg-muted border border-border shrink-0">
                          {item.formattedIndex || String(item.originalIndex).padStart(2, '0')}
                        </span>
                        <input
                          type="text"
                          value={item.title || ''}
                          readOnly={isBankPublished}
                          onChange={(e) => handleUpdateContentTitle(item.id, e.target.value)}
                          placeholder={`Nhập tên nội dung giáo dục ${item.originalIndex}...`}
                          className={cn(
                            'flex-1 h-9 px-3 bg-background border border-border text-[13.5px] font-medium text-foreground outline-none transition-colors',
                            isBankPublished ? 'cursor-default bg-muted/20 text-muted-foreground' : 'focus:border-primary',
                          )}
                        />
                      </div>

                      {/* Right: Delete button */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          disabled={isBankPublished}
                          onClick={() => handleRequestDeleteContent(item)}
                          className={cn(
                            'size-8 flex items-center justify-center transition-colors rounded-none border border-transparent',
                            isBankPublished
                              ? 'opacity-25 cursor-not-allowed text-muted-foreground'
                              : 'text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border-destructive/20 cursor-pointer',
                          )}
                          title={isBankPublished ? 'Vui lòng gỡ công bố tại ngân hàng mục tiêu để xóa' : 'Xóa nội dung này'}
                          aria-label="Xóa nội dung"
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

          {/* Pagination Controls */}
          {filteredContents.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-border/60 text-[12.5px] text-muted-foreground select-none">
              {/* Range & Total info */}
              <div className="flex items-center gap-3">
                <span>
                  Hiển thị <strong className="font-semibold text-foreground font-mono">{startIndex}–{endIndex}</strong> trên <strong className="font-semibold text-foreground font-mono">{filteredContents.length}</strong> nội dung
                  {filteredContents.length !== contents.length && (
                    <span className="text-muted-foreground/70"> (tổng {contents.length})</span>
                  )}
                </span>

                {/* Page Size Selector */}
                <div className="flex items-center gap-1.5 pl-3 border-l border-border/60">
                  <span className="text-[12px]">Số dòng:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                    className="h-7 px-2 text-[12px] bg-background border border-border rounded-none text-foreground focus:outline-none focus:border-[#1447e6] cursor-pointer"
                  >
                    <option value={10}>10 / trang</option>
                    <option value={20}>20 / trang</option>
                    <option value={50}>50 / trang</option>
                  </select>
                </div>
              </div>

              {/* Navigation buttons: Trang trước / số trang / Trang sau */}
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={safeCurrentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="h-7 px-2.5 text-[12px] rounded-none cursor-pointer disabled:cursor-not-allowed"
                >
                  <HugeiconsIcon icon={ArrowLeft01Icon} size={13} className="mr-1" />
                  <span>Trang trước</span>
                </Button>

                <div className="px-2.5 text-[12px] font-mono text-foreground font-medium">
                  Trang {safeCurrentPage} / {totalPages}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={safeCurrentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="h-7 px-2.5 text-[12px] rounded-none cursor-pointer disabled:cursor-not-allowed"
                >
                  <span>Trang sau</span>
                  <HugeiconsIcon icon={ArrowRight01Icon} size={13} className="ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer: Trạng thái tự động lưu đồng bộ hệ thống */}
        <div className="flex items-center justify-end pt-3 pb-6">
          <span className="text-[11.5px] text-muted-foreground/70 select-none font-sans tracking-tight">
            Đã lưu lúc <span className="font-mono text-muted-foreground font-medium">{updatedAt}</span>
          </span>
        </div>
      </div>

      {/* Drawer: Chỉnh sửa mục tiêu */}
      <GoalItemDrawer
        isOpen={isEditDrawerOpen}
        onClose={() => setIsEditDrawerOpen(false)}
        initialData={goal}
        ageGroup={ageGroup}
        currentAgeGroupLabel={ageGroupLabel}
        onSave={handleSaveGoalInfo}
      />

      {/* Dialog: Xác nhận xóa mục tiêu */}
      {isDeleteDialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[1px] animate-in fade-in-0 duration-150"
          onClick={() => setIsDeleteDialogOpen(false)}
        >
          <div
            className="w-full max-w-[440px] bg-card border border-border p-5 shadow-2xl rounded-none space-y-4 text-foreground select-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-1.5 pb-0">
              <h3 className="text-[16px] font-semibold text-foreground tracking-tight">
                Xác nhận xóa mục tiêu giáo dục
              </h3>
              <p className="text-[12.5px] text-muted-foreground leading-relaxed pt-1">
                Mục tiêu giáo dục và toàn bộ danh sách nội dung liên quan sẽ bị xóa khỏi ngân hàng mục tiêu. Thao tác này không thể hoàn tác.
              </p>
            </div>

            {goal && (
              <div className="p-3 bg-muted/20 border border-border/70 rounded-none space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 font-mono text-[11px] font-semibold bg-muted text-foreground border border-border/60">
                    {goal.code}
                  </span>
                  {goal.domainLabel && (
                    <span className="text-[11.5px] text-muted-foreground font-medium">
                      {goal.domainLabel}
                    </span>
                  )}
                </div>
                <p className="text-[13px] text-foreground font-normal leading-relaxed">
                  {goal.title}
                </p>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border/60">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(false)}
                className="h-8 px-3.5 text-[12.5px] rounded-none border border-border cursor-pointer shadow-none"
              >
                Hủy bỏ
              </Button>
              <Button
                type="button"
                onClick={handleConfirmDeleteGoal}
                className="h-8 px-4 text-[12.5px] font-medium rounded-none bg-destructive hover:bg-destructive/90 text-white cursor-pointer shadow-none"
              >
                Xác nhận xóa
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog: Xác nhận xóa nội dung giáo dục */}
      {contentToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[1px] animate-in fade-in-0 duration-150"
          onClick={() => setContentToDelete(null)}
        >
          <div
            className="w-full max-w-[440px] bg-card border border-border p-5 shadow-2xl rounded-none space-y-4 text-foreground select-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-1.5 pb-0">
              <h3 className="text-[16px] font-semibold text-foreground tracking-tight">
                Xác nhận xóa nội dung giáo dục
              </h3>
              <p className="text-[12.5px] text-muted-foreground leading-relaxed pt-1">
                Nội dung giáo dục sẽ bị gỡ bỏ khỏi mục tiêu {goal?.code}. Thao tác này không thể hoàn tác.
              </p>
            </div>

            <div className="p-3 bg-muted/20 border border-border/70 rounded-none space-y-1.5">
              <span className="px-1.5 py-0.5 font-mono text-[11px] font-semibold bg-muted text-muted-foreground border border-border/60">
                STT {contentToDelete.formattedIndex || contentToDelete.originalIndex || '01'}
              </span>
              <p className="text-[13px] text-foreground font-normal leading-relaxed">
                {contentToDelete.title || 'Nội dung giáo dục'}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border/60">
              <Button
                type="button"
                variant="outline"
                onClick={() => setContentToDelete(null)}
                className="h-8 px-3.5 text-[12.5px] rounded-none border border-border cursor-pointer shadow-none"
              >
                Hủy bỏ
              </Button>
              <Button
                type="button"
                onClick={handleConfirmDeleteContent}
                className="h-8 px-4 text-[12.5px] font-medium rounded-none bg-destructive hover:bg-destructive/90 text-white cursor-pointer shadow-none"
              >
                Xác nhận xóa
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CurriculumSingleGoalDetailPage;
