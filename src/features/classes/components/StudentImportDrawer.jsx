import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Cancel01Icon,
  Upload01Icon,
  CheckmarkCircle02Icon,
  FileAttachmentIcon,
} from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { classesApi } from '../classes.api';
import { cn } from '@/shared/lib/utils';

// Standard mockup data for preview matching Figma node 4993:18232 (32 students)
const DEFAULT_PREVIEW_STUDENTS = [
  { studentCode: 'HS101', fullName: 'Nguyễn Khánh An', dateOfBirth: '2023-03-12', grade: 'Nhà trẻ', gender: 'FEMALE' },
  { studentCode: 'HS102', fullName: 'Trần Minh Châu', dateOfBirth: '2023-02-05', grade: 'Nhà trẻ', gender: 'FEMALE' },
  { studentCode: 'HS103', fullName: 'Lê Gia Huy', dateOfBirth: '2023-04-18', grade: 'Nhà trẻ', gender: 'MALE' },
  { studentCode: 'HS104', fullName: 'Phạm Bảo Ngọc', dateOfBirth: '2023-01-22', grade: 'Nhà trẻ', gender: 'FEMALE' },
  { studentCode: 'HS105', fullName: 'Đặng Tuấn Khang', dateOfBirth: '2023-05-09', grade: 'Nhà trẻ', gender: 'MALE' },
  { studentCode: 'HS106', fullName: 'Hoàng Thùy Linh', dateOfBirth: '2023-03-27', grade: 'Nhà trẻ', gender: 'FEMALE' },
  { studentCode: 'HS107', fullName: 'Vũ Đức Nam', dateOfBirth: '2023-02-14', grade: 'Nhà trẻ', gender: 'MALE' },
  { studentCode: 'HS108', fullName: 'Bùi Phương Thảo', dateOfBirth: '2023-06-30', grade: 'Nhà trẻ', gender: 'FEMALE' },
  { studentCode: 'HS109', fullName: 'Dương Gia Bảo', dateOfBirth: '2023-01-11', grade: 'Nhà trẻ', gender: 'MALE' },
  { studentCode: 'HS110', fullName: 'Lý Mai Anh', dateOfBirth: '2023-04-03', grade: 'Nhà trẻ', gender: 'FEMALE' },
  { studentCode: 'HS111', fullName: 'Ngô Quốc Cường', dateOfBirth: '2023-05-19', grade: 'Nhà trẻ', gender: 'MALE' },
  { studentCode: 'HS112', fullName: 'Chu Diệp Chi', dateOfBirth: '2023-02-28', grade: 'Nhà trẻ', gender: 'FEMALE' },
  { studentCode: 'HS113', fullName: 'Đỗ Hữu Phước', dateOfBirth: '2023-03-15', grade: 'Nhà trẻ', gender: 'MALE' },
  { studentCode: 'HS114', fullName: 'Trương Ngọc Ánh', dateOfBirth: '2023-01-08', grade: 'Nhà trẻ', gender: 'FEMALE' },
  { studentCode: 'HS115', fullName: 'Võ Minh Quân', dateOfBirth: '2023-06-12', grade: 'Nhà trẻ', gender: 'MALE' },
  { studentCode: 'HS116', fullName: 'Phan Thiên Ân', dateOfBirth: '2023-04-25', grade: 'Nhà trẻ', gender: 'MALE' },
  { studentCode: 'HS117', fullName: 'Lâm Tuệ Mẫn', dateOfBirth: '2023-02-19', grade: 'Nhà trẻ', gender: 'FEMALE' },
  { studentCode: 'HS118', fullName: 'Cao Nhật Minh', dateOfBirth: '2023-05-02', grade: 'Nhà trẻ', gender: 'MALE' },
  { studentCode: 'HS119', fullName: 'Đinh Hồng Hạnh', dateOfBirth: '2023-03-08', grade: 'Nhà trẻ', gender: 'FEMALE' },
  { studentCode: 'HS120', fullName: 'Mai Trọng Hiếu', dateOfBirth: '2023-01-17', grade: 'Nhà trẻ', gender: 'MALE' },
  { studentCode: 'HS121', fullName: 'Hồ Kim Ngân', dateOfBirth: '2023-06-05', grade: 'Nhà trẻ', gender: 'FEMALE' },
  { studentCode: 'HS122', fullName: 'Đoàn Hoàng Bách', dateOfBirth: '2023-04-14', grade: 'Nhà trẻ', gender: 'MALE' },
  { studentCode: 'HS123', fullName: 'Tạ Minh Vy', dateOfBirth: '2023-02-21', grade: 'Nhà trẻ', gender: 'FEMALE' },
  { studentCode: 'HS124', fullName: 'Phùng Hải Đăng', dateOfBirth: '2023-05-27', grade: 'Nhà trẻ', gender: 'MALE' },
  { studentCode: 'HS125', fullName: 'Lưu Cẩm Tú', dateOfBirth: '2023-03-03', grade: 'Nhà trẻ', gender: 'FEMALE' },
  { studentCode: 'HS126', fullName: 'Trịnh Khải Phong', dateOfBirth: '2023-01-26', grade: 'Nhà trẻ', gender: 'MALE' },
  { studentCode: 'HS127', fullName: 'Lê Thùy Dương', dateOfBirth: '2023-06-18', grade: 'Nhà trẻ', gender: 'FEMALE' },
  { studentCode: 'HS128', fullName: 'Nguyễn Tấn Đạt', dateOfBirth: '2023-04-09', grade: 'Nhà trẻ', gender: 'MALE' },
  { studentCode: 'HS129', fullName: 'Hoàng Lan Hương', dateOfBirth: '2023-02-16', grade: 'Nhà trẻ', gender: 'FEMALE' },
  { studentCode: 'HS130', fullName: 'Trần Gia Hưng', dateOfBirth: '2023-05-11', grade: 'Nhà trẻ', gender: 'MALE' },
  { studentCode: 'HS131', fullName: 'Võ Quỳnh Chi', dateOfBirth: '2023-03-24', grade: 'Nhà trẻ', gender: 'FEMALE' },
  { studentCode: 'HS132', fullName: 'Phạm Đức Anh', dateOfBirth: '2023-01-31', grade: 'Nhà trẻ', gender: 'MALE' },
];

export function StudentImportDrawer({ isOpen, onClose, currentClass, onSuccess }) {
  const { t } = useTranslation();

  const [selectedFileName, setSelectedFileName] = useState('danh_sach_tuyen_sinh_2026.xlsx');
  const [fileSize, setFileSize] = useState('18.4 KB');
  const [isUploading, setIsUploading] = useState(false);
  const [previewStudents, setPreviewStudents] = useState(DEFAULT_PREVIEW_STUDENTS);

  // Column mapping states matching Figma 4993:18232
  const [mapping, setMapping] = useState({
    code: 'colA',
    name: 'colB',
    dob: 'colC',
    gender: 'colD',
    grade: 'colE',
  });

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFileName(file.name);
      setFileSize(`${(file.size / 1024).toFixed(1)} KB`);
      toast.success(`Đã tải lên tệp tin: ${file.name}`);
    }
  };

  const handleImport = async () => {
    if (!currentClass?.id) return;
    setIsUploading(true);
    try {
      await classesApi.importStudents(currentClass.id, {
        students: previewStudents,
        autoAllocate: false,
      });
      toast.success(
        t(
          'classes.importSuccess',
          `Đã import thành công ${previewStudents.length} học sinh vào hệ thống!`,
        ),
      );
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Import failed:', err);
      toast.error(
        err.response?.data?.message || err.message || t('classes.importError', 'Không thể import học sinh vào hệ thống!'),
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-[1px] animate-in fade-in-0 duration-200"
      onClick={onClose}
      data-node-id="4993:18232"
      data-name="FE-05B · Class Settings · Student Allocation · Import Drawer"
    >
      <div
        className="w-full max-w-[500px] sm:w-[500px] h-full bg-card border-l border-border shadow-2xl flex flex-col justify-between text-foreground select-none overflow-hidden animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="p-5 border-b border-border flex items-start justify-between shrink-0 bg-muted/20">
          <div className="flex flex-col gap-1">
            <h2 className="text-[16px] font-semibold text-foreground tracking-tight">
              {t('classes.importDrawerTitle', 'Nhập học sinh từ file')}
            </h2>
            <p className="text-[12px] text-muted-foreground font-normal">
              {t(
                'classes.importDrawerSubtitle',
                'Nhập danh sách học sinh từ file Excel hoặc CSV vào pool tuyển sinh',
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer rounded-none -mr-1"
            title={t('common.close', 'Đóng')}
          >
            <HugeiconsIcon icon={Cancel01Icon} size={18} />
          </button>
        </div>

        {/* Drawer Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* 1. Drag & Drop Upload Zone */}
          <div className="border border-dashed border-border bg-muted/20 p-6 flex flex-col items-center justify-center text-center gap-3 relative rounded-none hover:border-primary/50 transition-colors">
            <input
              type="file"
              id="student-import-file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="flex flex-col gap-0.5">
              <span className="text-[13.5px] font-medium text-foreground">
                {t('classes.dragDropText', 'Kéo thả hoặc chọn file danh sách học sinh')}
              </span>
              <span className="text-[12px] text-muted-foreground font-normal">
                {t('classes.supportedFormats', 'Hỗ trợ định dạng .xlsx, .xls, .csv')}
              </span>
            </div>
            <label
              htmlFor="student-import-file"
              className="inline-flex items-center justify-center h-8 px-4 rounded-none bg-[#1447e6] hover:bg-[#123ec4] text-white text-[12.5px] font-medium cursor-pointer transition-colors shadow-none"
            >
              {t('classes.chooseFileBtn', 'Chọn file từ máy tính')}
            </label>

            {selectedFileName && (
              <div className="mt-1 flex items-center gap-2 px-2.5 py-1 bg-background border border-border text-[12px] text-foreground">
                <HugeiconsIcon icon={FileAttachmentIcon} size={14} className="text-[#1447e6]" />
                <span className="font-medium truncate max-w-[240px]">{selectedFileName}</span>
                <span className="text-muted-foreground font-normal">({fileSize})</span>
              </div>
            )}
          </div>

          {/* 2. Map dữ liệu */}
          <div className="space-y-3">
            <h3 className="text-[13.5px] font-semibold text-foreground">
              {t('classes.mapDataTitle', 'Map dữ liệu')}
            </h3>

            <div className="space-y-2 text-[13px]">
              {/* Field: Mã học sinh */}
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground min-w-[100px]">
                  {t('classes.mapCode', 'Mã học sinh')}
                </span>
                <select
                  value={mapping.code}
                  onChange={(e) => setMapping((m) => ({ ...m, code: e.target.value }))}
                  className="flex-1 h-8 px-2.5 bg-background border border-border rounded-none text-[12.5px] text-foreground outline-none focus:border-primary cursor-pointer"
                >
                  <option value="colA">Cột A - Mã</option>
                  <option value="colB">Cột B - Họ tên</option>
                  <option value="none">Không map</option>
                </select>
              </div>

              {/* Field: Họ tên */}
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground min-w-[100px]">
                  {t('classes.mapFullName', 'Họ tên')}
                </span>
                <select
                  value={mapping.name}
                  onChange={(e) => setMapping((m) => ({ ...m, name: e.target.value }))}
                  className="flex-1 h-8 px-2.5 bg-background border border-border rounded-none text-[12.5px] text-foreground outline-none focus:border-primary cursor-pointer"
                >
                  <option value="colB">Cột B - Họ tên</option>
                  <option value="colA">Cột A - Mã</option>
                  <option value="colC">Cột C - Ngày sinh</option>
                </select>
              </div>

              {/* Field: Ngày sinh */}
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground min-w-[100px]">
                  {t('classes.mapDob', 'Ngày sinh')}
                </span>
                <select
                  value={mapping.dob}
                  onChange={(e) => setMapping((m) => ({ ...m, dob: e.target.value }))}
                  className="flex-1 h-8 px-2.5 bg-background border border-border rounded-none text-[12.5px] text-foreground outline-none focus:border-primary cursor-pointer"
                >
                  <option value="colC">Cột C - Ngày sinh</option>
                  <option value="colD">Cột D - Giới tính</option>
                </select>
              </div>

              {/* Field: Giới tính */}
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground min-w-[100px]">
                  {t('classes.mapGender', 'Giới tính')}
                </span>
                <select
                  value={mapping.gender}
                  onChange={(e) => setMapping((m) => ({ ...m, gender: e.target.value }))}
                  className="flex-1 h-8 px-2.5 bg-background border border-border rounded-none text-[12.5px] text-foreground outline-none focus:border-primary cursor-pointer"
                >
                  <option value="colD">Cột D - Giới tính</option>
                  <option value="colE">Cột E - Khối</option>
                </select>
              </div>

              {/* Field: Khối */}
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground min-w-[100px]">
                  {t('classes.mapGrade', 'Khối')}
                </span>
                <select
                  value={mapping.grade}
                  onChange={(e) => setMapping((m) => ({ ...m, grade: e.target.value }))}
                  className="flex-1 h-8 px-2.5 bg-background border border-border rounded-none text-[12.5px] text-foreground outline-none focus:border-primary cursor-pointer"
                >
                  <option value="colE">Cột E - Khối</option>
                  <option value="none">Tự động theo ngày sinh</option>
                </select>
              </div>
            </div>
          </div>

          {/* 3. Xem trước (Preview) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-[13.5px] font-semibold text-foreground">
                {t('classes.previewTitle', 'Xem trước')}
              </h3>
              <span className="text-[12px] text-muted-foreground font-normal">
                {previewStudents.length} {t('classes.studentsUnit', 'học sinh')}
              </span>
            </div>

            {/* Preview Table Container */}
            <div className="border border-border bg-card rounded-none overflow-hidden max-h-[260px] overflow-y-auto">
              <table className="w-full text-left text-[12.5px] border-collapse">
                <thead className="bg-[#f9fafb] dark:bg-muted/40 border-b border-border sticky top-0 z-10 text-[11.5px] uppercase font-semibold text-muted-foreground tracking-wider">
                  <tr>
                    <th className="py-2 px-3">Mã</th>
                    <th className="py-2 px-3">Họ tên</th>
                    <th className="py-2 px-3">Ngày sinh</th>
                    <th className="py-2 px-3">Khối</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {previewStudents.map((st) => (
                    <tr key={st.studentCode} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2 px-3 text-muted-foreground font-mono text-[11.5px]">
                        {st.studentCode}
                      </td>
                      <td className="py-2 px-3 text-foreground font-medium truncate max-w-[130px]">
                        {st.fullName}
                      </td>
                      <td className="py-2 px-3 text-muted-foreground">
                        {st.dateOfBirth.split('-').reverse().join('/')}
                      </td>
                      <td className="py-2 px-3 text-muted-foreground">
                        {st.grade}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Drawer Sticky Footer */}
        <div className="border-t border-border px-5 py-3.5 bg-muted/20 flex items-center justify-end gap-2.5 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="h-8 px-4 rounded-none border border-border text-[13px] font-normal cursor-pointer shadow-none"
          >
            {t('common.cancel', 'Huỷ')}
          </Button>

          <Button
            type="button"
            onClick={handleImport}
            disabled={isUploading}
            className="h-8 px-4 rounded-none bg-[#1447e6] hover:bg-[#123ec4] text-white text-[13px] font-medium cursor-pointer shadow-none disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <span>{t('classes.importing', 'Đang import...')}</span>
            ) : (
              <span>
                {t(
                  'classes.confirmImportBtn',
                  `Import ${previewStudents.length} học sinh`,
                )}
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
