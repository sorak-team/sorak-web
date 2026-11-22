import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Download01Icon,
  TaskDone01Icon,
  MedicalFileIcon,
  UserGroupIcon,
} from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { downloadBlob } from '@/shared/utils/download';
import { classesApi } from '../classes.api';
import { attendanceApi } from '@/features/attendance/attendance.api';
import { healthApi } from '@/features/health/health.api';

export function ClassExportRoster({ currentClass }) {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExportingRoster, setIsExportingRoster] = useState(false);
  const [isExportingAttendance, setIsExportingAttendance] = useState(false);
  const [isExportingHealth, setIsExportingHealth] = useState(false);

  const loadData = useCallback(async () => {
    if (!currentClass?.id) return;
    try {
      setIsLoading(true);
      const res = await classesApi.getClassExportData(currentClass.id);
      setData(res);
    } catch (err) {
      console.error('Error fetching class export data:', err);
      toast.error('Không thể tải dữ liệu lớp học.');
    } finally {
      setIsLoading(false);
    }
  }, [currentClass?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 1. Xuất Sổ danh sách học sinh của lớp
  const handleExportRoster = async () => {
    if (!currentClass?.id) return;
    try {
      setIsExportingRoster(true);
      const cleanClassName = (data?.classInfo?.name || currentClass.name || 'Class').replace(/\s+/g, '_');
      const cleanYear = (data?.classInfo?.academicYear || '2026-2027').replace(/[\s–—]/g, '-');
      const fileName = `Danh_Sach_Lop_${cleanClassName}_${cleanYear}.xlsx`;

      const blob = await classesApi.exportClassRosterExcel(currentClass.id);
      downloadBlob(blob, fileName);
      toast.success(`Đã xuất danh sách lớp ${currentClass.name} thành công.`);
    } catch (err) {
      console.error('Export roster failed:', err);
      toast.error('Có lỗi xảy ra khi xuất danh sách lớp.');
    } finally {
      setIsExportingRoster(false);
    }
  };

  // 2. Xuất Sổ điểm danh chuyên cần trọn năm học (Mỗi tháng 1 sheet + Bảng tổng hợp cả năm)
  const handleExportAttendance = async () => {
    if (!currentClass?.id) return;
    try {
      setIsExportingAttendance(true);
      const blob = await attendanceApi.exportAttendanceExcel(currentClass.id, {
        isFullYear: true,
      });
      const className = currentClass?.name || `Lop_${currentClass.id}`;
      const safeName = className.replace(/\s+/g, '_');
      const cleanYear = (data?.classInfo?.academicYear || '2026-2027').replace(/[\s–—]/g, '-');
      downloadBlob(blob, `So_Theo_Doi_Chuyen_Can_Ca_Nam_${safeName}_${cleanYear}.xlsx`);
      toast.success('Đã xuất sổ theo dõi chuyên cần trọn năm học thành công.');
    } catch (err) {
      console.error('Export attendance failed:', err);
      toast.error('Không thể xuất sổ điểm danh. Vui lòng thử lại sau.');
    } finally {
      setIsExportingAttendance(false);
    }
  };

  // 3. Xuất Sổ theo dõi sức khỏe trẻ em
  const handleExportHealth = async () => {
    if (!currentClass?.id) return;
    try {
      setIsExportingHealth(true);
      const blob = await healthApi.exportHealthExcel(currentClass.id);
      const className = currentClass?.name || `Lop_${currentClass.id}`;
      const safeName = className.replace(/\s+/g, '_');
      downloadBlob(blob, `So_Theo_Doi_Suc_Khoe_${safeName}.xlsx`);
      toast.success('Đã xuất sổ theo dõi sức khỏe thành công.');
    } catch (err) {
      console.error('Export health failed:', err);
      toast.error('Không thể xuất sổ theo dõi sức khỏe. Vui lòng thử lại sau.');
    } finally {
      setIsExportingHealth(false);
    }
  };

  const studentCount = data?.students?.length || 0;
  const teacherCount = data?.teachers?.length || 0;

  return (
    <>
      {/* Page Header */}
      <div className="flex flex-col gap-1 pb-4 border-b border-border/60 shrink-0">
        <h1 className="text-[22px] font-semibold text-foreground tracking-tight">
          {t('classes.exportTitle', 'Xuất danh sách')}
        </h1>
        <p className="text-[12.5px] text-muted-foreground font-normal">
          {t('classes.exportSubtitleUnified', 'Tải xuống các sổ bộ chính thức của lớp: Danh sách học sinh, Sổ điểm danh chuyên cần và Sổ theo dõi sức khỏe')}
        </p>
      </div>

      {/* Unified Document Table/List */}
      <div className="bg-card border border-border rounded-none divide-y divide-border/60 max-w-[1050px]">
        {/* Row 1: Danh sách học sinh của lớp */}
        <div className="p-4 sm:px-5 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 hover:bg-muted/20 transition-colors">
          <div className="flex items-start gap-3 min-w-0">
            <div className="size-8 rounded-none bg-muted/40 border border-border/60 flex items-center justify-center text-muted-foreground shrink-0 mt-0.5">
              <HugeiconsIcon icon={UserGroupIcon} size={16} />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[13.5px] font-medium text-foreground">
                  {t('classes.rosterTitle', 'Danh sách học sinh')}
                </span>
                <span className="text-[11.5px] text-muted-foreground">
                  {t('classes.rosterCounts', '({{studentCount}} học sinh · {{teacherCount}} giáo viên)', { studentCount, teacherCount })}
                </span>
              </div>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                {t('classes.rosterDesc', 'Hồ sơ học sinh đầy đủ kèm thông tin 2 phụ huynh, liên lạc khẩn cấp, địa chỉ và lưu ý sức khỏe (chuẩn Bộ GD&ĐT).')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center pl-11 sm:pl-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleExportRoster}
              disabled={isExportingRoster || isLoading}
              className="h-8 px-3 rounded-none border-border bg-background hover:bg-muted/60 text-foreground text-[12px] font-normal cursor-pointer shadow-none flex items-center gap-1.5"
            >
              <HugeiconsIcon icon={Download01Icon} size={14} className="text-muted-foreground" />
              <span>{isExportingRoster ? t('classes.exportingFile', 'Đang xuất tệp...') : t('classes.exportExcelBtn', 'Xuất tệp Excel')}</span>
            </Button>
          </div>
        </div>

        {/* Row 2: Sổ Điểm danh chuyên cần */}
        <div className="p-4 sm:px-5 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 hover:bg-muted/20 transition-colors">
          <div className="flex items-start gap-3 min-w-0">
            <div className="size-8 rounded-none bg-muted/40 border border-border/60 flex items-center justify-center text-muted-foreground shrink-0 mt-0.5">
              <HugeiconsIcon icon={TaskDone01Icon} size={16} />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[13.5px] font-medium text-foreground">
                {t('classes.attendanceBookTitle', 'Sổ điểm danh chuyên cần')}
              </span>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                {t('classes.attendanceBookDesc', 'Sổ theo dõi chuyên cần trọn năm học (Tháng 9–Tháng 5), mỗi tháng một trang bảng tính chi tiết kèm bảng tổng hợp cả năm.')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center pl-11 sm:pl-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleExportAttendance}
              disabled={isExportingAttendance}
              className="h-8 px-3 rounded-none border-border bg-background hover:bg-muted/60 text-foreground text-[12px] font-normal cursor-pointer shadow-none flex items-center gap-1.5"
            >
              <HugeiconsIcon icon={Download01Icon} size={14} className="text-muted-foreground" />
              <span>{isExportingAttendance ? t('classes.exportingFile', 'Đang xuất tệp...') : t('classes.exportExcelBtn', 'Xuất tệp Excel')}</span>
            </Button>
          </div>
        </div>

        {/* Row 3: Sổ Theo dõi sức khỏe trẻ em */}
        <div className="p-4 sm:px-5 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 hover:bg-muted/20 transition-colors">
          <div className="flex items-start gap-3 min-w-0">
            <div className="size-8 rounded-none bg-muted/40 border border-border/60 flex items-center justify-center text-muted-foreground shrink-0 mt-0.5">
              <HugeiconsIcon icon={MedicalFileIcon} size={16} />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[13.5px] font-medium text-foreground">
                {t('classes.healthBookTitle', 'Sổ theo dõi sức khỏe')}
              </span>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                {t('classes.healthBookDesc', 'Kết quả cân đo thể lực định kỳ (Chiều cao, Cân nặng, BMI), tình trạng dị ứng và phân loại chuẩn tăng trưởng WHO.')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center pl-11 sm:pl-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleExportHealth}
              disabled={isExportingHealth}
              className="h-8 px-3 rounded-none border-border bg-background hover:bg-muted/60 text-foreground text-[12px] font-normal cursor-pointer shadow-none flex items-center gap-1.5"
            >
              <HugeiconsIcon icon={Download01Icon} size={14} className="text-muted-foreground" />
              <span>{isExportingHealth ? t('classes.exportingFile', 'Đang xuất tệp...') : t('classes.exportExcelBtn', 'Xuất tệp Excel')}</span>
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

export default ClassExportRoster;
