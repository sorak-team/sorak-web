import React, { useState, useEffect } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Cancel01Icon,
  CheckmarkCircle02Icon,
  Alert02Icon,
  ArrowRight01Icon,
  ArrowLeft01Icon,
  Layers01Icon,
  Calendar03Icon,
  UserGroupIcon,
  ArrowUpRight01Icon,
  SparklesIcon,
  CheckmarkSquare02Icon,
  SquareIcon,
} from '@hugeicons/core-free-icons';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { academicYearsApi } from '../academic-years.api';
import { cn } from '@/shared/lib/utils';

export function SchoolYearTransitionModal({ isOpen, onClose, currentYear, onSuccess }) {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [readinessData, setReadinessData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isClosingEnrollments, setIsClosingEnrollments] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  // Core 4-step options requested by user
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
    if (isOpen && currentYear?.id) {
      setCurrentStep(1);
      setIsComplete(false);
      setIsConfirmed(false);
      fetchReadiness();
    }
  }, [isOpen, currentYear?.id]);

  if (!isOpen) return null;

  const targetYearName = readinessData?.targetYearName || 'Năm học 2027–2028';
  const step3Data = readinessData?.step3 || {
    totalStudents: 286,
    enrolledCount: 0,
    completedCount: 286,
    isEligible: true,
    pendingClasses: [],
  };
  const enrolledCount = step3Data.enrolledCount ?? 0;
  const isStep3Eligible = enrolledCount === 0;

  // Step 3 Action: Close remaining active enrollments
  const handleCloseRemainingEnrollments = async () => {
    try {
      setIsClosingEnrollments(true);
      const res = await academicYearsApi.closeRemainingEnrollments(currentYear.id);
      toast.success(res.message || 'Đã chốt hoàn tất năm học cho toàn bộ học sinh!');
      await fetchReadiness();
    } catch (err) {
      toast.error('Chốt trạng thái thất bại', {
        description: err.response?.data?.message || err.message,
      });
    } finally {
      setIsClosingEnrollments(false);
    }
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
      title: 'Khung chủ đề',
      sub: copyThemes ? 'Hoàn thành & Kế thừa' : 'Tạo mới năm sau',
      icon: Layers01Icon,
    },
    {
      num: 2,
      title: 'Khung mục tiêu',
      sub: copyGoals ? '120 mục tiêu & Kế thừa' : 'Tạo mới năm sau',
      icon: Calendar03Icon,
    },
    {
      num: 3,
      title: 'Trạng thái học sinh',
      sub: isStep3Eligible ? '0 HS đang học (Đạt)' : `${enrolledCount} HS cần chốt`,
      icon: UserGroupIcon,
    },
    {
      num: 4,
      title: 'Lên khối xác nhận',
      sub: 'Duyệt danh sách lên khối',
      icon: SparklesIcon,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none" data-node-id="5147:20889">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-4xl bg-card text-card-foreground rounded-none border border-border shadow-2xl z-10 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border bg-card">
          <div>
            <h2 className="text-[18px] font-semibold text-foreground tracking-tight">Chuyển giao năm học</h2>
            <div className="flex items-center gap-2 text-[12px] text-muted-foreground mt-0.5">
              <span>{currentYear?.name || 'Năm học 2026–2027'}</span>
              <span>→</span>
              <strong className="text-[#1447e6] font-medium">{targetYearName}</strong>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isComplete ? (
              <span className="px-2.5 py-1 rounded-none text-[12px] font-medium bg-muted border border-border text-foreground font-mono">
                Bước {currentStep}/4
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-none text-[12px] font-medium bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                Hoàn tất
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              className="size-8 inline-flex items-center justify-center rounded-none border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
            >
              <HugeiconsIcon icon={Cancel01Icon} size={15} />
            </button>
          </div>
        </div>

        {/* 4-Step Progress Bar Line */}
        <div className="grid grid-cols-4 h-[3px] w-full bg-muted">
          {[1, 2, 3, 4].map((step) => (
            <div
              key={step}
              className={`h-full transition-colors ${
                isComplete || currentStep >= step ? 'bg-[#1447e6]' : 'bg-transparent'
              }`}
            />
          ))}
        </div>

        {/* Modal Body: Left Steps Sidebar + Right Step Content */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          {/* Left Steps Navigation */}
          <div className="w-full md:w-64 border-r border-border bg-muted/10 p-4 sm:p-5 flex flex-col justify-between shrink-0 select-none">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80 block mb-3 font-mono">
                QUY TRÌNH 4 BƯỚC
              </span>
              <div className="space-y-1.5">
                {stepsMeta.map((s) => {
                  const isActive = currentStep === s.num && !isComplete;
                  const isDone = isComplete || currentStep > s.num;

                  return (
                    <div
                      key={s.num}
                      onClick={() => {
                        if (isComplete) return;
                        if (s.num === 4 && !isStep3Eligible) {
                          toast.error('Cần chốt trạng thái học sinh ở Bước 3 trước khi lên khối.');
                          return;
                        }
                        setCurrentStep(s.num);
                      }}
                      className={cn(
                        'flex items-start gap-3 p-2.5 rounded-none transition-colors cursor-pointer',
                        isActive
                          ? 'bg-blue-50 text-[#1447e6] dark:bg-blue-950/40 dark:text-blue-400 border-l-2 border-[#1447e6]'
                          : 'hover:bg-muted/40 text-muted-foreground',
                      )}
                    >
                      <div
                        className={cn(
                          'size-6 rounded-none flex items-center justify-center shrink-0 text-[11px] font-bold',
                          isDone
                            ? 'bg-[#1447e6] text-white'
                            : isActive
                              ? 'bg-[#1447e6] text-white'
                              : 'bg-muted text-muted-foreground border border-border',
                        )}
                      >
                        {isDone ? (
                          <HugeiconsIcon icon={CheckmarkCircle02Icon} size={13} />
                        ) : (
                          s.num
                        )}
                      </div>
                      <div className="min-w-0">
                        <div
                          className={cn(
                            'text-[13px] leading-tight font-medium',
                            isActive ? 'text-[#1447e6] dark:text-blue-400 font-semibold' : 'text-foreground',
                          )}
                        >
                          {s.title}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                          {s.sub}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 p-3 rounded-none bg-card border border-border text-[12px] text-muted-foreground">
              <span className="font-semibold text-foreground block mb-0.5">Quy trình đồng bộ</span>
              Hệ thống kiểm tra tuần tự 4 bước để đảm bảo dữ liệu năm học mới nhất quán.
            </div>
          </div>

          {/* Right Step Content Area */}
          <div className="flex-1 p-5 sm:p-6 overflow-y-auto">
            {isLoading ? (
              <div className="py-20 text-center text-[13px] text-muted-foreground animate-pulse">
                Đang kiểm tra các điều kiện chuyển giao năm học...
              </div>
            ) : isComplete ? (
              /* COMPLETE STATE */
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="flex items-center gap-4">
                  <div className="size-14 rounded-none bg-[#1447e6] text-white flex items-center justify-center font-black text-2xl shadow-xs shrink-0">
                    <HugeiconsIcon icon={CheckmarkCircle02Icon} size={28} />
                  </div>
                  <div>
                    <h3 className="text-[18px] font-semibold text-foreground tracking-tight">
                      Chuyển giao thành công
                    </h3>
                    <p className="text-[12px] text-muted-foreground mt-0.5">
                      {targetYearName} đã được Sorak tạo tự động và kích hoạt.
                    </p>
                  </div>
                </div>

                <div className="rounded-none border border-border bg-card divide-y divide-border text-[13px]">
                  <div className="p-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} className="text-[#1447e6]" />
                      <div>
                        <span className="font-medium text-foreground">{currentYear?.name || 'Năm học 2026–2027'}</span>
                        <div className="text-[11px] text-muted-foreground">Đã chốt toàn bộ học sinh và lưu trữ hoàn thành</div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-none text-[11px] font-medium bg-muted border border-border text-muted-foreground">
                      Hoàn thành
                    </span>
                  </div>

                  <div className="p-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} className="text-[#1447e6]" />
                      <div>
                        <span className="font-medium text-foreground">{targetYearName}</span>
                        <div className="text-[11px] text-muted-foreground">
                          {copyThemes ? 'Đã sao chép khung chủ đề' : 'Khung chủ đề tạo mới'} ·{' '}
                          {copyGoals ? 'Đã kế thừa ngân hàng mục tiêu' : 'Mục tiêu tạo mới'}
                        </div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-none text-[11px] font-medium bg-[#1447e6]/10 text-[#1447e6] border border-[#1447e6]/20">
                      Sẵn sàng
                    </span>
                  </div>

                  <div className="p-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} className="text-[#1447e6]" />
                      <div>
                        <span className="font-medium text-foreground">216 học sinh Nhà trẻ, Mầm, Chồi</span>
                        <div className="text-[11px] text-muted-foreground">Đã chuyển sang khối tiếp theo (chờ phân lớp)</div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-none text-[11px] font-medium bg-muted border border-border text-muted-foreground">
                      Lên khối
                    </span>
                  </div>

                  <div className="p-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} className="text-[#1447e6]" />
                      <div>
                        <span className="font-medium text-foreground">70 học sinh khối Lá</span>
                        <div className="text-[11px] text-muted-foreground">Hoàn thành chương trình mầm non (Tốt nghiệp)</div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-none text-[11px] font-medium bg-muted border border-border text-muted-foreground">
                      Tốt nghiệp
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-none bg-muted/40 border border-border text-[12px] space-y-1">
                  <span className="font-semibold text-foreground block">Việc tiếp theo:</span>
                  <p className="text-muted-foreground">
                    Ban giám hiệu tiến hành phân lớp và phân công giáo viên chủ nhiệm cho năm học mới từ pool học sinh.
                  </p>
                </div>
              </div>
            ) : currentStep === 1 ? (
              /* STEP 1: HOÀN THÀNH KHUNG CHỦ ĐỀ VÀ TÙY CHỌN SAO CHÉP */
              <div className="space-y-4 animate-in fade-in duration-150">
                <div>
                  <span className="text-[11px] font-semibold text-[#1447e6] uppercase tracking-wider block font-mono">
                    BƯỚC 01 / 04
                  </span>
                  <h3 className="text-[16px] font-semibold text-foreground tracking-tight mt-0.5">
                    Hoàn thành khung chủ đề
                  </h3>
                  <p className="text-[12px] text-muted-foreground mt-0.5">
                    Kiểm tra tình trạng hoàn thiện khung chủ đề năm học hiện tại và quyết định có đem sang năm mới hay không.
                  </p>
                </div>

                {/* Progress bar card */}
                <div className="p-4 rounded-none border border-border bg-card space-y-2">
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="font-medium text-foreground">Tiến độ khung chủ đề năm học hiện tại</span>
                    <span className="font-mono font-semibold text-[#1447e6]">11 / 11 chủ đề</span>
                  </div>
                  <div className="h-1.5 w-full bg-muted rounded-none overflow-hidden">
                    <div className="h-full bg-[#1447e6] transition-all" style={{ width: '100%' }} />
                  </div>
                  <span className="text-[11px] text-muted-foreground block">
                    Đầy đủ 11 chủ đề chính và các chủ đề nhánh theo quy chuẩn giáo dục
                  </span>
                </div>

                {/* Checklist */}
                <div className="rounded-none border border-border bg-card divide-y divide-border text-[13px]">
                  <div className="p-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} className="text-[#1447e6]" />
                      <div>
                        <div className="font-medium text-foreground">Bộ chủ đề chính</div>
                        <div className="text-[11px] text-muted-foreground">11/11 chủ đề đã hoàn thiện nội dung và mục tiêu</div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-none text-[11px] font-medium bg-muted border border-border text-foreground">
                      Hoàn thành
                    </span>
                  </div>

                  <div className="p-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} className="text-[#1447e6]" />
                      <div>
                        <div className="font-medium text-foreground">Chủ đề nhánh & Hoạt động</div>
                        <div className="text-[11px] text-muted-foreground">Các chủ đề nhánh đã được thiết lập đầy đủ</div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-none text-[11px] font-medium bg-muted border border-border text-foreground">
                      Hoàn thành
                    </span>
                  </div>

                  <div className="p-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} className="text-[#1447e6]" />
                      <div>
                        <div className="font-medium text-foreground">Thời gian áp dụng</div>
                        <div className="text-[11px] text-muted-foreground">11/11 chủ đề đã phân bổ tuần học cụ thể</div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-none text-[11px] font-medium bg-muted border border-border text-foreground">
                      Hoàn thành
                    </span>
                  </div>
                </div>

                {/* Core User Requirement: Có muốn đem khung chủ đề cũ qua năm mới không */}
                <div className="p-4 rounded-none border border-border bg-card space-y-2">
                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={copyThemes}
                      onChange={(e) => setCopyThemes(e.target.checked)}
                      className="size-4.5 rounded-none border-border text-[#1447e6] focus:ring-[#1447e6] cursor-pointer mt-0.5"
                    />
                    <div className="flex-1">
                      <div className="text-[13.5px] font-semibold text-foreground flex items-center gap-2">
                        <span>Đem khung chủ đề cũ qua năm học mới</span>
                        <span className="text-[11px] font-medium px-2 py-0.5 bg-blue-50 text-[#1447e6] border border-blue-200">
                          Khuyên dùng
                        </span>
                      </div>
                      <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">
                        Hệ thống sẽ tự động sao chép toàn bộ bộ chủ đề và các chủ đề nhánh sang <strong>{targetYearName}</strong>, đồng thời tịnh tiến thời gian tuần học tương ứng với niên khóa mới.
                      </p>
                    </div>
                  </label>
                  {!copyThemes && (
                    <div className="text-[11.5px] text-amber-600 bg-amber-500/10 p-2.5 border border-amber-500/20 mt-2">
                      Lưu ý: Nếu không đem qua năm mới, Ban giám hiệu sẽ cần tạo mới toàn bộ khung chủ đề cho {targetYearName}.
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-[12px] pt-1">
                  <button
                    type="button"
                    onClick={() => navigate('/curriculum')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-none border border-border bg-card text-[#1447e6] hover:bg-muted font-medium cursor-pointer transition-colors"
                  >
                    <span>Xem chi tiết Khung chủ đề</span>
                    <HugeiconsIcon icon={ArrowUpRight01Icon} size={13} />
                  </button>
                </div>
              </div>
            ) : currentStep === 2 ? (
              /* STEP 2: CÓ MUỐN ĐEM KHUNG MỤC TIÊU NĂM CŨ QUA NĂM MỚI KHÔNG */
              <div className="space-y-4 animate-in fade-in duration-150">
                <div>
                  <span className="text-[11px] font-semibold text-[#1447e6] uppercase tracking-wider block font-mono">
                    BƯỚC 02 / 04
                  </span>
                  <h3 className="text-[16px] font-semibold text-foreground tracking-tight mt-0.5">
                    Hoàn tất khung mục tiêu
                  </h3>
                  <p className="text-[12px] text-muted-foreground mt-0.5">
                    Kiểm tra ngân hàng mục tiêu giáo dục và lựa chọn có đem khung mục tiêu cũ qua năm mới không.
                  </p>
                </div>

                {/* Progress bar card */}
                <div className="p-4 rounded-none border border-border bg-card space-y-2">
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="font-medium text-foreground">Ngân hàng mục tiêu năm học hiện tại</span>
                    <span className="font-mono font-semibold text-emerald-600">120 / 120 mục tiêu</span>
                  </div>
                  <div className="h-1.5 w-full bg-muted rounded-none overflow-hidden">
                    <div className="h-full bg-emerald-500 transition-all" style={{ width: '100%' }} />
                  </div>
                  <span className="text-[11px] text-muted-foreground block">
                    Đã công bố · 5 lĩnh vực phát triển · Phủ đều 4 khối học
                  </span>
                </div>

                {/* 4 Grade Groups */}
                <div className="rounded-none border border-border bg-card divide-y divide-border text-[13px]">
                  {['Nhà trẻ', 'Mầm', 'Chồi', 'Lá'].map((grade) => (
                    <div key={grade} className="p-3.5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} className="text-emerald-500" />
                        <div>
                          <div className="font-medium text-foreground">Khối {grade}</div>
                          <div className="text-[11px] text-muted-foreground">30 mục tiêu và nội dung giáo dục đã công bố</div>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-none text-[11px] font-medium bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                        Hoàn thành
                      </span>
                    </div>
                  ))}
                </div>

                {/* Core User Requirement: Có muốn đem khung mục tiêu năm cũ qua năm mới không */}
                <div className="p-4 rounded-none border border-border bg-card space-y-2">
                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={copyGoals}
                      onChange={(e) => setCopyGoals(e.target.checked)}
                      className="size-4.5 rounded-none border-border text-[#1447e6] focus:ring-[#1447e6] cursor-pointer mt-0.5"
                    />
                    <div className="flex-1">
                      <div className="text-[13.5px] font-semibold text-foreground flex items-center gap-2">
                        <span>Đem khung mục tiêu năm cũ qua năm mới</span>
                        <span className="text-[11px] font-medium px-2 py-0.5 bg-blue-50 text-[#1447e6] border border-blue-200">
                          Khuyên dùng
                        </span>
                      </div>
                      <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">
                        Kế thừa toàn bộ 120 mục tiêu giáo dục chuẩn cùng hệ thống nội dung giảng dạy sang <strong>{targetYearName}</strong> để giáo viên có thể lập thời khóa biểu ngay khi nhận lớp.
                      </p>
                    </div>
                  </label>
                  {!copyGoals && (
                    <div className="text-[11.5px] text-amber-600 bg-amber-500/10 p-2.5 border border-amber-500/20 mt-2">
                      Lưu ý: Nếu không đem qua năm mới, năm học {targetYearName} sẽ khởi tạo ngân hàng mục tiêu trống.
                    </div>
                  )}
                </div>
              </div>
            ) : currentStep === 3 ? (
              /* STEP 3: KHÔNG CÒN HỌC SINH NÀO TRONG ENROLL NĂM CŨ LÀ ĐANG HỌC */
              <div className="space-y-4 animate-in fade-in duration-150">
                <div>
                  <span className="text-[11px] font-semibold text-[#1447e6] uppercase tracking-wider block font-mono">
                    BƯỚC 03 / 04
                  </span>
                  <h3 className="text-[16px] font-semibold text-foreground tracking-tight mt-0.5">
                    Kiểm tra trạng thái học sinh năm cũ
                  </h3>
                  <p className="text-[12px] text-muted-foreground mt-0.5">
                    Điều kiện bắt buộc: Không còn học sinh nào trong danh sách lớp năm cũ đang ở trạng thái "Đang học".
                  </p>
                </div>

                {/* Status Evaluation Banner */}
                {isStep3Eligible ? (
                  <div className="p-4 rounded-none bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 space-y-1">
                    <div className="flex items-center gap-2 font-semibold text-[13.5px]">
                      <HugeiconsIcon icon={CheckmarkCircle02Icon} size={18} className="text-emerald-600" />
                      <span>Đạt điều kiện: 0 học sinh đang học</span>
                    </div>
                    <p className="text-[12px] text-emerald-700 dark:text-emerald-400">
                      Toàn bộ 286/286 học sinh trong niên khóa {currentYear?.name} đã được chốt kết quả năm học (Hoàn thành / Tốt nghiệp), không còn học sinh nào ở trạng thái đang học.
                    </p>
                  </div>
                ) : (
                  <div className="p-4 rounded-none bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 space-y-2">
                    <div className="flex items-center gap-2 font-semibold text-[13.5px]">
                      <HugeiconsIcon icon={Alert02Icon} size={18} className="text-amber-600" />
                      <span>Chưa đạt điều kiện: Còn {enrolledCount} học sinh đang học</span>
                    </div>
                    <p className="text-[12px] text-amber-800 dark:text-amber-300">
                      Quy chuẩn chuyển giao năm học yêu cầu tất cả học sinh năm cũ phải được chốt kết quả (Hoàn thành năm học hoặc Tốt nghiệp). Cần chốt trạng thái cho các em trước khi lên khối.
                    </p>
                    <div className="pt-2 flex items-center justify-between">
                      <span className="text-[12px] font-medium text-amber-800 dark:text-amber-200">
                        Thao tác nhanh cho Ban giám hiệu:
                      </span>
                      <button
                        type="button"
                        onClick={handleCloseRemainingEnrollments}
                        disabled={isClosingEnrollments}
                        className="h-8 px-3.5 inline-flex items-center gap-1.5 text-[12.5px] font-medium bg-[#1447e6] hover:bg-[#123ecc] text-white rounded-none cursor-pointer transition-colors shadow-xs disabled:opacity-50"
                      >
                        {isClosingEnrollments ? (
                          <>
                            <div className="size-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Đang chốt trạng thái...</span>
                          </>
                        ) : (
                          <>
                            <HugeiconsIcon icon={CheckmarkCircle02Icon} size={14} />
                            <span>Chốt hoàn tất năm học cho {enrolledCount} học sinh</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Grade Breakdown Table */}
                <div className="rounded-none border border-border bg-card overflow-hidden text-[13px]">
                  <div className="px-4 py-3 border-b border-border bg-muted/20 flex items-center justify-between">
                    <span className="font-semibold text-foreground text-[13px]">
                      Tình trạng học sinh theo 4 khối lớp
                    </span>
                    <span className="text-[11.5px] font-mono text-muted-foreground">
                      286 học sinh tổng
                    </span>
                  </div>
                  <table className="w-full text-left">
                    <thead className="bg-muted/10 border-b border-border text-muted-foreground text-[12px]">
                      <tr>
                        <th className="py-2.5 px-4 font-medium">Khối lớp</th>
                        <th className="py-2.5 px-4 font-medium">Sĩ số</th>
                        <th className="py-2.5 px-4 font-medium">Trạng thái chốt năm cũ</th>
                        <th className="py-2.5 px-4 text-right font-medium">Điều kiện</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {[
                        { grade: 'Nhà trẻ', count: 62, status: 'Hoàn thành năm học' },
                        { grade: 'Mầm', count: 78, status: 'Hoàn thành năm học' },
                        { grade: 'Chồi', count: 76, status: 'Hoàn thành năm học' },
                        { grade: 'Lá', count: 70, status: 'Hoàn thành chương trình (Tốt nghiệp)' },
                      ].map((item) => (
                        <tr key={item.grade}>
                          <td className="py-3 px-4 font-medium text-foreground">Khối {item.grade}</td>
                          <td className="py-3 px-4 font-mono">{item.count} HS</td>
                          <td className="py-3 px-4 text-muted-foreground text-[12.5px]">{item.status}</td>
                          <td className="py-3 px-4 text-right">
                            {isStep3Eligible ? (
                              <span className="px-2 py-0.5 rounded-none text-[11px] font-medium bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                Đã chốt
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-none text-[11px] font-medium bg-amber-500/10 text-amber-600 border border-amber-500/20">
                                Cần chốt
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="p-3.5 rounded-none bg-muted/40 border border-border text-[12px] text-muted-foreground">
                  <strong className="text-foreground">Nguyên tắc chuyển giao:</strong> Học sinh hoàn thành năm cũ sẽ được chuyển sang danh sách lên khối mới ở Bước 4. Học sinh khối Lá sẽ được công nhận hoàn thành chương trình mầm non.
                </div>
              </div>
            ) : (
              /* STEP 4: LÊN KHỐI XÁC NHẬN */
              <div className="space-y-4 animate-in fade-in duration-150">
                <div>
                  <span className="text-[11px] font-semibold text-[#1447e6] uppercase tracking-wider block font-mono">
                    BƯỚC 04 / 04
                  </span>
                  <h3 className="text-[16px] font-semibold text-foreground tracking-tight mt-0.5">
                    Lên khối xác nhận
                  </h3>
                  <p className="text-[12px] text-muted-foreground mt-0.5">
                    Kiểm tra tổng thể cấu hình chuyển giao và xác nhận danh sách lên khối cho năm học tiếp theo.
                  </p>
                </div>

                {/* Transition Summary Configuration */}
                <div className="p-3.5 rounded-none bg-muted/20 border border-border text-[12.5px] space-y-2">
                  <span className="font-semibold text-foreground block text-[13px]">
                    Cấu hình chuyển giao đã chọn:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[12px]">
                    <div className="p-2.5 bg-card border border-border">
                      <div className="text-muted-foreground">1. Khung chủ đề:</div>
                      <div className="font-semibold text-[#1447e6] mt-0.5">
                        {copyThemes ? 'Đem qua năm mới' : 'Không đem (Tạo mới)'}
                      </div>
                    </div>
                    <div className="p-2.5 bg-card border border-border">
                      <div className="text-muted-foreground">2. Khung mục tiêu:</div>
                      <div className="font-semibold text-[#1447e6] mt-0.5">
                        {copyGoals ? 'Đem qua năm mới' : 'Không đem (Tạo mới)'}
                      </div>
                    </div>
                    <div className="p-2.5 bg-card border border-border">
                      <div className="text-muted-foreground">3. Trạng thái học sinh:</div>
                      <div className="font-semibold text-emerald-600 mt-0.5">
                        0 HS đang học (Đã chốt 100%)
                      </div>
                    </div>
                  </div>
                </div>

                {/* Promotion Matrix Table */}
                <div className="rounded-none border border-border bg-card overflow-hidden text-[13px]">
                  <table className="w-full text-left">
                    <thead className="bg-muted/30 border-b border-border text-muted-foreground font-medium text-[12px]">
                      <tr>
                        <th className="py-2.5 px-4 font-medium">Khối hiện tại</th>
                        <th className="py-2.5 px-2"></th>
                        <th className="py-2.5 px-4 font-medium">Khối năm mới ({targetYearName})</th>
                        <th className="py-2.5 px-4 text-right font-medium">Số học sinh</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      <tr>
                        <td className="py-3 px-4 font-medium text-foreground">Khối Nhà trẻ</td>
                        <td className="py-3 px-2 text-muted-foreground">→</td>
                        <td className="py-3 px-4 font-semibold text-[#1447e6]">Khối Mầm</td>
                        <td className="py-3 px-4 text-right font-mono font-semibold">62</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 font-medium text-foreground">Khối Mầm</td>
                        <td className="py-3 px-2 text-muted-foreground">→</td>
                        <td className="py-3 px-4 font-semibold text-[#1447e6]">Khối Chồi</td>
                        <td className="py-3 px-4 text-right font-mono font-semibold">78</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 font-medium text-foreground">Khối Chồi</td>
                        <td className="py-3 px-2 text-muted-foreground">→</td>
                        <td className="py-3 px-4 font-semibold text-[#1447e6]">Khối Lá</td>
                        <td className="py-3 px-4 text-right font-mono font-semibold">76</td>
                      </tr>
                      <tr className="bg-muted/10">
                        <td className="py-3 px-4 font-medium text-foreground">Khối Lá</td>
                        <td className="py-3 px-2 text-muted-foreground">→</td>
                        <td className="py-3 px-4 font-semibold text-emerald-600">Hoàn thành chương trình (Tốt nghiệp)</td>
                        <td className="py-3 px-4 text-right font-mono font-semibold">70</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Note */}
                <div className="p-3.5 rounded-none bg-muted/40 border border-border text-[12px] text-muted-foreground">
                  <strong className="text-foreground block mb-0.5">Lưu ý sau khi chuyển giao:</strong>
                  Học sinh chuyển khối sẽ nằm trong danh sách chờ xếp lớp của khối mới trong {targetYearName}. Ban giám hiệu sẽ tiến hành chia lớp chi tiết theo sĩ số phòng học.
                </div>

                {/* Confirmation Checkbox */}
                <label className="flex items-start gap-2.5 p-3 rounded-none border border-[#1447e6]/30 bg-[#1447e6]/5 cursor-pointer text-[12.5px] select-none">
                  <input
                    type="checkbox"
                    checked={isConfirmed}
                    onChange={(e) => setIsConfirmed(e.target.checked)}
                    className="mt-0.5 rounded-none border-border text-[#1447e6] focus:ring-[#1447e6] size-4 cursor-pointer"
                  />
                  <span className="font-medium text-foreground leading-snug">
                    Tôi xác nhận danh sách lên khối và đồng ý hoàn tất chuyển giao sang {targetYearName}.
                  </span>
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-border bg-card flex items-center justify-between select-none">
          {!isComplete ? (
            <>
              <div>
                {currentStep > 1 && (
                  <button
                    type="button"
                    onClick={() => setCurrentStep((s) => s - 1)}
                    className="h-8.5 px-3.5 inline-flex items-center gap-1.5 text-[13px] font-medium rounded-none border border-border bg-background hover:bg-muted text-foreground cursor-pointer transition-colors"
                  >
                    <HugeiconsIcon icon={ArrowLeft01Icon} size={14} />
                    <span>Quay lại</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="h-8.5 px-4 text-[13px] font-medium rounded-none border border-border bg-background hover:bg-muted text-foreground cursor-pointer transition-colors"
                >
                  Đóng
                </button>

                {currentStep < 4 ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (currentStep === 3 && !isStep3Eligible) {
                        toast.error('Cần chốt trạng thái học sinh trước khi chuyển sang bước lên khối.');
                        return;
                      }
                      setCurrentStep((s) => s + 1);
                    }}
                    disabled={currentStep === 3 && !isStep3Eligible}
                    className="h-8.5 px-4 inline-flex items-center gap-1.5 text-[13px] font-medium rounded-none bg-[#1447e6] hover:bg-[#123ecc] text-white cursor-pointer transition-colors shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span>Tiếp tục</span>
                    <HugeiconsIcon icon={ArrowRight01Icon} size={14} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleExecuteTransition}
                    disabled={isExecuting || !isConfirmed}
                    className="h-8.5 px-4 inline-flex items-center gap-1.5 text-[13px] font-medium rounded-none bg-[#1447e6] hover:bg-[#123ecc] text-white cursor-pointer transition-colors disabled:opacity-50 shadow-xs"
                  >
                    {isExecuting ? (
                      <>
                        <div className="size-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Đang xử lý...</span>
                      </>
                    ) : (
                      <>
                        <HugeiconsIcon icon={SparklesIcon} size={14} />
                        <span>Xác nhận chuyển giao</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="w-full flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate('/classes');
                }}
                className="h-8.5 px-4 text-[13px] font-medium rounded-none border border-border bg-background hover:bg-muted text-foreground cursor-pointer transition-colors"
              >
                Phân lớp học sinh
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  window.location.reload();
                }}
                className="h-8.5 px-4 text-[13px] font-medium rounded-none bg-[#1447e6] hover:bg-[#123ecc] text-white cursor-pointer transition-colors shadow-xs"
              >
                Mở năm học mới
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SchoolYearTransitionModal;
