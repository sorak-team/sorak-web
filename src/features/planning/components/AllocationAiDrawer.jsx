import React, { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Cancel01Icon,
  SparklesIcon,
  SentIcon,
  PlusSignIcon,
} from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { planningApi } from '../planning.api';

export function AllocationAiDrawer({ isOpen, onClose, onApplyAiAllocation }) {
  const [messages, setMessages] = useState([
    {
      id: 'm1',
      sender: 'ai',
      text: 'Mình có thể tự động phân bổ mục tiêu vào từng chủ đề nhánh theo độ khó tăng dần và đặc thù lứa tuổi.',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleAutoAllocate = async () => {
    setIsProcessing(true);
    try {
      const res = await planningApi.queryAiAllocation({
        prompt: 'Tự động phân bổ mục tiêu theo chủ đề Giao thông',
        themeName: 'Giao thông',
      });
      setMessages((prev) => [
        ...prev,
        {
          id: `m-${Date.now()}`,
          sender: 'ai',
          text: 'Đã hoàn tất phân bổ 21 mục tiêu vào 3 chủ đề nhánh theo chuẩn Thông tư 51/BGDĐT. Bạn có muốn áp dụng ngay không?',
          proposals: res.proposals,
        },
      ]);
      toast.success('Đã tạo đề xuất phân bổ mục tiêu tự động!');
    } catch {
      toast.error('Lỗi khi gọi Sorak AI');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendMessage = () => {
    if (!inputText.trim()) return;
    const userMsg = { id: `u-${Date.now()}`, sender: 'user', text: inputText.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInputText('');

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: `Đã ghi nhận yêu cầu: "${userMsg.text}". Đang cân đối số lượng mục tiêu giữa các tuần học.`,
        },
      ]);
    }, 600);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-[1px] animate-in fade-in-0 duration-200"
      onClick={onClose}
      data-node-id="4988:17488"
      data-name="Sorak AI Allocation Drawer"
    >
      <div
        className="w-full max-w-[440px] h-full bg-card border-l border-border shadow-2xl flex flex-col justify-between text-foreground select-none overflow-hidden animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-card">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-full bg-[#1447e6]/10 text-[#1447e6] flex items-center justify-center">
              <HugeiconsIcon icon={SparklesIcon} size={16} />
            </div>
            <div className="flex flex-col leading-tight">
              <h2 className="text-[15px] font-semibold text-foreground tracking-tight">
                Sorak AI
              </h2>
              <span className="text-[11.5px] text-muted-foreground">
                Phân bổ mục tiêu · Giao thông
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="size-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-none transition-colors"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={15} />
          </button>
        </div>

        {/* Chat / Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-[13px]">
          {messages.map((m) => (
            <div key={m.id} className="space-y-2">
              <div className="flex items-start gap-2.5">
                {m.sender === 'ai' ? (
                  <img
                    src="/mascot.webp"
                    alt="Mascot"
                    className="size-7 rounded-full object-contain shrink-0 mt-0.5"
                  />
                ) : (
                  <div className="size-7 rounded-full bg-muted text-foreground flex items-center justify-center text-[11px] font-bold shrink-0">
                    GV
                  </div>
                )}
                <div
                  className={`p-3 rounded-none leading-relaxed max-w-[85%] ${
                    m.sender === 'ai'
                      ? 'bg-muted/40 border border-border/80 text-foreground'
                      : 'bg-[#1447e6] text-white ml-auto'
                  }`}
                >
                  {m.text}
                </div>
              </div>

              {m.proposals && (
                <div className="pl-9 space-y-2">
                  <Button
                    type="button"
                    onClick={() => {
                      if (onApplyAiAllocation) onApplyAiAllocation(m.proposals);
                      toast.success('Đã áp dụng phân bổ AI vào các tuần học!');
                      onClose();
                    }}
                    className="w-full h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-[12.5px] rounded-none shadow-none cursor-pointer"
                  >
                    Áp dụng phân bổ này
                  </Button>
                </div>
              )}
            </div>
          ))}

          {/* Quick Action Button matching Figma 4988:17488 */}
          <div className="pt-2">
            <Button
              type="button"
              onClick={handleAutoAllocate}
              disabled={isProcessing}
              className="w-full h-9 bg-[#1447e6] hover:bg-[#1447e6]/90 text-white text-[13px] font-medium rounded-none shadow-none cursor-pointer flex items-center justify-center gap-2"
            >
              <HugeiconsIcon icon={SparklesIcon} size={15} />
              <span>{isProcessing ? 'Đang phân tích...' : 'Tự động phân bổ bằng AI'}</span>
            </Button>
          </div>
        </div>

        {/* Footer with note & input */}
        <div className="p-4 border-t border-border bg-card space-y-2">
          <p className="text-[11px] text-muted-foreground text-center">
            AI chỉ đề xuất. Giáo viên cần xem trước và xác nhận trước khi áp dụng phân bổ.
          </p>

          <div className="flex items-center gap-1.5 border border-border bg-background px-2 py-1">
            <button
              type="button"
              className="size-6 flex items-center justify-center text-muted-foreground hover:text-foreground"
            >
              <HugeiconsIcon icon={PlusSignIcon} size={14} />
            </button>
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Hỏi Sorak AI về cách phân bổ mục tiêu..."
              className="flex-1 h-7 bg-transparent text-[12.5px] text-foreground placeholder:text-muted-foreground outline-none"
            />
            <button
              type="button"
              onClick={handleSendMessage}
              className="size-7 bg-[#1447e6] text-white flex items-center justify-center hover:bg-[#1447e6]/90 transition-colors"
            >
              <HugeiconsIcon icon={SentIcon} size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
