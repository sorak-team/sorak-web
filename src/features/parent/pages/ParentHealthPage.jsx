import React, { useState, useEffect } from 'react';
import { useSearchParams, useOutletContext } from 'react-router-dom';
import {
  Heart,
  Activity,
  AlertCircle,
  CheckCircle2,
  Calendar,
  User,
  ShieldCheck,
  Scale,
  Ruler,
  Info,
  Apple,
} from 'lucide-react';
import { parentApi } from '../api/parent.api';
import { cn } from '@/shared/lib/utils';

export function ParentHealthPage() {
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
  const latestHealth = healthHistory[0] || {
    date: 'Chưa đo',
    height: 97.8,
    weight: 14.95,
    bmi: 15.63,
    bmiCategory: 'Bình thường',
    notes: 'Bé phát triển chiều cao và cân nặng cân đối theo lứa tuổi.',
    recordedBy: 'Trần Thị Mai (Y tế học đường)',
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
      {/* 1. Header Action Toolbar (No redundant H1, clean subtitle on left, tags on right) */}
      <div className="flex items-center justify-between gap-3 pb-2 shrink-0 flex-wrap sm:flex-nowrap">
        <span className="text-[12.5px] text-muted-foreground font-normal hidden sm:inline-block">
          Theo dõi định kỳ chiều cao, cân nặng, chỉ số thể trọng BMI và tiền sử y tế học đường
        </span>

        {/* Right Info Tags */}
        <div className="flex items-center gap-2 ml-auto shrink-0 flex-wrap sm:flex-nowrap">
          <div className="h-8 px-2.5 text-[12px] font-mono border border-border bg-background text-foreground flex items-center rounded-none shadow-2xs">
            <span className="text-muted-foreground mr-1.5">Đo gần nhất:</span>
            <strong className="font-semibold">{latestHealth.date}</strong>
          </div>

          <div className="h-8 px-2.5 text-[12px] font-medium border rounded-none flex items-center gap-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 shadow-2xs">
            <CheckCircle2 className="size-3.5" />
            <span>Chuẩn WHO (0 SD) · Phát triển tốt</span>
          </div>
        </div>
      </div>

      {/* 2. Key Physical Metrics Strip (4 metrics with hairline dividers) */}
      <div className="border border-border bg-card shadow-xs grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border overflow-hidden">
        {/* Height Metric */}
        <div className="p-3.5 flex flex-col justify-between gap-2 bg-card">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11.5px] font-medium">Chiều cao hiện tại</span>
            <Ruler className="size-4 text-blue-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-bold font-mono text-foreground">
              {latestHealth.height}
            </span>
            <span className="text-[13px] font-mono text-muted-foreground">cm</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 text-[10.5px] font-semibold border rounded-none bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
              Chuẩn WHO (0 SD) · Cân đối
            </span>
          </div>
        </div>

        {/* Weight Metric */}
        <div className="p-3.5 flex flex-col justify-between gap-2 bg-card">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11.5px] font-medium">Cân nặng hiện tại</span>
            <Scale className="size-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-bold font-mono text-foreground">
              {latestHealth.weight}
            </span>
            <span className="text-[13px] font-mono text-muted-foreground">kg</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 text-[10.5px] font-semibold border rounded-none bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
              Chuẩn WHO · Cân đối
            </span>
          </div>
        </div>

        {/* BMI Metric */}
        <div className="p-3.5 flex flex-col justify-between gap-2 bg-card">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11.5px] font-medium">Chỉ số thể trọng BMI</span>
            <Activity className="size-4 text-primary" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-bold font-mono text-primary">
              {latestHealth.bmi}
            </span>
            <span className="text-[12px] font-mono text-muted-foreground">kg/m²</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 text-[10.5px] font-semibold border rounded-none bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
              {latestHealth.bmiCategory || 'Thể trạng bình thường'}
            </span>
          </div>
        </div>

        {/* Evaluator Officer */}
        <div className="p-3.5 flex flex-col justify-between gap-2 bg-card">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11.5px] font-medium">Cán bộ y tế khám</span>
            <User className="size-4 text-muted-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-[14px] font-bold text-foreground truncate">
              {latestHealth.recordedBy || 'Y tế học đường'}
            </span>
            <span className="text-[11.5px] text-muted-foreground truncate">
              Trạm Y tế Hòn Tre
            </span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Info className="size-3 text-muted-foreground shrink-0" />
            <span>Kỳ khám định kỳ đợt 1</span>
          </div>
        </div>
      </div>

      {/* 3. Medical Warnings & Allergy Notes (2-Column Unified Container) */}
      <div className="border border-border bg-card shadow-xs grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border overflow-hidden">
        {/* Allergy Box */}
        <div className="p-3.5 flex flex-col justify-between gap-2.5 bg-card">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 pb-2 border-b border-border">
              <AlertCircle className="size-4 text-amber-500" />
              <span className="text-[13px] font-bold text-foreground">
                Dị ứng thực phẩm / Dị ứng thuốc
              </span>
            </div>
            <p className="text-[12.5px] text-muted-foreground leading-relaxed">
              {student.allergyNotes || 'Không ghi nhận dị ứng thức ăn hay thuốc.'}
            </p>
          </div>
          <div className="text-[11px] text-muted-foreground bg-muted/15 p-2.5 border border-border">
            ℹ️ Nếu gia đình phát hiện bé có dị ứng mới, vui lòng thông báo ngay cho GVCN để nhà trường điều chỉnh thực đơn bán trú.
          </div>
        </div>

        {/* Medical History Box */}
        <div className="p-3.5 flex flex-col justify-between gap-2.5 bg-card">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 pb-2 border-b border-border">
              <ShieldCheck className="size-4 text-emerald-600" />
              <span className="text-[13px] font-bold text-foreground">
                Tiền sử bệnh lý & Tình trạng sức khỏe
              </span>
            </div>
            <p className="text-[12.5px] text-muted-foreground leading-relaxed">
              {student.medicalNotes || 'Sức khỏe tổng quát tốt, tiêm chủng đầy đủ theo chương trình tiêm chủng mở rộng.'}
            </p>
          </div>
          <div className="text-[11px] text-muted-foreground bg-muted/15 p-2.5 border border-border">
            🩺 Bé được kiểm tra thể lực, thị lực, tai mũi họng và răng miệng định kỳ vào đầu mỗi học kỳ.
          </div>
        </div>
      </div>

      {/* 4. Nutrition & Daily Activity Guidance (3-Column Strip) */}
      <div className="border border-border bg-card shadow-xs grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border overflow-hidden">
        <div className="p-3.5 flex flex-col gap-1.5 bg-card">
          <div className="flex items-center gap-1.5 text-foreground font-semibold text-[12.5px]">
            <Apple className="size-4 text-rose-500" />
            <span>Bữa ăn bán trú</span>
          </div>
          <p className="text-[12px] text-muted-foreground leading-relaxed">
            Thực đơn đầy đủ 4 nhóm chất (đạm, béo, bột đường, vitamin & khoáng chất). Bé ăn ngon miệng và tự xúc cơm gọn gàng.
          </p>
        </div>

        <div className="p-3.5 flex flex-col gap-1.5 bg-card">
          <div className="flex items-center gap-1.5 text-foreground font-semibold text-[12.5px]">
            <Activity className="size-4 text-blue-500" />
            <span>Vận động ngoài trời</span>
          </div>
          <p className="text-[12px] text-muted-foreground leading-relaxed">
            Bé tham gia tích cực bài thể dục sáng và các trò chơi vận động phát triển thể lực ở sân trường theo thời khóa biểu.
          </p>
        </div>

        <div className="p-3.5 flex flex-col gap-1.5 bg-card">
          <div className="flex items-center gap-1.5 text-foreground font-semibold text-[12.5px]">
            <Heart className="size-4 text-amber-500" />
            <span>Giấc ngủ trưa</span>
          </div>
          <p className="text-[12px] text-muted-foreground leading-relaxed">
            Ngủ sâu giấc từ 11:45 đến 14:00 tại phòng ngủ thoáng mát, thức dậy vui vẻ, sảng khoái sẵn sàng hoạt động chiều.
          </p>
        </div>
      </div>

      {/* 5. Health History Table (Full-Width Clean Table Matching Timetable Style) */}
      <div className="border border-border bg-card shadow-xs overflow-hidden flex flex-col">
        <div className="p-3.5 border-b border-border flex items-center justify-between bg-card">
          <div className="flex items-center gap-2">
            <Activity className="size-4 text-primary" />
            <span className="text-[13px] font-bold text-foreground">
              Lịch sử các đợt khám & Đo thể chất định kỳ
            </span>
          </div>
          <span className="text-[11.5px] font-mono text-muted-foreground">
            {healthHistory.length} đợt khám
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[12.5px]">
            <thead>
              <tr className="border-b border-border bg-muted/15 text-muted-foreground text-[11px] font-semibold uppercase tracking-tight">
                <th className="py-2.5 px-3.5">Ngày khám</th>
                <th className="py-2.5 px-3.5">Chiều cao</th>
                <th className="py-2.5 px-3.5">Cân nặng</th>
                <th className="py-2.5 px-3.5">Chỉ số BMI</th>
                <th className="py-2.5 px-3.5">Đánh giá WHO</th>
                <th className="py-2.5 px-3.5">Nhận xét & Kết luận</th>
                <th className="py-2.5 px-3.5 text-right">Người thực hiện</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {healthHistory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted-foreground text-[13px]">
                    Chưa có dữ liệu khám sức khỏe cho giai đoạn này.
                  </td>
                </tr>
              ) : (
                healthHistory.map((h) => (
                  <tr key={h.id} className="hover:bg-muted/15 transition-colors">
                    <td className="py-2.5 px-3.5 font-mono font-medium text-foreground whitespace-nowrap">
                      {h.date}
                    </td>
                    <td className="py-2.5 px-3.5 font-mono whitespace-nowrap">
                      <strong className="text-foreground">{h.height}</strong> cm
                    </td>
                    <td className="py-2.5 px-3.5 font-mono whitespace-nowrap">
                      <strong className="text-foreground">{h.weight}</strong> kg
                    </td>
                    <td className="py-2.5 px-3.5 font-mono font-bold text-primary whitespace-nowrap">
                      {h.bmi}
                    </td>
                    <td className="py-2.5 px-3.5 whitespace-nowrap">
                      <span className="px-2 py-0.5 text-[10.5px] font-semibold border rounded-none bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                        {h.bmiCategory || 'Bình thường'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 text-[12px] text-muted-foreground max-w-[280px]">
                      {h.notes || 'Thể trạng phát triển tốt.'}
                    </td>
                    <td className="py-2.5 px-3.5 text-right text-muted-foreground whitespace-nowrap text-[11px] font-mono">
                      {h.recordedBy || 'Y tế học đường'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default ParentHealthPage;
