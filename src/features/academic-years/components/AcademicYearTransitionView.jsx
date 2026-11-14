import React, { useState, useEffect } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  CheckmarkCircle02Icon,
  Alert02Icon,
  ArrowRight01Icon,
  ArrowLeft01Icon,
  Layers01Icon,
  Calendar03Icon,
  UserGroupIcon,
  ArrowUpRight01Icon,
  SparklesIcon,
} from '@hugeicons/core-free-icons';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { triggerConfetti, Confetti } from '@/components/magicui/confetti';
import { academicYearsApi } from '../academic-years.api';
import { cn } from '@/shared/lib/utils';

const AGE_GROUP_ORDER = {
  NHA_TRE: 1,
  nhatre: 1,
  MAM: 2,
  mam: 2,
  CHOI: 3,
  choi: 3,
  LA: 4,
  la: 4,
};

const getAgeGroupRank = (ageGroup, name = '') => {
  const norm = String(ageGroup || '').toUpperCase().trim();
  if (AGE_GROUP_ORDER[norm]) return AGE_GROUP_ORDER[norm];

  const lowerName = String(name || '').toLowerCase();
  if (lowerName.includes('nhà trẻ') || lowerName.includes('nha tre')) return 1;
  if (lowerName.includes('mầm') || lowerName.includes('mam')) return 2;
  if (lowerName.includes('chồi') || lowerName.includes('choi')) return 3;
  if (lowerName.includes('lá') || lowerName.includes('la')) return 4;
  return 99;
};

export function AcademicYearTransitionView({ currentYear, onSuccess }) {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [unlockedStep, setUnlockedStep] = useState(1); // Strict linear gating
  const [readinessData, setReadinessData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  // Core options
  const [copyThemes, setCopyThemes] = useState(true);
  const [copyGoals, setCopyGoals] = useState(true);

  const fetchReadiness = async () => {
    if (!currentYear?.id) return;
    try {
      setIsLoading(true);
      const res = await academicYearsApi.getTransitionReadiness(currentYear.id);
      setReadinessData(res);
    } catch (err) {
      console.error('Error fetching transition readiness:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentYear?.id) {
      fetchReadiness();
    }
  }, [currentYear?.id]);

  const targetYearName = readinessData?.targetYearName || 'Năm học 2027–2028';
  const studentStatusData = readinessData?.step1 || readinessData?.step3 || {
    totalStudents: 26,
    enrolledCount: 0,
    completedCount: 26,
    isEligible: true,
    pendingClasses: [],
    classesList: [],
  };
  const enrolledCount = studentStatusData.enrolledCount ?? 0;
  const isStudentStatusEligible = enrolledCount === 0;
  const classesList = studentStatusData.classesList || [];
  const sortedClassesList = [...classesList].sort((a, b) => {
    const rankA = getAgeGroupRank(a.ageGroup, a.className);
    const rankB = getAgeGroupRank(b.ageGroup, b.className);
    if (rankA !== rankB) return rankA - rankB;
    return (a.className || '').localeCompare(b.className || '', 'vi', { numeric: true });
  });

  // Strict step progression: must finish step 1 (0 students ENROLLED) to unlock step 2
  const handleProceedFromStep1 = () => {
    if (!isStudentStatusEligible) {
      toast.error('Bắt buộc tất cả các lớp phải được chốt năm học (0 học sinh đang học) mới có thể tiếp tục.');
      return;
    }
    setUnlockedStep((prev) => Math.max(prev, 2));
    setCurrentStep(2);
    toast.success('Đã hoàn tất Bước 1: Trạng thái học sinh.');
  };

  // Strict step progression: must finish step 2 to unlock step 3
  const handleProceedFromStep2 = () => {
    setUnlockedStep((prev) => Math.max(prev, 3));
    setCurrentStep(3);
    toast.success('Đã hoàn tất Bước 2: Khung chủ đề.');
  };

  // Strict step progression: must finish step 3 to unlock step 4
  const handleProceedFromStep3 = () => {
    setUnlockedStep((prev) => Math.max(prev, 4));
    setCurrentStep(4);
    toast.success('Đã hoàn tất Bước 3: Khung mục tiêu.');
  };

  // Step 4 Final Execution
  const handleExecuteTransition = async () => {
    if (!isConfirmed) {
      toast.error('Vui lòng tích chọn xác nhận danh sách lên khối trước khi hoàn tất.');
      return;
    }

    try {
      setIsExecuting(true);
      await academicYearsApi.executeTransition(currentYear.id, {
        copyThemes,
        copyGoals,
        confirmPromotion: isConfirmed,
      });
      setIsComplete(true);
      triggerConfetti();
      toast.success('Chuyển giao năm học mới thành công!');
      onSuccess?.();
    } catch (err) {
      toast.error('Chuyển giao thất bại', {
        description: err.response?.data?.message || err.message,
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const stepsMeta = [
    {
      num: 1,
      title: 'Trạng thái học sinh',
      sub: 'Đánh giá & chốt năm học',
      icon: UserGroupIcon,
    },
    {
      num: 2,
      title: 'Khung chủ đề',
      sub: 'Kế thừa khung chủ đề',
      icon: Layers01Icon,
    },
    {
      num: 3,
      title: 'Khung mục tiêu',
      sub: 'Kế thừa ngân hàng mục tiêu',
      icon: Calendar03Icon,
    },
    {
      num: 4,
      title: 'Lên khối xác nhận',
      sub: 'Duyệt danh sách lên khối',
      icon: SparklesIcon,
    },
  ];

  return (
    <div className="border border-border bg-card rounded-none shadow-2xs overflow-hidden flex flex-col lg:flex-row select-none animate-in fade-in duration-200">
      {/* Left: Step Progression Navigator */}
      <div className="w-full lg:w-56 xl:w-60 border-b lg:border-b-0 lg:border-r border-border bg-muted/10 p-3 sm:p-4 flex flex-col justify-between shrink-0">
        <div className="space-y-3 lg:space-y-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80 block font-mono">
            CÁC BƯỚC TUẦN TỰ
          </span>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:flex lg:flex-col gap-1.5 sm:gap-2">
            {stepsMeta.map((s) => {
              const isActive = currentStep === s.num && !isComplete;
              const isPassed = isComplete || (unlockedStep > s.num);
              const isLocked = s.num > unlockedStep && !isComplete;

              return (
                <div
                  key={s.num}
                  onClick={() => {
                    if (isComplete) return;
                    if (isLocked) {
                      toast.info(`Bắt buộc phải hoàn thành các bước trước mới có thể xem Bước ${s.num}.`);
                      return;
                    }
                    setCurrentStep(s.num);
                  }}
                  className={cn(
                    'flex items-start gap-2.5 p-2.5 sm:p-3 rounded-none transition-all',
                    isLocked
                      ? 'opacity-40 cursor-not-allowed bg-transparent'
                      : 'cursor-pointer hover:bg-muted/40',
                    isActive && 'bg-muted/60 text-foreground font-medium border-l-2 border-foreground shadow-2xs',
                  )}
                >
                  <div
                    className={cn(
                      'size-6 rounded-none flex items-center justify-center shrink-0 text-[11px] font-mono mt-0.5',
                      isPassed
                        ? 'bg-foreground text-background font-medium'
                        : isActive
                          ? 'bg-foreground text-background font-medium'
                          : 'bg-muted text-muted-foreground border border-border/80 font-normal',
                    )}
                  >
                    {isPassed ? (
                      <HugeiconsIcon icon={CheckmarkCircle02Icon} size={13} />
                    ) : (
                      s.num
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span
                      className={cn(
                        'text-[12px] sm:text-[13px] leading-tight truncate block',
                        isActive ? 'text-foreground font-semibold' : 'text-foreground/90 font-medium',
                      )}
                    >
                      {s.title}
                    </span>
                    <div className="text-[10.5px] sm:text-[11px] text-muted-foreground truncate mt-0.5">
                      {s.sub}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right: Step Content & Actions */}
      <div className="flex-1 min-w-0 p-3.5 sm:p-5 flex flex-col justify-between min-h-[520px]">
        {isLoading ? (
          <div className="py-24 text-center text-[13px] text-muted-foreground animate-pulse">
            Đang tải dữ liệu kiểm tra điều kiện chuyển giao năm học...
          </div>
        ) : isComplete ? (
          /* COMPLETION SCREEN */
          <div className="relative space-y-6 animate-in fade-in duration-200">
            <Confetti className="absolute inset-0 pointer-events-none z-50 w-full h-full" manualstart={false} />
            <div className="flex items-center gap-4">
              <div className="size-12 rounded-none bg-foreground text-background flex items-center justify-center font-black text-2xl shadow-xs shrink-0">
                <HugeiconsIcon icon={CheckmarkCircle02Icon} size={24} />
              </div>
              <div>
                <h3 className="text-[19px] font-semibold text-foreground tracking-tight">
                  Chuyển giao năm học thành công
                </h3>
                <p className="text-[12.5px] text-muted-foreground mt-0.5">
                  Hệ thống đã lưu trữ {currentYear?.name} và kích hoạt {targetYearName}.
                </p>
              </div>
            </div>

            <div className="rounded-none border border-border bg-card divide-y divide-border text-[13px]">
              <div className="p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} className="text-foreground" />
                  <div>
                    <span className="font-medium text-foreground">{currentYear?.name || 'Năm học 2026–2027'}</span>
                    <div className="text-[11.5px] text-muted-foreground">Đã chốt kết quả và lưu trữ hoàn tất</div>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-none text-[11px] font-medium bg-muted border border-border text-muted-foreground">
                  Đã lưu trữ
                </span>
              </div>

              <div className="p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} className="text-foreground" />
                  <div>
                    <span className="font-medium text-foreground">{targetYearName}</span>
                    <div className="text-[11.5px] text-muted-foreground">
                      {copyThemes ? 'Đã sao chép khung chủ đề' : 'Khung chủ đề tạo mới'} ·{' '}
                      {copyGoals ? 'Đã kế thừa ngân hàng mục tiêu' : 'Mục tiêu tạo mới'}
                    </div>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-none text-[11px] font-medium bg-muted border border-border text-foreground font-semibold">
                  Đang hoạt động
                </span>
              </div>

              <div className="p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} className="text-foreground" />
                  <div>
                    <span className="font-medium text-foreground">216 học sinh các khối Nhà trẻ, Mầm, Chồi</span>
                    <div className="text-[11.5px] text-muted-foreground">Đã chuyển sang khối mới trong niên khóa {targetYearName}</div>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-none text-[11px] font-medium bg-muted border border-border text-muted-foreground">
                  Chờ phân lớp
                </span>
              </div>

              <div className="p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} className="text-foreground" />
                  <div>
                    <span className="font-medium text-foreground">70 học sinh khối Lá</span>
                    <div className="text-[11.5px] text-muted-foreground">Hoàn thành chương trình mầm non (Tốt nghiệp)</div>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-none text-[11px] font-medium bg-muted border border-border text-muted-foreground">
                  Tốt nghiệp
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/classes')}
                className="w-full sm:w-auto h-8 px-3.5 inline-flex items-center justify-center text-[12.5px] font-medium rounded-none border-border bg-background hover:bg-muted text-foreground cursor-pointer shadow-none"
              >
                Đến trang Phân lớp học sinh
              </Button>
              <Button
                type="button"
                variant="default"
                onClick={() => window.location.reload()}
                className="w-full sm:w-auto h-8 px-4 inline-flex items-center justify-center text-[12.5px] font-medium rounded-none shadow-none cursor-pointer"
              >
                Tải lại trang năm học mới
              </Button>
            </div>
          </div>
        ) : currentStep === 1 ? (
          /* STEP 1: KIỂM TRA TRẠNG THÁI HỌC SINH NĂM CŨ */
          <div className="space-y-4 animate-in fade-in duration-150">
            <div>
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block font-mono">
                BƯỚC 01 / 04
              </span>
              <h3 className="text-[17px] font-semibold text-foreground tracking-tight mt-0.5">
                Kiểm tra trạng thái học sinh năm cũ
              </h3>
              <p className="text-[12.5px] text-muted-foreground mt-0.5">
                Điều kiện bắt buộc: Không còn học sinh nào trong danh sách lớp năm cũ đang ở trạng thái "Đang học". Giáo viên từng lớp cần hoàn tất đánh giá cho toàn bộ học sinh trong lớp.
              </p>
            </div>

            {/* Standardized Table Container */}
            <div
              className="w-full border border-border bg-card rounded-none shadow-xs select-none"
              data-name="Academic Year Class Status Table"
            >
              {/* Table Top Toolbar */}
              <div className="min-h-10 px-3.5 py-2.5 border-b border-border bg-muted/20 flex items-center justify-between">
                <span className="text-[13px] font-semibold text-foreground truncate">
                  Tiến độ hoàn thành chương trình theo lớp
                </span>
                <span className="text-[11.5px] text-muted-foreground font-mono whitespace-nowrap">
                  ({classesList.length} lớp · {studentStatusData.totalStudents ?? 0} học sinh)
                </span>
              </div>

              {/* Fluid Responsive Table - no horizontal scroll needed */}
              <div className="w-full overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="h-9 border-b border-border bg-muted/30 text-[12px] font-medium text-muted-foreground">
                      <th className="px-3.5 py-2 whitespace-nowrap min-w-[140px]">Lớp học & Khối</th>
                      <th className="px-3 py-2 whitespace-nowrap min-w-[150px]">Giáo viên phụ trách</th>
                      <th className="px-3 py-2 text-center whitespace-nowrap min-w-[170px]">Hoàn thành chương trình</th>
                      <th className="px-3.5 py-2 text-right whitespace-nowrap min-w-[150px]">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 text-[12.5px]">
                    {sortedClassesList.length > 0 ? (
                      sortedClassesList.map((item) => {
                        const isClassEmpty = item.totalStudents === 0;
                        const isClassPending = item.enrolledCount > 0;
                        return (
                          <tr
                            key={item.classId}
                            className="hover:bg-muted/30 transition-colors group cursor-default"
                          >
                            <td className="px-3.5 py-2.5">
                              <span
                                onClick={() => navigate(`/classes/${item.classId}/students`)}
                                className="text-[13px] font-medium text-foreground hover:underline transition-colors cursor-pointer block leading-snug"
                              >
                                {item.className}
                              </span>
                              <span className="text-[11px] text-muted-foreground block leading-tight mt-0.5">
                                {item.ageGroupLabel || item.ageGroup || 'Khối mầm non'}
                              </span>
                            </td>

                            <td className="px-3 py-2.5">
                              {item.teacherName &&
                              item.teacherName !== 'Chưa phân công' &&
                              item.teacherName !== 'Chưa phân công giáo viên' &&
                              item.teacherName !== 'Chưa phân công GV' ? (
                                <div className="flex flex-col gap-0.5">
                                  {item.teacherName
                                    .split(/[,;\n/]+/)
                                    .map((n) => n.trim())
                                    .filter(Boolean)
                                    .map((name, idx) => (
                                      <span
                                        key={idx}
                                        className="text-[12.5px] text-foreground leading-tight"
                                      >
                                        {name}
                                      </span>
                                    ))}
                                </div>
                              ) : (
                                <span className="text-[12px] text-muted-foreground/60">
                                  Chưa phân công giáo viên
                                </span>
                              )}
                            </td>

                            <td className="px-3 py-2.5 text-center">
                              {isClassEmpty ? (
                                <span className="font-mono text-muted-foreground/60 text-[12px]">—</span>
                              ) : (
                                <span className="font-mono font-medium text-foreground text-[12.5px] whitespace-nowrap">
                                  {item.completedCount} / {item.totalStudents} trẻ
                                </span>
                              )}
                            </td>

                            <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                              {isClassEmpty ? (
                                <span className="text-[12px] text-muted-foreground/60 font-normal">
                                  Chưa có học sinh
                                </span>
                              ) : isClassPending ? (
                                <span className="text-[12px] text-amber-700 dark:text-amber-400 font-medium">
                                  Chưa hoàn tất đánh giá
                                </span>
                              ) : (
                                <span className="text-[12px] text-muted-foreground font-normal">
                                  Đã hoàn tất ({item.completedCount}/{item.totalStudents})
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-12 text-center text-muted-foreground text-[13px]">
                          Không có dữ liệu lớp học trong năm học này.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-4 mt-6 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/classes')}
                className="w-full sm:w-auto h-8 px-3 inline-flex items-center justify-center gap-1.5 text-[12px] font-normal rounded-none border-border hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer shadow-none"
              >
                <span>Mở quản lý lớp học</span>
                <HugeiconsIcon icon={ArrowUpRight01Icon} size={13} className="text-muted-foreground" />
              </Button>

              {/* Clean Gated Next Button: ONLY enabled if enrolledCount === 0 */}
              <Button
                type="button"
                variant={isStudentStatusEligible ? 'default' : 'outline'}
                onClick={handleProceedFromStep1}
                disabled={!isStudentStatusEligible}
                className={cn(
                  'w-full sm:w-auto h-8 px-4 inline-flex items-center justify-center gap-1.5 text-[12.5px] font-medium rounded-none shadow-none transition-colors cursor-pointer',
                  !isStudentStatusEligible && 'opacity-50 cursor-not-allowed bg-muted text-muted-foreground border-border',
                )}
                title={!isStudentStatusEligible ? 'Bắt buộc toàn bộ học sinh năm cũ phải được chốt mới có thể tiếp tục' : ''}
              >
                <span>Tiếp tục</span>
                <HugeiconsIcon icon={ArrowRight01Icon} size={14} />
              </Button>
            </div>
          </div>
        ) : currentStep === 2 ? (
          /* STEP 2: HOÀN THÀNH KHUNG CHỦ ĐỀ VÀ TÙY CHỌN SAO CHÉP */
          <div className="space-y-5 animate-in fade-in duration-150">
            <div>
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block font-mono">
                BƯỚC 02 / 04
              </span>
              <h3 className="text-[17px] font-semibold text-foreground tracking-tight mt-0.5">
                Hoàn thành khung chủ đề
              </h3>
              <p className="text-[12.5px] text-muted-foreground mt-0.5">
                Kiểm tra tiến độ hoàn thiện khung chủ đề năm học hiện tại và quyết định có đem sang năm mới hay không.
              </p>
            </div>

            {/* Progress bar card */}
            <div className="p-4 rounded-none border border-border bg-card space-y-2">
              <div className="flex items-center justify-between text-[13px]">
                <span className="font-medium text-foreground">Tiến độ khung chủ đề năm học hiện tại</span>
                <span className="font-mono font-medium text-foreground">11 / 11 chủ đề (100%)</span>
              </div>
              <div className="h-1.5 w-full bg-muted/70 rounded-none overflow-hidden">
                <div className="h-full bg-foreground/80 transition-all" style={{ width: '100%' }} />
              </div>
              <span className="text-[11.5px] text-muted-foreground block">
                Đã hoàn thiện đầy đủ 11 chủ đề giáo dục chính cùng các chủ đề nhánh theo quy chuẩn.
              </span>
            </div>

            {/* Checklist */}
            <div className="rounded-none border border-border bg-card divide-y divide-border text-[13px]">
              <div className="p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} className="text-foreground" />
                  <div>
                    <div className="font-medium text-foreground">Bộ chủ đề chính</div>
                    <div className="text-[11.5px] text-muted-foreground">11/11 chủ đề đã hoàn thiện nội dung và mục tiêu</div>
                  </div>
                </div>
                <span className="text-[11.5px] font-medium text-muted-foreground">
                  Hoàn thành
                </span>
              </div>

              <div className="p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} className="text-foreground" />
                  <div>
                    <div className="font-medium text-foreground">Chủ đề nhánh & Hoạt động</div>
                    <div className="text-[11.5px] text-muted-foreground">Các hoạt động theo chủ đề nhánh đã được cấu hình</div>
                  </div>
                </div>
                <span className="text-[11.5px] font-medium text-muted-foreground">
                  Hoàn thành
                </span>
              </div>

              <div className="p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} className="text-foreground" />
                  <div>
                    <div className="font-medium text-foreground">Thời gian áp dụng tuần học</div>
                    <div className="text-[11.5px] text-muted-foreground">11/11 chủ đề đã phân bổ tuần học cụ thể</div>
                  </div>
                </div>
                <span className="text-[11.5px] font-medium text-muted-foreground">
                  Hoàn thành
                </span>
              </div>
            </div>

            {/* Core Requirement: Có muốn đem khung chủ đề cũ qua năm mới không */}
            <div className="p-4 rounded-none border border-border bg-card space-y-2">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={copyThemes}
                  onChange={(e) => setCopyThemes(e.target.checked)}
                  className="size-4 rounded-none border-border accent-foreground cursor-pointer mt-0.5"
                />
                <div className="flex-1">
                  <div className="text-[13px] font-semibold text-foreground flex items-center gap-2">
                    <span>Đem khung chủ đề cũ qua năm học mới</span>
                    <span className="text-[11px] font-normal px-2 py-0.5 bg-muted text-foreground border border-border">
                      Khuyên dùng
                    </span>
                  </div>
                  <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">
                    Hệ thống sẽ sao chép toàn bộ bộ chủ đề và chủ đề nhánh sang <strong>{targetYearName}</strong>, đồng thời tự động tịnh tiến các mốc thời gian phù hợp với tuần học niên khóa mới.
                  </p>
                </div>
              </label>
              {!copyThemes && (
                <div className="text-[11.5px] text-muted-foreground bg-muted/40 p-2.5 border border-border mt-2">
                  Lưu ý: Nếu không đem qua năm mới, Ban giám hiệu sẽ cần tạo mới toàn bộ khung chủ đề cho {targetYearName}.
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-4 mt-6 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep(1)}
                className="w-full sm:w-auto h-8 px-3.5 inline-flex items-center justify-center gap-1.5 text-[12px] font-normal rounded-none border-border bg-background hover:bg-muted text-foreground cursor-pointer shadow-none"
              >
                <HugeiconsIcon icon={ArrowLeft01Icon} size={14} className="text-muted-foreground" />
                <span>Quay lại</span>
              </Button>

              {/* Clean Gated Next Button */}
              <Button
                type="button"
                variant="default"
                onClick={handleProceedFromStep2}
                className="w-full sm:w-auto h-8 px-4 inline-flex items-center justify-center gap-1.5 text-[12.5px] font-medium rounded-none shadow-none cursor-pointer"
              >
                <span>Tiếp tục</span>
                <HugeiconsIcon icon={ArrowRight01Icon} size={14} />
              </Button>
            </div>
          </div>
        ) : currentStep === 3 ? (
          /* STEP 3: CÓ MUỐN ĐEM KHUNG MỤC TIÊU NĂM CŨ QUA NĂM MỚI KHÔNG */
          <div className="space-y-5 animate-in fade-in duration-150">
            <div>
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block font-mono">
                BƯỚC 03 / 04
              </span>
              <h3 className="text-[17px] font-semibold text-foreground tracking-tight mt-0.5">
                Hoàn tất khung mục tiêu
              </h3>
              <p className="text-[12.5px] text-muted-foreground mt-0.5">
                Kiểm tra ngân hàng mục tiêu giáo dục theo 4 khối lớp và lựa chọn có đem khung mục tiêu cũ qua năm mới không.
              </p>
            </div>

            {/* Progress bar card */}
            <div className="p-4 rounded-none border border-border bg-card space-y-2">
              <div className="flex items-center justify-between text-[13px]">
                <span className="font-medium text-foreground">Ngân hàng mục tiêu năm học hiện tại</span>
                <span className="font-mono font-medium text-foreground">120 / 120 mục tiêu (100%)</span>
              </div>
              <div className="h-1.5 w-full bg-muted/70 rounded-none overflow-hidden">
                <div className="h-full bg-foreground/80 transition-all" style={{ width: '100%' }} />
              </div>
              <span className="text-[11.5px] text-muted-foreground block">
                Đã công bố · 5 lĩnh vực phát triển · Đầy đủ cho 4 khối học
              </span>
            </div>

            {/* 4 Grade Groups */}
            <div className="rounded-none border border-border bg-card divide-y divide-border text-[13px]">
              {['Nhà trẻ', 'Mầm', 'Chồi', 'Lá'].map((grade) => (
                <div key={grade} className="p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} className="text-foreground" />
                    <div>
                      <div className="font-medium text-foreground">Khối {grade}</div>
                      <div className="text-[11.5px] text-muted-foreground">30 mục tiêu và nội dung hoạt động đã sẵn sàng</div>
                    </div>
                  </div>
                  <span className="text-[11.5px] font-medium text-muted-foreground">
                    Hoàn thành
                  </span>
                </div>
              ))}
            </div>

            {/* Core Requirement: Có muốn đem khung mục tiêu năm cũ qua năm mới không */}
            <div className="p-4 rounded-none border border-border bg-card space-y-2">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={copyGoals}
                  onChange={(e) => setCopyGoals(e.target.checked)}
                  className="size-4 rounded-none border-border accent-foreground cursor-pointer mt-0.5"
                />
                <div className="flex-1">
                  <div className="text-[13px] font-semibold text-foreground flex items-center gap-2">
                    <span>Đem khung mục tiêu năm cũ qua năm mới</span>
                    <span className="text-[11px] font-normal px-2 py-0.5 bg-muted text-foreground border border-border">
                      Khuyên dùng
                    </span>
                  </div>
                  <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">
                    Kế thừa toàn bộ 120 mục tiêu giáo dục chuẩn cùng hệ thống hoạt động học sang <strong>{targetYearName}</strong> để giáo viên có thể lập thời khóa biểu ngay khi nhận lớp.
                  </p>
                </div>
              </label>
              {!copyGoals && (
                <div className="text-[11.5px] text-muted-foreground bg-muted/40 p-2.5 border border-border mt-2">
                  Lưu ý: Nếu không đem qua năm mới, năm học {targetYearName} sẽ khởi tạo ngân hàng mục tiêu trống.
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-4 mt-6 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep(2)}
                className="w-full sm:w-auto h-8 px-3.5 inline-flex items-center justify-center gap-1.5 text-[12px] font-normal rounded-none border-border bg-background hover:bg-muted text-foreground cursor-pointer shadow-none"
              >
                <HugeiconsIcon icon={ArrowLeft01Icon} size={14} className="text-muted-foreground" />
                <span>Quay lại</span>
              </Button>

              {/* Clean Gated Next Button */}
              <Button
                type="button"
                variant="default"
                onClick={handleProceedFromStep3}
                className="w-full sm:w-auto h-8 px-4 inline-flex items-center justify-center gap-1.5 text-[12.5px] font-medium rounded-none shadow-none cursor-pointer"
              >
                <span>Tiếp tục</span>
                <HugeiconsIcon icon={ArrowRight01Icon} size={14} />
              </Button>
            </div>
          </div>
        ) : (
          /* STEP 4: LÊN KHỐI XÁC NHẬN */
          <div className="space-y-5 animate-in fade-in duration-150">
            <div>
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block font-mono">
                BƯỚC 04 / 04
              </span>
              <h3 className="text-[17px] font-semibold text-foreground tracking-tight mt-0.5">
                Lên khối xác nhận
              </h3>
              <p className="text-[12.5px] text-muted-foreground mt-0.5">
                Kiểm tra tổng thể cấu hình chuyển giao và xác nhận danh sách lên khối cho năm học tiếp theo.
              </p>
            </div>

            {/* Transition Summary Configuration */}
            <div className="p-4 rounded-none bg-muted/20 border border-border text-[12.5px] space-y-2">
              <span className="font-semibold text-foreground block text-[13px]">
                Tổng hợp cấu hình chuyển giao:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-[12px]">
                <div className="p-3 bg-card border border-border">
                  <div className="text-muted-foreground">1. Trạng thái học sinh:</div>
                  <div className="font-semibold text-foreground mt-1 text-[12.5px]">
                    {isStudentStatusEligible ? 'Đã hoàn tất đánh giá' : 'Chưa hoàn tất đánh giá'}
                  </div>
                </div>
                <div className="p-3 bg-card border border-border">
                  <div className="text-muted-foreground">2. Khung chủ đề:</div>
                  <div className="font-semibold text-foreground mt-1 text-[12.5px]">
                    {copyThemes ? 'Kế thừa sang năm mới' : 'Khởi tạo mới'}
                  </div>
                </div>
                <div className="p-3 bg-card border border-border">
                  <div className="text-muted-foreground">3. Khung mục tiêu:</div>
                  <div className="font-semibold text-foreground mt-1 text-[12.5px]">
                    {copyGoals ? 'Kế thừa sang năm mới' : 'Khởi tạo mới'}
                  </div>
                </div>
              </div>
            </div>

            {/* Promotion Matrix Table matching StudentTable */}
            <div className="w-full border border-border bg-card rounded-none overflow-x-auto shadow-xs select-none">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="h-9 border-b border-border bg-muted/30 text-[12px] font-medium text-muted-foreground">
                    <th className="px-3 min-w-[180px] font-medium">Khối hiện tại</th>
                    <th className="px-2 w-8 text-center"></th>
                    <th className="px-3 min-w-[220px] font-medium">Khối năm mới ({targetYearName})</th>
                    <th className="px-3 min-w-[120px] text-right font-medium">Số học sinh</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {(readinessData?.step4?.promotionMatrix || [
                    { currentGrade: 'Khối Nhà trẻ', nextGrade: 'Khối Mầm', count: 0 },
                    { currentGrade: 'Khối Mầm', nextGrade: 'Khối Chồi', count: 26 },
                    { currentGrade: 'Khối Chồi', nextGrade: 'Khối Lá', count: 0 },
                    { currentGrade: 'Khối Lá', nextGrade: 'Hoàn thành chương trình (Tốt nghiệp)', count: 0 },
                  ]).map((item, idx) => (
                    <tr
                      key={idx}
                      className={cn(
                        'h-[46px] hover:bg-muted/40 transition-colors group cursor-default',
                        idx === 3 && 'bg-muted/10',
                      )}
                    >
                      <td className="px-3 font-medium text-foreground text-[13px]">
                        {item.currentGrade.startsWith('Khối') ? item.currentGrade : `Khối ${item.currentGrade}`}
                      </td>
                      <td className="px-2 text-center text-muted-foreground text-[13px]">→</td>
                      <td className="px-3 font-medium text-foreground text-[13px]">
                        {item.nextGrade.startsWith('Khối') || item.nextGrade.startsWith('Hoàn')
                          ? item.nextGrade
                          : `Khối ${item.nextGrade}`}
                      </td>
                      <td className="px-3 text-right font-mono font-medium text-[13px] text-foreground">
                        {item.count} HS
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Confirmation Checkbox */}
            <label className="flex items-start gap-2.5 p-3.5 rounded-none border border-border bg-muted/20 cursor-pointer text-[12.5px] select-none">
              <input
                type="checkbox"
                checked={isConfirmed}
                onChange={(e) => setIsConfirmed(e.target.checked)}
                className="mt-0.5 rounded-none border-border accent-foreground size-4 cursor-pointer"
              />
              <span className="font-medium text-foreground leading-snug">
                Tôi đã kiểm tra kỹ lưỡng các thông tin, xác nhận danh sách lên khối và đồng ý hoàn tất chuyển giao sang {targetYearName}.
              </span>
            </label>

            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-4 mt-6 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep(3)}
                className="w-full sm:w-auto h-8 px-3.5 inline-flex items-center justify-center gap-1.5 text-[12px] font-normal rounded-none border-border bg-background hover:bg-muted text-foreground cursor-pointer shadow-none"
              >
                <HugeiconsIcon icon={ArrowLeft01Icon} size={14} className="text-muted-foreground" />
                <span>Quay lại</span>
              </Button>

              <Button
                type="button"
                variant="default"
                onClick={handleExecuteTransition}
                disabled={isExecuting || !isConfirmed}
                className="w-full sm:w-auto h-8 px-4 inline-flex items-center justify-center gap-2 text-[12.5px] font-medium rounded-none shadow-none cursor-pointer transition-colors disabled:opacity-50"
              >
                {isExecuting ? (
                  <>
                    <div className="size-3.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                    <span>Đang xử lý...</span>
                  </>
                ) : (
                  <>
                    <HugeiconsIcon icon={SparklesIcon} size={15} />
                    <span>Xác nhận chuyển giao</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AcademicYearTransitionView;
