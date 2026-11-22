import React, { useState, useEffect } from 'react';
import { useSearchParams, useOutletContext } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Heart,
  Activity,
  AlertCircle,
  User,
  ShieldCheck,
  Scale,
  Ruler,
} from 'lucide-react';
import { parentApi } from '../api/parent.api';
import { cn } from '@/shared/lib/utils';
import { WhoGrowthCharts, evaluateChildGrowth } from '@/features/students/components/WhoGrowthCharts';

export function ParentHealthPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const outletCtx = useOutletContext() || {};
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const classId = searchParams.get('classId') || outletCtx.selectedClassId || null;

  const fetchHealthData = async () => {
    try {
      setLoading(true);
      const res = await parentApi.getProfile(classId ? { classId } : {});
      setData(res);
    } catch (err) {
      console.error('Failed to load student health profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthData();
  }, [classId]);

  const student = data?.student || outletCtx.student || {
    fullName: 'Nguyễn Minh An',
    studentCode: 'HS26001',
    allergyNotes: 'Không ghi nhận dị ứng thức ăn hay thuốc',
    medicalNotes: 'Sức khỏe tổng quát tốt, tiêm chủng đầy đủ',
  };

  const healthHistory = data?.healthHistory || [];
  const hasHistory = healthHistory.length > 0;
  const latestHealth = hasHistory
    ? healthHistory[0]
    : {
        date: 'Chưa có số liệu',
        height: '—',
        weight: '—',
        bmi: '—',
        bmiCategory: 'Chưa có số đo',
        notes: 'Chưa có bản ghi đo thể chất.',
        recordedBy: '—',
      };

  const latestEvaluation = hasHistory
    ? evaluateChildGrowth({
        heightZ: latestHealth.heightZscore,
        weightZ: latestHealth.weightZscore,
        bmiZ: latestHealth.bmiZscore,
      })
    : null;

  const isOverallGood =
    latestEvaluation?.heightEvaluation?.color === 'emerald' &&
    latestEvaluation?.weightEvaluation?.color === 'emerald';

  const cleanNotes = (notes) => {
    if (!notes) return 'Thể trạng phát triển bình thường.';
    return notes.replace(/^Khám sức khỏe định kỳ\s+[^:]+:\s*/i, '');
  };

  if (loading) {
    return (
      <div className="w-full flex-1 flex items-center justify-center p-16 select-none font-sans">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Activity className="size-6 animate-pulse text-primary" />
          <span className="text-[13px]">Đang tải hồ sơ sức khỏe của bé...</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="w-full flex-1 flex flex-col bg-background text-foreground select-none gap-3.5 pb-8 font-sans"
      data-node-id="5298:27110"
      data-name="FE-06E · Phụ huynh · Hồ sơ sức khỏe & Thể chất"
    >
      {/* 1. Header Action Toolbar (Clean subtitle on left, latest date tag on right) */}
      <div className="flex items-center justify-between gap-3 pb-1 shrink-0 flex-wrap sm:flex-nowrap">
        <span className="text-[12.5px] text-muted-foreground font-normal hidden sm:inline-block">
          Theo dõi định kỳ chiều cao, cân nặng và thể trạng của bé theo chuẩn mầm non
        </span>

        {hasHistory && (
          <div className="h-8 px-2.5 text-[12px] font-mono border border-border bg-background text-foreground flex items-center rounded-none shadow-2xs ml-auto">
            <span className="text-muted-foreground mr-1.5">Đo gần nhất:</span>
            <strong className="font-semibold">{latestHealth.date}</strong>
          </div>
        )}
      </div>

      {/* 2. Key Physical Metrics Strip (Bỏ BMI - Tập trung Chuẩn Chiều cao & Chuẩn Cân nặng) */}
      <div className="border border-border bg-card shadow-xs grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border overflow-hidden">
        {/* Metric 1: Chiều cao hiện tại */}
        <div className="p-3.5 flex flex-col justify-between gap-2 bg-card">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11.5px]">{t('health.currentHeight', 'Chiều cao hiện tại')}</span>
            <Ruler className="size-4 text-blue-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-foreground">
              {latestHealth.height}
            </span>
            {hasHistory && <span className="text-[12.5px] font-mono text-muted-foreground">cm</span>}
          </div>
          <div>
            <span
              className={cn(
                'px-2 py-0.5 text-[10.5px] font-semibold border rounded-none inline-block',
                latestEvaluation?.heightEvaluation?.badgeClass ||
                  'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
              )}
            >
              {latestEvaluation?.heightEvaluation?.label || t('health.standard', 'Đạt chuẩn')}
            </span>
          </div>
        </div>

        {/* Metric 2: Cân nặng hiện tại */}
        <div className="p-3.5 flex flex-col justify-between gap-2 bg-card">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11.5px]">{t('health.currentWeight', 'Cân nặng hiện tại')}</span>
            <Scale className="size-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-foreground">
              {latestHealth.weight}
            </span>
            {hasHistory && <span className="text-[12.5px] font-mono text-muted-foreground">kg</span>}
          </div>
          <div>
            <span
              className={cn(
                'px-2 py-0.5 text-[10.5px] font-semibold border rounded-none inline-block',
                latestEvaluation?.weightEvaluation?.badgeClass ||
                  'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
              )}
            >
              {latestEvaluation?.weightEvaluation?.label || t('health.standard', 'Đạt chuẩn')}
            </span>
          </div>
        </div>

        {/* Metric 3: Đánh giá thể lực chung (thay thế cho BMI) */}
        <div className="p-3.5 flex flex-col justify-between gap-2 bg-card">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11.5px]">{t('health.generalFitness', 'Thể lực chung')}</span>
            <Heart className="size-4 text-rose-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-bold text-foreground">
              {hasHistory ? (isOverallGood ? t('health.goodGrowth', 'Phát triển tốt') : t('health.needMonitor', 'Cần theo dõi')) : '—'}
            </span>
          </div>
          <div>
            <span
              className={cn(
                'px-2 py-0.5 text-[10.5px] font-semibold border rounded-none inline-block',
                isOverallGood
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
              )}
            >
              {hasHistory
                ? isOverallGood
                  ? t('health.heightWeightNormal', 'Chiều cao & Cân nặng đạt chuẩn')
                  : t('health.metricsAttention', 'Có chỉ số cần lưu ý')
                : t('common.noData', 'Chưa có dữ liệu')}
            </span>
          </div>
        </div>

        {/* Metric 4: Giáo viên thực hiện đo */}
        <div className="p-3.5 flex flex-col justify-between gap-2 bg-card">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11.5px]">{t('health.measuringStaff', 'Giáo viên thực hiện đo')}</span>
            <User className="size-4 text-muted-foreground" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-bold text-foreground truncate">
              {latestHealth.recordedBy || 'Phạm Hoàng Anh'}
            </span>
          </div>
          <div>
            <span className="px-2 py-0.5 text-[10.5px] font-semibold border rounded-none bg-muted text-muted-foreground border-border inline-block">
              {t('health.periodicPhysicalExam', 'Đo thể chất định kỳ')}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Medical & Allergy Notes (Clean 2-Column Container) */}
      <div className="border border-border bg-card shadow-xs grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border overflow-hidden">
        {/* Medical History */}
        <div className="p-3.5 flex flex-col gap-2 bg-card">
          <div className="flex items-center gap-2 pb-1.5 border-b border-border">
            <ShieldCheck className="size-4 text-emerald-600" />
            <span className="text-[13px] font-semibold text-foreground">
              {t('health.medicalHistoryTitle', 'Tiền sử bệnh lý & Tình trạng sức khỏe')}
            </span>
          </div>
          <p className="text-[12.5px] text-muted-foreground leading-relaxed">
            {student.medicalNotes || t('health.defaultMedicalNotes', 'Sức khỏe tổng quát tốt, tiêm chủng đầy đủ theo chương trình tiêm chủng mở rộng.')}
          </p>
        </div>

        {/* Allergy Box */}
        <div className="p-3.5 flex flex-col gap-2 bg-card">
          <div className="flex items-center gap-2 pb-1.5 border-b border-border">
            <AlertCircle className="size-4 text-amber-500" />
            <span className="text-[13px] font-semibold text-foreground">
              {t('health.allergyTitle', 'Ghi nhận dị ứng thực phẩm & thuốc')}
            </span>
          </div>
          <p className="text-[12.5px] text-muted-foreground leading-relaxed">
            {student.allergyNotes || t('health.defaultAllergyNotes', 'Không ghi nhận dị ứng thức ăn hay thuốc.')}
          </p>
        </div>
      </div>

      {/* 4. Health History Table (Bỏ cột BMI - Chia rõ Chuẩn Chiều cao & Chuẩn Cân nặng) */}
      <div className="border border-border bg-card shadow-xs overflow-hidden flex flex-col">
        <div className="p-3.5 border-b border-border flex items-center justify-between bg-card">
          <div className="flex items-center gap-2">
            <Activity className="size-4 text-primary" />
            <span className="text-[13px] font-semibold text-foreground">
              {t('health.historyTitle', 'Lịch sử các đợt đo thể chất định kỳ')}
            </span>
          </div>
          <span className="text-[11.5px] font-mono text-muted-foreground">
            {healthHistory.length} {t('health.examRounds', 'đợt đo')}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[12.5px]">
            <thead>
              <tr className="border-b border-border bg-muted/15 text-muted-foreground text-[11px] font-semibold uppercase tracking-tight">
                <th className="py-2.5 px-3.5">{t('health.date', 'Ngày đo')}</th>
                <th className="py-2.5 px-3.5">{t('health.height', 'Chiều cao')}</th>
                <th className="py-2.5 px-3.5">{t('health.heightStandard', 'Chuẩn chiều cao')}</th>
                <th className="py-2.5 px-3.5">{t('health.weight', 'Cân nặng')}</th>
                <th className="py-2.5 px-3.5">{t('health.weightStandard', 'Chuẩn cân nặng')}</th>
                <th className="py-2.5 px-3.5">{t('health.conclusionNotes', 'Nhận xét kết luận')}</th>
                <th className="py-2.5 px-3.5 text-right">{t('health.measuredBy', 'Giáo viên đo')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {healthHistory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted-foreground text-[13px]">
                    {t('health.noDataForPeriod', 'Chưa có dữ liệu khám sức khỏe cho giai đoạn này.')}
                  </td>
                </tr>
              ) : (
                healthHistory.map((h) => {
                  const { heightEvaluation, weightEvaluation } = evaluateChildGrowth({
                    heightZ: h.heightZscore,
                    weightZ: h.weightZscore,
                    bmiZ: h.bmiZscore,
                  });

                  return (
                    <tr key={h.id} className="hover:bg-muted/15 transition-colors">
                      <td className="py-2.5 px-3.5 font-mono font-medium text-foreground whitespace-nowrap">
                        {h.date}
                      </td>
                      <td className="py-2.5 px-3.5 font-mono whitespace-nowrap">
                        <strong className="text-foreground">{h.height}</strong> cm
                      </td>
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        <span
                          className={cn(
                            'px-2 py-0.5 text-[10.5px] font-semibold border rounded-none inline-block',
                            heightEvaluation.badgeClass
                          )}
                        >
                          {heightEvaluation.label}
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5 font-mono whitespace-nowrap">
                        <strong className="text-foreground">{h.weight}</strong> kg
                      </td>
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        <span
                          className={cn(
                            'px-2 py-0.5 text-[10.5px] font-semibold border rounded-none inline-block',
                            weightEvaluation.badgeClass
                          )}
                        >
                          {weightEvaluation.label}
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5 text-[12px] text-muted-foreground max-w-[320px]">
                        {cleanNotes(h.notes)}
                      </td>
                      <td className="py-2.5 px-3.5 text-right text-muted-foreground whitespace-nowrap text-[11px] font-mono">
                        {h.recordedBy || t('parent.hero.inChargeTeacher', 'Giáo viên phụ trách')}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Biểu đồ Tăng trưởng Thể chất Chuẩn WHO (Chiều cao theo tuổi & Cân nặng theo tuổi) */}
      <div className="border border-border bg-card shadow-xs p-3.5 sm:p-5 overflow-hidden flex flex-col gap-4">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <Activity className="size-4 text-primary" />
          <div>
            <h3 className="text-[13.5px] font-semibold text-foreground">
              {t('health.whoChartsTitle', 'Biểu đồ tăng trưởng thể chất chuẩn WHO')}
            </h3>
            <p className="text-[11.5px] text-muted-foreground mt-0.5">
              {t('health.whoChartsSubtitle', 'Đối chiếu chỉ số chiều cao và cân nặng của bé theo biểu đồ phân vị chuẩn của Tổ chức Y tế Thế giới')}
            </p>
          </div>
        </div>

        <WhoGrowthCharts
          student={student}
          healthData={{ history: healthHistory }}
        />
      </div>

      {/* 6. Minimalist Reference Note */}
      <p className="text-[11.5px] text-muted-foreground text-center pt-1">
        {t('health.whoStandardNote', 'Tiêu chuẩn Chiều cao theo tuổi và Cân nặng theo tuổi được đối chiếu theo bảng chuẩn tăng trưởng của Tổ chức Y tế Thế giới (WHO).')}
      </p>
    </div>
  );
}

export default ParentHealthPage;
