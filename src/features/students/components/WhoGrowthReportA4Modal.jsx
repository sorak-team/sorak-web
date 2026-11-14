import React, { useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { HugeiconsIcon } from '@hugeicons/react';
import { PrinterIcon, Download01Icon, Cancel01Icon } from '@hugeicons/core-free-icons';
import { toast } from 'sonner';
import { exportA4GrowthReportPng } from '../services/who-growth-export.service';

export function WhoGrowthReportA4Modal({
  isOpen,
  onClose,
  student,
  healthData,
  isGirl,
  studentPoints = [],
  renderHeightChart,
  renderWeightChart,
  heightSvgRef,
  weightSvgRef,
}) {
  const [isExporting, setIsExporting] = React.useState(false);

  const fullName = student?.fullName || 'Học sinh';
  const studentCode = student?.studentCode || 'HS';
  const dob = student?.dob || student?.dateOfBirth || '—';
  const genderLabel = isGirl ? 'Nữ (Bé gái)' : 'Nam (Bé trai)';
  const className = student?.className || student?.currentClass?.className || 'Nhà trẻ 1';
  const teacherName = student?.teacherName || 'Trần Công Trực';

  const rows = studentPoints.length > 0 ? studentPoints : (healthData?.history || []);
  const maxRows = Math.max(4, rows.length);

  const handlePrint = () => {
    window.print();
  };

  const handleExportPng = async () => {
    if (!heightSvgRef?.current || !weightSvgRef?.current) {
      toast.error('Chưa tải xong biểu đồ để xuất ảnh');
      return;
    }
    try {
      setIsExporting(true);
      toast.loading('Đang khởi tạo phiếu thể lực A4 độ nét cao...', { id: 'export-a4' });
      await exportA4GrowthReportPng({
        student,
        healthData,
        isGirl,
        studentPoints,
        heightSvgElement: heightSvgRef.current,
        weightSvgElement: weightSvgRef.current,
      });
      toast.success('Đã xuất file ảnh phiếu thể lực A4 thành công!', { id: 'export-a4' });
    } catch (err) {
      console.error('Error exporting A4 PNG:', err);
      toast.error(`Không thể xuất ảnh: ${err.message || 'Lỗi xử lý'}`, { id: 'export-a4' });
    } finally {
      setIsExporting(false);
    }
  };

  const now = new Date();
  const dateStr = `ngày ${now.getDate()} tháng ${now.getMonth() + 1} năm ${now.getFullYear()}`;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {/* Print-specific style to guarantee perfect single-page A4 landscape output */}
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 6mm 8mm;
          }
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * {
            visibility: hidden !important;
          }
          #who-growth-a4-sheet, #who-growth-a4-sheet * {
            visibility: visible !important;
          }
          #who-growth-a4-sheet {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            margin: 0 !important;
            padding: 4mm !important;
            background: #ffffff !important;
            border: none !important;
            box-shadow: none !important;
            display: block !important;
            z-index: 99999 !important;
            overflow: hidden !important;
          }
        }
      `}</style>

      <DialogContent
        hideCloseButton
        className="max-w-6xl w-[96vw] max-h-[94vh] p-0 overflow-hidden flex flex-col bg-slate-100 dark:bg-slate-950 border-border rounded-none shadow-2xl"
      >
        {/* Modal Top Bar */}
        <div className="px-5 py-3 border-b border-border bg-card flex items-center justify-between gap-3 shrink-0">
          <div>
            <DialogTitle className="text-[14px] font-semibold text-foreground flex items-center gap-2">
              <span>Xem trước Phiếu Theo Dõi Thể Lực Trẻ Em (Chuẩn WHO)</span>
              <span className="px-2 py-0.5 text-[10.5px] font-mono font-medium bg-primary/10 text-primary border border-primary/20">
                Tối ưu khổ A4 Landscape
              </span>
            </DialogTitle>
            <p className="text-[11.5px] text-muted-foreground mt-0.5">
              Học sinh: <strong className="text-foreground">{fullName}</strong> · Mã: {studentCode} · Lớp: {className}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="h-8 px-3 inline-flex items-center gap-1.5 text-[12px] font-medium border border-border bg-background hover:bg-muted text-foreground transition-colors cursor-pointer select-none"
              title="Mở hộp thoại in trình duyệt hoặc lưu dạng tệp PDF"
            >
              <HugeiconsIcon icon={PrinterIcon} size={14} className="text-muted-foreground" />
              <span>In phiếu / Lưu PDF (A4)</span>
            </button>

            <button
              type="button"
              onClick={handleExportPng}
              disabled={isExporting}
              className="h-8 px-3 inline-flex items-center gap-1.5 text-[12px] font-medium bg-primary hover:bg-primary/90 text-primary-foreground transition-colors cursor-pointer select-none disabled:opacity-50"
              title="Tải toàn bộ phiếu dạng ảnh PNG độ phân giải cao"
            >
              <HugeiconsIcon icon={Download01Icon} size={14} />
              <span>{isExporting ? 'Đang xuất PNG...' : 'Xuất ảnh A4 (PNG)'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="size-8 inline-flex items-center justify-center border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer ml-1"
              title="Đóng cửa sổ xem trước"
            >
              <HugeiconsIcon icon={Cancel01Icon} size={15} />
            </button>
          </div>
        </div>

        {/* Modal Body: A4 Paper Preview */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 flex justify-center bg-slate-200/60 dark:bg-slate-900/60">
          <div
            id="who-growth-a4-sheet"
            className="w-full max-w-[1100px] bg-white text-slate-900 border border-slate-300 shadow-md p-6 sm:p-8 flex flex-col justify-between text-[11px] font-sans select-none"
            style={{
              minHeight: '750px',
              fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            }}
          >
            {/* Header: School & National Motto */}
            <div className="border-b border-slate-300 pb-3">
              <div className="flex items-start justify-between gap-4">
                <div className="text-left">
                  <p className="text-[10px] font-semibold tracking-wide text-slate-600 uppercase">
                    Sở Giáo dục và Đào tạo Kiên Giang
                  </p>
                  <p className="text-[13px] font-bold text-slate-900 uppercase tracking-tight">
                    Trường Mầm non Hòn Tre
                  </p>
                  <p className="text-[9.5px] text-slate-500 font-mono">
                    Hệ thống Quản trị Giáo dục Sorak · Mã trường: MN-HT-2026
                  </p>
                </div>

                <div className="text-center">
                  <p className="text-[11px] font-bold text-slate-900 uppercase">
                    Cộng hòa Xã hội Chủ nghĩa Việt Nam
                  </p>
                  <p className="text-[11px] italic text-slate-700">Độc lập - Tự do - Hạnh phúc</p>
                  <div className="w-24 h-px bg-slate-400 mx-auto mt-1" />
                </div>

                <div className="text-right text-[10px] font-mono text-slate-500">
                  <p>Biểu mẫu: BM-04/YTHĐ</p>
                  <p>Phân loại: Sức khỏe học đường</p>
                </div>
              </div>

              {/* Document Title */}
              <div className="text-center mt-3">
                <h1 className="text-[16px] font-black text-slate-900 tracking-wide uppercase">
                  Phiếu Theo Dõi Sự Phát Triển Thể Lực Trẻ Em
                </h1>
                <p className="text-[11px] italic text-slate-600 mt-0.5">
                  (Theo dõi định kỳ 4 đợt theo Chuẩn tăng trưởng WHO & Bộ Y tế Việt Nam)
                </p>
                <p className="text-[11px] font-bold text-slate-800 mt-0.5">
                  NĂM HỌC 2026 – 2027
                </p>
              </div>
            </div>

            {/* Student Profile Box */}
            <div className="mt-3 p-3 bg-slate-50 border border-slate-200">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 text-[11px]">
                <div>
                  <span className="text-slate-500 font-normal">Họ và tên: </span>
                  <strong className="text-slate-900 font-bold uppercase">{fullName}</strong>
                </div>
                <div>
                  <span className="text-slate-500 font-normal">Mã học sinh: </span>
                  <span className="font-mono font-bold text-slate-800">{studentCode}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-normal">Ngày sinh: </span>
                  <span className="font-mono text-slate-800">{dob}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-normal">Giới tính: </span>
                  <span className="font-medium text-slate-800">{genderLabel}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-normal">Lớp học: </span>
                  <strong className="text-slate-900">{className}</strong>
                </div>
                <div>
                  <span className="text-slate-500 font-normal">Giáo viên phụ trách: </span>
                  <span className="font-medium text-slate-800">{teacherName}</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-slate-500 font-normal">Đánh giá chung: </span>
                  <span className="font-semibold text-emerald-700">
                    Phát triển thể lực bình thường theo chuẩn WHO
                  </span>
                </div>
              </div>
            </div>

            {/* Section I: Measurement History Table */}
            <div className="mt-3">
              <h2 className="text-[11.5px] font-bold text-slate-900 uppercase tracking-tight mb-1.5 flex items-center justify-between">
                <span>I. Bảng tổng hợp số đo các đợt kiểm tra thể chất định kỳ</span>
                <span className="text-[10px] font-normal text-slate-500">
                  Quy định 4 đợt theo Thông tư 13/2016/TTLT-BYT-BGDĐT
                </span>
              </h2>

              <div className="border border-slate-300 overflow-hidden">
                <table className="w-full text-left text-[10.5px] border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-800">
                      <th className="p-1.5 border-r border-slate-300 w-16">Đợt đo</th>
                      <th className="p-1.5 border-r border-slate-300 w-24">Ngày đo</th>
                      <th className="p-1.5 border-r border-slate-300 w-20">Tháng tuổi</th>
                      <th className="p-1.5 border-r border-slate-300 w-24">Chiều cao (cm)</th>
                      <th className="p-1.5 border-r border-slate-300">Chuẩn chiều cao (HAZ)</th>
                      <th className="p-1.5 border-r border-slate-300 w-24">Cân nặng (kg)</th>
                      <th className="p-1.5 border-r border-slate-300">Chuẩn cân nặng (WAZ)</th>
                      <th className="p-1.5">Nhận xét y tế</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: maxRows }).map((_, idx) => {
                      const r = rows[idx];
                      const rIndex = r?.roundIndex || idx + 1;
                      const rName = r?.roundName || `Đợt ${rIndex}`;
                      const rDate = r?.dateFormatted || r?.date || (r ? 'Chưa ghi' : '—');
                      const rAge = r?.ageInMonths ? `${r.ageInMonths} th` : '—';
                      const rHeight = r?.height ? `${r.height} cm` : '—';
                      const rWeight = r?.weight ? `${r.weight} kg` : '—';

                      const rawHz = r?.heightZscore ?? r?.zscoreHeight;
                      const hz = rawHz != null ? Number(rawHz) : null;
                      let hzLabel = 'Đạt chuẩn';
                      if (hz != null && !isNaN(hz)) {
                        if (hz < -3) hzLabel = 'Thấp còi độ 2';
                        else if (hz < -2) hzLabel = 'Thấp còi độ 1';
                        else if (hz > 2) hzLabel = 'Cao hơn tuổi';
                      }

                      const rawWz = r?.weightZscore ?? r?.zscoreWeight;
                      const wz = rawWz != null ? Number(rawWz) : null;
                      let wzLabel = 'Đạt chuẩn';
                      if (wz != null && !isNaN(wz)) {
                        if (wz < -3) wzLabel = 'Suy dinh dưỡng nặng';
                        else if (wz < -2) wzLabel = 'Suy dinh dưỡng vừa';
                        else if (wz > 2) wzLabel = 'Cân nặng cao hơn tuổi';
                      }

                      const notes = r?.notes || (r ? 'Phát triển tốt, thể trạng ổn định' : 'Theo kế hoạch định kỳ');

                      return (
                        <tr key={idx} className="border-b border-slate-200 last:border-b-0 even:bg-slate-50/60">
                          <td className="p-1.5 font-bold text-slate-800 border-r border-slate-200">{rName}</td>
                          <td className="p-1.5 font-mono text-slate-600 border-r border-slate-200">{rDate}</td>
                          <td className="p-1.5 font-mono text-slate-600 border-r border-slate-200">{rAge}</td>
                          <td className="p-1.5 font-mono font-bold text-slate-900 border-r border-slate-200">{rHeight}</td>
                          <td className="p-1.5 border-r border-slate-200 font-semibold text-emerald-700">
                            {r ? hzLabel : '—'}
                          </td>
                          <td className="p-1.5 font-mono font-bold text-slate-900 border-r border-slate-200">{rWeight}</td>
                          <td className="p-1.5 border-r border-slate-200 font-semibold text-emerald-700">
                            {r ? wzLabel : '—'}
                          </td>
                          <td className="p-1.5 text-slate-600 text-[10px]">{notes}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section II: Dual WHO Growth Charts */}
            <div className="mt-3">
              <h2 className="text-[11.5px] font-bold text-slate-900 uppercase tracking-tight mb-1.5">
                II. Biểu đồ tăng trưởng theo chuẩn WHO (24 – 72 tháng tuổi)
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Height Chart */}
                <div className="border border-slate-300 bg-white p-2">
                  <div className="flex items-center justify-between pb-1 mb-1 border-b border-slate-200 text-[10.5px]">
                    <span className="font-bold text-slate-900">1. Chiều cao theo tuổi (cm)</span>
                    <span className="text-slate-500 text-[9.5px]">Chuẩn WHO</span>
                  </div>
                  <div className="w-full h-auto overflow-hidden">
                    {renderHeightChart ? renderHeightChart() : null}
                  </div>
                </div>

                {/* Weight Chart */}
                <div className="border border-slate-300 bg-white p-2">
                  <div className="flex items-center justify-between pb-1 mb-1 border-b border-slate-200 text-[10.5px]">
                    <span className="font-bold text-slate-900">2. Cân nặng theo tuổi (kg)</span>
                    <span className="text-slate-500 text-[9.5px]">Chuẩn WHO</span>
                  </div>
                  <div className="w-full h-auto overflow-hidden">
                    {renderWeightChart ? renderWeightChart() : null}
                  </div>
                </div>
              </div>

              {/* WHO Legend Strip */}
              <div className="mt-2 py-1 px-2 bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[9.5px] text-slate-600">
                <div className="flex items-center gap-1">
                  <span className="size-2.5 bg-[#FEF9C3] border border-[#FDE047]" />
                  <span>Cao hơn so với tuổi</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="size-2.5 bg-[#D6F1FD] border border-[#7DD3FC]" />
                  <span>Bình thường (Đạt chuẩn)</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="size-2.5 bg-[#FED7AA] border border-[#FDBA74]" />
                  <span>Thấp còi 1 / Nhẹ cân</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="size-2.5 bg-[#EE7D8D] border border-[#E11D48]" />
                  <span>Thấp còi 2 / Suy dinh dưỡng nặng</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3.5 h-0.5 bg-[#16A34A]" />
                  <span className="font-medium text-emerald-700">Đường trung vị chuẩn (0 SD)</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="size-2 rounded-full bg-[#2563EB]" />
                  <span className="font-bold text-[#2563EB]">Số đo bé (Đ1 → Đ{studentPoints.length})</span>
                </div>
              </div>
            </div>

            {/* Section III: Signatures & Verification */}
            <div className="mt-3 pt-2 border-t border-slate-300">
              <div className="grid grid-cols-2 gap-4 text-center text-[11px]">
                {/* Left: Nurse */}
                <div>
                  <p className="font-bold text-slate-900 uppercase">Cán bộ Y tế Học đường</p>
                  <p className="text-[10px] italic text-slate-500">(Ký và ghi rõ họ tên)</p>
                  <div className="h-14" />
                  <p className="font-bold text-slate-900">Cán bộ Y tế</p>
                </div>

                {/* Right: Teacher */}
                <div>
                  <p className="text-[10px] italic text-slate-600">Hòn Tre, {dateStr}</p>
                  <p className="font-bold text-slate-900 uppercase">Giáo viên Chủ nhiệm</p>
                  <p className="text-[10px] italic text-slate-500">(Ký và ghi rõ họ tên)</p>
                  <div className="h-14" />
                  <p className="font-bold text-slate-900">{teacherName}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

