import React from 'react';
import { ExcelImportModal } from '@/components/ExcelImportModal';
import { academicYearsApi } from '../academic-years.api';

export function HolidayImportDrawer({ isOpen, onClose, schoolYearId, onSuccess }) {
  if (!isOpen) return null;

  return (
    <ExcelImportModal
      isOpen={isOpen}
      onClose={onClose}
      title="Nhập Lịch & Ngày nghỉ Năm học từ Excel"
      description="Tải file mẫu lịch năm học, điền các mốc thời gian sự kiện, ngày nghỉ lễ để nhập vào hệ thống."
      templateFileName="Mau_Lich_Nam_Hoc_Sorak.xlsx"
      onDownloadTemplate={academicYearsApi.getCalendarTemplate}
      onPreview={(file) => academicYearsApi.previewCalendarImport(schoolYearId, file)}
      onImport={(validRows) => academicYearsApi.importCalendarExcel(schoolYearId, validRows)}
      onSuccess={onSuccess}
    />
  );
}

export default HolidayImportDrawer;
