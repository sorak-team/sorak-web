import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Cancel01Icon,
  SentIcon,
  SparklesIcon,
  Tick01Icon,
  Copy01Icon,
  ArrowDown01Icon,
  Exchange01Icon,
} from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { curriculumApi } from '../curriculum.api';

export function GoalAiAssistantDrawer({ isOpen, onClose, onApplyProposal }) {
  const { t } = useTranslation();

  const quickChips = useMemo(
    () => [
      {
        id: 'num',
        label: t('curriculum.aiChipNum', 'Chuẩn hoá cách đánh số'),
        prompt: t('curriculum.aiChipNumPrompt', 'Chuẩn hoá cách đánh số mã mục tiêu theo chuẩn Thông tư 51.'),
      },
      {
        id: 'dup',
        label: t('curriculum.aiChipDup', 'Tìm mục tiêu trùng'),
        prompt: t('curriculum.aiChipDupPrompt', 'Tìm các mục tiêu có nội dung trùng lặp hoặc tương tự.'),
      },
      {
        id: 'group',
        label: t('curriculum.aiChipGroup', 'Nhóm lại theo lĩnh vực'),
        prompt: t('curriculum.aiChipGroupPrompt', 'Phân loại và kiểm tra mục tiêu theo 5 lĩnh vực GDMN.'),
      },
      {
        id: 'sub',
        label: t('curriculum.aiChipSub', 'Gợi ý mục tiêu theo chỉ số'),
        prompt: t('curriculum.aiChipSubPrompt', 'Gợi ý mục tiêu giáo dục bám sát chỉ số đánh giá phát triển.'),
      },
      {
        id: 'check',
        label: t('curriculum.aiChipCheck', 'Kiểm tra cấu trúc'),
        prompt: t('curriculum.aiChipCheckPrompt', 'Kiểm tra độ cân bằng số lượng mục tiêu giữa các lĩnh vực.'),
      },
    ],
    [t],
  );

  const [messages, setMessages] = useState([
    {
      id: 'm1',
      sender: 'ai',
      text: 'Mình có thể kiểm tra mục tiêu trùng, chuẩn hoá mã hoặc tối ưu câu từ mục tiêu giáo dục.',
    },
    {
      id: 'm2',
      sender: 'user',
      text: 'Gợi ý thêm mục tiêu rèn luyện thể chất cho độ tuổi này.',
    },
    {
      id: 'm3',
      sender: 'ai',
      proposal: {
        title: 'Đề xuất mục tiêu thể chất:',
        items: [
          'MT 4: Giữ thăng bằng khi đi kiễng gót 3-5m theo đường kẻ thẳng.',
          'MT 5: Phối hợp chân tay nhịp nhàng khi bò chui qua cổng.',
          'MT 6: Tung và bắt bóng bằng hai tay từ khoảng cách 1m.',
        ],
      },
    },
  ]);

  const [inputPrompt, setInputPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  const handleSendPrompt = async (textToSend) => {
    const promptText = (textToSend || inputPrompt).trim();
    if (!promptText) return;

    const userMsg = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: promptText,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputPrompt('');
    setIsGenerating(true);

    try {
      const res = await curriculumApi.queryAiAssistant({ prompt: promptText });
      const aiMsg = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: res.reply,
        proposal: res.proposals?.[0] || null,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      // Fallback proposal
      const aiMsg = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: 'Đã phân tích yêu cầu của bạn:',
        proposal: {
          title: 'Đề xuất cập nhật:',
          items: [
            '1.1.2.1 Rèn luyện giữ thăng bằng trên vạch kẻ sẵn.',
            '1.1.2.2 Đi kiễng gót chân 3-5m giữ thăng bằng.',
          ],
        },
      };
      setMessages((prev) => [...prev, aiMsg]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApply = (proposal) => {
    toast.success(t('curriculum.appliedProposalSuccess', 'Đã áp dụng các mục tiêu đề xuất vào ngân hàng!'));
    if (onApplyProposal) onApplyProposal(proposal);
  };

  const handleCopy = (proposal) => {
    const text = proposal.items ? proposal.items.join('\n') : proposal.title;
    navigator.clipboard?.writeText(text);
    toast.success(t('curriculum.copiedProposalSuccess', 'Đã sao chép đề xuất vào clipboard'));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-[1px] animate-in fade-in-0 duration-200"
      onClick={onClose}
      data-node-id="4950:13886"
      data-name="Goal Bank AI Drawer"
    >
      <div
        className="w-full max-w-[480px] sm:w-[480px] h-full bg-card border-l border-border shadow-2xl flex flex-col justify-between text-foreground select-none overflow-hidden animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="p-4 border-b border-border flex items-start justify-between shrink-0 bg-card">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <div className="size-6 bg-primary/10 text-primary flex items-center justify-center">
                <HugeiconsIcon icon={SparklesIcon} size={15} />
              </div>
              <h2 className="text-[16px] font-semibold text-foreground tracking-tight">
                {t('curriculum.aiAssistant', 'AI Assistant')}
              </h2>
            </div>
            <p className="text-[12.5px] text-muted-foreground font-normal">
              {t('curriculum.aiAssistantSubtitle', 'Hỏi AI về cấu trúc và nội dung ngân hàng mục tiêu.')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer rounded-none"
            title={t('common.close', 'Đóng')}
          >
            <HugeiconsIcon icon={Cancel01Icon} size={18} />
          </button>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="p-3 border-b border-border/60 bg-[#f9fafb] dark:bg-muted/20 shrink-0">
          <span className="text-[11.5px] text-muted-foreground font-medium block mb-2">
            {t('curriculum.quickSuggestions', 'Gợi ý nhanh')}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {quickChips.map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => handleSendPrompt(chip.prompt)}
                className="px-2.5 py-1 text-[12px] bg-background hover:bg-muted border border-border text-foreground transition-colors cursor-pointer rounded-none shadow-2xs font-normal"
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="text-[11.5px] text-muted-foreground text-center italic">
            {t('curriculum.aiDisclaimer', 'AI chỉ đề xuất. Mọi thay đổi chỉ được áp dụng khi bạn xác nhận.')}
          </div>

          {messages.map((m) => (
            <div key={m.id} className="space-y-2">
              {m.text && (
                <div
                  className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] px-3.5 py-2.5 text-[13px] rounded-none leading-relaxed shadow-2xs ${
                      m.sender === 'user'
                        ? 'bg-[#1447e6] text-white font-normal'
                        : 'bg-[#f4f5f8] dark:bg-muted text-foreground'
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              )}

              {/* Proposed Structure Card */}
              {m.proposal && (
                <div className="bg-[#f9fafb] dark:bg-muted/30 border border-border p-3.5 space-y-3 rounded-none shadow-2xs">
                  <span className="text-[12.5px] font-semibold text-foreground block">
                    {m.proposal.title}
                  </span>
                  {m.proposal.items && (
                    <ul className="space-y-1.5 text-[12.5px] text-foreground leading-snug">
                      {m.proposal.items.map((item, idx) => (
                        <li key={idx} className="font-mono text-[12px]">
                          {item}
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Proposal Action Buttons matching Figma 4950:13886 */}
                  <div className="flex items-center gap-1.5 pt-2 border-t border-border/60">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleApply(m.proposal)}
                      className="h-7 px-3 bg-[#1447e6] hover:bg-[#1447e6]/90 text-white text-[12px] rounded-none shadow-none cursor-pointer"
                    >
                      <HugeiconsIcon icon={Tick01Icon} size={13} className="mr-1" />
                      {t('common.apply', 'Áp dụng')}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleApply(m.proposal)}
                      className="h-7 px-2.5 border-border text-[12px] rounded-none shadow-none cursor-pointer"
                    >
                      <HugeiconsIcon icon={ArrowDown01Icon} size={13} className="mr-1" />
                      {t('curriculum.insertBelow', 'Thêm vào dưới')}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleApply(m.proposal)}
                      className="h-7 px-2.5 border-border text-[12px] rounded-none shadow-none cursor-pointer"
                    >
                      <HugeiconsIcon icon={Exchange01Icon} size={13} className="mr-1" />
                      {t('curriculum.replace', 'Thay thế')}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(m.proposal)}
                      className="h-7 px-2.5 border-border text-[12px] rounded-none shadow-none cursor-pointer"
                    >
                      <HugeiconsIcon icon={Copy01Icon} size={13} className="mr-1" />
                      {t('common.copy', 'Sao chép')}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {isGenerating && (
            <div className="flex items-center gap-2 text-muted-foreground text-[12.5px] italic">
              <span className="size-2 bg-primary rounded-full animate-ping" />
              <span>{t('curriculum.aiThinking', 'AI đang phân tích và chuẩn bị đề xuất...')}</span>
            </div>
          )}
        </div>

        {/* Input Bar Footer */}
        <div className="p-3 border-t border-border bg-card shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendPrompt();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              placeholder={t('curriculum.askAiPlaceholder', 'Hỏi AI về ngân hàng mục tiêu...')}
              className="flex-1 h-9 px-3 bg-background border border-border text-[13px] text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors rounded-none"
            />
            <Button
              type="submit"
              disabled={!inputPrompt.trim() || isGenerating}
              className="h-9 px-4 bg-[#1447e6] hover:bg-[#1447e6]/90 text-white text-[13px] rounded-none cursor-pointer shadow-none shrink-0"
            >
              <HugeiconsIcon icon={SentIcon} size={15} className="mr-1" />
              {t('common.send', 'Gửi')}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
