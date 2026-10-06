import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { HugeiconsIcon } from '@hugeicons/react';
import { Search01Icon, Cancel01Icon, MoreHorizontalIcon } from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/shared/lib/utils';
import { healthApi } from '../health.api';

// Auto calculate BMI = weight (kg) / [height (m)]^2
const calculateBmi = (heightCm, weightKg) => {
  const h = parseFloat(heightCm);
  const w = parseFloat(weightKg);
  if (!h || !w || h <= 0) return '';
  const hMeters = h / 100;
  return (w / (hMeters * hMeters)).toFixed(1);
};

export function HealthMeasurementPanel({
  classId,
  date,
  slot,
  initialStudents = [],
  isRecorded = false,
  onClose,
  onSaveSuccess,
  onCleanSuccess,
  onTabChange,
  className,
  hideHeader = false,
}) {
  const { t, i18n } = useTranslation();
  const isVi = (i18n.language || 'vi').startsWith('vi');
  const [students, setStudents] = useState([]);
  const [initialSnapshot, setInitialSnapshot] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase().trim();
    return students.filter(
      (s) =>
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.code && s.code.toLowerCase().includes(q))
    );
  }, [students, searchQuery]);

  useEffect(() => {
    if (initialStudents && initialStudents.length > 0) {
      const mapped = initialStudents.map((s) => ({
        ...s,
        height: s.height || '',
        weight: s.weight || '',
        bmi: s.bmi || calculateBmi(s.height, s.weight),
        note: s.note || (s.code === 'HS005' ? 'Theo dõi' : ''),
      }));
      setStudents(mapped);
      setInitialSnapshot(
        JSON.stringify(
          mapped.map((s) => ({
            id: s.id,
            height: s.height || '',
            weight: s.weight || '',
            note: s.note || '',
          }))
        )
      );
    }
  }, [initialStudents]);

  // Kiểm tra xem giáo viên có chỉnh sửa số đo sức khỏe hay không
  const isDirty = useMemo(() => {
    if (!initialSnapshot || students.length === 0) return false;
    const current = JSON.stringify(
      students.map((s) => ({
        id: s.id,
        height: s.height || '',
        weight: s.weight || '',
        note: s.note || '',
      }))
    );
    return current !== initialSnapshot;
  }, [students, initialSnapshot]);

  // Số lượng học sinh đã có số đo sức khỏe
  const measuredCount = useMemo(() => {
    return students.filter(
      (s) =>
        (s.height !== '' && s.height !== null && s.height !== undefined && parseFloat(s.height) > 0) ||
        (s.weight !== '' && s.weight !== null && s.weight !== undefined && parseFloat(s.weight) > 0)
    ).length;
  }, [students]);

  const handleFieldChange = (id, field, value) => {
    setStudents((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const updated = { ...s, [field]: value };
        if (field === 'height' || field === 'weight') {
          updated.bmi = calculateBmi(
            field === 'height' ? value : s.height,
            field === 'weight' ? value : s.weight
          );
        }
        return updated;
      })
    );
  };

  const handleSave = async () => {
    if (!isDirty) return;
    setIsSaving(true);
    try {
      const targetClassId = classId || '5';
      await healthApi.saveHealthRecords(targetClassId, {
        date,
        slotId: slot?.id,
        records: students.map((s) => ({
          studentId: s.id,
          height: parseFloat(s.height) || 0,
          weight: parseFloat(s.weight) || 0,
          bmi: parseFloat(s.bmi) || 0,
          note: s.note || '',
        })),
      });
      toast.success(t('health.saveSuccess', 'Lưu số đo sức khoẻ thành công!'));
      setInitialSnapshot(
        JSON.stringify(
          students.map((s) => ({
            id: s.id,
            height: s.height || '',
            weight: s.weight || '',
            note: s.note || '',
          }))
        )
      );
      if (onSaveSuccess) onSaveSuccess(students);
    } catch {
      toast.error(t('health.saveError', 'Không thể lưu số đo sức khoẻ.'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleClean = async () => {
    if (!isRecorded) {
      toast.warning(isVi ? 'Ngày này chưa có dữ liệu sức khỏe để xóa.' : 'No health records to clean.');
      return;
    }
    if (!window.confirm(isVi ? 'Bạn có chắc chắn muốn xóa tất cả số đo sức khỏe không? Thao tác này không thể hoàn tác.' : 'Are you sure you want to clean all health records? This cannot be undone.')) {
      return;
    }
    setIsCleaning(true);
    try {
      const targetClassId = classId || '5';
      await healthApi.clearHealthRecords(targetClassId, { date });

      const resetStudents = students.map((s) => ({
        ...s,
        height: '',
        weight: '',
        bmi: '',
        note: '',
      }));
      setStudents(resetStudents);
      setInitialSnapshot(
        JSON.stringify(
          resetStudents.map((s) => ({
            id: s.id,
            height: '',
            weight: '',
            note: '',
          }))
        )
      );
      toast.success(isVi ? 'Đã xóa tất cả dữ liệu sức khoẻ' : 'Health records cleaned successfully');
      if (onCleanSuccess) {
        onCleanSuccess(resetStudents);
      } else if (onSaveSuccess) {
        onSaveSuccess(resetStudents);
      }
      if (onClose) onClose();
    } catch {
      toast.error(isVi ? 'Không thể xóa dữ liệu sức khoẻ' : 'Failed to clean health records');
    } finally {
      setIsCleaning(false);
    }
  };

  const slotTitle = slot?.title || slot?.shortTitle || 'Ngoài trời';
  const slotTime = `${slot?.startTime || '09:30'} – ${slot?.endTime || '10:15'}`;

  return (
    <div
      className={cn(
        hideHeader
          ? 'flex-1 flex flex-col justify-between min-h-0'
          : 'w-[480px] border-l border-border bg-card flex flex-col justify-between shrink-0 select-none z-10',
        className
      )}
      data-node-id="4937:12545"
      data-name="HealthMeasurementPanel"
    >
      {/* 1. Header (only when not embedded in Drawer) */}
      {!hideHeader && (
        <div className="p-4 border-b border-border bg-card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[17px] font-semibold text-foreground tracking-tight">
                {t('health.measurementPanelTitle', 'Đo sức khoẻ học sinh')}
              </h2>
              <p className="text-[12.5px] text-muted-foreground mt-0.5">
                {slotTitle} · {slotTime} · Nhà trẻ 1
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="size-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-none transition-colors cursor-pointer shrink-0"
                    title="Tùy chọn khác"
                  >
                    <HugeiconsIcon icon={MoreHorizontalIcon} size={16} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 rounded-none shadow-md">
                  <DropdownMenuItem
                    disabled={!isRecorded || isCleaning}
                    onClick={handleClean}
                    className="cursor-pointer text-[12.5px] py-2 px-3 text-foreground rounded-none disabled:opacity-35 disabled:cursor-not-allowed"
                  >
                    <span>{isVi ? 'Xoá toàn bộ số đo sức khỏe' : 'Delete health records'}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="size-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-none transition-colors cursor-pointer shrink-0"
                  title={t('common.close', 'Đóng (Esc)')}
                >
                  <HugeiconsIcon icon={Cancel01Icon} size={16} />
                </button>
              )}
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-border/60 flex items-center justify-between text-[12px]">
            <span className="text-muted-foreground">
              {t('attendance.studentCount', { count: students.length })} · BMI
            </span>
          </div>
        </div>
      )}

      {/* 2. Students Measurement Table */}
      <div className="flex-1 overflow-y-auto overflow-x-auto px-6 py-4">
        {/* Phụ đề & Tìm kiếm mini ở phía trên */}
        <div className="flex items-center justify-between gap-3 text-[12px] text-muted-foreground select-none pb-2.5 mb-2.5 border-b border-border/60">
          <span className="font-medium text-foreground text-[12px]">
            {isVi ? 'Đo thể chất & BMI' : 'Physical Growth & BMI'}
          </span>

          {/* Ô tìm kiếm học sinh mini chuẩn Sorak */}
          <div className="relative w-[180px] sm:w-[200px] h-8 shrink-0">
            <HugeiconsIcon
              icon={Search01Icon}
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isVi ? 'Tìm học sinh...' : 'Search student...'}
              className="h-8 pl-8 pr-7 text-[12px] bg-background border-border rounded-none shadow-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                title={isVi ? 'Xóa tìm kiếm' : 'Clear search'}
              >
                <HugeiconsIcon icon={Cancel01Icon} size={12} />
              </button>
            )}
          </div>
        </div>

        <table className="w-full text-[12.5px] border-collapse min-w-[500px]">
          <thead>
            <tr className="border-b border-border/60 text-muted-foreground text-[11.5px] whitespace-nowrap">
              <th className="text-left font-medium pb-2 whitespace-nowrap min-w-[140px]">{t('attendance.studentCol', 'Học sinh')}</th>
              <th className="w-[115px] text-center font-medium pb-2 whitespace-nowrap px-1">{t('health.height', 'Chiều cao (cm)')}</th>
              <th className="w-[115px] text-center font-medium pb-2 whitespace-nowrap px-1">{t('health.weight', 'Cân nặng (kg)')}</th>
              <th className="w-[70px] text-center font-medium pb-2 whitespace-nowrap px-1">BMI</th>
              <th className="min-w-[120px] text-left font-medium pb-2 pl-2 whitespace-nowrap">{t('health.notes', 'Ghi chú y tế')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {filteredStudents.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-[12px] text-muted-foreground">
                  {isVi ? 'Không tìm thấy học sinh phù hợp' : 'No matching student found'}
                </td>
              </tr>
            ) : (
              filteredStudents.map((st) => (
                <tr key={st.id} className="h-12 hover:bg-muted/30 transition-colors">
                  {/* Student Info */}
                  <td className="py-1.5 pr-2 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <img
                        src={`https://api.dicebear.com/10.x/critters/svg?seed=${encodeURIComponent(st.code)}&backgroundColor=ff2e63,00c2a8,ffb300,3d5afe,8e24aa,00e676`}
                        alt={st.name}
                        className="size-7 rounded-none border border-border/80 object-cover shrink-0"
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium text-foreground text-[12px] truncate max-w-[150px]">
                          {st.name}
                        </span>
                        <span className="text-[10.5px] text-muted-foreground font-mono">
                          {st.code}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Cao (cm) */}
                  <td className="w-[115px] text-center py-1 px-1 whitespace-nowrap">
                    <input
                      type="number"
                      value={st.height}
                      onChange={(e) => handleFieldChange(st.id, 'height', e.target.value)}
                      placeholder="cm"
                      className="w-16 h-7 px-1 text-center text-[12px] border border-border bg-background text-foreground rounded-none focus:outline-hidden focus:border-[#1447e6]"
                    />
                  </td>

                  {/* Nặng (kg) */}
                  <td className="w-[115px] text-center py-1 px-1 whitespace-nowrap">
                    <input
                      type="number"
                      step="0.1"
                      value={st.weight}
                      onChange={(e) => handleFieldChange(st.id, 'weight', e.target.value)}
                      placeholder="kg"
                      className="w-16 h-7 px-1 text-center text-[12px] border border-border bg-background text-foreground rounded-none focus:outline-hidden focus:border-[#1447e6]"
                    />
                  </td>

                  {/* Auto Calculated BMI */}
                  <td className="w-[70px] text-center py-1 px-1 font-mono text-[12px] text-muted-foreground whitespace-nowrap">
                    {st.bmi || '—'}
                  </td>

                  {/* Ghi chú */}
                  <td className="min-w-[120px] py-1 pl-2">
                    <input
                      type="text"
                      value={st.note}
                      onChange={(e) => handleFieldChange(st.id, 'note', e.target.value)}
                      placeholder={t('health.notes', 'Ghi chú y tế')}
                      className="w-full h-7 px-2 text-[11.5px] border border-border bg-background text-foreground rounded-none focus:outline-hidden focus:border-[#1447e6]"
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 3. Sticky Bottom Actions */}
      <div className="p-4 border-t border-border bg-card flex items-center justify-between gap-2.5 shrink-0">
        <div className="flex items-center gap-3">
          {measuredCount > 0 ? (
            <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-emerald-600 dark:text-emerald-400 select-none">
              <span className="size-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span>
                {isVi
                  ? `Đã ghi nhận sức khỏe (${measuredCount}/${students.length})`
                  : `Health recorded (${measuredCount}/${students.length})`}
              </span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground select-none">
              <span className="size-1.5 rounded-full bg-muted-foreground/60 shrink-0" />
              <span>
                {isVi
                  ? `Chưa ghi nhận sức khỏe (0/${students.length})`
                  : `Health not recorded (0/${students.length})`}
              </span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="rounded-none h-9 text-[13px] px-4 cursor-pointer"
          >
            {t('common.cancel', 'Huỷ')}
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={!isDirty || isSaving || isCleaning}
            className={cn(
              'rounded-none h-9 text-[13px] px-5 font-medium transition-colors shadow-none',
              isDirty && !isSaving && !isCleaning
                ? 'bg-[#1447e6] hover:bg-[#123ec4] text-white cursor-pointer'
                : 'bg-muted/80 text-muted-foreground border border-border/80 cursor-not-allowed opacity-60'
            )}
            title={!isDirty ? 'Chưa có thay đổi nào để lưu' : undefined}
          >
            {isSaving ? t('common.saving', 'Đang lưu...') : t('health.saveHealth', 'Lưu sức khoẻ')}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default HealthMeasurementPanel;
