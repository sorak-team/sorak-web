import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Cancel01Icon,
  Search01Icon,
  BookOpen01Icon,
  ArrowRight01Icon,
  CheckmarkCircle01Icon,
  ArrowDown01Icon,
} from '@hugeicons/core-free-icons';
import { cn } from '@/shared/lib/utils';

export const getDomainSections = (t) => [
  { domain: 'PHYSICAL', code: '1.', label: t('domains.physicalTitle', 'Phát triển thể chất') },
  { domain: 'COGNITIVE', code: '2.', label: t('domains.cognitiveTitle', 'Phát triển nhận thức') },
  { domain: 'LANGUAGE', code: '3.', label: t('domains.languageTitle', 'Phát triển ngôn ngữ') },
  { domain: 'SOCIO_EMOTIONAL', code: '4.', label: t('domains.socialEmotionalTitle', 'Phát triển tình cảm - kỹ năng xã hội') },
  { domain: 'AESTHETIC', code: '5.', label: t('domains.aestheticTitle', 'Phát triển thẩm mỹ') },
];

export const DOMAIN_SECTIONS = [
  { domain: 'PHYSICAL', code: '1.', label: 'Phát triển thể chất' },
  { domain: 'COGNITIVE', code: '2.', label: 'Phát triển nhận thức' },
  { domain: 'LANGUAGE', code: '3.', label: 'Phát triển ngôn ngữ' },
  { domain: 'SOCIO_EMOTIONAL', code: '4.', label: 'Phát triển tình cảm - kỹ năng xã hội' },
  { domain: 'AESTHETIC', code: '5.', label: 'Phát triển thẩm mỹ' },
];

const DAY_DATE_MAP = {
  T2: '12/10',
  T3: '13/10',
  T4: '14/10',
  T5: '15/10',
  T6: '16/10',
};

const formatSlotDate = (s) => {
  if (!s) return '';
  if (s.date) {
    if (s.date.includes('/')) return s.date;
    if (s.date.includes('-')) {
      const parts = s.date.split('-');
      if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
    }
  }
  return DAY_DATE_MAP[s.day] || s.day || '';
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

const getActivityUsage = (act, activeThemeForDate, t) => {
  const slots = act.scheduledSlots && act.scheduledSlots.length > 0
    ? act.scheduledSlots
    : act.scheduleInfo
      ? [act.scheduleInfo]
      : [];

  if (slots.length === 0) {
    return {
      hasUsage: false,
      currentTheme: { count: 0, dates: [] },
      otherThemes: [],
    };
  }

  const activeThemeId = String(activeThemeForDate?.themeId || activeThemeForDate?.id || '').trim().toLowerCase();
  const activeThemeNumId = String(activeThemeForDate?._theme_id || '').trim().toLowerCase();
  const activeThemeName = (activeThemeForDate?.themeName || activeThemeForDate?.name || '').trim().toLowerCase();

  const currentThemeDates = [];
  const otherThemesMap = new Map();

  slots.forEach((s) => {
    const sDate = formatSlotDate(s);
    const sThId = String(s.themeId || s._theme_id || '').trim().toLowerCase();
    const sThNumId = String(s._theme_id || '').trim().toLowerCase();
    const sThName = (s.themeName || '').trim().toLowerCase();
    const sThCode = String(s.themeCode || '').trim();

    const isCurrentTheme = Boolean(
      activeThemeForDate && (
        (activeThemeId && (sThId === activeThemeId || sThNumId === activeThemeId)) ||
        (activeThemeNumId && (sThId === activeThemeNumId || sThNumId === activeThemeNumId)) ||
        (activeThemeName && sThName && sThName === activeThemeName) ||
        (activeThemeForDate.startDate && activeThemeForDate.endDate && s.scheduledDate &&
         s.scheduledDate >= activeThemeForDate.startDate && s.scheduledDate <= activeThemeForDate.endDate)
      )
    );

    if (isCurrentTheme) {
      if (sDate) currentThemeDates.push(sDate);
    } else {
      let label = '';
      if (sThCode) {
        const cleanCode = sThCode.replace(/\D/g, '').padStart(2, '0');
        label = t ? t('planning.themePrefix', { index: cleanCode, defaultValue: `Chủ đề ${cleanCode}` }) : `Chủ đề ${cleanCode}`;
      } else if (s.themeName) {
        const match = s.themeName.match(/Chủ đề\s*\d+/i);
        label = match ? (t ? t('planning.themePrefix', { index: match[0].replace(/\D/g, ''), defaultValue: match[0] }) : match[0]) : s.themeName;
      } else {
        label = t ? t('planning.otherThemeLabel', 'Chủ đề khác') : 'Chủ đề khác';
      }

      if (!otherThemesMap.has(label)) {
        otherThemesMap.set(label, { label, count: 0, dates: [] });
      }
      const entry = otherThemesMap.get(label);
      entry.count += 1;
      if (sDate) entry.dates.push(sDate);
    }
  });

  const uniqueCurrentThemeDates = Array.from(new Set(currentThemeDates));

  return {
    hasUsage: true,
    currentTheme: {
      count: currentThemeDates.length,
      dates: uniqueCurrentThemeDates,
    },
    otherThemes: Array.from(otherThemesMap.values()).map((ot) => ({
      ...ot,
      dates: Array.from(new Set(ot.dates)),
    })),
  };
};

export function HierarchicalActivityPickerModal({
  isOpen,
  onClose,
  targetCell,
  goals = [],
  themeAllocations = [],
  currentActivityId,
  onSelectActivity,
  activeThemeForDate: propActiveTheme = null,
  subThemeName = null,
}) {
  const { t } = useTranslation();
  const DOMAIN_SECTIONS = useMemo(() => getDomainSections(t), [t]);

  const targetSlotKey = useMemo(() => {
    if (!targetCell) return null;
    return targetCell.slotDef?.activitySlot || targetCell.slotDef?.key || null;
  }, [targetCell]);

  // Resolve target date in ISO format (YYYY-MM-DD)
  const targetDateIso = useMemo(() => {
    if (!targetCell?.day) return null;
    const d = targetCell.day;
    if (d.dateStr) return d.dateStr;
    if (d.fullDate) return d.fullDate;
    if (d.date && typeof d.date === 'string') {
      const trimmed = d.date.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
      if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
        const [dayNum, mNum, yNum] = trimmed.split('/');
        return `${yNum}-${mNum.padStart(2, '0')}-${dayNum.padStart(2, '0')}`;
      }
      if (/^\d{1,2}\/\d{1,2}$/.test(trimmed)) {
        const [dayNum, mNum] = trimmed.split('/');
        const month = parseInt(mNum, 10);
        const year = month >= 8 ? 2026 : 2027;
        return `${year}-${mNum.padStart(2, '0')}-${dayNum.padStart(2, '0')}`;
      }
    }
    return null;
  }, [targetCell]);

  // Determine active theme covering target date dynamically from themeAllocations
  const activeThemeForDate = useMemo(() => {
    if (propActiveTheme) return propActiveTheme;
    if (!targetDateIso || !themeAllocations?.length) {
      return themeAllocations?.[0] || null;
    }
    const found = themeAllocations.find(
      (th) => targetDateIso >= th.startDate && targetDateIso <= th.endDate
    );
    return found || themeAllocations[0] || null;
  }, [propActiveTheme, targetDateIso, themeAllocations]);

  const cleanSubThemeName = useMemo(() => {
    if (!subThemeName) return null;
    let s = subThemeName.trim();
    if (activeThemeForDate?.themeName) {
      const escapedTheme = activeThemeForDate.themeName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      s = s.replace(new RegExp(`\\s*-\\s*${escapedTheme}\\s*$`, 'i'), '').trim();
    }
    if (s.includes(' - ')) {
      const parts = s.split(' - ');
      if (parts.length > 1) {
        s = parts[0].trim();
      }
    }
    return s || null;
  }, [subThemeName, activeThemeForDate]);

  const allowedGoalSet = useMemo(() => {
    if (!activeThemeForDate) return null;
    const set = new Set();
    (activeThemeForDate.goalIds || []).forEach((id) => set.add(String(id)));
    (activeThemeForDate.goalCodes || []).forEach((code) => {
      const raw = String(code).trim().toUpperCase();
      set.add(raw);
      const clean = raw.split('(')[0].trim();
      set.add(clean);
      const digits = clean.replace(/\D/g, '');
      if (digits) {
        set.add(digits);
        set.add(String(parseInt(digits, 10)));
        set.add(String(parseInt(digits, 10)).padStart(2, '0'));
      }
    });
    return set;
  }, [activeThemeForDate]);

  const allowedContentSet = useMemo(() => {
    if (!activeThemeForDate || !activeThemeForDate.contentIds?.length) return null;
    return new Set(activeThemeForDate.contentIds.map((id) => String(id)));
  }, [activeThemeForDate]);

  // Chỉ chọn Lĩnh vực phát triển
  const [selectedDomain, setSelectedDomain] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedDomains, setCollapsedDomains] = useState(new Set());

  useEffect(() => {
    if (isOpen) {
      setSelectedDomain('ALL');
      setSearchQuery('');
      setCollapsedDomains(new Set());
    }
  }, [isOpen, targetCell]);

  const allActivities = useMemo(() => {
    const list = [];
    (goals || []).forEach((goal) => {
      (goal.contents || []).forEach((content) => {
        (content.activities || []).forEach((act) => {
          list.push({
            ...act,
            goalId: goal.id,
            domain: goal.domain || act.domain,
            domainLabel: goal.domainLabel || act.domainLabel,
            goalCode: goal.goalCode || act.goalCode,
            goalTitle: goal.title || act.goalTitle,
            indicatorCode: goal.indicatorCode || act.indicatorCode,
            contentTitle: content.title || act.contentTitle,
            contentId: content.id || content.contentId || act.contentId,
            contentNumId: content._content_id || content.contentId || act._content_id,
            contentAllocatedThemes: content.allocatedThemes || act.contentAllocatedThemes || [],
            goalAllocatedThemes: goal.allocatedThemes || act.goalAllocatedThemes || [],
          });
        });
      });
    });
    return list;
  }, [goals]);

  const baseActivities = useMemo(() => {
    return allActivities.filter((act) => {
      const actRoutineSlot = act.routineSlot || act.routine_slot;
      if (targetSlotKey) {
        if (!actRoutineSlot || actRoutineSlot !== targetSlotKey) {
          return false;
        }
      }

      if (activeThemeForDate) {
        const activeThemeIdStr = String(activeThemeForDate.themeId || activeThemeForDate.id || '').trim();
        const activeThemeNumId = activeThemeForDate._theme_id ? String(activeThemeForDate._theme_id).trim() : '';
        const curThName = (activeThemeForDate.themeName || activeThemeForDate.name || '').trim().toLowerCase();
        const curThCode = String(activeThemeForDate.code || activeThemeForDate.themeCode || '').replace(/\D/g, '');

        // Lọc theo Chủ đề của hoạt động: Không hiển thị hoạt động thuộc chủ đề khác
        const actThId = String(act.themeId || act.theme_id || act._theme_id || '').trim().toLowerCase();
        const actThDbId = String(act._theme_id || '').trim().toLowerCase();
        const actThName = (act.themeName || '').trim().toLowerCase();
        const actThCode = String(act.themeCode || '').replace(/\D/g, '');

        if (actThId || actThDbId || actThName || actThCode) {
          const matchActTheme =
            (activeThemeIdStr && (actThId === activeThemeIdStr.toLowerCase() || actThId === activeThemeNumId.toLowerCase())) ||
            (activeThemeNumId && (actThDbId === activeThemeNumId.toLowerCase() || actThId === activeThemeNumId.toLowerCase())) ||
            (curThCode && actThCode && actThCode === curThCode) ||
            (curThName && actThName && (actThName === curThName || actThName.includes(curThName) || curThName.includes(actThName)));

          if (!matchActTheme) {
            return false;
          }
        }

        if (allowedGoalSet) {
          if (allowedGoalSet.size === 0) return false;
          const rawCode = String(act.goalCode || '').trim().toUpperCase();
          const cleanCode = rawCode.split('(')[0].trim();
          const digits = cleanCode.replace(/\D/g, '');
          const idStr = String(act.goalId || '').trim();

          const matchGoal =
            (idStr && allowedGoalSet.has(idStr)) ||
            (rawCode && allowedGoalSet.has(rawCode)) ||
            (cleanCode && allowedGoalSet.has(cleanCode)) ||
            (digits && (
              allowedGoalSet.has(digits) ||
              allowedGoalSet.has(String(parseInt(digits, 10))) ||
              allowedGoalSet.has(String(parseInt(digits, 10)).padStart(2, '0'))
            ));

          if (!matchGoal) return false;
        }

        if (allowedContentSet) {
          const cId = act.contentId ? String(act.contentId).trim() : null;
          const cNumId = act.contentNumId ? String(act.contentNumId).trim() : null;
          const isContentDirectlyAllowed = (cId && allowedContentSet.has(cId)) || (cNumId && allowedContentSet.has(cNumId));

          if (!isContentDirectlyAllowed) {
            const contentHasTheme = (act.contentAllocatedThemes || []).some((th) => {
              const thId = String(th.themeId || th.id || th._theme_id || '').trim();
              return (activeThemeIdStr && thId === activeThemeIdStr) || (activeThemeNumId && thId === activeThemeNumId);
            });
            const goalHasTheme = (act.goalAllocatedThemes || []).some((th) => {
              const thId = String(th.themeId || th.id || th._theme_id || '').trim();
              return (activeThemeIdStr && thId === activeThemeIdStr) || (activeThemeNumId && thId === activeThemeNumId);
            });

            if (!contentHasTheme && !goalHasTheme) {
              return false;
            }
          }
        }
      }

      return true;
    });
  }, [allActivities, targetSlotKey, activeThemeForDate, allowedGoalSet, allowedContentSet]);

  const displayedActivities = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return baseActivities.filter((act) => {
      if (selectedDomain !== 'ALL' && act.domain !== selectedDomain) {
        return false;
      }

      if (q) {
        const matchTitle = act.title?.toLowerCase().includes(q);
        const matchGoal =
          act.goalCode?.toLowerCase().includes(q) ||
          act.goalTitle?.toLowerCase().includes(q);
        const matchContent = act.contentTitle?.toLowerCase().includes(q);
        const matchObjective = act.objective?.toLowerCase().includes(q);
        return matchTitle || matchGoal || matchContent || matchObjective;
      }

      return true;
    });
  }, [baseActivities, selectedDomain, searchQuery]);

  const groupedDisplayed = useMemo(() => {
    const domainMap = new Map();

    displayedActivities.forEach((act) => {
      if (!domainMap.has(act.domain)) {
        const domainDef = DOMAIN_SECTIONS.find((d) => d.domain === act.domain) || {
          domain: act.domain,
          code: '',
          label: act.domainLabel || act.domain,
        };
        domainMap.set(act.domain, {
          ...domainDef,
          goalGroupsMap: new Map(),
        });
      }

      const domainGroup = domainMap.get(act.domain);
      const goalKey = act.goalCode || (act.goalId ? `ID_${act.goalId}` : 'OTHER');
      if (!domainGroup.goalGroupsMap.has(goalKey)) {
        domainGroup.goalGroupsMap.set(goalKey, {
          goalKey,
          goalCode: act.goalCode || '',
          goalTitle: act.goalTitle || '',
          activities: [],
        });
      }
      domainGroup.goalGroupsMap.get(goalKey).activities.push(act);
    });

    return Array.from(domainMap.values()).map((dg) => ({
      ...dg,
      goalGroups: Array.from(dg.goalGroupsMap.values()),
    }));
  }, [displayedActivities]);

  const toggleDomainCollapse = (domainKey) => {
    setCollapsedDomains((prev) => {
      const next = new Set(prev);
      if (next.has(domainKey)) {
        next.delete(domainKey);
      } else {
        next.add(domainKey);
      }
      return next;
    });
  };

  const currentViewTitle = useMemo(() => {
    if (searchQuery.trim()) {
      return t('planning.searchResultFor', { query: searchQuery, defaultValue: `Kết quả tìm kiếm cho: "${searchQuery}"` });
    }
    if (selectedDomain === 'ALL') {
      return t('planning.allDomains', 'Tất cả');
    }
    const currentDomainDef = DOMAIN_SECTIONS.find((d) => d.domain === selectedDomain);
    return currentDomainDef ? `${currentDomainDef.code} ${currentDomainDef.label}` : selectedDomain;
  }, [selectedDomain, searchQuery, t, DOMAIN_SECTIONS]);

  if (!isOpen || !targetCell) return null;

  const { day, slotDef } = targetCell;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-[1px] p-3 sm:p-5 animate-in fade-in-0 duration-150"
      onClick={onClose}
      data-name="HierarchicalActivityPickerModal"
    >
      <div
        className="w-full max-w-[1100px] h-[82vh] max-h-[720px] bg-card border border-border shadow-2xl rounded-none flex flex-col text-foreground select-none animate-in zoom-in-95 duration-150 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Modal Header: 2 dòng phân cấp chuẩn mực & chuyên nghiệp */}
        <div className="px-6 py-3 border-b border-border flex items-start justify-between bg-card shrink-0 gap-4">
          <div className="space-y-1 min-w-0 flex-1">
            {/* Dòng 1: Tiêu đề chính độc lập, trang trọng */}
            <h3 className="text-[15px] font-semibold text-foreground tracking-tight">
              {t('planning.pickerModalTitle', 'Chọn hoạt động giáo dục')}
            </h3>

            {/* Dòng 2: Toàn bộ thông tin ngữ cảnh thời gian & chủ đề liền mạch, khoa học */}
            <p className="text-[12.5px] text-muted-foreground flex items-center gap-1.5 flex-wrap">
              <span className="font-medium text-foreground">
                {day.name || day.shortName} ({day.date})
              </span>
              <span className="text-muted-foreground/40 select-none">·</span>
              <span className="font-medium text-foreground">
                {slotDef.name}
              </span>
              {slotDef.defaultTime && (
                <span className="text-muted-foreground font-normal">
                  ({slotDef.defaultTime})
                </span>
              )}
              {(activeThemeForDate || cleanSubThemeName) && (
                <>
                  <span className="text-muted-foreground/40 select-none">·</span>
                  {activeThemeForDate && (
                    <span className="font-medium text-foreground/85">
                      {t('planning.themeLabelColon', 'Chủ đề:')} {activeThemeForDate.themeName}
                    </span>
                  )}
                  {activeThemeForDate && cleanSubThemeName && (
                    <span className="text-muted-foreground/40 font-light select-none">›</span>
                  )}
                  {cleanSubThemeName && (
                    <span className="text-muted-foreground font-normal">
                      {cleanSubThemeName}
                    </span>
                  )}
                </>
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer rounded-none shrink-0 -mr-1"
            title={t('planning.closeModalTitle', 'Đóng modal')}
          >
            <HugeiconsIcon icon={Cancel01Icon} size={18} />
          </button>
        </div>

        {/* 2. Body: Master - Detail (Active state thanh lịch, êm ái theo chuẩn Linear / GitHub) */}
        <div className="flex-1 min-h-0 flex flex-row overflow-hidden bg-background">
          {/* CỘT TRÁI: SIDEBAR 5 LĨNH VỰC PHÁT TRIỂN (Rộng rãi, không bị cụt chữ, màu chọn êm dịu) */}
          <div className="w-[260px] sm:w-[285px] shrink-0 border-r border-border bg-muted/15 dark:bg-muted/10 flex flex-col justify-between overflow-hidden">
            {/* Header Sidebar */}
            <div className="px-3.5 py-2.5 border-b border-border flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-muted-foreground shrink-0 bg-muted/20">
              <span>{t('planning.devDomainsSidebar', 'Lĩnh vực phát triển')}</span>
              <button
                type="button"
                onClick={() => setSelectedDomain('ALL')}
                className={cn(
                  'px-2 py-0.5 text-[11px] transition-colors cursor-pointer rounded-none border',
                  selectedDomain === 'ALL'
                    ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200/80 dark:border-blue-800/80 font-semibold'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:underline'
                )}
              >
                {t('planning.allDomains', 'Tất cả')}
              </button>
            </div>

            {/* Danh sách 5 Lĩnh vực: Active state nền xanh phấn nhẹ + viền trái 3px sang trọng */}
            <div className="py-1 space-y-0.5 overflow-y-auto flex-1">
              {DOMAIN_SECTIONS.map((sec) => {
                const isDomainActive = selectedDomain === sec.domain;
                const actsCount = baseActivities.filter((a) => a.domain === sec.domain).length;
                const hasActs = actsCount > 0;

                return (
                  <div
                    key={sec.domain}
                    onClick={() => {
                      if (hasActs) setSelectedDomain(sec.domain);
                    }}
                    title={sec.label}
                    className={cn(
                      'px-3.5 py-2.5 text-[12.5px] flex items-center justify-between cursor-pointer transition-colors select-none rounded-none border-l-[3px]',
                      isDomainActive
                        ? 'bg-blue-50/70 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-semibold border-l-blue-600 dark:border-l-blue-400'
                        : hasActs
                        ? 'border-l-transparent text-foreground/80 hover:bg-muted/50 hover:text-foreground font-normal'
                        : 'border-l-transparent opacity-30 text-muted-foreground cursor-not-allowed'
                    )}
                  >
                    <span className="truncate">
                      {sec.code} {sec.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CỘT PHẢI: CANVAS HIỂN THỊ HOẠT ĐỘNG CỦA LĨNH VỰC ĐÃ CHỌN */}
          <div className="flex-1 min-w-0 bg-background flex flex-col justify-between overflow-hidden">
            {/* Toolbar Cột phải */}
            <div className="px-5 py-2 border-b border-border bg-muted/10 flex items-center justify-between gap-3 shrink-0">
              <div className="text-[12.5px] font-semibold text-foreground/90 truncate">
                {currentViewTitle}
              </div>

              {/* Ô tìm kiếm nhanh */}
              <div className="relative w-52 sm:w-60 shrink-0">
                <HugeiconsIcon
                  icon={Search01Icon}
                  size={13}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('planning.quickSearchPlaceholder', 'Tìm kiếm nhanh...')}
                  className="w-full h-7 pl-8 pr-2.5 bg-background border border-border text-[12px] rounded-none outline-none focus:border-foreground/50 transition-colors"
                />
              </div>
            </div>

            {/* Vùng danh sách hoạt động: Lưới 2 cột card */}
            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              {groupedDisplayed.length === 0 ? (
                <div className="py-16 px-4 text-center flex flex-col items-center justify-center gap-2 text-muted-foreground">
                  <HugeiconsIcon icon={BookOpen01Icon} size={28} className="opacity-30 mb-1" />
                  <p className="text-[13px] font-medium text-foreground">
                    {t('planning.noMatchingActivity', 'Không tìm thấy hoạt động nào phù hợp')}
                  </p>
                  <p className="text-[12px] max-w-md text-muted-foreground leading-relaxed">
                    {t('planning.noActivityInFilterDesc', 'Không có hoạt động giáo dục nào thuộc điều kiện lọc hiện tại. Thử chọn Tất cả hoặc xóa từ khóa tìm kiếm.')}
                  </p>
                </div>
              ) : (
                groupedDisplayed.map((dg) => {
                  const isCollapsed = selectedDomain === 'ALL' && !searchQuery.trim() && collapsedDomains.has(dg.domain);
                  const totalActsInDomain = dg.goalGroups.reduce(
                    (sum, gg) => sum + gg.activities.length,
                    0
                  );

                  return (
                    <div key={dg.domain} className="space-y-3.5">
                      {/* Header Lĩnh vực (chỉ hiển thị khi đang xem 'Tất cả') */}
                      {selectedDomain === 'ALL' && (
                        <div
                          onClick={() => toggleDomainCollapse(dg.domain)}
                          title={isCollapsed ? t('planning.clickToExpand', 'Nhấp để mở rộng') : t('planning.clickToCollapse', 'Nhấp để thu gọn')}
                          className="flex items-center justify-between pt-2 pb-1.5 border-b border-border/70 cursor-pointer hover:bg-muted/30 px-1 -mx-1 transition-colors group select-none"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <HugeiconsIcon
                              icon={ArrowDown01Icon}
                              size={14}
                              className={cn(
                                'text-muted-foreground group-hover:text-foreground transition-transform duration-200 shrink-0',
                                isCollapsed && '-rotate-90'
                              )}
                            />
                            <span className="text-[12px] font-bold text-foreground/85 uppercase tracking-wider truncate">
                              {dg.code} {dg.label}
                            </span>
                            <span className="text-[11px] font-normal text-muted-foreground/80 shrink-0">
                              {t('planning.totalActsInDomain', { count: totalActsInDomain, defaultValue: `(${totalActsInDomain} hoạt động)` })}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Các nhóm Mục tiêu trong Lĩnh vực */}
                      {!isCollapsed && (
                        <div className="space-y-4">
                          {dg.goalGroups.map((goalGroup) => (
                            <div key={goalGroup.goalKey} className="space-y-2.5">
                              {/* Header Mục tiêu trong Canvas: Badge MT đồng bộ với Xác định hoạt động & Phân bổ mục tiêu */}
                              <div className="flex items-center gap-2.5 pt-1 pb-0.5 min-w-0">
                                {goalGroup.goalCode && (
                                  <span className="px-2 py-0.5 bg-[#1447e6]/10 text-[#1447e6] font-mono font-bold text-[11.5px] border border-[#1447e6]/20 rounded-none shrink-0 select-none">
                                    {formatGoalCode(goalGroup.goalCode)}
                                  </span>
                                )}
                                <span className="font-medium text-[13px] text-foreground/90 truncate flex-1 min-w-0" title={goalGroup.goalTitle}>
                                  {goalGroup.goalTitle || t('planning.educationalObjectiveGroup', 'Mục tiêu giáo dục')}
                                </span>
                              </div>

                              {/* LƯỚI 2 CỘT CARD HOẠT ĐỘNG: Gọn gàng, sạch sẽ */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                {goalGroup.activities.map((act) => {
                                  const isCurrent = currentActivityId === act.id;
                                  const usage = getActivityUsage(act, activeThemeForDate, t);

                                  return (
                                    <div
                                      key={act.id}
                                      onClick={() => {
                                        onSelectActivity(act, day.key, slotDef.key, day.date);
                                        onClose();
                                      }}
                                      title={act.objective ? `${t('planning.educationalObjectiveGroup', 'Mục tiêu giáo dục')}: ${act.objective}` : act.title}
                                      className={cn(
                                        'p-3 rounded-none bg-card border border-border/80 hover:border-primary/50 hover:shadow-xs transition-all flex flex-col justify-between gap-2.5 group cursor-pointer select-none',
                                        isCurrent && 'bg-primary/5 border-primary/50 ring-1 ring-primary/20'
                                      )}
                                    >
                                      {/* Khối Thông tin Hoạt động & Nội dung giáo dục */}
                                      <div className="space-y-1.5">
                                        {/* Hiển thị tên chủ đề trên từng hoạt động để giáo viên nhận biết trước khi chọn */}
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-[10.5px] font-medium px-1.5 py-0.5 bg-muted/80 text-muted-foreground border border-border/70 rounded-none truncate max-w-full">
                                            {act.themeName || activeThemeForDate?.themeName || t('planning.themeEducLabel', 'Chủ đề giáo dục')}
                                          </span>
                                        </div>

                                        <div className="text-[13px] font-medium text-foreground group-hover:text-primary transition-colors leading-snug line-clamp-2">
                                          {act.title}
                                        </div>

                                        {act.contentTitle && (
                                          <div
                                            className="text-[11.5px] text-muted-foreground flex items-center gap-1.5 leading-normal"
                                            title={`${t('planning.eduContentPrefix', 'Nội dung:')} ${act.contentTitle}`}
                                          >
                                            <span className="text-muted-foreground/60 font-medium shrink-0">{t('planning.eduContentPrefix', 'Nội dung:')}</span>
                                            <span className="truncate text-foreground/75 font-normal">{act.contentTitle}</span>
                                          </div>
                                        )}
                                      </div>

                                      {/* Dòng Footer: Trạng thái xếp & Nút chọn */}
                                      <div className="flex items-center justify-between text-[11px] gap-2 pt-1.5 border-t border-border/40">
                                        <div className="truncate text-muted-foreground">
                                          {usage.currentTheme.count > 0 ? (
                                            <span
                                              className="font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 truncate text-[11px]"
                                              title={t('planning.scheduledDatesThisThemeTooltip', {
                                                count: usage.currentTheme.count,
                                                dates: usage.currentTheme.dates.join(', '),
                                                defaultValue: `Các ngày đã xếp trong chủ đề này (${usage.currentTheme.count} lần): ${usage.currentTheme.dates.join(', ')}`,
                                              })}
                                            >
                                              <span className="shrink-0">{t('planning.currentThemeScheduleCount', 'Chủ đề này')}</span>
                                              <span className="text-muted-foreground/40 font-light select-none shrink-0">·</span>
                                              <span className="truncate">
                                                {usage.currentTheme.dates.length <= 2 ? (
                                                  t('planning.scheduledOnce', { dates: usage.currentTheme.dates.join(', '), defaultValue: `Đã xếp ${usage.currentTheme.dates.join(', ')}` })
                                                ) : (
                                                  t('planning.scheduledMultiple', {
                                                    count: usage.currentTheme.count,
                                                    dates: `${usage.currentTheme.dates.slice(0, 2).join(', ')} +${usage.currentTheme.dates.length - 2}`,
                                                    defaultValue: `Đã xếp ${usage.currentTheme.count} lần (${usage.currentTheme.dates.slice(0, 2).join(', ')} +${usage.currentTheme.dates.length - 2})`,
                                                  })
                                                )}
                                              </span>
                                            </span>
                                          ) : usage.otherThemes.length > 0 ? (
                                            <span
                                              className="text-muted-foreground flex items-center gap-1.5 truncate text-[11px]"
                                              title={usage.otherThemes[0].dates?.length > 0 ? `${usage.otherThemes[0].label}: ${usage.otherThemes[0].dates.join(', ')}` : undefined}
                                            >
                                              <span className="font-medium text-foreground/80 shrink-0">{usage.otherThemes[0].label}</span>
                                              <span className="text-muted-foreground/40 font-light select-none shrink-0">·</span>
                                              <span className="truncate">
                                                {t('planning.scheduledInOtherTheme', { count: usage.otherThemes[0].count, defaultValue: `Đã xếp ${usage.otherThemes[0].count} lần` })}
                                              </span>
                                            </span>
                                          ) : (
                                            <span className="text-muted-foreground/50 font-normal">{t('planning.notScheduledYetAct', 'Chưa xếp lịch')}</span>
                                          )}
                                        </div>

                                        <div className="shrink-0">
                                          {isCurrent ? (
                                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-none">
                                              <HugeiconsIcon icon={CheckmarkCircle01Icon} size={12} />
                                              <span>{t('planning.selectingAct', 'Đang chọn')}</span>
                                            </span>
                                          ) : (
                                            <span className="text-primary font-medium text-[11.5px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                                              <span>{t('planning.selectActBtn', 'Chọn')}</span>
                                              <HugeiconsIcon icon={ArrowRight01Icon} size={12} />
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
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
    </div>
  );
}

export default HierarchicalActivityPickerModal;
