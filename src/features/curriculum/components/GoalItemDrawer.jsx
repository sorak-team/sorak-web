import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import { Cancel01Icon } from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export const formatGoalCode = (code) => {
  if (!code) return '';
  const raw = String(code).trim().toUpperCase();
  const digitsMatch = raw.match(/\d+/);
  if (digitsMatch) {
    const num = parseInt(digitsMatch[0], 10);
    if (!isNaN(num)) {
      return `MT ${num < 10 ? '0' + num : num}`;
    }
  }
  return raw;
};

export function GoalItemDrawer({
  isOpen,
  onClose,
  initialData,
  onSave,
  ageGroup = '',
  currentAgeGroupLabel = 'Khối Nhà trẻ (12–36 tháng)',
  nextCodeSuggestion = '',
}) {
  const { t } = useTranslation();
  const isMam =
    ageGroup === 'MAM' ||
    currentAgeGroupLabel?.toLowerCase()?.includes('mầm') ||
    currentAgeGroupLabel?.toLowerCase()?.includes('mam');
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [domain, setDomain] = useState('PHYSICAL');
  const [indicatorCode, setIndicatorCode] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setCode(initialData.code ? formatGoalCode(initialData.code) : '');
      setTitle(initialData.title || '');
      setDomain(initialData.domain || 'PHYSICAL');
      setIndicatorCode(initialData.indicatorCode || initialData.indicator || '');
    } else {
      setCode(nextCodeSuggestion ? formatGoalCode(nextCodeSuggestion) : t('curriculum.autoSequence', 'Tự động theo thứ tự'));
      setTitle('');
      setDomain('PHYSICAL');
      setIndicatorCode('');
    }
  }, [initialData, isOpen, nextCodeSuggestion, t]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error(t('curriculum.pleaseEnterGoalTitle', 'Vui lòng nhập tên mục tiêu'));
      return;
    }

    const payload = {
      code: code ? formatGoalCode(code.trim()) : '',
      title: title.trim(),
      domain,
      indicatorCode: isMam ? '' : indicatorCode.trim(),
    };

    try {
      setIsSubmitting(true);
      if (onSave) {
        await onSave(payload);
      }
      onClose();
    } catch (err) {
      console.error('Save goal failed:', err);
      const errMsg = err?.response?.data?.message || err?.message;
      if (errMsg && !errMsg.includes('Không thể tải')) {
        toast.error(errMsg, { id: 'goal-item-save-error' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-[1px] animate-in fade-in-0 duration-200"
      onClick={onClose}
      data-node-id="4951:14327"
      data-name="Goal Item Drawer"
    >
      <div
        className="w-full max-w-[460px] sm:w-[460px] h-full bg-card border-l border-border shadow-2xl flex flex-col justify-between text-foreground select-none overflow-hidden animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-border flex items-start justify-between shrink-0 bg-card">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-[16.5px] font-semibold text-foreground tracking-tight">
              {initialData ? t('curriculum.editGoal', 'Chỉnh sửa mục tiêu giáo dục') : t('curriculum.addGoal', 'Thêm mục tiêu giáo dục')}
            </h2>
            <p className="text-[12.5px] text-muted-foreground font-normal">
              {t('curriculum.goalDrawerSubtitle', 'Thiết lập nội dung và chỉ số đánh giá cho mục tiêu giáo dục.')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer rounded-none"
            title={t('common.close', 'Đóng')}
          >
            <HugeiconsIcon icon={Cancel01Icon} size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form id="goal-item-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Mã mục tiêu - CHỈ VIEW / TỰ ĐỘNG THEO THỨ TỰ */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[13px] font-medium text-foreground">
                {t('curriculum.goalCode', 'Mã mục tiêu')}
              </label>
              <span className="text-[11.5px] text-muted-foreground font-normal">
                {t('curriculum.autoSequence', 'Tự động theo thứ tự')}
              </span>
            </div>
            <input
              type="text"
              value={code}
              readOnly
              disabled
              className="w-full h-8 px-2.5 bg-muted/40 border border-border text-[13px] text-muted-foreground rounded-none cursor-not-allowed select-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-foreground">
              {t('curriculum.goalTitle', 'Tên mục tiêu')} <span className="text-destructive">*</span>
            </label>
            <textarea
              rows={3}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-2.5 bg-background border border-border text-[13px] rounded-none outline-none focus:border-primary resize-none"
              placeholder={t('curriculum.goalTitlePlaceholder', 'Nhập nội dung mục tiêu giáo dục...')}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-foreground">
              {t('curriculum.developmentDomain', 'Lĩnh vực phát triển')}
            </label>
            <select
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="w-full h-8 px-2.5 bg-background border border-border text-[13px] rounded-none outline-none focus:border-primary cursor-pointer"
            >
              <option value="PHYSICAL">{t('domains.physicalFull', 'Phát triển thể chất')}</option>
              <option value="COGNITIVE">{t('domains.cognitiveFull', 'Phát triển nhận thức')}</option>
              <option value="LANGUAGE">{t('domains.languageFull', 'Phát triển ngôn ngữ')}</option>
              <option value="SOCIO_EMOTIONAL">{t('domains.socioEmotionalFull', 'Phát triển tình cảm - kỹ năng xã hội')}</option>
              <option value="AESTHETIC">{t('domains.aestheticFull', 'Phát triển thẩm mỹ')}</option>
            </select>
          </div>

          {/* Nhóm tuổi áp dụng - CHỈ VIEW THÔI */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[13px] font-medium text-foreground">
                {t('curriculum.applicableAgeGroup', 'Nhóm tuổi áp dụng')}
              </label>
              <span className="text-[11.5px] text-muted-foreground font-normal">{t('common.viewOnly', 'Chỉ xem')}</span>
            </div>
            <input
              type="text"
              value={currentAgeGroupLabel}
              readOnly
              disabled
              className="w-full h-8 px-2.5 bg-muted/40 border border-border text-[13px] text-muted-foreground rounded-none cursor-not-allowed select-none"
            />
          </div>

          {/* Chỉ số Bộ Giáo dục (Ẩn đối với khối Mầm) */}
          {!isMam && (
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-foreground">
                {t('curriculum.moetIndicatorOptional', 'Chỉ số Bộ Giáo dục (nếu có)')}
              </label>
              <input
                type="text"
                value={indicatorCode}
                onChange={(e) => setIndicatorCode(e.target.value)}
                className="w-full h-8 px-2.5 bg-background border border-border text-[13px] rounded-none outline-none focus:border-primary"
                placeholder={t('curriculum.moetIndicatorPlaceholder', 'VD: CS 12 (Thông tư 51)')}
              />
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-card flex items-center justify-end gap-3 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="h-8 px-4 rounded-none border border-border text-[13px] shadow-none cursor-pointer"
          >
            {t('common.cancel', 'Huỷ')}
          </Button>
          <Button
            type="submit"
            form="goal-item-form"
            disabled={isSubmitting}
            className="h-8 px-4 rounded-none bg-[#1447e6] hover:bg-[#1447e6]/90 text-white text-[13px] font-medium shadow-none cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? t('common.saving', 'Đang lưu...') : t('curriculum.saveGoal', 'Lưu mục tiêu')}
          </Button>
        </div>
      </div>
    </div>
  );
}
