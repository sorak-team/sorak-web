import React from 'react';
import { X, Sun, BookOpen, Gamepad2, Trees, Moon, Coffee, HeartHandshake, CheckCircle2, Clock, Activity, MessageSquare } from 'lucide-react';

const ICON_MAP = {
  Sun,
  BookOpen,
  Gamepad2,
  Trees,
  Moon,
  Coffee,
  HeartHandshake,
  Activity,
  Clock,
};

export function ParentActivitySheet({ isOpen, onClose, studentName = 'Bé', timeline = [] }) {
  if (!isOpen) return null;

  const defaultTimeline = [
    {
      time: '07:00 – 08:00',
      title: 'Đón trẻ & Thể dục sáng',
      category: 'Đón trẻ',
      description: 'Cô giáo đón bé tại cửa lớp, kiểm tra đồ dùng cá nhân, thân nhiệt và hướng dẫn bé cất cặp, giày dép vào ngăn tủ riêng. Bé cùng các bạn ra sân tập bài thể dục buổi sáng theo nhạc sôi động.',
      icon: Sun,
      isDone: true,
      badge: 'Hoàn thành',
    },
    {
      time: '08:30 – 09:30',
      title: 'Hoạt động học có chủ đích: Làm quen toán học',
      category: 'Phát triển nhận thức',
      description: 'Nhận biết và phân biệt hình vuông, hình tròn, hình tam giác qua trò chơi ghép hình thông minh và xếp khối gỗ.',
      objective: 'Bé nhận biết đúng 3 hình cơ bản, gọi đúng tên hình và tìm được đồ vật xung quanh có hình dáng tương ứng.',
      icon: BookOpen,
      isDone: true,
      badge: 'Đạt mục tiêu',
    },
    {
      time: '09:30 – 10:30',
      title: 'Hoạt động chơi ở các góc',
      category: 'Kỹ năng xã hội',
      description: 'Góc phân vai: Bé đóng vai đầu bếp nhí nấu súp rau củ. Góc xây dựng: Lắp ráp công viên khủng long cùng nhóm bạn.',
      icon: Gamepad2,
      isDone: true,
      badge: 'Tích cực',
    },
    {
      time: '10:30 – 11:15',
      title: 'Chơi ngoài trời & Khám phá thiên nhiên',
      category: 'Phát triển thể chất',
      description: 'Quan sát lá cây trong vườn trường, chơi cầu trượt liên hoàn và trò chơi vận động "Bắt chước dáng đi của chú thỏ".',
      icon: Trees,
      isDone: true,
      badge: 'Hoàn thành',
    },
    {
      time: '11:30 – 14:00',
      title: 'Vệ sinh, Ăn trưa & Giấc ngủ trưa',
      category: 'Chăm sóc nuôi dưỡng',
      description: 'Thực đơn trưa: Cơm gạo dẻo, Thịt kho trứng cút, Canh rau ngót nấu tôm thịt băm, Chuối tiêu tráng miệng. Bé tự xúc ăn ngoan, ăn hết phần cơm và ngủ trưa tròn giấc.',
      icon: Moon,
      isDone: true,
      badge: 'Ăn hết suất',
    },
    {
      time: '14:30 – 15:30',
      title: 'Bữa phụ chiều & Sinh hoạt văn nghệ',
      category: 'Phát triển thẩm mỹ',
      description: 'Bữa phụ: Sữa tươi thanh trùng và bánh flan caramel. Bé cùng cô học bài hát "Cháu đi mẫu giáo" và rèn kỹ năng gấp chăn gối.',
      icon: Coffee,
      isDone: false,
      badge: 'Đang diễn ra',
    },
    {
      time: '16:30 – 17:30',
      title: 'Trả trẻ & Trao đổi phụ huynh',
      category: 'Trả trẻ',
      description: 'Bé sắp xếp đồ dùng vào ba lô, chào cô và các bạn. Giáo viên đối chiếu danh sách ủy thác đón con và bàn giao cho phụ huynh an toàn.',
      icon: HeartHandshake,
      isDone: false,
      badge: 'Sắp diễn ra',
    },
  ];

  const items = timeline && timeline.length > 0 ? timeline : defaultTimeline;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-lg bg-card text-card-foreground shadow-2xl flex flex-col h-full border-l border-border z-10 animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border bg-muted/30">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold">Nhật ký hoạt động ở trường</h2>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-primary/10 text-primary">
                Hôm nay
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Theo dõi chi tiết các mốc thời gian sinh hoạt của {studentName} tại lớp
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg border border-border/80 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {items.map((slot, idx) => {
            const Icon = typeof slot.icon === 'function' ? slot.icon : (ICON_MAP[slot.icon] || Sun);
            const isDone = slot.isDone ?? (slot.status === 'completed' || slot.badge === 'Hoàn thành' || slot.badge === 'Đạt mục tiêu' || slot.badge === 'Xuất sắc' || slot.badge === 'Ăn hết suất');
            return (
              <div
                key={slot.id || idx}
                className="relative pl-7 pb-4 border-l-2 border-border/70 last:border-l-transparent last:pb-0"
              >
                {/* Node Icon on line */}
                <div
                  className={`absolute -left-[15px] top-0.5 w-7 h-7 rounded-full border-2 flex items-center justify-center bg-card shadow-sm ${
                    isDone
                      ? 'border-emerald-500 text-emerald-600'
                      : slot.badge === 'Đang diễn ra'
                        ? 'border-primary text-primary animate-pulse'
                        : 'border-muted-foreground/30 text-muted-foreground'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>

                {/* Card Container */}
                <div className="bg-card rounded-xl border border-border p-3.5 shadow-sm hover:border-primary/40 transition-colors">
                  <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                    <span className="text-xs font-mono font-medium text-primary flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {slot.time}
                    </span>
                    {slot.badge && (
                      <span
                        className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${
                          slot.badge === 'Hoàn thành' || slot.badge === 'Đạt mục tiêu' || slot.badge === 'Ăn hết suất' || slot.badge === 'Xuất sắc'
                            ? 'bg-emerald-500/10 text-emerald-600'
                            : slot.badge === 'Đang diễn ra'
                              ? 'bg-primary/10 text-primary font-semibold'
                              : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {slot.badge}
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-semibold text-foreground mb-1">
                    {slot.title}
                  </h3>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {slot.description}
                  </p>

                  {slot.objective && (
                    <div className="mt-2.5 p-2 rounded-lg bg-muted/40 border border-border/60 text-[11px] text-foreground/80 flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                      <span>
                        <strong className="font-medium text-foreground">Mục tiêu bài học:</strong> {slot.objective}
                      </span>
                    </div>
                  )}

                  {slot.notes && (
                    <div className="mt-2.5 p-2 rounded-lg bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-900/50 text-[11px] text-blue-900 dark:text-blue-300 flex items-start gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-[#1447e6] dark:text-blue-400 shrink-0 mt-0.5" />
                      <span>
                        <strong className="font-semibold text-blue-900 dark:text-blue-300">Nhận xét của cô:</strong> {slot.notes}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
          <span>Hệ thống nhật ký mầm non Sorak</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border border-border bg-card font-medium text-foreground hover:bg-muted transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

export default ParentActivitySheet;
