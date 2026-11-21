import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  FileCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { downloadBlob } from '@/shared/utils/download';

export function ExcelImportModal({
  isOpen,
  onClose,
  title,
  description,
  templateFileName = 'Mau_Nhap_Du_Lieu.xlsx',
  onDownloadTemplate,
  onPreview,
  onImport,
  onSuccess,
}) {
  const { t } = useTranslation();
  const effectiveTitle = title || t('excel.defaultImportTitle', 'Nhập dữ liệu từ Excel');
  const effectiveDescription = description || t('excel.defaultImportDesc', 'Tải file mẫu, điền dữ liệu và tải lên để nhập hàng loạt vào hệ thống.');

  const [file, setFile] = useState(null);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [previewResult, setPreviewResult] = useState(null);
  const fileInputRef = useRef(null);

  const resetState = () => {
    setFile(null);
    setPreviewResult(null);
    setIsPreviewing(false);
    setIsImporting(false);
  };

  const handleClose = () => {
    if (isImporting) return;
    resetState();
    onClose();
  };

  const handleDownloadTemplate = async () => {
    try {
      setIsDownloadingTemplate(true);
      const blob = await onDownloadTemplate();
      downloadBlob(blob, templateFileName);
      toast.success(t('excel.downloadTemplateSuccess', 'Đã tải xuống file mẫu thành công.'));
    } catch (err) {
      toast.error(t('excel.downloadTemplateError', 'Không thể tải file mẫu. Vui lòng thử lại sau.'));
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
      toast.error(t('excel.invalidFormat', 'Vui lòng chọn file định dạng Excel (.xlsx hoặc .xls).'));
      return;
    }

    setFile(selectedFile);
    try {
      setIsPreviewing(true);
      const res = await onPreview(selectedFile);
      setPreviewResult(res);
      if (res.summary?.invalidCount > 0) {
        toast.warning(
          t('excel.validationWarning', 'Tìm thấy {{validCount}} dòng hợp lệ và {{invalidCount}} dòng lỗi.', {
            validCount: res.summary.validCount,
            invalidCount: res.summary.invalidCount,
          }),
        );
      } else {
        toast.success(
          t('excel.validationSuccess', 'Toàn bộ {{totalRows}} dòng dữ liệu đều hợp lệ!', {
            totalRows: res.summary?.totalRows,
          }),
        );
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || t('excel.readError', 'Lỗi đọc tệp Excel.'));
      setFile(null);
      setPreviewResult(null);
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!previewResult || !previewResult.previewData) return;
    const validRows = previewResult.previewData.filter((r) => r.isValid);
    if (validRows.length === 0) {
      toast.error(t('excel.noValidRows', 'Không có dòng dữ liệu hợp lệ nào để nhập.'));
      return;
    }

    try {
      setIsImporting(true);
      const result = await onImport(validRows);
      toast.success(
        result.message ||
          t('excel.importSuccess', 'Nhập thành công {{count}} bản ghi!', {
            count: result.successCount || validRows.length,
          }),
      );
      if (onSuccess) onSuccess();
      handleClose();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || t('excel.importError', 'Lỗi khi nhập dữ liệu.'));
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-6 overflow-hidden rounded-none border border-border bg-card shadow-xl">
        {/* Header strictly without icon on title, sharp typography */}
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-[17px] font-semibold text-foreground tracking-tight">
            {effectiveTitle}
          </DialogTitle>
          <DialogDescription className="text-[12px] text-muted-foreground">
            {effectiveDescription}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1">
          {/* Header Action: Download Template Button */}
          <div className="flex items-center justify-between p-3.5 bg-muted/40 border border-border rounded-none">
            <div className="flex items-center gap-2.5">
              <FileCheck className="w-4 h-4 text-primary shrink-0" />
              <div>
                <p className="text-[13px] font-semibold text-foreground">
                  {t('excel.noTemplateQuestion', 'Chưa có file mẫu chuẩn?')}
                </p>
                <p className="text-[11.5px] text-muted-foreground">
                  {t('excel.noTemplateDesc', 'Tải file mẫu có sẵn cấu trúc cột và sheet hướng dẫn nhập liệu')}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              disabled={isDownloadingTemplate}
              className="rounded-none border-border bg-background hover:bg-muted text-foreground text-xs font-medium gap-1.5 shadow-none h-8 px-3"
            >
              {isDownloadingTemplate ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              {t('excel.downloadTemplateBtn', 'Tải file mẫu')}
            </Button>
          </div>

          {/* Upload Dropzone */}
          {!previewResult ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border border-dashed border-border hover:border-primary rounded-none p-8 flex flex-col items-center justify-center gap-2.5 cursor-pointer transition-colors bg-muted/20 hover:bg-muted/30 group select-none"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="p-3 bg-muted text-muted-foreground rounded-none group-hover:text-primary transition-colors">
                {isPreviewing ? (
                  <RefreshCw className="w-6 h-6 animate-spin" />
                ) : (
                  <Upload className="w-6 h-6" />
                )}
              </div>
              <div className="text-center">
                <p className="text-[13.5px] font-medium text-foreground">
                  {isPreviewing
                    ? t('excel.analyzingFile', 'Đang phân tích tệp dữ liệu...')
                    : t('excel.dropzonePrompt', 'Bấm để chọn hoặc kéo thả file Excel vào đây')}
                </p>
                <p className="text-[11.5px] text-muted-foreground mt-0.5">
                  {t('excel.supportedFormats', 'Định dạng hỗ trợ: .xlsx, .xls (Tối đa 10MB)')}
                </p>
              </div>
            </div>
          ) : (
            /* Preview Analysis View */
            <div className="space-y-3">
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="p-2.5 bg-muted/20 border border-border rounded-none text-center">
                  <p className="text-[11px] text-muted-foreground font-medium">
                    {t('excel.totalRows', 'Tổng số dòng')}
                  </p>
                  <p className="text-[16px] font-bold text-foreground">
                    {previewResult.summary?.totalRows || 0}
                  </p>
                </div>
                <div className="p-2.5 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-none text-center">
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                    {t('excel.validRows', 'Hợp lệ')}
                  </p>
                  <p className="text-[16px] font-bold text-emerald-700 dark:text-emerald-300">
                    {previewResult.summary?.validCount || 0}
                  </p>
                </div>
                <div className="p-2.5 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/40 rounded-none text-center">
                  <p className="text-[11px] text-rose-700 dark:text-rose-400 font-medium">
                    {t('excel.invalidRows', 'Có lỗi')}
                  </p>
                  <p className="text-[16px] font-bold text-rose-700 dark:text-rose-300">
                    {previewResult.summary?.invalidCount || 0}
                  </p>
                </div>
              </div>

              {/* File Info Bar */}
              <div className="flex items-center justify-between text-xs px-3 py-2 bg-muted/30 border border-border rounded-none">
                <div className="flex items-center gap-2 truncate">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-medium truncate text-foreground">{file?.name}</span>
                </div>
                <button
                  type="button"
                  onClick={resetState}
                  className="text-primary hover:underline font-medium shrink-0 ml-2 cursor-pointer"
                >
                  {t('excel.chooseOtherFile', 'Chọn file khác')}
                </button>
              </div>

              {/* Table Preview */}
              <div className="border border-border rounded-none overflow-hidden max-h-[300px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-muted/80 sticky top-0 border-b border-border">
                    <tr>
                      <th className="py-2 px-3 font-semibold w-12 text-center text-muted-foreground">
                        {t('excel.colRowNumber', 'Dòng')}
                      </th>
                      <th className="py-2 px-3 font-semibold text-muted-foreground">
                        {t('excel.colName', 'Tên')}
                      </th>
                      <th className="py-2 px-3 font-semibold text-muted-foreground">
                        {t('excel.colStatus', 'Trạng thái')}
                      </th>
                      <th className="py-2 px-3 font-semibold text-muted-foreground">
                        {t('excel.colDetails', 'Chi tiết')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {previewResult.previewData?.map((row, idx) => (
                      <tr
                        key={idx}
                        className={
                          row.isValid
                            ? 'hover:bg-muted/30'
                            : 'bg-rose-50/40 dark:bg-rose-950/20 hover:bg-rose-50/60'
                        }
                      >
                        <td className="py-2 px-3 text-center text-muted-foreground font-mono">
                          {row.rowNumber}
                        </td>
                        <td className="py-2 px-3 font-medium text-foreground">
                          {row.fullName || row.name || '—'}
                          {row.studentCode && (
                            <span className="ml-1 text-[10px] text-muted-foreground font-mono">
                              ({row.studentCode})
                            </span>
                          )}
                          {row.employeeCode && (
                            <span className="ml-1 text-[10px] text-muted-foreground font-mono">
                              ({row.employeeCode})
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3">
                          {row.isValid ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-950/60 px-2 py-0.5 rounded-none border border-emerald-300 dark:border-emerald-800">
                              <CheckCircle2 className="w-3 h-3" /> {t('excel.statusValid', 'Hợp lệ')}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 dark:text-rose-400 bg-rose-100/70 dark:bg-rose-950/60 px-2 py-0.5 rounded-none border border-rose-300 dark:border-rose-800">
                              <AlertCircle className="w-3 h-3" /> {t('excel.statusError', 'Lỗi')}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-muted-foreground">
                          {row.isValid ? (
                            <span className="text-emerald-600 dark:text-emerald-400 text-[11px]">
                              {t('excel.readyToImport', 'Sẵn sàng nhập')}
                            </span>
                          ) : (
                            <span className="text-rose-600 dark:text-rose-400 text-[11px]">
                              {row.errors?.join('; ')}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="pt-3 border-t border-border gap-2 sm:gap-0">
          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
            disabled={isImporting}
            className="rounded-none text-xs"
          >
            {t('common.cancel', 'Hủy')}
          </Button>
          {previewResult && (
            <Button
              type="button"
              onClick={handleConfirmImport}
              disabled={isImporting || previewResult.summary?.validCount === 0}
              className="bg-[#1447e6] hover:bg-[#1447e6]/90 text-white rounded-none text-xs gap-1.5 h-8 px-4 shadow-none"
            >
              {isImporting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  {t('excel.importing', 'Đang xử lý nhập...')}
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  {t('excel.confirmImportBtn', 'Xác nhận nhập ({{count}} dòng hợp lệ)', {
                    count: previewResult.summary?.validCount || 0,
                  })}
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
export default ExcelImportModal;
