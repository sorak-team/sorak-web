import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Search01Icon,
  PlusSignIcon,
  CheckmarkCircle01Icon,
  Clock01Icon,
  AlertCircleIcon,
  Cancel01Icon,
  Calendar03Icon,
  FilterHorizontalIcon,
  CheckmarkSquare02Icon,
  Delete02Icon,
  ArrowDown01Icon,
  Tick01Icon,
  InformationCircleIcon,
} from '@hugeicons/core-free-icons';
import { cn } from '@/shared/lib/utils';
import { toast } from 'sonner';
import { useAuthStore } from '@/features/auth';
import { planningApi } from '../planning.api';
import { ActivitySlotDrawer } from './ActivitySlotDrawer';
import { PlanningTabLoading } from './PlanningTabLoading';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const DOMAIN_OPTIONS = [
  { value: 'ALL', label: 'Tất cả lĩnh vực', shortLabel: 'Tất cả' },
  { value: 'PHYSICAL', label: 'Phát triển thể chất', shortLabel: 'Thể chất' },
  { value: 'COGNITIVE', label: 'Phát triển nhận thức', shortLabel: 'Nhận thức' },
  { value: 'LANGUAGE', label: 'Phát triển ngôn ngữ', shortLabel: 'Ngôn ngữ' },
  { value: 'SOCIO_EMOTIONAL', label: 'Tình cảm - KNXH & Thẩm mỹ', shortLabel: 'TC - KNXH' },
];

const STATUS_FILTER_OPTIONS = [
  { value: 'ALL', label: 'Tất cả trạng thái' },
  { value: 'HAS_ACT', label: 'Đã có hoạt động' },
  { value: 'NO_ACT', label: 'Chưa có hoạt động' },
  { value: 'SCHEDULED', label: 'Đã xếp lịch tuần' },
  { value: 'UNSCHEDULED', label: 'Chưa xếp lịch tuần' },
];

const DOMAIN_GROUPS_CONFIG = [
  { code: '01', domain: 'PHYSICAL', domainLabel: 'Thể chất' },
  { code: '02', domain: 'COGNITIVE', domainLabel: 'Nhận thức' },
  { code: '03', domain: 'LANGUAGE', domainLabel: 'Ngôn ngữ' },
  { code: '04', domain: 'SOCIO_EMOTIONAL', domainLabel: 'Tình cảm & thẩm mỹ' },
];

export const DOMAIN_LABELS = {
  PHYSICAL: 'Phát triển thể chất',
  COGNITIVE: 'Phát triển nhận thức',
  LANGUAGE: 'Phát triển ngôn ngữ',
  SOCIO_EMOTIONAL: 'Phát triển tình cảm, kỹ năng xã hội & thẩm mỹ',
  AESTHETIC: 'Phát triển thẩm mỹ',
};

export const ROUTINE_SLOTS_ORDER = [
  { key: 'ARRIVAL_PLAY', label: 'Đón trẻ, chơi', defaultTime: '07:15 – 08:00', shortLabel: 'Đón trẻ, chơi' },
  { key: 'MORNING_EXERCISE', label: 'Thể dục sáng', defaultTime: '08:00 – 08:30', shortLabel: 'Thể dục sáng' },
  { key: 'DIRECTED_STUDY', label: 'Hoạt động học', defaultTime: '08:30 – 09:15', shortLabel: 'Hoạt động học' },
  { key: 'OUTDOOR_PLAY', label: 'Chơi ngoài trời', defaultTime: '09:15 – 10:00', shortLabel: 'Chơi ngoài trời' },
  { key: 'HYGIENE_MEAL_SLEEP', label: 'Ăn, ngủ, vệ sinh', defaultTime: '11:30 – 14:00', shortLabel: 'Ăn, ngủ, vệ sinh' },
  { key: 'CORNER_PLAY', label: 'Hoạt động ở các góc', defaultTime: '14:30 – 15:30', shortLabel: 'Hoạt động góc' },
  { key: 'AFTERNOON_ACTIVITY', label: 'Hoạt động theo ý thích', defaultTime: '15:30 – 16:15', shortLabel: 'Hoạt động chiều' },
  { key: 'RETURN_CHILD', label: 'Trả trẻ', defaultTime: '16:15 – 17:00', shortLabel: 'Trả trẻ' },
];

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

export function formatCleanActivityTitle(title, contentTitle = '') {
  if (!title) return '';
  let str = title.trim();
  str = str.replace(/^Đón trẻ\s*&\s*trò chuyện\s*[:–—\-]\s*/i, 'Trò chuyện: ');
  str = str.replace(/^(Đón trẻ|Thể dục sáng|Chơi\s*[-–—]\s*tập có chủ đích|Hoạt động học|Hoạt động ở các góc|Chơi ở các góc|Dạo chơi ngoài trời|Hoạt động ngoài trời|Chơi ngoài trời|Trả trẻ\s*(&\s*trao đổi với phụ huynh)?|Trả trẻ|Hoạt động sinh hoạt)\s*[:–—\-]\s*/i, '');
  str = str.replace(/^Chơi theo ý thích\s*(&\s*|[-–—:]\s*)?/i, '');
  str = str.replace(/^Đón trẻ\s*(&\s*|[-–—:]\s*)?/i, '');
  str = str.replace(/^Trả trẻ\s*(&\s*trao đổi với phụ huynh)?\s*[:–—\-]?\s*/i, '');

  if (contentTitle && contentTitle.trim()) {
    const escaped = contentTitle.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\s*\\(${escaped}\\)\\s*$`, 'i');
    if (regex.test(str)) {
      const stripped = str.replace(regex, '').trim();
      if (stripped.length > 0) {
        str = stripped;
      }
    }
  }

  if (!str.trim()) return title;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatDateRange(startDateStr, endDateStr) {
  if (!startDateStr || !endDateStr) return '';
  try {
    const s = new Date(startDateStr);
    const e = new Date(endDateStr);
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(s.getDate())}/${pad(s.getMonth() + 1)} – ${pad(e.getDate())}/${pad(e.getMonth() + 1)}`;
  } catch {
    return `${startDateStr} – ${endDateStr}`;
  }
}

function isContentInTheme(cnt, activeTheme) {
  if (!activeTheme || !cnt?.allocatedThemes) return false;
  const thId = String(activeTheme.id || activeTheme.publicId || activeTheme._theme_id || '').toLowerCase();
  const thCode = String(activeTheme.code || '').replace(/\D/g, '');
  const thName = (activeTheme.name || activeTheme.themeName || '').toLowerCase().trim();

  return (cnt.allocatedThemes || []).some((t) => {
    const tId = String(t.id || t.themeId || t._theme_id || '').toLowerCase();
    const tCode = String(t.code || '').replace(/\D/g, '');
    const tName = (t.name || t.themeName || '').toLowerCase().trim();
    return (
      (thId && (tId === thId || tId === String(activeTheme._theme_id))) ||
      (thCode && tCode === thCode) ||
      (thName && tName && (thName === tName || thName.includes(tName) || tName.includes(thName)))
    );
  });
}

export function isActivityInTheme(act, activeTheme) {
  if (!activeTheme) return true;
  const thId = String(activeTheme.id || activeTheme.publicId || activeTheme._theme_id || '').toLowerCase();
  const thDbId = String(activeTheme._theme_id || '').toLowerCase();
  const thCode = String(activeTheme.code || '').replace(/\D/g, '');
  const thName = (activeTheme.name || activeTheme.themeName || '').toLowerCase().trim();

  const actThId = String(act.themeId || act.theme_id || act._theme_id || '').toLowerCase();
  const actDbId = String(act._theme_id || '').toLowerCase();
  const actThCode = String(act.themeCode || '').replace(/\D/g, '');
  const actThName = (act.themeName || '').toLowerCase().trim();

  // 1. Nếu hoạt động có gán mã hoặc tên chủ đề rõ ràng thì phải khớp với chủ đề hiện tại
  if (actThId || actDbId || actThCode || actThName) {
    return (
      (thId && (actThId === thId || actThId === thDbId)) ||
      (thDbId && (actDbId === thDbId || actDbId === thId)) ||
      (thCode && actThCode && actThCode === thCode) ||
      (thName && actThName && (actThName === thName || actThName.includes(thName) || thName.includes(actThName)))
    );
  }

  // 2. Nếu đã xếp lịch vào các tuần thuộc chủ đề này
  if (isActivityScheduledInTheme(act, activeTheme)) {
    return true;
  }

  // 3. Nếu hoạt động hoàn toàn chưa gán chủ đề nào và chưa xếp lịch đâu thì cho phép hiển thị
  return !actThId && !actDbId && !act.isScheduled && (!act.scheduledSlots || act.scheduledSlots.length === 0);
}

function isActivityScheduledInTheme(act, activeTheme) {
  if (!activeTheme) return Boolean(act.isScheduled || (act.scheduledSlots && act.scheduledSlots.length > 0));
  const thId = String(activeTheme.id || activeTheme.publicId || activeTheme._theme_id || '').toLowerCase();
  const thCode = String(activeTheme.code || '').replace(/\D/g, '');
  const thName = (activeTheme.name || activeTheme.themeName || '').toLowerCase().trim();

  const slots = act.scheduledSlots || [];
  const hasSlot = slots.some((slot) => {
    const sId = String(slot.themeId || slot.theme_id || '').toLowerCase();
    const sCode = String(slot.themeCode || '').replace(/\D/g, '');
    const sName = (slot.themeName || '').toLowerCase().trim();
    return (
      (thId && (sId === thId || sId === String(activeTheme._theme_id))) ||
      (thCode && sCode === thCode) ||
      (thName && sName && (sName === thName || sName.includes(thName) || thName.includes(sName)))
    );
  });

  if (hasSlot) return true;
  const actThId = String(act.themeId || act.theme_id || '').toLowerCase();
  if (act.isScheduled && thId && actThId === thId) return true;
  return false;
}

export function EducationalActivitiesTab({
  classId = '1',
  isReadOnly = false,
  selectedThemeId = null,
  onThemeChange = null,
  planStatus = null,
}) {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentUser = useAuthStore((state) => state.user);
  const isBgh = Boolean(
    currentUser?.role === 'PRINCIPAL_BGH' ||
    currentUser?.role === 'PRINCIPAL' ||
    currentUser?.role === 'VICE_PRINCIPAL' ||
    currentUser?.role?.toLowerCase()?.includes('principal') ||
    currentUser?.role?.toLowerCase()?.includes('bgh')
  );
  const effectiveReadOnly = isBgh;

  const [data, setData] = useState(null);
  const [selectedThemeCode, setSelectedThemeCode] = useState(() => {
    const urlThemeId = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('themeId') : null;
    const effective = selectedThemeId || urlThemeId;
    if (effective) {
      const clean = String(effective).trim();
      if (/^\d{1,2}$/.test(clean)) {
        return clean.padStart(2, '0');
      }
      return clean;
    }
    return '01';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);

  // Drawer state for creating / editing activity
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerInitialSlot, setDrawerInitialSlot] = useState(null);
  const [activeGoalContext, setActiveGoalContext] = useState(null);
  const [activeContentContext, setActiveContentContext] = useState(null);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [cardActivityToDelete, setCardActivityToDelete] = useState(null);
  const [isDeletingCardActivity, setIsDeletingCardActivity] = useState(false);
  const prevPropThemeIdRef = useRef(
    selectedThemeId || (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('themeId') : '') || ''
  );


  // Load activities data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await planningApi.getThemeActivities(classId, {});
      if (res && Array.isArray(res.goals)) {
        res.goals = res.goals.map((g) => ({
          ...g,
          goalCode: formatGoalCode(g.goalCode || g.code),
          rawGoalCode: g.goalCode || g.code,
          contents: (g.contents || []).map((cnt) => ({
            ...cnt,
            activities: (cnt.activities || []).map((act) => ({
              ...act,
              goalCode: formatGoalCode(act.goalCode || g.goalCode || g.code),
            })),
          })),
        }));
      }
      setData(res);
    } catch (err) {
      console.warn('Failed to load theme activities:', err);
      toast.error('Không thể tải danh sách hoạt động giáo dục.');
    } finally {
      setIsLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const availableThemes = useMemo(() => {
    return data?.themes || [];
  }, [data]);

  const isCurriculumPublished = useMemo(() => {
    if (isBgh) return true;
    if (availableThemes.length === 0) return false;
    return availableThemes.some((t) => t.status === 'PUBLISHED');
  }, [availableThemes, isBgh]);

  // Thông tin khối lớp và niên khóa phục vụ thông báo chuyên nghiệp
  const classGradeText = useMemo(() => {
    const rawAge = data?.classInfo?.ageGroup;
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
      data?.classInfo?.ageGroupLabel ||
      AGE_MAP[rawAge] ||
      (data?.classInfo?.name ? `lớp ${data.classInfo.name}` : 'khối lớp này')
    );
  }, [data?.classInfo]);

  const classYearText = useMemo(() => {
    return data?.classInfo?.yearName || '';
  }, [data?.classInfo]);

  // Sync selected theme code if selectedThemeId prop changes from parent
  useEffect(() => {
    if (selectedThemeId && selectedThemeId !== prevPropThemeIdRef.current && availableThemes.length > 0) {
      prevPropThemeIdRef.current = selectedThemeId;
      const matched = availableThemes.find(
        (t) =>
          t.code === selectedThemeId ||
          t.id === selectedThemeId ||
          t.publicId === selectedThemeId ||
          String(t.code).padStart(2, '0') === String(selectedThemeId).padStart(2, '0') ||
          String(t._theme_id) === String(selectedThemeId)
      );
      if (matched && matched.code && matched.code !== selectedThemeCode) {
        setSelectedThemeCode(matched.code);
      }
    }
  }, [selectedThemeId, availableThemes]);

  // Current active theme object
  const currentTheme = useMemo(() => {
    if (availableThemes.length === 0) return null;
    return (
      availableThemes.find(
        (t) =>
          t.code === selectedThemeCode ||
          t.id === selectedThemeCode ||
          t.publicId === selectedThemeCode ||
          String(t.code).padStart(2, '0') === String(selectedThemeCode).padStart(2, '0') ||
          String(t._theme_id) === String(selectedThemeCode)
      ) || availableThemes[0]
    );
  }, [availableThemes, selectedThemeCode]);

  const handleSelectTheme = (th) => {
    const targetVal = th.code || th.id;
    if (targetVal !== selectedThemeCode) {
      prevPropThemeIdRef.current = targetVal;
      setSelectedThemeCode(targetVal);
      if (onThemeChange) {
        onThemeChange(targetVal);
      } else {
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          next.set('themeId', targetVal);
          return next;
        });
      }
    }
  };

  // Keyboard navigation: Mũi tên Trái / Phải để chuyển chủ đề nhanh như bên Phân bổ mục tiêu
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

      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        if (!availableThemes || availableThemes.length === 0) return;
        const currentIndex = availableThemes.findIndex((th) => th.code === selectedThemeCode);
        if (currentIndex === -1) return;

        if (e.key === 'ArrowLeft' && currentIndex > 0) {
          e.preventDefault();
          handleSelectTheme(availableThemes[currentIndex - 1]);
        } else if (e.key === 'ArrowRight' && currentIndex < availableThemes.length - 1) {
          e.preventDefault();
          handleSelectTheme(availableThemes[currentIndex + 1]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [availableThemes, selectedThemeCode]);

  // Filter goals & contents for current theme
  const { filteredGoals, domainChips, themeStats } = useMemo(() => {
    if (!data?.goals || !currentTheme) {
      return {
        filteredGoals: [],
        domainChips: [],
        themeStats: { goalsCount: 0, contentsCount: 0, activitiesCount: 0, scheduledCount: 0 },
      };
    }

    const q = searchQuery.trim().toLowerCase();

    // 1. Lọc các mục tiêu và nội dung thuộc chủ đề này
    const allGoalsInTheme = data.goals
      .map((g) => {
        const contentsInTheme = (g.contents || []).filter((cnt) => {
          return isContentInTheme(cnt, currentTheme);
        });

        if (contentsInTheme.length === 0) return null;

        // Lọc nội dung theo query và status filter (chỉ xét các hoạt động thuộc chủ đề hiện tại)
        const matchedContents = contentsInTheme.map((cnt) => {
          const themeActivities = (cnt.activities || [])
            .filter((act) => isActivityInTheme(act, currentTheme))
            .sort((a, b) => {
              const idA = Number(a.activity_id || a.id) || 0;
              const idB = Number(b.activity_id || b.id) || 0;
              if (idA && idB) return idA - idB;
              const timeA = new Date(a.createdAt || a.created_at || 0).getTime();
              const timeB = new Date(b.createdAt || b.created_at || 0).getTime();
              return timeA - timeB;
            });
          const actCount = themeActivities.length;
          const hasScheduled = themeActivities.some((act) =>
            isActivityScheduledInTheme(act, currentTheme)
          );

          // Status filter
          if (selectedStatusFilter === 'HAS_ACT' && actCount === 0) return null;
          if (selectedStatusFilter === 'NO_ACT' && actCount > 0) return null;
          if (selectedStatusFilter === 'SCHEDULED' && !hasScheduled) return null;
          if (selectedStatusFilter === 'UNSCHEDULED' && hasScheduled) return null;

          // Search query
          if (q) {
            const matchCntTitle = (cnt.title || '').toLowerCase().includes(q);
            const matchGoalTitle = (g.title || '').toLowerCase().includes(q);
            const matchGoalCode = (g.goalCode || '').toLowerCase().includes(q);
            const matchAct = themeActivities.some((a) =>
              (a.title || '').toLowerCase().includes(q)
            );
            if (!matchCntTitle && !matchGoalTitle && !matchGoalCode && !matchAct) return null;
          }

          return {
            ...cnt,
            activitiesInTheme: themeActivities,
          };
        }).filter(Boolean);

        if (matchedContents.length === 0) return null;

        return {
          ...g,
          contentsInTheme: matchedContents,
        };
      })
      .filter(Boolean);

    // 2. Tính toán thống kê chủ đề & thống kê theo từng lĩnh vực
    let totalContents = 0;
    let totalActivities = 0;
    let scheduledActivities = 0;

    const domainCountMap = new Map();
    DOMAIN_GROUPS_CONFIG.forEach((cfg) => {
      domainCountMap.set(cfg.domain, { goalsCount: 0, contentsCount: 0, activitiesCount: 0 });
    });

    allGoalsInTheme.forEach((g) => {
      const stats = domainCountMap.get(g.domain) || { goalsCount: 0, contentsCount: 0, activitiesCount: 0 };
      stats.goalsCount += 1;

      g.contentsInTheme.forEach((cnt) => {
        totalContents += 1;
        stats.contentsCount += 1;

        (cnt.activitiesInTheme || []).forEach((act) => {
          totalActivities += 1;
          stats.activitiesCount += 1;
          if (isActivityScheduledInTheme(act, currentTheme)) {
            scheduledActivities += 1;
          }
        });
      });

      domainCountMap.set(g.domain, stats);
    });

    // 3. Domain chips để lọc nhanh
    const chips = DOMAIN_GROUPS_CONFIG.map((cfg) => {
      const stats = domainCountMap.get(cfg.domain) || { goalsCount: 0, contentsCount: 0, activitiesCount: 0 };
      return {
        key: cfg.domain,
        label: cfg.domainLabel,
        goalsCount: stats.goalsCount,
        activitiesCount: stats.activitiesCount,
      };
    }).filter((c) => c.goalsCount > 0);

    // 4. Lọc theo selectedDomain
    const filtered = allGoalsInTheme.filter((g) => {
      if (selectedDomain === 'ALL') return true;
      return g.domain === selectedDomain;
    });

    return {
      filteredGoals: filtered,
      domainChips: chips,
      themeStats: {
        goalsCount: allGoalsInTheme.length,
        contentsCount: totalContents,
        activitiesCount: totalActivities,
        scheduledCount: scheduledActivities,
      },
    };
  }, [data, currentTheme, searchQuery, selectedDomain, selectedStatusFilter]);

  // Drawer handlers
  const handleEditActivity = (goal, content, act) => {
    setActiveGoalContext(goal);
    setActiveContentContext(content);
    setDrawerInitialSlot({
      ...act,
      goalCode: goal.goalCode,
      goalTitle: goal.title,
      contentTitle: content.title,
      contentId: content.id || content.contentId,
      _content_id: content.contentId,
      themeId: act.themeId || currentTheme?.id,
      themeName: act.themeName || currentTheme?.name,
      isScheduled: isActivityScheduledInTheme(act, currentTheme),
      contentAllocatedThemes: content.contentAllocatedThemes || (currentTheme ? [currentTheme] : []),
    });
    setIsDrawerOpen(true);
  };

  const handleCreateActivityForContent = (goal, content, defaultSlot = 'DIRECTED_STUDY') => {
    setActiveGoalContext(goal);
    setActiveContentContext(content);
    setDrawerInitialSlot({
      id: null,
      contentId: content.id || content.contentId,
      _content_id: content.contentId,
      goalCode: goal.goalCode,
      goalTitle: goal.title,
      contentTitle: content.title,
      routineSlot: defaultSlot,
      title: '',
      objective: '',
      preparation: '',
      procedure: '',
      evaluationCriteria: '',
      themeId: currentTheme?.id,
      themeName: currentTheme?.name,
      isScheduled: false,
    });
    setIsDrawerOpen(true);
  };

  const handleSaveActivity = async (formData) => {
    try {
      const payload = {
        id: formData.id || undefined,
        contentId: formData.contentId || activeContentContext?.id || activeContentContext?.contentId,
        themeId: currentTheme?.id,
        routineSlot: formData.routineSlot,
        title: formData.title,
        objective: formData.objective,
        preparation: formData.preparation,
        procedure: formData.procedure,
        evaluationCriteria: formData.evaluationCriteria,
      };

      await planningApi.saveEducationalActivity(classId, payload);
      toast.success(formData.id ? 'Cập nhật hoạt động giáo dục thành công!' : 'Tạo mới hoạt động giáo dục thành công!');
      setIsDrawerOpen(false);
      await loadData();
    } catch (err) {
      console.error('Save activity error:', err);
      toast.error(err.response?.data?.message || err.message || 'Lỗi khi lưu hoạt động giáo dục.');
    }
  };

  const handleDeleteActivity = async (activityId) => {
    if (!activityId) return;
    try {
      await planningApi.deleteEducationalActivity(classId, activityId);
      toast.success('Đã xóa hoạt động giáo dục.');
      setIsDrawerOpen(false);
      await loadData();
    } catch (err) {
      console.error('Delete activity error:', err);
      toast.error(err.response?.data?.message || err.message || 'Không thể xóa hoạt động này.');
    }
  };

  if (isLoading && !data) {
    return <PlanningTabLoading message="Đang tải dữ liệu hoạt động giáo dục..." />;
  }

  // Giáo viên không được xem hoặc sử dụng dữ liệu chưa công bố (Đồng bộ hoàn toàn với Phân bổ mục tiêu: Ẩn cột danh sách chủ đề)
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
            {data?.message ||
              `Hiện tại Ban Giám Hiệu chưa ban hành bộ chủ đề và mục tiêu giáo dục áp dụng cho ${classGradeText}${classYearText ? ` (${classYearText})` : ''}. Giáo viên vui lòng liên hệ Ban Giám Hiệu để cập nhật kế hoạch chính thức.`}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[calc(100vh-104px)] lg:h-[calc(100vh-120px)] max-h-[calc(100vh-104px)] lg:max-h-[calc(100vh-120px)] min-h-0 flex overflow-hidden bg-background text-foreground select-none">
      {/* =========================================================================
          COLUMN 1: DANH SÁCH CHỦ ĐỀ (Đồng bộ chuẩn 100% với Phân bổ mục tiêu)
         ========================================================================= */}
      <div className="w-[240px] xl:w-[260px] shrink-0 border-r border-border bg-card flex flex-col h-full min-h-0 overflow-hidden">
        {/* Header Column 1 */}
        <div className="p-4 border-b border-border/80 bg-card shrink-0">
          <h2 className="text-[17px] font-semibold text-foreground tracking-tight">
            Danh sách chủ đề
          </h2>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            Xác định hoạt động theo chủ đề
          </p>
        </div>

        {/* Theme List */}
        <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-border/40 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {!isCurriculumPublished ? (
            <div className="p-6 text-center text-[12px] text-muted-foreground italic select-none">
              Chưa công bố bộ chủ đề
            </div>
          ) : availableThemes.length === 0 ? (
            <div className="p-6 text-center text-[12.5px] text-muted-foreground italic select-none">
              Chưa có chủ đề nào
            </div>
          ) : (
            availableThemes.map((th) => {
              const isSelected =
                th.code === selectedThemeCode ||
                th.id === selectedThemeCode ||
                String(th._theme_id) === String(selectedThemeCode);

              return (
                <div
                  key={th.id || th.code}
                  onClick={() => handleSelectTheme(th)}
                  className={cn(
                    'flex items-center gap-3 px-3.5 py-3 cursor-pointer transition-colors select-none text-left',
                    isSelected
                      ? 'bg-muted/70 font-semibold'
                      : 'hover:bg-muted/40 text-foreground'
                  )}
                >
                  {/* Topic Index square badge - Đồng bộ chuẩn xanh Sorak #1447e6 */}
                  <div
                    className={cn(
                      'size-7 rounded-none flex items-center justify-center text-[12px] font-semibold shrink-0 overflow-hidden',
                      isSelected
                        ? 'bg-[#1447e6] text-white'
                        : 'bg-muted text-muted-foreground border border-border/60'
                    )}
                  >
                    {th.code}
                  </div>

                  {/* Topic info: Name + Date Range */}
                  <div className="flex flex-col min-w-0 flex-1 leading-tight">
                    <span
                      className={cn(
                        'text-[13.5px] truncate',
                        isSelected ? 'text-foreground font-semibold' : 'text-foreground/85 font-medium'
                      )}
                    >
                      {th.name}
                    </span>
                    <div className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground font-normal mt-0.5 min-w-0">
                      {th.planStatus === 'USED' && (
                        <span className="inline-flex items-center text-emerald-600 dark:text-emerald-400 shrink-0" title="Đã phê duyệt">
                          <HugeiconsIcon icon={CheckmarkCircle01Icon} size={12} />
                        </span>
                      )}
                      {(th.planStatus === 'SUBMITTED' || th.planStatus === 'PENDING_APPROVAL') && (
                        <span className="inline-flex items-center text-amber-600 dark:text-amber-400 shrink-0" title="Đang chờ duyệt">
                          <HugeiconsIcon icon={Clock01Icon} size={12} />
                        </span>
                      )}
                      {th.planStatus === 'REJECTED' && (
                        <span className="inline-flex items-center text-rose-600 dark:text-rose-400 shrink-0" title="Yêu cầu sửa">
                          <HugeiconsIcon icon={Cancel01Icon} size={12} />
                        </span>
                      )}
                      <span className="truncate">{formatDateRange(th.startDate, th.endDate)}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* =========================================================================
          KHÔNG GIAN LÀM VIỆC (Header Clean + 1 VÙNG TOOLBAR GỘP + 2 Cột Nội Dung)
         ========================================================================= */}
      <div className="flex-1 min-h-0 flex flex-col h-full overflow-hidden bg-background">
        {!currentTheme ? (
          <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-8 text-center select-none">
            <div className="size-14 rounded-full bg-muted/60 border border-border/80 flex items-center justify-center text-muted-foreground mb-3">
              <HugeiconsIcon icon={Calendar03Icon} size={26} />
            </div>
            <h3 className="text-[16px] font-semibold text-foreground tracking-tight">
              Chưa có chủ đề giáo dục nào
            </h3>
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col h-full overflow-hidden">
            {/* ===================================================================
                HEADER CHỦ ĐỀ & TOOLBAR (GỘP THÀNH 1 HÀNG DUY NHẤT ĐỂ TIẾT KIỆM KHÔNG GIAN)
               =================================================================== */}
            <div className="h-13 sm:h-14 px-4 sm:px-5 border-b border-border/60 bg-card flex items-center justify-between gap-3 shrink-0 z-10 shadow-2xs select-none">
              {/* Phía trái: Tên chủ đề + Huy hiệu trạng thái */}
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <h1
                  className="text-[16px] sm:text-[18px] lg:text-[19px] font-semibold text-foreground tracking-tight truncate"
                  title={currentTheme?.name}
                >
                  {currentTheme?.name || 'Xác định hoạt động'}
                </h1>

                {currentTheme.planStatus === 'USED' && (
                  <span
                    className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 select-none border shrink-0 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/50"
                    title="Kế hoạch chủ đề đã được Ban Giám Hiệu phê duyệt"
                  >
                    <HugeiconsIcon
                      icon={CheckmarkCircle01Icon}
                      size={12}
                      className="shrink-0 text-emerald-600 dark:text-emerald-400"
                    />
                    <span>Đã duyệt</span>
                  </span>
                )}
                {currentTheme.planStatus === 'REJECTED' && (
                  <button
                    type="button"
                    onClick={() => setIsFeedbackModalOpen(true)}
                    className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 select-none border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100/80 dark:hover:bg-rose-900/60 transition-colors cursor-pointer shrink-0"
                    title="Nhấn để xem chi tiết ý kiến phản hồi"
                  >
                    <HugeiconsIcon icon={AlertCircleIcon} size={12} className="shrink-0 text-rose-600 dark:text-rose-400" />
                    <span>Yêu cầu sửa</span>
                  </button>
                )}
                {(currentTheme.planStatus === 'SUBMITTED' || currentTheme.planStatus === 'PENDING_APPROVAL') && (
                  <span
                    className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 select-none border shrink-0 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/50"
                    title="Kế hoạch chủ đề đang chờ phê duyệt"
                  >
                    <HugeiconsIcon
                      icon={Clock01Icon}
                      size={12}
                      className="shrink-0 text-amber-600 dark:text-amber-400"
                    />
                    <span>Chờ duyệt</span>
                  </span>
                )}
                {(!currentTheme.planStatus || currentTheme.planStatus === 'DRAFT') && (
                  <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium bg-muted text-muted-foreground border border-border shrink-0">
                    <span>Bản nháp</span>
                  </span>
                )}
              </div>

              {/* Phía phải: Ô tìm kiếm + Thống kê số lượng + Nút Bộ lọc (Nằm chung 1 hàng) */}
              <div className="flex items-center gap-2.5 shrink-0">
                {/* Ô tìm kiếm gọn gàng */}
                <div className="relative flex items-center shrink-0">
                  <HugeiconsIcon
                    icon={Search01Icon}
                    size={14}
                    className="absolute left-2.5 text-muted-foreground pointer-events-none z-10"
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm hoạt động..."
                    className="h-8 pl-8 pr-7 w-36 sm:w-44 lg:w-48 text-[12px] bg-background border border-border rounded-none focus:outline-none focus:border-[#1447e6] transition-colors placeholder:text-muted-foreground/60 text-foreground"
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

                {/* Thống kê tiến độ tinh gọn (Chỉ giữ chỉ số quan trọng, bỏ lặp lại 34 ND · 34 HĐ) */}
                <span className="text-[12px] text-muted-foreground whitespace-nowrap hidden sm:inline">
                  Đã xếp lịch: <strong className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{themeStats.scheduledCount}/{themeStats.activitiesCount}</strong>
                </span>

                {/* Nút Bộ lọc Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        'h-8 px-2.5 bg-background border border-border text-foreground hover:bg-muted rounded-none flex items-center gap-1.5 transition-colors cursor-pointer select-none text-[12px] shrink-0',
                        (selectedDomain !== 'ALL' || selectedStatusFilter !== 'ALL') &&
                          'border-[#1447e6] text-[#1447e6] bg-[#1447e6]/5 font-semibold',
                      )}
                      title="Bộ lọc hoạt động giáo dục"
                    >
                      <HugeiconsIcon icon={FilterHorizontalIcon} size={14} />
                      <span>Bộ lọc</span>
                      {(selectedDomain !== 'ALL' || selectedStatusFilter !== 'ALL') && (
                        <span className="size-1.5 rounded-full bg-[#1447e6]" />
                      )}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-60 p-1.5 rounded-none border border-border bg-card shadow-xl z-50 text-foreground"
                  >
                    {/* Header: Lĩnh vực phát triển */}
                    <div className="flex items-center justify-between px-2 py-1 text-[11px] font-bold text-muted-foreground uppercase tracking-wider select-none">
                      <span>Lĩnh vực phát triển</span>
                      {selectedDomain !== 'ALL' && (
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => setSelectedDomain('ALL')}
                          className="text-[11px] text-[#1447e6] hover:underline font-normal normal-case cursor-pointer"
                        >
                          Chọn tất cả
                        </button>
                      )}
                    </div>
                    {DOMAIN_OPTIONS.map((item) => (
                      <DropdownMenuItem
                        key={item.value}
                        onSelect={(e) => e.preventDefault()}
                        onClick={() => setSelectedDomain(item.value)}
                        className={cn(
                          'flex items-center justify-between h-7.5 px-2 text-[12px] cursor-pointer rounded-none hover:bg-muted/60 select-none',
                          selectedDomain === item.value && 'bg-muted/80 font-semibold text-[#1447e6]',
                        )}
                      >
                        <span>{item.label}</span>
                        {selectedDomain === item.value && (
                          <HugeiconsIcon icon={CheckmarkSquare02Icon} size={13} className="text-[#1447e6] shrink-0" />
                        )}
                      </DropdownMenuItem>
                    ))}

                    <DropdownMenuSeparator className="my-1 border-t border-border" />

                    {/* Header: Trạng thái hoạt động */}
                    <DropdownMenuLabel className="px-2 py-1 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      Trạng thái hoạt động
                    </DropdownMenuLabel>
                    {STATUS_FILTER_OPTIONS.map((st) => (
                      <DropdownMenuItem
                        key={st.value}
                        onSelect={(e) => e.preventDefault()}
                        onClick={() => setSelectedStatusFilter(st.value)}
                        className={cn(
                          'flex items-center justify-between h-7.5 px-2 text-[12px] cursor-pointer rounded-none hover:bg-muted/60',
                          selectedStatusFilter === st.value && 'bg-muted/80 font-semibold text-[#1447e6]',
                        )}
                      >
                        <span>{st.label}</span>
                        {selectedStatusFilter === st.value && (
                          <HugeiconsIcon icon={CheckmarkSquare02Icon} size={13} className="text-[#1447e6] shrink-0" />
                        )}
                      </DropdownMenuItem>
                    ))}

                    {/* Đặt lại bộ lọc */}
                    {(selectedDomain !== 'ALL' || selectedStatusFilter !== 'ALL') && (
                      <>
                        <DropdownMenuSeparator className="my-1 border-t border-border" />
                        <DropdownMenuItem
                          onSelect={(e) => e.preventDefault()}
                          onClick={() => {
                            setSelectedDomain('ALL');
                            setSelectedStatusFilter('ALL');
                          }}
                          className="flex items-center justify-center h-7 px-2 text-[12px] text-[#1447e6] hover:bg-[#1447e6]/10 cursor-pointer rounded-none font-medium text-center"
                        >
                          Đặt lại bộ lọc
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

          {/* ===================================================================
              VÙNG DANH SÁCH MỤC TIÊU & HOẠT ĐỘNG (ĐỒNG BỘ VỚI PHÂN BỔ MỤC TIÊU)
             =================================================================== */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4 [scrollbar-width:thin] bg-background">
            {filteredGoals.length === 0 ? (
              <div className="flex-1 min-h-[300px] flex flex-col items-center justify-center p-8 text-center select-none">
                <div className="size-12 rounded-full bg-muted/60 border border-border/80 flex items-center justify-center text-muted-foreground mb-3">
                  <HugeiconsIcon icon={Calendar03Icon} size={22} />
                </div>
                <h3 className="text-[15px] font-semibold text-foreground tracking-tight">
                  Không tìm thấy nội dung giáo dục nào
                </h3>
                <p className="text-[12px] text-muted-foreground mt-1 max-w-xs">
                  Thử thay đổi từ khóa tìm kiếm hoặc chọn lại bộ lọc.
                </p>
              </div>
            ) : (
              filteredGoals.map((goal) => {
                const contents = goal.contentsInTheme || [];
                const goalActivitiesCount = contents.reduce(
                  (acc, c) => acc + (c.activities?.length || 0),
                  0
                );
                const domainLabel = DOMAIN_LABELS[goal.domain] || goal.domainLabel || goal.domain;

                return (
                  <div
                    key={goal.id || goal.goalCode}
                    className="border border-border bg-card p-4 sm:p-5 rounded-none shadow-2xs space-y-4 text-left select-none"
                  >
                    {/* Header Mục tiêu: Mã MT + Khối Tiêu đề & Dòng Lĩnh vực gióng thẳng hàng 100% */}
                    <div className="flex items-start gap-3 pb-3 border-b border-border/40">
                      <span className="px-2 py-0.5 bg-[#1447e6]/10 text-[#1447e6] font-mono font-bold text-[11.5px] border border-[#1447e6]/20 rounded-none shrink-0 mt-0.5">
                        {goal.goalCode}
                      </span>
                      <div className="flex-1 min-w-0 space-y-1">
                        <h4 className="text-[14px] sm:text-[14.5px] leading-snug text-foreground font-semibold">
                          {goal.title}
                        </h4>
                        <div className="flex items-center gap-2 flex-wrap text-[12px] text-muted-foreground">
                          <span className="font-medium text-muted-foreground">
                            {domainLabel}
                          </span>
                          <span className="text-muted-foreground/40">·</span>
                          <span className="text-[11.5px] text-muted-foreground/80">
                            {contents.length} nội dung giáo dục{goalActivitiesCount > 0 ? ` · ${goalActivitiesCount} hoạt động` : ''}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Danh sách các Nội dung giáo dục */}
                    <div className="space-y-4">
                      {contents.map((cnt, cntIdx) => {
                        const activities = cnt.activitiesInTheme || (cnt.activities || []).filter((act) => isActivityInTheme(act, currentTheme));

                        return (
                          <div key={cnt.id || cnt.contentId} className="space-y-2.5">
                            {/* Hàng tiêu đề của NDGD */}
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-baseline gap-2 min-w-0">
                                <span className="font-mono text-[11.5px] text-muted-foreground/60 shrink-0">
                                  {String(cntIdx + 1).padStart(2, '0')}.
                                </span>
                                <span
                                  className="text-[13px] font-semibold text-foreground tracking-tight truncate"
                                  title={cnt.title}
                                >
                                  {cnt.title}
                                </span>
                              </div>

                              {/* Nút Thêm hoạt động dạng link gọn nhẹ khi đã có hoạt động */}
                              {!effectiveReadOnly && activities.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleCreateActivityForContent(goal, cnt)}
                                  className="text-[11.5px] text-[#1447e6] hover:underline font-medium inline-flex items-center gap-1 cursor-pointer shrink-0"
                                >
                                  <HugeiconsIcon icon={PlusSignIcon} size={12} />
                                  <span>Thêm hoạt động</span>
                                </button>
                              )}
                            </div>

                            {/* Lưới Thẻ Hoạt Động hoặc Ô trống thêm HĐ */}
                            {activities.length === 0 ? (
                              !effectiveReadOnly ? (
                                <button
                                  type="button"
                                  onClick={() => handleCreateActivityForContent(goal, cnt)}
                                  className="w-full h-8 border border-dashed border-border/80 hover:border-[#1447e6]/50 bg-background hover:bg-[#1447e6]/[0.03] text-muted-foreground/75 hover:text-[#1447e6] flex items-center justify-center gap-1.5 text-[12px] font-medium transition-all cursor-pointer group select-none rounded-none"
                                >
                                  <HugeiconsIcon
                                    icon={PlusSignIcon}
                                    size={12}
                                    className="text-muted-foreground/60 group-hover:text-[#1447e6] transition-colors"
                                  />
                                  <span>Thêm hoạt động</span>
                                </button>
                              ) : (
                                <div className="py-1 px-1 text-[11.5px] text-muted-foreground/50 italic select-none">
                                  Chưa thiết lập hoạt động
                                </div>
                              )
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {activities.map((act) => {
                                  const slotKey = act.routineSlot || act.routine_slot;
                                  const slotDef = ROUTINE_SLOTS_ORDER.find((s) => s.key === slotKey);
                                  const isScheduled = isActivityScheduledInTheme(act, currentTheme);
                                  const cleanTitle = formatCleanActivityTitle(act.title, cnt.title);

                                  return (
                                    <div
                                      key={act.id}
                                      onClick={() => handleEditActivity(goal, cnt, act)}
                                      className="p-3.5 rounded-none border border-border/70 hover:border-[#1447e6]/40 hover:shadow-2xs bg-card transition-all cursor-pointer group select-none space-y-1.5"
                                    >
                                      {/* Routine Slot & Khung giờ kèm dấu tick đã xếp lịch */}
                                      <div className="flex items-center justify-between text-[11.5px] text-muted-foreground">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                          <span className="font-semibold text-foreground/85 truncate">
                                            {slotDef?.shortLabel || slotKey}
                                          </span>
                                          {isScheduled && (
                                            <span
                                              title="Đã xếp lịch tuần"
                                              className="text-emerald-600 dark:text-emerald-400 shrink-0 inline-flex items-center"
                                            >
                                              <HugeiconsIcon icon={Tick01Icon} size={14} strokeWidth={2.5} />
                                            </span>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                          <span className="font-mono text-[11px] text-muted-foreground/70 shrink-0">
                                            {slotDef?.defaultTime || ''}
                                          </span>
                                        </div>
                                      </div>

                                      {/* Tiêu đề hoạt động */}
                                      <h5
                                        title={cleanTitle}
                                        className="text-[13px] font-semibold text-foreground group-hover:text-[#1447e6] transition-colors leading-snug line-clamp-2"
                                      >
                                        {cleanTitle}
                                      </h5>

                                      {/* Mục tiêu tóm tắt */}
                                      {act.objective && (
                                        <p className="text-[11.5px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                                          {act.objective}
                                        </p>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
          </div>
        )}
      </div>

      {/* Drawer xem & chỉnh sửa Hoạt động giáo dục */}
      <ActivitySlotDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        initialSlot={drawerInitialSlot}
        slot={drawerInitialSlot}
        allThemes={data?.themes || []}
        allocatedThemes={currentTheme ? [currentTheme] : []}
        onSave={handleSaveActivity}
        onDelete={handleDeleteActivity}
        readOnly={effectiveReadOnly}
        lockRoutineSlot={Boolean(drawerInitialSlot?.isScheduled)}
      />

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
                <span> ({formatDateRange(currentTheme.startDate, currentTheme.endDate)})</span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <span className="text-[11.5px] font-semibold text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                <HugeiconsIcon icon={AlertCircleIcon} size={13} className="text-rose-600 dark:text-rose-400" />
                Lý do yêu cầu sửa từ Ban Giám Hiệu:
              </span>
              <div className="bg-rose-50/70 dark:bg-rose-950/25 border border-rose-200/80 dark:border-rose-900/40 p-3.5 text-rose-800 dark:text-rose-200 text-xs leading-relaxed font-medium">
                "{currentTheme?.rejectionReason || 'Ban Giám Hiệu yêu cầu rà soát và bổ sung kế hoạch.'}"
              </div>
            </div>

            <p className="text-muted-foreground text-[11.5px] leading-relaxed pt-1">
              Vui lòng kiểm tra lại các hoạt động theo góp ý trên và nộp lại cho Ban Giám Hiệu duyệt.
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

      {/* Dialog Xác nhận Xóa hoạt động trực tiếp từ thẻ */}
      <Dialog open={Boolean(cardActivityToDelete)} onOpenChange={(open) => !open && setCardActivityToDelete(null)}>
        <DialogContent className="w-[92vw] max-w-[440px] sm:max-w-[440px] p-6 rounded-none border border-border bg-card shadow-2xl text-foreground select-none space-y-4">
          <DialogHeader className="space-y-1.5 pb-0 text-left">
            <DialogTitle className="text-[16px] font-semibold text-foreground tracking-tight">
              Xác nhận xóa hoạt động giáo dục
            </DialogTitle>
            <DialogDescription className="text-[13px] text-muted-foreground leading-relaxed pt-1">
              Hoạt động sẽ bị xóa khỏi danh sách của chủ đề. Thao tác này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>

          <div className="p-3 bg-muted/20 border border-border/70 rounded-none">
            <div className="font-semibold text-foreground text-[13px] leading-snug">
              {cardActivityToDelete?.title}
            </div>
          </div>

          <DialogFooter className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/60 sm:space-x-0">
            <Button
              type="button"
              variant="outline"
              disabled={isDeletingCardActivity}
              onClick={() => setCardActivityToDelete(null)}
              className="h-8 px-3.5 text-[12.5px] rounded-none border border-border cursor-pointer shadow-none"
            >
              Hủy
            </Button>
            <Button
              type="button"
              disabled={isDeletingCardActivity}
              onClick={async () => {
                if (cardActivityToDelete?.id) {
                  try {
                    setIsDeletingCardActivity(true);
                    await handleDeleteActivity(cardActivityToDelete.id);
                    setCardActivityToDelete(null);
                  } catch (err) {
                    console.error('Delete activity error:', err);
                  } finally {
                    setIsDeletingCardActivity(false);
                  }
                }
              }}
              className="h-8 px-4 text-[12.5px] font-medium rounded-none bg-destructive hover:bg-destructive/90 text-white cursor-pointer shadow-none"
            >
              {isDeletingCardActivity ? 'Đang xóa...' : 'Xóa hoạt động'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default EducationalActivitiesTab;
