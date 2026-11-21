import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import { Cancel01Icon } from '@hugeicons/core-free-icons';
import { toast } from 'sonner';
import { academicYearsApi } from '../academic-years.api';

export function EditSchoolYearDrawer({ isOpen, onClose, year, onSuccess }) {
  const { t } = useTranslation();
  const isCompleted = year?.status === 'COMPLETED';
  const [name, setName] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [syncCalendar, setSyncCalendar] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (year) {
      setName(year.name || '');
      setStatus(year.status || (year.active ? 'ACTIVE' : 'UPCOMING'));
      setStartDate(year.startDate ? year.startDate.split('T')[0] : '');
      setEndDate(year.endDate ? year.endDate.split('T')[0] : '');
    }
  }, [year, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isCompleted) {
      toast.error(t('schoolYear.endedCannotEdit', 'Năm học đã kết thúc không thể chỉnh sửa.'));
      return;
    }
    if (!name.trim()) {
      toast.error(t('schoolYear.validationName', 'Vui lòng nhập tên năm học.'));
      return;
    }
    if (!startDate || !endDate) {
      toast.error(t('schoolYear.validationDates', 'Vui lòng nhập ngày bắt đầu và kết thúc.'));
      return;
    }

    try {
      setIsSubmitting(true);
      await academicYearsApi.update(year.id, {
        name: name.trim(),
        status,
        startDate,
        endDate,
      });

      toast.success(t('schoolYear.toastUpdated', 'Cập nhật năm học thành công!'));
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(t('common.saveFailed', 'Cập nhật thất bại'), {
        description: err.response?.data?.message || err.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" data-node-id="5231:23049">
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
            <h2 className="text-[16px] font-semibold text-foreground tracking-tight">{t('schoolYear.editYear', 'Chỉnh sửa năm học')}</h2>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              {t('schoolYear.editYearSub', 'Cập nhật thông tin và thời gian năm học.')}
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
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-[13px]">
          {isCompleted && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-200 text-[12.5px] rounded-none">
              {t('schoolYear.endedNotice', 'Năm học này đã kết thúc và được lưu trữ lịch sử, không thể chỉnh sửa.')}
            </div>
          )}
          <div>
            <label className="block font-medium text-foreground mb-1.5 text-[13px]">
              {t('schoolYear.nameLabel', 'Tên năm học')} <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              required
              disabled={isCompleted}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('schoolYear.defaultName', 'Năm học 2026–2027')}
              className="w-full h-9 px-3 text-[13px] rounded-none border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-[#1447e6] disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block font-medium text-foreground mb-1.5 text-[13px]">
              {t('schoolYear.statusLabel', 'Trạng thái')}
            </label>
            <select
              value={status}
              disabled={isCompleted}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full h-9 px-3 text-[13px] rounded-none border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-[#1447e6] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <option value="ACTIVE">{t('schoolYear.active', 'Đang hoạt động')}</option>
              <option value="UPCOMING">{t('schoolYear.upcoming', 'Sắp diễn ra')}</option>
              <option value="COMPLETED">{t('schoolYear.ended', 'Đã kết thúc')}</option>
            </select>
          </div>

          <div className="pt-2 border-t border-border space-y-3">
            <span className="font-semibold text-foreground block text-[13px]">{t('schoolYear.timeframeLabel', 'Thời gian năm học')}</span>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[12px] text-muted-foreground block mb-1">{t('schoolYear.startDate', 'Ngày bắt đầu')}</label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full h-9 px-3 text-[13px] rounded-none border border-border bg-background font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-[#1447e6]"
                />
              </div>

              <div>
                <label className="text-[12px] text-muted-foreground block mb-1">{t('schoolYear.endDate', 'Ngày kết thúc')}</label>
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full h-9 px-3 text-[13px] rounded-none border border-border bg-background font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-[#1447e6]"
                />
              </div>
            </div>
          </div>

          {/* Notice Card */}
          <div className="p-3.5 rounded-none bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-[12px] text-foreground space-y-1">
            <span className="font-semibold text-[#1447e6] dark:text-blue-400 block">{t('schoolYear.noteWhenEditing', 'Lưu ý khi chỉnh năm học')}</span>
            <p className="text-muted-foreground leading-relaxed">
              {t('schoolYear.timeframeHelp', 'Ngày bắt đầu phải trước ngày kết thúc. Thay đổi thời gian không xoá dữ liệu lớp, giáo viên hoặc học sinh.')}
            </p>
          </div>

          {/* Option Checkbox */}
          <div className="pt-2">
            <span className="font-semibold text-foreground block mb-2 text-[13px]">{t('schoolYear.options', 'Tuỳ chọn')}</span>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={syncCalendar}
                onChange={(e) => setSyncCalendar(e.target.checked)}
                className="rounded-none border-border text-[#1447e6] focus:ring-[#1447e6] size-4 cursor-pointer"
              />
              <span className="text-[13px] text-foreground">{t('schoolYear.syncCalendarWithNewTime', 'Cập nhật lịch áp dụng theo thời gian mới')}</span>
            </label>
          </div>
        </form>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-card flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="h-8.5 px-4 text-[13px] font-medium rounded-none border border-border bg-background hover:bg-muted text-foreground cursor-pointer transition-colors"
          >
            {isCompleted ? t('common.close', 'Đóng') : t('common.cancel', 'Hủy')}
          </button>
          {!isCompleted && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="h-8.5 px-4 text-[13px] font-medium rounded-none bg-[#1447e6] hover:bg-[#123ecc] text-white cursor-pointer transition-colors disabled:opacity-50 shadow-xs"
            >
              {isSubmitting ? t('common.saving', 'Đang lưu...') : t('schoolYear.save', 'Lưu thay đổi')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default EditSchoolYearDrawer;
