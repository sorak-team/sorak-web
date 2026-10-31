import React, { useState, useEffect } from 'react';
import { X, UploadCloud } from 'lucide-react';
import { toast } from 'sonner';
import { parentApi } from '../api/parent.api';
import { Button } from '@/components/ui/button';

export function PickupDelegationDrawer({ isOpen, onClose, onSuccess, studentName = 'bé' }) {
  const [formData, setFormData] = useState({
    pickup_person_name: '',
    pickup_person_phone: '',
    pickup_citizen_id: '',
    relationship: 'Ông/Bà',
    photo_url: '',
    note: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

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
  };

  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Kích thước ảnh tối đa là 5MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result);
        handleChange('photo_url', reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.pickup_person_name.trim()) {
      toast.error('Vui lòng nhập họ tên người được ủy thác.');
      return;
    }
    if (!formData.pickup_person_phone.trim()) {
      toast.error('Vui lòng nhập số điện thoại người được ủy thác.');
      return;
    }
    if (formData.end_date < formData.start_date) {
      toast.error('Ngày kết thúc không được trước ngày bắt đầu.');
      return;
    }

    try {
      setIsSubmitting(true);
      await parentApi.createPickupRequest(formData);
      toast.success('Gửi đơn ủy thác đón con thành công!', {
        description: 'Giáo viên phụ trách sẽ kiểm tra và đối chiếu thông tin an toàn khi trả trẻ.',
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error('Gửi yêu cầu thất bại', {
        description: err.response?.data?.message || err.message || 'Vui lòng thử lại sau.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end select-none">
      {/* Backdrop with click-to-close */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in-0 duration-200"
        onClick={onClose}
      />

      {/* Right Drawer (Spacious & Clean Layout, Standard Sorak Style) */}
      <div className="relative w-full max-w-[640px] bg-card text-card-foreground shadow-2xl flex flex-col h-full border-l border-border z-10 animate-in slide-in-from-right duration-200 rounded-none">
        {/* Header - Clean, No Icon */}
        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-border shrink-0 bg-card">
          <div className="flex flex-col gap-1">
            <h2 className="text-[18px] font-semibold text-foreground tracking-tight">
              Ủy thác người đưa đón
            </h2>
            <p className="text-[12.5px] text-muted-foreground font-normal">
              Đăng ký người thân hoặc người giám hộ được phép đón {studentName} tại trường
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="size-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-none transition-colors cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Form Body with Spacious Inputs */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Nhóm 1: Thông tin người đón */}
          <div className="space-y-4">
            <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider block font-semibold">
              1. Thông tin người được ủy thác
            </span>

            {/* Họ và tên */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-foreground">
                Họ và tên người đón <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.pickup_person_name}
                onChange={(e) => handleChange('pickup_person_name', e.target.value)}
                placeholder="Ví dụ: Nguyễn Văn Nam"
                className="w-full h-11 px-4 text-[14px] rounded-none border border-border bg-background text-foreground focus:outline-hidden focus:border-primary shadow-2xs"
              />
            </div>

            {/* SĐT & Mối quan hệ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-foreground">
                  Số điện thoại <span className="text-destructive">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={formData.pickup_person_phone}
                  onChange={(e) => handleChange('pickup_person_phone', e.target.value)}
                  placeholder="0912 345 678"
                  className="w-full h-11 px-4 text-[14px] rounded-none border border-border bg-background text-foreground focus:outline-hidden focus:border-primary font-mono shadow-2xs"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-foreground">
                  Mối quan hệ với bé
                </label>
                <select
                  value={formData.relationship}
                  onChange={(e) => handleChange('relationship', e.target.value)}
                  className="w-full h-11 px-3.5 text-[14px] rounded-none border border-border bg-background text-foreground focus:outline-hidden focus:border-primary shadow-2xs"
                >
                  {relationshipOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Số CCCD/Định danh */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-foreground">
                Số CCCD / Định danh cá nhân
              </label>
              <input
                type="text"
                value={formData.pickup_citizen_id}
                onChange={(e) => handleChange('pickup_citizen_id', e.target.value)}
                placeholder="12 chữ số trên căn cước công dân"
                className="w-full h-11 px-4 text-[14px] rounded-none border border-border bg-background text-foreground focus:outline-hidden focus:border-primary font-mono shadow-2xs"
              />
            </div>
          </div>

          {/* Nhóm 2: Thời gian ủy quyền */}
          <div className="space-y-4 pt-3 border-t border-border">
            <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider block font-semibold">
              2. Thời hạn ủy thác đón
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-foreground">
                  Từ ngày <span className="text-destructive">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.start_date}
                  onChange={(e) => handleChange('start_date', e.target.value)}
                  className="w-full h-11 px-4 text-[14px] rounded-none border border-border bg-background text-foreground focus:outline-hidden focus:border-primary font-mono shadow-2xs"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-foreground">
                  Đến ngày <span className="text-destructive">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.end_date}
                  onChange={(e) => handleChange('end_date', e.target.value)}
                  className="w-full h-11 px-4 text-[14px] rounded-none border border-border bg-background text-foreground focus:outline-hidden focus:border-primary font-mono shadow-2xs"
                />
              </div>
            </div>
          </div>

          {/* Nhóm 3: Ảnh & Ghi chú */}
          <div className="space-y-4 pt-3 border-t border-border">
            <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider block font-semibold">
              3. Ảnh nhận diện & Ghi chú
            </span>

            {/* Tải ảnh nhận diện */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-foreground">
                Ảnh chân dung người đón (tùy chọn)
              </label>
              <div className="border border-dashed border-border p-4 text-center bg-muted/10 rounded-none relative">
                {previewImage ? (
                  <div className="flex items-center justify-center gap-4">
                    <img
                      src={previewImage}
                      alt="Preview"
                      className="size-18 object-cover border border-border rounded-none shadow-2xs"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewImage(null);
                        handleChange('photo_url', '');
                      }}
                      className="text-[12.5px] text-destructive hover:underline cursor-pointer font-medium"
                    >
                      Xóa ảnh và chọn lại
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center cursor-pointer py-2">
                    <UploadCloud className="size-6 text-muted-foreground mb-1.5" />
                    <span className="text-[13px] font-medium text-foreground">
                      Tải ảnh chân dung người đón
                    </span>
                    <span className="text-[11px] text-muted-foreground mt-0.5">
                      Định dạng PNG, JPG (Tối đa 5MB)
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

            {/* Ghi chú */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-foreground">
                Ghi chú thêm cho giáo viên
              </label>
              <textarea
                rows={3}
                value={formData.note}
                onChange={(e) => handleChange('note', e.target.value)}
                placeholder="Ví dụ: Đón bé bằng xe máy lúc 16h30..."
                className="w-full p-3 text-[13px] rounded-none border border-border bg-background text-foreground focus:outline-hidden focus:border-primary resize-none shadow-2xs min-h-[85px]"
              />
            </div>
          </div>
        </form>

        {/* Footer - Identical to TeacherDrawer & StudentDrawer */}
        <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-border shrink-0 bg-background">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="h-9 px-5 text-[13px] rounded-none border-border cursor-pointer shadow-2xs"
          >
            Hủy
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="h-9 px-6 text-[13px] rounded-none bg-[#1447e6] hover:bg-[#1447e6]/90 text-white cursor-pointer shadow-2xs font-medium"
          >
            {isSubmitting ? 'Đang gửi...' : 'Gửi đơn ủy thác'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default PickupDelegationDrawer;
