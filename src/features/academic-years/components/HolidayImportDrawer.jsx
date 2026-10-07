import React, { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Cancel01Icon, File02Icon, CheckmarkCircle02Icon } from '@hugeicons/core-free-icons';
import { toast } from 'sonner';
import { academicYearsApi } from '../academic-years.api';

export function HolidayImportDrawer({ isOpen, onClose, schoolYearId, onSuccess }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const previewItems = [
    {
      name: 'Nghỉ theo lịch trường',
      startDate: '2026-10-15',
      endDate: '2026-10-15',
      displayDate: '15/10/2026',
      type: 'Nghỉ',
      isTeachingAllowed: false,
      scope: 'Toàn trường',
    },
    {
      name: 'Hội thao toàn trường',
      startDate: '2026-10-23',
      endDate: '2026-10-23',
      displayDate: '23/10/2026',
      type: 'Sự kiện',
      isTeachingAllowed: true,
      scope: 'Toàn trường',
    },
    {
      name: 'Ngày Nhà giáo Việt Nam',
      startDate: '2026-11-20',
      endDate: '2026-11-20',
      displayDate: '20/11/2026',
      type: 'Sự kiện',
      isTeachingAllowed: true,
      scope: 'Toàn trường',
    },
  ];

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      toast.success(`Đã chọn tệp: ${file.name}`);
    }
  };

  const handleImport = async () => {
    try {
      setIsSubmitting(true);
      await academicYearsApi.importHolidays(schoolYearId, previewItems);
      toast.success('Import thành công 3 sự kiện vào lịch năm học!');
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error('Import lịch thất bại', {
        description: err.response?.data?.message || err.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" data-node-id="5232:25242">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative w-full max-w-[420px] bg-card text-card-foreground shadow-2xl flex flex-col h-full border-l border-border z-10 rounded-none animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-border bg-card flex items-center justify-between">
          <div>
            <h2 className="text-[16px] font-semibold text-foreground tracking-tight">Import lịch năm học</h2>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              Thêm lịch nghỉ và sự kiện từ tệp
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="size-8 inline-flex items-center justify-center rounded-none border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={15} />
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-[13px]">
          {/* Upload Area */}
          <div className="p-6 border-2 border-dashed border-border rounded-none text-center bg-muted/10 hover:border-[#1447e6]/50 transition-colors">
            <span className="font-semibold text-foreground block text-[14px]">
              {selectedFile ? selectedFile.name : 'Chọn tệp lịch'}
            </span>
            <span className="text-[11px] text-muted-foreground block mt-1">
              .xlsx · .csv
            </span>
            <label className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-none border border-border bg-background text-[13px] font-medium text-foreground hover:bg-muted cursor-pointer transition-colors shadow-xs">
              <span>{selectedFile ? 'Đổi tệp khác' : '+ Chọn file'}</span>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>

          {/* Column Mapping */}
          <div className="space-y-3 pt-2 border-t border-border">
            <span className="font-semibold text-foreground block text-[13px]">Ánh xạ cột dữ liệu</span>

            <div className="space-y-2.5">
              <div>
                <label className="text-[12px] text-muted-foreground block mb-1">Ngày</label>
                <select className="w-full h-9 px-3 text-[13px] rounded-none border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-[#1447e6]">
                  <option>Cột A - Ngày</option>
                  <option>Cột B - Thời gian</option>
                </select>
              </div>

              <div>
                <label className="text-[12px] text-muted-foreground block mb-1">Tên sự kiện</label>
                <select className="w-full h-9 px-3 text-[13px] rounded-none border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-[#1447e6]">
                  <option>Cột B - Tên</option>
                  <option>Cột A - Tiêu đề</option>
                </select>
              </div>

              <div>
                <label className="text-[12px] text-muted-foreground block mb-1">Loại</label>
                <select className="w-full h-9 px-3 text-[13px] rounded-none border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-[#1447e6]">
                  <option>Cột C - Loại</option>
                </select>
              </div>

              <div>
                <label className="text-[12px] text-muted-foreground block mb-1">Phạm vi</label>
                <select className="w-full h-9 px-3 text-[13px] rounded-none border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-[#1447e6]">
                  <option>Cột D - Phạm vi</option>
                </select>
              </div>
            </div>
          </div>

          {/* Preview list */}
          <div className="space-y-2 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground text-[13px]">Xem trước · 3 sự kiện</span>
              <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                <HugeiconsIcon icon={CheckmarkCircle02Icon} size={13} />
                Hợp lệ
              </span>
            </div>

            <div className="rounded-none border border-border divide-y divide-border bg-card">
              {previewItems.map((item, idx) => (
                <div key={idx} className="p-2.5 flex items-center justify-between text-[13px]">
                  <div>
                    <div className="font-medium text-foreground">{item.name}</div>
                    <div className="text-[11px] text-muted-foreground">{item.type}</div>
                  </div>
                  <span className="font-mono text-muted-foreground text-[12px]">
                    {item.displayDate}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Check notice */}
          <div className="p-3.5 rounded-none bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-[12px] text-foreground space-y-1">
            <span className="font-semibold text-[#1447e6] dark:text-blue-400 block">Kiểm tra trùng lịch</span>
            <p className="text-muted-foreground leading-relaxed">
              Cảnh báo nếu ngày nhập trùng lịch đã thiết lập.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-card flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="h-8.5 px-4 text-[13px] font-medium rounded-none border border-border bg-background hover:bg-muted text-foreground cursor-pointer transition-colors"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={isSubmitting}
            className="h-8.5 px-4 text-[13px] font-medium rounded-none bg-[#1447e6] hover:bg-[#123ecc] text-white cursor-pointer transition-colors disabled:opacity-50 shadow-xs"
          >
            {isSubmitting ? 'Đang import...' : 'Import 3 sự kiện'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default HolidayImportDrawer;
