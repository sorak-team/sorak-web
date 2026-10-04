import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Download01Icon,
  FileSpreadsheetIcon,
  CheckmarkCircle01Icon,
} from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { classesApi } from '../classes.api';

export function ClassExportRoster({ currentClass }) {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Export fields configuration
  const [fields, setFields] = useState({
    studentBasic: true,
    health: true,
    parents: true,
    teachers: true,
    summary: true,
  });

  const loadData = useCallback(async () => {
    if (!currentClass?.id) return;
    try {
      setIsLoading(true);
      const res = await classesApi.getClassExportData(currentClass.id);
      setData(res);
    } catch (err) {
      console.error('Error fetching class export data:', err);
      toast.error(t('classes.loadExportDataError', 'Không thể tải dữ liệu xuất danh sách của lớp.'));
    } finally {
      setIsLoading(false);
    }
  }, [currentClass?.id, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleField = (key) => {
    setFields((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Build Excel CSV content with UTF-8 BOM, parents at the end
  const generateCsvContent = () => {
    if (!data) return '';
    const BOM = '\uFEFF';
    const lines = [];

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    // Header info
    lines.push(`DANH SÁCH LỚP HỌC - TRƯỜNG MẦM NON HÒN TRE`);
    lines.push(`Lớp: ${data.classInfo?.name || ''} - Khối: ${data.classInfo?.gradeLabel || ''}`);
    lines.push(`Năm học: ${data.classInfo?.academicYear || ''} - Phòng: ${data.classInfo?.roomNumber || 'Chưa xếp'}`);
    lines.push(`Ngày xuất dữ liệu: ${new Date().toLocaleDateString('vi-VN')}`);
    lines.push('');

    // Teacher section if enabled
    if (fields.teachers && data.teachers?.length > 0) {
      lines.push('DANH SÁCH GIÁO VIÊN PHỤ TRÁCH LỚP');
      lines.push(['STT', 'Mã cán bộ', 'Họ và tên', 'Vai trò', 'Chức danh', 'Số điện thoại', 'Email'].map(escapeCsv).join(','));
      data.teachers.forEach((tc, idx) => {
        lines.push([
          idx + 1,
          tc.employeeCode || '',
          tc.fullName || '',
          tc.role || '',
          tc.position || '',
          tc.phone || '',
          tc.email || '',
        ].map(escapeCsv).join(','));
      });
      lines.push('');
    }

    // Determine max number of parents across all students
    const maxParents = Math.max(
      1,
      ...(data.students || []).map((s) => {
        if (Array.isArray(s.parents) && s.parents.length > 0) return s.parents.length;
        return s.parentName ? 1 : 0;
      }),
    );

    // Student section
    lines.push('DANH SÁCH HỌC SINH');
    const studentHeaders = ['STT'];
    if (fields.studentBasic) {
      studentHeaders.push('Mã học sinh', 'Họ và tên', 'Ngày sinh', 'Giới tính', 'Dân tộc', 'Nơi sinh', 'Trạng thái');
    }
    if (fields.health) {
      studentHeaders.push('Dị ứng thực phẩm', 'Lưu ý sức khỏe');
    }
    // Parents at the last columns (Phụ huynh 1, Phụ huynh 2, Phụ huynh 3, ...)
    if (fields.parents) {
      for (let i = 1; i <= maxParents; i++) {
        studentHeaders.push(
          `Phụ huynh ${i} - Họ tên`,
          `Phụ huynh ${i} - Quan hệ`,
          `Phụ huynh ${i} - Số điện thoại`,
          `Phụ huynh ${i} - Quyền đón trẻ`,
        );
      }
    }
    lines.push(studentHeaders.map(escapeCsv).join(','));

    // Student rows
    (data.students || []).forEach((st, idx) => {
      const row = [idx + 1];
      if (fields.studentBasic) {
        row.push(st.studentCode, st.fullName, st.dateOfBirth, st.gender, st.ethnic, st.placeOfBirth, st.status);
      }
      if (fields.health) {
        row.push(st.allergyNotes, st.medicalNotes);
      }
      if (fields.parents) {
        const studentParents = Array.isArray(st.parents) && st.parents.length > 0
          ? st.parents
          : st.parentName
            ? [{
                fullName: st.parentName,
                relationship: st.parentRelationship,
                phone: st.parentPhone,
                canPickup: st.canPickup,
              }]
            : [];

        for (let i = 0; i < maxParents; i++) {
          const p = studentParents[i];
          if (p) {
            row.push(
              p.fullName || '',
              p.relationship || '',
              p.phone || '',
              p.canPickup === 'Có' || p.canPickup === true ? 'Có' : 'Không',
            );
          } else {
            row.push('', '', '', '');
          }
        }
      }
      lines.push(row.map(escapeCsv).join(','));
    });

    lines.push('');

    // Class summary stats if enabled
    if (fields.summary) {
      lines.push('THỐNG KÊ TỔNG HỢP');
      lines.push(`Tổng số học sinh: ${data.students?.length || 0}`);
      const maleCount = (data.students || []).filter((s) => s.gender === 'Nam').length;
      const femaleCount = (data.students || []).filter((s) => s.gender === 'Nữ').length;
      lines.push(`Nam: ${maleCount} - Nữ: ${femaleCount}`);
      lines.push(`Tổng số giáo viên: ${data.teachers?.length || 0}`);
    }

    return BOM + lines.join('\r\n');
  };

  const handleExport = () => {
    if (!data) return;

    try {
      setIsExporting(true);
      const csvString = generateCsvContent();
      const blob = new Blob([csvString], {
        type: 'text/csv;charset=utf-8;',
      });

      const cleanClassName = (data.classInfo?.name || 'Class').replace(/\s+/g, '_');
      const cleanYear = (data.classInfo?.academicYear || '2026-2027').replace(/[\s–—]/g, '-');
      const fileName = `Danh_sach_lop_${cleanClassName}_${cleanYear}.csv`;

      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(
        t('classes.exportSuccess', 'Đã tải xuống danh sách lớp {{name}} định dạng Excel thành công!', {
          name: data.classInfo?.name,
        }),
      );
    } catch (err) {
      console.error('Export failed:', err);
      toast.error(t('classes.exportFailed', 'Có lỗi xảy ra trong quá trình xuất danh sách.'));
    } finally {
      setIsExporting(false);
    }
  };

  const studentCount = data?.students?.length || 0;
  const teacherCount = data?.teachers?.length || 0;

  return (
    <>
      {/* Page Header matching Cấu hình lớp */}
      <div className="flex flex-col gap-1 pb-3 border-b border-border/60 shrink-0">
        <h1 className="text-[26px] font-semibold text-foreground tracking-tight">
          {t('classes.exportTitle', 'Xuất danh sách')}
        </h1>
        <p className="text-[12px] text-muted-foreground font-normal">
          {t(
            'classes.exportSubtitle',
            'Xuất và tải xuống danh sách học sinh, giáo viên phụ trách và hồ sơ lớp học',
          )}
        </p>
      </div>

      <div className="flex flex-col gap-6 max-w-[1050px]" data-name="ClassExportRoster">
        {/* Card 1: Nội dung dữ liệu cần xuất */}
        <div
          className="bg-card border border-border rounded-none shadow-xs overflow-hidden"
          data-name="Card · Dữ liệu xuất"
        >
          <div className="p-5 flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <h2 className="text-[15px] font-medium text-foreground">
                {t('classes.exportFieldsTitle', '1. Dữ liệu cần xuất')}
              </h2>
              <p className="text-[13px] text-muted-foreground">
                {t('classes.exportFieldsSubtitle', 'Tùy chọn các trường thông tin đưa vào tệp Excel.')}
              </p>
            </div>

            <div className="space-y-2 pt-1">
              {[
                {
                  key: 'studentBasic',
                  title: t('classes.fieldStudentBasic', 'Hồ sơ học sinh cơ bản'),
                  desc: 'Mã HS, Họ tên, Ngày sinh, Giới tính, Dân tộc, Nơi sinh, Trạng thái',
                },
                {
                  key: 'health',
                  title: t('classes.fieldHealth', 'Sức khỏe & Dị ứng ăn uống'),
                  desc: 'Tiền sử dị ứng thực phẩm/thuốc men, Lưu ý sức khỏe đặc biệt',
                },
                {
                  key: 'parents',
                  title: t('classes.fieldParents', 'Thông tin phụ huynh (Cột cuối)'),
                  desc: 'Xếp ở các cột cuối: Phụ huynh 1, Phụ huynh 2, Phụ huynh 3 (Họ tên, Mối quan hệ, SĐT, Quyền đón trẻ)',
                },
                {
                  key: 'teachers',
                  title: t('classes.fieldTeachers', 'Giáo viên phụ trách lớp'),
                  desc: 'Bảng riêng: Giáo viên chủ nhiệm & Giáo viên bảo mẫu, Mã cán bộ, SĐT, Email',
                },
                {
                  key: 'summary',
                  title: t('classes.fieldSummary', 'Thống kê tổng hợp lớp'),
                  desc: 'Tổng số học sinh, Tỷ lệ nam/nữ, Sĩ số lớp hiện tại',
                },
              ].map((f) => (
                <label
                  key={f.key}
                  className="flex items-center justify-between p-3 border border-border hover:bg-muted/20 rounded-none cursor-pointer transition-colors"
                >
                  <div className="flex flex-col">
                    <span className="text-[13px] font-medium text-foreground">
                      {f.title}
                    </span>
                    <span className="text-[12px] text-muted-foreground">
                      {f.desc}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={fields[f.key]}
                    onChange={() => toggleField(f.key)}
                    className="size-4 rounded-none accent-[#1447e6] cursor-pointer"
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="border-t border-border px-5 py-3 bg-muted/20 flex items-center justify-between">
            <span className="text-[12px] text-muted-foreground">
              Thông tin phụ huynh được tự động tách thành các cột riêng (Phụ huynh 1, Phụ huynh 2,...) và đặt ở cuối bảng.
            </span>
          </div>
        </div>

        {/* Card 2: Định dạng tệp Excel & Tải xuống */}
        <div
          className="bg-card border border-border rounded-none shadow-xs overflow-hidden"
          data-name="Card · Xuất Excel"
        >
          <div className="p-5 flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <h2 className="text-[15px] font-medium text-foreground">
                2. Định dạng tệp & Xuất dữ liệu
              </h2>
              <p className="text-[13px] text-muted-foreground">
                Tệp xuất dưới dạng bảng tính Excel tương thích toàn diện, mở trực tiếp hiển thị 100% tiếng Việt có dấu chuẩn xác.
              </p>
            </div>

            {/* Single Excel Format Card */}
            <div className="p-4 border border-[#1447e6] bg-[#1447e6]/5 rounded-none flex items-start gap-3">
              <div className="size-9 rounded-none bg-[#1447e6] text-white flex items-center justify-center shrink-0">
                <HugeiconsIcon icon={FileSpreadsheetIcon} size={20} />
              </div>
              <div className="flex flex-col flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[13.5px] font-semibold text-foreground">
                    Microsoft Excel (.csv UTF-8 with BOM)
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.2 bg-[#1447e6]/10 text-[#1447e6]">
                    <HugeiconsIcon icon={CheckmarkCircle01Icon} size={11} /> Định dạng chuẩn
                  </span>
                </div>
                <p className="text-[12px] text-muted-foreground mt-0.5 leading-relaxed">
                  Tương thích với Microsoft Excel 2016+, Office 365, Google Sheets và WPS Office. Không bị lỗi font Unicode tiếng Việt.
                </p>
              </div>
            </div>

            {/* Snippet stats */}
            <div className="p-3 bg-muted/20 border border-border flex items-center justify-between text-[12.5px] rounded-none">
              <span className="text-muted-foreground">
                Dữ liệu xuất: <strong className="text-foreground">{studentCount} học sinh</strong> · <strong className="text-foreground">{teacherCount} giáo viên</strong>
              </span>
              <span className="font-mono text-muted-foreground text-[11.5px]">
                UTF-8 BOM · Ready to download
              </span>
            </div>
          </div>

          <div className="border-t border-border px-5 py-3 bg-muted/20 flex items-center justify-between">
            <span className="text-[12px] text-muted-foreground">
              Nhấn nút để tải tệp trực tiếp về máy tính mà không cần bước xem trước.
            </span>

            <Button
              type="button"
              onClick={handleExport}
              disabled={isExporting || isLoading}
              className="h-8 px-5 rounded-none bg-[#1447e6] hover:bg-[#1447e6]/90 text-white text-[13px] font-medium cursor-pointer shadow-none flex items-center gap-1.5"
            >
              <HugeiconsIcon icon={Download01Icon} size={15} />
              <span>{isExporting ? t('classes.exporting', 'Đang xuất tệp...') : 'Xuất tệp Excel'}</span>
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
