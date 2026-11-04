import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Cancel01Icon,
  Search01Icon,
  BookOpen01Icon,
  ArrowDown01Icon,
  ArrowRight01Icon,
  CheckmarkCircle01Icon,
  FilterHorizontalIcon,
  CheckmarkSquare02Icon,
} from '@hugeicons/core-free-icons';
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

export const DOMAIN_SECTIONS = [
  { domain: 'PHYSICAL', code: '1.', label: 'Phát triển thể chất' },
  { domain: 'COGNITIVE', code: '2.', label: 'Phát triển nhận thức' },
  { domain: 'LANGUAGE', code: '3.', label: 'Phát triển ngôn ngữ' },
  { domain: 'SOCIO_EMOTIONAL', code: '4.', label: 'Phát triển tình cảm - kỹ năng xã hội' },
  { domain: 'AESTHETIC', code: '5.', label: 'Phát triển thẩm mỹ' },
];

export const DOMAIN_FILTER_OPTIONS = [
  { value: 'ALL', label: 'Tất cả lĩnh vực' },
  { value: 'PHYSICAL', label: '1. Phát triển thể chất' },
  { value: 'COGNITIVE', label: '2. Phát triển nhận thức' },
  { value: 'LANGUAGE', label: '3. Phát triển ngôn ngữ' },
  { value: 'SOCIO_EMOTIONAL', label: '4. Phát triển tình cảm - kỹ năng xã hội' },
  { value: 'AESTHETIC', label: '5. Phát triển thẩm mỹ' },
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

const getScheduledDates = (act) => {
  const slots = act.scheduledSlots && act.scheduledSlots.length > 0
    ? act.scheduledSlots
    : act.scheduleInfo
      ? [act.scheduleInfo]
      : [];

  if (slots.length === 0) return [];

  const dates = slots.map(formatSlotDate).filter(Boolean);
  return Array.from(new Set(dates));
};

export function HierarchicalActivityPickerModal({
  isOpen,
  onClose,
  targetCell, // { day, slotDef }
  goals = [], // Hierarchical tree: Domain -> Goal -> Content -> Activities
  themeAllocations = [], // List of themes with date ranges and allocatedGoalIds
  onSelectActivity,
  currentActivityId = null,
}) {
  const { t } = useTranslation();

  const targetSlotKey = targetCell?.slotDef?.key;

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

  // Determine active theme covering target date
  const activeThemeForDate = useMemo(() => {
    if (!targetDateIso || !themeAllocations?.length) return null;
    return themeAllocations.find(
      (th) => targetDateIso >= th.startDate && targetDateIso <= th.endDate
    );
  }, [targetDateIso, themeAllocations]);

  // Set of goal IDs & codes allocated to this theme
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

  // Search & filter states
  const [selectedDomain, setSelectedDomain] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const selectedDomainLabel = useMemo(() => {
    const found = DOMAIN_FILTER_OPTIONS.find((opt) => opt.value === selectedDomain);
    return found ? found.label : 'Tất cả lĩnh vực';
  }, [selectedDomain]);

  // Accordion expanded map for each domain
  const [expandedDomains, setExpandedDomains] = useState({
    PHYSICAL: true,
    COGNITIVE: true,
    LANGUAGE: true,
    SOCIO_EMOTIONAL: true,
    AESTHETIC: true,
  });

  // Reset filters & expand all domains on open or target change
  useEffect(() => {
    if (isOpen) {
      setSelectedDomain('ALL');
      setSearchQuery('');
      setExpandedDomains({
        PHYSICAL: true,
        COGNITIVE: true,
        LANGUAGE: true,
        SOCIO_EMOTIONAL: true,
        AESTHETIC: true,
      });
    }
  }, [isOpen, targetCell]);

  const toggleDomain = (domainKey) => {
    setExpandedDomains((prev) => ({
      ...prev,
      [domainKey]: !prev[domainKey],
    }));
  };

  // Flatten all activities with context
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
          });
        });
      });
    });
    return list;
  }, [goals]);

  // Filter activities: strictly matches the clicked routine slot & theme allocated goals for this date
  const filteredActivities = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return allActivities.filter((act) => {
      // 0. Luôn lọc theo mục tiêu đã phân bổ cho chủ đề tương ứng với ngày đang chọn
      if (allowedGoalSet && allowedGoalSet.size > 0) {
        const rawCode = String(act.goalCode || '').trim().toUpperCase();
        const cleanGoalCode = rawCode.split('(')[0].trim();
        const digits = cleanGoalCode.replace(/\D/g, '');
        const normNum = digits ? String(parseInt(digits, 10)) : '';
        const normPadded = digits ? normNum.padStart(2, '0') : '';

        const isGoalAllowed =
          (act.goalId && allowedGoalSet.has(String(act.goalId))) ||
          (cleanGoalCode && allowedGoalSet.has(cleanGoalCode)) ||
          (rawCode && allowedGoalSet.has(rawCode)) ||
          (normNum && allowedGoalSet.has(normNum)) ||
          (normPadded && allowedGoalSet.has(normPadded));
        if (!isGoalAllowed) {
          return false;
        }
      }

      // 1. Luôn lọc chính xác theo Routine Slot của ô được chọn
      const actRoutineSlot = act.routineSlot || act.routine_slot;
      if (targetSlotKey && actRoutineSlot && actRoutineSlot !== targetSlotKey) {
        return false;
      }

      // 2. Luôn lọc chính xác theo Chủ đề tương ứng với ngày đang chọn (Bắt buộc không hiển thị hoạt động của chủ đề khác)
      if (activeThemeForDate) {
        const activeThemeIdStr = String(activeThemeForDate.themeId || activeThemeForDate.id || '').trim();
        const activeThemeNumId = activeThemeForDate._theme_id ? String(activeThemeForDate._theme_id).trim() : '';
        const actThemeIdStr = String(act.themeId || act.theme_id || '').trim();
        const actThemeNumId = act._theme_id ? String(act._theme_id).trim() : '';
        const actThemeName = (act.themeName || '').trim().toLowerCase();
        const activeThemeName = (activeThemeForDate.themeName || '').trim().toLowerCase();

        if (actThemeIdStr || actThemeNumId) {
          const matchId =
            (actThemeIdStr && (actThemeIdStr === activeThemeIdStr || actThemeIdStr === activeThemeNumId)) ||
            (actThemeNumId && (actThemeNumId === activeThemeIdStr || actThemeNumId === activeThemeNumId));
          const matchName = actThemeName && activeThemeName && actThemeName === activeThemeName;

          if (!matchId && !matchName) {
            return false;
          }
        }

        // Kiểm tra ngữ cảnh nội dung & tiêu đề để loại bỏ triệt để hoạt động sai chủ đề
        const actText = `${act.title || ''} ${act.objective || ''} ${act.procedure || ''}`.toLowerCase();
        const isGiaDinhTheme = activeThemeName.includes('gia đình');
        const isBanThanTheme = activeThemeName.includes('bản thân');
        const isTruongMamNonTheme = activeThemeName.includes('trường mầm non');

        const banThanKeywords = [
          'bản thân', 'bạn nhỏ', 'bạn bè', 'bạn trong', 'hình bạn', 'thẻ bạn', 'nhóm bạn',
          'bạn trai', 'bạn gái', 'cơ thể', 'sở thích', 'thẻ tên', 'khuôn mặt', 'giới tính',
          'tay chân', 'chiều cao', 'cân nặng', 'cảm xúc', 'giác quan', 'mắt', 'mũi', 'miệng',
          'tai', 'răng', 'tóc', 'của bé', 'về bé', 'bé đi khéo', 'đồ dùng cá nhân', 'trang phục của bé'
        ];
        const giaDinhKeywords = [
          'gia đình', 'người trong ảnh', 'ảnh gia đình', 'ảnh của gia đình', 'ông bà',
          'bố mẹ', 'cha mẹ', 'ba mẹ', 'anh chị', 'người thân', 'ngôi nhà', 'nhà của bé',
          'nhà bà', 'đồ dùng gia đình', 'bữa cơm gia đình', 'phòng khách', 'phòng bếp', 'con vật nuôi trong nhà'
        ];
        const truongMamNonKeywords = [
          'trường mầm non', 'trường của bé', 'lớp học của bé', 'cô giáo', 'bảo mẫu', 'búp bê',
          'góc chơi', 'đồ chơi lớp', 'sân trường', 'bác bảo vệ', 'ngày hội đến trường'
        ];

        const mentionsBanThan = banThanKeywords.some((k) => actText.includes(k));
        const mentionsGiaDinh = giaDinhKeywords.some((k) => actText.includes(k));
        const mentionsTruongMamNon = truongMamNonKeywords.some((k) => actText.includes(k));

        if (isGiaDinhTheme) {
          if (mentionsBanThan && !mentionsGiaDinh) return false;
          if (mentionsTruongMamNon && !mentionsGiaDinh) return false;
        } else if (isBanThanTheme) {
          if (mentionsGiaDinh && !mentionsBanThan) return false;
          if (mentionsTruongMamNon && !mentionsBanThan) return false;
        } else if (isTruongMamNonTheme) {
          if (mentionsGiaDinh && !mentionsTruongMamNon) return false;
          if (mentionsBanThan && !mentionsTruongMamNon) return false;
        }
      }

      // 3. Lọc theo lĩnh vực đã chọn
      if (selectedDomain !== 'ALL' && act.domain !== selectedDomain) {
        return false;
      }

      // 4. Tìm kiếm theo từ khóa
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
  }, [allActivities, allowedGoalSet, targetSlotKey, activeThemeForDate, selectedDomain, searchQuery]);

  // Nhóm hoạt động theo từng lĩnh vực (chuẩn xác như bảng cấu trúc mục tiêu)
  const groupedByDomain = useMemo(() => {
    return DOMAIN_SECTIONS.map((sec) => {
      if (selectedDomain !== 'ALL' && sec.domain !== selectedDomain) return null;
      const acts = filteredActivities.filter((a) => a.domain === sec.domain);
      // Khi đang tìm kiếm theo từ khóa, nếu lĩnh vực không có hoạt động khớp thì ẩn đi để kết quả tìm kiếm gọn gàng
      if (searchQuery.trim() && acts.length === 0) return null;
      return {
        ...sec,
        activities: acts,
      };
    }).filter(Boolean);
  }, [filteredActivities, selectedDomain, searchQuery]);

  if (!isOpen || !targetCell) return null;

  const { day, slotDef } = targetCell;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[1px] p-4 animate-in fade-in-0 duration-150"
      onClick={onClose}
      data-name="HierarchicalActivityPickerModal"
    >
      <div
        className="w-full max-w-[780px] bg-card border border-border shadow-2xl rounded-none flex flex-col max-h-[85vh] text-foreground select-none animate-in zoom-in-95 duration-150 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Modal Header: Rất sạch sẽ, tối giản */}
        <div className="px-5 py-3.5 border-b border-border flex items-start justify-between bg-card shrink-0">
          <div className="space-y-1">
            <h3 className="text-[16px] font-semibold text-foreground tracking-tight">
              Chọn hoạt động giáo dục
            </h3>

            {/* Ô được chọn & Khung giờ: Nhìn gọn, sạch, tinh tế */}
            <p className="text-[12.5px] text-muted-foreground flex items-center gap-1.5 flex-wrap">
              <span className="font-medium text-foreground">
                {day.name || day.shortName} ({day.date})
              </span>
              <span>·</span>
              <span className="text-foreground/90 font-medium">{slotDef.name}</span>
              {slotDef.defaultTime && (
                <span className="text-muted-foreground">({slotDef.defaultTime})</span>
              )}
              {activeThemeForDate && (
                <>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1 text-[11px] text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 border border-blue-200 dark:border-blue-800 font-medium">
                    Chủ đề: {activeThemeForDate.themeName}
                  </span>
                </>
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer rounded-none shrink-0"
            title="Đóng modal"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={18} />
          </button>
        </div>

        {/* 2. Toolbar: Tìm kiếm + Lọc Lĩnh vực */}
        <div className="px-5 py-2.5 border-b border-border bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center gap-2 flex-1">
            {/* Input tìm kiếm */}
            <div className="relative flex-1">
              <HugeiconsIcon
                icon={Search01Icon}
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm theo tên hoạt động, mục tiêu..."
                className="w-full h-8 pl-8 pr-2.5 bg-background border border-border text-[12.5px] rounded-none outline-none focus:border-foreground/50 transition-colors"
              />
            </div>

            {/* Filter Dropdown chuẩn thiết kế quản trị */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    'h-8 px-2.5 bg-background border border-border text-foreground hover:bg-muted/50 rounded-none flex items-center gap-1.5 text-[12.5px] transition-colors cursor-pointer select-none shrink-0',
                    selectedDomain !== 'ALL' && 'border-primary text-primary bg-primary/5'
                  )}
                  title="Lọc theo lĩnh vực"
                >
                  <HugeiconsIcon icon={FilterHorizontalIcon} size={15} />
                  <span>{selectedDomainLabel}</span>
                  <HugeiconsIcon icon={ArrowDown01Icon} size={12} className="text-muted-foreground ml-0.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 p-1.5 rounded-none border border-border bg-card shadow-xl z-50 text-foreground"
              >
                <DropdownMenuLabel className="px-2 py-1 text-[12px] font-medium text-muted-foreground">
                  Lĩnh vực phát triển
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="my-1 border-t border-border" />
                {DOMAIN_FILTER_OPTIONS.map((item) => (
                  <DropdownMenuItem
                    key={item.value}
                    onClick={() => setSelectedDomain(item.value)}
                    className={cn(
                      'flex items-center justify-between h-8 px-2 text-[13px] cursor-pointer rounded-none hover:bg-muted/60',
                      selectedDomain === item.value && 'font-medium text-primary'
                    )}
                  >
                    <span>{item.label}</span>
                    {selectedDomain === item.value && (
                      <HugeiconsIcon
                        icon={CheckmarkSquare02Icon}
                        size={14}
                        className="text-primary shrink-0"
                      />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* 3. Danh sách hoạt động: Chuẩn 100% theo bảng Cấu trúc mục tiêu */}
        <div className="flex-1 overflow-y-auto p-4 bg-background/50">
          <div className="border border-border/70 bg-card rounded-none overflow-hidden">
            {/* Table Header Bar giống hệt Cấu trúc mục tiêu */}
            <div className="px-4 py-2.5 border-b border-border bg-muted/30 text-[13px] font-medium text-foreground">
              <span>Cấu trúc hoạt động theo lĩnh vực</span>
            </div>

            {/* Tree Rows */}
            {groupedByDomain.length === 0 ? (
              <div className="py-12 px-4 text-center flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <HugeiconsIcon icon={BookOpen01Icon} size={28} className="opacity-30 mb-1" />
                <p className="text-[13px] font-medium text-foreground">
                  Không tìm thấy hoạt động nào phù hợp
                </p>
                <p className="text-[12px] max-w-md text-muted-foreground leading-relaxed">
                  Chưa có hoạt động giáo dục nào thuộc chế độ sinh hoạt <strong>{slotDef.name}</strong> khớp với điều kiện tìm kiếm.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {groupedByDomain.map((group) => {
                  const isExpanded = !!expandedDomains[group.domain];

                  return (
                    <div key={group.domain} className="text-[13.5px]">
                      {/* Level 1: Domain Row (Không còn số lượng hoạt động thừa) */}
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
                              icon={isExpanded ? ArrowDown01Icon : ArrowRight01Icon}
                              size={14}
                            />
                          </button>
                          <span>{group.code}</span>
                          <span>{group.label}</span>
                        </div>
                      </div>

                      {/* Level 2: Hoạt động trong lĩnh vực (Click bất kỳ đâu trên hàng để chọn) */}
                      {isExpanded && (
                        <div className="bg-background">
                          {group.activities.length === 0 ? (
                            <div className="px-4 py-3 pl-11 text-[12.5px] text-muted-foreground/80 italic select-none">
                              Không có hoạt động giáo dục
                            </div>
                          ) : (
                            <div className="divide-y divide-border/30">
                              {group.activities.map((act) => {
                                const isCurrent = currentActivityId === act.id;
                                const scheduledDates = getScheduledDates(act);
                                const otherScheduledDates = scheduledDates.filter((d) => d !== day?.date);
                                const scheduledDatesStr = scheduledDates.join(', ');

                                return (
                                  <div
                                    key={act.id}
                                    onClick={() => {
                                      onSelectActivity(act, day.key, slotDef.key, day.date);
                                      onClose();
                                    }}
                                    title={act.objective ? `Mục tiêu: ${act.objective}` : act.title}
                                    className={cn(
                                      'group/row flex items-center justify-between px-4 py-3 pl-11 hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors cursor-pointer select-none',
                                      isCurrent && 'bg-primary/5'
                                    )}
                                  >
                                    {/* Cột Trái: Tên Hoạt động + Trạng thái & Nội dung giáo dục */}
                                    <div className="flex flex-col gap-1 min-w-0 pr-4 flex-1">
                                      {/* Dòng 1: Tên hoạt động & trạng thái */}
                                      <div className="flex items-center gap-2 flex-wrap leading-5">
                                        <span className="text-[13.5px] font-medium text-foreground group-hover/row:text-[#1447e6] transition-colors">
                                          {act.title}
                                        </span>

                                        {act.themeName && (
                                          <span className="inline-flex items-center px-1.5 py-0.5 text-[11px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-900/50 select-none">
                                            Chủ đề: {act.themeName}
                                          </span>
                                        )}

                                        {isCurrent ? (
                                          <div className="flex items-center gap-1.5 flex-wrap">
                                            {otherScheduledDates.length > 0 && (
                                              <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium text-muted-foreground bg-muted/50 border border-border/60 rounded-none shrink-0">
                                                Đã xếp ({otherScheduledDates.join(', ')})
                                              </span>
                                            )}
                                          </div>
                                        ) : scheduledDatesStr ? (
                                          <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium text-muted-foreground bg-muted/50 border border-border/60 rounded-none shrink-0">
                                            Đã xếp ({scheduledDatesStr})
                                          </span>
                                        ) : null}
                                      </div>

                                      {/* Dòng 2: Nội dung giáo dục */}
                                      {act.contentTitle && (
                                        <div className="text-[12px] text-muted-foreground flex items-baseline gap-1.5 leading-normal">
                                          <span className="text-foreground/75 font-medium shrink-0">Nội dung:</span>
                                          <span className="line-clamp-1">{act.contentTitle}</span>
                                        </div>
                                      )}
                                    </div>

                                    {/* Cột Phải: Gợi ý chọn nhẹ nhàng khi hover, hoặc badge Đang chọn */}
                                    <div className="shrink-0 flex items-center justify-end pl-2">
                                      {isCurrent ? (
                                        <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 select-none">
                                          <HugeiconsIcon icon={CheckmarkCircle01Icon} size={13} />
                                          <span>Đang chọn</span>
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 text-[12.5px] font-medium text-[#1447e6] opacity-0 group-hover/row:opacity-100 transition-opacity select-none">
                                          <span>Chọn</span>
                                          <HugeiconsIcon icon={ArrowRight01Icon} size={14} />
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 4. Modal Footer: Tối giản, sạch sẽ */}
        <div className="px-5 py-3 border-t border-border bg-muted/20 flex items-center justify-between shrink-0">
          <span className="text-[12.5px] text-muted-foreground">
            Hiển thị <strong>{filteredActivities.length}</strong> hoạt động phù hợp
          </span>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="h-9 px-6 text-[13px] font-medium rounded-none border border-border bg-background hover:bg-muted text-foreground cursor-pointer shadow-none transition-colors"
          >
            Đóng
          </Button>
        </div>
      </div>
    </div>
  );
}

export default HierarchicalActivityPickerModal;
