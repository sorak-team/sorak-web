import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Cancel01Icon,
  FileAttachmentIcon,
  Tick01Icon,
} from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function GoalImportDrawer({ isOpen, onClose, onImportSuccess }) {
  const { t } = useTranslation();
  const [selectedFile, setSelectedFile] = useState('ngan_hang_muc_tieu_gdmn_51.xlsx');
  const [isImporting, setIsImporting] = useState(false);

  if (!isOpen) return null;

  const handleImport = () => {
    setIsImporting(true);
    setTimeout(() => {
      setIsImporting(false);
      toast.success(t('curriculum.importSuccess', 'Đã import thành công 120 mục tiêu giáo dục vào ngân hàng!'));
      if (onImportSuccess) onImportSuccess();
      onClose();
    }, 600);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-[1px] animate-in fade-in-0 duration-200"
      onClick={onClose}
      data-node-id="4949:13534"
      data-name="Goal Import Drawer"
    >
      <div
        className="w-full max-w-[460px] sm:w-[460px] h-full bg-card border-l border-border shadow-2xl flex flex-col justify-between text-foreground select-none overflow-hidden animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-border flex items-start justify-between shrink-0 bg-card">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-[16.5px] font-semibold text-foreground tracking-tight">
              {t('curriculum.importEducationalGoals', 'Import mục tiêu giáo dục')}
            </h2>
            <p className="text-[12.5px] text-muted-foreground font-normal">
              {t('curriculum.importGoalsSubtitle', 'Nhập mục tiêu theo chuẩn Thông tư 51 từ file Excel hoặc CSV.')}
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

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* File Upload Zone */}
          <div className="border border-dashed border-border bg-[#fafafa] dark:bg-muted/20 p-6 flex flex-col items-center justify-center text-center gap-2 rounded-none">
            <span className="text-[13px] font-medium text-foreground">
              {t('curriculum.dragDropGoalsPrompt', 'Kéo thả hoặc chọn file ngân hàng mục tiêu')}
            </span>
            <span className="text-[12px] text-muted-foreground">
              {t('curriculum.supportExcelCsv', 'Hỗ trợ .xlsx · .csv')}
            </span>
            <label className="mt-2 inline-flex items-center justify-center h-8 px-4 bg-[#1447e6] hover:bg-[#1447e6]/90 text-white text-[13px] font-medium cursor-pointer rounded-none">
              {t('curriculum.selectFile', 'Chọn file')}
            </label>
            {selectedFile && (
              <div className="mt-2 flex items-center gap-2 px-2.5 py-1 bg-background border border-border text-[12px]">
                <HugeiconsIcon icon={FileAttachmentIcon} size={14} className="text-primary" />
                <span>{selectedFile}</span>
              </div>
            )}
          </div>

          {/* Mapping settings */}
          <div className="space-y-2">
            <h3 className="text-[13px] font-semibold text-foreground">{t('curriculum.mapData', 'Map dữ liệu')}</h3>
            <div className="space-y-2 text-[12.5px]">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t('curriculum.developmentDomain', 'Lĩnh vực phát triển')}</span>
                <select className="h-7 px-2 border border-border bg-background rounded-none text-[12px]">
                  <option>{t('curriculum.colADomain', 'Cột A - Lĩnh vực')}</option>
                </select>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t('curriculum.goalCode', 'Mã mục tiêu')}</span>
                <select className="h-7 px-2 border border-border bg-background rounded-none text-[12px]">
                  <option>{t('curriculum.colBCode', 'Cột B - Mã')}</option>
                </select>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t('curriculum.goalContent', 'Nội dung mục tiêu')}</span>
                <select className="h-7 px-2 border border-border bg-background rounded-none text-[12px]">
                  <option>{t('curriculum.colCContent', 'Cột C - Nội dung')}</option>
                </select>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t('common.age', 'Độ tuổi')}</span>
                <select className="h-7 px-2 border border-border bg-background rounded-none text-[12px]">
                  <option>{t('curriculum.colDAge', 'Cột D - Độ tuổi')}</option>
                </select>
              </div>
            </div>
          </div>
        </div>

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
            type="button"
            onClick={handleImport}
            disabled={isImporting}
            className="h-8 px-4 rounded-none bg-[#1447e6] hover:bg-[#1447e6]/90 text-white text-[13px] font-medium shadow-none cursor-pointer"
          >
            {isImporting ? t('curriculum.importing', 'Đang import...') : t('curriculum.importIntoBank', 'Import vào ngân hàng')}
          </Button>
        </div>
      </div>
    </div>
  );
}
