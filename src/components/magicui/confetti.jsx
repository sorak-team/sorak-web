import React, {
  createContext,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import confetti from 'canvas-confetti';
import { Button } from '@/components/ui/button';

export const ConfettiContext = createContext(null);

export const Confetti = forwardRef((props, ref) => {
  const {
    options,
    globalOptions = { resize: true, useWorker: true },
    manualstart = false,
    children,
    className,
    ...rest
  } = props;
  const canvasNodeRef = useRef(null);
  const instanceRef = useRef(null);

  const optionsRef = useRef(options);
  const globalOptionsRef = useRef(globalOptions);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  useEffect(() => {
    globalOptionsRef.current = globalOptions;
  }, [globalOptions]);

  const fire = useCallback((opts) => {
    if (instanceRef.current) {
      return instanceRef.current({ ...optionsRef.current, ...opts });
    }
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      fire,
    }),
    [fire],
  );

  useEffect(() => {
    if (canvasNodeRef.current && !instanceRef.current) {
      instanceRef.current = confetti.create(canvasNodeRef.current, {
        resize: true,
        useWorker: true,
        ...globalOptionsRef.current,
      });
    }

    return () => {
      instanceRef.current?.reset();
      instanceRef.current = null;
    };
  }, [globalOptions]);

  useEffect(() => {
    if (!manualstart) {
      fire();
    }
  }, [manualstart, fire]);

  const contextValue = useMemo(() => ({ fire }), [fire]);

  return (
    <ConfettiContext.Provider value={contextValue}>
      <canvas ref={canvasNodeRef} className={className} {...rest} />
      {children}
    </ConfettiContext.Provider>
  );
});

Confetti.displayName = 'Confetti';

export const ConfettiButton = ({
  options,
  children,
  onClick,
  ...props
}) => {
  const handleClick = async (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (rect.left + rect.width / 2) / window.innerWidth;
    const y = (rect.top + rect.height / 2) / window.innerHeight;

    confetti({
      ...options,
      origin: { x, y },
    });

    onClick?.(event);
  };

  return (
    <Button onClick={handleClick} {...props}>
      {children}
    </Button>
  );
};

/**
 * Magic UI Confetti helper to fire side cannons celebratory burst
 */
export const triggerConfetti = (customOptions = {}) => {
  const end = Date.now() + 3 * 1000;
  const colors = ['#1447e6', '#22c55e', '#f59e0b', '#ec4899', '#8b5cf6'];

  const frame = () => {
    if (Date.now() > end) return;

    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.7 },
      colors,
      zIndex: 9999,
      ...customOptions,
    });
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.7 },
      colors,
      zIndex: 9999,
      ...customOptions,
    });

    requestAnimationFrame(frame);
  };

  // Immediate central burst
  confetti({
    particleCount: 80,
    spread: 100,
    origin: { y: 0.6 },
    zIndex: 9999,
    ...customOptions,
  });

  frame();
};

export default confetti;
