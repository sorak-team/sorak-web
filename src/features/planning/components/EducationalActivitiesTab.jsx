import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Search01Icon,
  PlusSignIcon,
  Delete02Icon,
  PencilEdit02Icon,
  ArrowDown01Icon,
  ArrowRight01Icon,
  ArrowLeft01Icon,
  CheckmarkCircle01Icon,
  SparklesIcon,
  UserIcon,
} from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { cn } from '@/shared/lib/utils';
import { toast } from 'sonner';
import { useAuthStore } from '@/features/auth';
import { planningApi } from '../planning.api';
import { ActivitySlotDrawer } from './ActivitySlotDrawer';

const DOMAIN_OPTIONS = [
  { value: 'ALL', label: 'Tất cả lĩnh vực' },
  { value: 'PHYSICAL', label: 'Thể chất' },
  { value: 'COGNITIVE', label: 'Nhận thức' },
  { value: 'LANGUAGE', label: 'Ngôn ngữ' },
  { value: 'SOCIO_EMOTIONAL', label: 'Tình cảm - KNXH' },
  { value: 'AESTHETIC', label: 'Thẩm mỹ' },
];

const DOMAIN_GROUPS_CONFIG = [
  { code: '1.', domain: 'PHYSICAL', domainLabel: 'Phát triển thể chất' },
  { code: '2.', domain: 'COGNITIVE', domainLabel: 'Phát triển nhận thức' },
  { code: '3.', domain: 'LANGUAGE', domainLabel: 'Phát triển ngôn ngữ' },
  { code: '4.', domain: 'SOCIO_EMOTIONAL', domainLabel: 'Phát triển tình cảm - kỹ năng xã hội' },
  { code: '5.', domain: 'AESTHETIC', domainLabel: 'Phát triển thẩm mỹ' },
];

const DOMAIN_SHORT_LABELS = {
  PHYSICAL: 'Thể chất',
  COGNITIVE: 'Nhận thức',
  LANGUAGE: 'Ngôn ngữ',
  SOCIO_EMOTIONAL: 'Tình cảm - KNXH',
  AESTHETIC: 'Thẩm mỹ',
};

const ROUTINE_SLOT_LABELS = {
  ARRIVAL_PLAY: 'Đón trẻ',
  MORNING_EXERCISE: 'Thể dục sáng',
  DIRECTED_STUDY: 'Học',
  CORNER_PLAY: 'Hoạt động góc',
  OUTDOOR_PLAY: 'Ngoài trời',
  AFTERNOON_ACTIVITY: 'Chiều',
  RETURN_CHILD: 'Trả trẻ',
};

export function EducationalActivitiesTab({ classId = '1' }) {
  const { t, i18n } = useTranslation();
  const isVi = (i18n?.language || 'vi').startsWith('vi');
  const [searchParams, setSearchParams] = useSearchParams();
  const currentUser = useAuthStore((state) => state.user);
  const isBgh = Boolean(
    currentUser?.role === 'PRINCIPAL_BGH' ||
    currentUser?.role === 'PRINCIPAL' ||
    currentUser?.role === 'VICE_PRINCIPAL' ||
    currentUser?.role?.toLowerCase()?.includes('principal') ||
    currentUser?.role?.toLowerCase()?.includes('bgh')
  );
  const currentStaffName = currentUser?.fullName || currentUser?.name || currentUser?.username || 'Giáo viên';

  // Selected goal ID from search params (null = List view, string = Detail view)
  const selectedGoalId = searchParams.get('goalId');

  const [data, setData] = useState(null);
  const [selectedDomain, setSelectedDomain] = useState('ALL');
  const [selectedThemeFilter, setSelectedThemeFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const availableThemes = useMemo(() => {
    return data?.themes || [];
  }, [data]);

  // Expanded domain groups in List View: { [domainKey]: boolean }
  const [expandedDomains, setExpandedDomains] = useState({
    PHYSICAL: true,
    COGNITIVE: true,
    LANGUAGE: true,
    SOCIO_EMOTIONAL: true,
    AESTHETIC: true,
  });

  // Drawer state for creating / editing activity
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerInitialSlot, setDrawerInitialSlot] = useState(null);
  const [activeGoalContext, setActiveGoalContext] = useState(null);
  const [activeContentContext, setActiveContentContext] = useState(null);
  const [lastUpdatedTime, setLastUpdatedTime] = useState(null);

  // Load activities data
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const res = await planningApi.getThemeActivities(classId, {});
        setData(res);
      } catch (err) {
        console.warn('Failed to load theme activities:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [classId]);

  // Group goals by domain for the List View matching Image 2
  const domainGroups = useMemo(() => {
    if (!data?.goals) return [];
    const q = searchQuery.trim().toLowerCase();

    return DOMAIN_GROUPS_CONFIG.map((conf) => {
      let goals = data.goals.filter((g) => g.domain === conf.domain);

      // Filter by domain dropdown
      if (selectedDomain !== 'ALL' && conf.domain !== selectedDomain) {
        return null;
      }

      // Filter by theme dropdown
      if (selectedThemeFilter !== 'ALL') {
        goals = goals.filter((g) => {
          if (!g.allocatedThemes?.length) return false;
          return g.allocatedThemes.some(
            (th) => String(th.id) === String(selectedThemeFilter) || String(th.themeId) === String(selectedThemeFilter) || String(th._theme_id) === String(selectedThemeFilter)
          );
        });
      }

      // Filter by search query
      if (q) {
        goals = goals.filter((g) => {
          const matchGoal =
            g.goalCode.toLowerCase().includes(q) ||
            g.title.toLowerCase().includes(q) ||
            (g.indicatorCode && g.indicatorCode.toLowerCase().includes(q)) ||
            (g.contents &&
              g.contents.some(
                (c) =>
                  c.title.toLowerCase().includes(q) ||
                  c.activities.some((a) => a.title.toLowerCase().includes(q)),
              ));
          return matchGoal;
        });
      }

      if (goals.length === 0) return null;

      return {
        code: conf.code,
        domain: conf.domain,
        domainLabel: conf.domainLabel,
        goals,
      };
    }).filter(Boolean);
  }, [data, selectedDomain, selectedThemeFilter, searchQuery]);

  // Total count of goals
  const totalGoalsCount = useMemo(() => {
    if (!data?.goals) return 0;
    return domainGroups.reduce((acc, grp) => acc + grp.goals.length, 0);
  }, [data, domainGroups]);

  // Find active goal for Detail View
  const activeGoal = useMemo(() => {
    if (!selectedGoalId || !data?.goals) return null;
    return data.goals.find((g) => g.id === selectedGoalId) || null;
  }, [selectedGoalId, data]);

  // Index of active goal for Prev / Next navigation
  const activeGoalIndex = useMemo(() => {
    if (!activeGoal || !data?.goals) return -1;
    return data.goals.findIndex((g) => g.id === activeGoal.id);
  }, [activeGoal, data]);

  const prevGoal = activeGoalIndex > 0 ? data?.goals?.[activeGoalIndex - 1] : null;
  const nextGoal =
    activeGoalIndex >= 0 && activeGoalIndex < (data?.goals?.length || 0) - 1
      ? data?.goals?.[activeGoalIndex + 1]
      : null;

  // Toggle domain expand/collapse in List View
  const toggleDomain = (domainKey) => {
    setExpandedDomains((prev) => ({
      ...prev,
      [domainKey]: !prev[domainKey],
    }));
  };

  const handleExpandAll = () => {
    const map = {};
    DOMAIN_GROUPS_CONFIG.forEach((d) => {
      map[d.domain] = true;
    });
    setExpandedDomains(map);
  };

  const handleCollapseAll = () => {
    setExpandedDomains({});
  };

  // Navigate to goal detail
  const handleSelectGoal = useCallback((goal) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('goalId', goal.id);
      if (goal.goalCode) next.set('goalCode', goal.goalCode);
      if (goal.title) next.set('goalTitle', goal.title);
      return next;
    });
  }, [setSearchParams]);

  // Keyboard navigation: ArrowLeft (<-) for previous goal, ArrowRight (->) for next goal
  useEffect(() => {
    if (!activeGoal) return;

    const handleKeyDown = (e) => {
      // Do nothing if typing in an input, textarea, or contentEditable element
      const target = e.target;
      const tagName = target?.tagName?.toUpperCase();
      if (tagName === 'INPUT' || tagName === 'TEXTAREA' || target?.isContentEditable) {
        return;
      }

      // Do nothing if drawer is open
      if (isDrawerOpen) {
        return;
      }

      if (e.key === 'ArrowLeft') {
        if (prevGoal) {
          e.preventDefault();
          handleSelectGoal(prevGoal);
        }
      } else if (e.key === 'ArrowRight') {
        if (nextGoal) {
          e.preventDefault();
          handleSelectGoal(nextGoal);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeGoal, prevGoal, nextGoal, handleSelectGoal, isDrawerOpen]);

  // Back to list view
  const handleBackToList = () => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('goalId');
      next.delete('goalCode');
      next.delete('goalTitle');
      return next;
    });
  };

  // Trigger Create Activity for specific content
  const handleCreateActivityForContent = (goal, content) => {
    setActiveGoalContext(goal);
    setActiveContentContext(content);
    const cntThemes = content?.allocatedThemes || [];
    const goalThemes = goal?.allocatedThemes || [];
    let defaultThemeId = '';
    let defaultThemeName = '';

    if (cntThemes.length > 0) {
      defaultThemeId = cntThemes[0].id || cntThemes[0].themeId;
      defaultThemeName = cntThemes[0].name || cntThemes[0].themeName || '';
    } else if (selectedThemeFilter && selectedThemeFilter !== 'ALL' && selectedThemeFilter !== 'UNALLOCATED') {
      const filterStr = String(selectedThemeFilter).trim();
      const matched = goalThemes.find(
        (th) =>
          String(th.id || '').trim() === filterStr ||
          String(th.themeId || '').trim() === filterStr ||
          String(th._theme_id || '').trim() === filterStr ||
          String(th.code || '').trim() === filterStr
      );
      if (matched) {
        defaultThemeId = matched.id || matched.themeId;
        defaultThemeName = matched.name || matched.themeName || '';
      }
    } else if (goalThemes.length === 1) {
      defaultThemeId = goalThemes[0].id || goalThemes[0].themeId;
      defaultThemeName = goalThemes[0].name || goalThemes[0].themeName || '';
    }

    setDrawerInitialSlot({
      title: '',
      contentId: content?.id,
      themeId: defaultThemeId,
      theme_id: defaultThemeId,
      themeName: defaultThemeName,
      routineSlot: 'DIRECTED_STUDY',
      objective: '',
      preparation: '',
      procedure: '',
      evaluation_criteria: '',
      contentTitle: content?.title,
      contentAllocatedThemes: cntThemes,
    });
    setIsDrawerOpen(true);
  };

  // Trigger Edit Activity
  const handleEditActivity = (goal, content, activity) => {
    setActiveGoalContext(goal);
    setActiveContentContext(content);
    setDrawerInitialSlot({
      id: activity.id,
      title: activity.title,
      contentId: content?.id,
      themeId: activity.themeId || activity.theme_id || '',
      theme_id: activity.themeId || activity.theme_id || '',
      themeName: activity.themeName || '',
      routineSlot: activity.routineSlot || activity.routine_slot || 'DIRECTED_STUDY',
      objective: activity.objective || '',
      preparation: activity.preparation || '',
      procedure: activity.procedure || '',
      evaluation_criteria: activity.evaluation_criteria || activity.evaluation || '',
      creatorName: activity.creatorName,
      updaterName: activity.updaterName,
      createdAt: activity.createdAt,
      updatedAt: activity.updatedAt,
      contentTitle: content?.title,
      contentAllocatedThemes: content?.allocatedThemes || [],
    });
    setIsDrawerOpen(true);
  };

  // Delete activity
  const handleDeleteActivity = async (activityId) => {
    if (!activityId) return;
    if (!window.confirm('Bạn có chắc chắn muốn xóa hoạt động giáo dục này?')) {
      return;
    }
    try {
      await planningApi.deleteEducationalActivity(classId, activityId);
      setData((prev) => {
        if (!prev) return prev;
        const targetActId = String(activityId).trim();
        const newGoals = prev.goals.map((g) => ({
          ...g,
          contents: g.contents.map((c) => {
            const nextActs = c.activities.filter(
              (a) =>
                a.id !== activityId &&
                String(a.id) !== targetActId &&
                String(a.public_id || '') !== targetActId &&
                String(a.activity_id || '') !== targetActId
            );
            return {
              ...c,
              activities: nextActs,
              activitiesCount: nextActs.length,
            };
          }),
        }));
        return { ...prev, goals: newGoals };
      });
      setLastUpdatedTime(new Date());
      setIsDrawerOpen(false);
      toast.success('Đã xóa hoạt động giáo dục thành công');
      // Background re-fetch to keep 100% in sync with database
      planningApi.getThemeActivities(classId, {}).then(setData).catch(() => {});
    } catch (err) {
      const errMsg = err?.response?.data?.message || err?.message || 'Không thể xóa hoạt động';
      toast.error(errMsg);
    }
  };

  // Save activity from drawer
  const handleSaveActivity = async (savedSlot) => {
    try {
      const isEditing = Boolean(drawerInitialSlot?.id);
      const payload = {
        ...(isEditing ? { id: drawerInitialSlot.id } : {}),
        contentId: activeContentContext?.id || drawerInitialSlot?.contentId || 'cnt-1-1',
        title: savedSlot.title,
        themeId: savedSlot.themeId || savedSlot.theme_id || null,
        theme_id: savedSlot.themeId || savedSlot.theme_id || null,
        themeName: savedSlot.themeName || null,
        routineSlot: savedSlot.routineSlot || 'DIRECTED_STUDY',
        routine_slot: savedSlot.routineSlot || 'DIRECTED_STUDY',
        objective: savedSlot.objective,
        preparation: savedSlot.preparation,
        procedure: savedSlot.procedure,
        evaluation_criteria: savedSlot.evaluation_criteria || savedSlot.evaluation,
        evaluation: savedSlot.evaluation_criteria || savedSlot.evaluation,
        creatorName: drawerInitialSlot?.creatorName || currentStaffName,
        updaterName: isEditing ? currentStaffName : null,
      };

      const res = await planningApi.saveEducationalActivity(classId, payload);
      const resData = res?.data || res?.activity || res;
      const savedActivity = {
        ...payload,
        ...(resData && typeof resData === 'object' ? resData : {}),
        creatorName: resData?.creatorName || payload.creatorName,
        updaterName: isEditing ? (resData?.updaterName || currentStaffName) : null,
      };

      setData((prev) => {
        if (!prev) return prev;
        const targetContentId = String(payload.contentId);
        const newGoals = prev.goals.map((g) => ({
          ...g,
          contents: g.contents.map((c) => {
            if (String(c.id) === targetContentId) {
              const isMatch = (a) =>
                a.id === savedActivity.id ||
                String(a.id) === String(savedActivity.id) ||
                (savedActivity.public_id && String(a.public_id || '') === String(savedActivity.public_id)) ||
                (payload.id && (String(a.id) === String(payload.id) || String(a.public_id || '') === String(payload.id)));
              const exists = c.activities.some(isMatch);
              return {
                ...c,
                activities: exists
                  ? c.activities.map((a) => (isMatch(a) ? savedActivity : a))
                  : [...c.activities, savedActivity],
              };
            }
            return c;
          }),
        }));
        return { ...prev, goals: newGoals };
      });

      setLastUpdatedTime(new Date());
      setIsDrawerOpen(false);
      const savedThemeId = payload.themeId || payload.theme_id;
      const isFilteredOtherTheme =
        !isEditing &&
        selectedThemeFilter &&
        selectedThemeFilter !== 'ALL' &&
        savedThemeId &&
        String(savedThemeId) !== String(selectedThemeFilter);

      if (isFilteredOtherTheme) {
        toast.success(`Đã thêm hoạt động vào chủ đề "${payload.themeName || 'đã chọn'}"`, {
          action: {
            label: 'Xem hoạt động',
            onClick: () => setSelectedThemeFilter(savedThemeId),
          },
        });
      } else {
        toast.success(isEditing ? 'Đã cập nhật hoạt động giáo dục thành công' : 'Đã thêm hoạt động giáo dục thành công');
      }
      // Background re-fetch to keep 100% in sync with database
      planningApi.getThemeActivities(classId, {}).then(setData).catch(() => {});
    } catch (err) {
      console.warn('Failed to save activity:', err);
      toast.error('Không thể lưu hoạt động');
    }
  };

  // =========================================================================
  // VIEW 2: CHI TIẾT MỤC TIÊU & HOẠT ĐỘNG GIÁO DỤC (Giống CurriculumSingleGoalDetailPage)
  // =========================================================================
  if (activeGoal) {
    const getDomainShortLabel = (domainKey, rawLabel) => {
      if (domainKey === 'PHYSICAL' || rawLabel?.includes('Thể chất')) return t('domains.physical', 'Thể chất');
      if (domainKey === 'COGNITIVE' || rawLabel?.includes('Nhận thức')) return t('domains.cognitive', 'Nhận thức');
      if (domainKey === 'LANGUAGE' || rawLabel?.includes('Ngôn ngữ')) return t('domains.language', 'Ngôn ngữ');
      if (domainKey === 'SOCIO_EMOTIONAL' || rawLabel?.includes('Tình cảm') || rawLabel?.includes('Xã hội')) return t('domains.socialEmotional', 'Tình cảm - KN Xã hội');
      if (domainKey === 'AESTHETIC' || rawLabel?.includes('Thẩm mỹ')) return t('domains.aesthetic', 'Thẩm mỹ');
      return rawLabel || t('domains.physical', 'Thể chất');
    };

    const getRoutineSlotLabel = (slotKey) => {
      if (slotKey === 'MORNING_EXERCISE') return t('planning.slotMorningExercise', 'Thể dục sáng');
      if (slotKey === 'DIRECTED_STUDY') return t('planning.slotDirectedStudy', 'Học (Hoạt động học có chủ đích)');
      if (slotKey === 'CORNER_PLAY') return t('planning.slotCornerPlay', 'Chơi, hoạt động ở các góc');
      if (slotKey === 'OUTDOOR_PLAY') return t('planning.slotOutdoorPlay', 'Chơi ngoài trời');
      if (slotKey === 'ARRIVAL_PLAY') return t('planning.slotArrivalPlay', 'Đón trẻ, chơi');
      if (slotKey === 'AFTERNOON_ACTIVITY') return t('planning.slotAfternoonActivity', 'Chơi, hoạt động theo ý thích (Chiều)');
      if (slotKey === 'RETURN_CHILD') return t('planning.slotReturnChild', 'Trả trẻ');
      return slotKey;
    };

    const domainDisplay = getDomainShortLabel(activeGoal.domain, activeGoal.domainLabel);

    // Thời gian cập nhật gần nhất của mục tiêu này
    let latestActivityTimestamp = null;
    (activeGoal.contents || []).forEach((c) => {
      (c.activities || []).forEach((a) => {
        const rawTime = a.updatedAt || a.createdAt || a.updated_at || a.created_at;
        if (rawTime) {
          const t = new Date(rawTime);
          if (!isNaN(t.getTime()) && (!latestActivityTimestamp || t > latestActivityTimestamp)) {
            latestActivityTimestamp = t;
          }
        }
      });
    });

    const effectiveUpdatedTime = lastUpdatedTime || latestActivityTimestamp;

    const formatDateTime = (date) => {
      if (!date) return null;
      const d = new Date(date);
      if (isNaN(d.getTime())) return null;
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${hours}:${minutes} - ${day}/${month}/${year}`;
    };

    return (
      <div className="w-full flex-1 flex flex-col bg-background text-foreground select-none">
        <div className="px-6 py-5 space-y-6">
          {/* Clean Header: Title + Right Actions (Khớp 100% Image 1, không có nút back) */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-border">
            <div className="space-y-1 min-w-0">
              <h1 className="text-[24px] font-semibold text-foreground tracking-tight truncate flex items-baseline gap-2">
                <span className="font-mono text-foreground shrink-0 font-bold">
                  {activeGoal.goalCode}
                </span>
                <span className="text-muted-foreground font-normal shrink-0">:</span>
                <span className="truncate">{activeGoal.title}</span>
              </h1>
              <p className="text-[13px] text-muted-foreground font-normal mt-0.5">
                {t('planning.singleGoalSubtitle', 'Thiết lập chi tiết mục tiêu và danh sách nội dung giáo dục cụ thể')}
              </p>
            </div>

            {/* Header Right Actions: Bộ chuyển mục tiêu Trước / Tiếp */}
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="flex items-center border border-border bg-background">
                <button
                  type="button"
                  disabled={!prevGoal}
                  onClick={() => {
                    if (prevGoal) handleSelectGoal(prevGoal);
                  }}
                  className={cn(
                    'h-8 px-2.5 flex items-center gap-1 text-[12.5px] font-medium text-foreground hover:bg-muted border-r border-border transition-colors cursor-pointer select-none',
                    !prevGoal &&
                      'opacity-35 cursor-not-allowed hover:bg-transparent text-muted-foreground',
                  )}
                  title={
                    prevGoal
                      ? `${t('planning.prevGoal', 'Mục tiêu trước')} (phím ←): ${prevGoal.goalCode} - ${prevGoal.title}`
                      : t('planning.firstGoalReached', 'Đã ở mục tiêu đầu tiên')
                  }
                >
                  <HugeiconsIcon icon={ArrowLeft01Icon} size={14} />
                  <span className="hidden sm:inline">{t('common.prev', 'Trước')}</span>
                </button>

                <span className="px-2.5 text-[11.5px] font-mono text-muted-foreground select-none">
                  {activeGoalIndex + 1}/{data?.goals?.length || 1}
                </span>

                <button
                  type="button"
                  disabled={!nextGoal}
                  onClick={() => {
                    if (nextGoal) handleSelectGoal(nextGoal);
                  }}
                  className={cn(
                    'h-8 px-2.5 flex items-center gap-1 text-[12.5px] font-medium text-foreground hover:bg-muted border-l border-border transition-colors cursor-pointer select-none',
                    !nextGoal &&
                      'opacity-35 cursor-not-allowed hover:bg-transparent text-muted-foreground',
                  )}
                  title={
                    nextGoal
                      ? `${t('planning.nextGoal', 'Mục tiêu tiếp theo')} (phím →): ${nextGoal.goalCode} - ${nextGoal.title}`
                      : t('planning.lastGoalReached', 'Đã ở mục tiêu cuối cùng')
                  }
                >
                  <span className="hidden sm:inline">{t('common.next', 'Tiếp')}</span>
                  <HugeiconsIcon icon={ArrowRight01Icon} size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Card 1: Thông tin mục tiêu (Khớp 100% Image 1) */}
          <div className="border border-border bg-card p-5 space-y-4 shadow-2xs">
            <div className="pb-2 border-b border-border/60">
              <h2 className="text-[14.5px] font-semibold text-foreground">
                {t('planning.goalInfoTitle', 'Thông tin mục tiêu')}
              </h2>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                {t('planning.goalInfoSubtitle', 'Chi tiết lĩnh vực phát triển và chỉ số Bộ Giáo dục của mục tiêu.')}
              </p>
            </div>

            {/* 3-column grid: Lĩnh vực phát triển, Chỉ số Bộ Giáo dục, Chủ đề áp dụng (Kế hoạch năm) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3 bg-muted/20 border border-border/70 flex flex-col gap-1">
                <span className="text-[11.5px] font-medium text-muted-foreground uppercase tracking-wider">
                  {t('planning.devDomainLabel', 'Lĩnh vực phát triển')}
                </span>
                <span className="text-[13.5px] font-semibold text-foreground truncate">
                  {domainDisplay}
                </span>
              </div>

              <div className="p-3 bg-muted/20 border border-border/70 flex flex-col gap-1">
                <span className="text-[11.5px] font-medium text-muted-foreground uppercase tracking-wider">
                  {t('planning.moetIndicatorLabel', 'Chỉ số Bộ Giáo dục')}
                </span>
                <div className="text-[13px]">
                  {activeGoal.indicatorCode ? (
                    <span className="font-mono font-medium text-foreground">
                      {activeGoal.indicatorCode}
                    </span>
                  ) : (
                    <span className="text-muted-foreground italic">
                      {t('planning.noIndicator', 'Không có chỉ số')}
                    </span>
                  )}
                </div>
              </div>

              <div className="p-3 bg-muted/20 border border-border/70 flex flex-col gap-1">
                <span className="text-[11.5px] font-medium text-muted-foreground uppercase tracking-wider">
                  Chủ đề áp dụng (Kế hoạch năm)
                </span>
                <div className="text-[13px] text-foreground leading-snug">
                  {activeGoal.allocatedThemes && activeGoal.allocatedThemes.length > 0 ? (
                    <span>
                      {activeGoal.allocatedThemes.map((th, i) => (
                        <span key={th.id || th.themeId || i}>
                          {i > 0 && <span className="text-muted-foreground mx-1.5">•</span>}
                          <span className="font-medium">
                            {th.code ? `Chủ đề ${th.code}: ` : ''}{th.name || th.themeName}
                          </span>
                        </span>
                      ))}
                    </span>
                  ) : (
                    <span className="text-muted-foreground italic">
                      Chưa phân bổ vào chủ đề nào
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Danh sách nội dung giáo dục (Khớp 100% Image 1) */}
          <div className="border border-border bg-card p-5 space-y-4 shadow-2xs">
            <div className="pb-2 border-b border-border/60 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-[14.5px] font-semibold text-foreground">
                  {t('planning.educationalContentListTitle', 'Danh sách nội dung giáo dục')}
                </h2>
                <p className="text-[12px] text-muted-foreground mt-0.5">
                  {t('planning.educationalContentListSubtitle', 'Thiết lập các nội dung giáo dục cụ thể theo chuẩn Thông tư 51/BGDĐT.')}
                </p>
              </div>

              {/* Theme filter for activities under this goal */}
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-medium text-muted-foreground">Lọc chủ đề:</span>
                <select
                  value={selectedThemeFilter}
                  onChange={(e) => setSelectedThemeFilter(e.target.value)}
                  className="h-8 px-2.5 bg-background border border-border text-[12.5px] text-foreground rounded-none outline-none focus:border-primary cursor-pointer"
                >
                  <option value="ALL">Tất cả nội dung ({activeGoal.contents?.length || 0})</option>
                  {activeGoal.allocatedThemes?.map((th) => (
                    <option key={th.id || th.themeId} value={th.id || th.themeId}>
                      {th.code ? `Chủ đề ${th.code}: ` : ''}{th.name || th.themeName}
                    </option>
                  ))}
                  <option value="UNALLOCATED">Chưa phân bổ chủ đề</option>
                </select>
              </div>
            </div>

            {/* Sub-items List */}
            <div className="space-y-3">
              {(() => {
                const contentsList = activeGoal.contents || [];
                const displayedContents = contentsList.filter((content) => {
                  if (!selectedThemeFilter || selectedThemeFilter === 'ALL') return true;
                  if (selectedThemeFilter === 'UNALLOCATED') {
                    return !content.allocatedThemes || content.allocatedThemes.length === 0;
                  }
                  const selId = String(selectedThemeFilter).trim();
                  const matchedInTheme = (content.allocatedThemes || []).some(
                    (th) =>
                      String(th.id || '').trim() === selId ||
                      String(th.themeId || '').trim() === selId ||
                      String(th._theme_id || '').trim() === selId ||
                      String(th.code || '').trim() === selId
                  );
                  const hasActivityInTheme = (content.activities || []).some(
                    (act) =>
                      String(act.themeId || act.theme_id || act._theme_id || '').trim() === selId
                  );
                  return matchedInTheme || hasActivityInTheme;
                });

                if (contentsList.length === 0) {
                  return (
                    <div className="py-8 text-center text-[13px] text-muted-foreground">
                      Chưa có nội dung giáo dục
                    </div>
                  );
                }

                if (displayedContents.length === 0) {
                  return (
                    <div className="py-8 text-center text-[13px] text-muted-foreground bg-muted/20 border border-dashed border-border p-4">
                      <p>Không có nội dung giáo dục nào thuộc bộ lọc chủ đề đã chọn.</p>
                      <button
                        type="button"
                        onClick={() => setSelectedThemeFilter('ALL')}
                        className="mt-2 text-xs text-primary hover:underline cursor-pointer font-medium"
                      >
                        Xem tất cả ({contentsList.length}) nội dung
                      </button>
                    </div>
                  );
                }

                return displayedContents.map((content, idx) => {
                  const allActivities = content.activities || [];
                  const activities = selectedThemeFilter === 'ALL' || selectedThemeFilter === 'UNALLOCATED'
                    ? allActivities
                    : allActivities.filter((act) => {
                        const actThId = String(act.themeId || act.theme_id || '').trim();
                        const selThId = String(selectedThemeFilter).trim();
                        const matchedTh = activeGoal.allocatedThemes?.find((th) => String(th.id || th.themeId) === selThId);
                        const selThName = matchedTh?.name?.toLowerCase();
                        const actThName = act.themeName?.toLowerCase();
                        return actThId === selThId || (act._theme_id && String(act._theme_id) === selThId) || (actThName && selThName && actThName === selThName);
                      });

                  return (
                    <div
                      key={content.id}
                      className="bg-card border border-border rounded-none shadow-2xs overflow-hidden transition-all group"
                    >
                      {/* Hàng nội dung giáo dục */}
                      <div className="p-3.5 bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <span className="size-7 flex items-center justify-center text-[12px] font-mono font-medium text-muted-foreground bg-muted border border-border shrink-0 mt-0.5">
                            {String(idx + 1).padStart(2, '0')}
                          </span>
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <span className="text-[13.5px] font-medium text-foreground leading-snug">
                              {content.title}
                            </span>

                            {/* Thông tin chủ đề của NDGD (Ghi chuyên nghiệp, không dùng badge) */}
                            <div className="text-[12px] text-muted-foreground leading-relaxed pt-0.5">
                              <span className="font-medium text-muted-foreground">Chủ đề: </span>
                              {content.allocatedThemes && content.allocatedThemes.length > 0 ? (
                                <span className="text-foreground">
                                  {content.allocatedThemes.map((th, thIdx) => (
                                    <span key={th.id || th.themeId || thIdx}>
                                      {thIdx > 0 && <span className="text-muted-foreground mx-1.5">;</span>}
                                      <span className="font-medium text-foreground">
                                        {th.code ? `Chủ đề ${th.code}: ` : ''}{th.name || th.themeName}
                                      </span>
                                      {th.dateRange && (
                                        <span className="text-muted-foreground font-normal ml-1">
                                          ({th.dateRange})
                                        </span>
                                      )}
                                    </span>
                                  ))}
                                </span>
                              ) : (
                                <span className="text-muted-foreground/80 italic">
                                  Chưa phân bổ vào chủ đề nào (Kế hoạch năm)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {!isBgh && (
                          <Button
                            type="button"
                            onClick={() => handleCreateActivityForContent(activeGoal, content)}
                            className="h-8 px-3.5 bg-[#1447e6] hover:bg-[#1447e6]/90 text-white text-[12.5px] font-medium rounded-none flex items-center gap-1.5 shadow-none cursor-pointer shrink-0 self-start sm:self-center"
                          >
                            <HugeiconsIcon icon={PlusSignIcon} size={14} />
                            <span>{t('planning.addActivity', 'Thêm hoạt động')}</span>
                          </Button>
                        )}
                      </div>

                    {/* Danh sách hoạt động giáo dục cụ thể bên dưới */}
                    {activities.length > 0 ? (
                      <div className="px-3.5 py-2.5 bg-muted/10 divide-y divide-border/40">
                        {activities.map((act) => (
                          <div
                            key={act.id}
                            className="py-2.5 first:pt-1 last:pb-1 flex items-start justify-between gap-4 group/act"
                          >
                            {/* Trái: Thông tin hoạt động */}
                            <div
                              onClick={() => handleEditActivity(activeGoal, content, act)}
                              className="flex-1 min-w-0 cursor-pointer space-y-1.5"
                              title={t('planning.clickToEditActivity', 'Bấm để xem và sửa chi tiết hoạt động trong Drawer')}
                            >
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[13.5px] font-semibold text-foreground group-hover/act:text-[#1447e6] transition-colors">
                                  {act.title}
                                </span>
                                {act.creatorName && (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground bg-muted/60 border border-border/60 px-1.5 py-0.5 select-none">
                                    <HugeiconsIcon icon={UserIcon} size={11} className="text-muted-foreground/80" />
                                    <span>{act.creatorName}</span>
                                  </span>
                                )}
                              </div>

                              <div className="text-[12px] text-muted-foreground flex items-center gap-3 flex-wrap">
                                <p>
                                  <strong className="text-foreground/80 font-medium">{t('planning.routineSlotLabel', 'Chế độ sinh hoạt')}:</strong>{' '}
                                  {getRoutineSlotLabel(act.routineSlot)}
                                </p>
                                {act.themeName && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 text-[11px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-900/50 select-none">
                                    Chủ đề: {act.themeName}
                                  </span>
                                )}
                              </div>

                              {act.objective && (
                                <p className="text-[12px] text-muted-foreground line-clamp-2">
                                  <strong className="text-foreground/80 font-medium">{t('planning.objectiveLabel', 'Mục đích yêu cầu')}:</strong>{' '}
                                  {act.objective}
                                </p>
                              )}

                              {act.updaterName && (
                                <p className="text-[11px] text-muted-foreground/80 italic">
                                  Chỉnh sửa bởi: <span className="font-medium text-foreground/80 not-italic">{act.updaterName}</span>
                                </p>
                              )}
                            </div>

                            {/* Phải: Nút Sửa (chỉ icon) & Nút Xóa */}
                            <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                              <button
                                type="button"
                                onClick={() => handleEditActivity(activeGoal, content, act)}
                                className="size-7 flex items-center justify-center rounded-none border transition-colors bg-muted/60 hover:bg-muted text-foreground border-border cursor-pointer"
                                title={isBgh ? 'Xem chi tiết hoạt động' : t('common.edit', 'Chỉnh sửa hoạt động')}
                                aria-label={isBgh ? 'Xem chi tiết hoạt động' : 'Chỉnh sửa hoạt động'}
                              >
                                <HugeiconsIcon icon={PencilEdit02Icon} size={14} className="text-muted-foreground hover:text-foreground" />
                              </button>
                              {!isBgh && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteActivity(act.id);
                                  }}
                                  className="size-7 flex items-center justify-center rounded-none border transition-colors bg-destructive/5 hover:bg-destructive/15 text-destructive border-destructive/20 hover:border-destructive/30 cursor-pointer"
                                  title={t('common.delete', 'Xóa hoạt động')}
                                  aria-label="Xóa hoạt động"
                                >
                                  <HugeiconsIcon icon={Delete02Icon} size={14} />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="px-3.5 py-3 text-[12.5px] text-muted-foreground italic bg-muted/5">
                        <span>{t('planning.noActivityYet', 'Chưa thiết lập hoạt động giáo dục cho nội dung này.')}</span>
                      </div>
                    )}
                  </div>
                );
              });
            })()}
            </div>
          </div>

          {/* Bottom Bar: Thời gian cập nhật (Tự động lưu) */}
          <div className="flex items-center justify-end pt-2 pb-1">
            <div
              className="text-[12.5px] text-muted-foreground select-none"
              title={t('planning.autoSavedNotice', 'Mọi hoạt động giáo dục (thêm, sửa, xóa) được lưu tự động lên hệ thống.')}
            >
              <span>Thời gian cập nhật: </span>
              <span className="font-medium text-foreground">
                {formatDateTime(effectiveUpdatedTime) || 'Chưa có cập nhật'}
              </span>
            </div>
          </div>
        </div>

        {/* Drawer for Creating & Editing Educational Activities */}
        <ActivitySlotDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          initialSlot={drawerInitialSlot}
          allocatedThemes={activeGoal?.allocatedThemes || activeGoalContext?.allocatedThemes || []}
          allThemes={availableThemes}
          contentAllocatedThemes={activeContentContext?.allocatedThemes || drawerInitialSlot?.contentAllocatedThemes || []}
          onSave={handleSaveActivity}
          onDelete={handleDeleteActivity}
          readOnly={isBgh}
        />
      </div>
    );
  }

  // =========================================================================
  // VIEW 1: DANH SÁCH MỤC TIÊU (Giao diện chuẩn 100% giống CurriculumGoalDetailPage)
  // Có filter chủ đề, có số đằng trước lĩnh vực, 17 mục tiêu, layout và spacing y hệt
  // =========================================================================
  return (
    <div className="w-full flex-1 flex flex-col bg-background text-foreground select-none">
      {/* 1. Filter Toolbar - Consistent with CurriculumGoalDetailPage (With Theme Dropdown per Comment 1) */}
      <div className="px-6 py-3 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/20">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Input */}
          <div className="relative min-w-[220px] sm:w-[260px]">
            <HugeiconsIcon
              icon={Search01Icon}
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('curriculum.searchGoals', 'Tìm kiếm mục tiêu...')}
              className="w-full h-8 pl-8 pr-2.5 bg-background border border-border text-[13px] text-foreground placeholder:text-muted-foreground rounded-none outline-none focus:border-primary transition-colors"
            />
          </div>

          {/* Domain Dropdown */}
          <select
            value={selectedDomain}
            onChange={(e) => setSelectedDomain(e.target.value)}
            className="h-8 px-2.5 bg-background border border-border text-[13px] text-foreground rounded-none outline-none focus:border-primary cursor-pointer"
          >
            {DOMAIN_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.value === 'ALL'
                  ? t('planning.domainAll', 'Tất cả lĩnh vực')
                  : opt.value === 'PHYSICAL'
                    ? t('planning.domainPhysical', 'Thể chất')
                    : opt.value === 'COGNITIVE'
                      ? t('planning.domainCognitive', 'Nhận thức')
                      : opt.value === 'LANGUAGE'
                        ? t('planning.domainLanguage', 'Ngôn ngữ')
                        : opt.value === 'SOCIO_EMOTIONAL'
                          ? t('planning.domainSocioEmotional', 'Tình cảm - KNXH')
                          : opt.value === 'AESTHETIC'
                            ? t('planning.domainAesthetic', 'Thẩm mỹ')
                            : opt.label}
              </option>
            ))}
          </select>

          {/* Theme Dropdown Filter */}
          {availableThemes.length > 0 && (
            <select
              value={selectedThemeFilter}
              onChange={(e) => setSelectedThemeFilter(e.target.value)}
              className="h-8 px-2.5 bg-background border border-border text-[13px] text-foreground rounded-none outline-none focus:border-primary cursor-pointer"
            >
              <option value="ALL">Tất cả chủ đề ({availableThemes.length})</option>
              {availableThemes.map((th) => (
                <option key={th.id || th.code} value={th.id || th.code}>
                  {th.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Tree Expand / Collapse controls */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleExpandAll}
            className="h-8 px-2.5 border border-border text-[12.5px] rounded-none hover:bg-muted shadow-none cursor-pointer"
          >
            {t('curriculum.expandAll', 'Mở rộng tất cả')}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleCollapseAll}
            className="h-8 px-2.5 border border-border text-[12.5px] rounded-none hover:bg-muted shadow-none cursor-pointer"
          >
            {t('curriculum.collapseAll', 'Thu gọn tất cả')}
          </Button>
        </div>
      </div>

      {/* 2. Structured Goals Table - Exact copy of CurriculumGoalDetailPage */}
      <div className="px-6 py-4">
        <div className="border border-border bg-card rounded-none overflow-hidden shadow-2xs">
          {/* Table Header Bar */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/40 text-[13px] font-medium text-foreground">
            <span>{t('curriculum.goalStructure', 'Cấu trúc mục tiêu')}</span>
            <span className="text-muted-foreground text-[12px]">
              {totalGoalsCount} {t('curriculum.tabGoals', 'mục tiêu')}
            </span>
          </div>

          {/* Tree Rows */}
          <div className="divide-y divide-border/60">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground text-[13px]">
                {t('curriculum.loadingGoals', 'Đang tải dữ liệu mục tiêu...')}
              </div>
            ) : domainGroups.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-[13px]">
                {t('curriculum.emptyGoals', 'Không tìm thấy mục tiêu nào')}
              </div>
            ) : (
              domainGroups.map((group) => {
                const isDomainExpanded = !!expandedDomains[group.domain];
                const goals = group.goals || [];

                return (
                  <div key={group.domain} className="text-[13.5px]">
                    {/* Level 1: Domain Row with Number in front (1. Phát triển thể chất) */}
                    <div
                      onClick={() => toggleDomain(group.domain)}
                      className="flex items-center justify-between px-4 py-2.5 bg-muted/20 hover:bg-muted/40 cursor-pointer select-none transition-colors group"
                    >
                      <div className="flex items-center gap-2 font-semibold text-foreground">
                        <button
                          type="button"
                          className="size-5 flex items-center justify-center text-muted-foreground group-hover:text-foreground"
                        >
                          <HugeiconsIcon
                            icon={isDomainExpanded ? ArrowDown01Icon : ArrowRight01Icon}
                            size={14}
                          />
                        </button>
                        <span>{group.code}</span>
                        <span>
                          {group.domain === 'PHYSICAL'
                            ? t('curriculum.domainPhysical', group.domainLabel)
                            : group.domain === 'COGNITIVE'
                              ? t('curriculum.domainCognitive', group.domainLabel)
                              : group.domain === 'LANGUAGE'
                                ? t('curriculum.domainLanguage', group.domainLabel)
                                : group.domain === 'SOCIO_EMOTIONAL'
                                  ? t('curriculum.domainSocioEmotional', group.domainLabel)
                                  : group.domain === 'AESTHETIC'
                                    ? t('curriculum.domainAesthetic', group.domainLabel)
                                    : group.domainLabel}
                        </span>
                      </div>

                      <span className="text-[12.5px] text-muted-foreground font-normal">
                        {goals.length} {t('curriculum.tabGoals', 'mục tiêu')}
                      </span>
                    </div>

                    {/* Level 2: Goal Items under Domain - Clean, spacious row matching Image 2 */}
                    {isDomainExpanded && (
                      <div className="divide-y divide-border/30 bg-background">
                        {goals.map((goal) => (
                          <div
                            key={goal.id}
                            onClick={() => handleSelectGoal(goal)}
                            className="group/row flex items-center justify-between px-4 py-2.5 pl-11 hover:bg-muted/30 transition-colors cursor-pointer"
                            title="Bấm để xem chi tiết mục tiêu và thiết lập hoạt động giáo dục"
                          >
                            {/* Left: Code, Title, Inline Indicator Badge & Allocated Themes */}
                            <div className="flex items-baseline gap-3 min-w-0 pr-4 flex-1">
                              <span className="text-[13px] font-semibold text-foreground/80 shrink-0 min-w-[48px] font-mono select-none">
                                {goal.goalCode}
                              </span>

                              <div className="flex items-baseline gap-2 flex-wrap min-w-0 flex-1 leading-5">
                                <span className="text-[13px] font-medium text-foreground group-hover/row:text-[#1447e6] group-hover/row:underline underline-offset-2 transition-colors">
                                  {goal.title}
                                </span>
                                {goal.indicatorCode && (
                                  <span className="text-[12px] text-muted-foreground font-mono">
                                    ({goal.indicatorCode})
                                  </span>
                                )}
                                {goal.allocatedThemes?.length > 0 && (
                                  <span className="text-[12px] text-muted-foreground font-normal">
                                    · {goal.allocatedThemes.map((th) => th.code ? `Chủ đề ${th.code}` : th.name).join(', ')}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Right: Số lượng nội dung & icon mũi tên */}
                            <div className="flex items-center gap-2 shrink-0 text-[12px] text-muted-foreground select-none">
                              <span>{goal.contents?.length || 0} nội dung</span>
                              <HugeiconsIcon icon={ArrowRight01Icon} size={14} className="text-muted-foreground/60 group-hover/row:text-foreground" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default EducationalActivitiesTab;
