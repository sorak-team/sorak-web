import * as React from 'react';
import { create } from 'zustand';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, HelpCircle } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

export const useConfirmDialogStore = create((set) => ({
  isOpen: false,
  title: 'Xác nhận',
  description: '',
  confirmText: 'Xác nhận',
  cancelText: 'Hủy',
  variant: 'destructive', // 'destructive' | 'default'
  resolve: null,
  open: ({
    title = 'Xác nhận',
    description = '',
    confirmText = 'Xác nhận',
    cancelText = 'Hủy',
    variant = 'destructive',
  } = {}) =>
    new Promise((resolve) => {
      set({
        isOpen: true,
        title,
        description,
        confirmText,
        cancelText,
        variant,
        resolve,
      });
    }),
  confirm: () =>
    set((state) => {
      state.resolve?.(true);
      return { isOpen: false, resolve: null };
    }),
  cancel: () =>
    set((state) => {
      state.resolve?.(false);
      return { isOpen: false, resolve: null };
    }),
}));

/**
 * Hiển thị Popup Modal thống nhất để xác nhận thao tác (thay thế window.confirm trên toàn hệ thống).
 * @param {Object|string} opts - Tùy chọn modal hoặc chuỗi mô tả
 * @returns {Promise<boolean>}
 */
export const confirmDialog = (opts) => {
  if (typeof opts === 'string') {
    return useConfirmDialogStore.getState().open({ description: opts });
  }
  return useConfirmDialogStore.getState().open(opts || {});
};

export function ConfirmDialogContainer() {
  const {
    isOpen,
    title,
    description,
    confirmText,
    cancelText,
    variant,
    confirm,
    cancel,
  } = useConfirmDialogStore();

  const isDestructive = variant === 'destructive';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && cancel()}>
      <DialogContent
        className="w-[92vw] max-w-[440px] p-6 rounded-none border border-border bg-card shadow-2xl text-foreground select-none"
        data-name="Dialog · Confirm Action"
      >
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-3">
            {isDestructive ? (
              <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4 text-destructive" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <HelpCircle className="w-4 h-4 text-primary" />
              </div>
            )}
            <DialogTitle
              className={cn(
                'text-[15px] font-semibold tracking-tight',
                isDestructive ? 'text-destructive' : 'text-foreground',
              )}
            >
              {title}
            </DialogTitle>
          </div>
          {description && (
            <DialogDescription className="text-[13px] text-muted-foreground leading-relaxed whitespace-pre-wrap pt-1 pl-11">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>

        <DialogFooter className="mt-5 flex flex-row items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={cancel}
            className="h-8 px-3.5 text-[12.5px] rounded-none cursor-pointer"
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            variant={isDestructive ? 'destructive' : 'default'}
            size="sm"
            onClick={confirm}
            className="h-8 px-3.5 text-[12.5px] rounded-none cursor-pointer"
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
