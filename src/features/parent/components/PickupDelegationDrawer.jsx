import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { X, UploadCloud } from 'lucide-react';
import { toast } from 'sonner';
import { parentApi } from '../api/parent.api';
import { uploadApi } from '@/shared/api/upload.api';
import { Button } from '@/components/ui/button';
import { cn } from '@/shared/lib/utils';
import { PickupCalendarPicker } from '@/shared/components/calendar/PickupCalendarPicker';
import { useAcademicYearStore, getDayAfterDisplayDate } from '@/features/academic-years';

// Helper to convert DD/MM/YYYY to YYYY-MM-DD
function toIsoDateString(dmy) {
  if (!dmy) return '';
  const clean = String(dmy).trim();
  if (clean.includes('-')) return clean.split('T')[0];
  const parts = clean.split('/');
  if (parts.length === 3) {
    const [d, m, y] = parts;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return clean;
}

// Helper to convert YYYY-MM-DD to DD/MM/YYYY
function toDmyString(dateStr) {
  if (!dateStr) return '';
  const clean = String(dateStr).trim();
  if (clean.includes('/')) return clean;
  const iso = clean.split('T')[0];
  const parts = iso.split('-');
  if (parts.length === 3) {
    const [y, m, d] = parts;
    return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
  }
  return clean;
}

export function PickupDelegationDrawer({
  isOpen,
  onClose,
  onSuccess,
  studentName = 'bé',
}) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    pickup_person_name: '',
    pickup_person_phone: '',
    pickup_citizen_id: '',
    relationship: 'Ông/Bà',
    photo_url: '',
    note: '',
    start_date: '',
    end_date: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [absentWarning, setAbsentWarning] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [quotaInfo, setQuotaInfo] = useState(null);
  const [calendarValidation, setCalendarValidation] = useState({ hasConflict: false, errorMessage: null });

  // Lấy dữ liệu năm học thực tế từ useAcademicYearStore
  const academicYears = useAcademicYearStore((state) => state.academicYears);
  const selectedYearId = useAcademicYearStore((state) => state.selectedYearId);

  useEffect(() => {
    if (!academicYears || academicYears.length === 0) {
      useAcademicYearStore.getState().fetchAcademicYears();
    }
  }, [academicYears]);

  const currentAcademicYear = useMemo(() => {
    return (
      academicYears.find((y) => String(y.id) === String(selectedYearId)) ||
      academicYears.find((y) => y.active) ||
      academicYears[0]
    );
  }, [academicYears, selectedYearId]);

  // Bộ preset ngày thật của năm học: Học kỳ 1, Học kỳ 2, Cả năm (định dạng ISO YYYY-MM-DD)
  const datePresets = useMemo(() => {
    const sem1EndDmy = toDmyString(currentAcademicYear?.semester1EndDate) || '15/01/2027';
    const sem2StartDmy = getDayAfterDisplayDate(sem1EndDmy) || '16/01/2027';

    const hk1StartDmy = toDmyString(currentAcademicYear?.startDate) || '07/09/2026';
    const hk1EndDmy = sem1EndDmy;

    const hk2StartDmy = sem2StartDmy;
    const hk2EndDmy = toDmyString(currentAcademicYear?.endDate) || '28/05/2027';

    const fullYearStartDmy = hk1StartDmy;
    const fullYearEndDmy = hk2EndDmy;

    return {
      hk1: {
        id: 'HK1',
        label: t('parent.behavior.semester1', 'Học kỳ 1'),
        startIso: toIsoDateString(hk1StartDmy),
        endIso: toIsoDateString(hk1EndDmy),
        displayRange: `${hk1StartDmy} – ${hk1EndDmy}`,
      },
      hk2: {
        id: 'HK2',
        label: t('parent.behavior.semester2', 'Học kỳ 2'),
        startIso: toIsoDateString(hk2StartDmy),
        endIso: toIsoDateString(hk2EndDmy),
        displayRange: `${hk2StartDmy} – ${hk2EndDmy}`,
      },
      fullYear: {
        id: 'FULL_YEAR',
        label: t('common.fullYear', 'Cả năm'),
        startIso: toIsoDateString(fullYearStartDmy),
        endIso: toIsoDateString(fullYearEndDmy),
        displayRange: `${fullYearStartDmy} – ${fullYearEndDmy}`,
      },
    };
  }, [currentAcademicYear, t]);

  // Tự động nhận diện preset ngày đang được chọn (nếu khớp)
  const activeDatePreset = useMemo(() => {
    if (!formData.start_date || !formData.end_date) return null;
    const startIso = formData.start_date;
    const endIso = formData.end_date;
    const todayIso = new Date().toISOString().split('T')[0];

    const isMatch = (preset) => {
      const effectiveStart = preset.startIso < todayIso ? todayIso : preset.startIso;
      return (startIso === preset.startIso || startIso === effectiveStart) && endIso === preset.endIso;
    };

    if (isMatch(datePresets.hk1)) return 'HK1';
    if (isMatch(datePresets.hk2)) return 'HK2';
    if (isMatch(datePresets.fullYear)) return 'FULL_YEAR';
    return null;
  }, [formData.start_date, formData.end_date, datePresets]);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        pickup_person_name: '',
        pickup_person_phone: '',
        pickup_citizen_id: '',
        relationship: 'Ông/Bà',
        photo_url: '',
        note: '',
        start_date: '',
        end_date: '',
      });
      setPreviewImage(null);
      setFieldErrors({});
      setCalendarValidation({ hasConflict: false, errorMessage: null });

      parentApi
        .getPickupQuota()
        .then((res) => {
          setQuotaInfo(res);
        })
        .catch((err) => {
          console.warn('Failed to load pickup quota for parent:', err);
        });
    }
  }, [isOpen]);

  // Keyboard navigation: Escape key closes drawer
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Delegated person is always someone other than parents
  const relationshipOptions = [
    'Ông/Bà',
    'Cô/Dì/Chú/Bác',
    'Anh/Chị ruột',
    'Tài xế đưa đón',
    'Người giúp việc',
    'Người quen gia đình',
    'Khác',
  ];

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleImageFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Kích thước ảnh tối đa là 5MB.');
        return;
      }
      setPreviewImage(URL.createObjectURL(file));

      try {
        setIsUploadingImage(true);
        const res = await uploadApi.uploadPickupPhoto(file);
        const url = res?.url || res?.relativeUrl;
        handleChange('photo_url', url);
        toast.success('Đã tải ảnh người đón lên thành công');
      } catch (err) {
        console.error('Upload pickup photo failed:', err);
        toast.error('Tải ảnh người đón thất bại. Bạn có thể thử lại hoặc gửi đơn không kèm ảnh.', {
          description: err.response?.data?.message || err.message,
        });
        handleChange('photo_url', '');
      } finally {
        setIsUploadingImage(false);
      }
    }
  };

  const submitRequest = async (confirmAbsentWarning = false) => {
    try {
      setIsSubmitting(true);
      const res = await parentApi.createPickupRequest({
        ...formData,
        confirmAbsentWarning,
      });

      if (res?.requiresWarning) {
        setAbsentWarning(res);
        return;
      }

      toast.success('Gửi đơn ủy thác đón con thành công!', {
        description: 'Giáo viên phụ trách sẽ kiểm tra và đối chiếu thông tin an toàn khi trả trẻ.',
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Vui lòng thử lại sau.';
      toast.error('Gửi yêu cầu thất bại', {
        description: msg,
      });
      if (msg.includes('12 chữ số') || msg.toLowerCase().includes('cccd') || msg.toLowerCase().includes('định danh')) {
        setFieldErrors((prev) => ({
          ...prev,
          pickup_citizen_id: msg,
        }));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = {};

    if (!formData.pickup_person_name.trim()) {
      errors.pickup_person_name = 'Vui lòng nhập họ và tên người được ủy thác.';
    }
    if (!formData.pickup_person_phone.trim()) {
      errors.pickup_person_phone = 'Vui lòng nhập số điện thoại người được ủy thác.';
    }
    const cccd = (formData.pickup_citizen_id || '').trim();
    if (cccd && !/^[0-9]{12}$/.test(cccd)) {
      errors.pickup_citizen_id = 'Số CCCD/Định danh cá nhân phải gồm 12 chữ số.';
    }
    if (!formData.start_date || !formData.end_date) {
      errors.start_date = 'Vui lòng chọn ngày hiệu lực ủy quyền trên lịch.';
    } else if (formData.end_date < formData.start_date) {
      errors.end_date = 'Ngày kết thúc không được trước ngày bắt đầu.';
    }

    if (calendarValidation.hasConflict) {
      toast.error(
        calendarValidation.errorMessage ||
          'Khoảng ngày đã chọn chứa ngày đã đạt tối đa số người ủy quyền đón. Vui lòng chọn ngày khác.'
      );
      return;
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      const firstError = Object.values(errors)[0];
      toast.error(firstError);
      return;
    }
    setFieldErrors({});

    if (isUploadingImage) {
      toast.info('Đang tải ảnh lên, vui lòng đợi trong giây lát...');
      return;
    }

    await submitRequest(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 select-none">
      {/* Backdrop with click-to-close */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in-0 duration-200"
        onClick={onClose}
      />

      {/* Centered Modal Popup (Clean Sorak Modal Standard) */}
      <div
        className="relative w-full max-w-[620px] max-h-[90vh] bg-card text-card-foreground shadow-2xl flex flex-col border border-border z-10 animate-in zoom-in-95 duration-150 rounded-none overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Clean, Focused */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-border shrink-0 bg-card">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-[17px] font-semibold text-foreground tracking-tight">
              {t('parent.profile.pickupDelegation', 'Ủy thác người đưa đón')}
            </h2>
            <p className="text-[12px] text-muted-foreground font-normal">
              {t('parent.profile.delegationSubtitle', 'Đăng ký người thân hoặc người giám hộ được phép đón')} {studentName}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="size-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-none transition-colors cursor-pointer"
            title={t('common.close', 'Đóng')}
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4">
          {/* Nhóm 1: Thông tin người đón (2 cột gọn gàng) */}
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Họ và tên */}
              <div className="flex flex-col gap-1">
                <label className="text-[12.5px] font-medium text-foreground">
                  {t('parent.profile.delegateName', 'Họ và tên người đón')} <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.pickup_person_name}
                  onChange={(e) => handleChange('pickup_person_name', e.target.value)}
                  placeholder={t('parent.profile.delegateNamePlaceholder', 'Ví dụ: Đỗ Ngọc Lan')}
                  className={cn(
                    "w-full h-9 px-3 text-[13px] rounded-none border bg-background text-foreground focus:outline-hidden shadow-2xs",
                    fieldErrors.pickup_person_name
                      ? "border-destructive focus:border-destructive"
                      : "border-border focus:border-primary"
                  )}
                />
                {fieldErrors.pickup_person_name && (
                  <p className="text-[11px] text-destructive mt-0.5">{fieldErrors.pickup_person_name}</p>
                )}
              </div>

              {/* Mối quan hệ */}
              <div className="flex flex-col gap-1">
                <label className="text-[12.5px] font-medium text-foreground">
                  Mối quan hệ với bé <span className="text-destructive">*</span>
                </label>
                <select
                  value={formData.relationship}
                  onChange={(e) => handleChange('relationship', e.target.value)}
                  className="w-full h-9 px-3 text-[13px] rounded-none border border-border bg-background text-foreground focus:outline-hidden focus:border-primary shadow-2xs"
                >
                  {relationshipOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* SĐT */}
              <div className="flex flex-col gap-1">
                <label className="text-[12.5px] font-medium text-foreground">
                  Số điện thoại <span className="text-destructive">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={formData.pickup_person_phone}
                  onChange={(e) => handleChange('pickup_person_phone', e.target.value)}
                  placeholder="0912 345 678"
                  className={cn(
                    "w-full h-9 px-3 text-[13px] rounded-none border bg-background text-foreground focus:outline-hidden font-mono shadow-2xs",
                    fieldErrors.pickup_person_phone
                      ? "border-destructive focus:border-destructive"
                      : "border-border focus:border-primary"
                  )}
                />
                {fieldErrors.pickup_person_phone && (
                  <p className="text-[11px] text-destructive mt-0.5">{fieldErrors.pickup_person_phone}</p>
                )}
              </div>

              {/* Số CCCD/Định danh */}
              <div className="flex flex-col gap-1">
                <label className="text-[12.5px] font-medium text-foreground">
                  Số CCCD / Định danh cá nhân
                </label>
                <input
                  type="text"
                  value={formData.pickup_citizen_id}
                  onChange={(e) => handleChange('pickup_citizen_id', e.target.value)}
                  placeholder="12 chữ số CCCD"
                  maxLength={12}
                  className={cn(
                    "w-full h-9 px-3 text-[13px] rounded-none border bg-background text-foreground focus:outline-hidden font-mono shadow-2xs",
                    fieldErrors.pickup_citizen_id
                      ? "border-destructive focus:border-destructive"
                      : "border-border focus:border-primary"
                  )}
                />
                {fieldErrors.pickup_citizen_id && (
                  <p className="text-[11px] text-destructive mt-0.5">{fieldErrors.pickup_citizen_id}</p>
                )}
              </div>
            </div>
          </div>

          {/* Nhóm 2: Thời gian ủy quyền: Nút chọn nhanh (HK1, HK2, Cả năm) & Lịch trực quan kèm hạn mức */}
          <div className="flex flex-col gap-2 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <label className="text-[12.5px] font-medium text-foreground">
                Thời gian hiệu lực <span className="text-destructive">*</span>
              </label>

              {/* Nút thời gian chọn nhanh: Học kỳ 1, Học kỳ 2, Cả năm (Dữ liệu thật của năm học) */}
              <div className="flex items-center gap-1.5">
                {[datePresets.hk1, datePresets.hk2, datePresets.fullYear].map((preset) => {
                  const isActive = activeDatePreset === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        const todayIso = new Date().toISOString().split('T')[0];
                        const effectiveStart = preset.startIso < todayIso ? todayIso : preset.startIso;
                        handleChange('start_date', effectiveStart);
                        handleChange('end_date', preset.endIso);
                      }}
                      className={cn(
                        'h-6 px-2.5 text-[11px] font-medium rounded-none border transition-colors cursor-pointer select-none',
                        isActive
                          ? 'bg-[#1447e6] text-white border-[#1447e6] shadow-2xs font-semibold'
                          : 'bg-muted/30 hover:bg-muted text-muted-foreground hover:text-foreground border-border'
                      )}
                      title={`${preset.label}: ${preset.displayRange}`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <PickupCalendarPicker
              startDate={formData.start_date}
              endDate={formData.end_date}
              quotaInfo={quotaInfo}
              studentName={studentName}
              onChangeRange={(res) => {
                handleChange('start_date', res.startDateIso);
                handleChange('end_date', res.endDateIso);
                setCalendarValidation({
                  hasConflict: res.hasConflict,
                  errorMessage: res.errorMessage,
                });
              }}
            />
          </div>

          {/* Nhóm 3: Dặn dò & Ảnh nhận diện */}
          <div className="space-y-3 pt-2 border-t border-border">
            {/* Ghi chú */}
            <div className="flex flex-col gap-1">
              <label className="text-[12.5px] font-medium text-foreground">
                Dặn dò / Ghi chú
              </label>
              <textarea
                rows={2}
                value={formData.note}
                onChange={(e) => handleChange('note', e.target.value)}
                placeholder="Ví dụ: Đón bé về nhà bà ngoại, dặn cô cho bé uống thuốc..."
                className="w-full p-2.5 text-[12.5px] rounded-none border border-border bg-background text-foreground focus:outline-hidden focus:border-primary resize-none shadow-2xs min-h-[64px]"
              />
            </div>

            {/* Tải ảnh nhận diện */}
            <div className="flex flex-col gap-1">
              <label className="text-[12.5px] font-medium text-foreground">
                Ảnh chân dung người đón (tùy chọn)
              </label>
              <div className="border border-dashed border-border p-3 text-center bg-muted/10 rounded-none relative">
                {previewImage ? (
                  <div className="flex items-center justify-center gap-3">
                    <img
                      src={previewImage}
                      alt="Preview"
                      className="size-14 object-cover border border-border rounded-none shadow-2xs"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewImage(null);
                        handleChange('photo_url', '');
                      }}
                      className="text-[12px] text-destructive hover:underline cursor-pointer font-medium"
                    >
                      Xóa ảnh và chọn lại
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 cursor-pointer py-1.5">
                    <UploadCloud className="size-4 text-muted-foreground" />
                    <span className="text-[12.5px] font-medium text-foreground">
                      Tải ảnh chân dung người được ủy quyền
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      (PNG, JPG tối đa 5MB)
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 px-6 py-3.5 border-t border-border shrink-0 bg-card">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="h-8.5 px-4 text-[12.5px] rounded-none border-border cursor-pointer shadow-none hover:bg-muted"
          >
            {t('common.cancel', 'Hủy')}
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={isSubmitting || calendarValidation.hasConflict}
            className="h-8.5 px-5 text-[12.5px] rounded-none bg-[#1447e6] hover:bg-[#123ec4] text-white cursor-pointer shadow-none font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? t('common.submitting', 'Đang gửi...') : t('parent.profile.submitDelegation', 'Gửi đơn ủy thác')}
          </Button>
        </div>
      </div>

      {/* Absent Warning Modal (tester_18 Bug 15) */}
      {absentWarning && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in-0 duration-150">
          <div className="w-full max-w-md bg-card border border-border shadow-2xl p-5 space-y-4 rounded-none text-foreground">
            <div className="space-y-1.5">
              <h3 className="text-[16px] font-semibold text-foreground">
                {t('parent.profile.absentWarningTitle', 'Học sinh đang vắng trong ngày được ủy quyền')}
              </h3>
              <p className="text-[13px] text-muted-foreground leading-relaxed">
                {absentWarning.warningMessage}
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAbsentWarning(null)}
                className="h-8 px-3 text-[13px] rounded-none border-border cursor-pointer"
              >
                {t('common.back', 'Quay lại')}
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setAbsentWarning(null);
                  submitRequest(true);
                }}
                className="h-8 px-4 text-[13px] rounded-none bg-[#1447e6] hover:bg-[#1447e6]/90 text-white cursor-pointer"
              >
                {t('common.continue', 'Tiếp tục tạo đơn')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export const PickupDelegationModal = PickupDelegationDrawer;
export default PickupDelegationDrawer;
