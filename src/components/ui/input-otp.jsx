import * as React from 'react';
import { cn } from '@/shared/lib/utils';

export function InputOTP({
  value = '',
  onChange,
  length = 6,
  disabled = false,
  autoFocus = true,
  isError = false,
  onComplete,
  className,
}) {
  const inputRefs = React.useRef([]);

  const digits = Array.from({ length }, (_, i) => value[i] || '');

  // Auto-focus slot 0 on mount
  React.useEffect(() => {
    if (autoFocus && !disabled) {
      const timer = setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [autoFocus, disabled]);

  // When value resets to empty (e.g. after incorrect OTP), immediately refocus slot 0 from start
  React.useEffect(() => {
    if (value === '' && !disabled) {
      inputRefs.current[0]?.focus();
    }
  }, [value, disabled]);

  const handleChange = (index, e) => {
    const rawVal = e.target.value;
    const digit = rawVal.replace(/\D/g, '').slice(-1);

    const newDigits = [...digits];
    newDigits[index] = digit;
    const newValue = newDigits.join('');

    onChange?.(newValue);

    if (digit && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newValue.length === length) {
      onComplete?.(newValue);
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        e.preventDefault();
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        onChange?.(newDigits.join(''));
        inputRefs.current[index - 1]?.focus();
      } else {
        const newDigits = [...digits];
        newDigits[index] = '';
        onChange?.(newDigits.join(''));
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData
      .getData('text/plain')
      .replace(/\D/g, '')
      .slice(0, length);
    if (pastedData) {
      onChange?.(pastedData);
      const nextIndex = Math.min(pastedData.length, length - 1);
      inputRefs.current[nextIndex]?.focus();
      if (pastedData.length === length) {
        onComplete?.(pastedData);
      }
    }
  };

  const handleContainerClick = () => {
    const firstEmptyIndex = digits.findIndex((d) => !d);
    const targetIndex = firstEmptyIndex === -1 ? length - 1 : firstEmptyIndex;
    inputRefs.current[targetIndex]?.focus();
  };

  const renderSlot = (index) => {
    const isFirstInGroup = index === 0 || index === 3;

    return (
      <input
        key={index}
        ref={(el) => (inputRefs.current[index] = el)}
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="\\d{1}"
        maxLength={1}
        value={digits[index]}
        disabled={disabled}
        onChange={(e) => handleChange(index, e)}
        onKeyDown={(e) => handleKeyDown(index, e)}
        onPaste={handlePaste}
        className={cn(
          'w-[42px] h-[48px] text-center text-base font-semibold bg-background border border-input rounded-none transition-all duration-150',
          'focus:z-10 focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring',
          'disabled:cursor-not-allowed disabled:opacity-50',
          isError &&
            'border-destructive text-destructive focus:border-destructive focus:ring-destructive',
          !isFirstInGroup && '-ml-px',
        )}
      />
    );
  };

  return (
    <div
      onClick={handleContainerClick}
      className={cn(
        'flex items-center justify-between gap-3 cursor-text select-none',
        isError && 'animate-otp-shake',
        className,
      )}
    >
      {/* Group 1: Digits 0, 1, 2 */}
      <div className="flex items-center isolate">
        {renderSlot(0)}
        {renderSlot(1)}
        {renderSlot(2)}
      </div>

      {/* Separator dash */}
      <span className="text-muted-foreground font-semibold text-lg select-none">
        —
      </span>

      {/* Group 2: Digits 3, 4, 5 */}
      <div className="flex items-center isolate">
        {renderSlot(3)}
        {renderSlot(4)}
        {renderSlot(5)}
      </div>
    </div>
  );
}
