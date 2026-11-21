import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Search01Icon,
  PlusSignIcon,
  Upload04Icon,
  ArrowDown01Icon,
  ArrowUp01Icon,
  ArrowRight01Icon,
  Edit01Icon,
  Delete02Icon,
  SparklesIcon,
  SentIcon,
  Cancel01Icon,
  CheckmarkCircle01Icon,
} from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
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
import { curriculumApi } from './curriculum.api';
import { GoalItemDrawer } from './components/GoalItemDrawer';
import { GoalImportDrawer } from './components/GoalImportDrawer';
import { GoalAiAssistantDrawer } from './components/GoalAiAssistantDrawer';
import { ExcelActionsDropdown } from '@/components/ExcelActionsDropdown';
import { downloadBlob } from '@/shared/utils/download';
import { useAcademicYearStore } from '@/features/academic-years';

const GRADE_LABELS_FULL = {
  nhatre: 'Khối Nhà trẻ (12–36 tháng)',
  mam: 'Khối Mầm (3–4 tuổi)',
  choi: 'Khối Chồi (4–5 tuổi)',
  la: 'Khối Lá (5–6 tuổi)',
};

const DOMAIN_OPTIONS = [
  { value: 'ALL', label: 'Tất cả lĩnh vực' },
  { value: 'PHYSICAL', label: 'Thể chất' },
  { value: 'COGNITIVE', label: 'Nhận thức' },
  { value: 'LANGUAGE', label: 'Ngôn ngữ' },
  { value: 'SOCIO_EMOTIONAL', label: 'Tình cảm - KNXH' },
  { value: 'AESTHETIC', label: 'Thẩm mỹ' },
];

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

// Format timestamp/Date to HH:mm - DD/MM/YYYY chuẩn UX
const formatDateTime = (val) => {
  if (!val) {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    return `${hours}:${minutes} - ${day}/${month}/${year}`;
  }

  // 1. Đã đúng định dạng chuẩn "HH:mm - DD/MM/YYYY"
  if (typeof val === 'string' && /^\d{2}:\d{2}\s*-\s*\d{2}\/\d{2}\/\d{4}$/.test(val)) {
    return val;
  }

  // 2. Chuỗi ngày định dạng Việt Nam "DD/MM/YYYY" (ví dụ: "13/10/2026")
  if (typeof val === 'string') {
    const vnMatch = val.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
    if (vnMatch) {
      const now = new Date();
      const day = vnMatch[1].padStart(2, '0');
      const month = vnMatch[2].padStart(2, '0');
      const year = vnMatch[3];
      const hours = vnMatch[4] ? vnMatch[4].padStart(2, '0') : String(now.getHours()).padStart(2, '0');
      const minutes = vnMatch[5] ? vnMatch[5].padStart(2, '0') : String(now.getMinutes()).padStart(2, '0');
      return `${hours}:${minutes} - ${day}/${month}/${year}`;
    }
  }

  // 3. Đối tượng Date (kiểm tra tính hợp lệ tránh Invalid Date / NaN)
  if (val instanceof Date) {
    if (!isNaN(val.getTime())) {
      const hours = String(val.getHours()).padStart(2, '0');
      const minutes = String(val.getMinutes()).padStart(2, '0');
      const day = String(val.getDate()).padStart(2, '0');
      const month = String(val.getMonth() + 1).padStart(2, '0');
      const year = val.getFullYear();
      return `${hours}:${minutes} - ${day}/${month}/${year}`;
    }
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    return `${hours}:${minutes} - ${day}/${month}/${year}`;
  }

  // 4. Thử parse chuỗi chuẩn ISO (YYYY-MM-DD...)
  const d = new Date(val);
  if (!isNaN(d.getTime())) {
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${hours}:${minutes} - ${day}/${month}/${year}`;
  }

  // Fallback về thời gian hiện tại
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  return `${hours}:${minutes} - ${day}/${month}/${year}`;
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

// Helper: normalize goals and domain counts while preserving database goal codes (MT 01, MT 02...)
const reindexGoalTree = (domains) => {
  return domains.map((domain) => {
    const rawGoals = domain.children || [];
    const directGoals = rawGoals.flatMap((item) => (item.children ? item.children : [item]));
    const normalized = directGoals.map((g) => ({
      ...g,
      code: formatGoalCode(g.code || g.goal_code || g.goalCode || 'MT'),
      domain: g.domain || domain.domain,
      domainLabel: g.domainLabel || domain.domainLabel,
      title: cleanDisplayGoalTitle(g),
    }));
    return {
      ...domain,
      children: normalized,
      count: normalized.length,
    };
  });
};

export function CurriculumGoalDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { yearId = '2026-2027', ageGroup = 'nhatre' } = useParams();

  const getGradeLabelFull = (grp) => {
    switch (grp) {
      case 'nhatre':
        return `${t('classes.gradeNhaTre', 'Khối Nhà trẻ')} (12–36 ${t('common.months', 'tháng')})`;
      case 'mam':
        return `${t('classes.gradeMam', 'Khối Mầm')} (3–4 ${t('common.yearsOld', 'tuổi')})`;
      case 'choi':
        return `${t('classes.gradeChoi', 'Khối Chồi')} (4–5 ${t('common.yearsOld', 'tuổi')})`;
      case 'la':
        return `${t('classes.gradeLa', 'Khối Lá')} (5–6 ${t('common.yearsOld', 'tuổi')})`;
      default:
        return grp;
    }
  };

  const domainOptions = [
    { value: 'ALL', label: t('planning.domainAll', 'Tất cả lĩnh vực') },
    { value: 'PHYSICAL', label: t('planning.domainPhysical', 'Thể chất') },
    { value: 'COGNITIVE', label: t('planning.domainCognitive', 'Nhận thức') },
    { value: 'LANGUAGE', label: t('planning.domainLanguage', 'Ngôn ngữ') },
    { value: 'SOCIO_EMOTIONAL', label: t('planning.domainSocioEmotional', 'Tình cảm - KNXH') },
    { value: 'AESTHETIC', label: t('planning.domainAesthetic', 'Thẩm mỹ') },
  ];

  const [isLoading, setIsLoading] = useState(true);
  const [bankInfo, setBankInfo] = useState(null);
  const [goalTree, setGoalTree] = useState([]);
  const [status, setStatus] = useState('DRAFT');
  const [updatedAt, setUpdatedAt] = useState(() => new Date());

  const academicYears = useAcademicYearStore((state) => state.academicYears);
  const fetchAcademicYears = useAcademicYearStore((state) => state.fetchAcademicYears);

  useEffect(() => {
    if (academicYears.length === 0 && fetchAcademicYears) {
      fetchAcademicYears();
    }
  }, [academicYears.length, fetchAcademicYears]);

  const matchedYear = useMemo(() => {
    const cleanYear = String(yearId || '').replace('–', '-').replace(/^năm\s*học\s*/i, '').trim();
    return academicYears.find((y) => {
      const yCleanName = String(y.name || '').replace('–', '-').replace(/^năm\s*học\s*/i, '').trim();
      return (
        String(y.id) === String(yearId) ||
        (y.publicId && String(y.publicId) === String(yearId)) ||
        yCleanName === cleanYear ||
        yCleanName.includes(cleanYear) ||
        (cleanYear && String(y.name || '').includes(cleanYear))
      );
    });
  }, [academicYears, yearId]);

  const isSchoolYearEnded = useMemo(() => {
    const cleanYear = String(yearId || '').replace('–', '-');
    const isYear2025 = cleanYear.includes('2025') || cleanYear === '1';
    return Boolean(
      matchedYear?.status === 'COMPLETED' ||
      matchedYear?.status === 'ENDED' ||
      bankInfo?.isSchoolYearEnded === true ||
      bankInfo?.schoolYearStatus === 'COMPLETED' ||
      bankInfo?.schoolYearStatus === 'ENDED' ||
      (isYear2025 && (!matchedYear || matchedYear.status !== 'ACTIVE'))
    );
  }, [matchedYear, bankInfo, yearId]);

  // Search & Filter state (No age filter needed)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('ALL');

  // Expanded nodes map: { 'g1': true, 'g2': true, ... }
  const [expandedNodes, setExpandedNodes] = useState({
    g1: true,
    g2: true,
    g3: true,
    g4: true,
    g5: true,
  });

  // Drawer states
  const [isItemDrawerOpen, setIsItemDrawerOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [goalToDelete, setGoalToDelete] = useState(null);
  const [isImportDrawerOpen, setIsImportDrawerOpen] = useState(false);
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      const blob = await curriculumApi.exportFrameworkExcel({
        year: yearId?.replace('-', '–'),
      });
      const safeYear = (yearId || '2026-2027').replace(/\s+/g, '_');
      downloadBlob(blob, `Khung_Chuong_Trinh_GDMN_${safeYear}.xlsx`);
      toast.success(t('curriculum.exportFrameworkSuccess', 'Đã xuất khung chương trình GDMN thành công'));
    } catch (err) {
      toast.error(t('curriculum.exportError', 'Lỗi khi xuất khung chương trình'), {
        description: err.message || t('common.tryAgainLater', 'Vui lòng thử lại sau.'),
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Load Goal Bank Detail
  useEffect(() => {
    async function fetchGoals() {
      setIsLoading(true);
      try {
        const data = await curriculumApi.getGoalBankDetail({
          year: yearId.replace('-', '–'),
          ageGroup,
        });
        setBankInfo(data.info);
        const effectiveStatus = data.info?.status || 'DRAFT';
        setStatus(effectiveStatus);
        setUpdatedAt(data.info?.updatedAt || new Date());
        setGoalTree(reindexGoalTree(data.tree || []));
      } catch (err) {
        console.warn('Failed to load goal bank details:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchGoals();
  }, [yearId, ageGroup]);

  // Is goal bank published for this school year & age group
  const isPublished = status === 'PUBLISHED';

  // Toggle publish status for the entire goal bank
  const handleTogglePublish = async () => {
    if (isSchoolYearEnded) {
      toast.warning('Năm học đã kết thúc. Không thể thay đổi trạng thái công bố.');
      return;
    }
    const nextStatus = isPublished ? 'DRAFT' : 'PUBLISHED';

    if (nextStatus === 'PUBLISHED') {
      // Validate BR-80, BR-82, BR-205: Check that ALL goals have at least 1 educational content
      const allGoalsList = goalTree.flatMap((d) => d.children || []);
      const emptyGoal = allGoalsList.find((g) => (g.contentsCount ?? (g.contents || []).length) === 0);
      if (emptyGoal) {
        toast.error(t('curriculum.cannotPublishNoContent', 'Không thể xuất bản khung giáo dục vì một hoặc nhiều mục tiêu giáo dục chưa có nội dung giáo dục.'));
        return;
      }
    }

    try {
      const res = await curriculumApi.updateGoalBankStatus({
        year: yearId.replace('-', '–'),
        ageGroup,
        status: nextStatus,
      });
      if (res && res.success === false) {
        throw new Error(res.message || t('curriculum.cannotUpdateBankStatus', 'Không thể cập nhật trạng thái ngân hàng mục tiêu'));
      }

      const updatedStatus = res.info?.status || nextStatus;
      setStatus(updatedStatus);
      const nextDate = new Date();
      setUpdatedAt(nextDate);
      localStorage.removeItem(`sorak_goal_bank_${yearId}_${ageGroup}_status`);

      toast.success(
        nextStatus === 'PUBLISHED'
          ? t('curriculum.publishBankSuccess', 'Đã công bố toàn bộ mục tiêu trong năm học cho khối này!')
          : t('curriculum.unpublishBankSuccess', 'Đã chuyển toàn bộ mục tiêu về bản nháp (Được phép chỉnh sửa và lưu)'),
      );
    } catch (err) {
      console.warn('Failed to update goal bank status on server:', err);
      const errMsg = err.response?.data?.message || err.message || t('curriculum.cannotPublishBank', 'Không thể công bố ngân hàng mục tiêu.');
      toast.error(errMsg);
    }
  };

  // Toggle node expansion
  const toggleNode = (id) => {
    setExpandedNodes((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Expand all nodes
  const handleExpandAll = () => {
    const nextMap = {};
    goalTree.forEach((domain) => {
      nextMap[domain.id] = true;
    });
    setExpandedNodes(nextMap);
  };

  // Collapse all nodes
  const handleCollapseAll = () => {
    setExpandedNodes({});
  };

  // Filter tree based on search query and domain
  const filteredTree = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return goalTree
      .map((domain) => {
        if (selectedDomain !== 'ALL' && domain.domain !== selectedDomain) {
          return null;
        }

        const allGoals = domain.children || [];

        const filteredGoals = allGoals.filter((goal) => {
          if (!q) return true;
          return (
            goal.title?.toLowerCase().includes(q) ||
            goal.code?.toLowerCase().includes(q) ||
            goal.indicatorCode?.toLowerCase().includes(q)
          );
        });

        const domainMatches = !q || domain.title?.toLowerCase().includes(q);
        if (filteredGoals.length > 0 || domainMatches) {
          return {
            ...domain,
            children: filteredGoals,
          };
        }
        return null;
      })
      .filter(Boolean);
  }, [goalTree, searchQuery, selectedDomain]);

  // Calculate total filtered goals and next goal code suggestion (MT 01, MT 02...)
  const totalGoalsCount = useMemo(() => {
    let count = 0;
    goalTree.forEach((d) => {
      count += (d.children || []).length;
    });
    return count;
  }, [goalTree]);

  const nextCodeSuggestion = useMemo(() => {
    let maxNum = 0;
    goalTree.forEach((d) => {
      (d.children || []).forEach((g) => {
        const match = String(g.code || '').match(/\d+/);
        if (match) {
          const n = parseInt(match[0], 10);
          if (!isNaN(n) && n > maxNum) {
            maxNum = n;
          }
        }
      });
    });
    const nextNum = maxNum > 0 ? maxNum + 1 : totalGoalsCount + 1;
    return `MT ${nextNum < 10 ? '0' + nextNum : nextNum}`;
  }, [goalTree, totalGoalsCount]);

  // Move goal up or down within a domain
  const handleMoveGoal = (domainId, goalId, direction) => {
    if (isPublished) {
      toast.warning(t('curriculum.publishedWarningReorder', 'Ngân hàng mục tiêu đã công bố. Vui lòng gỡ công bố để thay đổi thứ tự.'));
      return;
    }
    setGoalTree((prevTree) => {
      const updatedTree = prevTree.map((domain) => {
        if (domain.id !== domainId) return domain;

        const goals = [...(domain.children || [])];
        const currentIndex = goals.findIndex((g) => g.id === goalId);
        if (currentIndex === -1) return domain;

        const targetIndex = currentIndex + direction;
        if (targetIndex < 0 || targetIndex >= goals.length) return domain;

        // Swap goals within domain
        const temp = goals[currentIndex];
        goals[currentIndex] = goals[targetIndex];
        goals[targetIndex] = temp;

        return {
          ...domain,
          children: goals,
        };
      });

      return reindexGoalTree(updatedTree);
    });
    setUpdatedAt(new Date());
    toast.success(t('curriculum.reorderSuccess', 'Đã cập nhật thứ tự mục tiêu'));
  };

  // Handle Goal Item CRUD
  const handleEditGoal = (goal) => {
    if (isSchoolYearEnded) {
      toast.warning('Năm học đã kết thúc. Khung chương trình giáo dục ở chế độ chỉ xem.');
      return;
    }
    if (isPublished) {
      toast.warning(t('curriculum.publishedWarningEdit', 'Ngân hàng mục tiêu đã công bố. Vui lòng gỡ công bố để chỉnh sửa mục tiêu.'));
      return;
    }
    setEditingGoal(goal);
    setIsItemDrawerOpen(true);
  };

  const handleAddGoal = () => {
    if (isSchoolYearEnded) {
      toast.warning('Năm học đã kết thúc. Khung chương trình giáo dục ở chế độ chỉ xem.');
      return;
    }
    if (isPublished) {
      toast.warning(t('curriculum.publishedWarningAdd', 'Ngân hàng mục tiêu đã công bố. Vui lòng gỡ công bố để thêm mục tiêu mới.'));
      return;
    }
    setEditingGoal(null);
    setIsItemDrawerOpen(true);
  };

  const handleDeleteGoal = async (goalId) => {
    if (isSchoolYearEnded) {
      toast.warning('Năm học đã kết thúc. Khung chương trình giáo dục ở chế độ chỉ xem.');
      return;
    }
    if (isPublished) {
      toast.error(t('curriculum.publishedErrorDelete', 'Không thể xóa mục tiêu khi ngân hàng mục tiêu đã công bố.'));
      return;
    }
    try {
      await curriculumApi.deleteGoal({
        year: yearId.replace('-', '–'),
        ageGroup,
        goalId,
      });
    } catch (err) {
      console.warn('API deleteGoal error:', err);
    }
    setGoalTree((prev) => {
      const updated = prev.map((domain) => {
        const directGoals = domain.children || [];
        return {
          ...domain,
          children: directGoals.filter((g) => g.id !== goalId),
        };
      });
      return reindexGoalTree(updated);
    });
    setUpdatedAt(new Date());
    toast.success(t('curriculum.deleteGoalSuccess', 'Đã xóa mục tiêu khỏi ngân hàng'));
  };

  const handleSaveGoal = async (goalData) => {
    if (isPublished) {
      toast.warning(t('curriculum.publishedWarningEdit', 'Ngân hàng mục tiêu đã công bố. Vui lòng gỡ công bố để chỉnh sửa.'));
      return;
    }

    const trimmedTitle = (goalData.title || '').trim();
    if (!trimmedTitle) {
      toast.error(t('curriculum.pleaseEnterGoalTitle', 'Vui lòng nhập nội dung mục tiêu'));
      return;
    }

    // Kiểm tra trùng lặp nội dung mục tiêu trên toàn bộ ngân hàng mục tiêu (bất kể lĩnh vực phát triển)
    const normalizedNewTitle = trimmedTitle.toLowerCase();
    const allExistingGoals = [];
    (goalTree || []).forEach((dom) => {
      (dom.children || []).forEach((g) => allExistingGoals.push(g));
    });

    const isDuplicate = allExistingGoals.some((g) => {
      if (editingGoal && (g.id === editingGoal.id || (editingGoal.code && g.code === editingGoal.code))) {
        return false;
      }
      return (g.title || '').trim().toLowerCase() === normalizedNewTitle;
    });

    if (isDuplicate) {
      const msg = t('curriculum.goalAlreadyExists', 'Mục tiêu đã tồn tại trong ngân hàng mục tiêu. Vui lòng kiểm tra hoặc nhập nội dung khác.');
      throw new Error(msg);
    }

    const DOMAIN_DEFS = {
      PHYSICAL: { title: 'Phát triển thể chất', domainLabel: 'Thể chất' },
      COGNITIVE: { title: 'Phát triển nhận thức', domainLabel: 'Nhận thức' },
      LANGUAGE: { title: 'Phát triển ngôn ngữ', domainLabel: 'Ngôn ngữ' },
      SOCIO_EMOTIONAL: { title: 'Phát triển tình cảm - KNXH', domainLabel: 'Tình cảm - KNXH' },
      AESTHETIC: { title: 'Phát triển thẩm mỹ', domainLabel: 'Thẩm mỹ' },
    };

    if (editingGoal) {
      try {
        await curriculumApi.updateGoal({
          year: yearId.replace('-', '–'),
          ageGroup,
          goalId: editingGoal.id,
          data: goalData,
        });
      } catch (err) {
        console.error('API updateGoal failed:', err);
        const errMsg = err?.response?.data?.message || err?.message || t('curriculum.updateGoalError', 'Có lỗi xảy ra khi cập nhật mục tiêu');
        throw new Error(errMsg);
      }

      setGoalTree((prev) => {
        const targetDomainKey = goalData.domain || editingGoal.domain || 'PHYSICAL';
        const isDomainChanged = editingGoal.domain && editingGoal.domain !== targetDomainKey;

        const updatedGoal = {
          ...editingGoal,
          title: goalData.title,
          indicatorCode: goalData.indicatorCode,
          domain: targetDomainKey,
          domainLabel: DOMAIN_DEFS[targetDomainKey]?.domainLabel || targetDomainKey,
        };

        let updatedTree = [];
        if (!isDomainChanged) {
          updatedTree = prev.map((dom) => {
            const directGoals = dom.children || [];
            return {
              ...dom,
              children: directGoals.map((g) => (g.id === editingGoal.id ? updatedGoal : g)),
            };
          });
        } else {
          let targetDomainFound = false;
          updatedTree = prev.map((dom) => {
            const directGoals = dom.children || [];
            if (dom.domain === editingGoal.domain) {
              return {
                ...dom,
                children: directGoals.filter((g) => g.id !== editingGoal.id),
              };
            }
            if (dom.domain === targetDomainKey) {
              targetDomainFound = true;
              return {
                ...dom,
                children: [...directGoals, updatedGoal],
              };
            }
            return dom;
          });

          if (!targetDomainFound) {
            const def = DOMAIN_DEFS[targetDomainKey] || { title: targetDomainKey, domainLabel: targetDomainKey };
            const domainOrder = ['PHYSICAL', 'COGNITIVE', 'LANGUAGE', 'SOCIO_EMOTIONAL', 'AESTHETIC'];
            const newDomainNode = {
              id: `dom-${targetDomainKey.toLowerCase()}`,
              code: `${domainOrder.indexOf(targetDomainKey) + 1}.`,
              title: def.title,
              domain: targetDomainKey,
              domainLabel: def.domainLabel,
              children: [updatedGoal],
              count: 1,
            };
            updatedTree.push(newDomainNode);
            updatedTree.sort(
              (a, b) => domainOrder.indexOf(a.domain) - domainOrder.indexOf(b.domain),
            );
          }
        }

        return reindexGoalTree(updatedTree);
      });
      setUpdatedAt(new Date());

      setIsItemDrawerOpen(false);
      setEditingGoal(null);
      toast.success(t('curriculum.updateGoalSuccess', 'Đã cập nhật mục tiêu giáo dục thành công!'));
    } else {
      let createdGoal = null;
      try {
        const res = await curriculumApi.createGoal({
          year: yearId.replace('-', '–'),
          ageGroup,
          data: goalData,
        });
        createdGoal = res.goal;
      } catch (err) {
        console.error('API createGoal failed:', err);
        // Error toast will be displayed cleanly once by GoalItemDrawer
        throw err;
      }

      const targetDomain = goalData.domain || 'PHYSICAL';
      const newGoal = {
        id: createdGoal?.id || `g-${Date.now()}`,
        code: formatGoalCode(createdGoal?.code || goalData.code || nextCodeSuggestion),
        title: goalData.title,
        indicatorCode: goalData.indicatorCode,
        type: t('curriculum.learningGoalType', 'Mục tiêu học tập'),
        contentsCount: 0,
        contents: [],
      };

      setGoalTree((prev) => {
        let hasDomain = false;
        let updated = prev.map((domain) => {
          if (domain.domain === targetDomain) {
            hasDomain = true;
            return {
              ...domain,
              children: [...(domain.children || []), newGoal],
            };
          }
          return domain;
        });

        if (!hasDomain) {
          const domainInfo = DOMAIN_DEFS[targetDomain] || DOMAIN_DEFS.PHYSICAL;
          const newDomainNode = {
            id: `d-${targetDomain.toLowerCase()}`,
            code: `${updated.length + 1}.`,
            title: domainInfo.title,
            domain: targetDomain,
            domainLabel: domainInfo.domainLabel,
            children: [newGoal],
          };
          updated = [...updated, newDomainNode];
        }

        return reindexGoalTree(updated);
      });
      setUpdatedAt(new Date());
      toast.success(t('curriculum.addGoalSuccess', 'Đã thêm mục tiêu mới vào ngân hàng'));
    }
  };

  return (
    <div
      className="w-full flex-1 flex flex-col gap-5 max-w-[1360px] mx-auto text-foreground select-none pb-14"
      data-node-id="4947:13246"
      data-name="Curriculum Goal Detail Page"
    >
      {/* Warning banner for ended school year */}
      {isSchoolYearEnded && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-[13px] font-medium flex items-center gap-2 shrink-0">
          <span>⚠️ Năm học đã kết thúc. Khung chương trình giáo dục ở chế độ chỉ xem.</span>
        </div>
      )}

      {/* 1. Page Title Header & Primary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/70 shrink-0">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-[22px] sm:text-[24px] font-bold text-foreground tracking-tight">
              {t('curriculum.tabGoals', 'Ngân hàng mục tiêu')}
            </h1>
            <span className="px-2 py-0.5 text-[11px] font-medium bg-muted text-foreground border border-border">
              {getGradeLabelFull(ageGroup)}
            </span>
            <span
              className={cn(
                'px-2 py-0.5 text-[11px] font-medium tracking-wide uppercase',
                isPublished
                  ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30'
                  : 'bg-muted text-muted-foreground border border-border',
              )}
            >
              {isPublished ? t('curriculum.published', 'Đã công bố') : t('curriculum.draft', 'Bản nháp')}
            </span>
          </div>
          <p className="text-[12.5px] text-muted-foreground font-normal">
            {t('curriculum.goalBankHeaderDesc', 'Quản lý và thiết lập hệ thống mục tiêu giáo dục theo các lĩnh vực phát triển')} · {t('common.updated', 'Cập nhật')}: <span className="font-mono text-foreground font-medium">{formatDateTime(updatedAt)}</span>
          </p>
        </div>

        {/* Action Buttons: Giữ trên 1 hàng không bị rớt dòng */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Excel Actions (Export Framework only - Bỏ button import excel theo yêu cầu) */}
          <ExcelActionsDropdown
            onExport={handleExportExcel}
            onImport={null}
            isExporting={isExporting}
            showImport={false}
            exportLabel={t('curriculum.exportExcelFile', 'Xuất tệp Excel')}
          />

          {/* Button Thêm mục tiêu */}
          {!isSchoolYearEnded && (
            <Button
              type="button"
              onClick={handleAddGoal}
              disabled={isPublished}
              className={cn(
                'h-8 px-3.5 text-white text-[12.5px] font-medium rounded-none shadow-none flex items-center gap-1.5 transition-colors',
                isPublished
                  ? 'bg-[#1447e6]/50 opacity-50 cursor-not-allowed'
                  : 'bg-[#1447e6] hover:bg-[#1447e6]/90 cursor-pointer',
              )}
              title={isPublished ? t('curriculum.unpublishToAddGoal', 'Vui lòng gỡ công bố để thêm mục tiêu') : t('curriculum.addGoal', 'Thêm mục tiêu')}
            >
              <HugeiconsIcon icon={PlusSignIcon} size={14} />
              <span>{t('curriculum.addGoal', 'Thêm mục tiêu')}</span>
            </Button>
          )}

          {/* Button Công bố / Gỡ công bố ngân hàng */}
          {!isSchoolYearEnded && (
            isPublished ? (
              <Button
                type="button"
                variant="outline"
                onClick={handleTogglePublish}
                className="h-8 px-3.5 border border-border bg-card hover:bg-muted text-foreground text-[12.5px] font-medium rounded-none shadow-none cursor-pointer flex items-center gap-1.5 transition-colors"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={14} className="text-muted-foreground" />
                <span>{t('curriculum.unpublish', 'Gỡ công bố')}</span>
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleTogglePublish}
                className="h-8 px-3.5 bg-[#1447e6] hover:bg-[#1447e6]/90 text-white text-[12.5px] font-medium rounded-none shadow-none cursor-pointer flex items-center gap-1.5 transition-colors"
              >
                <HugeiconsIcon icon={SentIcon} size={14} />
                <span>{t('curriculum.publishBank', 'Công bố ngân hàng')}</span>
              </Button>
            )
          )}
        </div>
      </div>

      {/* 2. Filter Toolbar */}
      <div className="p-3 flex flex-wrap items-center justify-between gap-3 border border-border bg-card shadow-2xs">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[220px] max-w-[340px]">
            <HugeiconsIcon
              icon={Search01Icon}
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('curriculum.searchGoalCodePlaceholder', 'Tìm kiếm mã MT, tên mục tiêu...')}
              className="w-full h-8 pl-8 pr-2.5 bg-background border border-border text-[12.5px] text-foreground placeholder:text-muted-foreground rounded-none outline-none focus:border-primary transition-colors"
            />
          </div>

          {/* Domain Dropdown */}
          <select
            value={selectedDomain}
            onChange={(e) => setSelectedDomain(e.target.value)}
            className="h-8 px-2.5 bg-background border border-border text-[12.5px] text-foreground rounded-none outline-none focus:border-primary cursor-pointer shrink-0"
          >
            {domainOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Tree Expand / Collapse controls */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleExpandAll}
            className="h-8 px-3 border border-border text-[12px] rounded-none hover:bg-muted shadow-none cursor-pointer"
          >
            {t('curriculum.expandAll', 'Mở rộng tất cả')}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleCollapseAll}
            className="h-8 px-3 border border-border text-[12px] rounded-none hover:bg-muted shadow-none cursor-pointer"
          >
            {t('curriculum.collapseAll', 'Thu gọn tất cả')}
          </Button>
        </div>
      </div>

      {/* 3. Goal Structure Table (Direct Domain -> Goals hierarchy with Reorder) */}
      <div className="border border-border bg-card rounded-none overflow-hidden shadow-2xs">
        {/* Table Header Bar */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/30 text-[13px] font-medium text-foreground select-none">
          <div className="flex items-center gap-2.5">
            <span className="font-semibold text-foreground">{t('curriculum.goalStructure', 'Cấu trúc mục tiêu')}</span>
            <span className="text-muted-foreground/40">•</span>
            <span className="text-muted-foreground text-[12px] font-mono">
              {t('curriculum.goalsCountUnitWithTotal', '{{count}} mục tiêu', { count: totalGoalsCount })}
            </span>
          </div>
          <div className="text-[12px] text-muted-foreground font-normal">
            <span>{t('common.show', 'Hiển thị')}: </span>
            <span className="font-mono font-semibold text-foreground">
              {filteredTree.reduce((acc, d) => acc + (d.children || []).length, 0)}/{totalGoalsCount}
            </span>
            <span> {t('curriculum.goalsCountUnit', 'mục tiêu')}</span>
          </div>
        </div>

        {/* Tree Rows */}
        <div className="divide-y divide-border/60">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground text-[13px]">
                {t('curriculum.loadingGoals', 'Đang tải dữ liệu mục tiêu...')}
              </div>
            ) : filteredTree.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-[13px]">
                {t('curriculum.emptyGoals', 'Không tìm thấy mục tiêu nào')}
              </div>
            ) : (
              filteredTree.map((domain) => {
                const isDomainExpanded = !!expandedNodes[domain.id];
                const goals = domain.children || [];

                return (
                  <div key={domain.id} className="text-[13.5px]">
                    {/* Level 1: Domain Row */}
                    <div
                      onClick={() => toggleNode(domain.id)}
                      className="flex items-center justify-between px-4 py-2.5 bg-muted/20 hover:bg-muted/35 cursor-pointer select-none transition-colors group border-b border-border/50"
                    >
                      <div className="flex items-center gap-2.5 font-semibold text-[13.5px] text-foreground">
                        <button
                          type="button"
                          className="size-5 flex items-center justify-center text-muted-foreground group-hover:text-foreground"
                        >
                          <HugeiconsIcon
                            icon={isDomainExpanded ? ArrowDown01Icon : ArrowRight01Icon}
                            size={14}
                          />
                        </button>
                        <span>{domain.code}</span>
                        <span>{domain.title}</span>
                      </div>

                      <span className="px-2 py-0.5 bg-background border border-border/70 text-[11.5px] font-mono text-muted-foreground font-normal">
                        {t('curriculum.goalsCountUnitWithTotal', '{{count}} mục tiêu', { count: goals.length })}
                      </span>
                    </div>

                    {/* Level 2: Direct Goal Items under Domain with Reorder controls */}
                    {isDomainExpanded && (
                      <div className="divide-y divide-border/30 bg-background">
                        {goals.length === 0 ? (
                          <div className="py-3 px-4 pl-10 text-[12.5px] text-muted-foreground italic">
                            {t('curriculum.noGoalsInDomain', 'Chưa có mục tiêu nào trong lĩnh vực này')}
                          </div>
                        ) : (
                          goals.map((goal, goalIndex) => {
                            const isFirst = goalIndex === 0;
                            const isLast = goalIndex === goals.length - 1;

                            return (
                              <div
                                key={goal.id}
                                className="group/row flex items-center justify-between px-4 py-2.5 pl-8 sm:pl-10 hover:bg-muted/25 transition-colors border-b border-border/30 last:border-b-0"
                              >
                                {/* Left: Code, Title, Inline Indicator Badge (Click to open detail) */}
                                <div
                                  onClick={() => navigate(`/curriculum/goals/${yearId}/${ageGroup}/${goal.id}`)}
                                  className="flex items-start sm:items-center gap-3 min-w-0 pr-4 flex-1 cursor-pointer group/title"
                                  title={t('curriculum.clickToViewAndSetContent', 'Bấm để xem chi tiết và thiết lập nội dung giáo dục')}
                                >
                                  <span className="px-2 py-0.5 bg-muted/70 border border-border/80 text-[12px] font-bold text-foreground shrink-0 min-w-[56px] text-center font-mono select-none">
                                    {goal.code}
                                  </span>
                                  <div className="flex items-center gap-2 flex-wrap min-w-0 flex-1 leading-relaxed">
                                    <span className="text-[13px] font-medium text-foreground group-hover/title:underline transition-colors">
                                      {goal.title}
                                    </span>
                                    {goal.indicatorCode && ageGroup?.toLowerCase() !== 'mam' && (
                                      <span className="inline-flex items-center px-1.5 py-0.2 text-[10.5px] font-medium text-muted-foreground bg-muted/50 border border-border/60 shrink-0 select-none font-mono">
                                        {goal.indicatorCode}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Right: Clean icon buttons (Reorder up/down, Edit, Delete) */}
                                <div
                                  className={cn(
                                    'flex items-center gap-0.5 transition-opacity shrink-0',
                                    isPublished
                                      ? 'opacity-30'
                                      : 'opacity-40 group-hover/row:opacity-100',
                                  )}
                                >
                                  {/* Di chuyển lên */}
                                  <button
                                    type="button"
                                    disabled={isFirst || isPublished}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleMoveGoal(domain.id, goal.id, -1);
                                    }}
                                    className={cn(
                                      'size-7 flex items-center justify-center rounded-none transition-colors select-none',
                                      isFirst || isPublished
                                        ? 'opacity-25 cursor-not-allowed text-muted-foreground'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer',
                                    )}
                                    title={
                                      isPublished
                                        ? t('curriculum.unpublishToReorder', 'Vui lòng gỡ công bố để thay đổi thứ tự')
                                        : isFirst
                                        ? t('curriculum.alreadyFirstPosition', 'Đang ở vị trí đầu tiên')
                                        : t('curriculum.moveGoalUp', 'Chuyển mục tiêu lên trên')
                                    }
                                    aria-label={t('curriculum.moveGoalUp', 'Chuyển mục tiêu lên trên')}
                                  >
                                    <HugeiconsIcon icon={ArrowUp01Icon} size={15} />
                                  </button>

                                  {/* Di chuyển xuống */}
                                  <button
                                    type="button"
                                    disabled={isLast || isPublished}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleMoveGoal(domain.id, goal.id, 1);
                                    }}
                                    className={cn(
                                      'size-7 flex items-center justify-center rounded-none transition-colors select-none',
                                      isLast || isPublished
                                        ? 'opacity-25 cursor-not-allowed text-muted-foreground'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer',
                                    )}
                                    title={
                                      isPublished
                                        ? t('curriculum.unpublishToReorder', 'Vui lòng gỡ công bố để thay đổi thứ tự')
                                        : isLast
                                        ? t('curriculum.alreadyLastPosition', 'Đang ở vị trí cuối cùng')
                                        : t('curriculum.moveGoalDown', 'Chuyển mục tiêu xuống dưới')
                                    }
                                    aria-label={t('curriculum.moveGoalDown', 'Chuyển mục tiêu xuống dưới')}
                                  >
                                    <HugeiconsIcon icon={ArrowDown01Icon} size={15} />
                                  </button>

                                  {!isSchoolYearEnded && (
                                    <>
                                      {/* Subtle separator */}
                                      <div className="h-3.5 w-px bg-border/60 mx-1" />

                                      {/* Chỉnh sửa */}
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleEditGoal({ ...goal, domain: domain.domain });
                                        }}
                                        className={cn(
                                          'size-7 flex items-center justify-center rounded-none transition-colors',
                                          isPublished
                                            ? 'text-muted-foreground/50 hover:text-muted-foreground cursor-pointer'
                                            : 'text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer',
                                        )}
                                        title={isPublished ? t('curriculum.publishedWarningEdit', 'Vui lòng gỡ công bố để chỉnh sửa') : t('common.edit', 'Chỉnh sửa')}
                                        aria-label={t('common.edit', 'Chỉnh sửa')}
                                      >
                                        <HugeiconsIcon icon={Edit01Icon} size={15} />
                                      </button>

                                      {/* Xóa */}
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (isPublished) {
                                            toast.error(t('curriculum.publishedErrorDelete', 'Không thể xóa mục tiêu khi ngân hàng mục tiêu đã công bố.'));
                                            return;
                                          }
                                          setGoalToDelete(goal);
                                        }}
                                        className={cn(
                                          'size-7 flex items-center justify-center rounded-none transition-colors',
                                          isPublished
                                            ? 'text-muted-foreground/50 hover:text-muted-foreground cursor-pointer'
                                            : 'text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer',
                                        )}
                                        title={isPublished ? 'Vui lòng gỡ công bố để xóa' : t('common.delete', 'Xóa')}
                                        aria-label={t('common.delete', 'Xóa')}
                                      >
                                        <HugeiconsIcon icon={Delete02Icon} size={15} />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

      {/* 5. Floating Mascot AI Assistant Button (bottom-right) - Tạm thời ẩn */}
      {/* <button
        type="button"
        onClick={() => setIsAiDrawerOpen(true)}
        className="fixed bottom-6 right-6 z-40 size-14 rounded-full bg-white dark:bg-card border-2 border-[#1447e6] shadow-xl hover:shadow-2xl hover:scale-105 transition-all flex items-center justify-center cursor-pointer group"
        title={t('curriculum.aiAssistantTitle', 'Trợ lý AI - Chuẩn hoá & Tối ưu ngân hàng mục tiêu')}
      >
        <img
          src="/mascot.webp"
          alt="Sorak AI Mascot"
          className="size-10 object-contain drop-shadow-sm"
        />
        <div className="absolute -top-1 -right-1 size-5 rounded-full bg-[#1447e6] text-white flex items-center justify-center shadow-xs">
          <HugeiconsIcon icon={SparklesIcon} size={11} />
        </div>
      </button> */}

      {/* 6. Drawers */}
      <GoalItemDrawer
        isOpen={isItemDrawerOpen}
        onClose={() => {
          setIsItemDrawerOpen(false);
          setEditingGoal(null);
        }}
        initialData={editingGoal}
        nextCodeSuggestion={nextCodeSuggestion}
        ageGroup={ageGroup}
        currentAgeGroupLabel={getGradeLabelFull(ageGroup)}
        onSave={handleSaveGoal}
      />

      <GoalImportDrawer
        isOpen={isImportDrawerOpen}
        onClose={() => setIsImportDrawerOpen(false)}
        onSuccess={() => {
          toast.success(t('curriculum.importGoalsSuccess', 'Đã import thành công danh sách mục tiêu!'));
        }}
      />

      {/* <GoalAiAssistantDrawer
        isOpen={isAiDrawerOpen}
        onClose={() => setIsAiDrawerOpen(false)}
        onApplyProposal={(proposal) => {
          toast.success(t('curriculum.appliedProposalSuccess', 'Đã áp dụng đề xuất của AI vào ngân hàng mục tiêu!'));
        }}
      /> */}
      {/* Hộp thoại xác nhận xóa mục tiêu giáo dục */}
      <Dialog open={!!goalToDelete} onOpenChange={(open) => !open && setGoalToDelete(null)}>
        <DialogContent className="sm:max-w-[440px] rounded-none border border-border bg-card p-5 shadow-2xl space-y-4 select-none">
          <DialogHeader className="space-y-1.5 pb-0">
            <DialogTitle className="text-[16px] font-semibold text-foreground tracking-tight">
              {t('curriculum.confirmDeleteGoalTitle', 'Xác nhận xóa mục tiêu giáo dục')}
            </DialogTitle>
            <DialogDescription className="text-[12.5px] text-muted-foreground leading-relaxed pt-1">
              {t('curriculum.confirmDeleteGoalDesc', 'Mục tiêu giáo dục và toàn bộ danh sách nội dung liên quan sẽ bị xóa khỏi ngân hàng mục tiêu. Thao tác này không thể hoàn tác.')}
            </DialogDescription>
          </DialogHeader>

          {goalToDelete && (
            <div className="p-3 bg-muted/20 border border-border/70 rounded-none space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="px-1.5 py-0.5 font-mono text-[11px] font-semibold bg-muted text-foreground border border-border/60">
                  {goalToDelete.code}
                </span>
                {goalToDelete.domainLabel && (
                  <span className="text-[11.5px] text-muted-foreground font-medium">
                    {goalToDelete.domainLabel}
                  </span>
                )}
              </div>
              <p className="text-[13px] text-foreground font-normal leading-relaxed">
                {goalToDelete.title}
              </p>
            </div>
          )}

          <DialogFooter className="flex items-center justify-end gap-2.5 pt-2 border-t border-border/60 sm:space-x-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setGoalToDelete(null)}
              className="h-8 px-3.5 text-[12.5px] rounded-none border border-border cursor-pointer shadow-none"
            >
              {t('common.cancel', 'Hủy bỏ')}
            </Button>
            <Button
              type="button"
              onClick={async () => {
                const target = goalToDelete;
                setGoalToDelete(null);
                if (target?.id) {
                  await handleDeleteGoal(target.id);
                }
              }}
              className="h-8 px-4 text-[12.5px] font-medium rounded-none bg-destructive hover:bg-destructive/90 text-white cursor-pointer shadow-none"
            >
              {t('curriculum.confirmDelete', 'Xác nhận xóa')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CurriculumGoalDetailPage;
