import React, { useState, useEffect } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Cancel01Icon } from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useAcademicYearStore } from '@/features/academic-years';

export function ThemeCreateModal({
  isOpen,
  onClose,
  tab = 'themes',
  defaultYear = '2026–2027',
  onSuccess,
}) {
  const academicYears = useAcademicYearStore((state) => state.academicYears);
  const [name, setName] = useState('');
  const [year, setYear] = useState(defaultYear);
  const [ageGroup, setAgeGroup] = useState('nhatre');
  const [template, setTemplate] = useState('clone');

  useEffect(() => {
    if (defaultYear) {
      setYear(defaultYear.replace('Năm học ', '').trim());
    }
  }, [defaultYear, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanName =
      name.trim() || (tab === 'themes' ? `Bộ chủ đề ${year}` : `Ngân hàng mục tiêu ${year}`);
    toast.success(`Đã tạo ${cleanName} thành công!`);
    if (onSuccess) onSuccess();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[1px] animate-in fade-in-0 duration-150 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[460px] bg-card border border-border shadow-xl rounded-none text-foreground select-none overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="text-[16px] font-semibold text-foreground">
            {tab === 'themes' ? 'Tạo bộ chủ đề mới' : 'Tạo ngân hàng mục tiêu mới'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-foreground">
              Niên khóa áp dụng
            </label>
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="w-full h-8 px-2.5 bg-background border border-border text-[13px] rounded-none outline-none focus:border-primary cursor-pointer"
            >
              {academicYears?.length > 0 ? (
                academicYears.map((ay) => {
                  const val = ay.range || ay.name?.replace('Năm học ', '') || ay.code;
                  return (
                    <option key={ay.id} value={val}>
                      {ay.name || `Năm học ${val}`}
                    </option>
                  );
                })
              ) : (
                <>
                  <option value="2026–2027">Năm học 2026–2027 (Hiện tại)</option>
                  <option value="2027–2028">Năm học 2027–2028</option>
                </>
              )}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-foreground">
              Khối lớp
            </label>
            <select
              value={ageGroup}
              onChange={(e) => setAgeGroup(e.target.value)}
              className="w-full h-8 px-2.5 bg-background border border-border text-[13px] rounded-none outline-none focus:border-primary cursor-pointer"
            >
              <option value="nhatre">Khối Nhà trẻ (12–36 tháng)</option>
              <option value="mam">Khối Mầm (3–4 tuổi)</option>
              <option value="choi">Khối Chồi (4–5 tuổi)</option>
              <option value="la">Khối Lá (5–6 tuổi)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-foreground">
              Mẫu khởi tạo
            </label>
            <div className="space-y-2 text-[13px]">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="template"
                  checked={template === 'clone'}
                  onChange={() => setTemplate('clone')}
                />
                <span>Sao chép từ niên khóa 2025–2026 (Khuyên dùng)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="template"
                  checked={template === 'blank'}
                  onChange={() => setTemplate('blank')}
                />
                <span>Tạo khung trống</span>
              </label>
            </div>
          </div>

          <div className="pt-3 border-t border-border flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-8 px-4 rounded-none border border-border text-[13px] shadow-none"
            >
              Huỷ
            </Button>
            <Button
              type="submit"
              className="h-8 px-4 rounded-none bg-[#1447e6] hover:bg-[#1447e6]/90 text-white text-[13px] font-medium shadow-none cursor-pointer"
            >
              Tạo bộ khung
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
