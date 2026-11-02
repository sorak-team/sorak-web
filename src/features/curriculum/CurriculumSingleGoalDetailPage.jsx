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

const cleanDisplayGoalTitle = (g) => {
  if (!g) return '';
  const title = g.title || '';
  if (!title.includes('?')) return title;
  const raw = String(g.code || g.goal_code || g.goalCode || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  let norm = raw;
  if (raw.startsWith('MT')) {
    const num = raw.replace(/^MT/, '');
    norm = num.length === 1 ? `MT0${num}` : `MT${num}`;
  } else if (/^\d+$/.test(raw)) {
    norm = raw.length === 1 ? `MT0${raw}` : `MT${raw}`;
  }
  return STANDARD_GOAL_FALLBACKS[norm] || title;
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
  const [bankStatus, setBankStatus] = useState(() => {
    return localStorage.getItem(`sorak_goal_bank_${yearId}_${ageGroup}_status`) || 'DRAFT';
  });

  const isBankPublished = bankStatus === 'PUBLISHED';

  // Modals / Drawers
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

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
            title: cleanDisplayGoalTitle(data.goal),
            domainLabel: DOMAIN_LABELS[data.goal.domain] || data.goal.domainLabel || 'Phát triển thể chất',
          }
        : null;
      setGoal(fetchedGoal);
      setAllGoals(data.allGoals || []);
      if (fetchedGoal) {
        setActiveGoal(fetchedGoal);
      }

      const contentList = data.contents || [];
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
      if (isEditDrawerOpen || isDeleteDialogOpen) {
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
  }, [handlePrevGoal, handleNextGoal, prevGoal, nextGoal, isEditDrawerOpen, isDeleteDialogOpen]);

  // Check unsaved changes
  const hasChanges = useMemo(() => {
    return JSON.stringify(contents) !== JSON.stringify(originalContents);
  }, [contents, originalContents]);

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
    setContents((prev) => [...prev, newItem]);
  };

  // Update content title inline
  const handleUpdateContentTitle = (idx, newTitle) => {
    if (isBankPublished) {
      toast.warning('Ngân hàng mục tiêu đã công bố. Vui lòng gỡ công bố để chỉnh sửa.');
      return;
    }
    setContents((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], title: newTitle };
      return updated;
    });
  };

  // Delete content
  const handleDeleteContent = (idx) => {
    if (isBankPublished) {
      toast.warning('Ngân hàng mục tiêu đã công bố. Vui lòng gỡ công bố để xóa nội dung giáo dục.');
      return;
    }
    setContents((prev) => prev.filter((_, i) => i !== idx));
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
      toast.error('Lỗi khi lưu nội dung giáo dục');
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
          <div className="flex items-center justify-between pb-2 border-b border-border/60">
            <div className="flex flex-col gap-0.5">
              <h2 className="text-[14.5px] font-semibold text-foreground">
                {t('planning.educationalContentListTitle', 'Danh sách nội dung giáo dục')}
              </h2>
              <p className="text-[12px] text-muted-foreground">
                {t('planning.educationalContentListSubtitle', 'Thiết lập các nội dung giáo dục cụ thể theo chuẩn Thông tư 51/BGDĐT.')}
              </p>
            </div>

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
            ) : (
              contents.map((item, idx) => {
                return (
                  <div
                    key={item.id || idx}
                    className="p-3.5 bg-card border border-border rounded-none transition-all group shadow-2xs hover:border-border/90 hover:bg-muted/10"
                  >
                    <div className="flex items-center justify-between gap-3">
                      {/* Left: STT trung tính + Input tên nội dung giáo dục */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="size-7 flex items-center justify-center text-[12px] font-mono font-medium text-muted-foreground bg-muted border border-border shrink-0">
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        <input
                          type="text"
                          value={item.title || ''}
                          readOnly={isBankPublished}
                          onChange={(e) => handleUpdateContentTitle(idx, e.target.value)}
                          placeholder={`Nhập tên nội dung giáo dục ${idx + 1}...`}
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
                          onClick={() => handleDeleteContent(idx)}
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
        </div>

        {/* Footer: Nút lưu thay đổi */}
        <div className="flex items-center justify-end pt-2 pb-6">
          <Button
            type="button"
            onClick={handleSaveGoalContents}
            disabled={!hasChanges || isBankPublished}
            className={cn(
              'h-8 px-5 text-[13px] font-medium rounded-none shadow-none flex items-center gap-1.5 transition-colors',
              hasChanges && !isBankPublished
                ? 'bg-[#1447e6] hover:bg-[#1447e6]/90 text-white cursor-pointer'
                : 'bg-muted text-muted-foreground border border-border cursor-not-allowed',
            )}
            title={isBankPublished ? 'Ngân hàng mục tiêu đã công bố' : undefined}
          >
            <span>{t('common.saveChanges', 'Lưu thay đổi')}</span>
          </Button>
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
            className="w-full max-w-[420px] bg-card border border-border p-5 shadow-2xl rounded-none space-y-4 text-foreground select-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-1.5">
              <h3 className="text-[16px] font-semibold text-foreground">
                Xác nhận xóa mục tiêu {goal?.code}?
              </h3>
              <p className="text-[13px] text-muted-foreground leading-relaxed">
                Mục tiêu "{goal?.title}" và toàn bộ danh sách nội dung giáo dục liên quan sẽ bị xóa khỏi ngân hàng mục tiêu. Thao tác này không thể hoàn tác.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(false)}
                className="h-8 px-3.5 text-[12.5px] rounded-none border border-border cursor-pointer shadow-none"
              >
                Hủy
              </Button>
              <Button
                type="button"
                onClick={handleConfirmDeleteGoal}
                className="h-8 px-4 text-[12.5px] font-medium rounded-none bg-destructive hover:bg-destructive/90 text-white cursor-pointer shadow-none"
              >
                Xóa mục tiêu
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CurriculumSingleGoalDetailPage;
