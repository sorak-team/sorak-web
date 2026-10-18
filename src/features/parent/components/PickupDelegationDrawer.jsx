import React, { useState, useEffect } from 'react';
import { X, UploadCloud, ShieldCheck, AlertCircle, Calendar, Phone, User, CreditCard } from 'lucide-react';
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
    'Người giúp việc gia đình',
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
        description: 'Giáo viên chủ nhiệm sẽ kiểm tra và đối chiếu thông tin an toàn khi trả trẻ.',
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
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Right Drawer (Clean, matching timetable design standards) */}
      <div className="relative w-full max-w-[500px] bg-card text-card-foreground shadow-2xl flex flex-col h-full border-l border-border z-10 animate-in slide-in-from-right duration-200 rounded-none">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-card">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-none bg-blue-500/10 border border-blue-500/20 text-primary flex items-center justify-center">
              <ShieldCheck className="size-4.5" />
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-foreground tracking-tight">
                Ủy thác người đón {studentName}
              </h2>
              <p className="text-[11.5px] text-muted-foreground font-normal">
                Quy trình xác nhận danh tính và bàn giao trẻ an toàn
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onClose}
            className="size-8 rounded-none border border-border hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <X className="size-4" />
          </Button>
        </div>

        {/* Safety Notice Banner */}
        <div className="mx-4 mt-3.5 p-3 rounded-none bg-muted/20 border border-border text-[12px] text-foreground flex items-start gap-2">
          <AlertCircle className="size-4 text-amber-500 shrink-0 mt-0.5" />
          <span className="text-muted-foreground leading-relaxed">
            Vì sự an toàn tuyệt đối của trẻ, giáo viên sẽ đối chiếu số CCCD và ảnh nhận diện khi người được ủy thác đến đón tại lớp.
          </span>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-3.5">
          {/* Họ và tên */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-foreground">
              Họ và tên người được ủy thác <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <User className="size-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                required
                value={formData.pickup_person_name}
                onChange={(e) => handleChange('pickup_person_name', e.target.value)}
                placeholder="Ví dụ: Nguyễn Văn Nam"
                className="w-full h-8 pl-9 pr-3 text-[12.5px] rounded-none border border-border bg-background focus:outline-hidden focus:border-primary shadow-2xs"
              />
            </div>
          </div>

          {/* SĐT & Mối quan hệ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-foreground">
                Số điện thoại liên hệ <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <Phone className="size-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="tel"
                  required
                  value={formData.pickup_person_phone}
                  onChange={(e) => handleChange('pickup_person_phone', e.target.value)}
                  placeholder="0912 345 678"
                  className="w-full h-8 pl-9 pr-3 text-[12.5px] rounded-none border border-border bg-background focus:outline-hidden focus:border-primary font-mono shadow-2xs"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-foreground">
                Mối quan hệ với bé
              </label>
              <select
                value={formData.relationship}
                onChange={(e) => handleChange('relationship', e.target.value)}
                className="w-full h-8 px-2.5 text-[12.5px] rounded-none border border-border bg-background text-foreground focus:outline-hidden focus:border-primary shadow-2xs"
              >
                {relationshipOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Số CCCD/CMND */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-foreground">
              Số CCCD / CMND người đón
            </label>
            <div className="relative">
              <CreditCard className="size-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={formData.pickup_citizen_id}
                onChange={(e) => handleChange('pickup_citizen_id', e.target.value)}
                placeholder="12 chữ số trên căn cước"
                className="w-full h-8 pl-9 pr-3 text-[12.5px] rounded-none border border-border bg-background focus:outline-hidden focus:border-primary font-mono shadow-2xs"
              />
            </div>
          </div>

          {/* Thời gian ủy thác */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-foreground">
                Từ ngày <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <Calendar className="size-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="date"
                  required
                  value={formData.start_date}
                  onChange={(e) => handleChange('start_date', e.target.value)}
                  className="w-full h-8 pl-9 pr-2.5 text-[12.5px] rounded-none border border-border bg-background focus:outline-hidden focus:border-primary font-mono shadow-2xs"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-foreground">
                Đến ngày <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <Calendar className="size-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="date"
                  required
                  value={formData.end_date}
                  onChange={(e) => handleChange('end_date', e.target.value)}
                  className="w-full h-8 pl-9 pr-2.5 text-[12.5px] rounded-none border border-border bg-background focus:outline-hidden focus:border-primary font-mono shadow-2xs"
                />
              </div>
            </div>
          </div>

          {/* Tải ảnh nhận diện */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-foreground">
              Ảnh chân dung người đón (Đối chiếu khi trả trẻ)
            </label>
            <div className="border border-dashed border-border p-4 text-center bg-muted/10 rounded-none relative">
              {previewImage ? (
                <div className="flex flex-col items-center gap-2">
                  <img
                    src={previewImage}
                    alt="Preview"
                    className="size-20 object-cover border border-border rounded-none shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewImage(null);
                      handleChange('photo_url', '');
                    }}
                    className="text-[12px] text-destructive hover:underline cursor-pointer"
                  >
                    Xóa ảnh và chọn lại
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center cursor-pointer">
                  <UploadCloud className="size-6 text-primary mb-1.5" />
                  <span className="text-[12.5px] font-medium text-foreground">
                    Nhấn để tải ảnh người đón
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
            <label className="text-[12px] font-medium text-foreground">
              Ghi chú cho giáo viên
            </label>
            <textarea
              rows={3}
              value={formData.note}
              onChange={(e) => handleChange('note', e.target.value)}
              placeholder="Ví dụ: Đón bé bằng xe máy mang biển số 68-S1 12345 lúc 16h30..."
              className="w-full p-2.5 text-[12.5px] rounded-none border border-border bg-background focus:outline-hidden focus:border-primary resize-none shadow-2xs"
            />
          </div>
        </form>

        {/* Sticky Footer */}
        <div className="p-3.5 border-t border-border bg-card flex items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="h-8 px-3.5 rounded-none border border-border text-[12px] font-medium bg-background hover:bg-muted text-foreground cursor-pointer shadow-2xs"
          >
            Hủy
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="h-8 px-4 rounded-none bg-primary hover:bg-primary/90 text-primary-foreground text-[12px] font-medium cursor-pointer shadow-2xs"
          >
            {isSubmitting ? 'Đang gửi...' : 'Gửi đơn ủy thác'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default PickupDelegationDrawer;
